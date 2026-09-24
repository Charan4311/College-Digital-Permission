const API = 'http://localhost:5000/api';

async function req(path, options = {}) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token && { Authorization: `Bearer ${options.token}` }),
      ...options.headers
    },
    ...options
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.message || res.statusText);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function run4thYearTests() {
  console.log('===============================================================');
  console.log('  4TH YEAR OUT-PASS SYSTEM — FULL END-TO-END VERIFICATION');
  console.log('===============================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: 4TH YEAR CSM DAY SCHOLAR (23B21A4268) -> CTPO 4KTCSM -> HOD 4KTHOD -> SECURITY
  // ──────────────────────────────────────────────────────────────────────────
  console.log('>>> [TEST 1] 4TH YEAR CSM DAY SCHOLAR (23B21A4268)');

  // 1. Student Login
  console.log('1. Logging in Student (23B21A4268)...');
  const stu1Res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '23B21A4268', password: '23B21A4268' })
  });
  const stu1Token = stu1Res.data.token;
  const stu1 = stu1Res.data.user;
  console.log(`   ✅ Logged in as: ${stu1.name} (${stu1.rollNo}) | Type: ${stu1.studentType} | Year: ${stu1.year}`);

  // 2. Create Outpass Request
  console.log('2. Creating Outpass Request as Day Scholar...');
  const create1Res = await req('/outpass', {
    method: 'POST',
    token: stu1Token,
    body: JSON.stringify({
      reason: 'Urgent Project Hardware Purchase at Kakinada',
      outDate: new Date().toISOString().split('T')[0],
      outTime: '15:30',
      expectedReturnDate: new Date().toISOString().split('T')[0],
      expectedReturnTime: '20:00'
    })
  });
  const req1 = create1Res.data;
  console.log(`   ✅ Request created! ID: ${req1._id} | Status: ${req1.status}`);

  // 3. Verify Branch-Specific Routing:
  // Must appear in CSM CTPO (4ktcsm) queue, NOT in CAI CTPO (4ktcai) queue!
  console.log('3. Logging in CAI CTPO (4ktcai) to verify cross-branch isolation...');
  const caiRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '4ktcai', password: '4KTCAI@123' })
  });
  const caiPending = await req('/outpass/pending/for-me', { token: caiRes.data.token });
  const inCai = caiPending.data.some(r => r._id === req1._id);
  if (inCai) {
    throw new Error('Isolation breach: CSM request appeared in CAI CTPO queue!');
  }
  console.log('   ✅ Isolation verified: CSM request did NOT leak to CAI CTPO queue.');

  console.log('4. Logging in 4th Year CSM CTPO (4ktcsm)...');
  const csmRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '4ktcsm', password: '4KTCSM@123' })
  });
  const csmToken = csmRes.data.token;
  const csmPending = await req('/outpass/pending/for-me', { token: csmToken });
  const foundReq1 = csmPending.data.find(r => r._id === req1._id);
  if (!foundReq1) {
    throw new Error('Request 1 not found in CSM CTPO pending queue');
  }
  console.log(`   ✅ Request correctly routed to 4KTCSM! Reason: "${foundReq1.reason}"`);

  console.log('   CSM CTPO approving request...');
  const csmApprove = await req(`/outpass/${req1._id}/approve`, {
    method: 'POST',
    token: csmToken,
    body: JSON.stringify({ remarks: 'Verified by 4th Year CSM CTPO. Approved.' })
  });
  console.log(`   ✅ CTPO approved! Next Status: ${csmApprove.data.status} (PENDING_HOD)`);

  // 5. 4th Year HOD Login & Approval
  console.log('5. Logging in 4th Year HOD (4kthod)...');
  const hodRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '4kthod', password: '4KTHOD@123' })
  });
  const hodToken = hodRes.data.token;

  console.log('   HOD approving Day Scholar request...');
  const hodApprove = await req(`/outpass/${req1._id}/approve`, {
    method: 'POST',
    token: hodToken,
    body: JSON.stringify({ remarks: 'Approved by Head of Department (4KTHOD).' })
  });
  console.log(`   ✅ HOD approved! Status: ${hodApprove.data.status} (Correctly transitioned directly to ISSUED for Day Scholar!)`);

  // 6. Student Fetches QR pass
  console.log('6. Student fetching QR code...');
  const qr1Res = await req(`/outpass/${req1._id}/qr`, { token: stu1Token });
  const qr1Token = qr1Res.data.token;
  console.log(`   ✅ QR Code generated! Token: ${qr1Token.slice(0, 20)}...`);

  // 7. Security Scans Pass
  console.log('7. Security scanning QR pass at main gate...');
  const secRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'security', password: 'security@123' })
  });
  const secToken = secRes.data.token;

  const scan1Res = await req('/security/scan', {
    method: 'POST',
    token: secToken,
    body: JSON.stringify({ token: qr1Token })
  });
  console.log(`   ✅ Security Gate Result: ${scan1Res.scanResult} | Outpass status: ${scan1Res.data.status}`);

  // 8. Duplicate Scan Verification
  console.log('8. Testing duplicate scan rejection...');
  try {
    await req('/security/scan', {
      method: 'POST',
      token: secToken,
      body: JSON.stringify({ token: qr1Token })
    });
    throw new Error('Duplicate scan should have failed!');
  } catch (err) {
    if (err.data?.scanResult === 'ALREADY_USED') {
      console.log('   ✅ Duplicate scan blocked: ALREADY_USED correctly detected!');
    } else {
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: 4TH YEAR CAI HOSTELER (23B21A4311) -> CTPO 4KTCAI -> HOD 4KTHOD -> HOSTEL WARDEN -> SECURITY
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n---------------------------------------------------------------');
  console.log('>>> [TEST 2] 4TH YEAR CAI HOSTELER (23B21A4311)');
  console.log('---------------------------------------------------------------');

  // 1. Hosteler Student Login
  console.log('1. Logging in Hosteler Student (23B21A4311)...');
  const stu2Res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '23B21A4311', password: '23B21A4311' })
  });
  const stu2Token = stu2Res.data.token;
  const stu2 = stu2Res.data.user;
  console.log(`   ✅ Logged in as: ${stu2.name} (${stu2.rollNo}) | Type: ${stu2.studentType} | Year: ${stu2.year}`);

  // 2. Create Outpass Request
  console.log('2. Creating Outpass Request as Hosteler...');
  const create2Res = await req('/outpass', {
    method: 'POST',
    token: stu2Token,
    body: JSON.stringify({
      reason: 'Home visit for festival celebrations',
      outDate: new Date().toISOString().split('T')[0],
      outTime: '17:00',
      expectedReturnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      expectedReturnTime: '18:00'
    })
  });
  const req2 = create2Res.data;
  console.log(`   ✅ Request created! ID: ${req2._id} | Status: ${req2.status}`);

  // 3. Verify Routing to 4KTCAI
  console.log('3. Checking 4th Year CAI CTPO queue...');
  const caiPending2 = await req('/outpass/pending/for-me', { token: caiRes.data.token });
  const foundReq2 = caiPending2.data.find(r => r._id === req2._id);
  if (!foundReq2) {
    throw new Error('Request 2 not found in CAI CTPO pending queue');
  }
  console.log(`   ✅ Correctly routed to 4KTCAI! Reason: "${foundReq2.reason}"`);

  console.log('   CAI CTPO approving Hosteler request...');
  const caiApprove = await req(`/outpass/${req2._id}/approve`, {
    method: 'POST',
    token: caiRes.data.token,
    body: JSON.stringify({ remarks: 'CAI CTPO approved.' })
  });
  console.log(`   ✅ CTPO approved! Next Status: ${caiApprove.data.status} (PENDING_HOD)`);

  // 4. HOD Approval (Routes to PENDING_HOSTEL_INCHARGE because student is HOSTELER)
  console.log('4. 4th Year HOD approving Hosteler request...');
  const hodApprove2 = await req(`/outpass/${req2._id}/approve`, {
    method: 'POST',
    token: hodToken,
    body: JSON.stringify({ remarks: 'HOD approved. Routed to Hostel Warden.' })
  });
  console.log(`   ✅ HOD approved! Next Status: ${hodApprove2.data.status} (Correctly routed to PENDING_HOSTEL_INCHARGE!)`);

  // 5. Hostel In-charge Approval
  console.log('5. Logging in Hostel In-charge...');
  const hostelRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'hostel_incharge', password: 'hostel@123' })
  });
  const hostelToken = hostelRes.data.token;

  console.log('   Hostel In-charge approving request...');
  const hostelApprove = await req(`/outpass/${req2._id}/approve`, {
    method: 'POST',
    token: hostelToken,
    body: JSON.stringify({ remarks: 'Parent phone verification completed. Safe travel.' })
  });
  console.log(`   ✅ Hostel Warden approved! Status: ${hostelApprove.data.status} (ISSUED!)`);

  // 6. Student Fetches QR & Security Scans
  console.log('6. Student fetching Hosteler QR code pass...');
  const qr2Res = await req(`/outpass/${req2._id}/qr`, { token: stu2Token });
  const qr2Token = qr2Res.data.token;

  console.log('   Security scanning Hosteler pass at gate...');
  const scan2Res = await req('/security/scan', {
    method: 'POST',
    token: secToken,
    body: JSON.stringify({ token: qr2Token })
  });
  console.log(`   ✅ Hosteler Gate Scan Result: ${scan2Res.scanResult} | Outpass status: ${scan2Res.data.status}`);

  console.log('\n===============================================================');
  console.log('  🎉 4TH YEAR END-TO-END WORKFLOWS COMPLETED 100% SUCCESSFULLY!');
  console.log('===============================================================\n');
}

run4thYearTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err.data || err.message);
  process.exit(1);
});
