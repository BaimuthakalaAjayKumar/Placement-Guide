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

      <div className="recruiter-dashboard-container animate-fade">
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

                  return (
                    <div
                      key={student._id}
                      className={`student-talent-card glass-card ${student.isEligible ? 'eligible' : 'not-eligible'}`}
                    >
                      <div className="student-header-row">
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

                      {/* Skills Chips */}
                      {student.skills && student.skills.length > 0 && (
                        <div className="student-skills-chips">
                          {student.skills.slice(0, 6).map((skill, sIdx) => {
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
                          {student.skills.length > 6 && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              +{student.skills.length - 6} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="student-card-footer">
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {student.resumeUrl ? (
                            <a
                              href={student.resumeUrl.startsWith('http') ? student.resumeUrl : `${API_URL.replace('/api', '')}/${student.resumeUrl.replace(/^\/+/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              📄 Resume ↗
                            </a>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>No resume file</span>
                          )}
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
                              ✓ Registered ({student.applicationStatus || 'Applied'})
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

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              {cand.resumeUrl ? (
                                <a
                                  href={cand.resumeUrl.startsWith('http') ? cand.resumeUrl : `${API_URL.replace('/api', '')}/${cand.resumeUrl.replace(/^\/+/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: '11px', color: '#38bdf8', textDecoration: 'none' }}
                                >
                                  Resume ↗
                                </a>
                              ) : (
                                <span style={{ fontSize: '10px', color: '#64748b' }}>No resume</span>
                              )}

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '10.5px', padding: '3px 8px' }}
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
                              >
                                Advance Round ➔
                              </button>
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
      </div>
    </>
  );
};

export default RecruiterDashboard;
