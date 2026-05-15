// One-shot script: publish the feed record to your Bluesky account.
//
// What this does, conceptually:
//   To make a custom feed visible to users in the Bluesky app, you need a
//   "feed generator record" in your account's `app.bsky.feed.generator`
//   collection. This record points at YOUR service (via SERVICE_DID), which
//   the Bluesky AppView will then call when a user pulls your feed. Once
//   published, anyone on Bluesky can pin your feed by URI.
//
// What this does NOT do:
//   It does not start the server, does not subscribe to Jetstream, and does
//   not classify anything. Those run in src/index.ts. This script just tells
//   Bluesky's directory "hey, a feed exists at this URI, and here's the
//   service that backs it."
//
// Run it once after deploying the server. Re-run only if you want to
// change the displayName/description, or to publish a new feed record (e.g.
// a sub-feed at a different rkey like "critical-research-praise").

import 'dotenv/config';
import { AtpAgent } from '@atproto/api';

async function main() {
  // App passwords are scoped credentials you generate in the Bluesky app
  // settings — safer than your account password for automation.
  const handle = process.env.BSKY_HANDLE;
  const password = process.env.BSKY_APP_PASSWORD;
  // SERVICE_DID is the did:web of your feed server's domain.
  // E.g. did:web:feed.example.com if your server runs at feed.example.com.
  const serviceDid = process.env.SERVICE_DID;
  // The rkey of the feed record. Determines the public feed URI.
  const recordName = process.env.FEED_RECORD_NAME ?? 'critical-research';

  if (!handle || !password || !serviceDid) {
    throw new Error('Missing BSKY_HANDLE, BSKY_APP_PASSWORD, or SERVICE_DID in env');
  }

  const agent = new AtpAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier: handle, password });

  // Once logged in, the agent knows the account's DID. The feed URI follows
  // ATProto's URI scheme: at://<account DID>/<collection>/<rkey>.
  const ownerDid = agent.session!.did;
  const feedUri = `at://${ownerDid}/app.bsky.feed.generator/${recordName}`;

  // putRecord writes (or overwrites) a record at the given collection+rkey.
  // The record body must match the app.bsky.feed.generator lexicon schema —
  // did points at the service that will answer feed requests, displayName
  // and description are shown to users browsing feeds in the app.
  await agent.com.atproto.repo.putRecord({
    repo: ownerDid,
    collection: 'app.bsky.feed.generator',
    rkey: recordName,
    record: {
      did: serviceDid,
      displayName: 'Critical Research',
      description:
        'Posts critically engaging with research reports across academia ' +
        '(journals, preprints, conferences) and industry R&D labs. ' +
        'Methodology critiques, scope/claim pushback, and replication concerns — cross-discipline.',
      createdAt: new Date().toISOString(),
    },
  });

  console.log('Published feed:');
  console.log(`  ${feedUri}`);
  console.log('Set this in your .env as FEED_URI before restarting the server.');
}

main().catch((e) => { console.error(e); process.exit(1); });
