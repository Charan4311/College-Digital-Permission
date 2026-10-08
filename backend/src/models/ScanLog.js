const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  qrPassId: { type: mongoose.Schema.Types.ObjectId, ref: 'QRPass' },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'OutpassRequest' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scannedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  passCode: { type: String },
  scanResult: { type: String, enum: ['VALID', 'ALREADY_USED', 'EXPIRED', 'INVALID'], required: true },
  scannedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScanLog', scanLogSchema);
