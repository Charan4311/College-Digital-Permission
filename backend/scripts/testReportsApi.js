require('dotenv').config();
const mongoose = require('mongoose');

async function testReportsApi() {
  // First, get a valid token by logging in via the API
  console.log('Logging in to get token...');
  const loginRes = await fetch('http://127.0.0.1:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  
  const token = loginData.token || loginData.data?.token;
  if (!token) {
    console.log('Login failed:', loginData);
    
    // Try alternate credentials
    const loginRes2 = await fetch('http://127.0.0.1:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rollNo: 'admin', password: 'admin123' })
    });
    const loginData2 = await loginRes2.json();
    console.log('Alt login result:', loginData2);
    process.exit(1);
  }

  const headers = { Authorization: 'Bearer ' + token };
  const user = loginData.user || loginData.data?.user;
  console.log('Got token, role:', user?.role);

  const endpoints = [
    '/api/admin/branches',
    '/api/admin/reports/analytics?range=30days',
    '/api/admin/reports/analytics?range=7days',
    '/api/admin/reports/analytics?range=6months',
    '/api/admin/reports/analytics?range=thisyear',
    '/api/admin/overview',
    '/api/admin/students?limit=5',
  ];

  for (const ep of endpoints) {
    const res = await fetch('http://127.0.0.1:5000' + ep, { headers });
    const text = await res.text();
    if (text.startsWith('<')) {
      console.log('❌', ep, '-> HTML 404 (route not found)');
    } else {
      const data = JSON.parse(text);
      if (ep.includes('reports/analytics')) {
        const summary = data.data?.summary;
        console.log('✓', ep, '->',
          'Total:', summary?.totalRequests?.count,
          'Approved:', summary?.approved?.count,
          'Pending:', summary?.pending?.count,
          'Rejected:', summary?.rejected?.count,
          '| Trend pts:', data.data?.requestsTrend?.length,
          '| TypeDist:', data.data?.typeDistribution?.length,
          '| StatusAnal:', data.data?.statusAnalysis?.length
        );
      } else if (ep.includes('overview')) {
        console.log('✓', ep, '-> Success:', data.success, 
          '| Students:', data.data?.totalStudents,
          '| Requests:', data.data?.totalRequests);
      } else if (ep.includes('branches')) {
        console.log('✓', ep, '-> Success:', data.success, '| Branches count:', data.data?.length, 
          '| First branch:', data.data?.[0]?.name);
      } else if (ep.includes('students')) {
        console.log('✓', ep, '-> Success:', data.success, '| Total students:', data.total);
      } else {
        console.log('✓', ep, '-> Success:', data.success);
      }
    }
  }

  process.exit(0);
}

testReportsApi().catch(e => { console.error(e); process.exit(1); });
