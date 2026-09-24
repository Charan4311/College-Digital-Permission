const mongoose = require('mongoose');

const academicSessionSchema = new mongoose.Schema({
  currentSessionYear: { type: Number, required: true }
});

module.exports = mongoose.model('AcademicSession', academicSessionSchema);
