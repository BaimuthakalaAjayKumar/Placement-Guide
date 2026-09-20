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

    // Subject creation form state
    const [subjectForm, setSubjectForm] = useState({
        name: '',
        code: '',
        academicYear: '',
        branch: '',
        section: '',
        description: ''
    });
    const [submittingSubject, setSubmittingSubject] = useState(false);

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
        }
    }, [activeTab]);

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

    // Subject creation handler
    const handleAddSubject = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg('');
        if (!subjectForm.name || !subjectForm.code || !subjectForm.academicYear) {
            setError('Subject Name, Code, and Academic Year are required.');
            return;
        }

        try {
            setSubmittingSubject(true);
            const res = await axios.post(`${API_URL}/academic/subjects`, subjectForm, getAuthHeaders());
            if (res.data?.success) {
                setSuccessMsg(`Subject "${res.data.data.name}" (${res.data.data.code}) created successfully!`);
                setSubjectForm({ name: '', code: '', academicYear: '', branch: '', section: '', description: '' });
                fetchSubjects();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add academic subject.');
        } finally {
            setSubmittingSubject(false);
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

                    {/* TAB 2: ACADEMIC SUBJECTS (WHERE FACULTY CAN ADD SUBJECTS) */}
                    {activeTab === 'subjects' && (
                        <div className="faculty-split-layout">
                            <div className="faculty-card">
                                <h3>➕ Add New Academic Subject</h3>
                                <p className="card-desc">Configure academic preparation subjects for your assigned academic year and branch.</p>

                                <form className="faculty-form mt-20" onSubmit={handleAddSubject}>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="subjName">Subject Name *</label>
                                        <input
                                            id="subjName"
                                            className="form-control"
                                            placeholder="e.g. Database Management Systems"
                                            value={subjectForm.name}
                                            onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="subjCode">Subject Code *</label>
                                        <input
                                            id="subjCode"
                                            className="form-control"
                                            placeholder="e.g. CS401 or GR22A2069"
                                            value={subjectForm.code}
                                            onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="subjYear">Academic Year *</label>
                                        <input
                                            id="subjYear"
                                            className="form-control"
                                            placeholder="e.g. 4th Year or 2026"
                                            value={subjectForm.academicYear}
                                            onChange={e => setSubjectForm({ ...subjectForm, academicYear: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">Branch (Optional)</label>
                                            <input
                                                className="form-control"
                                                placeholder="e.g. CSE"
                                                value={subjectForm.branch}
                                                onChange={e => setSubjectForm({ ...subjectForm, branch: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Section (Optional)</label>
                                            <input
                                                className="form-control"
                                                placeholder="e.g. C"
                                                value={subjectForm.section}
                                                onChange={e => setSubjectForm({ ...subjectForm, section: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="subjDesc">Description</label>
                                        <textarea
                                            id="subjDesc"
                                            className="form-control"
                                            placeholder="Course objectives, curriculum topics, key outcomes..."
                                            value={subjectForm.description}
                                            onChange={e => setSubjectForm({ ...subjectForm, description: e.target.value })}
                                            rows="3"
                                        />
                                    </div>
                                    <button className="btn-primary-action" type="submit" disabled={submittingSubject}>
                                        {submittingSubject ? 'Creating...' : '+ Create Subject'}
                                    </button>
                                </form>
                            </div>

                            <div className="faculty-card">
                                <h3>📚 Active Academic Subjects ({subjects.length})</h3>
                                <p className="card-desc">Subjects currently registered and available for student practice and lab assignments.</p>

                                {loading ? (
                                    <p className="loading-text">Loading subjects...</p>
                                ) : (
                                    <div className="students-table-scroll mt-20">
                                        <table className="students-table">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Name</th>
                                                    <th>Year</th>
                                                    <th>Branch / Sec</th>
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
                                                        <td><span className="status-badge-active">Active</span></td>
                                                    </tr>
                                                ))}
                                                {!subjects.length && (
                                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No subjects created yet. Use the form on the left to add your first subject!</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
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
                        <div className="faculty-split-layout">
                            <div className="faculty-card">
                                <h3>➕ Create Lab Practice Task</h3>
                                <p className="card-desc">Assign hands-on laboratory programming tasks to students in your scope.</p>

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

                            <div className="faculty-card">
                                <h3>🔬 Active Lab Tasks ({labTasks.length})</h3>
                                <p className="card-desc">Hands-on lab experiments created for student practice.</p>

                                {loading ? (
                                    <p className="loading-text">Loading lab tasks...</p>
                                ) : (
                                    <div className="students-table-scroll mt-20">
                                        <table className="students-table">
                                            <thead>
                                                <tr>
                                                    <th>Task</th>
                                                    <th>Subject</th>
                                                    <th>Year</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {labTasks.map(task => (
                                                    <tr key={task._id}>
                                                        <td><strong>{task.title}</strong></td>
                                                        <td><span className="code-pill">{task.subject?.code || 'Subject'}</span></td>
                                                        <td>{task.academicYear}</td>
                                                        <td><span className="status-badge-active">Active</span></td>
                                                    </tr>
                                                ))}
                                                {!labTasks.length && (
                                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No lab tasks assigned yet.</td></tr>
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
