const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');  // Путь должен быть правильным
const { ensureAuth } = require('../middleware/authMiddleware');  // Правильный импорт ensureAuth

// Роут для создания жалобы
router.post(
  '/',
  ensureAuth,  // Проверка, что пользователь авторизован
  complaintController.uploadMiddleware,  // Обработка файлов (если они есть)
  complaintController.createComplaint   // Создание жалобы
);

module.exports = router;
