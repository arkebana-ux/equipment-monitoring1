const { db } = require('../config/db');

class Equipment {
  static findByRoom(roomId, cb) {
    db.all('SELECT * FROM equipment WHERE room_id = ?', [roomId], cb);
  }

  static findById(id, cb) {
    db.get('SELECT * FROM equipment WHERE id = ?', [id], cb);
  }

  static create(fields, cb) {
    const { room_id, name, serial_number, purchase_date } = fields;
    // default status 'в работе' for newly created equipment
    const status = fields.status || 'в работе';
    const sql = `INSERT INTO equipment (room_id, name, serial_number, purchase_date, status)
                 VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [room_id, name, serial_number, purchase_date, status], function (err) {
      cb(err, this?.lastID);
    });
  }

  static setStatus(id, status, cb) {
    db.run('UPDATE equipment SET status = ? WHERE id = ?', [status, id], cb);
  }

  static delete(id, cb) {
    db.run('DELETE FROM equipment WHERE id = ?', [id], cb);
  }

  static update(id, fields, cb) {
    const { name, serial_number, purchase_date, status } = fields;
    const sql = `
      UPDATE equipment
      SET name = ?, serial_number = ?, purchase_date = ?, status = COALESCE(?, status)
      WHERE id = ?`;
    db.run(sql, [name, serial_number, purchase_date, status, id], cb);
  }
}

module.exports = Equipment;
