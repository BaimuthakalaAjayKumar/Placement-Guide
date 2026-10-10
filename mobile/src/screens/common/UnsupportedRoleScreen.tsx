import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';

export const UnsupportedRoleScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const formattedRole = user?.role ? user.role.toUpperCase().replace('_', ' ') : 'USER';

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <View style={styles.monitorFrame}>
            <View style={styles.monitorScreen} />
            <View style={styles.monitorStand} />
            <View style={styles.monitorBase} />
          </View>
        </View>

        <Text style={styles.title}>Web Portal Access Required</Text>
        <Text style={styles.roleNotice}>
          Logged in as: <Text style={styles.roleHighlight}>{formattedRole}</Text>
        </Text>

        <View style={styles.card}>
          <Text style={styles.bodyText}>
            The CampusBridge Mobile App currently supports Student, Faculty, HOD, Principal, and Director workflows.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            Platform Super Administration, Company Recruiter management, and Auditor logs are hosted on the desktop web portal.
          </Text>
          <View style={styles.urlBox}>
            <Text style={styles.urlLabel}>Official Web Portal:</Text>
            <Text style={styles.urlText}>https://placement-guide-nu.vercel.app</Text>
          </View>
        </View>

        <Button
          title="Sign Out of Mobile App"
          onPress={logout}
          variant="outline"
          style={styles.logoutBtn}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: THEME.spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  monitorFrame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monitorScreen: {
    width: 36,
    height: 24,
    borderWidth: 2,
    borderColor: '#818CF8',
    borderRadius: 4,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  monitorStand: {
    width: 4,
    height: 6,
    backgroundColor: '#818CF8',
  },
  monitorBase: {
    width: 18,
    height: 2,
    backgroundColor: '#818CF8',
    borderRadius: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
  },
  roleNotice: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 6,
    marginBottom: THEME.spacing.lg,
  },
  roleHighlight: {
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    width: '100%',
    marginBottom: THEME.spacing.xl,
  },
  bodyText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  urlBox: {
    marginTop: 14,
    backgroundColor: THEME.colors.background,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  urlLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  urlText: {
    fontSize: 13,
    color: THEME.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  logoutBtn: {
    width: '100%',
  },
});
