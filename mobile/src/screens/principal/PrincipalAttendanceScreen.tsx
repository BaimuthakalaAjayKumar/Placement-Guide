import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBanner } from '../../components/ErrorBanner';
import {
  leadershipApi,
  CampusAttendanceReport,
} from '../../api/leadershipApi';
import { THEME } from '../../utils/constants';

export const PrincipalAttendanceScreen: React.FC = () => {
  const [report, setReport] = useState<CampusAttendanceReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAttendanceData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await leadershipApi.getCampusAttendanceReport();
      if (res.success && res.report) {
        setReport(res.report);
      } else {
        setErrorMessage('Unable to retrieve campus attendance records.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || 'Failed to fetch campus attendance report.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendanceData();
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading campus attendance analytics..." />;
  }

  const branchComparisons = report?.branchComparison || [];

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

        {/* 1. Campus Attendance Header KPI Card */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>INSTITUTIONAL ATTENDANCE ANALYTICS</Text>
          <View style={styles.kpiRow}>
            <View style={styles.kpiBlock}>
              <Text style={styles.kpiValue}>
                {report?.averageAttendance !== undefined ? `${report.averageAttendance}%` : '—'}
              </Text>
              <Text style={styles.kpiLabel}>Campus Average</Text>
            </View>
            <View style={styles.kpiDivider} />
            <View style={styles.kpiBlock}>
              <Text style={styles.kpiValue}>{report?.totalSessions ?? 0}</Text>
              <Text style={styles.kpiLabel}>Sessions Held</Text>
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

        {/* 2. Departmental Comparison Table */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Department Breakdown &amp; Comparisons</Text>
          <Text style={styles.sectionSubtitle}>
            Attendance metrics grouped by academic branch and department:
          </Text>

          {branchComparisons.length > 0 ? (
            branchComparisons.map((item, index) => (
              <View key={index} style={styles.branchCard}>
                <View style={styles.branchHeaderRow}>
                  <Text style={styles.branchName}>{item.branch} Engineering</Text>
                  <Text
                    style={[
                      styles.branchPct,
                      { color: item.attendancePercentage >= 75 ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {item.attendancePercentage}% Attendance
                  </Text>
                </View>

                {/* Visual Progress Bar */}
                <View style={styles.progressBarBackground}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, item.attendancePercentage))}%`,
                        backgroundColor: item.attendancePercentage >= 75 ? '#10B981' : '#EF4444',
                      },
                    ]}
                  />
                </View>

                <View style={styles.branchDetailsRow}>
                  <Text style={styles.branchDetailText}>
                    Conducted: {item.sessions} Sessions
                  </Text>
                  <Text style={styles.branchDetailText}>
                    Attended: {item.totalPresent} / {item.totalEnrolled}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Department Attendance Recorded</Text>
              <Text style={styles.emptyText}>
                Departmental comparison metrics will compile automatically once classroom sessions are conducted.
              </Text>
            </View>
          )}
        </View>

        {/* 3. Governance Policy Card */}
        <View style={styles.policyCard}>
          <Text style={styles.policyTitle}>Mandatory Policy Enforcement</Text>
          <Text style={styles.policyText}>
            Under campus academic regulations, students with attendance below 75% are subject to examination hall-ticket withholding. Real-time shortage lists and CSV exports are accessible on the web portal.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

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
  kpiTitle: {
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
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  branchCard: {
    backgroundColor: THEME.colors.background,
    padding: 12,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
  },
  branchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  branchName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  branchPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  branchDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  branchDetailText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  policyCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  policyText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
});
