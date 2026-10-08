import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { CaptchaChallenge } from '../../components/CaptchaChallenge';
import { useAuth } from '../../context/AuthContext';
import { THEME, APP_NAME } from '../../utils/constants';

export const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaResetTrigger((prev) => prev + 1);
  };

  const handleLogin = async () => {
    setErrorMessage(null);

    // 1. Validate Email & Password
    if (!email.trim()) {
      setErrorMessage('Please enter your institutional email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // 2. MANDATORY CAPTCHA ENFORCEMENT
    // Rule: The final production login MUST require CAPTCHA.
    if (!captchaToken) {
      setErrorMessage('Security verification is required. Please complete the CAPTCHA check below.');
      return;
    }

    try {
      const result = await login({
        email: email.trim(),
        password,
        captchaToken,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
        // Clear/reset the CAPTCHA token after failed login / authentication failure
        resetCaptcha();
      } else {
        // Clear/reset the CAPTCHA token after successful login
        resetCaptcha();
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
      resetCaptcha();
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>CB</Text>
        </View>
        <Text style={styles.appTitle}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>Mobile Portal for Students & Faculty</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Sign In</Text>
        <Text style={styles.formHint}>Use your official institutional credentials</Text>

        <ErrorBanner message={errorMessage || ''} onDismiss={() => setErrorMessage(null)} />

        <Input
          label="Email Address"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="e.g. rollnumber@grietcollege.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (errorMessage) setErrorMessage(null);
          }}
          placeholder="••••••••••••"
          secureTextEntry
        />

        {/* Mandatory Security CAPTCHA Interface */}
        <CaptchaChallenge
          onVerify={(token) => {
            setCaptchaToken(token);
            if (errorMessage && errorMessage.includes('CAPTCHA')) {
              setErrorMessage(null);
            }
          }}
          onReset={() => setCaptchaToken(null)}
          onError={() => {
            setCaptchaToken(null);
            setErrorMessage('Security verification check encountered an error. Please try again.');
          }}
          resetTrigger={captchaResetTrigger}
          disabled={isLoading}
        />

        <Button
          title="Sign In to CampusBridge"
          onPress={handleLogin}
          loading={isLoading}
          disabled={isLoading || !captchaToken}
          style={styles.loginButton}
        />

        <Text style={styles.securityNotice}>
          🔒 End-to-end encrypted with hardware-backed JWT storage.
        </Text>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginVertical: THEME.spacing.lg,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.sm,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  formHint: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.md,
    marginTop: 2,
  },
  loginButton: {
    marginTop: THEME.spacing.sm,
  },
  securityNotice: {
    textAlign: 'center',
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.md,
  },
});
