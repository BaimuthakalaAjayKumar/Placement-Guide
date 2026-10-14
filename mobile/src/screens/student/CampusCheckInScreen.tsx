import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../utils/constants';
import { attendanceApi, CampusArrivalConfigResponse } from '../../api/attendanceApi';
import { FaceBiometricModal } from '../../components/FaceBiometricModal';

// Safe dynamic loader for native camera to prevent Expo Go crashes
let CameraViewComponent: any = null;
let expoCameraModule: any = null;
let isNativeCameraAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  expoCameraModule = require('expo-camera');
  if (expoCameraModule && (expoCameraModule.CameraView || expoCameraModule.Camera)) {
    CameraViewComponent = expoCameraModule.CameraView || expoCameraModule.Camera;
    isNativeCameraAvailable = true;
  }
} catch {
  isNativeCameraAvailable = false;
  CameraViewComponent = null;
}

const requestCameraPermissionAsync = async (): Promise<boolean> => {
  try {
    if (expoCameraModule?.requestCameraPermissionsAsync) {
      const res = await expoCameraModule.requestCameraPermissionsAsync();
      return !!res.granted;
    }
    if (expoCameraModule?.Camera?.requestCameraPermissionsAsync) {
      const res = await expoCameraModule.Camera.requestCameraPermissionsAsync();
      return !!res.granted;
    }
  } catch (err) {
    console.warn('Camera permission request error:', err);
  }
  return false;
};

type CheckInStep =
  | 'PERMISSIONS'
  | 'PRIVACY_CONSENT'
  | 'CAMERA_CAPTURE'
  | 'LOCATION_EVALUATION'
  | 'RESULT_SUMMARY'
  | 'ALTERNATIVE_DESK';

interface ArrivalEvent {
  gateReferenceCode: string;
  timestamp: string;
  status: 'VERIFIED_CAMPUS_ARRIVAL' | 'STAFF_DESK_PENDING';
  distanceMeters: number | null;
  accuracyMeters: number | null;
  verificationMethod: string;
  biometricConsentGiven: boolean;
  campusName?: string;
}

