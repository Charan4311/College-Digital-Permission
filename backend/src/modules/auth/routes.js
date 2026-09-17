const express = require('express');
const router = express.Router();
const authController = require('./controller');
const auth = require('../../middleware/auth');

router.post('/login', authController.login);
router.get('/me', auth, authController.getMe);

module.exports = router;
