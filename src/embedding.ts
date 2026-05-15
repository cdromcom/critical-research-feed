// Embedding-based pre-filter.
//
// Maintains a small set of EXEMPLAR posts for each of four classes
// (critique, praise, inquiry, neither). For each incoming post, embed once
// and compare to the exemplars. Skip the LLM call when "neither" beats all
// three positive classes by a margin.

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const EMBED_ENABLED = (process.env.USE_EMBEDDING_PREFILTER ?? 'false') === 'true';
const EMBED_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const EMBED_BASE_URL = process.env.EMBEDDING_BASE_URL ?? 'https://api.openai.com/v1';
const EMBED_API_KEY = process.env.EMBEDDING_API_KEY ?? process.env.OPENAI_API_KEY;
const MARGIN = parseFloat(process.env.EMBED_MARGIN ?? '0.05');
const CACHE_PATH = process.env.EXEMPLARS_PATH ?? path.resolve('exemplars.json');

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    if (!EMBED_API_KEY) throw new Error('EMBEDDING_API_KEY (or OPENAI_API_KEY) is required when USE_EMBEDDING_PREFILTER is true');
    client = new OpenAI({ apiKey: EMBED_API_KEY, baseURL: EMBED_BASE_URL });
  }
  return client;
}

export type ExemplarClass = 'critique' | 'praise' | 'inquiry' | 'neither';

type Exemplar = {
  text: string;
  klass: ExemplarClass;
  embedding?: number[];
};

let exemplars: Exemplar[] = [];
let exemplarsReady = false;

const BUILT_IN_EXEMPLARS: Exemplar[] = [
  // ---- critique ----
  { klass: 'critique', text: "the effect size here is implausible given n=24 and they ran way too many comparisons" },
  { klass: 'critique', text: "title says X causes Y but the data only shows correlation across two cohorts" },
  { klass: 'critique', text: "the paper completely ignores the existing literature on this — Stigler's law in action" },
  { klass: 'critique', text: "no preregistration, code not available, and the supplement is missing key model specs" },
  { klass: 'critique', text: "this is yet another rehash of work done in the 90s — what's actually novel?" },
  { klass: 'critique', text: "the qualitative claims rest on a single interview without member-checking or triangulation" },
  { klass: 'critique', text: "ahistorical reading of the source material; the periodization here doesn't hold up" },
  { klass: 'critique', text: "extractive research with no community partnership and no reflexivity about positionality" },
  { klass: 'critique', text: "Goodhart's law alert: the benchmark they're optimizing isn't measuring what they think" },
  { klass: 'critique', text: "the construct is never properly defined and slides between three meanings across the paper" },
  { klass: 'critique', text: "test set contamination — the eval data appears in their training corpus" },
  { klass: 'critique', text: "this 'finding' doesn't replicate in the larger samples the authors had available" },
  { klass: 'critique', text: "they're overclaiming generality from a WEIRD convenience sample of undergrads" },
  { klass: 'critique', text: "the archival silences here are doing real argumentative work that the authors don't acknowledge" },
  { klass: 'critique', text: "es engañoso decir que esto demuestra causalidad cuando solo es una correlación débil" },
  { klass: 'critique', text: "amostra pequena, sem grupo controle, e os autores não citam o trabalho anterior fundamental" },

  // ---- praise ----
  { klass: 'praise', text: "well-powered preregistered replication with open data and code — exactly how this should be done" },
  { klass: 'praise', text: "rigorous causal identification using an unusually clean instrument; limitations honestly stated" },
  { klass: 'praise', text: "genuinely novel framing that opens a new research agenda — going on the syllabus" },
  { klass: 'praise', text: "deep archival work, careful periodization, beautifully written — landmark in the field" },
  { klass: 'praise', text: "thorough engagement with the existing literature including the older European tradition often missed" },
  { klass: 'praise', text: "community-based participatory design with meaningful co-authorship and data sovereignty respected" },
  { klass: 'praise', text: "rich ethnographic description with sustained reflexivity about the researcher's position" },
  { klass: 'praise', text: "elegant proof, the construction generalizes in a way the prior work didn't anticipate" },
  { klass: 'praise', text: "extensive robustness checks across alternative specifications — the result really holds up" },
  { klass: 'praise', text: "the scoping is exemplary — they're careful about what their evidence can and cannot show" },
  { klass: 'praise', text: "estudio riguroso con preregistro y datos abiertos, una contribución importante al campo" },
  { klass: 'praise', text: "étude bien conçue, identification causale propre, contribution majeure" },

  // ---- inquiry: open_question ----
  { klass: 'inquiry', text: "genuine question: how does this hold up when you condition on the pre-2015 subsample?" },
  { klass: 'inquiry', text: "curious how the authors are operationalizing 'social trust' here — it seems to slide between two definitions" },
  { klass: 'inquiry', text: "has anyone tried to replicate this with a non-WEIRD population? the mechanism seems context-dependent" },
  { klass: 'inquiry', text: "how does the IV satisfy the exclusion restriction given the regional spillovers documented in the appendix?" },
  { klass: 'inquiry', text: "wondering how this finding relates to the older qualitative work by Becker — any synthesis attempted?" },
  // ---- inquiry: neutral_uncertainty ----
  { klass: 'inquiry', text: "hard to know what to make of this — the effects look real but the mechanism story is wide open" },
  { klass: 'inquiry', text: "I'm genuinely on the fence here; the design is clever but the interpretation goes further than the data supports" },
  { klass: 'inquiry', text: "real tension between the qualitative findings and the regression results — withholding judgment" },
  { klass: 'inquiry', text: "this is plausible but not yet settled; want to see the next round of replications before forming a view" },
  { klass: 'inquiry', text: "the evidence cuts both ways and I think this is genuinely an open empirical question" },
  // ---- inquiry: meta_critique ----
  { klass: 'inquiry', text: "we need better norms for critiquing junior scholars in public — the power asymmetry matters and pile-ons cause real harm" },
  { klass: 'inquiry', text: "post-publication review on social media should default to charitable readings and steelmanning before takedowns" },
  { klass: 'inquiry', text: "citation justice as a methodology — who gets cited matters, and our review norms should reflect that" },
  { klass: 'inquiry', text: "Rapoport's rules for online critique: restate the position generously, list points of agreement, then push back" },
  { klass: 'inquiry', text: "the slow-science movement is a response to a real pathology: incentives push us toward fast dunks over careful engagement" },

  // ---- neither (the volume class we want to filter out) ----
  { klass: 'neither', text: "new paper out! check it out" },
  { klass: 'neither', text: "thrilled to share our latest work — please share widely" },
  { klass: 'neither', text: "great paper from my colleagues" },
  { klass: 'neither', text: "this is so cool, must read" },
  { klass: 'neither', text: "anyone going to NeurIPS this year? meet at the poster session" },
  { klass: 'neither', text: "tldr: large model is better than small model on benchmark" },
  { klass: 'neither', text: "summary thread on a great new arXiv paper, 1/n" },
  { klass: 'neither', text: "if you're interested in this area you should also check out this older paper" },
  { klass: 'neither', text: "congrats to the authors on the acceptance!" },
  { klass: 'neither', text: "submitted my first paper today — wish me luck" },
  { klass: 'neither', text: "reading this on the train, will report back" },
  { klass: 'neither', text: "interesting if true, more analysis needed" },
];

