import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './PeerMentorSystem.css';

const PeerMentorSystem = () => {
  const { token, user } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mentorship request modal
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [requestTopic, setRequestTopic] = useState('DSA Preparation');
  const [requestMessage, setRequestMessage] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Mentor registration modal (for placed seniors)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regForm, setRegForm] = useState({
    placedCompany: 'Amazon',
    placedRole: 'SDE-1',
    packageLPA: '28 LPA',
    bio: 'Cleared on-campus drive with focus on DSA and System Design. Ready to help juniors prepare for technical rounds.',
    expertiseAreas: 'DSA, Resume Review, Mock Coding, System Design Basics'
  });

  const fetchMentors = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/peer-mentors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMentors(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch peer mentors');
      }
    } catch (err) {
      setError('Connection failure while loading peer mentors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchMentors();
    }
  }, [token]);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!selectedMentor) return;

    try {
      setSubmittingRequest(true);
      setError('');
      const res = await fetch(`${API_URL}/peer-mentors/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mentorId: selectedMentor._id,
          topic: requestTopic,
          message: requestMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Mentorship request sent to ${selectedMentor.mentorName}! You will be notified once they accept.`);
        setSelectedMentor(null);
        setRequestMessage('');
      } else {
        setError(data.error || 'Failed to submit mentorship request');
      }
    } catch (err) {
      setError('Error submitting mentorship request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRegisterMentor = async (e) => {
    e.preventDefault();
    try {
      setRegistering(true);
      setError('');
      const res = await fetch(`${API_URL}/peer-mentors/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          placedCompany: regForm.placedCompany,
          placedRole: regForm.placedRole,
          packageLPA: regForm.packageLPA,
          bio: regForm.bio,
          expertiseAreas: regForm.expertiseAreas.split(',').map(s => s.trim()).filter(Boolean)
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Congratulations! You are now registered as an official GRIET Peer Mentor.');
        setShowRegisterModal(false);
        fetchMentors();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Error registering as peer mentor');
    } finally {
      setRegistering(false);
    }
  };

  const handleAcceptRequest = async (mentorId, requestId) => {
    try {
      const res = await fetch(`${API_URL}/peer-mentors/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mentorId,
          status: 'accepted',
          replyMessage: 'Accepted! Let’s connect on the discussion rooms to review your prep and resume.'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Mentorship request accepted! Connected with student.');
        fetchMentors();
      }
    } catch (err) {
      setError('Failed to accept request');
    }
  };

  return (
    <div className="peer-mentor-container animate-fade">
      {/* Header Banner */}
      <div className="mentor-header-banner glass-card">
        <div>
          <h2>🤝 Peer Mentor System</h2>
          <p>
            Connect directly with placed seniors from Amazon, TCS Digital, Cognizant, and Infosys. Receive 1-on-1 resume feedback, interview advice, and curated prep resources.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-accent"
            onClick={() => setShowRegisterModal(true)}
          >
            🎓 Become a Senior Mentor
          </button>
        </div>
      </div>

      {error && <div className="error-banner"><span>{error}</span></div>}
      {success && <div className="success-banner"><span>{success}</span></div>}

      {/* Workflow Step Indicator */}
      <div className="mentor-workflow-stepper glass-card">
        <div className="wf-step">
          <span className="wf-num">1</span>
          <strong>Browse Mentors</strong>
          <span>Find placed seniors in your target company</span>
        </div>
        <div className="wf-arrow">→</div>
        <div className="wf-step">
          <span className="wf-num">2</span>
          <strong>Request Mentorship</strong>
          <span>Specify your target topics & doubts</span>
        </div>
        <div className="wf-arrow">→</div>
        <div className="wf-step">
          <span className="wf-num">3</span>
          <strong>Mentor Accepts</strong>
          <span>Connect 1-on-1 for mock tests & guidance</span>
        </div>
      </div>

      {/* Mentor Cards Grid */}
      {loading ? (
        <div className="dashboard-loading-container">
          <div className="spinner-loader"></div>
          <p>Loading placed senior mentors...</p>
        </div>
      ) : mentors.length === 0 ? (
        <div className="glass-card empty-history-placeholder">
          <p>No mentors registered yet. Placed seniors can register using "Become a Senior Mentor" button above!</p>
        </div>
      ) : (
        <div className="mentors-grid">
          {mentors.map(mentor => {
            const isSelf = mentor.mentor === user?._id || mentor.mentorEmail === user?.email;
            return (
              <div key={mentor._id} className="glass-card mentor-card">
                <div className="mentor-top-profile">
                  <div className="mentor-avatar-badge">
                    <span>🎓</span>
                  </div>
                  <div>
                    <h3 className="mentor-name">{mentor.mentorName}</h3>
                    <span className="mentor-placement-tag">
                      Placed at <strong>{mentor.placedCompany}</strong> ({mentor.placedRole})
                    </span>
                    <span className="mentor-pkg">{mentor.packageLPA}</span>
                  </div>
                </div>

                <p className="mentor-bio">"{mentor.bio}"</p>

                {/* Expertise tags */}
                <div className="expertise-tags-row">
                  {(mentor.expertiseAreas || []).map((exp, idx) => (
                    <span key={idx} className="expertise-pill">
                      {exp}
                    </span>
                  ))}
                </div>

                {/* Pending requests view for mentor himself */}
                {isSelf && mentor.requestsReceived && mentor.requestsReceived.length > 0 && (
                  <div className="mentor-received-requests-box">
                    <strong style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                      📬 Requests from Juniors ({mentor.requestsReceived.length}):
                    </strong>
                    {mentor.requestsReceived.map(req => (
                      <div key={req._id} className="req-sub-item">
                        <div>
                          <strong>{req.studentName} ({req.topic})</strong>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>"{req.message}"</p>
                        </div>
                        {req.status === 'pending' ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-accent"
                            onClick={() => handleAcceptRequest(mentor._id, req._id)}
                          >
                            Accept
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700' }}>✓ Accepted</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer action */}
                <div className="mentor-card-footer">
                  <span className="mentor-status-indicator">
                    <span className="online-dot"></span> Available for Mentorship
                  </span>

                  {!isSelf && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectedMentor(mentor)}
                    >
                      Request Mentor →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Request Mentorship Modal */}
      {selectedMentor && (
        <div className="modal-backdrop">
          <div className="modal-card animate-fade" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3>Request Mentorship from {selectedMentor.mentorName}</h3>
              <button type="button" className="close-btn" onClick={() => setSelectedMentor(null)}>×</button>
            </div>

            <form onSubmit={handleSendRequest} className="exp-form-body">
              <div className="form-group">
                <label>Target Company & Role</label>
                <input
                  type="text"
                  disabled
                  className="form-control"
                  value={`${selectedMentor.placedCompany} (${selectedMentor.placedRole})`}
                />
              </div>

              <div className="form-group">
                <label>Focus Topic for Mentorship</label>
                <select
                  className="form-control"
                  value={requestTopic}
                  onChange={(e) => setRequestTopic(e.target.value)}
                >
                  <option value="DSA Preparation">DSA & Problem Solving</option>
                  <option value="Resume Review">Resume Formatting & ATS Polish</option>
                  <option value="Company OA Strategies">Online Assessment Strategies</option>
                  <option value="Mock Technical Interview">Mock Technical Interview</option>
                  <option value="HR & Behavioral Rounds">HR & Behavioral Strategy</option>
                </select>
              </div>

              <div className="form-group">
                <label>Your Message & Specific Questions</label>
                <textarea
                  rows="4"
                  required
                  className="form-control"
                  placeholder="Introduce yourself, your branch, current prep status, and what you would like guidance on..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                />
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedMentor(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={submittingRequest}>
                  {submittingRequest ? 'Sending Request...' : 'Send Mentorship Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register As Senior Mentor Modal */}
      {showRegisterModal && (
        <div className="modal-backdrop">
          <div className="modal-card animate-fade" style={{ maxWidth: '540px', width: '90%' }}>
            <div className="modal-header">
              <h3>Register as a GRIET Peer Mentor</h3>
              <button type="button" className="close-btn" onClick={() => setShowRegisterModal(false)}>×</button>
            </div>

            <form onSubmit={handleRegisterMentor} className="exp-form-body">
              <div className="form-grid-2-col">
                <div className="form-group">
                  <label>Company Placed</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={regForm.placedCompany}
                    onChange={(e) => setRegForm({ ...regForm, placedCompany: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Job Role</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={regForm.placedRole}
                    onChange={(e) => setRegForm({ ...regForm, placedRole: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Offered Package / Tier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 12 LPA, Super Dream Offer"
                  className="form-control"
                  value={regForm.packageLPA}
                  onChange={(e) => setRegForm({ ...regForm, packageLPA: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Mentor Bio & Placement Journey</label>
                <textarea
                  rows="3"
                  required
                  className="form-control"
                  placeholder="Describe your prep experience, rounds cleared, and what juniors can learn from you..."
                  value={regForm.bio}
                  onChange={(e) => setRegForm({ ...regForm, bio: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Expertise Areas (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. LeetCode, DBMS, Resume Review, System Design"
                  value={regForm.expertiseAreas}
                  onChange={(e) => setRegForm({ ...regForm, expertiseAreas: e.target.value })}
                />
              </div>

              <div className="modal-actions-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent" disabled={registering}>
                  {registering ? 'Registering...' : 'Register as Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeerMentorSystem;
