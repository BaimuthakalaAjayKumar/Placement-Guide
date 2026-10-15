import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuth } from '../../context/AuthContext';
import { requestEmergencyOtp, verifyEmergencyOtp } from '../../api/authApi';
import { THEME } from '../../utils/constants';

type Props = NativeStackScreenProps<AuthStackParamList, 'StudentFaceEmergencyOtp'>;

export const StudentFaceEmergencyOtpScreen: React.FC<Props> = ({ route, navigation }) => {
  const { challengeToken, email, studentName } = route.params;
  const { setSessionFromToken } = useAuth();

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [reason, setReason] = useState('Camera malfunction or lighting issue');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      const res = await requestEmergencyOtp(challengeToken, reason);
      if (res.success) {
        setOtpSent(true);
        setInfoMessage(
          `A 6-digit recovery OTP has been sent to your registered institutional email: ${email}`
        );
      } else {
        setErrorMessage(res.error || 'Failed to dispatch recovery code.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Error requesting emergency code.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await verifyEmergencyOtp(challengeToken, otpCode.trim());

      if (res.success && res.token && res.user) {
        setInfoMessage('Emergency access granted. Establishing authorized student session...');
        setTimeout(async () => {
          await setSessionFromToken(res.token!, res.user!);
        }, 1000);
      } else {
        setErrorMessage(res.error || 'Invalid or expired recovery code.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'OTP verification failed.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Return to Face Verification</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Emergency Access Recovery</Text>
        <Text style={styles.studentSubtitle}>
          Account: {studentName} ({email})
        </Text>
      </View>

      <ErrorBanner message={errorMessage || ''} onDismiss={() => setErrorMessage(null)} />

      {infoMessage && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>ℹ️ {infoMessage}</Text>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🔐</Text>
        </View>
        <Text style={styles.cardTitle}>Non-Biometric Emergency Access</Text>
        <Text style={styles.bodyText}>
          If you are unable to complete facial verification due to camera hardware failure, poor
          lighting, medical reasons, or temporary accommodation, you can verify your identity using a
          time-bound OTP sent to your institutional inbox.
        </Text>

        {!otpSent ? (
          <>
            <Input
              label="Reason for Emergency Bypass"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Camera hardware issue, lighting"
            />

            <Button
              title="Send Verification Code to Email"
              onPress={handleSendOtp}
              loading={isLoading}
              variant="primary"
              style={{ marginTop: THEME.spacing.sm }}
            />
          </>
        ) : (
          <>
            <Input
              label="6-Digit Verification Code"
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="123456"
              keyboardType="number-pad"
              maxLength={6}
            />

            <Button
              title="Verify Code & Sign In"
              onPress={handleVerifyOtp}
              loading={isLoading}
              disabled={otpCode.length < 6}
              variant="primary"
              style={{ marginTop: THEME.spacing.sm }}
            />

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleSendOtp}
              disabled={isLoading}
            >
              <Text style={styles.resendText}>Resend code to email</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.auditNotice}>
          Notice: All emergency access logins are recorded in institutional security audit logs.
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: THEME.spacing.md,
  },
  backButton: {
    paddingVertical: 6,
    marginBottom: 4,
  },
  backButtonText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  studentSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderWidth: 1,
    borderColor: '#EAB308',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 26,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  infoText: {
    color: '#93C5FD',
    fontSize: 13,
    lineHeight: 18,
  },
  resendButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  resendText: {
    color: THEME.colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  auditNotice: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: THEME.spacing.md,
    lineHeight: 16,
  },
});
