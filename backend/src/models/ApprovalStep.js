const mongoose = require('mongoose');

const approvalStepSchema = new mongoose.Schema({
  requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'OutpassRequest', required: true },
  role: { type: String, enum: ['CTPO', 'HOD', 'HOSTEL_INCHARGE', 'PLACEMENT_OFFICER', 'STUDENT'], required: true },
  approverUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  decision: { type: String, enum: ['APPROVED', 'REJECTED', 'RESUBMITTED'], required: true },
  remarks: String,
  decidedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ApprovalStep', approvalStepSchema);
