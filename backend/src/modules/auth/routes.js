const express = require('express');
const router = express.Router();
const multer = require('multer');
const authController = require('./controller');
const auth = require('../../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/login', authController.login);
router.get('/me', auth, authController.getMe);
router.patch('/profile', auth, authController.updateProfile);
router.patch('/password', auth, authController.changePassword);
router.post('/profile-image', auth, upload.single('file'), authController.uploadProfileImage);
router.delete('/profile-image', auth, authController.deleteProfileImage);

module.exports = router;
