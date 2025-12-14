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

const { roomCreateRules, equipmentCreateRules, changeComplaintStatusRules, assignTeacherRules, updateTeacherRules } = require('../middleware/validation');

// оборудование в аудитории
router.post('/rooms/:id/equipment', roomCreateRules, adminController.addEquipmentToRoom);
router.patch('/equipment/:id/active', adminController.setEquipmentActive);
router.patch('/equipment/:id', equipmentCreateRules, adminController.updateEquipment);
// удаление оборудования
router.delete('/equipment/:id', adminController.deleteEquipment);

// жалобы
router.patch('/complaints/:id/status', changeComplaintStatusRules, adminController.changeComplaintStatus);
// получить подробности жалобы
router.get('/complaints/:id', adminController.getComplaintDetails);

// преподаватели
router.get('/teachers', adminController.listTeachers);
router.patch('/teachers/:id', adminController.updateTeacher);
router.delete('/teachers/:id', adminController.deleteTeacher);

// связь аудитория–преподаватель
router.post('/rooms/:id/teachers', assignTeacherRules, adminController.assignTeacherToRoom);
router.delete('/rooms/:roomId/teachers/:teacherId', adminController.removeTeacherFromRoom);

module.exports = router;
