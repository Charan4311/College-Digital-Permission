require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

async function testAllRoutes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const admin = await User.findOne({ role: 'ADMIN' });
  const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET);
  const headers = { Authorization: 'Bearer ' + token };

  const endpoints = [
    '/api/health',
    '/api/admin/students',
    '/api/admin/branches',
    '/api/admin/overview',
    '/api/admin/reports/analytics',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch('http://127.0.0.1:5000' + ep, { headers });
      const text = await res.text();
      if (text.startsWith('<')) {
        console.log('❌', ep, '-> Status:', res.status, '(HTML/404)');
      } else {
        const data = JSON.parse(text);
        console.log('✓', ep, '-> Status:', res.status, '| Success:', data.success);
      }
    } catch (e) {
      console.log('💥', ep, '-> ERROR:', e.message);
    }
  }

  process.exit(0);
}

testAllRoutes().catch(e => { console.error(e); process.exit(1); });
