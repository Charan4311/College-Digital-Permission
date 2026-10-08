const QRPass = require('../../models/QRPass');
const ScanLog = require('../../models/ScanLog');
const OutpassRequest = require('../../models/OutpassRequest');
const User = require('../../models/User');

// Helper to find pass by shortCode or UUID token
async function findPassByCodeOrToken(rawInput) {
  if (!rawInput) return null;
  const trimmed = String(rawInput).trim();

  // Try exact token match first
  let pass = await QRPass.findOne({ token: trimmed });
  if (pass) return pass;

  // Try exact shortCode
  pass = await QRPass.findOne({ shortCode: trimmed.toUpperCase() });
  if (pass) return pass;

  // Strip hyphens and spaces
  const stripped = trimmed.toUpperCase().replace(/[-\s]/g, '');
  if (stripped.length === 8) {
    const formatted = `${stripped.slice(0, 4)}-${stripped.slice(4)}`;
    pass = await QRPass.findOne({
      $or: [
        { shortCode: formatted },
        { shortCode: stripped },
        { shortCode: { $regex: new RegExp(`^${stripped.slice(0, 4)}[-]?${stripped.slice(4)}$`, 'i') } }
      ]
    });
    if (pass) return pass;
  }

  // Fallback regex search on shortCode
  return QRPass.findOne({
    shortCode: { $regex: new RegExp(`^${trimmed.replace(/[-\s]/g, '[-]?')}$`, 'i') }
  });
}

