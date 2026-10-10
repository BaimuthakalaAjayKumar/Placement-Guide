/**
 * CAMPUSBRIDGE — ENTERPRISE RBAC & DATA-SCOPE ADAPTER HELPER
 * 
 * Centralized, additive compatibility layer for institutional data scoping
 * (Platform -> Campus -> Department -> Branch -> Scope -> Resource Ownership).
 * 
 * DESIGN PRINCIPLES:
 * 1. 100% Backward Compatibility: Works seamlessly with existing User records,
 *    legacy role strings ('admin', 'faculty', 'hod', 'student', 'recruiter'),
 *    and multi-department managedScopes.
 * 2. Additive Architecture: Provides pure, testable filter generators without
 *    mutating live controller queries or modifying User documents.
 * 3. Security First: Derives authority strictly from authenticated req.user state,
 *    never trusting client-supplied query/body scope parameters.
 */

const { ROLES, normalizeRole } = require('../config/permissions');

// Regex escaper for safe string matching in Mongo queries
const escapeRegex = (str) => (str || '').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

/**
 * Builds standard branch pattern regular expressions for legacy compatibility.
 * Matches both abbreviations ('IT', 'CSE') and full names ('Information Technology').
 * 
 * @param {string} branch 
 * @returns {RegExp[]}
 */
const getBranchPatterns = (branch = 'IT') => {
  const clean = (branch || 'IT').trim();
  const patterns = [new RegExp(`^${escapeRegex(clean)}$`, 'i')];

  if (/^it$/i.test(clean) || /information\s*technology/i.test(clean)) {
    patterns.push(new RegExp('Information\\s*Technology', 'i'));
    patterns.push(new RegExp('\\bIT\\b', 'i'));
  } else if (/^cse$/i.test(clean) || /computer\s*science/i.test(clean)) {
    patterns.push(new RegExp('Computer\\s*Science', 'i'));
    patterns.push(new RegExp('\\bCSE\\b', 'i'));
  } else if (/^ece$/i.test(clean)) {
    patterns.push(new RegExp('\\bECE\\b', 'i'));
  } else if (/^aiml$/i.test(clean)) {
    patterns.push(new RegExp('\\bAIML\\b', 'i'));
    patterns.push(new RegExp('Artificial\\s*Intelligence', 'i'));
  }

  return patterns;
};

/**
 * Checks if user possesses Super Administrator privileges (platform-wide).
 * 
 * RULE:
 * - role === 'super_admin' -> TRUE
 * - legacy role === 'admin' with campusId == null/undefined -> TRUE (Platform-wide Super Admin)
 * - legacy role === 'admin' with campusId != null -> FALSE (Campus-scoped Admin)
 * 
 * @param {Object} user - User document or session object
 * @returns {boolean}
 */
const isSuperAdmin = (user) => {
  if (!user || !user.role) return false;
  const role = normalizeRole(user.role);

  if (role === ROLES.SUPER_ADMIN) return true;
  if (role === ROLES.ADMIN && (!user.campusId || user.campusId === '')) return true;

  return false;
};

/**
 * Checks if user is a Campus-Scoped Administrator.
 * 
 * RULE:
 * - role === 'campus_admin' -> TRUE
 * - role === 'administrator' -> TRUE
 * - legacy role === 'admin' with campusId != null -> TRUE
 * 
 * @param {Object} user 
 * @returns {boolean}
 */
const isCampusScopedAdmin = (user) => {
  if (!user || !user.role) return false;
  const role = normalizeRole(user.role);

  if ([ROLES.CAMPUS_ADMIN, ROLES.ADMINISTRATOR, ROLES.DIRECTOR, ROLES.PRINCIPAL].includes(role)) return true;
  if (role === ROLES.ADMIN && Boolean(user.campusId)) return true;

  return false;
};

/**
 * Checks if user has platform-wide administrative scope.
 * 
 * @param {Object} user 
 * @returns {boolean}
 */
const isPlatformWide = (user) => {
  return isSuperAdmin(user);
};

/**
 * Returns a MongoDB query filter enforcing Campus boundary.
 * 
 * RULES:
 * - Platform-wide users (Super Admin / legacy Admin with null campusId): returns {} (no restriction).
 * - Campus-scoped users (Campus Admin, HOD, Faculty, Student): returns { campusId: user.campusId }.
 * - Users with no campusId who are not platform admins: returns {} (safe fallback, does not crash).
 * 
 * @param {Object} user 
 * @returns {Object} MongoDB query filter object
 */
