const express = require('express');
const router = express.Router();
const c = require('./controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure Multer storage
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

router.use(auth);

// Student routes
router.post('/', requireRole('STUDENT'), c.createRequest);
router.post('/upload', requireRole('STUDENT'), upload.single('file'), c.uploadDocument);
router.get('/mine', requireRole('STUDENT'), c.getMyRequests);
router.post('/:id/resubmit', requireRole('STUDENT'), c.resubmitRequest);

// Approver routes (must come before /:id to avoid route conflicts)
router.get('/pending/for-me', requireRole('CTPO', 'HOD', 'HOSTEL_INCHARGE', 'PLACEMENT_OFFICER'), c.getPendingForMe);
router.get('/all/for-me', requireRole('CTPO', 'HOD', 'HOSTEL_INCHARGE', 'PLACEMENT_OFFICER'), c.getAllForMe);
router.get('/dashboard-stats', requireRole('CTPO', 'HOD', 'HOSTEL_INCHARGE', 'PLACEMENT_OFFICER', 'ADMIN'), c.getDashboardStats);

// Single request (student sees own, approvers see their scope, admin sees all)
router.get('/:id/qr', requireRole('STUDENT', 'ADMIN'), c.getQRImage);
router.get('/:id', c.getRequest);
router.post('/:id/approve', requireRole('CTPO', 'HOD', 'HOSTEL_INCHARGE', 'PLACEMENT_OFFICER'), c.approveRequest);
router.post('/:id/reject', requireRole('CTPO', 'HOD', 'HOSTEL_INCHARGE', 'PLACEMENT_OFFICER'), c.rejectRequest);

module.exports = router;
