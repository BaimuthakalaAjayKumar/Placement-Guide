import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { THEME } from '../../utils/constants';

export const FacultyAttendanceScreen: React.FC = () => {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Faculty Attendance Hub</Text>
        <Text style={styles.subtitle}>Session Monitoring & Roster Controls</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Lecture Sessions</Text>
        <Text style={styles.cardBody}>
          Dynamic QR sessions require projector canvas rendering and WebSocket socket.io live roster updates.
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Dual-Control Dispute Ready</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Session Operations Notice</Text>
        <Text style={styles.infoDesc}>
          • Create session: selects registered campus room and subject.
          {'\n'}• 15-second rotation window with HMAC cryptographic nonce.
          {'\n'}• Real-time Socket.IO emission to update attendee count.
          {'\n'}• Session close triggers statutory 75% shortage evaluation.
        </Text>
      </View>

      <Button
        title="Start Attendance Session (Phase 3)"
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
    marginBottom: 10,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  infoBox: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 20,
  },
  actionBtn: {
    marginTop: THEME.spacing.sm,
  },
});
