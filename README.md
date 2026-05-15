Critical Research: A Bluesky Feed
Status: alpha. Active development, no stability guarantees, not yet listed in public feed directories. Pin by AT-URI only.

A custom Bluesky feed that surfaces posts substantively engaging with research reports across academia (journals, conferences, preprint servers), industry R&D labs, and gray literature (think tanks, federal agencies, IGOs, dissertations) across disciplines, multilingual, one feed.
TL;DR
What it surfaces: substantive critique, substantive praise, and substantive inquiry (open questions, neutral uncertainty, meta-critique of critique norms) about research reports.
What it doesn't surface: generic dunks, vague praise ("must read!"), research dissemination (paper announcements and summaries without engagement), meme templates with research-flavored vocabulary, or news commentary.
How it decides: a tunable pipeline of URL-based research adjacency with a research-source URL classifier (DOI / arXiv / OSF / journals are scored separately), then an embedding pre-filter, then a rhetorical stance gate (ENGAGE / ANNOUNCE / TANGENTIAL / OFF_TOPIC), then a few-shot LLM classifier. Output is 5C-tagged (Credibility, Clarity, Creativity, Connectivity, Care) and Dewey-classified.
Stack: TypeScript, Node 20, SQLite (WAL), Express, Jetstream WebSocket; DeepSeek V4 Flash for classification + stance gate; OpenAI text-embedding-3-small for embeddings.
Scope: global; matches across all Bluesky, not personalized to your network.
Quickstart (local dev)
git clone https://github.com/<your-username>/critical-research-feed.git
cd critical-research-feed
npm install
cp .env.example .env       # fill BSKY_HANDLE, BSKY_APP_PASSWORD; leave LLM off for first run
npm test                   # runs both smoke tests; should print "126 passed, 0 failed" and "37 passed, 0 failed"
npm run dev                # ingestion + classifier + server on :3000

You'll see classified posts scrolling in your terminal within minutes. To publish a public feed record so the Bluesky app can find your service, see the Setup section below. For a full reproducible Droplet deployment, see DEPLOYMENT.md.
How is this different from PaperSkygest?
PaperSkygest is a personalized paper-announcement feed. It surfaces papers your network shares. This feed is a global engagement feed. It surfaces critique, praise, and inquiry about research, regardless of whether you follow the author. The two coexist well: PaperSkygest helps you find papers, this feed helps you find substantive discussion of them. Many of this project's URL patterns are folded in from PaperSkygest's open-source pattern list.
Surfacing modes
Three parallel modes, with all three using the same 5C peer-review framework (Credibility / Clarity / Creativity / Connectivity / Care):

