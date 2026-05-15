import { PostEvent } from './jetstream';
import { preFilter, Verdict } from './detector';
import { resolveParentUris, recordSeenPost } from './parent-resolver';
import { Dimension, Sentiment, InquiryType } from './categories';
import { DeweyClass } from './dewey';
import { shouldRunLLM } from './embedding';
import { scoreResearchURLs, hasStrongResearchURL } from './research-urls';
import { detectStance, isStanceGateEnabled } from './stance-detector';

const USE_LLM = (process.env.USE_LLM_CLASSIFIER ?? 'false') === 'true';
const RESEARCH_LLM_THRESHOLD = parseFloat(process.env.RESEARCH_LLM_THRESHOLD ?? '1.0');
const LLM_CONFIDENCE_THRESHOLD = parseFloat(process.env.LLM_CONFIDENCE_THRESHOLD ?? '0.6');
const LLM_PRAISE_CONFIDENCE_THRESHOLD = parseFloat(process.env.LLM_PRAISE_CONFIDENCE_THRESHOLD ?? '0.7');
// Inquiry is the easiest category to false-positive on (any question hits it),
// so its threshold sits above critique and matches praise.
const LLM_INQUIRY_CONFIDENCE_THRESHOLD = parseFloat(process.env.LLM_INQUIRY_CONFIDENCE_THRESHOLD ?? '0.7');

const LOOSE_CRITICAL_HINT =
  /\b(but|however|actually|wait|wrong|skeptic|doubt|concern|issue|problem|disagree|don'?t buy|not sure|doesn'?t add up|pero|sin embargo|mas|mais|pourtant|toutefois|aber|jedoch|però|tuttavia)\b|しかし|でも|だが|然而|但是|不过/i;

export type ClassifyResult = {
  shouldSave: boolean;
  sentiment: Sentiment | 'neither';
  inquiryType: InquiryType | null;
  signals: string[];
  score: number;
  viaParent: boolean;
  dimensions: Dimension[];
  deweyClass: DeweyClass | null;
  threadRoot: string;
  classifier: 'keyword' | 'llm' | 'keyword+llm';
};

