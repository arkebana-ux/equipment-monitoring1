const { db } = require('../config/db');

class RoomTeacher {
  static assign(roomId, teacherId, cb) {
    const sql = 'INSERT OR IGNORE INTO room_teachers (room_id, user_id) VALUES (?, ?)';
    db.run(sql, [roomId, teacherId], cb);
  }

  static unassign(roomId, teacherId, cb) {
    const sql = 'DELETE FROM room_teachers WHERE room_id = ? AND user_id = ?';
    db.run(sql, [roomId, teacherId], cb);
  }

  static findTeachersByRoom(roomId, cb) {
    const sql = `
      SELECT u.*
      FROM room_teachers rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.room_id = ?`;
    db.all(sql, [roomId], cb);
  }

  static findRoomsByTeacher(userId, cb) {
    const sql = `
      SELECT r.*
      FROM room_teachers rt
      JOIN rooms r ON r.id = rt.room_id
      WHERE rt.user_id = ?`;
    db.all(sql, [userId], cb);
  }
}

module.exports = RoomTeacher;
