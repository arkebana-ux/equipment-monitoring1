const bcrypt = require('bcrypt');

const Room = require('../models/Room');
const Equipment = require('../models/Equipment');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Notification = require('../models/Notification');
const RoomTeacher = require('../models/RoomTeacher');
const { db } = require('../config/db');

const SALT_ROUNDS = 10;

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function buildAnalytics(teachers, admins, complaints, rooms) {
  const equipmentRows = await dbAll(`
    SELECT
      e.id,
      e.status,
      r.id AS room_id,
      r.name AS room_name
    FROM equipment e
    JOIN rooms r ON r.id = e.room_id
  `);

  const roomAnalyticsRows = await dbAll(`
    SELECT
      r.id,
      r.name,
      COUNT(DISTINCT e.id) AS equipment_count,
      COUNT(DISTINCT CASE WHEN c.id IS NOT NULL THEN c.id END) AS total_complaints,
      COUNT(DISTINCT CASE WHEN c.status = 'исправлено' THEN c.id END) AS archived_complaints,
      COUNT(DISTINCT CASE WHEN c.status != 'исправлено' THEN c.id END) AS active_complaints
    FROM rooms r
    LEFT JOIN equipment e ON e.room_id = r.id
    LEFT JOIN complaints c ON c.equipment_id = e.id
    GROUP BY r.id, r.name
    ORDER BY active_complaints DESC, total_complaints DESC, r.name ASC
  `);

  const complaintStatusMap = new Map();
  complaints.forEach((complaint) => {
    complaintStatusMap.set(
      complaint.status,
      (complaintStatusMap.get(complaint.status) || 0) + 1
    );
  });

  const equipmentStatusMap = new Map();
  equipmentRows.forEach((equipment) => {
    const status = equipment.status || 'без статуса';
    equipmentStatusMap.set(status, (equipmentStatusMap.get(status) || 0) + 1);
  });

  return {
    summary: {
      totalRooms: rooms.length,
      totalEquipment: equipmentRows.length,
      totalTeachers: teachers.length,
      totalAdmins: admins.length,
      totalComplaints: complaints.length,
      archivedComplaints: complaints.filter((item) => item.status === 'исправлено').length
    },
    complaintStatuses: Array.from(complaintStatusMap.entries()).map(([label, value]) => ({ label, value })),
    equipmentStatuses: Array.from(equipmentStatusMap.entries()).map(([label, value]) => ({ label, value })),
    roomLoad: roomAnalyticsRows.map((row) => ({
      roomId: row.id,
      roomName: row.name,
      equipmentCount: Number(row.equipment_count || 0),
      totalComplaints: Number(row.total_complaints || 0),
      archivedComplaints: Number(row.archived_complaints || 0),
      activeComplaints: Number(row.active_complaints || 0)
    }))
  };
}

function updateUserRecord({ id, full_name, login, password, role, is_super_admin }, successMessage, next, res) {
  const commit = (passwordHash) => {
    const sql = passwordHash
      ? `UPDATE users SET full_name = ?, login = ?, password_hash = ?, role = ?, is_super_admin = ? WHERE id = ?`
      : `UPDATE users SET full_name = ?, login = ?, role = ?, is_super_admin = ? WHERE id = ?`;

    const params = passwordHash
      ? [full_name, login, passwordHash, role, is_super_admin, id]
      : [full_name, login, role, is_super_admin, id];

    db.run(sql, params, (err) => {
      if (err) {
        if (err.message && /unique|constraint|UNIQUE/i.test(err.message)) {
          return res.status(409).json({ message: 'Логин уже занят' });
        }
        return next(err);
      }
      res.json({ message: successMessage });
    });
  };

  if (!password) {
    return commit(null);
  }

  bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
    if (err) return next(err);
    commit(hash);
  });
}

