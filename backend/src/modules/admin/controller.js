const Branch = require('../../models/Branch');
const YearTierMapping = require('../../models/YearTierMapping');
const AcademicSession = require('../../models/AcademicSession');
const User = require('../../models/User');
const Student = require('../../models/Student');
const OutpassRequest = require('../../models/OutpassRequest');
const bcrypt = require('bcrypt');

// ─── BRANCHES ──────────────────────────────────────────────────────────────

exports.getBranches = async (req, res) => {
  try {
    const branches = await Branch.find().sort({ code: 1 });
    res.json({ success: true, data: branches });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createBranch = async (req, res) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) return res.status(400).json({ success: false, message: 'code and name required' });
    const branch = await Branch.create({ code, name, isActive: true });
    res.status(201).json({ success: true, data: branch });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: 'Branch code already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateBranch = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { ...(name !== undefined && { name }), ...(isActive !== undefined && { isActive }) },
      { new: true }
    );
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found' });
    res.json({ success: true, data: branch });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── YEAR TIERS ────────────────────────────────────────────────────────────

exports.getYearTiers = async (req, res) => {
  try {
    const tiers = await YearTierMapping.find().sort({ yearTier: 1 });
    res.json({ success: true, data: tiers });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createYearTier = async (req, res) => {
  try {
    const { yearTier, years, label } = req.body;
    if (!yearTier || !years || !label) return res.status(400).json({ success: false, message: 'yearTier, years, label required' });
    const tier = await YearTierMapping.create({ yearTier, years, label });
    res.status(201).json({ success: true, data: tier });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: 'yearTier already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateYearTier = async (req, res) => {
  try {
    const { years, label } = req.body;
    const tier = await YearTierMapping.findByIdAndUpdate(
      req.params.id,
      { ...(years !== undefined && { years }), ...(label !== undefined && { label }) },
      { new: true }
    );
    if (!tier) return res.status(404).json({ success: false, message: 'Year tier not found' });
    res.json({ success: true, data: tier });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── ACADEMIC SESSION ──────────────────────────────────────────────────────

exports.getAcademicSession = async (req, res) => {
  try {
    const session = await AcademicSession.findOne();
    res.json({ success: true, data: session });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateAcademicSession = async (req, res) => {
  try {
    const { currentSessionYear } = req.body;
    if (!currentSessionYear) return res.status(400).json({ success: false, message: 'currentSessionYear required' });

    let session = await AcademicSession.findOne();
    if (!session) {
      session = await AcademicSession.create({ currentSessionYear });
    } else {
      session.currentSessionYear = currentSessionYear;
      await session.save();
    }

    // Trigger recompute of year + yearTier for all students
    const tiers = await YearTierMapping.find();
    const students = await Student.find();
    let updated = 0;
    for (const student of students) {
      const admissionYear = parseInt(student.rollNo.slice(0, 2)) + 2000;
      const year = currentSessionYear - admissionYear + 1;
      const tierDoc = tiers.find(t => t.years.includes(year));
      const yearTier = tierDoc ? tierDoc.yearTier : `YEAR_${year}`;
      await Student.findByIdAndUpdate(student._id, { year, yearTier });
      updated++;
    }

    res.json({ success: true, data: { session, studentsRecomputed: updated } });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── USERS (CTPO / HOD / HOSTEL_INCHARGE / SECURITY) ─────────────────────

exports.getUsers = async (req, res) => {
  try {
    const { role, includeInactive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (!includeInactive) filter.isActive = true;
    const users = await User.find(filter)
      .select('-passwordHash')
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.createUser = async (req, res) => {
  try {
    const { name, username, password, role, branchId, authorityScope } = req.body;
    if (!name || !username || !password || !role) {
      return res.status(400).json({ success: false, message: 'name, username, password, role required' });
    }
    const validRoles = ['CTPO', 'HOD', 'HOSTEL_INCHARGE', 'SECURITY', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    if (role === 'CTPO' && !branchId) {
      return res.status(400).json({ success: false, message: 'branchId required for CTPO' });
    }
    if (role === 'HOD' && (!authorityScope?.yearTier || !authorityScope?.studentType)) {
      return res.status(400).json({ success: false, message: 'authorityScope.yearTier and authorityScope.studentType required for HOD' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username: username.toLowerCase(),
      passwordHash,
      role,
      ...(branchId && { branchId }),
      ...(authorityScope && { authorityScope }),
      isActive: true
    });

    const { passwordHash: _ph, ...safeUser } = user.toObject();
    res.status(201).json({ success: true, data: safeUser });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ success: false, message: 'Username already taken' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deactivateUser = async (req, res) => {
  try {
    // Never hard-delete — soft deactivate only (per Section 6.1)
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.reactivateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── STUDENTS ──────────────────────────────────────────────────────────────

exports.getStudents = async (req, res) => {
  try {
    const { branchId, studentType, yearTier, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (branchId) filter.branchId = branchId;
    if (studentType) filter.studentType = studentType;
    if (yearTier) filter.yearTier = yearTier;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      Student.find(filter)
        .select('-passwordHash')
        .populate('branchId', 'name code')
        .sort({ rollNo: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Student.countDocuments(filter)
    ]);
    res.json({ success: true, data: students, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.bulkUpdateStudentType = async (req, res) => {
  try {
    const { studentIds, studentType } = req.body;
    if (!studentIds?.length || !studentType) {
      return res.status(400).json({ success: false, message: 'studentIds array and studentType required' });
    }
    if (!['DAY_SCHOLAR', 'HOSTELER'].includes(studentType)) {
      return res.status(400).json({ success: false, message: 'studentType must be DAY_SCHOLAR or HOSTELER' });
    }
    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { studentType }
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateStudent = async (req, res) => {
  try {
    const { studentType, isActive } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { ...(studentType && { studentType }), ...(isActive !== undefined && { isActive }) },
      { new: true }
    ).select('-passwordHash');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

// ─── OVERVIEW ──────────────────────────────────────────────────────────────

exports.getOverview = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ isActive: true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalRequestsToday = await OutpassRequest.countDocuments({ createdAt: { $gte: today } });

    const byStage = await OutpassRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Last 14 days: requests created per day
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const dailyRequests = await OutpassRequest.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const stageMap = {};
    byStage.forEach(s => { stageMap[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        totalStudents,
        totalRequestsToday,
        byStage: stageMap,
        dailyRequests
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};
