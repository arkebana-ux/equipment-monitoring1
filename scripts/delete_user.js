const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const login = process.argv[2] || 'Admin';
const dbPath = path.join(__dirname, '..', 'db.sqlite3');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Cannot open database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.get('SELECT id, login FROM users WHERE login = ?', [login], (err, row) => {
    if (err) {
      console.error('Query error:', err.message);
      db.close();
      process.exit(1);
    }
    if (!row) {
      console.log(`User with login "${login}" not found — nothing to delete.`);
      db.close();
      process.exit(0);
    }

    const userId = row.id;
    console.log(`Found user id=${userId}, login=${row.login}. Deleting related records...`);

    db.run('BEGIN TRANSACTION');

    db.run('DELETE FROM room_teachers WHERE user_id = ?', [userId], function (err2) {
      if (err2) console.error('Error deleting from room_teachers:', err2.message);
      else console.log(`Deleted ${this.changes} room_teachers rows`);

      db.run('DELETE FROM complaints WHERE user_id = ?', [userId], function (err3) {
        if (err3) console.error('Error deleting from complaints:', err3.message);
        else console.log(`Deleted ${this.changes} complaints rows`);

        db.run('DELETE FROM users WHERE id = ?', [userId], function (err4) {
          if (err4) {
            console.error('Error deleting user:', err4.message);
            db.run('ROLLBACK');
          } else {
            console.log(`Deleted user id=${userId} (login="${login}")`);
            db.run('COMMIT');
          }
          db.close();
        });
      });
    });
  });
});
