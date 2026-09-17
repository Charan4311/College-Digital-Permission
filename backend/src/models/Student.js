const mongoose = require('mongoose');

// Student model shares the unified 'users' collection with role: 'STUDENT'
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'STUDENT' },
  rollNo: { type: String, sparse: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  year: { type: Number, default: 4 },
  yearTier: { type: String, default: 'TIER_4TH' },
  studentType: { type: String, enum: ['DAY_SCHOLAR', 'HOSTELER'] },
  isActive: { type: Boolean, default: true }
}, { collection: 'users' });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema, 'users');