exports.getDashboardData = (req, res, next) => {
  Complaint.all((err, complaints) => {
    if (err) return next(err);

    Room.all((roomErr, rooms) => {
      if (roomErr) return next(roomErr);

      User.findAllTeachers((teacherErr, teachers) => {
        if (teacherErr) return next(teacherErr);

        User.findAllAdmins((adminErr, admins) => {
          if (adminErr) return next(adminErr);
          buildAnalytics(teachers, admins, complaints, rooms)
            .then((analytics) => {
              res.json({
                complaints,
                rooms,
                teachers,
                admins,
                analytics,
                currentUser: req.session.user
              });
            })
            .catch(next);
        });
      });
    });
  });
};

exports.createRoom = (req, res, next) => {
  const { name } = req.body;
  Room.create(name, (err, id) => {
    if (err) return next(err);
    res.json({ id, name });
  });
};

exports.deleteRoom = (req, res, next) => {
  const id = req.params.id;
  Room.deleteCascade(id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Аудитория и связанные данные удалены' });
  });
};

exports.getRoomData = (req, res, next) => {
  const roomId = req.params.id;

  Equipment.findByRoom(roomId, (err, equipment) => {
    if (err) return next(err);

    RoomTeacher.findTeachersByRoom(roomId, (roomTeacherErr, roomTeachers) => {
      if (roomTeacherErr) return next(roomTeacherErr);

      User.findAllTeachers((teacherErr, allTeachers) => {
        if (teacherErr) return next(teacherErr);
        res.json({ equipment, roomTeachers, allTeachers });
      });
    });
  });
};

exports.getComplaintDetails = (req, res, next) => {
  const id = req.params.id;
  Complaint.findById(id, (err, complaint) => {
    if (err) return next(err);
    if (!complaint) return res.status(404).json({ message: 'Жалоба не найдена' });

    const attachments = [];
    if (complaint.attachment_path) {
      attachments.push(`/uploads/${complaint.attachment_path}`);
    }

    res.json({ complaint, attachments });
  });
};

exports.addEquipmentToRoom = (req, res, next) => {
  const room_id = req.params.id;
  const { name, serial_number, purchase_date } = req.body;

  Equipment.create({ room_id, name, serial_number, purchase_date }, (err, id) => {
    if (err) return next(err);
    res.json({ id });
  });
};

exports.setEquipmentActive = (req, res, next) => {
  const { id } = req.params;
  const { is_active, status } = req.body;

  if (status) {
    return Equipment.setStatus(id, status, (err) => {
      if (err) return next(err);
      res.json({ message: 'Статус оборудования обновлён' });
    });
  }

  const mapped = is_active === undefined ? null : (is_active ? 'в работе' : 'в ремонте');
  if (!mapped) {
    return res.status(400).json({ message: 'Параметр status или is_active обязателен' });
  }

  Equipment.setStatus(id, mapped, (err) => {
    if (err) return next(err);
    res.json({ message: 'Статус оборудования обновлён' });
  });
};

exports.updateEquipment = (req, res, next) => {
  const { id } = req.params;
  Equipment.update(id, req.body, (err) => {
    if (err) return next(err);
    res.json({ message: 'Оборудование обновлено' });
  });
};

exports.deleteEquipment = (req, res, next) => {
  const { id } = req.params;
  Equipment.delete(id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Оборудование удалено' });
  });
};

exports.changeComplaintStatus = (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  Complaint.findById(id, (err, complaint) => {
    if (err) return next(err);
    if (!complaint) return res.status(404).json({ message: 'Жалоба не найдена' });

    Complaint.setStatus(id, status, (statusErr) => {
      if (statusErr) return next(statusErr);

      const statusMessages = {
        'на рассмотрении': 'Ваша заявка находится на рассмотрении',
        'в ремонте': 'Оборудование в ремонте',
        исправлено: 'Оборудование успешно отремонтировано!'
      };

      Notification.create(
        {
          user_id: complaint.user_id,
          complaint_id: id,
          title: 'Изменение статуса заявки',
          message: statusMessages[status] || `Статус изменён на: ${status}`,
          type: status === 'исправлено' ? 'success' : (status === 'в ремонте' ? 'info' : 'warning')
        },
        (notifErr) => {
          if (notifErr) console.error('Error creating notification:', notifErr);
        }
      );

      const eqId = complaint.equipment_id;
      if (status === 'исправлено') {
        return Equipment.setStatus(eqId, 'в работе', (equipmentErr) => {
          if (equipmentErr) return next(equipmentErr);
          res.json({ message: 'Статус жалобы обновлён и оборудование помечено как исправленное' });
        });
      }

      if (status === 'в ремонте') {
        return Equipment.setStatus(eqId, 'в ремонте', (equipmentErr) => {
          if (equipmentErr) return next(equipmentErr);
          res.json({ message: 'Статус жалобы обновлён и оборудование помечено как в ремонте' });
        });
      }

      if (status === 'на рассмотрении') {
        return Equipment.setStatus(eqId, 'на рассмотрении', (equipmentErr) => {
          if (equipmentErr) return next(equipmentErr);
          res.json({ message: 'Статус жалобы обновлён и оборудование помечено как на рассмотрении' });
        });
      }

      res.json({ message: 'Статус жалобы обновлён' });
    });
  });
};

