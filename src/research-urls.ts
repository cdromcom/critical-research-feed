// Research-source URL classification.
//
// Separate from `dewey.ts` (which assigns DISCIPLINE) and from
// `research-adjacency.ts` (which scores OVERALL adjacency). This module
// answers a narrower question: how confident are we that this URL points at
// a primary research output as opposed to general media?
//
// We use four tiers:
//   - CANONICAL: DOI, arXiv, PubMed/PMC, bioRxiv/medRxiv, OSF, Zenodo,
//     Crossref, Semantic Scholar, OpenAlex, ORCID, SSRN, RePEc. These are
//     unambiguous research-output URLs. Posts containing them are very
//     likely to be research engagement.
//   - PROCEEDINGS: ACL Anthology, NeurIPS papers, ICML papers, ACM Digital
//     Library, IEEE Xplore, JMLR, OpenReview, EMNLP. Conference proceedings
//     and major preprint-adjacent venues.
//   - INSTITUTIONAL: .edu paper paths, .gov research domains (NIH, NSF,
//     CDC, NASA, USDA, etc.), major think tank report pages, university
//     repository systems. High-signal but more variable.
//   - WEAK / NONE: everything else (news, social, blog, commercial).
//
// The classifier in classifier.ts uses these tiers as follows:
//   - CANONICAL or PROCEEDINGS → strong adjacency boost (3.0 added)
//   - INSTITUTIONAL → moderate boost (1.5 added)
//   - Stance gate's "ANNOUNCE" verdict is OVERRIDDEN when a CANONICAL or
//     PROCEEDINGS URL is present — the URL is structural evidence strong
//     enough to merit the full LLM classification even when the post
//     reads as announcement.

export type ResearchURLTier = 'canonical' | 'proceedings' | 'institutional' | 'none';

export type ResearchURLClassification = {
  tier: ResearchURLTier;
  matchedPattern: string;
};

