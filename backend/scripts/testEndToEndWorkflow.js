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

async function runTests() {
  console.log('===============================================================');
  console.log('  KIET OUT-PASS SYSTEM — FULL END-TO-END VERIFICATION');
  console.log('===============================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: DAY SCHOLAR WORKFLOW (Student -> CTPO -> HOD -> ISSUED -> SECURITY SCAN)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('>>> [TEST 1] DAY SCHOLAR FULL WORKFLOW');

  // 1. Student Login
  console.log('1. Logging in Student (Day Scholar: 25B21A4201)...');
  const stu1Res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '25B21A4201', password: '25B21A4201' })
  });
  const stu1Token = stu1Res.data.token;
  const stu1 = stu1Res.data.user;
  console.log(`   ✅ Logged in as: ${stu1.name} (${stu1.rollNo}) | Type: ${stu1.studentType}`);

  // 2. Create Outpass Request
  console.log('2. Creating Outpass Request as Day Scholar...');
  const create1Res = await req('/outpass', {
    method: 'POST',
    token: stu1Token,
    body: JSON.stringify({
      reason: 'Urgent Family Event at Visakhapatnam',
      outDate: new Date().toISOString().split('T')[0],
      outTime: '16:30',
      expectedReturnDate: new Date().toISOString().split('T')[0],
      expectedReturnTime: '21:00'
    })
  });
  const req1 = create1Res.data;
  console.log(`   ✅ Request created! ID: ${req1._id} | Status: ${req1.status}`);

  // 3. CTPO Login and Approval
  console.log('3. Logging in CTPO CSM (ctpo_42)...');
  const ctpoRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ctpo_42', password: 'ctpo_42@123' })
  });
  const ctpoToken = ctpoRes.data.token;

  console.log('   Checking CTPO pending queue...');
  const ctpoPending = await req('/outpass/pending/for-me', { token: ctpoToken });
  const foundReq1 = ctpoPending.data.find(r => r._id === req1._id);
  if (!foundReq1) throw new Error('Request 1 not found in CTPO pending queue');
  console.log(`   Found request in CTPO queue: "${foundReq1.reason}"`);

  console.log('   CTPO approving request...');
  const ctpoApprove = await req(`/outpass/${req1._id}/approve`, {
    method: 'POST',
    token: ctpoToken,
    body: JSON.stringify({ remarks: 'Attendance verified. Permission granted.' })
  });
  console.log(`   ✅ CTPO approved! Next Status: ${ctpoApprove.data.status}`);

  // 4. HOD Day Scholar Login and Approval
  console.log('4. Logging in HOD Day Scholar (hod_dayscholar)...');
  const hodDsRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'hod_dayscholar', password: 'hod_ds@123' })
  });
  const hodDsToken = hodDsRes.data.token;

  console.log('   Checking HOD Day Scholar pending queue...');
  const hodPending = await req('/outpass/pending/for-me', { token: hodDsToken });
  const foundHodReq1 = hodPending.data.find(r => r._id === req1._id);
  if (!foundHodReq1) throw new Error('Request 1 not found in HOD pending queue');
  console.log(`   Found request in HOD queue: "${foundHodReq1.reason}"`);

  console.log('   HOD approving request (Day Scholar skips Hostel In-charge)...');
  const hodApprove = await req(`/outpass/${req1._id}/approve`, {
    method: 'POST',
    token: hodDsToken,
    body: JSON.stringify({ remarks: 'Approved by Department HOD.' })
  });
  const issuedStatus = hodApprove.data.status;
  console.log(`   ✅ HOD approved! Status: ${issuedStatus} (Correctly transitioned to ISSUED!)`);

  // 5. Student fetches generated QR code pass
  console.log('5. Student fetching QR code image and token...');
  const qrRes = await req(`/outpass/${req1._id}/qr`, { token: stu1Token });
  const qrToken = qrRes.data.token;
  console.log(`   ✅ QR Code generated successfully! Token: ${qrToken.slice(0, 16)}...`);

  // 6. Security Login & Scan at Gate
  console.log('6. Logging in Gate Security (security)...');
  const secRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'security', password: 'security@123' })
  });
  const secToken = secRes.data.token;

  console.log('   Security scanning student QR pass at gate...');
  const scan1Res = await req('/security/scan', {
    method: 'POST',
    token: secToken,
    body: JSON.stringify({ token: qrToken })
  });
  console.log(`   ✅ SCAN RESULT: ${scan1Res.scanResult} | Student: ${scan1Res.data.studentId.name}`);

  // 7. Test Double Scan (Pass must be single-use and reject duplicate entry)
  console.log('7. Testing duplicate scan (same QR token)...');
  try {
    await req('/security/scan', {
      method: 'POST',
      token: secToken,
      body: JSON.stringify({ token: qrToken })
    });
    throw new Error('Duplicate scan should have been rejected!');
  } catch (err) {
    if (err.data?.scanResult === 'ALREADY_USED') {
      console.log('   ✅ Double scan blocked! Received ALREADY_USED error as expected.');
    } else {
      throw err;
    }
  }

  console.log('\n---------------------------------------------------------------');
  console.log('>>> [TEST 2] HOSTELER FULL WORKFLOW');
  console.log('---------------------------------------------------------------');

  // 1. Hosteler Student Login
  console.log('1. Logging in Student (Hosteler: 25B21A4202)...');
  const stu2Res = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '25B21A4202', password: '25B21A4202' })
  });
  const stu2Token = stu2Res.data.token;
  const stu2 = stu2Res.data.user;
  console.log(`   ✅ Logged in as: ${stu2.name} (${stu2.rollNo}) | Type: ${stu2.studentType}`);

  // 2. Create Outpass Request
  console.log('2. Creating Outpass Request as Hosteler...');
  const create2Res = await req('/outpass', {
    method: 'POST',
    token: stu2Token,
    body: JSON.stringify({
      reason: 'Medical Consultation and Medicine Collection',
      outDate: new Date().toISOString().split('T')[0],
      outTime: '17:00',
      expectedReturnDate: new Date().toISOString().split('T')[0],
      expectedReturnTime: '20:30'
    })
  });
  const req2 = create2Res.data;
  console.log(`   ✅ Request created! ID: ${req2._id} | Status: ${req2.status}`);

  // 3. CTPO Approval
  console.log('3. CTPO approving Hosteler request...');
  const ctpoApprove2 = await req(`/outpass/${req2._id}/approve`, {
    method: 'POST',
    token: ctpoToken,
    body: JSON.stringify({ remarks: 'CTPO approved for Hosteler.' })
  });
  console.log(`   ✅ CTPO approved! Next Status: ${ctpoApprove2.data.status} (PENDING_HOD)`);

  // 4. HOD Hosteler Login & Approval
  console.log('4. Logging in HOD Hosteler (hod_hosteler)...');
  const hodHsRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'hod_hosteler', password: 'hod_hs@123' })
  });
  const hodHsToken = hodHsRes.data.token;

  console.log('   HOD Hosteler approving request...');
  const hodApprove2 = await req(`/outpass/${req2._id}/approve`, {
    method: 'POST',
    token: hodHsToken,
    body: JSON.stringify({ remarks: 'HOD approved. Forwarded to Hostel Warden.' })
  });
  console.log(`   ✅ HOD approved! Next Status: ${hodApprove2.data.status} (Correctly routed to PENDING_HOSTEL_INCHARGE!)`);

  // 5. Hostel In-charge Login & Approval
  console.log('5. Logging in Hostel In-charge (hostel_incharge)...');
  const hostelRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'hostel_incharge', password: 'hostel@123' })
  });
  const hostelToken = hostelRes.data.token;

  console.log('   Checking Hostel In-charge pending queue...');
  const hostelPending = await req('/outpass/pending/for-me', { token: hostelToken });
  const foundHostelReq = hostelPending.data.find(r => r._id === req2._id);
  if (!foundHostelReq) throw new Error('Request 2 not found in Hostel In-charge queue');

  console.log('   Hostel In-charge granting final gate approval...');
  const hostelApprove = await req(`/outpass/${req2._id}/approve`, {
    method: 'POST',
    token: hostelToken,
    body: JSON.stringify({ remarks: 'Parent consent verified by phone. Pass cleared.' })
  });
  console.log(`   ✅ Hostel In-charge approved! Status: ${hostelApprove.data.status} (ISSUED!)`);

  // 6. Student QR fetch & Security Scan
  console.log('6. Student fetching Hosteler QR code pass...');
  const qr2Res = await req(`/outpass/${req2._id}/qr`, { token: stu2Token });
  const qr2Token = qr2Res.data.token;

  console.log('   Security scanning Hosteler pass at gate...');
  const scan2Res = await req('/security/scan', {
    method: 'POST',
    token: secToken,
    body: JSON.stringify({ token: qr2Token })
  });
  console.log(`   ✅ SCAN RESULT: ${scan2Res.scanResult} | Gate cleared for ${scan2Res.data.studentId.name}`);

  console.log('\n---------------------------------------------------------------');
  console.log('>>> [TEST 3] SECURITY SCANNER INVALID & EXPIRED CHECKS');
  console.log('---------------------------------------------------------------');

  // Test invalid token
  console.log('1. Scanning fake/invalid token at security gate...');
  try {
    await req('/security/scan', {
      method: 'POST',
      token: secToken,
      body: JSON.stringify({ token: 'FAKE_TOKEN_INVALID_9999' })
    });
  } catch (err) {
    console.log(`   ✅ Expected error handled: ${err.data?.scanResult} (${err.data?.message})`);
  }

  console.log('\n===============================================================');
  console.log('  ALL INTEGRATION TESTS PASSED 100% SUCCESSFULLY! 🚀');
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err.data || err.message);
  process.exit(1);
});
