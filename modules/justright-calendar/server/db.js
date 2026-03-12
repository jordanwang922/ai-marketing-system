const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nameEn TEXT,
    color TEXT,
    bgColor TEXT,
    borderColor TEXT
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    titleEn TEXT,
    userId TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    startTime TEXT,
    endTime TEXT,
    isAllDay INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// Insert default users if empty
const usersCount = db.prepare('SELECT count(*) as count FROM users').get();
if (usersCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, name, nameEn, color, bgColor, borderColor) VALUES (?, ?, ?, ?, ?, ?)');
  insertUser.run('jordan', 'Jordan', 'Jordan', '#7F56D9', 'bg-purple-500', 'border-purple-500');
  insertUser.run('dean', 'Dean', 'Dean', '#17B26A', 'bg-green-500', 'border-green-500');
}

console.log('SQLite database initialized.');

module.exports = db;
