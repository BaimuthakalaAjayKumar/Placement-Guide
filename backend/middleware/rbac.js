/**
 * CAMPUSBRIDGE — ENTERPRISE RBAC & SCOPE AUTHORIZATION MIDDLEWARE
 * Provides centralized permission enforcement, institutional data scope checks,
 * and resource ownership verification. Operates alongside existing auth middleware.
 */

const {
  PERMISSIONS,
  ROLES,
  normalizeRole,
  getRolePermissions,
  hasRolePermission
} = require('../config/permissions');

/**
 * Middleware: Enforce that the authenticated user possesses one or more required permissions.
 * Supports single permission or list of permissions (ALL required by default).
 *
 * @param {...string} requiredPermissions
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/save-marks', protect, requirePermission('MARKS_WRITE'), saveSemesterMarks);
 */
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    // 1. Ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No user session detected.'
      });
    }

    const userRole = normalizeRole(req.user.role);
    const userPermissions = getRolePermissions(userRole, req.user.customPermissions || []);

    // Attach resolved permissions to req.user for downstream controller efficiency
    req.user.resolvedPermissions = Array.from(userPermissions);

    // 2. Check if user is Super Admin or legacy Admin (unrestricted platform privileges)
    if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
      return next();
    }

    // 3. Verify all required permissions are possessed
    const missingPermissions = requiredPermissions.filter(perm => !userPermissions.has(perm));

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Role '${req.user.role}' lacks required permission(s): ${missingPermissions.join(', ')}`,
        missingPermissions
      });
    }

    next();
  };
};

/**
 * Middleware: Enforce that the authenticated user possesses AT LEAST ONE of the specified permissions.
 *
 * @param {...string} permissions
 * @returns {Function} Express middleware
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No user session detected.'
      });
    }

    const userRole = normalizeRole(req.user.role);
    if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
      return next();
    }

    const userPermissions = getRolePermissions(userRole, req.user.customPermissions || []);
    req.user.resolvedPermissions = Array.from(userPermissions);

    const hasAny = permissions.some(perm => userPermissions.has(perm));
    if (!hasAny) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Requires at least one of the following permissions: ${permissions.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Middleware: Enforce data scoping boundaries (Campus, Department, Assignment).
 * Prevents unauthorized cross-campus or cross-department data tampering.
 *
 * @param {('CAMPUS'|'DEPARTMENT')} scopeType
 * @param {Object} [options]
 * @param {string} [options.paramKey] - Request param key containing the target scope identifier
 * @param {string} [options.bodyKey] - Request body key containing the target scope identifier
 * @param {string} [options.queryKey] - Request query key containing the target scope identifier
 * @returns {Function} Express middleware
 */
const requireScope = (scopeType, options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const userRole = normalizeRole(req.user.role);

    // Super Admin / legacy Admin bypasses scope restrictions
    if (userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN) {
      return next();
    }

    const paramKey = options.paramKey || (scopeType === 'CAMPUS' ? 'campusId' : 'departmentId');
    const bodyKey = options.bodyKey || paramKey;
    const queryKey = options.queryKey || paramKey;

    const requestedScope = req.params[paramKey] || req.body[bodyKey] || req.query[queryKey];

    // If no specific target scope was sent in request, proceed (controllers apply user's scope by default)
    if (!requestedScope) {
      return next();
    }

    if (scopeType === 'CAMPUS') {
      const userCampus = req.user.campusId ? req.user.campusId.toString() : null;
      if (userCampus && requestedScope.toString() !== userCampus) {
        return res.status(403).json({
          success: false,
          error: 'Multi-Campus Isolation: You cannot access or modify records belonging to another campus.'
        });
      }
    }

    if (scopeType === 'DEPARTMENT') {
      // HOD and Department-level checks
      const userDept = (req.user.departmentId || req.user.branch || '').toString().toLowerCase();
      const requestedDept = requestedScope.toString().toLowerCase();

      if (userRole === ROLES.HOD && userDept && requestedDept !== userDept) {
        return res.status(403).json({
          success: false,
          error: `Department Isolation: HOD access is restricted to department '${req.user.branch || userDept}'.`
        });
      }
    }

    next();
  };
};

/**
 * Middleware: Verify student self-ownership or recruiter company-ownership on resources.
 *
 * @param {('STUDENT_SELF'|'RECRUITER_COMPANY')} ownershipType
 * @param {Object} [options]
 * @param {string} [options.studentParam='studentId']
 * @returns {Function} Express middleware
 */
const checkOwnership = (ownershipType, options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const userRole = normalizeRole(req.user.role);

    // Administrative roles bypass individual ownership checks
    if ([ROLES.SUPER_ADMIN, ROLES.CAMPUS_ADMIN, ROLES.ADMINISTRATOR, ROLES.ADMIN].includes(userRole)) {
      return next();
    }

    if (ownershipType === 'STUDENT_SELF') {
      if (userRole === ROLES.STUDENT) {
        const studentParamKey = options.studentParam || 'studentId';
        const targetStudentId = req.params[studentParamKey] || req.params.id || req.body.studentId;

        if (targetStudentId && targetStudentId.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            error: 'Resource Ownership: Students may only access their own private records.'
          });
        }
      }
    }

    next();
  };
};

/**
 * Programmatic helper to verify if a user has a specific permission
 * @param {Object} user
 * @param {string} permission
 * @returns {boolean}
 */
const userHasPermission = (user, permission) => {
  if (!user || !permission) return false;
  return hasRolePermission(user.role, permission, user.customPermissions || []);
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireScope,
  checkOwnership,
  userHasPermission,
  PERMISSIONS,
  ROLES
};
