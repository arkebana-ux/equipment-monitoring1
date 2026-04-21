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
        role TEXT NOT NULL,
        is_super_admin INTEGER NOT NULL DEFAULT 0
      )`
    );

    db.run(
      `ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0`,
      (err) => {
        if (err && !/duplicate column name/i.test(err.message)) {
          logger.error('Alter users table error: ' + err.message);
        }
      }
    );

    db.get(`SELECT COUNT(*) AS count FROM users WHERE is_super_admin = 1`, (countErr, row) => {
      if (countErr) {
        logger.error('Check super admin error: ' + countErr.message);
        return;
      }

      if (row && row.count > 0) {
        return;
      }

      db.run(
        `UPDATE users
         SET is_super_admin = 1
         WHERE id = (
           SELECT id FROM users
           WHERE role = 'admin'
           ORDER BY CASE WHEN lower(login) = 'admin' THEN 0 ELSE 1 END, id
           LIMIT 1
         )`,
        (updateErr) => {
          if (updateErr) {
            logger.error('Init super admin error: ' + updateErr.message);
          }
        }
      );
    });

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
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
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

    db.run(
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        complaint_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
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

    // Инициализация значений колонки status для старой схемы, если она пустая
    db.run(`UPDATE equipment SET status = 'в работе' WHERE status IS NULL AND is_active = 1`, (uErr1) => {
      if (uErr1) logger.error('Init equipment status (active->в работе) error: ' + uErr1.message);
    });
    db.run(`UPDATE equipment SET status = 'в ремонте' WHERE status IS NULL AND is_active = 0`, (uErr2) => {
      if (uErr2) logger.error('Init equipment status (inactive->в ремонте) error: ' + uErr2.message);
    });

    // добавить updated_at для complaints, если нет (без нелегального CURRENT_TIMESTAMP по ALTER)
    db.run(
      `ALTER TABLE complaints ADD COLUMN updated_at TEXT`,
      (err) => {
        if (err && !/duplicate column name/i.test(err.message) && !/no such table/i.test(err.message)) {
          logger.error('Alter complaints table error: ' + err.message);
        } else if (!err) {
          // инициализируем значениями created_at для уже существующих записей
          db.run(`UPDATE complaints SET updated_at = created_at WHERE updated_at IS NULL`, (uErr) => {
            if (uErr) logger.error('Init updated_at error: ' + uErr.message);
          });
        }
      }
    );

    logger.info('Database schema ensured');
  });
}

module.exports = { db, initDb };
