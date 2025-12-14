// src/controllers/userController.js
const User = require('../models/User');
const RoomTeacher = require('../models/RoomTeacher');
const Complaint = require('../models/Complaint');

// Получить все аудитории, привязанные к текущему пользователю
exports.getMyRooms = (req, res, next) => {
  const teacherId = req.session.user.id; // Получаем ID преподавателя из сессии
  RoomTeacher.findRoomsByTeacher(teacherId, (err, rooms) => {
    if (err) return next(err);
    res.json({ rooms }); // Возвращаем список аудиторий
  });
};

// Получить оборудование для конкретной аудитории
exports.getRoomEquipment = (req, res, next) => {
  const roomId = req.params.id;

  Equipment.findByRoom(roomId, (err, equipment) => {
    if (err) return next(err);
    res.json({ equipment });
  });
};

// Отправка жалобы
exports.createComplaint = (req, res, next) => {
  const { room_id, equipment_id, description, attachments } = req.body;
  const teacher_id = req.session.user.id;

  Complaint.create({ room_id, equipment_id, teacher_id, description, attachments }, (err, id) => {
    if (err) return next(err);
    res.json({ message: 'Жалоба отправлена', id });
  });
};
