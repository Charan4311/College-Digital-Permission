require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../src/models/User');
const Student = require('../src/models/Student');
const Branch = require('../src/models/Branch');
const YearTierMapping = require('../src/models/YearTierMapping');
const AcademicSession = require('../src/models/AcademicSession');

const DEFAULT_BRANCHES = [
  { code: '42', name: 'CSM', isActive: true },
  { code: '43', name: 'CAI', isActive: true },
  { code: '44', name: 'CSD', isActive: true },
  { code: '45', name: 'AIDS', isActive: true },
  { code: '46', name: 'CSC', isActive: true }
];

async function seedAll() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Seed Branches
  const branchMap = {};
  for (const b of DEFAULT_BRANCHES) {
    const branchDoc = await Branch.findOneAndUpdate(
      { code: b.code },
      { code: b.code, name: b.name, isActive: true },
      { upsert: true, new: true }
    );
    branchMap[b.code] = branchDoc;
    console.log(`Branch ready: ${b.code} - ${b.name}`);
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
    { yearTier: 'TIER_1' },
    { yearTier: 'TIER_1', years: [1, 2, 3, 4], label: 'All Years (T-1)' },
    { upsert: true, new: true }
  );
  await YearTierMapping.findOneAndUpdate(
    { yearTier: 'TIER_4TH' },
    { yearTier: 'TIER_4TH', years: [4], label: '4th Year Only' },
    { upsert: true, new: true }
  );
  console.log('YearTierMappings configured (TIER_1 and TIER_4TH)');

  // 4. Seed Admin
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await User.findOneAndUpdate(
    { username: 'admin' },
    {
      name: 'System Administrator',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('Admin account ready: admin / admin123');

  // 5. Seed CTPOs for each branch
  for (const b of DEFAULT_BRANCHES) {
    const branchDoc = branchMap[b.code];
    const ctpoPassHash = await bcrypt.hash(`ctpo_${b.code}@123`, 10);

    // Primary: ctpo_42, ctpo_43, etc.
    await User.findOneAndUpdate(
      { username: `ctpo_${b.code}` },
      {
        name: `CTPO - ${b.name}`,
        username: `ctpo_${b.code}`,
        passwordHash: ctpoPassHash,
        role: 'CTPO',
        branchId: branchDoc._id,
        isActive: true
      },
      { upsert: true, new: true }
    );

    // Also alias: ctpo_csm, ctpo_cai, etc. for ease of use
    const aliasUsername = `ctpo_${b.name.toLowerCase()}`;
    await User.findOneAndUpdate(
      { username: aliasUsername },
      {
        name: `CTPO - ${b.name}`,
        username: aliasUsername,
        passwordHash: ctpoPassHash,
        role: 'CTPO',
        branchId: branchDoc._id,
        isActive: true
      },
      { upsert: true, new: true }
    );
  }
  console.log('CTPO accounts ready for all branches (e.g. ctpo_42 / ctpo_42@123)');

  // 6. Seed HODs scoped to TIER_1 (which our students belong to)
  const hodDsHash = await bcrypt.hash('hod_ds@123', 10);
  const hodHsHash = await bcrypt.hash('hod_hs@123', 10);

  await User.findOneAndUpdate(
    { username: 'hod_dayscholar' },
    {
      name: 'HOD - Day Scholar In-charge',
      username: 'hod_dayscholar',
      passwordHash: hodDsHash,
      role: 'HOD',
      authorityScope: { yearTier: 'TIER_1', studentType: 'DAY_SCHOLAR' },
      isActive: true
    },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { username: 'hod_hosteler' },
    {
      name: 'HOD - Hosteler In-charge',
      username: 'hod_hosteler',
      passwordHash: hodHsHash,
      role: 'HOD',
      authorityScope: { yearTier: 'TIER_1', studentType: 'HOSTELER' },
      isActive: true
    },
    { upsert: true, new: true }
  );

  // Also support hod_ds_tier1 alias
  await User.findOneAndUpdate(
    { username: 'hod_ds_tier1' },
    {
      name: 'HOD - Day Scholar (Tier 1)',
      username: 'hod_ds_tier1',
      passwordHash: hodDsHash,
      role: 'HOD',
      authorityScope: { yearTier: 'TIER_1', studentType: 'DAY_SCHOLAR' },
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('HOD accounts ready (hod_dayscholar and hod_hosteler)');

  // 7. Seed Hostel In-charge
  const hostelPassHash = await bcrypt.hash('hostel@123', 10);
  await User.findOneAndUpdate(
    { username: 'hostel_incharge' },
    {
      name: 'Hostel Chief Warden',
      username: 'hostel_incharge',
      passwordHash: hostelPassHash,
      role: 'HOSTEL_INCHARGE',
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('Hostel In-charge ready: hostel_incharge / hostel@123');

  // 8. Seed Security
  const securityPassHash = await bcrypt.hash('security@123', 10);
  await User.findOneAndUpdate(
    { username: 'security' },
    {
      name: 'Main Gate Security Officer',
      username: 'security',
      passwordHash: securityPassHash,
      role: 'SECURITY',
      isActive: true
    },
    { upsert: true, new: true }
  );
  console.log('Security guard ready: security / security@123');

  // 9. Assign studentType to ALL existing students in the database
  const allStudents = await Student.find();
  console.log(`Processing ${allStudents.length} students in DB...`);

  let dsCount = 0;
  let hsCount = 0;

  for (let i = 0; i < allStudents.length; i++) {
    const student = allStudents[i];
    // Explicit test accounts:
    let stType;
    if (student.rollNo === '25B21A4201' || student.rollNo === '25B21A4301') {
      stType = 'DAY_SCHOLAR';
    } else if (student.rollNo === '25B21A4202' || student.rollNo === '25B21A4302') {
      stType = 'HOSTELER';
    } else {
      // 50% Day Scholar, 50% Hosteler
      stType = i % 2 === 0 ? 'DAY_SCHOLAR' : 'HOSTELER';
    }

    // Ensure password hash is valid bcrypt of rollNo
    const passHash = await bcrypt.hash(student.rollNo, 10);

    await Student.findByIdAndUpdate(student._id, {
      studentType: stType,
      yearTier: 'TIER_1',
      isActive: true,
      passwordHash: passHash
    });

    if (stType === 'DAY_SCHOLAR') dsCount++;
    else hsCount++;
  }

  console.log(`Assigned student types to all ${allStudents.length} students:`);
  console.log(`  - Day Scholars: ${dsCount}`);
  console.log(`  - Hostelers: ${hsCount}`);

  console.log('\n======================================================');
  console.log('   ALL LOGINS & SYSTEM ACCOUNTS FULLY SEEDED');
  console.log('======================================================');
  console.log('ADMIN:');
  console.log('  Username: admin           | Password: admin123');
  console.log('\nSTUDENTS (Sample logins - password is roll number):');
  console.log('  Day Scholar: 25B21A4201   | Password: 25B21A4201  (CSM Branch)');
  console.log('  Hosteler:    25B21A4202   | Password: 25B21A4202  (CSM Branch)');
  console.log('  Day Scholar: 25B21A4301   | Password: 25B21A4301  (CAI Branch)');
  console.log('  Hosteler:    25B21A4302   | Password: 25B21A4302  (CAI Branch)');
  console.log('\nCTPO (Branch Approvers):');
  console.log('  CSM:  ctpo_42 (or ctpo_csm)   | Password: ctpo_42@123');
  console.log('  CAI:  ctpo_43 (or ctpo_cai)   | Password: ctpo_43@123');
  console.log('  CSD:  ctpo_44 (or ctpo_csd)   | Password: ctpo_44@123');
  console.log('  AIDS: ctpo_45 (or ctpo_aids)  | Password: ctpo_45@123');
  console.log('  CSC:  ctpo_46 (or ctpo_csc)   | Password: ctpo_46@123');
  console.log('\nHOD (Tier Approvers):');
  console.log('  Day Scholar HOD: hod_dayscholar | Password: hod_ds@123');
  console.log('  Hosteler HOD:    hod_hosteler   | Password: hod_hs@123');
  console.log('\nHOSTEL IN-CHARGE:');
  console.log('  Chief Warden: hostel_incharge   | Password: hostel@123');
  console.log('\nSECURITY:');
  console.log('  Gate Scanner: security          | Password: security@123');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seedAll().catch(e => {
  console.error('Seeding error:', e);
  process.exit(1);
});
