const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'riskradar.sqlite');

function initDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crm_user_id TEXT NOT NULL,
      tenant_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      company_id INTEGER NOT NULL,
      mode TEXT NOT NULL,
      locale TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      user_id TEXT,
      tenant_id TEXT,
      error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      company_id INTEGER NOT NULL,
      mode TEXT NOT NULL,
      locale TEXT NOT NULL,
      risk_level TEXT,
      confidence_score INTEGER,
      summary TEXT,
      result_json TEXT NOT NULL,
      source_task_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL,
      source_type TEXT NOT NULL,
      source_url TEXT,
      title TEXT,
      snippet TEXT,
      weight INTEGER,
      collected_at TEXT NOT NULL,
      FOREIGN KEY(company_id) REFERENCES companies(id)
    );
  `);

  return db;
}

module.exports = {
  initDb,
  DB_PATH,
};
