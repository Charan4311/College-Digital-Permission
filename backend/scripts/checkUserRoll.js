require('dotenv').config();
const mongoose = require('mongoose');

async function testUserLookup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const User = db.collection('users');

    const roll = '23B21A4227';
    const u = await User.findOne({
      $or: [
        { username: roll },
        { username: roll.toLowerCase() },
        { username: roll.toUpperCase() },
        { rollNo: roll.toUpperCase() },
        { rollNo: roll }
      ]
    });

    console.log('User found for 23B21A4227:', u ? {
      _id: u._id,
      username: u.username,
      rollNo: u.rollNo,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      passwordHash: u.passwordHash ? 'EXISTS' : 'MISSING'
    } : 'NOT FOUND');

    // Also check sample student users in database
    const students = await User.find({ role: 'STUDENT' }).limit(5).toArray();
    console.log('\nSample 5 Student Accounts in DB:');
    students.forEach(s => console.log(`Roll: ${s.rollNo || s.username}, Username: ${s.username}, Name: ${s.name}`));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testUserLookup();