Critique (default): substantive criticism, methodological pushback, replication concerns, scope/claim challenges, ethical critique.
Praise: substantive recognition of specific qualities (rigor, novelty, careful literature engagement, ethical care, clarity). Vague compliments ("great paper!") are intentionally excluded.
Inquiry: substantive open questions, neutral acknowledgements of uncertainty, and meta-discussion of how to critique research ethically and respectfully online. Three sub-types: open_question, neutral_uncertainty, meta_critique. Bare questions or hedging do not qualify.
How it works
Ingest. Subscribes to Bluesky's Jetstream firehose, filtered to app.bsky.feed.post creates.
Research adjacency (scored, not binary). Continuous score from URL hits (with Dewey tagging), conference mentions, academic vocabulary across paradigms (quantitative + qualitative + interpretive + theoretical), and academic-context cues. Threshold tunable via RESEARCH_LLM_THRESHOLD.
Research-source URL classifier. A separate module classifies URLs into four tiers: CANONICAL (DOI, arXiv, PubMed/PMC, OSF, Zenodo, bioRxiv/medRxiv, SSRN, RePEc, Semantic Scholar, OpenAlex, ORCID, major publisher article paths), PROCEEDINGS (ACL Anthology, OpenReview, NeurIPS, PMLR, JMLR, ACM Digital Library, IEEE Xplore), INSTITUTIONAL (.gov research bodies, WHO, World Bank, OECD, think tanks, .edu paper repositories), or NONE. Canonical/proceedings URLs add +3.0 adjacency boost; institutional adds +1.5. A canonical or proceedings URL also serves as a structural override for the embedding pre-filter and stance gate.
Pattern matching for context. Three parallel registries (critique / praise / inquiry), all 5C-tagged, all multilingual. Patterns are signals to feed the LLM, not gates. They inform the model via the signals array but don't decide on their own.
Reply-graph inheritance. Replies and quote-posts inherit research context from a cached or API-fetched parent. Works for both critique and praise.
Embedding pre-filter. Every research-adjacent post is embedded (OpenAI text-embedding-3-small) and compared to curated exemplars for critique / praise / inquiry / neither. Posts closer to "neither" exemplars are skipped before incurring further classification. Cuts cost dramatically on firehose volume. Pluggable provider via OpenAI-compatible API.
Rhetorical stance gate. A cheap DeepSeek V4 Flash call asking just "ENGAGE / ANNOUNCE / TANGENTIAL / OFF_TOPIC". Posts where the author is announcing/disseminating rather than engaging get dropped (unless a canonical URL overrides). Meme templates and off-topic banter are filtered here. Cost is ~$0.00002 per call.
LLM classifier. DeepSeek V4 Flash (deepseek-v4-flash) decides four-way: critical / praise / inquiry / neither, plus an inquiry sub-type when applicable, 5C dimensions, and confidence. The prompt includes seven few-shot exemplars covering positive cases (critique with credibility/care, meta-critique on peer-review reform) and negative cases (paper-summary threads, meme templates, opinion takes, off-topic rants). Explicit instruction: research dissemination is not research engagement. Confidence thresholds escalate with false-positive risk: critical 0.6, praise 0.7, inquiry 0.7.
Discipline tagging via Dewey Decimal. Every URL and conference mention is mapped to a Dewey class (000 CS through 900 history/geography), with journal-level paths for big publishers. URL coverage includes regional STEM indexers (J-STAGE, KoreaScience, CNKI), Latin American / African / francophone social-science aggregators (Redalyc, AJOL, Cairn, Persée, Érudit), engineering professional societies, cryptography (IACR ePrint), ML conference proceedings (NeurIPS / MLR Press / ICML / IJCAI), and humanities-specific repositories (HAL, hprints, History Cooperative). Many of these URL patterns are folded in from the PaperSkygest project's open-source pattern list.
Thread engagement tracking. Per-root counters of critique, praise, and inquiry posts, plus distinct authors in each. ≥2 distinct authors → "debate" status (any mix of sentiments); prior posts in the thread get a +1 score boost retro-applied.
Serve. Score-ranked feed with sub-feed routing by sentiment, Dewey class, and 5C dimension (combinable), and MMR-flavored diversity re-ranking at query time.
Sub-feed routing
Sub-feeds are selected by suffix on the feed record key. Suffixes combine:

Sentiment: -critical, -praise, -inquiry
Inquiry type: -open_question, -neutral_uncertainty, -meta_critique (hyphenated aliases also accepted: -open-question, etc.); implies -inquiry
Dewey class: -000 … -900
5C dimension: -credibility, -clarity, -creativity, -connectivity, -care

Examples:

critical-research: main feed, critique only (back-compat default)
critical-research-praise: substantive praise across all disciplines
critical-research-inquiry: substantive questions and uncertainty across all disciplines
critical-research-meta-critique: discussion of how to critique research ethically online
critical-research-open-question-300: substantive open questions about social science research
critical-research-credibility: methodology critique across all disciplines
critical-research-critical-900-credibility: historiographical credibility critique

Register additional sub-feeds by re-running the publish script with the relevant FEED_RECORD_NAME.
Reply-graph awareness
Cross-discipline critique often happens in replies to someone else's "look at this paper!" post, where the reply itself never mentions a URL or paper title. The feed catches these in two layers:

In-stream cache. Every research-adjacent post is cached in memory by AT-URI (LRU, 50k entries by default; set PARENT_CACHE_SIZE). Replies/quote-posts check this cache for parent/root/quoted URIs first.
API fallback (batched). If the parent isn't cached and the reply has signals (any critique keyword, any substantive praise hit, or a loose hint phrase), up to 25 URIs are batched per call to app.bsky.feed.getPosts on the public AppView. Both positive and negative results are cached.

