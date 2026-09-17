const resolveNextStage = (request, decision) => {
  const type = request.requestType || 'OUTPASS';

  // 1. OUTPASS WORKFLOW
  if (type === 'OUTPASS') {
    if (request.status === 'PENDING_CTPO') {
      if (decision === 'REJECTED') return 'REJECTED_CTPO';
      if (decision === 'APPROVED') return 'PENDING_HOD';
    }
    if (request.status === 'PENDING_HOD') {
      if (decision === 'REJECTED') return 'REJECTED_HOD';
      if (decision === 'APPROVED') {
        if (request.studentType === 'DAY_SCHOLAR') return 'ISSUED';
        if (request.studentType === 'HOSTELER') return 'PENDING_HOSTEL_INCHARGE';
      }
    }
    if (request.status === 'PENDING_HOSTEL_INCHARGE') {
      if (decision === 'REJECTED') return 'REJECTED_HOSTEL_INCHARGE';
      if (decision === 'APPROVED') return 'ISSUED';
    }
  }

  // 2. MESS FEE CLEARANCE WORKFLOW: Student -> CTPO -> HOD -> Cleared
  if (type === 'MESS_FEE') {
    if (request.status === 'PENDING_CTPO') {
      if (decision === 'REJECTED') return 'REJECTED_CTPO';
      if (decision === 'APPROVED') return 'PENDING_HOD';
    }
    if (request.status === 'PENDING_HOD') {
      if (decision === 'REJECTED') return 'REJECTED_HOD';
      if (decision === 'APPROVED') return 'APPROVED'; // Cleared
    }
  }

  // 3. INTERNSHIP PERMISSION WORKFLOW: Student -> CTPO -> HOD -> Placement Officer -> Approved
  if (type === 'INTERNSHIP') {
    if (request.status === 'PENDING_CTPO') {
      if (decision === 'REJECTED') return 'REJECTED_CTPO';
      if (decision === 'APPROVED') return 'PENDING_HOD';
    }
    if (request.status === 'PENDING_HOD') {
      if (decision === 'REJECTED') return 'REJECTED_HOD';
      if (decision === 'APPROVED') return 'PENDING_PLACEMENT_OFFICER';
    }
    if (request.status === 'PENDING_PLACEMENT_OFFICER') {
      if (decision === 'REJECTED') return 'REJECTED_PLACEMENT_OFFICER';
      if (decision === 'APPROVED') return 'APPROVED';
    }
  }

  // 4. LIBRARY PERMISSION WORKFLOW: Student -> CTPO -> Approved (Single Stage)
  if (type === 'LIBRARY') {
    if (request.status === 'PENDING_CTPO') {
      if (decision === 'REJECTED') return 'REJECTED_CTPO';
      if (decision === 'APPROVED') return 'APPROVED';
    }
  }

  return request.status;
};

module.exports = { resolveNextStage };
