import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import Header from '../components/Header';
import './FacultyDashboard.css';

const LAB_LANGUAGES = [
    { key: 'cpp', label: 'C++', icon: '💻', ext: '.cpp', placeholder: '// C++ Reference Solution\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Code here\n    return 0;\n}' },
    { key: 'java', label: 'Java', icon: '☕', ext: '.java', placeholder: '// Java Reference Solution\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Code here\n    }\n}' },
    { key: 'python', label: 'Python 3', icon: '🐍', ext: '.py', placeholder: '# Python 3 Reference Solution\ndef solve():\n    pass\n\nif __name__ == "__main__":\n    solve()' },
    { key: 'c', label: 'C', icon: '⚙️', ext: '.c', placeholder: '// C Reference Solution\n#include <stdio.h>\n\nint main() {\n    // Code here\n    return 0;\n}' },
    { key: 'javascript', label: 'JavaScript', icon: '🟨', ext: '.js', placeholder: '// JavaScript Reference Solution\nfunction solve() {\n    // Code here\n}\nsolve();' },
    { key: 'sql', label: 'SQL', icon: '🗄️', ext: '.sql', placeholder: '-- SQL Reference Schema & Queries\nCREATE DATABASE IF NOT EXISTS StudentManagement;\nUSE StudentManagement;\n\nCREATE TABLE Students (\n    student_id INT PRIMARY KEY,\n    name VARCHAR(100) NOT NULL\n);' },
];

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
    const [subjectWorkspace, setSubjectWorkspace] = useState(null); // { subject, activeView: 'notes' | 'tests' | 'reports' }
    const [notePdfFile, setNotePdfFile] = useState(null);
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
        solutionLanguage: 'cpp',
        referenceSolutions: {
            cpp: '',
            java: '',
            python: '',
            c: '',
            javascript: '',
            sql: ''
        }
    });
    const [activeSolutionLangTab, setActiveSolutionLangTab] = useState('cpp');
    const [reviewRefLangTab, setReviewRefLangTab] = useState('cpp');
    const [submittingLab, setSubmittingLab] = useState(false);
    const [selectedLabReviewAttempt, setSelectedLabReviewAttempt] = useState(null);

    // Edit Lab Task states
    const [editingLabTask, setEditingLabTask] = useState(null);
    const [editLabTaskForm, setEditLabTaskForm] = useState({
        title: '',
        instructions: '',
        subject: '',
        academicYear: '',
        branch: '',
        section: '',
        maxScore: 100,
        referenceSolutions: {
            cpp: '',
            java: '',
            python: '',
            c: '',
            javascript: '',
            sql: ''
        }
    });
    const [activeEditLangTab, setActiveEditLangTab] = useState('cpp');
    const [savingEditLab, setSavingEditLab] = useState(false);

    // Records & Academic Repository states
    const [repoSubTab, setRepoSubTab] = useState('labs'); // 'labs' | 'tests' | 'notes'
    const [repoSearch, setRepoSearch] = useState('');
    const [repoSubjectFilter, setRepoSubjectFilter] = useState('all');
    const [repoTests, setRepoTests] = useState([]);
    const [loadingRepoTests, setLoadingRepoTests] = useState(false);
    const [previewSolutionsTask, setPreviewSolutionsTask] = useState(null);
    const [previewLangTab, setPreviewLangTab] = useState('cpp');
    const [copiedLang, setCopiedLang] = useState(false);

    const handleCopyReferenceCode = (code) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedLang(true);
        setTimeout(() => setCopiedLang(false), 2000);
    };

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
        } else if (activeTab === 'repository') {
            fetchLabTasks();
            fetchSubjects();
            fetchRepoTests();
        }
    }, [activeTab]);

    const fetchRepoTests = async () => {
        try {
            setLoadingRepoTests(true);
            const res = await axios.get(`${API_URL}/tests`, getAuthHeaders());
            setRepoTests(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load repo tests:', err);
        } finally {
            setLoadingRepoTests(false);
        }
    };

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

    // Notes Management and Handlers
    const openNotesModal = async (subject) => {
        setSelectedSubjectForNotes(subject);
        setSubjectWorkspace({ subject, activeView: 'notes' });
        setShowNotesModal(false);
        setNoteForm({ title: '', description: '', content: '', fileUrl: '' });
        setNotePdfFile(null);
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
        const currentSubject = subjectWorkspace?.subject || selectedSubjectForNotes;
        if (!currentSubject) return;

        try {
            setSubmittingNote(true);
            let res;
            if (notePdfFile) {
                const formData = new FormData();
                formData.append('title', noteForm.title);
                formData.append('description', noteForm.description || '');
                formData.append('content', noteForm.content || '');
                formData.append('fileUrl', noteForm.fileUrl || '');
                formData.append('pdfFile', notePdfFile);

                res = await axios.post(`${API_URL}/academic/subjects/${currentSubject._id}/notes`, formData, {
                    headers: {
                        ...getAuthHeaders().headers,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                res = await axios.post(`${API_URL}/academic/subjects/${currentSubject._id}/notes`, noteForm, getAuthHeaders());
            }

            setNotesList(prev => [res.data.data, ...prev]);
            setSubjects(prev => prev.map(s => s._id === currentSubject._id ? { ...s, notes: [res.data.data, ...(s.notes || [])] } : s));
            setNoteForm({ title: '', description: '', content: '', fileUrl: '' });
            setNotePdfFile(null);
            setSuccessMsg('Study note & document posted successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add study note.');
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        const currentSubject = subjectWorkspace?.subject || selectedSubjectForNotes;
        if (!currentSubject) return;
        if (!window.confirm('Are you sure you want to delete this study note?')) return;
        try {
            await axios.delete(`${API_URL}/academic/subjects/${currentSubject._id}/notes/${noteId}`, getAuthHeaders());
            setNotesList(prev => prev.filter(n => n._id !== noteId));
            setSubjects(prev => prev.map(s => s._id === currentSubject._id ? { ...s, notes: (s.notes || []).filter(n => n._id !== noteId) } : s));
            setSuccessMsg('Note deleted.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete note.');
        }
    };

    // Practice Tests Modal and Handlers
    const openTestsModal = async (subject) => {
        setSelectedSubjectForTests(subject);
        setSubjectWorkspace({ subject, activeView: 'tests' });
        setShowTestsModal(false);
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
        const currentSubject = subjectWorkspace?.subject || selectedSubjectForTests;
        if (!currentSubject) return;
        try {
            setCreatingTest(true);
            const payload = {
                ...testForm,
                category: 'core-cse',
                subject: currentSubject._id,
                academicYear: currentSubject.academicYear,
                branch: currentSubject.branch,
                section: currentSubject.section
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
        setSubjectWorkspace({ subject, activeView: 'reports' });
        setShowReportsModal(false);
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

        const hasAnyRef = Object.values(labTaskForm.referenceSolutions || {}).some(code => (code || '').trim().length > 0) || (labTaskForm.referenceSolution || '').trim().length > 0;
        if (!hasAnyRef) {
            setError('Please enter at least one default reference solution (in C++, Java, Python, SQL, etc.) so student code can be evaluated.');
            return;
        }

        try {
            setSubmittingLab(true);
            const primaryRef = labTaskForm.referenceSolutions?.[activeSolutionLangTab] || Object.values(labTaskForm.referenceSolutions || {}).find(v => (v || '').trim()) || labTaskForm.referenceSolution || '';
            const payload = {
                ...labTaskForm,
                referenceSolution: primaryRef,
                solutionLanguage: activeSolutionLangTab
            };
            const res = await axios.post(`${API_URL}/labs/tasks`, payload, getAuthHeaders());
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
                    solutionLanguage: 'cpp',
                    referenceSolutions: {
                        cpp: '',
                        java: '',
                        python: '',
                        c: '',
                        javascript: '',
                        sql: ''
                    }
                });
                setActiveSolutionLangTab('cpp');
                fetchLabTasks();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create lab task.');
        } finally {
            setSubmittingLab(false);
        }
    };

    // Lab task edit & delete handlers
    const handleStartEditLab = (task) => {
        setPreviewSolutionsTask(null);
        const existingRefSols = {
            cpp: task.referenceSolutions?.cpp || (task.solutionLanguage === 'cpp' ? task.referenceSolution : '') || '',
            java: task.referenceSolutions?.java || (task.solutionLanguage === 'java' ? task.referenceSolution : '') || '',
            python: task.referenceSolutions?.python || (task.solutionLanguage === 'python' ? task.referenceSolution : '') || '',
            c: task.referenceSolutions?.c || (task.solutionLanguage === 'c' ? task.referenceSolution : '') || '',
            javascript: task.referenceSolutions?.javascript || (task.solutionLanguage === 'javascript' ? task.referenceSolution : '') || '',
            sql: task.referenceSolutions?.sql || (task.solutionLanguage === 'sql' ? task.referenceSolution : '') || ''
        };
        setEditLabTaskForm({
            title: task.title || '',
            instructions: task.instructions || '',
            subject: task.subject?._id || task.subject || '',
            academicYear: task.academicYear || '',
            branch: task.branch || '',
            section: task.section || '',
            maxScore: task.maxScore || 100,
            referenceSolutions: existingRefSols
        });
        const firstFilled = Object.keys(existingRefSols).find(k => existingRefSols[k]?.trim());
        setActiveEditLangTab(firstFilled || task.solutionLanguage || 'cpp');
        setEditingLabTask(task);
    };

    const handleSaveEditLab = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!editingLabTask) return;
        try {
            setSavingEditLab(true);
            const primaryRef = editLabTaskForm.referenceSolutions?.[activeEditLangTab] || Object.values(editLabTaskForm.referenceSolutions || {}).find(v => (v || '').trim()) || '';
            const payload = {
                ...editLabTaskForm,
                referenceSolution: primaryRef,
                solutionLanguage: activeEditLangTab
            };
            const res = await axios.put(`${API_URL}/labs/tasks/${editingLabTask._id}`, payload, getAuthHeaders());
            if (res.data?.success) {
                setSuccessMsg(`Lab Task "${res.data.data.title}" updated successfully!`);
                setLabTasks(prev => prev.map(t => t._id === editingLabTask._id ? res.data.data : t));
                setEditingLabTask(null);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update lab task.');
        } finally {
            setSavingEditLab(false);
        }
    };

    const handleDeleteLabTask = async (taskId, taskTitle) => {
        if (!window.confirm(`Are you sure you want to remove the lab task "${taskTitle}"?`)) return;
        try {
            const res = await axios.delete(`${API_URL}/labs/tasks/${taskId}`, getAuthHeaders());
            if (res.data?.success) {
                setSuccessMsg('Lab task removed successfully.');
                setLabTasks(prev => prev.filter(t => t._id !== taskId));
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete lab task.');
        }
    };

    const handleDeleteRepoTest = async (testId, testTitle) => {
        if (!window.confirm(`Are you sure you want to remove the practice test "${testTitle}"?`)) return;
        try {
            await axios.delete(`${API_URL}/tests/${testId}`, getAuthHeaders());
            setRepoTests(prev => prev.filter(t => t._id !== testId));
            setSubjectTests(prev => prev.filter(t => t._id !== testId));
            setSuccessMsg('Practice test removed successfully.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to delete practice test.');
        }
    };

    // Render Inline Edit Lab Task Panel (Fits inside Tab Space without popup cutoffs)
    const renderEditLabPanel = (backAction) => {
        if (!editingLabTask) return null;
        return (
            <div className="faculty-inline-tab-panel animate-fade">
                <div className="inline-panel-header">
                    <div>
                        <h3 className="inline-panel-title">
                            <span>✏️ Edit Lab Practice Task:</span>
                            <span style={{ color: '#818cf8' }}>{editingLabTask.title}</span>
                        </h3>
                        <p className="inline-panel-desc">
                            Modify task configuration, instructions, score, and default reference solutions across 6 programming languages.
                        </p>
                    </div>
                    <div className="inline-panel-actions">
                        <button
                            type="button"
                            className="btn-secondary-action"
                            onClick={backAction || (() => setEditingLabTask(null))}
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                            ← Back to List
                        </button>
                        <button
                            type="button"
                            className="btn-primary-action"
                            onClick={handleSaveEditLab}
                            disabled={savingEditLab}
                            style={{ padding: '8px 20px', fontSize: '13px' }}
                        >
                            {savingEditLab ? 'Saving Changes...' : '💾 Save Changes'}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSaveEditLab} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div className="form-group">
                        <label className="form-label">Task Title *</label>
                        <input
                            className="form-control"
                            value={editLabTaskForm.title}
                            onChange={e => setEditLabTaskForm({ ...editLabTaskForm, title: e.target.value })}
                            placeholder="e.g. Design and Implement a Student Management Database"
                            required
                        />
                    </div>

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label className="form-label">Subject *</label>
                            <select
                                className="form-control"
                                value={editLabTaskForm.subject}
                                onChange={e => setEditLabTaskForm({ ...editLabTaskForm, subject: e.target.value })}
                                required
                            >
                                <option value="">Select Academic Subject</option>
                                {subjects.map(s => (
                                    <option key={s._id} value={s._id}>{s.code} - {s.name} ({s.academicYear})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Academic Year *</label>
                            <input
                                className="form-control"
                                value={editLabTaskForm.academicYear}
                                onChange={e => setEditLabTaskForm({ ...editLabTaskForm, academicYear: e.target.value })}
                                placeholder="e.g. 4th Year"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-grid-3-col">
                        <div className="form-group">
                            <label className="form-label">Branch</label>
                            <input
                                className="form-control"
                                value={editLabTaskForm.branch}
                                onChange={e => setEditLabTaskForm({ ...editLabTaskForm, branch: e.target.value })}
                                placeholder="e.g. CSE (or leave blank for All)"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Section</label>
                            <input
                                className="form-control"
                                value={editLabTaskForm.section}
                                onChange={e => setEditLabTaskForm({ ...editLabTaskForm, section: e.target.value })}
                                placeholder="e.g. C"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Max Score</label>
                            <input
                                type="number"
                                className="form-control"
                                min="1"
                                max="1000"
                                value={editLabTaskForm.maxScore}
                                onChange={e => setEditLabTaskForm({ ...editLabTaskForm, maxScore: Number(e.target.value) || 100 })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Task Instructions & Criteria *</label>
                        <textarea
                            className="form-control"
                            rows="4"
                            style={{ minHeight: '110px' }}
                            value={editLabTaskForm.instructions}
                            onChange={e => setEditLabTaskForm({ ...editLabTaskForm, instructions: e.target.value })}
                            placeholder="Detail the problem statement, requirements, and test criteria..."
                            required
                        />
                    </div>

                    {/* Multi-Language Solution Tabs */}
                    <div className="form-group" style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                                    Default Reference Solutions (Multi-Language)
                                </label>
                                <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                    Provide faculty reference logic in one or more languages. Students can submit in any language, and the engine automatically evaluates against the matching reference.
                                </p>
                            </div>
                            <span style={{ fontSize: '11.5px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '3px 10px', borderRadius: '6px', fontWeight: 600 }}>
                                ⚡ AST Normalized • Auto-matches student language
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            {LAB_LANGUAGES.map(lang => {
                                const hasCode = Boolean(editLabTaskForm.referenceSolutions?.[lang.key]?.trim());
                                const isActive = activeEditLangTab === lang.key;
                                return (
                                    <button
                                        key={lang.key}
                                        type="button"
                                        className={`lang-pill-btn ${isActive ? 'active-edit' : ''}`}
                                        onClick={() => setActiveEditLangTab(lang.key)}
                                    >
                                        <span>{lang.icon} {lang.label}</span>
                                        {hasCode ? (
                                            <span className="ready-badge">✓ Ready</span>
                                        ) : (
                                            <span className="empty-badge">—</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16', padding: '8px 14px', borderTopLeftRadius: '8px', borderTopRightRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', borderBottom: 'none' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {LAB_LANGUAGES.find(l => l.key === activeEditLangTab)?.icon} Reference Solution for {LAB_LANGUAGES.find(l => l.key === activeEditLangTab)?.label}
                                </span>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {Boolean(editLabTaskForm.referenceSolutions?.[activeEditLangTab]?.trim()) ? 'Code saved in form buffer' : 'Optional: Leave empty if not applicable'}
                                </span>
                            </div>
                            <textarea
                                className="form-control"
                                rows="12"
                                style={{
                                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                    fontSize: '13.5px',
                                    background: '#060a12',
                                    color: '#fef08a',
                                    borderTopLeftRadius: 0,
                                    borderTopRightRadius: 0,
                                    minHeight: '280px',
                                    lineHeight: '1.6',
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                                placeholder={`// Enter reference solution for ${LAB_LANGUAGES.find(l => l.key === activeEditLangTab)?.label}...\n// Variable names, table/column identifiers will be normalized automatically during evaluation.`}
                                value={editLabTaskForm.referenceSolutions?.[activeEditLangTab] || ''}
                                onChange={e => {
                                    const newCode = e.target.value;
                                    setEditLabTaskForm({
                                        ...editLabTaskForm,
                                        referenceSolutions: {
                                            ...editLabTaskForm.referenceSolutions,
                                            [activeEditLangTab]: newCode
                                        }
                                    });
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                            type="button"
                            className="btn-secondary-action"
                            onClick={backAction || (() => setEditingLabTask(null))}
                            style={{ padding: '8px 20px', fontSize: '13px' }}
                        >
                            ← Cancel & Return
                        </button>
                        <button
                            type="submit"
                            className="btn-primary-action"
                            disabled={savingEditLab}
                            style={{ padding: '8px 24px', fontSize: '13px' }}
                        >
                            {savingEditLab ? 'Saving Changes...' : '💾 Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // Render Inline Solution Viewer Panel (Fits inside Tab Space without popup cutoffs)
    const renderSolutionViewerPanel = (backAction) => {
        if (!previewSolutionsTask) return null;
        const currentCode = previewSolutionsTask.referenceSolutions?.[previewLangTab] ||
            (previewSolutionsTask.solutionLanguage === previewLangTab ? previewSolutionsTask.referenceSolution : '') || '';
        const hasCurrentCode = Boolean(currentCode.trim());

        return (
            <div className="faculty-inline-tab-panel animate-fade">
                <div className="inline-panel-header">
                    <div>
                        <h3 className="inline-panel-title">
                            <span>🎯 Reference Solutions:</span>
                            <span style={{ color: '#fbbf24' }}>{previewSolutionsTask.title}</span>
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span className="code-pill">{previewSolutionsTask.subject?.code || 'Subject'}</span>
                            <span style={{ fontSize: '12.5px', color: '#cbd5e1' }}>{previewSolutionsTask.subject?.name}</span>
                            <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>· {previewSolutionsTask.academicYear}</span>
                            <span style={{ fontSize: '12.5px', color: '#94a3b8' }}>· {previewSolutionsTask.branch || 'All Branches'}</span>
                            <span className="repo-badge repo-badge-warning" style={{ marginLeft: '4px' }}>
                                Max: {previewSolutionsTask.maxScore || 100} pts
                            </span>
                        </div>
                    </div>
                    <div className="inline-panel-actions">
                        <button
                            type="button"
                            className="btn-secondary-action"
                            onClick={backAction || (() => setPreviewSolutionsTask(null))}
                            style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                            ← Back to List
                        </button>
                        <button
                            type="button"
                            className="btn-primary-action"
                            style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', borderColor: '#818cf8', padding: '8px 18px', fontSize: '13px' }}
                            onClick={() => {
                                const taskToEdit = previewSolutionsTask;
                                setPreviewSolutionsTask(null);
                                handleStartEditLab(taskToEdit);
                            }}
                        >
                            ✏️ Edit This Lab Task
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '14px' }}>
                    {/* Language Switch Tabs */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        {LAB_LANGUAGES.map(lang => {
                            const code = previewSolutionsTask.referenceSolutions?.[lang.key] || (previewSolutionsTask.solutionLanguage === lang.key ? previewSolutionsTask.referenceSolution : '');
                            const hasCode = Boolean(code?.trim());
                            const isActive = previewLangTab === lang.key;
                            return (
                                <button
                                    key={lang.key}
                                    type="button"
                                    className={`lang-pill-btn ${isActive ? 'active-preview' : ''}`}
                                    onClick={() => setPreviewLangTab(lang.key)}
                                >
                                    <span>{lang.icon} {lang.label}</span>
                                    {hasCode ? (
                                        <span className="ready-badge">✓ Ready</span>
                                    ) : (
                                        <span className="empty-badge">—</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Code Viewer Box */}
                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16', padding: '10px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fef08a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {LAB_LANGUAGES.find(l => l.key === previewLangTab)?.icon} Reference Code ({(LAB_LANGUAGES.find(l => l.key === previewLangTab)?.label || previewLangTab)})
                            </span>
                            {hasCurrentCode && (
                                <button
                                    type="button"
                                    className="btn-secondary-action"
                                    onClick={() => handleCopyReferenceCode(currentCode)}
                                    style={{ padding: '4px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                >
                                    {copiedLang ? '✓ Copied!' : '📋 Copy Code'}
                                </button>
                            )}
                        </div>

                        <pre style={{
                            background: '#060a12',
                            color: hasCurrentCode ? '#fef08a' : '#64748b',
                            padding: '20px',
                            margin: 0,
                            fontSize: '13.5px',
                            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                            minHeight: '280px',
                            maxHeight: '460px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6'
                        }}>
                            {hasCurrentCode ? currentCode : '// No reference solution code added for this language.'}
                        </pre>

                        <div style={{ padding: '10px 16px', background: '#090d16', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <span>⚡ Student submissions in this language will be evaluated against this reference logic using normalized AST matching.</span>
                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>Language: {previewLangTab.toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <button
                        type="button"
                        className="btn-secondary-action"
                        onClick={backAction || (() => setPreviewSolutionsTask(null))}
                        style={{ padding: '8px 20px', fontSize: '13px' }}
                    >
                        ← Back to List
                    </button>
                    <button
                        type="button"
                        className="btn-primary-action"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', borderColor: '#818cf8', padding: '8px 20px', fontSize: '13px' }}
                        onClick={() => {
                            const taskToEdit = previewSolutionsTask;
                            setPreviewSolutionsTask(null);
                            handleStartEditLab(taskToEdit);
                        }}
                    >
                        ✏️ Edit Task & Reference Solutions
                    </button>
                </div>
            </div>
        );
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

                    <div
                        className="faculty-tabs-nav"
                        onWheel={(e) => {
                            if (e.deltaY !== 0) {
                                e.currentTarget.scrollLeft += e.deltaY;
                            }
                        }}
                    >
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
                        <button
                            className={`faculty-tab-btn ${activeTab === 'repository' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('repository'); setError(null); setSuccessMsg(''); }}
                        >
                            🗃️ Records & Academic Repository
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
                            {subjectWorkspace ? (
                                <div className="subject-workspace-wrapper animate-fade">
                                    {/* Workspace Header */}
                                    <div className="subject-workspace-header">
                                        <div className="subject-workspace-title-row">
                                            <button
                                                type="button"
                                                className="btn-back-subjects"
                                                onClick={() => setSubjectWorkspace(null)}
                                            >
                                                ← Back to Subjects Directory
                                            </button>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span className="code-pill">{subjectWorkspace.subject.code}</span>
                                                    {subjectWorkspace.subject.name}
                                                </h3>
                                                <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '4px' }}>
                                                    {subjectWorkspace.subject.academicYear} · {subjectWorkspace.subject.branch || 'All Branches'} {subjectWorkspace.subject.section ? `(Sec ${subjectWorkspace.subject.section})` : ''}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="subject-workspace-subtabs">
                                            <button
                                                type="button"
                                                className={`faculty-tab-btn ${subjectWorkspace.activeView === 'notes' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSubjectWorkspace(prev => ({ ...prev, activeView: 'notes' }));
                                                    openNotesModal(subjectWorkspace.subject);
                                                }}
                                            >
                                                📝 Notes & PDF Materials ({notesList.length})
                                            </button>
                                            <button
                                                type="button"
                                                className={`faculty-tab-btn ${subjectWorkspace.activeView === 'tests' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSubjectWorkspace(prev => ({ ...prev, activeView: 'tests' }));
                                                    openTestsModal(subjectWorkspace.subject);
                                                }}
                                            >
                                                🧪 Practice Tests ({subjectTests.length})
                                            </button>
                                            <button
                                                type="button"
                                                className={`faculty-tab-btn ${subjectWorkspace.activeView === 'reports' ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSubjectWorkspace(prev => ({ ...prev, activeView: 'reports' }));
                                                    openReportsModal(subjectWorkspace.subject);
                                                }}
                                            >
                                                📊 Student Reports ({subjectReports.length})
                                            </button>
                                        </div>
                                    </div>

                                    {/* 1. STUDY NOTES & PDF MATERIALS VIEW */}
                                    {subjectWorkspace.activeView === 'notes' && (
                                        <div>
                                            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
                                                <h4 style={{ margin: '0 0 14px 0', color: '#60a5fa', fontSize: '15.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>➕</span> Upload New Study Material, Notes & PDF Documents
                                                </h4>
                                                <form onSubmit={handleAddNote}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                                                        <div>
                                                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Note / Chapter Title *</label>
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
                                                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Short Description / Topics</label>
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="e.g. 1NF, 2NF, 3NF, BCNF, Functional Dependency"
                                                                value={noteForm.description}
                                                                onChange={e => setNoteForm({ ...noteForm, description: e.target.value })}
                                                            />
                                                        </div>
                                                        <div style={{ gridColumn: '1 / -1' }}>
                                                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                                                📄 Attach PDF Document / Lecture Slide (Optional)
                                                            </label>
                                                            <div className="pdf-upload-box">
                                                                <input
                                                                    type="file"
                                                                    id="facultyNotePdfInput"
                                                                    accept=".pdf,application/pdf"
                                                                    onChange={e => setNotePdfFile(e.target.files[0] || null)}
                                                                    style={{ display: 'none' }}
                                                                />
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-secondary btn-sm"
                                                                        onClick={() => document.getElementById('facultyNotePdfInput')?.click()}
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                                                    >
                                                                        📁 Choose PDF Document
                                                                    </button>
                                                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                        {notePdfFile ? `Selected: ${notePdfFile.name} (${(notePdfFile.size / (1024 * 1024)).toFixed(2)} MB)` : 'Upload PDF textbook chapters, lecture slides, lab manuals (Max 30MB)'}
                                                                    </span>
                                                                    {notePdfFile && (
                                                                        <button
                                                                            type="button"
                                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                                                                            onClick={() => setNotePdfFile(null)}
                                                                        >
                                                                            ✕ Remove File
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ gridColumn: '1 / -1' }}>
                                                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                                                                Reference Document Link (Optional Google Drive, Dropbox, or GitHub URL)
                                                            </label>
                                                            <input
                                                                type="url"
                                                                className="form-control"
                                                                placeholder="https://drive.google.com/... or https://github.com/..."
                                                                value={noteForm.fileUrl}
                                                                onChange={e => setNoteForm({ ...noteForm, fileUrl: e.target.value })}
                                                            />
                                                        </div>
                                                        <div style={{ gridColumn: '1 / -1' }}>
                                                            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                                                                Detailed Revision Notes / Key Points (Optional Text / Markdown)
                                                            </label>
                                                            <textarea
                                                                className="form-control"
                                                                rows={4}
                                                                placeholder="Type or paste comprehensive revision points, key formulas, interview cheat sheets..."
                                                                value={noteForm.content}
                                                                onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        className="btn btn-primary"
                                                        disabled={submittingNote || !noteForm.title.trim()}
                                                        style={{ minWidth: '180px' }}
                                                    >
                                                        {submittingNote ? 'Uploading Note & Document...' : '📤 Post Study Material'}
                                                    </button>
                                                </form>
                                            </div>

                                            {/* Notes List */}
                                            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#f8fafc' }}>
                                                Available Subject Study Materials ({notesList.length})
                                            </h4>
                                            {loadingNotes ? (
                                                <p className="loading-text">Loading notes...</p>
                                            ) : notesList.length > 0 ? (
                                                <div>
                                                    {notesList.map((note) => {
                                                        const isPdf = Boolean(note.fileUrl && (note.fileUrl.endsWith('.pdf') || note.fileType?.includes('pdf') || note.fileName?.endsWith('.pdf')));
                                                        const pdfHref = note.fileUrl ? (note.fileUrl.startsWith('http') ? note.fileUrl : `${API_URL.replace('/api', '')}${note.fileUrl}`) : '';
                                                        return (
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
                                                                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                        {isPdf ? (
                                                                            <a
                                                                                href={pdfHref}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="btn-pdf-view"
                                                                            >
                                                                                📄 View / Download Attached PDF ({note.fileName || 'PDF Document'}) ↗
                                                                            </a>
                                                                        ) : (
                                                                            <a
                                                                                href={note.fileUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="btn-pdf-view"
                                                                            >
                                                                                🔗 Open Study Resource Link ↗
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                                                    No study notes uploaded for this subject yet. Upload the first revision material or PDF above!
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. PRACTICE TESTS VIEW */}
                                    {subjectWorkspace.activeView === 'tests' && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                                <h4 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>
                                                    Subject Practice Tests ({subjectTests.length})
                                                </h4>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => setShowCreateTestForm(!showCreateTestForm)}
                                                >
                                                    {showCreateTestForm ? 'Cancel' : '➕ Create Practice Test'}
                                                </button>
                                            </div>

                                            {showCreateTestForm && (
                                                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '18px', marginBottom: '20px' }}>
                                                    <h4 style={{ margin: '0 0 12px 0', color: '#c084fc', fontSize: '15px' }}>
                                                        Create New Practice Test for {subjectWorkspace.subject.code}
                                                    </h4>
                                                    <form onSubmit={handleCreateSubjectTest}>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Test Title *</label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    placeholder={`e.g. ${subjectWorkspace.subject.code} Unit 1 Assessment`}
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
                                                                            className="btn btn-secondary btn-sm"
                                                                            style={{ color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.4)' }}
                                                                            onClick={() => openQuestionsModal(t)}
                                                                        >
                                                                            ⚙️ Manage Questions ({t.questionCount || t.questions?.length || 0})
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px' }}>
                                                    No practice tests set up for this subject yet. Click "+ Create Practice Test" above to configure one!
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. STUDENT REPORTS VIEW */}
                                    {subjectWorkspace.activeView === 'reports' && (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                                <h4 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>
                                                    Student Performance Summary ({subjectReports.length} Attempts)
                                                </h4>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    style={{ background: '#10b981', borderColor: '#059669', color: '#ffffff' }}
                                                    onClick={downloadSubjectReportsCSV}
                                                    disabled={!subjectReports.length}
                                                >
                                                    📥 Download Report (CSV)
                                                </button>
                                            </div>

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
                                                <div className="students-table-scroll" style={{ marginTop: '20px' }}>
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
                                                                        <span className={`status-badge ${report.passed ? 'status-active' : 'status-pending'}`}>
                                                                            {report.passed ? 'Passed' : 'Needs Practice'}
                                                                        </span>
                                                                    </td>
                                                                    <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p style={{ textAlign: 'center', padding: '28px', color: '#94a3b8', background: '#0f172a', borderRadius: '8px', marginTop: '16px' }}>
                                                    No student test attempts found for this subject yet.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                        <div>
                                            <h3>📚 Registered Academic Preparation Subjects ({subjects.length})</h3>
                                            <p className="card-desc">Curriculum preparation subjects assigned to your academic scope. Click any subject action to access study notes, practice tests, and student reports.</p>
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
                                    {/* Multi-Language Default Reference Solutions */}
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div>
                                                <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '13.5px', color: '#f8fafc' }}>
                                                    Default Faculty Reference Solutions (Multi-Language) *
                                                </label>
                                                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                                    Add default solutions in different languages at the same time. Student submissions in any language will automatically match and evaluate against that language!
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                                                    ⚡ AST Normalized • Variable names can differ
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Max Score:</span>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min="1"
                                                        max="1000"
                                                        style={{ width: '80px', padding: '4px 8px', height: '32px' }}
                                                        value={labTaskForm.maxScore}
                                                        onChange={e => setLabTaskForm({ ...labTaskForm, maxScore: Number(e.target.value) || 100 })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Language Navigation Pill Bar */}
                                        <div className="ref-solutions-lang-tabs" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                                            {LAB_LANGUAGES.map(lang => {
                                                const hasCode = Boolean(labTaskForm.referenceSolutions?.[lang.key]?.trim());
                                                const isActive = activeSolutionLangTab === lang.key;
                                                return (
                                                    <button
                                                        key={lang.key}
                                                        type="button"
                                                        onClick={() => setActiveSolutionLangTab(lang.key)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '7px 14px',
                                                            borderRadius: '8px',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            border: isActive ? '1px solid #6366f1' : '1px solid #334155',
                                                            background: isActive ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' : '#1e293b',
                                                            color: isActive ? '#ffffff' : '#94a3b8',
                                                            boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.35)' : 'none'
                                                        }}
                                                    >
                                                        <span>{lang.icon} {lang.label}</span>
                                                        {hasCode ? (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                background: '#10b981',
                                                                color: '#ffffff',
                                                                padding: '1px 6px',
                                                                borderRadius: '10px',
                                                                fontWeight: 700
                                                            }}>
                                                                ✓ Ready
                                                            </span>
                                                        ) : (
                                                            <span style={{
                                                                fontSize: '10px',
                                                                background: 'rgba(255,255,255,0.08)',
                                                                color: '#64748b',
                                                                padding: '1px 6px',
                                                                borderRadius: '10px'
                                                            }}>
                                                                Optional
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Textarea for currently active language */}
                                        <div style={{ position: 'relative' }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: '#0f172a',
                                                padding: '8px 14px',
                                                borderTopLeftRadius: '8px',
                                                borderTopRightRadius: '8px',
                                                border: '1px solid #334155',
                                                borderBottom: 'none'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#e2e8f0', fontWeight: 600 }}>
                                                    <span>{LAB_LANGUAGES.find(l => l.key === activeSolutionLangTab)?.icon}</span>
                                                    <span>{LAB_LANGUAGES.find(l => l.key === activeSolutionLangTab)?.label} Reference Solution</span>
                                                    {labTaskForm.referenceSolutions?.[activeSolutionLangTab]?.trim() && (
                                                        <span style={{ color: '#10b981', fontSize: '11px' }}>● Configured</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                    Students writing {LAB_LANGUAGES.find(l => l.key === activeSolutionLangTab)?.label} will be matched against this code
                                                </div>
                                            </div>
                                            <textarea
                                                className="form-control"
                                                rows="7"
                                                style={{
                                                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                                    fontSize: '13px',
                                                    background: 'rgba(15, 23, 42, 0.75)',
                                                    borderTopLeftRadius: 0,
                                                    borderTopRightRadius: 0,
                                                    border: '1px solid #334155',
                                                    lineHeight: '1.5'
                                                }}
                                                placeholder={LAB_LANGUAGES.find(l => l.key === activeSolutionLangTab)?.placeholder || 'Enter reference solution code...'}
                                                value={labTaskForm.referenceSolutions?.[activeSolutionLangTab] || ''}
                                                onChange={e => {
                                                    const newCode = e.target.value;
                                                    const updatedSolutions = {
                                                        ...labTaskForm.referenceSolutions,
                                                        [activeSolutionLangTab]: newCode
                                                    };
                                                    setLabTaskForm({
                                                        ...labTaskForm,
                                                        referenceSolutions: updatedSolutions,
                                                        referenceSolution: newCode || Object.values(updatedSolutions).find(v => (v || '').trim()) || '',
                                                        solutionLanguage: activeSolutionLangTab
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                                            <small style={{ color: '#94a3b8', fontSize: '12px' }}>
                                                💡 Switch tabs to configure reference solutions for multiple languages at once. Variable names are normalized during scoring.
                                            </small>
                                            <span style={{ fontSize: '11.5px', color: '#818cf8' }}>
                                                Solutions set: <strong>{Object.values(labTaskForm.referenceSolutions || {}).filter(s => s?.trim()).length} / 6</strong> languages
                                            </span>
                                        </div>
                                    </div>
                                    <button className="btn-primary-action" type="submit" disabled={submittingLab} style={{ marginTop: '10px' }}>
                                        {submittingLab ? 'Creating...' : '+ Create Lab Task'}
                                    </button>
                                </form>
                            </div>

                            {/* 2. BELOW: Space for Lab Reports & Answer Review in the Tab Space */}
                            {selectedLabReviewAttempt ? (
                                <div className="faculty-card answer-review-tab-panel animate-fade" style={{ marginBottom: '36px', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)', borderRadius: '12px', padding: '24px' }}>
                                    {/* Top Header & Back Button */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedLabReviewAttempt(null)}
                                                    className="btn-secondary-action"
                                                    style={{ padding: '6px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                                >
                                                    ← Back to Submissions List
                                                </button>
                                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Reviewing submission</span>
                                            </div>
                                            <h2 style={{ margin: '12px 0 4px', fontSize: '1.4rem', color: '#f8fafc' }}>
                                                🔬 Lab Submission Review & Plagiarism Audit
                                            </h2>
                                            <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                                                <strong style={{ color: '#ffffff' }}>{selectedLabReviewAttempt.student?.name || 'Student'}</strong>
                                                {selectedLabReviewAttempt.student?.rollNumber && <span style={{ color: '#818cf8' }}> ({selectedLabReviewAttempt.student.rollNumber})</span>}
                                                {' · '}
                                                <span style={{ color: '#94a3b8' }}>Task:</span> <strong style={{ color: '#38bdf8' }}>{selectedLabReviewAttempt.task?.title || 'Lab Task'}</strong>
                                                {' · '}
                                                <span style={{ color: '#94a3b8' }}>Submitted:</span> {selectedLabReviewAttempt.updatedAt ? new Date(selectedLabReviewAttempt.updatedAt).toLocaleString() : 'N/A'}
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn-secondary-action"
                                            style={{ padding: '6px 14px', fontSize: '12px' }}
                                            onClick={() => setSelectedLabReviewAttempt(null)}
                                        >
                                            ✕ Close Review
                                        </button>
                                    </div>

                                    {/* Plagiarism Alert Banner */}
                                    {selectedLabReviewAttempt.plagiarismPercentage > 40 ? (
                                        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                            <span style={{ fontSize: '28px' }}>🚨</span>
                                            <div>
                                                <strong style={{ color: '#f87171', fontSize: '15px' }}>High Plagiarism Detected: {selectedLabReviewAttempt.plagiarismPercentage}% Similarity</strong>
                                                <p style={{ margin: '4px 0 0', color: '#e2e8f0', fontSize: '13px' }}>
                                                    This submission matched structural and AST patterns with peer student <strong>{selectedLabReviewAttempt.plagiarizedWith?.studentName || 'a registered student'}</strong>.
                                                </p>
                                            </div>
                                        </div>
                                    ) : selectedLabReviewAttempt.plagiarismPercentage > 15 ? (
                                        <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px' }}>
                                            <strong style={{ color: '#fbbf24', fontSize: '14px' }}>⚠️ Moderate Structural Similarity: {selectedLabReviewAttempt.plagiarismPercentage}%</strong>
                                            <span style={{ fontSize: '13px', color: '#cbd5e1', marginLeft: '8px' }}>
                                                Matched logic with peer {selectedLabReviewAttempt.plagiarizedWith?.studentName || 'student'}.
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px 18px', color: '#34d399', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '18px' }}>✅</span>
                                            <span><strong>Verified Original Submission</strong> ({selectedLabReviewAttempt.plagiarismPercentage || 0}% peer similarity).</span>
                                        </div>
                                    )}

                                    {/* Evaluation Summary Stats Cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                                        <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', border: '1px solid #334155' }}>
                                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Evaluation Score</span>
                                            <div style={{ fontSize: '22px', fontWeight: 800, color: selectedLabReviewAttempt.score ? '#10b981' : '#f87171', marginTop: '4px' }}>
                                                {selectedLabReviewAttempt.score ?? 0} <span style={{ fontSize: '14px', color: '#64748b' }}>/ {selectedLabReviewAttempt.task?.maxScore || 100}</span>
                                            </div>
                                        </div>
                                        <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', border: '1px solid #334155' }}>
                                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logic Match</span>
                                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>
                                                {selectedLabReviewAttempt.evaluationDetails?.logicMatchPercentage ?? 100}%
                                            </div>
                                        </div>
                                        <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', border: '1px solid #334155' }}>
                                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Language</span>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0', marginTop: '6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', display: 'inline-block' }}></span>
                                                {selectedLabReviewAttempt.language || 'cpp'}
                                            </div>
                                        </div>
                                        <div style={{ background: '#0f172a', padding: '14px 18px', borderRadius: '10px', border: '1px solid #334155' }}>
                                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plagiarism Audit</span>
                                            <div style={{ fontSize: '18px', fontWeight: 700, color: selectedLabReviewAttempt.plagiarismPercentage > 40 ? '#f87171' : selectedLabReviewAttempt.plagiarismPercentage > 15 ? '#fbbf24' : '#34d399', marginTop: '6px' }}>
                                                {selectedLabReviewAttempt.plagiarismPercentage || 0}% Similarity
                                            </div>
                                        </div>
                                    </div>

                                    {selectedLabReviewAttempt.feedback && (
                                        <div style={{ fontSize: '13px', color: '#cbd5e1', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '12px 16px', borderRadius: '8px', marginBottom: '22px' }}>
                                            <strong style={{ color: '#818cf8' }}>Evaluation Remarks:</strong> {selectedLabReviewAttempt.feedback}
                                        </div>
                                    )}

                                    {/* Side-by-Side / Dual Code Comparison Space */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px', marginBottom: '20px' }}>
                                        {/* Left: Student Submitted Code */}
                                        <div style={{ background: '#090d16', border: '1px solid #334155', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '10px 16px', borderBottom: '1px solid #334155' }}>
                                                <label style={{ fontWeight: 700, fontSize: '13px', color: '#e2e8f0', margin: 0 }}>
                                                    💻 Student Submitted Code ({(selectedLabReviewAttempt.language || 'cpp').toUpperCase()})
                                                </label>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                    {selectedLabReviewAttempt.student?.name || 'Student'}
                                                </span>
                                            </div>
                                            <pre style={{
                                                background: '#090d16',
                                                color: '#e2e8f0',
                                                padding: '16px',
                                                margin: 0,
                                                fontSize: '13px',
                                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                                minHeight: '360px',
                                                maxHeight: '520px',
                                                overflowY: 'auto',
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: '1.6'
                                            }}>
                                                {selectedLabReviewAttempt.code || selectedLabReviewAttempt.submission || '// No code content recorded'}
                                            </pre>
                                        </div>

                                        {/* Right: Faculty Reference Solution with Language Tabs */}
                                        <div style={{ background: '#0f172a', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(251, 191, 36, 0.08)', padding: '10px 16px', borderBottom: '1px solid rgba(251, 191, 36, 0.2)', flexWrap: 'wrap', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '14px' }}>🎯</span>
                                                    <strong style={{ fontSize: '13px', color: '#fbbf24' }}>
                                                        Faculty Reference Solution
                                                    </strong>
                                                </div>
                                                {/* If multiple reference solutions exist, render tabs */}
                                                {selectedLabReviewAttempt.task?.referenceSolutions && (
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        {LAB_LANGUAGES.map(l => {
                                                            const code = selectedLabReviewAttempt.task?.referenceSolutions?.[l.key];
                                                            if (!code?.trim()) return null;
                                                            const isCurActive = (reviewRefLangTab || (selectedLabReviewAttempt.language || 'cpp').toLowerCase()) === l.key;
                                                            return (
                                                                <button
                                                                    key={l.key}
                                                                    type="button"
                                                                    onClick={() => setReviewRefLangTab(l.key)}
                                                                    style={{
                                                                        padding: '3px 8px',
                                                                        fontSize: '11px',
                                                                        borderRadius: '5px',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        border: isCurActive ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)',
                                                                        background: isCurActive ? '#fbbf24' : 'rgba(15, 23, 42, 0.6)',
                                                                        color: isCurActive ? '#000000' : '#cbd5e1'
                                                                    }}
                                                                >
                                                                    {l.icon} {l.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                            <pre style={{
                                                background: '#0a0f1d',
                                                color: '#fef08a',
                                                padding: '16px',
                                                margin: 0,
                                                fontSize: '13px',
                                                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                                minHeight: '360px',
                                                maxHeight: '520px',
                                                overflowY: 'auto',
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: '1.6'
                                            }}>
                                                {(() => {
                                                    const taskRef = selectedLabReviewAttempt.task;
                                                    const langKey = (reviewRefLangTab || (selectedLabReviewAttempt.language || 'cpp').toLowerCase());
                                                    const solFromMulti = taskRef?.referenceSolutions?.[langKey];
                                                    if (solFromMulti) return solFromMulti;
                                                    // Fallback to any non-empty referenceSolutions entry or referenceSolution
                                                    if (taskRef?.referenceSolutions) {
                                                        const found = Object.entries(taskRef.referenceSolutions).find(([_, val]) => val?.trim());
                                                        if (found) return found[1];
                                                    }
                                                    return taskRef?.referenceSolution || '// No reference solution provided for this task';
                                                })()}
                                            </pre>
                                            <div style={{ padding: '8px 14px', background: 'rgba(0, 0, 0, 0.4)', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                                ⚡ Variables, table names, and column identifiers are normalized by the AST engine during automated scoring.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <button
                                            type="button"
                                            className="btn-secondary-action"
                                            onClick={() => setSelectedLabReviewAttempt(null)}
                                            style={{ padding: '8px 20px', fontSize: '13px', cursor: 'pointer' }}
                                        >
                                            ← Back to Submissions List
                                        </button>
                                    </div>
                                </div>
                            ) : (
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
                                                                    onClick={() => {
                                                                        setSelectedLabReviewAttempt(report);
                                                                        const studLang = (report.language || 'cpp').toLowerCase();
                                                                        const taskRefs = report.task?.referenceSolutions || {};
                                                                        if (taskRefs[studLang]?.trim()) {
                                                                            setReviewRefLangTab(studLang);
                                                                        } else {
                                                                            const firstFilled = Object.keys(taskRefs).find(k => taskRefs[k]?.trim());
                                                                            setReviewRefLangTab(firstFilled || report.task?.solutionLanguage || 'cpp');
                                                                        }
                                                                    }}
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
                            )}

                            {/* 3. Active Lab Tasks Overview */}
                            <div className="faculty-card">
                                {editingLabTask ? (
                                    renderEditLabPanel(() => setEditingLabTask(null))
                                ) : previewSolutionsTask ? (
                                    renderSolutionViewerPanel(() => setPreviewSolutionsTask(null))
                                ) : (
                                    <>
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
                                                            <th style={{ textAlign: 'right' }}>Actions</th>
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
                                                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-secondary-action"
                                                                        style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}
                                                                        onClick={() => {
                                                                            setEditingLabTask(null);
                                                                            setPreviewSolutionsTask(task);
                                                                            const firstKey = Object.keys(task.referenceSolutions || {}).find(k => task.referenceSolutions?.[k]?.trim());
                                                                            setPreviewLangTab(firstKey || task.solutionLanguage || 'cpp');
                                                                        }}
                                                                    >
                                                                        👁️ Solutions
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-secondary-action"
                                                                        style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}
                                                                        onClick={() => handleStartEditLab(task)}
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-secondary-action"
                                                                        style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                                                                        onClick={() => handleDeleteLabTask(task._id, task.title)}
                                                                    >
                                                                        🗑️ Remove
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {!labTasks.length && (
                                                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No lab tasks assigned yet.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: ACADEMIC RECORDS & STORAGE REPOSITORY */}
                    {activeTab === 'repository' && (() => {
                        // Gather all notes across subjects
                        const allStoredNotes = subjects.flatMap(s => (s.notes || []).map(n => ({
                            ...n,
                            subjectId: s._id,
                            subjectName: s.name,
                            subjectCode: s.code,
                            academicYear: s.academicYear,
                            branch: s.branch,
                            section: s.section
                        })));

                        // Filter lab tasks by search
                        const filteredRepoTasks = labTasks.filter(t => !repoSearch ||
                            t.title?.toLowerCase().includes(repoSearch.toLowerCase()) ||
                            t.subject?.name?.toLowerCase().includes(repoSearch.toLowerCase()) ||
                            t.subject?.code?.toLowerCase().includes(repoSearch.toLowerCase()) ||
                            t.academicYear?.toLowerCase().includes(repoSearch.toLowerCase())
                        );

                        // Helper to find matching subject for a test
                        const getTestSubject = (test) => {
                            if (test.subject) {
                                if (typeof test.subject === 'object' && test.subject._id) {
                                    return subjects.find(s => s._id === test.subject._id) || test.subject;
                                }
                                const found = subjects.find(s => s._id === test.subject);
                                if (found) return found;
                            }
                            // Match by title or category against subjects
                            const testTitleLower = (test.title || '').toLowerCase();
                            const testCatLower = (test.category || '').toLowerCase();
                            return subjects.find(s => {
                                const sName = (s.name || '').toLowerCase();
                                const sCode = (s.code || '').toLowerCase();
                                return testTitleLower.includes(sName) ||
                                       testTitleLower.includes(sCode) ||
                                       (testCatLower && !['general', 'numerical', 'quantitative', 'verbal'].includes(testCatLower) && (sName.includes(testCatLower) || sCode.includes(testCatLower)));
                            }) || null;
                        };

                        // Only showcase tests based on specific academic subjects (excluding general platform aptitude tests)
                        const generalAptitudeKeywords = ['numerical', 'quantitative', 'verbal', 'general', 'logical', 'reasoning', 'aptitude'];
                        const academicSubjectTests = repoTests.filter(t => {
                            const cat = (t.category || '').toLowerCase().trim();
                            const title = (t.title || '').toLowerCase().trim();
                            const isGeneralAptitude = generalAptitudeKeywords.some(kw =>
                                cat === kw ||
                                (cat.includes(kw) && !cat.includes('academic') && !cat.includes('subject')) ||
                                (title.includes(kw) && !title.includes('academic') && !title.includes('subject'))
                            );
                            if (isGeneralAptitude) return false;

                            const sub = getTestSubject(t);
                            if (sub || t.subject) return true;

                            const academicKeywords = ['dbms', 'os', 'oop', 'cn', 'se', 'dsa', 'core-cse', 'network', 'database', 'operating', 'software', 'programming', 'java', 'python', 'c++', 'compiler', 'cloud', 'ai', 'data'];
                            return academicKeywords.some(kw => cat.includes(kw) || title.includes(kw));
                        });

                        // Filter tests by specific subject selection and search
                        const filteredRepoTests = academicSubjectTests.filter(t => {
                            const sub = getTestSubject(t);
                            const matchesSubject = repoSubjectFilter === 'all' ||
                                (sub && (sub._id === repoSubjectFilter || sub.code?.toLowerCase() === repoSubjectFilter.toLowerCase())) ||
                                (t.subject?._id === repoSubjectFilter || t.subject === repoSubjectFilter) ||
                                (() => {
                                    const sel = subjects.find(s => s._id === repoSubjectFilter);
                                    if (!sel) return false;
                                    const sName = (sel.name || '').toLowerCase();
                                    const sCode = (sel.code || '').toLowerCase();
                                    const titleLower = (t.title || '').toLowerCase();
                                    const catLower = (t.category || '').toLowerCase();
                                    return titleLower.includes(sName) || titleLower.includes(sCode) || (catLower && (sName.includes(catLower) || sCode.includes(catLower)));
                                })();
                            if (!matchesSubject) return false;

                            if (!repoSearch) return true;
                            const q = repoSearch.toLowerCase();
                            return t.title?.toLowerCase().includes(q) ||
                                   t.category?.toLowerCase().includes(q) ||
                                   t.academicYear?.toLowerCase().includes(q) ||
                                   (sub?.name && sub.name.toLowerCase().includes(q)) ||
                                   (sub?.code && sub.code.toLowerCase().includes(q));
                        });

                        // Filter notes by search
                        const filteredRepoNotes = allStoredNotes.filter(n => !repoSearch ||
                            n.title?.toLowerCase().includes(repoSearch.toLowerCase()) ||
                            n.subjectName?.toLowerCase().includes(repoSearch.toLowerCase()) ||
                            n.subjectCode?.toLowerCase().includes(repoSearch.toLowerCase()) ||
                            n.description?.toLowerCase().includes(repoSearch.toLowerCase())
                        );

                        return (
                            <div className="faculty-repository-wrapper animate-fade">
                                {/* Header Card */}
                                <div className="faculty-card" style={{ marginBottom: '22px', background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc' }}>
                                                <span>🗃️</span> Academic Records & Storage Repository
                                            </h2>
                                            <p className="card-desc" style={{ marginTop: '4px' }}>
                                                Centralized storage archive for all lab tasks, practice tests, and study notes configured for your students.
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                type="button"
                                                className="btn-primary-action"
                                                onClick={() => { setActiveTab('labs'); }}
                                                style={{ fontSize: '12.5px', padding: '7px 14px' }}
                                            >
                                                + New Lab Task
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-secondary-action"
                                                onClick={() => { setActiveTab('subjects'); }}
                                                style={{ fontSize: '12.5px', padding: '7px 14px' }}
                                            >
                                                + Manage Subjects
                                            </button>
                                        </div>
                                    </div>

                                    {/* Storage Counters */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '20px' }}>
                                        <div
                                            onClick={() => setRepoSubTab('labs')}
                                            style={{
                                                background: repoSubTab === 'labs' ? 'rgba(99, 102, 241, 0.18)' : '#0f172a',
                                                border: repoSubTab === 'labs' ? '1px solid #6366f1' : '1px solid #334155',
                                                borderRadius: '10px',
                                                padding: '16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🔬 Lab Tasks Records</span>
                                            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{labTasks.length}</div>
                                            <span style={{ fontSize: '11px', color: '#818cf8' }}>Multi-language solutions storage</span>
                                        </div>

                                        <div
                                            onClick={() => setRepoSubTab('tests')}
                                            style={{
                                                background: repoSubTab === 'tests' ? 'rgba(56, 189, 248, 0.18)' : '#0f172a',
                                                border: repoSubTab === 'tests' ? '1px solid #38bdf8' : '1px solid #334155',
                                                borderRadius: '10px',
                                                padding: '16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📝 Practice Tests Records</span>
                                            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{academicSubjectTests.length}</div>
                                            <span style={{ fontSize: '11px', color: '#38bdf8' }}>Subject-specific MCQ assessments</span>
                                        </div>

                                        <div
                                            onClick={() => setRepoSubTab('notes')}
                                            style={{
                                                background: repoSubTab === 'notes' ? 'rgba(16, 185, 129, 0.18)' : '#0f172a',
                                                border: repoSubTab === 'notes' ? '1px solid #10b981' : '1px solid #334155',
                                                borderRadius: '10px',
                                                padding: '16px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📚 Study Notes Records</span>
                                            <div style={{ fontSize: '26px', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>{allStoredNotes.length}</div>
                                            <span style={{ fontSize: '11px', color: '#34d399' }}>Uploaded notes & materials</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Records Table Card */}
                                <div className="faculty-card" style={{ marginBottom: '36px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
                                        {/* Sub Tabs */}
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                className={`faculty-tab-btn ${!editingLabTask && !previewSolutionsTask && repoSubTab === 'labs' ? 'active' : ''}`}
                                                onClick={() => { setEditingLabTask(null); setPreviewSolutionsTask(null); setRepoSubTab('labs'); }}
                                                style={{ padding: '8px 16px', fontSize: '13px' }}
                                            >
                                                🔬 Lab Tasks Storage ({filteredRepoTasks.length})
                                            </button>
                                            <button
                                                type="button"
                                                className={`faculty-tab-btn ${!editingLabTask && !previewSolutionsTask && repoSubTab === 'tests' ? 'active' : ''}`}
                                                onClick={() => { setEditingLabTask(null); setPreviewSolutionsTask(null); setRepoSubTab('tests'); }}
                                                style={{ padding: '8px 16px', fontSize: '13px' }}
                                            >
                                                📝 Practice Tests Storage ({filteredRepoTests.length})
                                            </button>
                                            <button
                                                type="button"
                                                className={`faculty-tab-btn ${!editingLabTask && !previewSolutionsTask && repoSubTab === 'notes' ? 'active' : ''}`}
                                                onClick={() => { setEditingLabTask(null); setPreviewSolutionsTask(null); setRepoSubTab('notes'); }}
                                                style={{ padding: '8px 16px', fontSize: '13px' }}
                                            >
                                                📚 Study Notes Storage ({filteredRepoNotes.length})
                                            </button>

                                            {editingLabTask && (
                                                <button
                                                    type="button"
                                                    className="faculty-tab-btn active"
                                                    style={{ padding: '8px 16px', fontSize: '13px', background: '#4f46e5', borderColor: '#818cf8', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    ✏️ Edit Lab: {editingLabTask.title?.slice(0, 20)}...
                                                    <span
                                                        style={{ cursor: 'pointer', opacity: 0.8, fontSize: '14px' }}
                                                        onClick={(e) => { e.stopPropagation(); setEditingLabTask(null); }}
                                                    >✕</span>
                                                </button>
                                            )}

                                            {previewSolutionsTask && (
                                                <button
                                                    type="button"
                                                    className="faculty-tab-btn active"
                                                    style={{ padding: '8px 16px', fontSize: '13px', background: '#d97706', borderColor: '#fbbf24', color: '#000000', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    🎯 Solutions: {previewSolutionsTask.title?.slice(0, 20)}...
                                                    <span
                                                        style={{ cursor: 'pointer', opacity: 0.8, fontSize: '14px' }}
                                                        onClick={(e) => { e.stopPropagation(); setPreviewSolutionsTask(null); }}
                                                    >✕</span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Filters (Subject Dropdown & Search) */}
                                        {!editingLabTask && !previewSolutionsTask && (
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                {repoSubTab === 'tests' && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <select
                                                            className="form-control"
                                                            value={repoSubjectFilter}
                                                            onChange={e => setRepoSubjectFilter(e.target.value)}
                                                            style={{ fontSize: '13px', padding: '7px 12px', minWidth: '220px', background: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155' }}
                                                        >
                                                            <option value="all">📚 All Academic Subjects</option>
                                                            {subjects.map(s => (
                                                                <option key={s._id} value={s._id}>
                                                                    {s.code} - {s.name} ({s.academicYear})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                <div style={{ minWidth: '240px' }}>
                                                    <input
                                                        className="form-control"
                                                        placeholder="🔍 Search records by title, subject, or year..."
                                                        value={repoSearch}
                                                        onChange={e => setRepoSearch(e.target.value)}
                                                        style={{ fontSize: '13px', padding: '8px 14px' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Inline Edit Panel, Solution Viewer, or Normal Storage Lists */}
                                    {editingLabTask ? (
                                        renderEditLabPanel(() => setEditingLabTask(null))
                                    ) : previewSolutionsTask ? (
                                        renderSolutionViewerPanel(() => setPreviewSolutionsTask(null))
                                    ) : (
                                        <>
                                            {/* 1. Lab Tasks Records */}
                                            {repoSubTab === 'labs' && (
                                        <div className="students-table-scroll">
                                            <table className="students-table">
                                                <thead>
                                                    <tr>
                                                        <th>Lab Task Title</th>
                                                        <th>Subject</th>
                                                        <th>Target Scope</th>
                                                        <th>Max Score</th>
                                                        <th>Reference Solutions</th>
                                                        <th>Created Date</th>
                                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredRepoTasks.map(task => {
                                                        const solutionsCount = Object.values(task.referenceSolutions || {}).filter(s => s?.trim()).length || (task.referenceSolution ? 1 : 0);
                                                        return (
                                                            <tr key={task._id}>
                                                                <td>
                                                                    <strong>{task.title}</strong>
                                                                    <div style={{ fontSize: '11.5px', color: '#94a3b8', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {task.instructions}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className="code-pill">{task.subject?.code || 'Subject'}</span>
                                                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{task.subject?.name}</div>
                                                                </td>
                                                                <td>
                                                                    <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{task.academicYear}</span>
                                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                                        {task.branch || 'All Branches'} {task.section ? `· Sec ${task.section}` : ''}
                                                                    </div>
                                                                </td>
                                                                <td><strong>{task.maxScore || 100}</strong> pts</td>
                                                                <td>
                                                                    <span className="repo-badge repo-badge-info">
                                                                        ⚡ {solutionsCount} / 6 Languages
                                                                    </span>
                                                                </td>
                                                                <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}
                                                                </td>
                                                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-secondary-action"
                                                                        style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}
                                                                        onClick={() => {
                                                                            setPreviewSolutionsTask(task);
                                                                            const firstKey = Object.keys(task.referenceSolutions || {}).find(k => task.referenceSolutions?.[k]?.trim());
                                                                            setPreviewLangTab(firstKey || task.solutionLanguage || 'cpp');
                                                                        }}
                                                                    >
                                                                        👁️ Solutions
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-secondary-action"
                                                                        style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}
                                                                        onClick={() => handleStartEditLab(task)}
                                                                    >
                                                                        ✏️ Edit
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-secondary-action"
                                                                        style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                                                                        onClick={() => handleDeleteLabTask(task._id, task.title)}
                                                                    >
                                                                        🗑️ Remove
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {!filteredRepoTasks.length && (
                                                        <tr>
                                                            <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                                                No lab task records found matching your search.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* 2. Practice Tests Records */}
                                    {repoSubTab === 'tests' && (
                                        <div className="students-table-scroll">
                                            {loadingRepoTests ? (
                                                <p className="loading-text mt-20">Loading practice test records...</p>
                                            ) : (
                                                <table className="students-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Test Title</th>
                                                            <th>Academic Subject</th>
                                                            <th>Target Year / Scope</th>
                                                            <th>Duration</th>
                                                            <th>Question Limit</th>
                                                            <th>Difficulty</th>
                                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredRepoTests.map(test => (
                                                            <tr key={test._id}>
                                                                <td>
                                                                    <strong>{test.title}</strong>
                                                                    {test.description && (
                                                                        <div style={{ fontSize: '11.5px', color: '#94a3b8', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                            {test.description}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {(() => {
                                                                        const matchedSubject = getTestSubject(test);
                                                                        if (matchedSubject) {
                                                                            return (
                                                                                <div>
                                                                                    <span className="code-pill">{matchedSubject.code || 'SUBJECT'}</span>
                                                                                    <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '3px' }}>
                                                                                        {matchedSubject.name}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return (
                                                                            <div>
                                                                                <span className="repo-badge repo-badge-purple" style={{ textTransform: 'capitalize' }}>
                                                                                    {test.category || 'core-cse'}
                                                                                </span>
                                                                                {test.subject && (
                                                                                    <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '3px' }}>
                                                                                        {test.subject.name || test.subject}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td>
                                                                    <span style={{ fontSize: '12px', color: '#e2e8f0' }}>{test.academicYear || 'All Years'}</span>
                                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                                        {test.branch || 'All Branches'} {test.section ? `· Sec ${test.section}` : ''}
                                                                    </div>
                                                                </td>
                                                                <td>{test.duration ? `${test.duration} mins` : 'Untimed'}</td>
                                                                <td>{test.questionLimit || 20} Questions</td>
                                                                <td>
                                                                    <span className={`repo-badge ${test.difficulty === 'hard' ? 'repo-badge-warning' : test.difficulty === 'easy' ? 'repo-badge-success' : 'repo-badge-info'}`} style={{ textTransform: 'capitalize' }}>
                                                                        {test.difficulty || 'medium'}
                                                                    </span>
                                                                </td>
                                                                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-secondary-action"
                                                                        style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }}
                                                                        onClick={() => openQuestionsModal(test)}
                                                                    >
                                                                        ⚙️ Manage Questions
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-secondary-action"
                                                                        style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                                                                        onClick={() => handleDeleteRepoTest(test._id, test.title)}
                                                                    >
                                                                        🗑️ Remove
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {!filteredRepoTests.length && (
                                                            <tr>
                                                                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                                                    No practice tests found for the selected academic subject.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. Study Notes Records */}
                                    {repoSubTab === 'notes' && (
                                        <div className="students-table-scroll">
                                            <table className="students-table">
                                                <thead>
                                                    <tr>
                                                        <th>Note Title</th>
                                                        <th>Subject</th>
                                                        <th>Description / Content</th>
                                                        <th>Attachment Link</th>
                                                        <th>Uploaded Date</th>
                                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredRepoNotes.map(note => (
                                                        <tr key={note._id}>
                                                            <td><strong>{note.title}</strong></td>
                                                            <td>
                                                                <span className="code-pill">{note.subjectCode}</span>
                                                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{note.subjectName}</div>
                                                            </td>
                                                            <td>
                                                                <div style={{ fontSize: '12px', color: '#cbd5e1', maxWidth: '320px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {note.description || note.content || 'Study notes documentation'}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                {note.fileUrl ? (
                                                                    <a href={note.fileUrl} target="_blank" rel="noreferrer" className="repo-badge repo-badge-info" style={{ textDecoration: 'none' }}>
                                                                        📥 Open Material
                                                                    </a>
                                                                ) : (
                                                                    <span style={{ fontSize: '12px', color: '#64748b' }}>No file attached</span>
                                                                )}
                                                            </td>
                                                            <td style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                                {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'N/A'}
                                                            </td>
                                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn-secondary-action"
                                                                    style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                                                                    onClick={() => handleDeleteNote(note._id)}
                                                                >
                                                                    🗑️ Delete Note
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {!filteredRepoNotes.length && (
                                                        <tr>
                                                            <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                                                No study notes records found matching your search.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

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


                </div>
            </div>
        </>
    );
};

export default FacultyDashboard;
