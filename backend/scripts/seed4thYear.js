require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');

const User = require('../src/models/User');
const Branch = require('../src/models/Branch');
const YearTierMapping = require('../src/models/YearTierMapping');
const AcademicSession = require('../src/models/AcademicSession');

const EXCEL_PATH = path.join(__dirname, '../../4TH YEAR DATA.xlsx');

const BRANCH_CONFIGS = [
  { code: '42', name: 'CSM', sheet: '42-CSM', facultyId: '4KTCSM' },
  { code: '43', name: 'CAI', sheet: '43-CAI', facultyId: '4KTCAI' },
  { code: '44', name: 'CSD', sheet: '44-CSD', facultyId: '4KTCSD' },
  { code: '45', name: 'AIDS', sheet: '45-AIDS', facultyId: '4KTAIDS' },
  { code: '46', name: 'CSC', sheet: '46-CSC', facultyId: '4KTCSC' }
];

async function seed4thYear() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB successfully.');

  // 1. Seed Branches
  const branchMap = {};
  for (const b of BRANCH_CONFIGS) {
    const doc = await Branch.findOneAndUpdate(
      { code: b.code },
      { code: b.code, name: b.name, isActive: true },
      { upsert: true, new: true }
    );
    branchMap[b.code] = doc;
    branchMap[b.name] = doc;
    console.log(`Branch ensured: [${b.code}] ${b.name} (${doc._id})`);
  }

  // 2. Seed Academic Session
  await AcademicSession.findOneAndUpdate(
    {},
    { currentSessionYear: 2026 },
    { upsert: true, new: true }
  );
  console.log('AcademicSession set to 2026');

  // 3. Seed Year Tier Mappings
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
  console.log('YearTierMappings configured for TIER_4TH and TIER_1');

  // 4. Seed Admin
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
  console.log('Admin ready: admin / admin123');

  // 5. Seed Security
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
  console.log('Security ready: security / security@123');

  // 6. Seed Hostel Incharge
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
  console.log('Hostel In-charge ready: hostel_incharge / hostel@123');

  // 7. Seed HOD (4KTHOD from Excel sheet main data)
  const hodHash = await bcrypt.hash('4KTHOD@123', 10);
  await User.findOneAndUpdate(
    { username: '4kthod' },
    {
      name: 'Head of Department (4th Year)',
      username: '4kthod',
      passwordHash: hodHash,
      role: 'HOD',
      authorityScope: { yearTier: 'TIER_4TH' }, // approves both Day Scholars and Hostelers for 4th Year
      isActive: true
    },
    { upsert: true, new: true }
  );
  // Also provide standard aliases
  await User.findOneAndUpdate(
    { username: 'hod_dayscholar' },
    {
      name: 'HOD - Day Scholar In-charge',
      username: 'hod_dayscholar',
      passwordHash: hodHash,
      role: 'HOD',
      authorityScope: { yearTier: 'TIER_4TH', studentType: 'DAY_SCHOLAR' },
      isActive: true
    },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { username: 'hod_hosteler' },
    {
      name: 'HOD - Hosteler In-charge',
      username: 'hod_hosteler',
      passwordHash: hodHash,
      role: 'HOD',
      authorityScope: { yearTier: 'TIER_4TH', studentType: 'HOSTELER' },
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('HOD accounts ready: 4kthod / 4KTHOD@123, hod_dayscholar, hod_hosteler');

  // 8. Seed CTPOs for 4th Year Branches (from main data sheet)
  for (const b of BRANCH_CONFIGS) {
    const branchDoc = branchMap[b.code];
    const ctpoPassHash = await bcrypt.hash(`${b.facultyId}@123`, 10);

    // Primary username: 4ktcsm, 4ktcai, etc. (lowercased facultyId)
    const primaryUser = b.facultyId.toLowerCase();
    await User.findOneAndUpdate(
      { username: primaryUser },
      {
        name: `4th Year ${b.name} CTPO (${b.facultyId})`,
        username: primaryUser,
        passwordHash: ctpoPassHash,
        role: 'CTPO',
        assignedYear: 4,
        branchId: branchDoc._id,
        isActive: true
      },
      { upsert: true, new: true }
    );

    // Secondary aliases: ctpo_42, ctpo_csm
    await User.findOneAndUpdate(
      { username: `ctpo_${b.code}` },
      {
        name: `4th Year ${b.name} CTPO`,
        username: `ctpo_${b.code}`,
        passwordHash: ctpoPassHash,
        role: 'CTPO',
        assignedYear: 4,
        branchId: branchDoc._id,
        isActive: true
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { username: `ctpo_${b.name.toLowerCase()}` },
      {
        name: `4th Year ${b.name} CTPO`,
        username: `ctpo_${b.name.toLowerCase()}`,
        passwordHash: ctpoPassHash,
        role: 'CTPO',
        assignedYear: 4,
        branchId: branchDoc._id,
        isActive: true
      },
      { upsert: true, new: true }
    );

    console.log(`CTPO seeded for ${b.name}: ${primaryUser} / ${b.facultyId}@123 (branchId: ${branchDoc._id}, assignedYear: 4)`);
  }

  // 9. Read Excel and Seed 4th Year Students into `User` Collection
  console.log(`Reading Excel file from: ${EXCEL_PATH}`);
  const workbook = xlsx.readFile(EXCEL_PATH);

  let totalStudents = 0;
  let dsCount = 0;
  let hsCount = 0;

  for (const b of BRANCH_CONFIGS) {
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[b.sheet]);
    console.log(`Processing sheet ${b.sheet}: ${sheetData.length} records...`);
    const branchDoc = branchMap[b.code];

    const bulkOps = [];
    for (let i = 0; i < sheetData.length; i++) {
      const row = sheetData[i];
      const htno = (row.HTNO || '').toString().trim().toUpperCase();
      const name = (row.NAME || '').toString().trim();

      if (!htno) continue;

      // Determine studentType:
      let studentType;
      if (htno === '23B21A4268') {
        studentType = 'DAY_SCHOLAR';
      } else if (htno === '23B21A4311') {
        studentType = 'HOSTELER';
      } else {
        studentType = i % 2 === 0 ? 'DAY_SCHOLAR' : 'HOSTELER';
      }

      if (studentType === 'DAY_SCHOLAR') dsCount++;
      else hsCount++;

      // Hash password (the roll number)
      const passHash = await bcrypt.hash(htno, 10);

      bulkOps.push({
        updateOne: {
          filter: { $or: [{ username: htno.toLowerCase() }, { rollNo: htno }] },
          update: {
            $set: {
              name: name || `Student ${htno}`,
              username: htno.toLowerCase(),
              rollNo: htno,
              passwordHash: passHash,
              role: 'STUDENT',
              branchId: branchDoc._id,
              year: 4,
              yearTier: 'TIER_4TH',
              studentType,
              isActive: true
            }
          },
          upsert: true
        }
      });
      totalStudents++;
    }

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps);
      console.log(`Successfully upserted ${bulkOps.length} students for branch ${b.name}`);
    }
  }

  console.log('\n======================================================');
  console.log('   4TH YEAR SEEDING COMPLETED SUCCESSFULLY');
  console.log('======================================================');
  console.log(`Total 4th Year Students in 'users' collection: ${totalStudents}`);
  console.log(`  - Day Scholars: ${dsCount}`);
  console.log(`  - Hostelers:    ${hsCount}`);
  console.log('\n--- SAMPLE TEST LOGINS ---');
  console.log('STUDENT (Day Scholar - CSM):');
  console.log('  Roll No / Username: 23B21A4268 | Password: 23B21A4268');
  console.log('STUDENT (Hosteler - CAI):');
  console.log('  Roll No / Username: 23B21A4311 | Password: 23B21A4311');
  console.log('\nCTPO (Branch-wise 4th Year):');
  console.log('  CSM:  4ktcsm   | Password: 4KTCSM@123');
  console.log('  CAI:  4ktcai   | Password: 4KTCAI@123');
  console.log('  CSD:  4ktcsd   | Password: 4KTCSD@123');
  console.log('  AIDS: 4ktaids  | Password: 4KTAIDS@123');
  console.log('  CSC:  4ktcsc   | Password: 4KTCSC@123');
  console.log('\nHOD (4th Year):');
  console.log('  4kthod        | Password: 4KTHOD@123');
  console.log('\nHOSTEL IN-CHARGE:');
  console.log('  hostel_incharge | Password: hostel@123');
  console.log('\nSECURITY:');
  console.log('  security      | Password: security@123');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seed4thYear().catch(err => {
  console.error('Fatal error during 4th year seeding:', err);
  process.exit(1);
});
