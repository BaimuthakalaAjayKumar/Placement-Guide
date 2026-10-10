import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { leadershipApi, LeadershipClassSession } from '../api/leadershipApi';
import { THEME } from '../utils/constants';

interface LiveAttendeeRecord {
  _id?: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  status: string;
  verificationMethod?: string;
  scannedAt?: string;
  markedAt?: string;
  isFlaggedForReview?: boolean;
  flagReason?: string;
  locationVerificationStatus?: string;
}

interface LiveSessionRosterModalProps {
  visible: boolean;
  session: LeadershipClassSession | null;
  onClose: () => void;
}

export const LiveSessionRosterModal: React.FC<LiveSessionRosterModalProps> = ({
  visible,
  session,
  onClose,
}) => {
  const [records, setRecords] = useState<LiveAttendeeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (visible && session?._id) {
      setLoading(true);
      setErrorMessage(null);
      setRecords([]);

      leadershipApi
        .getSessionRoster(session._id)
        .then((res) => {
          if (isMounted) {
            if (res.success) {
              setRecords(res.records || []);
            } else {
              setErrorMessage('Unable to load attendance roster.');
            }
          }
        })
        .catch((err) => {
          if (isMounted) {
            setErrorMessage(err?.response?.data?.error || 'Failed to fetch session roster.');
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [visible, session?._id]);

  if (!visible || !session) return null;

  const presentCount = records.filter(
    (r) => r.status === 'PRESENT' || r.status === 'LATE'
  ).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <View style={styles.badgeRow}>
                <View style={styles.activePill}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activePillText}>{session.status || 'ACTIVE'}</Text>
                </View>
                <Text style={styles.cohortBadge}>
                  {session.branch} • Section {session.section}
                </Text>
              </View>
              <Text style={styles.subjectTitle}>
                {session.subject?.name || 'Class Session'}
              </Text>
              <Text style={styles.subjectCode}>
                {session.subject?.code ? `Course Code: ${session.subject.code}` : ''}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          {/* Operational Meta Row */}
          <View style={styles.metaBox}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Instructor</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {session.faculty?.name || 'Assigned Instructor'}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Classroom / Lab</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {session.room?.roomNumber
                  ? `${session.room.buildingName ? session.room.buildingName + ' • ' : ''}Rm ${session.room.roomNumber}`
                  : 'Designated Room'}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Schedule</Text>
              <Text style={styles.metaValue}>Period {session.period || '1'}</Text>
            </View>
          </View>

          {/* Live Progress Bar */}
          <View style={styles.progressBox}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressTextLabel}>Verified Check-In Progress</Text>
              <Text style={styles.progressTextValue}>
                {presentCount} Present / {session.totalEnrolled || '—'} Enrolled
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.max(
                        session.totalEnrolled
                          ? Math.round((presentCount / session.totalEnrolled) * 100)
                          : 0,
                        presentCount > 0 ? 5 : 0
                      )
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Roster Section Title */}
          <View style={styles.rosterSectionHeader}>
            <Text style={styles.rosterSectionTitle}>
              Real-Time Attendee Roster ({records.length})
            </Text>
          </View>

          {/* Content Area */}
          {loading ? (
            <View style={styles.stateCenter}>
              <ActivityIndicator color={THEME.colors.primary} size="large" />
              <Text style={styles.stateText}>Synchronizing live roster records...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateCenter}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : records.length > 0 ? (
            <ScrollView style={styles.rosterScroll} showsVerticalScrollIndicator={false}>
              {records.map((record, index) => {
                const isLate = record.status === 'LATE';
                const isExcused = record.status === 'EXCUSED';
                const isAbsent = record.status === 'ABSENT';

                let statusBadgeBg = 'rgba(16, 185, 129, 0.15)';
                let statusBadgeColor = '#10B981';
                if (isLate) {
                  statusBadgeBg = 'rgba(245, 158, 11, 0.15)';
                  statusBadgeColor = '#F59E0B';
                } else if (isExcused) {
                  statusBadgeBg = 'rgba(59, 130, 246, 0.15)';
                  statusBadgeColor = '#3B82F6';
                } else if (isAbsent) {
                  statusBadgeBg = 'rgba(239, 68, 68, 0.15)';
                  statusBadgeColor = '#EF4444';
                }

                const timeStr = record.scannedAt || record.markedAt;
                const formattedTime = timeStr
                  ? new Date(timeStr).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—';

                return (
                  <View key={record._id || record.studentId || index} style={styles.rosterRow}>
                    <View style={styles.studentInfoLeft}>
                      <Text style={styles.rowNumber}>{index + 1}.</Text>
                      <View>
                        <Text style={styles.studentName}>{record.studentName}</Text>
                        <Text style={styles.studentRoll}>
                          Roll: {record.rollNumber || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.studentInfoRight}>
                      <View style={[styles.statusTag, { backgroundColor: statusBadgeBg }]}>
                        <Text style={[styles.statusTagText, { color: statusBadgeColor }]}>
                          {record.status || 'PRESENT'}
                        </Text>
                      </View>
                      <Text style={styles.checkinTime}>{formattedTime}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.stateCenter}>
              <Text style={styles.emptyTitle}>No Attendee Check-Ins Yet</Text>
              <Text style={styles.emptyDesc}>
                Students scanning the dynamic lecture QR within classroom geofence range will populate this roster in real time.
              </Text>
            </View>
          )}

          {/* Footer Action */}
          <TouchableOpacity style={styles.footerCloseBtn} onPress={onClose}>
            <Text style={styles.footerCloseBtnText}>Close Roster View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    paddingRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  cohortBadge: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  subjectTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.text,
    lineHeight: 22,
  },
  subjectCode: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: THEME.colors.textMuted,
    fontWeight: '700',
  },
  metaBox: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  metaDivider: {
    width: 1,
    backgroundColor: THEME.colors.border,
    marginHorizontal: 8,
  },
  progressBox: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 14,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTextLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: '600',
  },
  progressTextValue: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  rosterSectionHeader: {
    marginBottom: 10,
  },
  rosterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    letterSpacing: 0.3,
  },
  rosterScroll: {
    maxHeight: 280,
    marginBottom: 12,
  },
  rosterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  studentInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowNumber: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    width: 26,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  studentRoll: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  studentInfoRight: {
    alignItems: 'flex-end',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  checkinTime: {
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 3,
  },
  stateCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  stateText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 16,
  },
  footerCloseBtn: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingVertical: 12,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
    marginTop: 6,
  },
  footerCloseBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
});
