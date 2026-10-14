import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, Alert, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';
import apiClient from '../../api/client';
import { attendanceApi, BiometricStatusResponse } from '../../api/attendanceApi';
import { FaceBiometricModal } from '../../components/FaceBiometricModal';
import {
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
  promptBiometricUnlock,
} from '../../utils/biometric';

const toOrdinalYear = (val?: string): string => {
  if (!val) return 'N/A';
  const s = String(val).trim();
  if (/^1(st)?(\s*year)?$/i.test(s) || s === 'I') return '1st Year';
  if (/^2(nd)?(\s*year)?$/i.test(s) || s === 'II') return '2nd Year';
  if (/^3(rd)?(\s*year)?$/i.test(s) || s === 'III') return '3rd Year';
  if (/^4(th)?(\s*year)?$/i.test(s) || s === 'IV' || /final/i.test(s)) return '4th Year';
  if (s === '2026') return '4th Year';
  if (s === '2027') return '3rd Year';
  if (s === '2028') return '2nd Year';
  if (s === '2029') return '1st Year';
  return s.toLowerCase().includes('year') ? s : `${s} Year`;
};

const getAcademicSession = (u?: any): string => {
  if (u?.academicSession) return u.academicSession;
  const s = String(u?.academicYear || u?.year || '').trim();
  if (/20\d\d[-–]20\d\d/.test(s)) return s;
  return '2026–2027';
};

