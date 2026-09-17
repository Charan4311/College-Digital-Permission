const express = require('express');
const router = express.Router();
const securityController = require('./controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

// Verify endpoint is public (QR codes are scanned by anyone at the gate via URL)
router.get('/verify/:token', securityController.verifyToken);

router.use(auth, requireRole('SECURITY'));
router.post('/scan', securityController.scanQR);
router.get('/recent-scans', securityController.getRecentScans);
router.get('/active-passes', securityController.getActivePasses);

module.exports = router;
