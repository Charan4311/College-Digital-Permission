require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Student = require('./src/models/Student');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({});
  const students = await Student.find({}).limit(5);
  console.log('USERS:', users.map(u => ({ username: u.username, role: u.role, active: u.isActive })));
  console.log('STUDENTS (first 5):', students.map(s => ({ rollNo: s.rollNo, name: s.name, active: s.isActive })));
  process.exit();
}
check();
