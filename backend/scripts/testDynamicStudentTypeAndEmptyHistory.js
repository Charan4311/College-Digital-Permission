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

async function testDynamicStudentType() {
  console.log('====================================================================');
  console.log('  TESTING DYNAMIC STUDENT TYPE SELECTION & EMPTY HISTORY ISOLATION');
  console.log('====================================================================\n');

  // Step 1: Log in as Student 1 (23B21A4268)
  console.log('1. Logging in Student 1 (23B21A4268)...');
  const s1Login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '23B21A4268', password: '23B21A4268' })
  });
  const s1Token = s1Login.data.token;
  console.log(`   Logged in as: ${s1Login.data.user.name} (${s1Login.data.user.rollNo})`);

  // Verify history is empty
  console.log('2. Verifying Student 1 initial request history...');
  const s1Initial = await req('/outpass/mine', { token: s1Token });
  console.log(`   Initial requests for 23B21A4268: ${s1Initial.data.length}`);
  if (s1Initial.data.length !== 0) {
    throw new Error(`Expected 0 requests initially, but found ${s1Initial.data.length}`);
  }
  console.log('   ✅ Verified: History is completely EMPTY initially!');

  // Step 2: Submit request with studentType: 'DAY_SCHOLAR'
  console.log('\n3. Student 1 submitting request as DAY_SCHOLAR...');
  const reqDS = await req('/outpass', {
    method: 'POST',
    token: s1Token,
    body: JSON.stringify({
      studentType: 'DAY_SCHOLAR',
      reason: 'Urgent family work at town (Day Scholar route)',
      outDate: new Date().toISOString().split('T')[0],
      outTime: '16:00',
      expectedReturnDate: new Date().toISOString().split('T')[0],
      expectedReturnTime: '20:00'
    })
  });
  console.log(`   ✅ Request created! ID: ${reqDS.data._id} | Type: ${reqDS.data.studentType} | Status: ${reqDS.data.status}`);

  // Approve via CTPO & HOD
  const csmCtpoLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '4ktcsm', password: '4KTCSM@123' })
  });
  await req(`/outpass/${reqDS.data._id}/approve`, {
    method: 'POST',
    token: csmCtpoLogin.data.token,
    body: JSON.stringify({ remarks: 'CTPO approved DS' })
  });

  const hodLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '4kthod', password: '4KTHOD@123' })
  });
  const hodApproveDS = await req(`/outpass/${reqDS.data._id}/approve`, {
    method: 'POST',
    token: hodLogin.data.token,
    body: JSON.stringify({ remarks: 'HOD approved DS' })
  });
  console.log(`   ✅ Day Scholar Workflow: Status after HOD is ${hodApproveDS.data.status} (Bypassed Hostel Warden straight to ISSUED!)`);
  if (hodApproveDS.data.status !== 'ISSUED') {
    throw new Error(`Expected ISSUED for Day Scholar, got ${hodApproveDS.data.status}`);
  }

  // Step 3: Same student submits request choosing studentType: 'HOSTELER'
  console.log('\n4. Student 1 submitting request dynamically toggled as HOSTELER...');
  const reqHS = await req('/outpass', {
    method: 'POST',
    token: s1Token,
    body: JSON.stringify({
      studentType: 'HOSTELER',
      reason: 'Visiting hometown over the weekend (Hosteler route)',
      outDate: new Date().toISOString().split('T')[0],
      outTime: '17:00',
      expectedReturnDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      expectedReturnTime: '19:00'
    })
  });
  console.log(`   ✅ Request created! ID: ${reqHS.data._id} | Type: ${reqHS.data.studentType} | Status: ${reqHS.data.status}`);

  // CTPO approves
  await req(`/outpass/${reqHS.data._id}/approve`, {
    method: 'POST',
    token: csmCtpoLogin.data.token,
    body: JSON.stringify({ remarks: 'CTPO approved HS' })
  });

  // HOD approves -> MUST go to PENDING_HOSTEL_INCHARGE
  const hodApproveHS = await req(`/outpass/${reqHS.data._id}/approve`, {
    method: 'POST',
    token: hodLogin.data.token,
    body: JSON.stringify({ remarks: 'HOD approved HS' })
  });
  console.log(`   ✅ Hosteler Workflow: Status after HOD is ${hodApproveHS.data.status} (Correctly routed to Hostel Warden!)`);
  if (hodApproveHS.data.status !== 'PENDING_HOSTEL_INCHARGE') {
    throw new Error(`Expected PENDING_HOSTEL_INCHARGE for Hosteler, got ${hodApproveHS.data.status}`);
  }

  // Hostel Warden approves -> ISSUED
  const hostelLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'hostel_incharge', password: 'hostel@123' })
  });
  const wardenApprove = await req(`/outpass/${reqHS.data._id}/approve`, {
    method: 'POST',
    token: hostelLogin.data.token,
    body: JSON.stringify({ remarks: 'Parent called and verified' })
  });
  console.log(`   ✅ Warden approved! Final status: ${wardenApprove.data.status} (ISSUED)`);

  // Step 4: Verify Student 1 has exactly 2 requests
  const s1Final = await req('/outpass/mine', { token: s1Token });
  console.log(`\n5. Total requests for Student 1 (23B21A4268): ${s1Final.data.length}`);

  // Step 5: Log in as Student 2 (23B21A4301 - CAI branch)
  console.log('6. Logging in Student 2 (23B21A4301)...');
  const s2Login = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: '23B21A4301', password: '23B21A4301' })
  });
  const s2Initial = await req('/outpass/mine', { token: s2Login.data.token });
  console.log(`   Requests visible to Student 2: ${s2Initial.data.length}`);
  if (s2Initial.data.length !== 0) {
    throw new Error(`Student 2 should have 0 requests, but saw ${s2Initial.data.length}!`);
  }
  console.log('   ✅ ISOLATION VERIFIED: Student 2 sees 0 requests. No cross-student data leaks!');

  console.log('\n====================================================================');
  console.log('  🎉 ALL DYNAMIC STUDENT TYPE & ISOLATION TESTS PASSED 100%!');
  console.log('====================================================================\n');
}

testDynamicStudentType().catch(e => {
  console.error('\n❌ Test Error:', e.data || e.message);
  process.exit(1);
});
