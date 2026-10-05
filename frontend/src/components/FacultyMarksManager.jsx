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

  // Bulk Import States
  const [activeMode, setActiveMode] = useState('manual'); // 'manual' | 'bulk-import'
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSuccessReport, setImportSuccessReport] = useState(null);
  const [importError, setImportError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Download Sample CSV Template
  const handleDownloadSampleCsv = () => {
    const csvContent =
`RollNumber,Email,Semester,SubjectCode,SubjectName,Credits,Marks
23241A1201,student1@college.edu,1,CS101,Programming for Problem Solving,4,88
23241A1201,student1@college.edu,1,MA101,Linear Algebra & Calculus,4,82
23241A1201,student1@college.edu,1,PH101,Engineering Physics,3,91
23241A1201,student1@college.edu,1,CS102P,Programming Lab,1.5,85
23241A1201,student1@college.edu,1,PH102P,Physics Lab,1.5,92
23241A1202,student2@college.edu,1,CS101,Programming for Problem Solving,4,74
23241A1202,student2@college.edu,1,MA101,Linear Algebra & Calculus,4,68
23241A1202,student2@college.edu,1,PH101,Engineering Physics,3,79
23241A1202,student2@college.edu,1,CS102P,Programming Lab,1.5,80
23241A1202,student2@college.edu,1,PH102P,Physics Lab,1.5,86`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'campusbridge_academic_results_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parse Uploaded CSV / Text File
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError('');
    setImportSuccessReport(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result;
        if (!text || typeof text !== 'string') {
          setImportError('Failed to read file contents.');
          return;
        }

        const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          setImportError('File contains no data rows.');
          return;
        }

        // Header parsing
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 4) continue;

          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] || '';
          });

          const rollNumber = rowObj.rollnumber || rowObj.rollno || rowObj.roll || cols[0] || '';
          const email = rowObj.email || cols[1] || '';
          const semester = parseInt(rowObj.semester || rowObj.sem || cols[2] || 1, 10);
          const subjectCode = rowObj.subjectcode || rowObj.code || cols[3] || '';
          const subjectName = rowObj.subjectname || rowObj.subject || rowObj.name || cols[4] || subjectCode;
          const credits = parseFloat(rowObj.credits || rowObj.credit || cols[5] || 3);
          const marks = Math.min(100, Math.max(0, parseFloat(rowObj.marks || rowObj.mark || cols[6] || 0)));

          if (rollNumber || email) {
            parsed.push({
              rollNumber,
              email,
              semester: isNaN(semester) ? 1 : semester,
              subjectCode,
              subjectName,
              credits: isNaN(credits) ? 3 : credits,
              marks: isNaN(marks) ? 0 : marks
            });
          }
        }

        if (parsed.length === 0) {
          setImportError('No valid rows could be parsed. Please check template column headers.');
        } else {
          setImportRows(parsed);
        }
      } catch (err) {
        setImportError(`File parsing failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Deploy Bulk Import
  const handleDeployBulkImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    setImportError('');
    setImportSuccessReport(null);

    try {
      const res = await axios.post(`${API_URL}/academics/bulk-import`, { rows: importRows }, getAuthHeaders());
      if (res.data?.success) {
        setImportSuccessReport(res.data);
        setStatusMsg({
          type: 'success',
          text: `✓ Bulk Import Successful: ${res.data.processedCount} student semester academic records updated!`
        });

        // Refresh faculty student roster
        const stRes = await axios.get(`${API_URL}/academics/students`, getAuthHeaders());
        if (stRes.data?.success) {
          setStudents(stRes.data.data || []);
        }
      }
    } catch (err) {
      setImportError(err.response?.data?.error || 'Bulk deployment failed. Please check student roll numbers.');
    } finally {
      setImporting(false);
    }
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

      {/* ── Mode Switcher Tab ── */}
      <div className="faculty-mode-switch glass-card">
        <button
          type="button"
          className={`btn-mode-tab ${activeMode === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveMode('manual')}
        >
          <span>📝</span> Individual Student Marks Evaluation
        </button>

        <button
          type="button"
          className={`btn-mode-tab ${activeMode === 'bulk-import' ? 'active' : ''}`}
          onClick={() => setActiveMode('bulk-import')}
        >
          <span>📥</span> Bulk Import Academic Results (CSV / Excel)
          <span className="badge-new-pill">Single Attempt Deploy</span>
        </button>
      </div>

      {activeMode === 'bulk-import' ? (
        <div className="bulk-import-workspace animate-fade">
          {/* Step 1: Download Template */}
          <div className="bulk-step-card glass-card">
            <div className="step-card-header">
              <div className="step-title-box">
                <h3><span>📥</span> Step 1: Download Standard Academic CSV Template</h3>
                <p>
                  Download the official import template pre-populated with required headers. Fill in student marks (0 - 100) and course credits, then upload it below.
                </p>
              </div>
              <button
                type="button"
                className="btn-download-sample"
                onClick={handleDownloadSampleCsv}
              >
                <span>⬇️</span> Download Example Import File (.csv)
              </button>
            </div>

            <div className="sample-columns-grid">
              <div className="sample-col-tag">
                <code>RollNumber</code>
                <span>e.g. 23241A1201</span>
              </div>
              <div className="sample-col-tag">
                <code>Email</code>
                <span>e.g. student@college.edu</span>
              </div>
              <div className="sample-col-tag">
                <code>Semester</code>
                <span>Semester 1 to 8</span>
              </div>
              <div className="sample-col-tag">
                <code>SubjectCode</code>
                <span>e.g. CS101, MA101</span>
              </div>
              <div className="sample-col-tag">
                <code>SubjectName</code>
                <span>Full Subject Title</span>
              </div>
              <div className="sample-col-tag">
                <code>Credits</code>
                <span>e.g. 4, 3, 1.5</span>
              </div>
              <div className="sample-col-tag">
                <code>Marks</code>
                <span>Marks 0 to 100</span>
              </div>
            </div>
          </div>

          {/* Step 2: Upload File */}
          <div className="bulk-step-card glass-card">
            <div className="step-title-box">
              <h3><span>📤</span> Step 2: Upload Completed Academic Results File</h3>
              <p>Upload your completed .csv or excel-exported text file. The system will validate and compute all grades automatically.</p>
            </div>

            <label className="bulk-upload-dropzone">
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <span className="dropzone-icon">📁</span>
              <span className="dropzone-main-text">
                {importFileName ? `Selected: ${importFileName}` : 'Click or Drop Completed Academic Results CSV Here'}
              </span>
              <span className="dropzone-sub-text">
                Supports .CSV files exported from Excel, Google Sheets, or College ERP
              </span>
              {importRows.length > 0 && (
                <div className="file-status-pill">
                  <span>✓ {importRows.length} subject mark entries parsed successfully</span>
                </div>
              )}
            </label>

            {importError && (
              <div className="status-banner error animate-fade" style={{ marginTop: '0.5rem' }}>
                <span>⚠️ {importError}</span>
              </div>
            )}
          </div>

          {/* Step 3: Parsed Results Preview & Deploy */}
          {importRows.length > 0 && (
            <div className="bulk-step-card glass-card animate-fade">
              <div className="bulk-preview-meta">
                <div className="step-title-box">
                  <h3><span>⚡</span> Step 3: Verification &amp; Live Evaluation Preview</h3>
                  <p>All Subject Grades and Grade Points have been pre-computed using the 10-point standard scale.</p>
                </div>
                <div className="preview-stats-badges">
                  <span className="preview-badge">Total Rows: <strong>{importRows.length}</strong></span>
                  <span className="preview-badge">
                    Unique Students: <strong>{new Set(importRows.map(r => r.rollNumber || r.email)).size}</strong>
                  </span>
                  <span className="preview-badge">
                    Semesters: <strong>{Array.from(new Set(importRows.map(r => r.semester))).join(', ')}</strong>
                  </span>
                </div>
              </div>

              <div className="table-responsive" style={{ maxHeight: '350px' }}>
                <table className="faculty-marks-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student Roll / Email</th>
                      <th>Sem</th>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th style={{ textAlign: 'center' }}>Credits</th>
                      <th style={{ textAlign: 'center' }}>Marks</th>
                      <th style={{ textAlign: 'center' }}>Auto Grade</th>
                      <th style={{ textAlign: 'center' }}>Grade Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 50).map((row, idx) => {
                      const { grade, point, color } = getGradeInfo(row.marks);
                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><strong>{row.rollNumber || row.email}</strong></td>
                          <td><span className="code-pill">Sem {row.semester}</span></td>
                          <td><code>{row.subjectCode}</code></td>
                          <td>{row.subjectName}</td>
                          <td style={{ textAlign: 'center' }}>{row.credits}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#38bdf8' }}>{row.marks}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="grade-badge" style={{ background: `${color}25`, color, borderColor: `${color}70` }}>
                              {grade}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{point}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {importRows.length > 50 && (
                <small style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  Showing first 50 rows of {importRows.length} total entries.
                </small>
              )}

              {/* Step 4: Deploy & Replicate */}
              <div className="sheet-submit-bar" style={{ marginTop: '1rem' }}>
                <div className="submit-info">
                  <span>
                    ⚡ Clicking "Deploy &amp; Replicate" will instantly compute Semester SGPA, calculate cumulative CGPA across all semesters, and update both Academic Records and Student Dashboards immediately.
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-deploy-bulk"
                  onClick={handleDeployBulkImport}
                  disabled={importing}
                >
                  {importing ? (
                    <>
                      <span className="spinner-loader sm"></span>
                      Deploying &amp; Calculating Academic Records...
                    </>
                  ) : (
                    '🚀 Deploy & Replicate Student Academic Records'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success Report */}
          {importSuccessReport && (
            <div className="bulk-results-card glass-card animate-fade">
              <h3><span>🎉</span> Deployment Complete</h3>
              <p style={{ color: '#e2e8f0', margin: 0 }}>
                {importSuccessReport.message}
              </p>
              <div className="results-grid">
                {(importSuccessReport.processed || []).map((st, i) => (
                  <div key={i} className="result-student-card">
                    <div>
                      <div className="result-st-name">{st.name}</div>
                      <div className="result-st-roll">{st.rollNumber} • Sem {st.semester} ({st.subjectsCount} subjects)</div>
                    </div>
                    <div>
                      <div className="result-st-sgpa">{st.semesterSgpa.toFixed(2)} SGPA</div>
                      <div className="result-st-cgpa">CGPA: {st.overallCgpa.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Vertical Flow Layout: Whole Students First -> Spacer -> Details of Selected Student ── */
        <div className="faculty-marks-vertical-container">
          {/* 1. Top Section: Whole Students (Full-Width Responsive Cards Grid) */}
          <div className="students-selector-top-card glass-card">
            <div className="selector-top-head">
              <div className="selector-head-info">
                <div className="title-with-badge">
                  <h3>👥 Students in Your Evaluation Scope</h3>
                  <span className="student-count">{filteredStudents.length} Students</span>
                </div>
                <p className="selector-subtitle">
                  Select a student from the cards below to load their marks sheet, semester curriculum, and live CGPA evaluator.
                </p>
              </div>

              <div className="search-box-top">
                <input
                  type="text"
                  placeholder="🔍 Search student by name, roll no, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="student-search-input"
                />
              </div>
            </div>

            <div className="students-grid-scroll-wrap">
              {loadingStudents ? (
                <div className="students-loading-state" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  <div className="spinner-loader sm" style={{ margin: '0 auto 8px' }}></div>
                  <p>Loading students in your assigned scope...</p>
                </div>
              ) : filteredStudents.length > 0 ? (
                <div className="students-cards-grid">
                  {filteredStudents.map(st => {
                    const isSelected = selectedStudent?._id === st._id;
                    const cgpaVal = (st.overallCgpa || st.cgpa || 0).toFixed(2);
                    return (
                      <div
                        key={st._id}
                        className={`student-item-grid-card ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedStudent(st);
                          setStatusMsg({ type: '', text: '' });
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setSelectedStudent(st);
                            setStatusMsg({ type: '', text: '' });
                          }
                        }}
                      >
                        <div className="st-card-top-row">
                          <div className="st-avatar-badge">
                            {st.name ? st.name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div className="st-cgpa-pill">
                            <span className="lbl">CGPA</span>
                            <strong className="val">{cgpaVal}</strong>
                          </div>
                        </div>

                        <div className="st-card-body">
                          <h4 className="st-card-name" title={st.name}>{st.name}</h4>
                          <div className="st-card-meta">
                            {st.rollNumber && <span className="meta-chip roll">🆔 {st.rollNumber}</span>}
                            <span className="meta-chip branch">🏫 {st.branch || 'Engineering'}{st.section ? ` (${st.section})` : ''}</span>
                            {st.academicYear && <span className="meta-chip year">🎓 {st.academicYear}</span>}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="st-card-active-footer">
                            <span>● Selected for Evaluation</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="no-data-note" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  No matching student records found for "{searchQuery}".
                </p>
              )}
            </div>
          </div>

          {/* 2. Space between Whole Students and Selected Student Details */}
          <div className="faculty-section-spacer"></div>

          {/* 3. Details of Selected Student (Full Width Below) */}
          <div className="marks-sheet-card glass-card full-width">
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
              <p>Please select a student from the cards above to enter marks and evaluate their academic record.</p>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default FacultyMarksManager;
