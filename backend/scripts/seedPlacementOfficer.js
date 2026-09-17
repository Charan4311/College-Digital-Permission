require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/User');
const connectDB = require('../src/config/db');

async function seedPlacementOfficer() {
  await connectDB();
  try {
    const passwordHash = await bcrypt.hash('placement@123', 10);
    const existing = await User.findOne({ username: 'placement_officer' });
    if (existing) {
      existing.role = 'PLACEMENT_OFFICER';
      existing.passwordHash = passwordHash;
      existing.name = 'Head Placement Officer';
      await existing.save();
      console.log('Placement Officer user updated:', existing.username);
    } else {
      const officer = await User.create({
        name: 'Head Placement Officer',
        username: 'placement_officer',
        passwordHash,
        role: 'PLACEMENT_OFFICER'
      });
      console.log('Placement Officer user created:', officer.username);
    }
  } catch (error) {
    console.error('Error seeding Placement Officer', error);
  } finally {
    process.exit(0);
  }
}

seedPlacementOfficer();
