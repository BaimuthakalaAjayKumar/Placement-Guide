import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../../context/AuthContext';
import {
  leadershipApi,
  DepartmentAttendanceReport,
} from '../../api/leadershipApi';
import { THEME } from '../../utils/constants';

type TabView = 'subjects' | 'sections' | 'faculty' | 'shortage';

export const HODAttendanceScreen: React.FC = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<DepartmentAttendanceReport | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('subjects');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const departmentName = user?.department || user?.branch || 'Department';

  const loadAttendanceReport = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await leadershipApi.getDepartmentAttendanceReport();
      if (res.success && res.report) {
        setReport(res.report);
      } else {
        setErrorMessage('Unable to load department attendance records.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || 'Failed to fetch department attendance report.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAttendanceReport();
  }, [loadAttendanceReport]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceReport();
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading department attendance report..." />;
  }

  const subjects = report?.subjectAttendance || [];
  const sections = report?.sectionAttendance || [];
  const faculty = report?.facultyActivity || [];
  const shortage = report?.shortageStudents || [];

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

        {/* 1. Department Attendance Header KPI Card */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiDeptTitle}>
            {departmentName.toUpperCase()} ATTENDANCE OVERVIEW
          </Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBlock}>
              <Text style={styles.kpiValue}>
                {report?.averageAttendance !== undefined ? `${report.averageAttendance}%` : '—'}
              </Text>
              <Text style={styles.kpiLabel}>Avg Attendance</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBlock}>
              <Text style={styles.kpiValue}>{report?.totalSessions ?? 0}</Text>
              <Text style={styles.kpiLabel}>Total Sessions</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBlock}>
              <Text style={[styles.kpiValue, { color: (report?.shortageCount || 0) > 0 ? '#EF4444' : THEME.colors.text }]}>
                {report?.shortageCount ?? 0}
              </Text>
              <Text style={styles.kpiLabel}>Shortage (&lt;75%)</Text>
            </View>
          </View>
        </View>

        {/* 2. Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'subjects' && styles.tabButtonActive]}
            onPress={() => setActiveTab('subjects')}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'subjects' && styles.tabButtonTextActive]}
            >
              Subjects ({subjects.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'sections' && styles.tabButtonActive]}
            onPress={() => setActiveTab('sections')}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'sections' && styles.tabButtonTextActive]}
            >
              Sections ({sections.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'faculty' && styles.tabButtonActive]}
            onPress={() => setActiveTab('faculty')}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'faculty' && styles.tabButtonTextActive]}
            >
              Faculty ({faculty.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'shortage' && styles.tabButtonActive]}
            onPress={() => setActiveTab('shortage')}
          >
            <Text
              style={[styles.tabButtonText, activeTab === 'shortage' && styles.tabButtonTextActive]}
            >
              Shortage ({shortage.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Tab Content */}
        {activeTab === 'subjects' && (
          <View style={styles.contentContainer}>
            {subjects.length > 0 ? (
              subjects.map((sub, index) => (
                <View key={index} style={styles.cardItem}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{sub.subjectName}</Text>
                    <Text style={styles.cardBadge}>{sub.subjectCode}</Text>
                  </View>
                  <View style={styles.cardDetailRow}>
                    <Text style={styles.cardDetailText}>Sessions Conducted: {sub.sessionsCount}</Text>
                    <Text style={[styles.pctText, { color: sub.attendancePercentage >= 75 ? '#10B981' : '#EF4444' }]}>
                      {sub.attendancePercentage}% Attendance
                    </Text>
                  </View>
                  <View style={styles.enrolledRow}>
                    <Text style={styles.cardSubText}>
                      Enrolled: {sub.totalEnrolled} • Present: {sub.totalPresent}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyPlaceholder text="No subject attendance sessions recorded yet." />
            )}
          </View>
        )}

        {activeTab === 'sections' && (
          <View style={styles.contentContainer}>
            {sections.length > 0 ? (
              sections.map((sec, index) => (
                <View key={index} style={styles.cardItem}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Section {sec.section || 'General'}</Text>
                    <Text style={styles.cardBadge}>{sec.branch}</Text>
                  </View>
                  <View style={styles.cardDetailRow}>
                    <Text style={styles.cardDetailText}>Sessions: {sec.sessionsCount}</Text>
                    <Text style={[styles.pctText, { color: sec.attendancePercentage >= 75 ? '#10B981' : '#EF4444' }]}>
                      {sec.attendancePercentage}%
                    </Text>
                  </View>
                  <View style={styles.enrolledRow}>
                    <Text style={styles.cardSubText}>
                      Total Present: {sec.totalPresent} / {sec.totalEnrolled}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyPlaceholder text="No section-wise attendance records available." />
            )}
          </View>
        )}

        {activeTab === 'faculty' && (
          <View style={styles.contentContainer}>
            {faculty.length > 0 ? (
              faculty.map((f, index) => (
                <View key={index} style={styles.cardItem}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{f.facultyName}</Text>
                    <Text style={styles.cardSubText}>{f.facultyEmail}</Text>
                  </View>
                  <View style={styles.cardDetailRow}>
                    <Text style={styles.cardDetailText}>Classes Conducted: {f.sessionsCount}</Text>
                    <Text style={[styles.pctText, { color: f.averageAttendance >= 75 ? '#10B981' : '#EF4444' }]}>
                      {f.averageAttendance}% Avg
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyPlaceholder text="No faculty attendance activity registered." />
            )}
          </View>
        )}

        {activeTab === 'shortage' && (
          <View style={styles.contentContainer}>
            {shortage.length > 0 ? (
              shortage.map((st, index) => (
                <View key={index} style={[styles.cardItem, styles.shortageBorder]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{st.studentName || 'Student Record'}</Text>
                    <Text style={styles.shortageBadge}>{st.rollNumber || 'No Roll Number'}</Text>
                  </View>
                  <View style={styles.cardDetailRow}>
                    <Text style={styles.cardDetailText}>
                      Attended: {st.presentCount} / {st.totalCount}
                    </Text>
                    <Text style={[styles.pctText, { color: '#EF4444' }]}>
                      {st.attendancePercentage}%
                    </Text>
                  </View>
                  <Text style={styles.shortageWarning}>
                    Attendance below mandatory 75% institutional threshold
                  </Text>
                </View>
              ))
            ) : (
              <EmptyPlaceholder
                text="Zero attendance shortage records found in this department."
              />
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const EmptyPlaceholder: React.FC<{ text: string }> = ({ text }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl,
  },
  kpiCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  kpiDeptTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  kpiBlock: {
    alignItems: 'center',
    flex: 1,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  kpiLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  kpiDivider: {
    width: 1,
    height: 36,
    backgroundColor: THEME.colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  contentContainer: {
    gap: 8,
  },
  cardItem: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  shortageBorder: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    flex: 1,
  },
  cardBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.accent,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  shortageBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardDetailText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  pctText: {
    fontSize: 13,
    fontWeight: '700',
  },
  enrolledRow: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  shortageWarning: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 6,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