The keyword check in this step is the only place keyword signals still gate behavior. It's intentional: this is a cost-control decision (whether to spend an external API call) rather than a classification decision. Without it, every reply would trigger an AppView fetch and you'd hit rate limits.

Matches via the reply path are logged with ↩. Stored signals are prefixed parent_ so it's obvious why a reply qualified.
Embedding pre-filter
The LLM is the most expensive step. The embedding pre-filter cuts the call rate by recognizing posts that look like the "neither" class (sharing, summaries, vague reactions) without spending generative tokens.

How to enable:

USE_EMBEDDING_PREFILTER=true
EMBEDDING_API_KEY=sk-...
EMBEDDING_BASE_URL=https://api.openai.com/v1     # default
EMBEDDING_MODEL=text-embedding-3-small           # default

Pluggable to any OpenAI-compatible provider. To use Jina, Voyage, etc., point EMBEDDING_BASE_URL and EMBEDDING_MODEL at them.

The service ships with ~55 starter exemplars covering critique, praise, inquiry, and "neither" across multiple disciplines and languages. To customize, write exemplars.json (default path; override with EXEMPLARS_PATH):

[
  { "klass": "critique", "text": "the effect size is implausible given n=24..." },
  { "klass": "praise", "text": "well-powered preregistered replication with open data..." },
  { "klass": "inquiry", "text": "how does the IV satisfy exclusion in this design?" },
  { "klass": "neither", "text": "new paper out! check it out" }
]

10-30 exemplars per class is enough; more starts to dilute the centroid.

Tuning: EMBED_MARGIN (default 0.05, recommended 0.02 for stricter mode) controls how confidently "neither" must beat critique/praise/inquiry before the LLM call is skipped. Lower it to be stricter (skip more LLM calls but risk missing some engagement). Raise it to be looser (run more LLM calls).
Stance gate
A pre-LLM gate that runs after the embedding pre-filter and asks a single question: what rhetorical stance does this post take? Four labels:

ENGAGE: actively critiques, defends, questions methodology/findings/scope, or discusses norms of research evaluation. Proceeds to full classifier.
ANNOUNCE: describes, summarizes, or shares findings without taking a stance. Press-release-shaped. Dropped unless a canonical research URL (DOI / arXiv / OpenReview etc.) is present, in which case it proceeds.
TANGENTIAL: research vocabulary used in non-research context (meme templates, history banter). Dropped.
OFF_TOPIC: no real research engagement. Dropped.

How to enable:

USE_STANCE_GATE=true
STANCE_MODEL=deepseek-v4-flash      # default if DEEPSEEK_MODEL is also set

Cost is ~$0.00002 per call on DeepSeek V4 Flash, so ~$0.02-0.06/day at firehose volume. The gate is asymmetric: it can DROP but cannot ELEVATE. False positives still get reviewed by the full classifier downstream.
Diversity re-ranking
Score-ranking alone has known failure modes on a firehose feed: one prolific author can dominate the top of the feed, one viral thread can fill it with reply variants, near-duplicate quote-posts can crowd out unique angles, and whichever discipline / sentiment / 5C dimension is currently loudest can crowd out the others.

The feed server applies an MMR-flavored re-ranking pass at query time:

Over-fetch a candidate pool from the DB (limit × CANDIDATE_MULTIPLIER, default 5×) ordered by score.
Greedily select items from highest-adjusted-score to lowest, where each pick adjusts the remaining pool's scores by applying soft penalties for repeated Dewey class (-0.3 each), repeated 5C dimension (-0.15 each), and repeated sentiment+inquiry-type combo (-0.2 each).
Hard caps: no more than 2 posts per author, no more than 2 posts per thread_root, and Jaccard near-duplicate detection on 3-word shingles (rejects posts with ≥0.6 similarity to one already picked).

Disable via DIVERSITY_ENABLED=false. Tune via the constants in src/diversity.ts if you want a different mix; e.g. crank maxPerAuthor to 1 if you want maximum author spread, or drop textSimilarityThreshold to 0.4 to be aggressive about deduplicating near-paraphrases.
Scoring
Posts are ranked by a continuous score, not recency. Components:

