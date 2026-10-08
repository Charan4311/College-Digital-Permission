const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const QRCode = require('qrcode');
const OutpassRequest = require('../../models/OutpassRequest');
const ApprovalStep = require('../../models/ApprovalStep');
const QRPass = require('../../models/QRPass');
const User = require('../../models/User');
const Branch = require('../../models/Branch');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { generateUniqueShortCode, normalizePassCode } = require('../../utils/passCode');
const { parseAndValidateDate, getISTDateRange } = require('../../utils/dateValidation');
const { isCloudinaryConfigured, uploadToCloudinary } = require('../../utils/cloudinary');
const {
  PERMISSION_TYPES,
  MESS_FEE_MAX_YEARLY,
  mapStatusToSimple
} = require('../../config/constants');

// ─────────────────────────────────────────────────────────────
// FILE UPLOAD (Cloudinary + Local/GridFS fallback)
// ─────────────────────────────────────────────────────────────
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    let fileUrl = '';
    let documentPublicId = '';
    let documentMime = req.file.mimetype || '';

    // 1. Try Cloudinary if credentials are configured
    if (isCloudinaryConfigured()) {
      try {
        const cloudResult = await uploadToCloudinary(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        fileUrl = cloudResult.url;
        documentPublicId = cloudResult.publicId;
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to disk/GridFS:', cloudErr.message);
      }
    }

    // 2. Fallback to Local Disk and GridFS
    if (!fileUrl) {
      const uploadDir = path.join(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(req.file.originalname || '');
      const diskPath = path.join(uploadDir, uniqueName);
      fs.writeFileSync(diskPath, req.file.buffer);

      fileUrl = `/uploads/${uniqueName}`;

      const db = mongoose.connection.db;
      if (db) {
        try {
          const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
          const uploadStream = bucket.openUploadStream(uniqueName, {
            contentType: req.file.mimetype,
            metadata: {
              uploadedBy: req.user.id,
              kind: 'outpass-document',
              originalName: req.file.originalname,
              contentType: req.file.mimetype
            }
          });
          uploadStream.end(req.file.buffer);
        } catch (err) {
          console.warn('GridFS save warning:', err.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        fileUrl,
        documentUrl: fileUrl,
        fileName: req.file.originalname,
        documentName: req.file.originalname,
        documentPublicId,
        documentMime
      }
    });
  } catch (e) {
    console.error('[FILE UPLOAD ERROR]', e);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// CREATE REQUEST
// ─────────────────────────────────────────────────────────────
exports.createRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      requestType,
      permissionType,
      year,
      yearTier,
      branchId,
      reason,
      emergencyContact,
      outDate,
      outTime,
      expectedReturnDate,
      expectedReturnTime,
      returnDate,
      startDate,
      endDate,
      messAmount,
      paidStatus,
      companyName,
      companyLocation,
      role,
      internshipMode,
      requestDate,
      documentUrl,
      documentName,
      documentPublicId,
      documentMime,
      ...otherFields
    } = req.body;

    const type = String(requestType || permissionType || 'OUTPASS').toUpperCase();
    if (!['OUTPASS', 'INTERNSHIP', 'MESS_FEE', 'LIBRARY'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Valid request type is required (OUTPASS, INTERNSHIP, MESS_FEE, LIBRARY)'
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reason / purpose is required'
      });
    }

    const student = await User.findById(userId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    const newRequestData = {
      ...otherFields,
      studentId: userId,
      requestType: type,
      reason: String(reason).trim(),
      year: year || student.year || 4,
      yearTier: yearTier || student.yearTier || 'TIER_4TH',
      branchId: branchId || student.branchId,
      status: 'PENDING_CTPO',
      currentApproverRole: 'CTPO',
      documentUrl: documentUrl || '',
      documentName: documentName || '',
      documentPublicId: documentPublicId || '',
      documentMime: documentMime || ''
    };

    // Reference ID generator
    const now = new Date();
    const prefix = type === 'OUTPASS' ? 'OUT' : type === 'MESS_FEE' ? 'MSG' : type === 'INTERNSHIP' ? 'INT' : 'LIB';
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    newRequestData.referenceId = `KDP-${now.getFullYear()}-${randomSix}`;

    // 1. OUTPASS SPECIFIC VALIDATIONS
    if (type === 'OUTPASS') {
      if (!outDate) {
        return res.status(400).json({ success: false, message: 'Out date is required' });
      }
      const outCheck = parseAndValidateDate(outDate, 'Out date');
      if (!outCheck.valid) return res.status(400).json({ success: false, message: outCheck.error });

      const finalReturnDate = expectedReturnDate || returnDate;
      if (!finalReturnDate) {
        return res.status(400).json({ success: false, message: 'Return date is required' });
      }
      const retCheck = parseAndValidateDate(finalReturnDate, 'Return date');
      if (!retCheck.valid) return res.status(400).json({ success: false, message: retCheck.error });

      if (retCheck.date < outCheck.date) {
        return res.status(400).json({ success: false, message: 'Return date cannot be before out date' });
      }

      if (emergencyContact) {
        const digits = String(emergencyContact).replace(/\D/g, '');
        if (digits.length !== 10) {
          return res.status(400).json({ success: false, message: 'Emergency contact number must be exactly 10 digits' });
        }
        newRequestData.emergencyContact = digits;
      }

      newRequestData.outDate = outCheck.date;
      newRequestData.outTime = outTime || '09:00 AM';
      newRequestData.expectedReturnDate = retCheck.date;
      // Do NOT set default return time
      if (expectedReturnTime) {
        newRequestData.expectedReturnTime = expectedReturnTime;
      }
    }

    // 2. MESS FEE CLEARANCE VALIDATIONS
    if (type === 'MESS_FEE') {
      const parsedAmount = Number(messAmount);
      if (isNaN(parsedAmount) || !Number.isInteger(parsedAmount) || parsedAmount < 100 || parsedAmount % 100 !== 0) {
        return res.status(400).json({
          success: false,
          message: 'Mess amount must be a multiple of 100 and at least ₹100'
        });
      }

      if (parsedAmount > MESS_FEE_MAX_YEARLY) {
        return res.status(400).json({
          success: false,
          message: `Mess amount cannot exceed the yearly maximum of ₹${MESS_FEE_MAX_YEARLY.toLocaleString('en-IN')}`
        });
      }

      // Check sum of existing non-rejected mess fee requests this academic year
      const existingMessRequests = await OutpassRequest.find({
        studentId: userId,
        requestType: 'MESS_FEE',
        status: { $nin: ['REJECTED', 'REJECTED_CTPO', 'REJECTED_HOD', 'CANCELLED'] }
      });

      const currentTotal = existingMessRequests.reduce((sum, r) => sum + (Number(r.messAmount) || 0), 0);
      if (currentTotal + parsedAmount > MESS_FEE_MAX_YEARLY) {
        return res.status(400).json({
          success: false,
          message: `Total mess fee clearance requests cannot exceed ₹${MESS_FEE_MAX_YEARLY.toLocaleString('en-IN')} per academic year. Current active sum: ₹${currentTotal.toLocaleString('en-IN')}`
        });
      }

      if (startDate) {
        const startCheck = parseAndValidateDate(startDate, 'Start date');
        if (!startCheck.valid) return res.status(400).json({ success: false, message: startCheck.error });
        newRequestData.startDate = startCheck.date;
      }
      if (endDate) {
        const endCheck = parseAndValidateDate(endDate, 'End date');
        if (!endCheck.valid) return res.status(400).json({ success: false, message: endCheck.error });
        if (newRequestData.startDate && endCheck.date < newRequestData.startDate) {
          return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
        }
        newRequestData.endDate = endCheck.date;
      }

      newRequestData.messAmount = parsedAmount;
      newRequestData.paidStatus = paidStatus || 'Paid';
    }

    // 3. INTERNSHIP PERMISSION VALIDATIONS
    if (type === 'INTERNSHIP') {
      if (!startDate) {
        return res.status(400).json({ success: false, message: 'Internship start date is required' });
      }
      const startCheck = parseAndValidateDate(startDate, 'Start date');
      if (!startCheck.valid) return res.status(400).json({ success: false, message: startCheck.error });

      if (!endDate) {
        return res.status(400).json({ success: false, message: 'Internship end date is required' });
      }
      const endCheck = parseAndValidateDate(endDate, 'End date');
      if (!endCheck.valid) return res.status(400).json({ success: false, message: endCheck.error });

      if (endCheck.date < startCheck.date) {
        return res.status(400).json({ success: false, message: 'Internship end date must be on or after start date' });
      }

      const twelveMonthsLater = new Date(startCheck.date);
      twelveMonthsLater.setFullYear(twelveMonthsLater.getFullYear() + 1);
      if (endCheck.date > twelveMonthsLater) {
        return res.status(400).json({ success: false, message: 'Internship duration cannot exceed 12 months' });
      }

      newRequestData.startDate = startCheck.date;
      newRequestData.endDate = endCheck.date;
      newRequestData.companyName = companyName || '';
      newRequestData.companyLocation = companyLocation || '';
      newRequestData.role = role || '';
      newRequestData.internshipMode = internshipMode || 'Offline';
    }

    // 4. LIBRARY ACCESS VALIDATIONS
    if (type === 'LIBRARY') {
      const accDate = requestDate || outDate || now;
      const dateCheck = parseAndValidateDate(accDate, 'Access date');
      if (!dateCheck.valid) return res.status(400).json({ success: false, message: dateCheck.error });
      newRequestData.requestDate = dateCheck.date;
    }

    const createdRequest = await OutpassRequest.create(newRequestData);

    res.status(201).json({
      success: true,
      data: createdRequest
    });
  } catch (e) {
    console.error('[CREATE REQUEST ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET MY REQUESTS (Student)
// ─────────────────────────────────────────────────────────────
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await OutpassRequest.find({ studentId: req.user.id })
      .populate('branchId', 'name code')
      .populate('studentId', 'name rollNo year yearTier residenceType profileImage')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (e) {
    console.error('[GET MY REQUESTS ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET SINGLE REQUEST
// ─────────────────────────────────────────────────────────────
exports.getRequest = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id)
      .populate('studentId', 'name username rollNo year yearTier residenceType profileImage branchId')
      .populate('branchId', 'name code');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    const steps = await ApprovalStep.find({ requestId: request._id })
      .populate('approverUserId', 'name username role')
      .sort({ decidedAt: 1 });

    res.json({
      success: true,
      data: {
        request,
        approvalSteps: steps
      }
    });
  } catch (e) {
    console.error('[GET REQUEST ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET ALL REQUESTS FOR APPROVER (Connected with unified filtering)
// ─────────────────────────────────────────────────────────────
exports.getAllForMe = async (req, res) => {
  try {
    const { role, id } = req.user;
    const {
      type,
      requestType,
      status,
      search,
      from,
      to,
      dateFrom,
      dateTo,
      branchCode,
      department
    } = req.query;

    let filter = {};

    // 1. Role-specific authority scopes
    if (role === 'CTPO') {
      const user = await User.findById(id);
      if (user?.branchId) filter.branchId = user.branchId;
      if (user?.assignedYear) filter.year = user.assignedYear;
    } else if (role === 'HOD') {
      const user = await User.findById(id);
      if (user?.authorityScope?.yearTier) {
        filter.yearTier = user.authorityScope.yearTier;
      }
      if (!type && !requestType) {
        filter.requestType = { $ne: 'LIBRARY' };
      }
    } else if (role === 'HOSTEL_INCHARGE') {
      // Find all hosteler student IDs first
      const hostelerStudents = await User.find({
        role: 'STUDENT',
        $or: [
          { residenceType: { $in: ['hosteler', 'HOSTELER'] } },
          { studentType: { $in: ['hosteler', 'HOSTELER', 'Hosteler'] } }
        ]
      }).select('_id');

      const hostelerIds = hostelerStudents.map((s) => s._id);
      filter.studentId = { $in: hostelerIds };
      filter.requestType = 'OUTPASS';
      filter.$or = [
        { status: 'PENDING_HOSTEL_INCHARGE' },
        { status: { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] } },
        { status: 'REJECTED_HOSTEL_INCHARGE' },
        { status: { $regex: /^REJECTED_HOSTEL/i } },
        { status: { $in: ['REJECTED', 'CANCELLED'] }, rejectedByRole: { $in: ['HOSTEL_INCHARGE', 'HOSTEL', 'hostel_incharge'] } }
      ];
    } else if (role === 'PLACEMENT_OFFICER') {
      filter.requestType = 'INTERNSHIP';
      filter.status = {
        $in: [
          'PENDING_PLACEMENT_OFFICER',
          'APPROVED',
          'ISSUED',
          'CLEARED',
          'USED',
          'REJECTED_PLACEMENT_OFFICER'
        ]
      };
    }

    // 2. Type filter
    const selectedType = type || requestType;
    if (selectedType && selectedType !== 'ALL') {
      if (role !== 'HOSTEL_INCHARGE') {
        filter.requestType = selectedType.toUpperCase();
      }
    }

    // 3. Status filter
    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      if (role === 'HOSTEL_INCHARGE') {
        delete filter.$or;
        if (s === 'APPROVED') {
          filter.status = { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] };
        } else if (s === 'PENDING') {
          filter.status = 'PENDING_HOSTEL_INCHARGE';
        } else if (s === 'REJECTED') {
          filter.$or = [
            { status: 'REJECTED_HOSTEL_INCHARGE' },
            { status: { $regex: /^REJECTED_HOSTEL/i } },
            { status: { $in: ['REJECTED', 'CANCELLED'] }, rejectedByRole: { $in: ['HOSTEL_INCHARGE', 'HOSTEL', 'hostel_incharge'] } }
          ];
        } else {
          filter.status = s;
        }
      } else {
        if (s === 'APPROVED') {
          filter.status = { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] };
        } else if (s === 'PENDING') {
          filter.status = role === 'PLACEMENT_OFFICER'
            ? 'PENDING_PLACEMENT_OFFICER'
            : { $regex: /^PENDING/i };
        } else if (s === 'REJECTED') {
          filter.status = role === 'PLACEMENT_OFFICER'
            ? 'REJECTED_PLACEMENT_OFFICER'
            : { $regex: /^REJECTED|^CANCELLED/i };
        } else {
          filter.status = s;
        }
      }
    }

    // 4. Branch/Department filter (if provided by HOD or Admin)
    const targetBranch = branchCode || department;
    if (targetBranch && targetBranch !== 'ALL') {
      const branchDoc = await Branch.findOne({
        $or: [
          { code: targetBranch.toUpperCase() },
          { name: targetBranch }
        ]
      });
      if (branchDoc) {
        filter.branchId = branchDoc._id;
      }
    }

    // 5. Date Range filter (inclusive IST)
    const fDate = from || dateFrom;
    const tDate = to || dateTo;
    if (fDate || tDate) {
      const rangeResult = getISTDateRange(fDate, tDate);
      if (rangeResult?.query) {
        filter.createdAt = rangeResult.query;
      }
    }

    // 6. Search filter (by student name or roll number)
    if (search && search.trim()) {
      const cleanSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingUsers = await User.find({
        role: 'STUDENT',
        $or: [
          { name: { $regex: cleanSearch, $options: 'i' } },
          { rollNo: { $regex: cleanSearch, $options: 'i' } }
        ]
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      if (filter.studentId?.$in) {
        filter.studentId.$in = filter.studentId.$in.filter((id) =>
          userIds.some((uid) => uid.toString() === id.toString())
        );
      } else {
        filter.studentId = { $in: userIds };
      }
    }

    const requests = await OutpassRequest.find(filter)
      .populate('studentId', 'name rollNo year yearTier residenceType profileImage')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (e) {
    console.error('[GET ALL REQUESTS ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// GET PENDING REQUESTS FOR APPROVER
// ─────────────────────────────────────────────────────────────
exports.getPendingForMe = async (req, res) => {
  try {
    const { role, id } = req.user;
    let filter = {};

    if (role === 'CTPO') {
      const user = await User.findById(id);
      filter.status = 'PENDING_CTPO';
      if (user?.branchId) filter.branchId = user.branchId;
      if (user?.assignedYear) filter.year = user.assignedYear;
    } else if (role === 'HOD') {
      const user = await User.findById(id);
      filter.status = { $in: ['PENDING_HOD', 'PENDING_HOD_APPROVAL'] };
      if (user?.authorityScope?.yearTier) {
        filter.yearTier = user.authorityScope.yearTier;
      }
    } else if (role === 'HOSTEL_INCHARGE') {
      const hostelerStudents = await User.find({
        role: 'STUDENT',
        $or: [
          { residenceType: { $in: ['hosteler', 'HOSTELER'] } },
          { studentType: { $in: ['hosteler', 'HOSTELER', 'Hosteler'] } }
        ]
      }).select('_id');

      filter.status = 'PENDING_HOSTEL_INCHARGE';
      filter.studentId = { $in: hostelerStudents.map((s) => s._id) };
      filter.requestType = 'OUTPASS';
    } else if (role === 'PLACEMENT_OFFICER') {
      filter.status = 'PENDING_PLACEMENT_OFFICER';
      filter.requestType = 'INTERNSHIP';
    } else {
      return res.status(403).json({
        success: false,
        message: 'Your role cannot view pending requests'
      });
    }

    const requests = await OutpassRequest.find(filter)
      .populate('studentId', 'name rollNo year yearTier residenceType profileImage')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (e) {
    console.error('[GET PENDING ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// WORKFLOW LOGIC
// ─────────────────────────────────────────────────────────────
function getWorkflowChain(request) {
  const type = String(request.requestType || '').toUpperCase();
  if (type === 'OUTPASS') return ['CTPO', 'HOD'];
  if (type === 'MESS_FEE') return ['CTPO', 'HOD'];
  if (type === 'INTERNSHIP') return ['CTPO', 'HOD', 'PLACEMENT_OFFICER'];
  if (type === 'LIBRARY') return ['CTPO'];
  return ['CTPO', 'HOD'];
}

function resolveNextStage(request, decision) {
  if (decision === 'REJECTED') {
    return 'REJECTED';
  }

  const chain = getWorkflowChain(request);
  const currentRole = request.currentApproverRole;
  const currentIndex = chain.indexOf(currentRole);

  if (currentIndex === -1) {
    return 'APPROVED';
  }

  const nextRole = chain[currentIndex + 1];
  if (!nextRole) {
    if (request.requestType === 'OUTPASS') return 'ISSUED';
    if (request.requestType === 'MESS_FEE') return 'CLEARED';
    return 'APPROVED';
  }

  return `PENDING_${nextRole}`;
}

async function validateAuthority(request, user) {
  const { role, id } = user;

  if (role === 'CTPO') {
    if (request.status !== 'PENDING_CTPO') {
      return 'Request is not pending CTPO approval';
    }
    const dbUser = await User.findById(id);
    if (!dbUser?.branchId) return 'No branch assigned to this CTPO';
    if (request.branchId?.toString() !== dbUser.branchId.toString()) {
      return 'This request is not from your branch';
    }
    if (dbUser.assignedYear && request.year && request.year !== dbUser.assignedYear) {
      return `This request is for Year ${request.year}, but you are CTPO for Year ${dbUser.assignedYear}`;
    }
  } else if (role === 'HOD') {
    if (!['PENDING_HOD', 'PENDING_HOD_APPROVAL'].includes(request.status)) {
      return 'Request is not pending HOD approval';
    }
    const dbUser = await User.findById(id);
    if (dbUser.authorityScope?.yearTier && request.yearTier && request.yearTier !== dbUser.authorityScope.yearTier) {
      return 'This request is not in your year tier';
    }
  } else if (role === 'HOSTEL_INCHARGE') {
    if (request.status !== 'PENDING_HOSTEL_INCHARGE') {
      return 'Request is not pending Hostel In-charge approval';
    }
  } else if (role === 'PLACEMENT_OFFICER') {
    if (request.status !== 'PENDING_PLACEMENT_OFFICER') {
      return 'Request is not pending Placement Officer approval';
    }
    if (request.requestType !== 'INTERNSHIP') {
      return 'Placement Officer can only review Internship requests';
    }
  } else {
    return 'Your role cannot approve/reject requests';
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// APPROVE REQUEST
// ─────────────────────────────────────────────────────────────
exports.approveRequest = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const authError = await validateAuthority(request, req.user);
    if (authError) {
      return res.status(403).json({ success: false, message: authError });
    }

    const prevRole = request.currentApproverRole;
    const studentUser = await User.findById(request.studentId);
    const isHosteler = (
      ['hosteler', 'HOSTELER'].includes(studentUser?.residenceType) ||
      ['hosteler', 'HOSTELER', 'Hosteler'].includes(studentUser?.studentType)
    );
    const newStatus = resolveNextStage(request, 'APPROVED', isHosteler);

    request.status = newStatus;
    if (newStatus === 'PENDING_HOD') {
      request.currentApproverRole = 'HOD';
    } else if (newStatus === 'PENDING_HOSTEL_INCHARGE') {
      request.currentApproverRole = 'HOSTEL_INCHARGE';
    } else if (newStatus === 'PENDING_PLACEMENT_OFFICER') {
      request.currentApproverRole = 'PLACEMENT_OFFICER';
    } else {
      request.currentApproverRole = null;
    }

    await ApprovalStep.create({
      requestId: request._id,
      role: prevRole,
      approverUserId: req.user.id,
      decision: 'APPROVED',
      remarks: req.body?.remarks || ''
    });

    // Generate Short Code and QR Pass when Out-Pass reaches final approval (ISSUED)
    if (request.requestType === 'OUTPASS' && (newStatus === 'ISSUED' || newStatus === 'APPROVED')) {
      const shortCode = await generateUniqueShortCode();
      const token = crypto.randomUUID();

      const expiresAt = new Date(request.expectedReturnDate || request.outDate || Date.now());
      expiresAt.setHours(23, 59, 59, 999);

      await QRPass.findOneAndUpdate(
        { requestId: request._id },
        {
          requestId: request._id,
          token,
          shortCode,
          expiresAt,
          status: 'ACTIVE'
        },
        { upsert: true, new: true }
      );

      request.qrToken = token;
      request.shortCode = shortCode;
    }

    await request.save();

    res.json({
      success: true,
      data: request
    });
  } catch (e) {
    console.error('[APPROVE REQUEST ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// REJECT REQUEST
// ─────────────────────────────────────────────────────────────
exports.rejectRequest = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const authError = await validateAuthority(request, req.user);
    if (authError) {
      return res.status(403).json({ success: false, message: authError });
    }

    if (!req.body?.remarks || !String(req.body.remarks).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Remarks are required when rejecting a request'
      });
    }

    const prevRole = request.currentApproverRole;
    request.status = 'REJECTED';
    request.currentApproverRole = null;
    request.rejectionReason = req.body.remarks.trim();
    request.rejectedByRole = prevRole;

    await ApprovalStep.create({
      requestId: request._id,
      role: prevRole,
      approverUserId: req.user.id,
      decision: 'REJECTED',
      remarks: req.body.remarks.trim()
    });

    await request.save();

    res.json({
      success: true,
      data: request
    });
  } catch (e) {
    console.error('[REJECT REQUEST ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const { role, id } = req.user;
    let matchFilter = {};

    if (role === 'CTPO') {
      const user = await User.findById(id);
      if (user?.branchId) matchFilter.branchId = user.branchId;
      if (user?.assignedYear) matchFilter.year = user.assignedYear;
    } else if (role === 'HOD') {
      const user = await User.findById(id);
      if (user?.authorityScope?.yearTier) {
        matchFilter.yearTier = user.authorityScope.yearTier;
      }
      matchFilter.requestType = { $ne: 'LIBRARY' };
    } else if (role === 'HOSTEL_INCHARGE') {
      const hostelerStudents = await User.find({
        role: 'STUDENT',
        $or: [
          { residenceType: { $in: ['hosteler', 'HOSTELER'] } },
          { studentType: { $in: ['hosteler', 'HOSTELER', 'Hosteler'] } }
        ]
      }).select('_id');
      const hostelerIds = hostelerStudents.map((s) => s._id);

      const baseHostelFilter = {
        studentId: { $in: hostelerIds },
        requestType: 'OUTPASS'
      };

      const [pending, approved, rejected] = await Promise.all([
        OutpassRequest.countDocuments({
          ...baseHostelFilter,
          status: 'PENDING_HOSTEL_INCHARGE'
        }),
        OutpassRequest.countDocuments({
          ...baseHostelFilter,
          status: { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] }
        }),
        OutpassRequest.countDocuments({
          ...baseHostelFilter,
          $or: [
            { status: 'REJECTED_HOSTEL_INCHARGE' },
            { status: { $regex: /^REJECTED_HOSTEL/i } },
            { status: { $in: ['REJECTED', 'CANCELLED'] }, rejectedByRole: { $in: ['HOSTEL_INCHARGE', 'HOSTEL', 'hostel_incharge'] } }
          ]
        })
      ]);

      const total = approved + pending + rejected;

      return res.json({
        success: true,
        data: {
          total,
          approved,
          pending,
          rejected
        }
      });
    } else if (role === 'PLACEMENT_OFFICER') {
      matchFilter.requestType = 'INTERNSHIP';
      matchFilter.status = {
        $in: [
          'PENDING_PLACEMENT_OFFICER',
          'APPROVED',
          'ISSUED',
          'CLEARED',
          'USED',
          'REJECTED_PLACEMENT_OFFICER'
        ]
      };
    }

    const [total, approved, pending, rejected] = await Promise.all([
      OutpassRequest.countDocuments(matchFilter),
      OutpassRequest.countDocuments({
        ...matchFilter,
        status: { $in: ['APPROVED', 'ISSUED', 'CLEARED', 'USED'] }
      }),
      OutpassRequest.countDocuments({
        ...matchFilter,
        status:
          role === 'HOD'
            ? { $in: ['PENDING_HOD', 'PENDING_HOD_APPROVAL'] }
            : role === 'CTPO'
              ? 'PENDING_CTPO'
              : role === 'HOSTEL_INCHARGE'
                ? 'PENDING_HOSTEL_INCHARGE'
                : 'PENDING_PLACEMENT_OFFICER'
      }),
      OutpassRequest.countDocuments({
        ...matchFilter,
        status: role === 'PLACEMENT_OFFICER'
          ? { $in: ['REJECTED_PLACEMENT_OFFICER', 'REJECTED'] }
          : { $regex: /^REJECTED|^CANCELLED/i }
      })
    ]);

    res.json({
      success: true,
      data: {
        total,
        approved,
        pending,
        rejected
      }
    });
  } catch (e) {
    console.error('[DASHBOARD STATS ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// RESUBMIT REQUEST
// ─────────────────────────────────────────────────────────────
exports.resubmitRequest = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.studentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only resubmit your own request'
      });
    }

    if (!String(request.status || '').startsWith('REJECT')) {
      return res.status(400).json({
        success: false,
        message: 'Only rejected requests can be resubmitted'
      });
    }

    const {
      reason,
      outDate,
      outTime,
      expectedReturnDate,
      returnDate,
      emergencyContact,
      startDate,
      endDate,
      messAmount,
      companyName,
      companyLocation,
      role,
      internshipMode,
      documentUrl,
      documentName,
      documentPublicId,
      documentMime
    } = req.body;

    if (reason !== undefined) request.reason = String(reason).trim();
    if (documentUrl !== undefined) request.documentUrl = documentUrl;
    if (documentName !== undefined) request.documentName = documentName;
    if (documentPublicId !== undefined) request.documentPublicId = documentPublicId;
    if (documentMime !== undefined) request.documentMime = documentMime;

    if (request.requestType === 'OUTPASS') {
      if (outDate) {
        const outCheck = parseAndValidateDate(outDate, 'Out date');
        if (!outCheck.valid) return res.status(400).json({ success: false, message: outCheck.error });
        request.outDate = outCheck.date;
      }
      if (outTime) request.outTime = outTime;
      const finalRet = expectedReturnDate || returnDate;
      if (finalRet) {
        const retCheck = parseAndValidateDate(finalRet, 'Return date');
        if (!retCheck.valid) return res.status(400).json({ success: false, message: retCheck.error });
        request.expectedReturnDate = retCheck.date;
      }
      if (emergencyContact) {
        request.emergencyContact = String(emergencyContact).replace(/\D/g, '');
      }
    }

    if (request.requestType === 'MESS_FEE') {
      if (messAmount !== undefined) {
        const parsedAmount = Number(messAmount);
        if (isNaN(parsedAmount) || parsedAmount < 100 || parsedAmount % 100 !== 0) {
          return res.status(400).json({ success: false, message: 'Mess amount must be a multiple of 100 and at least ₹100' });
        }
        request.messAmount = parsedAmount;
      }
      if (startDate) {
        const sCheck = parseAndValidateDate(startDate, 'Start date');
        if (sCheck.valid) request.startDate = sCheck.date;
      }
      if (endDate) {
        const eCheck = parseAndValidateDate(endDate, 'End date');
        if (eCheck.valid) request.endDate = eCheck.date;
      }
    }

    if (request.requestType === 'INTERNSHIP') {
      if (startDate) {
        const sCheck = parseAndValidateDate(startDate, 'Start date');
        if (sCheck.valid) request.startDate = sCheck.date;
      }
      if (endDate) {
        const eCheck = parseAndValidateDate(endDate, 'End date');
        if (eCheck.valid) request.endDate = eCheck.date;
      }
      if (companyName !== undefined) request.companyName = companyName;
      if (companyLocation !== undefined) request.companyLocation = companyLocation;
      if (role !== undefined) request.role = role;
      if (internshipMode !== undefined) request.internshipMode = internshipMode;
    }

    request.status = 'PENDING_CTPO';
    request.currentApproverRole = 'CTPO';
    request.rejectionReason = '';
    request.rejectedByRole = null;
    request.resubmitCount = (request.resubmitCount || 0) + 1;

    await request.save();

    res.json({
      success: true,
      data: request
    });
  } catch (e) {
    console.error('[RESUBMIT ERROR]', e);
    res.status(500).json({
      success: false,
      message: e.message || 'Server error'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// QR PASS IMAGE (Student & Admin only)
// ─────────────────────────────────────────────────────────────
exports.getQRImage = async (req, res) => {
  try {
    const request = await OutpassRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (req.user.role === 'STUDENT' && request.studentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!['ISSUED', 'USED', 'APPROVED'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'QR is only available for issued passes' });
    }

    let qrPass = await QRPass.findOne({ requestId: request._id });
    if (!qrPass) {
      // Auto-create if missing
      const shortCode = request.shortCode || (await generateUniqueShortCode());
      const token = crypto.randomUUID();
      const expiresAt = new Date(request.expectedReturnDate || request.outDate || Date.now());
      expiresAt.setHours(23, 59, 59, 999);

      qrPass = await QRPass.create({
        requestId: request._id,
        token,
        shortCode,
        expiresAt,
        status: 'ACTIVE'
      });

      request.qrToken = token;
      request.shortCode = shortCode;
      await request.save();
    }

    const shortCode = qrPass.shortCode || request.shortCode || qrPass.token.slice(0, 8).toUpperCase();
    const qrImage = await QRCode.toDataURL(shortCode, { width: 300, margin: 2 });

    res.json({
      success: true,
      data: {
        qrImage,
        token: qrPass.token,
        shortCode,
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

// ─────────────────────────────────────────────────────────────
// GET PROOF FILE (Always served inline, never attachment)
// ─────────────────────────────────────────────────────────────
exports.getProofFile = async (req, res) => {
  try {
    const { fileId } = req.params;

    // Check disk first
    const diskPath = path.join(__dirname, '../../../uploads', fileId);
    if (fs.existsSync(diskPath)) {
      res.setHeader('Content-Disposition', `inline; filename="${fileId}"`);
      return res.sendFile(diskPath);
    }

    if (!ObjectId.isValid(fileId)) {
      return res.status(404).json({
        success: false,
        message: 'File unavailable - ask the student to re-upload'
      });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, message: 'Database unavailable' });
    }

    const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(fileId) });
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File unavailable - ask the student to re-upload'
      });
    }

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

    const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    const stream = bucket.openDownloadStream(new ObjectId(fileId));
    stream.on('error', () => {
      res.status(404).json({
        success: false,
        message: 'File unavailable - ask the student to re-upload'
      });
    });
    stream.pipe(res);
  } catch (e) {
    console.error('Get proof file error:', e);
    res.status(500).json({ success: false, message: 'Error fetching proof file' });
  }
};