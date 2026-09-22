const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');

const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// /api/me — spec requires this exact path
app.get('/api/me', auth, require('./modules/auth/controller').getMe);

// Mount module routes
app.use('/api/auth', require('./modules/auth/routes'));
app.use('/api/admin', require('./modules/admin/routes'));
app.use('/api/outpass', require('./modules/outpass/routes'));
app.use('/api/security', require('./modules/security/routes'));
app.use('/api/reports', require('./modules/reports/routes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
