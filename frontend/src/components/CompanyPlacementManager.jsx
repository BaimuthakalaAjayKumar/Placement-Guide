import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import './CompanyPlacementManager.css';

const LIFECYCLE_STAGES = [
  { key: 'applied', label: '1. Applied', icon: '📝', color: '#818CF8' },
  { key: 'shortlisted', label: '2. Shortlisted', icon: '📋', color: '#38BDF8' },
  { key: 'test_cleared', label: '3. Test Cleared', icon: '🧪', color: '#FBBF24' },
  { key: 'interview_round_1', label: '4. Interview 1', icon: '🎙️', color: '#FB923C' },
  { key: 'interview_round_2', label: '5. Interview 2', icon: '🗣️', color: '#C084FC' },
  { key: 'selected', label: '6. Selected', icon: '🏆', color: '#34D399' },
  { key: 'offered', label: '7. Offer Released', icon: '📜', color: '#10B981' }
];

const CompanyPlacementManager = () => {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Drive Creation Form State
  const [formData, setFormData] = useState({
    companyName: '',
    driveTitle: '',
    role: 'Software Development Engineer',
    jobType: 'Full-Time',
    packageLPA: '12.0 LPA',
    location: 'Hyderabad / Bangalore',
    driveDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    eligibility: {
      minCgpa: 7.0,
      allowedBranches: 'CSE, IT, ECE',
      allowedBatches: '2025, 2026',
      maxBacklogs: 0
    },
    requiredSkills: 'Python, SQL, DSA, Web Development',
    description: 'Full-time campus recruitment drive covering online aptitude test, coding assessment, and technical interview rounds.'
  });
  const [submitting, setSubmitting] = useState(false);

  // Stage Update Modal
  const [stageModal, setStageModal] = useState({
    isOpen: false,
    candidate: null,
    targetStage: '',
    interviewDate: '',
    interviewTime: '',
    meetingLink: '',
    offeredPackage: '',
    joiningDate: ''
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchDrives = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/placement-drives`, getAuthHeaders());
      if (res.data?.success) {
        const data = res.data?.data || [];
        setDrives(data);
        if (data.length > 0 && !selectedDrive) {
          setSelectedDrive(data[0]);
        } else if (selectedDrive) {
          const updated = data.find(d => d._id === selectedDrive._id);
          if (updated) setSelectedDrive(updated);
        }
      }
    } catch (err) {
      console.warn('Error fetching drives:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrives();
  }, []);

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const branchesArr = formData.eligibility.allowedBranches
        ? (Array.isArray(formData.eligibility.allowedBranches) ? formData.eligibility.allowedBranches : formData.eligibility.allowedBranches.split(',').map(s => s.trim()).filter(Boolean))
        : ['CSE', 'IT', 'ECE'];
      const batchesArr = formData.eligibility.allowedBatches
        ? (Array.isArray(formData.eligibility.allowedBatches) ? formData.eligibility.allowedBatches : formData.eligibility.allowedBatches.split(',').map(s => s.trim()).filter(Boolean))
        : ['2025', '2026'];
      const skillsArr = formData.requiredSkills
        ? (Array.isArray(formData.requiredSkills) ? formData.requiredSkills : formData.requiredSkills.split(',').map(s => s.trim()).filter(Boolean))
        : ['DSA', 'Problem Solving'];

      const resolvedTitle = (formData.driveTitle || `${formData.companyName} Campus Recruitment Drive`).trim();
      const resolvedPackage = (formData.packageLPA || '12.0 LPA').trim();
      const resolvedDescription = (formData.description || `${formData.companyName} is hiring ${formData.role || 'Engineers'} with CTC package of ${resolvedPackage}. Eligible candidates must register before the cutoff date.`).trim();
      const deadlineDate = formData.deadline ? new Date(formData.deadline) : new Date(Date.now() + 7 * 86400000);
      const driveDateObj = formData.driveDate ? new Date(formData.driveDate) : new Date(Date.now() + 10 * 86400000);

      const payload = {
        companyName: formData.companyName.trim(),
        title: resolvedTitle,
        driveTitle: resolvedTitle,
        role: (formData.role || 'Software Development Engineer').trim(),
        jobType: formData.jobType || 'Full-Time',
        packageDetails: resolvedPackage,
        packageLPA: resolvedPackage,
        location: (formData.location || 'Hyderabad / Bangalore').trim(),
        jobDescription: resolvedDescription,
        description: resolvedDescription,
        skillsRequired: skillsArr,
        requiredSkills: skillsArr,
        dates: {
          registrationDeadline: deadlineDate,
          driveDate: driveDateObj
        },
        deadline: deadlineDate,
        driveDate: driveDateObj,
        eligibility: {
          minCgpa: Number(formData.eligibility.minCgpa) || 6.5,
          allowedBranches: branchesArr.length > 0 ? branchesArr : ['CSE', 'IT', 'ECE'],
          allowedBatches: batchesArr.length > 0 ? batchesArr : ['2025', '2026'],
          maxActiveBacklogs: Number(formData.eligibility.maxBacklogs) || 0,
          maxBacklogs: Number(formData.eligibility.maxBacklogs) || 0
        }
      };

      const res = await axios.post(`${API_URL}/placement-drives`, payload, getAuthHeaders());
      if (res.data?.success) {
        setFeedback({ type: 'success', message: `✅ Campus Drive for "${formData.companyName}" successfully launched and synced to calendar!` });
        setShowCreateModal(false);
        fetchDrives();
        setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to create placement drive.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDrive = async (driveId, companyName) => {
    if (!window.confirm(`Are you sure you want to cancel the on-campus placement drive for "${companyName}"? All registered students will be notified of the cancellation.`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await axios.put(`${API_URL}/placement-drives/${driveId}/cancel`, {}, getAuthHeaders());
      if (res.data?.success) {
        setFeedback({ type: 'success', message: `🚫 Placement drive for "${companyName}" has been cancelled.` });
        fetchDrives();
        setTimeout(() => setFeedback({ type: '', message: '' }), 3500);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel placement drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDrive = async (driveId, companyName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the on-campus placement drive for "${companyName}"? This will delete the drive and any linked calendar events across the portal. Admin has full authority to delete any drive posted by Recruiters or Admins.`)) {
      return;
    }
    try {
      setLoading(true);
      const res = await axios.delete(`${API_URL}/placement-drives/${driveId}`, getAuthHeaders());
      if (res.data?.success) {
        setFeedback({ type: 'success', message: `🗑️ Placement drive for "${companyName}" has been permanently deleted.` });
        setSelectedDrive(null);
        fetchDrives();
        setTimeout(() => setFeedback({ type: '', message: '' }), 3500);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete placement drive.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCandidateStage = async (driveId, candidateId, newStage, extraData = {}) => {
    try {
      const payload = {
        candidateId,
        stage: newStage,
        ...extraData
      };
      const res = await axios.put(`${API_URL}/placement-drives/${driveId}/candidates/stage`, payload, getAuthHeaders());
      if (res.data?.success) {
        setFeedback({ type: 'success', message: `Updated candidate stage to "${newStage.toUpperCase()}"!` });
        fetchDrives();
        setTimeout(() => setFeedback({ type: '', message: '' }), 2500);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update candidate stage.');
    }
  };

  // Group candidates by stage for the selected drive
  const candidatesByStage = {};
  LIFECYCLE_STAGES.forEach(s => {
    candidatesByStage[s.key] = [];
  });

  if (selectedDrive && selectedDrive.candidates) {
    selectedDrive.candidates.forEach(c => {
      const stageKey = c.stage || 'applied';
      if (candidatesByStage[stageKey]) {
        candidatesByStage[stageKey].push(c);
      } else {
        candidatesByStage['applied'].push(c);
      }
    });
  }

  return (
    <div className="company-pms-container animate-fade">
      {/* Top Banner */}
      <div className="pms-header-banner">
        <div className="pms-header-left">
          <div className="pms-icon-box">🏢</div>
          <div>
            <h2 className="pms-title">Placement Management System (PMS) — Corporate Recruitment Drives</h2>
            <p className="pms-sub">
              Manage complete institutional recruitment lifecycle: Company ➔ Drive ➔ Eligibility ➔ Applications ➔ Shortlisting ➔ Interview Rounds ➔ Selected Students ➔ Offer Release.
            </p>
          </div>
        </div>

        <div className="pms-header-right">
          <button className="btn-create-drive" onClick={() => setShowCreateModal(true)}>
            ➕ Post New Company Drive
          </button>
        </div>
      </div>

      {feedback.message && (
        <div className={`pms-alert-chip ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {/* Drive Selector Pill Bar */}
      <div className="drives-selection-bar">
        <span className="selection-label">Select Active Drive:</span>
        <div className="drives-pills-row">
          {drives.map(d => (
            <button
              key={d._id}
              type="button"
              className={`drive-chip ${selectedDrive?._id === d._id ? 'active' : ''}`}
              style={d.status === 'cancelled' ? { opacity: 0.75, border: '1px dashed #ef4444' } : {}}
              onClick={() => setSelectedDrive(d)}
            >
              <span className="drive-co">{d.companyName}</span>
              {d.status === 'cancelled' && (
                <span style={{ background: '#ef4444', color: '#fff', fontSize: '9px', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, marginLeft: '4px' }}>
                  CANCELLED
                </span>
              )}
              <span className="drive-pkg">{d.packageDetails || d.packageLPA}</span>
              <span className="drive-count">({(d.candidates || d.applications || []).length})</span>
            </button>
          ))}
          {drives.length === 0 && !loading && (
            <span style={{ color: '#94A3B8', fontSize: '13px' }}>No drives posted yet. Click "Post New Company Drive" to start.</span>
          )}
        </div>
      </div>

      {selectedDrive ? (
        <div className="drive-dossier-grid">
          {/* Drive Meta Overview Card */}
          <div className="drive-overview-card">
            <div className="drive-card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span className="co-tag">{selectedDrive.companyName}</span>
                  {selectedDrive.status === 'cancelled' && (
                    <span style={{
                      background: '#ef4444',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.5px'
                    }}>
                      🚫 CANCELLED
                    </span>
                  )}
                  <span style={{
                    background: selectedDrive.createdBy?.role === 'recruiter' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                    color: selectedDrive.createdBy?.role === 'recruiter' ? '#c084fc' : '#60a5fa',
                    border: `1px solid ${selectedDrive.createdBy?.role === 'recruiter' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {selectedDrive.createdBy?.role === 'recruiter'
                      ? `🏢 Posted by Recruiter: ${selectedDrive.createdBy?.companyName || selectedDrive.createdBy?.name || selectedDrive.companyName || 'Corporate Recruiter'}`
                      : '🛡️ Posted by Placement Admin'}
                  </span>
                </div>
                <h3 className="drive-name">{selectedDrive.title || selectedDrive.driveTitle}</h3>
                <span className="role-tag">Role: {selectedDrive.role} ({selectedDrive.jobType || 'Full-Time'})</span>
              </div>
              <div className="drive-kpis">
                <div className="kpi-mini">
                  <span className="val">{selectedDrive.packageDetails || selectedDrive.packageLPA}</span>
                  <span className="lbl">CTC Package</span>
                </div>
                <div className="kpi-mini">
                  <span className="val">{(selectedDrive.candidates || selectedDrive.applications || []).length}</span>
                  <span className="lbl">Applicants</span>
                </div>
                <div className="kpi-mini">
                  <span className="val">{(candidatesByStage['selected']?.length || 0) + (candidatesByStage['offered']?.length || 0)}</span>
                  <span className="lbl">Selected / Offers</span>
                </div>
              </div>
            </div>

            {/* Admin Management Action Row (Cancel & Delete Drive) */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '10px 14px',
              margin: '12px 0',
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                ⚙️ <strong>Drive Management Actions:</strong>
                {selectedDrive.status === 'cancelled' ? (
                  <span style={{ marginLeft: '8px', color: '#f87171', fontWeight: 600 }}>
                    Drive is currently CANCELLED. Students and recruiters are notified.
                  </span>
                ) : (
                  <span style={{ marginLeft: '8px', color: '#94a3b8' }}>
                    Admin can cancel or delete any drive, including recruiter-posted drives.
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {selectedDrive.status !== 'cancelled' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '6px 14px',
                      borderRadius: '6px'
                    }}
                    onClick={() => handleCancelDrive(selectedDrive._id, selectedDrive.companyName)}
                    title="Cancel this drive (notifies all registered candidates)"
                  >
                    🚫 Cancel Drive
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{
                    background: 'rgba(220, 38, 38, 0.25)',
                    color: '#fca5a5',
                    border: '1px solid rgba(220, 38, 38, 0.5)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '6px 14px',
                    borderRadius: '6px'
                  }}
                  onClick={() => handleDeleteDrive(selectedDrive._id, selectedDrive.companyName)}
                  title="Permanently delete this drive (Admin can delete any recruiter or admin drive)"
                >
                  🗑️ Delete Drive
                </button>
              </div>
            </div>

            {/* Eligibility Rules Grid */}
            <div className="eligibility-rules-strip">
              <span className="rule-item">🎓 Min CGPA: <strong>{selectedDrive.eligibility?.minCgpa || 6.5}</strong></span>
              <span className="rule-item">🏛️ Branches: <strong>{(selectedDrive.eligibility?.allowedBranches || []).join(', ') || 'All'}</strong></span>
              <span className="rule-item">📅 Batches: <strong>{(selectedDrive.eligibility?.allowedBatches || []).join(', ') || 'All'}</strong></span>
              <span className="rule-item">🚫 Max Backlogs: <strong>{selectedDrive.eligibility?.maxBacklogs ?? 0}</strong></span>
              <span className="rule-item">📍 Location: <strong>{selectedDrive.location || 'Any'}</strong></span>
            </div>
          </div>

          {/* Kanban / Pipeline Lifecycle View */}
          <div className="pipeline-lifecycle-section">
            <div className="pipeline-header">
              <h4>Recruitment Pipeline Stages &amp; Candidate Progression</h4>
              <span className="pipeline-hint">Move candidates across rounds from Applied ➔ Shortlisted ➔ Interviews ➔ Selected ➔ Offered</span>
            </div>

            <div className="stages-columns-wrapper">
              {LIFECYCLE_STAGES.map(stage => {
                const candidatesInStage = candidatesByStage[stage.key] || [];

                return (
                  <div key={stage.key} className="stage-column">
                    <div className="stage-column-top" style={{ borderTopColor: stage.color }}>
                      <div className="stage-title-wrap">
                        <span>{stage.icon}</span>
                        <span className="stage-text">{stage.label}</span>
                      </div>
                      <span className="stage-count-badge" style={{ background: stage.color }}>
                        {candidatesInStage.length}
                      </span>
                    </div>

                    <div className="stage-candidates-list">
                      {candidatesInStage.length === 0 ? (
                        <div className="empty-stage-drop">
                          <span>0 candidates</span>
                        </div>
                      ) : (
                        candidatesInStage.map(cand => (
                          <div key={cand._id || cand.student?._id} className="candidate-ticket-card">
                            <div className="ticket-top">
                              <span className="ticket-name">{cand.student?.name || cand.studentName || 'Student'}</span>
                              <span className="ticket-cgpa">CGPA: {cand.student?.cgpa || '8.2'}</span>
                            </div>
                            <span className="ticket-email">{cand.student?.email || cand.studentEmail}</span>
                            <div className="ticket-meta-pills">
                              <span className="pill">{cand.student?.branch || 'CSE'}</span>
                              <span className="pill">Batch {cand.student?.batch || '2025'}</span>
                            </div>

                            {/* Stage advance dropdown */}
                            <div className="ticket-actions">
                              <label>Advance Stage:</label>
                              <select
                                value={cand.stage || 'applied'}
                                onChange={(e) => {
                                  handleUpdateCandidateStage(selectedDrive._id, cand._id || cand.student?._id, e.target.value);
                                }}
                              >
                                {LIFECYCLE_STAGES.map(s => (
                                  <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="no-drives-placeholder">
          <span>🏢</span>
          <h3>No Drive Selected</h3>
          <p>Create a corporate recruitment drive to begin tracking applications and interview shortlists.</p>
        </div>
      )}

      {/* Create Drive Modal */}
      {showCreateModal && (
        <div className="pms-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="pms-modal-window" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>🏢 Post Institutional Recruitment Drive</h3>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateDrive} className="pms-modal-form">
              <div className="form-grid-2">
                <div className="form-item">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Microsoft, Infosys, Deloitte"
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Drive Title / Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2025 On-Campus Software Specialist Drive"
                    value={formData.driveTitle}
                    onChange={e => setFormData({ ...formData, driveTitle: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Job Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Development Engineer (SDE-1)"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Package CTC *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14.5 LPA or ₹45,000/month"
                    value={formData.packageLPA}
                    onChange={e => setFormData({ ...formData, packageLPA: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Employment / Job Type</label>
                  <select
                    value={formData.jobType}
                    onChange={e => setFormData({ ...formData, jobType: e.target.value })}
                    style={{ background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '8px', padding: '10px' }}
                  >
                    <option value="Full-Time">Full-Time (Direct Placement)</option>
                    <option value="Internship + FTE">Internship + FTE Conversion</option>
                    <option value="Internship">Summer / 6-Month Internship</option>
                    <option value="Contract">Specialized Contract Role</option>
                  </select>
                </div>

                <div className="form-item">
                  <label>Drive Location / Mode</label>
                  <input
                    type="text"
                    placeholder="e.g. Hyderabad / Virtual Online"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Registration Cutoff Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Drive Date / Assessment Day *</label>
                  <input
                    type="date"
                    required
                    value={formData.driveDate}
                    onChange={e => setFormData({ ...formData, driveDate: e.target.value })}
                  />
                </div>

                <div className="form-item">
                  <label>Minimum CGPA Cutoff *</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.eligibility.minCgpa}
                    onChange={e => setFormData({
                      ...formData,
                      eligibility: { ...formData.eligibility, minCgpa: e.target.value }
                    })}
                  />
                </div>

                <div className="form-item">
                  <label>Allowed Branches (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="CSE, IT, ECE, EEE"
                    value={formData.eligibility.allowedBranches}
                    onChange={e => setFormData({
                      ...formData,
                      eligibility: { ...formData.eligibility, allowedBranches: e.target.value }
                    })}
                  />
                </div>

                <div className="form-item">
                  <label>Allowed Batches (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="2025, 2026"
                    value={formData.eligibility.allowedBatches}
                    onChange={e => setFormData({
                      ...formData,
                      eligibility: { ...formData.eligibility, allowedBatches: e.target.value }
                    })}
                  />
                </div>

                <div className="form-item">
                  <label>Maximum Active Backlogs Allowed</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.eligibility.maxBacklogs}
                    onChange={e => setFormData({
                      ...formData,
                      eligibility: { ...formData.eligibility, maxBacklogs: e.target.value }
                    })}
                  />
                </div>

                <div className="form-item full-width">
                  <label>Required Skills (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="Python, Java, DSA, DBMS, React, Docker"
                    value={formData.requiredSkills}
                    onChange={e => setFormData({ ...formData, requiredSkills: e.target.value })}
                  />
                </div>

                <div className="form-item full-width">
                  <label>Job Description &amp; Candidate Guidelines</label>
                  <textarea
                    rows={3}
                    placeholder="Detailed recruitment criteria, selection rounds, and company profile..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'Creating Drive...' : 'Launch Placement Drive ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyPlacementManager;
