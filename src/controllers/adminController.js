const Room = require('../models/Room');
const Equipment = require('../models/Equipment');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const RoomTeacher = require('../models/RoomTeacher');
const { db } = require('../config/db');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Данные для админ-панели: аудитории, жалобы, преподаватели
exports.getDashboardData = (req, res, next) => {
  Complaint.all((err, complaints) => {
    if (err) return next(err);

    Room.all((err2, rooms) => {
      if (err2) return next(err2);

      User.findAllTeachers((err3, teachers) => {
        if (err3) return next(err3);

        res.json({ complaints, rooms, teachers });
      });
    });
  });
};

// Создание аудитории
exports.createRoom = (req, res, next) => {
  const { name } = req.body;
  Room.create(name, (err, id) => {
    if (err) return next(err);
    res.json({ id, name });
  });
};

// Удаление аудитории
exports.deleteRoom = (req, res, next) => {
  Room.delete(req.params.id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Аудитория удалена' });
  });
};

// Данные по конкретной аудитории: оборудование + преподаватели
exports.getRoomData = (req, res, next) => {
  const roomId = req.params.id;

  Equipment.findByRoom(roomId, (err, equipment) => {
    if (err) return next(err);

    RoomTeacher.findTeachersByRoom(roomId, (err2, roomTeachers) => {
      if (err2) return next(err2);

      User.findAllTeachers((err3, allTeachers) => {
        if (err3) return next(err3);

        res.json({ equipment, roomTeachers, allTeachers });
      });
    });
  });
};

// Добавление оборудования в аудиторию
exports.addEquipmentToRoom = (req, res, next) => {
  const room_id = req.params.id;
  const { name, serial_number, purchase_date } = req.body;

  Equipment.create({ room_id, name, serial_number, purchase_date }, (err, id) => {
    if (err) return next(err);
    res.json({ id });
  });
};

// Изменение активности оборудования
exports.setEquipmentActive = (req, res, next) => {
  const { id } = req.params;
  const { is_active } = req.body;
  Equipment.setActive(id, !!is_active, (err) => {
    if (err) return next(err);
    res.json({ message: 'Статус оборудования обновлён' });
  });
};

// Редактирование оборудования
exports.updateEquipment = (req, res, next) => {
  const { id } = req.params;
  Equipment.update(id, req.body, (err) => {
    if (err) return next(err);
    res.json({ message: 'Оборудование обновлено' });
  });
};

// Изменение статуса жалобы
exports.changeComplaintStatus = (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  Complaint.setStatus(id, status, (err) => {
    if (err) return next(err);
    res.json({ message: 'Статус жалобы обновлён' });
  });
};

// Список преподавателей
exports.listTeachers = (req, res, next) => {
  User.findAllTeachers((err, users) => {
    if (err) return next(err);
    res.json(users);
  });
};

// Обновление преподавателя (ФИО + логин + опционально пароль)
exports.updateTeacher = (req, res, next) => {
  const { id } = req.params;
  const { full_name, login, password } = req.body;

  if (!full_name || !login) {
    return res.status(400).json({ message: 'Не заполнены ФИО или логин' });
  }

  const updateWithoutPassword = () => {
    const sql = `UPDATE users SET full_name = ?, login = ?, role = "teacher" WHERE id = ?`;
    db.run(sql, [full_name, login, id], (err) => {
      if (err) return next(err);
      res.json({ message: 'Преподаватель обновлён' });
    });
  };

  if (!password) {
    // пароль не меняем
    return updateWithoutPassword();
  }

  // если пароль есть — хэшируем и обновляем
  bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
    if (err) return next(err);
    const sql = `UPDATE users SET full_name = ?, login = ?, password_hash = ?, role = "teacher" WHERE id = ?`;
    db.run(sql, [full_name, login, hash, id], (err2) => {
      if (err2) return next(err2);
      res.json({ message: 'Преподаватель обновлён' });
    });
  });
};

// Удаление преподавателя
exports.deleteTeacher = (req, res, next) => {
  const { id } = req.params;

  User.delete(id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Преподаватель удалён' });
  });
};

// Привязка преподавателя к аудитории
exports.assignTeacherToRoom = (req, res, next) => {
  const roomId = req.params.id;
  const { teacher_id } = req.body;

  RoomTeacher.assign(roomId, teacher_id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Преподаватель добавлен в аудиторию' });
  });
};

// Удаление преподавателя из аудитории
exports.removeTeacherFromRoom = (req, res, next) => {
  const { roomId, teacherId } = req.params;

  RoomTeacher.unassign(roomId, teacherId, (err) => {
    if (err) return next(err);
    res.json({ message: 'Преподаватель удалён из аудитории' });
  });
};
