/**
 * seedStudentTypes.js
 * Assigns DAY_SCHOLAR / HOSTELER to the first batch of students for testing
 * Run: node backend/scripts/seedStudentTypes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Student = require('../src/models/Student');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const students = await Student.find({ isActive: true }).sort({ rollNo: 1 }).limit(20);
  if (!students.length) {
    console.log('No students found. Run seedStudents.js first.');
    process.exit(1);
  }

  // Alternate: first 10 Day Scholars, next 10 Hostelers
  let dayScholarCount = 0, hostelerCount = 0;
  for (let i = 0; i < students.length; i++) {
    const studentType = i < 10 ? 'DAY_SCHOLAR' : 'HOSTELER';
    await Student.findByIdAndUpdate(students[i]._id, { studentType });
    console.log(`  ${studentType === 'DAY_SCHOLAR' ? '🏠' : '🏨'} ${students[i].rollNo} — ${studentType}`);
    if (studentType === 'DAY_SCHOLAR') dayScholarCount++;
    else hostelerCount++;
  }

  console.log(`\n✅ Done — ${dayScholarCount} Day Scholars, ${hostelerCount} Hostelers assigned`);
  console.log('Tip: Use Admin dashboard to bulk-assign more students.\n');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
