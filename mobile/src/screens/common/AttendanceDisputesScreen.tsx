import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import {
  attendanceApi,
  AttendanceHistoryRecord,
  ActiveSession,
} from '../../api/attendanceApi';
import { THEME } from '../../utils/constants';

interface SessionRosterRecord {
  _id: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  status: string;
  originalStatus?: string | null;
  correctionStatus?: string;
  correctionRequestedStatus?: string | null;
  correctionReason?: string;
  correctionNotes?: string;
  verificationMethod?: string;
}

export const AttendanceDisputesScreen: React.FC = () => {
  const { user, role } = useAuth();
  const normalizedRole = role ? role.trim().toLowerCase() : 'student';

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Student data
  const [studentRecords, setStudentRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [studentFilter, setStudentFilter] = useState<'ALL' | 'FLAGGED' | 'DISPUTED'>('ALL');

  // Faculty & HOD data
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionRecords, setSessionRecords] = useState<SessionRosterRecord[]>([]);
  const [facultyFilter, setFacultyFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');

  // Correction request modal (Faculty)
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<SessionRosterRecord | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [requestedStatus, setRequestedStatus] = useState<string>('PRESENT');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionNotes, setCorrectionNotes] = useState<string>('');

  // Review modal (HOD)
  const [selectedRecordForReview, setSelectedRecordForReview] = useState<SessionRosterRecord | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  // Load records based on role
  const loadData = useCallback(async () => {
    try {
      if (normalizedRole === 'student') {
        const res = await attendanceApi.getStudentHistory();
        if (res.success && res.data) {
          setStudentRecords(res.data);
        }
      } else {
        // Faculty, HOD, Principal, Director
        const histRes = await attendanceApi.getSessionHistory({ limit: 15 });
        const activeRes = await attendanceApi.getActiveSessions();

        const combinedSessions = [
          ...(activeRes.data || []),
          ...(histRes.sessions || []),
        ];

        // Deduplicate sessions by _id
        const seen = new Set<string>();
        const uniqueSessions = combinedSessions.filter((s) => {
          if (!s._id || seen.has(s._id)) return false;
          seen.add(s._id);
          return true;
        });

        setSessions(uniqueSessions);

        // Select the first session if none is selected
        if (uniqueSessions.length > 0 && !selectedSessionId) {
          setSelectedSessionId(uniqueSessions[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load dispute data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [normalizedRole, selectedSessionId]);

  // Load session records when selectedSessionId changes
  const loadSessionRoster = useCallback(async (sessionId: string) => {
    try {
      const res = await attendanceApi.getSessionById(sessionId);
      if (res.success && res.records) {
        setSessionRecords(res.records);
      } else {
        setSessionRecords([]);
      }
    } catch (err) {
      console.error('Failed to load session roster:', err);
      setSessionRecords([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedSessionId && normalizedRole !== 'student') {
      loadSessionRoster(selectedSessionId);
    }
  }, [selectedSessionId, normalizedRole, loadSessionRoster]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    if (selectedSessionId && normalizedRole !== 'student') {
      loadSessionRoster(selectedSessionId);
    }
  };

  // Submit correction request (Faculty)
  const handleSubmitCorrection = async () => {
    if (!selectedRecordForCorrection) return;
    if (!correctionReason.trim() || correctionReason.trim().length < 4) {
      Alert.alert('Validation Error', 'Please enter a clear justification reason (minimum 4 characters).');
      return;
    }

    try {
      setActionLoading(true);
      const res = await attendanceApi.requestCorrection(selectedRecordForCorrection._id, {
        requestedStatus,
        reason: correctionReason.trim(),
        notes: correctionNotes.trim(),
      });

      if (res.success) {
        Alert.alert(
          'Request Submitted',
          'The attendance correction request has been formally filed and forwarded to the Head of Department for review.'
        );
        setModalVisible(false);
        setCorrectionReason('');
        setCorrectionNotes('');
        setSelectedRecordForCorrection(null);
        if (selectedSessionId) {
          loadSessionRoster(selectedSessionId);
        }
      } else {
        Alert.alert('Submission Error', res.error || 'Failed to submit correction request.');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Network error occurred.';
      Alert.alert('Error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Review correction (HOD)
  const handleReviewCorrection = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedRecordForReview) return;

    try {
      setActionLoading(true);
      const res = await attendanceApi.reviewCorrection(selectedRecordForReview._id, {
        action,
        notes: reviewNotes.trim(),
      });

      if (res.success) {
        Alert.alert(
          action === 'APPROVE' ? 'Correction Approved' : 'Request Rejected',
          res.message || `Correction request has been ${action === 'APPROVE' ? 'approved' : 'rejected'}.`
        );
        setReviewModalVisible(false);
        setReviewNotes('');
        setSelectedRecordForReview(null);
        if (selectedSessionId) {
          loadSessionRoster(selectedSessionId);
        }
      } else {
        Alert.alert('Review Failed', res.error || 'Failed to process decision.');
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err?.message || 'Review action failed.';
      Alert.alert('Error', errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered student records
  const filteredStudentRecords = useMemo(() => {
    return studentRecords.filter((rec) => {
      if (studentFilter === 'FLAGGED') {
        return rec.status === 'ABSENT' || rec.status === 'LATE';
      }
      if (studentFilter === 'DISPUTED') {
        return (
          rec.correctionStatus === 'REQUESTED' ||
          rec.correctionStatus === 'APPROVED' ||
          rec.correctionStatus === 'REJECTED'
        );
      }
      return true;
    });
  }, [studentRecords, studentFilter]);

  // Filtered session records (Faculty / HOD)
  const filteredSessionRecords = useMemo(() => {
    return sessionRecords.filter((rec) => {
      const cStatus = rec.correctionStatus || 'NONE';
      if (facultyFilter === 'PENDING') {
        return cStatus === 'REQUESTED';
      }
      if (facultyFilter === 'RESOLVED') {
        return cStatus === 'APPROVED' || cStatus === 'REJECTED';
      }
      return true;
    });
  }, [sessionRecords, facultyFilter]);

  // Helpers for status formatting
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Present' };
      case 'ABSENT':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'Absent' };
      case 'LATE':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', label: 'Late' };
      case 'EXCUSED':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', label: 'Excused' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8', label: status || 'Recorded' };
    }
  };

  const getCorrectionBadgeStyle = (cStatus?: string) => {
    switch (cStatus) {
      case 'REQUESTED':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', label: 'Under Review' };
      case 'APPROVED':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', label: 'Correction Approved' };
      case 'REJECTED':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', label: 'Dispute Declined' };
      default:
        return { bg: 'rgba(51, 65, 85, 0.4)', text: '#64748B', label: 'Standard Record' };
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading attendance dispute registry..." />;
  }

  return (
    <ScreenContainer scrollable={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{normalizedRole.toUpperCase()} DESK</Text>
          </View>
          <Text style={styles.title}>Attendance Disputes & Corrections</Text>
          <Text style={styles.subtitle}>
            Dual-control audit ledger for resolving verified classroom attendance discrepancies.
          </Text>
        </View>

        {/* ========================================== */}
        {/* STUDENT VIEW                              */}
        {/* ========================================== */}
        {normalizedRole === 'student' && (
          <View>
            {/* Institutional Policy Notice */}
            <View style={styles.policyCard}>
              <View style={styles.policyHeaderRow}>
                <View style={styles.policyPill}>
                  <Text style={styles.policyPillText}>INSTITUTIONAL REGULATION</Text>
                </View>
              </View>
              <Text style={styles.policyText}>
                Under university academic integrity guidelines, attendance corrections must be formally filed through
                your assigned course instructor. After instructor verification, requests are routed to the Head of
                Department for administrative sign-off.
              </Text>
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabBar}>
              {(['ALL', 'FLAGGED', 'DISPUTED'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, studentFilter === tab && styles.tabButtonActive]}
                  onPress={() => setStudentFilter(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabButtonText, studentFilter === tab && styles.tabButtonTextActive]}>
                    {tab === 'ALL' ? 'All Classes' : tab === 'FLAGGED' ? 'Absences' : 'Disputes'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Records List */}
            {filteredStudentRecords.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <View style={styles.emptyIconBar} />
                </View>
                <Text style={styles.emptyTitle}>No Attendance Records Found</Text>
                <Text style={styles.emptySubtitle}>
                  {studentFilter === 'DISPUTED'
                    ? 'No records currently have active or resolved dispute requests.'
                    : studentFilter === 'FLAGGED'
                    ? 'No absences recorded in the active academic term.'
                    : 'Classroom attendance records will appear here as lectures conclude.'}
                </Text>
              </View>
            ) : (
              filteredStudentRecords.map((item) => {
                const statusMeta = getStatusBadgeStyle(item.status);
                const corrMeta = getCorrectionBadgeStyle(item.correctionStatus);
                const dateStr = item.date
                  ? new Date(item.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent Lecture';

                return (
                  <View key={item._id || item.recordId} style={styles.recordCard}>
                    <View style={styles.recordTopRow}>
                      <View>
                        <Text style={styles.recordSubjectName}>
                          {item.subject?.name || 'Academic Course'}
                        </Text>
                        <Text style={styles.recordSubjectCode}>
                          {item.subject?.code ? `Code: ${item.subject.code}` : 'Core Curriculum'}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: statusMeta.bg }]}>
                        <Text style={[styles.badgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
                      </View>
                    </View>

                    <View style={styles.metaDivider} />

                    <View style={styles.metaGrid}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Date</Text>
                        <Text style={styles.metaValue}>{dateStr}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Faculty</Text>
                        <Text style={styles.metaValue}>{item.faculty || 'Course Instructor'}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Room</Text>
                        <Text style={styles.metaValue}>{item.room || 'Assigned Room'}</Text>
                      </View>
                    </View>

                    {/* Correction Status Banner */}
                    <View style={[styles.correctionBanner, { backgroundColor: corrMeta.bg }]}>
                      <View style={styles.correctionBannerRow}>
                        <Text style={[styles.correctionBannerTitle, { color: corrMeta.text }]}>
                          Audit Status: {corrMeta.label}
                        </Text>
                        {item.originalStatus && (
                          <Text style={styles.correctionOriginalText}>
                            Original: {item.originalStatus}
                          </Text>
                        )}
                      </View>

                      {item.correctionReason ? (
                        <Text style={styles.correctionReasonText}>
                          Reason: {item.correctionReason}
                        </Text>
                      ) : null}

                      {item.correctionStatus === 'REQUESTED' && (
                        <Text style={styles.correctionHelpText}>
                          Your instructor submitted a correction to {item.correctionRequestedStatus || 'PRESENT'}.
                          Pending HOD approval.
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ========================================== */}
        {/* FACULTY, HOD, PRINCIPAL, DIRECTOR VIEW    */}
        {/* ========================================== */}
        {normalizedRole !== 'student' && (
          <View>
            {/* Session Selector */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Select Lecture Session</Text>
              <Text style={styles.sessionCountLabel}>{sessions.length} sessions available</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sessionSelectorScroll}
            >
              {sessions.map((s) => {
                const isSelected = s._id === selectedSessionId;
                const subj = s.subjectId?.name || s.subjectId?.code || 'Lecture';
                const sec = s.section ? `Sec ${s.section}` : '';
                const dateShort = s.sessionDate
                  ? new Date(s.sessionDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
                  : 'Today';

                return (
                  <TouchableOpacity
                    key={s._id}
                    style={[styles.sessionChip, isSelected && styles.sessionChipActive]}
                    onPress={() => setSelectedSessionId(s._id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sessionChipDate, isSelected && styles.sessionChipDateActive]}>
                      {dateShort} • Period {s.period || '1'}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.sessionChipSubj, isSelected && styles.sessionChipSubjActive]}
                    >
                      {subj} {sec}
                    </Text>
                    <Text style={[styles.sessionChipMeta, isSelected && styles.sessionChipMetaActive]}>
                      {s.branch || ''} • Room {s.roomId?.roomNumber || 'Classroom'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Filter Tabs */}
            <View style={styles.tabBar}>
              {(['ALL', 'PENDING', 'RESOLVED'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, facultyFilter === tab && styles.tabButtonActive]}
                  onPress={() => setFacultyFilter(tab)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabButtonText, facultyFilter === tab && styles.tabButtonTextActive]}>
                    {tab === 'ALL' ? 'All Students' : tab === 'PENDING' ? 'Pending Review' : 'Resolved'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Role Governance Advice */}
            {normalizedRole === 'faculty' && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Dual-Control Workflow: As course faculty, you can submit an attendance correction with a required
                  academic justification. Final approval requires sign-off by the Head of Department.
                </Text>
              </View>
            )}

            {normalizedRole === 'hod' && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Department Approval Authority: As Head of Department, review pending dispute submissions from faculty
                  and issue formal approval or rejection.
                </Text>
              </View>
            )}

            {(normalizedRole === 'principal' || normalizedRole === 'director') && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Institutional Oversight: Read-only inspection of attendance corrections. Discrepancy decisions are
                  delegated to department HODs with institutional audit retention.
                </Text>
              </View>
            )}

            {/* Roster Records */}
            {filteredSessionRecords.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <View style={styles.emptyIconBar} />
                </View>
                <Text style={styles.emptyTitle}>No Records Found</Text>
                <Text style={styles.emptySubtitle}>
                  {facultyFilter === 'PENDING'
                    ? 'No pending correction requests for this lecture session.'
                    : 'No student records match the active filter.'}
                </Text>
              </View>
            ) : (
              filteredSessionRecords.map((r) => {
                const statusMeta = getStatusBadgeStyle(r.status);
                const corrMeta = getCorrectionBadgeStyle(r.correctionStatus);
                const isPending = r.correctionStatus === 'REQUESTED';

                return (
                  <View key={r._id} style={styles.recordCard}>
                    <View style={styles.recordTopRow}>
                      <View>
                        <Text style={styles.recordSubjectName}>{r.studentName}</Text>
                        <Text style={styles.recordSubjectCode}>Roll No: {r.rollNumber}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: statusMeta.bg }]}>
                        <Text style={[styles.badgeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
                      </View>
                    </View>

                    <View style={styles.metaDivider} />

                    {/* Correction Details if present */}
                    {r.correctionStatus && r.correctionStatus !== 'NONE' && (
                      <View style={[styles.correctionBanner, { backgroundColor: corrMeta.bg }]}>
                        <View style={styles.correctionBannerRow}>
                          <Text style={[styles.correctionBannerTitle, { color: corrMeta.text }]}>
                            {corrMeta.label}
                          </Text>
                          {r.correctionRequestedStatus && (
                            <Text style={styles.correctionOriginalText}>
                              Requested: {r.correctionRequestedStatus}
                            </Text>
                          )}
                        </View>
                        {r.correctionReason ? (
                          <Text style={styles.correctionReasonText}>
                            Reason: {r.correctionReason}
                          </Text>
                        ) : null}
                        {r.correctionNotes ? (
                          <Text style={styles.correctionHelpText}>
                            Notes: {r.correctionNotes}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {/* Role Actions */}
                    <View style={styles.cardActionsRow}>
                      {/* Faculty Action: Submit Request */}
                      {normalizedRole === 'faculty' && (
                        <Button
                          title={isPending ? 'Correction Under Review' : 'Request Correction'}
                          disabled={isPending}
                          variant={isPending ? 'outline' : 'primary'}
                          onPress={() => {
                            setSelectedRecordForCorrection(r);
                            setRequestedStatus(r.status === 'ABSENT' ? 'PRESENT' : 'ABSENT');
                            setCorrectionReason('');
                            setCorrectionNotes('');
                            setModalVisible(true);
                          }}
                          style={{ flex: 1 }}
                        />
                      )}

                      {/* HOD Action: Approve / Reject */}
                      {normalizedRole === 'hod' && isPending && (
                        <Button
                          title="Review Dispute"
                          variant="primary"
                          onPress={() => {
                            setSelectedRecordForReview(r);
                            setReviewNotes('');
                            setReviewModalVisible(true);
                          }}
                          style={{ flex: 1 }}
                        />
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================== */}
      {/* FACULTY CORRECTION SUBMISSION MODAL       */}
      {/* ========================================== */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>File Attendance Correction</Text>
            <Text style={styles.modalSubtitle}>
              Requesting correction for {selectedRecordForCorrection?.studentName} (
              {selectedRecordForCorrection?.rollNumber})
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Target Attendance Status</Text>
              <View style={styles.statusPickerRow}>
                {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusPickerButton,
                      requestedStatus === st && styles.statusPickerButtonActive,
                    ]}
                    onPress={() => setRequestedStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusPickerText,
                        requestedStatus === st && styles.statusPickerTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Justification Reason (Required)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Verified biometric hardware timeout, student present in room"
                placeholderTextColor={THEME.colors.textMuted}
                value={correctionReason}
                onChangeText={setCorrectionReason}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Administrative Notes (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Internal audit reference"
                placeholderTextColor={THEME.colors.textMuted}
                value={correctionNotes}
                onChangeText={setCorrectionNotes}
              />
            </View>

            <View style={styles.modalButtonRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
                disabled={actionLoading}
              />
              <Button
                title={actionLoading ? 'Submitting...' : 'Submit to HOD'}
                variant="primary"
                onPress={handleSubmitCorrection}
                style={{ flex: 1, marginLeft: 8 }}
                disabled={actionLoading}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* HOD REVIEW MODAL                           */}
      {/* ========================================== */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Head of Department Decision</Text>
            <Text style={styles.modalSubtitle}>
              Reviewing correction for {selectedRecordForReview?.studentName} (
              {selectedRecordForReview?.rollNumber})
            </Text>

            <View style={styles.reviewSummaryBox}>
              <Text style={styles.reviewSummaryText}>
                Requested Status: {selectedRecordForReview?.correctionRequestedStatus || 'PRESENT'}
              </Text>
              <Text style={styles.reviewSummarySubtext}>
                Faculty Reason: {selectedRecordForReview?.correctionReason || 'None provided'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Decision Remarks (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Verified with lab sign-in sheet"
                placeholderTextColor={THEME.colors.textMuted}
                value={reviewNotes}
                onChangeText={setReviewNotes}
              />
            </View>

            <View style={styles.modalButtonRow}>
              <Button
                title={actionLoading ? '...' : 'Reject Request'}
                variant="outline"
                onPress={() => handleReviewCorrection('REJECT')}
                style={{ flex: 1, marginRight: 8, borderColor: '#EF4444' }}
                disabled={actionLoading}
              />
              <Button
                title={actionLoading ? '...' : 'Approve Correction'}
                variant="primary"
                onPress={() => handleReviewCorrection('APPROVE')}
                style={{ flex: 1, marginLeft: 8 }}
                disabled={actionLoading}
              />
            </View>

            <TouchableOpacity
              style={styles.modalDismissLink}
              onPress={() => setReviewModalVisible(false)}
            >
              <Text style={styles.modalDismissText}>Dismiss without decision</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  policyCard: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  policyHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  policyPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  policyPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  policyText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.surface,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabButtonTextActive: {
    color: THEME.colors.primary,
  },
  infoBanner: {
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  recordCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  recordTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordSubjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  recordSubjectCode: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 10,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 2,
  },
  correctionBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  correctionBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  correctionBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  correctionOriginalText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  correctionReasonText: {
    fontSize: 12,
    color: THEME.colors.text,
    marginTop: 2,
    lineHeight: 16,
  },
  correctionHelpText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionCountLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  sessionSelectorScroll: {
    paddingBottom: 12,
  },
  sessionChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    width: 170,
  },
  sessionChipActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  sessionChipDate: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  sessionChipDateActive: {
    color: THEME.colors.primary,
  },
  sessionChipSubj: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 2,
  },
  sessionChipSubjActive: {
    color: THEME.colors.text,
  },
  sessionChipMeta: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  sessionChipMetaActive: {
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIconBar: {
    width: 16,
    height: 2,
    backgroundColor: '#94A3B8',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  statusPickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusPickerButton: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  statusPickerButtonActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  statusPickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  statusPickerTextActive: {
    color: THEME.colors.primary,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 10,
    color: THEME.colors.text,
    fontSize: 13,
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  reviewSummaryBox: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  reviewSummaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  reviewSummarySubtext: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  modalDismissLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  modalDismissText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
});