const getCampusFilter = (user) => {
  if (!user) return {};

  // Platform-wide administrative scope: unrestricted access across all campuses
  if (isSuperAdmin(user)) {
    return {};
  }

  if (user.campusId) {
    return { campusId: user.campusId };
  }

  return {};
};

/**
 * Returns a MongoDB query filter enforcing Department boundary.
 * 
 * RULES:
 * - Super Admin / Campus Admin: returns {} (campus-wide / platform-wide scope).
 * - HOD: returns { departmentId: user.departmentId } if set, or branch fallback.
 * - Student: returns { departmentId: user.departmentId } if set.
 * - FACULTY COORDINATORS:
 *   If user has managedScopes (length > 0), departmentId filter is NOT applied,
 *   preserving multi-department access across CSE, IT, AIML, ECE.
 * 
 * @param {Object} user 
 * @returns {Object} MongoDB query filter object
 */
const getDepartmentFilter = (user) => {
  if (!user || !user.role) return {};
  const role = normalizeRole(user.role);

  // Administrative roles operate across all departments within their campus
  if (isSuperAdmin(user) || isCampusScopedAdmin(user)) {
    return {};
  }

  // Multi-department faculty: managedScopes takes precedence over departmentId
  if (role === ROLES.FACULTY) {
    if (Array.isArray(user.managedScopes) && user.managedScopes.length > 0) {
      return {}; // Preserves multi-department evaluation capacity
    }
    if (user.departmentId) {
      return { departmentId: user.departmentId };
    }
    return {};
  }

  // HOD scope: departmental authority
  if (role === ROLES.HOD) {
    if (user.departmentId) {
      return { departmentId: user.departmentId };
    }
    if (user.branch) {
      return { branch: { $in: getBranchPatterns(user.branch) } };
    }
  }

  // Student scope
  if (role === ROLES.STUDENT && user.departmentId) {
    return { departmentId: user.departmentId };
  }

  return {};
};

/**
 * Generates an ownership filter restricting query to user's own resources.
 * 
 * MODEL FIELD CONVENTIONS:
 * - User model self-query: field = '_id'
 * - AcademicRecord, Project, LabPracticeAttempt: field = 'student'
 * - Resume, Notification, TestAttempt, ContestAttempt, MockInterview, Discussion: field = 'user'
 * 
 * @param {Object} user 
 * @param {string} [field='user'] - Model field name representing the owner reference
 * @returns {Object} MongoDB query filter object
 */
const getOwnershipFilter = (user, field = 'user') => {
  if (!user || (!user._id && !user.id)) return {};
  const userId = user._id || user.id;

  return { [field]: userId };
};

/**
 * Generates a MongoDB query filter matching a user's assigned managedScopes.
 * Handles flexible academic year formats (e.g. '2027', '3rd Year', 'III')
 * and branch alias variations.
 * 
 * @param {Object} user 
 * @returns {Object} MongoDB query filter with $or conditions, or {} if no scopes
 */
