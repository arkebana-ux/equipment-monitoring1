const { db } = require('../config/db');

class Notification {
  // Создание уведомления
  static create(fields, cb) {
    const { user_id, complaint_id, title, message, type = 'info' } = fields;
    const sql = `INSERT INTO notifications (user_id, complaint_id, title, message, type)
                 VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [user_id, complaint_id, title, message, type], function (err) {
      cb(err, this?.lastID);
    });
  }

  // Получить все непрочитанные уведомления пользователя
  static findUnreadByUser(user_id, cb) {
    const sql = `SELECT n.*, c.status as complaint_status, c.description as complaint_description,
                        e.name as equipment_name
                 FROM notifications n
                 LEFT JOIN complaints c ON n.complaint_id = c.id
                 LEFT JOIN equipment e ON c.equipment_id = e.id
                 WHERE n.user_id = ? AND n.is_read = 0
                 ORDER BY n.created_at DESC`;
    db.all(sql, [user_id], cb);
  }

  // Получить все уведомления пользователя (с паджинацией по умолчанию)
  static findByUser(user_id, limit = 50, offset = 0, cb) {
    const sql = `SELECT n.*, c.status as complaint_status, c.description as complaint_description,
                        e.name as equipment_name
                 FROM notifications n
                 LEFT JOIN complaints c ON n.complaint_id = c.id
                 LEFT JOIN equipment e ON c.equipment_id = e.id
                 WHERE n.user_id = ?
                 ORDER BY n.created_at DESC
                 LIMIT ? OFFSET ?`;
    db.all(sql, [user_id, limit, offset], cb);
  }

  // Отметить уведомление как прочитанное
  static markAsRead(notification_id, cb) {
    const sql = `UPDATE notifications SET is_read = 1 WHERE id = ?`;
    db.run(sql, [notification_id], cb);
  }

  // Отметить все уведомления пользователя как прочитанные
  static markAllAsRead(user_id, cb) {
    const sql = `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`;
    db.run(sql, [user_id], cb);
  }

  // Удалить уведомление
  static delete(notification_id, cb) {
    const sql = `DELETE FROM notifications WHERE id = ?`;
    db.run(sql, [notification_id], cb);
  }

  // Удалить все уведомления пользователя
  static deleteAllByUser(user_id, cb) {
    const sql = `DELETE FROM notifications WHERE user_id = ?`;
    db.run(sql, [user_id], cb);
  }

  // Получить количество непрочитанных уведомлений
  static countUnread(user_id, cb) {
    const sql = `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`;
    db.get(sql, [user_id], (err, result) => {
      cb(err, result?.count || 0);
    });
  }
}

module.exports = Notification;
