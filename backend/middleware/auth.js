const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Block pre-authentication and intermediate verification tokens from accessing protected application resources
    if (decoded.tokenType === 'PRE_AUTH_FACE_CHALLENGE' || decoded.tokenType === 'BIOMETRIC_FACE_VERIFICATION') {
      return res.status(401).json({
        success: false,
        error: 'Pre-authentication challenge token cannot be used to access protected application resources. Complete facial verification first.'
      });
    }

    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No user found with this id'
      });
    }

    // Check if temporary recruiter account has expired
    if (req.user.role === 'recruiter' && req.user.recruiterExpiresAt && new Date() > new Date(req.user.recruiterExpiresAt)) {
      return res.status(403).json({
        success: false,
        error: 'Your temporary recruiter credentials have expired. Please contact the campus placement cell for access renewal.'
      });
    }

    // Check if student account is locked by Administrator / Main Admin
    if (req.user.role === 'student' && req.user.isLocked) {
      const url = req.originalUrl || req.url || '';
      const isAuthInfoRoute = url.includes('/api/auth/me') || url.includes('/api/auth/logout');
      if (!isAuthInfoRoute) {
        return res.status(403).json({
          success: false,
          isLocked: true,
          error: `Your Student Dashboard is locked due to ${req.user.lockReason || '7+ days of inactivity'}. Please contact the College Administrator or Main Admin to restore your access.`
        });
      }
    }

    // Enforce forced-password-change for any account with mustChangePassword = true
    if (req.user.mustChangePassword) {
      const url = req.originalUrl || req.url || '';
      const isAuthExemptRoute =
        url.includes('/api/auth/me') ||
        url.includes('/api/auth/logout') ||
        url.includes('/api/auth/change-password');
      if (!isAuthExemptRoute) {
        return res.status(403).json({
          success: false,
          mustChangePassword: true,
          error: 'Password change required before accessing operational services.'
        });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user ? req.user.role : 'guest'}' is not authorized to access this route`
      });
    }
    next();
  };
};
