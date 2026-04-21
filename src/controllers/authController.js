const bcrypt = require('bcrypt');
const path = require('path');

const User = require('../models/User');
const logger = require('../config/logger');
const RoomTeacher = require('../models/RoomTeacher');

const SALT_ROUNDS = 10;

exports.showLoginPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
};

exports.register = (req, res, next) => {
  const { login, password, full_name, role, rooms } = req.body;

  if (!req.session || !req.session.user) {
    return res.status(403).json({ message: 'Требуется авторизация администратора' });
  }

  const requesterRole = req.session.user.role;
  const requesterIsMainAdmin = Boolean(req.session.user.is_super_admin);

  if (role === 'admin') {
    if (!requesterIsMainAdmin) {
      return res.status(403).json({ message: 'Только главный администратор может создавать админов' });
    }
  } else if (requesterRole !== 'admin') {
    return res.status(403).json({ message: 'Только администраторы могут создавать преподавателей' });
  }

  bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
    if (err) return next(err);

    User.create({ login, password_hash: hash, full_name, role, is_super_admin: 0 }, (createErr, id) => {
      if (createErr) {
        logger.error('Register error: ' + createErr.message);
        if (createErr.message && /unique|constraint|UNIQUE/i.test(createErr.message)) {
          return res.status(409).json({ message: 'Логин уже занят' });
        }
        return res.status(400).json({ message: 'Ошибка регистрации', detail: createErr.message });
      }

      if (role === 'teacher' && Array.isArray(rooms) && rooms.length > 0) {
        rooms.forEach((roomId) => {
          RoomTeacher.assign(roomId, id, () => {});
        });
      }

      logger.info(`User registered: ${login}`);
      res.json({ message: 'Пользователь зарегистрирован', id });
    });
  });
};

exports.login = (req, res, next) => {
  const { login, password } = req.body;

  User.findByLogin(login, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ message: 'Неверный логин или пароль' });
    }

    bcrypt.compare(password, user.password_hash, (compareErr, isMatch) => {
      if (compareErr) return next(compareErr);
      if (!isMatch) {
        return res.status(401).json({ message: 'Неверный логин или пароль' });
      }

      req.session.user = {
        id: user.id,
        login: user.login,
        role: user.role,
        full_name: user.full_name,
        is_super_admin: Boolean(user.is_super_admin)
      };

      logger.info(`User logged in: ${user.login}`);
      res.json({
        message: 'Успешный вход',
        role: user.role,
        is_super_admin: Boolean(user.is_super_admin)
      });
    });
  });
};

exports.logout = (req, res) => {
  const login = req.session.user?.login;
  req.session.destroy(() => {
    if (login) logger.info(`User logged out: ${login}`);
    res.json({ message: 'Выход выполнен' });
  });
};