const getManagedScopeFilter = (user) => {
  if (!user || !Array.isArray(user.managedScopes) || user.managedScopes.length === 0) {
    return {};
  }

  const orConditions = user.managedScopes.map((scope) => {
    const condList = [];
    const sYear = String(scope.academicYear || '').trim();
    const sBranch = String(scope.branch || '').trim();
    const sSection = String(scope.section || '').trim();
    const sSubject = scope.subject;

    // 1. Academic Year matching (flexible matching for 4th Year, 4, IV, 2026, etc.)
    if (sYear && sYear.toLowerCase() !== 'all') {
      const escapedYear = escapeRegex(sYear);
      const yearPatterns = [new RegExp(`^${escapedYear}$`, 'i'), new RegExp(escapedYear, 'i')];
      const digits = sYear.match(/\d+/);
      if (digits) {
        yearPatterns.push(new RegExp(`^${digits[0]}$`, 'i'));
      }
      if (/4th|final|IV|^4$/i.test(sYear)) {
        yearPatterns.push(/4th|final|IV|^4$/i);
        yearPatterns.push(/2026/i);
      } else if (/3rd|III|^3$/i.test(sYear)) {
        yearPatterns.push(/3rd|III|^3$/i);
        yearPatterns.push(/2027/i);
      } else if (/2nd|II|^2$/i.test(sYear)) {
        yearPatterns.push(/2nd|II|^2$/i);
        yearPatterns.push(/2028/i);
      } else if (/1st|I|^1$/i.test(sYear)) {
        yearPatterns.push(/1st|I|^1$/i);
        yearPatterns.push(/2029/i);
      }

      condList.push({
        $or: [
          { academicYear: { $in: yearPatterns } },
          { year: { $in: yearPatterns } }
        ]
      });
    }

    // 2. Branch matching
    if (sBranch && sBranch.toLowerCase() !== 'all') {
      condList.push({ branch: { $in: getBranchPatterns(sBranch) } });
    }

    // 3. Section matching
    if (sSection && sSection.toLowerCase() !== 'all') {
      condList.push({ section: new RegExp(`^${escapeRegex(sSection)}$`, 'i') });
    }

    // 4. Subject matching if present
    if (sSubject) {
      condList.push({ subject: sSubject });
    }

    if (condList.length === 0) return {};
    if (condList.length === 1) return condList[0];
    return { $and: condList };
  }).filter(cond => Object.keys(cond).length > 0);

  if (orConditions.length === 0) return {};
  if (orConditions.length === 1) return orConditions[0];
  return { $or: orConditions };
};

/**
 * Combines multiple MongoDB query filter objects safely.
 * Strips empty objects and handles $and wrapping without key collisions.
 * 
 * @param {...Object} filters 
 * @returns {Object} Consolidated MongoDB query filter
 */
const combineScopeFilters = (...filters) => {
  const validFilters = filters.filter(f => f && typeof f === 'object' && Object.keys(f).length > 0);

  if (validFilters.length === 0) return {};
  if (validFilters.length === 1) return validFilters[0];

  return { $and: validFilters };
};

/**
 * High-level composite helper: Builds an end-to-end student query filter
 * tailored to the authenticated user's institutional scope.
 * 
 * BEHAVIOR MATRIX:
 * - Super Admin: { role: 'student' } (Platform-wide)
 * - Campus Admin: { role: 'student', campusId: user.campusId } (Campus-wide)
 * - HOD: { role: 'student', campusId: user.campusId, ...dept/branch filter }
 * - Faculty with Scopes: { role: 'student', ...campusFilter, ...managedScopeFilter }
 * - Faculty without Scopes: Fail-closed -> empty match { role: 'student', _id: { $in: [] } }
 * - Student: { _id: user._id } (Self-only)
 * 
 * @param {Object} user - Authenticated req.user
 * @returns {Object} MongoDB query filter ready for User.find(filter)
 */
const buildStudentScopeFilter = (user) => {
  if (!user || !user.role) {
    return { _id: { $in: [] } }; // Fail-closed for unauthenticated/malformed identity
  }

  const role = normalizeRole(user.role);

  // 1. Student self-scope
  if (role === ROLES.STUDENT) {
    return getOwnershipFilter(user, '_id');
  }

  const baseFilter = { role: 'student' };

  // 2. Super Administrator: unrestricted platform-wide
  if (isSuperAdmin(user)) {
    return baseFilter;
  }

  // 3. Campus Administrator: all students in assigned campus
  if (isCampusScopedAdmin(user)) {
    const campusFilter = getCampusFilter(user);
    return combineScopeFilters(baseFilter, campusFilter);
  }

  // 4. HOD: students in assigned campus AND assigned department/branch
  if (role === ROLES.HOD) {
    const campusFilter = getCampusFilter(user);
    const branchPatterns = getBranchPatterns(user.branch || 'IT');

    let deptBranchCondition;
    if (user.departmentId) {
      deptBranchCondition = {
        $or: [
          { departmentId: user.departmentId },
          { branch: { $in: branchPatterns } }
        ]
      };
    } else {
      deptBranchCondition = { branch: { $in: branchPatterns } };
    }

    return combineScopeFilters(baseFilter, campusFilter, deptBranchCondition);
  }

  // 5. Faculty: strictly governed by assigned managedScopes
  if (role === ROLES.FACULTY) {
    if (!Array.isArray(user.managedScopes) || user.managedScopes.length === 0) {
      // Fail-closed: faculty with no assigned scopes sees no students
      return { role: 'student', _id: { $in: [] } };
    }

    const scopeFilter = getManagedScopeFilter(user);
    const campusFilter = getCampusFilter(user);

    return combineScopeFilters(baseFilter, campusFilter, scopeFilter);
  }

  // 6. Placement Officer & Auditor: students across assigned campus
  if (role === ROLES.PLACEMENT_OFFICER || role === ROLES.AUDITOR) {
    const campusFilter = getCampusFilter(user);
    return combineScopeFilters(baseFilter, campusFilter);
  }

  // Default fail-closed for any unrecognized role
  return { role: 'student', _id: { $in: [] } };
};

