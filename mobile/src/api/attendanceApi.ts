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
  sessionId: {
    _id: string;
    branch: string;
    section: string;
    subjectId?: { name: string; code: string };
    sessionDate: string;
    period: string;
  };
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  scannedAt: string;
  calculatedDistanceMeters?: number;
  locationVerificationStatus: string;
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
}

export const attendanceApi = {
  // Student: Check-in with QR token and GPS coordinates
  checkIn: async (sessionId: string, payload: { token: string; latitude: number; longitude: number; accuracy: number }) => {
    const res = await apiClient.post<CheckInResponse>(`/api/attendance/sessions/${sessionId}/checkin`, payload);
    return res.data;
  },

  // Student: Fetch attendance analytics & subject-wise percentages
  getStudentAnalytics: async () => {
    const res = await apiClient.get<{ success: boolean; data: StudentAttendanceAnalytics }>('/api/attendance/student/analytics');
    return res.data;
  },

  // Student: Fetch attendance history logs
  getStudentHistory: async () => {
    const res = await apiClient.get<{ success: boolean; data: AttendanceHistoryRecord[] }>('/api/attendance/student/history');
    return res.data;
  },

  // Faculty: Fetch campus lecture rooms
  getRooms: async () => {
    const res = await apiClient.get<{ success: boolean; data: AttendanceRoom[] }>('/api/attendance/rooms');
    return res.data;
  },

  // Faculty: Fetch active sessions
  getActiveSessions: async () => {
    const res = await apiClient.get<{ success: boolean; data: ActiveSession[] }>('/api/attendance/sessions/active');
    return res.data;
  },

  // Faculty: Create a new live attendance session
  createSession: async (payload: {
    roomId: string;
    subjectId: string;
    branch: string;
    section: string;
    academicYear: string;
    period: string;
    qrRefreshInterval?: number;
    geofenceEnforced?: boolean;
  }) => {
    const res = await apiClient.post<{ success: boolean; data?: ActiveSession; error?: string }>('/api/attendance/sessions', payload);
    return res.data;
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

  // Faculty: Close attendance session
  closeSession: async (sessionId: string) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/api/attendance/sessions/${sessionId}/close`);
    return res.data;
  },
};
