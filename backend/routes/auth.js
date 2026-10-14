const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  switchRole,
  uploadProfilePhoto,
  removeProfilePhoto
} = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/switch-role', protect, switchRole);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile-photo', protect, uploadProfilePhoto);
router.delete('/profile-photo', protect, removeProfilePhoto);
router.put('/change-password', protect, changePassword);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:token', resetPassword);

module.exports = router;