/**
 * Verifies whether a user has authority to access a target campus.
 * 
 * @param {Object} user 
 * @param {string|Object} targetCampusId 
 * @returns {boolean}
 */
const canAccessCampus = (user, targetCampusId) => {
  if (!user) return false;

  // Super Admin can access any campus or unscoped resources
  if (isSuperAdmin(user)) return true;

  if (!targetCampusId || !user.campusId) return false;

  return user.campusId.toString() === targetCampusId.toString();
};

/**
 * Verifies whether a user has authority to access a target department.
 * 
 * @param {Object} user 
 * @param {string|Object} targetDepartmentId 
 * @param {string} [targetBranch=null] 
 * @returns {boolean}
 */
const canAccessDepartment = (user, targetDepartmentId, targetBranch = null) => {
  if (!user) return false;
  const role = normalizeRole(user.role);

  // Administrative roles possess authority across all departments within their campus
  if (isSuperAdmin(user) || isCampusScopedAdmin(user)) return true;

  // HOD check: matches departmentId or branch
  if (role === ROLES.HOD) {
    if (user.departmentId && targetDepartmentId) {
      const uDept = user.departmentId._id ? user.departmentId._id.toString() : user.departmentId.toString();
      const tDept = targetDepartmentId._id ? targetDepartmentId._id.toString() : targetDepartmentId.toString();
      if (uDept !== tDept) return false;
      if (targetBranch) {
        const hodBranch = user.branch || (user.departmentId && user.departmentId.code) || 'IT';
        const patterns = getBranchPatterns(hodBranch);
        if (!patterns.some(p => p.test(targetBranch.trim()))) return false;
      }
      return true;
    }
    if ((user.departmentId || user.branch) && targetBranch) {
      const hodBranch = user.branch || (user.departmentId && user.departmentId.code) || 'IT';
      const patterns = getBranchPatterns(hodBranch);
      return patterns.some(p => p.test(targetBranch.trim()));
    }
    return false;
  }

  // Faculty check: verifies against managedScopes
  if (role === ROLES.FACULTY) {
    if (Array.isArray(user.managedScopes) && user.managedScopes.length > 0) {
      if (!targetBranch) return true;
      const cleanBranch = targetBranch.trim().toLowerCase();
      return user.managedScopes.some(s => {
        if (!s.branch || s.branch.toLowerCase() === 'all') return true;
        const patterns = getBranchPatterns(s.branch);
        return patterns.some(p => p.test(cleanBranch));
      });
    }
    if (user.departmentId && targetDepartmentId) {
      const uDept = user.departmentId._id ? user.departmentId._id.toString() : user.departmentId.toString();
      const tDept = targetDepartmentId._id ? targetDepartmentId._id.toString() : targetDepartmentId.toString();
      return uDept === tDept;
    }
    if (user.branch && targetBranch) {
      const patterns = getBranchPatterns(user.branch);
      return patterns.some(p => p.test(targetBranch.trim()));
    }
    return false;
  }

  // Student check
  if (role === ROLES.STUDENT) {
    if (user.departmentId && targetDepartmentId) {
      const uDept = user.departmentId._id ? user.departmentId._id.toString() : user.departmentId.toString();
      const tDept = targetDepartmentId._id ? targetDepartmentId._id.toString() : targetDepartmentId.toString();
      return uDept === tDept;
    }
    if (user.branch && targetBranch) {
      const patterns = getBranchPatterns(user.branch);
      return patterns.some(p => p.test(targetBranch.trim()));
    }
  }

  return false;
};

/**
 * Verifies whether a target academic scope matches a user's managedScopes array.
 * 
 * @param {Array} managedScopes - User's managedScopes array
 * @param {Object} target - { branch, academicYear, section, subject }
 * @returns {boolean}
 */
