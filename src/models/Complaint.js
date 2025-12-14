const { db } = require('../config/db');

class Complaint {
  static create(fields, cb) {
    const { user_id, equipment_id, description, photo_path, video_path, attachment_path } = fields;
    // some schemas use single 'attachment_path', older code used 'photo_path'/'video_path'
    const attach = attachment_path || photo_path || video_path || null;
    const sql = `INSERT INTO complaints 
    (user_id, equipment_id, description, attachment_path)
    VALUES (?, ?, ?, ?)`;
    db.run(sql, [user_id, equipment_id, description, attach], function (err) {
      cb(err, this?.lastID);
    });
  }

  static findById(id, cb) {
    const sql = `SELECT c.*, u.full_name, u.login, e.name AS equipment_name, e.room_id, e.serial_number
                 FROM complaints c
                 LEFT JOIN users u ON c.user_id = u.id
                 LEFT JOIN equipment e ON c.equipment_id = e.id
                 WHERE c.id = ?`;
    db.get(sql, [id], cb);
  }

  static findOpenByEquipment(equipment_id, cb) {
    const sql = `SELECT * FROM complaints WHERE equipment_id = ? AND status != 'исправлено' LIMIT 1`;
    db.get(sql, [equipment_id], cb);
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
