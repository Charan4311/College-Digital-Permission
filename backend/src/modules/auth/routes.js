const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authController = require('./controller');
const auth = require('../../middleware/auth');

const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/login', authController.login);
router.get('/me', auth, authController.getMe);
router.patch('/profile', auth, authController.updateProfile);
router.patch('/password', auth, authController.changePassword);
router.post('/profile-image', auth, upload.single('file'), authController.uploadProfileImage);

module.exports = router;
