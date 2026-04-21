const express = require('express');

const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureRole, ensureMainAdmin } = require('../middleware/authMiddleware');
const {
  roomCreateRules,
  equipmentCreateRules,
  changeComplaintStatusRules,
  assignTeacherRules,
  updateTeacherRules
} = require('../middleware/validation');

router.use(ensureRole('admin'));

router.get('/dashboard', adminController.getDashboardData);

router.post('/rooms', roomCreateRules, adminController.createRoom);
router.delete('/rooms/:id', adminController.deleteRoom);
router.get('/rooms/:id/data', adminController.getRoomData);

router.post('/rooms/:id/equipment', roomCreateRules, adminController.addEquipmentToRoom);
router.patch('/equipment/:id/active', adminController.setEquipmentActive);
router.patch('/equipment/:id', equipmentCreateRules, adminController.updateEquipment);
router.delete('/equipment/:id', adminController.deleteEquipment);

router.patch('/complaints/:id/status', changeComplaintStatusRules, adminController.changeComplaintStatus);
router.get('/complaints/:id', adminController.getComplaintDetails);
router.delete('/archive/:id', ensureMainAdmin, adminController.deleteArchivedComplaint);

router.get('/teachers', adminController.listTeachers);
router.patch('/teachers/:id', updateTeacherRules, adminController.updateTeacher);
router.delete('/teachers/:id', adminController.deleteTeacher);

router.patch('/admins/:id', ensureMainAdmin, updateTeacherRules, adminController.updateAdmin);
router.delete('/admins/:id', ensureMainAdmin, adminController.deleteAdmin);

router.post('/rooms/:id/teachers', assignTeacherRules, adminController.assignTeacherToRoom);
router.delete('/rooms/:roomId/teachers/:teacherId', adminController.removeTeacherFromRoom);

module.exports = router;
