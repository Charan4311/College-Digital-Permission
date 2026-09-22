require('dotenv').config();
const xlsx = require('xlsx');

async function testFilterAndExport() {
  console.log('Logging in as Admin...');
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const d = await loginRes.json();
  const token = d.data.token;
  const headers = { Authorization: 'Bearer ' + token };

  console.log('\n--- 1. Testing Filtered JSON Endpoint ---');
  const filterParams = [
    { name: 'All', query: '' },
    { name: 'Internship', query: 'requestType=INTERNSHIP' },
    { name: '4th Year CSM Outpass Approved', query: 'year=4&branch=CSM&requestType=OUTPASS&status=APPROVED' },
    { name: 'Pending Status', query: 'status=PENDING' },
    { name: 'Rejected Status', query: 'status=REJECTED' }
  ];

  for (const fp of filterParams) {
    const res = await fetch(`http://127.0.0.1:5000/api/admin/requests?${fp.query}`, { headers });
    const json = await res.json();
    console.log(`✓ [Filter: ${fp.name}] -> Count: ${json.data?.length}`);
    if (json.data?.length > 0) {
      console.log(`   Sample item: Roll: ${json.data[0].studentId?.rollNo}, Type: ${json.data[0].requestType}, Status: ${json.data[0].status}`);
    }
  }

  console.log('\n--- 2. Testing Excel Export for Filtered Data ---');
  for (const fp of filterParams) {
    const res = await fetch(`http://127.0.0.1:5000/api/admin/requests/export?${fp.query}`, { headers });
    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    
    const wb = xlsx.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheetData = xlsx.utils.sheet_to_json(wb.Sheets[sheetName]);
    console.log(`✓ [Export: ${fp.name}] -> Sheet: "${sheetName}", Rows: ${sheetData.length}`);
    if (sheetData.length > 0) {
      console.log(`   Sample Excel row:`, sheetData[0]);
    }
  }

  process.exit(0);
}

testFilterAndExport().catch(e => { console.error(e); process.exit(1); });
