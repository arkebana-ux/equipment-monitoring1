const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('./logger');

const dbPath = path.join(__dirname, '..', '..', 'db.sqlite3');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('DB connection error: ' + err.message);
  } else {
    logger.info('Connected to SQLite database');
  }
});

function initDb() {
  db.serialize(() => {
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        login TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS equipment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        serial_number TEXT,
        purchase_date TEXT,
        is_active INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Активно',
        FOREIGN KEY (room_id) REFERENCES rooms(id)
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS complaints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        room_id INTEGER,
        equipment_id INTEGER,
        description TEXT,
        status TEXT DEFAULT 'на рассмотрении',
        attachment_path TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (equipment_id) REFERENCES equipment(id)
      )`
    );

    db.run(
      `CREATE TABLE IF NOT EXISTS room_teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        UNIQUE (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES rooms(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    );

    // на случай старой схемы — пытаемся добавить колонку status
    db.run(
      `ALTER TABLE equipment ADD COLUMN status TEXT DEFAULT 'Активно'`,
      (err) => {
        if (err && !/duplicate column name/i.test(err.message)) {
          logger.error('Alter equipment table error: ' + err.message);
        }
      }
    );

    logger.info('Database schema ensured');
  });
}

module.exports = { db, initDb };
