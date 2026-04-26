const bcrypt = require('bcrypt');
const { db, initDb } = require('../src/config/db');

const SALT_ROUNDS = 10;
const STATUS_WORK = 'в работе';
const STATUS_REVIEW = 'на рассмотрении';
const STATUS_REPAIR = 'в ремонте';
const STATUS_FIXED = 'исправлено';

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
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

async function ensureUser({ login, password, fullName, role, email, isSuperAdmin = 0 }) {
  const existing = await get('SELECT id FROM users WHERE login = ?', [login]);
  const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

  if (existing) {
    await run(
      `UPDATE users
       SET full_name = ?, role = ?, email = ?, is_super_admin = ?${passwordHash ? ', password_hash = ?' : ''}
       WHERE id = ?`,
      passwordHash
        ? [fullName, role, email || null, isSuperAdmin, passwordHash, existing.id]
        : [fullName, role, email || null, isSuperAdmin, existing.id]
    );
    return existing.id;
  }

  const result = await run(
    `INSERT INTO users (login, password_hash, full_name, role, is_super_admin, email)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [login, passwordHash, fullName, role, isSuperAdmin, email || null]
  );
  return result.lastID;
}

async function createRoom(name) {
  const result = await run('INSERT INTO rooms (name) VALUES (?)', [name]);
  return result.lastID;
}

async function createEquipment({ roomId, name, serial, purchaseDate, status = STATUS_WORK }) {
  const result = await run(
    `INSERT INTO equipment (room_id, name, serial_number, purchase_date, status, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [roomId, name, serial, purchaseDate, status, status === STATUS_WORK ? 1 : 0]
  );
  return result.lastID;
}

async function assignTeacher(roomId, userId) {
  await run('INSERT INTO room_teachers (room_id, user_id) VALUES (?, ?)', [roomId, userId]);
}

async function createComplaint({ userId, equipmentId, description, status, createdAt, updatedAt, assignedAdminId = null }) {
  const result = await run(
    `INSERT INTO complaints (user_id, equipment_id, description, status, created_at, updated_at, assigned_admin_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, equipmentId, description, status, createdAt, updatedAt, assignedAdminId]
  );
  return result.lastID;
}

async function createNotification({ userId, complaintId, title, message, type, isRead = 0, createdAt }) {
  await run(
    `INSERT INTO notifications (user_id, complaint_id, title, message, type, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, complaintId, title, message, type, isRead, createdAt]
  );
}

async function createHistory({ complaintId, actorUserId, actionType, comment = null, fieldName = null, oldValue = null, newValue = null, createdAt }) {
  await run(
    `INSERT INTO complaint_history (complaint_id, actor_user_id, action_type, field_name, old_value, new_value, comment, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [complaintId, actorUserId, actionType, fieldName, oldValue, newValue, comment, createdAt]
  );
}

async function createComment({ complaintId, userId, comment, createdAt }) {
  await run(
    `INSERT INTO complaint_comments (complaint_id, user_id, comment, created_at)
     VALUES (?, ?, ?, ?)`,
    [complaintId, userId, comment, createdAt]
  );
}

function buildSerial(roomName, prefix, index) {
  return `${prefix}-${roomName}-${String(index).padStart(3, '0')}`;
}

function monthsAgo(months) {
  const date = new Date(Date.UTC(2026, 3, 15));
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

function makeWorkstations(count, label = 'Рабочая станция') {
  return Array.from({ length: count }, (_, index) => ({
    name: `${label} ${index + 1}`,
    prefix: 'WS',
    purchaseDate: monthsAgo(18),
    status: STATUS_WORK
  }));
}

async function main() {
  initDb();

  const admins = [
    { login: 'Admin', password: null, fullName: 'Главный администратор системы', role: 'admin', email: 'mainadmin@bagasu.local', isSuperAdmin: 1 },
    { login: 'assistant_admin', password: 'Admin_2026', fullName: 'Орлов Денис Павлович', role: 'admin', email: 'assistant_admin@bagasu.local' },
    { login: 'archive_admin', password: 'Admin_2026', fullName: 'Федорова Ирина Викторовна', role: 'admin', email: 'archive_admin@bagasu.local' },
    { login: 'admin', password: null, fullName: 'Соколов Андрей Олегович', role: 'admin', email: 'admin_ops@bagasu.local' },
    { login: 'admin_network', password: 'Admin_2026', fullName: 'Крылов Тимур Маратович', role: 'admin', email: 'network_admin@bagasu.local' }
  ];

  const teachers = [
    { login: 'teacher_ivanova', password: 'Teacher_2026', fullName: 'Иванова Мария Сергеевна', email: 'ivanova@bagasu.local' },
    { login: 'teacher_petrov', password: 'Teacher_2026', fullName: 'Петров Алексей Игоревич', email: 'petrov@bagasu.local' },
    { login: 'teacher_smirnova', password: 'Teacher_2026', fullName: 'Смирнова Ольга Викторовна', email: 'smirnova@bagasu.local' },
    { login: 'teacher_karimov', password: 'Teacher_2026', fullName: 'Каримов Руслан Айдарович', email: 'karimov@bagasu.local' },
    { login: 'teacher_sokolov', password: 'Teacher_2026', fullName: 'Соколов Андрей Павлович', email: 'sokolov@bagasu.local' },
    { login: 'teacher_nikitina', password: 'Teacher_2026', fullName: 'Никитина Елена Артуровна', email: 'nikitina@bagasu.local' },
    { login: 'teacher_habirova', password: 'Teacher_2026', fullName: 'Хабирова Алина Рамилевна', email: 'habirova@bagasu.local' },
    { login: 'teacher_kuznetsov', password: 'Teacher_2026', fullName: 'Кузнецов Даниил Олегович', email: 'kuznetsov@bagasu.local' },
    { login: 'teacher_shutova', password: 'Teacher_2026', fullName: 'Шутова Оксана Анатольевна', email: 'shutova@bagasu.local' },
    { login: 'teacher_morozov', password: 'Teacher_2026', fullName: 'Морозов Евгений Владимирович', email: 'morozov@bagasu.local' },
    { login: 'teacher_galimova', password: 'Teacher_2026', fullName: 'Галимова Лилия Ринатовна', email: 'galimova@bagasu.local' },
    { login: 'teacher_ermakov', password: 'Teacher_2026', fullName: 'Ермаков Кирилл Олегович', email: 'ermakov@bagasu.local' },
    { login: 'teacher_borisova', password: 'Teacher_2026', fullName: 'Борисова Наталья Викторовна', email: 'borisova@bagasu.local' },
    { login: 'teacher_latypov', password: 'Teacher_2026', fullName: 'Латыпов Айдар Фанисович', email: 'latypov@bagasu.local' },
    { login: 'teacher_romanova', password: 'Teacher_2026', fullName: 'Романова Светлана Геннадьевна', email: 'romanova@bagasu.local' },
    { login: 'teacher_fedorov', password: 'Teacher_2026', fullName: 'Федоров Илья Сергеевич', email: 'fedorov@bagasu.local' },
    { login: 'teacher_isaeva', password: 'Teacher_2026', fullName: 'Исаева Кристина Андреевна', email: 'isaeva@bagasu.local' }
  ];

  const roomDefinitions = [
    { name: '101', teachers: ['teacher_ivanova', 'teacher_romanova'] },
    { name: '102', teachers: ['teacher_romanova', 'teacher_petrov'] },
    { name: '105', teachers: ['teacher_nikitina', 'teacher_smirnova'] },
    { name: '112', teachers: ['teacher_habirova', 'teacher_borisova'] },
    { name: '114', teachers: ['teacher_borisova', 'teacher_shutova'] },
    { name: '201', teachers: ['teacher_galimova', 'teacher_isaeva'] },
    { name: '202', teachers: ['teacher_fedorov', 'teacher_latypov'] },
    { name: '207', teachers: ['teacher_petrov', 'teacher_sokolov', 'teacher_ermakov'] },
    { name: '214', teachers: ['teacher_sokolov', 'teacher_morozov'] },
    { name: '218', teachers: ['teacher_isaeva', 'teacher_galimova'] },
    { name: '304', teachers: ['teacher_shutova', 'teacher_nikitina'] },
    { name: '305', teachers: ['teacher_smirnova', 'teacher_borisova'] },
    { name: '312', teachers: ['teacher_latypov', 'teacher_fedorov'] },
    { name: '318', teachers: ['teacher_kuznetsov', 'teacher_karimov'] },
    { name: '402', teachers: ['teacher_karimov', 'teacher_morozov'] },
    { name: '404', teachers: ['teacher_ermakov', 'teacher_petrov', 'teacher_sokolov'] },
    { name: '412', teachers: ['teacher_karimov', 'teacher_morozov', 'teacher_isaeva'] },
    { name: '418', teachers: ['teacher_galimova', 'teacher_ivanova'] },
    { name: '509', teachers: ['teacher_ivanova', 'teacher_fedorov'] }
  ];

  const equipmentTemplates = {
    '101': [
      ...makeWorkstations(8, 'Моноблок учебный'),
      { name: 'Проектор BenQ MX560', prefix: 'PJ', purchaseDate: monthsAgo(14), status: STATUS_WORK },
      { name: 'Интерактивная панель Prestigio', prefix: 'PN', purchaseDate: monthsAgo(10), status: STATUS_WORK },
      { name: 'Ноутбук преподавателя ASUS ExpertBook', prefix: 'NB', purchaseDate: monthsAgo(11), status: STATUS_WORK }
    ],
    '102': [
      ...makeWorkstations(6, 'Тонкий клиент'),
      { name: 'Экран с электроприводом Lumien', prefix: 'SC', purchaseDate: monthsAgo(20), status: STATUS_WORK },
      { name: 'Проектор ViewSonic PA503', prefix: 'PJ', purchaseDate: monthsAgo(16), status: STATUS_WORK },
      { name: 'МФУ Canon i-SENSYS', prefix: 'PR', purchaseDate: monthsAgo(28), status: STATUS_WORK }
    ],
    '105': [
      { name: 'Камера конференц-связи Logitech Rally', prefix: 'CM', purchaseDate: monthsAgo(12), status: STATUS_WORK },
      { name: 'Акустическая колонка JBL 1', prefix: 'AU', purchaseDate: monthsAgo(24), status: STATUS_WORK },
      { name: 'Акустическая колонка JBL 2', prefix: 'AU', purchaseDate: monthsAgo(24), status: STATUS_WORK },
      { name: 'Ноутбук преподавателя HP ProBook', prefix: 'NB', purchaseDate: monthsAgo(14), status: STATUS_WORK },
      { name: 'Плазменная панель LG 86"', prefix: 'PN', purchaseDate: monthsAgo(9), status: STATUS_WORK }
    ],
    '112': [
      ...makeWorkstations(10, 'Рабочее место студента'),
      { name: 'Компьютер преподавателя HP ProDesk', prefix: 'PC', purchaseDate: monthsAgo(26), status: STATUS_REPAIR },
      { name: 'Проектор Acer X1328', prefix: 'PJ', purchaseDate: monthsAgo(22), status: STATUS_WORK },
      { name: 'Док-станция преподавателя', prefix: 'DK', purchaseDate: monthsAgo(12), status: STATUS_WORK }
    ],
    '114': [
      ...makeWorkstations(8, 'Учебный ПК'),
      { name: 'Документ-камера Elmo', prefix: 'DV', purchaseDate: monthsAgo(18), status: STATUS_WORK },
      { name: 'МФУ Canon i-SENSYS', prefix: 'PR', purchaseDate: monthsAgo(29), status: STATUS_WORK },
      { name: 'Проектор Epson EB-X06', prefix: 'PJ', purchaseDate: monthsAgo(15), status: STATUS_WORK }
    ],
    '201': [
      ...makeWorkstations(12, 'Рабочая станция'),
      { name: 'Интерактивная панель Newline', prefix: 'PN', purchaseDate: monthsAgo(11), status: STATUS_WORK },
      { name: 'Акустическая система Edifier', prefix: 'AU', purchaseDate: monthsAgo(17), status: STATUS_WORK },
      { name: 'Ноутбук преподавателя Lenovo V15', prefix: 'NB', purchaseDate: monthsAgo(13), status: STATUS_WORK }
    ],
    '202': [
      ...makeWorkstations(10, 'Рабочая станция'),
      { name: 'Проектор NEC ME301X', prefix: 'PJ', purchaseDate: monthsAgo(20), status: STATUS_WORK },
      { name: 'Компьютер преподавателя Dell OptiPlex', prefix: 'PC', purchaseDate: monthsAgo(30), status: STATUS_WORK },
      { name: 'Коммутатор D-Link 24 порта', prefix: 'NW', purchaseDate: monthsAgo(18), status: STATUS_WORK }
    ],
    '207': [
      ...makeWorkstations(14, 'Компьютерное место'),
      { name: 'Проектор Epson EB-X06', prefix: 'PJ', purchaseDate: monthsAgo(9), status: STATUS_REVIEW },
      { name: 'Компьютер преподавателя Lenovo ThinkCentre', prefix: 'PC', purchaseDate: monthsAgo(26), status: STATUS_WORK },
      { name: 'Документ-камера AverVision', prefix: 'DV', purchaseDate: monthsAgo(14), status: STATUS_WORK }
    ],
    '214': [
      ...makeWorkstations(6, 'Учебная станция'),
      { name: 'Микрофонная станция Bosch', prefix: 'MC', purchaseDate: monthsAgo(31), status: STATUS_REVIEW },
      { name: 'Микшерный пульт Yamaha MG10XU', prefix: 'MX', purchaseDate: monthsAgo(26), status: STATUS_WORK },
      { name: 'Акустическая система Yamaha', prefix: 'AU', purchaseDate: monthsAgo(19), status: STATUS_WORK }
    ],
    '218': [
      ...makeWorkstations(8, 'Моноблок Acer Veriton'),
      { name: 'Панель Samsung Flip', prefix: 'FL', purchaseDate: monthsAgo(8), status: STATUS_WORK },
      { name: 'Маршрутизатор MikroTik', prefix: 'RT', purchaseDate: monthsAgo(21), status: STATUS_WORK }
    ],
    '304': [
      ...makeWorkstations(9, 'Рабочая станция'),
      { name: 'МФУ Kyocera ECOSYS', prefix: 'PR', purchaseDate: monthsAgo(32), status: STATUS_WORK },
      { name: 'Сканер Epson WorkForce', prefix: 'SC', purchaseDate: monthsAgo(28), status: STATUS_WORK }
    ],
    '305': [
      ...makeWorkstations(9, 'Рабочая станция'),
      { name: 'Принтер HP LaserJet', prefix: 'PR', purchaseDate: monthsAgo(31), status: STATUS_WORK },
      { name: 'Системный блок Dell OptiPlex', prefix: 'PC', purchaseDate: monthsAgo(36), status: STATUS_WORK }
    ],
    '312': [
      ...makeWorkstations(10, 'Компьютерное место'),
      { name: 'Проектор ViewSonic PA503', prefix: 'PJ', purchaseDate: monthsAgo(18), status: STATUS_WORK },
      { name: 'Ноутбук преподавателя Lenovo V15', prefix: 'NB', purchaseDate: monthsAgo(10), status: STATUS_WORK }
    ],
    '318': [
      ...makeWorkstations(12, 'Рабочая станция'),
      { name: 'Интерактивная доска SMART', prefix: 'BD', purchaseDate: monthsAgo(35), status: STATUS_WORK },
      { name: 'Проектор NEC M332XS', prefix: 'PJ', purchaseDate: monthsAgo(20), status: STATUS_WORK }
    ],
    '402': [
      ...makeWorkstations(16, 'Компьютерное место'),
      { name: 'Интерактивная панель Newline', prefix: 'PN', purchaseDate: monthsAgo(10), status: STATUS_WORK },
      { name: 'Мини-ПК Intel NUC', prefix: 'PC', purchaseDate: monthsAgo(14), status: STATUS_WORK },
      { name: 'Акустическая система Yamaha', prefix: 'AU', purchaseDate: monthsAgo(17), status: STATUS_WORK }
    ],
    '404': [
      ...makeWorkstations(15),
      { name: 'Компьютер преподавателя Lenovo ThinkCentre M70q', prefix: 'PC', purchaseDate: monthsAgo(12), status: STATUS_WORK },
      { name: 'Проектор Epson EB-982W', prefix: 'PJ', purchaseDate: monthsAgo(11), status: STATUS_WORK },
      { name: 'Сетевой коммутатор TP-Link', prefix: 'NW', purchaseDate: monthsAgo(26), status: STATUS_REPAIR }
    ],
    '412': [
      ...makeWorkstations(14, 'Компьютерное место'),
      { name: 'Акустическая система Yamaha', prefix: 'AU', purchaseDate: monthsAgo(17), status: STATUS_WORK },
      { name: 'Радиомикрофон Sennheiser', prefix: 'MC', purchaseDate: monthsAgo(21), status: STATUS_WORK },
      { name: 'Панель Samsung Flip', prefix: 'FL', purchaseDate: monthsAgo(8), status: STATUS_WORK }
    ],
    '418': [
      ...makeWorkstations(10, 'Учебный ПК'),
      { name: 'Проектор Epson CO-FH02', prefix: 'PJ', purchaseDate: monthsAgo(7), status: STATUS_WORK },
      { name: 'Веб-камера Logitech Brio', prefix: 'CM', purchaseDate: monthsAgo(11), status: STATUS_WORK }
    ],
    '509': [
      ...makeWorkstations(12, 'Рабочее место'),
      { name: 'Маршрутизатор MikroTik', prefix: 'RT', purchaseDate: monthsAgo(25), status: STATUS_WORK },
      { name: 'Панель Samsung Flip', prefix: 'FL', purchaseDate: monthsAgo(10), status: STATUS_WORK },
      { name: 'Камера видеозахвата AverMedia', prefix: 'CM', purchaseDate: monthsAgo(9), status: STATUS_WORK }
    ]
  };

  const complaintsData = [
    ['teacher_petrov', '207', 'Проектор Epson EB-X06', 'Проектор в аудитории 207 включается, но не выводит изображение на экран во время пары.', STATUS_REVIEW, '2026-04-22 08:15:00', '2026-04-22 09:05:00', 'assistant_admin'],
    ['teacher_habirova', '112', 'Компьютер преподавателя HP ProDesk', 'Преподавательский компьютер в аудитории 112 не определяет проектор по HDMI.', STATUS_REPAIR, '2026-04-21 09:25:00', '2026-04-22 14:10:00', 'assistant_admin'],
    ['teacher_sokolov', '214', 'Микрофонная станция Bosch', 'Один из пультов микрофонной станции в аудитории 214 не передает звук в общую систему.', STATUS_REVIEW, '2026-04-20 15:00:00', '2026-04-22 10:10:00', 'Admin'],
    ['teacher_ermakov', '404', 'Сетевой коммутатор TP-Link', 'В компьютерном классе 404 периодически пропадает сеть на части рабочих станций.', STATUS_REPAIR, '2026-04-22 09:40:00', '2026-04-22 13:15:00', 'admin_network'],

    ['teacher_romanova', '102', 'Экран с электроприводом Lumien', 'Экран в аудитории 102 перестал опускаться до конца и заедал на середине хода.', STATUS_FIXED, '2026-04-10 15:10:00', '2026-04-12 12:25:00', 'assistant_admin'],
    ['teacher_nikitina', '105', 'Камера конференц-связи Logitech Rally', 'Камера конференц-связи в аудитории 105 не фокусировалась на преподавателе.', STATUS_FIXED, '2026-04-08 14:05:00', '2026-04-11 10:10:00', 'admin'],
    ['teacher_galimova', '201', 'Интерактивная панель Newline', 'Панель в аудитории 201 самопроизвольно перезагружалась во время демонстрации.', STATUS_FIXED, '2026-04-07 10:25:00', '2026-04-09 13:15:00', 'archive_admin'],
    ['teacher_fedorov', '202', 'Проектор NEC ME301X', 'Проектор в аудитории 202 не распознавал сигнал с кафедрального компьютера.', STATUS_FIXED, '2026-04-06 11:00:00', '2026-04-08 16:20:00', 'admin'],
    ['teacher_ivanova', '509', 'Панель Samsung Flip', 'Панель Samsung Flip в аудитории 509 зависала при переключении режимов экрана.', STATUS_FIXED, '2026-04-05 12:30:00', '2026-04-07 11:45:00', 'archive_admin'],
    ['teacher_ermakov', '404', 'Рабочая станция 3', 'На рабочей станции 3 в 404 аудитории не запускалось ПО для практических занятий.', STATUS_FIXED, '2026-04-03 13:20:00', '2026-04-04 11:15:00', 'admin'],
    ['teacher_romanova', '102', 'Проектор ViewSonic PA503', 'Изображение с проектора 102 периодически уходило в синий экран.', STATUS_FIXED, '2026-04-02 09:00:00', '2026-04-03 12:10:00', 'assistant_admin'],
    ['teacher_karimov', '402', 'Интерактивная панель Newline', 'Сенсор панели в аудитории 402 смещался после калибровки.', STATUS_FIXED, '2026-03-28 09:40:00', '2026-03-30 16:00:00', 'admin']
  ];

  const keepLogins = new Set([...admins, ...teachers].map((user) => user.login));

  await run('BEGIN TRANSACTION');
  try {
    await run('DELETE FROM complaint_comments');
    await run('DELETE FROM complaint_history');
    await run('DELETE FROM notifications');
    await run('DELETE FROM complaints');
    await run('DELETE FROM room_teachers');
    await run('DELETE FROM equipment');
    await run('DELETE FROM rooms');
    await run(
      `DELETE FROM users
       WHERE login NOT IN (${Array.from(keepLogins).map(() => '?').join(', ')})`,
      Array.from(keepLogins)
    );

    const userIds = {};
    for (const admin of admins) userIds[admin.login] = await ensureUser(admin);
    for (const teacher of teachers) userIds[teacher.login] = await ensureUser({ ...teacher, role: 'teacher', isSuperAdmin: 0 });

    const roomIds = {};
    for (const room of roomDefinitions) {
      roomIds[room.name] = await createRoom(room.name);
      for (const teacherLogin of room.teachers) {
        await assignTeacher(roomIds[room.name], userIds[teacherLogin]);
      }
    }

    const equipmentIds = {};
    for (const [roomName, items] of Object.entries(equipmentTemplates)) {
      equipmentIds[roomName] = {};
      let index = 1;
      for (const item of items) {
        equipmentIds[roomName][item.name] = await createEquipment({
          roomId: roomIds[roomName],
          name: item.name,
          serial: buildSerial(roomName, item.prefix, index),
          purchaseDate: item.purchaseDate,
          status: item.status
        });
        index += 1;
      }
    }

    const complaintIds = [];
    for (const [teacherLogin, roomName, equipmentName, description, status, createdAt, updatedAt, adminLogin] of complaintsData) {
      const complaintId = await createComplaint({
        userId: userIds[teacherLogin],
        equipmentId: equipmentIds[roomName][equipmentName],
        description,
        status,
        createdAt,
        updatedAt,
        assignedAdminId: userIds[adminLogin]
      });
      complaintIds.push({ id: complaintId, teacherLogin, roomName, equipmentName, description, status, createdAt, updatedAt, adminLogin });
    }

    const activeComplaints = complaintIds.filter((item) => item.status !== STATUS_FIXED);
    const archiveComplaints = complaintIds.filter((item) => item.status === STATUS_FIXED);

    for (const item of activeComplaints) {
      for (const adminLogin of ['Admin', 'assistant_admin', 'admin', 'archive_admin', 'admin_network']) {
        await createNotification({
          userId: userIds[adminLogin],
          complaintId: item.id,
          title: `Новая заявка по аудитории ${item.roomName}`,
          message: `Поступило обращение по оборудованию "${item.equipmentName}" в аудитории ${item.roomName}.`,
          type: item.status === STATUS_REPAIR ? 'warning' : 'info',
          createdAt: item.createdAt
        });
      }

      await createNotification({
        userId: userIds[item.teacherLogin],
        complaintId: item.id,
        title: item.status === STATUS_REPAIR ? 'Оборудование передано в ремонт' : 'Обращение принято в работу',
        message: item.status === STATUS_REPAIR
          ? `По заявке по оборудованию "${item.equipmentName}" начаты ремонтные работы.`
          : `По заявке по оборудованию "${item.equipmentName}" назначен ответственный администратор.`,
        type: item.status === STATUS_REPAIR ? 'warning' : 'info',
        createdAt: item.updatedAt
      });
    }

    for (const item of archiveComplaints) {
      await createNotification({
        userId: userIds[item.teacherLogin],
        complaintId: item.id,
        title: 'Заявка закрыта',
        message: `По оборудованию "${item.equipmentName}" работы завершены, техника снова доступна.`,
        type: 'success',
        createdAt: item.updatedAt
      });
    }

    for (const item of complaintIds) {
      await createHistory({
        complaintId: item.id,
        actorUserId: userIds[item.teacherLogin],
        actionType: 'created',
        comment: 'Создано новое обращение пользователем',
        createdAt: item.createdAt
      });
      await createHistory({
        complaintId: item.id,
        actorUserId: userIds[item.adminLogin],
        actionType: 'assignee_changed',
        fieldName: 'assigned_admin_id',
        oldValue: null,
        newValue: String(userIds[item.adminLogin]),
        comment: 'Назначен ответственный администратор',
        createdAt: item.updatedAt
      });
      if (item.status === STATUS_REPAIR) {
        await createHistory({
          complaintId: item.id,
          actorUserId: userIds[item.adminLogin],
          actionType: 'status_changed',
          fieldName: 'status',
          oldValue: STATUS_REVIEW,
          newValue: STATUS_REPAIR,
          comment: 'После диагностики подтверждена необходимость ремонта',
          createdAt: item.updatedAt
        });
      }
      if (item.status === STATUS_FIXED) {
        await createHistory({
          complaintId: item.id,
          actorUserId: userIds[item.adminLogin],
          actionType: 'status_changed',
          fieldName: 'status',
          oldValue: STATUS_REPAIR,
          newValue: STATUS_FIXED,
          comment: 'Работы завершены, оборудование возвращено в эксплуатацию',
          createdAt: item.updatedAt
        });
      }
    }

    const comments = [
      { index: 0, login: 'assistant_admin', text: 'Проверили кабельную трассу и входы проектора. Требуется замена HDMI-приемника.', at: '2026-04-22 08:45:00' },
      { index: 1, login: 'assistant_admin', text: 'Диагностика показала проблему с видеовыходом системного блока. Заказана плата.', at: '2026-04-22 11:40:00' },
      { index: 2, login: 'Admin', text: 'На месте проверили пульт, подтвержден сбой микрофонного канала.', at: '2026-04-22 10:25:00' },
      { index: 3, login: 'admin_network', text: 'Коммутатор в 404 аудитории уходит в перезагрузку под нагрузкой, готовим замену.', at: '2026-04-22 12:20:00' }
    ];

    for (const comment of comments) {
      await createComment({
        complaintId: complaintIds[comment.index].id,
        userId: userIds[comment.login],
        comment: comment.text,
        createdAt: comment.at
      });
    }

    await run('COMMIT');

    const counts = {
      users: await get('SELECT COUNT(*) AS count FROM users'),
      rooms: await get('SELECT COUNT(*) AS count FROM rooms'),
      equipment: await get('SELECT COUNT(*) AS count FROM equipment'),
      complaints: await get('SELECT COUNT(*) AS count FROM complaints'),
      notifications: await get('SELECT COUNT(*) AS count FROM notifications')
    };

    console.log('Demo data reset complete.');
    console.log(counts);
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
