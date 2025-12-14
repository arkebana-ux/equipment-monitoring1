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

  // Удаление аудитории и связанных данных (оборудование, привязки преподавателей, жалобы)
  static deleteCascade(id, cb) {
    db.serialize(() => {
      // удаляем жалобы, связанные с оборудованием в этой аудитории
      db.run(
        `DELETE FROM complaints WHERE equipment_id IN (SELECT id FROM equipment WHERE room_id = ?)`,
        [id],
        (err) => {
          if (err) return cb(err);
          // удаляем само оборудование
          db.run('DELETE FROM equipment WHERE room_id = ?', [id], (err2) => {
            if (err2) return cb(err2);
            // удаляем связи преподавателей
            db.run('DELETE FROM room_teachers WHERE room_id = ?', [id], (err3) => {
              if (err3) return cb(err3);
              // наконец удаляем саму аудиторию
              db.run('DELETE FROM rooms WHERE id = ?', [id], (err4) => {
                cb(err4);
              });
            });
          });
        }
      );
    });
  }
}

module.exports = Room;
