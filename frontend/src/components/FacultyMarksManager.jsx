import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import './FacultyMarksManager.css';

const GRADE_KEY = [
  { range: '90-100', grade: 'O', point: 10, color: '#10B981', label: 'Outstanding' },
  { range: '80-89', grade: 'A+', point: 9, color: '#34D399', label: 'Excellent' },
  { range: '70-79', grade: 'A', point: 8, color: '#38BDF8', label: 'Very Good' },
  { range: '60-69', grade: 'B+', point: 7, color: '#818CF8', label: 'Good' },
  { range: '50-59', grade: 'B', point: 6, color: '#FBBF24', label: 'Above Average' },
  { range: '40-49', grade: 'C', point: 5, color: '#FB923C', label: 'Pass' },
  { range: '<40', grade: 'F', point: 0, color: '#EF4444', label: 'Fail / Arrear' }
];

const FacultyMarksManager = ({ preselectedStudentId, onBack }) => {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSem, setSelectedSem] = useState(1);

  // Subjects state for the selected semester
  const [subjects, setSubjects] = useState([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [studentRecord, setStudentRecord] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Helper to calculate grade & point from marks
  const getGradeInfo = (marks) => {
    const m = Math.min(100, Math.max(0, Math.round(Number(marks) || 0)));
    if (m >= 90) return { grade: 'O', point: 10, color: '#10B981' };
    if (m >= 80) return { grade: 'A+', point: 9, color: '#34D399' };
    if (m >= 70) return { grade: 'A', point: 8, color: '#38BDF8' };
    if (m >= 60) return { grade: 'B+', point: 7, color: '#818CF8' };
    if (m >= 50) return { grade: 'B', point: 6, color: '#FBBF24' };
    if (m >= 40) return { grade: 'C', point: 5, color: '#FB923C' };
    return { grade: 'F', point: 0, color: '#EF4444' };
  };

  // 1. Fetch Students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const res = await axios.get(`${API_URL}/academics/students`, getAuthHeaders());
        if (res.data?.success) {
          const list = res.data.data || [];
          setStudents(list);

          if (preselectedStudentId) {
            const found = list.find(s => s._id === preselectedStudentId);
            if (found) setSelectedStudent(found);
          } else if (list.length > 0) {
            setSelectedStudent(list[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load faculty students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [preselectedStudentId]);

  // 2. Fetch or load student's academic record when selected student changes
  const loadStudentRecord = async (studentId, semNum) => {
    if (!studentId) return;
    try {
      setLoadingCurriculum(true);
      const res = await axios.get(`${API_URL}/academics/student/${studentId}`, getAuthHeaders());
      if (res.data?.success) {
        const record = res.data.data;
        setStudentRecord(record);

        // Check if this semester already has subjects saved
        const semData = (record.semesters || []).find(s => s.semester === semNum);
        if (semData && semData.subjects && semData.subjects.length > 0) {
          setSubjects(semData.subjects.map(s => ({
            subjectName: s.subjectName,
            subjectCode: s.subjectCode || '',
            credits: s.credits,
            marks: s.marks
          })));
        } else {
          // Preload standard curriculum for branch & semester
          loadDefaultCurriculum(selectedStudent?.branch || 'CSE', semNum);
        }
      }
    } catch (err) {
      console.warn('Could not load academic record:', err);
      loadDefaultCurriculum(selectedStudent?.branch || 'CSE', semNum);
    } finally {
      setLoadingCurriculum(false);
    }
  };

  // Load default curriculum for branch & semester
  const loadDefaultCurriculum = async (branch, semNum) => {
    try {
      const res = await axios.get(`${API_URL}/academics/curriculum/${branch || 'CSE'}/${semNum}`, getAuthHeaders());
      if (res.data?.success && res.data.subjects?.length > 0) {
        setSubjects(res.data.subjects.map(s => ({
          subjectName: s.subjectName,
          subjectCode: s.subjectCode || '',
          credits: s.credits,
          marks: 75 // default sensible sample marks
        })));
      } else {
        // Fallback default
        setSubjects([
          { subjectName: 'Core Subject 1', subjectCode: 'CS101', credits: 4, marks: 80 },
          { subjectName: 'Core Subject 2', subjectCode: 'CS102', credits: 3, marks: 75 },
          { subjectName: 'Practical Lab', subjectCode: 'CS103', credits: 1.5, marks: 85 }
        ]);
      }
    } catch (e) {
      setSubjects([
        { subjectName: 'Theory Subject 1', subjectCode: 'SUB1', credits: 4, marks: 80 },
        { subjectName: 'Theory Subject 2', subjectCode: 'SUB2', credits: 3, marks: 75 },
        { subjectName: 'Practical Lab', subjectCode: 'LAB1', credits: 1.5, marks: 85 }
      ]);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      loadStudentRecord(selectedStudent._id, selectedSem);
    }
  }, [selectedStudent, selectedSem]);

  // 3. Live calculations as marks are entered
  const liveCalculations = useMemo(() => {
    let totalCredits = 0;
    let totalPoints = 0;
    let arrears = 0;

    subjects.forEach(sub => {
      const c = Number(sub.credits) || 3;
      const { point, grade } = getGradeInfo(sub.marks);
      totalCredits += c;
      totalPoints += (c * point);
      if (grade === 'F') arrears += 1;
    });

    const liveSgpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;

    // Projected overall CGPA across all 8 semesters
    let sumCredits = 0;
    let sumWeightedPoints = 0;

    for (let sem = 1; sem <= 8; sem++) {
      if (sem === selectedSem) {
        sumCredits += totalCredits;
        sumWeightedPoints += totalPoints;
      } else {
        const otherSem = (studentRecord?.semesters || []).find(s => s.semester === sem);
        if (otherSem && otherSem.sgpa > 0) {
          const sc = otherSem.totalCredits || 20;
          sumCredits += sc;
          sumWeightedPoints += (otherSem.sgpa * sc);
        }
      }
    }

    const projectedCgpa = sumCredits > 0 ? Number((sumWeightedPoints / sumCredits).toFixed(2)) : liveSgpa;

    return {
      totalCredits,
      totalPoints,
      liveSgpa,
      arrears,
      projectedCgpa
    };
  }, [subjects, selectedSem, studentRecord]);

  // Update subject field
  const handleUpdateSubject = (index, field, value) => {
    setSubjects(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  // Add custom subject row
  const handleAddSubjectRow = () => {
    setSubjects(prev => [
      ...prev,
      { subjectName: `Subject ${prev.length + 1}`, subjectCode: `CS${selectedSem}0${prev.length + 1}`, credits: 3, marks: 70 }
    ]);
  };

  // Delete subject row
  const handleDeleteSubjectRow = (index) => {
    if (subjects.length <= 1) return;
    setSubjects(prev => prev.filter((_, i) => i !== index));
  };

  // Submit & Save Marks
  const handleSaveMarks = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setStatusMsg({ type: '', text: '' });
    setSavingMarks(true);

    try {
      const payload = {
        studentId: selectedStudent._id,
        semester: selectedSem,
        subjects: subjects.map(s => ({
          subjectName: s.subjectName.trim(),
          subjectCode: (s.subjectCode || '').trim().toUpperCase(),
          credits: Number(s.credits) || 3,
          marks: Number(s.marks) || 0
        }))
      };

      const res = await axios.post(`${API_URL}/academics/save-marks`, payload, getAuthHeaders());
      if (res.data?.success) {
        setStatusMsg({
          type: 'success',
          text: `✓ Success! Semester ${selectedSem} marks published. SGPA: ${res.data.data.semesterSgpa} | Updated Overall CGPA: ${res.data.data.overallCgpa}.`
        });

        // Refresh record
        setStudentRecord(res.data.data.academicRecord);
        setSelectedStudent(prev => ({
          ...prev,
          [`sgpaSem${selectedSem}`]: res.data.data.semesterSgpa,
          overallCgpa: res.data.data.overallCgpa
        }));
      }
    } catch (err) {
      console.error('Error saving marks:', err);
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to publish semester marks.'
      });
    } finally {
      setSavingMarks(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.rollNumber || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  return (
    <div className="faculty-marks-root animate-fade">
      {/* ── Top Header Strip ── */}
      <div className="faculty-marks-header glass-card">
        <div>
          <div className="header-tag-line">
            <span className="badge-academic">🎓 Academic Operations</span>
            <span className="badge-autocalc">⚡ Automatic CGPA &amp; SGPA Calculator</span>
          </div>
          <h2>Faculty Marks &amp; CGPA Evaluation Console</h2>
          <p>
            Enter subject marks for any semester. The system automatically computes
            <strong> Subject Grades, Grade Points, Semester SGPA, Total Credits, and Overall CGPA</strong> — zero manual calculation required!
          </p>
        </div>

        {onBack && (
          <button type="button" className="btn-back-dashboard" onClick={onBack}>
            ← Back to Student Progress
          </button>
        )}
      </div>

      {statusMsg.text && (
        <div className={`status-banner ${statusMsg.type} animate-fade`}>
          <span>{statusMsg.text}</span>
          <button type="button" onClick={() => setStatusMsg({ type: '', text: '' })}>×</button>
        </div>
      )}

      {/* ── Main Two-Column Layout (Student Selector & Marks Entry) ── */}
      <div className="faculty-marks-grid">
        {/* Left Column: Student Selector */}
        <div className="students-selector-card glass-card">
          <div className="selector-head">
            <h3>Select Student</h3>
            <span className="student-count">{filteredStudents.length} Students</span>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search by name, roll no, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="student-search-input"
            />
          </div>

          <div className="students-scroll-list">
            {loadingStudents ? (
              <p className="loading-note">Loading students in your scope...</p>
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map(st => {
                const isSelected = selectedStudent?._id === st._id;
                return (
                  <div
                    key={st._id}
                    className={`student-item-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedStudent(st);
                      setStatusMsg({ type: '', text: '' });
                    }}
                  >
                    <div className="st-info">
                      <strong>{st.name}</strong>
                      <span className="st-meta">
                        {st.rollNumber ? `🆔 ${st.rollNumber}` : st.email} • {st.branch} {st.section ? `Sec ${st.section}` : ''}
                      </span>
                    </div>
                    <div className="st-cgpa-chip">
                      <span className="lbl">CGPA</span>
                      <strong className="val">{(st.overallCgpa || st.cgpa || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="no-data-note">No matching student records found.</p>
            )}
          </div>
        </div>

        {/* Right Column: Marks Entry Sheet */}
        <div className="marks-sheet-card glass-card">
          {selectedStudent ? (
            <form onSubmit={handleSaveMarks}>
              {/* Selected Student Banner */}
              <div className="active-student-banner">
                <div className="student-profile-strip">
                  <div className="student-avatar-box">
                    {selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div>
                    <h3 className="banner-name">{selectedStudent.name}</h3>
                    <div className="banner-details">
                      <span>Roll No: <strong>{selectedStudent.rollNumber || 'Not assigned'}</strong></span>
                      <span>Branch: <strong>{selectedStudent.branch || 'Engineering'}</strong></span>
                      <span>Current CGPA: <strong style={{ color: '#38BDF8' }}>{(selectedStudent.overallCgpa || 0).toFixed(2)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Semester Selector Tabs */}
                <div className="sem-tabs-bar">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                    const hasSgpa = Number(selectedStudent[`sgpaSem${sem}`]) > 0;
                    return (
                      <button
                        key={sem}
                        type="button"
                        className={`sem-tab-btn ${selectedSem === sem ? 'active' : ''} ${hasSgpa ? 'has-data' : ''}`}
                        onClick={() => setSelectedSem(sem)}
                      >
                        Sem {sem}
                        {hasSgpa && <span className="dot-active">•</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Computation Metric Strip */}
              <div className="live-computation-banner">
                <div className="comp-item">
                  <span className="comp-lbl">Semester {selectedSem} Credits</span>
                  <strong className="comp-val">{liveCalculations.totalCredits}</strong>
                  <small className="comp-sub">Credits Assigned</small>
                </div>

                <div className="comp-item highlight">
                  <span className="comp-lbl">Auto-Calculated SGPA</span>
                  <strong className="comp-val text-glow" style={{ color: '#10B981' }}>
                    {liveCalculations.liveSgpa.toFixed(2)}
                  </strong>
                  <small className="comp-sub">Semester {selectedSem}</small>
                </div>

                <div className="comp-item">
                  <span className="comp-lbl">Projected CGPA</span>
                  <strong className="comp-val text-glow" style={{ color: '#38BDF8' }}>
                    {liveCalculations.projectedCgpa.toFixed(2)}
                  </strong>
                  <small className="comp-sub">Overall Cumulative</small>
                </div>

                <div className="comp-item">
                  <span className="comp-lbl">Arrears Flag</span>
                  <strong className="comp-val" style={{ color: liveCalculations.arrears > 0 ? '#EF4444' : '#34D399' }}>
                    {liveCalculations.arrears} Backlogs
                  </strong>
                  <small className="comp-sub">{liveCalculations.arrears === 0 ? 'All Cleared' : 'Requires Re-exam'}</small>
                </div>
              </div>

              {/* Subjects Entry Table */}
              <div className="subjects-table-section">
                <div className="table-actions-header">
                  <h4>Semester {selectedSem} Subjects &amp; Marks</h4>
                  <div className="quick-table-btns">
                    <button
                      type="button"
                      className="btn-quick-outline"
                      onClick={() => loadDefaultCurriculum(selectedStudent.branch, selectedSem)}
                    >
                      🔄 Reset to Standard Curriculum
                    </button>
                    <button
                      type="button"
                      className="btn-quick-outline primary"
                      onClick={handleAddSubjectRow}
                    >
                      + Add Subject Row
                    </button>
                  </div>
                </div>

                {loadingCurriculum ? (
                  <p className="loading-note">Loading curriculum subjects...</p>
                ) : (
                  <div className="table-responsive">
                    <table className="faculty-marks-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Subject Name</th>
                          <th style={{ width: '120px' }}>Subject Code</th>
                          <th style={{ width: '100px', textAlign: 'center' }}>Credits</th>
                          <th style={{ width: '140px', textAlign: 'center' }}>Marks (0 - 100)</th>
                          <th style={{ width: '110px', textAlign: 'center' }}>Auto Grade</th>
                          <th style={{ width: '100px', textAlign: 'center' }}>Grade Pts</th>
                          <th style={{ width: '110px', textAlign: 'center' }}>Credit Pts</th>
                          <th style={{ width: '60px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjects.map((sub, idx) => {
                          const { grade, point, color } = getGradeInfo(sub.marks);
                          const creditPts = ((Number(sub.credits) || 0) * point).toFixed(1);

                          return (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>
                                <input
                                  type="text"
                                  value={sub.subjectName}
                                  onChange={(e) => handleUpdateSubject(idx, 'subjectName', e.target.value)}
                                  className="table-input"
                                  placeholder="Subject Title"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={sub.subjectCode}
                                  onChange={(e) => handleUpdateSubject(idx, 'subjectCode', e.target.value)}
                                  className="table-input code"
                                  placeholder="e.g. CS401"
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min="0.5"
                                  max="12"
                                  step="0.5"
                                  value={sub.credits}
                                  onChange={(e) => handleUpdateSubject(idx, 'credits', parseFloat(e.target.value) || 1)}
                                  className="table-input num"
                                  required
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={sub.marks === 0 ? '0' : sub.marks || ''}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                    handleUpdateSubject(idx, 'marks', isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                                  }}
                                  className="table-input num marks-input"
                                  placeholder="Marks"
                                  required
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className="grade-badge" style={{ background: `${color}25`, color, borderColor: `${color}70` }}>
                                  {grade}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{point}</td>
                              <td style={{ textAlign: 'center', color: '#38BDF8', fontWeight: 'bold' }}>{creditPts}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-del-row"
                                  onClick={() => handleDeleteSubjectRow(idx)}
                                  title="Delete subject"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>Total Semester Credits:</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{liveCalculations.totalCredits}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Semester SGPA:</td>
                          <td colSpan="2" style={{ textAlign: 'center' }}>
                            <strong style={{ color: '#10B981', fontSize: '15px' }}>
                              {liveCalculations.liveSgpa.toFixed(2)} SGPA
                            </strong>
                          </td>
                          <td style={{ textAlign: 'center', color: '#38BDF8', fontWeight: 'bold' }}>
                            {liveCalculations.totalPoints.toFixed(1)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Reference Grade Scale Strip */}
              <div className="mini-grade-matrix">
                <span className="matrix-title">Grading Legend:</span>
                {GRADE_KEY.map(g => (
                  <span key={g.grade} className="matrix-pill" style={{ color: g.color }}>
                    <strong>{g.grade}</strong> ({g.point} pts: {g.range})
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="sheet-submit-bar">
                <div className="submit-info">
                  <span>💡 SGPA &amp; Overall CGPA will automatically recalculate and sync to student dashboard immediately.</span>
                </div>
                <button
                  type="submit"
                  className="btn-save-marks"
                  disabled={savingMarks || subjects.length === 0}
                >
                  {savingMarks ? (
                    <span className="spinner-loader sm"></span>
                  ) : (
                    '💾 Save & Publish Academic Record'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="no-student-selected">
              <span className="icon">👥</span>
              <h3>No Student Selected</h3>
              <p>Please select a student from the list on the left to enter marks and evaluate their academic record.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacultyMarksManager;
