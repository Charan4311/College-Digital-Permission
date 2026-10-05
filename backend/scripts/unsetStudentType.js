const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const User = require('../src/models/User');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in environment.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("Connected successfully.");

  const collection = User.collection;

  const totalStudents = await collection.countDocuments({ role: 'STUDENT' });
  const withStudentType = await collection.countDocuments({ role: 'STUDENT', studentType: { $exists: true } });

  console.log(`Total STUDENT records found: ${totalStudents}`);
  console.log(`STUDENT records with studentType field BEFORE update: ${withStudentType}`);

  // Use native driver updateMany to bypass Mongoose schema restrictions
  const result = await collection.updateMany(
    { role: 'STUDENT' },
    { $unset: { studentType: "" } }
  );

  console.log("updateMany result:", result);

  const remainingWithStudentType = await collection.countDocuments({ role: 'STUDENT', studentType: { $exists: true } });
  console.log(`Remaining STUDENT records with studentType field AFTER update: ${remainingWithStudentType}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

main().catch(err => {
  console.error("Error executing unset script:", err);
  process.exit(1);
});
