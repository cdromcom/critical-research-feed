// Research-adjacency scoring. Returns a confidence score (0..N) rather than
// a binary flag. Many weak signals can outweigh one strong one.
import { lookupDewey, CONFERENCE_PATTERNS, DeweyClass } from './dewey';

// Generic markers of academic discourse — useful across disciplines and
// not tied to specific paradigms. The point is to recognise that the post
// is *talking about scholarly work*, not to encode what counts as research.
const ACADEMIC_VOCAB: RegExp[] = [
  // Document types (any discipline)
  /\bpreprint\b/i, /\bpaper\b/i, /\bstudy\b/i, /\bauthors?\b/i,
  /\bfindings?\b/i, /\bmanuscript\b/i, /\babstract\b/i, /\bjournal\b/i,
  /\barticle\b/i, /\bmonograph\b/i, /\bdissertation\b/i, /\bthesis\b/i,
  /\bworking paper\b/i, /\bwhite paper\b/i, /\bchapter\b/i, /\bvolume\b/i,
  // Document types — gray literature (think-tank, policy, agency reports)
  /\b(policy|issue|research) brief(ing)?\b/i,
  /\b(technical|research|annual|interim|final) report\b/i,
  /\bdiscussion paper\b/i, /\boccasional paper\b/i, /\bblue book\b/i,
  /\bworking group\b.{0,20}\breport\b/i, /\bcommittee report\b/i,
  /\b(commissioned|consensus) (study|report)\b/i,
  /\bevidence (review|synthesis|brief)\b/i,
  /\b(scoping|systematic) review\b/i,
  /\bgrey literature\b/i, /\bgray literature\b/i,
  // Reading & writing
  /\bcited\b/i, /\bcitation\b/i, /\breference list\b/i, /\bbibliograph/i,
  /\bsupplementary\b/i, /\bappendix\b/i, /\bFigure\s*\d+\b/, /\bTable\s*\d+\b/,
  /\bsection \d/i, /\bChapter\s+\d/i,
  // Methods (quantitative)
  /\bdataset\b/i, /\bbenchmark\b/i, /\bclinical trial\b/i, /\bRCT\b/,
  /\bp[-\s]?value\b/i, /\bp\s*[<=]\s*0?\.0?\d/, /\beffect size\b/i,
  /\bcontrol group\b/i, /\bsample size\b/i, /\bcohort\b/i,
  /\bregression\b/i, /\bcoefficient\b/i, /\bhypothes(is|es)\b/i,
  /\bmeta[-\s]?analysis\b/i, /\bsystematic review\b/i,
  // Methods (qualitative & interpretive)
  /\binformant\b/i, /\binterview\w*\b/i, /\bfieldwork\b/i, /\bethnograph/i,
  /\bcase study\b/i, /\barchival\b/i, /\bcorpus\b/i, /\btextual analysis\b/i,
  /\bclose reading\b/i, /\bhermeneutic/i, /\bdiscourse analysis\b/i,
  /\bgrounded theory\b/i, /\bphenomenolog/i, /\bnarrative analysis\b/i,
  // Theory & framing (any discipline)
  /\btheoretical framework\b/i, /\bconceptual framework\b/i, /\bparadigm\b/i,
  /\bepistemolog/i, /\bontolog/i, /\bmethodolog/i,
  // Reviewing / publishing
  /\bpeer[-\s]?review/i, /\breviewer \d\b/i, /\beditor\b/i, /\beditorial\b/i,
  /\baccept(ed)?\b.{0,15}\b(journal|conference|venue)/i,
  /\brejection\b/i, /\bdesk[-\s]?reject/i, /\bR&R\b/, /\brevise and resubmit/i,
  // Identifiers
  /\barxiv\s*\d{4}\.\d{4,5}/i, /\bdoi:\s*10\./i, /\bISBN[:\s]/i,
  // Non-English research vocab
  /\bartículo\b/i, /\bestudio\b/i, /\binvestigación\b/i, /\btesis\b/i,
  /\bartigo\b/i, /\bestudo\b/i, /\bpesquisa\b/i, /\btese\b/i,
  /\b(article|étude|recherche|mémoire)\b/i,
  /\b(Studie|Forschung|Veröffentlichung|Dissertation)\b/i,
  /論文/, /研究/, /試験/, /学位/, /博士論文/,
  /论文/, /研究/, /试验/, /学位/, /博士论文/,
];

// Light heuristics that something is being *discussed academically* without
// using domain-specific vocab. These are weaker signals.
const ACADEMIC_CONTEXT: RegExp[] = [
  /\bjust read\b/i, /\bnew paper\b/i, /\bjust out\b/i, /\bin press\b/i,
  /\bout in\b.{0,30}\b(Nature|Science|Cell|Lancet|JAMA|PNAS|NEJM|BMJ)\b/i,
  /\baccepted (to|at|by)\b/i, /\bsubmitted to\b/i,
  /\bin (Nature|Science|Cell|JAMA|PNAS|NEJM|BMJ|Lancet)\b/i,
  /\bprof\.\s+\w+/i, /\bDr\.\s+\w+.{0,30}(paper|study|finds?|argues?)/i,
  /\b(lab|group|team).{0,15}(paper|study|preprint)\b/i,
  /\b(this|new) (review|meta-analysis|study|trial|paper|monograph)\b/i,
];

export type ResearchScore = {
  score: number;          // 0..N, higher = more likely about research
  signals: string[];
  deweyClass: DeweyClass | null;
};

export function scoreResearchAdjacency(text: string, urls: string[]): ResearchScore {
  const signals: string[] = [];
  let score = 0;
  let deweyClass: DeweyClass | null = null;

  // Strong signals: known academic URLs (1.5 each)
  for (const url of urls) {
    const d = lookupDewey(url);
    if (d) {
      signals.push(`url:${extractHost(url)}`);
      score += 1.5;
      if (!deweyClass) deweyClass = d;
    }
  }

  // Strong signals: conference mentions (1.2 each)
  for (const conf of CONFERENCE_PATTERNS) {
    const m = text.match(conf.pattern);
    if (m) {
      signals.push(`conf:${m[0]}`);
      score += 1.2;
      if (!deweyClass) deweyClass = conf.dewey;
    }
  }

  // Medium signals: academic vocab (0.4 each, capped contribution at ~2)
  let vocabHits = 0;
  for (const pat of ACADEMIC_VOCAB) {
    const m = text.match(pat);
    if (m) {
      vocabHits++;
      if (vocabHits <= 5) signals.push(`vocab:${m[0]}`);
    }
  }
  score += Math.min(vocabHits, 5) * 0.4;

  // Weak signals: academic context phrases (0.3 each, capped)
  let contextHits = 0;
  for (const pat of ACADEMIC_CONTEXT) {
    const m = text.match(pat);
    if (m) {
      contextHits++;
      if (contextHits <= 3) signals.push(`context:${m[0]}`);
    }
  }
  score += Math.min(contextHits, 3) * 0.3;

  return { score, signals, deweyClass };
}

// The threshold below which we don't treat a post as research-adjacent.
// Empirically 1.0 means: one academic URL OR conference OR ~3 vocab hits OR
// some combination thereof.
export const RESEARCH_ADJACENCY_THRESHOLD = 1.0;

function extractHost(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); }
  catch { return url.toLowerCase(); }
}
