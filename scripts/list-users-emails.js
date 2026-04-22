const sqlite3 = require('sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'db.sqlite3');
const db = new sqlite3.Database(dbPath);

db.all('SELECT id, login, email, role FROM users ORDER BY id ASC', (err, rows) => {
  if (err) {
    console.error('DB ERROR', err.message);
    process.exit(1);
  }
  console.log('USERS:', rows.length);
  rows.forEach((row) => console.log(row));
  db.close();
});
