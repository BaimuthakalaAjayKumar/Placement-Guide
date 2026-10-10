import apiClient from './client';
import { buildCsvString } from '../utils/csvExport';

// =========================================================================
// 1. DATA INTERFACES
// =========================================================================

export interface StudentAcademicSubject {
  subjectCode: string;
  subjectName: string;
  credits: number;
  internalMarks?: number;
  externalMarks?: number;
  totalMarks?: number;
  grade?: string;
  gradePoints?: number;
}

export interface StudentAcademicSemester {
  semester: number;
  subjects: StudentAcademicSubject[];
  totalCredits: number;
  sgpa: number;
  isPublished: boolean;
}

export interface StudentAcademicRecord {
  studentRollNumber: string;
  studentName: string;
  branch: string;
  section: string;
  academicYear: string;
  overallCgpa: number;
  totalCreditsEarned: number;
  totalArrears: number;
  semesters: StudentAcademicSemester[];
}

export const reportsApi = {
  /**
   * Fetches official academic examination records for the logged-in student.
   */
  async getMyAcademicRecord(): Promise<{ success: boolean; data: StudentAcademicRecord | null }> {
    try {
      const res = await apiClient.get('/api/academics/my-record');
      return {
        success: res.data?.success ?? true,
        data: res.data?.data || null,
      };
    } catch {
      return { success: false, data: null };
    }
  },

  /**
   * Downloads server-generated statutory shortage CSV report.
   * Scoped to authorized leadership roles (HOD, Principal, Director, Admin).
   */
  async fetchServerShortageCsv(): Promise<{ success: boolean; data: string; error?: string }> {
    try {
      const res = await apiClient.get('/api/attendance/reports/shortage.csv', {
        responseType: 'text',
      });
      return {
        success: true,
        data: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
      };
    } catch (err: any) {
      return {
        success: false,
        data: '',
        error: err.response?.data?.error || err.message || 'Failed to download server CSV report.',
      };
    }
  },

  // =======================================================================
  // 2. CLIENT-SIDE CSV BUILDERS WITH STRICT FORMULA INJECTION SANITIZATION
  // =======================================================================

  /**
   * Generates Student Personal Attendance CSV.
   */
  buildStudentAttendanceCsv(analytics: any, studentName: string, rollNumber?: string): string {
    const headers = [
      'Subject Code',
      'Subject Name',
      'Classes Attended',
      'Total Conducted',
      'Attendance Percentage',
      'Statutory Status',
    ];

    const subjects = analytics?.subjectStats || analytics?.subjects || [];
    const rows = subjects.map((sub: any) => [
      sub.subjectCode || sub.code || 'N/A',
      sub.subjectName || sub.name || 'General',
      sub.totalAttended ?? sub.present ?? 0,
      sub.totalConducted ?? sub.total ?? 0,
      `${sub.percentage ?? 0}%`,
      (sub.percentage ?? 0) < 75 ? 'SHORTAGE (<75%)' : 'SATISFACTORY',
    ]);

    // Append summary footer
    rows.push([
      'OVERALL SUMMARY',
      `Student: ${studentName}${rollNumber ? ` (${rollNumber})` : ''}`,
      analytics?.totalSessionsAttended ?? analytics?.attendedClasses ?? 0,
      analytics?.totalSessionsHeld ?? analytics?.totalClasses ?? 0,
      `${analytics?.overallPercentage ?? 0}%`,
      (analytics?.overallPercentage ?? 0) < 75 ? 'STATUTORY SHORTAGE' : 'ELIGIBLE FOR EXAMS',
    ]);

    return buildCsvString(headers, rows);
  },

  /**
   * Generates Student Academic Marks & SGPA/CGPA CSV.
   */
  buildStudentAcademicMarksCsv(record: StudentAcademicRecord): string {
    const headers = [
      'Semester',
      'Subject Code',
      'Subject Name',
      'Credits',
      'Internal Marks',
      'External Marks',
      'Total Marks',
      'Grade',
      'SGPA / CGPA',
    ];

    const rows: (string | number)[][] = [];

    (record.semesters || []).forEach((sem) => {
      if (sem.subjects && sem.subjects.length > 0) {
        sem.subjects.forEach((sub, idx) => {
          rows.push([
            `Semester ${sem.semester}`,
            sub.subjectCode || 'N/A',
            sub.subjectName || 'N/A',
            sub.credits ?? 0,
            sub.internalMarks ?? 0,
            sub.externalMarks ?? 0,
            sub.totalMarks ?? 0,
            sub.grade || 'N/A',
            idx === 0 ? `SGPA: ${sem.sgpa ?? 0}` : '',
          ]);
        });
      }
    });

    // Summary row
    rows.push([
      'CUMULATIVE METRICS',
      `Roll: ${record.studentRollNumber || 'N/A'}`,
      `Name: ${record.studentName || 'Student'}`,
      record.totalCreditsEarned ?? 0,
      '-',
      '-',
      '-',
      `Arrears: ${record.totalArrears ?? 0}`,
      `CGPA: ${record.overallCgpa ?? 0}`,
    ]);

    return buildCsvString(headers, rows);
  },

  /**
   * Generates Student or Staff Complaint / Grievance History CSV.
   */
  buildComplaintsHistoryCsv(complaints: any[], roleName: string): string {
    const headers = [
      'Reference Number',
      'Type',
      'Category',
      'Priority',
      'Status',
      'Date Filed',
      'Title / Subject',
      'Routing Target',
      'Official Resolution Remarks',
      'Resolved By',
    ];

    const rows = complaints.map((c: any) => [
      c.referenceNumber || `CMP-${(c._id || '').slice(-6).toUpperCase()}`,
      (c.itemType || 'complaint').toUpperCase(),
      c.categoryLabel || c.category || 'General',
      (c.priority || 'standard').toUpperCase(),
      c.status === 'answered' ? 'RESOLVED' : 'UNDER TRIAGE',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A',
      c.title || c.subject || 'N/A',
      c.routingTarget || 'Administrative Triage',
      c.answer || 'Pending review',
      c.answeredBy || 'N/A',
    ]);

    return buildCsvString(headers, rows);
  },

  /**
   * Generates Faculty Teaching Sessions CSV.
   */
  buildFacultyTeachingSessionsCsv(sessions: any[], facultyName: string): string {
    const headers = [
      'Session ID',
      'Date Conducted',
      'Subject Code',
      'Subject Name',
      'Room Number',
      'Building',
      'Period',
      'Branch / Section',
      'Enrolled',
      'Present Count',
      'Attendance %',
      'Session Status',
    ];

    const rows = sessions.map((s: any) => {
      const pct = s.enrolledCount > 0 ? Math.round((s.presentCount / s.enrolledCount) * 100) : 0;
      return [
        `SES-${(s._id || '').slice(-6).toUpperCase()}`,
        s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A',
        s.subjectCode || 'N/A',
        s.subjectName || 'General',
        s.roomNumber || 'N/A',
        s.buildingName || 'Academic Block',
        s.period || '1',
        `${s.branch || ''} Sec ${s.section || ''}`,
        s.enrolledCount ?? 0,
        s.presentCount ?? 0,
        `${pct}%`,
        s.status || 'FINALIZED',
      ];
    });

    return buildCsvString(headers, rows);
  },

  /**
   * Generates Department Attendance Summary CSV for HOD.
   */
  buildDepartmentAttendanceCsv(report: any, departmentName: string): string {
    const headers = [
      'Subject Code',
      'Subject Name',
      'Total Sessions',
      'Enrolled Students',
      'Present Count',
      'Attendance Percentage',
      'Shortage Status',
    ];

    const subjects = report?.subjectAttendance || [];
    const rows = subjects.map((sub: any) => [
      sub.subjectCode || 'N/A',
      sub.subjectName || 'N/A',
      sub.sessionsCount ?? 0,
      sub.totalEnrolled ?? 0,
      sub.totalPresent ?? 0,
      `${sub.attendancePercentage ?? 0}%`,
      (sub.attendancePercentage ?? 0) < 75 ? 'ALERT (<75%)' : 'NORMAL',
    ]);

    // Summary row
    rows.push([
      'DEPARTMENT TOTALS',
      departmentName,
      report?.totalSessions ?? 0,
      report?.totalStudents ?? 0,
      '-',
      `${report?.averageAttendance ?? 0}%`,
      (report?.averageAttendance ?? 0) < 75 ? 'DEPARTMENT SHORTAGE' : 'SATISFACTORY',
    ]);

    return buildCsvString(headers, rows);
  },

  /**
   * Generates Campus Institutional Performance Benchmark CSV for Principal and Director.
   */
  buildCampusPerformanceBenchmarkCsv(report: any): string {
    const headers = [
      'Department / Branch',
      'Sessions Conducted',
      'Total Enrolled',
      'Total Attended',
      'Attendance Percentage',
      'Regulatory Standing',
    ];

    const branches = report?.branchComparisons || [];
    const rows = branches.map((b: any) => [
      `${b.branch} Department`,
      b.sessions ?? 0,
      b.totalEnrolled ?? 0,
      b.totalPresent ?? 0,
      `${b.attendancePercentage ?? 0}%`,
      (b.attendancePercentage ?? 0) < 75 ? 'INTERVENTION REQUIRED (<75%)' : 'COMPLIANT',
    ]);

    // Campus totals
    rows.push([
      'CAMPUS INSTITUTIONAL AGGREGATE',
      report?.totalSessions ?? 0,
      report?.totalStudents ?? 0,
      '-',
      `${report?.overallAttendance ?? 0}%`,
      (report?.overallAttendance ?? 0) < 75 ? 'CAMPUS INTERVENTION REQUIRED' : 'COMPLIANT',
    ]);

    return buildCsvString(headers, rows);
  },

  /**
   * Generates Attendance Disputes / Correction Decision Audit CSV.
   */
  buildAttendanceDisputesAuditCsv(disputes: any[]): string {
    const headers = [
      'Dispute ID',
      'Student Roll',
      'Student Name',
      'Subject',
      'Class Date',
      'Claimed Status',
      'Resolution Status',
      'Faculty / Submitter',
      'Decision Remarks',
      'Resolved At',
    ];

    const rows = disputes.map((d: any) => [
      `DSP-${(d._id || '').slice(-6).toUpperCase()}`,
      d.studentRollNumber || d.rollNumber || 'N/A',
      d.studentName || 'Student',
      d.subjectName || 'General',
      d.classDate ? new Date(d.classDate).toLocaleDateString() : 'N/A',
      d.requestedStatus || 'PRESENT',
      d.status || 'PENDING',
      d.facultyName || 'Instructor',
      d.reviewRemarks || d.notes || 'Pending dual-control review',
      d.reviewedAt ? new Date(d.reviewedAt).toLocaleDateString() : 'N/A',
    ]);

    return buildCsvString(headers, rows);
  },
};
