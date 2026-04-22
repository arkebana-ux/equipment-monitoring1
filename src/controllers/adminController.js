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

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

async function addHistory({ complaintId, actorUserId, actionType, fieldName = null, oldValue = null, newValue = null, comment = null }) {
  await dbRun(
    `INSERT INTO complaint_history (complaint_id, actor_user_id, action_type, field_name, old_value, new_value, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [complaintId, actorUserId, actionType, fieldName, oldValue, newValue, comment]
  );
}

async function buildAnalytics(teachers, admins, complaints, rooms) {
  const equipmentRows = await dbAll(`
    SELECT e.id, e.status, e.name, r.id AS room_id, r.name AS room_name
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

  const equipmentBreakdowns = await dbAll(`
    SELECT e.name AS label, COUNT(c.id) AS value
    FROM equipment e
    LEFT JOIN complaints c ON c.equipment_id = e.id
    GROUP BY e.id, e.name
    HAVING COUNT(c.id) > 0
    ORDER BY value DESC, e.name ASC
    LIMIT 6
  `);

  const repairedComplaints = complaints.filter((item) => item.status === 'исправлено');
  const avgRepairHours = repairedComplaints.length
    ? Math.round(repairedComplaints.reduce((sum, item) => {
        const created = new Date(String(item.created_at || '').replace(' ', 'T') + 'Z');
        const updated = new Date(String(item.updated_at || '').replace(' ', 'T') + 'Z');
        if (Number.isNaN(created.getTime()) || Number.isNaN(updated.getTime())) return sum;
        return sum + ((updated.getTime() - created.getTime()) / 36e5);
      }, 0) / repairedComplaints.length)
    : 0;

  const complaintStatusMap = new Map();
  complaints.forEach((complaint) => {
    complaintStatusMap.set(complaint.status, (complaintStatusMap.get(complaint.status) || 0) + 1);
  });

  const equipmentStatusMap = new Map();
  equipmentRows.forEach((equipment) => {
    const status = equipment.status || 'без статуса';
    equipmentStatusMap.set(status, (equipmentStatusMap.get(status) || 0) + 1);
  });

  const roomReliability = roomAnalyticsRows.map((row) => {
    const equipmentCount = Number(row.equipment_count || 0);
    const totalComplaints = Number(row.total_complaints || 0);
    const score = Math.max(0, 100 - totalComplaints * 12 - Math.max(0, Number(row.active_complaints || 0)) * 10 + equipmentCount * 3);
    return {
      roomId: row.id,
      roomName: row.name,
      score: Math.min(100, score),
      totalComplaints,
      activeComplaints: Number(row.active_complaints || 0),
      equipmentCount
    };
  }).sort((a, b) => b.score - a.score);

  return {
    summary: {
      totalRooms: rooms.length,
      totalEquipment: equipmentRows.length,
      totalTeachers: teachers.length,
      totalAdmins: admins.length,
      totalComplaints: complaints.length,
      archivedComplaints: repairedComplaints.length,
      avgRepairHours
    },
    complaintStatuses: Array.from(complaintStatusMap.entries()).map(([label, value]) => ({ label, value })),
    equipmentStatuses: Array.from(equipmentStatusMap.entries()).map(([label, value]) => ({ label, value })),
    topBrokenEquipment: equipmentBreakdowns.map((row) => ({ label: row.label, value: Number(row.value || 0) })),
    roomLoad: roomAnalyticsRows.map((row) => ({
      roomId: row.id,
      roomName: row.name,
      equipmentCount: Number(row.equipment_count || 0),
      totalComplaints: Number(row.total_complaints || 0),
      archivedComplaints: Number(row.archived_complaints || 0),
      activeComplaints: Number(row.active_complaints || 0)
    })),
    roomReliability
  };
}

function updateUserRecord({ id, full_name, login, password, role, is_super_admin, email }, successMessage, next, res) {
  const commit = async (passwordHash) => {
    try {
      if (passwordHash) {
        await dbRun(
          `UPDATE users SET full_name = ?, login = ?, email = ?, password_hash = ?, role = ?, is_super_admin = ? WHERE id = ?`,
          [full_name, login, email || null, passwordHash, role, is_super_admin, id]
        );
      } else {
        await dbRun(
          `UPDATE users SET full_name = ?, login = ?, email = ?, role = ?, is_super_admin = ? WHERE id = ?`,
          [full_name, login, email || null, role, is_super_admin, id]
        );
      }
      res.json({ message: successMessage });
    } catch (err) {
      if (err.message && /unique|constraint|UNIQUE/i.test(err.message)) {
        return res.status(409).json({ message: 'Логин уже занят' });
      }
      next(err);
    }
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
            .then(async (analytics) => {
              const roomInsights = await dbAll(`
                SELECT
                  r.id,
                  r.name,
                  COUNT(DISTINCT rt.user_id) AS teacher_count,
                  COUNT(DISTINCT e.id) AS equipment_count,
                  COUNT(DISTINCT c.id) AS total_complaints,
                  COUNT(DISTINCT CASE WHEN c.status != 'РёСЃРїСЂР°РІР»РµРЅРѕ' THEN c.id END) AS active_complaints,
                  COUNT(DISTINCT CASE WHEN c.status = 'РёСЃРїСЂР°РІР»РµРЅРѕ' THEN c.id END) AS archived_complaints,
                  MAX(COALESCE(c.updated_at, c.created_at)) AS last_activity_at
                FROM rooms r
                LEFT JOIN room_teachers rt ON rt.room_id = r.id
                LEFT JOIN equipment e ON e.room_id = r.id
                LEFT JOIN complaints c ON c.equipment_id = e.id
                GROUP BY r.id, r.name
                ORDER BY r.name ASC
              `);
              res.json({
                complaints,
                rooms,
                roomInsights,
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

exports.updateRoom = (req, res, next) => {
  const { name } = req.body;
  Room.findById(req.params.id, (findErr, room) => {
    if (findErr) return next(findErr);
    if (!room) return res.status(404).json({ message: 'Аудитория не найдена' });
    Room.update(req.params.id, name, (updateErr) => {
      if (updateErr) return next(updateErr);
      res.json({ message: 'Название аудитории обновлено' });
    });
  });
};

exports.deleteRoom = (req, res, next) => {
  Room.deleteCascade(req.params.id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Аудитория и связанные данные удалены' });
  });
};

exports.getRoomData = (req, res, next) => {
  const roomId = req.params.id;
  Room.findById(roomId, (roomErr, room) => {
    if (roomErr) return next(roomErr);
    if (!room) return res.status(404).json({ message: 'Аудитория не найдена' });
    Equipment.findByRoom(roomId, (err, equipment) => {
      if (err) return next(err);
      RoomTeacher.findTeachersByRoom(roomId, (roomTeacherErr, roomTeachers) => {
        if (roomTeacherErr) return next(roomTeacherErr);
        User.findAllTeachers((teacherErr, allTeachers) => {
          if (teacherErr) return next(teacherErr);
          Promise.all([
            dbAll(`
              SELECT
                c.id,
                c.status,
                c.description,
                c.created_at,
                c.updated_at,
                u.full_name,
                e.name AS equipment_name
              FROM complaints c
              LEFT JOIN users u ON u.id = c.user_id
              LEFT JOIN equipment e ON e.id = c.equipment_id
              WHERE e.room_id = ?
              ORDER BY COALESCE(c.updated_at, c.created_at) DESC
              LIMIT 8
            `, [roomId]),
            dbGet(`
              SELECT
                COUNT(DISTINCT e.id) AS equipment_count,
                COUNT(DISTINCT CASE WHEN e.status = 'РІ СЂР°Р±РѕС‚Рµ' THEN e.id END) AS healthy_equipment_count,
                COUNT(DISTINCT CASE WHEN e.status = 'РЅР° СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРё' THEN e.id END) AS review_equipment_count,
                COUNT(DISTINCT CASE WHEN e.status = 'РІ СЂРµРјРѕРЅС‚Рµ' THEN e.id END) AS repair_equipment_count,
                COUNT(DISTINCT c.id) AS total_complaints,
                COUNT(DISTINCT CASE WHEN c.status != 'РёСЃРїСЂР°РІР»РµРЅРѕ' THEN c.id END) AS active_complaints,
                COUNT(DISTINCT CASE WHEN c.status = 'РёСЃРїСЂР°РІР»РµРЅРѕ' THEN c.id END) AS archived_complaints,
                MAX(COALESCE(c.updated_at, c.created_at)) AS last_activity_at
              FROM rooms r
              LEFT JOIN equipment e ON e.room_id = r.id
              LEFT JOIN complaints c ON c.equipment_id = e.id
              WHERE r.id = ?
            `, [roomId])
          ])
            .then(([recentComplaints, roomSummary]) => {
              res.json({ room, equipment, roomTeachers, allTeachers, recentComplaints, roomSummary });
            })
            .catch(next);
        });
      });
    });
  });
};

exports.getComplaintDetails = async (req, res, next) => {
  try {
    const complaintId = req.params.id;
    const complaint = await dbGet(`
      SELECT c.*, u.full_name, u.login, e.name AS equipment_name, e.serial_number, r.name AS room_name,
             a.full_name AS assigned_admin_name
      FROM complaints c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN equipment e ON e.id = c.equipment_id
      LEFT JOIN rooms r ON r.id = e.room_id
      LEFT JOIN users a ON a.id = c.assigned_admin_id
      WHERE c.id = ?
    `, [complaintId]);

    if (!complaint) {
      return res.status(404).json({ message: 'Жалоба не найдена' });
    }

    const attachments = complaint.attachment_path ? [`/uploads/${complaint.attachment_path}`] : [];
    const admins = await dbAll(`SELECT id, full_name, login FROM users WHERE role = 'admin' ORDER BY is_super_admin DESC, full_name ASC`);
    const comments = await dbAll(`
      SELECT cc.*, u.full_name, u.login
      FROM complaint_comments cc
      JOIN users u ON u.id = cc.user_id
      WHERE cc.complaint_id = ?
      ORDER BY cc.created_at DESC
    `, [complaintId]);
    const history = await dbAll(`
      SELECT ch.*, u.full_name, u.login
      FROM complaint_history ch
      LEFT JOIN users u ON u.id = ch.actor_user_id
      WHERE ch.complaint_id = ?
      ORDER BY ch.created_at DESC, ch.id DESC
    `, [complaintId]);

    res.json({ complaint, attachments, admins, comments, history });
  } catch (err) {
    next(err);
  }
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
  if (!mapped) return res.status(400).json({ message: 'Параметр status или is_active обязателен' });
  Equipment.setStatus(id, mapped, (err) => {
    if (err) return next(err);
    res.json({ message: 'Статус оборудования обновлён' });
  });
};

exports.updateEquipment = (req, res, next) => {
  Equipment.update(req.params.id, req.body, (err) => {
    if (err) return next(err);
    res.json({ message: 'Оборудование обновлено' });
  });
};

exports.deleteEquipment = (req, res, next) => {
  Equipment.delete(req.params.id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Оборудование удалено' });
  });
};

exports.changeComplaintStatus = async (req, res, next) => {
  try {
    const complaint = await dbGet(`SELECT * FROM complaints WHERE id = ?`, [req.params.id]);
    if (!complaint) return res.status(404).json({ message: 'Жалоба не найдена' });

    const { status } = req.body;
    await dbRun(`UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, req.params.id]);

    const statusMessages = {
      'на рассмотрении': 'По вашему обращению была проведена первичная проверка. Оборудование находится на рассмотрении.',
      'в ремонте': 'По вашему обращению оборудование передано в ремонт.',
      'исправлено': 'Оборудование исправлено, и им снова можно пользоваться.'
    };

    Notification.create(
      {
        user_id: complaint.user_id,
        complaint_id: req.params.id,
        title: 'Статус обращения обновлен',
        message: statusMessages[status] || `Статус изменён на: ${status}`,
        type: status === 'исправлено' ? 'success' : (status === 'в ремонте' ? 'warning' : 'info')
      },
      () => {}
    );

    await addHistory({
      complaintId: req.params.id,
      actorUserId: req.session.user.id,
      actionType: 'status_changed',
      fieldName: 'status',
      oldValue: complaint.status,
      newValue: status
    });

    const equipmentStatus = status === 'исправлено' ? 'в работе' : status;
    await dbRun(`UPDATE equipment SET status = ? WHERE id = ?`, [equipmentStatus, complaint.equipment_id]);

    res.json({ message: 'Статус жалобы обновлён' });
  } catch (err) {
    next(err);
  }
};

exports.assignComplaintAdmin = async (req, res, next) => {
  try {
    const { admin_id } = req.body;
    const complaint = await dbGet(`SELECT * FROM complaints WHERE id = ?`, [req.params.id]);
    if (!complaint) return res.status(404).json({ message: 'Жалоба не найдена' });

    await dbRun(`UPDATE complaints SET assigned_admin_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [admin_id || null, req.params.id]);
    await addHistory({
      complaintId: req.params.id,
      actorUserId: req.session.user.id,
      actionType: 'assignee_changed',
      fieldName: 'assigned_admin_id',
      oldValue: complaint.assigned_admin_id ? String(complaint.assigned_admin_id) : null,
      newValue: admin_id ? String(admin_id) : null
    });

    res.json({ message: 'Ответственный администратор обновлён' });
  } catch (err) {
    next(err);
  }
};

exports.addComplaintComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Комментарий не может быть пустым' });
    }

    const complaint = await dbGet(`SELECT * FROM complaints WHERE id = ?`, [req.params.id]);
    if (!complaint) return res.status(404).json({ message: 'Жалоба не найдена' });

    await dbRun(
      `INSERT INTO complaint_comments (complaint_id, user_id, comment) VALUES (?, ?, ?)`,
      [req.params.id, req.session.user.id, comment.trim()]
    );
    await addHistory({
      complaintId: req.params.id,
      actorUserId: req.session.user.id,
      actionType: 'comment_added',
      comment: comment.trim()
    });

    res.json({ message: 'Комментарий добавлен' });
  } catch (err) {
    next(err);
  }
};

exports.listTeachers = (req, res, next) => {
  User.findAllTeachers((err, users) => {
    if (err) return next(err);
    res.json(users);
  });
};

exports.updateTeacher = (req, res, next) => {
  const { id } = req.params;
  const { full_name, login, password, email } = req.body;
  if (!full_name || !login) return res.status(400).json({ message: 'Не заполнены ФИО или логин' });
  updateUserRecord({ id, full_name, login, password, email, role: 'teacher', is_super_admin: 0 }, 'Преподаватель обновлён', next, res);
};

exports.deleteTeacher = (req, res, next) => {
  User.delete(req.params.id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Преподаватель удалён' });
  });
};

exports.updateAdmin = (req, res, next) => {
  const { id } = req.params;
  const { full_name, login, password, email } = req.body;
  if (!full_name || !login) return res.status(400).json({ message: 'Не заполнены ФИО или логин' });
  User.findById(id, (err, user) => {
    if (err) return next(err);
    if (!user || user.role !== 'admin') return res.status(404).json({ message: 'Администратор не найден' });
    if (user.is_super_admin) return res.status(403).json({ message: 'Главного администратора нельзя редактировать через этот раздел' });
    updateUserRecord({ id, full_name, login, password, email, role: 'admin', is_super_admin: 0 }, 'Администратор обновлён', next, res);
  });
};

exports.deleteAdmin = (req, res, next) => {
  User.findById(req.params.id, (err, user) => {
    if (err) return next(err);
    if (!user || user.role !== 'admin') return res.status(404).json({ message: 'Администратор не найден' });
    if (user.is_super_admin) return res.status(403).json({ message: 'Главного администратора нельзя удалить' });
    if (Number(req.params.id) === Number(req.session.user.id)) return res.status(400).json({ message: 'Нельзя удалить самого себя' });
    User.delete(req.params.id, (deleteErr) => {
      if (deleteErr) return next(deleteErr);
      res.json({ message: 'Администратор удалён' });
    });
  });
};

exports.deleteArchivedComplaint = async (req, res, next) => {
  try {
    const complaint = await dbGet(`SELECT * FROM complaints WHERE id = ?`, [req.params.id]);
    if (!complaint) return res.status(404).json({ message: 'Заявка не найдена' });
    if (complaint.status !== 'исправлено') return res.status(400).json({ message: 'Удалять можно только записи из архива' });
    await dbRun(`DELETE FROM complaints WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Запись из архива удалена' });
  } catch (err) {
    next(err);
  }
};

exports.exportArchiveCsv = async (req, res, next) => {
  try {
    const rows = await dbAll(`
      SELECT c.id, r.name AS room_name, e.name AS equipment_name, u.full_name AS teacher_name, c.status, c.created_at, c.updated_at, c.description
      FROM complaints c
      LEFT JOIN equipment e ON e.id = c.equipment_id
      LEFT JOIN rooms r ON r.id = e.room_id
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.status = 'исправлено'
      ORDER BY c.updated_at DESC
    `);
    const header = ['ID', 'Аудитория', 'Оборудование', 'Преподаватель', 'Статус', 'Создано', 'Закрыто', 'Описание'];
    const lines = [header.join(';')].concat(rows.map((row) => [
      row.id,
      row.room_name || '',
      row.equipment_name || '',
      row.teacher_name || '',
      row.status || '',
      row.created_at || '',
      row.updated_at || '',
      String(row.description || '').replaceAll(';', ',')
    ].join(';')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="archive-export.csv"');
    res.send('\uFEFF' + lines.join('\n'));
  } catch (err) {
    next(err);
  }
};

exports.exportAnalyticsCsv = async (req, res, next) => {
  try {
    const rows = await dbAll(`
      SELECT
        r.name AS room_name,
        COUNT(DISTINCT e.id) AS equipment_count,
        COUNT(DISTINCT c.id) AS total_complaints,
        COUNT(DISTINCT CASE WHEN c.status = 'исправлено' THEN c.id END) AS fixed_complaints,
        COUNT(DISTINCT CASE WHEN c.status != 'исправлено' THEN c.id END) AS active_complaints
      FROM rooms r
      LEFT JOIN equipment e ON e.room_id = r.id
      LEFT JOIN complaints c ON c.equipment_id = e.id
      GROUP BY r.id, r.name
      ORDER BY active_complaints DESC, total_complaints DESC
    `);
    const header = ['Аудитория', 'Оборудование', 'Всего заявок', 'Исправлено', 'Активные'];
    const lines = [header.join(';')].concat(rows.map((row) => [
      row.room_name || '',
      row.equipment_count || 0,
      row.total_complaints || 0,
      row.fixed_complaints || 0,
      row.active_complaints || 0
    ].join(';')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics-export.csv"');
    res.send('\uFEFF' + lines.join('\n'));
  } catch (err) {
    next(err);
  }
};

exports.exportAnalyticsPrint = async (req, res, next) => {
  try {
    const rooms = await dbAll(`
      SELECT
        r.name AS room_name,
        COUNT(DISTINCT e.id) AS equipment_count,
        COUNT(DISTINCT c.id) AS total_complaints,
        COUNT(DISTINCT CASE WHEN c.status = 'исправлено' THEN c.id END) AS fixed_complaints,
        COUNT(DISTINCT CASE WHEN c.status != 'исправлено' THEN c.id END) AS active_complaints
      FROM rooms r
      LEFT JOIN equipment e ON e.room_id = r.id
      LEFT JOIN complaints c ON c.equipment_id = e.id
      GROUP BY r.id, r.name
      ORDER BY active_complaints DESC, total_complaints DESC
    `);
    const html = `<!DOCTYPE html>
    <html lang="ru"><head><meta charset="UTF-8"><title>Analytics Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
      h1 { margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; margin-top: 18px; }
      th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
      th { background: #eff6ff; }
    </style></head><body>
    <h1>Отчет по аналитике</h1>
    <p>Сформировано: ${new Date().toLocaleString('ru-RU')}</p>
    <table><thead><tr><th>Аудитория</th><th>Оборудование</th><th>Всего заявок</th><th>Исправлено</th><th>Активные</th></tr></thead>
    <tbody>${rooms.map((row) => `<tr><td>${row.room_name}</td><td>${row.equipment_count}</td><td>${row.total_complaints}</td><td>${row.fixed_complaints}</td><td>${row.active_complaints}</td></tr>`).join('')}</tbody>
    </table>
    <script>window.onload = () => window.print();</script>
    </body></html>`;
    res.send(html);
  } catch (err) {
    next(err);
  }
};

exports.assignTeacherToRoom = (req, res, next) => {
  const teacherIds = Array.isArray(req.body.teacher_id) ? req.body.teacher_id : [req.body.teacher_id];
  if (!teacherIds.length) {
    return res.status(400).json({ message: 'Нужно выбрать хотя бы одного преподавателя' });
  }

  let completed = 0;
  let finished = false;
  const roomId = req.params.id;
  teacherIds.forEach((teacherId) => {
    RoomTeacher.assign(roomId, teacherId, (err) => {
      if (finished) return;
      if (err) {
        finished = true;
        return next(err);
      }
      completed += 1;
      if (completed === teacherIds.length) {
        finished = true;
        res.json({ message: 'Преподаватели добавлены в аудиторию' });
      }
    });
  });
};

exports.removeTeacherFromRoom = (req, res, next) => {
  RoomTeacher.unassign(req.params.roomId, req.params.teacherId, (err) => {
    if (err) return next(err);
    res.json({ message: 'Преподаватель удалён из аудитории' });
  });
};
