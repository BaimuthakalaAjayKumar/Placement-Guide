import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './JobBoard.css';

const JobBoard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('recommendations');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState(null);
  const [appliedViewMode, setAppliedViewMode] = useState('columns'); // 'columns' or 'list'

  const STAGES = [
    { key: 'applied', label: 'Applied', icon: '📝', color: '#818cf8', bg: 'rgba(99, 102, 241, 0.15)' },
    { key: 'under_review', label: 'Under Review', icon: '⏳', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' },
    { key: 'interviewing', label: 'Interviewing', icon: '🎙️', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
    { key: 'offered', label: 'Offered', icon: '🎉', color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)' },
    { key: 'rejected', label: 'Rejected', icon: '❌', color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' },
    { key: 'withdrawn', label: 'Withdrawn', icon: '↩️', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
  ];

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/jobs/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      } else {
        setError(data.error || 'Failed to fetch recommended jobs.');
      }
    } catch (err) {
      setError('Could not establish connection to the job portal.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSavedJobs(data.data);
    } catch (err) {
      console.error('Error fetching saved jobs:', err);
    }
  };

  const fetchAppliedJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs/applied`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAppliedJobs(data.data);
    } catch (err) {
      console.error('Error fetching applied jobs:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchJobs();
      fetchSavedJobs();
      fetchAppliedJobs();
    }
  }, [token]);

  const handleSaveJob = async (jobId) => {
    try {
      setActionLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/jobs/${jobId}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        fetchSavedJobs();
      } else {
        setError(data.error || 'Could not toggle save state.');
      }
    } catch (err) {
      setError('Could not toggle save state.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyJob = async (job) => {
    const jobId = typeof job === 'object' && job !== null ? job._id : job;
    const applyLink = typeof job === 'object' && job !== null ? job.applyLink : null;

    // Immediately open external apply link in new tab if attached by admin
    if (applyLink && applyLink.trim() !== '') {
      const url = applyLink.startsWith('http://') || applyLink.startsWith('https://')
        ? applyLink.trim()
        : `https://${applyLink.trim()}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(
          applyLink && applyLink.trim() !== ''
            ? `Application tracked successfully! Opening attached job portal in a new tab: ${applyLink}`
            : 'Application submitted and recorded successfully!'
        );
        fetchAppliedJobs();
      } else {
        setError(data.error || 'Failed to apply.');
      }
    } catch (err) {
      setError('Could not complete application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStudentJobStatus = async (jobId, newStatus) => {
    try {
      setUpdatingJobId(jobId);
      setError('');
      setSuccessMsg('');
      const res = await fetch(`${API_URL}/jobs/${jobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        const displayStatus = newStatus.replace('_', ' ').toUpperCase();
        setSuccessMsg(`Status updated to "${displayStatus}"! Replicated to Placement Admin Applied Jobs Report.`);
        setAppliedJobs((prev) =>
          prev.map((app) => {
            if (app.job && (app.job._id === jobId || app.job === jobId)) {
              return { ...app, status: newStatus };
            }
            return app;
          })
        );
      } else {
        setError(data.error || 'Failed to update application status.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to status update service.');
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleStartMockPrep = () => {
    navigate('/mock-interviews');
  };

  // Helper to normalize status key
  const normalizeStatus = (st) => {
    if (!st) return 'applied';
    const s = String(st).toLowerCase().trim().replace(/\s+/g, '_');
    return s;
  };

  // Filter recommendations
  const filteredRecommendations = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.requirements && job.requirements.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesLocation = locationFilter === '' || job.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  // Filter saved
  const filteredSaved = savedJobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.requirements && job.requirements.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase())));
    const matchesLocation = locationFilter === '' || job.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  // Filter applied
  const filteredApplied = appliedJobs.filter((app) => {
    if (!app.job) return false;
    const matchesSearch =
      app.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === '' || (app.job.location && app.job.location.toLowerCase().includes(locationFilter.toLowerCase()));
    return matchesSearch && matchesLocation;
  });

  const isSaved = (jobId) => savedJobs.some((j) => j._id === jobId);
  const isApplied = (jobId) => appliedJobs.some((a) => a.job && (a.job._id === jobId || a.job === jobId));
  const getAppliedStatus = (jobId) => {
    const app = appliedJobs.find((a) => a.job && (a.job._id === jobId || a.job === jobId));
    return app ? normalizeStatus(app.status).replace('_', ' ') : '';
  };

  if (loading) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner-loader"></div>
        <p>Analyzing matching jobs...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="Personalized Job Board" />
      <div className="content-wrapper job-content animate-fade" style={{ padding: '2rem', overflowY: 'auto' }}>
        
        {/* Error Notification Banner with 'x' Dismiss Button */}
        {error && (
          <div className="error-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setError('')}
              title="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Success Notification Banner with 'x' Dismiss Button */}
        {successMsg && (
          <div className="success-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{successMsg}</span>
            <button
              type="button"
              className="banner-close-btn"
              onClick={() => setSuccessMsg('')}
              title="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        {/* Job Board Tabs */}
        <div className="tabs-container" style={{ display: 'flex', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
          <button
            className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
            style={{ padding: '0.75rem 1.5rem', background: activeTab === 'recommendations' ? '#6366f1' : 'transparent', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Recommended Jobs
          </button>
          <button
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
            style={{ padding: '0.75rem 1.5rem', background: activeTab === 'saved' ? '#6366f1' : 'transparent', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Saved Jobs ({savedJobs.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'applied' ? 'active' : ''}`}
            onClick={() => setActiveTab('applied')}
            style={{ padding: '0.75rem 1.5rem', background: activeTab === 'applied' ? '#6366f1' : 'transparent', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Application Status ({appliedJobs.length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="filter-controls" style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by title, company, or skills..."
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 2, minWidth: '220px', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
          />
          <select
            className="form-control"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{ flex: 1, minWidth: '160px', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
          >
            <option value="">All Locations</option>
            <option value="Remote">Remote</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Pune">Pune</option>
            <option value="Gurgaon">Gurgaon</option>
          </select>
        </div>

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="job-cards-list">
            {filteredRecommendations.length > 0 ? (
              filteredRecommendations.map((job) => (
                <div className="glass-card job-posting-card" key={job._id}>
                  <div className="job-main-details">
                    <div className="job-primary-info">
                      <span className="company-name-label">{job.company}</span>
                      <h2>{job.title}</h2>
                      
                      <div className="job-tags-row">
                        <span className="job-pill location">
                          📍 {job.location}
                        </span>
                        <span className="job-pill salary">
                          💰 {job.salary}
                        </span>
                        <span className="job-pill experience">
                          🎯 {job.experienceLevel}
                        </span>
                        {job.targetBatches && job.targetBatches.length > 0 && (
                          <span className="job-pill" style={{ color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                            🎓 Batches: {job.targetBatches.join(', ')}
                          </span>
                        )}
                        {job.targetBranches && job.targetBranches.length > 0 && (
                          <span className="job-pill" style={{ color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                            🏛️ Branches: {job.targetBranches.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="job-matching-grade-box">
                      <div className="match-percentage-badge" data-match={job.matchPercentage >= 70 ? 'high' : job.matchPercentage >= 40 ? 'medium' : 'low'}>
                        {job.matchPercentage}% Match
                      </div>
                    </div>
                  </div>

                  <div className="job-description-block">
                    <p>{job.description}</p>
                  </div>

                  <div className="job-skills-match-grid">
                    <div className="skills-group">
                      <span className="skills-group-title matched">Matched Skills ({job.matchedSkills?.length || 0})</span>
                      <div className="skills-badge-list">
                        {job.matchedSkills && job.matchedSkills.length > 0 ? (
                          job.matchedSkills.map((s, i) => (
                            <span className="skill-badge matched" key={i}>{s}</span>
                          ))
                        ) : (
                          <span className="no-skills-msg">No matching skills found in resume.</span>
                        )}
                      </div>
                    </div>

                    <div className="skills-group">
                      <span className="skills-group-title missing">Missing Skills ({job.missingSkills?.length || 0})</span>
                      <div className="skills-badge-list">
                        {job.missingSkills && job.missingSkills.length > 0 ? (
                          job.missingSkills.map((s, i) => (
                            <span className="skill-badge missing" key={i}>{s}</span>
                          ))
                        ) : (
                          <span className="no-skills-msg success">✓ Ready! Meets all skill criteria.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="job-card-actions-footer" style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={handleStartMockPrep}>
                      Practice Mock Interview
                    </button>
                    <button className="btn btn-secondary" disabled={actionLoading} onClick={() => handleSaveJob(job._id)}>
                      {isSaved(job._id) ? '♥ Saved' : '♡ Save Job'}
                    </button>
                    {job.applyLink && job.applyLink.trim() !== '' && (
                      <a
                        href={job.applyLink.startsWith('http') ? job.applyLink : `https://${job.applyLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        title="Open external company portal in a new tab"
                      >
                        Visit Portal ↗
                      </a>
                    )}
                    {isApplied(job._id) ? (
                      <button className="btn btn-accent" disabled={true} style={{ textTransform: 'capitalize' }}>
                        Applied (Status: {getAppliedStatus(job._id)})
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        disabled={actionLoading}
                        onClick={() => handleApplyJob(job)}
                        title={job.applyLink ? `Apply and open ${job.applyLink} in a new tab` : 'Submit Application'}
                      >
                        Apply Now ↗
                      </button>
                    )}
                  </div>

                </div>
              ))
            ) : (
              <div className="empty-history-placeholder glass-card">
                <p>No job recommendations available at this time matching your filters.</p>
              </div>
            )}
          </div>
        )}

        {/* Saved Jobs Tab */}
        {activeTab === 'saved' && (
          <div className="job-cards-list">
            {filteredSaved.length > 0 ? (
              filteredSaved.map((job) => (
                <div className="glass-card job-posting-card" key={job._id}>
                  <div className="job-main-details">
                    <div className="job-primary-info">
                      <span className="company-name-label">{job.company}</span>
                      <h2>{job.title}</h2>
                      <div className="job-tags-row">
                        <span className="job-pill location">📍 {job.location}</span>
                        <span className="job-pill salary">💰 {job.salary}</span>
                        <span className="job-pill experience">🎯 {job.experienceLevel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="job-description-block">
                    <p>{job.description}</p>
                  </div>
                  <div className="job-card-actions-footer" style={{ display: 'flex', gap: '10px', marginTop: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => handleSaveJob(job._id)}>
                      Unsave Job
                    </button>
                    {job.applyLink && job.applyLink.trim() !== '' && (
                      <a
                        href={job.applyLink.startsWith('http') ? job.applyLink : `https://${job.applyLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        Visit Portal ↗
                      </a>
                    )}
                    {isApplied(job._id) ? (
                      <button className="btn btn-accent" disabled={true}>
                        Applied ({getAppliedStatus(job._id)})
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => handleApplyJob(job)}>
                        Apply Now ↗
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-history-placeholder glass-card">
                <p>You haven't saved any jobs yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Applied Jobs Tab: Multi-Stage Columns (Applied, Under Review, Interviewing, Offered, Rejected, Withdrawn) */}
        {activeTab === 'applied' && (
          <div>
            <div className="application-board-controls">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
                  Application Stages & Live Tracking
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                  Update your progress through hiring rounds. All changes replicate directly to the Placement Admin's Applied Jobs Report.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>View:</span>
                <button
                  type="button"
                  className={`btn btn-sm ${appliedViewMode === 'columns' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAppliedViewMode('columns')}
                >
                  📊 Stage Columns
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${appliedViewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setAppliedViewMode('list')}
                >
                  📄 List View
                </button>
              </div>
            </div>

            {appliedViewMode === 'columns' ? (
              /* KANBAN / MULTI-COLUMN STAGES VIEW */
              <div className="stages-board-grid">
                {STAGES.map((stage) => {
                  const stageApps = filteredApplied.filter(
                    (app) => normalizeStatus(app.status) === stage.key
                  );
                  return (
                    <div className="stage-column" key={stage.key}>
                      <div className="stage-column-header">
                        <div className="stage-header-title" style={{ color: stage.color }}>
                          <span>{stage.icon}</span>
                          <span>{stage.label}</span>
                        </div>
                        <span
                          className="stage-count-badge"
                          style={{ background: stage.bg, color: stage.color }}
                        >
                          {stageApps.length}
                        </span>
                      </div>

                      <div className="stage-cards-container">
                        {stageApps.length > 0 ? (
                          stageApps.map((app) => {
                            const isUpdating = updatingJobId === app.job?._id;
                            const currentStatusKey = normalizeStatus(app.status);
                            const jobUrl = app.job?.applyLink;

                            return (
                              <div className="stage-card" key={app._id || `${app.job?._id}_${stage.key}`}>
                                <div>
                                  <span className="stage-card-company">{app.job?.company}</span>
                                  <h4 className="stage-card-title">{app.job?.title}</h4>
                                </div>

                                <div className="stage-card-meta">
                                  <span>📍 {app.job?.location || 'Remote'}</span>
                                  <span>💰 {app.job?.salary || 'Not Specified'}</span>
                                </div>

                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  Applied: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recent'}
                                </div>

                                {jobUrl && jobUrl.trim() !== '' && (
                                  <a
                                    href={jobUrl.startsWith('http') ? jobUrl : `https://${jobUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '11.5px',
                                      color: '#38bdf8',
                                      textDecoration: 'none',
                                      fontWeight: 600
                                    }}
                                  >
                                    <span>Open Job Portal</span>
                                    <span>↗</span>
                                  </a>
                                )}

                                <div className="stage-card-status-control">
                                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                                    Update My Status:
                                  </label>
                                  <select
                                    className="stage-status-select"
                                    disabled={isUpdating}
                                    value={currentStatusKey}
                                    onChange={(e) => handleUpdateStudentJobStatus(app.job._id, e.target.value)}
                                  >
                                    <option value="applied">📝 Applied</option>
                                    <option value="under_review">⏳ Under Review</option>
                                    <option value="interviewing">🎙️ Interviewing</option>
                                    <option value="offered">🎉 Offered</option>
                                    <option value="rejected">❌ Rejected</option>
                                    <option value="withdrawn">↩️ Withdrawn</option>
                                  </select>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="stage-empty-placeholder">
                            <span>No applications in this stage</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* DETAILED LIST VIEW */
              <div className="job-cards-list">
                {filteredApplied.length > 0 ? (
                  filteredApplied.map((app) => {
                    const isUpdating = updatingJobId === app.job?._id;
                    const currentStatusKey = normalizeStatus(app.status);
                    const currentStage = STAGES.find((s) => s.key === currentStatusKey) || STAGES[0];
                    const jobUrl = app.job?.applyLink;

                    return (
                      <div className="glass-card job-posting-card" key={app._id}>
                        <div className="job-main-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="job-primary-info">
                            <span className="company-name-label">{app.job?.company}</span>
                            <h2>{app.job?.title}</h2>
                            <span className="session-date">
                              Applied on: {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <span
                              className={`status-badge-inline ${currentStatusKey}`}
                              style={{
                                fontSize: '0.85rem',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                background: currentStage.bg,
                                color: currentStage.color,
                                border: `1px solid ${currentStage.color}`
                              }}
                            >
                              {currentStage.icon} {currentStage.label}
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <label style={{ fontSize: '12px', color: '#94a3b8' }}>Status:</label>
                              <select
                                className="stage-status-select"
                                style={{ width: 'auto', padding: '4px 10px' }}
                                disabled={isUpdating}
                                value={currentStatusKey}
                                onChange={(e) => handleUpdateStudentJobStatus(app.job._id, e.target.value)}
                              >
                                <option value="applied">📝 Applied</option>
                                <option value="under_review">⏳ Under Review</option>
                                <option value="interviewing">🎙️ Interviewing</option>
                                <option value="offered">🎉 Offered</option>
                                <option value="rejected">❌ Rejected</option>
                                <option value="withdrawn">↩️ Withdrawn</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="job-description-block" style={{ marginTop: '12px' }}>
                          <p>{app.job?.description}</p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                            Location: <strong style={{ color: '#cbd5e1' }}>{app.job?.location || 'Remote'}</strong> • Salary: <strong style={{ color: '#34d399' }}>{app.job?.salary || 'Not Specified'}</strong>
                          </div>

                          {jobUrl && jobUrl.trim() !== '' && (
                            <a
                              href={jobUrl.startsWith('http') ? jobUrl : `https://${jobUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                            >
                              Open Job Portal ↗
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-history-placeholder glass-card">
                    <p>You haven't applied to any jobs yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default JobBoard;
