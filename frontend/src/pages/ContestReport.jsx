import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './ContestsPortal.css';

const ContestReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

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
    (attempt.submissions || []).forEach(sub => {
      if (
        sub.status === 'Plagiarized' ||
        (sub.plagiarismPercentage && sub.plagiarismPercentage > 0) ||
        (attempt.maxPlagiarismPercentage && attempt.maxPlagiarismPercentage > 0)
      ) {
        // Also look up peer submission code if similarityRefUser is populated
        let matchedSubmissionCode = '';
        if (sub.similarityRefUser?._id) {
          const matchedAttempt = attempts.find(
            a => a.user?._id?.toString() === sub.similarityRefUser._id.toString()
          );
          if (matchedAttempt) {
            const matchedSub = matchedAttempt.submissions?.find(
              ms => (ms.question?._id || ms.question)?.toString() === (sub.question?._id || sub.question)?.toString()
            );
            if (matchedSub) {
              matchedSubmissionCode = matchedSub.code;
            }
          }
        }

        plagiarismIncidents.push({
          attemptId: attempt._id,
          candidate: attempt.user,
          isDisqualified: attempt.isDisqualified,
          question: sub.question,
          code: sub.code,
          language: sub.language,
          plagiarismPercentage: sub.plagiarismPercentage || attempt.maxPlagiarismPercentage || 0,
          status: sub.status,
          similarityRefUser: sub.similarityRefUser,
          matchingFragments: sub.matchingFragments || [],
          matchedSubmissionCode,
          submittedAt: sub.submittedAt || attempt.submittedAt
        });
      }
    });
  });

  const handleDisqualify = async (attemptId, candidateName) => {
    if (!window.confirm(`Are you sure you want to DISQUALIFY candidate "${candidateName}"? Their score will be set to 0 and their contest attempt marked as Disqualified.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/contests/internal/${id}/disqualify/${attemptId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(`Candidate "${candidateName}" has been disqualified.`);
        fetchReport();
      } else {
        alert(data.error || 'Failed to disqualify candidate');
      }
    } catch (e) {
      alert(e.message || 'Error occurred while disqualifying candidate');
    }
  };

  const handleDismissPlagiarism = async (attemptId, candidateName) => {
    if (!window.confirm(`Dismiss plagiarism flag for "${candidateName}"? Plagiarized submissions will be restored to Accepted status.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/contests/internal/${id}/dismiss-plagiarism/${attemptId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert(`Plagiarism flag dismissed for "${candidateName}".`);
        fetchReport();
      } else {
        alert(data.error || 'Failed to dismiss flag');
      }
    } catch (e) {
      alert(e.message || 'Error occurred while dismissing plagiarism flag');
    }
  };

  if (loading) {
    return (
      <div className="exam-loading">
        <div className="spinner-loader"></div>
        <p>Loading assessment reports & plagiarism audit...</p>
      </div>
    );
  }

  const disqualifiedCount = attempts.filter(a => a.isDisqualified).length;
  const criticalCount = attempts.filter(a => a.maxPlagiarismPercentage >= 60).length;

  return (
    <>
      <Header title="Contest Proctoring & Plagiarism Report" />

      <div className="content-wrapper">
        <div className="report-summary-cards mb-20 animate-fade">
          <div className="glass-card summary-card-item">
            <h3>Contest Title</h3>
            <p className="summary-val text-yellow">{contest.title}</p>
            <p className="summary-sub">Duration: {contest.duration} mins | {contest.questions?.length || 0} Problems</p>
          </div>
          <div className="glass-card summary-card-item">
            <h3>Total Candidates</h3>
            <p className="summary-val">{attempts.length}</p>
            <p className="summary-sub">Audited Attempts: {attempts.filter(a => a.plagiarismAudited).length}</p>
          </div>
          <div className="glass-card summary-card-item">
            <h3>Plagiarism Incidents</h3>
            <p className="summary-val text-red">{plagiarismIncidents.length}</p>
            <p className="summary-sub">{criticalCount} High Risk (&ge;60%) | {disqualifiedCount} Disqualified</p>
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
            🛡️ Plagiarism Audit ({plagiarismIncidents.length})
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
            <h3 className="card-heading">Contest Ranking, Scores & Integrity Status</h3>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Roll No</th>
                    <th>Candidate</th>
                    <th>Branch</th>
                    <th>Score</th>
                    <th>Plagiarism Audit</th>
                    <th>Fullscreen Exits</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((attempt, index) => {
                    const isPlagiarised = attempt.submissions?.some(s => s.status === 'Plagiarized');
                    const maxPlag = attempt.maxPlagiarismPercentage || 0;
                    return (
                      <tr key={attempt._id} className={attempt.isDisqualified ? 'row-critical' : ''}>
                        <td><strong>#{index + 1}</strong></td>
                        <td>{attempt.user?.rollNumber || 'N/A'}</td>
                        <td>
                          <div>
                            <strong>{attempt.user?.name}</strong>
                            {attempt.isDisqualified && (
                              <span className="disqualified-pill ml-5">DISQUALIFIED</span>
                            )}
                            <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>{attempt.user?.email}</div>
                          </div>
                        </td>
                        <td>{attempt.user?.branch || 'General'}</td>
                        <td>
                          {attempt.isDisqualified ? (
                            <span className="score-badge text-red" style={{ textDecoration: 'line-through' }}>
                              0 / 100
                            </span>
                          ) : (
                            <span className="score-badge">{attempt.score}/100</span>
                          )}
                        </td>
                        <td>
                          {maxPlag >= 60 ? (
                            <span className="plag-pill critical">🚨 {maxPlag}% Critical</span>
                          ) : maxPlag >= 40 ? (
                            <span className="plag-pill warning">⚠️ {maxPlag}% Moderate</span>
                          ) : maxPlag > 0 ? (
                            <span className="plag-pill safe">✓ {maxPlag}% Low</span>
                          ) : attempt.plagiarismAudited ? (
                            <span className="plag-pill clean">✓ 0% Clean</span>
                          ) : (
                            <span className="plag-pill clean">Auditing...</span>
                          )}
                        </td>
                        <td>
                          <span className={attempt.fullscreenExits >= 3 ? 'text-red font-bold' : ''}>
                            {attempt.fullscreenExits} / 3
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge-inline ${attempt.isFinished ? 'completed' : 'live'}`}>
                            {attempt.isFinished ? 'Finished' : 'In Progress'}
                          </span>
                          {isPlagiarised && (
                            <span className="status-badge-inline plagiarized ml-5">Flagged</span>
                          )}
                        </td>
                        <td>
                          {attempt.isDisqualified ? (
                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleDismissPlagiarism(attempt._id, attempt.user?.name)}
                              title="Restore candidate status"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              className="btn btn-danger btn-xs"
                              onClick={() => handleDisqualify(attempt._id, attempt.user?.name)}
                              title="Disqualify candidate and set score to 0"
                            >
                              Disqualify
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#718096' }}>
                        No candidates have started this contest yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PLAGIARISM INCIDENTS & SIDE-BY-SIDE DIFF */}
        {activeReportTab === 'plagiarism' && (
          <div className="plagiarism-tab-content">
            <div className="plagiarism-list">
              {plagiarismIncidents.map((incident, idx) => {
                const sim = incident.plagiarismPercentage;
                const isCritical = sim >= 60;
                const isWarning = sim >= 40 && sim < 60;

                return (
                  <div key={idx} className={`glass-card plagiarism-incident-card animate-fade ${isCritical ? 'border-critical' : ''}`}>
                    <div className="incident-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`incident-badge ${isCritical ? 'critical' : isWarning ? 'warning' : 'info'}`}>
                          {isCritical ? '🚨 CRITICAL MATCH' : isWarning ? '⚠️ MODERATE MATCH' : '🔍 SIMILARITY MATCH'}: {sim}%
                        </span>
                        {incident.isDisqualified && (
                          <span className="disqualified-pill">⛔ CANDIDATE DISQUALIFIED</span>
                        )}
                      </div>
                      <span className="incident-time">
                        📅 {incident.submittedAt ? new Date(incident.submittedAt).toLocaleTimeString() : '--'}
                      </span>
                    </div>

                    <div className="incident-description">
                      Candidate <strong>{incident.candidate?.name}</strong> ({incident.candidate?.rollNumber || incident.candidate?.email}) submitted code for problem <strong>"{incident.question?.title || 'Contest Problem'}"</strong> ({incident.question?.difficulty || 'Medium'}) matching Candidate <strong>"{incident.similarityRefUser?.name || 'Anonymous Peer'}"</strong> ({incident.similarityRefUser?.rollNumber || incident.similarityRefUser?.email || ''}) with <strong>{sim}%</strong> token &amp; structural AST similarity.
                    </div>

                    {incident.matchingFragments?.length > 0 && (
                      <div className="matching-fragments-banner">
                        🧩 <strong>Matching Code Blocks:</strong> Detected {incident.matchingFragments.length} identical AST statement fragments between candidate and peer submissions.
                      </div>
                    )}

                    {/* Side-by-Side Code Viewer */}
                    <div className="side-by-side-code">
                      <div className="code-box">
                        <div className="code-title">
                          👤 {incident.candidate?.name}'s Submission ({incident.language})
                        </div>
                        <pre className="code-block-report">{incident.code}</pre>
                      </div>
                      <div className="code-box">
                        <div className="code-title">
                          👥 Matched Peer: {incident.similarityRefUser?.name || 'Peer Code'} ({incident.language})
                        </div>
                        <pre className="code-block-report">
                          {incident.matchedSubmissionCode || '// Peer code stored in pairwise audit repository'}
                        </pre>
                      </div>
                    </div>

                    {/* Admin Action Controls */}
                    <div className="incident-actions-bar">
                      {!incident.isDisqualified ? (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDisqualify(incident.attemptId, incident.candidate?.name)}
                        >
                          ⛔ Disqualify Candidate (Score 0)
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDismissPlagiarism(incident.attemptId, incident.candidate?.name)}
                        >
                          ✓ Restore Candidate &amp; Reset Status
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm ml-10"
                        onClick={() => handleDismissPlagiarism(incident.attemptId, incident.candidate?.name)}
                      >
                        Dismiss Flag (False Positive)
                      </button>
                    </div>
                  </div>
                );
              })}

              {plagiarismIncidents.length === 0 && (
                <div className="empty-state-box">
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🛡️</div>
                  <h4>No Plagiarism Incidents Detected</h4>
                  <p>All submitted solutions are verified clean with independent AST syntax and token distributions.</p>
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
                      <div className="cand-name">{a.user?.name}</div>
                      <div className="cand-sub">Violations: {a.fullscreenExits} exits | Plag: {a.maxPlagiarismPercentage || 0}%</div>
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
                    <h3>Proctor Logs: {selectedAttempt.user?.name}</h3>
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
                          <span className="log-type-tag">{log.type?.toUpperCase()}</span>
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
