import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAuth } from '../../context/AuthContext';
import { attendanceApi } from '../../api/attendanceApi';
import { THEME } from '../../utils/constants';

interface TimetableSlot {
  id: string;
  period: string;
  subjectName: string;
  subjectCode: string;
  facultyName: string;
  roomNumber: string;
  buildingName?: string;
  cohort: string;
  startTime?: string;
  endTime?: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'FINALIZED' | 'CANCELLED';
  rawDate?: string;
  dayOfWeek?: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TimetableScreen: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role ? user.role.toLowerCase() : 'student';

  // Default to current weekday (Mon=0, Tue=1, ..., Sat=5, Sun defaults to Mon)
  const currentDayIndex = useMemo(() => {
    const day = new Date().getDay(); // 0 is Sunday
    return day === 0 ? 0 : Math.min(5, day - 1);
  }, []);

  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(currentDayIndex);
  const [scheduleSlots, setScheduleSlots] = useState<TimetableSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadScheduleData = useCallback(async () => {
    setErrorMessage(null);
    try {
      if (role === 'student') {
        const res = await attendanceApi.getStudentHistory();
        if (res.success && res.data) {
          const slots: TimetableSlot[] = res.data.map((item: any) => {
            const sess = item.sessionId || {};
            const dateObj = new Date(sess.sessionDate || item.date || item.scannedAt || Date.now());
            const dayOfWeek = dateObj.getDay();
            const periodStr = sess.period || '1';

            return {
              id: item._id || sess._id,
              period: periodStr,
              subjectName: sess.subjectId?.name || item.subject?.name || 'Class Lecture',
              subjectCode: sess.subjectId?.code || item.subject?.code || 'SUBJ',
              facultyName: sess.facultyId?.name || item.faculty || 'Assigned Faculty',
              roomNumber: sess.roomId?.roomNumber || item.room || 'Designated Room',
              buildingName: sess.roomId?.buildingName,
              cohort: sess.branch ? `${sess.branch}-${sess.section}` : `${user?.branch || 'Campus'}-${user?.section || 'A'}`,
              startTime: sess.scheduledStartTime || sess.actualStartTime,
              endTime: sess.scheduledEndTime || sess.actualEndTime,
              status: sess.status || (item.status === 'PRESENT' ? 'FINALIZED' : 'SCHEDULED'),
              rawDate: dateObj.toISOString(),
              dayOfWeek,
            };
          });
          setScheduleSlots(slots);
        }
      } else {
        // Faculty, HOD, Principal, Director: load session records
        const res = await attendanceApi.getSessionHistory();
        if (res.success && res.sessions) {
          const slots: TimetableSlot[] = res.sessions.map((sess: any) => {
            const dateObj = new Date(sess.sessionDate || sess.createdAt || Date.now());
            const dayOfWeek = dateObj.getDay();
            const periodStr = sess.period || '1';

            return {
              id: sess._id,
              period: periodStr,
              subjectName: sess.subject?.name || sess.subjectId?.name || 'Course Lecture',
              subjectCode: sess.subject?.code || sess.subjectId?.code || 'CODE',
              facultyName: sess.faculty?.name || sess.facultyId?.name || user?.name || 'Instructor',
              roomNumber: sess.room?.roomNumber || sess.roomId?.roomNumber || 'Room',
              buildingName: sess.room?.buildingName || sess.roomId?.buildingName,
              cohort: `${sess.branch || 'Campus'}-${sess.section || 'A'}`,
              startTime: sess.scheduledStartTime || sess.actualStartTime,
              endTime: sess.scheduledEndTime || sess.actualEndTime,
              status: sess.status || 'SCHEDULED',
              rawDate: dateObj.toISOString(),
              dayOfWeek,
            };
          });
          setScheduleSlots(slots);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || 'Failed to retrieve academic schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, user?.branch, user?.name, user?.section]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadScheduleData();
  };

  // Filter slots for selected weekday (Mon=1, Tue=2, ..., Sat=6)
  const targetDayOfWeek = selectedDayIdx + 1; // 1 to 6
  const filteredSlots = scheduleSlots.filter(
    (slot) => slot.dayOfWeek === targetDayOfWeek
  );

  // Fallback: If no slots match the specific day filter, show available slots sorted by period
  const displaySlots =
    filteredSlots.length > 0
      ? filteredSlots
      : scheduleSlots.slice(0, 5); // Display active registered slots

  return (
    <ScreenContainer scrollable={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />
        ) : null}

        {/* 1. Header Information */}
        <View style={styles.headerCard}>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>
              {role.toUpperCase()} ACADEMIC TIMETABLE
            </Text>
          </View>
          <Text style={styles.headerTitle}>Class &amp; Lecture Schedule</Text>
          <Text style={styles.headerSubtitle}>
            {user?.branch ? `Department of ${user.branch}` : 'Campus Schedule'} • Section {user?.section || 'A'}
          </Text>
        </View>

        {/* 2. Day-of-Week Selector Tabs */}
        <View style={styles.daySelectorRow}>
          {WEEK_DAYS.map((dayName, idx) => {
            const isSelected = selectedDayIdx === idx;
            const isToday = currentDayIndex === idx;

            return (
              <TouchableOpacity
                key={dayName}
                style={[styles.dayTab, isSelected && styles.dayTabActive]}
                onPress={() => setSelectedDayIdx(idx)}
              >
                <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>
                  {dayName}
                </Text>
                {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. Schedule Slots List */}
        <View style={styles.scheduleHeaderRow}>
          <Text style={styles.sectionTitle}>
            {WEEK_DAYS[selectedDayIdx]}'s Academic Schedule ({displaySlots.length} Slots)
          </Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Retrieving curriculum schedule...</Text>
          </View>
        ) : displaySlots.length > 0 ? (
          displaySlots.map((slot, index) => {
            const isActive = slot.status === 'ACTIVE';
            return (
              <View key={slot.id || index} style={[styles.slotCard, isActive && styles.slotCardActive]}>
                <View style={styles.periodCol}>
                  <Text style={styles.periodLabel}>PERIOD</Text>
                  <Text style={styles.periodNumber}>{slot.period || index + 1}</Text>
                  {isActive && (
                    <View style={styles.liveTag}>
                      <Text style={styles.liveTagText}>LIVE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.slotDivider} />

                <View style={styles.slotDetails}>
                  <View style={styles.slotHeader}>
                    <Text style={styles.subjectTitle}>{slot.subjectName}</Text>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{slot.subjectCode}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      Instructor: {slot.facultyName}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      Room: {slot.buildingName ? `${slot.buildingName} • ` : ''}Room {slot.roomNumber}
                    </Text>
                    <Text style={styles.cohortText}>Cohort: {slot.cohort}</Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
            <Text style={styles.emptyText}>
              There are no classroom lectures or laboratory sessions registered on this day.
            </Text>
          </View>
        )}

        {/* 4. Institutional Master Timetable Notice */}
        <View style={styles.institutionalNote}>
          <Text style={styles.noteTitle}>Institutional Timetable Architecture</Text>
          <Text style={styles.noteBody}>
            Semester-wide weekly recurring slot assignments and laboratory rotations are configured by departmental administrators via the CampusBridge desktop web portal.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl,
  },
  headerCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  roleTagText: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },
  daySelectorRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: THEME.borderRadius.sm,
  },
  dayTabActive: {
    backgroundColor: THEME.colors.background,
  },
  dayTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  dayTabTextActive: {
    color: THEME.colors.text,
    fontWeight: '700',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.textMuted,
    marginTop: 3,
  },
  todayDotActive: {
    backgroundColor: THEME.colors.primary,
  },
  scheduleHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    letterSpacing: 0.3,
  },
  slotCard: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 8,
  },
  slotCardActive: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  periodCol: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodLabel: {
    fontSize: 9,
    color: THEME.colors.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  periodNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.colors.text,
    marginVertical: 2,
  },
  liveTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
  },
  slotDivider: {
    width: 1,
    backgroundColor: THEME.colors.border,
    marginHorizontal: 10,
  },
  slotDetails: {
    flex: 1,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
    flex: 1,
    marginRight: 6,
  },
  codeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  cohortText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.accent,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  institutionalNote: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: THEME.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: THEME.spacing.md,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
});