export const CampusCheckInScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<CheckInStep>('PERMISSIONS');
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean>(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);
  const [permissionChecking, setPermissionChecking] = useState<boolean>(false);

  // Authoritative Campus Geofence State
  const [campusConfig, setCampusConfig] = useState<CampusArrivalConfigResponse | null>(null);
  const [configLoading, setConfigLoading] = useState<boolean>(true);
  const [submittingCheckIn, setSubmittingCheckIn] = useState<boolean>(false);

  // Biometric Privacy Consent
  const [biometricConsentGiven, setBiometricConsentGiven] = useState<boolean>(false);
  const [biometricModalVisible, setBiometricModalVisible] = useState<boolean>(false);
  const [biometricModalMode, setBiometricModalMode] = useState<'VERIFY' | 'ENROLL'>('VERIFY');
  const [faceVerificationToken, setFaceVerificationToken] = useState<string | undefined>(undefined);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState<boolean>(false);

  // Optical Sensor State
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [opticalEvidenceCaptured, setOpticalEvidenceCaptured] = useState<boolean>(false);

  // Location Evidence State
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationEvidence, setLocationEvidence] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceMeters: number;
    isInsidePerimeter: boolean;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Arrival Result State
  const [arrivalResult, setArrivalResult] = useState<ArrivalEvent | null>(null);

  // Load biometric enrollment status from backend
  useEffect(() => {
    attendanceApi
      .getBiometricStatus()
      .then((res) => {
        if (res && res.isEnrolled) {
          setIsBiometricEnrolled(true);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch authoritative campus geofence configuration from server
  const fetchCampusConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const res = await attendanceApi.getCampusArrivalConfig();
      setCampusConfig(res);
    } catch (err) {
      console.warn('Failed to load campus arrival config:', err);
      setCampusConfig({
        success: false,
        configured: false,
        message: 'Campus arrival geofence is currently unavailable.'
      });
    } finally {
      setConfigLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampusConfig();
  }, [fetchCampusConfig]);

  // Check initial permissions
  const verifyExistingPermissions = useCallback(async () => {
    try {
      setPermissionChecking(true);
      const locStatus = await Location.getForegroundPermissionsAsync();
      const locGranted = locStatus.status === 'granted';
      setLocationPermissionGranted(locGranted);

      // Camera check
      let camGranted = false;
      if (expoCameraModule?.getCameraPermissionsAsync) {
        const camStatus = await expoCameraModule.getCameraPermissionsAsync();
        camGranted = !!camStatus.granted;
      }
      setCameraPermissionGranted(camGranted);

      if (locGranted && camGranted) {
        setStep('PRIVACY_CONSENT');
      }
    } catch (err) {
      console.warn('Permission verification error:', err);
    } finally {
      setPermissionChecking(false);
    }
  }, []);

  useEffect(() => {
    verifyExistingPermissions();
  }, [verifyExistingPermissions]);

  // Request both camera and location permissions
  const handleRequestPermissions = async () => {
    setPermissionChecking(true);
    try {
      const camOk = await requestCameraPermissionAsync();
      setCameraPermissionGranted(camOk);

      const { status } = await Location.requestForegroundPermissionsAsync();
      const locOk = status === 'granted';
      setLocationPermissionGranted(locOk);

      if (camOk && locOk) {
        setStep('PRIVACY_CONSENT');
      } else {
        Alert.alert(
          'Permissions Incomplete',
          'Campus Check-In requires camera and location permissions for biometric and perimeter verification. You may also use the non-biometric staff desk alternative.',
          [
            { text: 'Retry Permissions', onPress: handleRequestPermissions },
            { text: 'Use Staff Desk Alternative', onPress: () => setStep('ALTERNATIVE_DESK') },
          ]
        );
      }
    } catch (err) {
      console.error('Error granting permissions:', err);
    } finally {
      setPermissionChecking(false);
    }
  };

  // Student agrees to explicit biometric privacy notice
  const handleAcceptBiometricConsent = () => {
    setBiometricConsentGiven(true);
    setStep('CAMERA_CAPTURE');
    setBiometricModalMode(isBiometricEnrolled ? 'VERIFY' : 'ENROLL');
    setBiometricModalVisible(true);
  };

  // Student declines biometric consent -> routes to alternative desk without penalty
  const handleDeclineBiometricConsent = () => {
    setBiometricConsentGiven(false);
    setStep('ALTERNATIVE_DESK');
  };

  // Optical Face Verification Trigger
  const handleCaptureOpticalFrame = () => {
    setBiometricModalMode(isBiometricEnrolled ? 'VERIFY' : 'ENROLL');
    setBiometricModalVisible(true);
  };

  // Called when face biometric verification or enrollment succeeds
  const handleBiometricSuccess = (token?: string) => {
    setBiometricModalVisible(false);
    if (biometricModalMode === 'ENROLL') {
      setIsBiometricEnrolled(true);
      // Immediately trigger verification for arrival token
      setBiometricModalMode('VERIFY');
      setBiometricModalVisible(true);
      return;
    }
    if (token) {
      setFaceVerificationToken(token);
    }
    setOpticalEvidenceCaptured(true);
    setStep('LOCATION_EVALUATION');
    performLocationEvaluation(token);
  };

  // Acquire real hardware location and evaluate campus perimeter via authoritative backend
  const performLocationEvaluation = async (tokenOverride?: string) => {
    if (submittingCheckIn) return; // Prevent concurrent or repeated submissions

    setLocationLoading(true);
    setLocationError(null);

    // If campus is not configured on server
    if (campusConfig && !campusConfig.configured) {
      setLocationError(
        campusConfig.message ||
          'Campus arrival check-in is unavailable because arrival geofencing has not been configured for your campus.'
      );
      setLocationLoading(false);
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy } = position.coords;
      const horizontalAccuracy = typeof accuracy === 'number' && !isNaN(accuracy) ? accuracy : 15;
      const activeToken = tokenOverride || faceVerificationToken;

      // Submit location and verified face token to authoritative backend
      setSubmittingCheckIn(true);
      const result = await attendanceApi.checkInCampusArrival({
        latitude,
        longitude,
        accuracy: horizontalAccuracy,
        faceVerificationToken: activeToken,
      });

      if (result && result.success && result.checkIn) {
        const checkIn = result.checkIn;
        setLocationEvidence({
          latitude,
          longitude,
          accuracy: horizontalAccuracy,
          distanceMeters: typeof checkIn.distanceMeters === 'number' ? checkIn.distanceMeters : 0,
          isInsidePerimeter: true,
        });

        const arrivalDate = checkIn.timestamp ? new Date(checkIn.timestamp) : new Date();
        setArrivalResult({
          gateReferenceCode: checkIn.referenceCode,
          timestamp: arrivalDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          status: 'VERIFIED_CAMPUS_ARRIVAL',
          distanceMeters: typeof checkIn.distanceMeters === 'number' ? checkIn.distanceMeters : null,
          accuracyMeters: Math.round(horizontalAccuracy),
          verificationMethod: 'SERVER_GEOFENCE_VERIFIED',
          biometricConsentGiven: true,
          campusName: checkIn.campusName,
        });

        setLocationLoading(false);
        setSubmittingCheckIn(false);
        setStep('RESULT_SUMMARY');
      } else {
        const errorMsg = result?.error || result?.message || 'Campus arrival verification failed.';
        setLocationError(errorMsg);
        setLocationLoading(false);
        setSubmittingCheckIn(false);
      }
    } catch (err: any) {
      console.error('Campus arrival check-in error:', err);
      const serverMsg =
        err?.response?.data?.message || err?.message || 'Failed to communicate with campus check-in server.';
      setLocationError(serverMsg);
      setLocationLoading(false);
      setSubmittingCheckIn(false);
    }
  };

  return (
    <ScreenContainer scrollable={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.portalTag}>
              <Text style={styles.portalTagText}>CAMPUS GATEWAY</Text>
            </View>
            <View style={styles.isolationTag}>
              <Text style={styles.isolationTagText}>ARRIVAL AUDIT</Text>
            </View>
          </View>
          <Text style={styles.title}>Campus Arrival Check-In</Text>
          <Text style={styles.subtitle}>
            Independent perimeter verification confirming daily physical arrival on institutional grounds.
          </Text>
        </View>

        {/* ======================================================== */}
        {/* STEP 1: PERMISSION CONFIRMATION                          */}
        {/* ======================================================== */}
        {step === 'PERMISSIONS' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Hardware Permissions Required</Text>
            <Text style={styles.bodyText}>
              To conduct campus entrance verification, CampusBridge requires access to your device camera and precise
              location.
            </Text>

            {/* Geofence Configuration Status Banner */}
            {configLoading ? (
              <View style={{ padding: 10, backgroundColor: '#0F172A', borderRadius: 6, marginBottom: 12 }}>
                <ActivityIndicator size="small" color={THEME.colors.primary} />
                <Text style={{ color: THEME.colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Loading campus geofence configuration...
                </Text>
              </View>
            ) : campusConfig && !campusConfig.configured ? (
              <View style={{ padding: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, borderRadius: 6, marginBottom: 12 }}>
                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>
                  Geofence Check-In Unavailable
                </Text>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 12, lineHeight: 16 }}>
                  {campusConfig.message || 'Campus perimeter has not been configured on the server. Please visit the Security Gate Desk for arrival verification.'}
                </Text>
              </View>
            ) : null}

            <View style={styles.permissionItem}>
              <View style={styles.permissionIconBlock}>
                <View style={styles.permissionDot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionTitle}>Optical Camera Access</Text>
                <Text style={styles.permissionDesc}>
                  Used exclusively for live facial verification at the campus arrival gate. Raw photos are never stored.
                </Text>
                <Text style={[styles.permStatus, cameraPermissionGranted && styles.permStatusGranted]}>
                  {cameraPermissionGranted ? 'Status: Granted' : 'Status: Pending Authorization'}
                </Text>
              </View>
            </View>

            <View style={styles.permissionItem}>
              <View style={styles.permissionIconBlock}>
                <View style={styles.permissionDot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionTitle}>Precise Geolocation Access</Text>
                <Text style={styles.permissionDesc}>
                  {campusConfig?.configured && campusConfig.arrivalPerimeterRadiusMeters
                    ? `Used to verify your presence within the institutional arrival boundary (${campusConfig.arrivalPerimeterRadiusMeters}m perimeter).`
                    : 'Used to verify your presence within the configured institutional campus boundary.'}
                </Text>
                <Text style={[styles.permStatus, locationPermissionGranted && styles.permStatusGranted]}>
                  {locationPermissionGranted ? 'Status: Granted' : 'Status: Pending Authorization'}
                </Text>
              </View>
            </View>

            <Button
              title={permissionChecking ? 'Checking Authorizations...' : 'Grant Permissions & Continue'}
              onPress={handleRequestPermissions}
              disabled={permissionChecking || (campusConfig !== null && !campusConfig.configured)}
              style={{ marginTop: 14 }}
            />

            <TouchableOpacity style={styles.alternativeLink} onPress={() => setStep('ALTERNATIVE_DESK')}>
              <Text style={styles.alternativeLinkText}>
                {campusConfig && !campusConfig.configured
                  ? 'Switch to Staff Gate Desk Check-In (Recommended)'
                  : 'Declining camera access? Switch to Staff Gate Desk Check-In'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 2: INFORMED BIOMETRIC PRIVACY NOTICE & CONSENT      */}
        {/* ======================================================== */}
        {step === 'PRIVACY_CONSENT' && (
          <View style={styles.card}>
            <View style={styles.regulatoryHeaderRow}>
              <View style={styles.legalTag}>
                <Text style={styles.legalTagText}>LEGAL DISCLOSURE</Text>
              </View>
              <Text style={styles.regulationMeta}>Academic Privacy Policy § 4.2</Text>
            </View>

            <Text style={styles.cardHeader}>Informed Biometric Privacy Notice</Text>
            <Text style={styles.bodyText}>
              Please review the institutional data protection standards governing facial verification before
              proceeding.
            </Text>

            <View style={styles.disclosureSection}>
              <Text style={styles.disclosureSectionTitle}>1. What Data is Collected</Text>
              <Text style={styles.disclosureText}>
                An ephemeral, mathematical representation of facial geometry captured during check-in, combined with
                the device timestamp and GPS coordinate accuracy.
              </Text>
            </View>

            <View style={styles.disclosureSection}>
              <Text style={styles.disclosureSectionTitle}>2. Specific Purpose</Text>
              <Text style={styles.disclosureText}>
                Exclusively to confirm physical entry onto university premises at authorized gates. Campus arrival
                records are strictly distinct from individual lecture attendance.
              </Text>
            </View>

            <View style={styles.disclosureSection}>
              <Text style={styles.disclosureSectionTitle}>3. Storage, Retention & Deletion</Text>
              <Text style={styles.disclosureText}>
                Raw face images and video streams are never stored on your device or university database disks.
                Verification tokens are retained only in temporary audit logs and automatically purged after 30 days.
              </Text>
            </View>

            <View style={styles.disclosureSection}>
              <Text style={styles.disclosureSectionTitle}>4. Right to Withdraw & Non-Penalization</Text>
              <Text style={styles.disclosureText}>
                Consent is entirely voluntary. You may decline or withdraw consent at any time without academic penalty,
                grade deduction, or campus access restriction by utilizing the Security Desk alternative.
              </Text>
            </View>

            <View style={styles.consentActionContainer}>
              <Button
                title="I Understand & Provide Biometric Consent"
                onPress={handleAcceptBiometricConsent}
                variant="primary"
                style={{ marginBottom: 10 }}
              />
              <Button
                title="Decline — Use Staff Gate Check-In"
                onPress={handleDeclineBiometricConsent}
                variant="outline"
              />
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 3: OPTICAL CAMERA CAPTURE                           */}
        {/* ======================================================== */}
        {step === 'CAMERA_CAPTURE' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Biometric Facial Identity Verification</Text>
            <Text style={styles.bodyText}>
              Align your face inside the high-precision sensor frame. CampusBridge will verify your identity against
              your encrypted institutional profile and issue a short-lived gate arrival token.
            </Text>

            {/* Viewfinder Canvas */}
            <View style={styles.viewfinderContainer}>
              <View style={styles.targetOval}>
                <View style={styles.cornerIndicatorTL} />
                <View style={styles.cornerIndicatorTR} />
                <View style={styles.cornerIndicatorBL} />
                <View style={styles.cornerIndicatorBR} />
              </View>
              <Text style={styles.viewfinderInstructions}>
                Optical Alignment Frame • Front Camera Guide
              </Text>
            </View>

            {/* Audit & Privacy Disclosure Box */}
            <View style={styles.auditInfoBox}>
              <Text style={styles.auditInfoTitle}>Institutional Biometric Security & Liveness</Text>
              <Text style={styles.auditInfoDesc}>
                Biometric verification uses 128-dimensional mathematical template comparison with challenge-response optical liveness. Templates are encrypted with AES-256-GCM. Raw photographs are never stored or transmitted.
              </Text>
            </View>

            <Button
              title="Launch Facial Identity Verification"
              onPress={handleCaptureOpticalFrame}
              style={{ marginTop: 14 }}
            />

            <TouchableOpacity style={styles.alternativeLink} onPress={() => setStep('ALTERNATIVE_DESK')}>
              <Text style={styles.alternativeLinkText}>Camera issues? Switch to Security Desk Check-In</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 4: LOCATION EVIDENCE EVALUATION                     */}
        {/* ======================================================== */}
        {step === 'LOCATION_EVALUATION' && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Evaluating Campus Geolocation Evidence</Text>
            <Text style={styles.bodyText}>
              Verifying hardware GPS signal against institutional perimeter boundary coordinates.
            </Text>

            {locationLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.colors.primary} />
                <Text style={styles.loadingText}>Acquiring High-Precision GPS Fix...</Text>
                <Text style={styles.loadingSubtext}>
                  Auditing satellite horizontal accuracy and perimeter boundary.
                </Text>
              </View>
            ) : locationError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Location Evidence Incomplete</Text>
                <Text style={styles.errorDesc}>{locationError}</Text>

                <Button
                  title={submittingCheckIn ? "Verifying with Campus Server..." : "Retry Location Fix"}
                  onPress={performLocationEvaluation}
                  disabled={submittingCheckIn}
                  style={{ marginTop: 14 }}
                />
                <Button
                  title="Request Security Desk Gate Check-In"
                  onPress={() => setStep('ALTERNATIVE_DESK')}
                  variant="outline"
                  style={{ marginTop: 8 }}
                />
              </View>
            ) : null}
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 5: RESULT SUMMARY (CAMPUS ARRIVAL RECORDED)         */}
        {/* ======================================================== */}
        {step === 'RESULT_SUMMARY' && arrivalResult && (
          <View style={styles.card}>
            <View style={styles.successBanner}>
              <View style={styles.successPill}>
                <Text style={styles.successPillText}>ENTRY VERIFIED</Text>
              </View>
              <Text style={styles.successTitle}>Campus Arrival Recorded</Text>
              <Text style={styles.successSubtitle}>
                Official daily institutional arrival logged for {campusConfig?.campusName || arrivalResult.campusName || 'Assigned Campus'}.
              </Text>
            </View>

            {/* Receipt Details Box */}
            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Student Name</Text>
                <Text style={styles.receiptValue}>{user?.name || 'Enrolled Student'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Roll Number</Text>
                <Text style={styles.receiptValue}>{user?.rollNumber || 'Not Assigned'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Arrival Timestamp</Text>
                <Text style={styles.receiptValue}>{arrivalResult.timestamp} IST</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Gate Reference Code</Text>
                <Text style={[styles.receiptValue, styles.codeFont]}>
                  {arrivalResult.gateReferenceCode}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Perimeter Evidence</Text>
                <Text style={styles.receiptValue}>
                  {arrivalResult.distanceMeters !== null
                    ? `${arrivalResult.distanceMeters}m from entrance (Accuracy: ±${arrivalResult.accuracyMeters}m)`
                    : 'Geofence Verified'}
                </Text>
              </View>
              <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.receiptLabel}>Audit Classification</Text>
                <Text style={styles.receiptValue}>
                  {arrivalResult.verificationMethod === 'SERVER_GEOFENCE_VERIFIED'
                    ? 'Server Geofence Verified • Optical Alignment Confirmed'
                    : 'Optical Alignment Confirmed • Local Perimeter Validated'}
                </Text>
              </View>
            </View>

            {/* Crucial Institutional Distinction Banner */}
            <View style={styles.distinctionNotice}>
              <Text style={styles.distinctionTitle}>Attendance Policy & System Scope Notice</Text>
              <Text style={styles.distinctionText}>
                Campus arrival check-in validates secure server-verified GPS proximity to the institutional campus perimeter. This receipt confirms physical presence in the campus vicinity; it is not synchronized with physical gate turnstiles and does not satisfy classroom attendance for individual lectures, which must be scanned separately via rotating dynamic QR during each scheduled class period.
              </Text>
            </View>

            <Button
              title="Return to Student Desk"
              onPress={() => navigation.navigate('StudentDashboard')}
              variant="primary"
              style={{ marginTop: 14 }}
            />

            <Button
              title="View Academic Timetable"
              onPress={() => navigation.navigate('Timetable')}
              variant="outline"
              style={{ marginTop: 8 }}
            />
          </View>
        )}

        {/* ======================================================== */}
        {/* STEP 6: NON-BIOMETRIC ALTERNATIVE (SECURITY GATE DESK)   */}
        {/* ======================================================== */}
        {step === 'ALTERNATIVE_DESK' && (
          <View style={styles.card}>
            <View style={styles.staffDeskHeaderRow}>
              <View style={styles.staffDeskPill}>
                <Text style={styles.staffDeskPillText}>NON-BIOMETRIC ALTERNATIVE</Text>
              </View>
            </View>

            <Text style={styles.cardHeader}>Authorized Security Desk Entry</Text>
            <Text style={styles.bodyText}>
              Present this authorized entry token along with your physical University Student ID card at any security
              entrance gate.
            </Text>

            <View style={styles.gatePassContainer}>
              <Text style={styles.passHeader}>CAMPUSBRIDGE GATE PASS</Text>
              <Text style={styles.passCode}>
                CB-GATE-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-
                {Math.floor(1000 + Math.random() * 9000)}
              </Text>

              <View style={styles.metaDivider} />

              <View style={styles.passMetaRow}>
                <Text style={styles.passMetaLabel}>Student:</Text>
                <Text style={styles.passMetaValue}>{user?.name || 'Enrolled Student'}</Text>
              </View>
              <View style={styles.passMetaRow}>
                <Text style={styles.passMetaLabel}>Roll Number:</Text>
                <Text style={styles.passMetaValue}>{user?.rollNumber || 'Assigned Student'}</Text>
              </View>
              <View style={styles.passMetaRow}>
                <Text style={styles.passMetaLabel}>Department:</Text>
                <Text style={styles.passMetaValue}>{user?.branch || 'Engineering'}</Text>
              </View>
              <View style={styles.passMetaRow}>
                <Text style={styles.passMetaLabel}>Valid On:</Text>
                <Text style={styles.passMetaValue}>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            {/* Non-penalization guarantee */}
            <View style={styles.equityGuaranteeBox}>
              <Text style={styles.equityGuaranteeTitle}>Non-Penalization Guarantee</Text>
              <Text style={styles.equityGuaranteeText}>
                Under university regulation § 4.2.C, opting for staff-verified entry carries zero academic penalty,
                grade deduction, or loss of campus privileges.
              </Text>
            </View>

            <Button
              title="Return to Student Desk"
              onPress={() => navigation.navigate('StudentDashboard')}
              variant="primary"
              style={{ marginTop: 14 }}
            />

            <Button
              title="Retry Biometric Check-In"
              onPress={() => setStep('PRIVACY_CONSENT')}
              variant="outline"
              style={{ marginTop: 8 }}
            />
          </View>
        )}
      </ScrollView>

      <FaceBiometricModal
        visible={biometricModalVisible}
        mode={biometricModalMode}
        purpose="CAMPUS_ARRIVAL"
        title={biometricModalMode === 'ENROLL' ? 'Student Face Enrollment' : 'Campus Arrival Face Verification'}
        onSuccess={handleBiometricSuccess}
        onClose={() => setBiometricModalVisible(false)}
        onFallback={() => {
          setBiometricModalVisible(false);
          setStep('ALTERNATIVE_DESK');
        }}
        fallbackLabel="Use Security Gate Alternative"
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  portalTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  portalTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  isolationTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  isolationTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  permissionIconBlock: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  permissionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  permissionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  permissionDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  permStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    marginTop: 4,
  },
  permStatusGranted: {
    color: '#10B981',
  },
  alternativeLink: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  alternativeLinkText: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  regulatoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  legalTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  legalTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  regulationMeta: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  disclosureSection: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  disclosureSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  disclosureText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  consentActionContainer: {
    marginTop: 12,
  },
  viewfinderContainer: {
    height: 220,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  targetOval: {
    width: 140,
    height: 170,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    borderStyle: 'dashed',
    position: 'relative',
  },
  cornerIndicatorTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 12,
    height: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#60A5FA',
  },
  cornerIndicatorTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#60A5FA',
  },
  cornerIndicatorBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 12,
    height: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#60A5FA',
  },
  cornerIndicatorBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#60A5FA',
  },
  viewfinderInstructions: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 12,
    letterSpacing: 0.5,
  },
  auditInfoBox: {
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    padding: 10,
    borderRadius: 4,
  },
  auditInfoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  auditInfoDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    marginTop: 14,
  },
  loadingSubtext: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  errorDesc: {
    fontSize: 12,
    color: '#F87171',
    marginTop: 4,
    lineHeight: 17,
  },
  successBanner: {
    alignItems: 'center',
    marginBottom: 16,
  },
  successPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 6,
  },
  successPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  successSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  receiptBox: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  receiptLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  codeFont: {
    fontWeight: '700',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
  },
  distinctionNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 6,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  distinctionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F59E0B',
  },
  distinctionText: {
    fontSize: 11,
    color: '#FCD34D',
    marginTop: 2,
    lineHeight: 15,
  },
  staffDeskHeaderRow: {
    marginBottom: 8,
  },
  staffDeskPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  staffDeskPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  gatePassContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    marginBottom: 12,
  },
  passHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 1,
  },
  passCode: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginVertical: 10,
    letterSpacing: 1,
  },
  metaDivider: {
    height: 1,
    width: '100%',
    backgroundColor: THEME.colors.border,
    marginBottom: 10,
  },
  passMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  passMetaLabel: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  passMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  equityGuaranteeBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  equityGuaranteeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  equityGuaranteeText: {
    fontSize: 11,
    color: '#6EE7B7',
    marginTop: 2,
    lineHeight: 15,
  },
});
