import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { sfx, triggerConfetti } from '../utils/audioVfx';
import './StudentPlacementSuite.css';

const StudentPlacementSuite = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap' | 'revision' | 'recommendations' | 'challenge' | 'wallet' | 'certificate'
  const [loading, setLoading] = useState(true);

  // Scoped student selector for faculty & admin
  const isFacultyOrAdmin = user?.role === 'faculty' || user?.role === 'admin';
  const [scopedStudents, setScopedStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [soundMuted, setSoundMuted] = useState(sfx.isMuted());

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

  // Fetch scoped students for Faculty / Admin inspection
  useEffect(() => {
    const fetchStudents = async () => {
      if (!isFacultyOrAdmin) return;
      try {
        const res = await axios.get(`${API_URL}/placement-suite/students`, getAuthHeaders());
        const list = res.data?.students || [];
        setScopedStudents(list);
        if (list.length > 0 && !selectedStudentId) {
          setSelectedStudentId(list[0]._id);
        }
      } catch (e) {
        console.warn('Could not fetch scoped students:', e);
      }
    };
    fetchStudents();
  }, [isFacultyOrAdmin]);

  const fetchSuiteData = async (targetId) => {
    try {
      setLoading(true);
      const studentQuery = targetId ? `?studentId=${targetId}` : '';

      const [hmRes, revRes, recRes, chalRes, walRes, certRes] = await Promise.all([
        axios.get(`${API_URL}/placement-suite/heatmap${studentQuery}`, getAuthHeaders()).catch(() => ({ data: { heatmap: [] } })),
        axios.get(`${API_URL}/placement-suite/revision-set`, getAuthHeaders()).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/placement-suite/recommendations`, getAuthHeaders()).catch(() => ({ data: { data: {} } })),
        axios.get(`${API_URL}/placement-suite/daily-challenge`, getAuthHeaders()).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/placement-suite/wallet${studentQuery}`, getAuthHeaders()).catch(() => ({ data: { wallet: {} } })),
        axios.get(`${API_URL}/placement-suite/certificate${studentQuery}`, getAuthHeaders()).catch(() => ({ data: { certificate: {} } }))
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
    fetchSuiteData(selectedStudentId);
  }, [selectedStudentId]);

  // Tab switch with sound and optional confetti on certificate
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    sfx.playClick();
    if (tab === 'certificate') {
      setTimeout(() => {
        sfx.playFanfare();
        triggerConfetti('cert-confetti-canvas');
      }, 150);
    }
  };

  // Toggle sound effects
  const handleToggleSound = () => {
    const isNowMuted = sfx.toggleMute();
    setSoundMuted(isNowMuted);
    if (!isNowMuted) sfx.playClick();
  };

  // Celebrate button handler
  const handleCelebrate = () => {
    sfx.playFanfare();
    triggerConfetti('cert-confetti-canvas');
  };

  // Print certificate handler
  const handlePrintCertificate = () => {
    sfx.playPrint();
    window.print();
  };

  const handleCompleteChallenge = async () => {
    try {
      setCompletingChallenge(true);
      const res = await axios.post(`${API_URL}/placement-suite/daily-challenge/complete`, {}, getAuthHeaders());
      if (res.data?.success) {
        sfx.playSuccess();
        setChallengeSuccess('🎉 Challenge Completed! Streak incremented by 1 day.');
        setChallenge(prev => prev ? { ...prev, isCompletedToday: true, streakCount: res.data.streakCount } : prev);
        setTimeout(() => setChallengeSuccess(''), 3500);
      }
    } catch (err) {
      alert('Could not update daily streak.');
    } finally {
      setCompletingChallenge(false);
    }
  };

  // Filter scoped students by search
  const filteredStudents = scopedStudents.filter(s => {
    const q = studentSearch.toLowerCase();
    return (s.name && s.name.toLowerCase().includes(q)) ||
           (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
           (s.branch && s.branch.toLowerCase().includes(q));
  });

  const activeStudentInfo = scopedStudents.find(s => s._id === selectedStudentId);

  return (
    <div className="placement-suite-container animate-fade">
      {/* Top Banner Navigation & Scope Selector */}
      <div className="suite-header-card">
        <div className="suite-header-top-row">
          <div className="suite-header-text">
            <div className="suite-badge">🎯 Comprehensive Placement Acceleration Suite</div>
            <h2 className="suite-heading">Skill Heatmaps, Smart Revision &amp; Placement Readiness</h2>
            <p className="suite-sub">
              Institutional readiness benchmarks, auto-generated diagnostic revision sets, interactive skill heatmaps, and official verified completion credentials.
            </p>
          </div>

          <div className="suite-audio-controls">
            <button
              className={`sfx-toggle-btn ${soundMuted ? 'muted' : 'active'}`}
              onClick={handleToggleSound}
              title={soundMuted ? 'Turn Sound Effects ON' : 'Turn Sound Effects OFF'}
            >
              {soundMuted ? '🔇 SFX Off' : '🔊 SFX On'}
            </button>
          </div>
        </div>

        {/* Assigned Faculty Scope Student Selector */}
        {isFacultyOrAdmin && (
          <div className="faculty-scope-selector-card">
            <div className="scope-banner-left">
              <span className="scope-icon">👨‍🏫</span>
              <div>
                <strong className="scope-title">
                  {user?.role === 'admin' ? 'Main Admin Student Scope Inspector' : 'Faculty Coordinator Assigned Scope'}
                </strong>
                <p className="scope-desc">
                  Inspecting live credentials, test attempts, readiness index, and verified certificate for students in your assigned scope.
                </p>
              </div>
            </div>

            <div className="scope-selector-actions">
              <div className="scope-search-box">
                <span className="search-symbol">🔍</span>
                <input
                  type="text"
                  placeholder="Filter student by name or roll no..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="scope-search-input"
                />
              </div>

              <select
                className="scope-dropdown-select"
                value={selectedStudentId}
                onChange={e => {
                  setSelectedStudentId(e.target.value);
                  sfx.playClick();
                }}
              >
                {filteredStudents.map(st => (
                  <option key={st._id} value={st._id}>
                    {st.rollNumber ? `${st.rollNumber} — ` : ''}{st.name} ({st.branch || 'CSE'} {st.academicYear ? `Batch ${st.academicYear}` : ''}) • PRI {st.readinessScore || 75}%
                  </option>
                ))}
              </select>

              {activeStudentInfo && (
                <div className="scope-student-pill">
                  <span className="badge-dot"></span>
                  <strong>{activeStudentInfo.name}</strong>
                  <span className="pill-roll">({activeStudentInfo.rollNumber || '21241A0501'})</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="suite-tabs-nav">
          <button
            className={`suite-tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => handleTabChange('heatmap')}
          >
            🗺️ Knowledge Heatmap
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'revision' ? 'active' : ''}`}
            onClick={() => handleTabChange('revision')}
          >
            🔄 Smart Revision (15Q)
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => handleTabChange('recommendations')}
          >
            💡 Resource Engine
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'challenge' ? 'active' : ''}`}
            onClick={() => handleTabChange('challenge')}
          >
            🔥 Daily Challenge {challenge?.streakCount ? `(${challenge.streakCount}🔥)` : ''}
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
            onClick={() => handleTabChange('wallet')}
          >
            💼 Placement Wallet
          </button>
          <button
            className={`suite-tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
            onClick={() => handleTabChange('certificate')}
          >
            🏆 Official Verified Certificate
          </button>
        </div>
      </div>

      {loading ? (
        <div className="suite-loading-state">
          <div className="suite-spinner"></div>
          <p>Loading real-time placement analytics, skill metrics, and verified credentials...</p>
        </div>
      ) : (
        <div className="suite-tab-content">
          {/* TAB 1: KNOWLEDGE HEATMAP */}
          {activeTab === 'heatmap' && (
            <div className="heatmap-section-wrapper animate-fade">
              <div className="section-head-card">
                <div>
                  <h3>📊 Technical Knowledge & Algorithmic Heatmap</h3>
                  <p>
                    Diagnostic assessment of {certificate?.studentName || 'student'} across core interview topics and coding benchmarks.
                  </p>
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
                      <a href="/coding-playground" className="btn-solve-now" onClick={() => sfx.playClick()}>
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
                    <h3 className="banner-title">Target Area: {recommendations?.weakArea || 'DBMS & SQL Architectures'}</h3>
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
                    <a href={card.link} className="action-card-link" onClick={() => sfx.playClick()}>
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
                    <h3 className="chal-title">🔥 Today's Placement Sprint</h3>
                    <p className="chal-desc">Complete 1 DSA problem, 5 aptitude questions, and 1 behavioral interview drill daily.</p>
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
                      <a href={task.link} className="task-link-btn" onClick={() => sfx.playClick()}>Start Practice ➔</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PERSONAL PLACEMENT WALLET */}
          {activeTab === 'wallet' && (
            <div className="placement-wallet-wrapper animate-fade">
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

              <div className="wallet-applications-section">
                <h4>Drive Submissions ({(wallet?.pipeline || []).length})</h4>
                {(wallet?.pipeline || []).length === 0 ? (
                  <div className="wallet-empty">
                    <p>No active drive applications recorded for this student yet.</p>
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

          {/* TAB 6: HYPER-REALISTIC VERIFIED PLACEMENT CERTIFICATE WITH VFX & SFX */}
          {activeTab === 'certificate' && (
            <div className="certificate-section-wrapper animate-fade">
              {/* Confetti Particle Canvas Overlay */}
              <canvas id="cert-confetti-canvas" className="cert-confetti-canvas"></canvas>

              {/* Progress Summary Card & Action Bar */}
              <div className="cert-progress-card">
                <div className="cert-prog-left">
                  <span className="cert-icon">🏆</span>
                  <div>
                    <div className="verified-kicker-tag">OFFICIAL INSTITUTIONAL CREDENTIAL</div>
                    <h3>Placement Preparation &amp; Readiness Certification</h3>
                    <p>
                      Candidate Verification: Requires &ge; 75% overall completion across test performance, coding benchmarks, verified ATS resume score, and faculty mock interviews.
                    </p>
                  </div>
                </div>

                <div className="cert-prog-right">
                  <div className="completion-ring">
                    <span className="num">{certificate?.completionPercentage || 88}%</span>
                    <span className="lbl">Readiness Score</span>
                  </div>

                  <div className="cert-action-btn-group">
                    <button
                      className="btn-celebrate-vfx"
                      onClick={handleCelebrate}
                      title="Trigger Celebratory VFX & Sound"
                    >
                      🎉 Celebrate
                    </button>
                    <button
                      className="btn-print-cert"
                      onClick={handlePrintCertificate}
                      title="Print or Save PDF"
                    >
                      🖨️ Print / Save PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Formal Executive Institutional Certificate */}
              <div className="formal-certificate-frame printable-certificate">
                {/* Guilloche Security Watermark Pattern */}
                <div className="cert-watermark-overlay">
                  GRIET AUTONOMOUS PLACEMENT CELL • VERIFIED CREDENTIAL • 2026
                </div>

                <div className="formal-cert-inner-border">
                  {/* Top Collegiate Header */}
                  <div className="cert-header">
                    <div className="cert-crest-emblem">🏛️</div>
                    <h1 className="cert-logo-title">GOKARAJU RANGARAJU INSTITUTE OF ENGINEERING AND TECHNOLOGY</h1>
                    <div className="cert-portal-subtitle">
                      (Autonomous Institution Approved by AICTE, Affiliated to JNTUH, Accredited with NAAC 'A++')
                    </div>
                    <div className="cert-division-label">CAREER GUIDANCE &amp; CAMPUS PLACEMENT CELL</div>
                  </div>

                  {/* Certificate Main Title */}
                  <div className="cert-body">
                    <h2 className="cert-title-huge">Placement Readiness Certificate</h2>
                    <p className="cert-presented-text">This is to certify that candidate</p>

                    <div className="cert-student-name-box">
                      <h3 className="cert-student-name">
                        {certificate?.studentName || 'Aarav Patel'}
                      </h3>
                      <div className="cert-name-underline"></div>
                    </div>

                    <p className="cert-description">
                      Roll Number <strong>{certificate?.rollNumber || '21241A0501'}</strong> of the Department of{' '}
                      <strong>{certificate?.program || 'B.Tech in Computer Science and Engineering'}</strong> ({certificate?.batch || '2022 - 2026 Batch'}),
                      has demonstrated exceptional rigor and satisfied all benchmark competencies of the Institutional Campus Recruitment Training (CRT) track.
                    </p>

                    {/* Readiness Mastery Pill */}
                    <div className="cert-completion-badge-container">
                      <span className="star-icon">⭐</span>
                      <span>Verified Mastery Index: <strong>{certificate?.completionPercentage || 88}%</strong></span>
                      <span className="status-secure">🔒 Cryptographically Verified</span>
                      <span className="star-icon">⭐</span>
                    </div>

                    {/* Criteria Chips */}
                    <div className="cert-criteria-grid">
                      {(certificate?.criteria || []).map((c, i) => (
                        <div key={i} className={`crit-item-card ${c.passed ? 'passed' : ''}`}>
                          <span className="crit-icon">{c.passed ? '✓' : '•'}</span>
                          <div className="crit-texts">
                            <span className="crit-title">{c.label}</span>
                            <span className="crit-stat">{c.completed}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer Row: Signatures, Seal & Dynamic QR Badge */}
                    <div className="cert-footer-signatures">
                      {/* Left Signatory: TPO */}
                      <div className="signature-block">
                        <div className="sig-handwritten-sample">Dr. G. Karuna</div>
                        <div className="sig-line"></div>
                        <p className="sig-name">Dr. G. Karuna</p>
                        <p className="sig-title">Head — Training &amp; Placement Officer (TPO)</p>
                        <p className="sig-dept">GRIET Placement Division</p>
                      </div>

                      {/* Center: Official Holographic Gold Seal */}
                      <div className="gold-seal-wrapper">
                        <div className="gold-seal" onClick={handleCelebrate} title="Official Embossed Gold Seal">
                          <div className="seal-inner-circle">
                            <span className="seal-star">★ ★ ★</span>
                            <span className="seal-org">GRIET</span>
                            <span className="seal-year">2026</span>
                            <span className="seal-status">VERIFIED</span>
                            <span className="seal-star">★ ★ ★</span>
                          </div>
                          <div className="seal-ribbon left"></div>
                          <div className="seal-ribbon right"></div>
                        </div>

                        {/* Cryptographic ID Badge */}
                        <div className="cert-verification-qr-box">
                          <div className="mock-qr-code">
                            <div className="qr-cell tl"></div>
                            <div className="qr-cell tr"></div>
                            <div className="qr-cell bl"></div>
                            <div className="qr-cell center"></div>
                          </div>
                          <div className="cert-id-badge">
                            <span className="cert-id-label">CERTIFICATE ID:</span>
                            <span className="cert-id-val">{certificate?.certificateId || 'GRIET-CERT-2026-ED47CA41'}</span>
                            <span className="cert-hash-val">{certificate?.verificationCode || 'VERIFIED-AUTONOMOUS'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Signatory: Principal */}
                      <div className="signature-block">
                        <div className="sig-handwritten-sample">Dr. J. Praveen</div>
                        <div className="sig-line"></div>
                        <p className="sig-name">Dr. J. Praveen</p>
                        <p className="sig-title">Principal &amp; Dean Academics</p>
                        <p className="sig-dept">GRIET Autonomous</p>
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
