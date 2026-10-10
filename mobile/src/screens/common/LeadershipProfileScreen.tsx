import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Alert, TouchableOpacity, Switch } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';
import {
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
  promptBiometricUnlock,
} from '../../utils/biometric';

interface LeadershipProfileScreenProps {
  roleTitle: string;
  roleBadgeColor: string;
  scopeDescription: string;
}

export const LeadershipProfileScreen: React.FC<LeadershipProfileScreenProps> = ({
  roleTitle,
  roleBadgeColor,
  scopeDescription,
}) => {
  const { user, logout, refreshProfile, isBiometricSupported, biometricLabel } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bioEnabled, setBioEnabled] = useState<boolean>(false);
  const [checkingBio, setCheckingBio] = useState<boolean>(true);

  useEffect(() => {
    isBiometricUnlockEnabled().then((enabled) => {
      setBioEnabled(enabled);
      setCheckingBio(false);
    });
  }, []);

  const handleToggleBio = async (val: boolean) => {
    if (val) {
      const res = await promptBiometricUnlock('Confirm Biometrics to Enable App Lock');
      if (res.success) {
        await setBiometricUnlockEnabled(true);
        setBioEnabled(true);
      } else {
        Alert.alert('Verification Cancelled', res.error || 'Biometric authorization is required.');
      }
    } else {
      await setBiometricUnlockEnabled(false);
      setBioEnabled(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
    } catch {
      // safe fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your CampusBridge session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.headerCard}>
        <View style={[styles.roleBadge, { backgroundColor: `${roleBadgeColor}20` }]}>
          <Text style={[styles.roleBadgeText, { color: roleBadgeColor }]}>
            {roleTitle.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Academic Leader'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'N/A'}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Authorized Institutional Scope</Text>
        <Text style={styles.scopeNotice}>{scopeDescription}</Text>
        
        <View style={styles.scopeRow}>
          <Text style={styles.label}>Campus Identifier</Text>
          <Text style={styles.value}>
            {user?.campusId ? String(user.campusId).slice(0, 8) + '...' : 'Default Campus'}
          </Text>
        </View>

        {user?.branch || user?.department ? (
          <View style={styles.scopeRow}>
            <Text style={styles.label}>Department / Branch</Text>
            <Text style={styles.value}>{user.department || user.branch}</Text>
          </View>
        ) : null}

        <View style={styles.scopeRow}>
          <Text style={styles.label}>Platform Role</Text>
          <Text style={styles.value}>{user?.role || 'Leadership'}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Security & Access Boundaries</Text>
        <Text style={styles.securityText}>
          CampusBridge operates strict role-based access control. Mobile leadership views are scoped to your assigned campus or department. Database mutations and destructive administrative actions are strictly restricted to authorized web portals.
        </Text>

        <View style={styles.bioToggleRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.bioToggleTitle}>Biometric App Unlock</Text>
            <Text style={styles.bioToggleSubtitle}>
              {isBiometricSupported
                ? `Require ${biometricLabel || 'device biometrics'} to unlock on app resume.`
                : 'Biometric hardware unavailable or not enrolled.'}
            </Text>
          </View>
          <Switch
            value={bioEnabled}
            onValueChange={handleToggleBio}
            disabled={!isBiometricSupported || checkingBio}
            trackColor={{ false: '#334155', true: THEME.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.actionContainer}>
        <Button
          title={isRefreshing ? 'Refreshing Profile...' : 'Refresh Profile'}
          onPress={handleRefresh}
          variant="secondary"
          disabled={isRefreshing}
          style={styles.refreshBtn}
        />

        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          style={styles.signOutBtn}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.borderRadius.sm,
    marginBottom: THEME.spacing.sm,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 8,
  },
  scopeNotice: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  scopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  label: {
    fontSize: 13,
    color: THEME.colors.textMuted,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  securityText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 19,
  },
  bioToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  bioToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  bioToggleSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  actionContainer: {
    marginTop: THEME.spacing.sm,
    gap: THEME.spacing.sm,
  },
  refreshBtn: {
    marginBottom: THEME.spacing.xs,
  },
  signOutBtn: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
});
