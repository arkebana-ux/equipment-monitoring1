const { db } = require('../config/db');

class User {
  static create({ login, password_hash, full_name, role, is_super_admin = 0, email = null }, cb) {
    const sql = `INSERT INTO users (login, password_hash, full_name, role, is_super_admin, email)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [login, password_hash, full_name, role, is_super_admin, email], function (err) {
      cb(err, this?.lastID);
    });
  }

  static findByLogin(login, cb) {
    db.get('SELECT * FROM users WHERE login = ?', [login], cb);
  }

  static findById(id, cb) {
    db.get('SELECT * FROM users WHERE id = ?', [id], cb);
  }

  static findByEmail(email, cb) {
    db.get('SELECT * FROM users WHERE email = ?', [email], cb);
  }

  static findAllTeachers(cb) {
    db.all('SELECT * FROM users WHERE role = "teacher"', cb);
  }

  static findAllAdmins(cb) {
    db.all('SELECT * FROM users WHERE role = "admin" ORDER BY is_super_admin DESC, id ASC', cb);
  }

  static update(id, fields, cb) {
    const { full_name, role } = fields;
    const sql = `UPDATE users SET full_name = ?, role = ? WHERE id = ?`;
    db.run(sql, [full_name, role, id], cb);
  }

  static updatePassword(id, password_hash, cb) {
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id], cb);
  }

  static delete(id, cb) {
    db.run('DELETE FROM users WHERE id = ?', [id], cb);
  }
}

module.exports = User;
