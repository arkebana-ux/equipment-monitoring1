const path = require('path');
const multer = require('multer');
const Complaint = require('../models/Complaint');

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

// Мидлвар для обработки фото и видео
exports.uploadMiddleware = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]);

// Создание жалобы
exports.createComplaint = (req, res, next) => {
  const user_id = req.session.user.id;  // Получаем ID пользователя из сессии
  const { equipment_id, description } = req.body;  // Извлекаем данные из тела запроса

  // Проверяем, что все обязательные поля присутствуют
  if (!equipment_id || !description) {
    return res.status(400).json({ message: 'Необходимы все поля: equipment_id и description' });
  }

  // Получаем пути к файлам, если они были загружены
  const photo_path = req.files?.photo?.[0]?.filename || null;
  const video_path = req.files?.video?.[0]?.filename || null;

  // Логируем файлы для диагностики
  console.log('Received files: photo_path =', photo_path, ', video_path =', video_path);

  // Создаем жалобу в базе данных
  Complaint.create(
    { user_id, equipment_id, description, photo_path, video_path },
    (err, id) => {
      if (err) {
        console.error('Ошибка при создании жалобы:', err);
        return next(err);  // Если ошибка — передаем в обработчик ошибок
      }
      res.json({ message: 'Жалоба отправлена', id });  // Возвращаем успешный ответ
    }
  );
};