export async function classifyPost(post: PostEvent): Promise<ClassifyResult> {
  const v = preFilter(post.text, post.urls);

  if (v.isAboutResearch || v.isMetaCritique) recordSeenPost(post, v);

  // ---------- Research context (own / inherited / meta-critique exception) ----------
  let hasResearchContext = v.isAboutResearch;
  let inheritedSignals: string[] = [];
  let inheritedScore = 0;
  let deweyClass = v.deweyClass;
  let viaParent = false;

  // Meta-critique posts qualify even without research adjacency, because
  // they're about the practice of research critique itself.
  if (!hasResearchContext && v.isMetaCritique) {
    hasResearchContext = true;
  }

  if (!hasResearchContext) {
    const linkedUris = [post.parentUri, post.rootUri, post.quotedUri]
      .filter((u): u is string => typeof u === 'string');
    if (linkedUris.length > 0) {
      // allowFetch is COST CONTROL, not classification. It decides whether
      // to spend an external Bluesky AppView call resolving the parent
      // post. Keyword signals are useful here as a cheap "is this post
      // promising enough to bother resolving its context?" check, since
      // making this fetch on every reply would significantly increase
      // AppView traffic and worsen rate limits. This is the one place
      // keyword flags still have decision power in the pipeline, and it's
      // bounded to API-cost decisions, not match decisions.
      const allowFetch =
        v.keywordCritical || v.keywordPraise || v.keywordInquiry ||
        v.weakPraiseHint || v.weakInquiryHint ||
        LOOSE_CRITICAL_HINT.test(post.text);
      const parent = await resolveParentUris(linkedUris, { allowFetch });
      if (parent?.verdict.isAboutResearch || parent?.verdict.isMetaCritique) {
        hasResearchContext = true;
        viaParent = true;
        inheritedSignals = parent.verdict.signals
          .filter((s) => !/^(crit|praise|inq):/.test(s))
          .map((s) => `parent_${s}`);
        inheritedScore = parent.verdict.researchScore * 0.5;
        deweyClass = parent.verdict.deweyClass ?? deweyClass;
      }
    }
  }

  if (!hasResearchContext) return emptyResult();

  // Compute research-URL boost: presence of DOI / arXiv / OpenReview / etc.
  // is a strong structural signal that this post is research engagement, so
  // we add a tier-based bonus to the adjacency score. CANONICAL and
  // PROCEEDINGS URLs add 3.0; INSTITUTIONAL adds 1.5. This pushes posts
  // with research-source URLs well above the worthLLM threshold and also
  // enables the stance-gate override below.
  const allUrls = [...post.urls, ...(viaParent ? [] : [])];
  const urlBoost = scoreResearchURLs(allUrls);
  const totalAdjacency = v.researchScore + inheritedScore + urlBoost.boost;
  const baseSignals = [...inheritedSignals, ...v.signals];
  if (urlBoost.tier !== 'none') {
    baseSignals.push(`url_tier:${urlBoost.tier}`, ...urlBoost.matched.map((m) => `url:${m}`));
  }
  const threadRoot = post.rootUri ?? post.parentUri ?? post.uri;

  // ---------- Path A: Strong keyword evidence (skip LLM call) ----------
  const strongKeywordCritique = v.critiqueHits.length >= 2 ||
    (v.critiqueHits.length === 1 && v.critiqueDimensions.length >= 1 && !isOnlyToneHit(v.critiqueHits));
  const strongKeywordPraise = v.praiseHits.length >= 2 ||
    (v.praiseHits.length === 1 && v.praiseDimensions.length >= 2);
  // Inquiry needs to be more conservative since questions are common.
  // Two ways to qualify:
  //   1. Strong same-type evidence: ≥2 hits of one sub-type → reliable sub-type label
  //   2. Substantial mixed evidence: ≥3 total hits across multiple sub-types → label as inquiry with no sub-type
  // We accept (2) so genuinely engaged posts that weave open-questions with
  // uncertainty hedging aren't lost, but we don't try to force a sub-type onto them.
  const inqCounts: Record<InquiryType, number> = {
    open_question: 0, neutral_uncertainty: 0, meta_critique: 0,
  };
  for (const h of v.inquiryHits) if (h.inquiryType) inqCounts[h.inquiryType]++;
  const maxSameType = Math.max(inqCounts.open_question, inqCounts.neutral_uncertainty, inqCounts.meta_critique);
  const strongKeywordInquiry = maxSameType >= 2 || v.inquiryHits.length >= 3;

  if (!USE_LLM) {
    if (strongKeywordCritique || v.critiqueHits.length > 0) {
      return buildResult({
        sentiment: 'critical',
        inquiryType: null,
        adjacency: totalAdjacency,
        keywordHits: v.critiqueHits.length,
        dimensions: v.critiqueDimensions,
        baseSignals, viaParent, deweyClass, threadRoot,
        classifier: 'keyword',
      });
    }
    if (strongKeywordPraise) {
      return buildResult({
        sentiment: 'praise',
        inquiryType: null,
        adjacency: totalAdjacency,
        keywordHits: v.praiseHits.length,
        dimensions: v.praiseDimensions,
        baseSignals, viaParent, deweyClass, threadRoot,
        classifier: 'keyword',
      });
    }
    if (strongKeywordInquiry) {
      // Heuristically pick the inquiry type — prefer meta_critique if any
      // meta hits, else the type with the most hits.
      const inqType = chooseInquiryType(v);
      return buildResult({
        sentiment: 'inquiry',
        inquiryType: inqType,
        adjacency: totalAdjacency,
        keywordHits: v.inquiryHits.length,
        dimensions: v.inquiryDimensions,
        baseSignals, viaParent, deweyClass, threadRoot,
        classifier: 'keyword',
      });
    }
    return emptyResult();
  }

  // ---------- Path B: LLM is the primary judge ----------
  //
  // Gating decision: which posts are worth an LLM call?
  //
  // Once research-adjacency is established, the LLM gets to decide. We
  // gate based on adjacency strength only, with two structural fast-paths:
  //   - Meta-critique posts (norm/ethics discussion) qualify regardless
  //     of adjacency because they may not cite any paper at all
  //   - Posts with strong research URLs (DOI / arXiv / OpenReview) qualify
  //     regardless of adjacency, because the URL is overwhelming evidence
  //
  // Keyword flags (v.keywordCritical etc.) are INTENTIONALLY OMITTED from
  // this decision. Keywords still feed the LLM via the `signals` array,
  // but they don't get to gate worth-LLM on their own. Earlier alpha
  // observation: keyword-only gating yielded ~10/10 false positives. The
  // URL classifier (research-urls.ts) plus the embedding pre-filter
  // together do a much better job of catching real research engagement.
  //
  // Cost: this widens the gate slightly (a few posts pass via the URL
  // tier that previously would've been gated by keyword flags). The
  // stance gate and full LLM filter downstream, so cost increase is
  // bounded and the precision improves.
  const worthLLM =
    totalAdjacency >= RESEARCH_LLM_THRESHOLD ||
    v.isMetaCritique ||
    urlBoost.tier !== 'none';

  if (!worthLLM) return emptyResult();

  // Embedding pre-filter
  const embedDecision = await shouldRunLLM(post.text);
  if (embedDecision.enabled && !embedDecision.worthLLM) {
    // Strong research URL is a structural override. A post with a DOI or
    // arXiv link is unlikely to be off-topic noise even if the embedding
    // pre-filter says no, so we let it through to the full classifier.
    if (!hasStrongResearchURL(allUrls)) {
      return emptyResult();
    }
  }
  const embedSignals = embedDecision.enabled
    ? [`embed:crit=${embedDecision.bestCritique.toFixed(2)},praise=${embedDecision.bestPraise.toFixed(2)},nei=${embedDecision.bestNeither.toFixed(2)}`]
    : [];

  // Stance gate (Phase B): a cheap LLM call asking just "ENGAGE / ANNOUNCE
  // / TANGENTIAL / OFF_TOPIC". Drops posts that read as dissemination or
  // off-topic banter before we spend tokens on the full classifier. The
  // CANONICAL / PROCEEDINGS URL override applies here too: if the post has
  // a DOI / arXiv / OpenReview link, we send it to the full LLM regardless
  // of stance, because the URL is strong structural evidence.
  let stanceSignal: string | null = null;
  if (isStanceGateEnabled()) {
    const stance = await detectStance(post.text);
    stanceSignal = `stance:${stance}`;
    const isStrongURL = hasStrongResearchURL(allUrls);
    if ((stance === 'TANGENTIAL' || stance === 'OFF_TOPIC') && !isStrongURL) {
      return emptyResult();
    }
    if (stance === 'ANNOUNCE' && !isStrongURL) {
      return emptyResult();
    }
  }
  const stanceSignals = stanceSignal ? [stanceSignal] : [];

  try {
    const { llmClassify } = await import('./llm-classify');
    const out = await llmClassify(post.text, [...baseSignals, ...embedSignals, ...stanceSignals]);

    const threshold =
      out.sentiment === 'praise' ? LLM_PRAISE_CONFIDENCE_THRESHOLD :
      out.sentiment === 'inquiry' ? LLM_INQUIRY_CONFIDENCE_THRESHOLD :
      LLM_CONFIDENCE_THRESHOLD;

    if (out.sentiment === 'neither' || out.confidence < threshold) {
      // High-precision mode: if the LLM says "neither" or low-confidence,
      // we trust it. No keyword fallback — keywords are signals, not
      // decision-makers when the LLM is the primary judge.
      return emptyResult();
    }

    const kwDims =
      out.sentiment === 'critical' ? v.critiqueDimensions :
      out.sentiment === 'praise' ? v.praiseDimensions :
      v.inquiryDimensions;
    const kwHitCount =
      out.sentiment === 'critical' ? v.critiqueHits.length :
      out.sentiment === 'praise' ? v.praiseHits.length :
      v.inquiryHits.length;
    const merged = Array.from(new Set([...kwDims, ...out.dimensions]));
    const llmSignals = [
      `llm_sent:${out.sentiment}`,
      ...(out.inquiryType ? [`llm_inq_type:${out.inquiryType}`] : []),
      `llm_conf:${out.confidence.toFixed(2)}`,
      `llm:${out.rationale}`,
      ...out.dimensions.map((d) => `llm_dim:${d}`),
      ...embedSignals,
    ];

    return buildResult({
      sentiment: out.sentiment,
      inquiryType: out.sentiment === 'inquiry' ? out.inquiryType : null,
      adjacency: totalAdjacency,
      keywordHits: kwHitCount,
      dimensions: merged,
      baseSignals: [...baseSignals, ...llmSignals],
      viaParent, deweyClass, threadRoot,
      classifier: kwHitCount > 0 ? 'keyword+llm' : 'llm',
      llmConfidence: out.confidence,
    });
  } catch (e) {
    // LLM call failed (network, rate limit, etc.). In high-precision mode
    // we drop the post rather than fall back to keyword-only. Worst case
    // is we miss a real match while the LLM is unavailable; best case is
    // we don't pollute the feed with low-confidence guesses.
    console.error('[llm] error', e);
    return emptyResult();
  }
}

