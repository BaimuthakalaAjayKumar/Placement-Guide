import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './JobBoard.css';

const JobBoard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/jobs/recommendations`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
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

  useEffect(() => {
    if (token) {
      fetchJobs();
    }
  }, [token]);

  const handleStartMockPrep = () => {
    navigate('/mock-interviews');
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

      <div className="content-wrapper job-content animate-fade">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        <div className="job-board-header">
          <p className="card-desc">Personalized matching based on skills extracted from your resume and targeted career goals.</p>
        </div>

        <div className="job-cards-list">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div className="glass-card job-posting-card" key={job._id}>
                
                <div className="job-main-details">
                  <div className="job-primary-info">
                    <span className="company-name-label">{job.company}</span>
                    <h2>{job.title}</h2>
                    
                    <div className="job-tags-row">
                      <span className="job-pill location">
                        <svg viewBox="0 0 24 24" className="pill-icon"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        {job.location}
                      </span>
                      <span className="job-pill salary">
                        <svg viewBox="0 0 24 24" className="pill-icon"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        {job.salary}
                      </span>
                      <span className="job-pill experience">
                        <svg viewBox="0 0 24 24" className="pill-icon"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
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

                <div className="job-card-actions-footer">
                  <button className="btn btn-secondary" onClick={handleStartMockPrep}>
                    Practice Mock Interview
                  </button>
                  <a href={job.applyLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary no-underline-btn">
                    Apply Now
                    <svg viewBox="0 0 24 24" className="apply-icon-svg"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </a>
                </div>

              </div>
            ))
          ) : (
            <div className="empty-history-placeholder glass-card">
              <p>No job recommendations available at this time.</p>
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default JobBoard;
