const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['STUDENT', 'CTPO', 'HOD', 'HOSTEL_INCHARGE', 'PLACEMENT_OFFICER', 'SECURITY', 'ADMIN'],
    required: true
  },
  // Branch reference (for CTPO and Students)
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  
  // CTPO Year scoping (e.g. 4 for 4th Year CTPO like 4KTCSM)
  assignedYear: { type: Number },

  // Student-specific fields
  rollNo: { type: String, sparse: true, index: true },
  year: { type: Number, default: 4 },
  yearTier: { type: String, default: 'TIER_4TH' },
  studentType: { type: String, enum: ['DAY_SCHOLAR', 'HOSTELER'] },

  // HOD authority scoping
  authorityScope: {
    yearTier: String,
    studentType: { type: String, enum: ['DAY_SCHOLAR', 'HOSTELER'] }
  },

  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema, 'users');
