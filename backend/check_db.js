const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Branch = require('./src/models/Branch');
  const YearTier = require('./src/models/YearTierMapping');
  const User = require('./src/models/User');
  const Student = require('./src/models/Student');

  console.log('=== BRANCHES ===');
  const branches = await Branch.find().lean();
  branches.forEach(b => console.log(b.code, b.name, b._id.toString()));

  console.log('=== YEAR TIERS ===');
  const tiers = await YearTier.find().lean();
  tiers.forEach(t => console.log(t.yearTier, t.label, t.years));

  console.log('=== USERS ===');
  const users = await User.find().populate('branchId').lean();
  users.forEach(u => console.log(u.username, '| Role:', u.role, '| Branch:', u.branchId ? u.branchId.name : 'N/A', '| Scope:', JSON.stringify(u.authorityScope || {})));

  console.log('=== STUDENT STATS ===');
  const students = await Student.find().lean();
  console.log('Total students:', students.length);
  const sample = students.slice(0, 5).map(s => ({ rollNo: s.rollNo, name: s.name, year: s.year, yearTier: s.yearTier, studentType: s.studentType }));
  console.log('Sample students:', sample);

  await mongoose.disconnect();
}
run();
