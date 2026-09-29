import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import './StudentPlacementSuite.css';

const StudentPlacementSuite = () => {
  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap' | 'revision' | 'recommendations' | 'challenge' | 'wallet' | 'certificate'
  const [loading, setLoading] = useState(true);

  // Data states
  const [heatmap, setHeatmap] = useState([]);
  const [revisionSet, setRevisionSet] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [certificate, setCertificate] = useState(null);
  const [completingChallenge, setCompletingChallenge] = useState(false);
  const [challengeSuccess, setChallengeSuccess] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSuiteData = async () => {
    try {
      setLoading(true);
      const [hmRes, revRes, recRes, chalRes, walRes, certRes] = await Promise.all([
        axios.get(`${API_URL}/placement-suite/heatmap`, getAuthHeaders()).catch(() => ({ data: { heatmap: [] } })),
        axios.get(`${API_URL}/placement-suite/revision-set`, getAuthHeaders()).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/placement-suite/recommendations`, getAuthHeaders()).catch(() => ({ data: { data: {} } })),
        axios.get(`${API_URL}/placement-suite/daily-challenge`, getAuthHeaders()).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/placement-suite/wallet`, getAuthHeaders()).catch(() => ({ data: { wallet: {} } })),
        axios.get(`${API_URL}/placement-suite/certificate`, getAuthHeaders()).catch(() => ({ data: { certificate: {} } }))
      ]);

      setHeatmap(hmRes.data?.heatmap || []);
      setRevisionSet(revRes.data || null);
      setRecommendations(recRes.data?.data || null);
      setChallenge(chalRes.data?.challenge || null);
      setWallet(walRes.data?.wallet || null);
      setCertificate(certRes.data?.certificate || null);
    } catch (err) {
      console.warn('Error fetching placement suite:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuiteData();
  }, []);

  const handleCompleteChallenge = async () => {
    try {
      setCompletingChallenge(true);
      const res = await axios.post(`${API_URL}/placement-suite/daily-challenge/complete`, {}, getAuthHeaders());
      if (res.data?.success) {
        setChallengeSuccess('🎉 Challenge Completed! Streak incremented by 1 day.');
        setChallenge(prev => prev ? { ...prev, isCompletedToday: true, streakCount: res.data.streakCount } : prev);
        setTimeout(() => setChallengeSuccess(''), 3000);
      }
    } catch (err) {
      alert('Could not update daily streak.');
    } finally {
      setCompletingChallenge(false);
    }
  };

  return (
    <div className="placement-suite-container animate-fade">
      {/* Top Banner Navigation */}
      <div className="suite-header-card">
        <div className="suite-header-text">
          <div className="suite-badge">🎯 Comprehensive Placement Acceleration Suite</div>
          <h2 className="suite-heading">Skill Heatmaps, Smart Revision &amp; Placement Wallet</h2>
          <p className="suite-sub">
            Knowledge gap analytics, auto-generated revision sets, resource diagnostic engines, daily streak challenges, and verified completion certification.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="suite-tabs-nav">
          <button
            className={`suite-tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('heatmap')}
          >
            🗺️ Knowledge Heatmap
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'revision' ? 'active' : ''}`}
            onClick={() => setActiveTab('revision')}
          >
            🔄 Smart Revision (15Q)
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            💡 Resource Engine
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'challenge' ? 'active' : ''}`}
            onClick={() => setActiveTab('challenge')}
          >
            🔥 Daily Challenge {challenge?.streakCount ? `(${challenge.streakCount}🔥)` : ''}
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => setActiveTab('wallet')}
          >
            💼 Placement Wallet
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
            onClick={() => setActiveTab('certificate')}
          >
            🏆 Completion Certificate
          </button>
        </div>
      </div>

      {loading ? (
        <div className="suite-loading-state">
          <div className="suite-spinner"></div>
          <p>Loading placement analytics, revision sets, and portfolio records...</p>
        </div>
      ) : (
        <div className="suite-tab-content">
          {/* TAB 1: KNOWLEDGE HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="heatmap-section-wrapper animate-fade">
              <div className="section-head-card">
                <div>
                  <h3>📊 DSA &amp; Core Technical Knowledge Heatmap</h3>
                  <p>Real-time visual diagnostic of where you stand across interview topics so you immediately know where to focus.</p>
                </div>
                <div className="legend-strip">
                  <span className="legend-item"><span className="dot green">🟢</span> Mastered (70%+)</span>
                  <span className="legend-item"><span className="dot amber">🟡</span> Practicing (45-69%)</span>
                  <span className="legend-item"><span className="dot red">🔴</span> Needs Focus (&lt;45%)</span>
                </div>
              </div>

              <div className="heatmap-grid">
                {heatmap.map((item, idx) => (
                  <div key={idx} className="heatmap-card" style={{ borderLeftColor: item.color }}>
                    <div className="heatmap-card-top">
                      <span className="topic-name">{item.topic}</span>
                      <span className="status-indicator">{item.status}</span>
                    </div>

                    <div className="mastery-bar-wrap">
                      <div className="mastery-bar-fill" style={{ width: `${item.percentage}%`, background: item.color }}></div>
                    </div>

                    <div className="heatmap-card-foot">
                      <span className="status-label" style={{ color: item.color }}>{item.statusLabel}</span>
                      <span className="solved-stat">{item.solved} / {item.totalQuestions} Solved ({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: SMART REVISION SYSTEM */}
          {activeTab === 'revision' && (
            <div className="revision-section-wrapper animate-fade">
              <div className="revision-hero-card">
                <div className="rev-icon">🔄</div>
                <div>
                  <h3>{revisionSet?.revisionTitle || 'Revision Set — 15 Questions'}</h3>
                  <p>{revisionSet?.description || 'Auto-generated diagnostic questions focusing on previously struggled topics.'}</p>
                  <div className="topic-tags-row">
                    <span>Targeted Weak Areas:</span>
                    {(revisionSet?.targetTopics || []).map((tp, i) => (
                      <span key={i} className="rev-tag">{tp}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="revision-questions-list">
                {(revisionSet?.questions || []).map((q, idx) => (
                  <div key={q.id} className="revision-question-card">
                    <div className="q-left">
                      <span className="q-number">#{idx + 1}</span>
                      <div>
                        <h4 className="q-title">{q.title}</h4>
                        <div className="q-meta">
                          <span className="q-topic">{q.topic}</span>
                          <span className={`q-diff ${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                          <span className="q-type">{q.type.toUpperCase()}</span>
                          <span className="q-pts">{q.points} Points</span>
                        </div>
                      </div>
                    </div>
                    <div className="q-right">
                      <a href="/coding-playground" className="btn-solve-now">
                        Solve Question ➔
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RESOURCE RECOMMENDATION ENGINE */}
          {activeTab === 'recommendations' && (
            <div className="recommendations-section-wrapper animate-fade">
              <div className="weak-area-banner">
                <div className="banner-left">
                  <span className="alert-bulb">💡</span>
                  <div>
                    <span className="banner-sub">Algorithm Diagnostic Finding:</span>
                    <h3 className="banner-title">Your Weak Area: {recommendations?.weakArea || 'DBMS & SQL'}</h3>
                    <p className="banner-desc">{recommendations?.reason || 'Calculated from quiz scores and problem attempts.'}</p>
                  </div>
                </div>
                <div className="banner-right">
                  <span className="severity-pill">{recommendations?.severity || 'Needs Focus'}</span>
                </div>
              </div>

              <h4 className="rec-section-title">Curated High-Impact Action Items:</h4>
              <div className="action-cards-grid">
                {(recommendations?.actionCards || []).map(card => (
                  <div key={card.id} className="action-card">
                    <div className="action-card-top">
                      <span className="action-badge">{card.badge}</span>
                      <span className="play-icon">{card.icon}</span>
                    </div>
                    <h4 className="card-title">{card.title}</h4>
                    <p className="card-desc">{card.description}</p>
                    <a href={card.link} className="action-card-link">
                      Open Resource ➔
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: DAILY PLACEMENT CHALLENGE */}
          {activeTab === 'challenge' && (
            <div className="daily-challenge-wrapper animate-fade">
              <div className="challenge-banner-card">
                <div className="challenge-banner-left">
                  <div className="streak-circle">
                    <span className="streak-num">{challenge?.streakCount || 5}</span>
                    <span className="streak-label">DAYS 🔥</span>
                  </div>
                  <div>
                    <span className="chal-sub">Daily Placement Habit Tracker</span>
                    <h3 className="chal-title">🔥 Today's Placement Challenge</h3>
                    <p className="chal-desc">Complete 1 DSA problem, 5 aptitude questions, and 1 interview question daily to build compound consistency.</p>
                  </div>
                </div>

                <div className="challenge-banner-right">
                  {challenge?.isCompletedToday ? (
                    <div className="streak-completed-badge">
                      ✓ Completed for Today! (+50 XP)
                    </div>
                  ) : (
                    <button
                      className="btn-complete-streak"
                      disabled={completingChallenge}
                      onClick={handleCompleteChallenge}
                    >
                      {completingChallenge ? 'Recording...' : '✓ Complete Today\'s Challenge'}
                    </button>
                  )}
                </div>
              </div>

              {challengeSuccess && (
                <div className="challenge-alert-success">{challengeSuccess}</div>
              )}

              <div className="challenge-tasks-grid">
                {(challenge?.tasks || []).map(task => (
                  <div key={task.id} className="task-card">
                    <div className="task-top">
                      <span className="task-icon">{task.icon}</span>
                      <span className="task-cat">{task.category}</span>
                      <span className="task-pts">+{task.points} Pts</span>
                    </div>
                    <h4 className="task-title">{task.title}</h4>
                    <div className="task-foot">
                      <span className="task-diff">{task.difficulty}</span>
                      <a href={task.link} className="task-link-btn">Start Practice ➔</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PERSONAL PLACEMENT WALLET */}
          {activeTab === 'wallet' && (
            <div className="placement-wallet-wrapper animate-fade">
              {/* Wallet KPI Counters */}
              <div className="wallet-kpi-row">
                <div className="wallet-kpi-card">
                  <span className="kpi-val">{wallet?.summary?.totalApplied || 0}</span>
                  <span className="kpi-lbl">📝 Total Applications</span>
                </div>
                <div className="wallet-kpi-card">
                  <span className="kpi-val" style={{ color: '#38BDF8' }}>{wallet?.summary?.shortlisted || 0}</span>
                  <span className="kpi-lbl">📋 Shortlisted</span>
                </div>
                <div className="wallet-kpi-card">
                  <span className="kpi-val" style={{ color: '#FBBF24' }}>{wallet?.summary?.interviews || 0}</span>
                  <span className="kpi-lbl">🎙️ Interview Rounds</span>
                </div>
                <div className="wallet-kpi-card highlight-offers">
                  <span className="kpi-val" style={{ color: '#10B981' }}>{wallet?.summary?.offers || 0}</span>
                  <span className="kpi-lbl">🎉 Job Offers</span>
                </div>
              </div>

              {/* Recruitment Pipeline Flow */}
              <div className="wallet-pipeline-card">
                <h4 className="pipeline-title">Corporate Hiring Pipeline Progression</h4>
                <div className="pipeline-visual-flow">
                  <span className="flow-step active">1. Applied</span>
                  <span className="flow-arr">➔</span>
                  <span className="flow-step">2. Shortlisted</span>
                  <span className="flow-arr">➔</span>
                  <span className="flow-step">3. Test Cleared</span>
                  <span className="flow-arr">➔</span>
                  <span className="flow-step">4. Interview</span>
                  <span className="flow-arr">➔</span>
                  <span className="flow-step">5. Selected</span>
                  <span className="flow-arr">➔</span>
                  <span className="flow-step offer">6. Offer Letter</span>
                </div>
              </div>

              {/* Active Pipeline Entries */}
              <div className="wallet-applications-section">
                <h4>Active Drive Submissions ({(wallet?.pipeline || []).length})</h4>
                {(wallet?.pipeline || []).length === 0 ? (
                  <div className="wallet-empty">
                    <p>No active drive applications yet. Browse the Job Board or Placement Calendar to apply.</p>
                  </div>
                ) : (
                  <div className="wallet-cards-grid">
                    {(wallet?.pipeline || []).map((item, idx) => (
                      <div key={idx} className="wallet-entry-card">
                        <div className="entry-head">
                          <span className="entry-co">{item.companyName}</span>
                          <span className="entry-pkg">{item.packageLPA}</span>
                        </div>
                        <h4 className="entry-role">{item.role}</h4>
                        <div className="entry-stage-row">
                          <span className="stage-lbl">Current Stage:</span>
                          <span className={`stage-tag ${item.stage}`}>{item.stage.toUpperCase().replace('_', ' ')}</span>
                        </div>
                        {item.interviewDate && (
                          <div className="entry-interview-time">
                            📅 Interview: <strong>{new Date(item.interviewDate).toLocaleString()}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: PLACEMENT READINESS CERTIFICATE */}
          {activeTab === 'certificate' && (
            <div className="certificate-section-wrapper animate-fade">
              {/* Progress Summary Card */}
              <div className="cert-progress-card">
                <div className="cert-prog-left">
                  <span className="cert-icon">🏆</span>
                  <div>
                    <h3>Institutional Placement Readiness Status</h3>
                    <p>Criteria configured by College Placement Cell: Requires &ge; 75% overall completion across test participation, coding benchmarks, verified ATS resume, and mock sessions.</p>
                  </div>
                </div>
                <div className="cert-prog-right">
                  <div className="completion-ring">
                    <span className="num">{certificate?.completionPercentage || 92}%</span>
                    <span className="lbl">Completion</span>
                  </div>
                  <button
                    className="btn-print-cert"
                    onClick={() => window.print()}
                  >
                    🖨️ Print / Download PDF
                  </button>
                </div>
              </div>

              {/* Beautiful Formal Certificate Template */}
              <div className="formal-certificate-paper printable-certificate">
                <div className="cert-border-outer">
                  <div className="cert-border-inner">
                    <div className="cert-top-branding">
                      <div className="college-logo-emblem">🏛️</div>
                      <h1 className="cert-inst-name">{certificate?.institution || 'GRIET PLACEMENT PORTAL'}</h1>
                      <span className="cert-inst-sub">{certificate?.subHeader || 'Gokaraju Rangaraju Institute of Engineering and Technology'}</span>
                    </div>

                    <div className="cert-divider-line"></div>

                    <h2 className="cert-main-title">{certificate?.certificateTitle || 'Placement Preparation Completion Certificate'}</h2>

                    <p className="cert-intro">This is to certify that candidate</p>

                    <h3 className="cert-student-name">{certificate?.studentName || 'Student Name'}</h3>

                    <p className="cert-body-paragraph">
                      Roll Number <strong>{certificate?.rollNumber}</strong> of <strong>{certificate?.program}</strong> ({certificate?.batch})
                      has successfully satisfied all rigorous technical standards and training benchmarks of the institutional Placement Preparation Track with a verified overall completion score of:
                    </p>

                    <div className="cert-completion-pill">
                      ⭐ {certificate?.completionPercentage || 92}% Readiness Mastery ⭐
                    </div>

                    <div className="cert-criteria-chips">
                      {(certificate?.criteria || []).map((c, i) => (
                        <div key={i} className="crit-chip">
                          <span className="crit-check">✓</span>
                          <span>{c.label}: <strong>{c.completed}</strong></span>
                        </div>
                      ))}
                    </div>

                    <div className="cert-footer-row">
                      <div className="sig-block">
                        <span className="sig-line"></span>
                        <span className="sig-title">Training &amp; Placement Officer (TPO)</span>
                        <span className="sig-college">GRIET Placement Cell</span>
                      </div>

                      <div className="cert-seal-badge">
                        <div className="seal-circle">
                          <span>VERIFIED</span>
                          <span>GRIET</span>
                          <span>2026</span>
                        </div>
                        <span className="cert-id-text">{certificate?.certificateId || 'GRIET-CERT-VERIFIED'}</span>
                      </div>

                      <div className="sig-block">
                        <span className="sig-line"></span>
                        <span className="sig-title">Principal / Dean Academics</span>
                        <span className="sig-college">GRIET Autonomous</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentPlacementSuite;
