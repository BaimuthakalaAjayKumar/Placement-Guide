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
    role: '',
    jobType: 'Full-Time',
    packageLPA: '12.0 LPA',
    location: 'Hyderabad / Bangalore',
    driveDate: '',
    deadline: '',
    eligibility: {
      minCgpa: 7.0,
      allowedBranches: 'CSE, IT, ECE',
      allowedBatches: '2025, 2026',
      maxBacklogs: 0
    },
    requiredSkills: 'Python, SQL, DSA, Web Development',
    description: ''
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
        ? formData.eligibility.allowedBranches.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const batchesArr = formData.eligibility.allowedBatches
        ? formData.eligibility.allowedBatches.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const skillsArr = formData.requiredSkills
        ? formData.requiredSkills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload = {
        companyName: formData.companyName,
        driveTitle: formData.driveTitle,
        role: formData.role,
        jobType: formData.jobType,
        packageLPA: formData.packageLPA,
        location: formData.location,
        driveDate: formData.driveDate || new Date(Date.now() + 7 * 86400000),
        deadline: formData.deadline || new Date(Date.now() + 5 * 86400000),
        eligibility: {
          minCgpa: Number(formData.eligibility.minCgpa) || 6.5,
          allowedBranches: branchesArr,
          allowedBatches: batchesArr,
          maxBacklogs: Number(formData.eligibility.maxBacklogs) || 0
        },
        requiredSkills: skillsArr,
        description: formData.description
      };

      const res = await axios.post(`${API_URL}/placement-drives`, payload, getAuthHeaders());
      if (res.data?.success) {
        setFeedback({ type: 'success', message: `✅ Campus Drive for "${formData.companyName}" successfully launched!` });
        setShowCreateModal(false);
        fetchDrives();
        setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create placement drive.');
    } finally {
      setSubmitting(false);
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
              onClick={() => setSelectedDrive(d)}
            >
              <span className="drive-co">{d.companyName}</span>
              <span className="drive-pkg">{d.packageLPA}</span>
              <span className="drive-count">({d.candidates?.length || 0})</span>
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
                <span className="co-tag">{selectedDrive.companyName}</span>
                <h3 className="drive-name">{selectedDrive.driveTitle}</h3>
                <span className="role-tag">Role: {selectedDrive.role} ({selectedDrive.jobType})</span>
              </div>
              <div className="drive-kpis">
                <div className="kpi-mini">
                  <span className="val">{selectedDrive.packageLPA}</span>
                  <span className="lbl">CTC Package</span>
                </div>
                <div className="kpi-mini">
                  <span className="val">{selectedDrive.candidates?.length || 0}</span>
                  <span className="lbl">Applicants</span>
                </div>
                <div className="kpi-mini">
                  <span className="val">{candidatesByStage['selected']?.length + candidatesByStage['offered']?.length || 0}</span>
                  <span className="lbl">Selected / Offers</span>
                </div>
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
                  <label>Job Role</label>
                  <input
                    type="text"
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
