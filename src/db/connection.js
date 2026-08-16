const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { DB_PATH } = require('./paths');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

let db;

function getDb() {
  if (db) return db;

  const isNewDb = !fs.existsSync(DB_PATH);
  db = new Database(DB_PATH);

  // Güvenlik / bütünlük ayarları
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  if (isNewDb) {
    console.log('[db] Yeni veritabanı oluşturuldu:', DB_PATH);
  }

  return db;
}

module.exports = { getDb, DB_PATH };
