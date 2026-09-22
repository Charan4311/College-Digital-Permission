require('dotenv').config();
const xlsx = require('xlsx');

async function checkCols() {
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const d = await loginRes.json();
  const token = d.data.token;

  const res = await fetch(`http://127.0.0.1:5000/api/admin/reports/export?range=7days`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  
  const wb = xlsx.read(buf, { type: 'buffer', cellStyles: true });
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    console.log(`Sheet "${name}" !cols:`, sheet['!cols']);
    console.log(`Sheet "${name}" rows preview:\n`, xlsx.utils.sheet_to_json(sheet));
  }
  process.exit(0);
}

checkCols().catch(e => { console.error(e); process.exit(1); });
