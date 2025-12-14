const bcrypt = require('bcrypt');
const path = require('path');
const User = require('../models/User');
const logger = require('../config/logger');
const RoomTeacher = require('../models/RoomTeacher');

const SALT_ROUNDS = 10;

// показываем страницу авторизации (index.html в /public)
exports.showLoginPage = (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'public', 'index.html'));
};

exports.register = (req, res, next) => {
  const { login, password, full_name, role, rooms } = req.body;

  bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
    if (err) return next(err);

    User.create({ login, password_hash: hash, full_name, role }, (err, id) => {
      if (err) {
        logger.error('Register error: ' + err.message);
        return res.status(400).json({ message: 'Ошибка регистрации' });
      }

      // если создаём преподавателя и есть аудитории — привязываем
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

    bcrypt.compare(password, user.password_hash, (err, isMatch) => {
      if (err) return next(err);
      if (!isMatch) {
        return res.status(401).json({ message: 'Неверный логин или пароль' });
      }

      req.session.user = {
        id: user.id,
        login: user.login,
        role: user.role,
        full_name: user.full_name
      };

      logger.info(`User logged in: ${user.login}`);
      res.json({ message: 'Успешный вход', role: user.role });
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
