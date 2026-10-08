const crypto = require('crypto');
const QRPass = require('../models/QRPass');

// Character set without look-alikes: 0, O, 1, I, L
const CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateRandomCode() {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    const index = bytes[i] % CHARSET.length;
    code += CHARSET[index];
  }
  // Format as XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

async function generateUniqueShortCode(maxRetries = 10) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateRandomCode();
    const existing = await QRPass.findOne({ shortCode: code });
    if (!existing) {
      return code;
    }
  }
  // Fallback if collisions occur
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = generateRandomCode().slice(0, 4);
  return `${random}-${timestamp}`;
}

function normalizePassCode(input) {
  if (!input) return '';
  return String(input)
    .toUpperCase()
    .replace(/[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g, '');
}

module.exports = {
  generateUniqueShortCode,
  normalizePassCode
};
