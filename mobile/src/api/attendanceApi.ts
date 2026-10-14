import apiClient from './client';

export interface AttendanceRoom {
  _id: string;
  buildingName: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  active: boolean;
}

export interface AttendanceSubjectStats {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  totalConducted: number;
  totalAttended: number;
  percentage: number;
  isShortage: boolean;
  neededForThreshold: number;
}

export interface StudentAttendanceAnalytics {
  overallPercentage: number;
  totalSessionsHeld: number;
  totalSessionsAttended: number;
  thresholdPercentage: number;
  shortageCount: number;
  subjectStats: AttendanceSubjectStats[];
}

export interface AttendanceHistoryRecord {
  _id: string;
  recordId?: string;
  sessionId?: any;
  subject?: { name: string; code: string };
  date?: string;
  scheduledTime?: string;
  faculty?: string;
  room?: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | string;
  scannedAt?: string;
  calculatedDistanceMeters?: number;
  locationVerificationStatus?: string;
  correctionStatus?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | string;
  originalStatus?: string | null;
  correctionRequestedStatus?: string | null;
  correctionReason?: string;
  correctionNotes?: string;
  remarks?: string;
}

export interface CheckInResponse {
  success: boolean;
  message?: string;
  error?: string;
  record?: {
    _id: string;
    status: string;
    scannedAt: string;
    calculatedDistanceMeters?: number;
    locationVerificationStatus: string;
  };
}

export interface ActiveSession {
  _id: string;
  subjectId: { _id: string; name: string; code: string };
  roomId: AttendanceRoom;
  branch: string;
  section: string;
  academicYear: string;
  period: string;
  status: string;
  totalEnrolled: number;
  totalPresent: number;
  qrSessionIdentifier: string;
  qrExpiresAt: string;
  qrRefreshInterval: number;
  attendanceClosed?: boolean;
  attendanceClosedAt?: string;
  attendanceTimerMinutes?: number;
  lectureStatus?: string;
  actualStartTime?: string;
}

export interface AttendanceSubjectOption {
  _id: string;
  name: string;
  code: string;
  academicYear?: string;
  branch?: string;
  section?: string;
}

export interface CampusArrivalConfigResponse {
  success: boolean;
  configured: boolean;
  campusName?: string;
  arrivalPerimeterRadiusMeters?: number;
  message?: string;
}

export interface CampusArrivalCheckInPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  faceVerificationToken?: string;
}

export interface BiometricStatusResponse {
  success: boolean;
  isEnrolled: boolean;
  enrolledAt: string | null;
  consentGiven: boolean;
  consentDate: string | null;
  modelVersion?: string;
  lastVerifiedAt?: string | null;
  error?: string;
}

export interface BiometricChallengeResponse {
  success: boolean;
  challengeNonce: string;
  promptAction: string;
  instructions: string;
  expiresAt: string;
  error?: string;
}

export interface BiometricVerifyResponse {
  success: boolean;
  verified?: boolean;
  similarity?: number;
  faceVerificationToken?: string;
  expiresInSeconds?: number;
  status?: string;
  error?: string;
}

export interface CampusArrivalCheckInResponse {
  success: boolean;
  message: string;
  alreadyCheckedIn?: boolean;
  checkIn?: {
    id: string;
    referenceCode: string;
    timestamp: string;
    status: string;
    distanceMeters?: number;
    campusName?: string;
  };
  error?: string;
}

export interface CampusArrivalStatusResponse {
  success: boolean;
  student?: {
    _id: string;
    name: string;
    rollNumber: string;
    campusId: string;
    campusName: string;
    branch?: string;
    section?: string;
  };
  arrivalDateKey?: string;
  arrivalStatus: 'VERIFIED' | 'OUTSIDE_PERIMETER' | 'INACCURATE_GPS' | 'FAILED' | 'PENDING_REVIEW' | 'NOT_CHECKED_IN' | string;
  verificationMethod?: string | null;
  timestamp?: string | null;
  referenceCode?: string | null;
  correctionStatus?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | string;
  correctionReason?: string;
  correctionRequestedBy?: { name: string; role: string } | null;
  correctionRequestedAt?: string | null;
  correctionReviewedBy?: { name: string; role: string } | null;
  correctionReviewedAt?: string | null;
  error?: string;
}

export interface TodayArrivalSummaryResponse {
  success: boolean;
  summary?: {
    arrivalDateKey: string;
    campusId: string;
    campusName: string;
    totalVerifiedToday: number;
    totalPendingCorrectionsToday: number;
  };
  error?: string;
}

