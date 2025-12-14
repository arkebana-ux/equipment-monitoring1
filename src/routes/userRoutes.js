// src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureRole } = require('../middleware/authMiddleware'); // Убедитесь, что это middleware работает

router.use(ensureRole('teacher')); // Доступ только для преподавателей

// Получить все аудитории, привязанные к текущему пользователю
router.get('/rooms', userController.getMyRooms);

// Получить оборудование для конкретной аудитории (для преподавателя)
router.get('/rooms/:id/equipment', userController.getRoomEquipment);

module.exports = router;