export async function initEmbeddingsIfEnabled(): Promise<void> {
  if (!EMBED_ENABLED) return;
  if (exemplarsReady) return;

  exemplars = loadExemplars();
  await embedExemplars();
  exemplarsReady = true;
  console.log(
    `[embed] ready — model=${EMBED_MODEL} exemplars=${exemplars.length} (crit/praise/inquiry/neither = ${count('critique')}/${count('praise')}/${count('inquiry')}/${count('neither')}) margin=${MARGIN}`
  );
}

function loadExemplars(): Exemplar[] {
  if (fs.existsSync(CACHE_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((r: any) => ({ text: r.text, klass: r.klass }));
      }
    } catch (e) {
      console.warn(`[embed] failed to read exemplars at ${CACHE_PATH}, using built-ins`, e);
    }
  }
  return BUILT_IN_EXEMPLARS.slice();
}

function count(k: ExemplarClass): number {
  return exemplars.filter((e) => e.klass === k).length;
}

async function embedExemplars() {
  const texts = exemplars.map((e) => e.text);
  const vectors = await embedBatch(texts);
  for (let i = 0; i < exemplars.length; i++) exemplars[i].embedding = vectors[i];
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const slice = texts.slice(i, i + 100);
    const res = await getClient().embeddings.create({ model: EMBED_MODEL, input: slice });
    for (const d of res.data) out.push(d.embedding as number[]);
  }
  return out;
}

async function embedOne(text: string): Promise<number[] | null> {
  try {
    const [v] = await embedBatch([text]);
    return v;
  } catch (e) {
    console.error('[embed] embed error', e);
    return null;
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export type EmbedDecision = {
  enabled: boolean;
  worthLLM: boolean;
  bestCritique: number;
  bestPraise: number;
  bestInquiry: number;
  bestNeither: number;
};

export async function shouldRunLLM(text: string): Promise<EmbedDecision> {
  if (!EMBED_ENABLED || !exemplarsReady) {
    return { enabled: false, worthLLM: true, bestCritique: 0, bestPraise: 0, bestInquiry: 0, bestNeither: 0 };
  }
  const v = await embedOne(text);
  if (!v) {
    return { enabled: true, worthLLM: true, bestCritique: 0, bestPraise: 0, bestInquiry: 0, bestNeither: 0 };
  }
  let bestCritique = -1, bestPraise = -1, bestInquiry = -1, bestNeither = -1;
  for (const e of exemplars) {
    if (!e.embedding) continue;
    const s = cosine(v, e.embedding);
    if (e.klass === 'critique' && s > bestCritique) bestCritique = s;
    else if (e.klass === 'praise' && s > bestPraise) bestPraise = s;
    else if (e.klass === 'inquiry' && s > bestInquiry) bestInquiry = s;
    else if (e.klass === 'neither' && s > bestNeither) bestNeither = s;
  }
  const positive = Math.max(bestCritique, bestPraise, bestInquiry);
  const worthLLM = positive >= bestNeither - MARGIN;
  return { enabled: true, worthLLM, bestCritique, bestPraise, bestInquiry, bestNeither };
}

export function seedExemplars(targetPath?: string) {
  const p = targetPath ?? CACHE_PATH;
  fs.writeFileSync(p, JSON.stringify(BUILT_IN_EXEMPLARS, null, 2));
  console.log(`Wrote ${BUILT_IN_EXEMPLARS.length} starter exemplars to ${p}`);
}
