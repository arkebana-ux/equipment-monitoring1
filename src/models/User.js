const { db } = require('../config/db');

class User {
  static create({ login, password_hash, full_name, role }, cb) {
    const sql = `INSERT INTO users (login, password_hash, full_name, role)
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [login, password_hash, full_name, role], function (err) {
      cb(err, this?.lastID);
    });
  }

  static findByLogin(login, cb) {
    db.get('SELECT * FROM users WHERE login = ?', [login], cb);
  }

  static findAllTeachers(cb) {
    db.all('SELECT * FROM users WHERE role = "teacher"', cb);
  }

  static update(id, fields, cb) {
    const { full_name, role } = fields;
    const sql = `UPDATE users SET full_name = ?, role = ? WHERE id = ?`;
    db.run(sql, [full_name, role, id], cb);
  }

  static delete(id, cb) {
    db.run('DELETE FROM users WHERE id = ?', [id], cb);
  }
}

module.exports = User;
