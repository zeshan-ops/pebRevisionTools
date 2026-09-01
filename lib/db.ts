import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const SCHEMA_PATH = path.join(ROOT, "docs/schema.sql");
const MIGRATIONS_DIR = path.join(ROOT, "db/migrations");

/**
 * Migration runner.
 *
 * docs/schema.sql is the single source of truth for the schema (see its own
 * header comment) and is applied directly as migration 1 — read from disk at
 * apply time rather than duplicated into a migrations file, so there is no
 * risk of the two drifting apart.
 *
 * Later migrations, if any, live as db/migrations/NNN_name.sql and are
 * applied in filename order after migration 1. None exist yet.
 *
 * Idempotent: re-running against an already-migrated database applies
 * nothing. This must not depend on CREATE TABLE IF NOT EXISTS inside
 * schema.sql itself (it deliberately uses plain CREATE TABLE, so a second run
 * fails loudly if attempted) — idempotency instead comes from checking
 * schema_migrations before ever executing a migration body.
 */
function ensureMigrated(db: Database.Database) {
  const bootstrapped = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'`)
    .get();

  const applied = new Set<number>();
  if (bootstrapped) {
    for (const row of db.prepare(`SELECT version FROM schema_migrations`).all() as Array<{
      version: number;
    }>) {
      applied.add(row.version);
    }
  }

  const pending: Array<{ version: number; name: string; sql: string }> = [];

  if (!applied.has(1)) {
    pending.push({
      version: 1,
      name: "initial_schema",
      sql: fs.readFileSync(SCHEMA_PATH, "utf-8"),
    });
  }

  if (fs.existsSync(MIGRATIONS_DIR)) {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d+_.+\.sql$/.test(f))
      .sort();
    for (const file of files) {
      const version = Number(file.split("_")[0]);
      if (version <= 1 || applied.has(version)) continue;
      pending.push({
        version,
        name: file.replace(/^\d+_/, "").replace(/\.sql$/, ""),
        sql: fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8"),
      });
    }
  }

  pending.sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    const run = db.transaction(() => {
      db.exec(migration.sql);
      // schema.sql (migration 1) creates schema_migrations itself but does
      // not seed a row for its own version — record it now that the table
      // exists, and record every later migration the same way.
      db.prepare(
        `INSERT INTO schema_migrations (version, name) VALUES (?, ?)`,
      ).run(migration.version, migration.name);
    });
    run();
  }
}

function openDatabase(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureMigrated(db);
  return db;
}

// Cache the connection on globalThis so Next.js's dev-server hot reload
// (which re-evaluates modules but keeps the process alive) doesn't reopen
// the file or re-run the migration check on every request.
declare global {
  var __pebDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!globalThis.__pebDb) {
    globalThis.__pebDb = openDatabase();
  }
  return globalThis.__pebDb;
}

// Plain read query, not a mutation — deliberately NOT in lib/actions.ts.
// A "use server" file marks every export a Server Action, and Next requires
// Server Actions to be async; a sync read like this one broke that file's
// entire module graph for every Server Component that imported it.
export function countCardsReviewed(): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS n FROM card_review`)
    .get() as { n: number };
  return row.n;
}
