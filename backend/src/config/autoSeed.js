const bcrypt = require('bcrypt');
const User = require('../models/User');
const Branch = require('../models/Branch');
const OutpassRequest = require('../models/OutpassRequest');
const YearTierMapping = require('../models/YearTierMapping');
const AcademicSession = require('../models/AcademicSession');

const BRANCH_CONFIGS = [
  { code: '42', name: 'CSM' },
  { code: '43', name: 'CAI' },
  { code: '44', name: 'CSD' },
  { code: '45', name: 'AIDS' },
  { code: '46', name: 'CSC' }
];

async function autoSeedIfEmpty() {
  try {
    const requestCount = await OutpassRequest.countDocuments();
    const userCount = await User.countDocuments();

    if (requestCount > 10 && userCount > 5) {
      // Database is already populated
      return;
    }

    console.log('🌱 Database is empty or incomplete. Auto-seeding initial data...');

    // 1. Seed Branches
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

    // 2. Academic Session & Year Tier
    await AcademicSession.findOneAndUpdate(
      {},
      { currentSessionYear: 2026 },
      { upsert: true, new: true }
    );

    await YearTierMapping.findOneAndUpdate(
      { yearTier: 'TIER_4TH' },
      { yearTier: 'TIER_4TH', years: [4], label: '4th Year (Senior Tier)' },
      { upsert: true, new: true }
    );
    await YearTierMapping.findOneAndUpdate(
      { yearTier: 'TIER_1' },
      { yearTier: 'TIER_1', years: [1, 2, 3, 4], label: 'All Academic Years' },
      { upsert: true, new: true }
    );

    // 3. Admin & Security Users
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

    const secHash = await bcrypt.hash('security@123', 10);
    await User.findOneAndUpdate(
      { username: 'security' },
      {
        name: 'Campus Main Gate Security',
        username: 'security',
        passwordHash: secHash,
        role: 'SECURITY',
        isActive: true
      },
      { upsert: true, new: true }
    );

    const hostelHash = await bcrypt.hash('hostel@123', 10);
    await User.findOneAndUpdate(
      { username: 'hostel_incharge' },
      {
        name: 'Hostel Chief Warden',
        username: 'hostel_incharge',
        passwordHash: hostelHash,
        role: 'HOSTEL_INCHARGE',
        isActive: true
      },
      { upsert: true, new: true }
    );

    const hodHash = await bcrypt.hash('4KTHOD@123', 10);
    await User.findOneAndUpdate(
      { username: '4kthod' },
      {
        name: 'Head of Department (4th Year)',
        username: '4kthod',
        passwordHash: hodHash,
        role: 'HOD',
        authorityScope: { yearTier: 'TIER_4TH' },
        isActive: true
      },
      { upsert: true, new: true }
    );

    // CTPO for branches
    for (const b of BRANCH_CONFIGS) {
      const branchDoc = branchMap[b.code];
      const ctpoHash = await bcrypt.hash(`ctpo_${b.code}@123`, 10);
      await User.findOneAndUpdate(
        { username: `ctpo_${b.code.toLowerCase()}` },
        {
          name: `CTPO - ${b.name}`,
          username: `ctpo_${b.code.toLowerCase()}`,
          passwordHash: ctpoHash,
          role: 'CTPO',
          branchId: branchDoc._id,
          assignedYear: 4,
          isActive: true
        },
        { upsert: true, new: true }
      );
    }

    // 4. Ensure test students exist
    let students = await User.find({ role: 'STUDENT' });
    if (students.length === 0) {
      const studentHash = await bcrypt.hash('student123', 10);
      for (let i = 1; i <= 25; i++) {
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
          year: (i % 3) + 2,
          yearTier: 'TIER_4TH',
          studentType: i % 2 === 0 ? 'DAY_SCHOLAR' : 'HOSTELER',
          isActive: true
        });
      }
      students = await User.find({ role: 'STUDENT' });
    }

    // 5. Ensure permission requests exist
    if (requestCount === 0) {
      const requestTypes = ['OUTPASS', 'INTERNSHIP', 'MESS_FEE', 'LIBRARY'];
      const statuses = [
        'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED', 'APPROVED',
        'PENDING_CTPO', 'PENDING_HOD', 'PENDING_HOSTEL_INCHARGE',
        'REJECTED_CTPO', 'REJECTED'
      ];
      const reasonsMap = {
        OUTPASS: ['Home visit for weekend', 'Medical checkup', 'Family emergency', 'Bank official work'],
        INTERNSHIP: ['Summer Internship at Microsoft India', 'AI Research Fellowship', 'Software Engineering Internship'],
        MESS_FEE: ['Semester Mess Clearance', 'Hostel Fee Dues Settlement', 'Mess Refund Clearance'],
        LIBRARY: ['Book Clearance Certificate', 'Digital Resource Access Extension', 'Semester Reference Book Issue']
      };

      const now = new Date();
      const requestsToInsert = [];

      for (let i = 0; i < 160; i++) {
        const student = students[i % students.length];
        const branchId = student.branchId || branchList[i % branchList.length]._id;
        const type = requestTypes[i % requestTypes.length];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const reasonList = reasonsMap[type];
        const reason = reasonList[Math.floor(Math.random() * reasonList.length)];

        const daysAgo = Math.floor(Math.random() * 180);
        const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        const refPrefix = type === 'OUTPASS' ? 'OUT' : type === 'MESS_FEE' ? 'MSG' : type === 'INTERNSHIP' ? 'INT' : 'LIB';
        const referenceId = `${refPrefix}-${300000 + i}`;

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
      console.log(`✓ Auto-seeded ${requestsToInsert.length} permission requests into database!`);
    }

  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
}

module.exports = autoSeedIfEmpty;
