// LLM classifier. Makes the final critical/praise/inquiry judgment on posts.
//
// Uses DeepSeek V4 via its OpenAI-compatible API. The stance gate
// (stance-detector.ts) uses the same provider. Cost is roughly $0.0002
// per classification call, so $0.50-2/day at firehose volume.
//
// Why this prompt looks the way it does:
//   Default LLM behavior on academic discourse skews toward STEM framings.
//   Given a critique of a humanities paper, models tend to ask "but where's
//   the experiment?" The prompt explicitly invites qualitative, interpretive,
//   theoretical, historiographical, hermeneutic, decolonial, and plain-language
//   critique as valid modes. The 5C dimensions (Credibility / Clarity /
//   Creativity / Connectivity / Care) come from the peer-review skill.
//
// Output schema:
//   "critical" / "praise" / "inquiry" / "neither". Inquiry has sub-types
//   (open_question, neutral_uncertainty, meta_critique). "neither" is the
//   high-volume class we filter out.

import OpenAI from 'openai';
import { Dimension, Sentiment, InquiryType } from './categories';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is required when USE_LLM_CLASSIFIER=true');
    }
    client = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
    });
  }
  return client;
}

export type LLMResult = {
  sentiment: Sentiment | 'neither';
  inquiryType: InquiryType | null;
  confidence: number;
  rationale: string;
  dimensions: Dimension[];
};

const SYSTEM_PROMPT =
`You classify Bluesky posts that may substantively engage with a research report or with norms of research critique. Work across all disciplines and languages. Reply ONLY with valid JSON.`;

