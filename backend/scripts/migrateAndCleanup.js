require('dotenv').config();
const mongoose = require('mongoose');
const OutpassRequest = require('../src/models/OutpassRequest');
const QRPass = require('../src/models/QRPass');
const User = require('../src/models/User');
const { generateUniqueShortCode } = require('../src/utils/passCode');

async function runMigration() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college-digital-permission';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected for migration.');

    const allRequests = await OutpassRequest.find();
    console.log(`Total requests in DB: ${allRequests.length}`);

    let invalidDatesCount = 0;
    for (const req of allRequests) {
      let modified = false;

      if (!req.reason || !String(req.reason).trim()) {
        req.reason = req.requestType === 'INTERNSHIP' ? 'Internship at Tech Company' : 'Academic Permission';
        modified = true;
      }

      const datesToCheck = [
        { name: 'createdAt', date: req.createdAt },
        { name: 'startDate', date: req.startDate },
        { name: 'endDate', date: req.endDate },
        { name: 'outDate', date: req.outDate },
        { name: 'expectedReturnDate', date: req.expectedReturnDate }
      ];

      for (const d of datesToCheck) {
        if (d.date) {
          const yr = new Date(d.date).getFullYear();
          if (isNaN(yr) || yr < 2000 || yr > 2100) {
            console.warn(`[CORRUPTED DATE] Request ${req._id} (${req.requestType}) has invalid ${d.name}: ${d.date} (Year: ${yr})`);
            invalidDatesCount++;
            const corrected = new Date();
            corrected.setFullYear(2026);
            req[d.name] = corrected;
            modified = true;
          }
        }
      }

      if (!req.referenceId || req.referenceId.startsWith('PERM-')) {
        const yr = new Date(req.createdAt || Date.now()).getFullYear();
        const rand = Math.floor(100000 + Math.random() * 900000);
        req.referenceId = `KDP-${yr}-${rand}`;
        modified = true;
      }

      if (modified) {
        await OutpassRequest.updateOne({ _id: req._id }, { $set: req.toObject() });
      }
    }
    console.log(`Fixed ${invalidDatesCount} corrupted date entries.`);

    // 2. Generate shortCode for QR passes and OutpassRequests
    const passes = await QRPass.find();
    let passCount = 0;
    for (const pass of passes) {
      if (!pass.shortCode) {
        const code = await generateUniqueShortCode();
        pass.shortCode = code;
        await pass.save();
        await OutpassRequest.updateOne({ _id: pass.requestId }, { $set: { shortCode: code } });
        passCount++;
      }
    }
    console.log(`Updated ${passCount} QR passes with short codes.`);

    console.log('✅ Migration and cleanup completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