// CANONICAL: unambiguous research outputs. Most have a stable identifier
// format. We use specific path patterns where possible.
const CANONICAL_PATTERNS: { pattern: RegExp; name: string }[] = [
  // Universal DOI links
  { pattern: /doi\.org\/10\.\d+/i, name: 'doi.org' },
  { pattern: /dx\.doi\.org\/10\.\d+/i, name: 'dx.doi.org' },
  // arXiv (all variants)
  { pattern: /arxiv\.org\/(abs|pdf|html)\/\d+/i, name: 'arxiv' },
  { pattern: /arxiv\.org\/\d+\.\d+/i, name: 'arxiv-shortform' },
  // PubMed / PMC
  { pattern: /(?:^|\/\/|\.)pubmed\.ncbi\.nlm\.nih\.gov/i, name: 'pubmed' },
  { pattern: /(?:^|\/\/|\.)ncbi\.nlm\.nih\.gov\/pmc/i, name: 'pmc' },
  { pattern: /pmc\.ncbi\.nlm\.nih\.gov/i, name: 'pmc-direct' },
  // Major preprint servers
  { pattern: /(?:^|\/\/|\.)biorxiv\.org/i, name: 'biorxiv' },
  { pattern: /(?:^|\/\/|\.)medrxiv\.org/i, name: 'medrxiv' },
  { pattern: /(?:^|\/\/|\.)chemrxiv\.org/i, name: 'chemrxiv' },
  { pattern: /(?:^|\/\/|\.)psyarxiv\.com/i, name: 'psyarxiv' },
  { pattern: /(?:^|\/\/|\.)socarxiv\.org/i, name: 'socarxiv' },
  { pattern: /(?:^|\/\/|\.)engrxiv\.org/i, name: 'engrxiv' },
  { pattern: /(?:^|\/\/|\.)preprints\.org/i, name: 'preprints.org' },
  // Open repositories
  { pattern: /(?:^|\/\/|\.)osf\.io/i, name: 'osf' },
  { pattern: /(?:^|\/\/|\.)zenodo\.org/i, name: 'zenodo' },
  { pattern: /figshare\.com/i, name: 'figshare' },
  { pattern: /(?:^|\/\/|\.)dataverse\./i, name: 'dataverse' },
  // SSRN
  { pattern: /(?:^|\/\/|\.)ssrn\.com\/(abstract|sol3)/i, name: 'ssrn' },
  { pattern: /papers\.ssrn\.com/i, name: 'ssrn-papers' },
  // Economics preprints
  { pattern: /(?:^|\/\/|\.)repec\.org/i, name: 'repec' },
  { pattern: /ideas\.repec\.org/i, name: 'repec-ideas' },
  { pattern: /econpapers\.repec\.org/i, name: 'econpapers' },
  { pattern: /nber\.org\/(papers|system)/i, name: 'nber' },
  // Bibliographic and metadata services
  { pattern: /(?:^|\/\/|\.)semanticscholar\.org\/(paper|author)/i, name: 'semanticscholar' },
  { pattern: /(?:^|\/\/|\.)openalex\.org/i, name: 'openalex' },
  { pattern: /(?:^|\/\/|\.)orcid\.org\/0000-/i, name: 'orcid' },
  { pattern: /search\.crossref\.org/i, name: 'crossref' },
  // PLOS, eLife, Nature, Science direct paper paths
  { pattern: /journals\.plos\.org\/.+\/article/i, name: 'plos' },
  { pattern: /(?:^|\/\/|\.)elifesciences\.org\/(articles|reviewed-preprints)/i, name: 'elife' },
  { pattern: /(?:^|\/\/|\.)nature\.com\/articles\//i, name: 'nature-article' },
  { pattern: /(?:^|\/\/|\.)science\.org\/doi\//i, name: 'science-doi' },
  // Wiley, Springer, OUP, Cambridge, Taylor & Francis with article paths
  { pattern: /onlinelibrary\.wiley\.com\/doi\//i, name: 'wiley-doi' },
  { pattern: /link\.springer\.com\/(article|chapter)/i, name: 'springer-article' },
  { pattern: /academic\.oup\.com\/.+\/article/i, name: 'oup-article' },
  { pattern: /cambridge\.org\/core\/journals\/.+\/article/i, name: 'cambridge-article' },
  { pattern: /tandfonline\.com\/doi\//i, name: 'tandf-doi' },
  { pattern: /sciencedirect\.com\/science\/article/i, name: 'sciencedirect' },
  // PNAS, JAMA, NEJM, BMJ, Lancet
  { pattern: /(?:^|\/\/|\.)pnas\.org\/(doi|content)/i, name: 'pnas' },
  { pattern: /jamanetwork\.com\/journals\/.+\/(article|fullarticle)/i, name: 'jama' },
  { pattern: /(?:^|\/\/|\.)nejm\.org\/doi\//i, name: 'nejm' },
  { pattern: /(?:^|\/\/|\.)bmj\.com\/content/i, name: 'bmj' },
  { pattern: /(?:^|\/\/|\.)thelancet\.com\/journals/i, name: 'lancet' },
  // Open Books / monograph repositories
  { pattern: /(?:^|\/\/|\.)oapen\.org/i, name: 'oapen' },
  { pattern: /(?:^|\/\/|\.)doabooks\.org/i, name: 'doab' },
  { pattern: /www\.jstor\.org\/stable/i, name: 'jstor' },
];

// PROCEEDINGS: ML/CS/IR/NLP conference proceedings and adjacent venues.
const PROCEEDINGS_PATTERNS: { pattern: RegExp; name: string }[] = [
  // ML/AI/CS conferences
  { pattern: /(?:^|\/\/|\.)aclanthology\.org/i, name: 'acl-anthology' },
  { pattern: /aclweb\.org\/anthology/i, name: 'acl-anthology-legacy' },
  { pattern: /openreview\.net\/(forum|pdf|attachment)/i, name: 'openreview' },
  { pattern: /papers\.nips\.cc/i, name: 'neurips' },
  { pattern: /papers\.neurips\.cc/i, name: 'neurips-alt' },
  { pattern: /proceedings\.mlr\.press/i, name: 'pmlr' },
  { pattern: /(?:^|\/\/|\.)jmlr\.org\/papers/i, name: 'jmlr' },
  { pattern: /jmlr\.csail\.mit\.edu/i, name: 'jmlr-mit' },
  // ACM Digital Library
  { pattern: /dl\.acm\.org\/doi\//i, name: 'acm-dl-doi' },
  { pattern: /dl\.acm\.org\/citation/i, name: 'acm-dl-citation' },
  // IEEE Xplore
  { pattern: /ieeexplore\.ieee\.org\/(document|abstract)/i, name: 'ieee-xplore' },
  // Vision conferences
  { pattern: /openaccess\.thecvf\.com/i, name: 'cvf-openaccess' },
  // Workshops / specific conferences with paper pages
  { pattern: /(?:^|\/\/|\.)aaai\.org\/(papers|proceedings|ojs)/i, name: 'aaai' },
  { pattern: /ijcai\.org\/proceedings/i, name: 'ijcai' },
];

// INSTITUTIONAL: .gov research bodies, .edu paper-shaped paths, major
// think tanks. More variable than canonical but still strong signal.
const INSTITUTIONAL_PATTERNS: { pattern: RegExp; name: string }[] = [
  // US federal research agencies
  { pattern: /(?:^|\/\/|\.)nih\.gov/i, name: 'nih' },
  { pattern: /(?:^|\/\/|\.)nsf\.gov/i, name: 'nsf' },
  { pattern: /(?:^|\/\/|\.)cdc\.gov/i, name: 'cdc' },
  { pattern: /(?:^|\/\/|\.)nasa\.gov/i, name: 'nasa' },
  { pattern: /(?:^|\/\/|\.)usda\.gov/i, name: 'usda' },
  { pattern: /(?:^|\/\/|\.)noaa\.gov/i, name: 'noaa' },
  { pattern: /(?:^|\/\/|\.)epa\.gov/i, name: 'epa' },
  { pattern: /(?:^|\/\/|\.)cbo\.gov\/publication/i, name: 'cbo' },
  { pattern: /(?:^|\/\/|\.)gao\.gov\/products/i, name: 'gao' },
  { pattern: /(?:^|\/\/|\.)bls\.gov/i, name: 'bls' },
  { pattern: /(?:^|\/\/|\.)census\.gov/i, name: 'census' },
  { pattern: /(?:^|\/\/|\.)federalreserve\.gov\/(econres|pubs)/i, name: 'fed' },
  // International / EU
  { pattern: /(?:^|\/\/|\.)who\.int\/publications/i, name: 'who' },
  { pattern: /(?:^|\/\/|\.)worldbank\.org\/(en\/research|knowledgebase)/i, name: 'worldbank' },
  { pattern: /(?:^|\/\/|\.)oecd\.org\/(publications|papers)/i, name: 'oecd' },
  { pattern: /(?:^|\/\/|\.)imf\.org\/en\/publications/i, name: 'imf' },
  { pattern: /(?:^|\/\/|\.)ecb\.europa\.eu\/(pub|research)/i, name: 'ecb' },
  { pattern: /(?:^|\/\/|\.)bankofengland\.co\.uk\/(research|working-paper)/i, name: 'boe' },
  { pattern: /(?:^|\/\/|\.)ec\.europa\.eu\/.+\/research/i, name: 'ec-research' },
  // Think tanks (research-focused)
  { pattern: /(?:^|\/\/|\.)brookings\.edu\/(research|articles|reports)/i, name: 'brookings' },
  { pattern: /(?:^|\/\/|\.)rand\.org\/pubs/i, name: 'rand' },
  { pattern: /(?:^|\/\/|\.)urban\.org\/research/i, name: 'urban' },
  { pattern: /(?:^|\/\/|\.)resourcesforthefuture\.org\/publications/i, name: 'rff' },
  { pattern: /(?:^|\/\/|\.)pewresearch\.org\/(?:.+\/)?(?:report|study)/i, name: 'pew' },
  // University research/repository systems (paper-shaped paths)
  { pattern: /\.edu\/(?:[^/]+\/)*(paper|publication|research|report|working|preprint|technical-report)/i, name: 'edu-paper' },
  { pattern: /scholar\..+\.edu\//i, name: 'edu-scholar' },
  { pattern: /dspace\..+\.edu\//i, name: 'edu-dspace' },
  { pattern: /repository\..+\.edu\//i, name: 'edu-repository' },
];

export function classifyResearchURL(url: string): ResearchURLClassification {
  // Strip scheme/auth/query/fragment for matching where helpful;
  // patterns are written to match the URL as-is including the protocol.
  for (const { pattern, name } of CANONICAL_PATTERNS) {
    if (pattern.test(url)) return { tier: 'canonical', matchedPattern: name };
  }
  for (const { pattern, name } of PROCEEDINGS_PATTERNS) {
    if (pattern.test(url)) return { tier: 'proceedings', matchedPattern: name };
  }
  for (const { pattern, name } of INSTITUTIONAL_PATTERNS) {
    if (pattern.test(url)) return { tier: 'institutional', matchedPattern: name };
  }
  return { tier: 'none', matchedPattern: '' };
}

// Score boost contributed by the strongest URL in `urls`. Use the highest
// tier present; e.g. one DOI overrides three institutional links.
export type ResearchURLBoost = {
  boost: number;
  tier: ResearchURLTier;
  matched: string[];   // pattern names that matched, for logging
};

export function scoreResearchURLs(urls: string[]): ResearchURLBoost {
  let bestTier: ResearchURLTier = 'none';
  const matched: string[] = [];

  for (const url of urls) {
    const c = classifyResearchURL(url);
    if (c.tier === 'none') continue;
    matched.push(`${c.tier}:${c.matchedPattern}`);
    // Higher tier wins; canonical > proceedings > institutional > none
    if (
      c.tier === 'canonical' ||
      (c.tier === 'proceedings' && bestTier !== 'canonical') ||
      (c.tier === 'institutional' && bestTier !== 'canonical' && bestTier !== 'proceedings')
    ) {
      bestTier = c.tier;
    }
  }

  const boost =
    bestTier === 'canonical' ? 3.0 :
    bestTier === 'proceedings' ? 3.0 :
    bestTier === 'institutional' ? 1.5 :
    0;

  return { boost, tier: bestTier, matched };
}

// Convenience: returns true if any URL is a canonical-research or
// proceedings link. Used by classifier.ts as a stance-gate OVERRIDE: a
// post with a DOI / arXiv / OpenReview link still goes to the LLM even
// if the rhetorical stance classifier said "ANNOUNCE".
export function hasStrongResearchURL(urls: string[]): boolean {
  for (const url of urls) {
    const t = classifyResearchURL(url).tier;
    if (t === 'canonical' || t === 'proceedings') return true;
  }
  return false;
}
