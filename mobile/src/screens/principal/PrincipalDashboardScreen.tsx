import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Button } from '../../components/Button';
import { LiveSessionRosterModal } from '../../components/LiveSessionRosterModal';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  leadershipApi,
  CampusAttendanceReport,
  LeadershipClassSession,
  CampusStaffMember,
} from '../../api/leadershipApi';
import { THEME } from '../../utils/constants';
import { formatApiErrorMessage } from '../../utils/errorUtils';

export const PrincipalDashboardScreen: React.FC = () => {
  const { user, isCachedSession } = useAuth();
  const navigation = useNavigation<any>();

  const [campusReport, setCampusReport] = useState<CampusAttendanceReport | null>(null);
  const [activeSessions, setActiveSessions] = useState<LeadershipClassSession[]>([]);
  const [staffList, setStaffList] = useState<CampusStaffMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedSessionForRoster, setSelectedSessionForRoster] = useState<LeadershipClassSession | null>(null);
  const [rosterModalVisible, setRosterModalVisible] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setErrorMessage(null);
    try {
      const [reportRes, sessionsRes, staffRes] = await Promise.allSettled([
        leadershipApi.getCampusAttendanceReport(),
        leadershipApi.getActiveClassSessions(),
        leadershipApi.getCampusStaff(),
      ]);

      if (reportRes.status === 'fulfilled' && reportRes.value.success) {
        setCampusReport(reportRes.value.report);
      } else if (reportRes.status === 'rejected') {
        console.warn('[PrincipalDashboard] Campus report error:', reportRes.reason);
      }

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.success) {
        setActiveSessions(sessionsRes.value.data || []);
      }

      if (staffRes.status === 'fulfilled' && staffRes.value.success) {
        setStaffList(staffRes.value.data || []);
      }

      setLastUpdated(new Date());

      if (
        reportRes.status === 'rejected' &&
        sessionsRes.status === 'rejected' &&
        staffRes.status === 'rejected'
      ) {
        setErrorMessage('Unable to connect to campus academic services. Please check your network.');
      }
    } catch (err: any) {
      setErrorMessage(formatApiErrorMessage(err));
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Safe 30-second live classroom background polling with unmount cleanup
  useEffect(() => {
    const pollTimer = setInterval(async () => {
      if (isFetchingRef.current) return;
      try {
        isFetchingRef.current = true;
        const res = await leadershipApi.getActiveClassSessions();
        if (res.success) {
          setActiveSessions(res.data || []);
          setLastUpdated(new Date());
        }
      } catch (err) {
        // Silent background polling
      } finally {
        isFetchingRef.current = false;
      }
    }, 30000);

    return () => clearInterval(pollTimer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading campus academic intelligence..." />;
  }

  const branchComparisons = campusReport?.branchComparison || [];

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
        {errorMessage ? (
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        ) : null}

        {isCachedSession && (
          <View style={styles.cachedBadge}>
            <Text style={styles.cachedBadgeText}>CACHED PROFILE (OFFLINE MODE)</Text>
          </View>
        )}

        {/* 1. Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>PRINCIPAL'S ACADEMIC DESK</Text>
          </View>
          <Text style={styles.principalName}>Welcome, {user?.name || 'Principal'}</Text>
          <Text style={styles.campusSubtitle}>
            Institutional Campus Oversight • {user?.campusId ? 'Assigned Campus' : 'Primary Institution'}
          </Text>
        </View>

        {/* 2. Key Academic & Attendance KPIs */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Students</Text>
            <Text style={styles.metricValue}>{campusReport?.totalStudents ?? '—'}</Text>
            <Text style={styles.metricSub}>Campus Enrolled</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Campus Staff</Text>
            <Text style={styles.metricValue}>{staffList.length}</Text>
            <Text style={styles.metricSub}>Faculty & Admins</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Attendance</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>
              {campusReport?.averageAttendance !== undefined
                ? `${campusReport.averageAttendance}%`
                : '—'}
            </Text>
            <Text style={styles.metricSub}>All Departments</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Sessions Held</Text>
            <Text style={styles.metricValue}>{campusReport?.totalSessions ?? '0'}</Text>
            <Text style={styles.metricSub}>Conducted Classes</Text>
          </View>
        </View>

        {/* 3. Live Active Classroom Sessions Across Campus */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Active Campus Lectures</Text>
              <Text style={styles.syncTimestampText}>
                Telemetry Synced: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
            <View style={styles.headerRightControls}>
              <TouchableOpacity onPress={onRefresh} style={styles.refreshTouch}>
                <Text style={styles.refreshTouchText}>Sync</Text>
              </TouchableOpacity>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  {activeSessions.length} {activeSessions.length === 1 ? 'Live' : 'Live'}
                </Text>
              </View>
            </View>
          </View>

          {activeSessions.length > 0 ? (
            activeSessions.map((session) => (
              <TouchableOpacity
                key={session._id}
                style={styles.sessionItem}
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedSessionForRoster(session);
                  setRosterModalVisible(true);
                }}
              >
                <View style={styles.sessionHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.sessionSubject}>
                      {session.subject?.name || 'Class Session'}
                    </Text>
                    {session.subject?.code ? (
                      <Text style={styles.sessionCodeText}>{session.subject.code}</Text>
                    ) : null}
                  </View>
                  <View style={styles.sessionBadge}>
                    <Text style={styles.sessionBadgeText}>
                      {session.branch}-{session.section}
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionDetailsRow}>
                  <Text style={styles.sessionDetailText}>
                    Instructor: {session.faculty?.name || 'Assigned Instructor'}
                  </Text>
                  <Text style={styles.sessionDetailText}>
                    Room: {session.room?.roomNumber ? `${session.room.roomNumber}` : 'TBA'}
                  </Text>
                </View>

                <View style={styles.sessionProgressRow}>
                  <Text style={styles.progressLabel}>
                    Live Checked In: {session.totalPresent} / {session.totalEnrolled || '—'}
                  </Text>
                  <Text style={styles.progressPct}>
                    {session.attendancePercentage}%
                  </Text>
                </View>

                {/* Visual Progress Bar */}
                <View style={styles.sessionProgressBarBg}>
                  <View
                    style={[
                      styles.sessionProgressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(
                            session.totalPresent > 0 ? 6 : 0,
                            session.attendancePercentage
                          )
                        )}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.viewRosterPromptRow}>
                  <Text style={styles.viewRosterPromptText}>
                    Tap to inspect live attendance roster →
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Live Sessions In Progress</Text>
              <Text style={styles.emptyDesc}>
                There are currently no active classroom attendance sessions running across campus.
              </Text>
            </View>
          )}
        </View>

        {/* 4. Department Attendance Comparison */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Department Performance Comparison</Text>
          </View>

          {branchComparisons.length > 0 ? (
            branchComparisons.map((dept, index) => (
              <View key={index} style={styles.deptItem}>
                <View style={styles.deptHeader}>
                  <Text style={styles.deptName}>{dept.branch} Department</Text>
                  <Text style={[styles.deptPct, { color: dept.attendancePercentage >= 75 ? '#10B981' : '#EF4444' }]}>
                    {dept.attendancePercentage}% Attendance
                  </Text>
                </View>
                <View style={styles.deptMetricsRow}>
                  <Text style={styles.deptDetail}>
                    Sessions: {dept.sessions} • Attended: {dept.totalPresent} / {dept.totalEnrolled}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Department Data Recorded</Text>
              <Text style={styles.emptyDesc}>
                Department breakdown will appear as class attendance sessions are completed.
              </Text>
            </View>
          )}

          <Button
            title="Open Campus Attendance Analytics →"
            onPress={() => navigation.navigate('PrincipalAttendance')}
            variant="secondary"
            style={{ marginTop: 12 }}
          />
        </View>

        {/* 5. Campus Staff & Faculty Quick Action */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Faculty & Academic Staff Directory</Text>
          <Text style={styles.cardDesc}>
            View assigned instructors, academic scopes, and departmental management across campus.
          </Text>
          <Button
            title="View Campus Staff Directory"
            onPress={() => navigation.navigate('PrincipalStaff')}
            variant="outline"
            style={{ marginTop: 10 }}
          />
        </View>

        {/* 6. Campus Operations & Registry */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Campus Operations & Registry</Text>
          <Text style={styles.cardDesc}>
            Campus-wide timetable schedules, attendance correction dispute ledger, and official notification registry.
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Button
              title="Campus Timetable"
              onPress={() => navigation.navigate('Timetable')}
              variant="outline"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Dispute Ledger"
              onPress={() => navigation.navigate('AttendanceDisputes')}
              variant="outline"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Button
              title="Notifications"
              onPress={() => navigation.navigate('Notifications')}
              variant="outline"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Grievance Triage"
              onPress={() => navigation.navigate('ComplaintsFeedback')}
              variant="outline"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
          <Button
            title="Campus Reports & Downloads"
            onPress={() => navigation.navigate('ReportsRecords')}
            variant="outline"
            style={{ marginTop: 10 }}
          />
        </View>
      </ScrollView>

      <LiveSessionRosterModal
        visible={rosterModalVisible}
        session={selectedSessionForRoster}
        onClose={() => setRosterModalVisible(false)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl,
  },
  headerCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  roleTagText: {
    color: THEME.colors.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  principalName: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  campusSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: THEME.spacing.md,
  },
  metricCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  metricLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  metricSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  syncTimestampText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  headerRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshTouch: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  refreshTouchText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
  },
  sessionItem: {
    backgroundColor: THEME.colors.background,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  sessionSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  sessionCodeText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  sessionBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.accent,
  },
  sessionDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionDetailText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  sessionProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 6,
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  sessionProgressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  sessionProgressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  viewRosterPromptRow: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  viewRosterPromptText: {
    fontSize: 11,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  emptyDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  deptItem: {
    backgroundColor: THEME.colors.background,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  deptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deptName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  deptPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  deptMetricsRow: {
    marginTop: 4,
  },
  deptDetail: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  cardDesc: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  cachedBadge: {
    backgroundColor: '#854D0E',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  cachedBadgeText: {
    color: '#FEF08A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
