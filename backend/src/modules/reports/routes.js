const express = require('express');
const router = express.Router();
const controller = require('./reportsController');
const auth = require('../../middleware/auth');

// 1. Get Trend Analytics Data
router.get('/trend', controller.getTrendAnalytics);

// 2. Export Excel Report
router.get('/export', controller.exportTrendExcel);

// 3. Hostel In-charge summary & history
router.get('/hostel-summary', auth, controller.getHostelSummary);
router.get('/hostel-history', auth, controller.getHostelHistory);
router.get('/summary', auth, controller.getHostelSummary);
router.get('/history', auth, controller.getHostelHistory);

module.exports = router;
