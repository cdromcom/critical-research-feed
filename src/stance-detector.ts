// Rhetorical stance gate.
//
// A cheap pre-classifier that runs BEFORE the full LLM classification.
// Answers a single question: what rhetorical stance does this post take
// toward research? Four labels:
//
//   - ENGAGE: actively critiques, defends, questions methodology, or
//     discusses research-evaluation norms. Proceeds to full classifier.
//   - ANNOUNCE: describes or summarizes findings without taking a stance.
//     Author isn't critiquing or praising, they're sharing. This is
//     research dissemination, not engagement. DROPPED unless a strong
//     research URL (DOI / arXiv / OpenReview) is present.
//   - TANGENTIAL: research vocabulary used in non-research context.
//     Meme templates with scholarly facts, history banter, etc. DROPPED.
//   - OFF_TOPIC: no research engagement at all. Slipped through earlier
//     filters somehow. DROPPED.
//
// Uses DeepSeek V4 Flash via its OpenAI-compatible API. The full
// classifier in llm-classify.ts uses the same provider.
//
// Cost: ~$0.00002 per call on DeepSeek V4 Flash, so ~$0.02-0.06/day at
// our post volume.
//
// Failure mode: stance detector says ENGAGE but full classifier says
// "neither". Acceptable cost: the full classifier has the final word.
// The gate is asymmetric: it can DROP but cannot ELEVATE.

import OpenAI from 'openai';

export type Stance = 'ENGAGE' | 'ANNOUNCE' | 'TANGENTIAL' | 'OFF_TOPIC';

const STANCE_ENABLED = process.env.USE_STANCE_GATE === 'true';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com/v1',
    });
  }
  return client;
}

const STANCE_PROMPT = (text: string) => `Read this post. What rhetorical stance does it take toward research?

ENGAGE: actively critiques, defends, questions methodology/findings/scope, or discusses norms of how research should be evaluated and discussed.
ANNOUNCE: describes, summarizes, or shares findings without taking a stance. Press-release-shaped. Author is disseminating, not engaging.
TANGENTIAL: research vocabulary appears but in non-research context: meme templates, history banter, hobbyist trivia, off-topic discussion that happens to mention "study" or "research".
OFF_TOPIC: no real research connection at all.

Reply with ONE word: ENGAGE, ANNOUNCE, TANGENTIAL, or OFF_TOPIC.

POST:
"""
${text}
"""

ANSWER:`;

function parseStance(raw: string): Stance {
  const t = raw.trim().toUpperCase();
  if (t.startsWith('ENGAGE')) return 'ENGAGE';
  if (t.startsWith('ANNOUNCE')) return 'ANNOUNCE';
  if (t.startsWith('TANGENTIAL')) return 'TANGENTIAL';
  if (t.startsWith('OFF_TOPIC') || t.startsWith('OFF TOPIC') || t.startsWith('OFFTOPIC')) return 'OFF_TOPIC';
  // Defensive default: if we can't parse, send to full classifier rather
  // than drop. False positives are cheaper than false negatives here
  // because the full LLM has the final word.
  return 'ENGAGE';
}

export async function detectStance(text: string): Promise<Stance> {
  if (!STANCE_ENABLED) return 'ENGAGE';

  try {
    const resp = await getClient().chat.completions.create({
      model: process.env.STANCE_MODEL ?? process.env.DEEPSEEK_MODEL ?? 'deepseek-v4-flash',
      max_tokens: 8,
      temperature: 0,
      messages: [{ role: 'user', content: STANCE_PROMPT(text) }],
    });
    return parseStance(resp.choices[0]?.message?.content ?? '');
  } catch (e) {
    // On any error (rate limit, network, etc.) default to ENGAGE so we
    // don't drop posts because of a transient stance-service failure.
    // The full classifier will catch most false positives downstream.
    console.error('[stance] error, defaulting to ENGAGE', e);
    return 'ENGAGE';
  }
}

export function isStanceGateEnabled(): boolean {
  return STANCE_ENABLED;
}
