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
import { leadershipApi, AuditStatsData } from '../../api/leadershipApi';
import { THEME } from '../../utils/constants';

export const DirectorGovernanceScreen: React.FC = () => {
  const [stats, setStats] = useState<AuditStatsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAuditStats = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await leadershipApi.getAuditStats();
      if (res.success && res.data) {
        setStats(res.data);
      } else {
        setErrorMessage('Unable to retrieve campus governance statistics.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || 'Failed to fetch audit governance telemetry.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAuditStats();
  }, [loadAuditStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAuditStats();
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading governance telemetry..." />;
  }

  const categoryCounts = stats?.categoryCounts || [];
  const topStudents = stats?.topStudents || [];

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

        {/* 1. Executive Telemetry Overview */}
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>CAMPUS ENGAGEMENT & AUDIT TELEMETRY</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                {stats?.onlineNowCount ?? 0}
              </Text>
              <Text style={styles.kpiLabel}>Online Now</Text>
            </View>
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiValue, { color: '#8B5CF6' }]}>
                {stats?.activeTodayCount ?? 0}
              </Text>
              <Text style={styles.kpiLabel}>Active Today</Text>
            </View>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiValue}>
                {stats?.totalActiveHours ?? '0.0'}h
              </Text>
              <Text style={styles.kpiLabel}>Active Hours</Text>
            </View>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiValue}>
                {stats?.totalActivitiesLogged ?? 0}
              </Text>
              <Text style={styles.kpiLabel}>Audit Events</Text>
            </View>
          </View>
        </View>

        {/* 2. Platform Activity Distribution by Category */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Platform Activity Distribution</Text>
          <Text style={styles.sectionSubtitle}>
            Breakdown of student actions across academic modules:
          </Text>

          {categoryCounts.length > 0 ? (
            categoryCounts.map((cat, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <Text style={styles.categoryName}>{cat._id || 'General System'}</Text>
                  <Text style={styles.categoryCount}>{cat.count} Events</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(
                          100,
                          Math.max(
                            8,
                            Math.round(
                              (cat.count / (stats?.totalActivitiesLogged || cat.count || 1)) * 100
                            )
                          )
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Activity Logs Logged Yet</Text>
              <Text style={styles.emptyText}>
                Category breakdowns will reflect real user activities as students interact with the portal.
              </Text>
            </View>
          )}
        </View>

        {/* 3. Top Engaged Campus Scholars */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>High-Engagement Campus Scholars</Text>
          <Text style={styles.sectionSubtitle}>
            Students demonstrating highest cumulative platform engagement:
          </Text>

          {topStudents.length > 0 ? (
            topStudents.map((st, index) => {
              const hours = ((st.totalActiveSeconds || 0) / 3600).toFixed(1);
              return (
                <View key={st._id} style={styles.studentCard}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{st.name}</Text>
                    <Text style={styles.studentMeta}>
                      {st.branch || 'Campus'} • Roll: {st.rollNumber || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.hoursBlock}>
                    <Text style={styles.hoursValue}>{hours}h</Text>
                    <Text style={styles.hoursLabel}>Active Time</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Engagement Data</Text>
              <Text style={styles.emptyText}>
                Leaderboard metrics compile automatically as platform sessions occur.
              </Text>
            </View>
          )}
        </View>

        {/* 4. Executive Security Notice */}
        <View style={styles.securityNoticeCard}>
          <Text style={styles.noticeTitle}>Governance Security Architecture</Text>
          <Text style={styles.noticeText}>
            Audit trails capture immutable IP, device fingerprint, and session timelines strictly for anti-cheating, accreditation verification, and student security compliance.
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
    marginBottom: 14,
    textAlign: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 6,
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
  categoryRow: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  categoryCount: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A78BFA',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  studentMeta: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  hoursBlock: {
    alignItems: 'flex-end',
  },
  hoursValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  hoursLabel: {
    fontSize: 10,
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
  securityNoticeCard: {
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
});
