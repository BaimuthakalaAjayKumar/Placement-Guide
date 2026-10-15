import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuth } from '../../context/AuthContext';
import { enrollStudentFace, requestFaceChallenge } from '../../api/authApi';
import { extractFaceEmbedding, isNativeFaceInferenceAvailable } from '../../services/faceInferenceService';
import { THEME } from '../../utils/constants';

// Safe dynamic import of expo-camera
let CameraViewComponent: any = null;
let expoCameraModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expoCameraModule = require('expo-camera');
  if (expoCameraModule && (expoCameraModule.CameraView || expoCameraModule.Camera)) {
    CameraViewComponent = expoCameraModule.CameraView || expoCameraModule.Camera;
  }
} catch {
  CameraViewComponent = null;
}

const { width } = Dimensions.get('window');
const OVAL_WIDTH = Math.min(width * 0.72, 250);
const OVAL_HEIGHT = OVAL_WIDTH * 1.35;

type Props = NativeStackScreenProps<AuthStackParamList, 'StudentFaceEnrollment'>;

export const StudentFaceEnrollmentScreen: React.FC<Props> = ({ route, navigation }) => {
  const { preAuthToken, studentName, email } = route.params;
  const { setSessionFromToken } = useAuth();

  const [step, setStep] = useState<'CONSENT' | 'CAMERA' | 'ENROLLING' | 'SUCCESS'>('CONSENT');
  const [consentChecked, setConsentChecked] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState('Position your face within the guide');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [challengeNonce, setChallengeNonce] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const cameraRef = useRef<any>(null);

  // Request camera permissions on mount
  useEffect(() => {
    (async () => {
      try {
        if (expoCameraModule?.requestCameraPermissionsAsync) {
          const res = await expoCameraModule.requestCameraPermissionsAsync();
          setHasCameraPermission(!!res.granted);
        } else if (expoCameraModule?.Camera?.requestCameraPermissionsAsync) {
          const res = await expoCameraModule.Camera.requestCameraPermissionsAsync();
          setHasCameraPermission(!!res.granted);
        } else {
          setHasCameraPermission(false);
        }
      } catch {
        setHasCameraPermission(false);
      }
    })();
  }, []);

  const handleStartCapture = async () => {
    setErrorMessage(null);
    try {
      // Fetch fresh server challenge nonce
      const chal = await requestFaceChallenge(preAuthToken);
      if (chal.challengeNonce) {
        setChallengeNonce(chal.challengeNonce);
      }
      setStep('CAMERA');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to initialize biometric challenge.';
      setErrorMessage(msg);
    }
  };

  const handleCaptureAndEnroll = async () => {
    if (isCapturing || !cameraRef.current) return;
    setIsCapturing(true);
    setErrorMessage(null);
    setStatusMessage('Capturing optical reference...');

    try {
      // 1. Capture snapshot from native camera
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.base64 && !photo?.uri) {
        throw new Error('Camera snapshot capture failed.');
      }

      setStatusMessage('Extracting facial feature embedding with MobileFaceNet...');

      // 2. Perform genuine on-device MobileFaceNet ONNX inference
      const opticalEvidence = await extractFaceEmbedding({
        base64: photo.base64,
        uri: photo.uri,
      });

      setStatusMessage('Registering biometric profile with institution...');
      setStep('ENROLLING');

      // 3. Submit enrollment to backend
      const res = await enrollStudentFace({
        preAuthToken,
        consentGiven: true,
        probeEmbedding: opticalEvidence,
        challengeNonce: challengeNonce || undefined,
      });

      if (res.success && res.token && res.user) {
        setStep('SUCCESS');
        setStatusMessage('Face profile enrolled successfully!');
        // Transition session to authenticated state
        setTimeout(async () => {
          await setSessionFromToken(res.token!, res.user!);
        }, 1200);
      } else {
        setStep('CAMERA');
        setErrorMessage(res.error || 'Enrollment registration failed.');
        setIsCapturing(false);
      }
    } catch (err: any) {
      setStep('CAMERA');
      setIsCapturing(false);
      const apiErr = err.response?.data?.error || err.message || 'Face enrollment failed.';
      setErrorMessage(apiErr);
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Student Face Enrollment</Text>
        <Text style={styles.studentSubtitle}>
          Enrolling: {studentName} ({email})
        </Text>
      </View>

      <ErrorBanner message={errorMessage || ''} onDismiss={() => setErrorMessage(null)} />

      {/* Step 1: Informed Consent Gate */}
      {step === 'CONSENT' && (
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🛡️</Text>
          </View>
          <Text style={styles.cardTitle}>Institutional Biometric Consent</Text>
          <Text style={styles.bodyText}>
            CampusBridge requires mandatory 1:1 facial verification for student accounts to guarantee
            academic integrity and prevent credential theft.
          </Text>

          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Template Encryption:</Text> A 128-dimensional mathematical vector
              is generated using MobileFaceNet and encrypted with AES-256-GCM.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>No Photo Storage:</Text> Raw facial photographs are never saved
              to institutional databases.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Purpose Limitation:</Text> Used solely for subsequent login
              authentication and verified institutional attendance.
            </Text>
            <Text style={styles.bulletItem}>
              • <Text style={styles.bold}>Right to Accommodation:</Text> If you have a verified disability or
              religious exemption, you may request an emergency non-biometric bypass.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setConsentChecked(!consentChecked)}
          >
            <View style={[styles.checkbox, consentChecked && styles.checkboxActive]}>
              {consentChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I have read and explicitly agree to the biometric policy and consent to enrolling my facial template.
            </Text>
          </TouchableOpacity>

          <Button
            title="Proceed to Camera Registration"
            onPress={handleStartCapture}
            disabled={!consentChecked}
            variant="primary"
            style={{ marginTop: THEME.spacing.md }}
          />

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() =>
              Alert.alert(
                'Biometric Accommodation',
                'If you require non-biometric academic accommodation, please contact the campus examination branch or academic dean with your enrollment documents.'
              )
            }
          >
            <Text style={styles.helpButtonText}>Request Non-Biometric Accommodation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Step 2: Live Camera Capture */}
      {(step === 'CAMERA' || step === 'ENROLLING' || step === 'SUCCESS') && (
        <View style={styles.cameraContainer}>
          <View style={styles.cameraWrapper}>
            {hasCameraPermission && CameraViewComponent ? (
              <CameraViewComponent
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="front"
              />
            ) : (
              <View style={styles.cameraPlaceholder}>
                <Text style={styles.placeholderIcon}>👤</Text>
                <Text style={styles.placeholderText}>
                  {hasCameraPermission === false
                    ? 'Camera permission denied'
                    : 'Initializing Front Camera...'}
                </Text>
              </View>
            )}

            {/* Oval Face Guide */}
            <View
              style={[
                styles.ovalGuide,
                step === 'SUCCESS' && styles.ovalGuideSuccess,
                errorMessage && styles.ovalGuideError,
              ]}
            />

            {/* Live Guidance Badge */}
            <View style={styles.statusBadge}>
              {(isCapturing || step === 'ENROLLING') && (
                <ActivityIndicator size="small" color="#06B6D4" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.statusBadgeText}>{statusMessage}</Text>
            </View>
          </View>

          {step === 'SUCCESS' ? (
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>✓ Biometric Profile Enrolled</Text>
              <Text style={styles.successSubtitle}>Entering student dashboard...</Text>
            </View>
          ) : (
            <View style={styles.cameraControls}>
              <Button
                title={isCapturing ? 'Processing Face...' : 'Capture & Enroll Face'}
                onPress={handleCaptureAndEnroll}
                loading={isCapturing || step === 'ENROLLING'}
                disabled={isCapturing || step === 'ENROLLING' || !hasCameraPermission}
                variant="primary"
              />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => {
                  setStep('CONSENT');
                  setIsCapturing(false);
                }}
              >
                <Text style={styles.retakeText}>Back to Consent Policy</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
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
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
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
    marginBottom: 14,
  },
  bulletList: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bulletItem: {
    fontSize: 12,
    color: THEME.colors.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '700',
    color: '#93C5FD',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: THEME.colors.textMuted,
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: THEME.colors.text,
    lineHeight: 16,
  },
  helpButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  helpButtonText: {
    fontSize: 12,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    alignItems: 'center',
  },
  cameraWrapper: {
    width: '100%',
    height: 380,
    borderRadius: THEME.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 54,
    opacity: 0.6,
  },
  placeholderText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  ovalGuide: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2,
    borderWidth: 3,
    borderColor: 'rgba(6, 182, 212, 0.8)',
    borderStyle: 'dashed',
    position: 'absolute',
  },
  ovalGuideSuccess: {
    borderColor: '#10B981',
    borderStyle: 'solid',
  },
  ovalGuideError: {
    borderColor: '#EF4444',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusBadgeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  cameraControls: {
    width: '100%',
  },
  retakeButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  retakeText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  successBanner: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  successSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
});
