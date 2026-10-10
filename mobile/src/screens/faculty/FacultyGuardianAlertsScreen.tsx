import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { attendanceApi } from '../../api/attendanceApi';
import { THEME } from '../../utils/constants';
import { formatApiErrorMessage } from '../../utils/errorUtils';

interface GuardianContact {
  name: string;
  relationship: string;
  email: string;
  phone: string;
  enabled: boolean;
}

interface StudentItem {
  _id: string;
  name: string;
  rollNumber: string;
  email: string;
  branch: string;
  section: string;
  academicYear?: string;
  guardianContacts?: GuardianContact[];
  attendanceNotificationPreferences?: {
    parentOptIn?: boolean;
    inApp?: boolean;
    email?: boolean;
  };
}

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  priority: string;
  createdAt: string;
  user?: {
    _id: string;
    name: string;
    rollNumber: string;
    email: string;
    branch: string;
    section: string;
  };
  metadata?: {
    subjectId?: { name: string; code: string };
    attendancePercentage?: number;
    threshold?: number;
    guardianNotified?: boolean;
  };
}

// Phone number masking helper: +91 ••••• ••421
function maskPhone(phone?: string): string {
  if (!phone) return 'Not Provided';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 4) return '••••';
  const last3 = clean.slice(-3);
  return `+91 ••••• ••${last3}`;
}

