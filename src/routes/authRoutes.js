const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');  // Убедитесь, что путь правильный

// Роуты для авторизации
router.get('/login', authController.showLoginPage);  // Путь и контроллер должны быть правильными
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', authController.logout);

module.exports = router;
