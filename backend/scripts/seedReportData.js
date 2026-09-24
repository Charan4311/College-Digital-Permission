require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const Branch = require('../src/models/Branch');
const OutpassRequest = require('../src/models/OutpassRequest');

const BRANCH_CONFIGS = [
  { code: '42', name: 'CSM' },
  { code: '43', name: 'CAI' },
  { code: '44', name: 'CSD' },
  { code: '45', name: 'AIDS' },
  { code: '46', name: 'CSC' }
];

async function seedReportData() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college-digital-permission';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB for report seeding...');

    // 1. Ensure branches
    const branchMap = {};
    for (const b of BRANCH_CONFIGS) {
      let doc = await Branch.findOne({ code: b.code });
      if (!doc) {
        doc = await Branch.create({ code: b.code, name: b.name, isActive: true });
      }
      branchMap[b.code] = doc;
      branchMap[b.name] = doc;
    }
    const branchList = Object.values(branchMap);

    // 2. Ensure admin account
    const adminHash = await bcrypt.hash('admin123', 10);
    await User.findOneAndUpdate(
      { username: 'admin' },
      {
        name: 'System Administrator',
        username: 'admin',
        passwordHash: adminHash,
        role: 'ADMIN',
        isActive: true
      },
      { upsert: true, new: true }
    );

    // 3. Ensure some student users exist
    let students = await User.find({ role: 'STUDENT' });
    if (students.length === 0) {
      console.log('No students found in DB. Creating 20 test students...');
      const studentHash = await bcrypt.hash('student123', 10);
      for (let i = 1; i <= 20; i++) {
        const rollNo = `23B21A420${i < 10 ? '0' + i : i}`;
        const branchCode = BRANCH_CONFIGS[i % BRANCH_CONFIGS.length].code;
        const branchDoc = branchMap[branchCode];
        await User.create({
          name: `Student User ${i}`,
          username: rollNo.toLowerCase(),
          rollNo: rollNo,
          passwordHash: studentHash,
          role: 'STUDENT',
          branchId: branchDoc._id,
          year: (i % 3) + 2, // Years 2, 3, 4
          yearTier: 'TIER_4TH',
          studentType: i % 2 === 0 ? 'DAY_SCHOLAR' : 'HOSTELER',
          isActive: true
        });
      }
      students = await User.find({ role: 'STUDENT' });
    }

    // 4. Seed OutpassRequests if count is low
    const existingCount = await OutpassRequest.countDocuments();
    console.log(`Current OutpassRequest count: ${existingCount}`);

    if (existingCount < 30) {
      console.log('Seeding ~180 permission requests spread over past dates for analytics dashboard...');
      
      const requestTypes = ['OUTPASS', 'INTERNSHIP', 'MESS_FEE', 'LIBRARY'];
      
      // Approved: ~60%, Pending: ~25%, Rejected: ~15%
      const statuses = [
        'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED',
        'PENDING_CTPO', 'PENDING_HOD', 'PENDING_HOSTEL_INCHARGE',
        'REJECTED_CTPO', 'REJECTED'
      ];

      const reasonsMap = {
        OUTPASS: ['Home visit for weekend', 'Medical checkup', 'Family emergency', 'Bank official work', 'Personal errand outside campus'],
        INTERNSHIP: ['Summer Internship at Microsoft India', 'AI Research Fellowship', 'Software Engineering Internship', 'Data Science Onsite Training'],
        MESS_FEE: ['Semester Mess Clearance', 'Hostel Fee Dues Settlement', 'Mess Refund Voucher Clearance'],
        LIBRARY: ['Book Clearance Certificate', 'Digital Resource Access Extension', 'Semester Exam Reference Book Issue']
      };

      const now = new Date();
      const requestsToInsert = [];

      for (let i = 0; i < 180; i++) {
        const student = students[i % students.length];
        const branchId = student.branchId || branchList[i % branchList.length]._id;
        const type = requestTypes[i % requestTypes.length];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const reasonList = reasonsMap[type];
        const reason = reasonList[Math.floor(Math.random() * reasonList.length)];

        // Spread dates: 0 to 180 days ago
        const daysAgo = Math.floor(Math.random() * 180);
        const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        
        const refPrefix = type === 'OUTPASS' ? 'OUT' : type === 'MESS_FEE' ? 'MSG' : type === 'INTERNSHIP' ? 'INT' : 'LIB';
        const referenceId = `${refPrefix}-${200000 + i}`;

        requestsToInsert.push({
          requestType: type,
          studentId: student._id,
          branchId: branchId,
          year: student.year || 4,
          yearTier: student.yearTier || 'TIER_4TH',
          studentType: student.studentType || (i % 2 === 0 ? 'DAY_SCHOLAR' : 'HOSTELER'),
          referenceId,
          reason,
          emergencyContact: '9876543210',
          outDate: createdAt,
          expectedReturnDate: new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000),
          companyName: type === 'INTERNSHIP' ? 'Tech Solutions Inc' : undefined,
          companyLocation: type === 'INTERNSHIP' ? 'Hyderabad' : undefined,
          messAmount: type === 'MESS_FEE' ? 5400 : undefined,
          status,
          createdAt,
          updatedAt: createdAt
        });
      }

      await OutpassRequest.insertMany(requestsToInsert);
      console.log(`✓ Inserted ${requestsToInsert.length} permission requests into database!`);
    } else {
      console.log('Database already has sufficient permission requests.');
    }

  } catch (err) {
    console.error('Error seeding report data:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedReportData();
