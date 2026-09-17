/**
 * seedTestAccounts.js
 * Creates test CTPO, HOD, Hostel In-charge, and Security accounts
 * + seeds default YearTierMapping for 4th year
 * Run: node backend/scripts/seedTestAccounts.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const Branch = require('../src/models/Branch');
const YearTierMapping = require('../src/models/YearTierMapping');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. Ensure default year tier mapping exists
  const existingTier = await YearTierMapping.findOne({ yearTier: 'TIER_4TH' });
  if (!existingTier) {
    await YearTierMapping.create({ yearTier: 'TIER_4TH', years: [4], label: '4th Year' });
    console.log('✅ Created YearTierMapping: TIER_4TH (Year 4)');
  } else {
    console.log('ℹ️  YearTierMapping TIER_4TH already exists');
  }

  // 2. Get branches
  const branches = await Branch.find();
  if (!branches.length) {
    console.error('❌ No branches found. Run seedStudents.js first.');
    process.exit(1);
  }

  const accounts = [];

  // 3. Create one CTPO per branch
  for (const branch of branches) {
    const username = `ctpo_${branch.code.toLowerCase()}`;
    const password = `ctpo_${branch.code}@123`;
    accounts.push({
      name: `CTPO - ${branch.name}`,
      username,
      password,
      role: 'CTPO',
      branchId: branch._id,
      displayBranch: branch.name
    });
  }

  // 4. HOD for Day Scholars (4th year)
  accounts.push({
    name: 'HOD - Day Scholar (4th Year)',
    username: 'hod_dayscholar',
    password: 'hod_ds@123',
    role: 'HOD',
    authorityScope: { yearTier: 'TIER_4TH', studentType: 'DAY_SCHOLAR' }
  });

  // 5. HOD for Hostelers (4th year)
  accounts.push({
    name: 'HOD - Hosteler (4th Year)',
    username: 'hod_hosteler',
    password: 'hod_hs@123',
    role: 'HOD',
    authorityScope: { yearTier: 'TIER_4TH', studentType: 'HOSTELER' }
  });

  // 6. Hostel In-charge
  accounts.push({
    name: 'Hostel In-charge',
    username: 'hostel_incharge',
    password: 'hostel@123',
    role: 'HOSTEL_INCHARGE'
  });

  // 7. Security
  accounts.push({
    name: 'Security Guard',
    username: 'security',
    password: 'security@123',
    role: 'SECURITY'
  });

  // 8. Create accounts
  let created = 0, skipped = 0;
  for (const acc of accounts) {
    const existing = await User.findOne({ username: acc.username });
    if (existing) {
      console.log(`  ℹ️  Skip (already exists): ${acc.username}`);
      skipped++;
      continue;
    }
    const passwordHash = await bcrypt.hash(acc.password, 10);
    await User.create({
      name: acc.name,
      username: acc.username,
      passwordHash,
      role: acc.role,
      ...(acc.branchId && { branchId: acc.branchId }),
      ...(acc.authorityScope && { authorityScope: acc.authorityScope }),
      isActive: true
    });
    console.log(`  ✅ Created: ${acc.username} / ${acc.password}  [${acc.role}${acc.displayBranch ? ' - ' + acc.displayBranch : ''}]`);
    created++;
  }

  console.log(`\n✅ Done — ${created} created, ${skipped} skipped`);
  console.log('\n─── Login Credentials ───────────────────────────────────');
  console.log('Admin:          admin          / admin123');
  console.log('Student:        25B21A4201     / 25B21A4201  (or any rollNo)');
  for (const branch of branches) {
    console.log(`CTPO (${branch.name}):  ctpo_${branch.code.toLowerCase()}  / ctpo_${branch.code}@123`);
  }
  console.log('HOD (Day Scholar): hod_dayscholar / hod_ds@123');
  console.log('HOD (Hosteler):    hod_hosteler   / hod_hs@123');
  console.log('Hostel In-charge:  hostel_incharge / hostel@123');
  console.log('Security:          security        / security@123');
  console.log('─────────────────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