// Public: verify token or shortCode (e.g. from scanned QR)
exports.verifyToken = async (req, res) => {
  const { token } = req.params;
  try {
    const qrPass = await findPassByCodeOrToken(token);
    if (!qrPass) {
      return res.status(404).json({
        success: false,
        scanResult: 'INVALID',
        message: 'Invalid Pass Code / QR Code'
      });
    }

    const now = new Date();
    if (qrPass.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        scanResult: 'ALREADY_USED',
        message: 'This out-pass has already been verified and used'
      });
    }

    if (now > qrPass.expiresAt) {
      return res.status(400).json({
        success: false,
        scanResult: 'EXPIRED',
        message: 'This out-pass has expired'
      });
    }

    const request = await OutpassRequest.findById(qrPass.requestId)
      .populate('studentId', 'name rollNo year yearTier residenceType profileImage')
      .populate('branchId', 'name code');

    return res.json({
      success: true,
      scanResult: 'VALID',
      data: { qrPass, request }
    });
  } catch (e) {
    console.error('Verify token error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Authenticated: scan and consume QR / short pass code
exports.scanQR = async (req, res) => {
  const { token, code } = req.body;
  const input = code || token;

  if (!input) {
    return res.status(400).json({ success: false, message: 'Pass code or QR token is required' });
  }

  try {
    const qrPass = await findPassByCodeOrToken(input);
    const now = new Date();

    if (!qrPass) {
      await ScanLog.create({
        scannedByUserId: req.user.id,
        passCode: String(input).toUpperCase(),
        scanResult: 'INVALID',
        scannedAt: now
      });

      return res.status(400).json({
        success: false,
        scanResult: 'INVALID',
        message: 'Invalid Pass Code / QR Code'
      });
    }

    const request = await OutpassRequest.findById(qrPass.requestId)
      .populate('studentId', 'name rollNo year yearTier residenceType profileImage')
      .populate('branchId', 'name code');

    const studentId = request?.studentId?._id || request?.studentId;

    if (qrPass.status !== 'ACTIVE' || now > qrPass.expiresAt) {
      const result = qrPass.status !== 'ACTIVE' ? 'ALREADY_USED' : 'EXPIRED';
      await ScanLog.create({
        qrPassId: qrPass._id,
        requestId: qrPass.requestId,
        studentId,
        passCode: qrPass.shortCode || qrPass.token,
        scannedByUserId: req.user.id,
        scanResult: result,
        scannedAt: now
      });

      return res.status(400).json({
        success: false,
        scanResult: result,
        message: result === 'ALREADY_USED' ? 'Out-pass already used' : 'Out-pass has expired',
        data: request
      });
    }

    // Mark as used — single-use, immediate
    qrPass.status = 'USED';
    await qrPass.save();
    await OutpassRequest.findByIdAndUpdate(qrPass.requestId, { status: 'USED' });

    await ScanLog.create({
      qrPassId: qrPass._id,
      requestId: qrPass.requestId,
      studentId,
      passCode: qrPass.shortCode || qrPass.token,
      scannedByUserId: req.user.id,
      scanResult: 'VALID',
      scannedAt: now
    });

    res.json({
      success: true,
      scanResult: 'VALID',
      message: 'Gate checkout authorized. Exit recorded successfully.',
      data: request
    });
  } catch (e) {
    console.error('Scan QR error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Security History: returns scanned logs (with optional allowedOnly filter)
exports.getRecentScans = async (req, res) => {
  try {
    const { range = 'all', q, allowedOnly, history } = req.query;
    let query = {};

    if (history === 'true' || allowedOnly === 'true') {
      query.scanResult = { $in: ['VALID', 'ALLOWED', 'SUCCESS'] };
    }

    const now = new Date();
    if (range === 'today') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      query.scannedAt = { $gte: startOfDay };
    } else if (range === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      query.scannedAt = { $gte: startOfWeek };
    } else if (range === 'month') {
      const startOfMonth = new Date(now);
      startOfMonth.setDate(startOfMonth.getDate() - 30);
      query.scannedAt = { $gte: startOfMonth };
    }

    let scans = await ScanLog.find(query)
      .sort({ scannedAt: -1 })
      .limit(100)
      .populate({
        path: 'requestId',
        populate: [
          { path: 'studentId', select: 'name rollNo year yearTier residenceType profileImage' },
          { path: 'branchId', select: 'name code' }
        ]
      })
      .populate('studentId', 'name rollNo year yearTier residenceType profileImage')
      .populate('scannedByUserId', 'name username');

    if (q && q.trim()) {
      const searchLower = q.trim().toLowerCase();
      scans = scans.filter((s) => {
        const student = s.requestId?.studentId || s.studentId;
        const name = student?.name?.toLowerCase() || '';
        const roll = student?.rollNo?.toLowerCase() || '';
        const code = s.passCode?.toLowerCase() || '';
        return name.includes(searchLower) || roll.includes(searchLower) || code.includes(searchLower);
      });
    }

    res.json({ success: true, data: scans });
  } catch (e) {
    console.error('Get recent scans error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Active list: only TODAY's active out-passes (approved, outDate <= today <= returnDate, not expired)
exports.getActivePasses = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Active passes where expiresAt >= now
    const activePasses = await QRPass.find({
      status: 'ACTIVE',
      expiresAt: { $gte: now }
    })
      .populate({
        path: 'requestId',
        match: {
          outDate: { $lte: endOfToday },
          $or: [
            { expectedReturnDate: { $gte: startOfToday } },
            { expectedReturnDate: null }
          ]
        },
        populate: [
          { path: 'studentId', select: 'name rollNo year yearTier residenceType profileImage' },
          { path: 'branchId', select: 'name code' }
        ]
      })
      .sort({ createdAt: -1 });

    // Filter out passes whose populated request did not match date criteria
    const validPasses = activePasses.filter((p) => p.requestId != null);

    const data = validPasses.map((p) => {
      const reqDoc = p.requestId;
      return {
        _id: p._id,
        token: p.token,
        shortCode: p.shortCode || reqDoc.shortCode || p.token.slice(0, 8).toUpperCase(),
        requestId: reqDoc._id,
        referenceId: reqDoc.referenceId || `KDP-${new Date(reqDoc.createdAt).getFullYear()}-${reqDoc._id.toString().slice(-6).toUpperCase()}`,
        studentName: reqDoc.studentId?.name || 'Student',
        rollNo: reqDoc.studentId?.rollNo || '-',
        branch: reqDoc.branchId?.name || reqDoc.branchId?.code || '-',
        year: reqDoc.year || reqDoc.studentId?.year || 4,
        residenceType: reqDoc.studentId?.residenceType || 'Not set',
        reason: reqDoc.reason,
        outDate: reqDoc.outDate,
        outTime: reqDoc.outTime,
        expectedReturnDate: reqDoc.expectedReturnDate,
        expectedReturnTime: reqDoc.expectedReturnTime,
        issuedAt: p.issuedAt,
        expiresAt: p.expiresAt,
        isExpired: now > p.expiresAt
      };
    });

    res.json({ success: true, data });
  } catch (e) {
    console.error('Get active passes error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
