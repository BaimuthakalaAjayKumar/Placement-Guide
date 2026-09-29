import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './InterviewExperienceRepo.css';

const InterviewExperienceRepo = () => {
  const { token, user } = useAuth();
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtering
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Expand card state
  const [expandedId, setExpandedId] = useState(null);

  // New submission modal/form
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    company: 'TCS',
    role: 'Software Developer',
    packageLPA: '7.5 LPA',
    selectionStatus: 'Selected',
    overallDifficulty: 'Medium',
    driveYear: '2025',
    preparationAdvice: '',
    round1Aptitude: 'Aptitude & Numerical Ability: 30 Questions, Speed Math, Logical Reasoning & basic coding',
    round2Technical: 'Technical Interview: DSA (Arrays & HashMap), OOPs Concepts, SQL Group By / Joins, Final Year Project walkthrough',
    round3HR: 'HR Round: Relocation willingness, team conflict handling, career aspirations'
  });

  const fetchExperiences = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `${API_URL}/interview-experiences`;
      const params = [];
      if (selectedCompany !== 'all') params.push(`company=${encodeURIComponent(selectedCompany)}`);
      if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      if (user?.role === 'admin' || user?.role === 'faculty') params.push('status=all');

      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExperiences(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch interview experiences');
      }
    } catch (err) {
      setError('Connection failure while loading interview experiences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchExperiences();
    }
  }, [token, selectedCompany]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const rounds = [
        {
          roundNumber: 1,
          roundName: 'Round 1: Aptitude & Online Assessment',
          roundType: 'Aptitude',
          questionsAsked: formData.round1Aptitude.split('\n').filter(q => q.trim()),
          difficulty: 'Medium'
        },
        {
          roundNumber: 2,
          roundName: 'Round 2: Technical Interview',
          roundType: 'Technical',
          questionsAsked: formData.round2Technical.split('\n').filter(q => q.trim()),
          difficulty: 'Medium'
        },
        {
          roundNumber: 3,
          roundName: 'Round 3: HR & Managerial',
          roundType: 'HR',
          questionsAsked: formData.round3HR.split('\n').filter(q => q.trim()),
          difficulty: 'Easy'
        }
      ];

      const payload = {
        company: formData.company,
        role: formData.role,
        packageLPA: formData.packageLPA,
        selectionStatus: formData.selectionStatus,
        overallDifficulty: formData.overallDifficulty,
        driveYear: formData.driveYear,
        preparationAdvice: formData.preparationAdvice,
        rounds
      };

      const res = await fetch(`${API_URL}/interview-experiences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Interview experience submitted successfully! Thank you for helping your peers.');
        setShowSubmitModal(false);
        fetchExperiences();
      } else {
        setError(data.error || 'Failed to submit experience');
      }
    } catch (err) {
      setError('Error submitting interview experience');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModerate = async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/interview-experiences/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Experience marked as ${status}.`);
        fetchExperiences();
      }
    } catch (err) {
      setError('Moderation action failed');
    }
  };

  const handleHelpful = async (id) => {
    try {
      const res = await fetch(`${API_URL}/interview-experiences/${id}/helpful`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setExperiences(prev => prev.map(exp => exp._id === id ? { ...exp, helpfulVotes: (exp.helpfulVotes || 0) + 1 } : exp));
      }
    } catch (err) {
      console.warn('Helpful vote failed', err);
    }
  };

  return (
    <div className="interview-repo-container animate-fade">
      {/* Header and Call to Action */}
      <div className="repo-header-banner glass-card">
        <div>
          <h2>🏢 Interview Experience Repository</h2>
          <p>Read real, round-by-round interview debriefs from GRIET students and alumni across TCS, Amazon, Infosys, and more.</p>
        </div>
        <button
          type="button"
          className="btn btn-accent"
          onClick={() => setShowSubmitModal(true)}
        >
          ➕ Submit Your Experience
        </button>
      </div>

      {error && <div className="error-banner"><span>{error}</span></div>}
      {success && <div className="success-banner"><span>{success}</span></div>}

      {/* Filter and Search Bar */}
      <div className="repo-filter-bar glass-card">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
          <select
            className="form-control"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{ maxWidth: '180px' }}
          >
            <option value="all">All Companies</option>
            <option value="TCS">TCS</option>
            <option value="Amazon">Amazon</option>
            <option value="Infosys">Infosys</option>
            <option value="Cognizant">Cognizant</option>
            <option value="Wipro">Wipro</option>
          </select>

          <input
            type="text"
            placeholder="Search by role, questions or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
            style={{ flex: 1, minWidth: '220px' }}
          />

          <button type="button" className="btn btn-secondary" onClick={fetchExperiences}>
            Search
          </button>
        </div>
      </div>

      {/* Experience Cards Feed */}
      {loading ? (
        <div className="dashboard-loading-container">
          <div className="spinner-loader"></div>
          <p>Loading real interview reports...</p>
        </div>
      ) : experiences.length === 0 ? (
        <div className="glass-card empty-history-placeholder">
          <p>No interview experiences found matching your filters. Be the first to submit!</p>
        </div>
      ) : (
        <div className="experience-cards-list">
          {experiences.map(exp => {
            const isExpanded = expandedId === exp._id;
            return (
              <div key={exp._id} className="glass-card experience-item-card">
                <div className="exp-card-header">
                  <div className="exp-company-block">
                    <span className="exp-company-logo">🏢</span>
                    <div>
                      <h3 className="exp-title">{exp.company} — {exp.role}</h3>
                      <span className="exp-sub">
                        Submitted by: {exp.studentName} ({exp.studentBranch || 'Engineering'}) &nbsp;·&nbsp; Package: <strong>{exp.packageLPA || 'Standard'}</strong> &nbsp;·&nbsp; Batch: {exp.studentBatch || '2025'}
                      </span>
                    </div>
                  </div>

                  <div className="exp-badges-col">
                    <span className={`status-badge-pill ${exp.selectionStatus ? exp.selectionStatus.toLowerCase() : 'selected'}`}>
                      {exp.selectionStatus || 'Selected'}
                    </span>
                    <span className={`difficulty-badge ${exp.overallDifficulty ? exp.overallDifficulty.toLowerCase() : 'medium'}`}>
                      {exp.overallDifficulty || 'Medium'}
                    </span>
                    {exp.moderationStatus && (
                      <span className={`moderation-tag ${exp.moderationStatus}`}>
                        {exp.moderationStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Round previews */}
                <div className="exp-rounds-summary">
                  {(exp.rounds || []).map((rnd, rIdx) => (
                    <div key={rIdx} className="round-chip">
                      <strong>{rnd.roundName || `Round ${rIdx + 1}`}</strong>
                      <span>({rnd.roundType || 'General'})</span>
                    </div>
                  ))}
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && (
                  <div className="exp-expanded-details animate-fade">
                    <h4 style={{ color: '#818cf8', margin: '1rem 0 0.5rem 0' }}>Detailed Round-by-Round Questions:</h4>
                    <div className="rounds-vertical-timeline">
                      {(exp.rounds || []).map((rnd, rIdx) => (
                        <div key={rIdx} className="round-detail-box">
                          <div className="round-box-header">
                            <h5>{rnd.roundName || `Round ${rIdx + 1}: ${rnd.roundType}`}</h5>
                            <span className="round-diff-tag">{rnd.difficulty || 'Medium'}</span>
                          </div>
                          {rnd.experienceSummary && (
                            <p className="round-summary-text">{rnd.experienceSummary}</p>
                          )}
                          <strong style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Questions Asked:</strong>
                          <ul className="round-questions-bullets">
                            {(rnd.questionsAsked || []).map((q, qIdx) => (
                              <li key={qIdx}>{q}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {exp.preparationAdvice && (
                      <div className="prep-advice-box">
                        <strong>💡 Key Preparation Advice:</strong>
                        <p>{exp.preparationAdvice}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="exp-card-footer">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setExpandedId(isExpanded ? null : exp._id)}
                  >
                    {isExpanded ? '▲ Hide Full Rounds' : '▼ Read All Rounds & Questions'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="helpful-btn"
                      onClick={() => handleHelpful(exp._id)}
                    >
                      👍 Helpful ({exp.helpfulVotes || 0})
                    </button>

                    {(user?.role === 'admin' || user?.role === 'faculty') && exp.moderationStatus === 'pending' && (
                      <div className="moderation-actions">
                        <button
                          type="button"
                          className="btn-mod approve"
                          onClick={() => handleModerate(exp._id, 'approved')}
                        >
                          ✓ Approve
                        </button>
                        <button
                          type="button"
                          className="btn-mod reject"
                          onClick={() => handleModerate(exp._id, 'rejected')}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Modal */}
      {showSubmitModal && (
        <div className="modal-backdrop">
          <div className="modal-card animate-fade" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <h3>Share Your Interview Experience</h3>
              <button type="button" className="close-btn" onClick={() => setShowSubmitModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="exp-form-body">
              <div className="form-grid-2-col">
                <div className="form-group">
                  <label>Company Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-3-col">
                <div className="form-group">
                  <label>Package (LPA)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.packageLPA}
                    onChange={(e) => setFormData({ ...formData, packageLPA: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Outcome</label>
                  <select
                    className="form-control"
                    value={formData.selectionStatus}
                    onChange={(e) => setFormData({ ...formData, selectionStatus: e.target.value })}
                  >
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Awaiting Results">Awaiting Results</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Difficulty</label>
                  <select
                    className="form-control"
                    value={formData.overallDifficulty}
                    onChange={(e) => setFormData({ ...formData, overallDifficulty: e.target.value })}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Round 1: Aptitude (Enter questions or tips, one per line)</label>
                <textarea
                  rows="3"
                  className="form-control"
                  value={formData.round1Aptitude}
                  onChange={(e) => setFormData({ ...formData, round1Aptitude: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Round 2: Technical (Enter questions or tips, one per line)</label>
                <textarea
                  rows="3"
                  className="form-control"
                  value={formData.round2Technical}
                  onChange={(e) => setFormData({ ...formData, round2Technical: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Round 3: HR (Enter questions or tips, one per line)</label>
                <textarea
                  rows="3"
                  className="form-control"
                  value={formData.round3HR}
                  onChange={(e) => setFormData({ ...formData, round3HR: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Preparation Advice for Juniors</label>
                <textarea
                  rows="2"
                  className="form-control"
                  placeholder="e.g. Focus on Striver SDE sheet and practice SQL queries before technical round."
                  value={formData.preparationAdvice}
                  onChange={(e) => setFormData({ ...formData, preparationAdvice: e.target.value })}
                />
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubmitModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewExperienceRepo;
