const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { config } = require('./config');

const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(config.dbPath);

function initDatabase() {
    db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      message TEXT NOT NULL,
      remind_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      sent INTEGER DEFAULT 0
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS rss_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT,
      last_item_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS mail_config (
      user_id TEXT PRIMARY KEY,
      host TEXT NOT NULL,
      port INTEGER DEFAULT 993,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      digest_time TEXT DEFAULT '08:00',
      enabled INTEGER DEFAULT 1
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS user_timezone (
      user_id TEXT PRIMARY KEY,
      timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai'
    )
  `);

    db.exec(`
    CREATE TABLE IF NOT EXISTS rss_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'include'
    )
  `);
}

const reminderDb = {
    add: (userId, chatId, message, remindAt) => {
        const stmt = db.prepare(
            'INSERT INTO reminders (user_id, chat_id, message, remind_at) VALUES (?, ?, ?, ?)'
        );
        return stmt.run(userId, chatId, message, remindAt);
    },

    getPending: () => {
        const now = Math.floor(Date.now() / 1000);
        return db.prepare(
            'SELECT * FROM reminders WHERE remind_at <= ? AND sent = 0'
        ).all(now);
    },

    markSent: (id) => {
        return db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(id);
    },

    listByUser: (userId) => {
        return db.prepare(
            'SELECT * FROM reminders WHERE user_id = ? AND sent = 0 ORDER BY remind_at'
        ).all(userId);
    },

    delete: (id, userId) => {
        return db.prepare(
            'DELETE FROM reminders WHERE id = ? AND user_id = ?'
        ).run(id, userId);
    },
};

const noteDb = {
    add: (userId, content) => {
        const stmt = db.prepare(
            'INSERT INTO notes (user_id, content) VALUES (?, ?)'
        );
        return stmt.run(userId, content);
    },

    list: (userId, limit = 10) => {
        return db.prepare(
            'SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
        ).all(userId, limit);
    },

    delete: (id, userId) => {
        return db.prepare(
            'DELETE FROM notes WHERE id = ? AND user_id = ?'
        ).run(id, userId);
    },

    clear: (userId) => {
        return db.prepare('DELETE FROM notes WHERE user_id = ?').run(userId);
    },
};

const rssDb = {
    add: (userId, chatId, url, title) => {
        const stmt = db.prepare(
            'INSERT INTO rss_feeds (user_id, chat_id, url, title) VALUES (?, ?, ?, ?)'
        );
        return stmt.run(userId, chatId, url, title);
    },

    list: (userId) => {
        return db.prepare(
            'SELECT * FROM rss_feeds WHERE user_id = ?'
        ).all(userId);
    },

    getAll: () => {
        return db.prepare('SELECT * FROM rss_feeds').all();
    },

    updateLastItem: (id, lastItemId) => {
        return db.prepare(
            'UPDATE rss_feeds SET last_item_id = ? WHERE id = ?'
        ).run(lastItemId, id);
    },

    delete: (id, userId) => {
        return db.prepare(
            'DELETE FROM rss_feeds WHERE id = ? AND user_id = ?'
        ).run(id, userId);
    },
};

const settingsDb = {
    get: (key, defaultValue = null) => {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : defaultValue;
    },

    set: (key, value) => {
        return db.prepare(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
        ).run(key, String(value));
    },
};

const timezoneDb = {
    get: (userId) => {
        const row = db.prepare('SELECT timezone FROM user_timezone WHERE user_id = ?').get(userId);
        return row ? row.timezone : 'Asia/Shanghai';
    },

    set: (userId, timezone) => {
        return db.prepare(
            'INSERT OR REPLACE INTO user_timezone (user_id, timezone) VALUES (?, ?)'
        ).run(userId, timezone);
    },
};

const keywordDb = {
    add: (keyword, type = 'include') => {
        const existing = db.prepare(
            'SELECT id FROM rss_keywords WHERE keyword = ? AND type = ?'
        ).get(keyword, type);
        if (existing) return { changes: 0 };
        return db.prepare(
            'INSERT INTO rss_keywords (keyword, type) VALUES (?, ?)'
        ).run(keyword, type);
    },

    list: (type) => {
        if (type) {
            return db.prepare('SELECT * FROM rss_keywords WHERE type = ?').all(type);
        }
        return db.prepare('SELECT * FROM rss_keywords').all();
    },

    delete: (keyword, type) => {
        return db.prepare(
            'DELETE FROM rss_keywords WHERE keyword = ? AND type = ?'
        ).run(keyword, type);
    },

    getKeywords: () => {
        return db.prepare("SELECT keyword FROM rss_keywords WHERE type = 'include'").all().map(r => r.keyword);
    },

    getExcludes: () => {
        return db.prepare("SELECT keyword FROM rss_keywords WHERE type = 'exclude'").all().map(r => r.keyword);
    },
};

module.exports = {
    db,
    initDatabase,
    reminderDb,
    noteDb,
    rssDb,
    settingsDb,
    timezoneDb,
    keywordDb,
};
