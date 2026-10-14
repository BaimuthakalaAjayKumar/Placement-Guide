import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Switch,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../api/authApi';
import { attendanceApi } from '../../api/attendanceApi';
import { FaceBiometricModal } from '../../components/FaceBiometricModal';
import { THEME } from '../../utils/constants';
import {
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
  promptBiometricUnlock,
} from '../../utils/biometric';

export const FacultyProfileScreen: React.FC = () => {
  const { user, logout, refreshProfile, isBiometricSupported, biometricLabel } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'teaching' | 'institutional' | 'security'>('personal');
  const [bioEnabled, setBioEnabled] = useState<boolean>(false);
  const [checkingBio, setCheckingBio] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editPhone, setEditPhone] = useState<string>('');
  const [editOffice, setEditOffice] = useState<string>('');
  const [editQualifications, setEditQualifications] = useState<string>('');
  const [editSpecialization, setEditSpecialization] = useState<string>('');
  const [editExperience, setEditExperience] = useState<string>('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');

  // Biometric Attendance Identity State
  const [faceEnrolled, setFaceEnrolled] = useState<boolean>(false);
  const [faceEnrolledAt, setFaceEnrolledAt] = useState<string | null>(null);
  const [loadingFaceStatus, setLoadingFaceStatus] = useState<boolean>(false);
  const [faceModalVisible, setFaceModalVisible] = useState<boolean>(false);

  const loadFaceStatus = async () => {
    try {
      setLoadingFaceStatus(true);
      const res = await attendanceApi.getBiometricStatus();
      if (res && res.success) {
        setFaceEnrolled(res.isEnrolled);
        setFaceEnrolledAt(res.enrolledAt);
      }
    } catch (err) {
      console.warn('Failed to load faculty biometric status:', err);
    } finally {
      setLoadingFaceStatus(false);
    }
  };

  useEffect(() => {
    loadFaceStatus();
  }, []);

  useEffect(() => {
    isBiometricUnlockEnabled().then((enabled) => {
      setBioEnabled(enabled);
      setCheckingBio(false);
    });
  }, []);

  const openEditModal = () => {
    setEditPhone(user?.mobileNumber || user?.phone || '');
    setEditOffice(user?.officeLocation || '');
    setEditQualifications(user?.qualifications || '');
    setEditSpecialization(user?.specialization || '');
    setEditExperience(user?.experience || (user?.experienceYears ? `${user.experienceYears} Years` : ''));
    setEditPhotoUrl(user?.profilePicture || '');
    setEditBio(user?.bio || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        mobileNumber: editPhone.trim(),
        phone: editPhone.trim(),
        officeLocation: editOffice.trim(),
        qualifications: editQualifications.trim(),
        specialization: editSpecialization.trim(),
        experience: editExperience.trim(),
        profilePicture: editPhotoUrl.trim(),
        bio: editBio.trim(),
      };
      const res = await updateUserProfile(payload);
      if (res.success) {
        await refreshProfile();
        setShowEditModal(false);
        Alert.alert('Profile Updated', 'Faculty credentials and contact channels updated successfully.');
      } else {
        Alert.alert('Update Failed', res.error || 'Could not update profile.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Network error while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleBio = async (val: boolean) => {
    if (val) {
      const res = await promptBiometricUnlock('Confirm Biometrics to Enable App Lock');
      if (res.success) {
        await setBiometricUnlockEnabled(true);
        setBioEnabled(true);
      } else {
        Alert.alert('Verification Cancelled', res.error || 'Biometric authorization is required.');
      }
    } else {
      await setBiometricUnlockEnabled(false);
      setBioEnabled(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      await loadFaceStatus();
    } catch {
      // safe
    } finally {
      setIsRefreshing(false);
    }
  };

  // Completion calculation for Faculty
  const completionStats = useMemo(() => {
    const checklist = [
      { name: 'Name', value: user?.name },
      { name: 'Email', value: user?.email },
      { name: 'Phone', value: user?.mobileNumber || user?.phone },
      { name: 'Office', value: user?.officeLocation },
      { name: 'Department', value: user?.departmentId || user?.departmentName || user?.branch },
      { name: 'Qualifications', value: user?.qualifications },
      { name: 'Specialization', value: user?.specialization },
      { name: 'Experience', value: user?.experience || (user?.experienceYears ? `${user.experienceYears} Years` : '') },
      { name: 'Teaching Scopes', value: user?.managedScopes && user.managedScopes.length > 0 },
      { name: 'Bio', value: user?.bio },
      { name: 'Photo', value: user?.profilePicture },
    ];
    const completed = checklist.filter((item) => {
      if (typeof item.value === 'boolean') return item.value;
      return item.value !== undefined && item.value !== null && String(item.value).trim() !== '';
    });
    const percentage = Math.round((completed.length / checklist.length) * 100);
    return { percentage, completed: completed.length, total: checklist.length };
  }, [user]);

  const teachingResponsibilities = useMemo(() => {
    if (user?.teachingResponsibilities && user.teachingResponsibilities.length > 0) {
      return user.teachingResponsibilities;
    }
    return [
      'Curriculum Instruction & Laboratory Supervision',
      'Daily Lecture Attendance Telemetry & Continuous Assessment',
      'Course Material Preparation & Mid-Term Exam Evaluation',
    ];
  }, [user]);

  const renderValue = (val?: string | number | null) => {
    if (val === undefined || val === null || String(val).trim() === '') {
      return <Text style={styles.notProvided}>Not provided</Text>;
    }
    return <Text style={styles.value}>{String(val)}</Text>;
  };

  const employeeIdentifier =
    user?.employeeId ||
    user?.rollNumber ||
    (user?._id ? `FAC-${user._id.slice(-6).toUpperCase()}` : 'FAC001');

  const campusDisplayName =
    user?.campusName || (user?.campus ? user.campus.name : 'GRIET Main Campus');

  const departmentDisplayName =
    user?.departmentName || user?.department || user?.branch || 'Information Technology';

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ============================================================ */}
        {/* FACULTY PROFILE HEADER CARD */}
        {/* ============================================================ */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.avatarBox}>
              {user?.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
              ) : null}
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>
                  {(user?.name || 'F').charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.identityCol}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>FACULTY MEMBER</Text>
              </View>
              <Text style={styles.userName}>{user?.name || 'Faculty Member'}</Text>
              <Text style={styles.designationText}>
                {user?.designation || 'Assistant Professor'}
              </Text>
            </View>
          </View>

          {/* Chips */}
          <View style={styles.metaChipsRow}>
            <View style={styles.metaChip}>
              <Text style={styles.chipLabel}>Emp ID:</Text>
              <Text style={[styles.chipVal, { color: '#38BDF8' }]}>{employeeIdentifier}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.chipLabel}>Dept:</Text>
              <Text style={styles.chipVal}>{departmentDisplayName}</Text>
            </View>
          </View>

          {/* Completion Progress Bar */}
          <View style={styles.completionMeterCard}>
            <View style={styles.meterTopRow}>
              <Text style={styles.meterTitle}>Profile Completion</Text>
              <Text style={[styles.meterPercentage, { color: completionStats.percentage === 100 ? '#10B981' : '#38BDF8' }]}>
                {completionStats.percentage}%
              </Text>
            </View>
            <View style={styles.meterTrack}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${completionStats.percentage}%`,
                    backgroundColor: completionStats.percentage === 100 ? '#10B981' : THEME.colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.meterCaption}>
              {completionStats.completed} of {completionStats.total} faculty fields recorded.
            </Text>
          </View>

          <TouchableOpacity style={styles.editBtn} onPress={openEditModal} activeOpacity={0.8}>
            <Text style={styles.editBtnText}>✏️ Edit Faculty Details</Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* SEGMENTED 4-TAB BAR */}
        {/* ============================================================ */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'personal' && styles.tabItemActive]}
            onPress={() => setActiveTab('personal')}
          >
            <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>
              Personal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'teaching' && styles.tabItemActive]}
            onPress={() => setActiveTab('teaching')}
          >
            <Text style={[styles.tabText, activeTab === 'teaching' && styles.tabTextActive]}>
              Teaching
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'institutional' && styles.tabItemActive]}
            onPress={() => setActiveTab('institutional')}
          >
            <Text style={[styles.tabText, activeTab === 'institutional' && styles.tabTextActive]}>
              Scope
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'security' && styles.tabItemActive]}
            onPress={() => setActiveTab('security')}
          >
            <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>
              Security
            </Text>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* TAB 1: PERSONAL DETAILS */}
        {/* ============================================================ */}
        {activeTab === 'personal' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Personal & Contact Details</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{user?.name || 'N/A'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Institutional Email</Text>
              <Text style={[styles.value, { color: '#38BDF8' }]}>{user?.email || 'N/A'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Official Mobile</Text>
              {renderValue(user?.mobileNumber || user?.phone)}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Cabin / Office Location</Text>
              {renderValue(user?.officeLocation)}
            </View>

            <View style={styles.rowStack}>
              <Text style={styles.label}>Academic Dossier / Biography</Text>
              {user?.bio ? (
                <Text style={styles.bioText}>{user.bio}</Text>
              ) : (
                <Text style={styles.notProvided}>Not provided</Text>
              )}
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 2: TEACHING & ACADEMICS */}
        {/* ============================================================ */}
        {activeTab === 'teaching' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Academic Instruction & Scopes</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Designation</Text>
              <Text style={styles.value}>{user?.designation || 'Assistant Professor'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Academic Qualifications</Text>
              {renderValue(user?.qualifications)}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Specialization</Text>
              {renderValue(user?.specialization)}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Teaching Experience</Text>
              {renderValue(user?.experience || (user?.experienceYears ? `${user.experienceYears} Years` : ''))}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Class Advisor Assignment</Text>
              {renderValue(user?.classAdvisor)}
            </View>

            {/* Assigned Classroom Scopes */}
            <View style={styles.scopesWrap}>
              <Text style={[styles.label, { marginBottom: 8 }]}>Assigned Teaching Scopes</Text>
              {user?.managedScopes && user.managedScopes.length > 0 ? (
                user.managedScopes.map((scope, idx) => (
                  <View style={styles.scopeCard} key={idx}>
                    <View style={styles.scopeHeader}>
                      <Text style={styles.scopeYear}>📅 {scope.academicYear}</Text>
                      <Text style={styles.scopeSec}>Sec {scope.section || 'All'}</Text>
                    </View>
                    <Text style={styles.scopeSub}>Branch: {scope.branch || 'All Branches'}</Text>
                    {scope.subject ? (
                      <Text style={[styles.scopeSub, { color: '#34D399' }]}>
                        Subject: {String(scope.subject)}
                      </Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.notProvided}>No specific classroom sections currently assigned.</Text>
              )}
            </View>

            {/* Teaching Responsibilities */}
            <View style={styles.responsibilitiesWrap}>
              <Text style={[styles.label, { marginBottom: 8 }]}>Instructional Responsibilities</Text>
              {teachingResponsibilities.map((resp, idx) => (
                <View style={styles.respItem} key={idx}>
                  <Text style={styles.respBullet}>✓</Text>
                  <Text style={styles.respText}>{resp}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 3: INSTITUTIONAL SCOPE */}
        {/* ============================================================ */}
        {activeTab === 'institutional' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Institutional Authority & Scope</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Assigned Campus</Text>
              <Text style={styles.value}>{campusDisplayName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Assigned Department</Text>
              <Text style={styles.value}>{departmentDisplayName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Reporting Authority</Text>
              <Text style={[styles.value, { color: '#C7D2FE' }]}>
                {user?.reportingAuthority || 'Head of Department (HOD)'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Role Identifier</Text>
              <Text style={[styles.value, { textTransform: 'capitalize' }]}>{user?.role || 'faculty'}</Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 4: SECURITY & TELEMETRY */}
        {/* ============================================================ */}
        {activeTab === 'security' && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Authentication & Session Security</Text>
              <Text style={styles.securityText}>
                Logged in with hardware-backed JWT storage. Sessions expire according to institutional security policy.
              </Text>

              <View style={styles.row}>
                <Text style={styles.label}>Last Sign-in</Text>
                <Text style={styles.value}>
                  {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Active session'}
                </Text>
              </View>

              <View style={styles.bioToggleRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.bioToggleTitle}>Biometric App Unlock</Text>
                  <Text style={styles.bioToggleSubtitle}>
                    {isBiometricSupported
                      ? `Require ${biometricLabel || 'device biometrics'} to unlock on app resume.`
                      : 'Biometric hardware unavailable or not enrolled.'}
                  </Text>
                </View>
                <Switch
                  value={bioEnabled}
                  onValueChange={handleToggleBio}
                  disabled={!isBiometricSupported || checkingBio}
                  trackColor={{ false: '#334155', true: THEME.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Attendance Biometric Identity Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Biometric Attendance Identity</Text>
              <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 14, lineHeight: 19 }}>
                CampusBridge utilizes AES-256-GCM encrypted 128-dimensional biometric facial embeddings to authenticate faculty session launches. Raw photographs are never stored.
              </Text>

              <View style={styles.row}>
                <Text style={styles.label}>Biometric Status</Text>
                <Text style={[styles.value, { color: faceEnrolled ? '#10B981' : '#F59E0B', fontWeight: '700' }]}>
                  {loadingFaceStatus ? 'Checking...' : faceEnrolled ? 'Enrolled & Active' : 'Not Enrolled'}
                </Text>
              </View>

              {faceEnrolled && faceEnrolledAt && (
                <View style={styles.row}>
                  <Text style={styles.label}>Enrolled On</Text>
                  <Text style={styles.value}>{new Date(faceEnrolledAt).toLocaleDateString()}</Text>
                </View>
              )}

              <View style={{ marginTop: 14 }}>
                {faceEnrolled ? (
                  <>
                    <Button
                      title="Re-Enroll Facial Biometrics"
                      onPress={() => setFaceModalVisible(true)}
                      variant="outline"
                      style={{ marginBottom: 8 }}
                    />
                    <Button
                      title="Withdraw Biometric Consent & Erase"
                      onPress={() => {
                        Alert.alert(
                          'Withdraw Biometric Consent',
                          'Are you sure you want to delete your biometric templates? Your encrypted facial representation will be permanently erased. Session launches will revert to standard passcode confirmation.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Confirm Deletion',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  const res = await attendanceApi.withdrawBiometric({ reason: 'Faculty requested deletion' });
                                  if (res.success) {
                                    Alert.alert('Templates Deleted', res.message || 'Biometric profile erased.');
                                    loadFaceStatus();
                                  }
                                } catch (err: any) {
                                  Alert.alert('Withdrawal Failed', err?.message || 'Error deleting template.');
                                }
                              },
                            },
                          ]
                        );
                      }}
                      variant="danger"
                    />
                  </>
                ) : (
                  <Button
                    title="Enroll Face for Attendance Authorization"
                    onPress={() => setFaceModalVisible(true)}
                    variant="primary"
                  />
                )}
              </View>
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.actionContainer}>
          <Button
            title={isRefreshing ? 'Refreshing Profile...' : 'Refresh Profile'}
            onPress={handleRefresh}
            variant="secondary"
            disabled={isRefreshing}
            style={styles.refreshBtn}
          />
          <Button
            title="Sign Out"
            onPress={logout}
            variant="danger"
            style={styles.logoutBtn}
          />
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* EDIT MODAL */}
      {/* ============================================================ */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Faculty Details</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Official Contact Mobile</Text>
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+91 9876543210"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Cabin / Office Location</Text>
              <TextInput
                style={styles.textInput}
                value={editOffice}
                onChangeText={setEditOffice}
                placeholder="e.g. IT Block, Room 302"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Academic Qualifications</Text>
              <TextInput
                style={styles.textInput}
                value={editQualifications}
                onChangeText={setEditQualifications}
                placeholder="e.g. M.Tech (CSE), Ph.D"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Domain Specialization</Text>
              <TextInput
                style={styles.textInput}
                value={editSpecialization}
                onChangeText={setEditSpecialization}
                placeholder="e.g. Machine Learning, Cloud Architecture"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Experience</Text>
              <TextInput
                style={styles.textInput}
                value={editExperience}
                onChangeText={setEditExperience}
                placeholder="e.g. 10 Years in Academic Instruction"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Photograph URL</Text>
              <TextInput
                style={styles.textInput}
                value={editPhotoUrl}
                onChangeText={setEditPhotoUrl}
                placeholder="https://example.com/photo.jpg"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Academic Biography / Dossier</Text>
              <TextInput
                style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Brief summary of teaching and research interests..."
                placeholderTextColor="#64748B"
                multiline
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowEditModal(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalBtn, isSaving && { opacity: 0.7 }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                <Text style={styles.saveModalBtnText}>
                  {isSaving ? 'Saving...' : 'Save Details'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FaceBiometricModal
        visible={faceModalVisible}
        mode="ENROLL"
        title="Faculty Face Biometric Enrollment"
        onSuccess={() => {
          setFaceModalVisible(false);
          loadFaceStatus();
          Alert.alert('Enrollment Complete', 'Your facial biometric template has been securely encrypted with AES-256-GCM and stored.');
        }}
        onClose={() => setFaceModalVisible(false)}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: THEME.spacing.xl,
  },
  headerCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#3B82F6',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  identityCol: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.6,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.text,
  },
  designationText: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  metaChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipLabel: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  chipVal: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  completionMeterCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  meterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  meterTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: THEME.colors.textMuted,
  },
  meterPercentage: {
    fontSize: 13,
    fontWeight: '800',
  },
  meterTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  meterCaption: {
    fontSize: 10.5,
    color: THEME.colors.textMuted,
  },
  editBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 4,
    marginBottom: THEME.spacing.md,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowStack: {
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  label: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
  },
  value: {
    fontSize: 12.5,
    fontWeight: '600',
    color: THEME.colors.text,
  },
  notProvided: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: '#64748B',
  },
  bioText: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
    marginTop: 4,
  },
  scopesWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  scopeCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  scopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scopeYear: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C7D2FE',
  },
  scopeSec: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  scopeSub: {
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  responsibilitiesWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 10,
  },
  respItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  respBullet: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 12,
  },
  respText: {
    fontSize: 12,
    color: '#E2E8F0',
    flex: 1,
    lineHeight: 17,
  },
  securityText: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  bioToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  bioToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  bioToggleSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  actionContainer: {
    gap: THEME.spacing.sm,
  },
  refreshBtn: {
    marginBottom: THEME.spacing.xs,
  },
  logoutBtn: {
    marginBottom: THEME.spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  modalCloseText: {
    fontSize: 18,
    color: THEME.colors.textMuted,
  },
  modalScroll: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: THEME.colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelModalBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  saveModalBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
