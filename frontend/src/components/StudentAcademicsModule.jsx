import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import './StudentAcademicsModule.css';

const GRADE_SCALE = [
  { range: '90 - 100', grade: 'O', point: 10, label: 'Outstanding', color: '#10B981' },
  { range: '80 - 89', grade: 'A+', point: 9, label: 'Excellent', color: '#34D399' },
  { range: '70 - 79', grade: 'A', point: 8, label: 'Very Good', color: '#38BDF8' },
  { range: '60 - 69', grade: 'B+', point: 7, label: 'Good', color: '#818CF8' },
  { range: '50 - 59', grade: 'B', point: 6, label: 'Above Average', color: '#FBBF24' },
  { range: '40 - 49', grade: 'C', point: 5, label: 'Pass', color: '#FB923C' },
  { range: '< 40', grade: 'F', point: 0, label: 'Fail / Arrear', color: '#EF4444' }
];

const StudentAcademicsModule = ({ targetStudentId, isEmbedded = false }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [record, setRecord] = useState(null);
  const [selectedSem, setSelectedSem] = useState(1);
  const [activeSubTab, setActiveSubTab] = useState('grades'); // 'grades' | 'simulator' | 'target-solver' | 'quick-sgpa'

  // Simulator state: hypothetical SGPAs for Sem 1-8
  const [simulatedSgpas, setSimulatedSgpas] = useState(Array(8).fill(0));
  const [simulatedCredits, setSimulatedCredits] = useState(Array(8).fill(20));

  // Target CGPA solver state
  const [targetCgpa, setTargetCgpa] = useState(8.5);

  // Quick single semester calculator subjects
  const [quickSubjects, setQuickSubjects] = useState([
    { name: 'Subject 1', credits: 4, marks: 85 },
    { name: 'Subject 2', credits: 4, marks: 78 },
    { name: 'Subject 3', credits: 3, marks: 92 },
    { name: 'Subject 4', credits: 3, marks: 68 },
    { name: 'Subject 5', credits: 1.5, marks: 88 },
    { name: 'Subject 6', credits: 1.5, marks: 94 }
  ]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
  });

  const fetchRecord = async () => {
    try {
      setLoading(true);
      setError('');
      const endpoint = targetStudentId
        ? `${API_URL}/academics/student/${targetStudentId}`
        : `${API_URL}/academics/my-record`;

      const res = await axios.get(endpoint, getAuthHeaders());
      if (res.data?.success) {
        const data = res.data.data;
        setRecord(data);

        // Pre-fill simulator with real SGPAs
        const initialSgpas = Array(8).fill(0);
        const initialCredits = Array(8).fill(20);
        (data.semesters || []).forEach(s => {
          const idx = s.semester - 1;
          if (idx >= 0 && idx < 8) {
            initialSgpas[idx] = s.sgpa || 0;
            if (s.totalCredits > 0) initialCredits[idx] = s.totalCredits;
          }
        });
        setSimulatedSgpas(initialSgpas);
        setSimulatedCredits(initialCredits);

        // Auto select latest completed semester or Sem 1
        const activeSem = (data.semesters || []).filter(s => s.sgpa > 0).pop();
        if (activeSem) setSelectedSem(activeSem.semester);
      }
    } catch (err) {
      console.error('Failed to load academic record:', err);
      setError(err.response?.data?.error || 'Could not load verified academic records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [targetStudentId]);

  // Overall CGPA calculation logic
  const calculateGradeFromMarks = (marks) => {
    const m = Math.min(100, Math.max(0, Math.round(Number(marks) || 0)));
    if (m >= 90) return { grade: 'O', point: 10, color: '#10B981' };
    if (m >= 80) return { grade: 'A+', point: 9, color: '#34D399' };
    if (m >= 70) return { grade: 'A', point: 8, color: '#38BDF8' };
    if (m >= 60) return { grade: 'B+', point: 7, color: '#818CF8' };
    if (m >= 50) return { grade: 'B', point: 6, color: '#FBBF24' };
    if (m >= 40) return { grade: 'C', point: 5, color: '#FB923C' };
    return { grade: 'F', point: 0, color: '#EF4444' };
  };

  // Live quick SGPA calculation
  const quickSgpaStats = useMemo(() => {
    let totalCredits = 0;
    let totalPoints = 0;
    quickSubjects.forEach(s => {
      const c = Number(s.credits) || 0;
      const { point } = calculateGradeFromMarks(s.marks);
      totalCredits += c;
      totalPoints += (c * point);
    });
    const sgpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;
    return { sgpa, totalCredits, totalPoints };
  }, [quickSubjects]);

  // Live simulated CGPA
  const simulatedCgpaStats = useMemo(() => {
    let totalPoints = 0;
    let totalCredits = 0;
    let activeSems = 0;

    simulatedSgpas.forEach((sgpa, idx) => {
      const s = Number(sgpa) || 0;
      const c = Number(simulatedCredits[idx]) || 20;
      if (s > 0) {
        totalPoints += (s * c);
        totalCredits += c;
        activeSems += 1;
      }
    });

    const cgpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;
    return { cgpa, totalCredits, activeSems };
  }, [simulatedSgpas, simulatedCredits]);

  // Target CGPA solver calculation
  const targetSolverStats = useMemo(() => {
    if (!record?.semesters) return { requiredSgpa: 0, possible: true, remainingSems: 0 };

    const completedSems = (record.semesters || []).filter(s => s.sgpa > 0);
    const completedCount = completedSems.length;
    const remainingCount = Math.max(0, 8 - completedCount);

    if (remainingCount === 0) {
      return { requiredSgpa: 0, possible: false, remainingSems: 0, message: 'All 8 semesters completed.' };
    }

    let currentPoints = 0;
    let currentCredits = 0;
    completedSems.forEach(s => {
      const c = s.totalCredits || 20;
      currentPoints += (s.sgpa * c);
      currentCredits += c;
    });

    const futureCredits = remainingCount * 20;
    const totalCredits = currentCredits + futureCredits;
    const requiredTotalPoints = targetCgpa * totalCredits;
    const neededFuturePoints = requiredTotalPoints - currentPoints;
    const neededAverageSgpa = Number((neededFuturePoints / futureCredits).toFixed(2));

    const possible = neededAverageSgpa <= 10.0 && neededAverageSgpa >= 0;

    return {
      completedCount,
      remainingCount,
      currentCredits,
      futureCredits,
      neededAverageSgpa,
      possible
    };
  }, [record, targetCgpa]);

  const currentSemRecord = useMemo(() => {
    if (!record?.semesters) return null;
    return record.semesters.find(s => s.semester === selectedSem) || {
      semester: selectedSem,
      subjects: [],
      sgpa: 0,
      totalCredits: 0
    };
  }, [record, selectedSem]);

  const getHonorsClassification = (cgpa) => {
    const val = Number(cgpa) || 0;
    if (val >= 8.5) return { title: 'First Class with Distinction (Honors)', badge: '🏆 Distinction', color: '#10B981' };
    if (val >= 7.5) return { title: 'First Class with Distinction', badge: '⭐ First Class', color: '#38BDF8' };
    if (val >= 6.5) return { title: 'First Class', badge: '✓ First Class', color: '#818CF8' };
    if (val >= 5.5) return { title: 'Second Class', badge: 'Second Class', color: '#FBBF24' };
    if (val >= 4.0) return { title: 'Pass Division', badge: 'Pass', color: '#FB923C' };
    return { title: 'Academic Progress Required', badge: 'Arrears Flag', color: '#EF4444' };
  };

  const honors = getHonorsClassification(record?.overallCgpa || 0);

  if (loading) {
    return (
      <div className="academics-loading-box">
        <div className="spinner-loader"></div>
        <p>Loading verified academic grades &amp; CGPA telemetry...</p>
      </div>
    );
  }

  return (
    <div className={`academics-module-root ${isEmbedded ? 'embedded' : ''}`}>
      {error && (
        <div className="academics-error-alert animate-fade">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* ── 1. Executive CGPA Dashboard Banner ── */}
      <div className="academics-hero-card glass-card">
        <div className="hero-left-stats">
          <div className="cgpa-ring-wrapper">
            <div className="cgpa-ring" style={{ borderColor: honors.color }}>
              <span className="cgpa-number">{(record?.overallCgpa || 0).toFixed(2)}</span>
              <span className="cgpa-sub">CGPA</span>
            </div>
          </div>
          <div className="hero-title-group">
            <div className="hero-badge-strip">
              <span className="honors-pill" style={{ background: `${honors.color}22`, color: honors.color, borderColor: `${honors.color}55` }}>
                {honors.badge}
              </span>
              <span className="auto-calc-tag">
                ⚡ Auto-Calculated by Campus Bridge Engine
              </span>
            </div>
            <h2 className="hero-student-name">
              {record?.studentName || user?.name}
              {record?.studentRollNumber && <span className="roll-chip">{record.studentRollNumber}</span>}
            </h2>
            <p className="hero-subtext">
              Department of {record?.branch || user?.branch || 'Engineering'} • {honors.title}
            </p>
          </div>
        </div>

        <div className="hero-metrics-strip">
          <div className="metric-cell">
            <span className="metric-lbl">Total Credits</span>
            <strong className="metric-val">{record?.totalCreditsEarned || 0}</strong>
            <small className="metric-hint">Degree Total</small>
          </div>
          <div className="metric-cell">
            <span className="metric-lbl">Active Arrears</span>
            <strong className="metric-val" style={{ color: (record?.totalArrears || 0) > 0 ? '#EF4444' : '#10B981' }}>
              {record?.totalArrears || 0}
            </strong>
            <small className="metric-hint">Backlogs</small>
          </div>
          <div className="metric-cell">
            <span className="metric-lbl">Completed Sems</span>
            <strong className="metric-val">
              {(record?.semesters || []).filter(s => s.sgpa > 0).length} / 8
            </strong>
            <small className="metric-hint">Evaluated</small>
          </div>
        </div>
      </div>

      {/* ── 2. Navigation Tabs (Grades View / Live CGPA Simulator / Target Solver) ── */}
      <div className="academics-nav-tabs">
        <button
          type="button"
          className={`academics-nav-btn ${activeSubTab === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('grades')}
        >
          📜 Semester Grades &amp; Marks
        </button>
        <button
          type="button"
          className={`academics-nav-btn ${activeSubTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('simulator')}
        >
          🔮 Live CGPA Simulator &amp; Projections
        </button>
        <button
          type="button"
          className={`academics-nav-btn ${activeSubTab === 'target-solver' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('target-solver')}
        >
          🎯 Target CGPA Planner
        </button>
        <button
          type="button"
          className={`academics-nav-btn ${activeSubTab === 'quick-sgpa' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('quick-sgpa')}
        >
          🧮 Single Sem SGPA Calculator
        </button>
      </div>

      {/* ── TAB 1: SEMESTER GRADES & SUBJECT MARKS ── */}
      {activeSubTab === 'grades' && (
        <div className="grades-view-section animate-fade">
          {/* Semester Selector Pill Bar */}
          <div className="semester-pill-bar">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
              const semData = (record?.semesters || []).find(s => s.semester === sem);
              const hasData = semData && semData.sgpa > 0;
              const isSelected = selectedSem === sem;

              return (
                <button
                  key={sem}
                  type="button"
                  className={`sem-pill ${isSelected ? 'active' : ''} ${hasData ? 'completed' : 'empty'}`}
                  onClick={() => setSelectedSem(sem)}
                >
                  <span className="sem-pill-title">Sem {sem}</span>
                  <span className="sem-pill-score">
                    {hasData ? `${semData.sgpa} SGPA` : 'Pending'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Semester Detail Card */}
          <div className="sem-detail-card glass-card">
            <div className="sem-detail-header">
              <div>
                <h3 className="sem-detail-title">
                  Semester {selectedSem} Academic Record
                </h3>
                <span className="sem-detail-subtitle">
                  {currentSemRecord?.evaluatorName ? `Evaluated by ${currentSemRecord.evaluatorName}` : 'Official Academic Marks & Credits Evaluation'}
                </span>
              </div>
              <div className="sem-quick-scores">
                <div className="score-pill-item">
                  <span className="lbl">Semester SGPA:</span>
                  <strong className="val text-glow" style={{ color: '#38BDF8', fontSize: '1.25rem' }}>
                    {(currentSemRecord?.sgpa || 0).toFixed(2)}
                  </strong>
                </div>
                <div className="score-pill-item">
                  <span className="lbl">Total Credits:</span>
                  <strong className="val" style={{ color: '#F1F5F9', fontSize: '1.25rem' }}>
                    {currentSemRecord?.totalCredits || 0}
                  </strong>
                </div>
              </div>
            </div>

            {/* Subjects Table */}
            {currentSemRecord?.subjects && currentSemRecord.subjects.length > 0 ? (
              <div className="table-responsive">
                <table className="academics-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Subject Name</th>
                      <th>Code</th>
                      <th style={{ textAlign: 'center' }}>Credits</th>
                      <th style={{ textAlign: 'center' }}>Marks (100)</th>
                      <th style={{ textAlign: 'center' }}>Grade</th>
                      <th style={{ textAlign: 'center' }}>Grade Point</th>
                      <th style={{ textAlign: 'center' }}>Credit Pts (C × GP)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSemRecord.subjects.map((sub, idx) => {
                      const { color, label } = GRADE_SCALE.find(g => g.grade === sub.grade) || { color: '#94A3B8', label: 'Graded' };
                      const creditPoints = (sub.credits * sub.gradePoint).toFixed(1);

                      return (
                        <tr key={sub._id || idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>{sub.subjectName}</strong>
                          </td>
                          <td>
                            <span className="code-badge">{sub.subjectCode || '—'}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{sub.credits}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="marks-badge">{sub.marks}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="grade-badge" style={{ background: `${color}25`, color, borderColor: `${color}60` }}>
                              {sub.grade}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{sub.gradePoint}</td>
                          <td style={{ textAlign: 'center', color: '#38BDF8', fontWeight: '600' }}>
                            {creditPoints}
                          </td>
                          <td>
                            <span className={`status-pill ${sub.passed ? 'pass' : 'fail'}`}>
                              {sub.passed ? 'Passed' : 'Backlog'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Semester Totals:</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{currentSemRecord.totalCredits}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#38BDF8' }}>
                        {currentSemRecord.subjects.reduce((sum, s) => sum + (s.credits * s.gradePoint), 0).toFixed(1)}
                      </td>
                      <td>
                        <strong style={{ color: '#10B981' }}>{currentSemRecord.sgpa} SGPA</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="no-marks-state">
                <span className="state-icon">📝</span>
                <h4>Semester {selectedSem} Marks Pending Evaluation</h4>
                <p>
                  Your faculty has not published subject marks for Semester {selectedSem} yet.
                  Once entered, grades, grade points, SGPA, and overall CGPA will compute automatically.
                </p>
                {currentSemRecord?.sgpa > 0 && (
                  <div className="existing-sgpa-note">
                    Verified SGPA from Academic Profile: <strong>{currentSemRecord.sgpa}</strong>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reference UGC / JNTUH 10-Point Grade Key Strip */}
          <div className="grade-key-strip glass-card mt-20">
            <h4 className="key-strip-title">📖 Official 10-Point Academic Grading Matrix</h4>
            <div className="grade-key-grid">
              {GRADE_SCALE.map(g => (
                <div key={g.grade} className="key-item">
                  <span className="key-badge" style={{ background: `${g.color}25`, color: g.color, borderColor: `${g.color}50` }}>
                    {g.grade} ({g.point} Pts)
                  </span>
                  <span className="key-marks">{g.range}</span>
                  <span className="key-label">{g.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: LIVE CGPA SIMULATOR & PROJECTIONS ── */}
      {activeSubTab === 'simulator' && (
        <div className="simulator-view-section animate-fade">
          <div className="sim-header-card glass-card">
            <div>
              <h3>🔮 Interactive CGPA Simulator &amp; Projection Engine</h3>
              <p>
                Adjust or test hypothetical SGPAs for any semester. The Campus Bridge calculator
                recomputes your graduating CGPA in real time with credit-weighting!
              </p>
            </div>
            <div className="sim-result-box">
              <span className="sim-lbl">Projected Overall CGPA</span>
              <strong className="sim-val text-glow" style={{ color: '#38BDF8' }}>
                {simulatedCgpaStats.cgpa.toFixed(2)}
              </strong>
              <small className="sim-sub">
                Across {simulatedCgpaStats.activeSems} Semesters ({simulatedCgpaStats.totalCredits} Credits)
              </small>
            </div>
          </div>

          <div className="sim-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
              const currentVal = simulatedSgpas[sem - 1] || 0;
              const originalSem = (record?.semesters || []).find(s => s.semester === sem);
              const isLockedOfficial = originalSem && originalSem.sgpa > 0;

              return (
                <div key={sem} className={`sim-sem-card glass-card ${isLockedOfficial ? 'is-official' : ''}`}>
                  <div className="sim-sem-header">
                    <div>
                      <span className="sim-sem-title">Semester {sem}</span>
                      {isLockedOfficial && <span className="official-tag">Verified</span>}
                    </div>
                    <strong className="sim-sgpa-display" style={{ color: currentVal >= 8 ? '#10B981' : currentVal >= 6 ? '#38BDF8' : '#FBBF24' }}>
                      {Number(currentVal).toFixed(2)} SGPA
                    </strong>
                  </div>

                  <div className="slider-group">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.05"
                      value={currentVal}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSimulatedSgpas(prev => {
                          const copy = [...prev];
                          copy[sem - 1] = val;
                          return copy;
                        });
                      }}
                      className="sim-slider"
                    />
                  </div>

                  <div className="sim-input-row">
                    <div className="sim-input-field">
                      <label>SGPA (0 - 10)</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.01"
                        value={currentVal || ''}
                        placeholder="0.00"
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          setSimulatedSgpas(prev => {
                            const copy = [...prev];
                            copy[sem - 1] = isNaN(val) ? 0 : Math.min(10, Math.max(0, val));
                            return copy;
                          });
                        }}
                      />
                    </div>
                    <div className="sim-input-field">
                      <label>Credits</label>
                      <input
                        type="number"
                        min="1"
                        max="32"
                        value={simulatedCredits[sem - 1] || 20}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 20;
                          setSimulatedCredits(prev => {
                            const copy = [...prev];
                            copy[sem - 1] = val;
                            return copy;
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sim-actions-strip">
            <button
              type="button"
              className="btn-sim-reset"
              onClick={() => {
                const initialSgpas = Array(8).fill(0);
                (record?.semesters || []).forEach(s => {
                  if (s.semester <= 8) initialSgpas[s.semester - 1] = s.sgpa || 0;
                });
                setSimulatedSgpas(initialSgpas);
              }}
            >
              🔄 Reset to Official Records
            </button>
            <button
              type="button"
              className="btn-sim-fill"
              onClick={() => {
                setSimulatedSgpas(prev => prev.map(v => v > 0 ? v : 8.5));
              }}
            >
              ⚡ Fill Remaining with 8.5 SGPA
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: TARGET CGPA SOLVER ── */}
      {activeSubTab === 'target-solver' && (
        <div className="target-solver-section animate-fade">
          <div className="target-solver-card glass-card">
            <div className="solver-left">
              <h3>🎯 Reverse Target CGPA Solver</h3>
              <p>
                Set your desired graduating CGPA. The engine calculates the precise minimum average SGPA
                you must secure across all your remaining semesters.
              </p>

              <div className="target-input-block">
                <label>Set Target CGPA:</label>
                <div className="target-number-row">
                  <input
                    type="range"
                    min="5.0"
                    max="10.0"
                    step="0.05"
                    value={targetCgpa}
                    onChange={(e) => setTargetCgpa(parseFloat(e.target.value))}
                    className="sim-slider"
                  />
                  <span className="target-badge-val">{targetCgpa.toFixed(2)}</span>
                </div>
              </div>

              <div className="solver-meta-list">
                <div>Completed Semesters: <strong>{targetSolverStats.completedCount}</strong></div>
                <div>Remaining Semesters: <strong>{targetSolverStats.remainingCount}</strong></div>
                <div>Current Verified CGPA: <strong>{(record?.overallCgpa || 0).toFixed(2)}</strong></div>
              </div>
            </div>

            <div className="solver-right">
              {targetSolverStats.remainingCount > 0 ? (
                targetSolverStats.possible ? (
                  <div className="solver-result-success">
                    <span className="res-icon">🎯</span>
                    <span className="res-label">Target Achievable!</span>
                    <div className="res-big-number">
                      {targetSolverStats.neededAverageSgpa.toFixed(2)}
                      <span className="unit">SGPA</span>
                    </div>
                    <p className="res-explanation">
                      You must maintain an average SGPA of <strong>{targetSolverStats.neededAverageSgpa.toFixed(2)}</strong> across your next <strong>{targetSolverStats.remainingCount}</strong> semester(s).
                    </p>
                  </div>
                ) : (
                  <div className="solver-result-impossible">
                    <span className="res-icon">⚠️</span>
                    <span className="res-label">Mathematically Unattainable</span>
                    <div className="res-big-number">
                      {targetSolverStats.neededAverageSgpa > 10 ? '> 10.0' : '< 0.0'}
                    </div>
                    <p className="res-explanation">
                      Even with a perfect 10.0 SGPA in all remaining {targetSolverStats.remainingCount} semesters, the maximum achievable CGPA is{' '}
                      <strong>
                        {((((record?.overallCgpa || 0) * targetSolverStats.currentCredits) + (10 * targetSolverStats.futureCredits)) / (targetSolverStats.currentCredits + targetSolverStats.futureCredits)).toFixed(2)}
                      </strong>.
                    </p>
                  </div>
                )
              ) : (
                <div className="solver-result-completed">
                  <span className="res-icon">🎓</span>
                  <h4>Degree Finished</h4>
                  <p>All 8 semesters have concluded. Final graduating CGPA: <strong>{(record?.overallCgpa || 0).toFixed(2)}</strong></p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: QUICK SINGLE SEMESTER SGPA CALCULATOR ── */}
      {activeSubTab === 'quick-sgpa' && (
        <div className="quick-sgpa-section animate-fade">
          <div className="quick-header-card glass-card">
            <div>
              <h3>🧮 Fast Single-Semester SGPA Calculator</h3>
              <p>
                Add theoretical or lab subjects, enter their credit weights, and type marks (0 - 100).
                Grades and SGPA update automatically on every keystroke!
              </p>
            </div>
            <div className="quick-result-card">
              <span className="lbl">Computed Semester SGPA</span>
              <strong className="val text-glow" style={{ color: '#10B981' }}>
                {quickSgpaStats.sgpa.toFixed(2)}
              </strong>
              <small className="credits-hint">{quickSgpaStats.totalCredits} Total Credits</small>
            </div>
          </div>

          <div className="glass-card mt-16 p-20">
            <div className="quick-subjects-table-wrap">
              <table className="academics-table">
                <thead>
                  <tr>
                    <th>Subject Description</th>
                    <th style={{ width: '120px' }}>Credits</th>
                    <th style={{ width: '130px' }}>Marks (0-100)</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Grade</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Grade Point</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Credit Pts</th>
                    <th style={{ width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {quickSubjects.map((sub, idx) => {
                    const { grade, point, color } = calculateGradeFromMarks(sub.marks);
                    const pts = ((Number(sub.credits) || 0) * point).toFixed(1);

                    return (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setQuickSubjects(prev => prev.map((s, i) => i === idx ? { ...s, name: val } : s));
                            }}
                            className="inline-text-input"
                            placeholder="Subject Title"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            step="0.5"
                            value={sub.credits}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 1;
                              setQuickSubjects(prev => prev.map((s, i) => i === idx ? { ...s, credits: val } : s));
                            }}
                            className="inline-number-input"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.marks}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                              setQuickSubjects(prev => prev.map((s, i) => i === idx ? { ...s, marks: isNaN(val) ? 0 : val } : s));
                            }}
                            className="inline-number-input"
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="grade-badge" style={{ background: `${color}25`, color, borderColor: `${color}60` }}>
                            {grade}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{point}</td>
                        <td style={{ textAlign: 'center', color: '#38BDF8', fontWeight: '600' }}>{pts}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-row-del"
                            onClick={() => {
                              if (quickSubjects.length <= 1) return;
                              setQuickSubjects(prev => prev.filter((_, i) => i !== idx));
                            }}
                            title="Delete subject"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="quick-actions-bar">
              <button
                type="button"
                className="btn-add-subject"
                onClick={() => {
                  setQuickSubjects(prev => [
                    ...prev,
                    { name: `Elective / Lab ${prev.length + 1}`, credits: 3, marks: 75 }
                  ]);
                }}
              >
                + Add Another Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAcademicsModule;
