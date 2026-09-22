const mongoose = require('mongoose');
const Branch = require('../../models/Branch');
const YearTierMapping = require('../../models/YearTierMapping');
const AcademicSession = require('../../models/AcademicSession');
const User = require('../../models/User');
const Student = require('../../models/Student');
const OutpassRequest = require('../../models/OutpassRequest');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');


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
    const { branchId, branch, studentType, yearTier, year, page = 1, limit = 50 } = req.query;
    
    // Strictly filter for students only (role: STUDENT and valid rollNo)
    const filter = {
      role: 'STUDENT',
      rollNo: { $exists: true, $ne: '' }
    };

    const targetBranch = branchId || branch;
    if (targetBranch && targetBranch !== 'all' && targetBranch !== '') {
      if (mongoose.Types.ObjectId.isValid(targetBranch)) {
        filter.branchId = targetBranch;
      } else {
        const bDocs = await Branch.find({
          $or: [
            { code: targetBranch },
            { name: targetBranch },
            ...(targetBranch === 'CSM' ? [{ code: '42' }] : []),
            ...(targetBranch === 'CAI' ? [{ code: '43' }] : []),
            ...(targetBranch === 'CSD' ? [{ code: '44' }] : []),
            ...(targetBranch === 'AIDS' ? [{ code: '45' }] : []),
            ...(targetBranch === 'CSC' ? [{ code: '46' }] : [])
          ]
        });
        if (bDocs.length > 0) {
          filter.branchId = { $in: bDocs.map(b => b._id) };
        }
      }
    }

    if (studentType && studentType !== 'all' && studentType !== '') filter.studentType = studentType;
    if (yearTier && yearTier !== 'all' && yearTier !== '') filter.yearTier = yearTier;
    if (year && year !== 'all' && year !== '') filter.year = parseInt(year);

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
  } catch (e) {
    console.error('getStudents error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.exportStudentsExcel = async (req, res) => {
  try {
    const { branchId, branch, studentType, yearTier, year } = req.query;

    const filter = {
      role: 'STUDENT',
      rollNo: { $exists: true, $ne: '' }
    };

    const targetBranch = branchId || branch;
    if (targetBranch && targetBranch !== 'all' && targetBranch !== '') {
      if (mongoose.Types.ObjectId.isValid(targetBranch)) {
        filter.branchId = targetBranch;
      } else {
        const bDocs = await Branch.find({
          $or: [
            { code: targetBranch },
            { name: targetBranch },
            ...(targetBranch === 'CSM' ? [{ code: '42' }] : []),
            ...(targetBranch === 'CAI' ? [{ code: '43' }] : []),
            ...(targetBranch === 'CSD' ? [{ code: '44' }] : []),
            ...(targetBranch === 'AIDS' ? [{ code: '45' }] : []),
            ...(targetBranch === 'CSC' ? [{ code: '46' }] : [])
          ]
        });
        if (bDocs.length > 0) {
          filter.branchId = { $in: bDocs.map(b => b._id) };
        }
      }
    }

    if (studentType && studentType !== 'all' && studentType !== '') filter.studentType = studentType;
    if (yearTier && yearTier !== 'all' && yearTier !== '') filter.yearTier = yearTier;
    if (year && year !== 'all' && year !== '') filter.year = parseInt(year);

    const students = await Student.find(filter)
      .select('-passwordHash')
      .populate('branchId', 'name code')
      .sort({ rollNo: 1 });

    const codeMap = {
      '42': 'CSM (AI & ML)',
      '43': 'CAI (AI)',
      '44': 'CSD (Data Science)',
      '45': 'AIDS (AI & Data Science)',
      '46': 'CSC (Cyber Security)',
      'CSM': 'CSM (AI & ML)',
      'CAI': 'CAI (AI)',
      'CSD': 'CSD (Data Science)',
      'AIDS': 'AIDS (AI & Data Science)',
      'CSC': 'CSC (Cyber Security)'
    };

    const rows = students.map((s, idx) => {
      const rawCode = s.branchId?.code;
      const rawName = s.branchId?.name;
      const branchDisplay = codeMap[rawCode] || codeMap[rawName] || rawName || rawCode || 'N/A';
      const yearStr = s.year ? `Year ${s.year}` : 'N/A';
      const tierStr = s.yearTier || (s.year ? `TIER_${s.year}` : 'N/A');
      const typeStr = s.studentType === 'DAY_SCHOLAR'
        ? 'Day Scholar'
        : s.studentType === 'HOSTELER'
        ? 'Hosteler'
        : 'Unassigned';

      return {
        'S.No': idx + 1,
        'Roll Number': s.rollNo || 'N/A',
        'Student Name': s.name || 'N/A',
        'Branch': branchDisplay,
        'Year': yearStr,
        'Year Tier': tierStr,
        'Student Type': typeStr
      };
    });

    // Dynamically auto-fit all column widths with generous margin to avoid any text cutoff or border clipping
    const autoFitColumns = (dataRows) => {
      if (!dataRows || !dataRows.length) return [];
      const keys = Object.keys(dataRows[0]);
      return keys.map(key => {
        let maxLen = key.toString().length;
        dataRows.forEach(r => {
          const val = r[key] !== undefined && r[key] !== null ? r[key].toString() : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.max(maxLen + 8, 16) };
      });
    };

    const workbook = xlsx.utils.book_new();
    const sheetData = rows.length > 0 ? rows : [{ 'Note': 'No enrolled students found matching the selected filters' }];
    const sheet = xlsx.utils.json_to_sheet(sheetData);
    sheet['!cols'] = autoFitColumns(sheetData);

    xlsx.utils.book_append_sheet(workbook, sheet, 'Enrolled Students');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Enrolled_Students_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (e) {
    console.error('exportStudentsExcel error:', e);
    res.status(500).json({ success: false, message: 'Server error exporting students' });
  }
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
      { _id: { $in: studentIds }, role: 'STUDENT' },
      { studentType }
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (e) { res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.updateStudent = async (req, res) => {
  try {
    const { studentType } = req.body;
    if (!studentType || !['DAY_SCHOLAR', 'HOSTELER'].includes(studentType)) {
      return res.status(400).json({ success: false, message: 'studentType must be DAY_SCHOLAR or HOSTELER' });
    }
    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, role: 'STUDENT' },
      { studentType },
      { new: true }
    ).select('-passwordHash').populate('branchId', 'name code');

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (e) {
    console.error('updateStudent error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// ─── OVERVIEW ──────────────────────────────────────────────────────────────

exports.getOverview = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments({ role: 'STUDENT', isActive: true });
    
    // Year-wise student counts
    const year2Students = await Student.countDocuments({ role: 'STUDENT', year: 2, isActive: true });
    const year3Students = await Student.countDocuments({ role: 'STUDENT', year: 3, isActive: true });
    const year4Students = await Student.countDocuments({ role: 'STUDENT', year: 4, isActive: true });

    // Active Branches
    const branches = await Branch.find({ isActive: true }).sort({ code: 1 });

    const BRANCH_NAMES_MAP = {
      'CSM': 'CSM (AI & ML)',
      'CAI': 'CAI (AI)',
      'CSD': 'CSD (Data Science)',
      'AIDS': 'AIDS (AI & Data Science)',
      'CSC': 'CSC (Cyber Security)',
      '42': 'CSM (AI & ML)',
      '43': 'CAI (AI)',
      '44': 'CSD (Data Science)',
      '45': 'AIDS (AI & Data Science)',
      '46': 'CSC (Cyber Security)'
    };

    const BRANCH_SHORT_MAP = {
      'CSM': 'CSM',
      'CAI': 'CAI',
      'CSD': 'CSD',
      'AIDS': 'AIDS',
      'CSC': 'CSC',
      '42': 'CSM',
      '43': 'CAI',
      '44': 'CSD',
      '45': 'AIDS',
      '46': 'CSC'
    };

    const BRANCH_SUB_MAP = {
      'CSM': '(AI & ML)',
      'CAI': '(AI)',
      'CSD': '(Data Science)',
      'AIDS': '(AI & Data Science)',
      'CSC': '(Cyber Security)',
      '42': '(AI & ML)',
      '43': '(AI)',
      '44': '(Data Science)',
      '45': '(AI & Data Science)',
      '46': '(Cyber Security)'
    };

    // Live Aggregation of students grouped by branchId and year
    const branchYearAgg = await Student.aggregate([
      { $match: { role: 'STUDENT', isActive: true } },
      { $group: { _id: { branchId: '$branchId', year: '$year' }, count: { $sum: 1 } } }
    ]);

    const countMap = {};
    branchYearAgg.forEach(item => {
      if (item._id && item._id.branchId) {
        const key = `${item._id.branchId}_${item._id.year}`;
        countMap[key] = item.count;
      }
    });

    const branchDistributionByYear = branches.map(b => {
      const year2 = countMap[`${b._id}_2`] || 0;
      const year3 = countMap[`${b._id}_3`] || 0;
      const year4 = countMap[`${b._id}_4`] || 0;
      const total = year2 + year3 + year4;
      const key = b.name || b.code;
      const shortName = BRANCH_SHORT_MAP[key] || key;
      const fullName = BRANCH_NAMES_MAP[key] || key;
      const sub = BRANCH_SUB_MAP[key] || '';
      return {
        branchId: b._id,
        code: b.code,
        name: shortName,
        shortName,
        fullName,
        sub,
        year2,
        year3,
        year4,
        total
      };
    });

    const totalStudentsSum = branchDistributionByYear.reduce((acc, curr) => acc + curr.total, 0) || totalStudents || 1;

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];

    const branchTotalDistribution = branchDistributionByYear.map((b, idx) => ({
      name: b.shortName,
      fullName: b.fullName,
      count: b.total,
      percentage: ((b.total / totalStudentsSum) * 100).toFixed(1),
      color: COLORS[idx % COLORS.length]
    }));


    res.json({
      success: true,
      data: {
        totalStudents,
        year2Students,
        year3Students,
        year4Students,
        branchDistributionByYear,
        branchTotalDistribution
      }
    });
  } catch (e) {
    console.error('getOverview error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PERMISSION REQUESTS ──────────────────────────────────────────────────

exports.getAdminRequests = async (req, res) => {
  try {
    const { year, branch, requestType, status } = req.query;
    const filter = {};

    if (year && year !== 'all' && year !== '') {
      filter.year = parseInt(year);
    }

    if (branch && branch !== 'all' && branch !== '') {
      const branchDocs = await Branch.find({
        $or: [
          { code: branch },
          { name: branch },
          ...(branch === 'CSM' ? [{ code: '42' }] : []),
          ...(branch === 'CAI' ? [{ code: '43' }] : []),
          ...(branch === 'CSD' ? [{ code: '44' }] : []),
          ...(branch === 'AIDS' ? [{ code: '45' }] : []),
          ...(branch === 'CSC' ? [{ code: '46' }] : [])
        ]
      });
      if (branchDocs.length > 0) {
        filter.branchId = { $in: branchDocs.map(b => b._id) };
      }
    }

    if (requestType && requestType !== 'all' && requestType !== '') {
      filter.requestType = requestType.toUpperCase();
    }

    if (status && status !== 'all' && status !== '') {
      const s = status.toUpperCase();
      if (s === 'APPROVED') {
        filter.status = { $in: APPROVED_STATUSES };
      } else if (s === 'PENDING') {
        filter.status = { $in: PENDING_STATUSES };
      } else if (s === 'REJECTED') {
        filter.status = { $in: REJECTED_STATUSES };
      } else {
        filter.status = s;
      }
    }

    const requests = await OutpassRequest.find(filter)
      .populate({
        path: 'studentId',
        select: 'name rollNo year branchId studentType',
        populate: { path: 'branchId', select: 'name code' }
      })
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: requests });
  } catch (e) {
    console.error('getAdminRequests error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.exportAdminRequestsExcel = async (req, res) => {
  try {
    const { year, branch, requestType, status } = req.query;
    const filter = {};

    if (year && year !== 'all' && year !== '') {
      filter.year = parseInt(year);
    }

    if (branch && branch !== 'all' && branch !== '') {
      const branchDocs = await Branch.find({
        $or: [
          { code: branch },
          { name: branch },
          ...(branch === 'CSM' ? [{ code: '42' }] : []),
          ...(branch === 'CAI' ? [{ code: '43' }] : []),
          ...(branch === 'CSD' ? [{ code: '44' }] : []),
          ...(branch === 'AIDS' ? [{ code: '45' }] : []),
          ...(branch === 'CSC' ? [{ code: '46' }] : [])
        ]
      });
      if (branchDocs.length > 0) {
        filter.branchId = { $in: branchDocs.map(b => b._id) };
      }
    }

    if (requestType && requestType !== 'all' && requestType !== '') {
      filter.requestType = requestType.toUpperCase();
    }

    if (status && status !== 'all' && status !== '') {
      const s = status.toUpperCase();
      if (s === 'APPROVED') {
        filter.status = { $in: APPROVED_STATUSES };
      } else if (s === 'PENDING') {
        filter.status = { $in: PENDING_STATUSES };
      } else if (s === 'REJECTED') {
        filter.status = { $in: REJECTED_STATUSES };
      } else {
        filter.status = s;
      }
    }

    const requests = await OutpassRequest.find(filter)
      .populate({
        path: 'studentId',
        select: 'name rollNo year branchId studentType',
        populate: { path: 'branchId', select: 'name code' }
      })
      .populate('branchId', 'name code')
      .sort({ createdAt: -1 });

    const codeMap = { '42': 'CSM', '43': 'CAI', '44': 'CSD', '45': 'AIDS', '46': 'CSC' };

    const rows = requests.map(r => {
      const rollNo = r.studentId?.rollNo || 'N/A';
      const studentName = r.studentId?.name || 'N/A';
      const rawBranchCode = r.branchId?.code || r.studentId?.branchId?.code;
      const rawBranchName = r.branchId?.name || r.studentId?.branchId?.name;
      const branchStr = codeMap[rawBranchCode] || rawBranchName || rawBranchCode || 'CSM';
      const y = r.year || r.studentId?.year || 4;
      const yearStr = y === 2 ? '2nd year' : y === 3 ? '3rd year' : `${y}th year`;

      const typeStr = TYPE_NAME_MAP[r.requestType] || r.requestType;
      const statusClean = APPROVED_STATUSES.includes(r.status)
        ? 'Approved'
        : PENDING_STATUSES.includes(r.status)
        ? 'Pending'
        : 'Rejected';

      const formattedDate = new Date(r.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      return {
        'Reference ID': r.referenceId || r._id.toString(),
        'Roll Number': rollNo,
        'Name': studentName,
        'Branch': branchStr,
        'Year': yearStr,
        'Type': typeStr,
        'Status': statusClean,
        'Detailed Status': r.status,
        'Reason': r.reason || 'N/A',
        'Requested On': formattedDate
      };
    });

    const autoFitColumns = (dataRows) => {
      if (!dataRows || !dataRows.length) return [];
      const keys = Object.keys(dataRows[0]);
      return keys.map(key => {
        let maxLen = key.toString().length;
        dataRows.forEach(r => {
          const val = r[key] !== undefined && r[key] !== null ? r[key].toString() : '';
          if (val.length > maxLen) maxLen = val.length;
        });
        return { wch: Math.max(maxLen + 5, 14) };
      });
    };

    const workbook = xlsx.utils.book_new();
    const sheet = xlsx.utils.json_to_sheet(rows);
    sheet['!cols'] = autoFitColumns(rows);

    xlsx.utils.book_append_sheet(workbook, sheet, 'Permission Requests');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Permission_Requests_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (e) {
    console.error('exportAdminRequestsExcel error:', e);
    res.status(500).json({ success: false, message: 'Server error exporting requests' });
  }
};

// ─── REPORTS & ANALYTICS ──────────────────────────────────────────────────

const APPROVED_STATUSES = ['APPROVED', 'CLEARED', 'ISSUED', 'USED'];
const PENDING_STATUSES = ['PENDING_CTPO', 'PENDING_HOD', 'PENDING_HOSTEL_INCHARGE', 'PENDING_PLACEMENT_OFFICER'];
const REJECTED_STATUSES = ['REJECTED_CTPO', 'REJECTED_HOD', 'REJECTED_HOSTEL_INCHARGE', 'REJECTED_PLACEMENT_OFFICER', 'REJECTED', 'CANCELLED'];

const TYPE_NAME_MAP = {
  OUTPASS: 'Outpass',
  INTERNSHIP: 'Internship',
  MESS_FEE: 'Mess Fee',
  LIBRARY: 'Library'
};

const TYPE_COLOR_MAP = {
  OUTPASS: '#3B82F6',
  INTERNSHIP: '#10B981',
  MESS_FEE: '#F59E0B',
  LIBRARY: '#8B5CF6'
};

exports.getReportsAnalytics = async (req, res) => {
  try {
    const { range = '30days' } = req.query;
    const now = new Date();
    let startDate = new Date();
    let intervalUnit = 'day';

    if (range === '7days') {
      startDate.setDate(now.getDate() - 7);
      intervalUnit = 'day';
    } else if (range === '6months') {
      startDate.setMonth(now.getMonth() - 6);
      intervalUnit = 'month';
    } else if (range === 'thisyear' || range === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
      intervalUnit = 'month';
    } else {
      // Default: 30 days
      startDate.setDate(now.getDate() - 30);
      intervalUnit = 'day';
    }

    // Previous period for comparison (% change calculation)
    const durationMs = now.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - durationMs);
    const prevEndDate = new Date(startDate.getTime());

    // Fetch requests for current & previous period from Database
    const [currentRequests, prevRequests] = await Promise.all([
      OutpassRequest.find({ createdAt: { $gte: startDate, $lte: now } }),
      OutpassRequest.find({ createdAt: { $gte: prevStartDate, $lte: prevEndDate } })
    ]);

    // Current period counts
    const totalRequests = currentRequests.length;
    const approvedCount = currentRequests.filter(r => APPROVED_STATUSES.includes(r.status)).length;
    const pendingCount = currentRequests.filter(r => PENDING_STATUSES.includes(r.status)).length;
    const rejectedCount = currentRequests.filter(r => REJECTED_STATUSES.includes(r.status)).length;

    // Previous period counts
    const prevTotal = prevRequests.length;
    const prevApproved = prevRequests.filter(r => APPROVED_STATUSES.includes(r.status)).length;
    const prevPending = prevRequests.filter(r => PENDING_STATUSES.includes(r.status)).length;
    const prevRejected = prevRequests.filter(r => REJECTED_STATUSES.includes(r.status)).length;

    // Percentage of total
    const approvedPct = totalRequests ? parseFloat(((approvedCount / totalRequests) * 100).toFixed(1)) : 0;
    const pendingPct = totalRequests ? parseFloat(((pendingCount / totalRequests) * 100).toFixed(1)) : 0;
    const rejectedPct = totalRequests ? parseFloat(((rejectedCount / totalRequests) * 100).toFixed(1)) : 0;

    // Trend comparisons (% vs last period)
    const calcTrend = (curr, prev) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const diff = Math.round(((curr - prev) / prev) * 100);
      return diff >= 0 ? `+${diff}%` : `${diff}%`;
    };

    const totalTrend = calcTrend(totalRequests, prevTotal);
    const approvedTrend = calcTrend(approvedCount, prevApproved);
    const pendingTrend = calcTrend(pendingCount, prevPending);
    const rejectedTrend = calcTrend(rejectedCount, prevRejected);

    // ─── 1. PERMISSION REQUESTS TREND (Time Series) ─────────────────────────
    const trendData = [];
    if (intervalUnit === 'day') {
      const daysCount = range === '7days' ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Filter requests on this day
        const dayRequests = currentRequests.filter(r => {
          const rDate = new Date(r.createdAt);
          return rDate.getDate() === d.getDate() &&
                 rDate.getMonth() === d.getMonth() &&
                 rDate.getFullYear() === d.getFullYear();
        });

        const dayTotal = dayRequests.length;
        const dayApproved = dayRequests.filter(r => APPROVED_STATUSES.includes(r.status)).length;
        const dayPending = dayRequests.filter(r => PENDING_STATUSES.includes(r.status)).length;
        const dayRejected = dayRequests.filter(r => REJECTED_STATUSES.includes(r.status)).length;

        trendData.push({
          date: dayStr,
          Total: dayTotal,
          Approved: dayApproved,
          Pending: dayPending,
          Rejected: dayRejected
        });
      }
    } else {
      // Monthly intervals (6 months or 1 year)
      const monthsCount = range === '6months' ? 6 : 12;
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const monthRequests = currentRequests.filter(r => {
          const rDate = new Date(r.createdAt);
          return rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear();
        });

        const monthTotal = monthRequests.length;
        const monthApproved = monthRequests.filter(r => APPROVED_STATUSES.includes(r.status)).length;
        const monthPending = monthRequests.filter(r => PENDING_STATUSES.includes(r.status)).length;
        const monthRejected = monthRequests.filter(r => REJECTED_STATUSES.includes(r.status)).length;

        trendData.push({
          date: monthLabel,
          Total: monthTotal,
          Approved: monthApproved,
          Pending: monthPending,
          Rejected: monthRejected
        });
      }
    }

    // ─── 2. PERMISSION TYPE DISTRIBUTION (Donut Chart Data) ──────────────────
    const allTypes = ['OUTPASS', 'INTERNSHIP', 'MESS_FEE', 'LIBRARY'];
    const typeDistribution = allTypes.map(rawType => {
      const typeReqs = currentRequests.filter(r => r.requestType === rawType);
      const count = typeReqs.length;
      const percentage = totalRequests ? parseFloat(((count / totalRequests) * 100).toFixed(1)) : 0;
      return {
        rawType,
        name: TYPE_NAME_MAP[rawType],
        count,
        percentage,
        color: TYPE_COLOR_MAP[rawType]
      };
    });

    // ─── 3. PERMISSION STATUS ANALYSIS (Table Data) ──────────────────────────
    const statusAnalysis = allTypes.map(rawType => {
      const typeReqs = currentRequests.filter(r => r.requestType === rawType);
      const total = typeReqs.length;
      const approved = typeReqs.filter(r => APPROVED_STATUSES.includes(r.status)).length;
      const pending = typeReqs.filter(r => PENDING_STATUSES.includes(r.status)).length;
      const rejected = typeReqs.filter(r => REJECTED_STATUSES.includes(r.status)).length;
      const approvalRate = total ? parseFloat(((approved / total) * 100).toFixed(1)) : 0;

      return {
        rawType,
        permissionType: TYPE_NAME_MAP[rawType],
        totalRequests: total,
        approved,
        pending,
        rejected,
        approvalRate
      };
    });

    // ─── 4. REQUESTS BY PERMISSION TYPE (Stacked Bar Chart Data) ─────────────
    const requestsByTypeChart = statusAnalysis.map(item => ({
      name: item.permissionType,
      Approved: item.approved,
      Pending: item.pending,
      Rejected: item.rejected,
      total: item.totalRequests
    }));

    res.json({
      success: true,
      data: {
        timeRange: range,
        summary: {
          totalRequests: { count: totalRequests, trend: totalTrend },
          approved: { count: approvedCount, percentage: approvedPct, trend: approvedTrend },
          pending: { count: pendingCount, percentage: pendingPct, trend: pendingTrend },
          rejected: { count: rejectedCount, percentage: rejectedPct, trend: rejectedTrend }
        },
        requestsTrend: trendData,
        typeDistribution,
        statusAnalysis,
        requestsByTypeChart
      }
    });
  } catch (e) {
    console.error('getReportsAnalytics error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── EXPORT REPORT EXCEL ─────────────────────────────────────────────────

exports.exportReportsExcel = async (req, res) => {
  try {
    const { range = '30days' } = req.query;
    const now = new Date();
    let startDate = new Date();

    if (range === '7days') startDate.setDate(now.getDate() - 7);
    else if (range === '6months') startDate.setMonth(now.getMonth() - 6);
    else if (range === 'thisyear' || range === 'year') startDate.setFullYear(now.getFullYear() - 1);
    else startDate.setDate(now.getDate() - 30);

    const requests = await OutpassRequest.find({ createdAt: { $gte: startDate, $lte: now } })
      .populate({
        path: 'studentId',
        select: 'name rollNo year studentType branchId',
        populate: { path: 'branchId', select: 'name code' }
      })
      .populate('branchId', 'name code')
      .sort({ createdAt: 1 }); // oldest first for trend sheets

    const totalCount = requests.length;
    const approvedCount = requests.filter(r => APPROVED_STATUSES.includes(r.status)).length;
    const pendingCount = requests.filter(r => PENDING_STATUSES.includes(r.status)).length;
    const rejectedCount = requests.filter(r => REJECTED_STATUSES.includes(r.status)).length;

    const rangeLabel = range === '7days' ? 'Last 7 Days'
      : range === '6months' ? 'Last 6 Months'
      : (range === 'thisyear' || range === 'year') ? 'This Year'
      : 'Last 30 Days';

    // Branch code normalizer
    const normalizeBranch = (r) => {
      const code = r.branchId?.code || r.studentId?.branchId?.code;
      const name = r.branchId?.name || r.studentId?.branchId?.name;
      const codeMap = { '42': 'CSM', '43': 'CAI', '44': 'CSD', '45': 'AIDS', '46': 'CSC' };
      return codeMap[code] || name || code || 'N/A';
    };

    // Status normalizer
    const normalizeStatus = (status) => {
      if (!status) return 'Pending';
      if (APPROVED_STATUSES.includes(status)) return 'Approved';
      if (REJECTED_STATUSES.includes(status)) return 'Rejected';
      return 'Pending';
    };

    // Helper to auto-fit column widths generously so no text is ever truncated or cut off by borders
    const autoFit = (rows, minW = 18) => {
      if (!rows || !rows.length) return [];
      const keys = Object.keys(rows[0]);
      return keys.map(key => {
        let max = key.toString().length;
        rows.forEach(r => {
          const v = (r[key] !== undefined && r[key] !== null) ? r[key].toString() : '';
          if (v.length > max) max = v.length;
        });
        return { wch: Math.max(max + 6, minW) };
      });
    };

    // ── 1. TREND BREAKDOWN (Daily for 7/30 days, Monthly for 6m/1y) ─────────
    const trendRows = [];
    const isDaily = (range === '7days' || range === '30days');

    if (isDaily) {
      const daysCount = range === '7days' ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        const dayReqs = requests.filter(r => {
          const rd = new Date(r.createdAt);
          return rd.getDate() === d.getDate() && rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        });

        const dayTotal = dayReqs.length;
        const dayApproved = dayReqs.filter(r => APPROVED_STATUSES.includes(r.status)).length;
        const dayPending = dayReqs.filter(r => PENDING_STATUSES.includes(r.status)).length;
        const dayRejected = dayReqs.filter(r => REJECTED_STATUSES.includes(r.status)).length;

        trendRows.push({
          'Date': dayLabel,
          'Total': dayTotal,
          'Approved': dayApproved,
          'Pending': dayPending,
          'Rejected': dayRejected
        });
      }

      // Add a summary total row at the bottom of the trend table
      trendRows.push({
        'Date': `TOTAL (${rangeLabel.toUpperCase()})`,
        'Total': totalCount,
        'Approved': approvedCount,
        'Pending': pendingCount,
        'Rejected': rejectedCount
      });
    } else {
      const monthsCount = range === '6months' ? 6 : 12;
      for (let i = monthsCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const monthReqs = requests.filter(r => {
          const rd = new Date(r.createdAt);
          return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
        });

        const monthTotal = monthReqs.length;
        const monthApproved = monthReqs.filter(r => APPROVED_STATUSES.includes(r.status)).length;
        const monthPending = monthReqs.filter(r => PENDING_STATUSES.includes(r.status)).length;
        const monthRejected = monthReqs.filter(r => REJECTED_STATUSES.includes(r.status)).length;

        trendRows.push({
          'Month': monthLabel,
          'Total': monthTotal,
          'Approved': monthApproved,
          'Pending': monthPending,
          'Rejected': monthRejected
        });
      }

      trendRows.push({
        'Month': `TOTAL (${rangeLabel.toUpperCase()})`,
        'Total': totalCount,
        'Approved': approvedCount,
        'Pending': pendingCount,
        'Rejected': rejectedCount
      });
    }

    // ── 2. ALL REQUESTS WITH FULL DETAILS ──────────────────────────────────
    const requestRows = requests
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // newest first
      .map(r => {
        const y = r.year || r.studentId?.year || 4;
        const yearStr = y === 2 ? '2nd Year' : y === 3 ? '3rd Year' : `4th Year`;
        return {
          'Date Submitted': new Date(r.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
          'Time': new Date(r.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          'Reference ID': r.referenceId || r._id.toString(),
          'Roll Number': r.studentId?.rollNo || 'N/A',
          'Student Name': r.studentId?.name || 'N/A',
          'Branch': normalizeBranch(r),
          'Year': yearStr,
          'Student Type': r.studentId?.studentType === 'HOSTELER' ? 'Hosteler' : 'Day Scholar',
          'Permission Type': TYPE_NAME_MAP[r.requestType] || r.requestType || 'N/A',
          'Status': normalizeStatus(r.status),
          'Detailed Status': r.status || 'N/A',
          'Reason / Purpose': r.reason || 'N/A'
        };
      });

    // ── 3. OVERVIEW SUMMARY ────────────────────────────────────────────────
    const summaryRows = [
      { 'Report Metric': 'Report Filter Range', 'Value': rangeLabel },
      { 'Report Metric': 'Report Generated Date & Time', 'Value': new Date().toLocaleString('en-IN') },
      { 'Report Metric': 'Total Permission Requests', 'Value': totalCount },
      { 'Report Metric': 'Approved Requests Count', 'Value': approvedCount },
      { 'Report Metric': 'Pending Requests Count', 'Value': pendingCount },
      { 'Report Metric': 'Rejected Requests Count', 'Value': rejectedCount },
      { 'Report Metric': 'Overall Approval Rate (%)', 'Value': totalCount ? `${((approvedCount / totalCount) * 100).toFixed(1)}%` : '0%' }
    ];

    // Build workbook
    const workbook = xlsx.utils.book_new();

    // Sheet 1: Daily Trend Breakdown (First tab so the user sees Date, Total, Approved, Pending, Rejected immediately)
    const trendSheet = xlsx.utils.json_to_sheet(trendRows);
    trendSheet['!cols'] = autoFit(trendRows, 20);
    xlsx.utils.book_append_sheet(workbook, trendSheet, range === '7days' ? 'Last 7 Days Trend' : 'Requests Trend');

    // Sheet 2: All Requests Detailed
    const detailsSheet = xlsx.utils.json_to_sheet(requestRows.length > 0 ? requestRows : [{ 'Note': 'No permission requests found in this period' }]);
    detailsSheet['!cols'] = autoFit(requestRows.length > 0 ? requestRows : [{ 'Note': 'No permission requests found in this period' }], 18);
    xlsx.utils.book_append_sheet(workbook, detailsSheet, 'All Requests Detailed');

    // Sheet 3: Overview Summary
    const summarySheet = xlsx.utils.json_to_sheet(summaryRows);
    summarySheet['!cols'] = autoFit(summaryRows, 30);
    xlsx.utils.book_append_sheet(workbook, summarySheet, 'Overview Summary');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Permission_Trend_Report_${range}_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (e) {
    console.error('exportReportsExcel error:', e);
    res.status(500).json({ success: false, message: 'Server error exporting report' });
  }
};