function userPrompt(text: string, signals: string[]): string {
  return `Decide whether the post below substantively engages with a research report OR with the norms/ethics of how research is critiqued online.

THE KEY DISTINCTION: research **dissemination** is NOT research **engagement**.
- Dissemination: announcing, summarizing, or sharing findings of a paper, with or without stats and a link. The author is NOT critiquing, praising specifically, or questioning the work. Classify as "neither".
- Engagement: critiquing, defending, praising specific qualities, asking substantive questions, or discussing meta-norms of critique. Classify as critical/praise/inquiry as appropriate.

Posts that READ like a press release, a paper summary, an authors-promoting-their-own-finding tweet, a public-health stat thread, or a "here are the numbers from this study" thread are dissemination, not engagement. These are "neither" even if they cite a real paper with real data.

Return one of four sentiments:
- "critical": substantively criticizes, pushes back on, or expresses skepticism about specific research
- "praise": substantively praises specific qualities of research (NOT vague compliments)
- "inquiry": substantive open questions, neutral acknowledgement of uncertainty, OR meta-discussion of HOW research should be critiqued ethically and respectfully online
- "neither": sharing, summarizing, vague reactions, unrelated commentary, generic dunks/cheers, opinion takes that don't engage a specific research output, journalism critique (unless about academic journalism research itself), bot/automated posts, news article shares, research dissemination, meme templates with research-flavored vocabulary, off-topic banter that happens to mention "study" or "research"

EXAMPLE CLASSIFICATIONS (study these carefully, they reflect real patterns the feed has encountered):

Example 1: POSITIVE, critical with meta_critique:
Post: "Under this system, authors pay one credit even for a desk rejection. The snake part: it presents itself as fairness 'credit where credit is due' while actually redistributing power further toward established journals and large institutional actors, dressed in the language of reform."
Classification: {"sentiment": "critical", "inquiryType": null, "confidence": 0.92, "dimensions": ["care", "connectivity"], "rationale": "specific critique of peer-review reform proposal naming power asymmetry"}

Example 2: POSITIVE, critical with credibility/care:
Post: "hallucinated references disproportionately assign credit to already prominent and male scholars, suggesting that LLM-generated errors may reinforce existing inequities in scientific recognition"
Classification: {"sentiment": "critical", "inquiryType": null, "confidence": 0.90, "dimensions": ["credibility", "care"], "rationale": "engages specific finding about LLM citation bias and equity implications"}

Example 3: POSITIVE, inquiry/meta_critique on research-evaluation norms:
Post: "Courts issue sanctions for improper citation, but: 1. opposing counsel has incentive to conduct adversarial scrutiny 2. legal citation practices are much more specific. Author intent in journal citation is often ambiguous."
Classification: {"sentiment": "inquiry", "inquiryType": "meta_critique", "confidence": 0.88, "dimensions": ["connectivity", "care"], "rationale": "compares scrutiny norms across disciplines, substantive meta-discussion"}

Example 4: NEGATIVE, research dissemination not engagement:
Post: "Symptoms lasting 12+ months were linked to 2x worse perceived economic status, despite stable household income. Prevalence: 13% at 3 months, 11% at 6 months, 6% at 12 months. No differences in actual income or work attendance in Japanese cohort. (n=2,756) #LongCovid [paper link]"
Classification: {"sentiment": "neither", "inquiryType": null, "confidence": 0.93, "dimensions": [], "rationale": "paper summary with stats, dissemination not engagement"}

Example 5: NEGATIVE, meme template with scholarly vocabulary:
Post: "You: please act normal you need these people to like you. Me: ok! People: hi. Me: The claim that medieval English archers shot 12 arrows per minute originates from an anonymous article in 1832 edition of the USMNJ..."
Classification: {"sentiment": "neither", "inquiryType": null, "confidence": 0.90, "dimensions": [], "rationale": "meme template for showing off niche knowledge, not engagement with a research report"}

Example 6: NEGATIVE, off-topic with no research signal:
Post: "It's hard for me to quantify how much I hate Freestyle machines. Coke should taste like Coke not that flat poorly mixed nonsense..."
Classification: {"sentiment": "neither", "inquiryType": null, "confidence": 0.97, "dimensions": [], "rationale": "soda preference rant, no research engagement"}

Example 7: NEGATIVE, opinion take with no specific research cited:
Post: "I really dislike the co-optation of the word 'hallucinate' for a black box running code."
Classification: {"sentiment": "neither", "inquiryType": null, "confidence": 0.85, "dimensions": [], "rationale": "linguistic opinion, doesn't engage a specific research output"}

ADDITIONAL NEGATIVE PATTERNS (also classify as "neither"):
- "ArXiv Paper Poster: <title> arxiv.org/abs/..." (automated bot announcement)
- "Exciting new paper just dropped! [link]" (vague excitement)
- "<news article URL> + political commentary" (news commentary, not research engagement)
- "<headline quote from news article>" (sharing news)
- "@nytimes defended their reporter by..." (criticizing journalism, not research)
- Quote-posts of paper announcements with no commentary of your own
- "View full thread" / "Read more" / robot emojis / "auto-generated" markers
- Pop-history banter even if it cites specific texts (it's banter, not research engagement)

CRITICAL CRITERIA FOR "praise":
Vague enthusiasm DOES NOT qualify. "Great paper!", "amazing thread", "loved this", "must read" alone are "neither". To qualify, the post must point to specific qualities: methodology, design, novelty, framing, prior-work engagement, ethical care, clarity of argument.

CRITICAL CRITERIA FOR "critical":
Substantive critique across disciplines and traditions: quantitative methodology, qualitative trustworthiness, theoretical conflation, historiographical erasure, hermeneutic misreading, decolonial concerns, replicability, ethical lapses, plain-language pushback. Generic dunks ("bogus!", "junk science!") without engaging the work are "neither".

CRITICAL CRITERIA FOR "inquiry":
This category covers THREE related kinds of post; pick one for inquiryType:
- "open_question": substantive question about a specific finding, method, scope, or relation to other work
- "neutral_uncertainty": flags epistemic uncertainty without taking a side
- "meta_critique": discussion of HOW research should be critiqued online, ethically and respectfully

Inquiry posts MUST be substantive. A bare question or hedge does not qualify.

For ANY sentiment except "neither", identify which of the 5C peer-review dimensions apply:
- "credibility": rigor, methodology, evidence, replication, trustworthiness
- "clarity": claim scope, definitions, transparency, reporting, conceptual coherence
- "creativity": novelty, significance, contribution, ambition
- "connectivity": engagement with prior work, situatedness, historiography
- "care": ethics, IRB, consent, COI, positionality, fabrication, representational harm, norms of critique

Report a CONFIDENCE from 0 to 1. When in doubt between "neither" and a positive sentiment, prefer "neither". This feed values precision over recall.

Existing pre-filter signals: ${signals.join(', ') || 'none'}

POST:
"""
${text}
"""

Reply with JSON:
{"sentiment": "critical"|"praise"|"inquiry"|"neither", "inquiryType": "open_question"|"neutral_uncertainty"|"meta_critique"|null, "confidence": 0.0-1.0, "dimensions": ["credibility"|"clarity"|"creativity"|"connectivity"|"care"], "rationale": "<= 14 words, any language"}`;
}

export async function llmClassify(text: string, signals: string[]): Promise<LLMResult> {
  const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash';
  const resp = await getClient().chat.completions.create({
    model,
    max_tokens: 320,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt(text, signals) },
    ],
  });
  return parseLLMResponse(resp.choices[0]?.message?.content ?? '');
}

function parseLLMResponse(content: string): LLMResult {
  try {
    const parsed = JSON.parse(content);
    const sentiment: LLMResult['sentiment'] =
      parsed.sentiment === 'critical' ? 'critical' :
      parsed.sentiment === 'praise' ? 'praise' :
      parsed.sentiment === 'inquiry' ? 'inquiry' : 'neither';
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
    return { sentiment: 'neither', inquiryType: null, confidence: 0, rationale: '', dimensions: [] };
  }
}
