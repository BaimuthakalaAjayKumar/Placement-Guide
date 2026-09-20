import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import Header from '../components/Header';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('students'); // 'students' | 'subjects' | 'projects' | 'labs'
    const [students, setStudents] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [projects, setProjects] = useState([]);
    const [labTasks, setLabTasks] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');

    // Notes management states
    const [selectedSubjectForNotes, setSelectedSubjectForNotes] = useState(null);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [notesList, setNotesList] = useState([]);
    const [loadingNotes, setLoadingNotes] = useState(false);
    const [noteForm, setNoteForm] = useState({ title: '', description: '', content: '', fileUrl: '' });
    const [submittingNote, setSubmittingNote] = useState(false);

    // Subject Practice Tests states
    const [selectedSubjectForTests, setSelectedSubjectForTests] = useState(null);
    const [showTestsModal, setShowTestsModal] = useState(false);
    const [subjectTests, setSubjectTests] = useState([]);
    const [loadingSubjectTests, setLoadingSubjectTests] = useState(false);
    const [showCreateTestForm, setShowCreateTestForm] = useState(false);
    const [testForm, setTestForm] = useState({ title: '', description: '', duration: 20, questionLimit: 20, difficulty: 'medium' });
    const [creatingTest, setCreatingTest] = useState(false);

    // Test Questions manager states
    const [selectedTestForQuestions, setSelectedTestForQuestions] = useState(null);
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [testQuestions, setTestQuestions] = useState([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [questionForm, setQuestionForm] = useState({
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        difficulty: 'medium',
        explanation: ''
    });
    const [submittingQuestion, setSubmittingQuestion] = useState(false);

    // Subject Student Reports states
    const [selectedSubjectForReports, setSelectedSubjectForReports] = useState(null);
    const [showReportsModal, setShowReportsModal] = useState(false);
    const [subjectReports, setSubjectReports] = useState([]);
    const [loadingSubjectReports, setLoadingSubjectReports] = useState(false);

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
        dueDate: '',
        referenceSolution: '',
        solutionLanguage: 'cpp'
    });
    const [submittingLab, setSubmittingLab] = useState(false);
    const [selectedLabReviewAttempt, setSelectedLabReviewAttempt] = useState(null);

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
        const headers = ['Student Name', 'Email', 'Roll Number', 'Branch', 'Section', 'Academic Year', 'Lab Task Title', 'Assigned Faculty', 'Faculty Email', 'Language', 'Score', 'Max Score', 'Logic Match %', 'Plagiarism %', 'Plagiarism Status', 'Matched Peer', 'Status', 'Feedback', 'Submitted Date'];
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
            `"${(r.language || 'cpp').toUpperCase()}"`,
            r.score ?? 'N/A',
            r.task?.maxScore || 100,
            r.evaluationDetails?.logicMatchPercentage !== undefined ? `${r.evaluationDetails.logicMatchPercentage}%` : 'N/A',
            r.plagiarismPercentage !== undefined ? `${r.plagiarismPercentage}%` : '0%',
            `"${r.plagiarismStatus || 'Original'}"`,
            `"${(r.plagiarizedWith?.studentName || '').replace(/"/g, '""')}"`,
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

    // Notes Modal and Handlers
    const openNotesModal = async (subject) => {
        setSelectedSubjectForNotes(subject);
        setShowNotesModal(true);
        setNoteForm({ title: '', description: '', content: '', fileUrl: '' });
        try {
            setLoadingNotes(true);
            const res = await axios.get(`${API_URL}/academic/subjects/${subject._id}/notes`, getAuthHeaders());
            setNotesList(res.data?.data || subject.notes || []);
        } catch (err) {
            setNotesList(subject.notes || []);
        } finally {
            setLoadingNotes(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteForm.title.trim()) return;
        try {
            setSubmittingNote(true);
            const res = await axios.post(`${API_URL}/academic/subjects/${selectedSubjectForNotes._id}/notes`, noteForm, getAuthHeaders());
            setNotesList(prev => [res.data.data, ...prev]);
            setSubjects(prev => prev.map(s => s._id === selectedSubjectForNotes._id ? { ...s, notes: [res.data.data, ...(s.notes || [])] } : s));
            setNoteForm({ title: '', description: '', content: '', fileUrl: '' });
            setSuccessMsg('Study note added successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add study note.');
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this study note?')) return;
        try {
            await axios.delete(`${API_URL}/academic/subjects/${selectedSubjectForNotes._id}/notes/${noteId}`, getAuthHeaders());
            setNotesList(prev => prev.filter(n => n._id !== noteId));
            setSubjects(prev => prev.map(s => s._id === selectedSubjectForNotes._id ? { ...s, notes: (s.notes || []).filter(n => n._id !== noteId) } : s));
            setSuccessMsg('Note deleted.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete note.');
        }
    };

    // Practice Tests Modal and Handlers
    const openTestsModal = async (subject) => {
        setSelectedSubjectForTests(subject);
        setShowTestsModal(true);
        setShowCreateTestForm(false);
        try {
            setLoadingSubjectTests(true);
            const res = await axios.get(`${API_URL}/tests`, getAuthHeaders());
            const allTests = res.data?.data || [];
            const matched = allTests.filter(t => t.subject === subject._id || (t.subject?._id === subject._id) || (t.title?.toLowerCase().includes(subject.code.toLowerCase())) || (t.title?.toLowerCase().includes(subject.name.toLowerCase())));
            setSubjectTests(matched);
        } catch (err) {
            setError('Failed to fetch tests for this subject.');
        } finally {
            setLoadingSubjectTests(false);
        }
    };

    const handleCreateSubjectTest = async (e) => {
        e.preventDefault();
        try {
            setCreatingTest(true);
            const payload = {
                ...testForm,
                category: 'core-cse',
                subject: selectedSubjectForTests._id,
                academicYear: selectedSubjectForTests.academicYear,
                branch: selectedSubjectForTests.branch,
                section: selectedSubjectForTests.section
            };
            const res = await axios.post(`${API_URL}/tests`, payload, getAuthHeaders());
            setSubjectTests(prev => [res.data.data, ...prev]);
            setShowCreateTestForm(false);
            setTestForm({ title: '', description: '', duration: 20, questionLimit: 20, difficulty: 'medium' });
            setSuccessMsg('Practice test created successfully! Click "Manage Questions" to add questions.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create practice test.');
        } finally {
            setCreatingTest(false);
        }
    };

    // Questions Manager Handlers
    const openQuestionsModal = async (test) => {
        setSelectedTestForQuestions(test);
        setShowQuestionsModal(true);
        setQuestionForm({
            questionText: '',
            options: ['', '', '', ''],
            correctOptionIndex: 0,
            difficulty: 'medium',
            explanation: ''
        });
        try {
            setLoadingQuestions(true);
            const res = await axios.get(`${API_URL}/tests/${test._id}/questions`, getAuthHeaders());
            setTestQuestions(res.data?.data || []);
        } catch (err) {
            setError('Failed to load questions.');
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleAddQuestion = async (e) => {
        e.preventDefault();
        if (!questionForm.questionText.trim() || questionForm.options.some(opt => !opt.trim())) {
            setError('Please provide question text and all 4 options.');
            return;
        }
        try {
            setSubmittingQuestion(true);
            const res = await axios.post(`${API_URL}/tests/${selectedTestForQuestions._id}/questions`, questionForm, getAuthHeaders());
            setTestQuestions(prev => [...prev, res.data.data]);
            setQuestionForm({
                questionText: '',
                options: ['', '', '', ''],
                correctOptionIndex: 0,
                difficulty: 'medium',
                explanation: ''
            });
            setSuccessMsg('Question added successfully.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add question.');
        } finally {
            setSubmittingQuestion(false);
        }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm('Delete this question?')) return;
        try {
            await axios.delete(`${API_URL}/tests/${selectedTestForQuestions._id}/questions/${qId}`, getAuthHeaders());
            setTestQuestions(prev => prev.filter(q => q._id !== qId));
            setSuccessMsg('Question removed.');
        } catch (err) {
            setError('Failed to delete question.');
        }
    };

    // Student Reports Modal and Handlers
    const openReportsModal = async (subject) => {
        setSelectedSubjectForReports(subject);
        setShowReportsModal(true);
        try {
            setLoadingSubjectReports(true);
            const res = await axios.get(`${API_URL}/tests/subject/${subject._id}/reports`, getAuthHeaders());
            setSubjectReports(res.data?.data || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load subject test reports.');
        } finally {
            setLoadingSubjectReports(false);
        }
    };

    const downloadSubjectReportsCSV = () => {
        if (!subjectReports.length) return;
        const headers = ['Student Name', 'Roll Number', 'Email', 'Branch', 'Section', 'Academic Year', 'Test Title', 'Score', 'Total Questions', 'Percentage (%)', 'Status', 'Completed Date'];
        const rows = subjectReports.map(r => [
            `"${(r.student?.name || '').replace(/"/g, '""')}"`,
            `"${(r.student?.rollNumber || '').replace(/"/g, '""')}"`,
            `"${(r.student?.email || '').replace(/"/g, '""')}"`,
            `"${(r.student?.branch || '').replace(/"/g, '""')}"`,
            `"${(r.student?.section || '').replace(/"/g, '""')}"`,
            `"${(r.student?.academicYear || '').replace(/"/g, '""')}"`,
            `"${(r.test?.title || '').replace(/"/g, '""')}"`,
            r.score,
            r.totalQuestions,
            `${r.percentage}%`,
            r.passed ? 'PASSED' : 'NEEDS PRACTICE',
            `"${r.completedAt ? new Date(r.completedAt).toLocaleString() : ''}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        const subjCode = (selectedSubjectForReports?.code || 'Subject').replace(/[^a-zA-Z0-9]/g, '_');
        link.setAttribute('download', `${subjCode}_Student_Test_Reports_${new Date().toISOString().split('T')[0]}.csv`);
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
                setLabTaskForm({
                    title: '',
                    instructions: '',
                    subject: '',
                    academicYear: '',
                    branch: '',
                    section: '',
                    maxScore: 100,
                    dueDate: '',
                    referenceSolution: '',
                    solutionLanguage: 'cpp'
                });
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

                    {/* TAB 2: ACADEMIC SUBJECTS */}
                    {activeTab === 'subjects' && (
                        <div className="faculty-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h3>📚 Registered Academic Preparation Subjects ({subjects.length})</h3>
                                    <p className="card-desc">Curriculum preparation subjects assigned to your academic scope. Add notes, create subject practice tests, and download student reports.</p>
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
                                                <th>Study Notes</th>
                                                <th>Subject Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjects.map(s => (
                                                <tr key={s._id}>
                                                    <td><span className="code-pill">{s.code}</span></td>
                                                    <td><strong>{s.name}</strong></td>
                                                    <td>{s.academicYear}</td>
                                                    <td>{s.branch || 'All'} {s.section ? `· Sec ${s.section}` : ''}</td>
                                                    <td>
                                                        <span style={{ fontSize: '12px', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                                                            📄 {s.notes?.length || 0} Notes
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="subject-actions-cell">
                                                            <button
                                                                type="button"
                                                                className="btn-subject-action btn-action-notes"
                                                                onClick={() => openNotesModal(s)}
                                                                title="Add and view study notes for this subject"
                                                            >
                                                                📝 Notes & Materials
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-subject-action btn-action-tests"
                                                                onClick={() => openTestsModal(s)}
                                                                title="Create practice tests and manage questions"
                                                            >
                                                                🧪 Practice Tests
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-subject-action btn-action-reports"
                                                                onClick={() => openReportsModal(s)}
                                                                title="View and download student test reports"
                                                            >
                                                                📥 Student Reports
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {!subjects.length && (
                                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No academic subjects registered in your scope yet.</td></tr>
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
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label">Reference Solution Language *</label>
                                            <select
                                                className="form-control"
                                                value={labTaskForm.solutionLanguage}
                                                onChange={e => setLabTaskForm({ ...labTaskForm, solutionLanguage: e.target.value })}
                                                required
                                            >
                                                <option value="cpp">C++ (Standard STL & Systems)</option>
                                                <option value="java">Java (OOP & Collections)</option>
                                                <option value="python">Python 3 (Scripting & Algorithms)</option>
                                                <option value="c">C (Procedural & Systems)</option>
                                                <option value="javascript">JavaScript (Node.js)</option>
                                                <option value="sql">SQL (Relational Schema & Queries)</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Max Score</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                min="1"
                                                max="1000"
                                                value={labTaskForm.maxScore}
                                                onChange={e => setLabTaskForm({ ...labTaskForm, maxScore: Number(e.target.value) || 100 })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label className="form-label" style={{ margin: 0 }}>Default Faculty Solution / Reference Answer *</label>
                                            <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '4px' }}>
                                                ⚡ AST Normalized • Variable names can differ
                                            </span>
                                        </div>
                                        <textarea
                                            className="form-control"
                                            rows="7"
                                            style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px', background: 'rgba(15, 23, 42, 0.6)' }}
                                            placeholder="Enter the reference answer code here. Student submissions in the IDE will be matched against this solution, automatically normalizing variable names and control-flow..."
                                            value={labTaskForm.referenceSolution}
                                            onChange={e => setLabTaskForm({ ...labTaskForm, referenceSolution: e.target.value })}
                                            required
                                        />
                                        <small style={{ color: '#94a3b8', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                                            💡 Students write their code in an interactive IDE in their choice of language. Variable names are automatically normalized during evaluation so different naming does not affect their score.
                                        </small>
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
                                                    <th>Language</th>
                                                    <th>Score & Match</th>
                                                    <th>Plagiarism Check</th>
                                                    <th>Status</th>
                                                    <th>Submitted Date</th>
                                                    <th style={{ textAlign: 'right' }}>Review</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {labReports.map(report => (
                                                    <tr key={report._id}>
                                                        <td>
                                                            <strong>{report.student?.name || 'Student'}</strong>
                                                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{report.student?.email}</div>
                                                            {report.student?.rollNumber && (
                                                                <div style={{ fontSize: '11px', color: '#818cf8' }}>Roll: {report.student.rollNumber}</div>
                                                            )}
                                                        </td>
                                                        <td>{report.student?.branch || 'N/A'} {report.student?.section ? `(Sec ${report.student.section})` : ''}</td>
                                                        <td><strong>{report.task?.title || 'Lab Task'}</strong></td>
                                                        <td>
                                                            <strong>{report.task?.createdBy?.name || report.reviewedBy?.name || 'Faculty'}</strong>
                                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{report.task?.createdBy?.email || report.reviewedBy?.email || ''}</div>
                                                        </td>
                                                        <td>
                                                            <span className="status-pill submitted" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                                                                {report.language || report.task?.solutionLanguage || 'cpp'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span style={{ fontWeight: 'bold', color: report.score !== undefined && report.score !== null ? '#10b981' : '#f59e0b' }}>
                                                                {report.score !== undefined && report.score !== null ? `${report.score}/${report.task?.maxScore || 100}` : 'Pending'}
                                                            </span>
                                                            {report.evaluationDetails?.logicMatchPercentage !== undefined && (
                                                                <div style={{ fontSize: '11px', color: '#38bdf8' }}>Match: {report.evaluationDetails.logicMatchPercentage}%</div>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {report.plagiarismPercentage > 40 ? (
                                                                <div>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 700, fontSize: '11px' }}>
                                                                        🚨 {report.plagiarismPercentage}% Flagged
                                                                    </span>
                                                                    {report.plagiarizedWith?.studentName && (
                                                                        <div style={{ fontSize: '10.5px', color: '#fca5a5', marginTop: '2px' }}>Peer: {report.plagiarizedWith.studentName}</div>
                                                                    )}
                                                                </div>
                                                            ) : report.plagiarismPercentage > 15 ? (
                                                                <div>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', fontWeight: 600, fontSize: '11px' }}>
                                                                        ⚠️ {report.plagiarismPercentage}% Moderate
                                                                    </span>
                                                                    {report.plagiarizedWith?.studentName && (
                                                                        <div style={{ fontSize: '10.5px', color: '#fde047', marginTop: '2px' }}>Peer: {report.plagiarizedWith.studentName}</div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '11px' }}>
                                                                    ✅ {report.plagiarismPercentage || 0}% Original
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${report.status || 'submitted'}`}>
                                                                {report.status || 'Submitted'}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                            {report.updatedAt ? new Date(report.updatedAt).toLocaleDateString() : 'N/A'}
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <button
                                                                type="button"
                                                                className="btn-secondary-action"
                                                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                                                onClick={() => setSelectedLabReviewAttempt(report)}
                                                            >
                                                                👁️ Review
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {!labReports.length && (
                                                    <tr>
                                                        <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
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

                    {/* 1. STUDY NOTES & MATERIALS MODAL */}
                    {showNotesModal && selectedSubjectForNotes && (
                        <div className="progress-modal-overlay" onClick={() => setShowNotesModal(false)}>
                            <section className="progress-modal modal-wide" onClick={e => e.stopPropagation()}>
                                <div className="progress-modal-header">
                                    <div>
                                        <h2>📝 Study Notes & Materials: {selectedSubjectForNotes.name}</h2>
                                        <p><span className="code-pill">{selectedSubjectForNotes.code}</span> · {selectedSubjectForNotes.academicYear} · {selectedSubjectForNotes.branch || 'All Branches'} {selectedSubjectForNotes.section ? `(Sec ${selectedSubjectForNotes.section})` : ''}</p>
                                    </div>
                                    <button className="progress-close" type="button" onClick={() => setShowNotesModal(false)}>×</button>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    {/* Add Note Form */}
                                    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '18px', marginBottom: '24px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', color: '#60a5fa', fontSize: '15px' }}>➕ Upload New Study Material / Revision Notes</h4>
                                        <form onSubmit={handleAddNote}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Note / Chapter Title *</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="e.g. Unit 3: Normalization & BCNF Notes"
                                                        value={noteForm.title}
                                                        onChange={e => setNoteForm({ ...noteForm, title: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Short Description / Topics</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="e.g. 1NF, 2NF, 3NF, BCNF, Dependency Preservation"
                                                        value={noteForm.description}
                                                        onChange={e => setNoteForm({ ...noteForm, description: e.target.value })}
                                                    />
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Reference File / Document Link (Google Drive, PDF, GitHub URL)</label>
                                                    <input
                                                        type="url"
                                                        className="form-control"
                                                        placeholder="https://drive.google.com/... or https://github.com/..."
                                                        value={noteForm.fileUrl}
                                                        onChange={e => setNoteForm({ ...noteForm, fileUrl: e.target.value })}
                                                    />
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Detailed Revision Notes / Key Points (Optional Text / Markdown)</label>
                                                    <textarea
                                                        className="form-control"
                                                        rows={4}
                                                        placeholder="Type or paste comprehensive study notes, key formulas, interview cheat sheets..."
                                                        value={noteForm.content}
                                                        onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={submittingNote || !noteForm.title.trim()}
                                                style={{ minWidth: '160px' }}
                                            >
                                                {submittingNote ? 'Uploading Note...' : '📤 Post Study Material'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Existing Notes List */}
                                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Available Subject Study Materials ({notesList.length})</h4>
                                    {loadingNotes ? (
                                        <p className="loading-text">Loading notes...</p>
                                    ) : notesList.length > 0 ? (
                                        <div>
                                            {notesList.map((note) => (
                                                <div key={note._id} className="note-card-item">
                                                    <div className="note-card-header">
                                                        <div>
                                                            <h5 className="note-card-title">{note.title}</h5>
                                                            <div className="note-meta-line">
                                                                Uploaded by <strong>{note.uploaderName || 'Faculty'}</strong> ({note.uploaderRole || 'instructor'}) · {new Date(note.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '4px 8px', fontSize: '12px' }}
                                                            onClick={() => handleDeleteNote(note._id)}
                                                            title="Delete this note"
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </div>
                                                    {note.description && (
                                                        <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#cbd5e1' }}>{note.description}</p>
                                                    )}
                                                    {note.content && (
                                                        <div className="note-content-box">{note.content}</div>
                                                    )}
                                                    {note.fileUrl && (
                                                        <div style={{ marginTop: '8px' }}>
                                                            <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" className="note-file-link">
                                                                🔗 Open Study Resource / Attachment ↗
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                                            No study notes uploaded for this subject yet. Be the first to share revision materials!
                                        </p>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* 2. PRACTICE TESTS MODAL */}
                    {showTestsModal && selectedSubjectForTests && (
                        <div className="progress-modal-overlay" onClick={() => setShowTestsModal(false)}>
                            <section className="progress-modal modal-wide" onClick={e => e.stopPropagation()}>
                                <div className="progress-modal-header">
                                    <div>
                                        <h2>🧪 Practice Tests: {selectedSubjectForTests.name}</h2>
                                        <p><span className="code-pill">{selectedSubjectForTests.code}</span> · {selectedSubjectForTests.academicYear} · {selectedSubjectForTests.branch || 'All'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setShowCreateTestForm(!showCreateTestForm)}
                                        >
                                            {showCreateTestForm ? 'Cancel' : '➕ Create Practice Test'}
                                        </button>
                                        <button className="progress-close" type="button" onClick={() => setShowTestsModal(false)}>×</button>
                                    </div>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    {/* Create Test Inline Form */}
                                    {showCreateTestForm && (
                                        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '18px', marginBottom: '20px' }}>
                                            <h4 style={{ margin: '0 0 12px 0', color: '#c084fc', fontSize: '15px' }}>Create New Subject Practice Test</h4>
                                            <form onSubmit={handleCreateSubjectTest}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Test Title *</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder={`e.g. ${selectedSubjectForTests.code} Unit 1 Assessment`}
                                                            value={testForm.title}
                                                            onChange={e => setTestForm({ ...testForm, title: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Duration (Minutes) *</label>
                                                        <input
                                                            type="number"
                                                            min={5}
                                                            max={180}
                                                            className="form-control"
                                                            value={testForm.duration}
                                                            onChange={e => setTestForm({ ...testForm, duration: Number(e.target.value) })}
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Difficulty</label>
                                                        <select
                                                            className="form-control"
                                                            value={testForm.difficulty}
                                                            onChange={e => setTestForm({ ...testForm, difficulty: e.target.value })}
                                                        >
                                                            <option value="easy">Easy</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="hard">Hard</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Question Limit</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={100}
                                                            className="form-control"
                                                            value={testForm.questionLimit}
                                                            onChange={e => setTestForm({ ...testForm, questionLimit: Number(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Test Description / Syllabus</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="Topics covered in this test..."
                                                            value={testForm.description}
                                                            onChange={e => setTestForm({ ...testForm, description: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary"
                                                    disabled={creatingTest || !testForm.title.trim()}
                                                >
                                                    {creatingTest ? 'Creating Test...' : 'Save & Proceed to Questions'}
                                                </button>
                                            </form>
                                        </div>
                                    )}

                                    {/* Test List */}
                                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Subject Tests ({subjectTests.length})</h4>
                                    {loadingSubjectTests ? (
                                        <p className="loading-text">Loading tests...</p>
                                    ) : subjectTests.length > 0 ? (
                                        <div className="students-table-scroll">
                                            <table className="students-table">
                                                <thead>
                                                    <tr>
                                                        <th>Test Title</th>
                                                        <th>Questions</th>
                                                        <th>Duration</th>
                                                        <th>Difficulty</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjectTests.map(t => (
                                                        <tr key={t._id}>
                                                            <td>
                                                                <strong>{t.title}</strong>
                                                                {t.description && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{t.description}</div>}
                                                            </td>
                                                            <td><span className="code-pill">{t.questionCount || t.questions?.length || 0} Qs</span></td>
                                                            <td>{t.duration} mins</td>
                                                            <td><span style={{ textTransform: 'capitalize', color: t.difficulty === 'hard' ? '#ef4444' : t.difficulty === 'medium' ? '#f59e0b' : '#10b981' }}>{t.difficulty || 'medium'}</span></td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="btn-subject-action btn-action-tests"
                                                                    onClick={() => openQuestionsModal(t)}
                                                                >
                                                                    ❓ Manage Questions ({t.questionCount || t.questions?.length || 0})
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                                            No practice tests created for this subject yet. Click "+ Create Practice Test" above to set one up!
                                        </p>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* 3. TEST QUESTIONS MANAGER MODAL */}
                    {showQuestionsModal && selectedTestForQuestions && (
                        <div className="progress-modal-overlay" onClick={() => setShowQuestionsModal(false)}>
                            <section className="progress-modal modal-wide" onClick={e => e.stopPropagation()}>
                                <div className="progress-modal-header">
                                    <div>
                                        <h2>❓ Test Questions: {selectedTestForQuestions.title}</h2>
                                        <p>Add and configure multiple-choice questions (MCQs), options, correct answers, and explanations.</p>
                                    </div>
                                    <button className="progress-close" type="button" onClick={() => setShowQuestionsModal(false)}>×</button>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    {/* Add Question Form */}
                                    <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '18px', marginBottom: '24px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', color: '#c084fc', fontSize: '15px' }}>➕ Add MCQ Question</h4>
                                        <form onSubmit={handleAddQuestion}>
                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Question Text *</label>
                                                <textarea
                                                    className="form-control"
                                                    rows={3}
                                                    placeholder="Type the question prompt..."
                                                    value={questionForm.questionText}
                                                    onChange={e => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                                {[0, 1, 2, 3].map(idx => (
                                                    <div key={idx}>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
                                                            Option {String.fromCharCode(65 + idx)} * {questionForm.correctOptionIndex === idx ? '✅ (Correct Choice)' : ''}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                                                            value={questionForm.options[idx] || ''}
                                                            onChange={e => {
                                                                const opts = [...questionForm.options];
                                                                opts[idx] = e.target.value;
                                                                setQuestionForm({ ...questionForm, options: opts });
                                                            }}
                                                            required
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Correct Option *</label>
                                                    <select
                                                        className="form-control"
                                                        value={questionForm.correctOptionIndex}
                                                        onChange={e => setQuestionForm({ ...questionForm, correctOptionIndex: Number(e.target.value) })}
                                                    >
                                                        <option value={0}>Option A</option>
                                                        <option value={1}>Option B</option>
                                                        <option value={2}>Option C</option>
                                                        <option value={3}>Option D</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Difficulty</label>
                                                    <select
                                                        className="form-control"
                                                        value={questionForm.difficulty}
                                                        onChange={e => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                                                    >
                                                        <option value="easy">Easy</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="hard">Hard</option>
                                                    </select>
                                                </div>
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Explanation / Solution Step (Optional)</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Explain why this option is correct to help students learn..."
                                                        value={questionForm.explanation}
                                                        onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={submittingQuestion}
                                            >
                                                {submittingQuestion ? 'Saving Question...' : '💾 Save Question'}
                                            </button>
                                        </form>
                                    </div>

                                    {/* Questions List */}
                                    <h4 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Current Questions ({testQuestions.length})</h4>
                                    {loadingQuestions ? (
                                        <p className="loading-text">Loading questions...</p>
                                    ) : testQuestions.length > 0 ? (
                                        <div>
                                            {testQuestions.map((q, qIndex) => (
                                                <div key={q._id || qIndex} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', marginBottom: '14px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                                        <strong style={{ color: '#f8fafc', fontSize: '14px' }}>Q{qIndex + 1}. {q.questionText}</strong>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '2px 8px', fontSize: '12px' }}
                                                            onClick={() => handleDeleteQuestion(q._id)}
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                                        {q.options?.map((opt, oIdx) => (
                                                            <div
                                                                key={oIdx}
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '13px',
                                                                    background: oIdx === q.correctOptionIndex ? 'rgba(16, 185, 129, 0.15)' : '#0f172a',
                                                                    border: oIdx === q.correctOptionIndex ? '1px solid #10b981' : '1px solid #334155',
                                                                    color: oIdx === q.correctOptionIndex ? '#34d399' : '#cbd5e1'
                                                                }}
                                                            >
                                                                <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt} {oIdx === q.correctOptionIndex ? ' ✓' : ''}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {q.explanation && (
                                                        <div style={{ fontSize: '12px', color: '#94a3b8', background: '#0f172a', padding: '8px', borderRadius: '6px' }}>
                                                            💡 <strong>Explanation:</strong> {q.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                                            No questions added yet. Use the form above to add questions to this test.
                                        </p>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* 4. STUDENT TEST REPORTS & CSV MODAL */}
                    {showReportsModal && selectedSubjectForReports && (
                        <div className="progress-modal-overlay" onClick={() => setShowReportsModal(false)}>
                            <section className="progress-modal modal-wide" onClick={e => e.stopPropagation()}>
                                <div className="progress-modal-header">
                                    <div>
                                        <h2>📊 Student Test Reports: {selectedSubjectForReports.name}</h2>
                                        <p><span className="code-pill">{selectedSubjectForReports.code}</span> · {selectedSubjectForReports.academicYear} · {selectedSubjectForReports.branch || 'All'}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            style={{ background: '#10b981', borderColor: '#059669', color: '#ffffff' }}
                                            onClick={downloadSubjectReportsCSV}
                                            disabled={!subjectReports.length}
                                        >
                                            📥 Download Report (CSV)
                                        </button>
                                        <button className="progress-close" type="button" onClick={() => setShowReportsModal(false)}>×</button>
                                    </div>
                                </div>

                                <div style={{ marginTop: '20px' }}>
                                    <div className="progress-summary-grid">
                                        <div><span>Total Attempts</span><strong>{subjectReports.length}</strong></div>
                                        <div><span>Unique Students</span><strong>{new Set(subjectReports.map(r => r.student?.id || r.student?.email)).size}</strong></div>
                                        <div><span>Passed (&gt;=50%)</span><strong style={{ color: '#10b981' }}>{subjectReports.filter(r => r.passed).length}</strong></div>
                                        <div><span>Needs Practice</span><strong style={{ color: '#ef4444' }}>{subjectReports.filter(r => !r.passed).length}</strong></div>
                                        <div>
                                            <span>Average Score</span>
                                            <strong>{subjectReports.length ? Math.round(subjectReports.reduce((acc, r) => acc + (r.percentage || 0), 0) / subjectReports.length) : 0}%</strong>
                                        </div>
                                    </div>

                                    {loadingSubjectReports ? (
                                        <p className="loading-text">Loading student test records...</p>
                                    ) : subjectReports.length > 0 ? (
                                        <div className="students-table-scroll">
                                            <table className="students-table">
                                                <thead>
                                                    <tr>
                                                        <th>Student</th>
                                                        <th>Roll Number</th>
                                                        <th>Branch / Sec</th>
                                                        <th>Test Title</th>
                                                        <th>Score</th>
                                                        <th>Percentage</th>
                                                        <th>Status</th>
                                                        <th>Attempted On</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {subjectReports.map((report) => (
                                                        <tr key={report._id}>
                                                            <td>
                                                                <strong>{report.student?.name}</strong>
                                                                <div style={{ fontSize: '12px', color: '#94a3b8' }}>{report.student?.email}</div>
                                                            </td>
                                                            <td><span className="code-pill">{report.student?.rollNumber || 'N/A'}</span></td>
                                                            <td>{report.student?.branch || 'N/A'} {report.student?.section ? `· Sec ${report.student?.section}` : ''}</td>
                                                            <td>{report.test?.title || 'Practice Test'}</td>
                                                            <td><strong>{report.score}</strong> / {report.totalQuestions}</td>
                                                            <td>
                                                                <span className={`score-badge ${report.percentage >= 70 ? 'high' : report.percentage >= 50 ? 'medium' : 'low'}`}>
                                                                    {report.percentage}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {report.passed ? (
                                                                    <span style={{ color: '#10b981', fontWeight: 600, fontSize: '12px' }}>PASSED</span>
                                                                ) : (
                                                                    <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '12px' }}>RETAKE NEEDED</span>
                                                                )}
                                                            </td>
                                                            <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                {report.completedAt ? new Date(report.completedAt).toLocaleDateString() : 'N/A'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                                            <p style={{ margin: 0, fontSize: '15px' }}>No students have attempted tests for this subject yet.</p>
                                            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>When students in this academic year take the practice tests, their live performance will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
            {/* LAB REPORT & PLAGIARISM REVIEW MODAL */}
            {selectedLabReviewAttempt && (
                <div className="progress-modal-overlay" onClick={() => setSelectedLabReviewAttempt(null)}>
                    <div className="progress-modal" style={{ width: 'min(960px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="progress-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>🔬 Lab Submission Review & Plagiarism Audit</h2>
                                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                                    {selectedLabReviewAttempt.student?.name} ({selectedLabReviewAttempt.student?.rollNumber || 'N/A'}) · {selectedLabReviewAttempt.task?.title}
                                </p>
                            </div>
                            <button className="progress-close" type="button" onClick={() => setSelectedLabReviewAttempt(null)}>×</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px 0 10px' }}>
                            {/* Plagiarism Alert Banner */}
                            {selectedLabReviewAttempt.plagiarismPercentage > 40 ? (
                                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <span style={{ fontSize: '24px' }}>🚨</span>
                                    <div>
                                        <strong style={{ color: '#f87171' }}>High Plagiarism Detected: {selectedLabReviewAttempt.plagiarismPercentage}% Similarity</strong>
                                        <p style={{ margin: '4px 0 0', color: '#e2e8f0', fontSize: '13px' }}>
                                            This submission matched significantly with peer student <strong>{selectedLabReviewAttempt.plagiarizedWith?.studentName || 'a registered student'}</strong>.
                                        </p>
                                    </div>
                                </div>
                            ) : selectedLabReviewAttempt.plagiarismPercentage > 15 ? (
                                <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', padding: '12px 16px' }}>
                                    <strong style={{ color: '#fbbf24' }}>⚠️ Moderate Structural Similarity: {selectedLabReviewAttempt.plagiarismPercentage}%</strong>
                                    <span style={{ fontSize: '13px', color: '#cbd5e1', marginLeft: '8px' }}>Matched logic with peer {selectedLabReviewAttempt.plagiarizedWith?.studentName || ''}.</span>
                                </div>
                            ) : (
                                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px 16px', color: '#34d399', fontSize: '13px' }}>
                                    ✅ <strong>Verified Original Submission</strong> ({selectedLabReviewAttempt.plagiarismPercentage || 0}% peer similarity).
                                </div>
                            )}

                            {/* Evaluation Summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Evaluation Score:</span>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{selectedLabReviewAttempt.score ?? 0} / {selectedLabReviewAttempt.task?.maxScore || 100}</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Logic Match %:</span>
                                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>{selectedLabReviewAttempt.evaluationDetails?.logicMatchPercentage ?? 100}%</div>
                                </div>
                                <div>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Student Language:</span>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase' }}>{selectedLabReviewAttempt.language || 'cpp'}</div>
                                </div>
                            </div>

                            {selectedLabReviewAttempt.feedback && (
                                <div style={{ fontSize: '13px', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '6px' }}>
                                    <strong>Evaluation Remarks:</strong> {selectedLabReviewAttempt.feedback}
                                </div>
                            )}

                            {/* Code Viewer */}
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>
                                    💻 Student Submitted Code ({(selectedLabReviewAttempt.language || 'cpp').toUpperCase()})
                                </label>
                                <pre style={{
                                    background: '#090d16',
                                    color: '#e2e8f0',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontFamily: 'Consolas, Monaco, monospace',
                                    maxHeight: '280px',
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                    {selectedLabReviewAttempt.code || selectedLabReviewAttempt.submission || '// No code content recorded'}
                                </pre>
                            </div>

                            {selectedLabReviewAttempt.task?.referenceSolution && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontWeight: 600, fontSize: '13px', color: '#fbbf24' }}>
                                            🎯 Faculty Reference Solution ({(selectedLabReviewAttempt.task?.solutionLanguage || 'cpp').toUpperCase()})
                                        </label>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Variables normalized during evaluation</span>
                                    </div>
                                    <pre style={{
                                        background: '#0f172a',
                                        color: '#cbd5e1',
                                        padding: '16px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontFamily: 'Consolas, Monaco, monospace',
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        border: '1px solid rgba(251, 191, 36, 0.2)'
                                    }}>
                                        {selectedLabReviewAttempt.task.referenceSolution}
                                    </pre>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 0 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <button className="btn btn-secondary" onClick={() => setSelectedLabReviewAttempt(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
            </div>
            </div>
        </>
    );
};

export default FacultyDashboard;
