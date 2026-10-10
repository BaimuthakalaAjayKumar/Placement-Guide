import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { CaptchaChallenge } from '../../components/CaptchaChallenge';
import { useAuth } from '../../context/AuthContext';
import { THEME, APP_NAME } from '../../utils/constants';

export const LoginScreen: React.FC = () => {
  const {
    login,
    isLoading,
    isBiometricLocked,
    biometricLabel,
    unlockWithBiometrics,
    logout,
    user,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [captchaResetTrigger, setCaptchaResetTrigger] = useState(0);
  const [showPasswordFallback, setShowPasswordFallback] = useState<boolean>(false);

  // Automatically offer biometric prompt once when screen mounts in biometric locked state
  useEffect(() => {
    if (isBiometricLocked && !showPasswordFallback && unlockWithBiometrics) {
      unlockWithBiometrics().then((res) => {
        if (!res.success && res.error && !res.error.includes('cancelled')) {
          setErrorMessage(res.error);
        }
      });
    }
  }, [isBiometricLocked, showPasswordFallback, unlockWithBiometrics]);

  const handleBiometricUnlock = async () => {
    if (!unlockWithBiometrics) return;
    setErrorMessage(null);
    const result = await unlockWithBiometrics();
    if (!result.success && result.error) {
      setErrorMessage(result.error);
    }
  };

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
        resetCaptcha();
      } else {
        resetCaptcha();
      }
    } catch {
      setErrorMessage('A network error occurred. Please verify your connection and try again.');
      resetCaptcha();
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.appTitle}>{APP_NAME}</Text>
        <Text style={styles.motto}>One Platform. Every Campus. Every Career.</Text>
        <Text style={styles.subtitle}>Unified Institutional Portal</Text>
      </View>

      {/* BIOMETRIC APP UNLOCK GATE (When session is active but locked behind local biometrics) */}
      {isBiometricLocked && !showPasswordFallback ? (
        <View style={styles.formCard}>
          <View style={styles.bioHeaderContainer}>
            <View style={styles.bioIconBadge}>
              <Text style={styles.bioIconText}>🔐</Text>
            </View>
            <Text style={styles.formTitle}>Biometric App Unlock</Text>
            <Text style={styles.bioSubtitle}>
              Active session secured by {biometricLabel || 'device biometrics'}.
            </Text>
            {user?.name && (
              <Text style={styles.bioUserGreeting}>
                Signed in as <Text style={{ fontWeight: '700', color: THEME.colors.text }}>{user.name}</Text>
                {user.role ? ` (${user.role.toUpperCase()})` : ''}
              </Text>
            )}
          </View>

          <ErrorBanner message={errorMessage || ''} onDismiss={() => setErrorMessage(null)} />

          <Button
            title={`Unlock with ${biometricLabel || 'Biometrics'}`}
            onPress={handleBiometricUnlock}
            loading={isLoading}
            variant="primary"
            style={{ marginTop: THEME.spacing.sm }}
          />

          <Button
            title="Use Institutional Password"
            onPress={() => {
              setShowPasswordFallback(true);
              setErrorMessage(null);
            }}
            variant="outline"
            style={{ marginTop: 10 }}
          />

          <TouchableOpacity
            style={styles.switchAccountBtn}
            onPress={() => {
              logout();
              setShowPasswordFallback(false);
            }}
          >
            <Text style={styles.switchAccountText}>Sign in with a different account</Text>
          </TouchableOpacity>

          <Text style={styles.securityNotice}>
            Biometric credentials never leave your device • Hardware Keystore secured
          </Text>
        </View>
      ) : (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formHint}>Access your assigned campus, department, or student account</Text>

          <ErrorBanner message={errorMessage || ''} onDismiss={() => setErrorMessage(null)} />

          <Input
            label="Institutional Email"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="username@grietcollege.com"
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
              setErrorMessage('Security verification encountered an error. Please reload challenge.');
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

          {isBiometricLocked && (
            <Button
              title={`Return to ${biometricLabel || 'Biometric'} Unlock`}
              onPress={() => setShowPasswordFallback(false)}
              variant="outline"
              style={{ marginTop: 10 }}
            />
          )}

          <Text style={styles.securityNotice}>
            Hardware-backed SecureStore token cryptography • Multi-campus isolation enforced
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginVertical: THEME.spacing.md,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: -0.5,
  },
  motto: {
    fontSize: 12,
    color: THEME.colors.accent,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
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
  bioHeaderContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  bioIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bioIconText: {
    fontSize: 28,
  },
  bioSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  bioUserGreeting: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  switchAccountBtn: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchAccountText: {
    fontSize: 13,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  formHint: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginBottom: THEME.spacing.md,
    marginTop: 2,
    lineHeight: 18,
  },
  loginButton: {
    marginTop: THEME.spacing.sm,
  },
  securityNotice: {
    textAlign: 'center',
    fontSize: 11,
    color: '#64748B',
    marginTop: THEME.spacing.md,
    lineHeight: 16,
  },
});
