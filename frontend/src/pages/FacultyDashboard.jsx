import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';
import Header from '../components/Header';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
    const [activeTab, setActiveTab] = useState('students'); // 'students' | 'subjects' | 'projects' | 'labs'
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [labTasks, setLabTasks] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Student Progress Modal state
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [progress, setProgress] = useState(null);
    const [progressLoading, setProgressLoading] = useState(false);

    // Filters for students
    const [studentSearch, setStudentSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('');

    // Lab Reports state
    const [labReports, setLabReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // Project review state
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectReviewForm, setProjectReviewForm] = useState({ status: 'approved', grade: '', feedback: '' });
    const [savingReview, setSavingReview] = useState(false);

    // Lab task creation state
    const [labTaskForm, setLabTaskForm] = useState({
        title: '',
        instructions: '',
        subject: '',
        academicYear: '',
        branch: '',
        section: '',
        maxScore: 100,
        dueDate: ''
    });
    const [submittingLab, setSubmittingLab] = useState(false);

    const navigate = useNavigate();

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    const fetchStudents = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }
            const res = await axios.get(`${API_URL}/users/students`, getAuthHeaders());
            setStudents(res.data?.data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load students. Ensure you have Faculty privileges.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/academic/subjects`, getAuthHeaders());
            setSubjects(res.data?.data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load academic subjects.');
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/academic/projects`, getAuthHeaders());
            setProjects(res.data?.data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load student projects.');
        } finally {
            setLoading(false);
        }
    };

    const fetchLabTasks = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/labs/tasks`, getAuthHeaders());
            setLabTasks(res.data?.data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load lab tasks.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'students') {
            fetchStudents();
        } else if (activeTab === 'subjects') {
            fetchSubjects();
        } else if (activeTab === 'projects') {
            fetchProjects();
        } else if (activeTab === 'labs') {
            fetchLabTasks();
            fetchSubjects();
            fetchLabReports();
        }
    }, [activeTab]);

    const fetchLabReports = async () => {
        try {
            setLoadingReports(true);
            const res = await axios.get(`${API_URL}/labs/reports`, getAuthHeaders());
            setLabReports(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load lab reports:', err);
        } finally {
            setLoadingReports(false);
        }
    };

    const downloadLabReportsCSV = () => {
        if (!labReports.length) return;
        const headers = ['Student Name', 'Email', 'Roll Number', 'Branch', 'Section', 'Academic Year', 'Lab Task Title', 'Assigned Faculty', 'Faculty Email', 'Score', 'Max Score', 'Status', 'Feedback', 'Submitted Date'];
        const rows = labReports.map(r => [
            `"${(r.student?.name || '').replace(/"/g, '""')}"`,
            `"${(r.student?.email || '').replace(/"/g, '""')}"`,
            `"${(r.student?.rollNumber || '').replace(/"/g, '""')}"`,
            `"${(r.student?.branch || '').replace(/"/g, '""')}"`,
            `"${(r.student?.section || '').replace(/"/g, '""')}"`,
            `"${(r.student?.academicYear || r.student?.year || '').replace(/"/g, '""')}"`,
            `"${(r.task?.title || '').replace(/"/g, '""')}"`,
            `"${(r.task?.createdBy?.name || r.reviewedBy?.name || 'Faculty').replace(/"/g, '""')}"`,
            `"${(r.task?.createdBy?.email || r.reviewedBy?.email || '').replace(/"/g, '""')}"`,
            r.score ?? 'N/A',
            r.task?.maxScore || 100,
            r.status || 'submitted',
            `"${(r.feedback || '').replace(/"/g, '""')}"`,
            `"${r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Lab_Practice_Reports_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Student progress detail viewer
    const viewProgress = async (student) => {
        try {
            setProgressLoading(true);
            setError(null);
            const res = await axios.get(`${API_URL}/users/students/${student._id}/progress`, getAuthHeaders());
            setSelectedStudent(student);
            setProgress(res.data?.data || null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load student progress.');
        } finally {
            setProgressLoading(false);
        }
    };

    // Project grading handler
    const handleSaveProjectReview = async (e) => {
        e.preventDefault();
        if (!selectedProject) return;
        try {
            setSavingReview(true);
            const payload = {
                status: projectReviewForm.status,
                grade: projectReviewForm.grade === '' ? null : Number(projectReviewForm.grade),
                feedback: projectReviewForm.feedback
            };
            const res = await axios.put(`${API_URL}/academic/projects/${selectedProject._id}`, payload, getAuthHeaders());
            if (res.data?.success) {
                setSuccessMsg('Project review and grade submitted successfully!');
                setSelectedProject(null);
                fetchProjects();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update project review.');
        } finally {
            setSavingReview(false);
        }
    };

    // Lab task creation handler
    const handleCreateLabTask = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg('');
        if (!labTaskForm.title || !labTaskForm.instructions || !labTaskForm.subject || !labTaskForm.academicYear) {
            setError('Title, instructions, subject, and academic year are required.');
            return;
        }

        try {
            setSubmittingLab(true);
            const res = await axios.post(`${API_URL}/labs/tasks`, labTaskForm, getAuthHeaders());
            if (res.data?.success) {
                setSuccessMsg(`Lab Task "${res.data.data.title}" created successfully!`);
                setLabTaskForm({ title: '', instructions: '', subject: '', academicYear: '', branch: '', section: '', maxScore: 100, dueDate: '' });
                fetchLabTasks();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create lab task.');
        } finally {
            setSubmittingLab(false);
        }
    };

    // Filter students
    const filteredStudents = students.filter(student => {
        const matchesSearch = !studentSearch ||
            student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
            student.email?.toLowerCase().includes(studentSearch.toLowerCase());
        const matchesBranch = !branchFilter || student.branch?.toLowerCase() === branchFilter.toLowerCase();
        return matchesSearch && matchesBranch;
    });

    const uniqueBranches = [...new Set(students.map(s => s.branch).filter(Boolean))];

    return (
        <>
            <Header title="Faculty Management Dashboard" />
            <div className="content-wrapper faculty-dashboard-content animate-fade">
                <div className="faculty-content">

                    {/* Navigation Tabs */}
                    <div className="faculty-tabs-nav">
                        <button
                            className={`faculty-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('students'); setError(null); setSuccessMsg(''); }}
                        >
                            👥 Student Progress & PRI
                        </button>
                        <button
                            className={`faculty-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('subjects'); setError(null); setSuccessMsg(''); }}
                        >
                            📚 Academic Subjects
                        </button>
                        <button
                            className={`faculty-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('projects'); setError(null); setSuccessMsg(''); }}
                        >
                            📁 Student Projects & Grading
                        </button>
                        <button
                            className={`faculty-tab-btn ${activeTab === 'labs' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('labs'); setError(null); setSuccessMsg(''); }}
                        >
                            🔬 Lab Tasks & Practice
                        </button>
                    </div>

                    {/* Alerts */}
                    {error && <div className="error-alert">{error}</div>}
                    {successMsg && <div className="success-alert">{successMsg}</div>}

                    {/* TAB 1: STUDENT MONITORING */}
                    {activeTab === 'students' && (
                        <div>
                            <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c7d2fe', fontSize: '13px' }}>
                                    <span style={{ fontSize: '18px' }}>🎯</span>
                                    <span>Showing students registered within your assigned academic scope (Year, Branch, Section).</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchStudents}
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#f8fafc', padding: '5px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                                >
                                    🔄 Refresh Roster
                                </button>
                            </div>

                            <div className="stats-cards">
                                <div className="stat-card">
                                    <h3>Total Assigned Students</h3>
                                    <p>{students.length}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>High Readiness (&gt;70%)</h3>
                                    <p style={{ color: '#10b981' }}>{students.filter(s => s.readinessScore >= 70).length}</p>
                                </div>
                                <div className="stat-card">
                                    <h3>Needs Attention (&lt;40%)</h3>
                                    <p style={{ color: '#ef4444' }}>{students.filter(s => s.readinessScore < 40).length}</p>
                                </div>
                            </div>

                            <div className="students-section">
                                <div className="section-toolbar">
                                    <h2>Student Progress Monitoring</h2>
                                    <div className="filter-group">
                                        <input
                                            type="text"
                                            className="form-control filter-input"
                                            placeholder="Search by student name or email..."
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                        />
                                        <select
                                            className="form-control filter-select"
                                            value={branchFilter}
                                            onChange={e => setBranchFilter(e.target.value)}
                                        >
                                            <option value="">All Branches</option>
                                            {uniqueBranches.map(br => <option key={br} value={br}>{br}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {loading ? (
                                    <p className="loading-text">Loading student records...</p>
                                ) : (
                                    <div className="students-table-scroll">
                                        <table className="students-table">
                                            <thead>
                                                <tr>
                                                    <th>Student</th>
                                                    <th>Email</th>
                                                    <th>Branch</th>
                                                    <th>Academic Year</th>
                                                    <th>Readiness Index</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredStudents.map(student => (
                                                    <tr key={student._id}>
                                                        <td><strong>{student.name}</strong></td>
                                                        <td>{student.email}</td>
                                                        <td>{student.branch || 'N/A'} {student.section ? `(Sec ${student.section})` : ''}</td>
                                                        <td>{student.academicYear || student.year || 'N/A'}</td>
                                                        <td>
                                                            <span className={`score-badge ${student.readinessScore >= 70 ? 'high' : student.readinessScore >= 40 ? 'medium' : 'low'}`}>
                                                                {student.readinessScore || 0}%
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <button className="btn-view" onClick={() => viewProgress(student)}>
                                                                View Full Progress
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredStudents.length === 0 && (
                                                    <tr>
                                                        <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                                            No student records found matching current criteria.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: ACADEMIC SUBJECTS (VIEW ONLY FOR FACULTY) */}
                    {activeTab === 'subjects' && (
                        <div className="faculty-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3>📚 Registered Academic Preparation Subjects ({subjects.length})</h3>
                                    <p className="card-desc">Curriculum preparation subjects registered by administrators and available for student practice.</p>
                                </div>
                            </div>

                            {loading ? (
                                <p className="loading-text mt-20">Loading academic subjects...</p>
                            ) : (
                                <div className="students-table-scroll mt-20">
                                    <table className="students-table">
                                        <thead>
                                            <tr>
                                                <th>Code</th>
                                                <th>Subject Name</th>
                                                <th>Academic Year</th>
                                                <th>Branch / Section</th>
                                                <th>Description</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjects.map(s => (
                                                <tr key={s._id}>
                                                    <td><span className="code-pill">{s.code}</span></td>
                                                    <td><strong>{s.name}</strong></td>
                                                    <td>{s.academicYear}</td>
                                                    <td>{s.branch || 'All'} {s.section ? `· Sec ${s.section}` : ''}</td>
                                                    <td style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '300px' }}>{s.description || '—'}</td>
                                                    <td><span className="status-badge-active">Active</span></td>
                                                </tr>
                                            ))}
                                            {!subjects.length && (
                                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No academic subjects registered yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: STUDENT PROJECTS & GRADING */}
                    {activeTab === 'projects' && (
                        <div className="faculty-card">
                            <h3>📁 Student Academic Projects Review</h3>
                            <p className="card-desc">Review submitted capstone and studio projects, inspect code repositories, and submit grades & constructive feedback.</p>

                            {loading ? (
                                <p className="loading-text">Loading projects...</p>
                            ) : (
                                <div className="students-table-scroll mt-20">
                                    <table className="students-table">
                                        <thead>
                                            <tr>
                                                <th>Project Title</th>
                                                <th>Student</th>
                                                <th>Year</th>
                                                <th>Status</th>
                                                <th>Current Grade</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {projects.map(p => (
                                                <tr key={p._id}>
                                                    <td>
                                                        <strong>{p.title}</strong>
                                                        {p.repositoryUrl && <p style={{ fontSize: '11px', margin: '4px 0 0' }}><a href={p.repositoryUrl} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>View Repository ↗</a></p>}
                                                    </td>
                                                    <td>{p.student?.name || 'Student'} ({p.student?.email})</td>
                                                    <td>{p.academicYear}</td>
                                                    <td><span className={`status-pill ${p.status}`}>{p.status.replace('_', ' ')}</span></td>
                                                    <td>{p.grade !== null && p.grade !== undefined ? <strong>{p.grade}/100</strong> : <span style={{ color: '#94a3b8' }}>Not graded</span>}</td>
                                                    <td>
                                                        <button className="btn-view" onClick={() => {
                                                            setSelectedProject(p);
                                                            setProjectReviewForm({ status: p.status || 'approved', grade: p.grade ?? '', feedback: p.feedback || '' });
                                                        }}>
                                                            Grade & Review
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {!projects.length && (
                                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No student project submissions yet.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Project Review Modal */}
                            {selectedProject && (
                                <div className="progress-modal-overlay" onClick={() => setSelectedProject(null)}>
                                    <section className="progress-modal" onClick={e => e.stopPropagation()}>
                                        <div className="progress-modal-header">
                                            <div>
                                                <h2>Grade Project: {selectedProject.title}</h2>
                                                <p>Submitted by {selectedProject.student?.name} ({selectedProject.student?.email})</p>
                                            </div>
                                            <button className="progress-close" type="button" onClick={() => setSelectedProject(null)}>×</button>
                                        </div>
                                        <form className="faculty-form mt-20" onSubmit={handleSaveProjectReview}>
                                            <div className="form-group">
                                                <label className="form-label">Review Status</label>
                                                <select
                                                    className="form-control"
                                                    value={projectReviewForm.status}
                                                    onChange={e => setProjectReviewForm({ ...projectReviewForm, status: e.target.value })}
                                                >
                                                    <option value="approved">Approved</option>
                                                    <option value="under_review">Under Review</option>
                                                    <option value="changes_requested">Changes Requested</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Grade (0 - 100)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    className="form-control"
                                                    placeholder="Enter numerical score"
                                                    value={projectReviewForm.grade}
                                                    onChange={e => setProjectReviewForm({ ...projectReviewForm, grade: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Feedback & Evaluator Notes</label>
                                                <textarea
                                                    className="form-control"
                                                    rows="4"
                                                    placeholder="Write constructive evaluation notes for the student..."
                                                    value={projectReviewForm.feedback}
                                                    onChange={e => setProjectReviewForm({ ...projectReviewForm, feedback: e.target.value })}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                                                <button type="button" className="btn-secondary-action" onClick={() => setSelectedProject(null)}>Cancel</button>
                                                <button type="submit" className="btn-primary-action" disabled={savingReview}>
                                                    {savingReview ? 'Saving...' : 'Submit Evaluation'}
                                                </button>
                                            </div>
                                        </form>
                                    </section>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: LAB TASKS & PRACTICE */}
                    {activeTab === 'labs' && (
                        <div className="faculty-labs-wrapper">
                            {/* 1. TOP: Create Lab Practice Task */}
                            <div className="faculty-card" style={{ marginBottom: '36px' }}>
                                <h3>➕ Create Lab Practice Task</h3>
                                <p className="card-desc">Assign hands-on laboratory programming tasks to students in your assigned academic scope.</p>

                                <form className="faculty-form mt-20" onSubmit={handleCreateLabTask}>
                                    <div className="form-group">
                                        <label className="form-label">Task Title *</label>
                                        <input
                                            className="form-control"
                                            placeholder="e.g. Implement B-Tree Indexing in C++"
                                            value={labTaskForm.title}
                                            onChange={e => setLabTaskForm({ ...labTaskForm, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">Associated Subject *</label>
                                            <select
                                                className="form-control"
                                                value={labTaskForm.subject}
                                                onChange={e => setLabTaskForm({ ...labTaskForm, subject: e.target.value })}
                                                required
                                            >
                                                <option value="">Select a Subject</option>
                                                {subjects.map(s => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Academic Year *</label>
                                            <input
                                                className="form-control"
                                                placeholder="e.g. 4th Year"
                                                value={labTaskForm.academicYear}
                                                onChange={e => setLabTaskForm({ ...labTaskForm, academicYear: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">Branch</label>
                                            <input
                                                className="form-control"
                                                placeholder="e.g. CSE"
                                                value={labTaskForm.branch}
                                                onChange={e => setLabTaskForm({ ...labTaskForm, branch: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Section</label>
                                            <input
                                                className="form-control"
                                                placeholder="e.g. C"
                                                value={labTaskForm.section}
                                                onChange={e => setLabTaskForm({ ...labTaskForm, section: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Task Instructions *</label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            placeholder="Specify input/output requirements, algorithm specifications, and submission criteria..."
                                            value={labTaskForm.instructions}
                                            onChange={e => setLabTaskForm({ ...labTaskForm, instructions: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button className="btn-primary-action" type="submit" disabled={submittingLab}>
                                        {submittingLab ? 'Creating...' : '+ Create Lab Task'}
                                    </button>
                                </form>
                            </div>

                            {/* 2. BELOW: Space followed by Reports of the Students and Faculty with CSV Download */}
                            <div className="faculty-card" style={{ marginBottom: '36px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <h3>📊 Lab Practice Reports & Student Submissions ({labReports.length})</h3>
                                        <p className="card-desc">Review lab experiment attempts, student code submissions, scores, and download performance spreadsheets.</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-primary-action"
                                        onClick={downloadLabReportsCSV}
                                        disabled={!labReports.length}
                                        style={{ padding: '8px 16px', fontSize: '13px' }}
                                    >
                                        📥 Download Lab Reports (CSV)
                                    </button>
                                </div>

                                {loadingReports ? (
                                    <p className="loading-text mt-20">Loading student lab reports...</p>
                                ) : (
                                    <div className="students-table-scroll mt-20">
                                        <table className="students-table">
                                            <thead>
                                                <tr>
                                                    <th>Student</th>
                                                    <th>Branch / Section</th>
                                                    <th>Lab Task</th>
                                                    <th>Assigned Faculty</th>
                                                    <th>Status</th>
                                                    <th>Score</th>
                                                    <th>Feedback</th>
                                                    <th>Submitted Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {labReports.map(report => (
                                                    <tr key={report._id}>
                                                        <td>
                                                            <strong>{report.student?.name || 'Student'}</strong>
                                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{report.student?.email}</div>
                                                        </td>
                                                        <td>{report.student?.branch || 'N/A'} {report.student?.section ? `(Sec ${report.student.section})` : ''}</td>
                                                        <td><strong>{report.task?.title || 'Lab Task'}</strong></td>
                                                        <td>
                                                            <strong>{report.task?.createdBy?.name || report.reviewedBy?.name || 'Faculty'}</strong>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{report.task?.createdBy?.email || report.reviewedBy?.email || ''}</div>
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${report.status || 'submitted'}`}>
                                                                {report.status || 'Submitted'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontWeight: 'bold', color: report.score !== undefined && report.score !== null ? '#10b981' : '#f59e0b' }}>
                                                                {report.score !== undefined && report.score !== null ? `${report.score}/${report.task?.maxScore || 100}` : 'Pending'}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '12px', maxWidth: '200px' }}>
                                                            {report.feedback || <span style={{ color: '#94a3b8' }}>—</span>}
                                                        </td>
                                                        <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                            {report.updatedAt ? new Date(report.updatedAt).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {!labReports.length && (
                                                    <tr>
                                                        <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                                            No student lab submissions recorded yet.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* 3. Active Lab Tasks Overview */}
                            <div className="faculty-card">
                                <h3>🔬 Active Lab Tasks ({labTasks.length})</h3>
                                <p className="card-desc">Hands-on lab experiments currently assigned for practice.</p>

                                {loading ? (
                                    <p className="loading-text mt-20">Loading lab tasks...</p>
                                ) : (
                                    <div className="students-table-scroll mt-20">
                                        <table className="students-table">
                                            <thead>
                                                <tr>
                                                    <th>Task</th>
                                                    <th>Subject</th>
                                                    <th>Year</th>
                                                    <th>Branch / Sec</th>
                                                    <th>Max Score</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {labTasks.map(task => (
                                                    <tr key={task._id}>
                                                        <td><strong>{task.title}</strong></td>
                                                        <td><span className="code-pill">{task.subject?.code || 'Subject'}</span></td>
                                                        <td>{task.academicYear}</td>
                                                        <td>{task.branch || 'All'} {task.section ? `· Sec ${task.section}` : ''}</td>
                                                        <td>{task.maxScore || 100}</td>
                                                        <td><span className="status-badge-active">Active</span></td>
                                                    </tr>
                                                ))}
                                                {!labTasks.length && (
                                                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No lab tasks assigned yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Progress Detail Modal */}
                    {progressLoading && <div className="progress-loading">Loading student progress dossier...</div>}
                    {progress && selectedStudent && (
                        <div className="progress-modal-overlay" onClick={() => setProgress(null)}>
                            <section className="progress-modal" onClick={event => event.stopPropagation()}>
                                <div className="progress-modal-header">
                                    <div>
                                        <h2>{selectedStudent.name}</h2>
                                        <p>{selectedStudent.email} · {selectedStudent.branch || 'Branch N/A'} · Section {selectedStudent.section || 'N/A'}</p>
                                    </div>
                                    <button className="progress-close" type="button" onClick={() => setProgress(null)}>×</button>
                                </div>
                                <div className="progress-summary-grid">
                                    <div><span>Readiness</span><strong>{selectedStudent.readinessScore || 0}%</strong></div>
                                    <div><span>Aptitude Tests</span><strong>{progress.attempts?.length || 0}</strong></div>
                                    <div><span>Coding Submissions</span><strong>{progress.submissions?.length || 0}</strong></div>
                                    <div><span>Projects</span><strong>{progress.projects?.length || 0}</strong></div>
                                    <div><span>Lab Attempts</span><strong>{progress.labAttempts?.length || 0}</strong></div>
                                </div>
                                <div className="progress-columns">
                                    <div>
                                        <h3>Recent Aptitude Tests</h3>
                                        {progress.attempts?.length ? progress.attempts.slice(0, 5).map(attempt => (
                                            <div key={attempt._id} className="attempt-item">
                                                <p><strong>{attempt.test?.title || 'Aptitude Test'}</strong></p>
                                                <span style={{ fontSize: '12px', color: '#38bdf8' }}>Score: {attempt.score}/{attempt.totalQuestions || 20}</span>
                                            </div>
                                        )) : <p className="text-muted">No tests completed.</p>}
                                    </div>
                                    <div>
                                        <h3>Projects Submitted</h3>
                                        {progress.projects?.length ? progress.projects.map(project => (
                                            <div key={project._id} className="attempt-item">
                                                <p><strong>{project.title}</strong></p>
                                                <span style={{ fontSize: '12px', color: project.grade !== null ? '#10b981' : '#f59e0b' }}>
                                                    Grade: {project.grade !== null && project.grade !== undefined ? `${project.grade}/100` : 'Pending review'}
                                                </span>
                                            </div>
                                        )) : <p className="text-muted">No projects submitted.</p>}
                                    </div>
                                    <div>
                                        <h3>Lab Practice Attempts</h3>
                                        {progress.labAttempts?.length ? progress.labAttempts.slice(0, 5).map(attempt => (
                                            <div key={attempt._id} className="attempt-item">
                                                <p><strong>{attempt.task?.title || 'Lab task'}</strong></p>
                                                <span style={{ fontSize: '12px', color: '#10b981' }}>Score: {attempt.score || 100}</span>
                                            </div>
                                        )) : <p className="text-muted">No lab attempts.</p>}
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default FacultyDashboard;
