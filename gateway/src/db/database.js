/**
 * AURA Gateway – Database module
 * Uses the built-in node:sqlite module (Node.js >= 22.5).
 *
 * Note: node:sqlite is loaded via createRequire to keep Vite/Vitest happy,
 * since it's an experimental built-in not yet in the standard builtinModules list.
 */

import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
// Use dynamic require to bypass Vite's static ESM resolver
const { DatabaseSync } = require('node:sqlite');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_PATH =
  process.env.DB_PATH || path.join(__dirname, '../../../data/aura.db');

let _db = null;

/**
 * Return the already-opened db instance.
 * Throws if openDb() has not been called.
 */
export function getDb() {
  if (!_db) throw new Error('Database not initialised – call openDb() first.');
  return _db;
}

/**
 * Open (or create) the SQLite database and apply migrations.
 * Returns the db instance (idempotent: safe to call multiple times).
 */
export function openDb(dbPath = DEFAULT_DB_PATH) {
  if (_db) return _db;

  if (dbPath !== ':memory:') {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }

  _db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') {
    _db.exec('PRAGMA journal_mode = WAL;');
  }
  _db.exec('PRAGMA foreign_keys = ON;');

  applyMigrations(_db);
  return _db;
}

export function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function applyMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id          TEXT    PRIMARY KEY,
      name        TEXT    NOT NULL DEFAULT '',
      ip_address  TEXT,
      last_seen   INTEGER,
      paired      INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS tags (
      uid         TEXT    PRIMARY KEY,
      label       TEXT    NOT NULL DEFAULT '',
      description TEXT    NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS workflows (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tag_uid     TEXT    NOT NULL,
      event_type  TEXT    NOT NULL DEFAULT 'TAG_PLACED',
      name        TEXT    NOT NULL DEFAULT '',
      url         TEXT    NOT NULL,
      method      TEXT    NOT NULL DEFAULT 'POST',
      headers     TEXT    NOT NULL DEFAULT '{}',
      body        TEXT    NOT NULL DEFAULT '{}',
      enabled     INTEGER NOT NULL DEFAULT 1,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (tag_uid) REFERENCES tags(uid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id   TEXT,
      tag_uid     TEXT,
      event_type  TEXT    NOT NULL,
      intent      TEXT,
      payload     TEXT,
      status      TEXT    NOT NULL DEFAULT 'ok',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_tag_uid    ON logs(tag_uid);
    CREATE INDEX IF NOT EXISTS idx_workflows_tag   ON workflows(tag_uid, event_type);
  `);
}
