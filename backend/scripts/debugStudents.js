require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Student = require('../src/models/Student');

async function debug() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);

  const filterWithRoll = { role: 'STUDENT', rollNo: { $exists: true, $ne: '' } };
  const filterJustRole = { role: 'STUDENT' };

  const countUserRoll = await User.countDocuments(filterWithRoll);
  const countUserRole = await User.countDocuments(filterJustRole);
  const countStudentRoll = await Student.countDocuments(filterWithRoll);

  console.log('Count User with rollNo filter:', countUserRoll);
  console.log('Count User with just role filter:', countUserRole);
  console.log('Count Student with rollNo filter:', countStudentRoll);

  const sample = await User.find(filterJustRole).limit(5);
  console.log('\nSample 5 students:');
  sample.forEach(s => {
    console.log(`- rollNo: "${s.rollNo}", name: "${s.name}", year: ${s.year}, branchId: ${s.branchId}`);
  });

  process.exit(0);
}

debug().catch(e => { console.error(e); process.exit(1); });
