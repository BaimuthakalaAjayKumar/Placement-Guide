import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuth } from '../../context/AuthContext';
import { leadershipApi, HODFacultyMember } from '../../api/leadershipApi';
import { THEME } from '../../utils/constants';

export const HODFacultyScreen: React.FC = () => {
  const { user } = useAuth();
  const [faculties, setFaculties] = useState<HODFacultyMember[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const departmentName = user?.department || user?.branch || 'Department';

  const loadFaculties = useCallback(async () => {
    setErrorMessage(null);
    try {
      const res = await leadershipApi.getHODFaculties();
      if (res.success) {
        setFaculties(res.data);
      } else {
        setErrorMessage('Unable to retrieve faculty roster.');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error || 'Failed to fetch department faculties.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFaculties();
  }, [loadFaculties]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFaculties();
  };

  const filteredFaculties = faculties.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q) ||
      (f.branch && f.branch.toLowerCase().includes(q))
    );
  });

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading department faculty directory..." />;
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
          <Text style={styles.headerTitle}>
            {departmentName.toUpperCase()} FACULTY DIRECTORY
          </Text>
          <Text style={styles.headerSubtitle}>
            {faculties.length} Assigned Instructors in Department
          </Text>

          {/* Search Box */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search faculty by name or email..."
            placeholderTextColor={THEME.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>

        {/* 2. Faculty List */}
        <View style={styles.listContainer}>
          {filteredFaculties.length > 0 ? (
            filteredFaculties.map((f) => (
              <View key={f._id} style={styles.facultyCard}>
                <View style={styles.facultyHeaderRow}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {f.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.facultyNameBlock}>
                    <Text style={styles.facultyName}>{f.name}</Text>
                    <Text style={styles.facultyEmail}>{f.email}</Text>
                  </View>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>FACULTY</Text>
                  </View>
                </View>

                {/* Managed Academic Scopes */}
                <View style={styles.scopeSection}>
                  <Text style={styles.scopeHeading}>Assigned Scopes & Classes:</Text>
                  {f.managedScopes && f.managedScopes.length > 0 ? (
                    f.managedScopes.map((scope, sIdx) => (
                      <View key={sIdx} style={styles.scopeChip}>
                        <Text style={styles.scopeChipText}>
                          Year {scope.academicYear} • {scope.branch || departmentName} (Sec {scope.section || 'All'})
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noScopeText}>
                      General Department Teaching Scope ({departmentName})
                    </Text>
                  )}
                </View>

                {/* Additional Info */}
                <View style={styles.footerRow}>
                  <Text style={styles.footerText}>
                    {f.lastLoginAt
                      ? `Last active: ${new Date(f.lastLoginAt).toLocaleDateString()}`
                      : 'Active Instructor'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Faculty Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No faculty members matched "${searchQuery}".`
                  : `No instructors currently assigned to ${departmentName}.`}
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
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
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
  },
  listContainer: {
    gap: 10,
  },
  facultyCard: {
    backgroundColor: THEME.colors.surface,
    padding: 14,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  facultyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.accent,
  },
  facultyNameBlock: {
    flex: 1,
  },
  facultyName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  facultyEmail: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  scopeSection: {
    backgroundColor: THEME.colors.background,
    padding: 10,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: 8,
  },
  scopeHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  scopeChip: {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 3,
  },
  scopeChipText: {
    fontSize: 11,
    color: THEME.colors.text,
    fontWeight: '500',
  },
  noScopeText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
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
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});
