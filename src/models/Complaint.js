const { db } = require('../config/db');

class Complaint {
  static create(fields, cb) {
    const { user_id, equipment_id, description, photo_path, video_path } = fields;
    const sql = `INSERT INTO complaints 
    (user_id, equipment_id, description, photo_path, video_path)
    VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [user_id, equipment_id, description, photo_path, video_path], function (err) {
      cb(err, this?.lastID);
    });
  }

  static byStatus(status, cb) {
    db.all(
      `SELECT c.*, u.full_name, e.name AS equipment_name
       FROM complaints c
       JOIN users u ON c.user_id = u.id
       JOIN equipment e ON c.equipment_id = e.id
       WHERE c.status = ?`,
      [status],
      cb
    );
  }

  static all(cb) {
    db.all(
      `SELECT c.*, u.full_name, e.name AS equipment_name
       FROM complaints c
       JOIN users u ON c.user_id = u.id
       JOIN equipment e ON c.equipment_id = e.id`,
      cb
    );
  }

  static setStatus(id, status, cb) {
    const sql = `UPDATE complaints 
                 SET status = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
    db.run(sql, [status, id], cb);
  }
}

module.exports = Complaint;
