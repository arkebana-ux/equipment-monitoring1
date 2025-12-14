const logger = require('../config/logger');

module.exports = function (err, req, res, next) {
  logger.error(err.stack || err.message);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
};
