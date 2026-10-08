const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });
const User = require('../src/models/User');
const OutpassRequest = require('../src/models/OutpassRequest');

async function verify() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Fetch hosteler user IDs
  const hostelers = await User.find({
    role: 'STUDENT',
    $or: [
      { residenceType: { $in: ['hosteler', 'HOSTELER'] } },
      { studentType: { $in: ['hosteler', 'HOSTELER', 'Hosteler'] } }
    ]
  }).select('_id');
  const hostelerIds = hostelers.map(u => u._id);
  console.log(`Total hosteler students found: ${hostelerIds.length}`);

  // Match ONLY OUTPASS requests from hostelers
  const matchFilter = {
    studentId: { $in: hostelerIds },
    requestType: 'OUTPASS'
  };

  const reqs = await OutpassRequest.find(matchFilter);
  const statuses = {};
  reqs.forEach(r => {
    statuses[r.status] = (statuses[r.status] || 0) + 1;
  });
  console.log('All Hosteler OUTPASS requests breakdown:', statuses);

  // Reached Hostel Incharge for OUTPASS:
  // 1. Pending at Hostel: PENDING_HOSTEL_INCHARGE
  // 2. Approved/Issued: ISSUED, APPROVED, CLEARED, USED
  // 3. Rejected by Hostel: REJECTED_HOSTEL_INCHARGE or rejected with rejectedByRole === 'HOSTEL_INCHARGE'
  const reachedPending = await OutpassRequest.countDocuments({
    ...matchFilter,
    status: 'PENDING_HOSTEL_INCHARGE'
  });
  const reachedApproved = await OutpassRequest.countDocuments({
    ...matchFilter,
    status: { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] }
  });
  const reachedRejected = await OutpassRequest.countDocuments({
    ...matchFilter,
    $or: [
      { status: 'REJECTED_HOSTEL_INCHARGE' },
      { status: { $in: ['REJECTED', 'CANCELLED'] }, rejectedByRole: { $in: ['HOSTEL_INCHARGE', 'HOSTEL', 'hostel_incharge'] } },
      { status: { $regex: /^REJECTED_HOSTEL/i } }
    ]
  });

  const reachedTotal = reachedPending + reachedApproved + reachedRejected;

  console.log('\n--- HOSTEL IN-CHARGE STATS (OUTPASS ONLY) ---');
  console.log(`TOTAL:    ${reachedTotal}`);
  console.log(`APPROVED: ${reachedApproved}`);
  console.log(`PENDING:  ${reachedPending}`);
  console.log(`REJECTED: ${reachedRejected}`);
  console.log(`Check sum: ${reachedApproved} + ${reachedPending} + ${reachedRejected} = ${reachedApproved + reachedPending + reachedRejected}`);

  await mongoose.disconnect();
}

verify().catch(console.error);
