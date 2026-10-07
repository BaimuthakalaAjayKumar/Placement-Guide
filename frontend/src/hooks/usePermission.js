import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PERMISSIONS,
  ROLES,
  normalizeRole,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isSuperAdmin,
  isCampusAdmin,
  isAdministrator,
  isHOD,
  isFaculty,
  isPlacementOfficer,
  isRecruiter,
  isStudent,
  isAuditor
} from '../utils/permissions';

/**
 * Custom React hook for seamless, permission-aware frontend rendering.
 *
 * @returns {Object} Permission evaluator methods and role flags
 *
 * @example
 * const { can, isHOD } = usePermission();
 * if (can(PERMISSIONS.MARKS_WRITE)) {
 *   return <EditMarksButton />;
 * }
 */
export const usePermission = () => {
  const { user } = useAuth();

  const userPermsSet = useMemo(() => {
    return getUserPermissions(user);
  }, [user]);

  const userPermsArray = useMemo(() => {
    return Array.from(userPermsSet);
  }, [userPermsSet]);

  const normalizedRole = useMemo(() => {
    return user ? normalizeRole(user.role) : null;
  }, [user]);

  const can = (permission) => {
    return hasPermission(user, permission);
  };

  const canAny = (permissions = []) => {
    return hasAnyPermission(user, permissions);
  };

  const canAll = (permissions = []) => {
    return hasAllPermissions(user, permissions);
  };

  return {
    user,
    role: normalizedRole,
    permissions: userPermsArray,
    can,
    canAny,
    canAll,

    // Role booleans
    isSuperAdmin: isSuperAdmin(user),
    isCampusAdmin: isCampusAdmin(user),
    isAdministrator: isAdministrator(user),
    isHOD: isHOD(user),
    isFaculty: isFaculty(user),
    isPlacementOfficer: isPlacementOfficer(user),
    isRecruiter: isRecruiter(user),
    isStudent: isStudent(user),
    isAuditor: isAuditor(user),

    // Permission constants reference
    PERMISSIONS,
    ROLES
  };
};

export default usePermission;
