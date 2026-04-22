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

async function createEquipment({ roomId, name, serial, purchaseDate, status = 'в работе' }) {
  const result = await run(
    `INSERT INTO equipment (room_id, name, serial_number, purchase_date, status, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [roomId, name, serial, purchaseDate, status, status === 'в работе' ? 1 : 0]
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

function buildEquipmentSerial(roomName, prefix, index) {
  return `${prefix}-${roomName}-${String(index).padStart(3, '0')}`;
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

    const roomDefinitions = [
      { name: '101', teachers: ['teacher_ivanova'] },
      { name: '102', teachers: ['teacher_romanova'] },
      { name: '105', teachers: ['teacher_nikitina'] },
      { name: '112', teachers: ['teacher_habirova'] },
      { name: '114', teachers: ['teacher_borisova'] },
      { name: '201', teachers: ['teacher_galimova'] },
      { name: '202', teachers: ['teacher_fedorov'] },
      { name: '207', teachers: ['teacher_petrov', 'teacher_sokolov'] },
      { name: '214', teachers: ['teacher_sokolov'] },
      { name: '218', teachers: ['teacher_isaeva'] },
      { name: '304', teachers: ['teacher_shutova'] },
      { name: '305', teachers: ['teacher_smirnova'] },
      { name: '312', teachers: ['teacher_latypov'] },
      { name: '318', teachers: ['teacher_kuznetsov'] },
      { name: '402', teachers: ['teacher_karimov'] },
      { name: '404', teachers: ['teacher_ermakov'] },
      { name: '412', teachers: ['teacher_karimov', 'teacher_morozov'] },
      { name: '418', teachers: ['teacher_galimova'] },
      { name: '509', teachers: ['teacher_ivanova'] }
    ];

    const roomIds = {};
    for (const room of roomDefinitions) {
      roomIds[room.name] = await createRoom(room.name);
      for (const teacherLogin of room.teachers) {
        await assignTeacher(roomIds[room.name], userIds[teacherLogin]);
      }
    }

    const equipmentTemplates = {
      '101': [
        ['Проектор BenQ MX560', 'PJ', '2024-02-11', 'в работе'],
        ['Интерактивная панель Prestigio', 'PN', '2025-01-10', 'на рассмотрении']
      ],
      '102': [
        ['Ноутбук преподавателя ASUS ExpertBook', 'NB', '2024-03-03', 'в работе'],
        ['Экран с электроприводом Lumien', 'SC', '2023-11-09', 'в работе']
      ],
      '105': [
        ['Камера конференц-связи Logitech Rally', 'CM', '2024-10-12', 'в работе'],
        ['Акустическая колонка JBL', 'AU', '2023-08-28', 'в работе']
      ],
      '112': [
        ['Компьютер преподавателя HP ProDesk', 'PC', '2023-04-09', 'в ремонте'],
        ['Проектор Acer X1328', 'PJ', '2022-12-15', 'в работе']
      ],
      '114': [
        ['Документ-камера Elmo', 'DV', '2023-10-01', 'в работе'],
        ['МФУ Canon i-SENSYS', 'PR', '2022-06-18', 'в работе']
      ],
      '201': [
        ['Интерактивная панель Newline', 'PN', '2024-05-20', 'в работе'],
        ['Акустическая система Edifier', 'AU', '2024-02-14', 'в работе']
      ],
      '202': [
        ['Проектор NEC ME301X', 'PJ', '2023-09-07', 'в работе'],
        ['Компьютер преподавателя Dell OptiPlex', 'PC', '2022-09-30', 'в работе']
      ],
      '207': [
        ['Проектор Epson EB-X06', 'EP', '2024-08-20', 'на рассмотрении'],
        ['Компьютер преподавателя Lenovo ThinkCentre', 'PC', '2023-03-12', 'в ремонте'],
        ['Документ-камера AverVision', 'DV', '2024-05-18', 'в работе']
      ],
      '214': [
        ['Микрофонная станция Bosch', 'MC', '2022-09-16', 'на рассмотрении'],
        ['Микшерный пульт Yamaha MG10XU', 'MX', '2023-02-14', 'в работе']
      ],
      '218': [
        ['Моноблок Acer Veriton', 'PC', '2024-04-12', 'в работе'],
        ['Панель Samsung Flip', 'FL', '2024-11-02', 'в работе']
      ],
      '304': [
        ['МФУ Kyocera ECOSYS', 'PR', '2022-11-07', 'в работе'],
        ['Сканер Epson WorkForce', 'SC', '2023-01-19', 'в работе']
      ],
      '305': [
        ['Принтер HP LaserJet', 'PR', '2022-11-05', 'в работе'],
        ['Системный блок Dell OptiPlex', 'PC', '2021-10-19', 'в работе']
      ],
      '312': [
        ['Проектор ViewSonic PA503', 'PJ', '2023-04-28', 'в работе'],
        ['Ноутбук преподавателя Lenovo V15', 'NB', '2024-09-01', 'в работе']
      ],
      '318': [
        ['Интерактивная доска SMART', 'BD', '2021-12-20', 'на рассмотрении'],
        ['Проектор NEC M332XS', 'PJ', '2023-06-01', 'в работе']
      ],
      '402': [
        ['Интерактивная панель Newline', 'PN', '2024-03-22', 'в работе'],
        ['Мини-ПК Intel NUC', 'PC', '2024-02-27', 'в работе']
      ],
      '404': [
        ['Компьютерный класс: рабочая станция 1', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 2', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 3', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 4', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 5', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 6', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 7', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 8', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 9', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 10', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 11', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 12', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 13', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 14', 'WS', '2024-01-15', 'в работе'],
        ['Компьютерный класс: рабочая станция 15', 'WS', '2024-01-15', 'в работе'],
        ['Компьютер преподавателя Lenovo ThinkCentre M70q', 'PC', '2024-01-20', 'в работе'],
        ['Проектор Epson EB-982W', 'PJ', '2024-02-10', 'в работе'],
        ['Сетевой коммутатор TP-Link', 'NW', '2023-07-04', 'в ремонте']
      ],
      '412': [
        ['Акустическая система Yamaha', 'AU', '2024-02-17', 'в работе'],
        ['Радиомикрофон Sennheiser', 'MC', '2023-09-25', 'в работе']
      ],
      '418': [
        ['Проектор Epson CO-FH02', 'PJ', '2024-12-09', 'в работе'],
        ['Веб-камера Logitech Brio', 'CM', '2024-07-11', 'в работе']
      ],
      '509': [
        ['Маршрутизатор MikroTik', 'RT', '2023-09-01', 'в работе'],
        ['Панель Samsung Flip', 'FL', '2024-06-03', 'в работе']
      ]
    };

    const equipmentIds = {};
    for (const [roomName, items] of Object.entries(equipmentTemplates)) {
      equipmentIds[roomName] = {};
      let index = 1;
      for (const [name, prefix, purchaseDate, status] of items) {
        equipmentIds[roomName][name] = await createEquipment({
          roomId: roomIds[roomName],
          name,
          serial: buildEquipmentSerial(roomName, prefix, index),
          purchaseDate,
          status
        });
        index += 1;
      }
    }

    const complaintsData = [
      ['teacher_petrov', '207', 'Проектор Epson EB-X06', 'Проектор в аудитории 207 включается, но после запуска пары не выводит изображение на экран.', 'на рассмотрении', '2026-04-22 08:15:00', '2026-04-22 09:05:00', 'assistant_admin'],
      ['teacher_habirova', '112', 'Компьютер преподавателя HP ProDesk', 'Компьютер в аудитории 112 не определяет проектор по HDMI, при этом кабель и сам проектор исправны.', 'в ремонте', '2026-04-21 09:25:00', '2026-04-22 14:10:00', 'assistant_admin'],
      ['teacher_sokolov', '214', 'Микрофонная станция Bosch', 'На микрофонной станции в аудитории 214 один из пультов не передает звук в общую систему.', 'на рассмотрении', '2026-04-20 15:00:00', '2026-04-22 10:10:00', 'Admin'],
      ['teacher_kuznetsov', '318', 'Интерактивная доска SMART', 'Интерактивная доска в аудитории 318 калибруется со смещением и сбивается после перезапуска.', 'на рассмотрении', '2026-04-22 08:10:00', '2026-04-22 08:25:00', 'assistant_admin'],
      ['teacher_ermakov', '404', 'Сетевой коммутатор TP-Link', 'В компьютерном классе 404 периодически пропадает сеть на части рабочих станций во время практических занятий.', 'в ремонте', '2026-04-22 09:40:00', '2026-04-22 13:15:00', 'admin_network'],

      ['teacher_romanova', '102', 'Экран с электроприводом Lumien', 'Экран в аудитории 102 перестал опускаться до конца и заедал на середине хода.', 'исправлено', '2026-04-10 15:10:00', '2026-04-12 12:25:00', 'assistant_admin'],
      ['teacher_nikitina', '105', 'Камера конференц-связи Logitech Rally', 'Камера конференц-связи в аудитории 105 не фокусировалась на преподавателе после запуска Zoom.', 'исправлено', '2026-04-08 14:05:00', '2026-04-11 10:10:00', 'admin'],
      ['teacher_galimova', '201', 'Интерактивная панель Newline', 'В аудитории 201 панель самопроизвольно перезагружалась во время демонстрации презентации.', 'исправлено', '2026-04-07 10:25:00', '2026-04-09 13:15:00', 'archive_admin'],
      ['teacher_fedorov', '202', 'Проектор NEC ME301X', 'Проектор в аудитории 202 не распознавал сигнал с кафедрального компьютера.', 'исправлено', '2026-04-06 11:00:00', '2026-04-08 16:20:00', 'admin'],
      ['teacher_ivanova', '509', 'Панель Samsung Flip', 'Панель Samsung Flip в аудитории 509 зависала при переключении между режимами экрана.', 'исправлено', '2026-04-05 12:30:00', '2026-04-07 11:45:00', 'archive_admin'],
      ['teacher_ermakov', '404', 'Компьютерный класс: рабочая станция 3', 'На рабочей станции 3 в компьютерном классе 404 не запускалось программное обеспечение для практических занятий.', 'исправлено', '2026-04-03 13:20:00', '2026-04-04 11:15:00', 'admin'],
      ['teacher_romanova', '102', 'Ноутбук преподавателя ASUS ExpertBook', 'Ноутбук преподавателя в аудитории 102 не видел внешний дисплей после выхода из сна.', 'исправлено', '2026-04-02 09:00:00', '2026-04-03 12:10:00', 'assistant_admin']
    ];

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
      complaintIds.push({
        id: complaintId,
        teacherLogin,
        roomName,
        equipmentName,
        status,
        createdAt,
        updatedAt,
        adminLogin,
        description
      });
    }

    const activeComplaints = complaintIds.filter((item) => item.status !== 'исправлено');
    const archiveComplaints = complaintIds.filter((item) => item.status === 'исправлено');

    for (const item of activeComplaints.slice(0, 10)) {
      for (const adminLogin of ['Admin', 'assistant_admin', 'admin', 'archive_admin', 'admin_network']) {
        await createNotification({
          userId: userIds[adminLogin],
          complaintId: item.id,
          title: `Новая заявка по аудитории ${item.roomName}`,
          message: `Поступило обращение по оборудованию "${item.equipmentName}" в аудитории ${item.roomName}.`,
          type: item.status === 'в ремонте' ? 'info' : 'warning',
          createdAt: item.createdAt
        });
      }
    }

    for (const item of activeComplaints) {
      const title = item.status === 'в ремонте' ? 'Оборудование передано в ремонт' : 'Обращение принято в работу';
      const message = item.status === 'в ремонте'
        ? `По заявке по оборудованию "${item.equipmentName}" начаты ремонтные работы.`
        : `По заявке по оборудованию "${item.equipmentName}" назначен ответственный администратор.`;
      await createNotification({
        userId: userIds[item.teacherLogin],
        complaintId: item.id,
        title,
        message,
        type: item.status === 'в ремонте' ? 'warning' : 'info',
        createdAt: item.updatedAt
      });
    }

    for (const item of archiveComplaints.slice(0, 14)) {
      await createNotification({
        userId: userIds[item.teacherLogin],
        complaintId: item.id,
        title: 'Заявка закрыта',
        message: `По оборудованию "${item.equipmentName}" работы завершены, техника снова доступна.`,
        type: 'success',
        createdAt: item.updatedAt
      });
    }

    for (const item of activeComplaints) {
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
      if (item.status === 'в ремонте') {
        await createHistory({
          complaintId: item.id,
          actorUserId: userIds[item.adminLogin],
          actionType: 'status_changed',
          fieldName: 'status',
          oldValue: 'на рассмотрении',
          newValue: 'в ремонте',
          comment: 'После диагностики подтверждена необходимость ремонта',
          createdAt: item.updatedAt
        });
      }
    }

    for (const item of archiveComplaints) {
      const reviewAt = item.createdAt;
      const closeAt = item.updatedAt;
      await createHistory({
        complaintId: item.id,
        actorUserId: userIds[item.teacherLogin],
        actionType: 'created',
        comment: 'Создано новое обращение пользователем',
        createdAt: reviewAt
      });
      await createHistory({
        complaintId: item.id,
        actorUserId: userIds[item.adminLogin],
        actionType: 'status_changed',
        fieldName: 'status',
        oldValue: 'в ремонте',
        newValue: 'исправлено',
        comment: 'Работы завершены, оборудование протестировано и возвращено в эксплуатацию',
        createdAt: closeAt
      });
    }

    const commentsToAdd = [
      [activeComplaints[0], 'assistant_admin', 'Проверим кабельную линию и источник сигнала после первой пары, чтобы не срывать расписание.'],
      [activeComplaints[1], 'assistant_admin', 'Подготовили подменный блок питания и согласовали окно для замены после занятий.'],
      [activeComplaints[2], 'Admin', 'Проверим пульт и базовый модуль одновременно, чтобы исключить проблему в линии связи.'],
      [activeComplaints[3], 'assistant_admin', 'Выезд в аудиторию 318 согласован на первую пару завтрашнего дня.'],
      [activeComplaints[4], 'admin_network', 'Проблема локализована на коммутаторе доступа, готовим замену на резервный.'],
      [archiveComplaints[0], 'archive_admin', 'После обслуживания выполнили серию тестовых страниц без повторного замятия бумаги.'],
      [archiveComplaints[1], 'archive_admin', 'Печатающий узел обслужен, сделана калибровка и контрольный прогон.']
    ];

    for (const [item, adminLogin, comment] of commentsToAdd) {
      await createComment({
        complaintId: item.id,
        userId: userIds[adminLogin],
        comment,
        createdAt: item.updatedAt
      });
    }

    await run(
      `UPDATE equipment
       SET status = 'в работе', is_active = 1
       WHERE id IN (
         SELECT e.id
         FROM equipment e
         LEFT JOIN complaints c ON c.equipment_id = e.id AND c.status != 'исправлено'
         WHERE c.id IS NULL
       )`
    );

    for (const item of activeComplaints) {
      const equipmentStatus = item.status === 'в ремонте' ? 'в ремонте' : 'на рассмотрении';
      await run('UPDATE equipment SET status = ?, is_active = 0 WHERE id = ?', [
        equipmentStatus,
        equipmentIds[item.roomName][item.equipmentName]
      ]);
    }

    await run('COMMIT');
  } catch (error) {
    await run('ROLLBACK').catch(() => {});
    throw error;
  }

  const counts = {
    users: await get('SELECT COUNT(*) AS count FROM users'),
    rooms: await get('SELECT COUNT(*) AS count FROM rooms'),
    equipment: await get('SELECT COUNT(*) AS count FROM equipment'),
    complaints: await get('SELECT COUNT(*) AS count FROM complaints'),
    notifications: await get('SELECT COUNT(*) AS count FROM notifications')
  };

  console.log('Demo data reset complete.');
  console.log(counts);
  db.close();
}

main().catch((error) => {
  console.error(error);
  db.close();
  process.exit(1);
});
