const express = require('express');
const router = express.Router();
const c = require('./controller');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');

// All admin routes require ADMIN role
router.use(auth, requireRole('ADMIN'));

// Branches
router.get('/branches', c.getBranches);
router.post('/branches', c.createBranch);
router.patch('/branches/:id', c.updateBranch);

// Year Tiers
router.get('/year-tiers', c.getYearTiers);
router.post('/year-tiers', c.createYearTier);
router.patch('/year-tiers/:id', c.updateYearTier);

// Academic Session
router.get('/academic-session', c.getAcademicSession);
router.patch('/academic-session', c.updateAcademicSession);

// Staff Users (CTPO / HOD / HOSTEL_INCHARGE / SECURITY)
router.get('/users', c.getUsers);
router.post('/users', c.createUser);
router.patch('/users/:id/deactivate', c.deactivateUser);
router.patch('/users/:id/reactivate', c.reactivateUser);

// Students
router.get('/students', c.getStudents);
router.patch('/students', c.bulkUpdateStudentType);
router.patch('/students/:id', c.updateStudent);

// Overview / Analytics
router.get('/overview', c.getOverview);

module.exports = router;
