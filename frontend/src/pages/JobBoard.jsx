import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import { sfx } from '../utils/audioVfx';
import './JobBoard.css';

const JobBoard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [placementDrives, setPlacementDrives] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('drives'); // 'drives' | 'recommendations' | 'saved' | 'applied'
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [driveFilterTier, setDriveFilterTier] = useState('all');
  const [driveEligibilityFilter, setDriveEligibilityFilter] = useState('all');
  const [pipelineTypeFilter, setPipelineTypeFilter] = useState('all'); // 'all' | 'drives' | 'jobs'
  const [actionLoading, setActionLoading] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState(null);
  const [appliedViewMode, setAppliedViewMode] = useState('columns'); // 'columns' or 'list'
  const [selectedMatchJob, setSelectedMatchJob] = useState(null);
  const [selectedDriveModal, setSelectedDriveModal] = useState(null);

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
      const res = await fetch(`${API_URL}/jobs/recommendations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch recommended jobs.');
      }
    } catch (err) {
      setError('Could not establish connection to the job portal.');
    }
  };

  const fetchPlacementDrives = async () => {
    try {
      const res = await fetch(`${API_URL}/placement-drives`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPlacementDrives(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching placement drives:', err);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      const res = await fetch(`${API_URL}/jobs/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSavedJobs(data.data || []);
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
      if (data.success) setAppliedJobs(data.data || []);
    } catch (err) {
      console.error('Error fetching applied jobs:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.allSettled([
      fetchPlacementDrives(),
      fetchJobs(),
      fetchSavedJobs(),
      fetchAppliedJobs()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  const handleRegisterForDrive = async (drive) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await fetch(`${API_URL}/placement-drives/${drive._id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resumeUrl: user?.resumeUrl || ''
        })
      });
      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`🎉 Application Confirmed: You have registered for ${drive.companyName} (${drive.role || drive.title})! Tracked in your pipeline.`);
        setPlacementDrives((prev) =>
          prev.map((d) =>
            d._id === drive._id
              ? { ...d, hasApplied: true, applicationStatus: 'applied', userApplication: data.data }
              : d
          )
        );
        if (selectedDriveModal && selectedDriveModal._id === drive._id) {
          setSelectedDriveModal((prev) => ({
            ...prev,
            hasApplied: true,
            applicationStatus: 'applied',
            userApplication: data.data
          }));
        }
      } else {
        sfx.playError();
        setError(data.error || 'Failed to register for placement drive.');
      }
    } catch (err) {
      sfx.playError();
      setError('Could not connect to placement drive service.');
    } finally {
      setActionLoading(false);
    }
  };

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
        sfx.playClick();
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
        sfx.playSuccess();
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
        sfx.playClick();
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
    sfx.playClick();
    navigate('/mock-interviews');
  };

  // Helper to normalize status key
  const normalizeStatus = (st) => {
    if (!st) return 'applied';
    const s = String(st).toLowerCase().trim().replace(/\s+/g, '_');
    return s;
  };

  // Filter Campus Placement Drives
  const filteredPlacementDrives = placementDrives.filter((drive) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      drive.companyName?.toLowerCase().includes(q) ||
      drive.title?.toLowerCase().includes(q) ||
      drive.role?.toLowerCase().includes(q) ||
      (drive.skillsRequired && drive.skillsRequired.some((s) => s.toLowerCase().includes(q))) ||
      (drive.jobDescription && drive.jobDescription.toLowerCase().includes(q));

    const matchesLocation =
      locationFilter === '' ||
      (drive.location && drive.location.toLowerCase().includes(locationFilter.toLowerCase()));

    let matchesTier = true;
    const pkgText = (drive.packageDetails || drive.packageLPA || '').toUpperCase();
    const pkgNum = parseFloat(pkgText.replace(/[^0-9.]/g, '')) || 0;
    if (driveFilterTier === 'super_dream') matchesTier = pkgNum >= 15;
    else if (driveFilterTier === 'dream') matchesTier = pkgNum >= 8 && pkgNum < 15;
    else if (driveFilterTier === 'regular') matchesTier = pkgNum > 0 && pkgNum < 8;

    let matchesEligibility = true;
    if (driveEligibilityFilter === 'eligible') matchesEligibility = drive.isEligible !== false;
    else if (driveEligibilityFilter === 'registered') matchesEligibility = drive.hasApplied === true;

    return matchesSearch && matchesLocation && matchesTier && matchesEligibility;
  });

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

  const appliedDrivesList = placementDrives.filter((d) => d.hasApplied);
  const totalAppliedCount = appliedJobs.length + appliedDrivesList.length;

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
        <p>Syncing Placement Drives &amp; Career Opportunities...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="Campus Placement Drives & Job Opportunities" />
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

        {/* Unified Hero Banner */}
        <div className="unified-hero-banner" style={{ marginBottom: '24px' }}>
          <div className="unified-hero-left">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '3px 10px', borderRadius: '6px', marginBottom: '8px', letterSpacing: '0.05em' }}>
              <span>🏛️</span> CAMPUS PMS &amp; CAREER ECOSYSTEM
            </div>
            <h1>Campus Placement Drives &amp; Job Board</h1>
            <p>
              Access verified on-campus placement drives, check real-time CGPA/branch eligibility, register in 1-click, and track hiring stages alongside curated off-campus career openings.
            </p>
          </div>
          <div className="unified-hero-kpi-strip">
            <div className="hero-kpi-item">
              <span className="hero-kpi-val" style={{ color: '#c084fc' }}>{placementDrives.length}</span>
              <span className="hero-kpi-lbl">Active Drives</span>
            </div>
            <div className="hero-kpi-item">
              <span className="hero-kpi-val" style={{ color: '#38bdf8' }}>{jobs.length}</span>
              <span className="hero-kpi-lbl">Job Openings</span>
            </div>
            <div className="hero-kpi-item">
              <span className="hero-kpi-val" style={{ color: '#34d399' }}>{totalAppliedCount}</span>
              <span className="hero-kpi-lbl">In Pipeline</span>
            </div>
            <div className="hero-kpi-item">
              <span className="hero-kpi-val" style={{ color: '#fbbf24' }}>{savedJobs.length}</span>
              <span className="hero-kpi-lbl">Saved</span>
            </div>
          </div>
        </div>

        {/* Unified Navigation Tabs */}
        <div className="unified-tabs-wrapper">
          <button
            type="button"
            className={`unified-nav-tab ${activeTab === 'drives' ? 'active' : ''}`}
            onClick={() => setActiveTab('drives')}
          >
            <span>🏢</span>
            <span>Campus Placement Drives</span>
            <span className="nav-tab-counter">{placementDrives.length}</span>
          </button>
          <button
            type="button"
            className={`unified-nav-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <span>💼</span>
            <span>Off-Campus Job Postings</span>
            <span className="nav-tab-counter">{jobs.length}</span>
          </button>
          <button
            type="button"
            className={`unified-nav-tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            <span>⭐</span>
            <span>Saved Opportunities</span>
            <span className="nav-tab-counter">{savedJobs.length}</span>
          </button>
          <button
            type="button"
            className={`unified-nav-tab ${activeTab === 'applied' ? 'active' : ''}`}
            onClick={() => setActiveTab('applied')}
          >
            <span>📋</span>
            <span>Application Pipeline &amp; Status</span>
            <span className="nav-tab-counter">{totalAppliedCount}</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="filter-controls" style={{ display: 'flex', gap: '12px', marginBottom: '25px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder={
              activeTab === 'drives'
                ? "Search drives by company, role, skills, tier..."
                : "Search by title, company, or skills..."
            }
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 2, minWidth: '220px', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
          />
          <select
            className="form-control"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            style={{ flex: 1, minWidth: '150px', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
          >
            <option value="">All Locations</option>
            <option value="Remote">Remote</option>
            <option value="Bangalore">Bangalore</option>
            <option value="Hyderabad">Hyderabad</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Pune">Pune</option>
            <option value="Gurgaon">Gurgaon</option>
            <option value="On-Campus">On-Campus / College</option>
          </select>

          {activeTab === 'drives' && (
            <>
              <select
                className="form-control"
                value={driveFilterTier}
                onChange={(e) => setDriveFilterTier(e.target.value)}
                style={{ flex: 1, minWidth: '150px', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
              >
                <option value="all">All CTC Tiers</option>
                <option value="super_dream">🚀 Super Dream (15+ LPA)</option>
                <option value="dream">⭐ Dream (8 - 15 LPA)</option>
                <option value="regular">💼 Regular (&lt; 8 LPA)</option>
              </select>
              <select
                className="form-control"
                value={driveEligibilityFilter}
                onChange={(e) => setDriveEligibilityFilter(e.target.value)}
                style={{ flex: 1, minWidth: '150px', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
              >
                <option value="all">All Eligibility</option>
                <option value="eligible">✅ Eligible for Me</option>
                <option value="registered">✓ Registered Drives</option>
              </select>
            </>
          )}

          {activeTab === 'applied' && (
            <select
              className="form-control"
              value={pipelineTypeFilter}
              onChange={(e) => setPipelineTypeFilter(e.target.value)}
              style={{ flex: 1, minWidth: '180px', padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
            >
              <option value="all">All Applications ({totalAppliedCount})</option>
              <option value="drives">🏢 Placement Drives ({appliedDrivesList.length})</option>
              <option value="jobs">💼 Job Postings ({appliedJobs.length})</option>
            </select>
          )}
        </div>

        {/* Campus Placement Drives Tab */}
        {activeTab === 'drives' && (
          <div className="job-cards-list">
            {filteredPlacementDrives.length > 0 ? (
              filteredPlacementDrives.map((drive) => {
                const isDeadlinePassed = drive.dates?.registrationDeadline && new Date() > new Date(drive.dates.registrationDeadline);
                const matchVal = drive.matchScore || 85;

                return (
                  <div className="placement-drive-card glass-card" key={drive._id}>
                    <div className="drive-card-header-row">
                      <div className="drive-title-area">
                        <div className="drive-kicker-strip">
                          <span className="drive-campus-badge">🏛️ On-Campus Placement</span>
                          <span className="drive-pkg-badge">
                            💰 {drive.packageDetails || drive.packageLPA || 'Competitive CTC'}
                          </span>
                          {drive.tier && (
                            <span className="job-pill" style={{ borderColor: 'rgba(168, 85, 247, 0.4)', color: '#c084fc', fontSize: '11px' }}>
                              ⭐ {drive.tier}
                            </span>
                          )}
                        </div>
                        <h2 className="drive-role-title">
                          {drive.role || drive.title} <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: '1.05rem' }}>at {drive.companyName}</span>
                        </h2>
                      </div>

                      <div className="drive-match-box">
                        <div className="match-percentage-badge" data-match={matchVal >= 70 ? 'high' : matchVal >= 40 ? 'medium' : 'low'} style={{ fontSize: '13px', fontWeight: '800' }}>
                          🎯 {matchVal}% Match
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedDriveModal(drive)}
                          style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.35)',
                            color: '#d8b4fe',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          📄 Drive Dossier &amp; Syllabus
                        </button>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="drive-meta-grid">
                      <div className="drive-meta-item">
                        <span className="lbl">📅 Drive Date</span>
                        <span className="val">{drive.dates?.driveDate ? new Date(drive.dates.driveDate).toLocaleDateString() : 'To be announced'}</span>
                      </div>
                      <div className="drive-meta-item">
                        <span className="lbl">⏳ Reg Deadline</span>
                        <span className="val" style={{ color: isDeadlinePassed ? '#f87171' : '#38bdf8' }}>
                          {drive.dates?.registrationDeadline ? new Date(drive.dates.registrationDeadline).toLocaleDateString() : 'Open'}
                          {isDeadlinePassed && ' (Expired)'}
                        </span>
                      </div>
                      <div className="drive-meta-item">
                        <span className="lbl">📍 Venue / Mode</span>
                        <span className="val">{drive.location || 'Campus Placement Cell / Virtual'}</span>
                      </div>
                      <div className="drive-meta-item">
                        <span className="lbl">🎓 Min CGPA</span>
                        <span className="val">{drive.eligibility?.minCgpa ? `${drive.eligibility.minCgpa} CGPA` : 'No CGPA Cutoff'}</span>
                      </div>
                      <div className="drive-meta-item">
                        <span className="lbl">🏛️ Branches</span>
                        <span className="val">
                          {drive.eligibility?.allowedBranches && drive.eligibility.allowedBranches.length > 0
                            ? drive.eligibility.allowedBranches.slice(0, 3).join(', ') + (drive.eligibility.allowedBranches.length > 3 ? '...' : '')
                            : 'All Engineering Branches'}
                        </span>
                      </div>
                      <div className="drive-meta-item">
                        <span className="lbl">🎓 Batches</span>
                        <span className="val">
                          {drive.eligibility?.allowedBatches && drive.eligibility.allowedBatches.length > 0
                            ? drive.eligibility.allowedBatches.join(', ')
                            : '2025, 2026'}
                        </span>
                      </div>
                    </div>

                    {/* Real-time Eligibility Diagnostic Banner */}
                    {drive.isEligible !== false ? (
                      <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6ee7b7' }}>
                        <span>✅</span>
                        <span><strong>You are eligible:</strong> Meets company CGPA cutoff and branch prerequisites.</span>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#fca5a5' }}>
                        <span>⚠️</span>
                        <span><strong>Eligibility Flag:</strong> {drive.missingRequirements?.join(' • ') || 'Please verify minimum CGPA & branch criteria with TPO.'}</span>
                      </div>
                    )}

                    {/* Recruitment Pipeline Stages Stepper */}
                    <div className="drive-stages-stepper">
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, marginRight: '4px' }}>SELECTION ROUNDS:</span>
                      {(drive.driveStages && drive.driveStages.length > 0
                        ? drive.driveStages
                        : ['Online Aptitude & Coding', 'Technical Interview', 'HR Round', 'Offer Rollout']
                      ).map((stage, idx, arr) => (
                        <React.Fragment key={idx}>
                          <span className="drive-stage-pill">{stage}</span>
                          {idx < arr.length - 1 && <span className="drive-stage-arrow">→</span>}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Description preview */}
                    <div className="job-description-block" style={{ margin: '4px 0' }}>
                      <p>{drive.jobDescription || drive.description || `${drive.companyName} is visiting campus for recruitment.`}</p>
                    </div>

                    {/* Skills pills */}
                    {drive.skillsRequired && drive.skillsRequired.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Skills Required:</span>
                        {drive.skillsRequired.map((skill, sIdx) => (
                          <span key={sIdx} className="skill-badge matched" style={{ fontSize: '11.5px', padding: '2px 8px' }}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="drive-card-footer">
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleStartMockPrep}>
                          🎯 Practice Mock Prep
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedDriveModal(drive)}>
                          ℹ️ View Full Details
                        </button>
                      </div>

                      <div>
                        {drive.hasApplied ? (
                          <button type="button" className="btn-drive-register registered" disabled>
                            ✓ Registered for Drive ({String(drive.applicationStatus || 'Applied').toUpperCase().replace('_', ' ')})
                          </button>
                        ) : isDeadlinePassed ? (
                          <button type="button" className="btn-drive-register closed" disabled>
                            ⏳ Registration Closed
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-drive-register"
                            disabled={actionLoading}
                            onClick={() => handleRegisterForDrive(drive)}
                          >
                            🚀 1-Click Register for Drive
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-history-placeholder glass-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏢</div>
                <h3 style={{ color: '#FFFFFF', margin: '0 0 8px 0' }}>No Campus Placement Drives Found</h3>
                <p style={{ color: '#94a3b8', maxWidth: '500px', margin: '0 auto 16px auto' }}>
                  No active on-campus recruitment drives match your current search and filter settings. Try switching the tier or location filters.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSearchQuery('');
                    setLocationFilter('');
                    setDriveFilterTier('all');
                    setDriveEligibilityFilter('all');
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

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

                    <div className="job-matching-grade-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <div className="match-percentage-badge" data-match={job.matchPercentage >= 70 ? 'high' : job.matchPercentage >= 40 ? 'medium' : 'low'} style={{ fontSize: '14px', fontWeight: '800' }}>
                        🎯 {job.matchPercentage}% Match — {job.title}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedMatchJob(job)}
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.35)',
                          color: '#A5B4FC',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        🔍 Why You Match &amp; What's Missing
                      </button>
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

        {/* Applied Jobs & Drives Tab */}
        {activeTab === 'applied' && (
          <div>
            {/* Campus Placement Drives Pipeline Section */}
            {(pipelineTypeFilter === 'all' || pipelineTypeFilter === 'drives') && (
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🏢</span> Registered Campus Placement Drives ({appliedDrivesList.length})
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                      Official on-campus recruitment drives you have registered for with live rounds tracking.
                    </p>
                  </div>
                </div>

                {appliedDrivesList.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {appliedDrivesList.map((drive) => {
                      const st = (drive.applicationStatus || 'applied').toLowerCase();
                      const statusBadgeColor =
                        st.includes('select') || st.includes('offer')
                          ? '#10b981'
                          : st.includes('reject')
                          ? '#ef4444'
                          : st.includes('interview') || st.includes('cleared')
                          ? '#38bdf8'
                          : '#a855f7';

                      return (
                        <div
                          key={drive._id}
                          className="glass-card"
                          style={{
                            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.85))',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                🏛️ On-Campus Drive
                              </div>
                              <h4 style={{ margin: '2px 0 0 0', color: '#FFFFFF', fontSize: '1.1rem' }}>
                                {drive.companyName}
                              </h4>
                              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                {drive.role || drive.title}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: `${statusBadgeColor}25`,
                                color: statusBadgeColor,
                                border: `1px solid ${statusBadgeColor}50`
                              }}
                            >
                              ● {st.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '8px' }}>
                            <div>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>PACKAGE</span>
                              <strong style={{ color: '#fbbf24' }}>{drive.packageDetails || 'Competitive'}</strong>
                            </div>
                            <div>
                              <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>DRIVE DATE</span>
                              <strong style={{ color: '#f1f5f9' }}>
                                {drive.dates?.driveDate ? new Date(drive.dates.driveDate).toLocaleDateString() : 'Announced Soon'}
                              </strong>
                            </div>
                          </div>

                          {/* Drive Round Progress */}
                          <div className="drive-stages-stepper" style={{ padding: '6px 8px' }}>
                            {(drive.driveStages && drive.driveStages.length > 0 ? drive.driveStages : ['Applied', 'Test', 'Interview', 'Selected']).map((stage, idx, arr) => (
                              <React.Fragment key={idx}>
                                <span className="drive-stage-pill" style={{ fontSize: '10.5px' }}>{stage}</span>
                                {idx < arr.length - 1 && <span className="drive-stage-arrow" style={{ fontSize: '10px' }}>→</span>}
                              </React.Fragment>
                            ))}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedDriveModal(drive)}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              View Dossier
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleStartMockPrep}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              Mock Interview
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-history-placeholder glass-card" style={{ padding: '1.5rem', textAlign: 'center', marginBottom: '16px' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                      You haven't registered for any on-campus placement drives yet. Switch to the <strong>Campus Placement Drives</strong> tab to register in 1-click!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Off-Campus Job Applications Section */}
            {(pipelineTypeFilter === 'all' || pipelineTypeFilter === 'jobs') && (
              <div>
                <div className="application-board-controls">
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
                      Off-Campus Applications ({appliedJobs.length})
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
    )}
        {/* Match Percentage Diagnostic Modal */}
        {selectedMatchJob && (
          <div
            className="job-match-modal-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 8, 15, 0.8)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '1.5rem'
            }}
            onClick={() => setSelectedMatchJob(null)}
          >
            <div
              className="job-match-modal-window"
              style={{
                background: '#111827',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '680px',
                padding: '2rem',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
                color: '#E2E8F0',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: '800', background: 'rgba(99, 102, 241, 0.2)', color: '#A5B4FC', padding: '3px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                    JOB / INTERNSHIP MATCHING ENGINE
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#FFFFFF' }}>
                    🎯 {selectedMatchJob.matchPercentage}% Match — {selectedMatchJob.title}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{selectedMatchJob.company} • {selectedMatchJob.location}</span>
                </div>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.3rem', cursor: 'pointer' }}
                  onClick={() => setSelectedMatchJob(null)}
                >
                  ✕
                </button>
              </div>

              {/* Requirement to Profile Flowchart */}
              <div style={{ background: 'rgba(18, 24, 38, 0.8)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748B', fontWeight: '800', marginBottom: '8px', letterSpacing: '0.05em' }}>
                  System Matching Flow
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    🏢 Job Requirements
                  </div>
                  <span style={{ color: '#6366F1', fontWeight: '800' }}>➔</span>
                  <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#A5B4FC' }}>
                    👤 Student Profile
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>Skills • CGPA • Branch • Projects • Resume</div>
                  </div>
                  <span style={{ color: '#6366F1', fontWeight: '800' }}>➔</span>
                  <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#6EE7B7', fontWeight: '800' }}>
                    🎯 {selectedMatchJob.matchPercentage}% Match
                  </div>
                </div>
              </div>

              {/* Why You're A Match */}
              <div style={{ marginBottom: '1.4rem' }}>
                <h4 style={{ color: '#34D399', fontSize: '1rem', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✓</span>
                  <span>Why You're a Match</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedMatchJob.matchAnalysis?.whyYouMatch && selectedMatchJob.matchAnalysis.whyYouMatch.length > 0 ? (
                    selectedMatchJob.matchAnalysis.whyYouMatch.map((reason, idx) => (
                      <div key={idx} style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.86rem', color: '#D1FAE5' }}>
                        {reason}
                      </div>
                    ))
                  ) : (
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.86rem', color: '#D1FAE5' }}>
                      🎯 Matched core domain requirements based on active profile credentials.
                    </div>
                  )}
                </div>
              </div>

              {/* What You're Missing */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#F87171', fontSize: '1rem', margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚠️</span>
                  <span>What You're Missing &amp; Recommended Steps</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedMatchJob.matchAnalysis?.whatYouAreMissing && selectedMatchJob.matchAnalysis.whatYouAreMissing.length > 0 ? (
                    selectedMatchJob.matchAnalysis.whatYouAreMissing.map((miss, idx) => (
                      <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.86rem', color: '#FCA5A5' }}>
                        {miss}
                      </div>
                    ))
                  ) : (
                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.86rem', color: '#6EE7B7' }}>
                      🎉 Excellent! You satisfy all primary benchmark prerequisites for this opportunity.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.2rem' }}>
                <button
                  type="button"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#CBD5E1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  onClick={() => setSelectedMatchJob(null)}
                >
                  Close Analysis
                </button>
                <button
                  type="button"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', color: '#FFFFFF', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                  onClick={() => {
                    handleApplyJob(selectedMatchJob);
                    setSelectedMatchJob(null);
                  }}
                >
                  Apply to {selectedMatchJob.company} →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Placement Drive Dossier & Syllabus Modal */}
        {selectedDriveModal && (
          <div
            className="job-match-modal-backdrop"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 8, 15, 0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '1.5rem'
            }}
            onClick={() => setSelectedDriveModal(null)}
          >
            <div
              className="drive-dossier-modal-window"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', padding: '3px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                    <span>🏛️</span> ON-CAMPUS RECRUITMENT DOSSIER
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#FFFFFF' }}>
                    {selectedDriveModal.companyName} — {selectedDriveModal.role || selectedDriveModal.title}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                    📍 {selectedDriveModal.location || 'Campus / Virtual'} • Package: <strong style={{ color: '#fbbf24' }}>{selectedDriveModal.packageDetails || selectedDriveModal.packageLPA}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.4rem', cursor: 'pointer' }}
                  onClick={() => setSelectedDriveModal(null)}
                >
                  ✕
                </button>
              </div>

              {/* Eligibility & Cutoff Matrix */}
              <div style={{ background: 'rgba(18, 24, 38, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#c084fc', letterSpacing: '0.05em' }}>
                  🎯 Comprehensive Eligibility Criteria
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>MIN CGPA</span>
                    <strong style={{ color: '#f1f5f9' }}>{selectedDriveModal.eligibility?.minCgpa || 6.5} CGPA</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>MAX BACKLOGS</span>
                    <strong style={{ color: '#f1f5f9' }}>{selectedDriveModal.eligibility?.maxActiveBacklogs ?? 0} Active</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>ELIGIBLE BATCHES</span>
                    <strong style={{ color: '#f1f5f9' }}>{(selectedDriveModal.eligibility?.allowedBatches || []).join(', ') || '2025, 2026'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>ELIGIBLE BRANCHES</span>
                    <strong style={{ color: '#f1f5f9' }}>{(selectedDriveModal.eligibility?.allowedBranches || []).join(', ') || 'All Branches'}</strong>
                  </div>
                </div>
              </div>

              {/* Recruitment Rounds Stepper */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#38bdf8', letterSpacing: '0.05em' }}>
                  📋 Multi-Round Selection Process
                </h4>
                <div className="drive-stages-stepper">
                  {(selectedDriveModal.driveStages && selectedDriveModal.driveStages.length > 0
                    ? selectedDriveModal.driveStages
                    : ['Online Assessment', 'Technical Round 1', 'HR Round', 'Offer Rollout']
                  ).map((stage, idx, arr) => (
                    <React.Fragment key={idx}>
                      <span className="drive-stage-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                        Round {idx + 1}: {stage}
                      </span>
                      {idx < arr.length - 1 && <span className="drive-stage-arrow">→</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Job Description & Responsibilities */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                  📝 Role Overview &amp; Company Brief
                </h4>
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '12px', borderRadius: '8px', fontSize: '13px', lineHeight: 1.6, color: '#cbd5e1' }}>
                  {selectedDriveModal.jobDescription || selectedDriveModal.description || 'Full job profile details available through campus placement office.'}
                </div>
              </div>

              {/* Skills Required */}
              {selectedDriveModal.skillsRequired && selectedDriveModal.skillsRequired.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                    💻 Skills &amp; Technologies
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedDriveModal.skillsRequired.map((skill, idx) => (
                      <span key={idx} className="skill-badge matched">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.2rem' }}>
                <button
                  type="button"
                  style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#CBD5E1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
                  onClick={() => setSelectedDriveModal(null)}
                >
                  Close Dossier
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedDriveModal(null);
                    handleStartMockPrep();
                  }}
                >
                  Practice Mock Prep
                </button>
                {selectedDriveModal.hasApplied ? (
                  <button
                    type="button"
                    className="btn-drive-register registered"
                    disabled
                  >
                    ✓ Registered ({String(selectedDriveModal.applicationStatus || 'Applied').toUpperCase().replace('_', ' ')})
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-drive-register"
                    disabled={actionLoading}
                    onClick={() => {
                      handleRegisterForDrive(selectedDriveModal);
                      setSelectedDriveModal(null);
                    }}
                  >
                    🚀 1-Click Register Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default JobBoard;
