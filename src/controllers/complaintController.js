const path = require('path');
const multer = require('multer');

const Complaint = require('../models/Complaint');
const Equipment = require('../models/Equipment');
const Notification = require('../models/Notification');
const User = require('../models/User');

const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname);
  }
});

const upload = multer({ storage });

exports.uploadMiddleware = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'attachments', maxCount: 5 }
]);

exports.createComplaint = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: 'Необходима авторизация' });
  }

  const user_id = req.session.user.id;
  const { equipment_id, description } = req.body;

  if (!equipment_id || !description) {
    return res.status(400).json({ message: 'Необходимы поля equipment_id и description' });
  }

  const photo_path = req.files?.photo?.[0]?.filename || req.files?.attachments?.[0]?.filename || null;
  const video_path = req.files?.video?.[0]?.filename || null;

  Equipment.findById(equipment_id, (eqErr, equipment) => {
    if (eqErr) return next(eqErr);
    if (!equipment) return res.status(404).json({ message: 'Оборудование не найдено' });

    const blockedStatuses = ['на рассмотрении', 'в ремонте'];
    if (blockedStatuses.includes(String(equipment.status || '').toLowerCase())) {
      return res.status(409).json({
        message: `Нельзя отправлять жалобу: оборудование сейчас "${equipment.status || ''}"`
      });
    }

    Complaint.findOpenByEquipment(equipment_id, (findErr, existing) => {
      if (findErr) return next(findErr);
      if (existing) {
        return res.status(409).json({ message: 'По этому оборудованию уже есть открытая жалоба' });
      }

      Complaint.create({ user_id, equipment_id, description, photo_path, video_path }, (createErr, id) => {
        if (createErr) return next(createErr);

        Equipment.setStatus(equipment_id, 'на рассмотрении', () => {});

        User.findAllAdmins((adminErr, admins) => {
          if (!adminErr && admins?.length) {
            admins.forEach((admin) => {
              Notification.create(
                {
                  user_id: admin.id,
                  complaint_id: id,
                  title: 'Новая заявка о поломке',
                  message: `Поступила новая заявка по оборудованию "${equipment.name}". ${description.substring(0, 120)}`,
                  type: 'warning'
                },
                () => {}
              );
            });
          }
        });

        res.json({ message: 'Жалоба отправлена', id });
      });
    });
  });
};
