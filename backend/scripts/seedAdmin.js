require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

async function seedAdmin() {
  await connectDB();
  try {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (!adminExists) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Super Admin',
        username: 'admin',
        passwordHash,
        role: 'ADMIN'
      });
      console.log('Admin user seeded');
    } else {
      console.log('Admin already exists');
    }
  } catch (error) {
    console.error('Error seeding admin', error);
  } finally {
    process.exit();
  }
}
seedAdmin();
