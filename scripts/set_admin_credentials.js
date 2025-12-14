const bcrypt = require('bcrypt');
const { db, initDb } = require('../src/config/db');

const SALT_ROUNDS = 10;
const targetLogin = process.argv[2] || 'Admin';
const targetPassword = process.argv[3] || '000000';

initDb();

function findAnyAdmin(cb) {
  db.get("SELECT * FROM users WHERE LOWER(login) = 'admin' OR role = 'admin' LIMIT 1", cb);
}

findAnyAdmin((err, user) => {
  if (err) {
    console.error('DB error:', err.message || err);
    process.exit(1);
  }

  bcrypt.hash(targetPassword, SALT_ROUNDS, (hErr, hash) => {
    if (hErr) {
      console.error('Hash error:', hErr.message || hErr);
      process.exit(1);
    }

    if (user) {
      // update login and password_hash
      db.run('UPDATE users SET login = ?, password_hash = ?, full_name = ? , role = ? WHERE id = ?', [targetLogin, hash, 'Главный администратор', 'admin', user.id], function (uErr) {
        if (uErr) {
          console.error('Update error:', uErr.message || uErr);
          process.exit(1);
        }
        console.log(`Updated existing user id=${user.id} -> login='${targetLogin}'`);
        process.exit(0);
      });
    } else {
      // insert new admin
      db.run('INSERT INTO users (login, password_hash, full_name, role) VALUES (?, ?, ?, ?)', [targetLogin, hash, 'Главный администратор', 'admin'], function (iErr) {
        if (iErr) {
          console.error('Insert error:', iErr.message || iErr);
          process.exit(1);
        }
        console.log(`Created admin id=${this.lastID} login='${targetLogin}'`);
        process.exit(0);
      });
    }
  });
});
