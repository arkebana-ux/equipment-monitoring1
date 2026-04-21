const Room = require('../models/Room');
const Equipment = require('../models/Equipment');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
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

        User.findAllAdmins((err4, admins) => {
          if (err4) return next(err4);
          res.json({ complaints, rooms, teachers, admins, currentUser: req.session.user });
        });
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
  const id = req.params.id;
  Room.deleteCascade(id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Аудитория и связанные данные удалены' });
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

// Подробности конкретной жалобы (для страницы администратора)
exports.getComplaintDetails = (req, res, next) => {
  const id = req.params.id;
  Complaint.findById(id, (err, complaint) => {
    if (err) return next(err);
    if (!complaint) return res.status(404).json({ message: 'Жалоба не найдена' });

    // сформируем пути к вложениям, если есть
    const attachments = [];
    if (complaint.attachment_path) attachments.push(`/uploads/${complaint.attachment_path}`);

    res.json({ complaint, attachments });
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
  const { is_active, status } = req.body;

  // Если пришёл статус — используем его
  if (status) {
    return Equipment.setStatus(id, status, (err) => {
      if (err) return next(err);
      res.json({ message: 'Статус оборудования обновлён' });
    });
  }

  // Старый формат: is_active булев — маппим в статус
  const mapped = (is_active === undefined) ? null : (is_active ? 'в работе' : 'в ремонте');
  if (mapped) {
    Equipment.setStatus(id, mapped, (err) => {
      if (err) return next(err);
      res.json({ message: 'Статус оборудования обновлён' });
    });
  } else {
    res.status(400).json({ message: 'Параметр status или is_active обязателен' });
  }
};

// Редактирование оборудования
exports.updateEquipment = (req, res, next) => {
  const { id } = req.params;
  Equipment.update(id, req.body, (err) => {
    if (err) return next(err);
    res.json({ message: 'Оборудование обновлено' });
  });
};

// Удаление оборудования
exports.deleteEquipment = (req, res, next) => {
  const { id } = req.params;
  Equipment.delete(id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Оборудование удалено' });
  });
};

// Изменение статуса жалобы
exports.changeComplaintStatus = (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  // Получаем жалобу, чтобы узнать equipment_id и user_id
  Complaint.findById(id, (err, complaint) => {
    if (err) return next(err);
    if (!complaint) return res.status(404).json({ message: 'Жалоба не найдена' });

    Complaint.setStatus(id, status, (err2) => {
      if (err2) return next(err2);

      // Создаём уведомление для преподавателя
      const statusMessages = {
        'на рассмотрении': 'Ваша заявка находится на рассмотрении',
        'в ремонте': 'Оборудование в ремонте',
        'исправлено': 'Оборудование успешно отремонтировано!'
      };
      
      const title = 'Изменение статуса заявки';
      const message = statusMessages[status] || `Статус изменён на: ${status}`;
      
      Notification.create({
        user_id: complaint.user_id,
        complaint_id: id,
        title: title,
        message: message,
        type: status === 'исправлено' ? 'success' : (status === 'в ремонте' ? 'info' : 'warning')
      }, (notifErr) => {
        if (notifErr) console.error('Error creating notification:', notifErr);
      });

      // Если отметили как исправлено — помечаем оборудование как активное
      const eqId = complaint.equipment_id;
      if (status === 'исправлено') {
        Equipment.setStatus(eqId, 'в работе', (err3) => {
          if (err3) return next(err3);
          res.json({ message: 'Статус жалобы обновлён и оборудование помечено как исправленное' });
        });
      } else if (status === 'в ремонте') {
        Equipment.setStatus(eqId, 'в ремонте', (err3) => {
          if (err3) return next(err3);
          res.json({ message: 'Статус жалобы обновлён и оборудование помечено как в ремонте' });
        });
      } else if (status === 'на рассмотрении') {
        Equipment.setStatus(eqId, 'на рассмотрении', (err3) => {
          if (err3) return next(err3);
          res.json({ message: 'Статус жалобы обновлён и оборудование помечено как на рассмотрении' });
        });
      } else {
        res.json({ message: 'Статус жалобы обновлён' });
      }
    });
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
