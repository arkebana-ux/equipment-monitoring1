const Notification = require('../models/Notification');

// Получить все уведомления пользователя
exports.getNotifications = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  const user_id = req.session.user.id;
  const limit = req.query.limit ? parseInt(req.query.limit) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;

  Notification.findByUser(user_id, limit, offset, (err, notifications) => {
    if (err) return next(err);

    Notification.countUnread(user_id, (countErr, unreadCount) => {
      if (countErr) return next(countErr);
      res.json({ notifications, unreadCount });
    });
  });
};

// Получить только непрочитанные уведомления
exports.getUnreadNotifications = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  const user_id = req.session.user.id;

  Notification.findUnreadByUser(user_id, (err, notifications) => {
    if (err) return next(err);
    res.json({ notifications, count: notifications?.length || 0 });
  });
};

// Получить количество непрочитанных уведомлений
exports.getUnreadCount = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  const user_id = req.session.user.id;

  Notification.countUnread(user_id, (err, count) => {
    if (err) return next(err);
    res.json({ count });
  });
};

// Отметить уведомление как прочитанное
exports.markAsRead = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  const notification_id = req.params.id;

  Notification.markAsRead(notification_id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Уведомление отмечено как прочитанное' });
  });
};

// Отметить все уведомления как прочитанные
exports.markAllAsRead = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  const user_id = req.session.user.id;

  Notification.markAllAsRead(user_id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Все уведомления отмечены как прочитанные' });
  });
};

// Удалить уведомление
exports.deleteNotification = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  const notification_id = req.params.id;

  Notification.delete(notification_id, (err) => {
    if (err) return next(err);
    res.json({ message: 'Уведомление удалено' });
  });
};
