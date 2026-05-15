import {
  CRITIQUE_PATTERNS, PRAISE_PATTERNS, INQUIRY_PATTERNS,
  WEAK_PRAISE_HINT, WEAK_INQUIRY_HINT,
  Dimension, TaggedPattern, InquiryType,
} from './categories';
import { scoreResearchAdjacency, RESEARCH_ADJACENCY_THRESHOLD } from './research-adjacency';
import { DeweyClass } from './dewey';

export type Verdict = {
  // Research adjacency
  isAboutResearch: boolean;
  researchScore: number;
  // Critique evidence
  keywordCritical: boolean;
  critiqueHits: TaggedPattern[];
  critiqueDimensions: Dimension[];
  // Praise evidence
  keywordPraise: boolean;
  praiseHits: TaggedPattern[];
  praiseDimensions: Dimension[];
  weakPraiseHint: boolean;
  // Inquiry evidence
  keywordInquiry: boolean;
  inquiryHits: TaggedPattern[];
  inquiryDimensions: Dimension[];
  inquiryTypes: InquiryType[];
  weakInquiryHint: boolean;
  // Whether the post is purely meta-critique (about how to critique research,
  // not about a specific paper). These bypass strict research adjacency.
  isMetaCritique: boolean;
  // Aggregate
  signals: string[];
  deweyClass: DeweyClass | null;
};

export function preFilter(text: string, urls: string[]): Verdict {
  const adj = scoreResearchAdjacency(text, urls);
  const isAboutResearch = adj.score >= RESEARCH_ADJACENCY_THRESHOLD;

  const signals: string[] = [...adj.signals];

  // Critique
  const critiqueHits: TaggedPattern[] = [];
  for (const tp of CRITIQUE_PATTERNS) {
    const m = text.match(tp.pattern);
    if (m) {
      critiqueHits.push(tp);
      signals.push(`crit:${m[0]}`);
    }
  }

  // Praise
  const praiseHits: TaggedPattern[] = [];
  for (const tp of PRAISE_PATTERNS) {
    const m = text.match(tp.pattern);
    if (m) {
      praiseHits.push(tp);
      signals.push(`praise:${m[0]}`);
    }
  }

  // Inquiry
  const inquiryHits: TaggedPattern[] = [];
  const inquiryTypesSet = new Set<InquiryType>();
  for (const tp of INQUIRY_PATTERNS) {
    const m = text.match(tp.pattern);
    if (m) {
      inquiryHits.push(tp);
      signals.push(`inq:${m[0]}`);
      if (tp.inquiryType) inquiryTypesSet.add(tp.inquiryType);
    }
  }

  // Meta-critique posts are about HOW to critique research, not about any one
  // paper. They get a relaxed research-adjacency requirement: meta-critique
  // hits qualify a post even without URL/conference/vocab signals.
  const metaHits = inquiryHits.filter(h => h.inquiryType === 'meta_critique');
  const isMetaCritique = metaHits.length >= 2 ||
    (metaHits.length === 1 && inquiryHits.length >= 2);

  return {
    isAboutResearch,
    researchScore: adj.score,
    keywordCritical: critiqueHits.length > 0,
    critiqueHits,
    critiqueDimensions: collectDimensions(critiqueHits),
    keywordPraise: praiseHits.length > 0,
    praiseHits,
    praiseDimensions: collectDimensions(praiseHits),
    weakPraiseHint: WEAK_PRAISE_HINT.test(text),
    keywordInquiry: inquiryHits.length > 0,
    inquiryHits,
    inquiryDimensions: collectDimensions(inquiryHits),
    inquiryTypes: [...inquiryTypesSet],
    weakInquiryHint: WEAK_INQUIRY_HINT.test(text),
    isMetaCritique,
    signals,
    deweyClass: adj.deweyClass,
  };
}

function collectDimensions(matches: TaggedPattern[]): Dimension[] {
  const set = new Set<Dimension>();
  for (const m of matches) for (const d of m.dimensions) set.add(d);
  return [...set];
}
