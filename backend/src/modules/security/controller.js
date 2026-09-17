const QRPass = require('../../models/QRPass');
const ScanLog = require('../../models/ScanLog');
const OutpassRequest = require('../../models/OutpassRequest');

// Public: verify QR token (the URL encoded in the QR code hits this)
exports.verifyToken = async (req, res) => {
  const { token } = req.params;
  try {
    const qrPass = await QRPass.findOne({ token });
    if (!qrPass) {
      return res.status(404).json({ success: false, scanResult: 'INVALID', message: 'Invalid QR Code' });
    }
    const now = new Date();
    if (qrPass.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, scanResult: 'ALREADY_USED', message: 'This pass has already been used' });
    }
    if (now > qrPass.expiresAt) {
      return res.status(400).json({ success: false, scanResult: 'EXPIRED', message: 'This pass has expired' });
    }
    const request = await OutpassRequest.findById(qrPass.requestId)
      .populate('studentId', 'name rollNo')
      .populate('branchId', 'name');
    return res.json({ success: true, scanResult: 'VALID', data: { qrPass, request } });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Authenticated: scan and consume QR
exports.scanQR = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token required' });

  try {
    const qrPass = await QRPass.findOne({ token });
    if (!qrPass) {
      await ScanLog.create({ scannedByUserId: req.user.id, scanResult: 'INVALID', scannedAt: new Date() });
      return res.status(400).json({ success: false, scanResult: 'INVALID', message: 'Invalid QR Code' });
    }

    const now = new Date();
    if (qrPass.status !== 'ACTIVE' || now > qrPass.expiresAt) {
      const result = qrPass.status !== 'ACTIVE' ? 'ALREADY_USED' : 'EXPIRED';
      await ScanLog.create({
        qrPassId: qrPass._id,
        requestId: qrPass.requestId,
        scannedByUserId: req.user.id,
        scanResult: result,
        scannedAt: new Date()
      });
      return res.status(400).json({
        success: false,
        scanResult: result,
        message: result === 'ALREADY_USED' ? 'Pass Already Used' : 'Pass Expired'
      });
    }

    // Mark as used — single-use, immediately permanent
    qrPass.status = 'USED';
    await qrPass.save();
    await OutpassRequest.findByIdAndUpdate(qrPass.requestId, { status: 'USED' });

    await ScanLog.create({
      qrPassId: qrPass._id,
      requestId: qrPass.requestId,
      scannedByUserId: req.user.id,
      scanResult: 'VALID',
      scannedAt: new Date()
    });

    const request = await OutpassRequest.findById(qrPass.requestId)
      .populate('studentId', 'name rollNo')
      .populate('branchId', 'name');

    res.json({
      success: true,
      scanResult: 'VALID',
      message: 'Pass scanned successfully',
      data: request
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getRecentScans = async (req, res) => {
  try {
    const scans = await ScanLog.find({ scannedByUserId: req.user.id })
      .sort({ scannedAt: -1 })
      .limit(20)
      .populate({
        path: 'requestId',
        populate: { path: 'studentId branchId', select: 'name rollNo' }
      });
    res.json({ success: true, data: scans });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.getActivePasses = async (req, res) => {
  try {
    const activePasses = await QRPass.find({ status: 'ACTIVE' })
      .populate({
        path: 'requestId',
        populate: { path: 'studentId branchId', select: 'name rollNo code' }
      })
      .sort({ createdAt: -1 })
      .limit(20);

    const now = new Date();
    const data = activePasses.map(p => ({
      _id: p._id,
      token: p.token,
      requestId: p.requestId?._id,
      studentName: p.requestId?.studentId?.name,
      rollNo: p.requestId?.studentId?.rollNo,
      branch: p.requestId?.branchId?.name,
      studentType: p.requestId?.studentType,
      outDate: p.requestId?.outDate,
      outTime: p.requestId?.outTime,
      expectedReturnDate: p.requestId?.expectedReturnDate,
      expectedReturnTime: p.requestId?.expectedReturnTime,
      issuedAt: p.issuedAt,
      expiresAt: p.expiresAt,
      isExpired: now > p.expiresAt
    }));

    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
