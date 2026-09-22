require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

async function testPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const User = db.collection('users');

    const roll = '23B21A4227';
    const u = await User.findOne({ rollNo: roll });

    console.log('User passwordHash:', u.passwordHash);

    const testPasswords = [
      '23B21A4227',
      '23b21a4227',
      '23B21A4227@123',
      'password',
      '123456'
    ];

    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, u.passwordHash);
      console.log(`Testing password "${pwd}": ${match ? 'MATCH!' : 'No match'}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

testPassword();
