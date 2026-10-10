import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  Image,
} from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { THEME } from '../../utils/constants';
import {
  complaintsApi,
  ComplaintItem,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintItemType,
  CATEGORY_LABELS,
  getCategoryRouting,
} from '../../api/complaintsApi';
import {
  complaintDraftService,
  ComplaintDraft,
} from '../../services/complaintDraftService';

type TabMode = 'my_tickets' | 'drafts' | 'new_submission' | 'staff_oversight' | 'routing_matrix';

export const ComplaintsFeedbackScreen: React.FC = () => {
  const { user, token } = useAuth();

  const isStaffOrLeadership = useMemo(() => {
    return ['hod', 'principal', 'director', 'admin', 'super_admin', 'campus_admin'].includes(
      user?.role || ''
    );
  }, [user?.role]);

  const [activeTab, setActiveTab] = useState<TabMode>('my_tickets');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Data sets
  const [myComplaints, setMyComplaints] = useState<ComplaintItem[]>([]);
  const [adminComplaints, setAdminComplaints] = useState<ComplaintItem[]>([]);
  const [drafts, setDrafts] = useState<ComplaintDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [submittingDraftId, setSubmittingDraftId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [formType, setFormType] = useState<ComplaintItemType>('complaint');
  const [formCategory, setFormCategory] = useState<ComplaintCategory>('ACADEMIC_CURRICULUM');
  const [formPriority, setFormPriority] = useState<ComplaintPriority>('standard');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [lastSubmittedHash, setLastSubmittedHash] = useState<string>('');

  // Submission Success Modal
  const [successItem, setSuccessItem] = useState<ComplaintItem | null>(null);

  // Staff Resolution Modal
  const [selectedForResolution, setSelectedForResolution] = useState<ComplaintItem | null>(null);
  const [resolutionRemarks, setResolutionRemarks] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);

  // Attachment Viewer Modal
  const [viewingAttachmentUrl, setViewingAttachmentUrl] = useState<string | null>(null);

  // Fetch Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [myRes, loadedDrafts] = await Promise.all([
        complaintsApi.getMyComplaints(user?.branch),
        complaintDraftService.getDrafts(),
      ]);

      if (myRes.success) {
        setMyComplaints(myRes.data);
      }
      setDrafts(loadedDrafts);

      if (isStaffOrLeadership) {
        const adminRes = await complaintsApi.getAdminComplaints(user?.branch).catch(() => ({
          success: false,
          data: [],
        }));
        if (adminRes.success) {
          setAdminComplaints(adminRes.data);
        }
      }
    } catch (err: any) {
      console.warn('[Complaints] Failed to load complaints:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.branch, isStaffOrLeadership]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Explicit Draft Save Handler
  const handleSaveDraft = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title to save this ticket as a draft.');
      return;
    }
    try {
      const saved = await complaintDraftService.saveDraft({
        id: activeDraftId || undefined,
        title: formTitle,
        description: formDescription,
        category: formCategory,
        priority: formPriority,
        itemType: formType,
        status: 'Draft',
      });
      setActiveDraftId(saved.id);
      const updated = await complaintDraftService.getDrafts();
      setDrafts(updated);
      Alert.alert(
        'Draft Saved Locally',
        'Your ticket draft is saved in hardware-encrypted storage. You can edit and submit it whenever you are ready.'
      );
    } catch {
      Alert.alert('Draft Error', 'Failed to save draft to secure storage.');
    }
  };

  // Submission Handler
  const handleSubmit = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Required Field Missing', 'Please enter a concise title for your submission.');
      return;
    }
    if (!formDescription.trim()) {
      Alert.alert('Required Field Missing', 'Please provide a detailed description of the issue or feedback.');
      return;
    }

    // Duplicate Prevention Check
    const submissionHash = `${formType}:${formCategory}:${formTitle.trim().toLowerCase()}`;
    if (submissionHash === lastSubmittedHash) {
      Alert.alert(
        'Duplicate Submission Guard',
        'An identical submission was filed during this session. Please avoid filing duplicate tickets.'
      );
      return;
    }

    try {
      setSubmitting(true);
      if (activeDraftId) {
        await complaintDraftService.updateDraftStatus(activeDraftId, 'Pending submission');
      }

      const res = await complaintsApi.submitComplaintOrFeedback({
        title: formTitle,
        description: formDescription,
        category: formCategory,
        priority: formPriority,
        itemType: formType,
      });

      if (res.success && res.data) {
        if (activeDraftId) {
          await complaintDraftService.updateDraftStatus(activeDraftId, 'Submitted');
          setActiveDraftId(null);
        }
        setLastSubmittedHash(submissionHash);
        setSuccessItem(res.data);
        setFormTitle('');
        setFormDescription('');
        setFormPriority('standard');
        loadData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Submission failed. Please verify network connectivity.';
      // Safely preserve user content in offline draft queue
      const failedDraft = await complaintDraftService.saveDraft({
        id: activeDraftId || undefined,
        title: formTitle,
        description: formDescription,
        category: formCategory,
        priority: formPriority,
        itemType: formType,
        status: 'Failed',
        lastError: msg,
      });
      setActiveDraftId(failedDraft.id);
      const updated = await complaintDraftService.getDrafts();
      setDrafts(updated);

      Alert.alert(
        'Transmission Failed • Saved to Offline Drafts',
        `${msg}\n\nYour inputs have been securely preserved in your Offline Drafts tab. You can explicitly retry submission once connectivity is restored.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Explicit Retry Handler for Offline Draft
  const handleRetryDraft = async (draft: ComplaintDraft) => {
    const submissionHash = `${draft.itemType}:${draft.category}:${draft.title.trim().toLowerCase()}`;
    if (submissionHash === lastSubmittedHash) {
      Alert.alert(
        'Duplicate Submission Guard',
        'An identical submission was already confirmed during this session. To prevent duplicates, duplicate transmission is blocked.'
      );
      return;
    }

    try {
      setSubmittingDraftId(draft.id);
      await complaintDraftService.updateDraftStatus(draft.id, 'Pending submission');

      const res = await complaintsApi.submitComplaintOrFeedback({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        priority: draft.priority,
        itemType: draft.itemType,
      });

      if (res.success && res.data) {
        await complaintDraftService.updateDraftStatus(draft.id, 'Submitted');
        setLastSubmittedHash(submissionHash);
        setSuccessItem(res.data);
        loadData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Transmission failed. Verify network connectivity.';
      await complaintDraftService.updateDraftStatus(draft.id, 'Failed', msg);
      const updated = await complaintDraftService.getDrafts();
      setDrafts(updated);
      Alert.alert(
        'Retry Transmission Failed',
        `${msg}\n\nThe draft remains in your offline queue for later retry.`
      );
    } finally {
      setSubmittingDraftId(null);
    }
  };

  // Edit draft in form
  const handleEditDraft = (draft: ComplaintDraft) => {
    setActiveDraftId(draft.id);
    setFormTitle(draft.title);
    setFormDescription(draft.description);
    setFormCategory(draft.category);
    setFormPriority(draft.priority);
    setFormType(draft.itemType);
    setActiveTab('new_submission');
  };

  // Delete draft
  const handleDeleteDraft = (draft: ComplaintDraft) => {
    Alert.alert('Delete Draft', `Are you sure you want to delete "${draft.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await complaintDraftService.deleteDraft(draft.id);
          if (activeDraftId === draft.id) {
            setActiveDraftId(null);
          }
          const updated = await complaintDraftService.getDrafts();
          setDrafts(updated);
        },
      },
    ]);
  };

  // Staff Resolution Handler
  const handleResolveSubmit = async () => {
    if (!selectedForResolution) return;
    if (!resolutionRemarks.trim()) {
      Alert.alert('Remarks Required', 'Please enter official resolution remarks before finalizing.');
      return;
    }

    try {
      setResolving(true);
      const res = await complaintsApi.resolveComplaint(
        selectedForResolution._id,
        resolutionRemarks.trim()
      );

      if (res.success) {
        Alert.alert(
          'Resolution Recorded',
          'Official remarks have been synchronized with the institutional registry and sent to the submitter.'
        );
        setSelectedForResolution(null);
        setResolutionRemarks('');
        loadData();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to record resolution.';
      Alert.alert('Resolution Error', msg);
    } finally {
      setResolving(false);
    }
  };

  // Filtered lists
  const filteredMyComplaints = useMemo(() => {
    return myComplaints.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && item.status === 'pending') ||
        (statusFilter === 'RESOLVED' && item.status === 'answered');

      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [myComplaints, statusFilter, searchQuery]);

  const filteredAdminComplaints = useMemo(() => {
    return adminComplaints.filter((item) => {
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && item.status === 'pending') ||
        (statusFilter === 'RESOLVED' && item.status === 'answered');

      const matchesSearch =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.student?.name && item.student.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.student?.rollNumber && item.student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [adminComplaints, statusFilter, searchQuery]);

  // Current category routing preview
  const currentRouting = useMemo(() => {
    return getCategoryRouting(formCategory, user?.branch);
  }, [formCategory, user?.branch]);

  return (
    <ScreenContainer scrollable={false}>
      {/* Institutional Top Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Grievance & Feedback Management</Text>
            <Text style={styles.headerSubtitle}>
              Institutional ticket triage, department routing, and audit registry
            </Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'my_tickets' && styles.tabBtnActive]}
            onPress={() => setActiveTab('my_tickets')}
          >
            <Text style={[styles.tabText, activeTab === 'my_tickets' && styles.tabTextActive]}>
              My Submissions ({myComplaints.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'drafts' && styles.tabBtnActive]}
            onPress={() => setActiveTab('drafts')}
          >
            <Text style={[styles.tabText, activeTab === 'drafts' && styles.tabTextActive]}>
              Offline Drafts ({drafts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'new_submission' && styles.tabBtnActive]}
            onPress={() => setActiveTab('new_submission')}
          >
            <Text style={[styles.tabText, activeTab === 'new_submission' && styles.tabTextActive]}>
              + File New Ticket
            </Text>
          </TouchableOpacity>

          {isStaffOrLeadership && (
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'staff_oversight' && styles.tabBtnActive]}
              onPress={() => setActiveTab('staff_oversight')}
            >
              <Text style={[styles.tabText, activeTab === 'staff_oversight' && styles.tabTextActive]}>
                Staff Oversight ({adminComplaints.length})
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'routing_matrix' && styles.tabBtnActive]}
            onPress={() => setActiveTab('routing_matrix')}
          >
            <Text style={[styles.tabText, activeTab === 'routing_matrix' && styles.tabTextActive]}>
              Routing Matrix & Policy
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Body */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Synchronizing grievance registry...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={styles.bodyContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.primary}
            />
          }
        >
          {/* ========================================================================= */}
          {/* TAB 1: MY SUBMISSIONS                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'my_tickets' && (
            <View>
              {/* Summary Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{myComplaints.length}</Text>
                  <Text style={styles.statLbl}>Total Filed</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: '#F59E0B' }]}>
                    {myComplaints.filter((c) => c.status === 'pending').length}
                  </Text>
                  <Text style={styles.statLbl}>Under Triage</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNum, { color: '#10B981' }]}>
                    {myComplaints.filter((c) => c.status === 'answered').length}
                  </Text>
                  <Text style={styles.statLbl}>Resolved</Text>
                </View>
              </View>

              {/* Filters & Search */}
              <View style={styles.filterSection}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by title, reference ID, or category..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <View style={styles.filterPillsRow}>
                  <TouchableOpacity
                    style={[styles.filterPill, statusFilter === 'ALL' && styles.filterPillActive]}
                    onPress={() => setStatusFilter('ALL')}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        statusFilter === 'ALL' && styles.filterPillTextActive,
                      ]}
                    >
                      All Tickets
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterPill, statusFilter === 'PENDING' && styles.filterPillActive]}
                    onPress={() => setStatusFilter('PENDING')}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        statusFilter === 'PENDING' && styles.filterPillTextActive,
                      ]}
                    >
                      Under Triage
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterPill, statusFilter === 'RESOLVED' && styles.filterPillActive]}
                    onPress={() => setStatusFilter('RESOLVED')}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        statusFilter === 'RESOLVED' && styles.filterPillTextActive,
                      ]}
                    >
                      Resolved
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tickets List */}
              {filteredMyComplaints.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Submissions Recorded</Text>
                  <Text style={styles.emptyDesc}>
                    {myComplaints.length === 0
                      ? 'You have not submitted any complaints or feedback items. Tap "File New Ticket" to report an institutional issue.'
                      : 'No tickets match your active search or filter criteria.'}
                  </Text>
                </View>
              ) : (
                filteredMyComplaints.map((item) => (
                  <View key={item._id} style={styles.ticketCard}>
                    {/* Header Row: Ref & Status */}
                    <View style={styles.ticketHeaderRow}>
                      <View style={styles.refPill}>
                        <Text style={styles.refText}>{item.referenceNumber}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {item.priority === 'urgent' && (
                          <View style={styles.urgentPill}>
                            <Text style={styles.urgentPillText}>URGENT</Text>
                          </View>
                        )}
                        <View
                          style={[
                            styles.statusPill,
                            item.status === 'answered' ? styles.statusPillResolved : styles.statusPillPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              item.status === 'answered'
                                ? styles.statusPillTextResolved
                                : styles.statusPillTextPending,
                            ]}
                          >
                            {item.status === 'answered' ? 'RESOLVED' : 'UNDER TRIAGE'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Metadata line */}
                    <View style={styles.metaRow}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {item.itemType === 'feedback' ? 'FEEDBACK' : 'COMPLAINT'}
                        </Text>
                      </View>
                      <Text style={styles.categoryBadgeText}>{item.categoryLabel}</Text>
                      <Text style={styles.timestampText}>
                        {new Date(item.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>

                    {/* Title & Description */}
                    <Text style={styles.ticketTitle}>{item.title}</Text>
                    <Text style={styles.ticketDesc}>{item.description}</Text>

                    {/* Assigned Routing Destination */}
                    <View style={styles.routingBox}>
                      <Text style={styles.routingLabel}>Institutional Routing Destination:</Text>
                      <Text style={styles.routingTargetText}>{item.routingTarget}</Text>
                    </View>

                    {/* Image Attachment Link */}
                    {item.imageUrl && (
                      <TouchableOpacity
                        style={styles.attachmentLink}
                        onPress={() => setViewingAttachmentUrl(item.imageUrl || null)}
                      >
                        <Text style={styles.attachmentLinkText}>
                          View File Attachment on Record →
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Resolution Card if resolved */}
                    {item.status === 'answered' && (
                      <View style={styles.resolutionBox}>
                        <View style={styles.resolutionHeaderRow}>
                          <Text style={styles.resolutionTitle}>Official Institutional Remarks</Text>
                          {item.answeredAt ? (
                            <Text style={styles.resolutionDate}>
                              {new Date(item.answeredAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={styles.resolutionBody}>{item.answer}</Text>
                        <Text style={styles.resolvedByText}>
                          Resolved by: {item.answeredBy || 'Academic Administrator'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* TAB 1.5: OFFLINE DRAFTS QUEUE                                             */}
          {/* ========================================================================= */}
          {activeTab === 'drafts' && (
            <View>
              <View style={styles.draftsHeaderCard}>
                <Text style={styles.draftsHeaderTitle}>Offline Grievance & Feedback Drafts</Text>
                <Text style={styles.draftsHeaderDesc}>
                  Unsent tickets stored locally in hardware-encrypted SecureStore. Submissions that fail due to network interruptions are preserved here for explicit retry.
                </Text>
              </View>

              {drafts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Saved Drafts</Text>
                  <Text style={styles.emptyDesc}>
                    You have no unsent or offline drafts. If a ticket cannot reach the server, it will be saved here automatically.
                  </Text>
                  <Button
                    title="+ File New Ticket"
                    onPress={() => setActiveTab('new_submission')}
                    variant="primary"
                    style={{ marginTop: 16 }}
                  />
                </View>
              ) : (
                drafts.map((d) => (
                  <View key={d.id} style={styles.draftCard}>
                    <View style={styles.draftHeaderRow}>
                      <View style={styles.draftTypePill}>
                        <Text style={styles.draftTypeText}>{d.itemType.toUpperCase()}</Text>
                      </View>
                      <View
                        style={[
                          styles.draftStatusPill,
                          d.status === 'Draft'
                            ? styles.draftStatusNeutral
                            : d.status === 'Pending submission'
                            ? styles.draftStatusPending
                            : styles.draftStatusFailed,
                        ]}
                      >
                        <Text style={styles.draftStatusText}>
                          {d.status === 'Draft'
                            ? 'UNSENT DRAFT'
                            : d.status === 'Pending submission'
                            ? 'PENDING TRANSMISSION'
                            : 'SUBMISSION FAILED'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.draftTitle}>{d.title}</Text>
                    <Text style={styles.draftCategory}>{CATEGORY_LABELS[d.category] || d.category}</Text>
                    <Text style={styles.draftDescription} numberOfLines={3}>
                      {d.description}
                    </Text>

                    {d.lastError ? (
                      <View style={styles.draftErrorBox}>
                        <Text style={styles.draftErrorText}>Error: {d.lastError}</Text>
                      </View>
                    ) : null}

                    <Text style={styles.draftTimestamp}>
                      Saved: {new Date(d.updatedAt).toLocaleString()}
                    </Text>

                    <View style={styles.draftActionRow}>
                      <TouchableOpacity
                        style={styles.draftSubmitBtn}
                        onPress={() => handleRetryDraft(d)}
                        disabled={submittingDraftId === d.id}
                      >
                        {submittingDraftId === d.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.draftSubmitBtnText}>Submit Now (Retry)</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.draftEditBtn}
                        onPress={() => handleEditDraft(d)}
                      >
                        <Text style={styles.draftEditBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.draftDeleteBtn}
                        onPress={() => handleDeleteDraft(d)}
                      >
                        <Text style={styles.draftDeleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: FILE NEW TICKET                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'new_submission' && (
            <View style={styles.formContainer}>
              {activeDraftId && (
                <View style={styles.activeDraftBanner}>
                  <Text style={styles.activeDraftBannerText}>
                    📝 Editing Offline Draft • Tap 'Save to Offline Drafts' to update or 'Submit' to transmit
                  </Text>
                </View>
              )}
              {/* Type Switcher */}
              <Text style={styles.formSectionLabel}>Submission Type</Text>
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.typeToggleBtn,
                    formType === 'complaint' && styles.typeToggleBtnActive,
                  ]}
                  onPress={() => setFormType('complaint')}
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      formType === 'complaint' && styles.typeToggleTextActive,
                    ]}
                  >
                    Actionable Complaint
                  </Text>
                  <Text style={styles.typeToggleSub}>Defect, breakdown, or grievance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeToggleBtn,
                    formType === 'feedback' && styles.typeToggleBtnActive,
                  ]}
                  onPress={() => setFormType('feedback')}
                >
                  <Text
                    style={[
                      styles.typeToggleText,
                      formType === 'feedback' && styles.typeToggleTextActive,
                    ]}
                  >
                    Institutional Feedback
                  </Text>
                  <Text style={styles.typeToggleSub}>Suggestions & enhancements</Text>
                </TouchableOpacity>
              </View>

              {/* Category Picker */}
              <Text style={styles.formSectionLabel}>Institutional Category</Text>
              {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((catKey) => (
                <TouchableOpacity
                  key={catKey}
                  style={[
                    styles.categoryChoiceItem,
                    formCategory === catKey && styles.categoryChoiceItemActive,
                  ]}
                  onPress={() => setFormCategory(catKey)}
                >
                  <View style={styles.radioDotOuter}>
                    {formCategory === catKey && <View style={styles.radioDotInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.categoryChoiceTitle,
                        formCategory === catKey && styles.categoryChoiceTitleActive,
                      ]}
                    >
                      {CATEGORY_LABELS[catKey]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Dynamic Routing Disclosure */}
              <View style={styles.routingPreviewBox}>
                <Text style={styles.routingPreviewTitle}>Responsible Institutional Desk:</Text>
                <Text style={styles.routingPreviewTarget}>{currentRouting.target}</Text>
                <Text style={styles.routingPreviewNote}>
                  {currentRouting.isAssigned
                    ? 'This concern will be routed directly to the Department HOD & Academic Registry for administrative review.'
                    : 'Unassigned facilities are routed to the central Administrative Triage Cell (Campus Admin) for dispatch.'}
                </Text>
              </View>

              {/* Priority Selector (for complaints) */}
              {formType === 'complaint' && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.formSectionLabel}>Priority Level</Text>
                  <View style={styles.priorityRow}>
                    <TouchableOpacity
                      style={[
                        styles.priorityBtn,
                        formPriority === 'standard' && styles.priorityBtnActive,
                      ]}
                      onPress={() => setFormPriority('standard')}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          formPriority === 'standard' && styles.priorityTextActive,
                        ]}
                      >
                        Standard
                      </Text>
                      <Text style={styles.prioritySub}>Routine resolution</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.priorityBtn,
                        formPriority === 'urgent' && styles.priorityBtnUrgentActive,
                      ]}
                      onPress={() => setFormPriority('urgent')}
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          formPriority === 'urgent' && styles.priorityTextUrgentActive,
                        ]}
                      >
                        Urgent
                      </Text>
                      <Text style={styles.prioritySub}>Safety / Exam impact</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Title Input */}
              <Text style={styles.formSectionLabel}>Title / Concise Summary</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Projector HDMI connector damaged in Room 302"
                placeholderTextColor="#64748B"
                value={formTitle}
                onChangeText={setFormTitle}
                maxLength={100}
              />

              {/* Description Input */}
              <Text style={styles.formSectionLabel}>Detailed Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe the issue, exact classroom/block location, and impact on lectures or operations..."
                placeholderTextColor="#64748B"
                value={formDescription}
                onChangeText={setFormDescription}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={2000}
              />

              {/* Attachment Policy Note */}
              <View style={styles.attachmentNoticeCard}>
                <Text style={styles.attachmentNoticeTitle}>File Attachments & Evidence</Text>
                <Text style={styles.attachmentNoticeBody}>
                  Attachments are securely stored in the campus file repository with a 5MB size limit. Photo evidence can also be attached via desktop portal or mobile camera upload.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{ marginTop: 8, gap: 10 }}>
                <Button
                  title={submitting ? 'Transmitting Ticket...' : 'Submit Institutional Ticket'}
                  onPress={handleSubmit}
                  disabled={submitting}
                />
                <Button
                  title="Save to Offline Drafts"
                  onPress={handleSaveDraft}
                  variant="outline"
                  disabled={submitting}
                />
                {activeDraftId && (
                  <Button
                    title="Cancel Draft Editing"
                    onPress={() => {
                      setActiveDraftId(null);
                      setFormTitle('');
                      setFormDescription('');
                      setActiveTab('drafts');
                    }}
                    variant="secondary"
                    disabled={submitting}
                  />
                )}
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: STAFF OVERSIGHT & RESOLUTION (HOD / LEADERSHIP)                    */}
          {/* ========================================================================= */}
          {activeTab === 'staff_oversight' && isStaffOrLeadership && (
            <View>
              <View style={styles.oversightHeaderCard}>
                <Text style={styles.oversightTitle}>
                  {user?.role === 'hod'
                    ? `${user.branch || 'Department'} Grievance & Query Roster`
                    : 'Campus Grievance & Query Roster'}
                </Text>
                <Text style={styles.oversightDesc}>
                  Review inquiries and actionable complaints submitted by students within your designated institutional scope. Dual-control records and resolution remarks are audited.
                </Text>
              </View>

              {/* Filter Row */}
              <View style={styles.filterSection}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter by student roll, name, or keywords..."
                  placeholderTextColor="#64748B"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <View style={styles.filterPillsRow}>
                  <TouchableOpacity
                    style={[styles.filterPill, statusFilter === 'ALL' && styles.filterPillActive]}
                    onPress={() => setStatusFilter('ALL')}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        statusFilter === 'ALL' && styles.filterPillTextActive,
                      ]}
                    >
                      All ({adminComplaints.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterPill, statusFilter === 'PENDING' && styles.filterPillActive]}
                    onPress={() => setStatusFilter('PENDING')}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        statusFilter === 'PENDING' && styles.filterPillTextActive,
                      ]}
                    >
                      Pending ({adminComplaints.filter((c) => c.status === 'pending').length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterPill, statusFilter === 'RESOLVED' && styles.filterPillActive]}
                    onPress={() => setStatusFilter('RESOLVED')}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        statusFilter === 'RESOLVED' && styles.filterPillTextActive,
                      ]}
                    >
                      Resolved ({adminComplaints.filter((c) => c.status === 'answered').length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {filteredAdminComplaints.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyTitle}>No Scoped Inquiries or Grievances</Text>
                  <Text style={styles.emptyDesc}>
                    There are currently no complaints or queries within your authorized academic scope matching the filter.
                  </Text>
                </View>
              ) : (
                filteredAdminComplaints.map((item) => (
                  <View key={item._id} style={styles.ticketCard}>
                    {/* Header */}
                    <View style={styles.ticketHeaderRow}>
                      <View style={styles.refPill}>
                        <Text style={styles.refText}>{item.referenceNumber}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          item.status === 'answered' ? styles.statusPillResolved : styles.statusPillPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            item.status === 'answered'
                              ? styles.statusPillTextResolved
                              : styles.statusPillTextPending,
                          ]}
                        >
                          {item.status === 'answered' ? 'RESOLVED' : 'PENDING ACTION'}
                        </Text>
                      </View>
                    </View>

                    {/* Submitter info */}
                    <View style={styles.submitterCard}>
                      <Text style={styles.submitterName}>
                        {item.student?.name || 'Student Submitter'}
                      </Text>
                      <Text style={styles.submitterMeta}>
                        Roll: {item.student?.rollNumber || 'N/A'} • Branch: {item.student?.branch || 'N/A'} • Sec: {item.student?.section || 'N/A'}
                      </Text>
                      <Text style={styles.submitterEmail}>{item.student?.email || 'N/A'}</Text>
                    </View>

                    {/* Category & Title */}
                    <View style={styles.metaRow}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {item.itemType === 'feedback' ? 'FEEDBACK' : 'COMPLAINT'}
                        </Text>
                      </View>
                      <Text style={styles.categoryBadgeText}>{item.categoryLabel}</Text>
                      <Text style={styles.timestampText}>
                        {new Date(item.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>

                    <Text style={styles.ticketTitle}>{item.title}</Text>
                    <Text style={styles.ticketDesc}>{item.description}</Text>

                    {/* Image Attachment Link */}
                    {item.imageUrl && (
                      <TouchableOpacity
                        style={styles.attachmentLink}
                        onPress={() => setViewingAttachmentUrl(item.imageUrl || null)}
                      >
                        <Text style={styles.attachmentLinkText}>
                          Inspect Photo Evidence on Record →
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Resolution Details or Action Button */}
                    {item.status === 'answered' ? (
                      <View style={styles.resolutionBox}>
                        <Text style={styles.resolutionTitle}>Official Resolution Remarks</Text>
                        <Text style={styles.resolutionBody}>{item.answer}</Text>
                        <Text style={styles.resolvedByText}>
                          Resolved by: {item.answeredBy || 'Authorized Lead'}
                        </Text>
                      </View>
                    ) : (
                      <Button
                        title="Record Official Resolution →"
                        onPress={() => {
                          setSelectedForResolution(item);
                          setResolutionRemarks('');
                        }}
                        style={{ marginTop: 12, backgroundColor: '#10B981' }}
                      />
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: ROUTING MATRIX & POLICIES                                          */}
          {/* ========================================================================= */}
          {activeTab === 'routing_matrix' && (
            <View>
              <View style={styles.matrixCard}>
                <Text style={styles.matrixTitle}>Institutional Category Routing Matrix</Text>
                <Text style={styles.matrixIntro}>
                  CampusBridge routes grievances using configured institutional roles. The responsible office is derived strictly from real institutional data:
                </Text>

                <View style={styles.matrixRow}>
                  <Text style={styles.matrixCat}>Academic Concerns & Curriculum</Text>
                  <Text style={styles.matrixLead}>Department HOD & Academic Registry</Text>
                  <Text style={styles.matrixDesc}>
                    Syllabus overlap, lecture coverage, attendance disputes, and faculty coordination.
                  </Text>
                </View>

                <View style={styles.matrixRow}>
                  <Text style={styles.matrixCat}>Classroom Equipment & Infrastructure</Text>
                  <Text style={styles.matrixLead}>Administrative Triage (Campus Admin)</Text>
                  <Text style={styles.matrixDesc}>
                    Projectors, electrical fixtures, laboratory workstations, and seating amenities.
                  </Text>
                </View>

                <View style={styles.matrixRow}>
                  <Text style={styles.matrixCat}>Cleaning & Sanitation</Text>
                  <Text style={styles.matrixLead}>Administrative Triage (Campus Admin)</Text>
                  <Text style={styles.matrixDesc}>
                    Washrooms, corridor cleanliness, waste disposal, and drinking water facilities.
                  </Text>
                </View>

                <View style={styles.matrixRow}>
                  <Text style={styles.matrixCat}>Network, Laboratory & IT Support</Text>
                  <Text style={styles.matrixLead}>Administrative Triage (Campus Admin)</Text>
                  <Text style={styles.matrixDesc}>
                    Wi-Fi authentication, laboratory software versions, and portal access issues.
                  </Text>
                </View>
              </View>

              <View style={styles.matrixCard}>
                <Text style={styles.matrixTitle}>Non-Destructive Audit & Anti-Retaliation Policy</Text>
                <Text style={styles.policyBody}>
                  1. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Immutable Audit Retention:</Text> All submitted complaints, inquiries, and staff resolution remarks are permanently retained in the institutional AuditLog collection. Deletion of historical records is strictly prohibited.
                </Text>
                <Text style={styles.policyBody}>
                  2. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Scope Isolation:</Text> Faculty and HODs cannot view complaints outside their authorized department. Cross-campus data inspection is prohibited.
                </Text>
                <Text style={styles.policyBody}>
                  3. <Text style={{ fontWeight: '700', color: '#F1F5F9' }}>Safe Unassigned State:</Text> When no dedicated facilities staff account is provisioned in the database, tickets route safely to the central Administrative Triage Cell rather than fabricating staff identities.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUBMISSION CONFIRMATION                                            */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(successItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Submission Registered</Text>
            </View>
            <Text style={styles.modalBody}>
              Your ticket has been recorded on the campus registry and transmitted to the responsible office.
            </Text>

            <View style={styles.refDisplayBox}>
              <Text style={styles.refDisplayLabel}>Server Reference Number</Text>
              <Text style={styles.refDisplayValue}>{successItem?.referenceNumber}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Routing Target:</Text>
              <Text style={styles.detailValue}>{successItem?.routingTarget}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Submission Status:</Text>
              <Text style={[styles.detailValue, { color: '#F59E0B' }]}>UNDER TRIAGE</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Recorded At:</Text>
              <Text style={styles.detailValue}>
                {successItem ? new Date(successItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>

            <Button
              title="Close & View My Submissions"
              onPress={() => {
                setSuccessItem(null);
                setActiveTab('my_tickets');
              }}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: STAFF RECORD RESOLUTION                                           */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(selectedForResolution)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedForResolution(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Record Official Resolution</Text>
            <Text style={styles.modalSubtitle}>
              Reference: {selectedForResolution?.referenceNumber} • Submitter: {selectedForResolution?.student?.name}
            </Text>

            <ScrollView style={{ marginVertical: 12 }}>
              <View style={styles.reviewContextBox}>
                <Text style={styles.reviewContextLabel}>Issue Subject:</Text>
                <Text style={styles.reviewContextText}>{selectedForResolution?.title}</Text>
                <Text style={[styles.reviewContextLabel, { marginTop: 8 }]}>Details:</Text>
                <Text style={styles.reviewContextText}>{selectedForResolution?.description}</Text>
              </View>

              <Text style={styles.formSectionLabel}>Official Resolution Remarks</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { minHeight: 120 }]}
                placeholder="Enter corrective action taken, work order numbers, or official institutional decision..."
                placeholderTextColor="#64748B"
                value={resolutionRemarks}
                onChangeText={setResolutionRemarks}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Button
                title="Cancel"
                onPress={() => setSelectedForResolution(null)}
                variant="outline"
                style={{ flex: 1, marginRight: 6 }}
              />
              <Button
                title={resolving ? 'Recording...' : 'Submit Resolution'}
                onPress={handleResolveSubmit}
                disabled={resolving}
                style={{ flex: 1.5, marginLeft: 6, backgroundColor: '#10B981' }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ATTACHMENT VIEWER                                                  */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(viewingAttachmentUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingAttachmentUrl(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>File Evidence Attachment</Text>
            {viewingAttachmentUrl && (
              <Image
                source={{
                  uri: viewingAttachmentUrl,
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }}
                style={styles.attachmentImage}
                resizeMode="contain"
              />
            )}
            <Button
              title="Close Attachment Viewer"
              onPress={() => setViewingAttachmentUrl(null)}
              variant="outline"
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingTop: 12,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabBtnActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#60A5FA',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#94A3B8',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  statLbl: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    fontWeight: '500',
  },
  filterSection: {
    marginBottom: 14,
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterPillActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  filterPillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#60A5FA',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  ticketCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  refText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  urgentPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 6,
  },
  urgentPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EF4444',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusPillPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusPillResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPillTextPending: {
    color: '#F59E0B',
  },
  statusPillTextResolved: {
    color: '#10B981',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timestampText: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 'auto',
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  ticketDesc: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 19,
    marginBottom: 10,
  },
  routingBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  routingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  routingTargetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
    marginTop: 2,
  },
  attachmentLink: {
    paddingVertical: 6,
    marginBottom: 8,
  },
  attachmentLinkText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
  },
  resolutionBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    padding: 10,
    borderRadius: 4,
    marginTop: 6,
  },
  resolutionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resolutionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
  },
  resolutionDate: {
    fontSize: 10,
    color: '#64748B',
  },
  resolutionBody: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 18,
    marginBottom: 6,
  },
  resolvedByText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  formContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  typeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeToggleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeToggleBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  typeToggleTextActive: {
    color: '#60A5FA',
  },
  typeToggleSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  categoryChoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  categoryChoiceItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
  },
  radioDotOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  categoryChoiceTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  categoryChoiceTitleActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  routingPreviewBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 14,
  },
  routingPreviewTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  routingPreviewTarget: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
    marginTop: 3,
  },
  routingPreviewNote: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    padding: 9,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  priorityBtnActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
  },
  priorityBtnUrgentActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  priorityTextActive: {
    color: '#60A5FA',
  },
  priorityTextUrgentActive: {
    color: '#EF4444',
  },
  prioritySub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
  },
  attachmentNoticeCard: {
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  attachmentNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  attachmentNoticeBody: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  oversightHeaderCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  oversightTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  oversightDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  submitterCard: {
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  submitterName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  submitterMeta: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  submitterEmail: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  matrixCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
  },
  matrixTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  matrixIntro: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  matrixRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  matrixCat: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  matrixLead: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
    marginTop: 2,
  },
  matrixDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    marginTop: 3,
  },
  policyBody: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 18,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeaderRow: {
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalBody: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    marginBottom: 14,
  },
  refDisplayBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginBottom: 14,
  },
  refDisplayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  refDisplayValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#60A5FA',
    letterSpacing: 1,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  detailLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  reviewContextBox: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  reviewContextLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  reviewContextText: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
    lineHeight: 17,
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  attachmentImage: {
    width: '100%',
    height: 320,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    marginVertical: 12,
  },
  activeDraftBanner: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.primary,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  activeDraftBannerText: {
    fontSize: 12,
    color: '#818CF8',
    fontWeight: '600',
  },
  draftsHeaderCard: {
    backgroundColor: THEME.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  draftsHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  draftsHeaderDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  draftCard: {
    backgroundColor: THEME.colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 12,
  },
  draftHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  draftTypePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  draftTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  draftStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  draftStatusNeutral: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  draftStatusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  draftStatusFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  draftStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: 0.5,
  },
  draftTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.text,
    marginBottom: 2,
  },
  draftCategory: {
    fontSize: 12,
    color: THEME.colors.accent,
    fontWeight: '600',
    marginBottom: 6,
  },
  draftDescription: {
    fontSize: 13,
    color: THEME.colors.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  draftErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  draftErrorText: {
    fontSize: 11,
    color: '#FCA5A5',
    lineHeight: 15,
  },
  draftTimestamp: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  draftActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  draftSubmitBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  draftEditBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  draftEditBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  draftDeleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    alignItems: 'center',
  },
  draftDeleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
});
