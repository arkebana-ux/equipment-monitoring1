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

async function ensureUser({ login, password, fullName, role }) {
  const existing = await get('SELECT id FROM users WHERE login = ?', [login]);
  if (existing) return existing.id;
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await run(
    'INSERT INTO users (login, password_hash, full_name, role, is_super_admin) VALUES (?, ?, ?, ?, 0)',
    [login, hash, fullName, role]
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
  await run(
    'INSERT OR IGNORE INTO room_teachers (room_id, user_id) VALUES (?, ?)',
    [roomId, userId]
  );
}

async function ensureComplaint({ userId, equipmentId, description, status, createdAt, updatedAt }) {
  const existing = await get(
    'SELECT id FROM complaints WHERE equipment_id = ? AND description = ?',
    [equipmentId, description]
  );
  if (existing) return existing.id;
  const result = await run(
    `INSERT INTO complaints (user_id, equipment_id, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, equipmentId, description, status, createdAt, updatedAt]
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

async function main() {
  initDb();

  const teachers = [
    { login: 'teacher_ivanova', password: 'Teacher_2026', fullName: 'Иванова Мария Сергеевна' },
    { login: 'teacher_petrov', password: 'Teacher_2026', fullName: 'Петров Алексей Игоревич' },
    { login: 'teacher_smirnova', password: 'Teacher_2026', fullName: 'Смирнова Ольга Викторовна' },
    { login: 'teacher_karimov', password: 'Teacher_2026', fullName: 'Каримов Руслан Айдарович' }
  ];

  const teacherIds = {};
  for (const teacher of teachers) {
    teacherIds[teacher.login] = await ensureUser({ ...teacher, role: 'teacher' });
  }

  await ensureUser({
    login: 'assistant_admin',
    password: 'Admin_2026',
    fullName: 'Орлов Денис Павлович',
    role: 'admin'
  });

  const roomIds = {
    '101': await ensureRoom('101'),
    '207': await ensureRoom('207'),
    '305': await ensureRoom('305'),
    '412': await ensureRoom('412')
  };

  await ensureAssignment(roomIds['101'], teacherIds.teacher_ivanova);
  await ensureAssignment(roomIds['207'], teacherIds.teacher_petrov);
  await ensureAssignment(roomIds['305'], teacherIds.teacher_smirnova);
  await ensureAssignment(roomIds['412'], teacherIds.teacher_karimov);
  await ensureAssignment(roomIds['207'], teacherIds.teacher_ivanova);

  const equipment = {
    projector207: await ensureEquipment({ roomId: roomIds['207'], name: 'Проектор Epson EB-X06', serial: 'EP-207-001', purchaseDate: '2024-08-20', status: 'на рассмотрении' }),
    pc207: await ensureEquipment({ roomId: roomIds['207'], name: 'Компьютер преподавателя Lenovo', serial: 'PC-207-014', purchaseDate: '2023-03-12', status: 'в ремонте' }),
    board101: await ensureEquipment({ roomId: roomIds['101'], name: 'Интерактивная панель Prestigio', serial: 'BR-101-002', purchaseDate: '2025-01-10', status: 'в работе' }),
    printer305: await ensureEquipment({ roomId: roomIds['305'], name: 'Принтер HP LaserJet', serial: 'PR-305-778', purchaseDate: '2022-11-05', status: 'исправлено' }),
    audio412: await ensureEquipment({ roomId: roomIds['412'], name: 'Акустическая система Yamaha', serial: 'AU-412-091', purchaseDate: '2024-02-17', status: 'в работе' }),
    router101: await ensureEquipment({ roomId: roomIds['101'], name: 'Маршрутизатор MikroTik', serial: 'RT-101-510', purchaseDate: '2023-09-01', status: 'в работе' })
  };

  const adminRows = await new Promise((resolve, reject) => {
    db.all('SELECT id FROM users WHERE role = ?', ['admin'], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

  const complaints = {
    c1: await ensureComplaint({
      userId: teacherIds.teacher_petrov,
      equipmentId: equipment.projector207,
      description: 'Демо: проектор в 207 аудитории включается, но не выводит изображение на экран.',
      status: 'на рассмотрении',
      createdAt: '2026-04-18 08:15:00',
      updatedAt: '2026-04-18 08:15:00'
    }),
    c2: await ensureComplaint({
      userId: teacherIds.teacher_petrov,
      equipmentId: equipment.pc207,
      description: 'Демо: компьютер преподавателя в 207 аудитории самопроизвольно перезагружается во время занятий.',
      status: 'в ремонте',
      createdAt: '2026-04-17 10:40:00',
      updatedAt: '2026-04-19 12:10:00'
    }),
    c3: await ensureComplaint({
      userId: teacherIds.teacher_smirnova,
      equipmentId: equipment.printer305,
      description: 'Демо: принтер в 305 аудитории зажевывает бумагу и печатает с полосами.',
      status: 'исправлено',
      createdAt: '2026-04-12 09:00:00',
      updatedAt: '2026-04-15 17:45:00'
    }),
    c4: await ensureComplaint({
      userId: teacherIds.teacher_ivanova,
      equipmentId: equipment.board101,
      description: 'Демо: интерактивная панель в 101 аудитории не реагирует на касание в правой части экрана.',
      status: 'на рассмотрении',
      createdAt: '2026-04-20 11:05:00',
      updatedAt: '2026-04-20 11:05:00'
    }),
    c5: await ensureComplaint({
      userId: teacherIds.teacher_karimov,
      equipmentId: equipment.audio412,
      description: 'Демо: акустическая система в 412 аудитории периодически фонит на высокой громкости.',
      status: 'исправлено',
      createdAt: '2026-04-10 13:30:00',
      updatedAt: '2026-04-14 16:20:00'
    })
  };

  for (const admin of adminRows) {
    await ensureNotification({
      userId: admin.id,
      complaintId: complaints.c1,
      title: 'Новая заявка о поломке',
      message: 'Демо: по проектору в аудитории 207 поступила новая заявка.',
      type: 'warning',
      createdAt: '2026-04-18 08:20:00'
    });
    await ensureNotification({
      userId: admin.id,
      complaintId: complaints.c4,
      title: 'Новая заявка о поломке',
      message: 'Демо: по панели в аудитории 101 поступила новая заявка.',
      type: 'warning',
      createdAt: '2026-04-20 11:10:00'
    });
  }

  await ensureNotification({
    userId: teacherIds.teacher_petrov,
    complaintId: complaints.c1,
    title: 'Статус обращения обновлен',
    message: 'По вашему обращению по проектору из аудитории 207 начата проверка оборудования. Заявка находится на рассмотрении.',
    type: 'info',
    isRead: 0,
    createdAt: '2026-04-18 08:40:00'
  });
  await ensureNotification({
    userId: teacherIds.teacher_petrov,
    complaintId: complaints.c2,
    title: 'Статус обращения обновлен',
    message: 'По вашему обращению компьютер из аудитории 207 передан в ремонт. Как только работа будет завершена, вы получите уведомление.',
    type: 'warning',
    isRead: 0,
    createdAt: '2026-04-19 12:20:00'
  });
  await ensureNotification({
    userId: teacherIds.teacher_smirnova,
    complaintId: complaints.c3,
    title: 'Оборудование исправлено',
    message: 'По вашему обращению принтер из аудитории 305 отремонтирован. Оборудованием снова можно пользоваться.',
    type: 'success',
    isRead: 0,
    createdAt: '2026-04-15 17:50:00'
  });

  console.log('Demo data prepared successfully.');
  db.close();
}

main().catch((err) => {
  console.error(err);
  db.close();
  process.exit(1);
});
