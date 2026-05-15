import { PostEvent } from './jetstream';
import { preFilter, Verdict } from './detector';
import { resolveParentUris, recordSeenPost } from './parent-resolver';
import { Dimension, Sentiment, InquiryType } from './categories';
import { DeweyClass } from './dewey';
import { shouldRunLLM } from './embedding';

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

  const totalAdjacency = v.researchScore + inheritedScore;
  const baseSignals = [...inheritedSignals, ...v.signals];
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

  // With LLM enabled, fast-path obvious critiques/praise; inquiry always goes to LLM
  // (too easy to false-positive without the model's judgment).
  if (strongKeywordCritique) {
    return buildResult({
      sentiment: 'critical', inquiryType: null,
      adjacency: totalAdjacency,
      keywordHits: v.critiqueHits.length,
      dimensions: v.critiqueDimensions,
      baseSignals, viaParent, deweyClass, threadRoot,
      classifier: 'keyword',
    });
  }
  if (strongKeywordPraise) {
    return buildResult({
      sentiment: 'praise', inquiryType: null,
      adjacency: totalAdjacency,
      keywordHits: v.praiseHits.length,
      dimensions: v.praiseDimensions,
      baseSignals, viaParent, deweyClass, threadRoot,
      classifier: 'keyword',
    });
  }

  // ---------- Path B: LLM call ----------
  const worthLLM =
    totalAdjacency >= RESEARCH_LLM_THRESHOLD ||
    v.isMetaCritique ||
    v.keywordCritical || v.keywordPraise || v.keywordInquiry ||
    v.weakPraiseHint || v.weakInquiryHint;

  if (!worthLLM) return emptyResult();

  // Embedding pre-filter
  const embedDecision = await shouldRunLLM(post.text);
  if (embedDecision.enabled && !embedDecision.worthLLM) {
    if (v.keywordCritical) {
      return buildResult({
        sentiment: 'critical', inquiryType: null,
        adjacency: totalAdjacency,
        keywordHits: v.critiqueHits.length,
        dimensions: v.critiqueDimensions,
        baseSignals: [...baseSignals, `embed_skip:nei=${embedDecision.bestNeither.toFixed(2)}`],
        viaParent, deweyClass, threadRoot,
        classifier: 'keyword',
      });
    }
    return emptyResult();
  }
  const embedSignals = embedDecision.enabled
    ? [`embed:crit=${embedDecision.bestCritique.toFixed(2)},praise=${embedDecision.bestPraise.toFixed(2)},nei=${embedDecision.bestNeither.toFixed(2)}`]
    : [];

  try {
    const { llmClassify } = await import('./llm-classify');
    const out = await llmClassify(post.text, [...baseSignals, ...embedSignals]);

    const threshold =
      out.sentiment === 'praise' ? LLM_PRAISE_CONFIDENCE_THRESHOLD :
      out.sentiment === 'inquiry' ? LLM_INQUIRY_CONFIDENCE_THRESHOLD :
      LLM_CONFIDENCE_THRESHOLD;

    if (out.sentiment === 'neither' || out.confidence < threshold) {
      // Fall back ONLY to keyword-critique (never to keyword-praise/inquiry
      // alone, which the LLM has effectively rejected as insufficient).
      if (v.keywordCritical) {
        return buildResult({
          sentiment: 'critical', inquiryType: null,
          adjacency: totalAdjacency,
          keywordHits: v.critiqueHits.length,
          dimensions: v.critiqueDimensions,
          baseSignals, viaParent, deweyClass, threadRoot,
          classifier: 'keyword',
        });
      }
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
    console.error('[llm] error', e);
    if (v.keywordCritical) {
      return buildResult({
        sentiment: 'critical', inquiryType: null,
        adjacency: totalAdjacency,
        keywordHits: v.critiqueHits.length,
        dimensions: v.critiqueDimensions,
        baseSignals, viaParent, deweyClass, threadRoot,
        classifier: 'keyword',
      });
    }
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
