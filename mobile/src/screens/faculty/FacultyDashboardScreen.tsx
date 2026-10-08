import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';

export const FacultyDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.roleTag}>FACULTY INSTRUCTOR PORTAL</Text>
        <Text style={styles.welcomeText}>Welcome, {user?.name || 'Faculty Member'}!</Text>
        <Text style={styles.metaText}>{user?.email || 'N/A'}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Assigned Academic Scope</Text>
        {user?.managedScopes && user.managedScopes.length > 0 ? (
          user.managedScopes.map((scope, index) => (
            <View key={index} style={styles.scopeRow}>
              <Text style={styles.scopeYear}>Year: {scope.academicYear}</Text>
              <Text style={styles.scopeDetails}>
                {scope.branch || 'All'} - Section {scope.section || 'All'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noScopeText}>
            Branch: {user?.branch || 'General'} • Section: {user?.section || 'General'}
          </Text>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Attendance Control Hub</Text>
        <Text style={styles.bodyText}>
          Faculty instructors can manage live classroom attendance, dynamic 15-second rotating QR projector displays, and review student dispute corrections.
        </Text>
      </View>

      <Button
        title="Sign Out"
        onPress={logout}
        variant="outline"
        style={styles.logoutBtn}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#34D399',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  metaText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  scopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  scopeYear: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  scopeDetails: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  noScopeText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  bodyText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
  },
  logoutBtn: {
    marginTop: THEME.spacing.md,
  },
});