export const StudentProfileScreen: React.FC = () => {
  const { user, logout, isBiometricSupported, biometricLabel } = useAuth();
  const [bioEnabled, setBioEnabled] = useState<boolean>(false);
  const [checkingBio, setCheckingBio] = useState<boolean>(true);

  // Biometric Face Attendance State
  const [faceEnrolled, setFaceEnrolled] = useState<boolean>(false);
  const [faceEnrolledAt, setFaceEnrolledAt] = useState<string | null>(null);
  const [loadingFaceStatus, setLoadingFaceStatus] = useState<boolean>(true);
  const [faceModalVisible, setFaceModalVisible] = useState<boolean>(false);

  const loadFaceStatus = async () => {
    try {
      setLoadingFaceStatus(true);
      const res = await attendanceApi.getBiometricStatus();
      if (res && res.success) {
        setFaceEnrolled(res.isEnrolled);
        setFaceEnrolledAt(res.enrolledAt);
      }
    } catch (err) {
      console.warn('Failed to load biometric status:', err);
    } finally {
      setLoadingFaceStatus(false);
    }
  };

  useEffect(() => {
    loadFaceStatus();
  }, []);

  // Digital Guardian Card State
  const [guardianLoading, setGuardianLoading] = useState<boolean>(true);
  const [guardianCard, setGuardianCard] = useState<any>(null);
  const [guardianStatus, setGuardianStatus] = useState<string>('UNVERIFIED');

  useEffect(() => {
    isBiometricUnlockEnabled().then((enabled) => {
      setBioEnabled(enabled);
      setCheckingBio(false);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchGuardianCard = async () => {
      try {
        const res = await apiClient.get('/api/guardians/my-card');
        if (isMounted && res.data?.success) {
          if (res.data.hasActiveCard) {
            setGuardianCard(res.data.data);
            setGuardianStatus(res.data.data.verificationStatus || 'VERIFIED');
          } else {
            setGuardianCard(null);
            setGuardianStatus(res.data.verificationStatus || 'UNVERIFIED');
          }
        }
      } catch (err) {
        if (isMounted) {
          setGuardianStatus('UNVERIFIED');
        }
      } finally {
        if (isMounted) {
          setGuardianLoading(false);
        }
      }
    };
    fetchGuardianCard();
    return () => { isMounted = false; };
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
          <Text style={styles.value}>{toOrdinalYear(user?.academicYear || user?.year)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Academic Session</Text>
          <Text style={styles.value}>{getAcademicSession(user)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Account Role</Text>
          <Text style={[styles.value, { textTransform: 'capitalize' }]}>{user?.role || 'student'}</Text>
        </View>
      </View>

      {/* Digital Guardian Identity Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionHeader}>Digital Guardian Card</Text>
          <View style={[
            styles.statusBadge,
            guardianStatus === 'VERIFIED' ? styles.badgeVerified : styles.badgeUnverified
          ]}>
            <Text style={[
              styles.statusBadgeText,
              guardianStatus === 'VERIFIED' ? styles.badgeTextVerified : styles.badgeTextUnverified
            ]}>
              {guardianStatus === 'VERIFIED' ? '✓ VERIFIED' : 'UNVERIFIED'}
            </Text>
          </View>
        </View>

        {guardianLoading ? (
          <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 12 }} />
        ) : guardianCard ? (
          <View style={styles.guardianDetails}>
            <View style={styles.row}>
              <Text style={styles.label}>Card Number</Text>
              <Text style={[styles.value, { color: THEME.colors.primary, fontFamily: 'monospace' }]}>
                {guardianCard.cardNumber}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Guardian Name</Text>
              <Text style={styles.value}>{guardianCard.guardianName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Relationship</Text>
              <Text style={styles.value}>{guardianCard.relationship}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Valid Until</Text>
              <Text style={styles.value}>
                {guardianCard.cardExpiresAt ? new Date(guardianCard.cardExpiresAt).toLocaleDateString() : 'Active'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Issuing Campus</Text>
              <Text style={styles.value}>{guardianCard.campusName || 'Main Campus'}</Text>
            </View>
            <View style={styles.cardAuditNotice}>
              <Text style={styles.auditNoticeText}>
                🛡️ Verified for security gate authorization. Opaque cryptographic QR pass linked.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.unverifiedContainer}>
            <Text style={styles.unverifiedNotice}>
              Admission contact records are unverified until audited by Front Office &amp; Administration.
            </Text>
            {((user as any)?.guardianContacts && (user as any).guardianContacts.length > 0) ? (
              <View style={styles.declaredContactsBox}>
                <Text style={styles.declaredContactsTitle}>Declared Admission Contacts:</Text>
                {((user as any).guardianContacts).map((c: any, idx: number) => (
                  <View key={idx} style={styles.contactItem}>
                    <Text style={styles.contactName}>
                      {c.name || 'Contact'} ({c.relationship || 'Guardian'})
                    </Text>
                    <Text style={styles.contactStatusTag}>Self-Declared (Unverified)</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.verificationInstructions}>
              To receive an official Digital Guardian Card, visit Campus Front Office with government ID verification.
            </Text>
          </View>
        )}
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

      {/* Attendance Biometric Identity Card */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Biometric Attendance Identity</Text>
        <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 14, lineHeight: 19 }}>
          CampusBridge uses genuine 128-dimensional facial representation encrypted with AES-256-GCM at rest for classroom attendance and campus arrival.
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Enrollment Status</Text>
          <Text style={[styles.value, { color: faceEnrolled ? '#10B981' : '#F59E0B', fontWeight: '700' }]}>
            {loadingFaceStatus ? 'Checking...' : faceEnrolled ? 'Enrolled & Active' : 'Not Enrolled'}
          </Text>
        </View>

        {faceEnrolled && faceEnrolledAt && (
          <View style={styles.row}>
            <Text style={styles.label}>Enrolled On</Text>
            <Text style={styles.value}>{new Date(faceEnrolledAt).toLocaleDateString()}</Text>
          </View>
        )}

        <View style={{ marginTop: 14 }}>
          {faceEnrolled ? (
            <>
              <Button
                title="Re-Enroll Facial Biometrics"
                onPress={() => setFaceModalVisible(true)}
                variant="outline"
                style={{ marginBottom: 8 }}
              />
              <Button
                title="Withdraw Consent & Delete Templates"
                onPress={() => {
                  Alert.alert(
                    'Withdraw Biometric Consent',
                    'Are you sure you want to delete your biometric templates? Your encrypted facial representation will be permanently erased. You may continue to use non-biometric alternative attendance.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Confirm Deletion',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const res = await attendanceApi.withdrawBiometric({ reason: 'Student requested deletion' });
                            if (res.success) {
                              Alert.alert('Templates Deleted', res.message || 'Biometric profile erased.');
                              loadFaceStatus();
                            }
                          } catch (err: any) {
                            Alert.alert('Withdrawal Failed', err?.message || 'Error deleting template.');
                          }
                        },
                      },
                    ]
                  );
                }}
                variant="danger"
              />
            </>
          ) : (
            <Button
              title="Enroll Face for Attendance"
              onPress={() => setFaceModalVisible(true)}
              variant="primary"
            />
          )}
        </View>
      </View>

      <Button
        title="Sign Out"
        onPress={logout}
        variant="danger"
        style={styles.logoutBtn}
      />

      <FaceBiometricModal
        visible={faceModalVisible}
        mode="ENROLL"
        title="Student Face Biometric Enrollment"
        onSuccess={() => {
          setFaceModalVisible(false);
          loadFaceStatus();
          Alert.alert('Enrollment Complete', 'Your facial biometric template has been securely encrypted and stored.');
        }}
        onClose={() => setFaceModalVisible(false)}
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeVerified: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  badgeUnverified: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeTextVerified: {
    color: '#22c55e',
  },
  badgeTextUnverified: {
    color: '#94a3b8',
  },
  guardianDetails: {
    marginTop: 4,
  },
  cardAuditNotice: {
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  auditNoticeText: {
    fontSize: 11,
    color: '#38bdf8',
    lineHeight: 16,
  },
  unverifiedContainer: {
    marginTop: 4,
  },
  unverifiedNotice: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  declaredContactsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  declaredContactsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contactName: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.colors.text,
  },
  contactStatusTag: {
    fontSize: 10,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verificationInstructions: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  logoutBtn: {
    marginBottom: THEME.spacing.xl,
  },
});
