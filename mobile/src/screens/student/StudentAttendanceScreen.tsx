import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { THEME } from '../../utils/constants';

export const StudentAttendanceScreen: React.FC = () => {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Attendance</Text>
        <Text style={styles.subtitle}>Geofenced Classroom Check-In Hub</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Scanner Status</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Hardware Interface Ready</Text>
        </View>
        <Text style={styles.description}>
          Classroom attendance requires simultaneous optical QR code scanning and high-accuracy GPS geofence verification within the assigned lecture room.
        </Text>
      </View>

      <View style={styles.metricCard}>
        <Text style={styles.metricTitle}>Statutory Attendance Policy</Text>
        <Text style={styles.metricHighlight}>75.0%</Text>
        <Text style={styles.metricSubtext}>
          Minimum mandatory attendance required per semester. Any cumulative attendance below 75% triggers institutional shortage notifications.
        </Text>
      </View>

      <Button
        title="Optical Scanner Hub (Phase 2)"
        onPress={() => {}}
        disabled={true}
        style={styles.actionBtn}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 13,
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
  cardHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  statusText: {
    color: THEME.colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
  },
  metricCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  metricTitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '500',
  },
  metricHighlight: {
    fontSize: 36,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginVertical: 6,
  },
  metricSubtext: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: THEME.spacing.sm,
  },
});
