const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');  // Убедитесь, что путь правильный
const { registerRules, loginRules } = require('../middleware/validation');

// Роуты для авторизации
router.get('/login', authController.showLoginPage);  // Путь и контроллер должны быть правильными
router.post('/login', loginRules, authController.login);
router.post('/register', registerRules, authController.register);
router.post('/logout', authController.logout);
router.post('/forgot-password/start', authController.startPasswordReset);
router.post('/forgot-password/verify', authController.verifyPasswordResetCode);
router.post('/forgot-password/reset', authController.resetPassword);

module.exports = router;