const matchesManagedScope = (managedScopes, target = {}) => {
  if (!Array.isArray(managedScopes) || managedScopes.length === 0) {
    return false;
  }

  const tYear = String(target.academicYear || target.year || '').trim().toLowerCase();
  const tBranch = String(target.branch || '').trim().toLowerCase();
  const tSection = String(target.section || '').trim().toLowerCase();
  const tSubject = target.subject ? target.subject.toString() : null;

  return managedScopes.some(scope => {
    const sYear = String(scope.academicYear || '').trim().toLowerCase();
    const sBranch = String(scope.branch || '').trim().toLowerCase();
    const sSection = String(scope.section || '').trim().toLowerCase();
    const sSubject = scope.subject ? scope.subject.toString() : null;

    // 1. Year matching (tolerant of 'all', '4th Year' vs '4' vs '2026')
    let yearMatches = true;
    if (sYear && sYear !== 'all') {
      if (!tYear) {
        yearMatches = false;
      } else if (sYear === tYear || tYear.includes(sYear) || sYear.includes(tYear)) {
        yearMatches = true;
      } else {
        const sDigits = sYear.match(/\d+/);
        const tDigits = tYear.match(/\d+/);
        if (sDigits && tDigits && sDigits[0] === tDigits[0]) {
          yearMatches = true;
        } else if (/4th|final|iv|^4$/i.test(sYear) && /4th|final|iv|^4$|2026/i.test(tYear)) {
          yearMatches = true;
        } else if (/3rd|iii|^3$/i.test(sYear) && /3rd|iii|^3$|2027/i.test(tYear)) {
          yearMatches = true;
        } else if (/2nd|ii|^2$/i.test(sYear) && /2nd|ii|^2$|2028/i.test(tYear)) {
          yearMatches = true;
        } else if (/1st|i|^1$/i.test(sYear) && /1st|i|^1$|2029/i.test(tYear)) {
          yearMatches = true;
        } else {
          yearMatches = false;
        }
      }
    }

    // 2. Branch matching
    let branchMatches = true;
    if (sBranch && sBranch !== 'all') {
      if (!tBranch) {
        branchMatches = false;
      } else {
        const patterns = getBranchPatterns(sBranch);
        branchMatches = patterns.some(p => p.test(tBranch));
      }
    }

    // 3. Section matching (tolerant of 'Section A' vs 'A')
    let sectionMatches = true;
    if (sSection && sSection !== 'all') {
      if (!tSection) {
        sectionMatches = false;
      } else {
        const cleanS = sSection.replace(/^section\s*/i, '');
        const cleanT = tSection.replace(/^section\s*/i, '');
        sectionMatches = cleanS === cleanT;
      }
    }

    // 4. Subject matching (if scope specifies subject, target must match)
    let subjectMatches = true;
    if (sSubject) {
      if (!tSubject) {
        subjectMatches = false;
      } else {
        subjectMatches = sSubject === tSubject;
      }
    }

    return yearMatches && branchMatches && sectionMatches && subjectMatches;
  });
};

/**
 * Authoritative validator for student academic access:
 * Checks whether the authenticated user has rights to view or modify
 * the target student's academic record or marks.
 * 
 * @param {Object} user - Authenticated caller (req.user)
 * @param {Object} student - Target student (User document or object)
 * @param {Object} [options={}] - Optional context e.g. { subject }
 * @returns {boolean}
 */
