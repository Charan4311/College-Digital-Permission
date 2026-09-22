require('dotenv').config();
const xlsx = require('xlsx');

async function testExcelExport() {
  console.log('Logging in...');
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const d = await loginRes.json();
  const token = d.data.token;
  const headers = { Authorization: 'Bearer ' + token };

  for (const range of ['7days', '30days', '6months', 'thisyear']) {
    console.log(`\n--- Testing Excel Export for range: ${range} ---`);
    const res = await fetch(`http://127.0.0.1:5000/api/admin/reports/export?range=${range}`, { headers });
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    
    const wb = xlsx.read(buf, { type: 'buffer' });
    console.log('Sheet Names:', wb.SheetNames);
    
    // Check Sheet 1: Overview Summary
    const s1 = xlsx.utils.sheet_to_json(wb.Sheets['Overview Summary']);
    console.log('Overview Summary rows count:', s1.length);
    console.log('Overview Summary cols widths:', wb.Sheets['Overview Summary']['!cols']);
    
    // Check Sheet 2: Permission Request Trends
    const s2 = xlsx.utils.sheet_to_json(wb.Sheets['Permission Request Trends']);
    console.log('Permission Request Trends rows count:', s2.length);
    console.log('Permission Request Trends sample (first 3 rows):', s2.slice(0, 3));
    if (s2.length > 0) {
      console.log('Permission Request Trends sample (last row):', s2[s2.length - 1]);
    }
  }

  process.exit(0);
}

testExcelExport().catch(e => { console.error(e); process.exit(1); });
