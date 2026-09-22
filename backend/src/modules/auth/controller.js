const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');
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
          profileImage: account.profileImage || '',
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
        profileImage: account.profileImage || '',
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

    let fileUrl = '';

    if (req.file.filename) {
      // Saved via multer disk storage
      fileUrl = `/uploads/${req.file.filename}`;
    } else if (req.file.buffer) {
      // Memory storage: save to uploads dir on disk as well as GridFS if available
      const uploadDir = path.join(__dirname, '../../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const uniqueName = Date.now() + '-' + (req.file.originalname || 'profile.png');
      const diskPath = path.join(uploadDir, uniqueName);
      fs.writeFileSync(diskPath, req.file.buffer);
      fileUrl = `/uploads/${uniqueName}`;

      const db = mongoose.connection.db;
      if (db) {
        try {
          const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
          const uploadStream = bucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
            metadata: { uploadedBy: req.user.id, kind: 'profile-image' }
          });
          uploadStream.end(req.file.buffer);
        } catch (err) {
          console.warn('GridFS save warning:', err);
        }
      }
    }

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

exports.deleteProfileImage = async (req, res) => {
  try {
    const account = await User.findById(req.user.id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (account.profileImage) {
      const fileName = account.profileImage.split('/').pop();
      // If on disk, remove
      if (fileName) {
        const diskPath = path.join(__dirname, '../../../uploads', fileName);
        if (fs.existsSync(diskPath)) {
          try { fs.unlinkSync(diskPath); } catch (_) {}
        }
      }
      if (fileName && ObjectId.isValid(fileName)) {
        const db = mongoose.connection.db;
        if (db) {
          try {
            const bucket = new GridFSBucket(db, { bucketName: 'uploads' });
            await bucket.delete(new ObjectId(fileName));
          } catch (_) {}
        }
      }
    }

    account.profileImage = '';
    await account.save();

    res.json({ success: true, message: 'Profile image deleted successfully' });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({ success: false, message: 'Profile image deletion failed' });
  }
};
