import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { attendanceApi, StudentAttendanceAnalytics } from '../../api/attendanceApi';
import { THEME } from '../../utils/constants';
import { formatApiErrorMessage } from '../../utils/errorUtils';

export const StudentDashboardScreen: React.FC = () => {
  const { user, logout, isCachedSession } = useAuth();
  const navigation = useNavigation<any>();

  const [analytics, setAnalytics] = useState<StudentAttendanceAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await attendanceApi.getStudentAnalytics();
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err: any) {
      setErrorMessage(formatApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setErrorMessage(null);
      try {
        const res = await attendanceApi.getStudentAnalytics();
        if (isMounted && res.success && res.data) {
          setAnalytics(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(formatApiErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const overallPct = analytics?.overallPercentage ?? 0;
  const isShortage = overallPct < 75;

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading student dashboard..." />;
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
        {isCachedSession && (
          <View style={styles.cachedBadge}>
            <Text style={styles.cachedBadgeText}>CACHED PROFILE (OFFLINE MODE)</Text>
          </View>
        )}

        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            onRetry={loadData}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* 1. Student Identity Header */}
        <View style={styles.headerCard}>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>STUDENT</Text>
            </View>
            <Text style={styles.academicYearText}>
              Batch {user?.academicYear || user?.year || '2026'}
            </Text>
          </View>
          <Text style={styles.studentName}>{user?.name || 'Student'}</Text>
          <Text style={styles.studentMeta}>
            Roll No: {user?.rollNumber || 'Not Assigned'} • {user?.branch || 'General'}
            {user?.section ? ` • Section ${user.section}` : ''}
          </Text>
        </View>

        {/* 2. Attendance Status Hero */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Attendance Performance</Text>

          <View style={styles.attendanceHeroRow}>
            <View style={styles.pctBlock}>
              <Text style={[styles.pctNumber, { color: isShortage ? '#EF4444' : '#10B981' }]}>
                {analytics ? `${overallPct}%` : '—'}
              </Text>
              <Text style={styles.pctSubtitle}>Cumulative Attendance</Text>
            </View>

            <View style={styles.dividerVertical} />

            <View style={styles.statusBlock}>
              <View style={[styles.thresholdBadge, { backgroundColor: isShortage ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                <Text style={[styles.thresholdBadgeText, { color: isShortage ? '#EF4444' : '#10B981' }]}>
                  {isShortage ? 'Below Threshold' : 'Good Standing'}
                </Text>
              </View>
              <Text style={styles.thresholdText}>
                {isShortage ? 'Shortage alert: Minimum 75% required' : 'Meets 75% examination eligibility'}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            <Button
              title="Class Scanner"
              onPress={() => navigation.navigate('StudentAttendance')}
              variant="primary"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Campus Arrival"
              onPress={() => navigation.navigate('CampusCheckIn')}
              variant="outline"
              style={{ flex: 1, marginLeft: 6, borderColor: '#3B82F6' }}
            />
          </View>
        </View>

        {/* 3. Academic Details */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Enrolled Program</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Institution</Text>
            <Text style={styles.metaValue}>GRIET Hyderabad</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Department</Text>
            <Text style={styles.metaValue}>{user?.branch || 'Engineering'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Email Address</Text>
            <Text style={styles.metaValue}>{user?.email || 'N/A'}</Text>
          </View>
          <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.metaLabel}>Verification Policy</Text>
            <Text style={styles.metaValue}>Rotating QR + Geofence</Text>
          </View>
        </View>

        {/* 4. Academic Utilities & Services */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Academic Services & Schedule</Text>
          <Text style={styles.utilityDescription}>
            Access your weekly class schedule, track attendance correction requests, and inspect institutional notifications.
          </Text>

          <View style={styles.utilityActionRow}>
            <Button
              title="Class Timetable"
              onPress={() => navigation.navigate('Timetable')}
              variant="outline"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Attendance Disputes"
              onPress={() => navigation.navigate('AttendanceDisputes')}
              variant="outline"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>

          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Button
              title="Campus Check-In"
              onPress={() => navigation.navigate('CampusCheckIn')}
              variant="outline"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Notifications"
              onPress={() => navigation.navigate('Notifications')}
              variant="outline"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>

          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <Button
              title="Grievance Desk"
              onPress={() => navigation.navigate('ComplaintsFeedback')}
              variant="outline"
              style={{ flex: 1, marginRight: 6 }}
            />
            <Button
              title="Reports & Downloads"
              onPress={() => navigation.navigate('ReportsRecords')}
              variant="outline"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
        </View>

        <Button
          title="Sign Out"
          onPress={logout}
          variant="outline"
          style={styles.signOutBtn}
        />
      </ScrollView>
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleBadgeText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  academicYearText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  studentName: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  studentMeta: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  attendanceHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: 14,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pctBlock: {
    alignItems: 'center',
    paddingRight: 14,
  },
  pctNumber: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  pctSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  dividerVertical: {
    width: 1,
    height: 48,
    backgroundColor: THEME.colors.border,
    marginRight: 14,
  },
  statusBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  thresholdBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  thresholdBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  thresholdText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaLabel: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  utilityDescription: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  utilityActionRow: {
    flexDirection: 'row',
  },
  signOutBtn: {
    marginTop: THEME.spacing.xs,
  },
  cachedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    borderRadius: THEME.borderRadius.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: THEME.spacing.sm,
    alignItems: 'center',
  },
  cachedBadgeText: {
    color: THEME.colors.warning,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
