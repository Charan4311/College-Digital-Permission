require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');
const connectDB = require('../src/config/db');

const Branch = require('../src/models/Branch');
const Student = require('../src/models/Student');
const AcademicSession = require('../src/models/AcademicSession');
const YearTierMapping = require('../src/models/YearTierMapping');

const DEFAULT_BRANCHES = [
  { code: '42', name: 'CSM' },
  { code: '43', name: 'CAI' },
  { code: '44', name: 'CSD' },
  { code: '45', name: 'AIDS' },
  { code: '46', name: 'CSC' }
];

async function seedStudents(filePath) {
  if (!filePath) {
    console.error('Please provide a file path to the excel sheet.');
    process.exit(1);
  }

  await connectDB();

  try {
    // 1. Seed branches if not exist
    for (const b of DEFAULT_BRANCHES) {
      await Branch.findOneAndUpdate({ code: b.code }, b, { upsert: true, new: true });
    }

    // 2. Seed AcademicSession if not exist (set to 2026)
    let session = await AcademicSession.findOne();
    if (!session) {
      session = await AcademicSession.create({ currentSessionYear: 2026 });
    }

    // 3. Seed default YearTierMapping if not exist
    const tierCount = await YearTierMapping.countDocuments();
    if (tierCount === 0) {
      await YearTierMapping.create({
        yearTier: 'TIER_1',
        years: [1, 2, 3, 4], // Put all in one tier for now to make setup easy
        label: 'All Years'
      });
    }

    const branches = await Branch.find();
    const branchMap = {};
    branches.forEach(b => branchMap[b.code] = b._id);

    const yearTiers = await YearTierMapping.find();
    
    const getYearTier = (year) => {
      const mapping = yearTiers.find(t => t.years.includes(year));
      return mapping ? mapping.yearTier : 'TIER_UNKNOWN';
    };

    console.log(`Reading Excel file: ${filePath}`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let created = 0;
    let skipped = 0;
    let unmappedBranch = 0;

    for (const row of data) {
      const rollNo = String(row['HTNO'] || '').trim();
      const name = String(row['NAME'] || '').trim();

      if (!rollNo || !name) continue;

      const admissionYearStr = rollNo.slice(0, 2);
      const branchCode = rollNo.slice(6, 8);
      
      const admissionYear = parseInt(admissionYearStr) + 2000;
      const year = session.currentSessionYear - admissionYear + 1;
      const yearTier = getYearTier(year);
      const branchId = branchMap[branchCode];

      if (!branchId) {
        console.warn(`Unrecognized branch code ${branchCode} for rollNo ${rollNo}`);
        unmappedBranch++;
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(rollNo, 10);
        await Student.create({
          rollNo,
          name,
          passwordHash,
          branchId,
          year,
          yearTier
        });
        created++;
      } catch (err) {
        if (err.code === 11000) {
          skipped++;
        } else {
          console.error(`Error creating student ${rollNo}:`, err.message);
        }
      }
    }

    console.log('\n--- Seeding Summary ---');
    console.log(`Total rows processed: ${created + skipped + unmappedBranch}`);
    console.log(`Students created: ${created}`);
    console.log(`Duplicates skipped: ${skipped}`);
    console.log(`Unmapped branch skips: ${unmappedBranch}`);
    
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

const filePath = process.argv[2];
seedStudents(filePath);
