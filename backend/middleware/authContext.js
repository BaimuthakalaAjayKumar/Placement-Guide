/**
 * CAMPUSBRIDGE — AUTHORIZATION CONTEXT MIDDLEWARE (PHASE 8C)
 * 
 * Non-destructive context enhancer that derives institutional scope
 * and role metadata strictly from the authenticated req.user session.
 * 
 * SAFETY PRINCIPLES:
 * 1. Read-Only Context: Never mutates req.user or database models.
 * 2. Immutable Truth: Derives scope strictly from req.user (populated from MongoDB via protect),
 *    never from req.body, req.query, req.params, or client headers.
 * 3. Legacy Role Compatibility: Seamlessly supports legacy 'admin' with
 *    campusId null (platform-wide) and campusId present (campus-scoped).
 * 4. Zero Enforcement: Prepares req.authContext for downstream controllers without
 *    rejecting requests or changing existing authorize() behavior.
 */

const { ROLES, normalizeRole } = require('../config/permissions');
const { isSuperAdmin, isCampusScopedAdmin, isPlatformWide } = require('../utils/scopeFilter');

/**
 * Extracts and constructs an immutable authorization context from req.user.
 * 
 * @param {Object} user - Authenticated user object (req.user)
 * @returns {Object|null} Frozen authContext object, or null if no user
 */
const buildAuthContext = (user) => {
  if (!user || !user.role) {
    return null;
  }

  const rawRole = user.role;
  const normalized = normalizeRole(rawRole);

  const platformWide = isPlatformWide(user);
  const campusScoped = isCampusScopedAdmin(user) || (Boolean(user.campusId) && !platformWide);

  // Role helper flags
  const isStudent = normalized === ROLES.STUDENT;
  const isFaculty = normalized === ROLES.FACULTY;
  const isHod = normalized === ROLES.HOD;
  const isRecruiter = normalized === ROLES.RECRUITER;
  const isAuditor = normalized === ROLES.AUDITOR;
  const isPlacementOfficer = normalized === ROLES.PLACEMENT_OFFICER;
  const isAdministrator = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.CAMPUS_ADMIN,
    ROLES.ADMINISTRATOR
  ].includes(normalized);

  return Object.freeze({
    // Role identity (preserves exact legacy string e.g. 'admin')
    role: rawRole,
    normalizedRole: normalized,

    // Scope boundary flags
    isPlatformWide: platformWide,
    isCampusScoped: campusScoped,

    // Institutional scope identifiers (strictly derived from user document)
    campusId: user.campusId ? user.campusId.toString() : null,
    departmentId: user.departmentId ? user.departmentId.toString() : null,

    // Direct reference to existing managedScopes without modification
    managedScopes: Array.isArray(user.managedScopes) ? user.managedScopes : [],

    // Informational role helper flags
    isStudent,
    isFaculty,
    isHod,
    isRecruiter,
    isAuditor,
    isPlacementOfficer,
    isAdministrator,

    // Recruiter-specific context (strictly derived from user document)
    companyName: user.companyName ? user.companyName.trim() : null,
    isTemporaryAccount: Boolean(user.isTemporaryAccount),
    recruiterExpiresAt: user.recruiterExpiresAt || null
  });
};

/**
 * Express Middleware: Attaches req.authContext to request based on req.user.
 * Does not block or reject requests; calls next() unconditionally.
 * 
 * @param {Object} req 
 * @param {Object} res 
 * @param {Function} next 
 */
const authContext = (req, res, next) => {
  if (req.user) {
    req.authContext = buildAuthContext(req.user);
  } else {
    req.authContext = null;
  }
  next();
};

module.exports = {
  authContext,
  buildAuthContext
};
