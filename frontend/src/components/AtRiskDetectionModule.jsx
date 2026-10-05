import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import './AtRiskDetectionModule.css';

const AtRiskDetectionModule = ({ userRole = 'faculty', onSelectStudent }) => {
  const [data, setData] = useState({
    stats: {
      atRiskCount: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      totalAssessed: 0,
      lockedCount: 0,
      inactive5Days: 0,
      inactive7Days: 0
    },
    students: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');

  // Intervention Modal
  const [interventionModal, setInterventionModal] = useState({
    isOpen: false,
    student: null,
    subject: '',
    message: '',
    sending: false,
    success: false
  });

  // Lock / Unlock Confirmation Modal
  const [lockModal, setLockModal] = useState({
    isOpen: false,
    student: null,
    isLocking: true, // true = locking, false = unlocking
    reason: '',
    submitting: false,
    success: false
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchAtRiskSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/at-risk/summary`, getAuthHeaders());
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze student risk data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtRiskSummary();
  }, []);

  // Open Intervention Notice Modal
  const openIntervention = (student) => {
    setInterventionModal({
      isOpen: true,
      student,
      subject: `Urgent: Placement Preparation & Academic Attendance Review`,
      message: `Dear ${student.name},\n\nOur institutional placement system flagged that your preparation metrics require urgent attention:\n• Last active platform session was ${student.metrics?.daysInactive || 7}+ days ago.\n• Coding problem count (${student.metrics?.codingSolved || 0}) is below target benchmarks.\n• Placement preparation progress is currently flagged as stagnant.\n\nPlease log in to complete your pending practice modules and schedule a 1-on-1 counseling session with your assigned placement faculty.\n\nBest regards,\nTraining & Placement Cell`,
      sending: false,
      success: false
    });
  };

  const sendInterventionNotice = async (e) => {
    e.preventDefault();
    if (!interventionModal.student) return;

    try {
      setInterventionModal(prev => ({ ...prev, sending: true, success: false }));
      const payload = {
        studentId: interventionModal.student.studentId || interventionModal.student._id,
        subject: interventionModal.subject,
        message: interventionModal.message,
        interventionType: interventionModal.student.riskLevel === 'High' ? 'critical' : 'warning'
      };

      const res = await axios.post(`${API_URL}/at-risk/intervention`, payload, getAuthHeaders());
      if (res.data?.success) {
        setInterventionModal(prev => ({ ...prev, sending: false, success: true }));
        setTimeout(() => {
          setInterventionModal({ isOpen: false, student: null, subject: '', message: '', sending: false, success: false });
        }, 1800);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to dispatch intervention notification.');
      setInterventionModal(prev => ({ ...prev, sending: false }));
    }
  };

  // Open Lock / Unlock Modal
  const openLockModal = (student, isLocking) => {
    setLockModal({
      isOpen: true,
      student,
      isLocking,
      reason: isLocking
        ? (student.metrics?.daysInactive >= 7
            ? `Inactive for ${student.metrics?.daysInactive} days (Exceeded 7-day policy threshold)`
            : 'Dashboard access locked by Administrator')
        : '',
      submitting: false,
      success: false
    });
  };

  // Submit Lock / Unlock
  const handleToggleLock = async (e) => {
    e.preventDefault();
    if (!lockModal.student) return;

    try {
      setLockModal(prev => ({ ...prev, submitting: true }));
      const targetId = lockModal.student.studentId || lockModal.student._id;
      const res = await axios.post(`${API_URL}/at-risk/toggle-lock`, {
        studentId: targetId,
        isLocked: lockModal.isLocking,
        reason: lockModal.reason
      }, getAuthHeaders());

      if (res.data?.success) {
        setLockModal(prev => ({ ...prev, submitting: false, success: true }));
        setActionMessage(res.data.message);

        // Update local state smoothly
        setData(prev => {
          const updatedStudents = (prev.students || []).map(s => {
            const sid = s.studentId || s._id;
            if (String(sid) === String(targetId)) {
              return {
                ...s,
                isLocked: lockModal.isLocking,
                lockReason: lockModal.reason,
                lockedAt: new Date().toISOString()
              };
            }
            return s;
          });
          const lockedCount = updatedStudents.filter(s => s.isLocked).length;
          return {
            ...prev,
            stats: { ...prev.stats, lockedCount },
            students: updatedStudents
          };
        });

        setTimeout(() => {
          setLockModal({ isOpen: false, student: null, isLocking: true, reason: '', submitting: false, success: false });
          setActionMessage(null);
        }, 1600);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update student dashboard lock status.');
      setLockModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Batch Auto-Lock 7+ days
  const handleAutoLock7Days = async () => {
    const eligibleStudents = (data.students || []).filter(s => !s.isLocked && s.metrics?.daysInactive >= 7);
    if (eligibleStudents.length === 0) {
      alert('No active students currently meet the 7+ days inactivity threshold.');
      return;
    }

    const confirmed = window.confirm(
      `Found ${eligibleStudents.length} student(s) inactive for 7 or more days.\n\nDo you want to automatically LOCK their Student Dashboards and dispatch official notification emails?`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/at-risk/auto-lock-inactive`, {}, getAuthHeaders());
      if (res.data?.success) {
        alert(res.data.message || `Successfully locked ${res.data.lockedCount} inactive students.`);
        fetchAtRiskSummary();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to auto-lock inactive students.');
      setLoading(false);
    }
  };

  // Filter students
  const filteredStudents = (data.students || []).filter(s => {
    const matchesSearch = !searchTerm ||
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRisk = selectedRiskLevel === 'all' ||
      (selectedRiskLevel === 'high' && s.riskLevel === 'High') ||
      (selectedRiskLevel === 'medium' && s.riskLevel === 'Medium') ||
      (selectedRiskLevel === 'low' && s.riskLevel === 'Low');

    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'locked' && s.isLocked) ||
      (selectedStatus === 'inactive7' && s.metrics?.daysInactive >= 7) ||
      (selectedStatus === 'inactive5' && s.metrics?.daysInactive >= 5) ||
      (selectedStatus === 'active' && !s.isLocked && (s.metrics?.daysInactive || 0) < 5);

    const matchesBranch = selectedBranch === 'all' || (s.branch && s.branch.toLowerCase() === selectedBranch.toLowerCase());
    const matchesBatch = selectedBatch === 'all' || (s.batch && String(s.batch).includes(selectedBatch));

    return matchesSearch && matchesRisk && matchesStatus && matchesBranch && matchesBatch;
  });

  const uniqueBranches = [...new Set((data.students || []).map(s => s.branch).filter(Boolean))];
  const uniqueBatches = [...new Set((data.students || []).map(s => s.batch).filter(Boolean))];

  return (
    <div className="at-risk-module-container animate-fade">
      {/* Toast Alert Message */}
      {actionMessage && (
        <div className="at-risk-toast-banner">
          <span>✅ {actionMessage}</span>
        </div>
      )}

      {/* Top Section Header */}
      <div className="at-risk-header-card">
        <div className="at-risk-header-info">
          <div className="at-risk-badge-icon">⚠️</div>
          <div>
            <h2 className="at-risk-main-title">Automated Student At-Risk &amp; Inactivity Detection Engine</h2>
            <p className="at-risk-subtitle">
              Automated multi-factor monitoring: sends automatic email notifications at <strong>5 days of inactivity</strong>, flags stagnation, and enforces <strong>dashboard locking at 7 days</strong> by Administrator &amp; Main Admin.
            </p>
          </div>
        </div>
        <div className="at-risk-header-actions">
          <button
            className="btn-auto-lock"
            onClick={handleAutoLock7Days}
            title="Automatically lock student dashboards for those with 7+ days of inactivity"
          >
            ⚡ Auto-Lock Inactive (7+ Days)
          </button>
          <button className="btn-refresh" onClick={fetchAtRiskSummary} disabled={loading}>
            {loading ? 'Analyzing...' : '🔄 Refresh Risk Heuristics'}
          </button>
        </div>
      </div>

      {/* Policy Reminder Banner */}
      <div className="inactivity-policy-banner">
        <div className="policy-pill-step">
          <span className="step-num">Step 1</span>
          <span className="step-text"><strong>5 Days Inactive:</strong> Automatic email warning sent to student registered email</span>
        </div>
        <span className="policy-arrow">→</span>
        <div className="policy-pill-step urgent">
          <span className="step-num">Step 2</span>
          <span className="step-text"><strong>7 Days Inactive:</strong> Dashboard lock enforced by Administrator &amp; Main Admin</span>
        </div>
        <span className="policy-arrow">→</span>
        <div className="policy-pill-step success">
          <span className="step-num">Step 3</span>
          <span className="step-text"><strong>Reinstatement:</strong> One-click unlock &amp; restoration by Main Admin</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="at-risk-kpi-grid">
        <div className="at-risk-kpi-card highlight-attention">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-body">
            <span className="kpi-value">{data.stats?.atRiskCount || 0}</span>
            <span className="kpi-label">Students Require Attention</span>
            <span className="kpi-subtext">Triggered urgent remedial threshold</span>
          </div>
        </div>

        <div className="at-risk-kpi-card warning-email">
          <div className="kpi-icon">📧</div>
          <div className="kpi-body">
            <span className="kpi-value">{data.stats?.inactive5Days || 0}</span>
            <span className="kpi-label">5+ Days Inactive</span>
            <span className="kpi-subtext">Automated email warning dispatched</span>
          </div>
        </div>

        <div className="at-risk-kpi-card danger-locked">
          <div className="kpi-icon">🔒</div>
          <div className="kpi-body">
            <span className="kpi-value">{data.stats?.lockedCount || 0}</span>
            <span className="kpi-label">Dashboards Locked</span>
            <span className="kpi-subtext">Enforced by Admin</span>
          </div>
        </div>

        <div className="at-risk-kpi-card danger">
          <div className="kpi-icon">🔴</div>
          <div className="kpi-body">
            <span className="kpi-value">{data.stats?.highRisk || 0}</span>
            <span className="kpi-label">High Risk Level</span>
            <span className="kpi-subtext">Risk score &ge; 50/100</span>
          </div>
        </div>

        <div className="at-risk-kpi-card warning">
          <div className="kpi-icon">🟠</div>
          <div className="kpi-body">
            <span className="kpi-value">{data.stats?.mediumRisk || 0}</span>
            <span className="kpi-label">Moderate Risk</span>
            <span className="kpi-subtext">Risk score 30 - 49/100</span>
          </div>
        </div>

        <div className="at-risk-kpi-card success">
          <div className="kpi-icon">🟢</div>
          <div className="kpi-body">
            <span className="kpi-value">{data.stats?.lowRisk || 0}</span>
            <span className="kpi-label">Stable / On Track</span>
            <span className="kpi-subtext">Active &amp; progressing steadily</span>
          </div>
        </div>

        <div className="at-risk-kpi-card neutral">
          <div className="kpi-icon">👥</div>
          <div className="kpi-body">
            <span className="kpi-value">{data.stats?.totalAssessed || 0}</span>
            <span className="kpi-label">Total Assessed</span>
            <span className="kpi-subtext">Institutional cohort</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="at-risk-filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search student by name, email, roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>}
        </div>

        <div className="filter-dropdowns">
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="all">All Inactivity &amp; Lock Statuses</option>
            <option value="locked">🔒 Locked Dashboards Only ({data.stats?.lockedCount || 0})</option>
            <option value="inactive7">🚨 Inactive 7+ Days (Lock Eligible)</option>
            <option value="inactive5">⚠️ Inactive 5+ Days (Warned)</option>
            <option value="active">🟢 Active / Progressing</option>
          </select>

          <select value={selectedRiskLevel} onChange={(e) => setSelectedRiskLevel(e.target.value)}>
            <option value="all">All Risk Levels</option>
            <option value="high">🔴 High Risk Only</option>
            <option value="medium">🟠 Moderate Risk Only</option>
            <option value="low">🟢 Stable Only</option>
          </select>

          {uniqueBranches.length > 0 && (
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
              <option value="all">All Branches</option>
              {uniqueBranches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}

          {uniqueBatches.length > 0 && (
            <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="all">All Batches</option>
              {uniqueBatches.map(b => (
                <option key={b} value={b}>Batch {b}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Student List */}
      {loading ? (
        <div className="at-risk-loading-card">
          <div className="at-risk-spinner"></div>
          <p>Analyzing student engagement heuristics &amp; performance vectors...</p>
        </div>
      ) : error ? (
        <div className="at-risk-error-card">
          <span>⚠️ {error}</span>
          <button onClick={fetchAtRiskSummary}>Try Again</button>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="at-risk-empty-card">
          <span className="empty-emoji">🎉</span>
          <h3>No Students Matching Filter Criteria</h3>
          <p>All matching students meet the active engagement and placement preparation benchmarks.</p>
        </div>
      ) : (
        <div className="at-risk-students-list">
          {filteredStudents.map(student => {
            const isHigh = student.riskLevel === 'High';
            const isMedium = student.riskLevel === 'Medium';
            const daysInactive = student.metrics?.daysInactive ?? 0;
            const isLocked = Boolean(student.isLocked);
            const is7DaysInactive = daysInactive >= 7;
            const is5DaysInactive = daysInactive >= 5 && daysInactive < 7;

            return (
              <div
                key={student.studentId || student._id}
                className={`at-risk-student-card ${isLocked ? 'card-locked' : isHigh ? 'card-high-risk' : isMedium ? 'card-med-risk' : 'card-low-risk'}`}
              >
                {/* Left: Student Profile info */}
                <div className="student-profile-col">
                  <div className={`student-avatar-ring ${isLocked ? 'avatar-locked' : ''}`}>
                    {isLocked ? '🔒' : (student.name ? student.name.charAt(0).toUpperCase() : 'S')}
                  </div>
                  <div className="student-text-meta">
                    <div className="student-name-row">
                      <h4 className="student-name">{student.name}</h4>
                      {isLocked ? (
                        <span className="lock-badge-pill locked">
                          🔒 DASHBOARD LOCKED
                        </span>
                      ) : (
                        <span className={`risk-badge-pill ${student.riskLevel.toLowerCase()}`}>
                          {isHigh ? '🔴 High Risk' : isMedium ? '🟠 Moderate Risk' : '🟢 Stable'}
                        </span>
                      )}
                    </div>
                    <span className="student-email">{student.email}</span>
                    <div className="student-chips-row">
                      {student.rollNo && <span className="meta-chip">Roll: {student.rollNo}</span>}
                      {student.branch && <span className="meta-chip">Branch: {student.branch}</span>}
                      {student.batch && <span className="meta-chip">Batch: {student.batch}</span>}
                      <span className="meta-chip highlight">CGPA: {student.metrics?.cgpa || 'N/A'}</span>
                    </div>

                    {/* Inactivity Status Badges */}
                    <div className="inactivity-status-row">
                      {is7DaysInactive ? (
                        <span className="inactivity-pill critical">
                          🚨 Inactive: {daysInactive} Days (Lock Eligible)
                        </span>
                      ) : is5DaysInactive ? (
                        <span className="inactivity-pill warning">
                          ⚠️ Inactive: {daysInactive} Days (5-Day Email Dispatched)
                        </span>
                      ) : (
                        <span className="inactivity-pill normal">
                          ⏱️ Active {daysInactive === 0 ? 'Today' : `${daysInactive}d ago`}
                        </span>
                      )}

                      {student.inactivityWarningSentAt && (
                        <span className="email-notified-tag" title="5-day warning email was delivered">
                          ✉️ Warning Sent
                        </span>
                      )}
                    </div>

                    {isLocked && student.lockReason && (
                      <div className="lock-reason-note">
                        <strong>Lock Reason:</strong> {student.lockReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle: Detected Risk Factors */}
                <div className="student-flags-col">
                  <div className="flags-header">
                    <span className="flags-label">Detected Risk Factors</span>
                    <span className="risk-score-tag">Risk Score: {student.riskScore}/100</span>
                  </div>
                  <div className="flags-pills-wrap">
                    {student.flags && student.flags.length > 0 ? (
                      student.flags.map((flag, idx) => (
                        <span key={idx} className="flag-pill">
                          {flag}
                        </span>
                      ))
                    ) : (
                      <span className="flag-pill clean">✓ No critical risk triggers detected</span>
                    )}
                  </div>
                  <div className="mini-metrics-row">
                    <span title="Inactive days">⏰ Inactive: <strong>{daysInactive}d</strong></span>
                    <span title="Coding problems solved">💻 Coding: <strong>{student.metrics?.codingSolved} solved</strong></span>
                    <span title="Resume completion percentage">📄 Resume: <strong>{student.metrics?.resumeScore}%</strong></span>
                    <span title="Mock interviews completed">🎙️ Mocks: <strong>{student.metrics?.mockInterviewsAttempted}</strong></span>
                  </div>
                </div>

                {/* Right: Intervention & Lock Actions */}
                <div className="student-actions-col">
                  {/* Lock / Unlock Toggle Button for Administrator & Main Admin */}
                  {isLocked ? (
                    <button
                      className="btn-unlock-action"
                      onClick={() => openLockModal(student, false)}
                      title="Restore full dashboard access for this student"
                    >
                      🔓 Unlock Dashboard
                    </button>
                  ) : (
                    <button
                      className={`btn-lock-action ${is7DaysInactive ? 'urgent-lock' : ''}`}
                      onClick={() => openLockModal(student, true)}
                      title={is7DaysInactive ? 'Enforce 7-day inactivity lock policy' : 'Lock student dashboard access'}
                    >
                      🔒 Lock Dashboard
                    </button>
                  )}

                  <button
                    className="btn-intervene"
                    onClick={() => openIntervention(student)}
                    title="Send immediate faculty notice or counseling request"
                  >
                    🔔 Intervene &amp; Notify
                  </button>

                  {onSelectStudent && (
                    <button
                      className="btn-view-details"
                      onClick={() => onSelectStudent(student)}
                    >
                      View Full PRI →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lock / Unlock Confirmation Modal */}
      {lockModal.isOpen && (
        <div className="at-risk-modal-backdrop" onClick={() => setLockModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="at-risk-modal-window lock-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div className="modal-title-wrap">
                <span className="modal-icon">{lockModal.isLocking ? '🔒' : '🔓'}</span>
                <div>
                  <h3 className="modal-heading">
                    {lockModal.isLocking ? 'Lock Student Dashboard' : 'Unlock Student Dashboard'}
                  </h3>
                  <span className="modal-sub">
                    Authorized Action by Administrator &amp; Main Admin for {lockModal.student?.name} ({lockModal.student?.rollNo || lockModal.student?.email})
                  </span>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setLockModal(prev => ({ ...prev, isOpen: false }))}
              >
                ✕
              </button>
            </div>

            {lockModal.success ? (
              <div className="modal-success-state">
                <span className="success-icon">{lockModal.isLocking ? '🔒' : '🔓'}</span>
                <h4>
                  {lockModal.isLocking
                    ? 'Student Dashboard Successfully Locked!'
                    : 'Student Dashboard Successfully Restored!'}
                </h4>
                <p>
                  {lockModal.isLocking
                    ? 'The student will be blocked from accessing dashboard modules and has been notified via official email.'
                    : 'The student can now log in and resume preparation immediately.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleToggleLock} className="modal-form">
                <div className="lock-modal-summary-box">
                  <div className="summary-item">
                    <span>Student Name:</span>
                    <strong>{lockModal.student?.name}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Inactivity Duration:</span>
                    <strong style={{ color: (lockModal.student?.metrics?.daysInactive || 0) >= 7 ? '#EF4444' : '#F59E0B' }}>
                      {lockModal.student?.metrics?.daysInactive || 0} Days
                    </strong>
                  </div>
                  <div className="summary-item">
                    <span>Policy Status:</span>
                    <span>
                      {(lockModal.student?.metrics?.daysInactive || 0) >= 7
                        ? '🚨 Meets 7-Day Inactivity Lock Criterion'
                        : '⚠️ Administrator Discretionary Lock'}
                    </span>
                  </div>
                </div>

                {lockModal.isLocking && (
                  <div className="form-group">
                    <label>Reason for Dashboard Lock</label>
                    <textarea
                      rows={3}
                      required
                      value={lockModal.reason}
                      placeholder="e.g. Inactive for 7+ days (Automated Policy Compliance)..."
                      onChange={(e) => setLockModal(prev => ({ ...prev, reason: e.target.value }))}
                    />
                    <div className="quick-templates-wrap" style={{ marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="template-btn"
                        onClick={() => setLockModal(prev => ({
                          ...prev,
                          reason: `Inactive for ${lockModal.student?.metrics?.daysInactive || 7} consecutive days (7-Day Policy Lock)`
                        }))}
                      >
                        7-Day Inactivity Lock
                      </button>
                      <button
                        type="button"
                        className="template-btn"
                        onClick={() => setLockModal(prev => ({
                          ...prev,
                          reason: 'Repeated non-attendance in mandatory placement tests & mock sessions'
                        }))}
                      >
                        Attendance Non-Compliance
                      </button>
                    </div>
                  </div>
                )}

                {!lockModal.isLocking && (
                  <p style={{ color: '#CBD5E1', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Unlocking will immediately restore full portal access for <strong>{lockModal.student?.name}</strong> and send an access restoration email.
                  </p>
                )}

                <div className="modal-actions-bar">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setLockModal(prev => ({ ...prev, isOpen: false }))}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={lockModal.isLocking ? 'btn-confirm-lock' : 'btn-confirm-unlock'}
                    disabled={lockModal.submitting}
                  >
                    {lockModal.submitting
                      ? 'Processing Action...'
                      : lockModal.isLocking
                      ? '🔒 Confirm Dashboard Lock'
                      : '🔓 Confirm Dashboard Unlock'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Intervention Modal */}
      {interventionModal.isOpen && (
        <div className="at-risk-modal-backdrop" onClick={() => setInterventionModal(prev => ({ ...prev, isOpen: false }))}>
          <div className="at-risk-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div className="modal-title-wrap">
                <span className="modal-icon">🚨</span>
                <div>
                  <h3 className="modal-heading">Send Remedial Intervention Notice</h3>
                  <span className="modal-sub">
                    Direct notification to {interventionModal.student?.name} ({interventionModal.student?.email})
                  </span>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setInterventionModal(prev => ({ ...prev, isOpen: false }))}
              >
                ✕
              </button>
            </div>

            {interventionModal.success ? (
              <div className="modal-success-state">
                <span className="success-icon">✅</span>
                <h4>Intervention Notice Dispatched Successfully!</h4>
                <p>The student will receive an urgent alert on their dashboard, notification center, and college email.</p>
              </div>
            ) : (
              <form onSubmit={sendInterventionNotice} className="modal-form">
                <div className="form-group">
                  <label>Notice Subject</label>
                  <input
                    type="text"
                    required
                    value={interventionModal.subject}
                    onChange={(e) => setInterventionModal(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Intervention Message / Guidance</label>
                  <textarea
                    rows={6}
                    required
                    value={interventionModal.message}
                    onChange={(e) => setInterventionModal(prev => ({ ...prev, message: e.target.value }))}
                  />
                </div>

                <div className="quick-templates-wrap">
                  <span className="quick-label">Quick Templates:</span>
                  <button
                    type="button"
                    className="template-btn"
                    onClick={() => setInterventionModal(prev => ({
                      ...prev,
                      subject: 'Urgent: Low Coding Activity in Placement Portal',
                      message: `Dear ${interventionModal.student?.name},\n\nYour placement analytics indicate low coding activity (${interventionModal.student?.metrics?.codingSolved || 0} problems solved). Campus hiring drives evaluate active GitHub and coding metrics heavily. Please resolve at least 5 medium problems this week.`
                    }))}
                  >
                    Coding Inactivity
                  </button>
                  <button
                    type="button"
                    className="template-btn"
                    onClick={() => setInterventionModal(prev => ({
                      ...prev,
                      subject: 'Mandatory: Incomplete Resume for Upcoming Drives',
                      message: `Dear ${interventionModal.student?.name},\n\nYour placement profile and resume are currently incomplete (${interventionModal.student?.metrics?.resumeScore || 0}%). Company shortlisting opens soon. Please use the AI Resume Builder to finalize your credentials immediately.`
                    }))}
                  >
                    Resume Incomplete
                  </button>
                  <button
                    type="button"
                    className="template-btn"
                    onClick={() => setInterventionModal(prev => ({
                      ...prev,
                      subject: 'Schedule Mandatory Placement Counseling Session',
                      message: `Dear ${interventionModal.student?.name},\n\nDue to continuous score decline across your recent assessments, you are requested to attend a mandatory counseling session with the placement coordinator tomorrow.`
                    }))}
                  >
                    Counseling Meeting
                  </button>
                </div>

                <div className="modal-actions-bar">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setInterventionModal(prev => ({ ...prev, isOpen: false }))}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-send-intervention"
                    disabled={interventionModal.sending}
                  >
                    {interventionModal.sending ? 'Dispatching Notice...' : 'Send Urgent Intervention →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AtRiskDetectionModule;
