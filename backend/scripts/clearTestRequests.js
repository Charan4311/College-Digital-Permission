require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const OutpassRequest = require('../src/models/OutpassRequest');
const ApprovalStep = require('../src/models/ApprovalStep');
const QRPass = require('../src/models/QRPass');

async function clearRequests() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const deletedOutpasses = await OutpassRequest.deleteMany({});
  const deletedSteps = await ApprovalStep.deleteMany({});
  const deletedQR = await QRPass.deleteMany({});

  console.log(`Cleared:`);
  console.log(`  - Outpass requests deleted: ${deletedOutpasses.deletedCount}`);
  console.log(`  - Approval steps deleted:   ${deletedSteps.deletedCount}`);
  console.log(`  - QR passes deleted:        ${deletedQR.deletedCount}`);
  console.log('\nAll out-pass history is now clean and empty for all students.');

  await mongoose.disconnect();
}

clearRequests().catch(e => {
  console.error(e);
  process.exit(1);
});