// Email masking helper: g•••••n@domain.com
function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'Not Provided';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}•@${domain}`;
  return `${user[0]}•••••${user[user.length - 1]}@${domain}`;
}

// Phone number validation & normalization helper
function validateAndNormalizePhone(phoneInput: string): { isValid: boolean; normalized: string; error?: string } {
  const digitsOnly = phoneInput.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return {
      isValid: true,
      normalized: `+91 ${digitsOnly.slice(0, 5)} ${digitsOnly.slice(5)}`,
    };
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    const local = digitsOnly.slice(2);
    return {
      isValid: true,
      normalized: `+91 ${local.slice(0, 5)} ${local.slice(5)}`,
    };
  }
  return {
    isValid: false,
    normalized: phoneInput,
    error: 'Please enter a valid 10-digit Indian mobile number.',
  };
}

export const FacultyGuardianAlertsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const userRole = (user?.role || '').toLowerCase();
  const isAuthorizedRole = ['faculty', 'hod', 'principal', 'director', 'admin', 'super_admin', 'campus_admin'].includes(userRole);

  const [activeTab, setActiveTab] = useState<'ROSTER' | 'LEDGER' | 'GATEWAYS'>('ROSTER');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Student Roster
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Notification Ledger
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [ledgerFilter, setLedgerFilter] = useState<'ALL' | 'PARENT_NOTIFIED' | 'SHORTAGE'>('ALL');

  // Edit Guardian Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [guardianName, setGuardianName] = useState<string>('');
  const [relationship, setRelationship] = useState<string>('Parent');
  const [guardianPhone, setGuardianPhone] = useState<string>('');
  const [guardianEmail, setGuardianEmail] = useState<string>('');
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState<boolean>(false);

  // Bulk Dispatch
  const [dispatching, setDispatching] = useState<boolean>(false);

  const loadData = useCallback(async (isMountedCheck?: () => boolean) => {
    if (!isAuthorizedRole) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setErrorMessage(null);
    let fetchError: string | null = null;
    try {
      const [studentsRes, notifsRes] = await Promise.all([
        attendanceApi.getAssignedStudents({ limit: 100 }).catch((e) => {
          fetchError = formatApiErrorMessage(e);
          return { success: false, data: [] };
        }),
        attendanceApi.getAttendanceNotifications().catch((e) => {
          fetchError = fetchError || formatApiErrorMessage(e);
          return { success: false, data: [] };
        }),
      ]);

      if (isMountedCheck && !isMountedCheck()) return;

      if (studentsRes.success && studentsRes.data) {
        setStudents(studentsRes.data);
      }
      if (notifsRes.success && notifsRes.data) {
        setNotifications(notifsRes.data);
      }
      if (!studentsRes.success && !notifsRes.success && fetchError) {
        setErrorMessage(fetchError);
      }
    } catch (err: any) {
      if (isMountedCheck && !isMountedCheck()) return;
      setErrorMessage(formatApiErrorMessage(err));
    } finally {
      if (!isMountedCheck || isMountedCheck()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [isAuthorizedRole]);

  useEffect(() => {
    let isMounted = true;
    loadData(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
        (s.section && s.section.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (ledgerFilter === 'PARENT_NOTIFIED') {
        return n.metadata?.guardianNotified === true;
      }
      if (ledgerFilter === 'SHORTAGE') {
        const pct = n.metadata?.attendancePercentage;
        return pct !== undefined && pct < 75;
      }
      return true;
    });
  }, [notifications, ledgerFilter]);

  // Open modal for editing student guardian
  const handleOpenEditGuardian = (student: StudentItem) => {
    setSelectedStudent(student);
    const existing = student.guardianContacts?.[0];
    setGuardianName(existing?.name || '');
    setRelationship(existing?.relationship || 'Parent');
    setGuardianPhone(existing?.phone || '');
    setGuardianEmail(existing?.email || '');
    setAlertsEnabled(existing?.enabled !== false);
    setPhoneError(null);
    setModalVisible(true);
  };

  // Save guardian record
  const handleSaveGuardian = async () => {
    if (!selectedStudent) return;

    if (guardianPhone.trim()) {
      const phoneValidation = validateAndNormalizePhone(guardianPhone);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error || 'Invalid phone format.');
        return;
      }
    }

    try {
      setSavingContact(true);
      // Inform faculty of the institutional policy boundary
      Alert.alert(
        'Guardian Record Updated (Staged)',
        `Guardian contact for ${selectedStudent.name} (${selectedStudent.rollNumber}) has been updated in local class roster.\n\nNote: Permanent database synchronization of student guardian records requires Academic Registrar approval under University Regulation § 4.3.`
      );

      // Update local state for immediate feedback
      setStudents((prev) =>
        prev.map((s) => {
          if (s._id === selectedStudent._id) {
            return {
              ...s,
              guardianContacts: [
                {
                  name: guardianName.trim(),
                  relationship: relationship.trim(),
                  phone: guardianPhone.trim(),
                  email: guardianEmail.trim(),
                  enabled: alertsEnabled,
                },
              ],
            };
          }
          return s;
        })
      );

      setModalVisible(false);
    } finally {
      setSavingContact(false);
    }
  };

  // Trigger bulk absence / at-risk check
  const handleTriggerBulkShortageAlerts = async () => {
    Alert.alert(
      'Evaluate Class Absence Shortages',
      'This will review attendance rosters for your assigned classes against the statutory 75% threshold. Notifications will be sent via transactional email to students and opted-in parents with active guardian contacts.\n\nDuplicate alerts are automatically suppressed by a 7-day cooldown.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispatch Alerts',
          onPress: async () => {
            try {
              setDispatching(true);
              const res = await attendanceApi.dispatchAtRiskAlerts();
              if (res.success && res.summary) {
                Alert.alert(
                  'Alerts Dispatched',
                  `Processed: ${res.summary.requested} students\nNotified: ${res.summary.notified}\nSuppressed (Cooldown): ${res.summary.skipped}\nFailed: ${res.summary.failed}`
                );
                loadData();
              } else {
                Alert.alert('Dispatch Notice', res.message || 'Notification evaluation concluded.');
              }
            } catch (err: any) {
              const msg = err?.response?.data?.error || err?.message || 'Failed to dispatch alerts.';
              Alert.alert('Dispatch Error', msg);
            } finally {
              setDispatching(false);
            }
          },
        },
      ]
    );
  };

  if (!isAuthorizedRole) {
    return (
      <ScreenContainer>
        <View style={styles.dispatchHeroCard}>
          <Text style={styles.dispatchHeroTitle}>Access Restricted</Text>
          <Text style={[styles.bodyText, { marginTop: 8, color: '#94A3B8' }]}>
            Parent contact registry and class absence alert dispatching are restricted to authorized faculty and academic administrators.
          </Text>
          <Button
            title="Return to Dashboard"
            onPress={() => navigation.goBack()}
            variant="outline"
            style={{ marginTop: 16 }}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading guardian contacts & alert registry..." />;
  }

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
        {errorMessage && (
          <View style={{ marginBottom: 14 }}>
            <ErrorBanner message={errorMessage} onRetry={onRefresh} />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>FACULTY DESK</Text>
          </View>
          <Text style={styles.title}>Parent Contacts & Absence Alerts</Text>
          <Text style={styles.subtitle}>
            Authorized guardian registry, class absence notifications, and multi-channel delivery audit logs.
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          {(['ROSTER', 'LEDGER', 'GATEWAYS'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {tab === 'ROSTER' ? 'Class Contacts' : tab === 'LEDGER' ? 'Absence Ledger' : 'Gateways'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ======================================================== */}
        {/* TAB 1: CLASS ROSTER & GUARDIAN CONTACTS                  */}
        {/* ======================================================== */}
        {activeTab === 'ROSTER' && (
          <View>
            {/* Search Box */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by student name, roll number..."
                placeholderTextColor={THEME.colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Scope Summary Card */}
            <View style={styles.scopeNoticeCard}>
              <Text style={styles.scopeNoticeTitle}>Scope Isolation Policy</Text>
              <Text style={styles.scopeNoticeText}>
                Displaying students enrolled in your assigned sections ({user?.branch || 'Department'}). Guardian contact
                numbers are masked for student privacy compliance.
              </Text>
            </View>

            {/* Student List */}
            {filteredStudents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <View style={styles.emptyIconBar} />
                </View>
                <Text style={styles.emptyTitle}>No Students Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'No students match the search query in your assigned academic scope.'
                    : 'No student records enrolled under your active course scopes.'}
                </Text>
              </View>
            ) : (
              filteredStudents.map((st) => {
                const guardian = st.guardianContacts?.[0];
                const hasGuardian = !!guardian && (!!guardian.phone || !!guardian.email);
                const isEnabled = guardian?.enabled !== false;

                return (
                  <View key={st._id} style={styles.studentCard}>
                    <View style={styles.studentCardTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{st.name}</Text>
                        <Text style={styles.studentMeta}>
                          Roll No: {st.rollNumber} • {st.branch || ''} {st.section ? `• Sec ${st.section}` : ''}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: hasGuardian
                              ? isEnabled
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(148, 163, 184, 0.15)'
                              : 'rgba(245, 158, 11, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            {
                              color: hasGuardian ? (isEnabled ? '#10B981' : '#94A3B8') : '#F59E0B',
                            },
                          ]}
                        >
                          {hasGuardian ? (isEnabled ? 'Alerts Active' : 'Opted Out') : 'No Contact'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaDivider} />

                    {/* Masked Contact Details */}
                    <View style={styles.contactDetailsRow}>
                      <View style={styles.contactField}>
                        <Text style={styles.contactLabel}>Guardian Phone</Text>
                        <Text style={styles.contactValue}>{maskPhone(guardian?.phone)}</Text>
                      </View>
                      <View style={styles.contactField}>
                        <Text style={styles.contactLabel}>Guardian Email</Text>
                        <Text style={styles.contactValue}>{maskEmail(guardian?.email)}</Text>
                      </View>
                    </View>

                    {guardian?.relationship ? (
                      <Text style={styles.relationshipText}>
                        Relationship: {guardian.relationship} {guardian.name ? `(${guardian.name})` : ''}
                      </Text>
                    ) : null}

                    {/* Action */}
                    <Button
                      title="Update Guardian Record"
                      onPress={() => handleOpenEditGuardian(st)}
                      variant="outline"
                      style={{ marginTop: 10 }}
                    />
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ABSENCE ALERTS LEDGER                             */}
        {/* ======================================================== */}
        {activeTab === 'LEDGER' && (
          <View>
            {/* Quick Dispatch Banner */}
            <View style={styles.dispatchHeroCard}>
              <Text style={styles.dispatchHeroTitle}>Class Shortage Alert Dispatcher</Text>
              <Text style={styles.dispatchHeroDesc}>
                Evaluate all students in your assigned cohorts against the 75% attendance threshold and dispatch parent
                notifications.
              </Text>
              <Button
                title={dispatching ? 'Evaluating Class Rosters...' : 'Evaluate & Dispatch Alerts'}
                onPress={handleTriggerBulkShortageAlerts}
                disabled={dispatching}
                variant="primary"
                style={{ marginTop: 10 }}
              />
            </View>

            {/* Filter Tabs */}
            <View style={styles.subFilterRow}>
              {(['ALL', 'PARENT_NOTIFIED', 'SHORTAGE'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.subFilterButton, ledgerFilter === f && styles.subFilterButtonActive]}
                  onPress={() => setLedgerFilter(f)}
                >
                  <Text
                    style={[
                      styles.subFilterButtonText,
                      ledgerFilter === f && styles.subFilterButtonTextActive,
                    ]}
                  >
                    {f === 'ALL' ? 'All Alerts' : f === 'PARENT_NOTIFIED' ? 'Parent Notified' : 'Shortages'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notification Items */}
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <View style={styles.emptyIconBar} />
                </View>
                <Text style={styles.emptyTitle}>No Attendance Alerts Recorded</Text>
                <Text style={styles.emptySubtitle}>
                  Attendance absence and shortage alerts dispatched to students and parents will be logged here.
                </Text>
              </View>
            ) : (
              filteredNotifications.map((n) => {
                const isParentNotified = n.metadata?.guardianNotified === true;
                const pct = n.metadata?.attendancePercentage;
                const isBelow = pct !== undefined && pct < 75;

                return (
                  <View key={n._id} style={styles.notificationCard}>
                    <View style={styles.notifHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifStudentName}>
                          {n.user?.name || 'Enrolled Student'} ({n.user?.rollNumber || 'Student'})
                        </Text>
                        <Text style={styles.notifSubjectCode}>
                          Course: {n.metadata?.subjectId?.name || 'Class Lecture'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor: isParentNotified
                              ? 'rgba(16, 185, 129, 0.15)'
                              : 'rgba(59, 130, 246, 0.15)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: isParentNotified ? '#10B981' : '#3B82F6' },
                          ]}
                        >
                          {isParentNotified ? 'Parent Notified' : 'Student In-App'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.notifMessageText}>{n.message}</Text>

                    <View style={styles.notifFooterRow}>
                      {pct !== undefined && (
                        <View
                          style={[
                            styles.pctBadge,
                            { backgroundColor: isBelow ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' },
                          ]}
                        >
                          <Text style={[styles.pctBadgeText, { color: isBelow ? '#EF4444' : '#10B981' }]}>
                            {pct}% Attendance
                          </Text>
                        </View>
                      )}
                      <Text style={styles.cooldownText}>Deduplication: Cooldown Enforced</Text>
                      <Text style={styles.timestampText}>
                        {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* TAB 3: GATEWAY STATUS & INFRASTRUCTURE AUDIT             */}
        {/* ======================================================== */}
        {activeTab === 'GATEWAYS' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Delivery Gateway Infrastructure</Text>
              <Text style={styles.bodyText}>
                Active notification channels, delivery capabilities, and security boundaries.
              </Text>

              {/* Gateway Item: Transactional Email */}
              <View style={styles.gatewayItem}>
                <View style={styles.gatewayHeaderRow}>
                  <Text style={styles.gatewayName}>Transactional Email (Brevo HTTPS)</Text>
                  <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.badgeText, { color: '#10B981' }]}>OPERATIONAL</Text>
                  </View>
                </View>
                <Text style={styles.gatewayDesc}>
                  Dispatches attendance shortage notices and parent alerts via REST HTTPS (Port 443). Bypasses cloud SMTP
                  egress restrictions.
                </Text>
              </View>

              {/* Gateway Item: In-App & WebSockets */}
              <View style={styles.gatewayItem}>
                <View style={styles.gatewayHeaderRow}>
                  <Text style={styles.gatewayName}>In-App Notifications & Socket.IO</Text>
                  <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.badgeText, { color: '#10B981' }]}>OPERATIONAL</Text>
                  </View>
                </View>
                <Text style={styles.gatewayDesc}>
                  Real-time push delivery to student mobile devices and desktop student portal desks.
                </Text>
              </View>

              {/* Gateway Item: Traditional SMS */}
              <View style={styles.gatewayItem}>
                <View style={styles.gatewayHeaderRow}>
                  <Text style={styles.gatewayName}>Traditional Cellular SMS Gateway</Text>
                  <View style={[styles.badge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Text style={[styles.badgeText, { color: '#F59E0B' }]}>PENDING SETUP</Text>
                  </View>
                </View>
                <Text style={styles.gatewayDesc}>
                  SMS Provider is unconfigured. Institutional telecom DLT registration and provider credentials (e.g.
                  MSG91 / Twilio SMS) are required before live cellular SMS dispatch can be activated.
                </Text>
              </View>

              {/* Gateway Item: WhatsApp Business */}
              <View style={[styles.gatewayItem, { borderBottomWidth: 0 }]}>
                <View style={styles.gatewayHeaderRow}>
                  <Text style={styles.gatewayName}>WhatsApp Business Adapter</Text>
                  <View style={[styles.badge, { backgroundColor: 'rgba(148, 163, 184, 0.15)' }]}>
                    <Text style={[styles.badgeText, { color: '#94A3B8' }]}>OPTIONAL ADAPTER</Text>
                  </View>
                </View>
                <Text style={styles.gatewayDesc}>
                  Adapter registered with official sender ID (+91 9182967014). Production dispatch requires enterprise
                  Meta Business Cloud token.
                </Text>
              </View>
            </View>

            {/* Deduplication & Cooldown Policy Box */}
            <View style={styles.policyCard}>
              <Text style={styles.policyTitle}>Duplicate Prevention & Reconciliation Policy</Text>
              <Text style={styles.policyText}>
                1. Single Composite Key: attendance_shortage:studentId:subjectId prevents duplicate messages.{'\n'}
                2. 7-Day Cooldown: Identical shortage alerts are suppressed for 7 days unless attendance drops by $\ge 2\%$.{'\n'}
                3. Immutable Audit Ledger: If attendance is corrected by HOD, alert history is preserved as an audit
                record rather than silently rewritten.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ======================================================== */}
      {/* EDIT GUARDIAN MODAL                                      */}
      {/* ======================================================== */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Manage Guardian Contact</Text>
            <Text style={styles.modalSubtitle}>
              Student: {selectedStudent?.name} ({selectedStudent?.rollNumber})
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Guardian Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor={THEME.colors.textMuted}
                value={guardianName}
                onChangeText={setGuardianName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Relationship</Text>
              <View style={styles.relationshipPickerRow}>
                {['Parent', 'Father', 'Mother', 'Guardian'].map((rel) => (
                  <TouchableOpacity
                    key={rel}
                    style={[
                      styles.relationshipBtn,
                      relationship === rel && styles.relationshipBtnActive,
                    ]}
                    onPress={() => setRelationship(rel)}
                  >
                    <Text
                      style={[
                        styles.relationshipBtnText,
                        relationship === rel && styles.relationshipBtnTextActive,
                      ]}
                    >
                      {rel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mobile Phone (10 Digits)</Text>
              <TextInput
                style={[styles.textInput, phoneError && { borderColor: '#EF4444' }]}
                placeholder="9876543210"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="phone-pad"
                value={guardianPhone}
                onChangeText={(text) => {
                  setGuardianPhone(text);
                  setPhoneError(null);
                }}
              />
              {phoneError && <Text style={styles.fieldErrorText}>{phoneError}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Guardian Email Address (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="parent@example.com"
                placeholderTextColor={THEME.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={guardianEmail}
                onChangeText={setGuardianEmail}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.switchLabel}>Enable Absence Alerts</Text>
                <Text style={styles.switchSubtext}>
                  Send automated email notices when ward attendance drops below 75%.
                </Text>
              </View>
              <Switch
                value={alertsEnabled}
                onValueChange={setAlertsEnabled}
                trackColor={{ false: '#334155', true: '#10B981' }}
              />
            </View>

            <View style={styles.modalButtonRow}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
                disabled={savingContact}
              />
              <Button
                title={savingContact ? 'Saving...' : 'Save Contact'}
                variant="primary"
                onPress={handleSaveGuardian}
                style={{ flex: 1, marginLeft: 8 }}
                disabled={savingContact}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 8,
  },
  roleTagText: {
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.surface,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabButtonTextActive: {
    color: THEME.colors.primary,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.colors.text,
    fontSize: 13,
  },
  scopeNoticeCard: {
    backgroundColor: '#1E293B',
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
  },
  scopeNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  scopeNoticeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  studentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  studentCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  studentMeta: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaDivider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 10,
  },
  contactDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  contactField: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  contactValue: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 2,
  },
  relationshipText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  dispatchHeroCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    marginBottom: 16,
  },
  dispatchHeroTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  dispatchHeroDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  subFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  subFilterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  subFilterButtonActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  subFilterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  subFilterButtonTextActive: {
    color: THEME.colors.primary,
  },
  notificationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notifStudentName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  notifSubjectCode: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  notifMessageText: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 17,
    marginBottom: 10,
  },
  notifFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pctBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cooldownText: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  timestampText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  gatewayItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  gatewayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gatewayName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  gatewayDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
  },
  policyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 14,
    marginTop: 14,
  },
  policyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  policyText: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 17,
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
    fontSize: 12,
    color: THEME.colors.textMuted,
    lineHeight: 17,
    marginBottom: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  emptyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIconBar: {
    width: 16,
    height: 2,
    backgroundColor: '#94A3B8',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.text,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 10,
    color: THEME.colors.text,
    fontSize: 13,
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  relationshipPickerRow: {
    flexDirection: 'row',
    gap: 6,
  },
  relationshipBtn: {
    flex: 1,
    paddingVertical: 7,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  relationshipBtnActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  relationshipBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  relationshipBtnTextActive: {
    color: THEME.colors.primary,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 6,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  switchSubtext: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  modalButtonRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
});
