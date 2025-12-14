const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }
  next();
}

const registerRules = [
  body('login')
    .matches(/^[A-Za-z0-9_]{3,30}$/)
    .withMessage('Логин: 3-30 символов, только буквы, цифры и _'),
  body('password').isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
  body('full_name')
    .matches(/^[A-Za-zА-Яа-яЁё\s'\-]{3,100}$/)
    .withMessage('ФИО должно содержать только буквы, пробелы и дефисы'),
  body('role').isIn(['admin', 'teacher']).withMessage('Роль должна быть admin или teacher'),
  body('rooms').optional().isArray().withMessage('rooms должен быть массивом'),
  handleValidation
];

const loginRules = [
  body('login').notEmpty().withMessage('Логин обязателен'),
  body('password').notEmpty().withMessage('Пароль обязателен'),
  handleValidation
];

const roomCreateRules = [
  body('name').notEmpty().withMessage('Название аудитории обязательно'),
  handleValidation
];

const equipmentCreateRules = [
  body('name').notEmpty().withMessage('Название оборудования обязательно'),
  body('serial_number')
    .optional()
    .matches(/^[A-Za-z0-9\-]{1,50}$/)
    .withMessage('Серийный номер содержит только буквы, цифры и дефис'),
  body('purchase_date').optional().isISO8601().withMessage('Дата покупки должна быть в формате YYYY-MM-DD'),
  handleValidation
];

const complaintCreateRules = [
  body('equipment_id').isInt({ min: 1 }).withMessage('equipment_id должен быть положительным числом'),
  body('description').isLength({ min: 5, max: 2000 }).withMessage('Описание должно быть от 5 до 2000 символов'),
  handleValidation
];

const changeComplaintStatusRules = [
  body('status').isIn(['на рассмотрении', 'в ремонте', 'исправлено']).withMessage('Неверный статус'),
  handleValidation
];

const assignTeacherRules = [
  body('teacher_id').isInt().withMessage('teacher_id должен быть числом'),
  handleValidation
];

const updateTeacherRules = [
  body('full_name').notEmpty().withMessage('ФИО обязательно'),
  body('login').notEmpty().withMessage('Логин обязателен'),
  body('password').optional().isLength({ min: 6 }).withMessage('Пароль минимум 6 символов'),
  handleValidation
];

module.exports = {
  registerRules,
  loginRules,
  roomCreateRules,
  equipmentCreateRules,
  complaintCreateRules,
  changeComplaintStatusRules,
  assignTeacherRules,
  updateTeacherRules
};
