import apiClient from './client';

// =========================================================================
// 1. HOD INTERFACES & TYPES
// =========================================================================

export interface HODPlacementsSummary {
  totalApplications: number;
  selectedStudentsCount: number;
  offeredStudentsCount: number;
  placementPercentage: number;
  highestPackage: string;
  averagePackage: string;
}

export interface HODFacultyActivities {
  totalTestsCreated: number;
  totalLabsAssigned: number;
  totalDoubtsAnswered: number;
}

export interface HODOverviewData {
  department: string;
  hodName: string;
  totalStudents: number;
  totalFaculties: number;
  averageCgpa: number;
  averagePri: number;
  atRiskCount: number;
  yearCounts: Record<string, number>;
  placements: HODPlacementsSummary;
  facultyActivities: HODFacultyActivities;
}

export interface HODFacultyMember {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  mobileNumber?: string;
  branch?: string;
  targetRole?: string;
  managedScopes?: Array<{
    academicYear: string;
    branch?: string;
    section?: string;
    subject?: string;
  }>;
  managedAcademicYears?: string[];
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

// =========================================================================
// 2. ATTENDANCE REPORT INTERFACES (DEPARTMENT & CAMPUS)
// =========================================================================

export interface SubjectAttendanceItem {
  subjectId?: string;
  subjectName: string;
  subjectCode: string;
  sessionsCount: number;
  totalEnrolled: number;
  totalPresent: number;
  attendancePercentage: number;
}

export interface SectionAttendanceItem {
  branch: string;
  section: string;
  sessionsCount: number;
  totalEnrolled: number;
  totalPresent: number;
  attendancePercentage: number;
}

export interface FacultyActivityItem {
  facultyId?: string;
  facultyName: string;
  facultyEmail: string;
  sessionsCount: number;
  totalPresent: number;
  totalEnrolled: number;
  averageAttendance: number;
}

export interface ShortageStudentItem {
  studentId: string;
  rollNumber?: string;
  studentName?: string;
  presentCount: number;
  totalCount: number;
  attendancePercentage: number;
  shortage?: boolean;
}

export interface DepartmentAttendanceReport {
  totalStudents: number;
  totalSessions: number;
  averageAttendance: number;
  subjectAttendance: SubjectAttendanceItem[];
  sectionAttendance: SectionAttendanceItem[];
  facultyActivity: FacultyActivityItem[];
  shortageCount: number;
  shortageStudents?: ShortageStudentItem[];
}

export interface LeadershipClassSession {
  _id: string;
  campusId?: string;
  departmentId?: string;
  branch: string;
  section: string;
  academicYear?: string;
  semester?: string;
  period: string;
  sessionDate: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: string;
  subject?: {
    _id?: string;
    name: string;
    code: string;
  };
  room?: {
    _id: string;
    buildingName: string;
    roomNumber: string;
    floor?: number;
    capacity?: number;
    geofenceRadiusMeters?: number;
  } | null;
  faculty?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  totalEnrolled: number;
  totalPresent: number;
  totalAbsent?: number;
  attendancePercentage: number;
}

export interface BranchComparisonItem {
  branch: string;
  sessions: number;
  totalEnrolled: number;
  totalPresent: number;
  attendancePercentage: number;
}

export interface CampusAttendanceReport {
  totalStudents: number;
  totalSessions: number;
  averageAttendance: number;
  shortageCount: number;
  branchComparison: BranchComparisonItem[];
  sessionsConducted: number;
}

// =========================================================================
// 3. STAFF & AUDIT GOVERNANCE INTERFACES
// =========================================================================

export interface CampusStaffMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  managedAcademicYears?: string[];
  managedScopes?: Array<{
    academicYear: string;
    branch?: string;
    section?: string;
    subject?: string;
  }>;
  mustChangePassword?: boolean;
  createdAt?: string;
  campusId?: string;
}

export interface AuditStatsData {
  totalStudents: number;
  onlineNowCount: number;
  activeTodayCount: number;
  totalActiveHours: string;
  totalActivitiesLogged: number;
  categoryCounts: Array<{ _id: string; count: number }>;
  topStudents: Array<{
    _id: string;
    name: string;
    rollNumber?: string;
    branch?: string;
    section?: string;
    totalActiveSeconds?: number;
    lastActiveAt?: string;
  }>;
}

// =========================================================================
// 4. LEADERSHIP API CLIENT METHODS
// =========================================================================

export const leadershipApi = {
  // HOD: Get department overview metrics & placement stats
  getHODOverview: async () => {
    const res = await apiClient.get<{ success: boolean; data: HODOverviewData }>('/api/hod/overview');
    return res.data;
  },

  // HOD: Get department faculty roster
  getHODFaculties: async () => {
    const res = await apiClient.get<{ success: boolean; data: HODFacultyMember[]; faculties?: HODFacultyMember[] }>(
      '/api/hod/faculties'
    );
    return {
      success: res.data.success,
      data: res.data.data || res.data.faculties || [],
    };
  },

  // HOD: Get department-scoped attendance report
  getDepartmentAttendanceReport: async (params?: {
    branch?: string;
    section?: string;
    academicYear?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await apiClient.get<{ success: boolean; report: DepartmentAttendanceReport }>(
      '/api/attendance/reports/department',
      { params }
    );
    return res.data;
  },

  // Leadership (HOD, Principal, Director): Get active live class sessions
  getActiveClassSessions: async (params?: { branch?: string; section?: string }) => {
    const res = await apiClient.get<{
      success: boolean;
      count: number;
      data?: LeadershipClassSession[];
      sessions?: LeadershipClassSession[];
    }>('/api/attendance/sessions/history', {
      params: { status: 'ACTIVE', ...params },
    });
    return {
      success: res.data.success,
      count: res.data.count || 0,
      data: res.data.data || res.data.sessions || [],
    };
  },

  // Principal / Director: Get campus-wide attendance summary & branch comparisons
  getCampusAttendanceReport: async () => {
    const res = await apiClient.get<{ success: boolean; report: CampusAttendanceReport }>(
      '/api/attendance/reports/campus'
    );
    return res.data;
  },

  // Principal / Director: Get campus staff (faculty & administrators) roster
  getCampusStaff: async () => {
    const res = await apiClient.get<{ success: boolean; count: number; data: CampusStaffMember[] }>(
      '/api/users/staff'
    );
    return res.data;
  },

  // Director: Get institutional audit & activity statistics
  getAuditStats: async () => {
    const res = await apiClient.get<{ success: boolean; data: AuditStatsData }>('/api/audit/stats');
    return res.data;
  },

  // Leadership (HOD, Principal, Director): Get live attendee roster for an individual class session
  getSessionRoster: async (sessionId: string) => {
    const res = await apiClient.get<{
      success: boolean;
      session: any;
      records: Array<{
        _id?: string;
        studentId: string;
        rollNumber: string;
        studentName: string;
        status: string;
        verificationMethod?: string;
        scannedAt?: string;
        markedAt?: string;
        isFlaggedForReview?: boolean;
        flagReason?: string;
        locationVerificationStatus?: string;
      }>;
    }>(`/api/attendance/sessions/${sessionId}`);
    return {
      success: res.data.success,
      session: res.data.session,
      records: res.data.records || [],
    };
  },
};
