// Parent post resolver — supports the "critique-via-reply" case where a
// critic replies to someone sharing a paper without repeating the URL.
//
// ATProto background for lay programmers:
//   Each post on Bluesky has an AT-URI like `at://did:plc:xxx/app.bsky.feed.post/yyy`.
//   A reply post carries `reply.parent.uri` and `reply.root.uri` pointing at
//   the post being replied to and the original post that started the thread.
//   A quote-post carries an embed pointing at the quoted post's URI.
//
// What this module does:
//   1. Maintains an in-memory LRU cache keyed by AT-URI of posts we've recently
//      seen that look research-adjacent (a paper share, a working-paper link,
//      etc.). Cache lookups are free.
//   2. When a reply or quote-post arrives whose own text doesn't show research
//      adjacency, the classifier asks us to look up its parent/root/quoted URIs.
//      Cache hit → return the parent's verdict so the reply inherits research
//      context. Cache miss → optionally fetch from Bluesky's public AppView.
//   3. AppView fetches are BATCHED. The `app.bsky.feed.getPosts` endpoint
//      accepts up to 25 URIs per call. We collect requests for ~200ms or until
//      25 are queued, then send one batched call. This keeps API pressure low.
//
// Conservative design choices:
//   - Negative results (URI fetched but post not research-adjacent) are also
//     cached, so we don't re-fetch the same dead-end repeatedly.
//   - LRU eviction keeps memory bounded.
//   - Network failures don't crash ingestion — we resolve with null and let
//     the classifier decide.

import { AtpAgent } from '@atproto/api';
import { preFilter, Verdict } from './detector';
import { PostEvent } from './jetstream';

const MAX_CACHE_SIZE = parseInt(process.env.PARENT_CACHE_SIZE ?? '50000');

export type CachedEntry = {
  verdict: Verdict;
  text: string;
  cachedAt: number;
  source: 'stream' | 'api';
};

// Map iteration order is insertion order in JS, which gives us a cheap LRU:
// every cache hit re-inserts (deletes-then-sets), keeping recent items at the
// end and oldest at the start (`cache.keys().next()`).
const cache = new Map<string, CachedEntry>();

