const { db } = require('../config/db');

class Room {
  static all(cb) {
    db.all('SELECT * FROM rooms', cb);
  }

  static create(name, cb) {
    db.run('INSERT INTO rooms (name) VALUES (?)', [name], function (err) {
      cb(err, this?.lastID);
    });
  }

  static delete(id, cb) {
    db.run('DELETE FROM rooms WHERE id = ?', [id], cb);
  }
}

module.exports = Room;
