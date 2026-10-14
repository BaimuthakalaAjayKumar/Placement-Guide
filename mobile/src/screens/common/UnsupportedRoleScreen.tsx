import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';
import { LeadershipProfileScreen } from './LeadershipProfileScreen';

export const UnsupportedRoleScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState<boolean>(false);

  const formattedRole = user?.role ? user.role.toUpperCase().replace('_', ' ') : 'USER';
  const isSuperAdminUser = user?.role === 'super_admin' || user?.role === 'admin';

  if (showProfile && isSuperAdminUser) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.colors.background }}>
        <TouchableOpacity
          onPress={() => setShowProfile(false)}
          style={styles.backBar}
          activeOpacity={0.8}
        >
          <Text style={styles.backBarText}>← Back to Portal Access Notice</Text>
        </TouchableOpacity>
        <LeadershipProfileScreen
          roleTitle="Super Administrator"
          roleBadgeColor="#EF4444"
          scopeDescription="Authorized for system-wide multi-campus governance, tenant infrastructure isolation, and security audit log inspection."
        />
      </View>
    );
  }

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
            The CampusBridge Mobile App currently supports Student, Faculty, HOD, Principal, and Director operational workflows.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 10 }]}>
            Platform Super Administration, Company Recruiter management, and Auditor logs are hosted on the desktop web portal.
          </Text>
          <View style={styles.urlBox}>
            <Text style={styles.urlLabel}>Official Web Portal:</Text>
            <Text style={styles.urlText}>https://placement-guide-nu.vercel.app</Text>
          </View>
        </View>

        {isSuperAdminUser && (
          <Button
            title="View Super Admin Profile"
            onPress={() => setShowProfile(true)}
            variant="secondary"
            style={styles.profileBtn}
          />
        )}

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
  backBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backBarText: {
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '700',
  },
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
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
  },
  monitorFrame: {
    alignItems: 'center',
  },
  monitorScreen: {
    width: 38,
    height: 26,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  monitorStand: {
    width: 4,
    height: 6,
    backgroundColor: THEME.colors.primary,
  },
  monitorBase: {
    width: 20,
    height: 2,
    backgroundColor: THEME.colors.primary,
    borderRadius: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },
  roleNotice: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.lg,
  },
  roleHighlight: {
    color: THEME.colors.accent,
    fontWeight: '700',
  },
  card: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    width: '100%',
    marginBottom: THEME.spacing.lg,
  },
  bodyText: {
    fontSize: 13.5,
    color: THEME.colors.textMuted,
    lineHeight: 20,
  },
  urlBox: {
    marginTop: THEME.spacing.md,
    padding: THEME.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  urlLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  urlText: {
    fontSize: 12.5,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  profileBtn: {
    width: '100%',
    marginBottom: THEME.spacing.md,
  },
  logoutBtn: {
    width: '100%',
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
});
