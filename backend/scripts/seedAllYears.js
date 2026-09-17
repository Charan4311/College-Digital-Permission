require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');

const User = require('../src/models/User');
const Branch = require('../src/models/Branch');
const YearTierMapping = require('../src/models/YearTierMapping');

const FILE_2ND_YEAR = path.join(__dirname, '../../2ND YEAR DATA.xlsx');
const FILE_3RD_YEAR = path.join(__dirname, '../../3RD YEAR DATA.xlsx');

const BRANCH_CODES = [
  { code: '42', name: 'CSM', sheet: '42-CSM' },
  { code: '43', name: 'CAI', sheet: '43-CAI' },
  { code: '44', name: 'CSD', sheet: '44-CSD' },
  { code: '45', name: 'AIDS', sheet: '45-AIDS' },
  { code: '46', name: 'CSC', sheet: '46-CSC' }
];

async function seedYear(yearNum, filePath, mainSheetName, hodCode, ctpoCodes) {
  console.log(`\n======================================================`);
  console.log(`   SEEDING ${yearNum}ND/RD YEAR DATA from ${path.basename(filePath)}`);
  console.log(`======================================================`);

  const tier = yearNum === 2 ? 'TIER_2ND' : 'TIER_3RD';

  // Ensure YearTierMapping
  await YearTierMapping.findOneAndUpdate(
    { yearTier: tier },
    { yearTier: tier, years: [yearNum], label: `${yearNum}nd/rd Year Only` },
    { upsert: true, returnDocument: 'after' }
  );
  console.log(`YearTierMapping configured for ${tier}`);

  // Fetch branches
  const branches = await Branch.find({ isActive: true });
  const branchMap = {};
  branches.forEach(b => {
    branchMap[b.code] = b;
    branchMap[b.name] = b;
  });

  // Seed HOD for this year
  const hodUsername = hodCode.toLowerCase();
  const hodPassHash = await bcrypt.hash(`${hodCode}@123`, 10);
  await User.findOneAndUpdate(
    { username: hodUsername },
    {
      name: `Head of Department (${yearNum}nd/rd Year - ${hodCode})`,
      username: hodUsername,
      passwordHash: hodPassHash,
      role: 'HOD',
      authorityScope: { yearTier: tier },
      isActive: true
    },
    { upsert: true, returnDocument: 'after' }
  );
  console.log(`HOD Seeded: ${hodUsername} / ${hodCode}@123 (Tier: ${tier})`);

  // Seed CTPOs for this year
  for (const b of BRANCH_CODES) {
    const branchDoc = branchMap[b.code];
    const facultyId = ctpoCodes[b.name];
    const ctpoUsername = facultyId.toLowerCase();
    const ctpoPassHash = await bcrypt.hash(`${facultyId}@123`, 10);

    // Primary username
    await User.findOneAndUpdate(
      { username: ctpoUsername },
      {
        name: `${yearNum}nd/rd Year ${b.name} CTPO (${facultyId})`,
        username: ctpoUsername,
        passwordHash: ctpoPassHash,
        role: 'CTPO',
        assignedYear: yearNum,
        branchId: branchDoc._id,
        isActive: true
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Also alias if facultyId has variant (e.g. 2ktaids vs 2ktaid)
    if (facultyId.endsWith('AID')) {
      await User.findOneAndUpdate(
        { username: `${facultyId.toLowerCase()}s` },
        {
          name: `${yearNum}nd/rd Year ${b.name} CTPO (${facultyId})`,
          username: `${facultyId.toLowerCase()}s`,
          passwordHash: ctpoPassHash,
          role: 'CTPO',
          assignedYear: yearNum,
          branchId: branchDoc._id,
          isActive: true
        },
        { upsert: true, returnDocument: 'after' }
      );
    }

    console.log(`CTPO Seeded: ${ctpoUsername} / ${facultyId}@123 (Branch: ${b.name}, Year: ${yearNum})`);
  }

  // Parse Excel sheets for students
  const workbook = xlsx.readFile(filePath);
  let yearStudents = 0;

  for (const b of BRANCH_CODES) {
    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[b.sheet]);
    if (!sheetData || sheetData.length === 0) {
      console.warn(`No data found in sheet ${b.sheet}`);
      continue;
    }

    const branchDoc = branchMap[b.code];
    const bulkOps = [];

    // Process in parallel batches of 25 for fast bcrypt hashing
    const BATCH_SIZE = 25;
    for (let i = 0; i < sheetData.length; i += BATCH_SIZE) {
      const slice = sheetData.slice(i, i + BATCH_SIZE);
      const batchPromises = slice.map(async (row, idx) => {
        const htno = (row.HTNO || '').toString().trim().toUpperCase();
        const name = (row.NAME || '').toString().trim();
        if (!htno) return null;

        const studentType = (i + idx) % 2 === 0 ? 'DAY_SCHOLAR' : 'HOSTELER';
        const passHash = await bcrypt.hash(htno, 10);

        return {
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
                year: yearNum,
                yearTier: tier,
                studentType,
                isActive: true
              }
            },
            upsert: true
          }
        };
      });

      const resolvedOps = (await Promise.all(batchPromises)).filter(Boolean);
      bulkOps.push(...resolvedOps);
    }

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps);
      console.log(`  - Upserted ${bulkOps.length} students for branch ${b.name} (${yearNum} Year)`);
      yearStudents += bulkOps.length;
    }
  }

  console.log(`Total ${yearNum} Year Students Seeded: ${yearStudents}`);
  return yearStudents;
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  // 2nd Year Config
  const ctpoCodes2nd = {
    CSM: '2KTCSM',
    CAI: '2KTCAI',
    CSD: '2KTCSD',
    AIDS: '2KTAID',
    CSC: '2KTCSC'
  };
  const count2 = await seedYear(2, FILE_2ND_YEAR, 'MAN DATA', '2KTHOD', ctpoCodes2nd);

  // 3rd Year Config
  const ctpoCodes3rd = {
    CSM: '3KTCSM',
    CAI: '3KTCAI',
    CSD: '3KTCSD',
    AIDS: '3KTAID',
    CSC: '3KTCSC'
  };
  const count3 = await seedYear(3, FILE_3RD_YEAR, 'MAIN DATA', '3KTHOD', ctpoCodes3rd);

  console.log('\n======================================================');
  console.log('   ALL YEARS SUCCESSFULLY SEEDED INTO MONGODB');
  console.log(`   - 2nd Year Students: ${count2}`);
  console.log(`   - 3rd Year Students: ${count3}`);
  console.log('======================================================\n');

  await mongoose.disconnect();
}

run().catch(e => {
  console.error('Fatal seeding error:', e);
  process.exit(1);
});