Research-adjacency score (0..N) weighted 0.5
Research-source URL boost: +3.0 for canonical or proceedings URLs (DOI, arXiv, OpenReview etc.), +1.5 for institutional URLs (.gov, .edu papers, WHO/World Bank/OECD, think tanks)
LLM confidence (0..1) when invoked: weighted 1.0
Each distinct 5C dimension surfaced: 0.4
+1.0 debate bonus once ≥ 2 distinct authors substantively engage with the same thread (retro-applied)
Reply-graph matches inherit half their parent's research-adjacency score

Tunable via env:

RESEARCH_LLM_THRESHOLD (default 1.0)
LLM_CONFIDENCE_THRESHOLD (default 0.6): for critical
LLM_PRAISE_CONFIDENCE_THRESHOLD (default 0.7): stricter for praise
LLM_INQUIRY_CONFIDENCE_THRESHOLD (default 0.7): stricter for inquiry
DEBATE_THRESHOLD_AUTHORS (default 2), DEBATE_BONUS (default 1.0)
EMBED_MARGIN (default 0.05, recommended 0.02)
RETENTION_DAYS (default 7)
Generalization
The pipeline is built to handle critique and praise from disciplines and paradigms its registries can't fully anticipate. Three design choices support this:

Scored adjacency, not binary URL gating. A post can be research-adjacent without an academic URL. Example: "just read a fantastic monograph on archival silences in early modern Bavaria" gets a positive score from vocab and context cues.
LLM is the primary judge. Keywords inform the LLM via signals but don't replace it. A humanities post hitting one or two keywords can still be classified critical (or praise) by the LLM with appropriate 5C tags.
5C as a paradigm-neutral output schema. From the peer-review tradition, accommodates qualitative trustworthiness, interpretive rigor, theoretical contribution, and ethical care alongside quantitative methodology.

To extend the feed for a new discipline: add journal-level URL patterns to src/dewey.ts; optionally add discipline-specific critique/praise vocab to src/categories.ts. The LLM should already cover novel phrasings.
Setup
Local development
npm install
cp .env.example .env
# Minimum required: BSKY_HANDLE, BSKY_APP_PASSWORD
# Leave USE_LLM_CLASSIFIER=false and USE_EMBEDDING_PREFILTER=false for first run
npm test                   # 126 + 37 = 163 assertions
npm run dev                # ingestion + classifier + server on :3000

Generate a Bluesky app password at Settings → Privacy & Security → App Passwords. (Not your account password; app passwords are scoped credentials.)
Production deployment
The full step-by-step deployment guide is in DEPLOYMENT.md. It covers a from-scratch DigitalOcean Droplet, nginx + Let's Encrypt TLS, systemd, DuckDNS, the publish step, and all 13 deployment phases including the LLM, embedding pre-filter, research-URL classifier, and stance gate. Approximately 90 minutes start to finish.

For a quick orientation, you need:

A public HTTPS endpoint (any host: VPS, Fly.io, Railway, etc.)
A stable hostname for the did:web: identifier
The server running 24/7 so Jetstream stays subscribed for ingestion
~$5-15/month total costs (Droplet + DeepSeek + OpenAI embeddings); see DEPLOYMENT.md for the breakdown

⚠️ Pitfall: a 512MB Droplet will OOM-kill npm run build. Add 2GB swap before building:

fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
Environment variables
All settings have defaults; you only need BSKY_HANDLE / BSKY_APP_PASSWORD to run locally. See .env.example for the full list with comments.

