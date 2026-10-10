import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, Alert } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';
import {
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
  promptBiometricUnlock,
} from '../../utils/biometric';

export const StudentProfileScreen: React.FC = () => {
  const { user, logout, isBiometricSupported, biometricLabel } = useAuth();
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
        Alert.alert('Verification Cancelled', res.error || 'Biometric authorization is required to enable lock.');
      }
    } else {
      await setBiometricUnlockEnabled(false);
      setBioEnabled(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.name || 'S').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Student User'}</Text>
        <Text style={styles.email}>{user?.email || 'N/A'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Institutional Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Roll Number</Text>
          <Text style={styles.value}>{user?.rollNumber || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Branch</Text>
          <Text style={styles.value}>{user?.branch || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Section</Text>
          <Text style={styles.value}>{user?.section || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Academic Year</Text>
          <Text style={styles.value}>{user?.academicYear || '2026'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Account Role</Text>
          <Text style={[styles.value, { textTransform: 'capitalize' }]}>{user?.role || 'student'}</Text>
        </View>
      </View>

      <View style={styles.securityCard}>
        <Text style={styles.securityTitle}>Security & Session Protection</Text>
        <Text style={styles.securityText}>
          Your session token is encrypted using device hardware (Android Keystore / iOS Keychain).
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
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.lg,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.accent,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 18,
  },
  bioToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(6, 182, 212, 0.2)',
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
  logoutBtn: {
    marginBottom: THEME.spacing.xl,
  },
});
