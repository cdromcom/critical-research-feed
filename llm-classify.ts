// LLM classifier — calls DeepSeek to make the final critical/praise/inquiry
// judgment on posts that the keyword pre-filter flagged as worth examining.
//
// Why DeepSeek instead of (Claude / GPT / Gemini)?
//   At this feed's volume (the Jetstream firehose), even a small per-call cost
//   adds up. DeepSeek is roughly an order of magnitude cheaper than the major
//   US labs' models, performs well on multilingual content (important — the
//   feed targets all languages), and supports the OpenAI-compatible API so we
//   can swap providers by changing two env vars.
//
// Why this prompt looks the way it does:
//   The default LLM behavior on academic discourse skews toward STEM framings —
//   given a critique of a humanities paper, it tends to ask "but where's the
//   experiment?" The prompt explicitly invites qualitative, interpretive,
//   theoretical, historiographical, hermeneutic, decolonial, and plain-language
//   critique as valid modes. The 5C dimensions (Credibility / Clarity /
//   Creativity / Connectivity / Care) come from the peer-review skill and apply
//   across paradigms.
//
// Why the four-class output:
//   "critical" / "praise" / "inquiry" / "neither". Inquiry has sub-types
//   (open_question, neutral_uncertainty, meta_critique) handled in the schema.
//   "neither" is the high-volume class we filter out — most paper-share posts
//   that aren't substantively engaging anything.

import OpenAI from 'openai';
import { Dimension, Sentiment, InquiryType } from './categories';

// Lazy singleton — only instantiated on first call. Avoids pulling in the
// DeepSeek API key for runs where USE_LLM_CLASSIFIER=false.
let client: OpenAI | null = null;
function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
    });
  }
  return client;
}

export type LLMResult = {
  sentiment: Sentiment | 'neither';
  inquiryType: InquiryType | null;
  confidence: number;     // 0..1, used by classifier.ts to gate inclusion
  rationale: string;      // short free-text reason, useful for debugging
  dimensions: Dimension[];
};

export async function llmClassify(text: string, signals: string[]): Promise<LLMResult> {
  // `response_format: json_object` forces the model to return parseable JSON.
  // max_tokens kept tight — we only need a short structured response.
  // temperature 0.1 because we want consistent classifications, not creativity.
  const resp = await getClient().chat.completions.create({
    model: process.env.DEEPSEEK_MODEL ?? 'deepseek-chat',
    max_tokens: 320,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
`You classify Bluesky posts that may substantively engage with a research report or with norms of research critique. Work across all disciplines and languages. Reply ONLY with valid JSON.`,
      },
      {
        role: 'user',
        content:
`Decide whether the post below substantively engages with a research report OR with the norms/ethics of how research is critiqued online.

Return one of four sentiments:
- "critical" — substantively criticizes, pushes back on, or expresses skepticism about specific research
- "praise" — substantively praises specific qualities of research (NOT vague compliments)
- "inquiry" — substantive open questions, neutral acknowledgement of uncertainty, OR meta-discussion of HOW research should be critiqued ethically and respectfully online
- "neither" — sharing, summarizing, vague reactions, unrelated commentary, or generic dunks/cheers

CRITICAL CRITERIA FOR "praise":
Vague enthusiasm DOES NOT qualify. "Great paper!", "amazing thread", "loved this", "must read" alone are "neither". To qualify, the post must point to specific qualities — methodology, design, novelty, framing, prior-work engagement, ethical care, clarity of argument.

CRITICAL CRITERIA FOR "critical":
Substantive critique across disciplines and traditions: quantitative methodology, qualitative trustworthiness, theoretical conflation, historiographical erasure, hermeneutic misreading, decolonial concerns, replicability, ethical lapses, plain-language pushback. Generic dunks ("bogus!", "junk science!") without engaging the work are "neither".

CRITICAL CRITERIA FOR "inquiry":
This category covers THREE related kinds of post; pick one for inquiryType:
- "open_question" — substantive question about a specific finding, method, scope, or relation to other work. Examples: "does this hold for non-WEIRD populations?", "how is this different from prior work on X?", "what was the attrition rate?", "how does the IV satisfy exclusion?". NOT: "is this real?" or "anyone seen this?" without substantive content.
- "neutral_uncertainty" — flags epistemic uncertainty without taking a side. Examples: "hard to know what to make of this — the effects are real but the mechanism is open", "I'm genuinely unsure if the conclusions follow", "jury is still out on this one". NOT: "interesting if true" or "hmm".
- "meta_critique" — discussion of HOW research should be critiqued online, ethically and respectfully. Topics include: charitable interpretation, steelmanning, public pile-ons, citation justice, post-publication review norms, power asymmetries in critique (e.g. critiquing junior scholars), good-faith engagement, scicomm ethics, hermeneutics of charity/suspicion. Meta-critique posts may not reference any specific paper.

Inquiry posts MUST be substantive. A bare question or hedge does not qualify. The post must show genuine engagement with content or norms.

For ANY sentiment except "neither", identify which of the 5C peer-review dimensions apply:
- "credibility": rigor, methodology, evidence, replication, trustworthiness
- "clarity": claim scope, definitions, transparency, reporting, conceptual coherence
- "creativity": novelty, significance, contribution, ambition
- "connectivity": engagement with prior work, situatedness, historiography
- "care": ethics, IRB, consent, COI, positionality, fabrication, representational harm, norms of critique

Report a CONFIDENCE from 0 to 1.

Existing pre-filter signals: ${signals.join(', ') || 'none'}

POST:
"""
${text}
"""

Reply with JSON:
{"sentiment": "critical"|"praise"|"inquiry"|"neither", "inquiryType": "open_question"|"neutral_uncertainty"|"meta_critique"|null, "confidence": 0.0-1.0, "dimensions": ["credibility"|"clarity"|"creativity"|"connectivity"|"care"], "rationale": "<= 14 words, any language"}`,
      },
    ],
  });

  // Validate and normalize the model's response. Even with json_object mode,
  // models can hallucinate keys or out-of-vocabulary enum values — we defend
  // against that by checking each field against the allowed set, defaulting
  // to safe values when something doesn't match.
  const content = resp.choices[0]?.message?.content ?? '';
  try {
    const parsed = JSON.parse(content);
    const sentiment: LLMResult['sentiment'] =
      parsed.sentiment === 'critical' ? 'critical' :
      parsed.sentiment === 'praise' ? 'praise' :
      parsed.sentiment === 'inquiry' ? 'inquiry' : 'neither';
    // Sub-type only meaningful if sentiment is "inquiry"; ignore otherwise.
    const inquiryType: InquiryType | null =
      sentiment === 'inquiry' && typeof parsed.inquiryType === 'string' &&
      ['open_question', 'neutral_uncertainty', 'meta_critique'].includes(parsed.inquiryType)
        ? parsed.inquiryType as InquiryType
        : null;
    const dims = (Array.isArray(parsed.dimensions) ? parsed.dimensions : []).filter(
      (d: unknown): d is Dimension =>
        typeof d === 'string' &&
        ['credibility', 'clarity', 'creativity', 'connectivity', 'care'].includes(d)
    );
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : (sentiment === 'neither' ? 0.3 : 0.7);
    return {
      sentiment, inquiryType, confidence,
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale.slice(0, 140) : '',
      dimensions: dims,
    };
  } catch {
    // Bad JSON / network error / model returning prose — treat as "no
    // verdict" and the classifier will fall back to keyword evidence if any.
    return { sentiment: 'neither', inquiryType: null, confidence: 0, rationale: '', dimensions: [] };
  }
}
