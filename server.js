const express = require('express');
const path = require('path');
const session = require('express-session');
const morgan = require('morgan');

const logger = require('./src/config/logger');
const { initDb } = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const complaintRoutes = require('./src/routes/complaintRoutes');
const userRoutes = require('./src/routes/userRoutes');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = 3000;

// --- ЛОГИРОВАНИЕ HTTP-запросов ---
app.use(morgan('dev', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// --- Парсеры ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Сессии ---
app.use(session({
  secret: 'super-secret-key', // для курсовой можно так, в проде — env
  resave: false,
  saveUninitialized: false
}));

// --- стартовая страница (ДОЛЖНА БЫТЬ ДО express.static) ---
app.get('/', (req, res) => {
  if (!req.session.user) {
    // страница авторизации
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }

  if (req.session.user.role === 'admin') {
    // панель админа
    return res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
  }

  // панель преподавателя
  return res.sendFile(path.join(__dirname, 'public', 'user-dashboard.html'));
});

// --- Статические файлы (css, js, картинки и т.п.) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Роуты ---
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userRoutes);
app.use('/complaints', complaintRoutes);

// --- обработчик ошибок ---
app.use(errorHandler);

// --- запуск ---
initDb(); // создаём таблицы, если их ещё нет

app.listen(PORT, () => {
  logger.info(`Server started on http://localhost:${PORT}`);
});