export const attendanceApi = {
  // Student: Check-in with QR token and GPS coordinates
  checkIn: async (
    sessionId: string,
    payload: { token: string; latitude: number; longitude: number; accuracy: number; faceVerificationToken?: string }
  ) => {
    const res = await apiClient.post<CheckInResponse>(`/api/attendance/sessions/${sessionId}/checkin`, payload);
    return res.data;
  },

  // Student: Get campus arrival geofence configuration status
  getCampusArrivalConfig: async () => {
    const res = await apiClient.get<CampusArrivalConfigResponse>('/api/attendance/campus-arrival/config');
    return res.data;
  },

  // Student: Check-in to authoritative campus arrival geofence perimeter
  checkInCampusArrival: async (payload: CampusArrivalCheckInPayload) => {
    const res = await apiClient.post<CampusArrivalCheckInResponse>('/api/attendance/campus-arrival', payload);
    return res.data;
  },

  // Support Desk / Staff: Get student campus arrival status
  getStudentArrivalStatus: async (studentId: string) => {
    const res = await apiClient.get<CampusArrivalStatusResponse>(`/api/attendance/campus-arrival/status/${studentId}`);
    return res.data;
  },

  // Support Desk / Staff: Request campus arrival correction when check-in fails
  requestArrivalCorrection: async (payload: { studentId: string; reason: string; notes?: string }) => {
    const res = await apiClient.post<{ success: boolean; message: string; log?: any; error?: string }>(
      '/api/attendance/campus-arrival/correction',
      payload
    );
    return res.data;
  },

  // HOD / Campus Admin: Review and approve/reject campus arrival correction
  reviewArrivalCorrection: async (logId: string, payload: { action: 'APPROVE' | 'REJECT'; notes?: string }) => {
    const res = await apiClient.put<{ success: boolean; message: string; log?: any; error?: string }>(
      `/api/attendance/campus-arrival/correction/${logId}/review`,
      payload
    );
    return res.data;
  },

  // Faculty / Leadership: Get today's campus arrival summary
  getTodayArrivalSummary: async (campusId?: string) => {
    const res = await apiClient.get<TodayArrivalSummaryResponse>(
      '/api/attendance/campus-arrival/today-summary',
      { params: campusId ? { campusId } : {} }
    );
    return res.data;
  },

  // Student: Fetch attendance analytics & subject-wise percentages
  getStudentAnalytics: async () => {
    const res = await apiClient.get<{ success: boolean; data: StudentAttendanceAnalytics }>('/api/attendance/student/analytics');
    return res.data;
  },

  // Student: Fetch attendance history logs
  getStudentHistory: async () => {
    const res = await apiClient.get<{ success: boolean; data?: AttendanceHistoryRecord[]; history?: AttendanceHistoryRecord[]; count?: number }>(
      '/api/attendance/student/history'
    );
    return {
      success: res.data.success,
      data: res.data.history || res.data.data || [],
      count: res.data.count || 0,
    };
  },

  // Faculty: Fetch campus lecture rooms
  getRooms: async () => {
    const res = await apiClient.get<{ success: boolean; data?: AttendanceRoom[]; rooms?: AttendanceRoom[] }>('/api/attendance/rooms');
    return {
      success: res.data.success,
      data: res.data.data || res.data.rooms || [],
    };
  },

  // Faculty: Fetch active sessions
  getActiveSessions: async () => {
    const res = await apiClient.get<{ success: boolean; data?: ActiveSession[]; sessions?: ActiveSession[] }>('/api/attendance/sessions/active');
    return {
      success: res.data.success,
      data: res.data.data || res.data.sessions || [],
    };
  },

  // Faculty: Fetch assigned teaching subjects
  getFacultySubjects: async () => {
    const res = await apiClient.get<{ success: boolean; data?: AttendanceSubjectOption[]; count?: number }>('/api/academic/subjects');
    return {
      success: res.data.success,
      data: res.data.data || [],
    };
  },

  // Faculty: Create a new live attendance session
  createSession: async (payload: {
    roomId?: string;
    roomNumber?: string;
    buildingName?: string;
    subjectId: string;
    branch: string;
    section: string;
    academicYear: string;
    period: string;
    attendanceTimerMinutes?: number;
    qrRefreshInterval?: number;
    geofenceEnforced?: boolean;
    latitude?: number;
    longitude?: number;
    geofenceRadiusMeters?: number;
    faceVerificationToken?: string;
  }) => {
    const res = await apiClient.post<{ success: boolean; data?: ActiveSession; session?: ActiveSession; error?: string }>('/api/attendance/sessions', payload);
    return {
      success: res.data.success,
      data: res.data.data || res.data.session,
      error: res.data.error,
    };
  },

  // Faculty: Rotate dynamic QR token
  rotateToken: async (sessionId: string) => {
    const res = await apiClient.post<{ success: boolean; qr: { token: string; expiresAt: string; refreshInterval: number } }>(
      `/api/attendance/sessions/${sessionId}/rotate-token`
    );
    return res.data;
  },

  // Faculty: Get live session roster & attendee list
  getSessionById: async (sessionId: string) => {
    const res = await apiClient.get<{ success: boolean; session: any; records: any[] }>(`/api/attendance/sessions/${sessionId}`);
    return res.data;
  },

  // Faculty: Close attendance window and make class LIVE
  closeAttendance: async (sessionId: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; session?: ActiveSession; error?: string }>(
      `/api/attendance/sessions/${sessionId}/close-attendance`
    );
    return res.data;
  },

  // Faculty: Close & finalize lecture session
  closeSession: async (sessionId: string) => {
    const res = await apiClient.post<{ success: boolean; message: string; summary?: any }>(
      `/api/attendance/sessions/${sessionId}/close`
    );
    return res.data;
  },

  // Faculty: Submit attendance dispute / correction request
  requestCorrection: async (
    recordId: string,
    payload: { requestedStatus: string; reason: string; notes?: string }
  ) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      record?: any;
      error?: string;
    }>(`/api/attendance/records/${recordId}/correction`, payload);
    return res.data;
  },

  // HOD / Admin: Review and approve/reject attendance correction request
  reviewCorrection: async (
    recordId: string,
    payload: { action: 'APPROVE' | 'REJECT'; notes?: string }
  ) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      record?: any;
      error?: string;
    }>(`/api/attendance/records/${recordId}/correction`, payload);
    return res.data;
  },

  // Fetch session history for timetables and class audits
  getSessionHistory: async (params?: Record<string, any>) => {
    const res = await apiClient.get<{
      success: boolean;
      count: number;
      sessions?: any[];
      data?: any[];
    }>('/api/attendance/sessions/history', { params });
    return {
      success: res.data.success,
      count: res.data.count || 0,
      sessions: res.data.sessions || res.data.data || [],
    };
  },

  // Faculty: Fetch assigned students in teaching scope
  getAssignedStudents: async (params?: Record<string, any>) => {
    const res = await apiClient.get<{
      success: boolean;
      count: number;
      data?: any[];
      students?: any[];
    }>('/api/users/students', { params });
    return {
      success: res.data.success,
      count: res.data.count || 0,
      data: res.data.data || res.data.students || [],
    };
  },

  // Faculty / Leadership: Fetch attendance notification history
  getAttendanceNotifications: async (params?: Record<string, any>) => {
    const res = await apiClient.get<{
      success: boolean;
      count: number;
      data?: any[];
    }>('/api/attendance/notifications', { params });
    return {
      success: res.data.success,
      count: res.data.count || 0,
      data: res.data.data || [],
    };
  },

  // Faculty: Trigger bulk shortage alert review for assigned class
  dispatchAtRiskAlerts: async (payload?: { subjectId?: string; branch?: string; section?: string }) => {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      summary?: {
        requested: number;
        authorized: number;
        notified: number;
        skipped: number;
        failed: number;
      };
      error?: string;
    }>('/api/attendance/notifications/dispatch-at-risk', payload || {});
    return res.data;
  },

  // ============================================================
  // BIOMETRIC FACE IDENTITY METHODS
  // ============================================================

  // Check enrollment status of current authenticated user
  getBiometricStatus: async () => {
    const res = await apiClient.get<BiometricStatusResponse>('/api/attendance/biometrics/status');
    return res.data;
  },

  // Request optical liveness challenge nonce
  requestBiometricChallenge: async () => {
    const res = await apiClient.post<BiometricChallengeResponse>('/api/attendance/biometrics/challenge');
    return res.data;
  },

  // Enroll biometric template with explicit consent
  enrollBiometric: async (payload: {
    consentGiven: boolean;
    opticalEvidence: any;
    challengeNonce?: string;
    livenessEvidence?: any;
  }) => {
    const res = await apiClient.post<{
      success: boolean;
      message?: string;
      enrolledAt?: string;
      error?: string;
    }>('/api/attendance/biometrics/enroll', payload);
    return res.data;
  },

  // Verify face against enrolled representation
  verifyBiometric: async (payload: {
    purpose: 'ATTENDANCE_CHECKIN' | 'CAMPUS_ARRIVAL' | 'FACULTY_SESSION_LAUNCH';
    opticalEvidence: any;
    challengeNonce?: string;
    livenessEvidence?: any;
  }) => {
    const res = await apiClient.post<BiometricVerifyResponse>('/api/attendance/biometrics/verify', payload);
    return res.data;
  },

  // Withdraw biometric consent and permanently delete template
  withdrawBiometric: async (payload?: { reason?: string }) => {
    const res = await apiClient.delete<{
      success: boolean;
      message?: string;
      error?: string;
    }>('/api/attendance/biometrics/enrollment', { data: payload || {} });
    return res.data;
  },
};
