const path = require('path');
const multer = require('multer');
const Complaint = require('../models/Complaint');
const Equipment = require('../models/Equipment');

// Указываем директорию для загрузки файлов
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');

// Настроим storage для multer
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    // Генерация уникального имени для файлов
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});

// Инициализация multer с настройками
const upload = multer({ storage });

// Мидлвар для обработки фото/видео/attachments (поддерживаем старые имена и общий "attachments")
exports.uploadMiddleware = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'attachments', maxCount: 5 }
]);

// Создание жалобы
exports.createComplaint = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  const user_id = req.session.user.id;  // Получаем ID пользователя из сессии
  const { equipment_id, description } = req.body;  // Извлекаем данные из тела запроса

  // Проверяем, что все обязательные поля присутствуют
  if (!equipment_id || !description) {
    return res.status(400).json({ message: 'Необходимы все поля: equipment_id и description' });
  }

  // Поддерживаем несколько форматов загрузки: photo/video или attachments
  const photo_path = req.files?.photo?.[0]?.filename || req.files?.attachments?.[0]?.filename || null;
  const video_path = req.files?.video?.[0]?.filename || null;

  // Логируем для диагностики
  console.log('Create complaint: user=', user_id, 'equipment=', equipment_id, 'photo=', photo_path, 'video=', video_path);

  // Создаем жалобу в базе данных (поле status по схеме имеет значение по умолчанию 'на рассмотрении')
  // Проверим состояние оборудования и есть ли уже открытая жалоба для этого оборудования
  Equipment.findById(equipment_id, (eqErr, equipment) => {
    if (eqErr) {
      console.error('Find equipment error:', eqErr);
      return next(eqErr);
    }
    if (!equipment) return res.status(404).json({ message: 'Оборудование не найдено' });

    const blockedStatuses = ['на рассмотрении', 'в ремонте'];
    if (blockedStatuses.includes(String(equipment.status || '').toLowerCase())) {
      return res.status(409).json({ message: `Нельзя отправлять жалобу: оборудование сейчас '${equipment.status || ''}'` });
    }

    Complaint.findOpenByEquipment(equipment_id, (findErr, existing) => {
    if (findErr) {
      console.error('Find open complaint error:', findErr);
      return next(findErr);
    }
    if (existing) {
      return res.status(409).json({ message: 'По этому оборудованию уже есть открытая жалоба' });
    }

    Complaint.create(
      { user_id, equipment_id, description, photo_path, video_path },
      (err, id) => {
        if (err) {
          console.error('Ошибка при создании жалобы:', err);
          return next(err);
        }

        // Пометим оборудование как 'на рассмотрении'
        Equipment.setStatus(equipment_id, 'на рассмотрении', (sErr) => {
          if (sErr) console.error('Set equipment status error:', sErr);
          // Возвращаем успех независимо от ошибки установки статуса
          res.json({ message: 'Жалоба отправлена', id });
        });
      }
    );
    });
  });
};
