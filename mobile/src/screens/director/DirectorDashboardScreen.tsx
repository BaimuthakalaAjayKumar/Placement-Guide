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
  AuditStatsData,
} from '../../api/leadershipApi';
import { THEME } from '../../utils/constants';
import { formatApiErrorMessage } from '../../utils/errorUtils';

export const DirectorDashboardScreen: React.FC = () => {
  const { user, isCachedSession } = useAuth();
  const navigation = useNavigation<any>();

  const [campusReport, setCampusReport] = useState<CampusAttendanceReport | null>(null);
  const [activeSessions, setActiveSessions] = useState<LeadershipClassSession[]>([]);
  const [auditStats, setAuditStats] = useState<AuditStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedSessionForRoster, setSelectedSessionForRoster] = useState<LeadershipClassSession | null>(null);
  const [rosterModalVisible, setRosterModalVisible] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);

  const loadExecutiveData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setErrorMessage(null);
    try {
      const [reportRes, sessionsRes, auditRes] = await Promise.allSettled([
        leadershipApi.getCampusAttendanceReport(),
        leadershipApi.getActiveClassSessions(),
        leadershipApi.getAuditStats(),
      ]);

      if (reportRes.status === 'fulfilled' && reportRes.value.success) {
        setCampusReport(reportRes.value.report);
      } else if (reportRes.status === 'rejected') {
        console.warn('[DirectorDashboard] Campus report error:', reportRes.reason);
      }

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.success) {
        setActiveSessions(sessionsRes.value.data || []);
      }

      if (auditRes.status === 'fulfilled' && auditRes.value.success) {
        setAuditStats(auditRes.value.data);
      }

      setLastUpdated(new Date());

      if (
        reportRes.status === 'rejected' &&
        sessionsRes.status === 'rejected' &&
        auditRes.status === 'rejected'
      ) {
        setErrorMessage('Unable to load executive governance data. Please verify network connectivity.');
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
    loadExecutiveData();
  }, [loadExecutiveData]);

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
    loadExecutiveData();
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading institutional governance suite..." />;
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
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
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
            <Text style={styles.roleTagText}>DIRECTOR EXECUTIVE SUITE</Text>
          </View>
          <Text style={styles.directorName}>Welcome, {user?.name || 'Director'}</Text>
          <Text style={styles.campusSubtitle}>
            Executive Governance & Academic Stewardship • Campus ID: {user?.campusId ? String(user.campusId).slice(0, 8) + '...' : 'Primary'}
          </Text>
        </View>

        {/* 2. Key Executive Institutional KPIs */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Students</Text>
            <Text style={styles.metricValue}>{campusReport?.totalStudents ?? auditStats?.totalStudents ?? '—'}</Text>
            <Text style={styles.metricSub}>Campus Enrolled</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Campus Attendance</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>
              {campusReport?.averageAttendance !== undefined ? `${campusReport.averageAttendance}%` : '—'}
            </Text>
            <Text style={styles.metricSub}>Institutional Avg</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active Today</Text>
            <Text style={[styles.metricValue, { color: '#8B5CF6' }]}>
              {auditStats?.activeTodayCount ?? '0'}
            </Text>
            <Text style={styles.metricSub}>Students Engaged</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active Hours</Text>
            <Text style={styles.metricValue}>
              {auditStats?.totalActiveHours ?? '0.0'}h
            </Text>
            <Text style={styles.metricSub}>Campus Platform Time</Text>
          </View>
        </View>

        {/* 3. Live Active Classes Across Campus */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Active Campus Operations</Text>
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
              <Text style={styles.emptyTitle}>No Active Sessions In Progress</Text>
              <Text style={styles.emptyDesc}>
                There are currently no active classroom attendance sessions running across campus.
              </Text>
            </View>
          )}
        </View>

        {/* 4. Department Attendance Overview */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Institutional Department Breakdown</Text>
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
                    Sessions: {dept.sessions} • Attendance: {dept.totalPresent} / {dept.totalEnrolled}
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
            title="Inspect Institutional Attendance →"
            onPress={() => navigation.navigate('DirectorAttendance')}
            variant="secondary"
            style={{ marginTop: 12 }}
          />
        </View>

        {/* 5. Governance Telemetry Quick Action */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Engagement &amp; Audit Governance</Text>
          <Text style={styles.cardDesc}>
            Review campus engagement telemetry, active user distributions, and institutional audit trails.
          </Text>
          <Button
            title="View Institutional Governance & Telemetry"
            onPress={() => navigation.navigate('DirectorGovernance')}
            variant="outline"
            style={{ marginTop: 10 }}
          />
        </View>

        {/* 6. Executive Operations & Oversight */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Executive Operations & Oversight</Text>
          <Text style={styles.cardDesc}>
            Campus-wide lecture schedules, attendance discrepancy logs, and executive notification registry.
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Button
              title="Campus Timetable"
              onPress={() => navigation.navigate('Timetable')}
              variant="outline"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Dispute Audit"
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
              title="Grievance Oversight"
              onPress={() => navigation.navigate('ComplaintsFeedback')}
              variant="outline"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
          <Button
            title="Executive Reports & Audit"
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
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  roleTagText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  directorName: {
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
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#A78BFA',
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
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  viewRosterPromptRow: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  viewRosterPromptText: {
    fontSize: 11,
    color: '#A78BFA',
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
