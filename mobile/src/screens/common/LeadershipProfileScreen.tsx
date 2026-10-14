import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TouchableOpacity,
  Switch,
  ScrollView,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../api/authApi';
import { THEME } from '../../utils/constants';
import {
  isBiometricUnlockEnabled,
  setBiometricUnlockEnabled,
  promptBiometricUnlock,
} from '../../utils/biometric';

interface LeadershipProfileScreenProps {
  roleTitle: string;
  roleBadgeColor: string;
  scopeDescription: string;
}

export const LeadershipProfileScreen: React.FC<LeadershipProfileScreenProps> = ({
  roleTitle,
  roleBadgeColor,
  scopeDescription,
}) => {
  const { user, logout, refreshProfile, isBiometricSupported, biometricLabel } = useAuth();
  const [activeTab, setActiveTab] = useState<'personal' | 'professional' | 'institutional' | 'security'>('personal');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bioEnabled, setBioEnabled] = useState<boolean>(false);
  const [checkingBio, setCheckingBio] = useState<boolean>(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editPhone, setEditPhone] = useState<string>('');
  const [editOffice, setEditOffice] = useState<string>('');
  const [editQualifications, setEditQualifications] = useState<string>('');
  const [editSpecialization, setEditSpecialization] = useState<string>('');
  const [editExperience, setEditExperience] = useState<string>('');
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');

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
        Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
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
    } catch {
      // safe fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your CampusBridge session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  // Completion stats based only on applicable, available fields
  const completionStats = useMemo(() => {
    const checklist = [
      { name: 'Name', value: user?.name },
      { name: 'Email', value: user?.email },
      { name: 'Phone', value: user?.mobileNumber || user?.phone },
      { name: 'Office', value: user?.officeLocation },
      { name: 'Qualifications', value: user?.qualifications },
      { name: 'Specialization', value: user?.specialization },
      { name: 'Experience', value: user?.experience || (user?.experienceYears ? `${user.experienceYears} Years` : '') },
      { name: 'Bio', value: user?.bio },
      { name: 'Photo', value: user?.profilePicture },
    ];
    const completed = checklist.filter(
      (item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== ''
    );
    const percentage = Math.round((completed.length / checklist.length) * 100);
    return { percentage, completed: completed.length, total: checklist.length };
  }, [user]);

  const reportingAuthority = useMemo(() => {
    if (user?.reportingAuthority) return user.reportingAuthority;
    const cleanRole = user?.role ? user.role.toLowerCase() : '';
    if (cleanRole === 'director' || cleanRole === 'campus_admin') return 'Governing Body / Board of Trustees';
    if (cleanRole === 'principal') return 'Executive Director';
    if (cleanRole === 'hod') return 'Institutional Principal';
    if (cleanRole === 'super_admin' || cleanRole === 'admin') return 'Platform Governance Council';
    return 'Institutional Leadership';
  }, [user]);

  const responsibilities = useMemo(() => {
    if (user?.institutionalResponsibilities && user.institutionalResponsibilities.length > 0) {
      return user.institutionalResponsibilities;
    }
    const cleanRole = user?.role ? user.role.toLowerCase() : '';
    if (cleanRole === 'director' || cleanRole === 'campus_admin') {
      return [
        'Strategic Institutional Governance & Long-Term Planning',
        'Regulatory Compliance (UGC / AICTE / NBA / NAAC)',
        'Executive Leadership & Campus Resource Allocation',
        'Industry Partnerships & Executive Policy Formulation',
      ];
    }
    if (cleanRole === 'principal') {
      return [
        'Campus Academic Administration & Faculty Roster Oversight',
        'Academic Integrity & Examination Compliance Standards',
        'Inter-Departmental Curriculum Coordination',
        'Campus Discipline, Student Affairs & Placement Alignment',
      ];
    }
    if (cleanRole === 'hod') {
      return [
        'Department Curriculum Delivery & Faculty Workload Allocation',
        'Laboratory Infrastructure, Equipment & Safety Governance',
        'Student Academic Grievances & Attendance Review',
        'Department Electives, Technical Seminars & Research Mentorship',
      ];
    }
    return [
      'Enterprise Platform Security & Identity Governance',
      'Multi-Campus Tenant Isolation & Integrity Verification',
      'System-Wide Audit Log Oversight & Reliability Compliance',
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
    (user?._id ? `EMP-${user._id.slice(-6).toUpperCase()}` : 'Not Assigned');

  const campusDisplayName =
    user?.campusName || (user?.campus ? user.campus.name : (user?.campusId ? 'Assigned Campus' : 'GRIET Main Campus'));

  const departmentDisplayName =
    user?.departmentName || user?.department || user?.branch || 'Institutional Leadership';

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ============================================================ */}
        {/* PROFILE HEADER CARD */}
        {/* ============================================================ */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={[styles.avatarBox, { borderColor: roleBadgeColor }]}>
              {user?.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
              ) : null}
              <View style={[styles.avatarFallback, { backgroundColor: roleBadgeColor }]}>
                <Text style={styles.avatarText}>
                  {(user?.name || 'L').charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.identityCol}>
              <View style={[styles.roleBadge, { backgroundColor: `${roleBadgeColor}20`, borderColor: `${roleBadgeColor}60` }]}>
                <Text style={[styles.roleBadgeText, { color: roleBadgeColor }]}>
                  {roleTitle.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.userName}>{user?.name || 'Academic Leader'}</Text>
              <Text style={styles.designationText}>
                {user?.designation || roleTitle}
              </Text>
            </View>
          </View>

          {/* Subheader Meta Chips */}
          <View style={styles.metaChipsRow}>
            <View style={styles.metaChip}>
              <Text style={styles.chipLabel}>ID:</Text>
              <Text style={[styles.chipVal, { color: '#38BDF8' }]}>{employeeIdentifier}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.chipLabel}>Campus:</Text>
              <Text style={styles.chipVal}>{campusDisplayName}</Text>
            </View>
          </View>

          {/* Completion Meter */}
          <View style={styles.completionMeterCard}>
            <View style={styles.meterTopRow}>
              <Text style={styles.meterTitle}>Profile Completion</Text>
              <Text style={[styles.meterPercentage, { color: completionStats.percentage === 100 ? '#10B981' : '#F59E0B' }]}>
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
              {completionStats.completed} of {completionStats.total} applicable profile records completed.
            </Text>
          </View>

          {/* Edit Profile Action Button */}
          <TouchableOpacity style={styles.editBtn} onPress={openEditModal} activeOpacity={0.8}>
            <Text style={styles.editBtnText}>✏️ Edit Profile Details</Text>
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
            style={[styles.tabItem, activeTab === 'professional' && styles.tabItemActive]}
            onPress={() => setActiveTab('professional')}
          >
            <Text style={[styles.tabText, activeTab === 'professional' && styles.tabTextActive]}>
              Professional
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
              <Text style={styles.label}>Official Legal Name</Text>
              <Text style={styles.value}>{user?.name || 'N/A'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Official Portal Email</Text>
              <Text style={[styles.value, { color: '#38BDF8' }]}>{user?.email || 'N/A'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Contact Mobile</Text>
              {renderValue(user?.mobileNumber || user?.phone)}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Office / Cabin Location</Text>
              {renderValue(user?.officeLocation)}
            </View>

            <View style={styles.rowStack}>
              <Text style={styles.label}>Executive Dossier / Biography</Text>
              {user?.bio ? (
                <Text style={styles.bioText}>{user.bio}</Text>
              ) : (
                <Text style={styles.notProvided}>Not provided</Text>
              )}
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 2: PROFESSIONAL CREDENTIALS */}
        {/* ============================================================ */}
        {activeTab === 'professional' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Professional & Academic Credentials</Text>

            <View style={styles.row}>
              <Text style={styles.label}>Official Designation</Text>
              <Text style={styles.value}>{user?.designation || roleTitle}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Highest Qualifications</Text>
              {renderValue(user?.qualifications)}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Domain Specialization</Text>
              {renderValue(user?.specialization)}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Professional Experience</Text>
              {renderValue(user?.experience || (user?.experienceYears ? `${user.experienceYears} Years` : ''))}
            </View>

            <View style={styles.responsibilitiesWrap}>
              <Text style={[styles.label, { marginBottom: 8 }]}>Leadership Responsibilities</Text>
              {responsibilities.map((resp, idx) => (
                <View style={styles.respItem} key={idx}>
                  <Text style={styles.respBullet}>✓</Text>
                  <Text style={styles.respText}>{resp}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 3: INSTITUTIONAL & GOVERNANCE SCOPE */}
        {/* ============================================================ */}
        {activeTab === 'institutional' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Institutional Governance Scope</Text>
            <Text style={styles.scopeNotice}>{scopeDescription}</Text>

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
              <Text style={[styles.value, { color: '#C7D2FE' }]}>{reportingAuthority}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Platform Role Identifier</Text>
              <Text style={[styles.value, { textTransform: 'uppercase' }]}>{user?.role || 'leadership'}</Text>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 4: ACCOUNT & SECURITY */}
        {/* ============================================================ */}
        {activeTab === 'security' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Security & Session Governance</Text>
            <Text style={styles.securityText}>
              Mobile sessions are secured using encrypted device storage and token-based gateway authorization. Destructive actions are restricted to the web console.
            </Text>

            <View style={styles.row}>
              <Text style={styles.label}>Last Login Timestamp</Text>
              <Text style={styles.value}>
                {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Active session'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Total Sign-ins</Text>
              <Text style={styles.value}>{user?.loginCount || 1} Sessions</Text>
            </View>

            <View style={styles.bioToggleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.bioToggleTitle}>Biometric App Unlock</Text>
                <Text style={styles.bioToggleSubtitle}>
                  {isBiometricSupported
                    ? `Require ${biometricLabel || 'device biometrics'} to resume application.`
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
        )}

        {/* Refresh & Logout Actions */}
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
            onPress={handleSignOut}
            variant="outline"
            style={styles.signOutBtn}
          />
        </View>
      </ScrollView>

      {/* ============================================================ */}
      {/* EDIT MODAL FOR PERMITTED FIELDS */}
      {/* ============================================================ */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Information</Text>
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

              <Text style={styles.inputLabel}>Office / Cabin Location</Text>
              <TextInput
                style={styles.textInput}
                value={editOffice}
                onChangeText={setEditOffice}
                placeholder="e.g. Admin Block, Cabin 204"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Qualifications</Text>
              <TextInput
                style={styles.textInput}
                value={editQualifications}
                onChangeText={setEditQualifications}
                placeholder="e.g. Ph.D, M.Tech"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Specialization / Research Focus</Text>
              <TextInput
                style={styles.textInput}
                value={editSpecialization}
                onChangeText={setEditSpecialization}
                placeholder="e.g. Artificial Intelligence, Cloud Systems"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Experience</Text>
              <TextInput
                style={styles.textInput}
                value={editExperience}
                onChangeText={setEditExperience}
                placeholder="e.g. 18 Years in Engineering Leadership"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.inputLabel}>Profile Photograph URL</Text>
              <TextInput
                style={styles.textInput}
                value={editPhotoUrl}
                onChangeText={setEditPhotoUrl}
                placeholder="https://example.com/headshot.jpg"
                placeholderTextColor="#64748B"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Executive Biography</Text>
              <TextInput
                style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Brief summary of background and leadership focus..."
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
                  {isSaving ? 'Saving...' : 'Save Profile'}
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
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
    flexWrap: 'wrap',
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
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editBtnText: {
    color: '#A5B4FC',
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
  scopeNotice: {
    fontSize: 12.5,
    color: THEME.colors.textMuted,
    lineHeight: 18,
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
  signOutBtn: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
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
