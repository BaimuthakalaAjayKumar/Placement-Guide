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
  TextInput,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { THEME } from '../../utils/constants';
import { attendanceApi, ActiveSession, AttendanceRoom } from '../../api/attendanceApi';

export const FacultyAttendanceScreen: React.FC = () => {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [rooms, setRooms] = useState<AttendanceRoom[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(15);

  // New Session Creation Form Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [subjectName, setSubjectName] = useState('Operating Systems (CS401)');
  const [subjectId, setSubjectId] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('A');
  const [academicYear, setAcademicYear] = useState('4th Year');
  const [period, setPeriod] = useState('1');
  const [creating, setCreating] = useState(false);

  // Rotation Interval Ref
  const rotationTimerRef = useRef<any>(null);

  // Load Rooms and Active Session
  const loadFacultyData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsRes, roomsRes] = await Promise.all([
        attendanceApi.getActiveSessions().catch(() => ({ success: false, data: [] })),
        attendanceApi.getRooms().catch(() => ({ success: false, data: [] })),
      ]);

      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data);
        if (roomsRes.data.length > 0 && !selectedRoomId) {
          setSelectedRoomId(roomsRes.data[0]._id);
        }
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
  }, [selectedRoomId]);

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

  // 15-Second Token Rotation Loop
  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          // Trigger Token Rotation
          attendanceApi
            .rotateToken(activeSession._id)
            .then((rotRes) => {
              if (rotRes.success && rotRes.qr) {
                setActiveSession((s) => (s ? { ...s, qrSessionIdentifier: rotRes.qr.token } : null));
              }
            })
            .catch((e) => console.warn('Auto-rotate token error', e));

          // Also refresh live attendees roster
          fetchRoster(activeSession._id);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Handle Launch Session Submit
  const handleLaunchSession = async () => {
    if (!selectedRoomId) {
      Alert.alert('Required Field', 'Please select a designated classroom / lab.');
      return;
    }

    try {
      setCreating(true);
      const res = await attendanceApi.createSession({
        roomId: selectedRoomId,
        subjectId: subjectId || selectedRoomId, // fallback to room or mock ID
        branch,
        section,
        academicYear,
        period,
        qrRefreshInterval: 15,
        geofenceEnforced: true,
      });

      if (res.success && res.data) {
        setCreateModalVisible(false);
        setActiveSession(res.data);
        setTimerSeconds(15);
        Alert.alert('Live Session Launched', 'Dynamic 15-second QR rotation and room geofencing active.');
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

  // Handle Close Session
  const handleCloseSession = () => {
    if (!activeSession) return;

    Alert.alert(
      'Close Attendance Session',
      'Closing the session will lock the attendance roster and trigger statutory 75% shortage evaluations. Students who did not scan will be marked ABSENT.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Close',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await attendanceApi.closeSession(activeSession._id);
              if (res.success) {
                setActiveSession(null);
                setRoster([]);
                Alert.alert('Session Finalized', 'Attendance recorded and synchronized with examination records.');
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to close session.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // QR Payload String for Scanner
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
            <Text style={styles.subtitle}>Dynamic Lecture QR &amp; Live Present Roster</Text>
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
            <View style={styles.liveSessionBanner}>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>LIVE SESSION ACTIVE</Text>
                <Text style={styles.timerCountdownText}>Refreshing in {timerSeconds}s</Text>
              </View>

              <Text style={styles.sessionSubjectTitle}>
                {activeSession.subjectId?.name || subjectName}
              </Text>

              <View style={styles.sessionMetaPillsRow}>
                <Text style={styles.sessionMetaPill}>
                  🏛️ {activeSession.roomId?.buildingName} • Room {activeSession.roomId?.roomNumber}
                </Text>
                <Text style={styles.sessionMetaPill}>
                  👥 {activeSession.branch} - Sec {activeSession.section}
                </Text>
                <Text style={styles.sessionMetaPill}>
                  ⏱️ Period {activeSession.period}
                </Text>
              </View>

              {/* Dynamic QR Code Display */}
              <View style={styles.qrCardContainer}>
                <Image source={{ uri: qrImageUrl }} style={styles.qrImage} />
                <Text style={styles.qrTokenText} selectable={true}>
                  Token: {activeSession.qrSessionIdentifier}
                </Text>
                <Text style={styles.qrSubPrompt}>
                  Rotate every 15s • Project on classroom screen
                </Text>
              </View>

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

              {/* Close Session Button */}
              <TouchableOpacity style={styles.closeSessionBtn} onPress={handleCloseSession}>
                <Text style={styles.closeSessionBtnText}>⏹️ Close Session &amp; Mark Absentees</Text>
              </TouchableOpacity>
            </View>

            {/* Live Present Students Roster */}
            <Text style={styles.rosterSectionTitle}>Live Attendee Check-In Roster ({roster.length})</Text>
            {roster.length > 0 ? (
              roster.map((record, index) => (
                <View key={record._id || index} style={styles.rosterRowCard}>
                  <View style={styles.rosterLeft}>
                    <Text style={styles.rosterIndex}>{index + 1}.</Text>
                    <View>
                      <Text style={styles.rosterName}>{record.studentName || 'Student Candidate'}</Text>
                      <Text style={styles.rosterRoll}>{record.rollNumber || '21BCE1042'}</Text>
                    </View>
                  </View>

                  <View style={styles.rosterRight}>
                    <View style={styles.verifiedTag}>
                      <Text style={styles.verifiedTagText}>✓ Present</Text>
                    </View>
                    <Text style={styles.rosterTime}>
                      {new Date(record.scannedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))
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
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={styles.inactiveTitle}>No Live Session in Progress</Text>
            <Text style={styles.inactiveDesc}>
              Launch a dynamic QR lecture session for your assigned branch and section. The system will enforce 15-second rotating cryptographic tokens and room geofencing.
            </Text>

            <Button
              title="🚀 Launch Live Class Attendance Session"
              onPress={() => setCreateModalVisible(true)}
              style={styles.launchBtn}
            />
          </View>
        )}
      </ScrollView>

      {/* Launch New Session Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalHeaderTitle}>Configure Class Lecture Session</Text>
            <Text style={styles.modalHeaderSub}>
              Select the lecture room and enrolled cohort to initiate geofenced check-in:
            </Text>

            <Text style={styles.inputLabel}>Subject / Course</Text>
            <TextInput
              style={styles.modalInput}
              value={subjectName}
              onChangeText={setSubjectName}
              placeholder="e.g. Operating Systems (CS401)"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputLabel}>Lecture Room / Lab</Text>
            <View style={styles.roomSelectWrap}>
              {rooms.length > 0 ? (
                rooms.slice(0, 4).map((r) => (
                  <TouchableOpacity
                    key={r._id}
                    style={[styles.roomPill, selectedRoomId === r._id && styles.roomPillActive]}
                    onPress={() => setSelectedRoomId(r._id)}
                  >
                    <Text style={[styles.roomPillText, selectedRoomId === r._id && styles.roomPillTextActive]}>
                      {r.buildingName} • {r.roomNumber} (±{r.geofenceRadiusMeters}m)
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <TouchableOpacity
                  style={[styles.roomPill, styles.roomPillActive]}
                  onPress={() => setSelectedRoomId('default_room')}
                >
                  <Text style={[styles.roomPillText, styles.roomPillTextActive]}>
                    Computing Block • Lab 03 (±30m Geofence)
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.rowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Branch</Text>
                <TextInput
                  style={styles.modalInput}
                  value={branch}
                  onChangeText={setBranch}
                  placeholder="CSE"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Section</Text>
                <TextInput
                  style={styles.modalInput}
                  value={section}
                  onChangeText={setSection}
                  placeholder="A"
                  placeholderTextColor="#64748b"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Period</Text>
                <TextInput
                  style={styles.modalInput}
                  value={period}
                  onChangeText={setPeriod}
                  placeholder="1"
                  placeholderTextColor="#64748b"
                />
              </View>
            </View>

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
                  {creating ? 'Starting...' : '🚀 Start Live QR Session'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  timerCountdownText: {
    marginLeft: 'auto',
    fontSize: 12,
    color: '#ffa116',
    fontWeight: '700',
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
  closeSessionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeSessionBtnText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
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
    fontWeight: '600',
    color: '#cbd5e1',
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
    marginBottom: 12,
  },
  roomSelectWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  roomPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roomPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  roomPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  roomPillTextActive: {
    color: '#34d399',
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
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
});
