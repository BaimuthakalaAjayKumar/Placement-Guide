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
  const [activeTab, setActiveTab] = useState('recommendations');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
      const res = await fetch(`${API_URL}/jobs/${jobId}/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchSavedJobs();
      }
    } catch (err) {
      alert('Could not toggle save state.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyJob = async (jobId) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchAppliedJobs();
      } else {
        alert(data.error || 'Failed to apply.');
      }
    } catch (err) {
      alert('Could not complete application.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMockPrep = () => {
    navigate('/mock-interviews');
  };

  // Filter recommendations
  const filteredRecommendations = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.requirements.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLocation = locationFilter === '' || job.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  // Filter saved
  const filteredSaved = savedJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.requirements.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLocation = locationFilter === '' || job.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  // Filter applied
  const filteredApplied = appliedJobs.filter(app => {
    if (!app.job) return false;
    const matchesSearch = app.job.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === '' || app.job.location.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  const isSaved = (jobId) => savedJobs.some(j => j._id === jobId);
  const isApplied = (jobId) => appliedJobs.some(a => a.job && a.job._id === jobId);
  const getAppliedStatus = (jobId) => {
    const app = appliedJobs.find(a => a.job && a.job._id === jobId);
    return app ? app.status : '';
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
          {error && (
            <div className="error-banner">
              <span>{error}</span>
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
          <div className="filter-controls" style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            <input
              type="text"
              placeholder="Search by title, company, or skills..."
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 2, padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
            />
            <select
              className="form-control"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              style={{ flex: 1, padding: '0.75rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
            >
              <option value="">All Locations</option>
              <option value="Remote">Remote</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Pune">Pune</option>
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
                            {job.location}
                          </span>
                          <span className="job-pill salary">
                            {job.salary}
                          </span>
                          <span className="job-pill experience">
                            {job.experienceLevel}
                          </span>
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
                        <span className="skills-group-title matched">Matched Skills ({job.matchedSkills.length})</span>
                        <div className="skills-badge-list">
                          {job.matchedSkills.length > 0 ? (
                            job.matchedSkills.map((s, i) => (
                              <span className="skill-badge matched" key={i}>{s}</span>
                            ))
                          ) : (
                            <span className="no-skills-msg">No matching skills found in resume.</span>
                          )}
                        </div>
                      </div>

                      <div className="skills-group">
                        <span className="skills-group-title missing">Missing Skills ({job.missingSkills.length})</span>
                        <div className="skills-badge-list">
                          {job.missingSkills.length > 0 ? (
                            job.missingSkills.map((s, i) => (
                              <span className="skill-badge missing" key={i}>{s}</span>
                            ))
                          ) : (
                            <span className="no-skills-msg success">✓ Ready! Meets all skill criteria.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="job-card-actions-footer" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button className="btn btn-secondary" onClick={handleStartMockPrep}>
                        Practice Mock Interview
                      </button>
                      <button className="btn btn-secondary" disabled={actionLoading} onClick={() => handleSaveJob(job._id)}>
                        {isSaved(job._id) ? '♥ Saved' : '♡ Save Job'}
                      </button>
                      {isApplied(job._id) ? (
                        <button className="btn btn-accent" disabled={true} style={{ textTransform: 'capitalize' }}>
                          Applied (Status: {getAppliedStatus(job._id)})
                        </button>
                      ) : (
                        <button className="btn btn-primary" disabled={actionLoading} onClick={() => handleApplyJob(job._id)}>
                          Apply Now
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
                          <span className="job-pill location">{job.location}</span>
                          <span className="job-pill salary">{job.salary}</span>
                          <span className="job-pill experience">{job.experienceLevel}</span>
                        </div>
                      </div>
                    </div>
                    <div className="job-description-block">
                      <p>{job.description}</p>
                    </div>
                    <div className="job-card-actions-footer" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                      <button className="btn btn-secondary" onClick={() => handleSaveJob(job._id)}>
                        Unsave Job
                      </button>
                      {isApplied(job._id) ? (
                        <button className="btn btn-accent" disabled={true}>
                          Applied
                        </button>
                      ) : (
                        <button className="btn btn-primary" onClick={() => handleApplyJob(job._id)}>
                          Apply Now
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

          {/* Applied Jobs Tab (Live Tracking) */}
          {activeTab === 'applied' && (
            <div className="job-cards-list">
              {filteredApplied.length > 0 ? (
                filteredApplied.map((app) => (
                  <div className="glass-card job-posting-card" key={app._id}>
                    <div className="job-main-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="job-primary-info">
                        <span className="company-name-label">{app.job.company}</span>
                        <h2>{app.job.title}</h2>
                        <span className="session-date">Applied on: {new Date(app.appliedAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span
                          className={`status-badge-inline ${app.status}`}
                          style={{
                            fontSize: '0.85rem',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            background: app.status === 'offered' ? '#10b981' : app.status === 'rejected' ? '#ef4444' : app.status === 'interviewing' ? '#3b82f6' : '#64748b',
                            color: 'white'
                          }}
                        >
                          {app.status}
                        </span>
                      </div>
                    </div>
                    <div className="job-description-block" style={{ marginTop: '15px' }}>
                      <p>{app.job.description}</p>
                    </div>
                    <div style={{ marginTop: '15px', color: '#94a3b8', fontSize: '0.85rem' }}>
                      Eligibility Match: <strong style={{ color: '#4ade80' }}>✓ Confirmed</strong>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-history-placeholder glass-card">
                  <p>You haven't applied to any jobs yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </>
  );
};

export default JobBoard;
