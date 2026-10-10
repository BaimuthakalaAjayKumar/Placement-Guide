import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ErrorBanner } from '../../components/ErrorBanner';
import { notificationApi, AppNotification, SmartAlert } from '../../api/notificationApi';
import { THEME } from '../../utils/constants';
import { formatApiErrorMessage } from '../../utils/errorUtils';

type FilterTab = 'all' | 'unread' | 'alerts';

export const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotificationData = useCallback(async (isMountedCheck?: () => boolean) => {
    setErrorMessage(null);
    try {
      const [notifsRes, alertsRes] = await Promise.allSettled([
        notificationApi.getNotifications(),
        notificationApi.getSmartAlerts(),
      ]);

      if (isMountedCheck && !isMountedCheck()) return;

      if (notifsRes.status === 'fulfilled' && notifsRes.value.success) {
        setNotifications(notifsRes.value.data || []);
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value.success) {
        setSmartAlerts(alertsRes.value.data || []);
      }

      if (notifsRes.status === 'rejected' && alertsRes.status === 'rejected') {
        setErrorMessage(formatApiErrorMessage(notifsRes.reason));
      }
    } catch (err: any) {
      if (isMountedCheck && !isMountedCheck()) return;
      setErrorMessage(formatApiErrorMessage(err));
    } finally {
      if (!isMountedCheck || isMountedCheck()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadNotificationData(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [loadNotificationData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotificationData();
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err: any) {
      console.warn('Failed to mark notification as read:', err?.message || err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (notifications.every((n) => n.isRead)) return;
    try {
      setActionLoading(true);
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err: any) {
      setErrorMessage('Failed to mark all as read.');
    } finally {
      setActionLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Recent';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

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

        {/* 1. Header Bar with Action */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.screenTitle}>Notification Center</Text>
            <Text style={styles.screenSubtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread alert${unreadCount === 1 ? '' : 's'}`
                : 'All institutional notifications reviewed'}
            </Text>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={handleMarkAllAsRead}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={THEME.colors.primary} />
              ) : (
                <Text style={styles.markAllBtnText}>Mark all read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Filter Navigation Tabs */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              All ({notifications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'unread' && styles.tabItemActive]}
            onPress={() => setActiveTab('unread')}
          >
            <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
              Unread ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'alerts' && styles.tabItemActive]}
            onPress={() => setActiveTab('alerts')}
          >
            <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>
              Smart Alerts ({smartAlerts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. Feed List Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Synchronizing notifications...</Text>
          </View>
        ) : activeTab === 'alerts' ? (
          /* Smart Alerts Feed */
          smartAlerts.length > 0 ? (
            smartAlerts.map((alert) => {
              const isHighPriority = alert.priority === 'high';
              return (
                <View key={alert.id} style={[styles.card, isHighPriority && styles.cardHighPriority]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor: isHighPriority
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.categoryBadgeText,
                            { color: isHighPriority ? '#EF4444' : '#3B82F6' },
                          ]}
                        >
                          {alert.type ? alert.type.toUpperCase().replace('_', ' ') : 'ALERT'}
                        </Text>
                      </View>
                      <Text style={styles.priorityLabel}>
                        {isHighPriority ? 'High Priority' : 'Standard'}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{formatRelativeTime(alert.createdAt)}</Text>
                  </View>

                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertBody}>{alert.message}</Text>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Active Smart Alerts</Text>
              <Text style={styles.emptyText}>
                No upcoming application deadlines or urgent calendar tasks detected.
              </Text>
            </View>
          )
        ) : filteredNotifications.length > 0 ? (
          /* System Notifications Feed */
          filteredNotifications.map((notif) => {
            return (
              <TouchableOpacity
                key={notif._id}
                style={[styles.card, !notif.isRead && styles.cardUnread]}
                activeOpacity={0.7}
                onPress={() => !notif.isRead && handleMarkAsRead(notif._id)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    {!notif.isRead && <View style={styles.unreadDot} />}
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {notif.type ? notif.type.toUpperCase().replace('_', ' ') : 'GENERAL'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.timeText}>{formatRelativeTime(notif.createdAt)}</Text>
                </View>

                <Text style={styles.notifBody}>{notif.message}</Text>

                {notif.metadata?.attendancePercentage !== undefined && (
                  <View style={styles.metadataRow}>
                    <Text style={styles.metaKey}>Attendance Level:</Text>
                    <Text
                      style={[
                        styles.metaValue,
                        {
                          color:
                            notif.metadata.attendancePercentage >= 75 ? '#10B981' : '#EF4444',
                        },
                      ]}
                    >
                      {notif.metadata.attendancePercentage}% (Min {notif.metadata.threshold || 75}%)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Notifications Found</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'unread'
                ? 'You have caught up with all institutional updates.'
                : 'No alerts or campus notifications have been issued for your profile.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  screenSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  markAllBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  markAllBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  tabItemActive: {
    backgroundColor: THEME.colors.background,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabTextActive: {
    color: THEME.colors.text,
    fontWeight: '700',
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  cardUnread: {
    borderColor: 'rgba(99, 102, 241, 0.5)',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  cardHighPriority: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.primary,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  priorityLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  timeText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  alertBody: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
  },
  notifBody: {
    fontSize: 13,
    color: THEME.colors.text,
    lineHeight: 18,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaKey: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
