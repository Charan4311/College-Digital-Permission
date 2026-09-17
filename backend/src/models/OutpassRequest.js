const mongoose = require('mongoose');

const outpassRequestSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ['OUTPASS', 'MESS_FEE', 'INTERNSHIP', 'LIBRARY'],
    default: 'OUTPASS',
    index: true
  },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
  year: { type: Number, default: 4, index: true },
  yearTier: { type: String, default: 'TIER_4TH' },
  studentType: { type: String, enum: ['DAY_SCHOLAR', 'HOSTELER'], default: 'DAY_SCHOLAR' },

  referenceId: { type: String, unique: true, sparse: true },
  emergencyContact: { type: String },

  // General Purpose / Reason
  reason: { type: String, required: true },

  // 1. Outpass Specific Fields
  outDate: { type: Date },
  outTime: { type: String },
  expectedReturnDate: { type: Date },
  expectedReturnTime: { type: String },

  // 2. Mess Fee Clearance Specific Fields
  startDate: { type: Date },
  endDate: { type: Date },
  messAmount: { type: Number },
  paidStatus: {
    type: String,
    enum: ['PAID', 'PARTIALLY_PAID', 'NOT_PAID', 'Paid', 'Partially Paid', 'Not Paid'],
    default: 'Paid'
  },

  // 3. Internship Specific Fields
  companyName: { type: String },
  companyLocation: { type: String },
  role: { type: String },
  internshipMode: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'HYBRID', 'Online', 'Offline', 'Hybrid'],
    default: 'Offline'
  },

  // 4. Library Specific Fields
  requestDate: { type: Date, default: Date.now },

  // Document Attachment (Mess Receipt, Internship Offer Letter, etc.)
  documentUrl: { type: String },
  documentName: { type: String },

  // Status Lifecycle
  status: {
    type: String,
    enum: [
      'PENDING_CTPO', 'REJECTED_CTPO',
      'PENDING_HOD', 'REJECTED_HOD',
      'PENDING_HOSTEL_INCHARGE', 'REJECTED_HOSTEL_INCHARGE',
      'PENDING_PLACEMENT_OFFICER', 'REJECTED_PLACEMENT_OFFICER',
      'APPROVED', 'CLEARED',
      'ISSUED',
      'REJECTED',
      'USED',
      'CANCELLED'
    ],
    default: 'PENDING_CTPO',
    index: true
  },
  currentApproverRole: { type: String, default: 'CTPO' },

  // Rejection Tracking
  rejectionReason: { type: String },
  rejectedByRole: { type: String },
  resubmitCount: { type: Number, default: 0 },

  // Digital Ticket Token / Verification Code
  qrToken: { type: String, index: true }
}, { timestamps: true });

module.exports = mongoose.model('OutpassRequest', outpassRequestSchema);
