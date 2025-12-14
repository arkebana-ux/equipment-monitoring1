const { db } = require('../config/db');

class Equipment {
  static findByRoom(roomId, cb) {
    db.all('SELECT * FROM equipment WHERE room_id = ?', [roomId], cb);
  }

  static create(fields, cb) {
    const { room_id, name, serial_number, purchase_date } = fields;
    const sql = `INSERT INTO equipment (room_id, name, serial_number, purchase_date)
                 VALUES (?, ?, ?, ?)`;
    db.run(sql, [room_id, name, serial_number, purchase_date], function (err) {
      cb(err, this?.lastID);
    });
  }

  static setActive(id, isActive, cb) {
    db.run('UPDATE equipment SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id], cb);
  }

  static update(id, fields, cb) {
    const { name, serial_number, purchase_date } = fields;
    const sql = `
      UPDATE equipment
      SET name = ?, serial_number = ?, purchase_date = ?
      WHERE id = ?`;
    db.run(sql, [name, serial_number, purchase_date, id], cb);
  }
}

module.exports = Equipment;
