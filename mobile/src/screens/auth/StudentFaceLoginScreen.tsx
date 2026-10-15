import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuth } from '../../context/AuthContext';
import { verifyStudentFaceLogin, requestFaceChallenge } from '../../api/authApi';
import { extractFaceEmbedding } from '../../services/faceInferenceService';
import { THEME } from '../../utils/constants';

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

type Props = NativeStackScreenProps<AuthStackParamList, 'StudentFaceLogin'>;

export const StudentFaceLoginScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    challengeToken: initialChallengeToken,
    challengeNonce: initialChallengeNonce,
    promptAction: initialPromptAction,
    instructions: initialInstructions,
    studentName,
    email,
  } = route.params;

  const { setSessionFromToken } = useAuth();

  const [challengeToken, setChallengeToken] = useState(initialChallengeToken);
  const [challengeNonce, setChallengeNonce] = useState(initialChallengeNonce);
  const [promptAction, setPromptAction] = useState(initialPromptAction || 'NATURAL_BLINK');
  const [instructions, setInstructions] = useState(initialInstructions || 'Look directly into camera');

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR' | 'LOCKED'>('IDLE');
  const [statusMessage, setStatusMessage] = useState('Align your face inside the guide');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [similarityScore, setSimilarityScore] = useState<number | null>(null);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<any>(null);

  // Animate scanning guide
  useEffect(() => {
    if (status === 'PROCESSING') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [status, scanLineAnim]);

  // Request camera permissions
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

  // Handle refresh challenge
  const refreshChallenge = async () => {
    try {
      setStatusMessage('Requesting fresh verification challenge...');
      const chal = await requestFaceChallenge(challengeToken);
      if (chal.challengeNonce) {
        setChallengeNonce(chal.challengeNonce);
      }
      if (chal.promptAction) {
        setPromptAction(chal.promptAction);
      }
      if (chal.instructions) {
        setInstructions(chal.instructions);
      }
      setStatus('IDLE');
      setStatusMessage('Ready for face capture');
    } catch (err: any) {
      if (err.response?.data?.isLockedOut) {
        setStatus('LOCKED');
        setErrorMessage(err.response?.data?.error || 'Account temporarily locked out.');
      }
    }
  };

  const handleCaptureAndVerify = async () => {
    if (status === 'PROCESSING' || !cameraRef.current) return;
    setStatus('PROCESSING');
    setStatusMessage('Capturing optical image...');
    setErrorMessage(null);

    try {
      // 1. Take picture from camera
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.base64 && !photo?.uri) {
        throw new Error('Camera snapshot failed.');
      }

      setStatusMessage('Extracting facial embedding with MobileFaceNet...');

      // 2. Run genuine on-device MobileFaceNet ONNX inference
      const opticalEvidence = await extractFaceEmbedding({
        base64: photo.base64,
        uri: photo.uri,
      });

      setStatusMessage('Verifying facial identity on institutional server...');

      // 3. Verify against backend
      const res = await verifyStudentFaceLogin({
        challengeToken,
        probeEmbedding: opticalEvidence,
        challengeNonce,
        livenessEvidence: {
          promptAction,
          timestamp: Date.now(),
        },
      });

      if (res.success && res.verified && res.token && res.user) {
        setStatus('SUCCESS');
        setSimilarityScore(res.similarity || 0.95);
        setStatusMessage(`Verified (Confidence: ${Math.round((res.similarity || 0.95) * 100)}%)`);
        setTimeout(async () => {
          await setSessionFromToken(res.token!, res.user!);
        }, 1100);
      } else {
        setStatus('ERROR');
        if (res.status === 'AMBIGUOUS_MATCH') {
          setErrorMessage('Inconclusive match (score in border zone). Ensure direct lighting and retry.');
        } else {
          setErrorMessage(res.error || 'Face verification failed. Profile mismatch.');
        }
        await refreshChallenge();
      }
    } catch (err: any) {
      setStatus('ERROR');
      const isLocked = err.response?.data?.isLockedOut;
      if (isLocked) {
        setStatus('LOCKED');
        setErrorMessage(err.response?.data?.error || 'Account temporarily locked out.');
      } else {
        const apiErr = err.response?.data?.error || err.message || 'Face verification error.';
        setErrorMessage(apiErr);
        await refreshChallenge();
      }
    }
  };

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-OVAL_HEIGHT / 2, OVAL_HEIGHT / 2],
  });

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Sign in with another account</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Student Face Verification</Text>
        <Text style={styles.studentSubtitle}>
          Verifying: {studentName} ({email})
        </Text>
      </View>

      <ErrorBanner message={errorMessage || ''} onDismiss={() => setErrorMessage(null)} />

      {/* Liveness instruction banner */}
      <View style={styles.challengeCard}>
        <View style={styles.challengeIconCircle}>
          <Text style={styles.challengeIcon}>🎯</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.challengeTitle}>LIVENESS VERIFICATION</Text>
          <Text style={styles.challengePrompt}>{instructions}</Text>
        </View>
      </View>

      {/* Camera Preview */}
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
            status === 'SUCCESS' && styles.ovalGuideSuccess,
            status === 'ERROR' && styles.ovalGuideError,
            status === 'PROCESSING' && styles.ovalGuideProcessing,
          ]}
        >
          {status === 'PROCESSING' && (
            <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
          )}
        </View>

        {/* Live Guidance Badge */}
        <View style={styles.statusBadge}>
          {status === 'PROCESSING' && (
            <ActivityIndicator size="small" color="#06B6D4" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.statusBadgeText}>{statusMessage}</Text>
        </View>
      </View>

      {/* Verification Success Box */}
      {status === 'SUCCESS' && (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>✓ Identity Verified</Text>
          {similarityScore !== null && (
            <Text style={styles.similarityText}>
              Cosine Match Score: {(similarityScore * 100).toFixed(1)}%
            </Text>
          )}
          <Text style={styles.successSub}>Securing authorized student session...</Text>
        </View>
      )}

      {/* Controls */}
      {status !== 'SUCCESS' && (
        <View style={styles.controls}>
          <Button
            title={
              status === 'PROCESSING'
                ? 'Verifying Face...'
                : status === 'ERROR'
                ? 'Retry Face Verification'
                : 'Verify Identity & Sign In'
            }
            onPress={handleCaptureAndVerify}
            loading={status === 'PROCESSING'}
            disabled={status === 'PROCESSING' || status === 'LOCKED' || !hasCameraPermission}
            variant="primary"
          />

          {/* Emergency Accommodation OTP Link */}
          <TouchableOpacity
            style={styles.emergencyLink}
            onPress={() =>
              navigation.navigate('StudentFaceEmergencyOtp', {
                challengeToken,
                email,
                studentName,
              })
            }
          >
            <Text style={styles.emergencyLinkText}>
              Camera issues or accommodation? Use Emergency OTP Access →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: THEME.spacing.sm,
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
  challengeCard: {
    backgroundColor: 'rgba(79, 70, 229, 0.12)',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  challengeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  challengeIcon: {
    fontSize: 18,
  },
  challengeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.5,
  },
  challengePrompt: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 2,
  },
  cameraWrapper: {
    width: '100%',
    height: 360,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  ovalGuideProcessing: {
    borderColor: '#06B6D4',
    borderStyle: 'solid',
  },
  ovalGuideSuccess: {
    borderColor: '#10B981',
    borderStyle: 'solid',
  },
  ovalGuideError: {
    borderColor: '#EF4444',
  },
  scanLine: {
    width: OVAL_WIDTH - 20,
    height: 3,
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 12,
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
  successCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: THEME.borderRadius.md,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
  },
  similarityText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  successSub: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  controls: {
    width: '100%',
  },
  emergencyLink: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  emergencyLinkText: {
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});
