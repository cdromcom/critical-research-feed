import express from 'express';
import { getFeedCandidates } from './db';
import { rerankForDiversity } from './diversity';

const HOSTNAME = process.env.HOSTNAME ?? 'localhost';
const SERVICE_DID = process.env.SERVICE_DID ?? `did:web:${HOSTNAME}`;
const FEED_RECORD_NAME = process.env.FEED_RECORD_NAME ?? 'critical-research';

// How many extra candidates to pull beyond `limit` so the diversity re-ranker
// has room to work. 5x is a reasonable starting point — enough headroom to
// drop near-duplicates and author/thread collisions, not so much we burn
// query time. Tune via env.
const CANDIDATE_MULTIPLIER = parseInt(process.env.CANDIDATE_MULTIPLIER ?? '5');
const DIVERSITY_ENABLED = (process.env.DIVERSITY_ENABLED ?? 'true') === 'true';

const DEWEY_SUFFIXES = ['000','100','200','300','400','500','600','700','800','900'];
const DIM_SUFFIXES = ['credibility','clarity','creativity','connectivity','care'];
const SENT_SUFFIXES = ['critical','praise','inquiry'];
const INQ_TYPE_ALIASES: Record<string, string> = {
  'open-question': 'open_question',
  'neutral-uncertainty': 'neutral_uncertainty',
  'meta-critique': 'meta_critique',
  'open_question': 'open_question',
  'neutral_uncertainty': 'neutral_uncertainty',
  'meta_critique': 'meta_critique',
};

export function startServer(port: number) {
  const app = express();

  app.get('/.well-known/did.json', (_req, res) => {
    res.json({
      '@context': ['https://www.w3.org/ns/did/v1'],
      id: SERVICE_DID,
      service: [{ id: '#bsky_fg', type: 'BskyFeedGenerator', serviceEndpoint: `https://${HOSTNAME}` }],
    });
  });

  app.get('/xrpc/app.bsky.feed.describeFeedGenerator', (_req, res) => {
    res.json({ did: SERVICE_DID, feeds: [{ uri: process.env.FEED_URI ?? '' }] });
  });

  app.get('/xrpc/app.bsky.feed.getFeedSkeleton', (req, res) => {
    const feedUri = String(req.query.feed ?? '');
    const limit = Math.min(parseInt(String(req.query.limit ?? '30')), 100);
    const cursor = req.query.cursor ? String(req.query.cursor) : undefined;

    const rkey = feedUri.split('/').pop() ?? '';
    if (!rkey.startsWith(FEED_RECORD_NAME)) {
      return res.status(400).json({ error: 'UnknownFeed' });
    }
    const suffix = rkey.slice(FEED_RECORD_NAME.length + 1);

    const opts: { dewey?: string; dimension?: string; sentiment?: string; inquiryType?: string } = {};
    let remaining = suffix;
    for (const alias of Object.keys(INQ_TYPE_ALIASES).sort((a, b) => b.length - a.length)) {
      if (remaining.includes(alias)) {
        opts.inquiryType = INQ_TYPE_ALIASES[alias];
        remaining = remaining.replace(alias, '');
        break;
      }
    }
    for (const part of remaining.split('-').filter(Boolean)) {
      if (DEWEY_SUFFIXES.includes(part)) opts.dewey = part;
      else if (DIM_SUFFIXES.includes(part)) opts.dimension = part;
      else if (SENT_SUFFIXES.includes(part)) opts.sentiment = part;
    }
    if (opts.inquiryType && !opts.sentiment) opts.sentiment = 'inquiry';
    if (suffix === '' && !opts.sentiment) opts.sentiment = 'critical';

    // Over-fetch, then diversify
    const fetchLimit = DIVERSITY_ENABLED ? limit * CANDIDATE_MULTIPLIER : limit;
    const candidates = getFeedCandidates(fetchLimit, cursor, opts);

    const picked = DIVERSITY_ENABLED
      ? rerankForDiversity(
          candidates.map((c) => ({
            uri: c.uri,
            did: c.did,
            text: c.text,
            score: c.score,
            indexedAt: c.indexed_at,
            threadRoot: c.thread_root,
            deweyClass: c.dewey_class,
            sentiment: c.sentiment,
            inquiryType: c.inquiry_type,
            dimensions: c.dimensions,
          })),
          limit
        )
      : candidates.slice(0, limit).map((c) => ({
          uri: c.uri, did: c.did, text: c.text, score: c.score,
          indexedAt: c.indexed_at, threadRoot: c.thread_root,
          deweyClass: c.dewey_class, sentiment: c.sentiment,
          inquiryType: c.inquiry_type, dimensions: c.dimensions,
        }));

    const feed = picked.map((r) => ({ post: r.uri }));

    // Log how aggressively diversity is reshaping the pool — useful for tuning
    if (DIVERSITY_ENABLED && candidates.length > 0) {
      const pickedSet = new Set(picked.map((p) => p.uri));
      const topPureScore = candidates.slice(0, limit).filter((c) => !pickedSet.has(c.uri)).length;
      if (topPureScore > 0) {
        console.log(
          `[feed] suffix="${suffix || '<root>'}" pool=${candidates.length} picked=${picked.length} demoted=${topPureScore}`
        );
      }
    }

    // Cursor: page on score of the LAST CANDIDATE seen (not the last picked),
    // so the next page picks up where this scan stopped. Without this, an
    // aggressive re-ranker could skip ahead in score-space and the next page
    // would re-fetch already-considered candidates.
    const last = candidates.length === fetchLimit ? candidates[candidates.length - 1] : null;
    const nextCursor = last ? `${last.score}::${last.indexed_at}` : undefined;

    res.json({ cursor: nextCursor, feed });
  });

  app.listen(port, () => console.log(`[server] listening on :${port}`));
}