exports.listTeachers = (req, res, next) => {
  User.findAllTeachers((err, users) => {
    if (err) return next(err);
    res.json(users);
  });
};

exports.updateTeacher = (req, res, next) => {
  const { id } = req.params;
  const { full_name, login, password } = req.body;

  if (!full_name || !login) {
    return res.status(400).json({ message: 'Не заполнены ФИО или логин' });
  }

  updateUserRecord(
    { id, full_name, login, password, role: 'teacher', is_super_admin: 0 },
    'Преподаватель обновлён',
    next,
    res
  );
};

exports.deleteTeacher = (req, res, next) => {
  const { id } = req.params;

  User.delete(id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Преподаватель удалён' });
  });
};

exports.updateAdmin = (req, res, next) => {
  const { id } = req.params;
  const { full_name, login, password } = req.body;

  if (!full_name || !login) {
    return res.status(400).json({ message: 'Не заполнены ФИО или логин' });
  }

  User.findById(id, (err, user) => {
    if (err) return next(err);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ message: 'Администратор не найден' });
    }
    if (user.is_super_admin) {
      return res.status(403).json({ message: 'Главного администратора нельзя редактировать через этот раздел' });
    }

    updateUserRecord(
      { id, full_name, login, password, role: 'admin', is_super_admin: 0 },
      'Администратор обновлён',
      next,
      res
    );
  });
};

exports.deleteAdmin = (req, res, next) => {
  const { id } = req.params;

  User.findById(id, (err, user) => {
    if (err) return next(err);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ message: 'Администратор не найден' });
    }
    if (user.is_super_admin) {
      return res.status(403).json({ message: 'Главного администратора нельзя удалить' });
    }
    if (Number(id) === Number(req.session.user.id)) {
      return res.status(400).json({ message: 'Нельзя удалить самого себя' });
    }

    User.delete(id, (deleteErr) => {
      if (deleteErr) return next(deleteErr);
      res.json({ message: 'Администратор удалён' });
    });
  });
};

exports.deleteArchivedComplaint = (req, res, next) => {
  const { id } = req.params;

  Complaint.findById(id, (err, complaint) => {
    if (err) return next(err);
    if (!complaint) {
      return res.status(404).json({ message: 'Заявка не найдена' });
    }
    if (complaint.status !== 'исправлено') {
      return res.status(400).json({ message: 'Удалять можно только записи из архива' });
    }

    Complaint.delete(id, (deleteErr) => {
      if (deleteErr) return next(deleteErr);
      res.json({ message: 'Запись из архива удалена' });
    });
  });
};

exports.assignTeacherToRoom = (req, res, next) => {
  const roomId = req.params.id;
  const { teacher_id } = req.body;

  RoomTeacher.assign(roomId, teacher_id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Преподаватель добавлен в аудиторию' });
  });
};

exports.removeTeacherFromRoom = (req, res, next) => {
  const { roomId, teacherId } = req.params;

  RoomTeacher.unassign(roomId, teacherId, (err) => {
    if (err) return next(err);
    res.json({ message: 'Преподаватель удалён из аудитории' });
  });
};
