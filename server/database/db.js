import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 使用用户数据目录，优先使用 APP_DATA_DIR 环境变量
const baseDir = process.env.APP_DATA_DIR || path.join(os.homedir(), '.claude-code-ui');
const DB_PATH = path.join(baseDir, 'auth.db');
const INIT_SQL_PATH = path.join(__dirname, 'init.sql');

// 确保数据目录存在
try {
  fs.mkdirSync(baseDir, { recursive: true });
} catch (error) {
  if (error.code !== 'EEXIST') {
    console.error('Failed to create data directory:', error);
    throw error;
  }
}

// 条件加载 better-sqlite3，如果失败则禁用数据库功能
let Database = null;
let db = null;
let databaseEnabled = false;

try {
  const sqlite3Module = await import('better-sqlite3');
  Database = sqlite3Module.default;
  db = new Database(DB_PATH);
  databaseEnabled = true;
  console.log('✅ SQLite database functionality enabled');
} catch (error) {
  console.warn('⚠️ Database functionality disabled - better-sqlite3 not available:', error.message);
  databaseEnabled = false;
  
  // Create mock database object
  db = {
    prepare: () => ({ get: () => null, run: () => ({ lastInsertRowid: 1 }), all: () => [] }),
    exec: () => {},
    close: () => {}
  };
}

// Initialize database with schema
const initializeDatabase = async () => {
  try {
    if (!databaseEnabled) {
      console.log('⚠️ Database initialization skipped - database disabled');
      return;
    }
    const initSQL = fs.readFileSync(INIT_SQL_PATH, 'utf8');
    db.exec(initSQL);
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  }
};

// User database operations
const userDb = {
  // Check if any users exist
  hasUsers: () => {
    try {
      const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
      return row.count > 0;
    } catch (err) {
      throw err;
    }
  },

  // Create a new user
  createUser: (username, passwordHash) => {
    try {
      const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
      const result = stmt.run(username, passwordHash);
      return { id: result.lastInsertRowid, username };
    } catch (err) {
      throw err;
    }
  },

  // Get user by username
  getUserByUsername: (username) => {
    try {
      const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
      return row;
    } catch (err) {
      throw err;
    }
  },

  // Update last login time
  updateLastLogin: (userId) => {
    try {
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    } catch (err) {
      throw err;
    }
  },

  // Get user by ID
  getUserById: (userId) => {
    try {
      const row = db.prepare('SELECT id, username, created_at, last_login FROM users WHERE id = ? AND is_active = 1').get(userId);
      return row;
    } catch (err) {
      throw err;
    }
  }
};

export {
  db,
  initializeDatabase,
  userDb
};