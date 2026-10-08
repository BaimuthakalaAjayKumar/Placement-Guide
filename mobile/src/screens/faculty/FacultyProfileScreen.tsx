import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';

export const FacultyProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'F').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Faculty Member'}</Text>
        <Text style={styles.email}>{user?.email || 'N/A'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Staff Identification</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Designation</Text>
          <Text style={styles.value}>Faculty Coordinator</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Department</Text>
          <Text style={styles.value}>{user?.branch || 'Information Technology'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Campus</Text>
          <Text style={styles.value}>GRIET Main Campus</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>System Role</Text>
          <Text style={[styles.value, { textTransform: 'capitalize' }]}>{user?.role || 'faculty'}</Text>
        </View>
      </View>

      <View style={styles.securityCard}>
        <Text style={styles.securityTitle}>🔒 Authentication & Session</Text>
        <Text style={styles.securityText}>
          Logged in with hardware-backed JWT storage. Sessions expire according to institutional security policy.
        </Text>
      </View>

      <Button
        title="Sign Out"
        onPress={logout}
        variant="danger"
        style={styles.logoutBtn}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    marginVertical: THEME.spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.sm,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  email: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  label: {
    fontSize: 14,
    color: THEME.colors.textMuted,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  securityCard: {
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.25)',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.lg,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#818CF8',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 18,
  },
  logoutBtn: {
    marginBottom: THEME.spacing.xl,
  },
});
