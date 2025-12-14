const bcrypt = require('bcrypt');
const path = require('path');
const User = require('../src/models/User');
const { initDb } = require('../src/config/db');

const SALT_ROUNDS = 10;
const LOGIN = 'admin';
const passwordArg = process.argv[2] || 'admin';

initDb();

User.findByLogin(LOGIN, (err, user) => {
  if (err) {
    console.error('DB error:', err.message || err);
    process.exit(1);
  }

  if (user) {
    console.log(`User '${LOGIN}' already exists (id=${user.id}). No action taken.`);
    process.exit(0);
  }

  bcrypt.hash(passwordArg, SALT_ROUNDS, (hErr, hash) => {
    if (hErr) {
      console.error('Hash error:', hErr.message || hErr);
      process.exit(1);
    }

    User.create({ login: LOGIN, password_hash: hash, full_name: 'Главный администратор', role: 'admin' }, (cErr, id) => {
      if (cErr) {
        console.error('Create user error:', cErr.message || cErr);
        process.exit(1);
      }

      console.log(`Main admin created. login='${LOGIN}', id=${id}, password='${passwordArg}'`);
      console.log('You should change this password after first login.');
      process.exit(0);
    });
  });
});
