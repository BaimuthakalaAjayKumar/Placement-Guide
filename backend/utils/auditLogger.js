const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * Extract clean IPv4 or IPv6 client address
 * Handles proxies, Cloudflare, localhost, and IPv4 mapped IPv6
 */
const extractClientIp = (req) => {
  if (!req) return '127.0.0.1';
  let ip = req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.headers['cf-connecting-ip'] ||
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || '';
  if (typeof ip === 'string' && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  if (ip === '::1' || ip === '::' || !ip) {
    ip = '127.0.0.1';
  }
  return ip;
};

const extractUserAgent = (req) => {
  if (!req) return '';
  return req.headers['user-agent'] || '';
};

/**
 * Helper function to create an audit log entry
 * @param {Object} options
 * @param {string} [options.userId]
 * @param {Object} [options.user]
 * @param {string} options.action - e.g. 'LOGIN', 'LOGOUT', 'TEST_ATTEMPT', 'LAB_SUBMISSION', 'DISCUSSION_POST'
 * @param {string} [options.category] - e.g. 'Authentication & Sessions', 'Assessments', 'Lab Practice', 'Discussions'
 * @param {string} options.description - Human readable description of action
 * @param {Object} [options.details] - Arbitrary JSON metadata
 * @param {number} [options.durationSeconds] - Optional duration
 * @param {Object} [options.req] - Express request object for IP & user-agent
 */
const logActivity = async ({
  userId,
  user,
  action,
  category = 'General',
  description,
  details = {},
  durationSeconds = 0,
  req
}) => {
  try {
    let targetUser = user;
    if (!targetUser && userId) {
      targetUser = await User.findById(userId).select('name email role rollNumber branch section academicYear year');
    }
    if (!targetUser) return null;

    const ipAddress = extractClientIp(req);
    const userAgent = extractUserAgent(req);

    const logEntry = await AuditLog.create({
      user: targetUser._id || targetUser.id,
      userName: targetUser.name || 'Unknown',
      userEmail: targetUser.email || '',
      userRole: targetUser.role || 'student',
      rollNumber: targetUser.rollNumber || '',
      branch: targetUser.branch || '',
      section: targetUser.section || '',
      academicYear: targetUser.academicYear || targetUser.year || '',
      action,
      category,
      description,
      details,
      durationSeconds,
      ipAddress,
      userAgent
    });

    // Keep user's last known IP and agent synchronized
    if (targetUser._id && ipAddress) {
      User.findByIdAndUpdate(targetUser._id, {
        $set: { 
          lastIpAddress: ipAddress, 
          userAgent: userAgent || targetUser.userAgent 
        }
      }).catch(() => {});
    }

    return logEntry;
  } catch (err) {
    console.error('AuditLogger error (non-fatal):', err.message);
    return null;
  }
};

module.exports = { logActivity, extractClientIp, extractUserAgent };

