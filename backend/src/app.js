const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
require('./models');

const path = require('path');

const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// GridFS fallback for uploads
app.get('/uploads/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;
    if (!ObjectId.isValid(fileId)) {
      return next();
    }
    const db = mongoose.connection.db;
    if (!db) return next();

    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(fileId) });
    if (!file) return next();

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    const stream = bucket.openDownloadStream(new ObjectId(fileId));
    stream.on('error', () => next());
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

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