const canAccessStudentAcademicScope = (user, student, options = {}) => {
  if (!user || !student) return false;

  // 1. Campus boundary check: must be on authorized campus
  if (student.campusId && !canAccessCampus(user, student.campusId)) {
    return false;
  }

  // 2. Super Administrator: unrestricted platform-wide
  if (isSuperAdmin(user)) {
    return true;
  }

  // 3. Campus Administrator: all students in assigned campus (campus check already passed)
  if (isCampusScopedAdmin(user)) {
    return true;
  }

  const role = normalizeRole(user.role);

  // 4. Student self-access: student can only access their own record
  if (role === ROLES.STUDENT) {
    const userId = user._id ? user._id.toString() : (user.id ? user.id.toString() : '');
    const studentId = student._id ? student._id.toString() : (student.id ? student.id.toString() : student.toString());
    return userId === studentId;
  }

  // 5. HOD: must belong to HOD's department or branch
  if (role === ROLES.HOD) {
    return canAccessDepartment(user, student.departmentId, student.branch);
  }

  // 6. Faculty: governed by managedScopes
  if (role === ROLES.FACULTY) {
    if (Array.isArray(user.managedScopes) && user.managedScopes.length > 0) {
      return matchesManagedScope(user.managedScopes, {
        branch: student.branch,
        academicYear: student.academicYear || student.year,
        section: student.section,
        subject: options.subject
      });
    }
    // Fallback if faculty has no managedScopes but legacy branch/section
    if (user.branch) {
      const branchOk = getBranchPatterns(user.branch).some(p => p.test(student.branch || ''));
      const sectionOk = !user.section || user.section.trim().toLowerCase() === (student.section || '').trim().toLowerCase();
      return branchOk && sectionOk;
    }
    return false; // Fail-closed
  }

  return false;
};

/**
 * Architectural helper for Recruiter scoping (future activation).
 * Scopes recruiter access to their own company name or drives created by them.
 * 
 * @param {Object} user 
 * @returns {Object} MongoDB query filter object
 */
const getRecruiterFilter = (user) => {
  if (!user || normalizeRole(user.role) !== ROLES.RECRUITER) return {};

  const conditions = [];
  if (user._id || user.id) {
    conditions.push({ createdBy: user._id || user.id });
  }
  if (user.companyName && user.companyName.trim()) {
    conditions.push({
      companyName: new RegExp(`^${escapeRegex(user.companyName.trim())}$`, 'i')
    });
  }

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { $or: conditions };
};

/**
 * Authoritative validator for recruiter placement drive access (Phase 8G):
 * Checks whether the authenticated user has rights to access or manage
 * the target placement drive.
 * 
 * RULES:
 * - null user / null drive => false
 * - Platform-wide Super Admin / Legacy Admin (campusId null) => true
 * - Campus-scoped Administrator => true (validating campus if drive.campusId is set)
 * - Recruiter => true only if:
 *     1. recruiter created the drive (createdBy matches user ID)
 *     OR
 *     2. recruiter companyName matches drive.companyName (normalized: trim().toLowerCase())
 * - All other roles => false
 * 
 * @param {Object} user - Authenticated caller (req.user)
 * @param {Object} drive - PlacementDrive document or plain object
 * @returns {boolean}
 */
const canRecruiterAccessDrive = (user, drive) => {
  if (!user || !drive) return false;
  if (!user.role) return false;

  // 1. Platform-wide Super Admin: unrestricted access
  if (isSuperAdmin(user)) return true;

  // 2. Campus-scoped Administrator: authority over institutional drives
  if (isCampusScopedAdmin(user)) {
    if (drive.campusId && user.campusId) {
      const driveCamp = drive.campusId._id ? drive.campusId._id.toString() : drive.campusId.toString();
      const userCamp = user.campusId._id ? user.campusId._id.toString() : user.campusId.toString();
      return driveCamp === userCamp;
    }
    return true;
  }

  const role = normalizeRole(user.role);

  // 3. Recruiter: strictly scoped to own company or drives created by them
  if (role === ROLES.RECRUITER) {
    const userId = user._id ? user._id.toString() : (user.id ? user.id.toString() : '');
    const creatorId = drive.createdBy?._id
      ? drive.createdBy._id.toString()
      : (drive.createdBy ? drive.createdBy.toString() : '');

    if (userId && creatorId && userId === creatorId) {
      return true;
    }

    const userCompany = (user.companyName || '').trim().toLowerCase();
    const driveCompany = (drive.companyName || '').trim().toLowerCase();

    if (userCompany && driveCompany && userCompany === driveCompany) {
      return true;
    }

    return false;
  }

  return false; // Fail closed for students, faculty, auditors, etc.
};

module.exports = {
  isSuperAdmin,
  isCampusScopedAdmin,
  isPlatformWide,
  getCampusFilter,
  getDepartmentFilter,
  getOwnershipFilter,
  getManagedScopeFilter,
  combineScopeFilters,
  buildStudentScopeFilter,
  canAccessCampus,
  canAccessDepartment,
  matchesManagedScope,
  canAccessStudentAcademicScope,
  getRecruiterFilter,
  getBranchPatterns,
  canRecruiterAccessDrive
};
