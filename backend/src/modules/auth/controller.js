const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../../models/User');

exports.login = async (req, res) => {
  const { password } = req.body;
  let { username } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required' });
  }

  const trimmed = username.trim();

  try {
    // Find in unified User collection by username or rollNo (case-insensitive)
    let account = await User.findOne({
      $or: [
        { username: trimmed },
        { username: trimmed.toLowerCase() },
        { username: trimmed.toUpperCase() },
        { rollNo: trimmed.toUpperCase() },
        { rollNo: trimmed }
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

    const isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch) {
      console.log(`[LOGIN FAILED] Password mismatch for user: ${username}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

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

    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const account = await User.findById(req.user.id);
    if (!account || !account.isActive) {
      return res.status(401).json({ success: false, message: 'Account disabled or not found' });
    }

    const { name, studentType, year, yearTier } = req.body;
    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    if (name !== undefined) account.name = String(name).trim();
    if (studentType !== undefined) {
      const normalized = String(studentType).toUpperCase();
      if (!['DAY_SCHOLAR', 'HOSTELER'].includes(normalized)) {
        return res.status(400).json({ success: false, message: 'Invalid student type' });
      }
      account.studentType = normalized;
    }
    if (year !== undefined) account.year = Number(year);
    if (yearTier !== undefined) account.yearTier = String(yearTier);

    await account.save();

    const updated = await User.findById(account._id)
      .select('-passwordHash')
      .populate('branchId', 'name code');

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Current password, new password, and confirm password are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const account = await User.findById(req.user.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    account.passwordHash = await bcrypt.hash(newPassword, 10);
    await account.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const account = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: fileUrl },
      { new: true }
    ).select('-passwordHash').populate('branchId', 'name code');

    if (!account) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: account, fileUrl });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
};
