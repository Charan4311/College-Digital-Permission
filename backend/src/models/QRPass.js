const mongoose = require('mongoose');

const qrPassSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'OutpassRequest', required: true, unique: true },
  token: { type: String, required: true, unique: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'USED', 'EXPIRED'], default: 'ACTIVE' }
});

module.exports = mongoose.model('QRPass', qrPassSchema);
