# Critical Research — Bluesky Feed

> **Status: alpha.** Active development, no stability guarantees, not yet listed in public feed directories. Pin by AT-URI only.

A custom Bluesky feed that surfaces posts substantively engaging with research reports across **academia** (journals, conferences, preprint servers), **industry R&D labs**, and **gray literature** (think tanks, federal agencies, IGOs, dissertations) — cross-discipline, multilingual, one feed.

## TL;DR

- **What it surfaces:** substantive critique, substantive praise, and substantive inquiry (open questions, neutral uncertainty, meta-critique of critique norms) about research reports.
- **What it doesn't surface:** generic dunks, vague praise ("must read!"), paper announcements without engagement, or reshares.
- **How it decides:** a tunable pipeline of URL-based research adjacency → keyword pattern matching → optional embedding pre-filter → optional LLM classifier, all 5C-tagged (Credibility, Clarity, Creativity, Connectivity, Care) and Dewey-classified.
- **Stack:** TypeScript, Node 20, SQLite (WAL), Express, Jetstream WebSocket; optional DeepSeek + OpenAI embeddings.
- **Scope:** global; matches across all Bluesky, not personalized to your network.

## Quickstart (local dev)

```bash
git clone https://github.com/<your-username>/critical-research-feed.git
cd critical-research-feed
npm install
cp .env.example .env       # fill BSKY_HANDLE, BSKY_APP_PASSWORD; leave LLM off for first run
npm run test:dewey         # should print "126 passed, 0 failed"
npm run dev                # ingestion + classifier + server on :3000
```

You'll see classified posts scrolling in your terminal within minutes. To publish a public feed record so the Bluesky app can find your service, see the [Setup](#setup) section below.

## How is this different from PaperSkygest?

