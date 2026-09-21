require('dotenv').config();
const mongoose = require('mongoose');
const OutpassRequest = require('../src/models/OutpassRequest');
const ApprovalStep = require('../src/models/ApprovalStep');
const QRPass = require('../src/models/QRPass');
const connectDB = require('../src/config/db');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function req(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token && { Authorization: `Bearer ${options.token}` }),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
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
  console.log('--- STARTING COMPREHENSIVE NEW PERMISSION FEATURES TEST ---');
  await connectDB();

  // Helper to login and get token
  async function login(username, password) {
    const res = await req('/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    return res.data.token;
  }

  try {
    // 1. Logins
    console.log('\n[1] Logging into accounts...');
    const studentToken = await login('23B21A4268', '23B21A4268');
    const ctpoToken = await login('4ktcsm', '4KTCSM@123');
    const hodToken = await login('4kthod', '4KTHOD@123');
    const placementToken = await login('placement_officer', 'placement@123');
    console.log('✓ All 4 accounts authenticated successfully.');

    // 2. Test Feature 1: MESS FEE CLEARANCE
    console.log('\n[2] Testing Feature: MESS FEE CLEARANCE (Student ➔ CTPO ➔ HOD ➔ Cleared)');
    const messPayload = {
      requestType: 'MESS_FEE',
      reason: 'Fall Semester Mess Dues Clearance',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      messAmount: 5400,
      paidStatus: 'Paid',
      studentType: 'DAY_SCHOLAR'
    };
    const messRes = await req('/outpass', { method: 'POST', token: studentToken, body: messPayload });
    const messReqId = messRes.data._id;
    console.log(`✓ Mess fee request created: ${messReqId} (Status: ${messRes.data.status})`);
    if (messRes.data.status !== 'PENDING_CTPO') throw new Error('Expected status PENDING_CTPO');

    // CTPO Approves
    const ctpoMessApprove = await req(`/outpass/${messReqId}/approve`, {
      method: 'POST',
      token: ctpoToken,
      body: { remarks: 'Mess accounts verified' }
    });
    console.log(`✓ CTPO approved mess request. Next status: ${ctpoMessApprove.data.status}`);
    if (ctpoMessApprove.data.status !== 'PENDING_HOD') throw new Error('Expected status PENDING_HOD');

    // HOD Approves
    const hodMessApprove = await req(`/outpass/${messReqId}/approve`, {
      method: 'POST',
      token: hodToken,
      body: { remarks: 'Authorized and mess fee cleared' }
    });
    console.log(`✓ HOD approved mess request. Final status: ${hodMessApprove.data.status}`);
    if (hodMessApprove.data.status !== 'APPROVED') throw new Error('Expected status APPROVED');

    // 3. Test Feature 2: INTERNSHIP PERMISSION (Student ➔ CTPO ➔ HOD ➔ Placement Officer ➔ Approved)
    console.log('\n[3] Testing Feature: INTERNSHIP PERMISSION (Student ➔ CTPO ➔ HOD ➔ Placement Officer ➔ Approved)');
    const internPayload = {
      requestType: 'INTERNSHIP',
      companyName: 'Microsoft R&D India',
      companyLocation: 'Hyderabad, Telangana',
      role: 'Software Development Engineer Intern',
      internshipMode: 'Offline',
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      studentType: 'DAY_SCHOLAR'
    };
    const internRes = await req('/outpass', { method: 'POST', token: studentToken, body: internPayload });
    const internReqId = internRes.data._id;
    console.log(`✓ Internship request created: ${internReqId} (Status: ${internRes.data.status})`);

    // CTPO Approves
    const ctpoInternApprove = await req(`/outpass/${internReqId}/approve`, {
      method: 'POST',
      token: ctpoToken,
      body: { remarks: 'Academic credits verified' }
    });
    console.log(`✓ CTPO approved internship. Next status: ${ctpoInternApprove.data.status}`);
    if (ctpoInternApprove.data.status !== 'PENDING_HOD') throw new Error('Expected status PENDING_HOD');

    // Placement Officer should not see the request before HOD approval
    const poAllBeforeHod = await req('/outpass/all/for-me', { token: placementToken });
    const inPoAllBeforeHod = poAllBeforeHod.data.find(r => r._id.toString() === internReqId.toString());
    if (inPoAllBeforeHod) throw new Error('Internship request incorrectly visible to Placement Officer before HOD approval');
    console.log('✓ Placement Officer cannot see internship before HOD approval.');

    // HOD Approves
    const hodInternApprove = await req(`/outpass/${internReqId}/approve`, {
      method: 'POST',
      token: hodToken,
      body: { remarks: 'Department NOC granted' }
    });
    console.log(`✓ HOD approved internship. Next status: ${hodInternApprove.data.status}`);
    if (hodInternApprove.data.status !== 'PENDING_PLACEMENT_OFFICER') throw new Error('Expected status PENDING_PLACEMENT_OFFICER');

    // Placement Officer should see it only after HOD approval
    const poQueue = await req('/outpass/pending/for-me', { token: placementToken });
    const inPoQueue = poQueue.data.find(r => r._id.toString() === internReqId.toString());
    if (!inPoQueue) throw new Error('Internship request not found in Placement Officer queue');
    console.log(`✓ Verified request appears in Placement Officer pending queue after HOD approval!`);

    // Placement Officer Approves
    const poInternApprove = await req(`/outpass/${internReqId}/approve`, {
      method: 'POST',
      token: placementToken,
      body: { remarks: 'Company offer letter verified. Approved.' }
    });
    console.log(`✓ Placement Officer approved internship. Final status: ${poInternApprove.data.status}`);
    if (poInternApprove.data.status !== 'APPROVED') throw new Error('Expected status APPROVED');

    // 4. Test Feature 3: LIBRARY PERMISSION (Student ➔ CTPO ➔ Approved - Single Stage)
    console.log('\n[4] Testing Feature: LIBRARY PERMISSION (Student ➔ CTPO ➔ Approved)');
    const libPayload = {
      requestType: 'LIBRARY',
      reason: 'Semester Book Borrowing & Extended Digital Library Access',
      requestDate: '2026-09-20',
      studentType: 'DAY_SCHOLAR'
    };
    const libRes = await req('/outpass', { method: 'POST', token: studentToken, body: libPayload });
    const libReqId = libRes.data._id;
    console.log(`✓ Library request created: ${libReqId} (Status: ${libRes.data.status})`);

    // CTPO Approves
    const ctpoLibApprove = await req(`/outpass/${libReqId}/approve`, {
      method: 'POST',
      token: ctpoToken,
      body: { remarks: 'Library card verified' }
    });
    console.log(`✓ CTPO approved library request. Final status: ${ctpoLibApprove.data.status}`);
    if (ctpoLibApprove.data.status !== 'APPROVED') throw new Error('Expected status APPROVED (Single Stage)');

    // 5. Test Rejection & Resubmission Workflow
    console.log('\n[5] Testing Rejection & Edit/Resubmission Workflow');
    const rejectTestPayload = {
      requestType: 'MESS_FEE',
      reason: 'Hostel Mess Fee Settlement',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      messAmount: 2000,
      paidStatus: 'Partially Paid',
      studentType: 'DAY_SCHOLAR'
    };
    const rejRes = await req('/outpass', { method: 'POST', token: studentToken, body: rejectTestPayload });
    const rejReqId = rejRes.data._id;
    console.log(`✓ Request created for rejection test: ${rejReqId}`);

    // CTPO Rejects with mandatory remark
    const rejAction = await req(`/outpass/${rejReqId}/reject`, {
      method: 'POST',
      token: ctpoToken,
      body: { remarks: 'Arrears pending. Please pay remaining balance and attach challan.' }
    });
    console.log(`✓ CTPO rejected request. Status: ${rejAction.data.status}, Reason: "${rejAction.data.rejectionReason}"`);
    if (rejAction.data.status !== 'REJECTED_CTPO') throw new Error('Expected status REJECTED_CTPO');

    // Student inspects request
    const detailBefore = await req(`/outpass/${rejReqId}`, { token: studentToken });
    if (detailBefore.data.request.rejectionReason !== 'Arrears pending. Please pay remaining balance and attach challan.') {
      throw new Error('Rejection reason missing in student view');
    }
    console.log(`✓ Student successfully sees rejection remark on ticket detail!`);

    // Student edits & resubmits
    const resubmitRes = await req(`/outpass/${rejReqId}/resubmit`, {
      method: 'POST',
      token: studentToken,
      body: {
        messAmount: 5400,
        paidStatus: 'Paid',
        resubmitRemarks: 'Paid full balance of ₹5,400. Transaction ID: TXN998822'
      }
    });
    console.log(`✓ Student resubmitted request. Status: ${resubmitRes.data.status}, Resubmit cycle: ${resubmitRes.data.resubmitCount}`);
    if (resubmitRes.data.status !== 'PENDING_CTPO') throw new Error('Expected status PENDING_CTPO after resubmit');
    if (resubmitRes.data.resubmitCount !== 1) throw new Error('Expected resubmitCount = 1');

    // CTPO sees it in pending queue again and approves
    const ctpoFinalApprove = await req(`/outpass/${rejReqId}/approve`, {
      method: 'POST',
      token: ctpoToken,
      body: { remarks: 'Full fee verified. Approved.' }
    });
    console.log(`✓ CTPO successfully approved resubmitted request. Next status: ${ctpoFinalApprove.data.status}`);

    // Clean up test requests so DB stays pristine
    console.log('\n[6] Cleaning up test records...');
    const testIds = [messReqId, internReqId, libReqId, rejReqId];
    await OutpassRequest.deleteMany({ _id: { $in: testIds } });
    await ApprovalStep.deleteMany({ requestId: { $in: testIds } });
    await QRPass.deleteMany({ requestId: { $in: testIds } });
    console.log('✓ Test requests cleanly wiped. Database pristine.');

    console.log('\n======================================================');
    console.log('🎉 ALL 5 WORKFLOW TESTS PASSED PERFECTLY!');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err.data || err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
