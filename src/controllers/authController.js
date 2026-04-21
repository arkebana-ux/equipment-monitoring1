const bcrypt = require('bcrypt');
const path = require('path');

const User = require('../models/User');
const logger = require('../config/logger');
const RoomTeacher = require('../models/RoomTeacher');

const SALT_ROUNDS = 10;
const RESET_CODE = '0000';

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

exports.showLoginPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
};

exports.startPasswordReset = (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ message: 'Укажите электронную почту' });
  }

  User.findByEmail(email, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь с такой электронной почтой не найден' });
    }

    req.session.passwordReset = {
      userId: user.id,
      email,
      code: RESET_CODE,
      verified: false,
      expiresAt: Date.now() + (15 * 60 * 1000)
    };

    res.json({
      message: 'Код подтверждения отправлен. Для теста используйте код 0000.',
      email
    });
  });
};

exports.verifyPasswordResetCode = (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  const resetState = req.session.passwordReset;

  if (!resetState || resetState.email !== email) {
    return res.status(400).json({ message: 'Сначала запросите восстановление пароля' });
  }

  if (resetState.expiresAt < Date.now()) {
    req.session.passwordReset = null;
    return res.status(400).json({ message: 'Срок действия кода истёк. Запросите новый код.' });
  }

  if (code !== resetState.code) {
    return res.status(400).json({ message: 'Неверный код подтверждения' });
  }

  req.session.passwordReset = {
    ...resetState,
    verified: true
  };

  res.json({ message: 'Код подтвержден' });
};

exports.resetPassword = (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  const password = String(req.body.password || '');
  const resetState = req.session.passwordReset;

  if (!resetState || resetState.email !== email) {
    return res.status(400).json({ message: 'Сначала запросите восстановление пароля' });
  }

  if (resetState.expiresAt < Date.now()) {
    req.session.passwordReset = null;
    return res.status(400).json({ message: 'Срок действия кода истёк. Запросите новый код.' });
  }

  if (code !== resetState.code || !resetState.verified) {
    return res.status(400).json({ message: 'Код подтверждения не пройден' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Новый пароль должен быть не короче 6 символов' });
  }

  bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
    if (err) return next(err);

    User.updatePassword(resetState.userId, hash, (updateErr) => {
      if (updateErr) return next(updateErr);
      req.session.passwordReset = null;
      res.json({ message: 'Пароль успешно обновлён' });
    });
  });
};

exports.register = (req, res, next) => {
  const { login, password, full_name, role, rooms, email } = req.body;

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

    User.create({ login, password_hash: hash, full_name, role, is_super_admin: 0, email: email || null }, (createErr, id) => {
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
