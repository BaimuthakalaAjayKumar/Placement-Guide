const express = require('express');
const {
  getDashboardStats,
  getAllStudents,
  createAdmin,
  createFaculty,
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
router.get('/students/export', protect, authorize('admin'), exportStudentReport);
router.post('/students/bulk-delete', protect, authorize('admin'), bulkDeleteStudents);
router.put('/students/:id/academics', protect, authorize('admin'), updateStudentAcademics);
router.delete('/students/:id', protect, authorize('admin'), deleteStudent);
router.post('/admins', protect, authorize('admin'), createAdmin);
router.post('/faculty', protect, authorize('admin', 'faculty'), createFaculty);

module.exports = router;
