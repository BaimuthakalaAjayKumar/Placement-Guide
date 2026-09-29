import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import './AtRiskDetectionModule.css';

const AtRiskDetectionModule = ({ userRole = 'faculty', onSelectStudent }) => {
  const [data, setData] = useState({ stats: { atRiskCount: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, totalAssessed: 0 }, students: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
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
        studentId: interventionModal.student.studentId,
        subject: interventionModal.subject,
        message: interventionModal.message,
        urgency: interventionModal.student.riskLevel === 'High' ? 'critical' : 'warning'
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

    const matchesBranch = selectedBranch === 'all' || (s.branch && s.branch.toLowerCase() === selectedBranch.toLowerCase());
    const matchesBatch = selectedBatch === 'all' || (s.batch && String(s.batch).includes(selectedBatch));

    return matchesSearch && matchesRisk && matchesBranch && matchesBatch;
  });

  const uniqueBranches = [...new Set((data.students || []).map(s => s.branch).filter(Boolean))];
  const uniqueBatches = [...new Set((data.students || []).map(s => s.batch).filter(Boolean))];

  return (
    <div className="at-risk-module-container animate-fade">
      {/* Top Section Header */}
      <div className="at-risk-header-card">
        <div className="at-risk-header-info">
          <div className="at-risk-badge-icon">⚠️</div>
          <div>
            <h2 className="at-risk-main-title">Automated Student At-Risk Detection Engine</h2>
            <p className="at-risk-subtitle">
              Intelligent multi-factor heuristic monitoring: flags inactivity (&gt;7 days), continuous score declines, low coding count, incomplete resumes, missing mock interviews, and preparation stagnation.
            </p>
          </div>
        </div>
        <div className="at-risk-header-actions">
          <button className="btn-refresh" onClick={fetchAtRiskSummary} disabled={loading}>
            {loading ? 'Analyzing...' : '🔄 Refresh Risk Heuristics'}
          </button>
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
          <h3>No At-Risk Students Found</h3>
          <p>All matching students meet the active engagement and placement preparation benchmarks.</p>
        </div>
      ) : (
        <div className="at-risk-students-list">
          {filteredStudents.map(student => {
            const isHigh = student.riskLevel === 'High';
            const isMedium = student.riskLevel === 'Medium';

            return (
              <div
                key={student.studentId}
                className={`at-risk-student-card ${isHigh ? 'card-high-risk' : isMedium ? 'card-med-risk' : 'card-low-risk'}`}
              >
                {/* Left: Student Profile info */}
                <div className="student-profile-col">
                  <div className="student-avatar-ring">
                    {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="student-text-meta">
                    <div className="student-name-row">
                      <h4 className="student-name">{student.name}</h4>
                      <span className={`risk-badge-pill ${student.riskLevel.toLowerCase()}`}>
                        {isHigh ? '🔴 High Risk' : isMedium ? '🟠 Moderate Risk' : '🟢 Stable'}
                      </span>
                    </div>
                    <span className="student-email">{student.email}</span>
                    <div className="student-chips-row">
                      {student.rollNo && <span className="meta-chip">Roll: {student.rollNo}</span>}
                      {student.branch && <span className="meta-chip">Branch: {student.branch}</span>}
                      {student.batch && <span className="meta-chip">Batch: {student.batch}</span>}
                      <span className="meta-chip highlight">CGPA: {student.metrics?.cgpa || 'N/A'}</span>
                    </div>
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
                    <span title="Inactive days">⏰ Inactive: <strong>{student.metrics?.daysInactive}d</strong></span>
                    <span title="Coding problems solved">💻 Coding: <strong>{student.metrics?.codingSolved} solved</strong></span>
                    <span title="Resume completion percentage">📄 Resume: <strong>{student.metrics?.resumeScore}%</strong></span>
                    <span title="Mock interviews completed">🎙️ Mocks: <strong>{student.metrics?.mockInterviewsAttempted}</strong></span>
                  </div>
                </div>

                {/* Right: Intervention Action */}
                <div className="student-actions-col">
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
                <p>The student will receive an urgent alert on their dashboard and notification center.</p>
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