[PaperSkygest](https://github.com/Skygest/PaperSkygest) is a personalized paper-*announcement* feed — it surfaces papers your network shares. This feed is a global *engagement* feed — it surfaces critique, praise, and inquiry about research, regardless of whether you follow the author. The two coexist well: PaperSkygest helps you find papers, this feed helps you find substantive discussion of them. Many of this project's URL patterns are folded in from PaperSkygest's open-source pattern list.

## Surfacing modes

Three parallel modes, with all three using the same 5C peer-review framework (Credibility / Clarity / Creativity / Connectivity / Care):

- **Critique** (default) — substantive criticism, methodological pushback, replication concerns, scope/claim challenges, ethical critique.
- **Praise** — substantive recognition of specific qualities (rigor, novelty, careful literature engagement, ethical care, clarity). Vague compliments ("great paper!") are intentionally excluded.
- **Inquiry** — substantive open questions, neutral acknowledgements of uncertainty, and meta-discussion of how to critique research ethically and respectfully online. Three sub-types: `open_question`, `neutral_uncertainty`, `meta_critique`. Bare questions or hedging do not qualify.

## How it works

1. **Ingest** — Subscribes to Bluesky's Jetstream firehose, filtered to `app.bsky.feed.post` creates.
2. **Research adjacency (scored, not binary)** — Continuous score from URL hits (with Dewey tagging), conference mentions, academic vocabulary across paradigms (quantitative + qualitative + interpretive + theoretical), and academic-context cues. Threshold tunable via `RESEARCH_LLM_THRESHOLD`.
3. **Critique + praise + inquiry pattern matching** — Three parallel registries, all 5C-tagged, all multilingual. Patterns are *signals*, not gates. The inquiry registry has three sub-types — `open_question` (substantive questions about findings/methods/scope), `neutral_uncertainty` (epistemic ambiguity without taking a side), `meta_critique` (discussion of HOW research should be critiqued ethically online — charitable interpretation, power asymmetries, citation justice, post-publication review norms).
4. **Reply-graph inheritance** — Replies and quote-posts inherit research context from a cached or API-fetched parent. Works for both critique and praise.
5. **Embedding pre-filter (optional)** — When enabled, every research-adjacent post is embedded and compared to curated exemplars for `critique` / `praise` / `neither`. Posts closer to "neither" exemplars are skipped before incurring an LLM call. Cuts LLM cost dramatically on firehose volume. Pluggable provider via OpenAI-compatible API.
6. **LLM classifier (optional)** — `deepseek-chat` decides four-way: `critical` / `praise` / `inquiry` / `neither`, plus an inquiry sub-type when applicable, 5C dimensions, and confidence. Prompt explicitly accommodates qualitative, interpretive, theoretical, historiographical, hermeneutic, decolonial, and plain-language critique traditions so it doesn't default to STEM framings. Confidence thresholds escalate with false-positive risk: critical 0.6, praise 0.7, inquiry 0.7 (questions are the easiest category to over-fire on).
7. **Discipline tagging via Dewey Decimal** — Every URL and conference mention is mapped to a Dewey class (000 CS through 900 history/geography), with journal-level paths for big publishers (e.g., `academic.oup.com/mind` → 100, `academic.oup.com/ahr` → 900). URL coverage includes regional STEM indexers (J-STAGE, KoreaScience, CNKI), Latin American / African / francophone social-science aggregators (Redalyc, AJOL, Cairn, Persée, Érudit), engineering professional societies, cryptography (IACR ePrint), ML conference proceedings (NeurIPS / MLR Press / ICML / IJCAI), and humanities-specific repositories (HAL, hprints, History Cooperative). Many of these URL patterns are folded in from the [PaperSkygest project](https://github.com/Skygest/PaperSkygest)'s open-source pattern list.
8. **Thread engagement tracking** — Per-root counters of critique, praise, and inquiry posts, plus distinct authors in each. ≥2 distinct authors → "debate" status (any mix of sentiments); prior posts in the thread get a +1 score boost retro-applied.
9. **Serve** — Score-ranked feed with sub-feed routing by sentiment, Dewey class, and 5C dimension (combinable).

## Sub-feed routing

Sub-feeds are selected by suffix on the feed record key. Suffixes combine:

- Sentiment: `-critical`, `-praise`, `-inquiry`
- Inquiry type: `-open_question`, `-neutral_uncertainty`, `-meta_critique` (hyphenated aliases also accepted: `-open-question`, etc.); implies `-inquiry`
- Dewey class: `-000` … `-900`
- 5C dimension: `-credibility`, `-clarity`, `-creativity`, `-connectivity`, `-care`

Examples:

- `critical-research` — main feed, critique only (back-compat default)
- `critical-research-praise` — substantive praise across all disciplines
- `critical-research-inquiry` — substantive questions and uncertainty across all disciplines
- `critical-research-meta-critique` — discussion of how to critique research ethically online
- `critical-research-open-question-300` — substantive open questions about social science research
- `critical-research-credibility` — methodology critique across all disciplines
- `critical-research-critical-900-credibility` — historiographical credibility critique

Register additional sub-feeds by re-running the publish script with the relevant `FEED_RECORD_NAME`.

## Reply-graph awareness

Cross-discipline critique often happens in *replies* to someone else's "look at this paper!" post — the reply itself never mentions a URL or paper title. The feed catches these in two layers:

1. **In-stream cache.** Every research-adjacent post is cached in memory by AT-URI (LRU, 50k entries by default — set `PARENT_CACHE_SIZE`). Replies/quote-posts check this cache for parent/root/quoted URIs first.
2. **API fallback (batched).** If the parent isn't cached and the reply has signals (any critique keyword, any substantive praise hit, or a loose hint phrase), up to 25 URIs are batched per call to `app.bsky.feed.getPosts` on the public AppView. Both positive and negative results cached.

Matches via the reply path are logged with `↩`. Stored signals are prefixed `parent_` so it's obvious why a reply qualified.

## Embedding pre-filter

The LLM is the most expensive step. The embedding pre-filter cuts the call rate by recognizing posts that *look like* the "neither" class (sharing, summaries, vague reactions) without spending generative tokens.

How to enable:

```bash
USE_EMBEDDING_PREFILTER=true
EMBEDDING_API_KEY=sk-...            # or OPENAI_API_KEY
# Defaults to text-embedding-3-small from OpenAI. Override for Voyage/etc:
# EMBEDDING_BASE_URL=https://api.voyageai.com/v1
# EMBEDDING_MODEL=voyage-3-lite
```

The service ships with ~40 starter exemplars covering critique, praise, and "neither" across multiple disciplines and languages. To customize, write `exemplars.json` (default path; override with `EXEMPLARS_PATH`):

```json
[
  { "klass": "critique", "text": "the effect size is implausible given n=24..." },
  { "klass": "praise", "text": "well-powered preregistered replication with open data..." },
  { "klass": "neither", "text": "new paper out! check it out" }
]
```

10-30 exemplars per class is enough; more starts to dilute the centroid.

Tuning: `EMBED_MARGIN` (default 0.05) controls how confidently "neither" must beat critique/praise before the LLM call is skipped. Raise it to be stricter (skip more LLM calls but risk missing some critique). Lower it to be looser (run more LLM calls).

## Diversity re-ranking

Score-ranking alone has known failure modes on a firehose feed: one prolific author can dominate the top of the feed, one viral thread can fill it with reply variants, near-duplicate quote-posts can crowd out unique angles, and whichever discipline / sentiment / 5C dimension is currently loudest can crowd out the others.

The feed server applies an MMR-flavored re-ranking pass at query time:

1. Over-fetch a candidate pool from the DB (`limit × CANDIDATE_MULTIPLIER`, default 5×) ordered by score.
2. Greedily select items from highest-adjusted-score to lowest, where each pick adjusts the remaining pool's scores by applying soft penalties for repeated Dewey class (-0.3 each), repeated 5C dimension (-0.15 each), and repeated sentiment+inquiry-type combo (-0.2 each).
3. Hard caps: no more than 2 posts per author, no more than 2 posts per `thread_root`, and Jaccard near-duplicate detection on 3-word shingles (rejects posts with ≥0.6 similarity to one already picked).

Disable via `DIVERSITY_ENABLED=false`. Tune via the constants in `src/diversity.ts` if you want a different mix — e.g. crank `maxPerAuthor` to 1 if you want maximum author spread, or drop `textSimilarityThreshold` to 0.4 to be aggressive about deduplicating near-paraphrases.

## Scoring

Posts are ranked by a continuous score, not recency. Components:

- Research-adjacency score (0..N) weighted 0.5
- Each keyword hit (critique or praise): 0.5
- Each distinct 5C dimension surfaced: 0.4
- LLM confidence (0..1) when invoked: weighted 1.0
- +1.0 debate bonus once ≥ 2 distinct authors substantively engage with the same thread (retro-applied)
- Reply-graph matches inherit half their parent's research-adjacency score

Tunable via env:

- `RESEARCH_LLM_THRESHOLD` (default 1.0)
- `LLM_CONFIDENCE_THRESHOLD` (default 0.6) — for critical
- `LLM_PRAISE_CONFIDENCE_THRESHOLD` (default 0.7) — stricter for praise
- `LLM_INQUIRY_CONFIDENCE_THRESHOLD` (default 0.7) — stricter for inquiry
- `DEBATE_THRESHOLD_AUTHORS` (default 2), `DEBATE_BONUS` (default 1.0)
- `EMBED_MARGIN` (default 0.05)
- `RETENTION_DAYS` (default 7)

## Generalization

The pipeline is built to handle critique and praise from disciplines and paradigms its registries can't fully anticipate. Three design choices support this:

1. **Scored adjacency, not binary URL gating.** A post can be research-adjacent without an academic URL — "just read a fantastic monograph on archival silences in early modern Bavaria" gets a positive score from vocab and context cues.
2. **LLM is the primary judge** when enabled. Keywords *inform* the LLM via signals but don't replace it. A humanities post hitting one or two keywords can still be classified critical (or praise) by the LLM with appropriate 5C tags.
3. **5C as a paradigm-neutral output schema.** From the peer-review tradition — accommodates qualitative trustworthiness, interpretive rigor, theoretical contribution, and ethical care alongside quantitative methodology.

To extend the feed for a new discipline: add journal-level URL patterns to `src/dewey.ts`; optionally add discipline-specific critique/praise vocab to `src/categories.ts`. The LLM should already cover novel phrasings.

## Setup

### Local development

```bash
npm install
cp .env.example .env
# Minimum required: BSKY_HANDLE, BSKY_APP_PASSWORD
# Leave USE_LLM_CLASSIFIER=false and USE_EMBEDDING_PREFILTER=false for first run
npm run test:dewey         # 126 assertions
npm run dev                # ingestion + classifier + server on :3000
```

Generate a Bluesky app password at **Settings → Privacy & Security → App Passwords**. (Not your account password — app passwords are scoped credentials.)

### Production deployment

For Bluesky's AppView to call your server, you need:

1. A **public HTTPS endpoint** (any host: VPS, Fly.io, Railway, etc.)
2. A **stable hostname** for the `did:web:` identifier
3. The server running 24/7 — Jetstream must stay subscribed for ingestion

A minimum-viable Droplet/VPS setup:

```bash
# On the server, as a non-root user
git clone https://github.com/<you>/critical-research-feed.git /opt/feed
cd /opt/feed && npm install && npm run build

# Edit .env to set HOSTNAME, SERVICE_DID (did:web:your.host), and FEED_URI (after publishing)
# Run under systemd so it auto-restarts on failure
```

Then publish the feed record (from your laptop, not the server):

```bash
npm run publish-feed
# Copy the printed FEED_URI, paste into the server's .env, restart the service
```

Pin the feed in your Bluesky app using the AT-URI to verify. While in alpha, **do not** submit to feed directories (Goodfeeds, feeds.fyi) — the URI is functionally invisible until you share it.

### Environment variables

All settings have defaults; you only need `BSKY_HANDLE` / `BSKY_APP_PASSWORD` to run locally. See `.env.example` for the full list with comments.

| Variable | Default | Purpose |
|---|---|---|
| `HOSTNAME` | `localhost` | Your public hostname; used in `did:web` and DID document |
| `SERVICE_DID` | `did:web:<HOSTNAME>` | This server's DID identifier |
| `FEED_URI` | — | The published feed AT-URI (set after running `publish-feed`) |
| `FEED_RECORD_NAME` | `critical-research` | The rkey of the feed record |
| `USE_LLM_CLASSIFIER` | `false` | Enable DeepSeek classification |
| `USE_EMBEDDING_PREFILTER` | `false` | Enable OpenAI-compatible embedding pre-filter |
| `DIVERSITY_ENABLED` | `true` | Query-time diversity re-ranking |
| `RETENTION_DAYS` | `7` | Auto-prune matched posts after N days |
| `MIN_POST_LENGTH` | `30` | Skip very short posts |
| `DB_PATH` | `feed.db` | SQLite file path |

## Log markers

Each saved post logs with a compact set of markers:

- `🔴` critical / `🟢` praise / `🔵` inquiry
- `↩` matched via reply graph
- `💬` matched in a debate thread
- `🔤` keyword-only classification / `🤖` LLM-only / `🔀` both fired

Example: `[+]🔵 ↩💬🤖 at://... dewey:300 inq:meta_critique [care,connectivity]` reads as: substantive inquiry — specifically a meta-critique post about critique norms — inherited via reply graph, in a debate thread, classified by LLM (no keyword fast path), tagged social sciences, hit two 5C dimensions.

## Architecture notes

- Storage is SQLite (WAL mode). Schema migrations are idempotent (`safeAddColumn`).
- Old posts and threads pruned after `RETENTION_DAYS` (default 7).
- Cache stats logged hourly:
  ```
  [parent-cache] size=4831/50000 | api_fetches=312 | hits=2104 | misses=98
  ```

## Status

**Working in alpha:**

- Jetstream ingestion across all languages
- Keyword classifier with multilingual coverage (en/es/pt/fr/de/it/ja/zh)
- Three-way sentiment (critical / praise / inquiry) plus three inquiry sub-types
- Reply-graph awareness with batched parent resolution
- Dewey Decimal tagging (370+ URL patterns, gray-lit covered)
- 5C dimension tagging
- Query-time MMR-style diversity re-ranking
- Sub-feed routing by sentiment / Dewey / dimension / inquiry-type (combinable)
- Thread engagement tracking with debate detection
- 126-assertion smoke test for Dewey lookup
- Optional DeepSeek LLM classifier (multilingual, paradigm-neutral)
- Optional OpenAI-compatible embedding pre-filter

**Not yet implemented:**

- Post deletion handling (when an author deletes a matched post, it stays in the feed until pruning aging-out). Tracked as the main pre-public-launch issue.
- Calibration tooling (no labeled set yet; thresholds are hand-picked).
- Author allowlist / blocklist.
- Dashboard for reviewing matches and labeling false positives.

## Ideas for next

- **Post deletion handling** — currently the most important pre-public-launch item.
- **Calibration**: a labeled set of 200 posts + grid search over score weights and confidence thresholds.
- **Author allowlist**: boost known methodologists, replication researchers, domain critics.
- **Dashboard**: review matches, label false positives, retrain the LLM prompt and embedding exemplars.

## Credits

- The 5C peer-review framework (Credibility, Clarity, Creativity, Connectivity, Care) is from a peer-review methodology skill referenced internally.
- Many URL patterns for the Dewey registry are folded in from [PaperSkygest](https://github.com/Skygest/PaperSkygest) — a complementary feed for personalized paper announcements (Greenwood & Garg, 2026).
- Bluesky's [Jetstream](https://github.com/bluesky-social/jetstream) and the [ATProto SDK](https://github.com/bluesky-social/atproto) make all of this tractable.

## License

TBD. While in alpha, the repo is private. License will be selected (probably MIT or Apache 2.0) before any public release.
