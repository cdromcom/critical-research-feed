// Query-time diversity re-ranker.
//
// The matched-posts table is score-ranked, but raw score-order has known
// failure modes:
//   - One prolific author can dominate the top of the feed
//   - One viral thread can fill the feed with replies to itself
//   - One discipline / dimension can crowd out the others
//   - Near-duplicate posts (quote-posts, paraphrased reposts) all rank well
//
// This module runs AFTER getFeed has pulled an over-fetched candidate pool.
// It greedily selects items in a way that trades off score against
// dissimilarity to what's already been selected — MMR-flavored re-ranking,
// no embeddings required, just lightweight surface features.

export type Candidate = {
  uri: string;
  did: string;
  text: string;
  score: number;
  indexedAt: string;
  threadRoot: string | null;
  deweyClass: string | null;
  sentiment: string;
  inquiryType: string | null;
  dimensions: string[];      // parsed from JSON
};

export type DiversityOpts = {
  // No more than this many posts from a single author
  maxPerAuthor?: number;     // default 2
  // No more than this many posts sharing a thread_root
  maxPerThread?: number;     // default 2
  // Soft penalty per repeated Dewey class (subtracted from score per repeat)
  deweyRepeatPenalty?: number;     // default 0.3
  // Soft penalty per repeated 5C dimension
  dimensionRepeatPenalty?: number; // default 0.15
  // Soft penalty per repeated sentiment / inquiry-type
  sentimentRepeatPenalty?: number; // default 0.2
  // Reject posts whose text is too similar (Jaccard on word-shingles)
  textSimilarityThreshold?: number; // default 0.6
  // How many shingles to compare on (more = stricter near-dup detection)
  textShingleK?: number;            // default 3
};

const DEFAULTS: Required<DiversityOpts> = {
  maxPerAuthor: 2,
  maxPerThread: 2,
  deweyRepeatPenalty: 0.3,
  dimensionRepeatPenalty: 0.15,
  sentimentRepeatPenalty: 0.2,
  textSimilarityThreshold: 0.6,
  textShingleK: 3,
};

export function rerankForDiversity(
  candidates: Candidate[],
  targetLimit: number,
  optsIn?: DiversityOpts
): Candidate[] {
  const opts = { ...DEFAULTS, ...optsIn };
  const selected: Candidate[] = [];

  // Counters across what's been selected so far
  const authorCount = new Map<string, number>();
  const threadCount = new Map<string, number>();
  const deweyCount = new Map<string, number>();
  const dimensionCount = new Map<string, number>();
  const sentimentCount = new Map<string, number>();
  const selectedShingles: Set<string>[] = [];

  // Remaining pool, mutable
  const remaining = candidates.slice();

  while (selected.length < targetLimit && remaining.length > 0) {
    // Score each remaining candidate by score - penalties.
    // Hard caps (author / thread / near-dup) are filters; soft penalties
    // shape the ranking but don't outright reject.
    let bestIdx = -1;
    let bestAdjusted = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      // Hard caps
      if ((authorCount.get(c.did) ?? 0) >= opts.maxPerAuthor) continue;
      if (c.threadRoot && (threadCount.get(c.threadRoot) ?? 0) >= opts.maxPerThread) continue;

      // Near-duplicate text guard
      const shingles = makeShingles(c.text, opts.textShingleK);
      if (selectedShingles.some(s => jaccard(shingles, s) >= opts.textSimilarityThreshold)) continue;

      // Soft penalties
      let penalty = 0;
      if (c.deweyClass) {
        penalty += (deweyCount.get(c.deweyClass) ?? 0) * opts.deweyRepeatPenalty;
      }
      for (const d of c.dimensions) {
        penalty += (dimensionCount.get(d) ?? 0) * opts.dimensionRepeatPenalty;
      }
      const sentKey = c.inquiryType ? `${c.sentiment}:${c.inquiryType}` : c.sentiment;
      penalty += (sentimentCount.get(sentKey) ?? 0) * opts.sentimentRepeatPenalty;

      const adjusted = c.score - penalty;
      if (adjusted > bestAdjusted) {
        bestAdjusted = adjusted;
        bestIdx = i;
      }
    }

    if (bestIdx < 0) break; // every remaining candidate hit a hard cap

    const pick = remaining.splice(bestIdx, 1)[0];
    selected.push(pick);

    authorCount.set(pick.did, (authorCount.get(pick.did) ?? 0) + 1);
    if (pick.threadRoot) threadCount.set(pick.threadRoot, (threadCount.get(pick.threadRoot) ?? 0) + 1);
    if (pick.deweyClass) deweyCount.set(pick.deweyClass, (deweyCount.get(pick.deweyClass) ?? 0) + 1);
    for (const d of pick.dimensions) dimensionCount.set(d, (dimensionCount.get(d) ?? 0) + 1);
    const sentKey = pick.inquiryType ? `${pick.sentiment}:${pick.inquiryType}` : pick.sentiment;
    sentimentCount.set(sentKey, (sentimentCount.get(sentKey) ?? 0) + 1);
    selectedShingles.push(makeShingles(pick.text, opts.textShingleK));
  }

  return selected;
}

// Word k-shingles for cheap Jaccard near-duplicate detection.
function makeShingles(text: string, k: number): Set<string> {
  // Normalize: lowercase, strip URLs (heavy in this corpus, would dominate),
  // collapse whitespace.
  const normalized = text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tokens = normalized.split(' ').filter(Boolean);
  const out = new Set<string>();
  if (tokens.length < k) {
    if (tokens.length > 0) out.add(tokens.join(' '));
    return out;
  }
  for (let i = 0; i + k <= tokens.length; i++) {
    out.add(tokens.slice(i, i + k).join(' '));
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
}
