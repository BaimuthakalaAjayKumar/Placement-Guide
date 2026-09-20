const express = require('express');
const {
  getDashboardStats,
  getAllStudents,
  getStudentProgress,
  createAdmin,
  createFaculty,
  getStaff,
  updateStaffScopes,
  deleteStaffScope,
  resetStaffPassword,
  deleteStaff,
  updateLeetcodeProfile,
  updateCodeforcesProfile,
  updateCodechefProfile,
  updateHackerrankProfile,
  getUserSolution,
  saveUserSolution,
  getCPLeaderboard,
  getPlatformLeaderboards,
  deleteStudent,
  updateStudentAcademics,
  bulkDeleteStudents,
  exportStudentReport
} = require('../controllers/users');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboardStats);
router.get('/leaderboard', protect, getCPLeaderboard);
router.get('/platform-leaderboards', protect, getPlatformLeaderboards);
router.put('/leetcode', protect, updateLeetcodeProfile);
router.put('/codeforces', protect, updateCodeforcesProfile);
router.put('/codechef', protect, updateCodechefProfile);
router.put('/hackerrank', protect, updateHackerrankProfile);
router.get('/solutions/:platform/:problemId', protect, getUserSolution);
router.post('/solutions', protect, saveUserSolution);
router.get('/students', protect, authorize('admin', 'faculty'), getAllStudents);
router.get('/students/:id/progress', protect, authorize('admin', 'faculty'), getStudentProgress);
router.get('/students/export', protect, authorize('admin'), exportStudentReport);
router.post('/students/bulk-delete', protect, authorize('admin'), bulkDeleteStudents);
router.put('/students/:id/academics', protect, authorize('admin'), updateStudentAcademics);
router.delete('/students/:id', protect, authorize('admin'), deleteStudent);
router.post('/admins', protect, authorize('admin'), createAdmin);
router.post('/faculty', protect, authorize('admin'), createFaculty);
router.get('/staff', protect, authorize('admin'), getStaff);
router.put('/staff/:id/scopes', protect, authorize('admin'), updateStaffScopes);
router.delete('/staff/:id/scopes/:scopeId', protect, authorize('admin'), deleteStaffScope);
router.put('/staff/:id/reset-password', protect, authorize('admin'), resetStaffPassword);
router.delete('/staff/:id', protect, authorize('admin'), deleteStaff);

module.exports = router;
