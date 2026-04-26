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
                  COUNT(DISTINCT CASE WHEN c.status != 'исправлено' THEN c.id END) AS active_complaints,
                  COUNT(DISTINCT CASE WHEN c.status = 'исправлено' THEN c.id END) AS archived_complaints,
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
                COUNT(DISTINCT CASE WHEN e.status = 'в работе' THEN e.id END) AS healthy_equipment_count,
                COUNT(DISTINCT CASE WHEN e.status = 'на рассмотрении' THEN e.id END) AS review_equipment_count,
                COUNT(DISTINCT CASE WHEN e.status = 'в ремонте' THEN e.id END) AS repair_equipment_count,
                COUNT(DISTINCT c.id) AS total_complaints,
                COUNT(DISTINCT CASE WHEN c.status != 'исправлено' THEN c.id END) AS active_complaints,
                COUNT(DISTINCT CASE WHEN c.status = 'исправлено' THEN c.id END) AS archived_complaints,
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
      return res.status(404).json({ message: 'Заявка не найдена' });
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
    if (!complaint) return res.status(404).json({ message: 'Заявка не найдена' });

    const { status } = req.body;
    await dbRun(`UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, req.params.id]);

    const statusMessages = {
      'на рассмотрении': 'По вашему обращению проведена первичная проверка. Оборудование находится на рассмотрении.',
      'в ремонте': 'По вашему обращению оборудование передано в ремонт.',
      'исправлено': 'Оборудование исправлено и снова доступно для работы.'
    };

    Notification.create(
      {
        user_id: complaint.user_id,
        complaint_id: req.params.id,
        title: 'Статус обращения обновлён',
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

    res.json({ message: 'Статус заявки обновлён' });
  } catch (err) {
    next(err);
  }
};

exports.assignComplaintAdmin = async (req, res, next) => {
  try {
    const { admin_id } = req.body;
    const complaint = await dbGet(`SELECT * FROM complaints WHERE id = ?`, [req.params.id]);
    if (!complaint) return res.status(404).json({ message: 'Заявка не найдена' });

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
    if (!complaint) return res.status(404).json({ message: 'Заявка не найдена' });

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
    const activeRooms = rooms.filter((row) => Number(row.active_complaints || 0) > 0).length;
    const totalEquipment = rooms.reduce((sum, row) => sum + Number(row.equipment_count || 0), 0);
    const totalComplaints = rooms.reduce((sum, row) => sum + Number(row.total_complaints || 0), 0);
    const totalFixed = rooms.reduce((sum, row) => sum + Number(row.fixed_complaints || 0), 0);
    const roomCards = rooms.map((row) => {
      const active = Number(row.active_complaints || 0);
      const badgeClass = active === 0 ? 'ok' : (active >= 2 ? 'danger' : 'warning');
      const badgeText = active === 0 ? 'Заявок нет' : (active >= 2 ? 'Требует внимания' : 'Есть обращения');
      return `
        <article class="room-card">
          <div class="room-card-top">
            <h3>Аудитория ${row.room_name}</h3>
            <span class="room-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="room-metrics">
            <div><strong>${row.equipment_count}</strong><span>единиц техники</span></div>
            <div><strong>${row.active_complaints}</strong><span>активных</span></div>
            <div><strong>${row.fixed_complaints}</strong><span>исправлено</span></div>
          </div>
        </article>
      `;
    }).join('');
    const html = `<!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Аналитика по аудиториям</title>
      <style>
        :root{--bg:#f4f8ff;--panel:rgba(255,255,255,.96);--line:#d7e5fb;--text:#10223d;--muted:#64748b}
        *{box-sizing:border-box}
        body{margin:0;padding:32px;font-family:'Segoe UI',Arial,sans-serif;color:var(--text);background:radial-gradient(circle at top right, rgba(191,219,254,.8), transparent 24%),linear-gradient(180deg,#f8fbff 0%,var(--bg) 100%)}
        .hero,.panel{background:var(--panel);border:1px solid var(--line);border-radius:28px;box-shadow:0 18px 45px rgba(37,99,235,.08)}
        .hero{padding:28px 30px;margin-bottom:24px}
        .panel{padding:24px}
        .eyebrow{display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(37,99,235,.1);color:#3b82f6;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
        h1{margin:16px 0 10px;font-size:34px;line-height:1.05}
        .subtitle,.panel p,.print-note{color:var(--muted)}
        .stats{margin:24px 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
        .stat{background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(232,241,255,.92));border:1px solid var(--line);border-radius:24px;padding:20px}
        .stat-label{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
        .stat-value{margin-top:20px;font-size:44px;font-weight:800}
        .stat-hint{margin-top:10px;line-height:1.5}
        .layout{display:grid;grid-template-columns:1.4fr .9fr;gap:20px}
        .rooms{display:grid;gap:14px}
        .room-card{border:1px solid var(--line);border-radius:22px;padding:18px;background:linear-gradient(180deg,#fff,#f8fbff)}
        .room-card-top{display:flex;justify-content:space-between;gap:12px;align-items:center}
        .room-card-top h3{margin:0;font-size:22px}
        .room-badge{display:inline-flex;padding:8px 12px;border-radius:999px;font-size:12px;font-weight:700}
        .room-badge.ok{background:#dcfce7;color:#166534}
        .room-badge.warning{background:#fef3c7;color:#92400e}
        .room-badge.danger{background:#fee2e2;color:#991b1b}
        .room-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
        .room-metrics div{border:1px solid var(--line);border-radius:18px;padding:14px;background:#fff}
        .room-metrics strong{display:block;font-size:28px;margin-bottom:6px}
        table{width:100%;border-collapse:collapse}
        th,td{padding:12px 0;border-bottom:1px solid var(--line);text-align:left}
        th{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted)}
        @media print{body{padding:12px;background:#fff}.hero,.panel,.stat,.room-card{box-shadow:none}}
      </style>
    </head>
    <body>
      <section class="hero">
        <span class="eyebrow">Аналитика</span>
        <h1>Состояние оборудования по аудиториям</h1>
        <p class="subtitle">Отчёт оформлен в том же стиле, что и вкладка аналитики: быстрые показатели, проблемные зоны и обзор по кабинетам на одной странице.</p>
      </section>
      <section class="stats">
        <article class="stat"><div class="stat-label">Аудиторий</div><div class="stat-value">${rooms.length}</div><div class="stat-hint">Все кабинеты, попавшие в отчёт.</div></article>
        <article class="stat"><div class="stat-label">Единиц техники</div><div class="stat-value">${totalEquipment}</div><div class="stat-hint">Компьютеры, мультимедиа и периферия.</div></article>
        <article class="stat"><div class="stat-label">Зоны риска</div><div class="stat-value">${activeRooms}</div><div class="stat-hint">Аудитории с активными обращениями.</div></article>
        <article class="stat"><div class="stat-label">Исправлено</div><div class="stat-value">${totalFixed}</div><div class="stat-hint">Закрытые обращения по истории эксплуатации.</div></article>
      </section>
      <section class="layout">
        <article class="panel">
          <h2>Карта аудиторий</h2>
          <p>Приоритет сверху у кабинетов, где есть активные обращения.</p>
          <div class="rooms">${roomCards}</div>
        </article>
        <article class="panel">
          <h2>Сводная таблица</h2>
          <p>Компактный перечень для экспорта и печати.</p>
          <table>
            <thead><tr><th>Аудитория</th><th>Техника</th><th>Активные</th><th>Исправлено</th></tr></thead>
            <tbody>${rooms.map((row) => `<tr><td>${row.room_name}</td><td>${row.equipment_count}</td><td>${row.active_complaints}</td><td>${row.fixed_complaints}</td></tr>`).join('')}</tbody>
          </table>
          <div class="print-note">Сформировано: ${new Date().toLocaleString('ru-RU')} • Всего обращений в истории: ${totalComplaints}</div>
        </article>
      </section>
      <script>window.onload = () => window.print();</script>
    </body>
    </html>`;
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