function chooseInquiryType(v: Verdict): InquiryType | null {
  // Tightened heuristic: only assign a sub-type when there are ≥2 hits of
  // the SAME sub-type. Without that evidence we leave it null — the post may
  // still qualify as inquiry overall, but mislabelling sub-types poisons the
  // sub-type-specific sub-feeds (and meta_critique misclassification is
  // particularly bad: it surfaces posts in a feed about epistemic norms when
  // they're really questions about a specific paper, or vice versa).
  const counts: Record<InquiryType, number> = {
    open_question: 0, neutral_uncertainty: 0, meta_critique: 0,
  };
  for (const h of v.inquiryHits) {
    if (h.inquiryType) counts[h.inquiryType]++;
  }
  // meta_critique requires ≥2 explicit meta hits — matches detector's
  // isMetaCritique threshold. No tie-break privilege.
  if (counts.meta_critique >= 2) return 'meta_critique';
  // For open_question and neutral_uncertainty we also require ≥2 same-type
  // hits AND a strict plurality (no ties).
  if (counts.open_question >= 2 && counts.open_question > counts.neutral_uncertainty) {
    return 'open_question';
  }
  if (counts.neutral_uncertainty >= 2 && counts.neutral_uncertainty > counts.open_question) {
    return 'neutral_uncertainty';
  }
  // Mixed evidence — surface as inquiry but with no sub-type
  return null;
}

