const mongoose = require('mongoose');

const yearTierMappingSchema = new mongoose.Schema({
  yearTier: { type: String, required: true, unique: true },
  years: [{ type: Number, required: true }],
  label: { type: String, required: true }
});

module.exports = mongoose.model('YearTierMapping', yearTierMappingSchema);
