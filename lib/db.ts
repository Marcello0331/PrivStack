import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import getConfig from 'next/config';

const { serverRuntimeConfig } = getConfig();
const DB_PATH = process.env.DATABASE_PATH || serverRuntimeConfig.DATABASE_PATH || '/data/privstack.db';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const database = db!;

  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'viewer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Apps table
  database.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon_url TEXT,
      description TEXT,
      category TEXT,
      open_in TEXT DEFAULT 'tab',
      sort_order INTEGER DEFAULT 0,
      pinned INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Widget layouts (per user)
  database.exec(`
    CREATE TABLE IF NOT EXISTS widget_layouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      layout_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    )
  `);

  // Settings table (key-value store)
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Service connection profiles used by widget instances.
  database.exec(`
    CREATE TABLE IF NOT EXISTS service_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      api_key TEXT,
      token TEXT,
      extra_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Icon cache
  database.exec(`
    CREATE TABLE IF NOT EXISTS icon_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT UNIQUE NOT NULL,
      icon_url TEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME
    )
  `);

  // Service health check cache
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER NOT NULL,
      is_online INTEGER DEFAULT 0,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(app_id) REFERENCES apps(id) ON DELETE CASCADE,
      UNIQUE(app_id)
    )
  `);

  // Initialize default settings if not exist
  const stmt = database.prepare('SELECT COUNT(*) as count FROM settings');
  const result = stmt.get() as { count: number };

  if (result.count === 0) {
    const insertStmt = database.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insertStmt.run('setup_complete', '0');
    insertStmt.run('search_engine', 'google');
    insertStmt.run('accent_color', '#3b82f6');
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

export default getDb;
