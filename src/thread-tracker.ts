// Thread engagement tracking — supports "debate" detection.
//
// What this is for:
//   A single critique post by one person is one thing. The same critique with
//   pushback / counter-arguments / praise from multiple distinct authors is a
//   different thing — it's a debate, and arguably more useful for the feed to
//   surface. This module counts engagement per thread root and flags threads
//   that cross the debate threshold (≥2 distinct authors by default).
//
// What "thread root" means:
//   In ATProto, the root of a thread is the post that started it. If A posts
//   a paper share, B replies critically, C replies questioning B, all three
//   posts share the same `reply.root.uri` (which equals A's URI). The classifier
//   stores that root URI on each matched post, and we key counts on it here.
//
// What "debate" triggers:
//   The first post in a thread arrives as a count of 1 (one author, one
//   engagement). When the second distinct author engages — critically, with
//   praise, or with substantive inquiry — `becameDebate` flips true once.
//   index.ts uses that signal to retroactively boost the prior posts in the
//   thread, so an early critique that won attention floats up in the ranking.

import Database from 'better-sqlite3';

const db = new Database(process.env.DB_PATH ?? 'feed.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    root_uri              TEXT PRIMARY KEY,
    critical_count        INTEGER NOT NULL DEFAULT 0,
    praise_count          INTEGER NOT NULL DEFAULT 0,
    inquiry_count         INTEGER NOT NULL DEFAULT 0,
    distinct_authors      INTEGER NOT NULL DEFAULT 0,
    distinct_critical     INTEGER NOT NULL DEFAULT 0,
    distinct_praise       INTEGER NOT NULL DEFAULT 0,
    distinct_inquiry      INTEGER NOT NULL DEFAULT 0,
    first_engaged_at      TEXT,
    last_engaged_at       TEXT,
    is_debate             INTEGER NOT NULL DEFAULT 0,
    -- authors_json holds {critical: [did,...], praise: [did,...], inquiry: [did,...]}.
    -- We need the explicit set membership to dedupe authors across multiple
    -- posts; storing as JSON in a single column keeps the schema simple.
    authors_json          TEXT NOT NULL DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_threads_debate ON threads (is_debate, last_engaged_at DESC);
  CREATE INDEX IF NOT EXISTS idx_threads_last ON threads (last_engaged_at);
`);

const DEBATE_THRESHOLD_AUTHORS = parseInt(process.env.DEBATE_THRESHOLD_AUTHORS ?? '2');
const DEBATE_BONUS = parseFloat(process.env.DEBATE_BONUS ?? '1.0');

type Sentiment = 'critical' | 'praise' | 'inquiry';

type AuthorsMap = {
  critical: string[];
  praise: string[];
  inquiry: string[];
};

export type ThreadUpdate = {
  criticalCount: number;
  praiseCount: number;
  inquiryCount: number;
  distinctAuthors: number;
  distinctCritical: number;
  distinctPraise: number;
  distinctInquiry: number;
  isDebate: boolean;
  becameDebate: boolean;
  debateBonus: number;
};

export function recordEngagementInThread(
  rootUri: string,
  authorDid: string,
  sentiment: Sentiment
): ThreadUpdate {
  const existing = db.prepare(`SELECT * FROM threads WHERE root_uri = ?`).get(rootUri) as
    | {
        critical_count: number;
        praise_count: number;
        inquiry_count: number;
        distinct_authors: number;
        first_engaged_at: string;
        is_debate: number;
        authors_json: string;
      }
    | undefined;

  const now = new Date().toISOString();
  let authors: AuthorsMap;
  let criticalCount: number;
  let praiseCount: number;
  let inquiryCount: number;
  let firstAt: string;
  let wasDebate = false;

  if (existing) {
    authors = safeParse(existing.authors_json);
    criticalCount = existing.critical_count;
    praiseCount = existing.praise_count;
    inquiryCount = existing.inquiry_count;
    firstAt = existing.first_engaged_at;
    wasDebate = existing.is_debate === 1;
  } else {
    authors = { critical: [], praise: [], inquiry: [] };
    criticalCount = 0;
    praiseCount = 0;
    inquiryCount = 0;
    firstAt = now;
  }

  if (sentiment === 'critical') {
    criticalCount += 1;
    if (!authors.critical.includes(authorDid)) authors.critical.push(authorDid);
  } else if (sentiment === 'praise') {
    praiseCount += 1;
    if (!authors.praise.includes(authorDid)) authors.praise.push(authorDid);
  } else {
    inquiryCount += 1;
    if (!authors.inquiry.includes(authorDid)) authors.inquiry.push(authorDid);
  }

  const allAuthors = new Set([...authors.critical, ...authors.praise, ...authors.inquiry]);
  const distinctAuthors = allAuthors.size;
  const isDebate = distinctAuthors >= DEBATE_THRESHOLD_AUTHORS;

  db.prepare(
    `INSERT INTO threads (root_uri, critical_count, praise_count, inquiry_count, distinct_authors, distinct_critical, distinct_praise, distinct_inquiry, first_engaged_at, last_engaged_at, is_debate, authors_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(root_uri) DO UPDATE SET
       critical_count    = excluded.critical_count,
       praise_count      = excluded.praise_count,
       inquiry_count     = excluded.inquiry_count,
       distinct_authors  = excluded.distinct_authors,
       distinct_critical = excluded.distinct_critical,
       distinct_praise   = excluded.distinct_praise,
       distinct_inquiry  = excluded.distinct_inquiry,
       last_engaged_at   = excluded.last_engaged_at,
       is_debate         = excluded.is_debate,
       authors_json      = excluded.authors_json`
  ).run(
    rootUri, criticalCount, praiseCount, inquiryCount,
    distinctAuthors, authors.critical.length, authors.praise.length, authors.inquiry.length,
    firstAt, now, isDebate ? 1 : 0, JSON.stringify(authors)
  );

  return {
    criticalCount, praiseCount, inquiryCount,
    distinctAuthors,
    distinctCritical: authors.critical.length,
    distinctPraise: authors.praise.length,
    distinctInquiry: authors.inquiry.length,
    isDebate,
    becameDebate: !wasDebate && isDebate,
    debateBonus: DEBATE_BONUS,
  };
}

function safeParse(s: string): AuthorsMap {
  try {
    const v = JSON.parse(s);
    return {
      critical: Array.isArray(v?.critical) ? v.critical : [],
      praise: Array.isArray(v?.praise) ? v.praise : [],
      inquiry: Array.isArray(v?.inquiry) ? v.inquiry : [],
    };
  } catch {
    return { critical: [], praise: [], inquiry: [] };
  }
}

export function pruneOldThreads(days: number): number {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return db.prepare(`DELETE FROM threads WHERE last_engaged_at < ?`).run(cutoff).changes;
}
