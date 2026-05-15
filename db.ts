// SQLite persistence for matched posts.
//
// Two design points worth knowing:
//
// 1. WAL mode (`journal_mode = WAL`) lets the ingest loop write concurrently
//    with the HTTP server reading. Without WAL, SQLite serializes everything
//    on a single lock and the server can stall.
// 2. `safeAddColumn` is a poor-person's migration. Schema has grown as the
//    feed has added features (sentiment, dewey_class, inquiry_type, …).
//    ALTER TABLE ADD COLUMN throws if the column already exists; we catch and
//    swallow, so the same code path is idempotent for fresh DBs and old DBs.
//
// Querying happens via getFeedCandidates, which over-fetches to give the
// diversity re-ranker (server.ts) room to work. The cursor format is
// `<score>::<indexed_at>` so pagination is stable under score-then-time
// ordering.

import Database from 'better-sqlite3';

const db = new Database(process.env.DB_PATH ?? 'feed.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    uri          TEXT PRIMARY KEY,
    cid          TEXT NOT NULL,
    did          TEXT NOT NULL,
    text         TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    indexed_at   TEXT NOT NULL,
    score        REAL NOT NULL,
    signals      TEXT NOT NULL,
    thread_root  TEXT,
    dewey_class  TEXT,
    dimensions   TEXT NOT NULL DEFAULT '[]',  -- JSON array of 5C dimension strings
    lang         TEXT,
    classifier   TEXT,                          -- "keyword" | "llm" | "keyword+llm"
    sentiment    TEXT NOT NULL DEFAULT 'critical',
    inquiry_type TEXT                           -- only set when sentiment='inquiry'
  );
  CREATE INDEX IF NOT EXISTS idx_indexed ON posts (indexed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_score ON posts (score DESC, indexed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_thread_root ON posts (thread_root);
  CREATE INDEX IF NOT EXISTS idx_dewey ON posts (dewey_class);
  CREATE INDEX IF NOT EXISTS idx_sentiment ON posts (sentiment);
  CREATE INDEX IF NOT EXISTS idx_inquiry_type ON posts (inquiry_type);
`);

// Idempotent migrations. New columns get added on startup if the DB file
// already exists from a prior version of the code.
function safeAddColumn(col: string, type: string, defaultExpr?: string) {
  try {
    db.exec(`ALTER TABLE posts ADD COLUMN ${col} ${type}${defaultExpr ? ` DEFAULT ${defaultExpr}` : ''}`);
  } catch { /* column exists, no-op */ }
}
safeAddColumn('thread_root', 'TEXT');
safeAddColumn('dewey_class', 'TEXT');
safeAddColumn('dimensions', "TEXT NOT NULL", "'[]'");
safeAddColumn('lang', 'TEXT');
safeAddColumn('classifier', 'TEXT');
safeAddColumn('sentiment', "TEXT NOT NULL", "'critical'");
safeAddColumn('inquiry_type', 'TEXT');

// Prepared statement — better-sqlite3 caches and reuses the parsed SQL.
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO posts
    (uri, cid, did, text, created_at, indexed_at, score, signals, thread_root, dewey_class, dimensions, lang, classifier, sentiment, inquiry_type)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

export type PostRow = {
  uri: string;
  cid: string;
  did: string;
  text: string;
  createdAt: string;
  score: number;
  signals: string[];
  threadRoot: string;
  deweyClass: string | null;
  dimensions: string[];
  lang: string | null;
  classifier: string;
  sentiment: string;
  inquiryType: string | null;
};

// INSERT OR IGNORE — if the same post URI flows through twice (shouldn't,
// but Jetstream replays during reconnect could cause it) we silently skip.
export function savePost(p: PostRow) {
  insertStmt.run(
    p.uri, p.cid, p.did, p.text, p.createdAt,
    new Date().toISOString(), p.score, JSON.stringify(p.signals),
    p.threadRoot, p.deweyClass, JSON.stringify(p.dimensions),
    p.lang, p.classifier, p.sentiment, p.inquiryType
  );
}

// Retroactively boost prior matches in a thread that just hit debate status.
// Returns row count for logging.
export function boostThreadScores(threadRoot: string, delta: number): number {
  return db.prepare(`UPDATE posts SET score = score + ? WHERE thread_root = ?`)
    .run(delta, threadRoot).changes;
}

export type FeedCandidate = {
  uri: string;
  did: string;
  text: string;
  score: number;
  indexed_at: string;
  thread_root: string | null;
  dewey_class: string | null;
  sentiment: string;
  inquiry_type: string | null;
  dimensions: string[];
};

// Pull candidates for the feed. The server typically over-fetches (e.g.
// limit × 5) and hands the result to the diversity re-ranker. Filters by
// dewey class, 5C dimension, sentiment, and/or inquiry type — applied as
// AND clauses if multiple are passed.
//
// Cursor format: "<score>::<indexed_at>". Pagination needs both because
// rows are ordered by score DESC, indexed_at DESC, so the cursor encodes
// the position in both dimensions to avoid duplicates / skips across pages.
export function getFeedCandidates(
  limit: number,
  cursor?: string,
  opts?: { dewey?: string; dimension?: string; sentiment?: string; inquiryType?: string }
): FeedCandidate[] {
  const where: string[] = [];
  const params: any[] = [];

  if (cursor) {
    const [cScore, cTime] = cursor.split('::');
    // Posts strictly less than the cursor's score, OR tied on score and
    // strictly older — same lexicographic logic as the ORDER BY below.
    where.push(`(score < ? OR (score = ? AND indexed_at < ?))`);
    params.push(parseFloat(cScore), parseFloat(cScore), cTime);
  }
  if (opts?.dewey) { where.push(`dewey_class = ?`); params.push(opts.dewey); }
  if (opts?.dimension) {
    // dimensions is a JSON array string; LIKE with the quoted dimension name
    // is a crude but adequate substring check.
    where.push(`dimensions LIKE ?`);
    params.push(`%"${opts.dimension}"%`);
  }
  if (opts?.sentiment) { where.push(`sentiment = ?`); params.push(opts.sentiment); }
  if (opts?.inquiryType) { where.push(`inquiry_type = ?`); params.push(opts.inquiryType); }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit);
  const rows = db
    .prepare(
      `SELECT uri, did, text, score, indexed_at, thread_root, dewey_class,
              sentiment, inquiry_type, dimensions
       FROM posts ${clause}
       ORDER BY score DESC, indexed_at DESC LIMIT ?`
    )
    .all(...params) as any[];
  return rows.map((r) => ({
    ...r,
    dimensions: safeParseArr(r.dimensions),
  }));
}

function safeParseArr(s: unknown): string[] {
  if (typeof s !== 'string') return [];
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : []; }
  catch { return []; }
}

// Back-compat thin shim. Older callers that only need URIs use this.
export function getFeed(
  limit: number,
  cursor?: string,
  opts?: { dewey?: string; dimension?: string; sentiment?: string; inquiryType?: string }
): { uri: string; indexed_at: string; score: number }[] {
  return getFeedCandidates(limit, cursor, opts).map((r) => ({
    uri: r.uri, indexed_at: r.indexed_at, score: r.score,
  }));
}

// Retention pruning. Run by the index.ts hourly tick.
export function pruneOlderThan(days: number) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return db.prepare(`DELETE FROM posts WHERE indexed_at < ?`).run(cutoff).changes;
}
