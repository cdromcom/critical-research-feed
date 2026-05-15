// Entry point. Wires together the four moving pieces of the feed:
//
//   1. Jetstream subscription (jetstream.ts) — Bluesky's lightweight JSON
//      firehose of every new post on the network. We receive each post and
//      pass it to the classifier.
//   2. Classifier (classifier.ts) — decides whether a post is substantive
//      critique/praise/inquiry about a research report. Returns null for the
//      ~99% of posts that aren't relevant.
//   3. Storage + thread tracking (db.ts, thread-tracker.ts) — persists matched
//      posts and updates per-thread engagement counters used for "debate" detection.
//   4. HTTP server (server.ts) — implements the Bluesky feed-generator XRPC
//      endpoints that the app calls when a user views the feed.
//
// This file should stay small. Most logic lives in the modules above; here
// we just thread the data through.

import 'dotenv/config';
import { startJetstream } from './jetstream';
import { classifyPost } from './classifier';
import { savePost, pruneOlderThan, boostThreadScores } from './db';
import { recordEngagementInThread, pruneOldThreads } from './thread-tracker';
import { startServer } from './server';
import { getCacheStats } from './parent-resolver';
import { initEmbeddingsIfEnabled } from './embedding';

// Tunable thresholds. Defaults are reasonable; see README for tuning advice.
const MIN_LEN = parseInt(process.env.MIN_POST_LENGTH ?? '30');
const PORT = parseInt(process.env.PORT ?? '3000');
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS ?? '7');

// Start the HTTP server first so the Bluesky AppView can validate our
// /.well-known/did.json endpoint as soon as the feed record is published.
startServer(PORT);

// Optional embedding pre-filter. Reads exemplars and computes their
// vectors. If disabled or if the API key is missing, this is a no-op and
// the classifier proceeds without the pre-filter.
initEmbeddingsIfEnabled().catch((e) => {
  console.error('[embed] init failed; continuing without pre-filter', e);
});

// Hourly maintenance: prune posts and threads older than RETENTION_DAYS,
// and log parent-resolver cache stats for visibility into LLM-cost behavior.
setInterval(() => {
  const removedPosts = pruneOlderThan(RETENTION_DAYS);
  const removedThreads = pruneOldThreads(RETENTION_DAYS);
  if (removedPosts || removedThreads) {
    console.log(`[prune] posts=${removedPosts} threads=${removedThreads}`);
  }
  const s = getCacheStats();
  console.log(
    `[parent-cache] size=${s.size}/${s.maxSize} | api_fetches=${s.apiFetchesTotal} | hits=${s.cacheHits} | misses=${s.cacheMisses}`
  );
}, 60 * 60 * 1000);

// Main ingestion loop. Every post from the Jetstream firehose comes through
// this callback. The classifier returns shouldSave=false for the bulk of
// posts; only matched posts hit the DB.
startJetstream(async (post) => {
  // Cheap structural filters first — skip very short posts.
  if (post.text.length < MIN_LEN) return;

  const result = await classifyPost(post);
  if (!result.shouldSave || result.sentiment === 'neither') return;

  // Record this post as part of the thread's engagement history. If this
  // post pushes the thread past the debate threshold (≥2 distinct engaged
  // authors), we'll get becameDebate=true and retro-boost prior matches.
  const thread = recordEngagementInThread(result.threadRoot, post.did, result.sentiment);
  let finalScore = result.score;
  if (thread.isDebate) finalScore += thread.debateBonus;

  savePost({
    uri: post.uri, cid: post.cid, did: post.did, text: post.text,
    createdAt: post.createdAt,
    score: finalScore,
    signals: result.signals,
    threadRoot: result.threadRoot,
    deweyClass: result.deweyClass,
    dimensions: result.dimensions,
    lang: post.langs[0] ?? null,
    classifier: result.classifier,
    sentiment: result.sentiment,
    inquiryType: result.inquiryType,
  });

  // Newly-promoted debate threads get a retro-boost: all prior matched
  // posts under the same thread_root gain debate_bonus. This way an early
  // critique that "won" by attracting engagement floats up retroactively.
  if (thread.becameDebate) {
    const boosted = boostThreadScores(result.threadRoot, thread.debateBonus);
    if (boosted) console.log(`[debate] boosted ${boosted} prior posts in thread ${result.threadRoot}`);
  }

  // Single log line per match. The marker glyphs compress a lot of state:
  //   sentiment (🔴🟢🔵) — critical/praise/inquiry
  //   reply marker (↩)  — research context inherited from a parent post
  //   debate marker (💬) — thread has ≥2 distinct engaged authors
  //   classifier (🔤🤖🔀) — keyword-only / LLM-only / both
  const replyMarker = result.viaParent ? '↩' : ' ';
  const debateMarker = thread.isDebate ? '💬' : ' ';
  const clsMarker = result.classifier === 'llm' ? '🤖' : result.classifier === 'keyword+llm' ? '🔀' : '🔤';
  const sentMarker =
    result.sentiment === 'critical' ? '🔴' :
    result.sentiment === 'praise' ? '🟢' :
    '🔵';
  const inqTag = result.inquiryType ? `inq:${result.inquiryType}` : '';
  const dimsTag = result.dimensions.length ? `[${result.dimensions.join(',')}]` : '';
  const deweyTag = result.deweyClass ? `dewey:${result.deweyClass}` : '';
  console.log(`[+]${sentMarker}${replyMarker}${debateMarker}${clsMarker} ${post.uri}  ${deweyTag} ${inqTag} ${dimsTag}`);
  console.log(`    ${post.text.slice(0, 140).replace(/\n/g, ' ')}`);
  console.log(`    signals: ${result.signals.join(' | ')}`);
});