function setCached(uri: string, entry: CachedEntry) {
  if (cache.has(uri)) cache.delete(uri);
  cache.set(uri, entry);
  while (cache.size > MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
}

function getCached(uri: string): CachedEntry | undefined {
  const entry = cache.get(uri);
  if (entry) {
    // Touch: delete + re-insert puts this entry back at the recent end.
    cache.delete(uri);
    cache.set(uri, entry);
  }
  return entry;
}

// Called from the stream handler for every post that has research adjacency
// or is a meta-critique post. We cache these so that future replies pointing
// at them can resolve for free without any API call.
export function recordSeenPost(post: PostEvent, verdict: Verdict) {
  if (!verdict.isAboutResearch && !verdict.isMetaCritique) return;
  setCached(post.uri, { verdict, text: post.text, cachedAt: Date.now(), source: 'stream' });
}

// Bluesky's public AppView — no auth required for read endpoints.
const agent = new AtpAgent({
  service: process.env.APPVIEW_URL ?? 'https://public.api.bsky.app',
});

// Batching parameters. We send when either limit fires.
const BATCH_DELAY_MS = 200;     // upper bound on latency added by batching
const BATCH_SIZE = 25;          // max URIs per getPosts call

// Pending fetch requests, keyed by URI. Multiple concurrent resolves of the
// same URI share a single network call by appending their resolvers here.
const fetchQueue = new Map<string, ((v: CachedEntry | null) => void)[]>();
let flushTimer: NodeJS.Timeout | null = null;
let apiFetchesTotal = 0;
let cacheHits = 0;
let cacheMisses = 0;

function queueFetch(uri: string): Promise<CachedEntry | null> {
  return new Promise((resolve) => {
    if (!fetchQueue.has(uri)) fetchQueue.set(uri, []);
    fetchQueue.get(uri)!.push(resolve);
    // If the queue just filled up, flush immediately (don't wait for the timer).
    if (fetchQueue.size >= BATCH_SIZE) {
      if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
      void flush();
    } else if (!flushTimer) {
      // First entry in this batch — arm the latency timer.
      flushTimer = setTimeout(() => { flushTimer = null; void flush(); }, BATCH_DELAY_MS);
    }
  });
}

// An "empty" verdict used when getPosts can't find a URI (deleted, blocked,
// or the post is private/protected). Cached so we don't try again.
const EMPTY_VERDICT: Verdict = {
  isAboutResearch: false, researchScore: 0,
  keywordCritical: false, critiqueHits: [], critiqueDimensions: [],
  keywordPraise: false, praiseHits: [], praiseDimensions: [], weakPraiseHint: false,
  keywordInquiry: false, inquiryHits: [], inquiryDimensions: [], inquiryTypes: [], weakInquiryHint: false,
  isMetaCritique: false,
  signals: [], deweyClass: null,
};

async function flush() {
  if (fetchQueue.size === 0) return;

  // Take up to BATCH_SIZE entries off the queue; anything past that waits
  // for the next flush.
  const entries = Array.from(fetchQueue.entries()).slice(0, BATCH_SIZE);
  for (const [uri] of entries) fetchQueue.delete(uri);
  const uris = entries.map(([u]) => u);

  apiFetchesTotal++;
  try {
    const res = await agent.app.bsky.feed.getPosts({ uris });
    // Reshape the response array into a Map so we can look up each URI we asked for.
    const found = new Map<string, any>(res.data.posts.map((p: any) => [p.uri, p]));
    for (const [uri, resolvers] of entries) {
      const post = found.get(uri);
      let entry: CachedEntry;
      if (post) {
        // Got a hit — run the same preFilter we apply to live stream posts.
        const record = post.record;
        const text = record?.text ?? '';
        const urls = extractUrlsFromRecord(record);
        entry = { verdict: preFilter(text, urls), text, cachedAt: Date.now(), source: 'api' };
      } else {
        // URI didn't come back (deleted/blocked/private) — cache a negative entry.
        entry = { verdict: EMPTY_VERDICT, text: '', cachedAt: Date.now(), source: 'api' };
      }
      setCached(uri, entry);
      resolvers.forEach((r) => r(entry));
    }
  } catch (err) {
    console.error('[parent-resolver] getPosts error:', err);
    // On a hard error we resolve with null so the classifier can decide what to do.
    for (const [, resolvers] of entries) resolvers.forEach((r) => r(null));
  }

  // If more URIs came in while we were awaiting, schedule another flush.
  if (fetchQueue.size > 0 && !flushTimer) {
    flushTimer = setTimeout(() => { flushTimer = null; void flush(); }, BATCH_DELAY_MS);
  }
}

// Try the cache for any of the given URIs. If `allowFetch` is true and we
// have a complete cache miss, queue a batched fetch and wait for it.
// Returns the first cached/fetched entry that is research-adjacent, or null.
export async function resolveParentUris(
  uris: string[],
  opts: { allowFetch: boolean }
): Promise<CachedEntry | null> {
  let anyCached = false;
  for (const uri of uris) {
    const c = getCached(uri);
    if (c) {
      anyCached = true;
      // First research-adjacent hit wins — most replies have parent==root,
      // so this is usually the same post anyway.
      if (c.verdict.isAboutResearch || c.verdict.isMetaCritique) { cacheHits++; return c; }
    }
  }
  if (anyCached) cacheMisses++;
  if (!opts.allowFetch) return null;

  // Only fetch URIs we haven't already cached as misses.
  const missing = uris.filter((u) => !cache.has(u));
  if (missing.length === 0) return null;

  const results = await Promise.all(missing.map(queueFetch));
  for (const r of results) if (r?.verdict.isAboutResearch || r?.verdict.isMetaCritique) return r;
  return null;
}

// Pull link URLs out of an ATProto post record. ATProto stores URLs in two
// places: facets (rich-text link annotations) and embeds (the link card
// preview at the bottom of the post).
function extractUrlsFromRecord(record: any): string[] {
  const urls: string[] = [];
  for (const facet of record?.facets ?? []) {
    for (const feature of facet?.features ?? []) {
      if (feature?.$type === 'app.bsky.richtext.facet#link' && feature.uri) urls.push(feature.uri);
    }
  }
  if (record?.embed?.external?.uri) urls.push(record.embed.external.uri);
  return urls;
}

export function getCacheStats() {
  return { size: cache.size, maxSize: MAX_CACHE_SIZE, apiFetchesTotal, cacheHits, cacheMisses };
}
