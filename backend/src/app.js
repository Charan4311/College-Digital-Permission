const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const auth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/uploads/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid file id' });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database unavailable' });
    }

    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(fileId) });
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

    const stream = bucket.openDownloadStream(new ObjectId(fileId));
    stream.on('error', () => {
      res.status(404).json({ success: false, message: 'File not found' });
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Serve uploaded file error:', error);
    res.status(500).json({ success: false, message: 'Error fetching uploaded file' });
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

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