Variable
Default
Purpose
HOSTNAME
localhost
Your public hostname; used in did:web and DID document
SERVICE_DID
did:web:<HOSTNAME>
This server's DID identifier
FEED_URI
(none)
The published feed AT-URI (set after running publish-feed)
FEED_RECORD_NAME
critical-research
The rkey of the feed record
USE_LLM_CLASSIFIER
false
Enable DeepSeek classification
DEEPSEEK_MODEL
deepseek-v4-flash
Model used for both the full classifier and the stance gate
DEEPSEEK_API_KEY
(none)
Required when USE_LLM_CLASSIFIER=true
USE_EMBEDDING_PREFILTER
false
Enable embedding pre-filter
EMBEDDING_BASE_URL
OpenAI
Pluggable; any OpenAI-compatible provider
EMBEDDING_MODEL
text-embedding-3-small
Embedding model name
EMBEDDING_API_KEY
(none)
Required when USE_EMBEDDING_PREFILTER=true
EMBED_MARGIN
0.05
Pre-filter strictness; lower = stricter
USE_STANCE_GATE
false
Enable rhetorical stance gate
STANCE_MODEL
falls back to DEEPSEEK_MODEL
Optionally override the model used for stance detection
DIVERSITY_ENABLED
true
Query-time diversity re-ranking
RETENTION_DAYS
7
Auto-prune matched posts after N days
MIN_POST_LENGTH
30
Skip very short posts
DB_PATH
feed.db
SQLite file path

Log markers
Each saved post logs with a compact set of markers:

🔴 critical / 🟢 praise / 🔵 inquiry
↩ matched via reply graph
💬 matched in a debate thread
🤖 LLM-only classification

Signal lines include url_tier:canonical/proceedings/institutional when a research-source URL matched, stance:ENGAGE/ANNOUNCE when the stance gate ran, and embed:crit=X,praise=Y,nei=Z showing embedding similarity scores.

Example: [+]🔵 ↩💬🤖 at://... dewey:300 inq:meta_critique [care,connectivity] reads as: substantive inquiry, specifically a meta-critique post about critique norms, inherited via reply graph, in a debate thread, classified by LLM, tagged social sciences, hit two 5C dimensions.
Architecture notes
Storage is SQLite (WAL mode). Schema migrations are idempotent (safeAddColumn).
Old posts and threads pruned after RETENTION_DAYS (default 7).
Cache stats logged hourly:

[parent-cache] size=4831/50000 | api_fetches=312 | hits=2104 | misses=98

All classification calls (stance + full) use the same DeepSeek API key. Cost is roughly $0.50-2/day at firehose volume.
Status
Working in alpha:

Jetstream ingestion across all languages
Multilingual research-vocabulary detection (en/es/pt/fr/de/it/ja/zh)
Three-way sentiment (critical / praise / inquiry) plus three inquiry sub-types
Reply-graph awareness with batched parent resolution
Dewey Decimal tagging (370+ URL patterns, gray-lit covered)
5C dimension tagging
Research-source URL classifier (canonical / proceedings / institutional / none)
Query-time MMR-style diversity re-ranking
Sub-feed routing by sentiment / Dewey / dimension / inquiry-type (combinable)
Thread engagement tracking with debate detection
163-assertion smoke test suite (126 Dewey + 37 URL classifier)
DeepSeek V4 Flash classifier with few-shot dissemination-vs-engagement prompt
Rhetorical stance gate (ENGAGE / ANNOUNCE / TANGENTIAL / OFF_TOPIC)
OpenAI text-embedding-3-small pre-filter (pluggable to Jina/Voyage/etc.)

Not yet implemented:

Post deletion handling (when an author deletes a matched post, it stays in the feed until aging-out). Tracked as the main pre-public-launch issue.
Calibration tooling (no labeled set yet; thresholds are hand-picked).
Author allowlist / blocklist.
Dashboard for reviewing matches and labeling false positives.
Ideas for next
Post deletion handling: currently the most important pre-public-launch item.
Calibration: a labeled set of 200-500 posts and grid search over score weights and confidence thresholds.
Author allowlist: boost known methodologists, replication researchers, domain critics.
Dashboard: review matches, label false positives, retrain the LLM prompt and embedding exemplars.
Credits
The 5C peer-review framework (Credibility, Clarity, Creativity, Connectivity, Care) is from a peer-review methodology skill referenced internally.
Many URL patterns for the Dewey registry are folded in from PaperSkygest, a complementary feed for personalized paper announcements (Greenwood & Garg, 2026).
Bluesky's Jetstream and the ATProto SDK make all of this tractable.
License
TBD. While in alpha, the repo is private. License will be selected (probably MIT or Apache 2.0) before any public release.

