const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureRole } = require('../middleware/authMiddleware');

router.use(ensureRole('admin'));

// общие данные для админ-панели
router.get('/dashboard', adminController.getDashboardData);

// аудитории
router.post('/rooms', adminController.createRoom);
router.delete('/rooms/:id', adminController.deleteRoom);
router.get('/rooms/:id/data', adminController.getRoomData);

// оборудование в аудитории
router.post('/rooms/:id/equipment', adminController.addEquipmentToRoom);
router.patch('/equipment/:id/active', adminController.setEquipmentActive);
router.patch('/equipment/:id', adminController.updateEquipment);

// жалобы
router.patch('/complaints/:id/status', adminController.changeComplaintStatus);

// преподаватели
router.get('/teachers', adminController.listTeachers);
router.patch('/teachers/:id', adminController.updateTeacher);
router.delete('/teachers/:id', adminController.deleteTeacher);

// связь аудитория–преподаватель
router.post('/rooms/:id/teachers', adminController.assignTeacherToRoom);
router.delete('/rooms/:roomId/teachers/:teacherId', adminController.removeTeacherFromRoom);

module.exports = router;
