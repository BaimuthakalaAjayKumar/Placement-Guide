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
