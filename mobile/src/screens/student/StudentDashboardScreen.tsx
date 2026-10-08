import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';

export const StudentDashboardScreen: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.roleTag}>STUDENT PORTAL</Text>
        <Text style={styles.welcomeText}>Welcome back, {user?.name || 'Student'}!</Text>
        <Text style={styles.metaText}>
          Roll Number: {user?.rollNumber || 'N/A'} • Branch: {user?.branch || 'N/A'} (Sec {user?.section || 'N/A'})
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Academic Status</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Campus:</Text>
          <Text style={styles.value}>GRIET Main Campus</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Academic Year:</Text>
          <Text style={styles.value}>{user?.academicYear || '2026'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Attendance Criterion:</Text>
          <Text style={[styles.value, { color: THEME.colors.warning }]}>Mandatory 75% Threshold</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Smart Attendance Module</Text>
        <Text style={styles.bodyText}>
          Use the Attendance tab to scan high-contrast projector dynamic QR codes with device-verified classroom geofencing.
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
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    color: '#818CF8',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
  bodyText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
  },
  logoutBtn: {
    marginTop: THEME.spacing.md,
  },
});
