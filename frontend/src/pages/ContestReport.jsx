import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './ContestsPortal.css';

const ContestReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [contest, setContest] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detail panel states
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState('scoreboard'); // 'scoreboard', 'plagiarism', 'proctoring'

  // Fetch detailed reports on load
  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/contests/internal/${id}/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setContest(data.data.contest);
        setAttempts(data.data.attempts || []);
        if (data.data.attempts?.length > 0) {
          setSelectedAttempt(data.data.attempts[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Find all plagiarism submissions across all attempts
  const plagiarismIncidents = [];
  attempts.forEach(attempt => {
    attempt.submissions.forEach(sub => {
      if (sub.status === 'Plagiarized') {
        plagiarismIncidents.push({
          candidate: attempt.user,
          question: sub.question,
          code: sub.code,
          language: sub.language,
          similarityRefUser: sub.similarityRefUser,
          submittedAt: sub.submittedAt
        });
      }
    });
  });

  if (loading) {
    return (
      <div className="exam-loading">
        <div className="spinner-loader"></div>
        <p>Loading assessment reports...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="Contest Proctoring Report" />

      <div className="content-wrapper">
        <div className="report-summary-cards mb-20 animate-fade">
          <div className="glass-card summary-card-item">
            <h3>Contest Title</h3>
            <p className="summary-val text-yellow">{contest.title}</p>
            <p className="summary-sub">Duration: {contest.duration} minutes</p>
          </div>
          <div className="glass-card summary-card-item">
            <h3>Total Candidates</h3>
            <p className="summary-val">{attempts.length}</p>
            <p className="summary-sub">Active Attempts logged</p>
          </div>
          <div className="glass-card summary-card-item">
            <h3>Plagiarism Cases</h3>
            <p className="summary-val text-red">{plagiarismIncidents.length}</p>
            <p className="summary-sub">Identical code matching cases</p>
          </div>
        </div>

        {/* Report tab selection */}
        <div className="report-nav-bar mb-20">
          <button
            className={`report-nav-btn ${activeReportTab === 'scoreboard' ? 'active' : ''}`}
            onClick={() => setActiveReportTab('scoreboard')}
          >
            🏆 Leaderboard Scoreboard
          </button>
          <button
            className={`report-nav-btn ${activeReportTab === 'plagiarism' ? 'active' : ''}`}
            onClick={() => setActiveReportTab('plagiarism')}
          >
            🕵️ Plagiarism Matches ({plagiarismIncidents.length})
          </button>
          <button
            className={`report-nav-btn ${activeReportTab === 'proctoring' ? 'active' : ''}`}
            onClick={() => setActiveReportTab('proctoring')}
          >
            📷 Camera & Proctor Logs
          </button>
        </div>

        {/* TAB 1: SCOREBOARD */}
        {activeReportTab === 'scoreboard' && (
          <div className="glass-card scoreboard-card animate-fade">
            <h3 className="card-heading">Contest Ranking & Candidate Scores</h3>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Roll No</th>
                    <th>Candidate</th>
                    <th>Branch</th>
                    <th>Score</th>
                    <th>Fullscreen Exits</th>
                    <th>Status</th>
                    <th>Finished At</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt, index) => {
                    const isPlagiarised = attempt.submissions.some(s => s.status === 'Plagiarized');
                    return (
                      <tr key={attempt._id} className={attempt.fullscreenExits >= 3 ? 'row-critical' : ''}>
                        <td><strong>#{index + 1}</strong></td>
                        <td>{attempt.user.rollNumber || 'N/A'}</td>
                        <td>
                          <div>
                            <strong>{attempt.user.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{attempt.user.email}</div>
                          </div>
                        </td>
                        <td>{attempt.user.branch || 'General'}</td>
                        <td>
                          <span className="score-badge">{attempt.score}/100</span>
                        </td>
                        <td>
                          <span className={attempt.fullscreenExits > 0 ? 'text-red font-bold' : ''}>
                            {attempt.fullscreenExits} / 3
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge-inline ${attempt.isFinished ? 'completed' : 'live'}`}>
                            {attempt.isFinished ? 'Finished' : 'In Progress'}
                          </span>
                          {isPlagiarised && (
                            <span className="status-badge-inline plagiarized ml-5">Plagiarism Flagged</span>
                          )}
                        </td>
                        <td>
                          {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleTimeString() : '--'}
                        </td>
                      </tr>
                    );
                  })}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                        No candidates have started this contest yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PLAGIARISM INCIDENTS */}
        {activeReportTab === 'plagiarism' && (
          <div className="plagiarism-tab-content">
            <div className="plagiarism-list">
              {plagiarismIncidents.map((incident, idx) => (
                <div key={idx} className="glass-card plagiarism-incident-card animate-fade">
                  <div className="incident-header">
                    <span className="incident-badge">FLAGGED MATCH</span>
                    <span className="incident-time">
                      📅 {new Date(incident.submittedAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="incident-description">
                    Candidate <strong>{incident.candidate.name}</strong> submitted code for question{' '}
                    <strong>{incident.question?.title || 'Unknown Question'}</strong> matching Candidate{' '}
                    <strong>{incident.similarityRefUser?.name || 'Anonymous'}</strong> exactly.
                  </div>
                  <div className="side-by-side-code">
                    <div className="code-box">
                      <div className="code-title">Submitted Code ({incident.language})</div>
                      <pre className="code-block-report">{incident.code}</pre>
                    </div>
                  </div>
                </div>
              ))}
              {plagiarismIncidents.length === 0 && (
                <div className="empty-state-box">
                  <p>✓ No plagiarism incidents detected for this contest.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PROCTORING LOGS DETAIL */}
        {activeReportTab === 'proctoring' && (
          <div className="proctoring-split-layout">
            {/* Candidate list */}
            <div className="candidates-list-card glass-card">
              <h3>Candidates</h3>
              <div className="candidates-list">
                {attempts.map(a => (
                  <button
                    key={a._id}
                    className={`candidate-select-btn ${selectedAttempt?._id === a._id ? 'active' : ''}`}
                    onClick={() => setSelectedAttempt(a)}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div className="cand-name">{a.user.name}</div>
                      <div className="cand-sub">Violations: {a.fullscreenExits} exits</div>
                    </div>
                    {a.fullscreenExits >= 3 && <span className="red-dot">🚫</span>}
                  </button>
                ))}
                {attempts.length === 0 && (
                  <p style={{ color: '#718096', fontSize: '0.9rem', textAlign: 'center', padding: '15px' }}>
                    No attempts logged.
                  </p>
                )}
              </div>
            </div>

            {/* Candidate logs timeline detail */}
            <div className="proctor-timeline-card glass-card">
              {selectedAttempt ? (
                <>
                  <div className="timeline-header-report">
                    <h3>Proctor Logs: {selectedAttempt.user.name}</h3>
                    <div className="violation-summary-tag">
                      Fullscreen Exits: {selectedAttempt.fullscreenExits} / 3
                    </div>
                  </div>

                  <div className="proctor-detailed-timeline">
                    {selectedAttempt.proctoringLogs && selectedAttempt.proctoringLogs.length > 0 ? (
                      selectedAttempt.proctoringLogs.map((log, index) => (
                        <div key={index} className={`timeline-row-report ${log.type}`}>
                          <span className="timestamp">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="log-type-tag">{log.type.toUpperCase()}</span>
                          <span className="msg">{log.message}</span>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: '#718096', padding: '20px' }}>No logs recorded for this attempt.</p>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#718096', padding: '60px 0' }}>
                  Please select a candidate from the left list to view proctor logs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ContestReport;
