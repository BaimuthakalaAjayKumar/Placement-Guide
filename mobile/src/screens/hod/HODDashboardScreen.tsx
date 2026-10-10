import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  RefreshControl,
  ScrollView,
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
  HODOverviewData,
  LeadershipClassSession,
  DepartmentAttendanceReport,
} from '../../api/leadershipApi';
import { THEME } from '../../utils/constants';
import { formatApiErrorMessage } from '../../utils/errorUtils';

export const HODDashboardScreen: React.FC = () => {
  const { user, isCachedSession } = useAuth();
  const navigation = useNavigation<any>();

  const [overview, setOverview] = useState<HODOverviewData | null>(null);
  const [activeSessions, setActiveSessions] = useState<LeadershipClassSession[]>([]);
  const [attendanceReport, setAttendanceReport] = useState<DepartmentAttendanceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedSessionForRoster, setSelectedSessionForRoster] = useState<LeadershipClassSession | null>(null);
  const [rosterModalVisible, setRosterModalVisible] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);

  const departmentName = user?.department || user?.branch || overview?.department || 'Department';

  const loadDashboardData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setErrorMessage(null);
    try {
      const [overviewRes, sessionsRes, attendanceRes] = await Promise.allSettled([
        leadershipApi.getHODOverview(),
        leadershipApi.getActiveClassSessions(),
        leadershipApi.getDepartmentAttendanceReport(),
      ]);

      if (overviewRes.status === 'fulfilled' && overviewRes.value.success) {
        setOverview(overviewRes.value.data);
      } else if (overviewRes.status === 'rejected') {
        const err = overviewRes.reason;
        console.warn('[HODDashboard] Overview fetch error:', err?.message || err);
      }

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.success) {
        setActiveSessions(sessionsRes.value.data || []);
      }

      if (attendanceRes.status === 'fulfilled' && attendanceRes.value.success) {
        setAttendanceReport(attendanceRes.value.report);
      }

      setLastUpdated(new Date());

      // Check if all failed
      if (
        overviewRes.status === 'rejected' &&
        sessionsRes.status === 'rejected' &&
        attendanceRes.status === 'rejected'
      ) {
        setErrorMessage('Unable to load department dashboard data. Please check your connection.');
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
        // Silent background polling catch
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
    return <LoadingSpinner fullScreen message="Loading department intelligence..." />;
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
            <Text style={styles.roleTagText}>HEAD OF DEPARTMENT</Text>
          </View>
          <Text style={styles.deptTitle}>
            Department of {departmentName.toUpperCase()}
          </Text>
          <Text style={styles.hodName}>
            HOD: {user?.name || overview?.hodName || 'Department Leader'}
          </Text>
          <Text style={styles.campusSubtitle}>
            Campus Scope: {user?.campusId ? 'Assigned Campus' : 'Main Campus'}
          </Text>
        </View>

        {/* 2. Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Students</Text>
            <Text style={styles.metricValue}>{overview?.totalStudents ?? '—'}</Text>
            <Text style={styles.metricSub}>Department Roster</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Faculty</Text>
            <Text style={styles.metricValue}>{overview?.totalFaculties ?? '—'}</Text>
            <Text style={styles.metricSub}>Assigned Instructors</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Avg Attendance</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>
              {attendanceReport?.averageAttendance !== undefined
                ? `${attendanceReport.averageAttendance}%`
                : '—'}
            </Text>
            <Text style={styles.metricSub}>Dept Overall</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>At-Risk Students</Text>
            <Text style={[styles.metricValue, { color: (overview?.atRiskCount || 0) > 0 ? '#EF4444' : THEME.colors.text }]}>
              {overview?.atRiskCount ?? '0'}
            </Text>
            <Text style={styles.metricSub}>Low CGPA / Score</Text>
          </View>
        </View>

        {/* 3. Live Active Classroom Sessions */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Active Classroom Sessions</Text>
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
              <Text style={styles.emptyTitle}>No Live Sessions Active</Text>
              <Text style={styles.emptyDesc}>
                There are currently no active classroom attendance sessions running in {departmentName}.
              </Text>
            </View>
          )}
        </View>

        {/* 4. Attendance Progress & Quick Navigation */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Department Attendance Overview</Text>
          </View>

          <View style={styles.attendanceSummaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{attendanceReport?.totalSessions ?? 0}</Text>
              <Text style={styles.summaryLabel}>Conducted Sessions</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{attendanceReport?.shortageCount ?? 0}</Text>
              <Text style={[styles.summaryValueSub, { color: '#EF4444' }]}>Shortage (&lt;75%)</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{attendanceReport?.subjectAttendance?.length ?? 0}</Text>
              <Text style={styles.summaryLabel}>Subjects Tracked</Text>
            </View>
          </View>

          <Button
            title="View Full Attendance Analytics →"
            onPress={() => navigation.navigate('HODAttendance')}
            variant="secondary"
            style={{ marginTop: 12 }}
          />
        </View>

        {/* 5. Placement & Academic Performance */}
        {overview?.placements ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Placement &amp; Career Outcomes</Text>
            <View style={styles.placementGrid}>
              <View style={styles.placementItem}>
                <Text style={styles.placementValue}>
                  {overview.placements.placementPercentage}%
                </Text>
                <Text style={styles.placementLabel}>Placed</Text>
              </View>
              <View style={styles.placementItem}>
                <Text style={styles.placementValue}>
                  {overview.placements.offeredStudentsCount}
                </Text>
                <Text style={styles.placementLabel}>Offers Made</Text>
              </View>
              <View style={styles.placementItem}>
                <Text style={styles.placementValue}>
                  {overview.placements.highestPackage}
                </Text>
                <Text style={styles.placementLabel}>Highest Pkg</Text>
              </View>
              <View style={styles.placementItem}>
                <Text style={styles.placementValue}>
                  {overview.placements.averagePackage}
                </Text>
                <Text style={styles.placementLabel}>Average Pkg</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* 6. Department Academic Operations & Audits */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Department Operations & Review</Text>
          <Text style={[styles.noticeText, { marginBottom: 12 }]}>
            Department timetable schedule, dual-control attendance dispute review, and notification ledger.
          </Text>

          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <Button
              title="Department Timetable"
              onPress={() => navigation.navigate('Timetable')}
              variant="outline"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Dispute Decisions"
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
              title="Grievances"
              onPress={() => navigation.navigate('ComplaintsFeedback')}
              variant="outline"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
          <Button
            title="Department Reports & Downloads"
            onPress={() => navigation.navigate('ReportsRecords')}
            variant="outline"
            style={{ marginTop: 10 }}
          />
        </View>

        {/* 7. Planned Features Note */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Desktop Management Features</Text>
          <Text style={styles.noticeText}>
            Full lab evaluation grading, department broadcast announcements, and timetable assignments are managed on the CampusBridge desktop web portal.
          </Text>
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  roleTagText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deptTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  hodName: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  campusSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
    paddingVertical: 18,
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
  attendanceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.sm,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  summaryValueSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: THEME.colors.border,
  },
  placementGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  placementItem: {
    alignItems: 'center',
    flex: 1,
  },
  placementValue: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  placementLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  noticeCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
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
