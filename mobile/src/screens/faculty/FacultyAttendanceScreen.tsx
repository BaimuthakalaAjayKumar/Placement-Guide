import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { THEME } from '../../utils/constants';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import {
  attendanceApi,
  ActiveSession,
  AttendanceRoom,
  AttendanceSubjectOption,
} from '../../api/attendanceApi';
import { FaceBiometricModal } from '../../components/FaceBiometricModal';

const STANDARD_BLOCKS = [
  'IT Block',
  'CSE Block',
  'Main Academic Block',
  'ECE Block',
  'Mechanical Block',
  'Civil Block',
  'Pharmacy Block',
];

const STANDARD_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const STANDARD_BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIML', 'CSD'];
const STANDARD_SECTIONS = ['A', 'B', 'C', 'D'];
const PERIOD_PRESETS = ['1', '2', '3', '4', '5', '6', '7'];
const TIMER_PRESETS = [5, 10, 15, 20, 30];

export const FacultyAttendanceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [rooms, setRooms] = useState<AttendanceRoom[]>([]);
  const [subjects, setSubjects] = useState<AttendanceSubjectOption[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [currentClock, setCurrentClock] = useState(Date.now());

  // Clock tick every 1000ms for live stopwatch
  useEffect(() => {
    const clock = setInterval(() => setCurrentClock(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);

  // Assigned Scopes Computation
  const assignedSubjects = useMemo(() => {
    const list: { id: string; name: string; code: string; branch?: string }[] = [];
    const seen = new Set<string>();

    if (Array.isArray(user?.managedScopes)) {
      user.managedScopes.forEach((s: any) => {
        const sub = s.subject;
        if (sub) {
          const sId = (typeof sub === 'object' ? sub._id : sub) || '';
          const sName = (typeof sub === 'object' ? sub.name : '') || 'Assigned Subject';
          const sCode = (typeof sub === 'object' ? sub.code : '') || 'SUBJ';
          const key = (sCode || sName).toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ id: sId, name: sName, code: sCode, branch: s.branch });
          }
        }
      });
    }

    const userAny = user as any;
    if (userAny?.subjectId) {
      const targetId = typeof userAny.subjectId === 'object' ? userAny.subjectId._id : userAny.subjectId;
      const match = subjects.find((s) => s._id === targetId?.toString());
      if (match && !seen.has((match.code || match.name).toLowerCase())) {
        seen.add((match.code || match.name).toLowerCase());
        list.push({ id: match._id, name: match.name, code: match.code, branch: match.branch });
      }
    }

    return list;
  }, [user, subjects]);

  const assignedScopeYears = useMemo(() => {
    const years = new Set<string>();
    if (Array.isArray(user?.managedScopes)) {
      user.managedScopes.forEach((s: any) => {
        if (s.academicYear) years.add(s.academicYear.trim());
      });
    }
    if (user?.academicYear) years.add(user.academicYear.trim());
    return Array.from(years);
  }, [user]);

  const assignedScopeBranches = useMemo(() => {
    const branches = new Set<string>();
    if (Array.isArray(user?.managedScopes)) {
      user.managedScopes.forEach((s: any) => {
        if (s.branch) branches.add(s.branch.trim().toUpperCase());
      });
    }
    if (user?.branch) branches.add(user.branch.trim().toUpperCase());
    if (user?.department) branches.add(user.department.trim().toUpperCase());
    return Array.from(branches);
  }, [user]);

  const assignedScopeSections = useMemo(() => {
    const sections = new Set<string>();
    if (Array.isArray(user?.managedScopes)) {
      user.managedScopes.forEach((s: any) => {
        if (s.section) sections.add(s.section.trim().toUpperCase());
      });
    }
    if (user?.section) sections.add(user.section.trim().toUpperCase());
    return Array.from(sections);
  }, [user]);

  // Session Creation Form Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [customSubjectCode, setCustomSubjectCode] = useState('');

  // Building & Room Manual Inputs
  const [buildingName, setBuildingName] = useState('IT Block');
  const [isCustomBuilding, setIsCustomBuilding] = useState(false);
  const [customBuildingName, setCustomBuildingName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');

  // Cohort & Period
  const [academicYear, setAcademicYear] = useState('4th Year');
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('A');
  const [period, setPeriod] = useState('1');

  // Attendance Scanning Window Timer & Live Transition
  const [attendanceTimerMinutes, setAttendanceTimerMinutes] = useState(10);
  const [isCustomTimer, setIsCustomTimer] = useState(false);
  const [customTimerInput, setCustomTimerInput] = useState('10');
  const [creating, setCreating] = useState(false);
  const [isClosingAttendance, setIsClosingAttendance] = useState(false);

  // Biometric Face Verification for Session Launch
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false);
  const [pendingLaunchPayload, setPendingLaunchPayload] = useState<any | null>(null);

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

  // Sync assigned default values
  useEffect(() => {
    if (assignedSubjects.length > 0) {
      if (!selectedSubjectId && !isCustomSubject) {
        setSelectedSubjectId(assignedSubjects[0].id);
        setSubjectName(assignedSubjects[0].name);
        setSubjectCode(assignedSubjects[0].code);
      }
    } else {
      setIsCustomSubject(true);
    }
  }, [assignedSubjects, selectedSubjectId, isCustomSubject]);

  useEffect(() => {
    if (assignedScopeYears.length > 0 && !assignedScopeYears.includes(academicYear)) {
      setAcademicYear(assignedScopeYears[0]);
    }
    if (assignedScopeBranches.length > 0 && !assignedScopeBranches.includes(branch)) {
      setBranch(assignedScopeBranches[0]);
    }
    if (assignedScopeSections.length > 0 && !assignedScopeSections.includes(section)) {
      setSection(assignedScopeSections[0]);
    }
  }, [assignedScopeYears, assignedScopeBranches, assignedScopeSections]);

  // Load Rooms, Subjects, and Active Session
  const loadFacultyData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsRes, roomsRes, subjectsRes] = await Promise.all([
        attendanceApi.getActiveSessions().catch(() => ({ success: false, data: [] })),
        attendanceApi.getRooms().catch(() => ({ success: false, data: [] })),
        attendanceApi.getFacultySubjects().catch(() => ({ success: false, data: [] })),
      ]);

      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
      }

      if (subjectsRes.success && subjectsRes.data && subjectsRes.data.length > 0) {
        setSubjects(subjectsRes.data);
      }

      if (sessionsRes.success && sessionsRes.data && sessionsRes.data.length > 0) {
        const session = sessionsRes.data[0];
        setActiveSession(session);
        fetchRoster(session._id);
      } else {
        setActiveSession(null);
        setRoster([]);
      }
    } catch (err) {
      console.error('Error fetching faculty attendance data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchRoster = async (sessionId: string) => {
    try {
      const res = await attendanceApi.getSessionById(sessionId);
      if (res.success) {
        setRoster(res.records || []);
      }
    } catch (err) {
      console.error('Error fetching session roster:', err);
    }
  };

  useEffect(() => {
    loadFacultyData();
  }, [loadFacultyData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFacultyData();
  };

  // 15-Second Token Rotation Loop (Only active while attendance is open)
  useEffect(() => {
    if (!activeSession || activeSession.attendanceClosed || activeSession.lectureStatus === 'LIVE_CLASS') {
      return;
    }

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          attendanceApi
            .rotateToken(activeSession._id)
            .then((rotRes) => {
              if (rotRes.success && rotRes.qr) {
                setActiveSession((s) => (s ? { ...s, qrSessionIdentifier: rotRes.qr.token } : null));
              }
            })
            .catch((e) => console.warn('Auto-rotate token error', e));

          fetchRoster(activeSession._id);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, activeSession?.attendanceClosed]);

  // Timing helper computations
  const getElapsedSeconds = (startTime?: string) => {
    if (!startTime) return 0;
    const s = new Date(startTime).getTime();
    return Math.max(0, Math.floor((currentClock - s) / 1000));
  };

  const formatDuration = (totalSecs: number) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatLiveTimer = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isAttendanceClosed = Boolean(activeSession?.attendanceClosed || activeSession?.lectureStatus === 'LIVE_CLASS');
  const windowRemainingSeconds = activeSession
    ? Math.max(0, (activeSession.attendanceTimerMinutes || 10) * 60 - getElapsedSeconds(activeSession.actualStartTime))
    : 0;

  // Handle Launch Session Submit
  const handleLaunchSession = async () => {
    const finalSubName = (isCustomSubject ? customSubjectName : subjectName).trim();
    const finalSubCode = (isCustomSubject ? customSubjectCode : subjectCode).trim();
    if (!finalSubName) {
      Alert.alert('Required Field', 'Please select or enter an assigned Course / Subject.');
      return;
    }

    const finalBlock = (isCustomBuilding ? customBuildingName : buildingName).trim();
    if (!finalBlock) {
      Alert.alert('Required Field', 'Please select or enter a Campus Block / Building.');
      return;
    }

    const cleanRoom = roomNumber.trim();
    if (!cleanRoom) {
      Alert.alert('Required Field', 'Please enter a Room Number / Lab manually.');
      return;
    }

    if (!period.trim()) {
      Alert.alert('Required Field', 'Please enter a Period Number.');
      return;
    }

    const finalTimer = isCustomTimer ? Math.max(1, parseInt(customTimerInput, 10) || 10) : attendanceTimerMinutes;

    if (isBiometricEnrolled) {
      setBiometricModalVisible(true);
    } else {
      await executeLaunchSession();
    }
  };

  // Launch Live Attendance Session (with optional verified face token)
  const executeLaunchSession = async (faceVerificationToken?: string) => {
    const finalSubName = (isCustomSubject ? customSubjectName : subjectName).trim();
    const finalSubCode = isCustomSubject ? customSubjectCode.trim() : subjectCode;
    const finalBlock = (isCustomBuilding ? customBuildingName : buildingName).trim();
    const cleanRoom = roomNumber.trim();
    const finalTimer = isCustomTimer ? Math.max(1, parseInt(customTimerInput, 10) || 10) : attendanceTimerMinutes;

    try {
      setCreating(true);

      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        let granted = perm.status === 'granted';
        if (!granted) {
          const req = await Location.requestForegroundPermissionsAsync();
          granted = req.status === 'granted';
        }
        if (granted) {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
      } catch (locErr) {
        console.warn('GPS coordinates acquisition skipped for session launch:', locErr);
      }

      const matchedRoom = rooms.find(
        (r) =>
          r.buildingName?.trim().toLowerCase() === finalBlock.toLowerCase() &&
          r.roomNumber?.trim().toLowerCase() === cleanRoom.toLowerCase()
      ) || rooms.find((r) => r.roomNumber?.trim().toLowerCase() === cleanRoom.toLowerCase());

      const res = await attendanceApi.createSession({
        roomId: matchedRoom?._id || undefined,
        roomNumber: cleanRoom,
        buildingName: finalBlock,
        subjectId: (!isCustomSubject && selectedSubjectId) ? selectedSubjectId : undefined as any,
        subjectName: finalSubName,
        subjectCode: finalSubCode || 'ACAD',
        branch: branch.trim(),
        section: section.trim(),
        academicYear: academicYear.trim(),
        period: period.trim(),
        attendanceTimerMinutes: finalTimer,
        latitude: lat,
        longitude: lng,
        qrRefreshInterval: 15,
        geofenceEnforced: true,
        faceVerificationToken,
      } as any);

      if (res.success && res.data) {
        setCreateModalVisible(false);
        setActiveSession(res.data);
        setTimerSeconds(15);
        Alert.alert(
          'Attendance Scanning Window Active',
          `Attendance window set for ${finalTimer} minutes. When check-in concludes, tap 'Close Attendance & Mark Class LIVE' to officially start the live class.`
        );
      } else {
        Alert.alert('Session Error', res.error || 'Failed to start session.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Server error launching session.';
      Alert.alert('Launch Rejected', msg);
    } finally {
      setCreating(false);
    }
  };

  // Close Attendance Window & Transition Class to LIVE
  const handleCloseAttendance = async () => {
    if (!activeSession?._id || isClosingAttendance) return;

    Alert.alert(
      'Close Attendance & Mark Class LIVE',
      'Closing attendance will immediately lock student scanning, deactivate dynamic QR, and transition this class to LIVE in session.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Go LIVE',
          style: 'default',
          onPress: async () => {
            try {
              setIsClosingAttendance(true);
              const res = await attendanceApi.closeAttendance(activeSession._id);
              if (res.success && res.session) {
                setActiveSession(res.session);
                Alert.alert(
                  'Class is LIVE',
                  'Attendance scanning window is closed and locked. Classroom lecture is now LIVE in progress.'
                );
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to close attendance.');
            } finally {
              setIsClosingAttendance(false);
            }
          },
        },
      ]
    );
  };

  // Close & Finalize Session Entirely
  const handleCloseSession = () => {
    if (!activeSession) return;

    Alert.alert(
      'Finalize Live Class Lecture',
      'Ending the class will lock all records and evaluate students against statutory attendance thresholds. Students who did not scan will be marked ABSENT.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Class & Finalize',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await attendanceApi.closeSession(activeSession._id);
              if (res.success) {
                setActiveSession(null);
                setRoster([]);
                Alert.alert(
                  'Lecture Finalized',
                  'Attendance roster locked and lecture concluded. Absence evaluations recorded.',
                  [
                    { text: 'Done', style: 'cancel' },
                    {
                      text: 'View Absence Alerts',
                      onPress: () => navigation.navigate('FacultyGuardianAlerts'),
                    },
                  ]
                );
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to finalize session.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const qrPayload = activeSession
    ? `${activeSession._id}:${activeSession.qrSessionIdentifier || 'TOKEN'}`
    : '';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
    qrPayload
  )}`;

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Faculty Attendance Hub</Text>
            <Text style={styles.subtitle}>Dynamic Lecture QR &bull; Room Geofence &bull; Live Roster</Text>
          </View>
          {!activeSession && (
            <TouchableOpacity
              style={styles.newSessionBtn}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.newSessionBtnText}>+ Launch Session</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 1. ACTIVE LIVE SESSION VIEW */}
        {activeSession ? (
          <View>
            {/* Live Session Status Strip */}
            <View style={[styles.liveSessionBanner, isAttendanceClosed && styles.liveSessionBannerRed]}>
              <View style={styles.liveIndicatorRow}>
                <View style={[styles.liveDot, isAttendanceClosed && styles.liveDotRed]} />
                <Text style={[styles.liveBadgeText, isAttendanceClosed && styles.liveBadgeTextRed]}>
                  {isAttendanceClosed ? '🔴 LIVE CLASS IN PROGRESS' : '📡 ATTENDANCE SCANNING OPEN'}
                </Text>
                {isAttendanceClosed ? (
                  <Text style={styles.liveTimerText}>
                    ⏱️ {formatLiveTimer(getElapsedSeconds(activeSession.actualStartTime))}
                  </Text>
                ) : (
                  <Text style={styles.timerCountdownText}>
                    ⏳ {formatDuration(windowRemainingSeconds)} (QR: {timerSeconds}s)
                  </Text>
                )}
              </View>

              <Text style={styles.sessionSubjectTitle}>
                {activeSession.subjectId?.name || (activeSession as any).subject?.name || (activeSession as any).subjectName || subjectName}
              </Text>

              <View style={styles.sessionMetaPillsRow}>
                <Text style={styles.sessionMetaPill}>
                  {activeSession.roomId?.buildingName || (activeSession as any).buildingName || buildingName} • Room {activeSession.roomId?.roomNumber || (activeSession as any).roomNumber || roomNumber}
                </Text>
                <Text style={styles.sessionMetaPill}>
                  {activeSession.academicYear || academicYear} • {activeSession.branch} (Sec {activeSession.section})
                </Text>
                <Text style={styles.sessionMetaPill}>
                  Period {activeSession.period}
                </Text>
                {isAttendanceClosed && (
                  <Text style={[styles.sessionMetaPill, { backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5' }]}>
                    🔒 Attendance Locked
                  </Text>
                )}
              </View>

              {/* Scanning Active Notice */}
              {!isAttendanceClosed && (
                <View style={styles.scanNoticeBox}>
                  <Text style={styles.scanNoticeText}>
                    ⏳ <Text style={{ fontWeight: '800', color: '#93c5fd' }}>Attendance Scanning Active ({activeSession.attendanceTimerMinutes || 10}m):</Text> Students in room can scan via mobile. When check-in completes, tap below to mark the class <Text style={{ fontWeight: '800', color: '#fca5a5' }}>LIVE</Text>.
                  </Text>
                </View>
              )}

              {/* Dynamic QR Code Display OR Live Lecture Box */}
              {!isAttendanceClosed ? (
                <View style={styles.qrCardContainer}>
                  <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
                  <Text style={styles.qrTokenText} selectable={true}>
                    Token: {activeSession.qrSessionIdentifier}
                  </Text>
                  <Text style={styles.qrSubPrompt}>
                    Rotates every 15s • Geofence Active (±{activeSession.roomId?.geofenceRadiusMeters || 30}m)
                  </Text>
                </View>
              ) : (
                <View style={styles.liveLectureCardContainer}>
                  <View style={styles.liveMicCircle}>
                    <Text style={{ fontSize: 34 }}>🎙️</Text>
                  </View>
                  <Text style={styles.liveLectureTitle}>Class is Live in Session</Text>
                  <Text style={styles.liveLectureSub}>
                    Attendance scanning has ended and roster is locked. Dynamic QR is deactivated.
                  </Text>

                  <View style={styles.liveStopwatchCard}>
                    <Text style={styles.stopwatchLabel}>ACTIVE LECTURE STOPWATCH</Text>
                    <Text style={styles.stopwatchTimer}>
                      {formatLiveTimer(getElapsedSeconds(activeSession.actualStartTime))}
                    </Text>
                  </View>
                </View>
              )}

              {/* Live Attendee Stats Meter */}
              <View style={styles.attendeeCounterBox}>
                <View>
                  <Text style={styles.counterLabel}>Verified Attendees Present</Text>
                  <Text style={styles.counterNumbers}>
                    {roster.length} / {activeSession.totalEnrolled || 60}
                  </Text>
                </View>
                <Text style={styles.pctNumber}>
                  {Math.round((roster.length / (activeSession.totalEnrolled || 60)) * 100)}%
                </Text>
              </View>

              {/* Action Buttons: 2-Stage Lifecycle */}
              {!isAttendanceClosed ? (
                <TouchableOpacity
                  style={styles.closeAttendanceBtn}
                  onPress={handleCloseAttendance}
                  disabled={isClosingAttendance}
                >
                  <Text style={styles.closeAttendanceBtnText}>
                    {isClosingAttendance ? 'Locking Attendance...' : '🔒 Close Attendance & Mark Class LIVE'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.closeSessionBtn} onPress={handleCloseSession}>
                  <Text style={styles.closeSessionBtnText}>
                    🏁 End Live Class &amp; Finalize Session
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Live Present Students Roster */}
            <Text style={styles.rosterSectionTitle}>Live Attendee Check-In Roster ({roster.length})</Text>
            {roster.length > 0 ? (
              roster.map((record, index) => {
                const isLate = record.status === 'LATE';
                const isExcused = record.status === 'EXCUSED';
                const isAbsent = record.status === 'ABSENT';

                let tagBg = 'rgba(16, 185, 129, 0.15)';
                let tagColor = '#10B981';
                if (isLate) {
                  tagBg = 'rgba(245, 158, 11, 0.15)';
                  tagColor = '#F59E0B';
                } else if (isExcused) {
                  tagBg = 'rgba(59, 130, 246, 0.15)';
                  tagColor = '#3B82F6';
                } else if (isAbsent) {
                  tagBg = 'rgba(239, 68, 68, 0.15)';
                  tagColor = '#EF4444';
                }

                const timeStr = record.scannedAt || record.markedAt;
                const formattedTime = timeStr
                  ? new Date(timeStr).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—';

                return (
                  <View key={record._id || index} style={styles.rosterRowCard}>
                    <View style={styles.rosterLeft}>
                      <Text style={styles.rosterIndex}>{index + 1}.</Text>
                      <View>
                        <Text style={styles.rosterName}>{record.studentName || 'Student'}</Text>
                        <Text style={styles.rosterRoll}>{record.rollNumber || 'N/A'}</Text>
                      </View>
                    </View>

                    <View style={styles.rosterRight}>
                      <View style={[styles.verifiedTag, { backgroundColor: tagBg }]}>
                        <Text style={[styles.verifiedTagText, { color: tagColor }]}>
                          {record.status || 'PRESENT'}
                        </Text>
                      </View>
                      <Text style={styles.rosterTime}>{formattedTime}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.waitingRosterCard}>
                <ActivityIndicator color="#10B981" style={{ marginBottom: 8 }} />
                <Text style={styles.waitingTitle}>Waiting for student check-ins...</Text>
                <Text style={styles.waitingSub}>
                  Students scanning the projected QR with high-accuracy GPS will appear here in real-time.
                </Text>
              </View>
            )}
          </View>
        ) : (
          /* 2. INACTIVE STATE: NO SESSION RUNNING */
          <View style={styles.inactiveStateCard}>
            <View style={styles.inactiveIconPill}>
              <View style={styles.inactiveDot} />
            </View>
            <Text style={styles.inactiveTitle}>No Live Session in Progress</Text>
            <Text style={styles.inactiveDesc}>
              Launch an attendance session for your assigned subjects and scopes. The system enforces dynamic cryptographic QR tokens, physical room geofencing, and transitions to live class tracking.
            </Text>

            <Button
              title="Launch Attendance Session"
              onPress={() => setCreateModalVisible(true)}
              style={styles.launchBtn}
            />
          </View>
        )}
      </ScrollView>

      {/* Launch New Session Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalCard}>
              <Text style={styles.modalHeaderTitle}>Configure Class Lecture Session</Text>
              <Text style={styles.modalHeaderSub}>
                Assigned teaching scopes and manual location controls:
              </Text>

              {/* 1. ASSIGNED SUBJECTS ONLY */}
              <Text style={styles.inputLabel}>Course / Subject (Assigned to Faculty)</Text>
              <View style={styles.pillsWrap}>
                {assignedSubjects.map((s) => {
                  const isSelected = !isCustomSubject && (selectedSubjectId === s.id || subjectName === s.name);
                  return (
                    <TouchableOpacity
                      key={s.id || s.code}
                      style={[styles.scopePill, isSelected && styles.scopePillActive]}
                      onPress={() => {
                        setIsCustomSubject(false);
                        setSelectedSubjectId(s.id);
                        setSubjectName(s.name);
                        setSubjectCode(s.code);
                        if (s.branch) setBranch(s.branch);
                      }}
                    >
                      <Text style={[styles.scopePillText, isSelected && styles.scopePillTextActive]}>
                        {s.name} ({s.code})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.scopePill, isCustomSubject && styles.scopePillActive]}
                  onPress={() => setIsCustomSubject(true)}
                >
                  <Text style={[styles.scopePillText, isCustomSubject && styles.scopePillTextActive]}>
                    ✏️ + Other / Custom Subject
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomSubject && (
                <View style={styles.customInputBoxWrap}>
                  <Text style={styles.inputSubLabel}>Custom Subject Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={customSubjectName}
                    onChangeText={setCustomSubjectName}
                    placeholder="e.g. Advanced Operating Systems"
                    placeholderTextColor="#64748b"
                  />
                  <Text style={styles.inputSubLabel}>Subject Code</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={customSubjectCode}
                    onChangeText={setCustomSubjectCode}
                    placeholder="e.g. CS401"
                    placeholderTextColor="#64748b"
                  />
                </View>
              )}

              {/* 2. CAMPUS BLOCK / BUILDING (WITH MANUAL OPTION) */}
              <Text style={styles.inputLabel}>Campus Block / Building</Text>
              <View style={styles.pillsWrap}>
                {STANDARD_BLOCKS.map((blk) => {
                  const isSelected = !isCustomBuilding && buildingName === blk;
                  return (
                    <TouchableOpacity
                      key={blk}
                      style={[styles.scopePill, isSelected && styles.scopePillActive]}
                      onPress={() => {
                        setIsCustomBuilding(false);
                        setBuildingName(blk);
                      }}
                    >
                      <Text style={[styles.scopePillText, isSelected && styles.scopePillTextActive]}>
                        {blk}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.scopePill, isCustomBuilding && styles.scopePillActive]}
                  onPress={() => setIsCustomBuilding(true)}
                >
                  <Text style={[styles.scopePillText, isCustomBuilding && styles.scopePillTextActive]}>
                    🏢 + Other / Custom Block
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomBuilding && (
                <View style={styles.customInputBoxWrap}>
                  <Text style={styles.inputSubLabel}>Manual Building / Block Name</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={customBuildingName}
                    onChangeText={setCustomBuildingName}
                    placeholder="e.g. Science Complex / Seminar Hall"
                    placeholderTextColor="#64748b"
                  />
                </View>
              )}

              {/* 3. ROOM NUMBER (MANUAL ENTRY ONLY) */}
              <Text style={styles.inputLabel}>Room Number / Lab (Manual Entry)</Text>
              <TextInput
                style={styles.modalInput}
                value={roomNumber}
                onChangeText={setRoomNumber}
                placeholder="e.g. 3501, Lab 03, Room 102"
                placeholderTextColor="#64748b"
              />

              {/* 4. ACADEMIC YEAR (ASSIGNED SCOPE YEARS ONLY) */}
              <Text style={styles.inputLabel}>Academic Year (Assigned Scopes)</Text>
              <View style={styles.pillsWrap}>
                {(assignedScopeYears.length > 0 ? assignedScopeYears : STANDARD_YEARS).map((yr) => {
                  const isSelected = academicYear === yr;
                  return (
                    <TouchableOpacity
                      key={yr}
                      style={[styles.scopePill, isSelected && styles.scopePillActive]}
                      onPress={() => setAcademicYear(yr)}
                    >
                      <Text style={[styles.scopePillText, isSelected && styles.scopePillTextActive]}>
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 5. BRANCH / DEPARTMENT & SECTION (ASSIGNED SCOPES ONLY) */}
              <View style={styles.rowInputs}>
                <View style={{ flex: 1.2 }}>
                  <Text style={styles.inputLabel}>Branch (Assigned)</Text>
                  <View style={styles.pillsWrap}>
                    {(assignedScopeBranches.length > 0 ? assignedScopeBranches : STANDARD_BRANCHES).map((br) => {
                      const isSelected = branch === br;
                      return (
                        <TouchableOpacity
                          key={br}
                          style={[styles.scopePillSmall, isSelected && styles.scopePillActive]}
                          onPress={() => setBranch(br)}
                        >
                          <Text style={[styles.scopePillText, isSelected && styles.scopePillTextActive]}>
                            {br}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Section (Assigned)</Text>
                  <View style={styles.pillsWrap}>
                    {(assignedScopeSections.length > 0 ? assignedScopeSections : STANDARD_SECTIONS).map((sec) => {
                      const isSelected = section === sec;
                      return (
                        <TouchableOpacity
                          key={sec}
                          style={[styles.scopePillSmall, isSelected && styles.scopePillActive]}
                          onPress={() => setSection(sec)}
                        >
                          <Text style={[styles.scopePillText, isSelected && styles.scopePillTextActive]}>
                            Sec {sec}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              {/* 6. PERIOD NUMBER (MANUAL ENTRY) */}
              <Text style={styles.inputLabel}>Period Number (Manual Entry)</Text>
              <TextInput
                style={styles.modalInput}
                value={period}
                onChangeText={setPeriod}
                placeholder="e.g. 1, 2, 3, or Lab Slot"
                placeholderTextColor="#64748b"
              />
              <View style={[styles.pillsWrap, { marginBottom: 12 }]}>
                {PERIOD_PRESETS.map((p) => {
                  const isSelected = period === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[styles.scopePillSmall, isSelected && styles.scopePillActive]}
                      onPress={() => setPeriod(p)}
                    >
                      <Text style={[styles.scopePillText, isSelected && styles.scopePillTextActive]}>
                        P{p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 7. ATTENDANCE SCANNING WINDOW TIMER */}
              <Text style={styles.inputLabel}>Attendance Window Timer (Minutes)</Text>
              <View style={styles.pillsWrap}>
                {TIMER_PRESETS.map((mins) => {
                  const isSelected = !isCustomTimer && attendanceTimerMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      style={[styles.scopePillSmall, isSelected && styles.scopePillActive]}
                      onPress={() => {
                        setIsCustomTimer(false);
                        setAttendanceTimerMinutes(mins);
                      }}
                    >
                      <Text style={[styles.scopePillText, isSelected && styles.scopePillTextActive]}>
                        ⏱️ {mins}m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.scopePillSmall, isCustomTimer && styles.scopePillActive]}
                  onPress={() => setIsCustomTimer(true)}
                >
                  <Text style={[styles.scopePillText, isCustomTimer && styles.scopePillTextActive]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomTimer && (
                <View style={styles.customInputBoxWrap}>
                  <Text style={styles.inputSubLabel}>Custom Scanning Minutes</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={customTimerInput}
                    onChangeText={setCustomTimerInput}
                    placeholder="e.g. 12"
                    keyboardType="numeric"
                    placeholderTextColor="#64748b"
                  />
                </View>
              )}

              {/* Actions */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalStartBtn}
                  onPress={handleLaunchSession}
                  disabled={creating}
                >
                  <Text style={styles.modalStartBtnText}>
                    {creating ? 'Starting...' : 'Start Attendance Session'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Faculty Face Biometric Verification Modal */}
      <FaceBiometricModal
        visible={biometricModalVisible}
        mode="VERIFY"
        purpose="FACULTY_SESSION_LAUNCH"
        title="Faculty Identity Verification"
        onSuccess={(faceToken) => {
          setBiometricModalVisible(false);
          executeLaunchSession(faceToken);
        }}
        onClose={() => setBiometricModalVisible(false)}
        onFallback={() => {
          setBiometricModalVisible(false);
          executeLaunchSession();
        }}
        fallbackLabel="Continue with Non-Biometric Authorization"
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  newSessionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newSessionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  liveSessionBanner: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginBottom: 20,
  },
  liveSessionBannerRed: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  liveDotRed: {
    backgroundColor: '#ef4444',
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  liveBadgeTextRed: {
    color: '#ef4444',
  },
  timerCountdownText: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#93c5fd',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  liveTimerText: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#fca5a5',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sessionSubjectTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  sessionMetaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  sessionMetaPill: {
    fontSize: 11,
    color: '#cbd5e1',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scanNoticeBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  scanNoticeText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  qrCardContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  qrImage: {
    width: 250,
    height: 250,
    borderRadius: 8,
  },
  qrTokenText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#334155',
    marginTop: 8,
    fontWeight: '700',
  },
  qrSubPrompt: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  liveLectureCardContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 14,
    padding: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  liveMicCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  liveLectureTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  liveLectureSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  liveStopwatchCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stopwatchLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  stopwatchTimer: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fca5a5',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  attendeeCounterBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  counterLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  counterNumbers: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  pctNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10B981',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  closeAttendanceBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeAttendanceBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  closeSessionBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeSessionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  rosterSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  rosterRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 6,
  },
  rosterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rosterIndex: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    width: 20,
  },
  rosterName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  rosterRoll: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  rosterRight: {
    alignItems: 'flex-end',
  },
  verifiedTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  verifiedTagText: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: '700',
  },
  rosterTime: {
    fontSize: 10,
    color: '#64748b',
  },
  waitingRosterCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  waitingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  waitingSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  inactiveStateCard: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: 20,
  },
  inactiveTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  inactiveDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  launchBtn: {
    backgroundColor: '#10B981',
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 16,
    paddingVertical: 32,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  modalHeaderSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 14,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 4,
  },
  inputSubLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 13,
    marginBottom: 10,
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  scopePill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  scopePillSmall: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scopePillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  scopePillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  scopePillTextActive: {
    color: '#34d399',
    fontWeight: '700',
  },
  customInputBoxWrap: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  modalStartBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalStartBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  inactiveIconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(51, 65, 85, 0.4)',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  inactiveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#64748B',
  },
});
