import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';
import { exportAndShareCsv } from '../../utils/csvExport';
import { reportsApi, StudentAcademicRecord } from '../../api/reportsApi';
import { attendanceApi, StudentAttendanceAnalytics } from '../../api/attendanceApi';
import { complaintsApi, ComplaintItem } from '../../api/complaintsApi';
import { leadershipApi } from '../../api/leadershipApi';

export const ReportsRecordsScreen: React.FC = () => {
  const { user } = useAuth();
  const userRole = (user?.role || 'student').toLowerCase();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Active Category View
  const [activeCategory, setActiveCategory] = useState<string>('primary');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Datasets
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAttendanceAnalytics | null>(null);
  const [academicRecord, setAcademicRecord] = useState<StudentAcademicRecord | null>(null);
  const [myComplaints, setMyComplaints] = useState<ComplaintItem[]>([]);
  const [disputesList, setDisputesList] = useState<any[]>([]);

  // Leadership & Faculty Datasets
  const [facultySessions, setFacultySessions] = useState<any[]>([]);
  const [deptReport, setDeptReport] = useState<any | null>(null);
  const [campusReport, setCampusReport] = useState<any | null>(null);
  const [shortageData, setShortageData] = useState<any | null>(null);
  const [adminComplaints, setAdminComplaints] = useState<ComplaintItem[]>([]);

  // CSV Preview Modal
  const [csvPreviewContent, setCsvPreviewContent] = useState<string | null>(null);
  const [csvPreviewTitle, setCsvPreviewTitle] = useState<string>('');

  // Load Data based on User Role
  const loadReportsData = useCallback(async () => {
    try {
      setLoading(true);

      if (userRole === 'student') {
        const [analyticsRes, academicRes, complaintsRes, historyRes] = await Promise.all([
          attendanceApi.getStudentAnalytics().catch(() => ({ success: false, data: null })),
          reportsApi.getMyAcademicRecord().catch(() => ({ success: false, data: null })),
          complaintsApi.getMyComplaints(user?.branch).catch(() => ({ success: false, data: [] })),
          attendanceApi.getStudentHistory().catch(() => ({ success: false, data: [] })),
        ]);

        if (analyticsRes.success && analyticsRes.data) setStudentAnalytics(analyticsRes.data);
        if (academicRes.success && academicRes.data) setAcademicRecord(academicRes.data);
        if (complaintsRes.success) setMyComplaints(complaintsRes.data);
        if (historyRes.success && historyRes.data) {
          const flaggedOrDisputed = (historyRes.data || []).filter(
            (r: any) => r.correctionStatus && r.correctionStatus !== 'NONE'
          );
          setDisputesList(flaggedOrDisputed);
        }
      } else if (userRole === 'faculty') {
        const [sessionsRes, histRes, complaintsRes] = await Promise.all([
          attendanceApi.getActiveSessions().catch(() => ({ success: false, data: [] })),
          attendanceApi.getSessionHistory({ limit: 25 }).catch(() => ({ success: false, sessions: [] })),
          complaintsApi.getMyComplaints(user?.branch).catch(() => ({ success: false, data: [] })),
        ]);

        const combined = [...(sessionsRes.data || []), ...(histRes.sessions || [])];
        const unique = Array.from(new Map(combined.map((s: any) => [s._id, s])).values());
        setFacultySessions(unique);
        if (complaintsRes.success) setMyComplaints(complaintsRes.data || []);
      } else if (userRole === 'hod') {
        const [deptRes, complaintsRes] = await Promise.all([
          leadershipApi.getDepartmentAttendanceReport({ branch: user?.branch }).catch(() => ({ success: false, report: null as any })),
          complaintsApi.getAdminComplaints(user?.branch).catch(() => ({ success: false, data: [] })),
        ]);

        if (deptRes.success && deptRes.report) {
          setDeptReport(deptRes.report);
          setShortageData({
            shortageCount: (deptRes.report.shortageStudents || []).length,
            totalStudents: deptRes.report.totalStudents || 0,
            shortageList: deptRes.report.shortageStudents || [],
          });
        }
        if (complaintsRes.success) setAdminComplaints(complaintsRes.data || []);
      } else if (['principal', 'director', 'admin', 'super_admin', 'campus_admin'].includes(userRole)) {
        const [campusRes, complaintsRes] = await Promise.all([
          leadershipApi.getCampusAttendanceReport().catch(() => ({ success: false, report: null as any })),
          complaintsApi.getAdminComplaints(user?.branch).catch(() => ({ success: false, data: [] })),
        ]);

        if (campusRes.success && campusRes.report) {
          setCampusReport(campusRes.report);
          setShortageData({
            shortageCount: (campusRes.report.branchComparisons || []).filter((b: any) => b.attendancePercentage < 75).length,
            totalStudents: campusRes.report.totalStudents || 0,
          });
        }
        if (complaintsRes.success) setAdminComplaints(complaintsRes.data || []);
      }
    } catch (err: any) {
      console.warn('[Reports] Data loading warning:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userRole, user?.branch]);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReportsData();
  };

  // Generic CSV Export Handler
  const handleExportCsv = async (filename: string, csvContent: string, title: string) => {
    if (!csvContent || csvContent.trim().length === 0) {
      Alert.alert('Empty Dataset', 'There are no records available to generate this export.');
      return;
    }

    try {
      setExporting(true);
      const res = await exportAndShareCsv(filename, csvContent, title);
      if (res.success) {
        Alert.alert('Export Complete', res.message);
      } else if (!res.cancelled) {
        Alert.alert('Export Error', res.message);
      }
    } finally {
      setExporting(false);
    }
  };

  // Server-generated CSV Export for HOD / Leadership
  const handleServerShortageExport = async () => {
    try {
      setExporting(true);
      const res = await reportsApi.fetchServerShortageCsv();
      if (res.success && res.data) {
        const filename = `Statutory_Shortage_Report_${Date.now()}.csv`;
        const shareRes = await exportAndShareCsv(
          filename,
          res.data,
          'CampusBridge Statutory Attendance Shortage Report'
        );
        if (shareRes.success) {
          Alert.alert('Export Complete', shareRes.message);
        } else if (!shareRes.cancelled) {
          Alert.alert('Export Error', shareRes.message);
        }
      } else {
        Alert.alert('Server Error', res.error || 'Failed to download server shortage report.');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Official Records & Reports</Text>
            <Text style={styles.headerSubtitle}>
              Scoped audit logs, regulatory attendance transcripts, and verified CSV exports
            </Text>
          </View>
        </View>

        {/* Sub-Category Navigation Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {userRole === 'student' && (
            <>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'primary' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('primary')}
              >
                <Text style={[styles.tabText, activeCategory === 'primary' && styles.tabTextActive]}>
                  Attendance Statement
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'academics' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('academics')}
              >
                <Text style={[styles.tabText, activeCategory === 'academics' && styles.tabTextActive]}>
                  Academic Transcript
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'grievances' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('grievances')}
              >
                <Text style={[styles.tabText, activeCategory === 'grievances' && styles.tabTextActive]}>
                  Disputes & Grievances
                </Text>
              </TouchableOpacity>
            </>
          )}

          {userRole === 'faculty' && (
            <>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'primary' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('primary')}
              >
                <Text style={[styles.tabText, activeCategory === 'primary' && styles.tabTextActive]}>
                  Teaching Sessions Log
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'disputes' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('disputes')}
              >
                <Text style={[styles.tabText, activeCategory === 'disputes' && styles.tabTextActive]}>
                  Correction Requests Filed
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'grievances' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('grievances')}
              >
                <Text style={[styles.tabText, activeCategory === 'grievances' && styles.tabTextActive]}>
                  Support Inquiries
                </Text>
              </TouchableOpacity>
            </>
          )}

          {userRole === 'hod' && (
            <>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'primary' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('primary')}
              >
                <Text style={[styles.tabText, activeCategory === 'primary' && styles.tabTextActive]}>
                  Department Attendance
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'shortage' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('shortage')}
              >
                <Text style={[styles.tabText, activeCategory === 'shortage' && styles.tabTextActive]}>
                  Shortage Roster (&lt;75%)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'oversight' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('oversight')}
              >
                <Text style={[styles.tabText, activeCategory === 'oversight' && styles.tabTextActive]}>
                  Disputes & Complaints
                </Text>
              </TouchableOpacity>
            </>
          )}

          {['principal', 'director', 'admin', 'super_admin', 'campus_admin'].includes(userRole) && (
            <>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'primary' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('primary')}
              >
                <Text style={[styles.tabText, activeCategory === 'primary' && styles.tabTextActive]}>
                  Campus Benchmark
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'shortage' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('shortage')}
              >
                <Text style={[styles.tabText, activeCategory === 'shortage' && styles.tabTextActive]}>
                  Statutory Shortages
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeCategory === 'oversight' && styles.tabBtnActive]}
                onPress={() => setActiveCategory('oversight')}
              >
                <Text style={[styles.tabText, activeCategory === 'oversight' && styles.tabTextActive]}>
                  Governance & Grievances
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.tabBtn, activeCategory === 'standards' && styles.tabBtnActive]}
            onPress={() => setActiveCategory('standards')}
          >
            <Text style={[styles.tabText, activeCategory === 'standards' && styles.tabTextActive]}>
              Sanitization Policy
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Body */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Compiling authorized records...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.primary}
            />
          }
        >
          {/* ========================================================================= */}
          {/* 1. STUDENT VIEW                                                           */}
          {/* ========================================================================= */}
          {userRole === 'student' && activeCategory === 'primary' && (
            <View>
              {/* Summary Metrics */}
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{studentAnalytics?.overallPercentage ?? 0}%</Text>
                  <Text style={styles.metricLbl}>Overall Attendance</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{studentAnalytics?.totalSessionsAttended ?? 0}</Text>
                  <Text style={styles.metricLbl}>Attended Sessions</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{studentAnalytics?.totalSessionsHeld ?? 0}</Text>
                  <Text style={styles.metricLbl}>Total Conducted</Text>
                </View>
              </View>

              {/* Regulatory Notice Card */}
              <View
                style={[
                  styles.complianceCard,
                  (studentAnalytics?.overallPercentage ?? 0) < 75 ? styles.shortageAlertCard : null,
                ]}
              >
                <Text style={styles.complianceTitle}>
                  {(studentAnalytics?.overallPercentage ?? 0) < 75
                    ? 'Statutory Shortage Alert (< 75%)'
                    : 'Examination Eligibility Satisfied'}
                </Text>
                <Text style={styles.complianceDesc}>
                  {(studentAnalytics?.overallPercentage ?? 0) < 75
                    ? 'Your aggregate attendance is currently below the mandatory statutory threshold of 75%. You are at risk of exam debarment.'
                    : 'Your attendance complies with university regulations for end-semester examination hall ticket issuance.'}
                </Text>
              </View>

              {/* Subject Breakdown List */}
              <Text style={styles.sectionHeader}>Subject-Wise Attendance Breakdown</Text>
              {(studentAnalytics?.subjectStats || []).map((sub: any, idx: number) => (
                <View key={idx} style={styles.tableRowCard}>
                  <View style={styles.tableRowHeader}>
                    <Text style={styles.subjectCodeText}>{sub.subjectCode || 'CS401'}</Text>
                    <Text
                      style={[
                        styles.subjectPctText,
                        sub.percentage < 75 ? { color: '#EF4444' } : { color: '#10B981' },
                      ]}
                    >
                      {sub.percentage}%
                    </Text>
                  </View>
                  <Text style={styles.subjectNameText}>{sub.subjectName}</Text>
                  <Text style={styles.subjectDetailText}>
                    Attended: {sub.totalAttended ?? sub.present ?? 0} / {sub.totalConducted ?? sub.total ?? 0} sessions
                  </Text>
                </View>
              ))}

              {/* Action Buttons */}
              <View style={styles.actionBtnRow}>
                <Button
                  title={exporting ? 'Exporting...' : 'Export Attendance Statement (CSV)'}
                  onPress={() => {
                    const csv = reportsApi.buildStudentAttendanceCsv(
                      studentAnalytics,
                      user?.name || 'Student',
                      user?.rollNumber
                    );
                    handleExportCsv('Personal_Attendance_Statement.csv', csv, 'Attendance Statement');
                  }}
                  disabled={exporting}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}

          {userRole === 'student' && activeCategory === 'academics' && (
            <View>
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{academicRecord?.overallCgpa ?? 0}</Text>
                  <Text style={styles.metricLbl}>Cumulative CGPA</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{academicRecord?.totalCreditsEarned ?? 0}</Text>
                  <Text style={styles.metricLbl}>Credits Earned</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{academicRecord?.totalArrears ?? 0}</Text>
                  <Text style={styles.metricLbl}>Active Arrears</Text>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Semester Examination Record</Text>
              {academicRecord ? (
                academicRecord.semesters.map((sem) => (
                  <View key={sem.semester} style={styles.tableRowCard}>
                    <View style={styles.tableRowHeader}>
                      <Text style={styles.subjectCodeText}>Semester {sem.semester}</Text>
                      <Text style={[styles.subjectPctText, { color: '#38BDF8' }]}>
                        SGPA: {sem.sgpa}
                      </Text>
                    </View>
                    <Text style={styles.subjectDetailText}>
                      Subjects evaluated: {(sem.subjects || []).length} • Credits: {sem.totalCredits}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Academic Transcript Pending</Text>
                  <Text style={styles.emptyDesc}>
                    Semester grade sheets will be published after examination controller verification.
                  </Text>
                </View>
              )}

              {academicRecord && (
                <Button
                  title={exporting ? 'Exporting...' : 'Export Academic Transcript (CSV)'}
                  onPress={() => {
                    const csv = reportsApi.buildStudentAcademicMarksCsv(academicRecord);
                    handleExportCsv('Academic_Transcript_Statement.csv', csv, 'Academic Transcript');
                  }}
                  disabled={exporting}
                  style={{ marginTop: 12 }}
                />
              )}
            </View>
          )}

          {userRole === 'student' && activeCategory === 'grievances' && (
            <View>
              <Text style={styles.sectionHeader}>Filed Grievances & Attendance Corrections</Text>
              {myComplaints.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Submissions on Record</Text>
                  <Text style={styles.emptyDesc}>
                    You have not filed any complaints, feedback items, or correction requests.
                  </Text>
                </View>
              ) : (
                myComplaints.map((c) => (
                  <View key={c._id} style={styles.tableRowCard}>
                    <View style={styles.tableRowHeader}>
                      <Text style={styles.subjectCodeText}>{c.referenceNumber}</Text>
                      <Text
                        style={[
                          styles.subjectPctText,
                          c.status === 'answered' ? { color: '#10B981' } : { color: '#F59E0B' },
                        ]}
                      >
                        {c.status === 'answered' ? 'RESOLVED' : 'UNDER TRIAGE'}
                      </Text>
                    </View>
                    <Text style={styles.subjectNameText}>{c.title}</Text>
                    <Text style={styles.subjectDetailText}>
                      Filed: {new Date(c.createdAt).toLocaleDateString()} • {c.categoryLabel}
                    </Text>
                  </View>
                ))
              )}

              {myComplaints.length > 0 && (
                <Button
                  title={exporting ? 'Exporting...' : 'Export Grievance & Disputes Ledger (CSV)'}
                  onPress={() => {
                    const csv = reportsApi.buildComplaintsHistoryCsv(myComplaints, 'Student');
                    handleExportCsv('Grievance_Disputes_Ledger.csv', csv, 'Grievance History');
                  }}
                  disabled={exporting}
                  style={{ marginTop: 12 }}
                />
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* 2. FACULTY VIEW                                                           */}
          {/* ========================================================================= */}
          {userRole === 'faculty' && activeCategory === 'primary' && (
            <View>
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{facultySessions.length}</Text>
                  <Text style={styles.metricLbl}>Sessions Conducted</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{disputesList.length}</Text>
                  <Text style={styles.metricLbl}>Correction Discrepancies</Text>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Conducted Classroom Attendance Sessions</Text>
              {facultySessions.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Completed Sessions</Text>
                  <Text style={styles.emptyDesc}>
                    Classroom sessions finalized via the live attendance controller will appear here.
                  </Text>
                </View>
              ) : (
                facultySessions.map((s) => (
                  <View key={s._id} style={styles.tableRowCard}>
                    <View style={styles.tableRowHeader}>
                      <Text style={styles.subjectCodeText}>{s.subjectCode || 'CS401'}</Text>
                      <Text style={[styles.subjectPctText, { color: '#10B981' }]}>
                        {s.presentCount ?? 0} Present
                      </Text>
                    </View>
                    <Text style={styles.subjectNameText}>{s.subjectName || 'Operating Systems'}</Text>
                    <Text style={styles.subjectDetailText}>
                      Room: {s.roomNumber || 'Room 302'} • Period {s.period || '1'} • {new Date(s.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))
              )}

              {facultySessions.length > 0 && (
                <Button
                  title={exporting ? 'Exporting...' : 'Export Teaching Sessions Log (CSV)'}
                  onPress={() => {
                    const csv = reportsApi.buildFacultyTeachingSessionsCsv(
                      facultySessions,
                      user?.name || 'Faculty Member'
                    );
                    handleExportCsv('Faculty_Teaching_Sessions_Log.csv', csv, 'Teaching Sessions Log');
                  }}
                  disabled={exporting}
                  style={{ marginTop: 12 }}
                />
              )}
            </View>
          )}

          {userRole === 'faculty' && activeCategory === 'disputes' && (
            <View>
              <Text style={styles.sectionHeader}>Attendance Discrepancy Decisions</Text>
              {disputesList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Correction Filings</Text>
                  <Text style={styles.emptyDesc}>
                    No correction requests filed for your classes.
                  </Text>
                </View>
              ) : (
                disputesList.map((d) => (
                  <View key={d._id} style={styles.tableRowCard}>
                    <View style={styles.tableRowHeader}>
                      <Text style={styles.subjectCodeText}>{d.rollNumber || 'Roll No'}</Text>
                      <Text style={[styles.subjectPctText, { color: '#F59E0B' }]}>
                        {d.status || 'PENDING'}
                      </Text>
                    </View>
                    <Text style={styles.subjectNameText}>{d.subjectName || 'Subject'}</Text>
                    <Text style={styles.subjectDetailText}>
                      Claimed: {d.requestedStatus || 'PRESENT'} • Decision: {d.reviewRemarks || 'Pending'}
                    </Text>
                  </View>
                ))
              )}

              {disputesList.length > 0 && (
                <Button
                  title={exporting ? 'Exporting...' : 'Export Correction Dispute Audit (CSV)'}
                  onPress={() => {
                    const csv = reportsApi.buildAttendanceDisputesAuditCsv(disputesList);
                    handleExportCsv('Dispute_Filing_Audit.csv', csv, 'Dispute Filing Audit');
                  }}
                  disabled={exporting}
                  style={{ marginTop: 12 }}
                />
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* 3. HOD VIEW                                                               */}
          {/* ========================================================================= */}
          {userRole === 'hod' && activeCategory === 'primary' && (
            <View>
              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{deptReport?.averageAttendance ?? 0}%</Text>
                  <Text style={styles.metricLbl}>Dept Avg Attendance</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{deptReport?.totalSessions ?? 0}</Text>
                  <Text style={styles.metricLbl}>Total Sessions</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{deptReport?.totalStudents ?? 0}</Text>
                  <Text style={styles.metricLbl}>Dept Students</Text>
                </View>
              </View>

              <Text style={styles.sectionHeader}>Department Subject Attendance Ledger</Text>
              {(deptReport?.subjectAttendance || []).map((sub: any, idx: number) => (
                <View key={idx} style={styles.tableRowCard}>
                  <View style={styles.tableRowHeader}>
                    <Text style={styles.subjectCodeText}>{sub.subjectCode}</Text>
                    <Text
                      style={[
                        styles.subjectPctText,
                        sub.attendancePercentage < 75 ? { color: '#EF4444' } : { color: '#10B981' },
                      ]}
                    >
                      {sub.attendancePercentage}%
                    </Text>
                  </View>
                  <Text style={styles.subjectNameText}>{sub.subjectName}</Text>
                  <Text style={styles.subjectDetailText}>
                    Sessions: {sub.sessionsCount} • Enrolled: {sub.totalEnrolled} • Attended: {sub.totalPresent}
                  </Text>
                </View>
              ))}

              <Button
                title={exporting ? 'Exporting...' : 'Export Department Subject Ledger (CSV)'}
                onPress={() => {
                  const csv = reportsApi.buildDepartmentAttendanceCsv(
                    deptReport,
                    user?.branch || 'Department'
                  );
                  handleExportCsv('Department_Subject_Ledger.csv', csv, 'Department Subject Ledger');
                }}
                disabled={exporting}
                style={{ marginTop: 12 }}
              />
            </View>
          )}

          {userRole === 'hod' && activeCategory === 'shortage' && (
            <View>
              <View style={styles.shortageNoticeCard}>
                <Text style={styles.shortageNoticeTitle}>Statutory 75% Attendance Shortage List</Text>
                <Text style={styles.shortageNoticeDesc}>
                  Under university regulations, students below 75% attendance are subject to detention from semester exams. Download the verified official shortage report below.
                </Text>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={[styles.metricNum, { color: '#EF4444' }]}>
                    {shortageData?.shortageCount ?? 0}
                  </Text>
                  <Text style={styles.metricLbl}>Students in Shortage</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricNum}>{shortageData?.totalStudents ?? 0}</Text>
                  <Text style={styles.metricLbl}>Total Evaluated</Text>
                </View>
              </View>

              <Button
                title={exporting ? 'Downloading...' : 'Download Official Server Shortage Report (CSV)'}
                onPress={handleServerShortageExport}
                disabled={exporting}
                style={{ marginTop: 12, backgroundColor: '#EF4444' }}
              />
            </View>
          )}

          {/* ========================================================================= */}
          {/* 4. PRINCIPAL & DIRECTOR VIEW                                              */}
          {/* ========================================================================= */}
          {['principal', 'director', 'admin', 'super_admin', 'campus_admin'].includes(userRole) &&
            activeCategory === 'primary' && (
              <View>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricNum}>{campusReport?.overallAttendance ?? 0}%</Text>
                    <Text style={styles.metricLbl}>Campus Aggregate</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricNum}>{campusReport?.totalSessions ?? 0}</Text>
                    <Text style={styles.metricLbl}>Campus Sessions</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricNum}>{campusReport?.totalStudents ?? 0}</Text>
                    <Text style={styles.metricLbl}>Total Students</Text>
                  </View>
                </View>

                <Text style={styles.sectionHeader}>Department Performance Comparison</Text>
                {(campusReport?.branchComparisons || []).map((b: any, idx: number) => (
                  <View key={idx} style={styles.tableRowCard}>
                    <View style={styles.tableRowHeader}>
                      <Text style={styles.subjectCodeText}>{b.branch} Department</Text>
                      <Text
                        style={[
                          styles.subjectPctText,
                          b.attendancePercentage < 75 ? { color: '#EF4444' } : { color: '#10B981' },
                        ]}
                      >
                        {b.attendancePercentage}%
                      </Text>
                    </View>
                    <Text style={styles.subjectDetailText}>
                      Sessions: {b.sessions} • Enrolled: {b.totalEnrolled} • Attended: {b.totalPresent}
                    </Text>
                  </View>
                ))}

                <Button
                  title={exporting ? 'Exporting...' : 'Export Campus Benchmark Report (CSV)'}
                  onPress={() => {
                    const csv = reportsApi.buildCampusPerformanceBenchmarkCsv(campusReport);
                    handleExportCsv('Campus_Department_Benchmark.csv', csv, 'Campus Benchmark Report');
                  }}
                  disabled={exporting}
                  style={{ marginTop: 12 }}
                />
              </View>
            )}

          {['principal', 'director', 'admin', 'super_admin', 'campus_admin'].includes(userRole) &&
            activeCategory === 'shortage' && (
              <View>
                <View style={styles.shortageNoticeCard}>
                  <Text style={styles.shortageNoticeTitle}>Campus-Wide Statutory Shortage Audit</Text>
                  <Text style={styles.shortageNoticeDesc}>
                    Executive roll of students across all departments failing the 75% regulatory requirement. Export the official certified CSV for registrar records.
                  </Text>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Text style={[styles.metricNum, { color: '#EF4444' }]}>
                      {shortageData?.shortageCount ?? 0}
                    </Text>
                    <Text style={styles.metricLbl}>Shortage Students</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricNum}>{shortageData?.totalStudents ?? 0}</Text>
                    <Text style={styles.metricLbl}>Campus Evaluated</Text>
                  </View>
                </View>

                <Button
                  title={exporting ? 'Downloading...' : 'Download Campus Shortage Report (Server CSV)'}
                  onPress={handleServerShortageExport}
                  disabled={exporting}
                  style={{ marginTop: 12, backgroundColor: '#EF4444' }}
                />
              </View>
            )}

          {/* ========================================================================= */}
          {/* 5. SANITIZATION POLICY & STANDARDS                                        */}
          {/* ========================================================================= */}
          {activeCategory === 'standards' && (
            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>Data Privacy & CSV Sanitization Standards</Text>
              <Text style={styles.policyText}>
                1. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Formula Injection Prevention (RFC 4180):</Text> All exported cell values are scrutinized before export. Leading execution operators (=, +, -, @, \t, \r, %) are prefixed with single quotation marks to protect users against spreadsheet formula injection vulnerabilities in Microsoft Excel, Apple Numbers, and Google Sheets.
              </Text>
              <Text style={styles.policyText}>
                2. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Credential Sanitization:</Text> No JSON Web Tokens, API secrets, hashed passwords, or session cookies are ever embedded in exported files.
              </Text>
              <Text style={styles.policyText}>
                3. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Scope Isolation Guarantee:</Text> Reports are strictly bounded by institutional RBAC. Faculty cannot access records outside assigned classes; students access solely their personal attendance history.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingTop: 12,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#94A3B8',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  metricLbl: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  complianceCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  shortageAlertCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  complianceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  complianceDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  tableRowCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  tableRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subjectCodeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA',
  },
  subjectPctText: {
    fontSize: 13,
    fontWeight: '800',
  },
  subjectNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  subjectDetailText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actionBtnRow: {
    marginTop: 14,
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  shortageNoticeCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: 14,
  },
  shortageNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 4,
  },
  shortageNoticeDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  policyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  policyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  policyText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 19,
    marginBottom: 12,
  },
});
