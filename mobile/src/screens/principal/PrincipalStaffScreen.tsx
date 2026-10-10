import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { leadershipApi, CampusStaffMember } from '../../api/leadershipApi';
import { THEME } from '../../utils/constants';

type RoleFilter = 'all' | 'faculty' | 'admin';

export const PrincipalStaffScreen: React.FC = () => {
  const [staff, setStaff] = useState<CampusStaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadStaffData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await leadershipApi.getCampusStaff();
      if (res.success) {
        setStaff(res.data);
      } else {
        setErrorMessage('Unable to retrieve campus staff directory.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || 'Failed to fetch campus staff members.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStaffData();
  }, [loadStaffData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStaffData();
  };

  const filteredStaff = staff.filter((member) => {
    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'faculty' && member.role !== 'faculty') return false;
      if (roleFilter === 'admin' && member.role !== 'admin' && member.role !== 'administrator') {
        return false;
      }
    }

    // Search filter
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      member.name.toLowerCase().includes(q) ||
      member.email.toLowerCase().includes(q) ||
      member.role.toLowerCase().includes(q)
    );
  });

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading campus staff directory..." />;
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

        {/* 1. Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>CAMPUS FACULTY & STAFF ROSTER</Text>
          <Text style={styles.headerSubtitle}>
            {staff.length} Authorized Academic & Administrative Staff
          </Text>

          {/* Search Box */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff by name or email..."
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />

          {/* Role Filter Chips */}
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.filterChip, roleFilter === 'all' && styles.filterChipActive]}
              onPress={() => setRoleFilter('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  roleFilter === 'all' && styles.filterChipTextActive,
                ]}
              >
                All ({staff.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, roleFilter === 'faculty' && styles.filterChipActive]}
              onPress={() => setRoleFilter('faculty')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  roleFilter === 'faculty' && styles.filterChipTextActive,
                ]}
              >
                Faculty ({staff.filter((s) => s.role === 'faculty').length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, roleFilter === 'admin' && styles.filterChipActive]}
              onPress={() => setRoleFilter('admin')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  roleFilter === 'admin' && styles.filterChipTextActive,
                ]}
              >
                Admins ({staff.filter((s) => s.role === 'admin' || s.role === 'administrator').length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Staff List */}
        <View style={styles.listContainer}>
          {filteredStaff.length > 0 ? (
            filteredStaff.map((member) => (
              <View key={member._id} style={styles.staffCard}>
                <View style={styles.staffHeaderRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.nameBlock}>
                    <Text style={styles.staffName}>{member.name}</Text>
                    <Text style={styles.staffEmail}>{member.email}</Text>
                  </View>
                  <View
                    style={[
                      styles.roleTag,
                      {
                        backgroundColor:
                          member.role === 'faculty'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(79, 70, 229, 0.15)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleTagText,
                        {
                          color:
                            member.role === 'faculty'
                              ? '#10B981'
                              : THEME.colors.primary,
                        },
                      ]}
                    >
                      {member.role.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Scopes */}
                {member.managedScopes && member.managedScopes.length > 0 ? (
                  <View style={styles.scopeBox}>
                    <Text style={styles.scopeLabel}>Assigned Academic Scopes:</Text>
                    {member.managedScopes.map((scope, idx) => (
                      <View key={idx} style={styles.scopeItem}>
                        <Text style={styles.scopeItemText}>
                          Year {scope.academicYear} • {scope.branch || 'General'} - Sec {scope.section || 'All'}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Staff Members Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? `No staff matched "${searchQuery}".`
                  : 'No faculty or administrator records found.'}
              </Text>
            </View>
          )}
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
  headerCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 2,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: THEME.colors.text,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 10,
  },
  staffCard: {
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  staffHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  nameBlock: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  staffEmail: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  scopeBox: {
    backgroundColor: THEME.colors.background,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    marginTop: 10,
  },
  scopeLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  scopeItem: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 3,
  },
  scopeItemText: {
    fontSize: 11,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  emptyDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
