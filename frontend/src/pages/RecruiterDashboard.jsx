import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import { sfx } from '../utils/audioVfx';
import './RecruiterDashboard.css';

const LIFECYCLE_STAGES = [
  { key: 'applied', label: '1. Applied', icon: '📝', color: '#818CF8' },
  { key: 'shortlisted', label: '2. Shortlisted', icon: '📋', color: '#38BDF8' },
  { key: 'online_test_cleared', label: '3. Test Cleared', icon: '🧪', color: '#FBBF24' },
  { key: 'interview_round_1', label: '4. Interview 1', icon: '🎙️', color: '#FB923C' },
  { key: 'interview_round_2', label: '5. Interview 2', icon: '🗣️', color: '#C084FC' },
  { key: 'selected', label: '6. Selected', icon: '🏆', color: '#34D399' },
  { key: 'offered', label: '7. Offered', icon: '📜', color: '#10B981' },
  { key: 'rejected', label: 'Rejected', icon: '❌', color: '#F87171' }
];

const RecruiterDashboard = () => {
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'drives' | 'pipeline' | 'analytics'
  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Filters for Suitable Students Pool
  const [searchQuery, setSearchQuery] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState(6.5);
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [eligibleOnly, setEligibleOnly] = useState(false);

  // Drive Creation Modal State
  const [showCreateDriveModal, setShowCreateDriveModal] = useState(false);
  const [driveForm, setDriveForm] = useState({
    role: 'Software Development Engineer',
    packageDetails: '12.0 LPA',
    title: '',
    tier: 'Dream (6-10 LPA)',
    location: 'Campus / Hybrid',
    driveDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    minCgpa: 7.0,
    allowedBranches: 'CSE, IT, ECE, CSIT, AIML',
    allowedBatches: '2025, 2026',
    maxBacklogs: 0,
    skillsRequired: 'Python, SQL, DSA, Web Development',
    jobDescription: 'Full-time campus recruitment drive covering online aptitude test, coding assessment, and technical interview rounds.'
  });

  // Stage Advancement Modal State
  const [stageModal, setStageModal] = useState({
    isOpen: false,
    candidate: null,
    driveId: '',
    targetStage: '',
    roundName: '',
    interviewDate: '',
    interviewTime: '',
    venue: 'Campus Placement Hall',
    meetingLink: '',
    interviewerNotes: '',
    offeredPackage: ''
  });

  // Candidate Selection in Talent Pool
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Detailed Candidate Profile & Portfolio Modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  // Conduct Exam Modal State
  const [showConductExamModal, setShowConductExamModal] = useState(false);
  const [examForm, setExamForm] = useState({
    examTitle: 'Campus Cognitive & Technical Assessment',
    examLink: 'https://hackerrank.com/griet-campus-recruitment-test',
    examDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    examTime: '10:00',
    instructions: '75 minutes duration. Covers Aptitude, Data Structures, Algorithms, and Core CS Fundamentals. Please maintain active webcam.',
    specificPhone: '8074701052'
  });

  // Bulk Import Test Cleared Students Modal State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportPhone, setBulkImportPhone] = useState('8074701052');

  // Bulk Advance Modal State (Interview 1, Interview 2, Selected)
  const [bulkAdvanceModal, setBulkAdvanceModal] = useState({
    isOpen: false,
    targetStage: 'interview_round_1',
    interviewDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    interviewTime: '11:00',
    venue: 'Campus Placement Hall A / Google Meet',
    meetingLink: 'https://meet.google.com/griet-tech-interview',
    interviewerNotes: 'Technical Round 1: Algorithms, deployed projects review, and core problem solving.',
    offeredPackage: '12.0 LPA',
    studentIds: [],
    specificPhone: '8074701052'
  });

  // Fetch recruiter's on-campus drives
  const fetchMyDrives = async () => {
    try {
      const res = await fetch(`${API_URL}/recruiter/my-drives`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDrives(data.data || []);
        if (data.data && data.data.length > 0 && !selectedDriveId) {
          setSelectedDriveId(data.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching drives:', err);
    }
  };

  // Fetch suitable students pool
  const fetchSuitableStudents = async () => {
    try {
      setStudentsLoading(true);
      const params = new URLSearchParams({
        minCgpa: minCgpaFilter,
        eligibleOnly: eligibleOnly ? 'true' : 'false'
      });
      if (selectedDriveId) params.append('driveId', selectedDriveId);
      if (branchFilter && branchFilter !== 'ALL') params.append('branches', branchFilter);
      if (batchFilter && batchFilter !== 'ALL') params.append('batches', batchFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_URL}/recruiter/suitable-students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching suitable students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      const init = async () => {
        setLoading(true);
        await fetchMyDrives();
        setLoading(false);
      };
      init();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchSuitableStudents();
    }
  }, [selectedDriveId, minCgpaFilter, branchFilter, batchFilter, eligibleOnly, token]);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSuitableStudents();
  };

  // Fast-track invite student to drive
  const handleInviteStudent = async (student) => {
    if (!selectedDriveId && drives.length === 0) {
      setError('Please create or select an on-campus drive before inviting students.');
      return;
    }
    const targetDriveId = selectedDriveId || drives[0]._id;

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/recruiter/invite-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: student._id,
          driveId: targetDriveId
        })
      });

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`🎉 Fast-Track Invitation dispatched to ${student.name} (${student.rollNumber})!`);
        setStudents((prev) =>
          prev.map((s) => (s._id === student._id ? { ...s, invited: true } : s))
        );
      } else {
        setError(data.error || 'Failed to send invitation.');
      }
    } catch (err) {
      setError('Could not connect to invitation service.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Drive Submission
  const handleCreateDrive = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/recruiter/drives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...driveForm,
          companyName: user.companyName || driveForm.companyName,
          eligibility: {
            minCgpa: Number(driveForm.minCgpa),
            allowedBranches: driveForm.allowedBranches.split(',').map((b) => b.trim()),
            allowedBatches: driveForm.allowedBatches.split(',').map((b) => b.trim()),
            maxActiveBacklogs: Number(driveForm.maxBacklogs)
          },
          skillsRequired: driveForm.skillsRequired.split(',').map((s) => s.trim()),
          dates: {
            registrationDeadline: driveForm.deadline,
            driveDate: driveForm.driveDate
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`🏢 Placement Drive for ${driveForm.role} published! Synced to campus calendar & notified eligible students.`);
        setShowCreateDriveModal(false);
        fetchMyDrives();
      } else {
        setError(data.error || 'Failed to post drive.');
      }
    } catch (err) {
      setError('Could not create placement drive.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Stage Update Submission
  const handleStageUpdate = async (e) => {
    e.preventDefault();
    if (!stageModal.candidate || !stageModal.driveId) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(
        `${API_URL}/recruiter/candidates/${stageModal.driveId}/${stageModal.candidate.student || stageModal.candidate._id}/stage`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            stage: stageModal.targetStage,
            interviewSchedule: {
              roundName: stageModal.roundName || stageModal.targetStage.replace(/_/g, ' ').toUpperCase(),
              scheduledAt: stageModal.interviewDate
                ? stageModal.interviewTime
                  ? `${stageModal.interviewDate}T${stageModal.interviewTime}`
                  : stageModal.interviewDate
                : undefined,
              venue: stageModal.venue,
              meetingLink: stageModal.meetingLink,
              interviewerNotes: stageModal.interviewerNotes
            },
            offeredPackage: stageModal.offeredPackage
          })
        }
      );

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`🎉 Candidate advanced to ${stageModal.targetStage.toUpperCase().replace(/_/g, ' ')}! Notification sent.`);
        setStageModal({ isOpen: false, candidate: null, driveId: '', targetStage: '' });
        fetchMyDrives();
        fetchSuitableStudents();
      } else {
        setError(data.error || 'Failed to update candidate stage.');
      }
    } catch (err) {
      setError('Could not update candidate stage.');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle individual student selection
  const handleToggleSelectStudent = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  // Select all eligible students
  const handleSelectAllEligible = () => {
    const eligibleIds = students.filter(s => s.isEligible).map(s => s._id);
    if (eligibleIds.length === 0) return;
    if (selectedStudentIds.length === eligibleIds.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(eligibleIds);
    }
  };

  // Bulk Add Selected to Pipeline
  const handleBulkAddToPipeline = async () => {
    const driveId = selectedDriveId || (drives.length > 0 ? drives[0]._id : '');
    if (!driveId) {
      setError('Please select an on-campus placement drive first.');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setError('Please select at least one student.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/recruiter/drives/${driveId}/bulk-add-candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ studentIds: selectedStudentIds })
      });
      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`🎉 Successfully added ${data.addedCount} candidate(s) into the drive pipeline!`);
        setSelectedStudentIds([]);
        fetchMyDrives();
        fetchSuitableStudents();
      } else {
        setError(data.error || 'Failed to add candidates to pipeline.');
      }
    } catch (err) {
      setError('Could not connect to service.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Conduct Exam Submit
  const handleConductExamSubmit = async (e) => {
    e.preventDefault();
    const driveId = selectedDriveId || (drives.length > 0 ? drives[0]._id : '');
    if (!driveId) {
      setError('Please select or post a placement drive first.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/recruiter/drives/${driveId}/conduct-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...examForm,
          studentIds: selectedStudentIds,
          specificPhone: examForm.specificPhone || '8074701052'
        })
      });

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`📝 Exam '${examForm.examTitle}' scheduled! Email and WhatsApp notifications dispatched (including 8074701052).`);
        setShowConductExamModal(false);
        setSelectedStudentIds([]);
        fetchMyDrives();
        fetchSuitableStudents();
      } else {
        setError(data.error || 'Failed to schedule exam.');
      }
    } catch (err) {
      setError('Could not schedule exam.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Bulk Import Test Cleared File Upload
  const handleBulkImportFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result || '';
      setBulkImportText(prev => prev ? `${prev}\n${content}` : content);
    };
    reader.readAsText(file);
  };

  // Handle Bulk Import Test Cleared Submit
  const handleBulkImportSubmit = async (e) => {
    e.preventDefault();
    const driveId = selectedDriveId || (drives.length > 0 ? drives[0]._id : '');
    if (!driveId) {
      setError('Please select an active placement drive first.');
      return;
    }

    if (!bulkImportText.trim()) {
      setError('Please paste student roll numbers or upload a CSV file.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/recruiter/drives/${driveId}/bulk-import-test-cleared`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rawText: bulkImportText,
          specificPhone: bulkImportPhone || '8074701052'
        })
      });

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`🎉 Successfully imported ${data.clearedCount} student(s) who cleared the test! Advanced to 'Test Cleared' & ready for Interview 1.`);
        setShowBulkImportModal(false);
        setBulkImportText('');
        fetchMyDrives();
        fetchSuitableStudents();
      } else {
        setError(data.error || 'Failed to import test cleared students.');
      }
    } catch (err) {
      setError('Could not import students.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Bulk Advance Modal for a target stage
  const openBulkAdvanceForStage = (targetStage, preselectedIds = []) => {
    const drive = drives.find(d => d._id === selectedDriveId) || drives[0];
    const apps = drive?.applications || [];

    let targetIds = preselectedIds;
    if (targetIds.length === 0) {
      if (targetStage === 'interview_round_1') {
        targetIds = apps.filter(a => a.currentStage === 'online_test_cleared').map(a => String(a.student));
      } else if (targetStage === 'interview_round_2') {
        targetIds = apps.filter(a => a.currentStage === 'interview_round_1').map(a => String(a.student));
      } else if (targetStage === 'selected' || targetStage === 'offered') {
        targetIds = apps.filter(a => a.currentStage === 'interview_round_2').map(a => String(a.student));
      }
    }

    const defaultNotes = {
      interview_round_1: 'Technical Interview 1: Data Structures, Algorithms, System Concepts, and Deployed Projects.',
      interview_round_2: 'Interview 2 (Managerial & Cultural Fit): Architecture design, team problem solving, and behavioral.',
      selected: 'Final Selection: Candidate has successfully cleared all technical and managerial rounds.',
      offered: 'Offer Letter: Congratulate candidate and issue official campus placement package.'
    };

    setBulkAdvanceModal({
      isOpen: true,
      targetStage,
      interviewDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      interviewTime: '11:00',
      venue: 'Campus Placement Cell Hall A / Google Meet',
      meetingLink: 'https://meet.google.com/griet-campus-interview',
      interviewerNotes: defaultNotes[targetStage] || '',
      offeredPackage: drive?.packageDetails || '12.0 LPA',
      studentIds: targetIds,
      specificPhone: '8074701052'
    });
  };

  // Handle Bulk Advance Stage Submit
  const handleBulkAdvanceSubmit = async (e) => {
    e.preventDefault();
    const driveId = selectedDriveId || (drives.length > 0 ? drives[0]._id : '');
    if (!driveId) return;

    if (!bulkAdvanceModal.studentIds || bulkAdvanceModal.studentIds.length === 0) {
      setError('No candidates found or selected for this stage advancement.');
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/recruiter/drives/${driveId}/bulk-advance-stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentIds: bulkAdvanceModal.studentIds,
          targetStage: bulkAdvanceModal.targetStage,
          interviewDate: bulkAdvanceModal.interviewDate,
          interviewTime: bulkAdvanceModal.interviewTime,
          venue: bulkAdvanceModal.venue,
          meetingLink: bulkAdvanceModal.meetingLink,
          interviewerNotes: bulkAdvanceModal.interviewerNotes,
          offeredPackage: bulkAdvanceModal.offeredPackage,
          specificPhone: bulkAdvanceModal.specificPhone || '8074701052'
        })
      });

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`📢 Successfully advanced ${data.updatedCount} candidate(s) to ${bulkAdvanceModal.targetStage.replace(/_/g, ' ').toUpperCase()}! Email and WhatsApp notifications dispatched.`);
        setBulkAdvanceModal(prev => ({ ...prev, isOpen: false }));
        fetchMyDrives();
      } else {
        setError(data.error || 'Failed to advance candidates.');
      }
    } catch (err) {
      setError('Could not advance candidates.');
    } finally {
      setActionLoading(false);
    }
  };

  // Export Suitable Students to CSV
  const handleExportCSV = () => {
    const params = new URLSearchParams({
      minCgpa: minCgpaFilter
    });
    if (selectedDriveId) params.append('driveId', selectedDriveId);

    window.open(`${API_URL}/recruiter/export-csv?${params.toString()}&token=${token}`, '_blank');
  };

  // Selected Drive Object
  const currentDrive = drives.find((d) => d._id === selectedDriveId) || drives[0] || null;

  // Selected Drive Applications List
  const candidateApplications = currentDrive?.applications || [];

  // Temporary Credentials Expiry Calculation
  const expiresAt = user?.recruiterExpiresAt ? new Date(user.recruiterExpiresAt) : null;
  const daysRemaining = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)) : null;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7;

  // KPI Calculations
  const eligibleCount = students.filter((s) => s.isEligible).length;
  const totalApplicants = drives.reduce((acc, d) => acc + (d.applications?.length || 0), 0);
  const totalSelected = drives.reduce(
    (acc, d) =>
      acc + (d.applications?.filter((a) => a.currentStage === 'selected' || a.currentStage === 'offered').length || 0),
    0
  );

  return (
    <>
      <Header title="Campus Recruiter Portal" />

      <div className="content-wrapper recruiter-dashboard-container animate-fade">
        {/* Error Notification Banner */}
        {error && (
          <div className="error-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button type="button" className="banner-close-btn" onClick={() => setError('')} title="Dismiss">
              ×
            </button>
          </div>
        )}

        {/* Success Notification Banner */}
        {successMsg && (
          <div className="success-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{successMsg}</span>
            <button type="button" className="banner-close-btn" onClick={() => setSuccessMsg('')} title="Dismiss">
              ×
            </button>
          </div>
        )}

        {/* Recruiter Hero Banner */}
        <div className="recruiter-hero-banner">
          <div className="recruiter-hero-left">
            <div className="recruiter-badge-strip">
              <span className="recruiter-company-tag">
                🏢 {user?.companyName || 'Corporate Recruiter'} • Campus Recruitment Portal
              </span>
              {expiresAt && (
                <span className={`recruiter-validity-pill ${daysRemaining === 0 ? 'expired' : isExpiringSoon ? 'warning' : ''}`}>
                  ⏱️ {daysRemaining === 0 ? 'Access Expired Today' : `${daysRemaining} Days Access Remaining`} (Valid until: {expiresAt.toLocaleDateString()})
                </span>
              )}
            </div>
            <h1 className="recruiter-hero-title">
              Welcome, {user?.name || 'Recruiter'}
            </h1>
            <p className="recruiter-hero-desc">
              Discover suitable students matching your company criteria, post and manage on-campus placement drives, review candidate profiles, and schedule interview rounds.
            </p>
          </div>

          <div className="recruiter-hero-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                fetchMyDrives();
                fetchSuitableStudents();
              }}
              title="Refresh drives and student pool"
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', fontWeight: 700 }}
              onClick={() => setShowCreateDriveModal(true)}
            >
              ➕ Post On-Campus Drive
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="recruiter-kpi-grid">
          <div className="recruiter-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
              🏢
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{drives.length}</span>
              <span className="kpi-label">On-Campus Drives</span>
            </div>
          </div>

          <div className="recruiter-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
              🎯
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{eligibleCount}</span>
              <span className="kpi-label">Suitable Students (Pool)</span>
            </div>
          </div>

          <div className="recruiter-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
              📋
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{totalApplicants}</span>
              <span className="kpi-label">Registered Candidates</span>
            </div>
          </div>

          <div className="recruiter-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
              🏆
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{totalSelected}</span>
              <span className="kpi-label">Offers &amp; Selected</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="recruiter-tabs-bar">
          <button
            type="button"
            className={`recruiter-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
          >
            <span>🎯</span>
            <span>Suitable Students Pool</span>
            <span className="recruiter-tab-badge">{students.length}</span>
          </button>

          <button
            type="button"
            className={`recruiter-tab-btn ${activeTab === 'drives' ? 'active' : ''}`}
            onClick={() => setActiveTab('drives')}
          >
            <span>🏢</span>
            <span>Our Placement Drives</span>
            <span className="recruiter-tab-badge">{drives.length}</span>
          </button>

          <button
            type="button"
            className={`recruiter-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            <span>📋</span>
            <span>Candidate Pipeline ({candidateApplications.length})</span>
          </button>

          <button
            type="button"
            className={`recruiter-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <span>📊</span>
            <span>Recruitment Analytics</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: SUITABLE STUDENTS POOL */}
        {/* ========================================================================= */}
        {activeTab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Filter Panel */}
            <div className="talent-filter-panel glass-card">
              <div className="filter-row-top">
                <form onSubmit={handleSearchSubmit} style={{ flex: 2, minWidth: '240px', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by student name, roll number, or skills (e.g., Python, React)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ flex: 1, padding: '0.7rem 1rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#FFFFFF' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '0 1rem' }}>
                    🔍 Search
                  </button>
                </form>

                {drives.length > 0 && (
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <select
                      className="form-control"
                      value={selectedDriveId}
                      onChange={(e) => setSelectedDriveId(e.target.value)}
                      style={{ width: '100%', padding: '0.7rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#FFFFFF' }}
                    >
                      <option value="">-- Match Against All Criteria --</option>
                      {drives.map((d) => (
                        <option key={d._id} value={d._id}>
                          🏢 {d.role || d.title} ({d.packageDetails})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportCSV}
                  title="Export suitable students to CSV"
                >
                  📥 Export Talent Pool (CSV)
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-exam"
                  onClick={() => setShowConductExamModal(true)}
                  title="Schedule or conduct an online assessment for candidates"
                >
                  📝 Conduct Exam
                </button>

                <button
                  type="button"
                  className="btn btn-sm btn-import-test"
                  onClick={() => setShowBulkImportModal(true)}
                  title="Bulk import students who cleared the online test"
                >
                  📥 Bulk Import Test Cleared
                </button>
              </div>

              <div className="filter-row-controls">
                {/* CGPA Slider */}
                <div className="slider-group">
                  <div className="slider-label-row">
                    <span>Min CGPA Cutoff:</span>
                    <strong>{minCgpaFilter} CGPA</strong>
                  </div>
                  <input
                    type="range"
                    className="cutoff-range-slider"
                    min="5.0"
                    max="9.5"
                    step="0.1"
                    value={minCgpaFilter}
                    onChange={(e) => setMinCgpaFilter(Number(e.target.value))}
                  />
                </div>

                {/* Branch Selector */}
                <div className="slider-group">
                  <label style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700 }}>ENGINEERING BRANCH:</label>
                  <select
                    className="form-control"
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    style={{ padding: '0.55rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#FFFFFF' }}
                  >
                    <option value="ALL">All Branches</option>
                    <option value="CSE">CSE (Computer Science)</option>
                    <option value="IT">IT (Information Technology)</option>
                    <option value="ECE">ECE (Electronics &amp; Comm)</option>
                    <option value="AIML">AI &amp; Machine Learning</option>
                    <option value="AIDS">AI &amp; Data Science</option>
                    <option value="CSIT">CSIT</option>
                    <option value="EEE">EEE (Electrical)</option>
                  </select>
                </div>

                {/* Batch Selector */}
                <div className="slider-group">
                  <label style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 700 }}>GRADUATION BATCH:</label>
                  <select
                    className="form-control"
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    style={{ padding: '0.55rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#FFFFFF' }}
                  >
                    <option value="ALL">All Batches</option>
                    <option value="2026">2026 Graduating Batch</option>
                    <option value="2025">2025 Graduating Batch</option>
                    <option value="2027">2027 Pre-Final Batch</option>
                  </select>
                </div>

                {/* Eligible Only Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#CBD5E1' }}>
                    <input
                      type="checkbox"
                      checked={eligibleOnly}
                      onChange={(e) => setEligibleOnly(e.target.checked)}
                      style={{ accentColor: '#a855f7', width: '16px', height: '16px' }}
                    />
                    <span>Show strictly eligible students only</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Multi-Selection Action Toolbar */}
            {selectedStudentIds.length > 0 && (
              <div className="selection-action-bar">
                <div className="selection-count-badge">
                  <span style={{ fontSize: '1.25rem' }}>🎯</span>
                  <span><strong>{selectedStudentIds.length}</strong> Student(s) Selected</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                    onClick={() => setSelectedStudentIds([])}
                  >
                    ✕ Clear
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleSelectAllEligible}
                  >
                    {selectedStudentIds.length === eligibleCount ? 'Deselect All' : 'Select All Eligible'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleBulkAddToPipeline}
                    disabled={actionLoading}
                    style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)' }}
                  >
                    ➕ Add Selected to Pipeline
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-exam"
                    onClick={() => setShowConductExamModal(true)}
                  >
                    📝 Conduct Exam for Selected ({selectedStudentIds.length})
                  </button>
                </div>
              </div>
            )}

            {/* Students Grid */}
            {studentsLoading ? (
              <div className="dashboard-loading-container" style={{ padding: '3rem' }}>
                <div className="spinner-loader"></div>
                <p>Analyzing campus student profiles against company criteria...</p>
              </div>
            ) : students.length > 0 ? (
              <div className="students-talent-grid">
                {students.map((student) => {
                  const matchVal = student.matchScore || 75;
                  const isHighMatch = matchVal >= 75;

                  const isSelected = selectedStudentIds.includes(student._id);
                  const deployedList = student.deployedProjects || [];

                  return (
                    <div
                      key={student._id}
                      className={`student-talent-card glass-card ${student.isEligible ? 'eligible' : 'not-eligible'} ${isSelected ? 'is-selected' : ''}`}
                    >
                      <div className="student-header-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            className="student-select-checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(student._id)}
                            title="Select candidate for Exam / Pipeline"
                          />
                          <div className="student-avatar-info">
                            <div className="student-avatar">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="student-name-group">
                              <h4>{student.name}</h4>
                              <span>
                                {student.rollNumber} • {student.branch} ({student.batch})
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className="student-match-badge"
                          style={{
                            background: isHighMatch ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isHighMatch ? '#34d399' : '#fbbf24',
                            border: `1px solid ${isHighMatch ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`
                          }}
                        >
                          🎯 {matchVal}% Match
                        </span>
                      </div>

                      {/* Mini Metrics */}
                      <div className="student-metrics-strip">
                        <div className="metric-item-small">
                          <span className="lbl">CGPA</span>
                          <span
                            className="val"
                            style={{
                              color: student.cgpa >= 8.0 ? '#34d399' : student.cgpa >= 7.0 ? '#38bdf8' : '#fbbf24'
                            }}
                          >
                            {student.cgpa}
                          </span>
                        </div>
                        <div className="metric-item-small">
                          <span className="lbl">PRI Score</span>
                          <span className="val" style={{ color: '#c084fc' }}>
                            {student.readinessScore}%
                          </span>
                        </div>
                        <div className="metric-item-small">
                          <span className="lbl">LeetCode</span>
                          <span className="val" style={{ color: '#fbbf24' }}>
                            {student.leetcodeStats?.totalSolved || 0} Solved
                          </span>
                        </div>
                      </div>

                      {/* Eligibility Flag */}
                      <div style={{ fontSize: '11.5px', color: student.isEligible ? '#6ee7b7' : '#fca5a5' }}>
                        {student.isEligible ? (
                          <span>✅ Meets company CGPA cutoff ({minCgpaFilter}+) &amp; branch</span>
                        ) : (
                          <span>⚠️ Below cutoff ({student.cgpa} vs {minCgpaFilter} required)</span>
                        )}
                      </div>

                      {/* Resume Analyzer Highlight */}
                      {student.resumeUrl ? (
                        <div className="student-resume-preview-pill">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px' }}>📄</span>
                            <span className="resume-name" title={student.resumeFileName || 'Resume'}>
                              {student.resumeFileName ? (student.resumeFileName.length > 20 ? `${student.resumeFileName.slice(0, 18)}...` : student.resumeFileName) : 'Uploaded Resume'}
                            </span>
                            {student.resumeScore > 0 && (
                              <span className="resume-score-tag">
                                🎯 {student.resumeScore}% ATS
                              </span>
                            )}
                          </div>
                          <a
                            href={student.resumeUrl.startsWith('http') ? student.resumeUrl : `${API_URL.replace('/api', '')}/${student.resumeUrl.replace(/^\/+/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="resume-view-link"
                          >
                            View Resume ↗
                          </a>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '2px 0' }}>
                          📄 No resume uploaded in Resume Analyzer
                        </div>
                      )}

                      {/* Deployed Projects Section */}
                      {deployedList.length > 0 && (
                        <div className="student-deployed-projects-preview">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="proj-title-label">
                              🚀 Deployed Projects ({deployedList.filter(p => p.deploymentUrl).length || deployedList.length}):
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentDetail(student)}
                              style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '10.5px', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              View All ({student.projects?.length || deployedList.length})
                            </button>
                          </div>
                          {deployedList.slice(0, 2).map((proj, pIdx) => (
                            <div key={proj._id || pIdx} className="deployed-proj-badge">
                              <span className="proj-name" title={proj.title}>
                                {proj.title?.length > 22 ? `${proj.title.slice(0, 20)}...` : proj.title}
                              </span>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {proj.deploymentUrl && (
                                  <a
                                    href={proj.deploymentUrl.startsWith('http') ? proj.deploymentUrl : `https://${proj.deploymentUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="proj-live-link"
                                    title="View Live Deployed App"
                                  >
                                    🌐 Live Demo
                                  </a>
                                )}
                                {proj.repositoryUrl && (
                                  <a
                                    href={proj.repositoryUrl.startsWith('http') ? proj.repositoryUrl : `https://${proj.repositoryUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="proj-repo-link"
                                    title="View Source Code"
                                  >
                                    💻 Code
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Skills Chips */}
                      {student.skills && student.skills.length > 0 && (
                        <div className="student-skills-chips">
                          {student.skills.slice(0, 5).map((skill, sIdx) => {
                            const isMatched = student.matchedSkills?.some(
                              (m) => m.toLowerCase() === skill.toLowerCase()
                            );
                            return (
                              <span
                                key={sIdx}
                                className={`skill-chip ${isMatched ? 'matched' : 'normal'}`}
                              >
                                {skill}
                              </span>
                            );
                          })}
                          {student.skills.length > 5 && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              +{student.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="student-card-footer">
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => setSelectedStudentDetail(student)}
                            title="Inspect full profile, projects and resume analyzer analysis"
                          >
                            🔍 Full Profile
                          </button>
                          {student.phone && (
                            <a
                              href={`tel:${student.phone}`}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                              title={`Call ${student.phone}`}
                            >
                              📞
                            </a>
                          )}
                          <a
                            href={`mailto:${student.email}`}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            title={`Email ${student.email}`}
                          >
                            ✉️
                          </a>
                        </div>

                        <div>
                          {student.hasApplied ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                padding: '4px 8px',
                                borderRadius: '6px'
                              }}
                            >
                              ✓ In Pipeline ({student.applicationStatus || 'Applied'})
                            </span>
                          ) : student.invited ? (
                            <span className="btn-invite-student invited" style={{ fontSize: '11px', padding: '4px 10px' }}>
                              ✓ Invited
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-invite-student"
                              disabled={actionLoading}
                              onClick={() => handleInviteStudent(student)}
                            >
                              🚀 Fast-Track Invite
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-history-placeholder glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎯</div>
                <h3 style={{ color: '#FFFFFF', margin: '0 0 8px 0' }}>No Students Match Criteria</h3>
                <p style={{ color: '#94a3b8', maxWidth: '450px', margin: '0 auto 16px auto' }}>
                  Try lowering the minimum CGPA cutoff slider or selecting "All Branches" to broaden the pool.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setMinCgpaFilter(6.0);
                    setBranchFilter('ALL');
                    setBatchFilter('ALL');
                    setSearchQuery('');
                    setEligibleOnly(false);
                  }}
                >
                  Reset Cutoff Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: OUR PLACEMENT DRIVES */}
        {/* ========================================================================= */}
        {activeTab === 'drives' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.25rem' }}>
                  🏢 Active On-Campus Drives ({drives.length})
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
                  Placement recruitment drives published on campus with live student registration status.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateDriveModal(true)}
              >
                ➕ Post New Placement Drive
              </button>
            </div>

            {drives.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
                {drives.map((drive) => {
                  const apps = drive.applications || [];
                  const shortlisted = apps.filter((a) =>
                    ['shortlisted', 'online_test_cleared', 'interview_round_1', 'interview_round_2', 'selected', 'offered'].includes(a.currentStage)
                  ).length;
                  const selected = apps.filter((a) => a.currentStage === 'selected' || a.currentStage === 'offered').length;

                  return (
                    <div
                      key={drive._id}
                      className="glass-card"
                      style={{
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85))',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        borderRadius: '14px',
                        padding: '1.4rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>
                            {drive.companyName}
                          </span>
                          <h3 style={{ margin: '2px 0 0 0', fontSize: '1.2rem', color: '#FFFFFF' }}>
                            {drive.role || drive.title}
                          </h3>
                        </div>
                        <span
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '12px'
                          }}
                        >
                          💰 {drive.packageDetails || 'Competitive CTC'}
                        </span>
                      </div>

                      {/* Meta Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>DRIVE DATE</span>
                          <strong style={{ color: '#f1f5f9' }}>
                            {drive.dates?.driveDate ? new Date(drive.dates.driveDate).toLocaleDateString() : 'TBA'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>REG DEADLINE</span>
                          <strong style={{ color: '#38bdf8' }}>
                            {drive.dates?.registrationDeadline ? new Date(drive.dates.registrationDeadline).toLocaleDateString() : 'Open'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>MIN CGPA</span>
                          <strong style={{ color: '#34d399' }}>{drive.eligibility?.minCgpa || 6.5} CGPA</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>LOCATION</span>
                          <strong style={{ color: '#f1f5f9' }}>{drive.location || 'Campus'}</strong>
                        </div>
                      </div>

                      {/* Candidate Progression Strip */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8', display: 'block' }}>{apps.length}</span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>APPLIED</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c084fc', display: 'block' }}>{shortlisted}</span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>SHORTLISTED</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399', display: 'block' }}>{selected}</span>
                          <span style={{ fontSize: '10px', color: '#94a3b8' }}>SELECTED</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedDriveId(drive._id);
                            setActiveTab('students');
                          }}
                        >
                          🎯 View Suitable Pool
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedDriveId(drive._id);
                            setActiveTab('pipeline');
                          }}
                        >
                          📋 Candidate Pipeline ({apps.length}) →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-history-placeholder glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏢</div>
                <h3 style={{ color: '#FFFFFF', margin: '0 0 8px 0' }}>No Placement Drives Posted Yet</h3>
                <p style={{ color: '#94a3b8', maxWidth: '460px', margin: '0 auto 16px auto' }}>
                  Post your company's on-campus placement drive to start receiving applications and matching eligible students.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowCreateDriveModal(true)}
                >
                  ➕ Post Your First Placement Drive
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CANDIDATE PIPELINE & INTERVIEW MANAGER */}
        {/* ========================================================================= */}
        {activeTab === 'pipeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.25rem' }}>
                  📋 Candidate Pipeline — {currentDrive ? `${currentDrive.companyName} (${currentDrive.role || currentDrive.title})` : 'Select a Drive'}
                </h3>
                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
                  Manage candidate progression across recruitment rounds, schedule interview slots, and release offer letters.
                </p>
              </div>

              {drives.length > 1 && (
                <select
                  className="form-control"
                  value={selectedDriveId}
                  onChange={(e) => setSelectedDriveId(e.target.value)}
                  style={{ minWidth: '220px', padding: '0.6rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#FFFFFF' }}
                >
                  {drives.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.role || d.title} ({d.applications?.length || 0} applicants)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Recruitment Pipeline Workflow Action Bar */}
            <div
              className="pipeline-action-bar glass-card"
              style={{
                padding: '0.9rem 1.25rem',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
                alignItems: 'center',
                background: 'rgba(30, 41, 59, 0.75)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '10px'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pipeline Actions:
              </span>
              <button
                type="button"
                className="btn btn-sm btn-exam"
                onClick={() => setShowConductExamModal(true)}
                title="Conduct Online Assessment for Candidates"
              >
                📝 Conduct Exam
              </button>
              <button
                type="button"
                className="btn btn-sm btn-import-test"
                onClick={() => setShowBulkImportModal(true)}
                title="Bulk import students who passed the online test"
              >
                📥 Bulk Import Test Cleared
              </button>
              <button
                type="button"
                className="btn btn-sm btn-interview-1"
                onClick={() => openBulkAdvanceForStage('interview_round_1')}
                title="Schedule Technical Interview 1 for test-cleared students"
              >
                🎙️ Schedule Interview 1
              </button>
              <button
                type="button"
                className="btn btn-sm btn-interview-2"
                onClick={() => openBulkAdvanceForStage('interview_round_2')}
                title="Schedule Interview Round 2 (Managerial) for round 1 cleared students"
              >
                🗣️ Schedule Interview 2
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '11.5px',
                  padding: '6px 12px',
                  borderRadius: '6px'
                }}
                onClick={() => openBulkAdvanceForStage('selected')}
                title="Roll out final placement offers"
              >
                🏆 Final Select &amp; Offers
              </button>
            </div>

            {/* Stages Columns (Kanban) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', alignItems: 'flex-start' }}>
              {LIFECYCLE_STAGES.filter((s) => s.key !== 'rejected').map((stage) => {
                const candidatesInStage = candidateApplications.filter(
                  (a) => (a.currentStage || 'applied') === stage.key
                );

                return (
                  <div
                    key={stage.key}
                    className="glass-card"
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderTop: `3px solid ${stage.color}`,
                      borderRadius: '12px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      minHeight: '220px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: stage.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{stage.icon}</span>
                        <span>{stage.label}</span>
                      </span>
                      <span
                        style={{
                          background: `${stage.color}25`,
                          color: stage.color,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 800
                        }}
                      >
                        {candidatesInStage.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {candidatesInStage.length > 0 ? (
                        candidatesInStage.map((cand) => (
                          <div
                            key={cand._id || cand.student}
                            style={{
                              background: '#1e293b',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '8px',
                              padding: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <strong style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>{cand.studentName}</strong>
                              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>
                                {cand.studentCgpa} CGPA
                              </span>
                            </div>

                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {cand.studentRollNumber} • {cand.studentBranch}
                            </span>

                            {cand.interviewSchedule?.scheduledAt && (
                              <div style={{ fontSize: '10.5px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 6px', borderRadius: '4px' }}>
                                📅 {new Date(cand.interviewSchedule.scheduledAt).toLocaleString()} ({cand.interviewSchedule.venue || 'Online'})
                              </div>
                            )}

                            {cand.offeredPackage && (
                              <div style={{ fontSize: '10.5px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '3px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                💰 Offer: {cand.offeredPackage}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', gap: '6px' }}>
                              {cand.resumeUrl ? (
                                <a
                                  href={cand.resumeUrl.startsWith('http') ? cand.resumeUrl : `${API_URL.replace('/api', '')}/${cand.resumeUrl.replace(/^\/+/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: '11px', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                                >
                                  📄 Resume ↗
                                </a>
                              ) : (
                                <span style={{ fontSize: '10px', color: '#64748b' }}>No resume</span>
                              )}

                              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                {stage.key === 'applied' && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '10px', padding: '3px 6px', color: '#38bdf8' }}
                                    onClick={() => openBulkAdvanceForStage('shortlisted', [cand.student || cand._id])}
                                    title="Shortlist for Test"
                                  >
                                    📋 Shortlist
                                  </button>
                                )}
                                {stage.key === 'shortlisted' && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '10px', padding: '3px 6px', color: '#fbbf24' }}
                                    onClick={() => openBulkAdvanceForStage('online_test_cleared', [cand.student || cand._id])}
                                    title="Mark Test Cleared"
                                  >
                                    🧪 Clear Test
                                  </button>
                                )}
                                {stage.key === 'online_test_cleared' && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '10px', padding: '3px 6px', color: '#fb923c' }}
                                    onClick={() => openBulkAdvanceForStage('interview_round_1', [cand.student || cand._id])}
                                    title="Advance to Interview 1"
                                  >
                                    🎙️ Interview 1
                                  </button>
                                )}
                                {stage.key === 'interview_round_1' && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '10px', padding: '3px 6px', color: '#c084fc' }}
                                    onClick={() => openBulkAdvanceForStage('interview_round_2', [cand.student || cand._id])}
                                    title="Advance to Interview 2"
                                  >
                                    🗣️ Interview 2
                                  </button>
                                )}
                                {stage.key === 'interview_round_2' && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '10px', padding: '3px 6px', color: '#34d399' }}
                                    onClick={() => openBulkAdvanceForStage('selected', [cand.student || cand._id])}
                                    title="Final Select candidate"
                                  >
                                    🏆 Select
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '10px', padding: '3px 6px' }}
                                  onClick={() => {
                                    setStageModal({
                                      isOpen: true,
                                      candidate: cand,
                                      driveId: currentDrive._id,
                                      targetStage: stage.key === 'applied' ? 'shortlisted' : 'interview_round_1',
                                      roundName: '',
                                      interviewDate: '',
                                      interviewTime: '',
                                      venue: 'Campus Placement Hall',
                                      meetingLink: '',
                                      interviewerNotes: '',
                                      offeredPackage: ''
                                    });
                                  }}
                                  title="Custom stage update & notes"
                                >
                                  ⚙️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#64748b', fontSize: '11.5px' }}>
                          No candidates in this stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: RECRUITMENT ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#FFFFFF' }}>📊 Campus Recruitment Funnel</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                Overall campus engagement and candidate conversion rates for {user?.companyName || 'your company'}.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '20px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #6366f1' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', display: 'block' }}>{students.length}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>1. Campus Talent Strength</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #a855f7' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c084fc', display: 'block' }}>{eligibleCount}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>2. Meets CGPA &amp; Branch</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #38bdf8' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', display: 'block' }}>{totalApplicants}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>3. Registered Candidates</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', display: 'block' }}>{totalSelected}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>4. Final Offers Rolled Out</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* POST ON-CAMPUS DRIVE MODAL */}
        {/* ========================================================================= */}
        {showCreateDriveModal && (
          <div className="recruiter-modal-backdrop" onClick={() => setShowCreateDriveModal(false)}>
            <div className="recruiter-modal-window" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                <h3 style={{ margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏢</span> Post On-Campus Placement Drive
                </h3>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                  onClick={() => setShowCreateDriveModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateDrive} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="recruiter-form-grid">
                  <div className="recruiter-form-group">
                    <label>Role / Position Title *</label>
                    <input
                      type="text"
                      required
                      value={driveForm.role}
                      onChange={(e) => setDriveForm({ ...driveForm, role: e.target.value })}
                      placeholder="e.g. Software Development Engineer"
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Package CTC (Annual) *</label>
                    <input
                      type="text"
                      required
                      value={driveForm.packageDetails}
                      onChange={(e) => setDriveForm({ ...driveForm, packageDetails: e.target.value })}
                      placeholder="e.g. 14.5 LPA (Full-time) + 40k/mo"
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Drive Date *</label>
                    <input
                      type="date"
                      required
                      value={driveForm.driveDate}
                      onChange={(e) => setDriveForm({ ...driveForm, driveDate: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Registration Deadline *</label>
                    <input
                      type="date"
                      required
                      value={driveForm.deadline}
                      onChange={(e) => setDriveForm({ ...driveForm, deadline: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Minimum CGPA Cutoff</label>
                    <input
                      type="number"
                      step="0.1"
                      min="5.0"
                      max="10.0"
                      value={driveForm.minCgpa}
                      onChange={(e) => setDriveForm({ ...driveForm, minCgpa: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Work Location / Venue</label>
                    <input
                      type="text"
                      value={driveForm.location}
                      onChange={(e) => setDriveForm({ ...driveForm, location: e.target.value })}
                      placeholder="e.g. Hyderabad / Campus Placement Cell"
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Eligible Engineering Branches (Comma Separated)</label>
                    <input
                      type="text"
                      value={driveForm.allowedBranches}
                      onChange={(e) => setDriveForm({ ...driveForm, allowedBranches: e.target.value })}
                      placeholder="e.g. CSE, IT, ECE, CSIT, AIML, AIDS"
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Required Technical Skills (Comma Separated)</label>
                    <input
                      type="text"
                      value={driveForm.skillsRequired}
                      onChange={(e) => setDriveForm({ ...driveForm, skillsRequired: e.target.value })}
                      placeholder="e.g. Python, Java, SQL, DSA, System Design"
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Drive Overview &amp; Job Description</label>
                    <textarea
                      rows="4"
                      value={driveForm.jobDescription}
                      onChange={(e) => setDriveForm({ ...driveForm, jobDescription: e.target.value })}
                      placeholder="Enter job role summary, selection rounds syllabus, and candidate responsibilities..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCreateDriveModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none' }}
                  >
                    {actionLoading ? 'Publishing Drive...' : '🚀 Publish On-Campus Drive'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CANDIDATE ADVANCE STAGE / INTERVIEW SCHEDULER MODAL */}
        {/* ========================================================================= */}
        {stageModal.isOpen && (
          <div className="recruiter-modal-backdrop" onClick={() => setStageModal({ ...stageModal, isOpen: false })}>
            <div className="recruiter-modal-window" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#FFFFFF' }}>
                    Advance Candidate: {stageModal.candidate?.studentName}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {stageModal.candidate?.studentRollNumber} • {stageModal.candidate?.studentBranch} ({stageModal.candidate?.studentCgpa} CGPA)
                  </span>
                </div>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                  onClick={() => setStageModal({ ...stageModal, isOpen: false })}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleStageUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="recruiter-form-grid">
                  <div className="recruiter-form-group full-width">
                    <label>Target Recruitment Stage *</label>
                    <select
                      className="form-control"
                      value={stageModal.targetStage}
                      onChange={(e) => setStageModal({ ...stageModal, targetStage: e.target.value })}
                    >
                      <option value="shortlisted">📋 Shortlisted for Technical Rounds</option>
                      <option value="online_test_cleared">🧪 Online Assessment Cleared</option>
                      <option value="interview_round_1">🎙️ Interview Round 1 (Technical)</option>
                      <option value="interview_round_2">🗣️ Interview Round 2 (Managerial)</option>
                      <option value="hr_round">🤝 HR &amp; Cultural Fit Round</option>
                      <option value="selected">🏆 Final Select (Offer Pending)</option>
                      <option value="offered">📜 Offer Letter Released</option>
                      <option value="rejected">❌ Not Shortlisted / Rejected</option>
                    </select>
                  </div>

                  <div className="recruiter-form-group">
                    <label>Interview Date</label>
                    <input
                      type="date"
                      value={stageModal.interviewDate}
                      onChange={(e) => setStageModal({ ...stageModal, interviewDate: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Interview Time Slot</label>
                    <input
                      type="time"
                      value={stageModal.interviewTime}
                      onChange={(e) => setStageModal({ ...stageModal, interviewTime: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Interview Venue or Meeting Link</label>
                    <input
                      type="text"
                      value={stageModal.venue}
                      onChange={(e) => setStageModal({ ...stageModal, venue: e.target.value })}
                      placeholder="e.g. Placement Cell Hall A or https://meet.google.com/xyz"
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Interviewer Feedback &amp; Notes</label>
                    <textarea
                      rows="3"
                      value={stageModal.interviewerNotes}
                      onChange={(e) => setStageModal({ ...stageModal, interviewerNotes: e.target.value })}
                      placeholder="Add assessment remarks, strengths, topics covered..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setStageModal({ ...stageModal, isOpen: false })}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                  >
                    {actionLoading ? 'Updating Stage...' : '✓ Confirm Candidate Advancement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CONDUCT ASSESSMENT EXAM MODAL */}
        {/* ========================================================================= */}
        {showConductExamModal && (
          <div className="recruiter-modal-backdrop" onClick={() => setShowConductExamModal(false)}>
            <div className="recruiter-modal-window" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📝</span> Conduct Online Assessment Exam
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {selectedStudentIds.length > 0
                      ? `Targeting ${selectedStudentIds.length} candidate(s) selected from Talent Pool`
                      : `Targeting registered candidates for: ${currentDrive?.role || currentDrive?.title || 'Placement Drive'}`}
                  </span>
                </div>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                  onClick={() => setShowConductExamModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConductExamSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="recruiter-form-grid">
                  <div className="recruiter-form-group full-width">
                    <label>Assessment Title *</label>
                    <input
                      type="text"
                      required
                      value={examForm.examTitle}
                      onChange={(e) => setExamForm({ ...examForm, examTitle: e.target.value })}
                      placeholder="e.g. Cognitive & Coding Assessment Round"
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Exam Platform URL / Test Link *</label>
                    <input
                      type="url"
                      required
                      value={examForm.examLink}
                      onChange={(e) => setExamForm({ ...examForm, examLink: e.target.value })}
                      placeholder="https://hackerrank.com/... or https://exam.griet.ac.in"
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Exam Date *</label>
                    <input
                      type="date"
                      required
                      value={examForm.examDate}
                      onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Exam Start Time *</label>
                    <input
                      type="time"
                      required
                      value={examForm.examTime}
                      onChange={(e) => setExamForm({ ...examForm, examTime: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>WhatsApp Alert Target Mobile Number</label>
                    <input
                      type="tel"
                      value={examForm.specificPhone}
                      onChange={(e) => setExamForm({ ...examForm, specificPhone: e.target.value })}
                      placeholder="8074701052"
                    />
                    <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                      ⚡ Instant WhatsApp notification with assessment link will be sent to <strong>8074701052</strong> and all selected students.
                    </small>
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Instructions &amp; Test Syllabus</label>
                    <textarea
                      rows="3"
                      value={examForm.instructions}
                      onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
                      placeholder="Specify duration, proctoring guidelines, topic weightages..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowConductExamModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', border: 'none' }}
                  >
                    {actionLoading ? 'Scheduling...' : '🚀 Schedule Exam & Send Alerts'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BULK IMPORT TEST CLEARED STUDENTS MODAL */}
        {/* ========================================================================= */}
        {showBulkImportModal && (
          <div className="recruiter-modal-backdrop" onClick={() => setShowBulkImportModal(false)}>
            <div className="recruiter-modal-window" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📥</span> Bulk Import Test-Cleared Students
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Import students who passed the assessment. They will advance to 'Test Cleared' stage &amp; queue for Interview 1.
                  </span>
                </div>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                  onClick={() => setShowBulkImportModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBulkImportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="recruiter-form-group full-width">
                  <label>Paste Roll Numbers or Emails (One per line, comma or space separated) *</label>
                  <textarea
                    rows="6"
                    required
                    value={bulkImportText}
                    onChange={(e) => setBulkImportText(e.target.value)}
                    placeholder="21241A0501&#10;21241A0502&#10;student@griet.ac.in&#10;21241A0505"
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </div>

                <div className="recruiter-form-group full-width">
                  <label>Or Upload CSV File with Roll Numbers / Emails</label>
                  <input
                    type="file"
                    accept=".csv, .txt"
                    onChange={handleBulkImportFileUpload}
                    style={{ background: '#0f172a', border: '1px solid #334155', padding: '6px', borderRadius: '6px', color: '#94a3b8' }}
                  />
                </div>

                <div className="recruiter-form-group full-width">
                  <label>WhatsApp Notification Phone Number</label>
                  <input
                    type="tel"
                    value={bulkImportPhone}
                    onChange={(e) => setBulkImportPhone(e.target.value)}
                    placeholder="8074701052"
                  />
                  <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                    Dispatches congratulations &amp; Interview 1 round briefing to <strong>8074701052</strong> and each cleared student.
                  </small>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowBulkImportModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading || !bulkImportText.trim()}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                  >
                    {actionLoading ? 'Importing & Advancing...' : '📥 Import & Move to Test Cleared'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BULK STAGE ADVANCEMENT MODAL (INTERVIEW 1, INTERVIEW 2, SELECTION) */}
        {/* ========================================================================= */}
        {bulkAdvanceModal.isOpen && (
          <div className="recruiter-modal-backdrop" onClick={() => setBulkAdvanceModal(prev => ({ ...prev, isOpen: false }))}>
            <div className="recruiter-modal-window" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🚀</span> Advance Candidates to {bulkAdvanceModal.targetStage.replace(/_/g, ' ').toUpperCase()}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#38bdf8' }}>
                    Advancing {bulkAdvanceModal.studentIds?.length || 0} candidate(s) to this round
                  </span>
                </div>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                  onClick={() => setBulkAdvanceModal(prev => ({ ...prev, isOpen: false }))}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBulkAdvanceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="recruiter-form-grid">
                  <div className="recruiter-form-group">
                    <label>Interview / Schedule Date</label>
                    <input
                      type="date"
                      value={bulkAdvanceModal.interviewDate}
                      onChange={(e) => setBulkAdvanceModal({ ...bulkAdvanceModal, interviewDate: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group">
                    <label>Time Slot</label>
                    <input
                      type="time"
                      value={bulkAdvanceModal.interviewTime}
                      onChange={(e) => setBulkAdvanceModal({ ...bulkAdvanceModal, interviewTime: e.target.value })}
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Venue or Online Meeting URL</label>
                    <input
                      type="text"
                      value={bulkAdvanceModal.venue}
                      onChange={(e) => setBulkAdvanceModal({ ...bulkAdvanceModal, venue: e.target.value })}
                      placeholder="Placement Cell Hall A or Google Meet link"
                    />
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Meeting / Video Call Link (Optional)</label>
                    <input
                      type="url"
                      value={bulkAdvanceModal.meetingLink}
                      onChange={(e) => setBulkAdvanceModal({ ...bulkAdvanceModal, meetingLink: e.target.value })}
                      placeholder="https://meet.google.com/xyz"
                    />
                  </div>

                  {(bulkAdvanceModal.targetStage === 'selected' || bulkAdvanceModal.targetStage === 'offered') && (
                    <div className="recruiter-form-group full-width">
                      <label>Offered CTC / Package</label>
                      <input
                        type="text"
                        value={bulkAdvanceModal.offeredPackage}
                        onChange={(e) => setBulkAdvanceModal({ ...bulkAdvanceModal, offeredPackage: e.target.value })}
                        placeholder="e.g. 14.5 LPA + Performance Bonus"
                      />
                    </div>
                  )}

                  <div className="recruiter-form-group full-width">
                    <label>WhatsApp Target Mobile Number</label>
                    <input
                      type="tel"
                      value={bulkAdvanceModal.specificPhone}
                      onChange={(e) => setBulkAdvanceModal({ ...bulkAdvanceModal, specificPhone: e.target.value })}
                      placeholder="8074701052"
                    />
                    <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>
                      Alerts sent to <strong>8074701052</strong> and each candidate's registered phone.
                    </small>
                  </div>

                  <div className="recruiter-form-group full-width">
                    <label>Interviewer Notes &amp; Round Syllabus</label>
                    <textarea
                      rows="3"
                      value={bulkAdvanceModal.interviewerNotes}
                      onChange={(e) => setBulkAdvanceModal({ ...bulkAdvanceModal, interviewerNotes: e.target.value })}
                      placeholder="Round focus, interviewers, preparation requirements..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setBulkAdvanceModal(prev => ({ ...prev, isOpen: false }))}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading || !bulkAdvanceModal.studentIds || bulkAdvanceModal.studentIds.length === 0}
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                  >
                    {actionLoading ? 'Advancing Candidates...' : '✓ Confirm Round Advancement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DETAILED CANDIDATE PROFILE & PORTFOLIO MODAL */}
        {/* ========================================================================= */}
        {selectedStudentDetail && (
          <div className="recruiter-modal-backdrop" onClick={() => setSelectedStudentDetail(null)}>
            <div className="recruiter-modal-window" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="student-avatar" style={{ width: '48px', height: '48px', fontSize: '1.3rem' }}>
                    {selectedStudentDetail.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#FFFFFF' }}>{selectedStudentDetail.name}</h3>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {selectedStudentDetail.rollNumber} • {selectedStudentDetail.branch} • Batch {selectedStudentDetail.batch}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                  onClick={() => setSelectedStudentDetail(null)}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
                {/* Academic & Readiness Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>CGPA</span>
                    <strong style={{ fontSize: '1.2rem', color: selectedStudentDetail.cgpa >= 8.0 ? '#34d399' : '#38bdf8' }}>
                      {selectedStudentDetail.cgpa}
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>PRI Score</span>
                    <strong style={{ fontSize: '1.2rem', color: '#c084fc' }}>
                      {selectedStudentDetail.readinessScore}%
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Match</span>
                    <strong style={{ fontSize: '1.2rem', color: '#34d399' }}>
                      {selectedStudentDetail.matchScore || 75}%
                    </strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>LeetCode</span>
                    <strong style={{ fontSize: '1.2rem', color: '#fbbf24' }}>
                      {selectedStudentDetail.leetcodeStats?.totalSolved || 0}
                    </strong>
                  </div>
                </div>

                {/* Contact & Links Strip */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '12.5px' }}>
                  <span style={{ color: '#94a3b8' }}>✉️ {selectedStudentDetail.email}</span>
                  {selectedStudentDetail.phone && <span style={{ color: '#94a3b8' }}>📞 {selectedStudentDetail.phone}</span>}
                  {selectedStudentDetail.githubProfileUrl && (
                    <a
                      href={selectedStudentDetail.githubProfileUrl.startsWith('http') ? selectedStudentDetail.githubProfileUrl : `https://${selectedStudentDetail.githubProfileUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#38bdf8', textDecoration: 'none' }}
                    >
                      💻 GitHub Profile ↗
                    </a>
                  )}
                </div>

                {/* Resume Analyzer Section */}
                <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                      <span>📄</span> Resume Analyzer Details
                    </h4>
                    {selectedStudentDetail.resumeScore > 0 && (
                      <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800 }}>
                        🎯 {selectedStudentDetail.resumeScore}% ATS Score
                      </span>
                    )}
                  </div>

                  {selectedStudentDetail.resumeUrl ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <strong style={{ color: '#f1f5f9', fontSize: '13px', display: 'block' }}>
                          {selectedStudentDetail.resumeFileName || 'Uploaded Resume File'}
                        </strong>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Verified in campus Resume Analyzer
                        </span>
                      </div>
                      <a
                        href={selectedStudentDetail.resumeUrl.startsWith('http') ? selectedStudentDetail.resumeUrl : `${API_URL.replace('/api', '')}/${selectedStudentDetail.resumeUrl.replace(/^\/+/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '12px', padding: '6px 14px', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                      >
                        📄 Open Full Resume ↗
                      </a>
                    </div>
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>
                      Candidate has not uploaded a resume to the Resume Analyzer yet.
                    </p>
                  )}
                </div>

                {/* Deployed Projects Section */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem' }}>
                    <span>🚀</span> Deployed Projects &amp; Portfolio ({(selectedStudentDetail.deployedProjects || selectedStudentDetail.projects || []).length})
                  </h4>

                  {(selectedStudentDetail.deployedProjects || selectedStudentDetail.projects || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(selectedStudentDetail.deployedProjects || selectedStudentDetail.projects || []).map((proj, pIdx) => (
                        <div
                          key={proj._id || pIdx}
                          style={{
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                            <div>
                              <strong style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>{proj.title}</strong>
                              {proj.status && (
                                <span style={{ marginLeft: '8px', fontSize: '10.5px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px' }}>
                                  {proj.status}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              {proj.deploymentUrl && (
                                <a
                                  href={proj.deploymentUrl.startsWith('http') ? proj.deploymentUrl : `https://${proj.deploymentUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary btn-sm"
                                  style={{ fontSize: '11px', padding: '3px 8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                                >
                                  🌐 Live App ↗
                                </a>
                              )}
                              {proj.repositoryUrl && (
                                <a
                                  href={proj.repositoryUrl.startsWith('http') ? proj.repositoryUrl : `https://${proj.repositoryUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '11px', padding: '3px 8px' }}
                                >
                                  💻 Code ↗
                                </a>
                              )}
                            </div>
                          </div>

                          {proj.description && (
                            <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', lineHeight: 1.4 }}>
                              {proj.description}
                            </p>
                          )}

                          {proj.technologies && proj.technologies.length > 0 && (
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {proj.technologies.map((t, tIdx) => (
                                <span
                                  key={tIdx}
                                  style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', padding: '2px 7px', borderRadius: '4px', fontSize: '10.5px' }}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                      No deployed projects found for this candidate.
                    </div>
                  )}
                </div>

                {/* Candidate Technical Skills */}
                {selectedStudentDetail.skills && selectedStudentDetail.skills.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: '#FFFFFF', fontSize: '0.95rem' }}>
                      🛠️ Technical Skills
                    </h4>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedStudentDetail.skills.map((s, idx) => (
                        <span key={idx} className="skill-chip matched" style={{ fontSize: '11px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedStudentDetail(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleToggleSelectStudent(selectedStudentDetail._id);
                    setSelectedStudentDetail(null);
                  }}
                >
                  {selectedStudentIds.includes(selectedStudentDetail._id) ? 'Deselect Candidate' : '✓ Select for Exam / Pipeline'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RecruiterDashboard;