function buildResult(opts: {
  sentiment: Sentiment;
  inquiryType: InquiryType | null;
  adjacency: number;
  keywordHits: number;
  dimensions: Dimension[];
  baseSignals: string[];
  viaParent: boolean;
  deweyClass: DeweyClass | null;
  threadRoot: string;
  classifier: 'keyword' | 'llm' | 'keyword+llm';
  llmConfidence?: number;
}): ClassifyResult {
  const score =
    opts.adjacency * 0.5 +
    opts.keywordHits * 0.5 +
    opts.dimensions.length * 0.4 +
    (opts.llmConfidence ? opts.llmConfidence * 1.0 : 0);
  return {
    shouldSave: true,
    sentiment: opts.sentiment,
    inquiryType: opts.inquiryType,
    signals: opts.baseSignals,
    score,
    viaParent: opts.viaParent,
    dimensions: opts.dimensions,
    deweyClass: opts.deweyClass,
    threadRoot: opts.threadRoot,
    classifier: opts.classifier,
  };
}

function isOnlyToneHit(hits: { pattern: RegExp }[]): boolean {
  if (hits.length !== 1) return false;
  const toneOnly = /(flawed|sloppy|nonsense|bogus|dubious|questionable|misleading|skeptical|smell test|big if true|unpersuasive)/i;
  return toneOnly.test(hits[0].pattern.source);
}

function emptyResult(): ClassifyResult {
  return {
    shouldSave: false, sentiment: 'neither', inquiryType: null,
    signals: [], score: 0, viaParent: false,
    dimensions: [], deweyClass: null, threadRoot: '',
    classifier: 'keyword',
  };
}
