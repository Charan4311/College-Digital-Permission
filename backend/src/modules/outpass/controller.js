const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const OutpassRequest = require('../../models/OutpassRequest');
const Student = require('../../models/Student');
const User = require('../../models/User');
const ApprovalStep = require('../../models/ApprovalStep');
const QRPass = require('../../models/QRPass');
const { resolveNextStage } = require('./workflowService');
const crypto = require('crypto');
const QRCode = require('qrcode');

// ─── FILE UPLOAD: Upload supporting documents ──────────────────────────────

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database unavailable' });
    }

    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
      metadata: { uploadedBy: req.user.id, kind: 'document' }
    });

    uploadStream.end(req.file.buffer);

    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
    });

    const fileId = uploadStream.id.toString();
    const fileUrl = `/uploads/${fileId}`;
    res.json({
      success: true,
      data: {
        fileId,
        proofFileId: fileId,
        fileUrl,
        fileName: req.file.originalname
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'File upload failed' });
  }
};

exports.getProofFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!ObjectId.isValid(fileId)) {
      return res.status(400).json({ success: false, message: 'Invalid proof file id' });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database unavailable' });
    }

    const request = await OutpassRequest.findOne({
      $or: [
        { documentFileId: fileId },
        { documentUrl: { $regex: new RegExp(`/uploads/${fileId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), $options: 'i' } }
      ]
    }).populate('studentId', 'name role branchId year yearTier studentType').populate('branchId', 'name code');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Proof file not found for any request' });
    }

    const requestStudentId = request.studentId?._id?.toString();
    const isOwner = req.user.role === 'STUDENT' && requestStudentId === req.user.id;

    let isAuthorized = isOwner;
    if (!isAuthorized) {
      const actingUser = await User.findById(req.user.id).lean();
      if (!actingUser) {
        return res.status(401).json({ success: false, message: 'Authenticated user not found' });
      }

      if (req.user.role === 'ADMIN') {
        isAuthorized = true;
      } else if (req.user.role === 'CTPO') {
        isAuthorized = !!request.branchId && actingUser.branchId && request.branchId.toString() === actingUser.branchId.toString() &&
          (!actingUser.assignedYear || !request.year || request.year === actingUser.assignedYear);
      } else if (req.user.role === 'HOD') {
        isAuthorized = (!actingUser.authorityScope?.yearTier || request.yearTier === actingUser.authorityScope.yearTier) &&
          (!actingUser.authorityScope?.studentType || request.studentType === actingUser.authorityScope.studentType);
      } else if (req.user.role === 'HOSTEL_INCHARGE') {
        isAuthorized = request.studentType === 'HOSTELER';
      } else if (req.user.role === 'PLACEMENT_OFFICER') {
        isAuthorized = request.requestType === 'INTERNSHIP';
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied: you are not allowed to view this proof' });
    }

    const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(fileId) });
    if (!file) {
      return res.status(404).json({ success: false, message: 'Proof file not found in GridFS' });
    }

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    const stream = bucket.openDownloadStream(new ObjectId(fileId));
    stream.on('error', () => {
      res.status(404).json({ success: false, message: 'Proof file not found' });
    });
    stream.pipe(res);
  } catch (e) {
    console.error('Get proof file error:', e);
    res.status(500).json({ success: false, message: 'Error fetching proof file' });
  }
};

// ─── STUDENT: Create request (OUTPASS, MESS_FEE, INTERNSHIP, LIBRARY) ───────

exports.createRequest = async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!student.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    const requestType = req.body.requestType || 'OUTPASS';
    if (!['OUTPASS', 'MESS_FEE', 'INTERNSHIP', 'LIBRARY'].includes(requestType)) {
      return res.status(400).json({ success: false, message: 'Invalid request type' });
    }

    // Allow student to dynamically specify DAY_SCHOLAR or HOSTELER on the form
    const studentType = (req.body.studentType || student.studentType || 'DAY_SCHOLAR').toUpperCase();
    if (!['DAY_SCHOLAR', 'HOSTELER'].includes(studentType)) {
      return res.status(400).json({ success: false, message: 'Invalid student type selected. Must be DAY_SCHOLAR or HOSTELER' });
    }

    // Keep student's user profile synchronized if changed
    if (student.studentType !== studentType) {
      student.studentType = studentType;
      await student.save();
    }

    const referenceId = 'PERM-' + new Date().getFullYear() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const documentUrl = req.body.documentUrl || null;
    const documentFileId = req.body.documentFileId || (typeof documentUrl === 'string' ? documentUrl.split('/').filter(Boolean).pop() : null);

    const baseData = {
      referenceId,
      emergencyContact: req.body.emergencyContact || student.phone || '',
      requestType,
      studentId: student._id,
      branchId: student.branchId,
      year: student.year || 4,
      yearTier: student.yearTier || 'TIER_4TH',
      studentType,
      status: 'PENDING_CTPO',
      currentApproverRole: 'CTPO',
      documentUrl,
      documentName: req.body.documentName || null,
      documentFileId: documentFileId || null
    };

    if (requestType === 'OUTPASS') {
      const { reason, outDate, outTime, expectedReturnDate, expectedReturnTime } = req.body;
      if (!reason || !outDate || !outTime || !expectedReturnDate || !expectedReturnTime) {
        return res.status(400).json({ success: false, message: 'All out-pass fields are required' });
      }
      Object.assign(baseData, {
        reason,
        outDate: new Date(outDate),
        outTime,
        expectedReturnDate: new Date(expectedReturnDate),
        expectedReturnTime
      });
    } else if (requestType === 'MESS_FEE') {
      const { reason, startDate, endDate, messAmount, paidStatus } = req.body;
      if (!reason || !startDate || !endDate || messAmount === undefined || !paidStatus) {
        return res.status(400).json({ success: false, message: 'Reason, start date, end date, mess amount, and paid status are required' });
      }
      if (!req.body.documentUrl || !req.body.documentName) {
        return res.status(400).json({ success: false, message: 'Please upload the required mess fee proof document.' });
      }
      Object.assign(baseData, {
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        messAmount: Number(messAmount),
        paidStatus
      });
    } else if (requestType === 'INTERNSHIP') {
      const { companyName, companyLocation, role, internshipMode, startDate, endDate } = req.body;
      if (!companyName || !companyLocation || !role || !internshipMode || !startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'All internship fields (Company, Location, Role, Mode, Dates) are required' });
      }
      if (!req.body.documentUrl || !req.body.documentName) {
        return res.status(400).json({ success: false, message: 'Please upload the required internship proof document.' });
      }
      Object.assign(baseData, {
        companyName,
        companyLocation,
        role,
        internshipMode,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: `Internship at ${companyName} (${role})`
      });
    } else if (requestType === 'LIBRARY') {
      const { reason, requestDate } = req.body;
      if (!reason || !requestDate) {
        return res.status(400).json({ success: false, message: 'Reason and date are required for library permission' });
      }
      Object.assign(baseData, {
        reason,
        requestDate: new Date(requestDate)
      });
    }

    const request = await OutpassRequest.create(baseData);
    res.status(201).json({ success: true, data: request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── STUDENT: Edit & Resubmit Rejected Request ─────────────────────────────

exports.resubmitRequest = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (request.studentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return res.status(403).json({
      success: false,
      message: 'Permission resubmission is disabled. Please create a new request instead.'
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error during resubmission' });
  }
};

// ─── STUDENT: My requests ──────────────────────────────────────────────────

exports.getMyRequests = async (req, res) => {
  try {
    const requests = await OutpassRequest.find({ studentId: req.user.id })
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── ANY ROLE: Get one request (with full approval history) ───────────────

exports.getRequest = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id)
      .populate('studentId', 'name rollNo yearTier studentType')
      .populate('branchId', 'name code');

    if (!request) return res.status(404).json({ success: false, message: 'Not found' });

    // Authorization: student can only see their own
    if (req.user.role === 'STUDENT' && request.studentId._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const approvalSteps = await ApprovalStep.find({ requestId: req.params.id })
      .populate('approverUserId', 'name role')
      .sort({ decidedAt: 1 });

    // Get QR if issued
    let qrPass = null;
    if (request.status === 'ISSUED' || request.status === 'USED') {
      qrPass = await QRPass.findOne({ requestId: request._id }).select('-__v');
    }

    res.json({ success: true, data: { request, approvalSteps, qrPass } });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── APPROVER: Pending requests filtered by role & scope ──────────────────

exports.getPendingForMe = async (req, res) => {
  try {
    const { role, id } = req.user;
    let filter = {};

    if (role === 'CTPO') {
      // Load the user to get their branchId and optional assignedYear
      const user = await User.findById(id);
      if (!user?.branchId) return res.status(400).json({ success: false, message: 'CTPO has no branch assigned' });
      filter = { status: 'PENDING_CTPO', branchId: user.branchId };
      if (user.assignedYear) {
        filter.year = user.assignedYear;
      }

    } else if (role === 'HOD') {
      const user = await User.findById(id);
      filter = { status: 'PENDING_HOD' };
      if (user?.authorityScope?.studentType) {
        filter.studentType = user.authorityScope.studentType;
      }
      if (user?.authorityScope?.yearTier) {
        filter.yearTier = user.authorityScope.yearTier;
      }

    } else if (role === 'HOSTEL_INCHARGE') {
      filter = { status: 'PENDING_HOSTEL_INCHARGE' };

    } else if (role === 'PLACEMENT_OFFICER') {
      // Placement Officer must only receive Internship requests that have already passed CTPO + HOD review.
      filter = {
        requestType: 'INTERNSHIP',
        status: 'PENDING_PLACEMENT_OFFICER'
      };

    } else {
      return res.status(403).json({ success: false, message: 'Role cannot have pending requests' });
    }

    const requests = await OutpassRequest.find(filter)
      .populate('studentId', 'name rollNo yearTier studentType')
      .populate('branchId', 'name code')
      .sort({ createdAt: 1 }); // oldest first

    res.json({ success: true, data: requests });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── APPROVER: All requests visible to me (history) ──────────────────────

exports.getAllForMe = async (req, res) => {
  try {
    const { role, id } = req.user;
    let filter = {};

    if (role === 'CTPO') {
      const user = await User.findById(id);
      if (!user?.branchId) return res.status(400).json({ success: false, message: 'No branch assigned' });
      filter = { branchId: user.branchId };
      if (user.assignedYear) {
        filter.year = user.assignedYear;
      }

    } else if (role === 'HOD') {
      const user = await User.findById(id);
      filter = {};
      if (user?.authorityScope?.yearTier) {
        filter.yearTier = user.authorityScope.yearTier;
      }
      if (user?.authorityScope?.studentType) {
        filter.studentType = user.authorityScope.studentType;
      }

    } else if (role === 'HOSTEL_INCHARGE') {
      filter = { studentType: 'HOSTELER' };

    } else if (role === 'PLACEMENT_OFFICER') {
      // Placement Officer should only see Internship requests that have already cleared CTPO and HOD approval.
      filter = {
        requestType: 'INTERNSHIP',
        status: {
          $in: ['PENDING_PLACEMENT_OFFICER', 'APPROVED', 'REJECTED_PLACEMENT_OFFICER']
        }
      };
    }

    const requests = await OutpassRequest.find(filter)
      .populate('studentId', 'name rollNo')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: requests });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── Helper: validate authority to act on a request ──────────────────────

async function validateAuthority(request, user) {
  const { role, id } = user;

  if (role === 'CTPO') {
    if (request.status !== 'PENDING_CTPO') return 'Request is not pending CTPO approval';
    const dbUser = await User.findById(id);
    if (!dbUser?.branchId) return 'No branch assigned to this CTPO';
    if (request.branchId.toString() !== dbUser.branchId.toString()) return 'This request is not from your branch';
    if (dbUser.assignedYear && request.year && request.year !== dbUser.assignedYear) {
      return `This request is for Year ${request.year}, but you are CTPO for Year ${dbUser.assignedYear}`;
    }

  } else if (role === 'HOD') {
    if (request.status !== 'PENDING_HOD') return 'Request is not pending HOD approval';
    const dbUser = await User.findById(id);
    if (dbUser.authorityScope?.yearTier && request.yearTier && request.yearTier !== dbUser.authorityScope.yearTier) {
      return 'This request is not in your year tier';
    }
    if (dbUser.authorityScope?.studentType && request.studentType && request.studentType !== dbUser.authorityScope.studentType) {
      return 'This request student type does not match your scope';
    }

  } else if (role === 'HOSTEL_INCHARGE') {
    if (request.status !== 'PENDING_HOSTEL_INCHARGE') return 'Request is not pending Hostel In-charge approval';

  } else if (role === 'PLACEMENT_OFFICER') {
    if (request.status !== 'PENDING_PLACEMENT_OFFICER') return 'Request is not pending Placement Officer approval';
    if (request.requestType !== 'INTERNSHIP') return 'Placement Officer can only review Internship requests';

  } else {
    return 'Your role cannot approve/reject requests';
  }

  return null; // null = no error = authorized
}

// ─── APPROVER: Approve ─────────────────────────────────────────────────────

exports.approveRequest = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const authError = await validateAuthority(request, req.user);
    if (authError) return res.status(403).json({ success: false, message: authError });

    const newStatus = resolveNextStage(request, 'APPROVED');
    const prevRole = request.currentApproverRole;
    request.status = newStatus;

    // Set next approver role
    if (newStatus === 'PENDING_HOD') request.currentApproverRole = 'HOD';
    else if (newStatus === 'PENDING_HOSTEL_INCHARGE') request.currentApproverRole = 'HOSTEL_INCHARGE';
    else if (newStatus === 'PENDING_PLACEMENT_OFFICER') request.currentApproverRole = 'PLACEMENT_OFFICER';
    else if (newStatus === 'ISSUED' || newStatus === 'APPROVED') request.currentApproverRole = null;

    await ApprovalStep.create({
      requestId: request._id,
      role: prevRole,
      approverUserId: req.user.id,
      decision: 'APPROVED',
      remarks: req.body.remarks || ''
    });

    if (newStatus === 'ISSUED') {
      const token = crypto.randomUUID();
      const expiresAt = new Date(request.outDate);
      expiresAt.setHours(23, 59, 59, 999);
      const verifyUrl = `${process.env.QR_BASE_URL || 'http://localhost:5173'}/api/security/verify/${token}`;
      await QRPass.create({ requestId: request._id, token, expiresAt });
      // Store the token on the request for quick access
      request.qrToken = token;
    }

    await request.save();
    res.json({ success: true, data: request });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── APPROVER: Reject ──────────────────────────────────────────────────────

exports.rejectRequest = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    const authError = await validateAuthority(request, req.user);
    if (authError) return res.status(403).json({ success: false, message: authError });

    if (!req.body.remarks) {
      return res.status(400).json({ success: false, message: 'Remarks are required when rejecting a request' });
    }

    const prevRole = request.currentApproverRole;
    const newStatus = resolveNextStage(request, 'REJECTED');
    request.status = newStatus;
    request.currentApproverRole = null;
    request.rejectionReason = req.body.remarks;
    request.rejectedByRole = prevRole;

    await ApprovalStep.create({
      requestId: request._id,
      role: prevRole,
      approverUserId: req.user.id,
      decision: 'REJECTED',
      remarks: req.body.remarks
    });

    await request.save();
    res.json({ success: true, data: request });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── APPROVER/ADMIN: Dashboard stats (Recharts data) ─────────────────────

exports.getDashboardStats = async (req, res) => {
  try {
    const { role, id } = req.user;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let matchFilter = { createdAt: { $gte: sevenDaysAgo } };

    if (role === 'CTPO') {
      const user = await User.findById(id);
      if (user?.branchId) matchFilter.branchId = user.branchId;
      if (user?.assignedYear) matchFilter.year = user.assignedYear;
    } else if (role === 'HOD') {
      const user = await User.findById(id);
      if (user?.authorityScope?.yearTier) matchFilter.yearTier = user.authorityScope.yearTier;
      if (user?.authorityScope?.studentType) matchFilter.studentType = user.authorityScope.studentType;
    } else if (role === 'HOSTEL_INCHARGE') {
      matchFilter.studentType = 'HOSTELER';
    } else if (role === 'PLACEMENT_OFFICER') {
      matchFilter.requestType = 'INTERNSHIP';
    }

    // Approved vs rejected per day
    const matchStage = {
      decidedAt: { $gte: sevenDaysAgo },
      ...(matchFilter.branchId && { 'request.branchId': matchFilter.branchId }),
      ...(matchFilter.year && { 'request.year': matchFilter.year }),
      ...(matchFilter.yearTier && { 'request.yearTier': matchFilter.yearTier }),
      ...(matchFilter.studentType && { 'request.studentType': matchFilter.studentType }),
      ...(matchFilter.requestType && { 'request.requestType': matchFilter.requestType })
    };

    const approvedPerDay = await ApprovalStep.aggregate([
      {
        $lookup: {
          from: 'outpassrequests',
          localField: 'requestId',
          foreignField: '_id',
          as: 'request'
        }
      },
      { $unwind: '$request' },
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$decidedAt' } },
            decision: '$decision'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Pending count right now
    const pendingStatus = role === 'CTPO' ? 'PENDING_CTPO'
      : role === 'HOD' ? 'PENDING_HOD'
      : role === 'HOSTEL_INCHARGE' ? 'PENDING_HOSTEL_INCHARGE'
      : 'PENDING_PLACEMENT_OFFICER';

    const pendingFilter = { ...matchFilter, status: pendingStatus };
    delete pendingFilter.createdAt; // pending is all current pending, regardless of when created
    const pendingCount = await OutpassRequest.countDocuments(pendingFilter);

    const totalFilter = { ...matchFilter };
    delete totalFilter.createdAt;
    const totalRequests = await OutpassRequest.countDocuments(totalFilter);

    res.json({ success: true, data: { approvedPerDay, pendingCount, totalRequests } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── STUDENT/ADMIN: Get QR image for an issued pass ───────────────────────

exports.getQRImage = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Authorization: only the owning student or admin
    if (req.user.role === 'STUDENT' && request.studentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (request.status !== 'ISSUED' && request.status !== 'USED') {
      return res.status(400).json({ success: false, message: 'QR is only available for issued passes' });
    }

    const qrPass = await QRPass.findOne({ requestId: request._id });
    if (!qrPass) return res.status(404).json({ success: false, message: 'QR pass not found' });

    const verifyUrl = `${process.env.QR_BASE_URL || 'http://localhost:5173'}/verify/${qrPass.token}`;
    const qrImage = await QRCode.toDataURL(verifyUrl, { width: 300, margin: 2 });

    res.json({
      success: true,
      data: {
        qrImage,
        token: qrPass.token,
        status: qrPass.status,
        issuedAt: qrPass.issuedAt,
        expiresAt: qrPass.expiresAt
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
