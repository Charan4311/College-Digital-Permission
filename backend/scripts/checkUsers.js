require('dotenv').config();
const mongoose = require('mongoose');

async function checkUsers() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to:', conn.connection.host, conn.connection.name);

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    const User = db.collection('users');
    const userCount = await User.countDocuments();
    console.log('Total users in DB:', userCount);

    const sampleUsers = await User.find({}).limit(15).toArray();
    console.log('Sample Users:');
    sampleUsers.forEach(u => {
      console.log(`Username: ${u.username}, Role: ${u.role}, Name: ${u.name}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkUsers();
