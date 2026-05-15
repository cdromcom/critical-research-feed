// Jetstream subscription — Bluesky's high-volume firehose of every new post,
// repost, like, and follow on the network, served as JSON over a WebSocket.
//
// Why Jetstream specifically (vs. the AT Protocol firehose):
//   ATProto's native firehose is a CBOR-encoded binary stream that requires
//   parsing repo commits and validating MST proofs. Jetstream is an
//   official Bluesky-operated lightweight proxy that does that work and emits
//   plain JSON events. For a feed generator, it's the right tool — we don't
//   need cryptographic verification of every commit, just the post content.
//
// What we filter on:
//   `wantedCollections=app.bsky.feed.post` — only post creations/updates/
//   deletes. We further drop everything except `operation === 'create'` since
//   the feed only cares about new posts (updates are rare; deletes are handled
//   by retention, not real-time).
//
// Reconnect behavior:
//   Jetstream connections drop periodically — that's normal. We reconnect with
//   a 5s delay. If the volume of dropped messages becomes a problem, the URL
//   supports a `cursor` parameter to resume from a specific timestamp, but for
//   this feed minor gaps are acceptable.

import WebSocket from 'ws';

const JETSTREAM_URL =
  'wss://jetstream2.us-east.bsky.network/subscribe?wantedCollections=app.bsky.feed.post';

// The shape we normalize each post into. Downstream code (classifier,
// detector, etc.) only deals with this — the raw Jetstream JSON shape stays
// contained to this file.
export type PostEvent = {
  did: string;        // author DID, e.g. "did:plc:abc123..."
  rkey: string;       // post record key, the last segment of the AT-URI
  uri: string;        // full at:// URI of this post
  cid: string;        // content hash, used for caching/deduplication
  text: string;       // raw post text (UTF-8, may include any language)
  createdAt: string;  // ISO timestamp from the post record
  langs: string[];    // language tags the author specified (BCP-47)
  urls: string[];     // extracted from rich-text facets and link embed cards
  // Reply graph (AT-URIs of the parent and root posts, if this is a reply)
  parentUri?: string;
  rootUri?: string;
  // Quote post target (AT-URI of the post being quoted)
  quotedUri?: string;
};

export function startJetstream(onPost: (post: PostEvent) => void) {
  const connect = () => {
    const ws = new WebSocket(JETSTREAM_URL);

    ws.on('open', () => console.log('[jetstream] connected'));

    ws.on('message', (data) => {
      try {
        const evt = JSON.parse(data.toString());
        // Jetstream events have multiple shapes; we only care about new posts.
        if (
          evt.kind === 'commit' &&
          evt.commit?.operation === 'create' &&
          evt.commit?.collection === 'app.bsky.feed.post'
        ) {
          const record = evt.commit.record;
          if (!record?.text) return;  // empty posts (e.g. image-only) — skip
          onPost({
            did: evt.did,
            rkey: evt.commit.rkey,
            // AT-URI is constructed from the author DID + collection + rkey
            uri: `at://${evt.did}/app.bsky.feed.post/${evt.commit.rkey}`,
            cid: evt.commit.cid,
            text: record.text,
            createdAt: record.createdAt,
            langs: record.langs ?? [],
            urls: extractUrls(record),
            parentUri: record.reply?.parent?.uri,
            rootUri: record.reply?.root?.uri,
            quotedUri: extractQuotedUri(record),
          });
        }
      } catch {
        // Malformed or unexpected event shape — silently skip. The stream
        // occasionally emits oddly-formed events; logging each one would
        // drown out useful output.
      }
    });

    // Jetstream drops connections periodically; just reconnect.
    ws.on('close', () => {
      console.log('[jetstream] closed, reconnecting in 5s');
      setTimeout(connect, 5000);
    });

    ws.on('error', (err) => console.error('[jetstream] error', err));
  };

  connect();
}

// Extract URLs from a post record. ATProto stores them in two distinct places:
//   1. Rich-text facets — annotations on text spans, including #link features
//      that point at URLs hyperlinked inline in the post body.
//   2. External embed — the link-card preview shown beneath the post.
// We collect from both. Most posts have just one or the other; some have both.
function extractUrls(record: any): string[] {
  const urls: string[] = [];
  for (const facet of record.facets ?? []) {
    for (const feature of facet.features ?? []) {
      if (feature.$type === 'app.bsky.richtext.facet#link' && feature.uri) {
        urls.push(feature.uri);
      }
    }
  }
  if (record.embed?.external?.uri) urls.push(record.embed.external.uri);
  return urls;
}

// Extract the AT-URI of a quoted post, if this post is a quote-post.
// ATProto has two relevant embed shapes:
//   - app.bsky.embed.record: a pure quote (no extra media)
//   - app.bsky.embed.recordWithMedia: a quote plus image/video
// In the second shape the record is nested one level deeper.
function extractQuotedUri(record: any): string | undefined {
  const embed = record.embed;
  if (!embed) return undefined;
  if (embed.$type === 'app.bsky.embed.record') return embed.record?.uri;
  if (embed.$type === 'app.bsky.embed.recordWithMedia') return embed.record?.record?.uri;
  return undefined;
}
