const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  qrPassId: { type: mongoose.Schema.Types.ObjectId, ref: 'QRPass' },
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'OutpassRequest' },
  scannedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scanResult: { type: String, enum: ['VALID', 'ALREADY_USED', 'EXPIRED', 'INVALID'], required: true },
  scannedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScanLog', scanLogSchema);
