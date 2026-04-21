const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { ensureAuth } = require('../middleware/authMiddleware');

// Получить все уведомления пользователя
router.get('/', ensureAuth, notificationController.getNotifications);

// Получить только непрочитанные уведомления
router.get('/unread', ensureAuth, notificationController.getUnreadNotifications);

// Получить количество непрочитанных уведомлений
router.get('/count', ensureAuth, notificationController.getUnreadCount);

// Отметить уведомление как прочитанное
router.put('/:id/read', ensureAuth, notificationController.markAsRead);

// Отметить все уведомления как прочитанные
router.put('/read/all', ensureAuth, notificationController.markAllAsRead);

// Удалить уведомление
router.delete('/:id', ensureAuth, notificationController.deleteNotification);

module.exports = router;
