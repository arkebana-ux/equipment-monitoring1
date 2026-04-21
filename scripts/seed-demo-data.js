const bcrypt = require('bcrypt');
const { db, initDb } = require('../src/config/db');

const SALT_ROUNDS = 10;

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function ensureUser({ login, password, fullName, role, email, isSuperAdmin = 0 }) {
  const existing = await get('SELECT id FROM users WHERE login = ?', [login]);
  if (existing) {
    await run('UPDATE users SET email = COALESCE(?, email), full_name = COALESCE(?, full_name) WHERE id = ?', [email || null, fullName || null, existing.id]);
    return existing.id;
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await run(
    'INSERT INTO users (login, password_hash, full_name, role, is_super_admin, email) VALUES (?, ?, ?, ?, ?, ?)',
    [login, hash, fullName, role, isSuperAdmin, email || null]
  );
  return result.lastID;
}

async function ensureRoom(name) {
  const existing = await get('SELECT id FROM rooms WHERE name = ?', [name]);
  if (existing) return existing.id;
  const result = await run('INSERT INTO rooms (name) VALUES (?)', [name]);
  return result.lastID;
}

async function ensureEquipment({ roomId, name, serial, purchaseDate, status }) {
  const existing = await get(
    'SELECT id FROM equipment WHERE room_id = ? AND name = ? AND serial_number = ?',
    [roomId, name, serial]
  );
  if (existing) return existing.id;
  const result = await run(
    'INSERT INTO equipment (room_id, name, serial_number, purchase_date, status, is_active) VALUES (?, ?, ?, ?, ?, 1)',
    [roomId, name, serial, purchaseDate, status]
  );
  return result.lastID;
}

async function ensureAssignment(roomId, userId) {
  await run('INSERT OR IGNORE INTO room_teachers (room_id, user_id) VALUES (?, ?)', [roomId, userId]);
}

async function ensureComplaint({ userId, equipmentId, description, status, createdAt, updatedAt, assignedAdminId = null }) {
  const existing = await get(
    'SELECT id FROM complaints WHERE equipment_id = ? AND description = ?',
    [equipmentId, description]
  );
  if (existing) return existing.id;
  const result = await run(
    `INSERT INTO complaints (user_id, equipment_id, description, status, created_at, updated_at, assigned_admin_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, equipmentId, description, status, createdAt, updatedAt, assignedAdminId]
  );
  return result.lastID;
}

async function ensureNotification({ userId, complaintId, title, message, type, isRead = 0, createdAt }) {
  const existing = await get(
    'SELECT id FROM notifications WHERE user_id = ? AND complaint_id = ? AND title = ?',
    [userId, complaintId, title]
  );
  if (existing) return existing.id;
  const result = await run(
    `INSERT INTO notifications (user_id, complaint_id, title, message, type, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, complaintId, title, message, type, isRead, createdAt]
  );
  return result.lastID;
}

async function ensureHistory({ complaintId, actorUserId, actionType, comment, fieldName = null, oldValue = null, newValue = null, createdAt }) {
  const existing = await get(
    'SELECT id FROM complaint_history WHERE complaint_id = ? AND action_type = ? AND created_at = ?',
    [complaintId, actionType, createdAt]
  );
  if (existing) return existing.id;
  const result = await run(
    `INSERT INTO complaint_history (complaint_id, actor_user_id, action_type, field_name, old_value, new_value, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [complaintId, actorUserId, actionType, fieldName, oldValue, newValue, comment, createdAt]
  );
  return result.lastID;
}

async function ensureComment({ complaintId, userId, comment, createdAt }) {
  const existing = await get(
    'SELECT id FROM complaint_comments WHERE complaint_id = ? AND user_id = ? AND comment = ?',
    [complaintId, userId, comment]
  );
  if (existing) return existing.id;
  const result = await run(
    'INSERT INTO complaint_comments (complaint_id, user_id, comment, created_at) VALUES (?, ?, ?, ?)',
    [complaintId, userId, comment, createdAt]
  );
  return result.lastID;
}

async function main() {
  initDb();

  const teachers = [
    { login: 'teacher_ivanova', password: 'Teacher_2026', fullName: 'Иванова Мария Сергеевна', email: 'ivanova@bagasu.local' },
    { login: 'teacher_petrov', password: 'Teacher_2026', fullName: 'Петров Алексей Игоревич', email: 'petrov@bagasu.local' },
    { login: 'teacher_smirnova', password: 'Teacher_2026', fullName: 'Смирнова Ольга Викторовна', email: 'smirnova@bagasu.local' },
    { login: 'teacher_karimov', password: 'Teacher_2026', fullName: 'Каримов Руслан Айдарович', email: 'karimov@bagasu.local' },
    { login: 'teacher_sokolov', password: 'Teacher_2026', fullName: 'Соколов Андрей Павлович', email: 'sokolov@bagasu.local' },
    { login: 'teacher_nikitina', password: 'Teacher_2026', fullName: 'Никитина Елена Артуровна', email: 'nikitina@bagasu.local' },
    { login: 'teacher_habirova', password: 'Teacher_2026', fullName: 'Хабирова Алина Рамилевна', email: 'habirova@bagasu.local' },
    { login: 'teacher_kuznetsov', password: 'Teacher_2026', fullName: 'Кузнецов Даниил Олегович', email: 'kuznetsov@bagasu.local' }
  ];

  const teacherIds = {};
  for (const teacher of teachers) {
    teacherIds[teacher.login] = await ensureUser({ ...teacher, role: 'teacher' });
  }

  const mainAdmin = await ensureUser({
    login: 'Admin',
    password: 'MainAdmin_2026',
    fullName: 'Главный администратор системы',
    role: 'admin',
    email: 'mainadmin@bagasu.local',
    isSuperAdmin: 1
  });

  const assistantAdmin = await ensureUser({
    login: 'assistant_admin',
    password: 'Admin_2026',
    fullName: 'Орлов Денис Павлович',
    role: 'admin',
    email: 'assistant_admin@bagasu.local'
  });

  const archiveAdmin = await ensureUser({
    login: 'archive_admin',
    password: 'Admin_2026',
    fullName: 'Федорова Ирина Викторовна',
    role: 'admin',
    email: 'archive_admin@bagasu.local'
  });

  const roomNames = ['101', '105', '112', '207', '214', '305', '318', '412', '509'];
  const roomIds = {};
  for (const name of roomNames) {
    roomIds[name] = await ensureRoom(name);
  }

  const assignments = [
    ['101', 'teacher_ivanova'],
    ['105', 'teacher_nikitina'],
    ['112', 'teacher_habirova'],
    ['207', 'teacher_petrov'],
    ['214', 'teacher_sokolov'],
    ['305', 'teacher_smirnova'],
    ['318', 'teacher_kuznetsov'],
    ['412', 'teacher_karimov'],
    ['509', 'teacher_ivanova'],
    ['207', 'teacher_sokolov']
  ];
  for (const [roomName, teacherLogin] of assignments) {
    await ensureAssignment(roomIds[roomName], teacherIds[teacherLogin]);
  }

  const equipment = {
    projector101: await ensureEquipment({ roomId: roomIds['101'], name: 'Проектор BenQ MX560', serial: 'PJ-101-008', purchaseDate: '2024-02-11', status: 'в работе' }),
    panel101: await ensureEquipment({ roomId: roomIds['101'], name: 'Интерактивная панель Prestigio', serial: 'PN-101-002', purchaseDate: '2025-01-10', status: 'на рассмотрении' }),
    camera105: await ensureEquipment({ roomId: roomIds['105'], name: 'Камера конференц-связи Logitech', serial: 'CM-105-018', purchaseDate: '2024-10-12', status: 'в работе' }),
    pc112: await ensureEquipment({ roomId: roomIds['112'], name: 'Компьютер преподавателя HP ProDesk', serial: 'PC-112-101', purchaseDate: '2023-04-09', status: 'в ремонте' }),
    projector207: await ensureEquipment({ roomId: roomIds['207'], name: 'Проектор Epson EB-X06', serial: 'EP-207-001', purchaseDate: '2024-08-20', status: 'на рассмотрении' }),
    pc207: await ensureEquipment({ roomId: roomIds['207'], name: 'Компьютер преподавателя Lenovo', serial: 'PC-207-014', purchaseDate: '2023-03-12', status: 'в ремонте' }),
    mic214: await ensureEquipment({ roomId: roomIds['214'], name: 'Микрофонная станция Bosch', serial: 'MC-214-011', purchaseDate: '2022-09-16', status: 'в работе' }),
    printer305: await ensureEquipment({ roomId: roomIds['305'], name: 'Принтер HP LaserJet', serial: 'PR-305-778', purchaseDate: '2022-11-05', status: 'исправлено' }),
    board318: await ensureEquipment({ roomId: roomIds['318'], name: 'Интерактивная доска SMART', serial: 'BD-318-004', purchaseDate: '2021-12-20', status: 'на рассмотрении' }),
    audio412: await ensureEquipment({ roomId: roomIds['412'], name: 'Акустическая система Yamaha', serial: 'AU-412-091', purchaseDate: '2024-02-17', status: 'исправлено' }),
    router509: await ensureEquipment({ roomId: roomIds['509'], name: 'Маршрутизатор MikroTik', serial: 'RT-509-510', purchaseDate: '2023-09-01', status: 'в работе' }),
    display509: await ensureEquipment({ roomId: roomIds['509'], name: 'Панель Samsung Flip', serial: 'FL-509-020', purchaseDate: '2024-06-03', status: 'в работе' })
  };

  const complaints = {
    c1: await ensureComplaint({
      userId: teacherIds.teacher_petrov,
      equipmentId: equipment.projector207,
      description: 'Проектор в аудитории 207 включается, но не выводит изображение на экран.',
      status: 'на рассмотрении',
      createdAt: '2026-04-18 08:15:00',
      updatedAt: '2026-04-18 08:15:00',
      assignedAdminId: assistantAdmin
    }),
    c2: await ensureComplaint({
      userId: teacherIds.teacher_petrov,
      equipmentId: equipment.pc207,
      description: 'Компьютер преподавателя в 207 аудитории самопроизвольно перезагружается во время занятий.',
      status: 'в ремонте',
      createdAt: '2026-04-17 10:40:00',
      updatedAt: '2026-04-19 12:10:00',
      assignedAdminId: mainAdmin
    }),
    c3: await ensureComplaint({
      userId: teacherIds.teacher_smirnova,
      equipmentId: equipment.printer305,
      description: 'Принтер в 305 аудитории зажевывает бумагу и печатает с полосами.',
      status: 'исправлено',
      createdAt: '2026-04-12 09:00:00',
      updatedAt: '2026-04-15 17:45:00',
      assignedAdminId: archiveAdmin
    }),
    c4: await ensureComplaint({
      userId: teacherIds.teacher_ivanova,
      equipmentId: equipment.panel101,
      description: 'Интерактивная панель в 101 аудитории не реагирует на касание в правой части экрана.',
      status: 'на рассмотрении',
      createdAt: '2026-04-20 11:05:00',
      updatedAt: '2026-04-20 11:05:00',
      assignedAdminId: assistantAdmin
    }),
    c5: await ensureComplaint({
      userId: teacherIds.teacher_karimov,
      equipmentId: equipment.audio412,
      description: 'Акустическая система в 412 аудитории периодически фонит на высокой громкости.',
      status: 'исправлено',
      createdAt: '2026-04-10 13:30:00',
      updatedAt: '2026-04-14 16:20:00',
      assignedAdminId: mainAdmin
    }),
    c6: await ensureComplaint({
      userId: teacherIds.teacher_habirova,
      equipmentId: equipment.pc112,
      description: 'Компьютер в аудитории 112 не видит подключенный проектор по HDMI.',
      status: 'в ремонте',
      createdAt: '2026-04-16 09:25:00',
      updatedAt: '2026-04-20 14:10:00',
      assignedAdminId: assistantAdmin
    }),
    c7: await ensureComplaint({
      userId: teacherIds.teacher_sokolov,
      equipmentId: equipment.mic214,
      description: 'На микрофонной станции 214 аудитории один из пультов не передает звук.',
      status: 'на рассмотрении',
      createdAt: '2026-04-19 15:00:00',
      updatedAt: '2026-04-19 15:00:00',
      assignedAdminId: mainAdmin
    }),
    c8: await ensureComplaint({
      userId: teacherIds.teacher_kuznetsov,
      equipmentId: equipment.board318,
      description: 'Интерактивная доска в 318 аудитории калибруется с большим смещением.',
      status: 'на рассмотрении',
      createdAt: '2026-04-21 08:10:00',
      updatedAt: '2026-04-21 08:10:00',
      assignedAdminId: assistantAdmin
    }),
    c9: await ensureComplaint({
      userId: teacherIds.teacher_ivanova,
      equipmentId: equipment.display509,
      description: 'Панель Samsung Flip в 509 аудитории зависает при переключении режимов.',
      status: 'исправлено',
      createdAt: '2026-04-06 12:30:00',
      updatedAt: '2026-04-09 11:45:00',
      assignedAdminId: archiveAdmin
    })
  };

  const adminRows = await all('SELECT id FROM users WHERE role = ?', ['admin']);
  for (const admin of adminRows) {
    await ensureNotification({
      userId: admin.id,
      complaintId: complaints.c1,
      title: 'Новая заявка о поломке',
      message: 'В аудитории 207 зарегистрирована новая заявка по проектору.',
      type: 'warning',
      createdAt: '2026-04-18 08:20:00'
    });
    await ensureNotification({
      userId: admin.id,
      complaintId: complaints.c8,
      title: 'Новая заявка о поломке',
      message: 'В аудитории 318 добавлено новое обращение по интерактивной доске.',
      type: 'warning',
      createdAt: '2026-04-21 08:20:00'
    });
  }

  await ensureNotification({
    userId: teacherIds.teacher_petrov,
    complaintId: complaints.c1,
    title: 'Статус обращения обновлен',
    message: 'По вашему обращению была проведена проверка оборудования. Заявка находится на рассмотрении.',
    type: 'info',
    createdAt: '2026-04-18 08:40:00'
  });
  await ensureNotification({
    userId: teacherIds.teacher_petrov,
    complaintId: complaints.c2,
    title: 'Оборудование передано в ремонт',
    message: 'По вашему обращению оборудование передано в ремонт. После завершения ремонта вы получите обновление.',
    type: 'warning',
    createdAt: '2026-04-19 12:20:00'
  });
  await ensureNotification({
    userId: teacherIds.teacher_smirnova,
    complaintId: complaints.c3,
    title: 'Оборудование исправлено',
    message: 'По вашему обращению была проведена проверка оборудования. Неисправность устранена, оборудованием можно пользоваться.',
    type: 'success',
    createdAt: '2026-04-15 17:50:00'
  });
  await ensureNotification({
    userId: teacherIds.teacher_kuznetsov,
    complaintId: complaints.c8,
    title: 'Обращение принято',
    message: 'Ваше обращение зарегистрировано и передано администратору для первичной проверки оборудования.',
    type: 'info',
    createdAt: '2026-04-21 08:15:00'
  });

  await ensureHistory({
    complaintId: complaints.c1,
    actorUserId: teacherIds.teacher_petrov,
    actionType: 'created',
    comment: 'Создано новое обращение пользователем',
    createdAt: '2026-04-18 08:15:00'
  });
  await ensureHistory({
    complaintId: complaints.c2,
    actorUserId: mainAdmin,
    actionType: 'status_changed',
    fieldName: 'status',
    oldValue: 'на рассмотрении',
    newValue: 'в ремонте',
    comment: 'После осмотра принято решение передать оборудование в ремонт',
    createdAt: '2026-04-19 12:10:00'
  });
  await ensureHistory({
    complaintId: complaints.c3,
    actorUserId: archiveAdmin,
    actionType: 'status_changed',
    fieldName: 'status',
    oldValue: 'в ремонте',
    newValue: 'исправлено',
    comment: 'Печатающий узел обслужен, тестовая печать прошла успешно',
    createdAt: '2026-04-15 17:45:00'
  });
  await ensureHistory({
    complaintId: complaints.c8,
    actorUserId: assistantAdmin,
    actionType: 'assignee_changed',
    fieldName: 'assigned_admin_id',
    oldValue: null,
    newValue: String(assistantAdmin),
    comment: 'Назначен ответственный администратор',
    createdAt: '2026-04-21 08:22:00'
  });

  await ensureComment({
    complaintId: complaints.c2,
    userId: mainAdmin,
    comment: 'Проверили системный блок, нестабильно работает блок питания. Подготовили замену.',
    createdAt: '2026-04-19 12:18:00'
  });
  await ensureComment({
    complaintId: complaints.c1,
    userId: assistantAdmin,
    comment: 'Ожидаем свободное окно в расписании, чтобы проверить соединение проектора с ноутбуком преподавателя.',
    createdAt: '2026-04-18 09:05:00'
  });
  await ensureComment({
    complaintId: complaints.c8,
    userId: assistantAdmin,
    comment: 'Запланировали выезд в аудиторию 318 на первую пару завтрашнего дня.',
    createdAt: '2026-04-21 08:25:00'
  });

  console.log('Demo data prepared successfully.');
  db.close();
}

main().catch((err) => {
  console.error(err);
  db.close();
  process.exit(1);
});
