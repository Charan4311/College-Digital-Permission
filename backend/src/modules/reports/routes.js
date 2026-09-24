const express = require('express');
const router = express.Router();
const controller = require('./reportsController');
const auth = require('../../middleware/auth'); // assuming we might need auth or just use it

// 1. Get Trend Analytics Data
router.get('/trend', controller.getTrendAnalytics);

// 2. Export Excel Report
router.get('/export', controller.exportTrendExcel);

module.exports = router;
