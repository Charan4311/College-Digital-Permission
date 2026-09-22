const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../../models/User');
const Branch = require('../../models/Branch');

exports.login = async (req, res) => {
  const { password } = req.body;
  let { username } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const trimmed = username.trim();
  const trimmedPassword = password.trim();

  try {
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Find in unified User collection by username or rollNo (case-insensitive regex)
    let account = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${escaped}$`, 'i') } },
        { rollNo: { $regex: new RegExp(`^${escaped}$`, 'i') } }
      ]
    });

    if (!account) {
      console.log(`[LOGIN FAILED] User not found: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!account.isActive) {
      console.log(`[LOGIN FAILED] Account inactive for user: ${username}`);
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    let isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch && trimmedPassword !== password) {
      isMatch = await bcrypt.compare(trimmedPassword, account.passwordHash);
    }
    if (!isMatch && (account.role === 'STUDENT' || account.rollNo)) {
      isMatch = await bcrypt.compare(trimmedPassword.toUpperCase(), account.passwordHash) ||
                await bcrypt.compare(trimmedPassword.toLowerCase(), account.passwordHash);
    }

    if (!isMatch) {
      console.log(`[LOGIN FAILED] Password mismatch for user: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    console.log(`[LOGIN SUCCESS] User logged in: ${account.username || account.rollNo} (${account.role})`);

    // Populate branchId to get branch name
    if (account.branchId) {
      await account.populate('branchId', 'name code');
    }

    const isStudent = account.role === 'STUDENT';
    const payload = {
      id: account._id,
      role: account.role,
      branchId: account.branchId?._id || account.branchId,
      assignedYear: account.assignedYear
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: account._id,
          name: account.name,
          username: account.username || account.rollNo,
          role: account.role,
          branchId: account.branchId?._id || account.branchId,
          branchName: account.branchId?.name,
          branchCode: account.branchId?.code,
          assignedYear: account.assignedYear,
          ...(isStudent && {
            rollNo: account.rollNo,
            studentType: account.studentType,
            year: account.year || 4,
            yearTier: account.yearTier || 'TIER_4TH'
          }),
          ...(!isStudent && {
            authorityScope: account.authorityScope
          })
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const account = await User.findById(req.user.id)
      .select('-passwordHash')
      .populate('branchId', 'name code');
    
    if (!account || !account.isActive) {
      return res.status(401).json({ success: false, message: 'Account disabled or not found' });
    }

    const isStudent = account.role === 'STUDENT';
    res.json({
      success: true,
      data: {
        id: account._id,
        _id: account._id,
        name: account.name,
        username: account.username || account.rollNo,
        role: account.role,
        branchId: account.branchId?._id || account.branchId,
        branchName: account.branchId?.name,
        branchCode: account.branchId?.code,
        assignedYear: account.assignedYear,
        ...(isStudent && {
          rollNo: account.rollNo,
          studentType: account.studentType,
          year: account.year || 4,
          yearTier: account.yearTier || 'TIER_4TH'
        }),
        ...(!isStudent && {
          authorityScope: account.authorityScope
        })
      }
    });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
