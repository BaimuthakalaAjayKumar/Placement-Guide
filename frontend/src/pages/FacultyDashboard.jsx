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

    // Question Form states inside modal
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [editingQuestionId, setEditingQuestionId] = useState(null);
    const [questionText, setQuestionText] = useState('');
    const [questionImage, setQuestionImage] = useState('');
    const [option1, setOption1] = useState('');
    const [option2, setOption2] = useState('');
    const [option3, setOption3] = useState('');
    const [option4, setOption4] = useState('');
    const [optionImages, setOptionImages] = useState(['', '', '', '']);
    const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
    const [questionDifficulty, setQuestionDifficulty] = useState('medium');
    const [questionExplanation, setQuestionExplanation] = useState('');
    const [explanationImage, setExplanationImage] = useState('');
    const [submittingQuestion, setSubmittingQuestion] = useState(false);
    const [uploadingQImage, setUploadingQImage] = useState(false);
    const [uploadingExpImage, setUploadingExpImage] = useState(false);
    const [uploadingOptImages, setUploadingOptImages] = useState([false, false, false, false]);

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

    // Filters for projects (Year, Branch, Section)
    const [projectSearch, setProjectSearch] = useState('');
    const [projectBranchFilter, setProjectBranchFilter] = useState('');
    const [projectSectionFilter, setProjectSectionFilter] = useState('');
    const [projectYearFilter, setProjectYearFilter] = useState('');

    // Lab Reports state
    const [labReports, setLabReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);

    // Project review & code viewer state
    const [selectedProject, setSelectedProject] = useState(null);
    const [viewingCodeProject, setViewingCodeProject] = useState(null);
    const [viewingFileIdx, setViewingFileIdx] = useState(0);
    const [codeWrap, setCodeWrap] = useState(true);
    const [copiedFileCode, setCopiedFileCode] = useState(false);
    const [projectReviewForm, setProjectReviewForm] = useState({
        status: 'approved',
        grade: '',
        feedback: '',
        codeSuggestions: '',
        techSuggestions: '',
        leadStudentGrade: '',
        leadStudentContribution: '',
        leadStudentFeedback: '',
        teamMembers: []
    });
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

        const matchingScope = (user?.managedScopes || []).find(s => {
            if (s.subject && String(s.subject) === String(currentSubject._id)) return true;
            const yearMatch = !s.academicYear || s.academicYear.toLowerCase() === 'all' ||
                !currentSubject.academicYear ||
                s.academicYear.trim().toLowerCase() === currentSubject.academicYear.trim().toLowerCase() ||
                currentSubject.academicYear.toLowerCase().includes(s.academicYear.toLowerCase());
            const branchMatch = !s.branch || s.branch.toLowerCase() === 'all' ||
                !currentSubject.branch ||
                s.branch.trim().toLowerCase() === currentSubject.branch.trim().toLowerCase();
            return yearMatch && branchMatch;
        }) || (user?.managedScopes || [])[0];

        try {
            setSubmittingNote(true);
            let res;
            if (notePdfFile) {
                const formData = new FormData();
                formData.append('title', noteForm.title);
                formData.append('description', noteForm.description || '');
                formData.append('content', noteForm.content || '');
                formData.append('fileUrl', noteForm.fileUrl || '');
                formData.append('academicYear', matchingScope?.academicYear || currentSubject.academicYear || '');
                formData.append('branch', matchingScope?.branch || currentSubject.branch || '');
                formData.append('section', matchingScope?.section || '');
                formData.append('pdfFile', notePdfFile);

                res = await axios.post(`${API_URL}/academic/subjects/${currentSubject._id}/notes`, formData, {
                    headers: {
                        ...getAuthHeaders().headers,
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                const notePayload = {
                    ...noteForm,
                    academicYear: matchingScope?.academicYear || currentSubject.academicYear || '',
                    branch: matchingScope?.branch || currentSubject.branch || '',
                    section: matchingScope?.section || ''
                };
                res = await axios.post(`${API_URL}/academic/subjects/${currentSubject._id}/notes`, notePayload, getAuthHeaders());
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
            const matched = allTests.filter(t =>
                String(t.subject?._id || t.subject) === String(subject._id) ||
                ((t.createdBy && (String(t.createdBy?._id || t.createdBy) === String(user?._id || user?.id))) &&
                 ((t.title?.toLowerCase().includes(subject.code.toLowerCase())) || (t.title?.toLowerCase().includes(subject.name.toLowerCase()))))
            );
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
            const matchingScope = (user?.managedScopes || []).find(s => {
                if (s.subject && String(s.subject) === String(currentSubject._id)) return true;
                const yearMatch = !s.academicYear || s.academicYear.toLowerCase() === 'all' ||
                    !currentSubject.academicYear ||
                    s.academicYear.trim().toLowerCase() === currentSubject.academicYear.trim().toLowerCase() ||
                    currentSubject.academicYear.toLowerCase().includes(s.academicYear.toLowerCase());
                const branchMatch = !s.branch || s.branch.toLowerCase() === 'all' ||
                    !currentSubject.branch ||
                    s.branch.trim().toLowerCase() === currentSubject.branch.trim().toLowerCase();
                return yearMatch && branchMatch;
            }) || (user?.managedScopes || [])[0];

            const payload = {
                ...testForm,
                category: 'core-cse',
                subject: currentSubject._id,
                academicYear: matchingScope?.academicYear || currentSubject.academicYear || '',
                branch: matchingScope?.branch || currentSubject.branch || '',
                section: matchingScope?.section || ''
            };
            const res = await axios.post(`${API_URL}/tests`, payload, getAuthHeaders());
            setSubjectTests(prev => [res.data.data, ...prev]);
            setShowCreateTestForm(false);
            setTestForm({ title: '', description: '', duration: 20, questionLimit: 20, difficulty: 'medium' });
            setSuccessMsg('Practice test created! Add questions directly in the tab space below.');
            openQuestionsModal(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create practice test.');
        } finally {
            setCreatingTest(false);
        }
    };

    // Helper to format image URLs
    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
        const base = API_URL.replace(/\/api\/?$/, '');
        return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Questions Manager Handlers
    const clearQuestionForm = () => {
        setEditingQuestionId(null);
        setQuestionText('');
        setQuestionImage('');
        setOption1('');
        setOption2('');
        setOption3('');
        setOption4('');
        setOptionImages(['', '', '', '']);
        setCorrectOptionIndex(0);
        setQuestionDifficulty('medium');
        setQuestionExplanation('');
        setExplanationImage('');
    };

    const openQuestionsModal = async (test) => {
        setSelectedTestForQuestions(test);
        setShowQuestionsModal(false);
        setShowQuestionForm(false);
        clearQuestionForm();
        const subjectId = test.subject?._id || test.subject;
        if (subjectId && (!subjectWorkspace || subjectWorkspace.subject?._id !== subjectId)) {
            const subj = subjects.find(s => s._id === subjectId) || (typeof test.subject === 'object' ? test.subject : null);
            if (subj) {
                setActiveTab('subjects');
                setSubjectWorkspace({ subject: subj, activeView: 'tests' });
            }
        } else if (subjectWorkspace) {
            setSubjectWorkspace(prev => ({ ...prev, activeView: 'tests' }));
        }
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

    const handleOpenAddQuestion = () => {
        clearQuestionForm();
        setShowQuestionForm(true);
    };

    const handleOpenEditQuestion = (q) => {
        setEditingQuestionId(q._id);
        setQuestionText(q.questionText || '');
        setQuestionImage(q.questionImage || '');
        setOption1(q.options?.[0] || '');
        setOption2(q.options?.[1] || '');
        setOption3(q.options?.[2] || '');
        setOption4(q.options?.[3] || '');
        setOptionImages([
            q.optionImages?.[0] || '',
            q.optionImages?.[1] || '',
            q.optionImages?.[2] || '',
            q.optionImages?.[3] || ''
        ]);
        setCorrectOptionIndex(q.correctOptionIndex || 0);
        setQuestionDifficulty(q.difficulty || 'medium');
        setQuestionExplanation(q.explanation || '');
        setExplanationImage(q.explanationImage || '');
        setShowQuestionForm(true);
    };

    const handleUploadQuestionImage = async (file, type, optIdx = null) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);

        if (type === 'question') setUploadingQImage(true);
        else if (type === 'explanation') setUploadingExpImage(true);
        else if (type === 'option' && optIdx !== null) {
            setUploadingOptImages(prev => {
                const arr = [...prev];
                arr[optIdx] = true;
                return arr;
            });
        }

        try {
            const res = await axios.post(`${API_URL}/tests/upload-image`, formData, {
                headers: {
                    ...getAuthHeaders().headers,
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (res.data?.success) {
                const uploadedUrl = res.data.url;
                if (type === 'question') {
                    setQuestionImage(uploadedUrl);
                } else if (type === 'explanation') {
                    setExplanationImage(uploadedUrl);
                } else if (type === 'option' && optIdx !== null) {
                    setOptionImages(prev => {
                        const arr = [...prev];
                        arr[optIdx] = uploadedUrl;
                        return arr;
                    });
                }
            } else {
                setError(res.data?.error || 'Image upload failed.');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to upload image.');
        } finally {
            if (type === 'question') setUploadingQImage(false);
            else if (type === 'explanation') setUploadingExpImage(false);
            else if (type === 'option' && optIdx !== null) {
                setUploadingOptImages(prev => {
                    const arr = [...prev];
                    arr[optIdx] = false;
                    return arr;
                });
            }
        }
    };

    const handleSaveQuestion = async (e) => {
        e.preventDefault();
        if (!questionText.trim()) {
            setError('Please provide question prompt text.');
            return;
        }
        if (!option1.trim() || !option2.trim()) {
            setError('Please provide at least Option A and Option B.');
            return;
        }
        if (Number(correctOptionIndex) === 2 && !option3.trim()) {
            setError('Please enter text for Option C since it is selected as the correct answer.');
            return;
        }
        if (Number(correctOptionIndex) === 3 && !option4.trim()) {
            setError('Please enter text for Option D since it is selected as the correct answer.');
            return;
        }
        if (option4.trim() && !option3.trim()) {
            setError('Please provide Option C before providing Option D.');
            return;
        }
        const optionsList = [option1, option2, option3 || '', option4 || ''];
        try {
            setSubmittingQuestion(true);
            const payload = {
                questionText,
                questionImage,
                options: optionsList,
                optionImages,
                correctOptionIndex: Number(correctOptionIndex),
                difficulty: questionDifficulty,
                explanation: questionExplanation,
                explanationImage
            };

            if (editingQuestionId) {
                const res = await axios.put(`${API_URL}/tests/${selectedTestForQuestions._id}/questions/${editingQuestionId}`, payload, getAuthHeaders());
                setTestQuestions(prev => prev.map(q => q._id === editingQuestionId ? res.data.data : q));
                setSuccessMsg('Question updated successfully!');
            } else {
                const res = await axios.post(`${API_URL}/tests/${selectedTestForQuestions._id}/questions`, payload, getAuthHeaders());
                setTestQuestions(prev => [...prev, res.data.data]);
                setSuccessMsg('Question added successfully!');
            }
            if (subjectWorkspace?.subject?._id) {
                fetchSubjectTests(subjectWorkspace.subject._id);
            }
            setShowQuestionForm(false);
            clearQuestionForm();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save question.');
        } finally {
            setSubmittingQuestion(false);
        }
    };

    const handleDeleteQuestion = async (qId) => {
        if (!window.confirm('Delete this question?')) return;
        try {
            await axios.delete(`${API_URL}/tests/${selectedTestForQuestions._id}/questions/${qId}`, getAuthHeaders());
            setTestQuestions(prev => prev.filter(q => q._id !== qId));
            if (subjectWorkspace?.subject?._id) {
                fetchSubjectTests(subjectWorkspace.subject._id);
            }
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

    // Student progress detail viewer (Embedded In-Tab)
    const viewProgress = async (student) => {
        if (selectedStudent?._id === student._id && (progress || progressLoading)) {
            setSelectedStudent(null);
            setProgress(null);
            return;
        }
        try {
            setSelectedStudent(student);
            setProgressLoading(true);
            setError(null);
            const res = await axios.get(`${API_URL}/users/students/${student._id}/progress`, getAuthHeaders());
            setProgress(res.data?.data || null);
            setTimeout(() => {
                document.getElementById('in-tab-student-progress-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 80);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load student progress.');
            setProgress(null);
        } finally {
            setProgressLoading(false);
        }
    };

    // Project grading & suggestions handler
    const handleSaveProjectReview = async (e) => {
        e.preventDefault();
        if (!selectedProject) return;
        try {
            setSavingReview(true);
            const payload = {
                status: projectReviewForm.status,
                grade: projectReviewForm.grade === '' || projectReviewForm.grade === null ? null : Number(projectReviewForm.grade),
                feedback: projectReviewForm.feedback,
                codeSuggestions: projectReviewForm.codeSuggestions,
                techSuggestions: projectReviewForm.techSuggestions,
                leadStudentGrade: projectReviewForm.leadStudentGrade === '' || projectReviewForm.leadStudentGrade === null ? null : Number(projectReviewForm.leadStudentGrade),
                leadStudentContribution: projectReviewForm.leadStudentContribution || '',
                leadStudentFeedback: projectReviewForm.leadStudentFeedback || '',
                teamMembers: (projectReviewForm.teamMembers || []).map(m => ({
                    _id: m._id,
                    name: m.name,
                    rollNumber: m.rollNumber || '',
                    email: m.email || '',
                    role: m.role || 'Developer',
                    contribution: m.contribution || '',
                    grade: m.grade === '' || m.grade === null || m.grade === undefined ? null : Number(m.grade),
                    feedback: m.feedback || ''
                }))
            };
            const res = await axios.put(`${API_URL}/academic/projects/${selectedProject._id}`, payload, getAuthHeaders());
            if (res.data?.success) {
                setSuccessMsg('Project evaluation and individual student grades saved successfully!');
                setSelectedProject(null);
                fetchProjects();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update project review.');
        } finally {
            setSavingReview(false);
        }
    };

    // Download Student Projects CSV Report
    const downloadProjectsReportCSV = () => {
        if (!projects || projects.length === 0) return;
        const escape = val => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const headers = [
            'Project Title',
            'Lead Student Name',
            'Lead Student Email',
            'Roll Number',
            'Academic Year',
            'Branch',
            'Section',
            'Lead Individual Grade',
            'Lead Contribution',
            'Teammates & Individual Grades',
            'Technologies Used',
            'Project Goals',
            'Deployment URL',
            'Repository URL',
            'Status',
            'Overall Grade',
            'Faculty Code Suggestions',
            'Faculty Technology Suggestions',
            'Evaluator Feedback',
            'Reviewed By',
            'Last Updated'
        ];
        const rows = projects.map(p => {
            const teamDetails = (p.teamMembers || []).map(m => `${m.name} (${m.role || 'Dev'}): Grade ${m.grade ?? 'N/A'}`).join('; ');
            return [
                p.title || 'Untitled Project',
                p.student?.name || '',
                p.student?.email || '',
                p.student?.rollNumber || '',
                p.academicYear || p.student?.academicYear || p.student?.year || '',
                p.branch || p.student?.branch || '',
                p.section || p.student?.section || '',
                p.leadStudentGrade ?? p.grade ?? 'N/A',
                p.leadStudentContribution || '',
                teamDetails || 'Individual Project',
                (p.technologies || []).join(', '),
                p.goals || '',
                p.deploymentUrl || p.previewUrl || '',
                p.repositoryUrl || '',
                p.status || 'draft',
                p.grade ?? 'Not graded',
                p.codeSuggestions || '',
                p.techSuggestions || '',
                p.feedback || '',
                p.reviewedBy?.name || '',
                p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : ''
            ];
        });
        const csvContent = `\uFEFF${[headers, ...rows].map(r => r.map(escape).join(',')).join('\n')}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Student_Academic_Projects_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Helper: Render Embedded In-Tab Code Viewer for Student Academic Projects
    const renderInTabProjectCodeViewer = () => {
        if (!viewingCodeProject) return null;

        const files = viewingCodeProject.files || [];
        const currentFile = files[viewingFileIdx] || (files.length > 0 ? files[0] : null);
        const fileContent = currentFile?.content ?? '';
        const fileLines = fileContent.length > 0 ? fileContent.split('\n') : ['// (Empty file content)'];
        const liveUrl = viewingCodeProject.deploymentUrl || viewingCodeProject.previewUrl;
        const repoUrl = viewingCodeProject.repositoryUrl;
        const hasTeam = viewingCodeProject.teamMembers && viewingCodeProject.teamMembers.length > 0;

        const getFileIcon = (filePath) => {
            if (!filePath) return '📄';
            const lower = filePath.toLowerCase();
            if (lower.endsWith('.js') || lower.endsWith('.jsx')) return '⚡';
            if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return '🔷';
            if (lower.endsWith('.html') || lower.endsWith('.htm')) return '🌐';
            if (lower.endsWith('.css') || lower.endsWith('.scss')) return '🎨';
            if (lower.endsWith('.py')) return '🐍';
            if (lower.endsWith('.java')) return '☕';
            if (lower.endsWith('.cpp') || lower.endsWith('.c') || lower.endsWith('.h')) return '⚙️';
            if (lower.endsWith('.json')) return '📦';
            if (lower.endsWith('.md')) return '📝';
            if (lower.endsWith('.sql')) return '🗄️';
            return '📄';
        };

        const handleCopyCurrentCode = () => {
            if (!currentFile) return;
            navigator.clipboard.writeText(currentFile.content || '');
            setCopiedFileCode(true);
            setTimeout(() => setCopiedFileCode(false), 2000);
        };

        return (
            <section id="faculty-in-tab-code-viewer" className="faculty-in-tab-code-panel" aria-label="In-Tab Student Code Viewer">
                {/* Panel Header */}
                <div className="faculty-in-tab-header">
                    <div>
                        <h2>
                            <span>💻 Student Project Code & Architecture:</span>
                            <span style={{ color: '#38bdf8' }}>{viewingCodeProject.title}</span>
                            <span className={`status-pill ${viewingCodeProject.status || 'draft'}`}>
                                {(viewingCodeProject.status || 'draft').replace('_', ' ')}
                            </span>
                        </h2>
                        <p>
                            Submitted by <strong>{viewingCodeProject.student?.name || 'Student'}</strong>{' '}
                            <span>({viewingCodeProject.student?.email || 'No email'} — Roll: {viewingCodeProject.student?.rollNumber || 'N/A'})</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        className="faculty-in-tab-close-btn"
                        onClick={() => setViewingCodeProject(null)}
                        title="Close in-tab code viewer"
                    >
                        ✕ Close Viewer
                    </button>
                </div>

                {/* 4-Box Summary Grid */}
                <div className="code-viewer-summary-grid mt-16">
                    <div className="summary-box">
                        <span className="summary-title">🚀 Deployment Link</span>
                        {liveUrl ? (
                            <a
                                href={liveUrl.startsWith('http') ? liveUrl : `https://${liveUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="summary-link"
                            >
                                {liveUrl} ↗
                            </a>
                        ) : (
                            <span className="text-secondary">Not deployed</span>
                        )}
                    </div>
                    <div className="summary-box">
                        <span className="summary-title">💻 Code Repository</span>
                        {repoUrl ? (
                            <a
                                href={repoUrl.startsWith('http') ? repoUrl : `https://${repoUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                className="summary-link"
                            >
                                {repoUrl} ↗
                            </a>
                        ) : (
                            <span className="text-secondary">No repository link provided</span>
                        )}
                    </div>
                    <div className="summary-box">
                        <span className="summary-title">👥 Team Members</span>
                        {hasTeam ? (
                            <span>{viewingCodeProject.teamMembers.map(m => `${m.name} (${m.role || 'Developer'})`).join(', ')}</span>
                        ) : (
                            <span className="text-secondary">Individual Project</span>
                        )}
                    </div>
                    <div className="summary-box">
                        <span className="summary-title">⚡ Technologies</span>
                        <span>{(viewingCodeProject.technologies || []).join(', ') || 'General Web'}</span>
                    </div>
                </div>

                {/* Project Goals Banner */}
                {viewingCodeProject.goals && (
                    <div className="project-goals-banner mt-14">
                        <strong>🎯 Project Goals & Objectives:</strong>
                        <p>{viewingCodeProject.goals}</p>
                    </div>
                )}

                {/* Files Tabs and Code Viewer */}
                <div className="faculty-file-tabs-container mt-16">
                    <div className="faculty-file-tabs">
                        {files.map((file, idx) => (
                            <button
                                key={file.path || idx}
                                type="button"
                                className={`faculty-file-tab ${viewingFileIdx === idx ? 'active' : ''}`}
                                onClick={() => setViewingFileIdx(idx)}
                            >
                                <span>{getFileIcon(file.path)}</span>
                                <span>{file.path || `file-${idx + 1}`}</span>
                            </button>
                        ))}
                        {files.length === 0 && (
                            <span className="text-secondary" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                                No code files attached to this project submission.
                            </span>
                        )}
                    </div>

                    {currentFile ? (
                        <div className="faculty-code-box">
                            <div className="code-box-header">
                                <div>
                                    <span>File: <strong style={{ color: '#f1f5f9' }}>{currentFile.path}</strong></span>
                                    <span style={{ marginLeft: '10px', color: '#64748b' }}>
                                        ({fileLines.length} {fileLines.length === 1 ? 'line' : 'lines'})
                                    </span>
                                </div>
                                <div className="code-editor-controls">
                                    <button
                                        type="button"
                                        className={`btn-editor-toggle ${codeWrap ? 'active' : ''}`}
                                        onClick={() => setCodeWrap(!codeWrap)}
                                        title="Toggle word wrap"
                                    >
                                        {codeWrap ? '↩ Wrap: ON' : '➡️ Wrap: OFF'}
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn-copy-code ${copiedFileCode ? 'copied' : ''}`}
                                        onClick={handleCopyCurrentCode}
                                        title="Copy file code to clipboard"
                                    >
                                        {copiedFileCode ? '✓ Copied!' : '📋 Copy Code'}
                                    </button>
                                </div>
                            </div>

                            <div className="faculty-code-editor-layout">
                                <div className={`code-lines-scroll ${codeWrap ? 'wrapped' : 'no-wrap'}`}>
                                    {fileLines.map((line, idx) => (
                                        <div className="code-editor-line-row" key={idx}>
                                            <span className="code-line-number">{idx + 1}</span>
                                            <span className="code-line-text">{line || ' '}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                            <p style={{ margin: 0, fontSize: '0.92rem' }}>No code files to display for this project.</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="faculty-in-tab-footer">
                    <div className="faculty-in-tab-footer-meta">
                        {files.length > 0 && (
                            <span>
                                Viewing file <strong>{viewingFileIdx + 1}</strong> of <strong>{files.length}</strong>
                                <span className="dot-sep" style={{ margin: '0 8px' }}>•</span>
                                Select any tab above to switch files
                            </span>
                        )}
                    </div>
                    <div className="faculty-in-tab-footer-actions">
                        <button
                            type="button"
                            className="btn-secondary-action"
                            onClick={() => setViewingCodeProject(null)}
                        >
                            ✕ Close Viewer
                        </button>
                        <button
                            type="button"
                            className="btn-primary-action"
                            onClick={() => {
                                const p = viewingCodeProject;
                                setViewingCodeProject(null);
                                setSelectedProject(p);
                                setProjectReviewForm({
                                    status: p.status || 'approved',
                                    grade: p.grade ?? '',
                                    feedback: p.feedback || '',
                                    codeSuggestions: p.codeSuggestions || '',
                                    techSuggestions: p.techSuggestions || '',
                                    leadStudentGrade: p.leadStudentGrade ?? p.grade ?? '',
                                    leadStudentContribution: p.leadStudentContribution || '',
                                    leadStudentFeedback: p.leadStudentFeedback || '',
                                    teamMembers: (p.teamMembers || []).map(m => ({
                                        ...m,
                                        grade: m.grade ?? '',
                                        contribution: m.contribution || '',
                                        feedback: m.feedback || ''
                                    }))
                                });
                                setTimeout(() => {
                                    const el = document.getElementById('faculty-in-tab-review-panel');
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 80);
                            }}
                        >
                            📝 Proceed to Grade & Suggest
                        </button>
                    </div>
                </div>
            </section>
        );
    };

    // Helper: Render Embedded In-Tab Review & Individual Grading Panel for Student Academic Projects
    const renderInTabProjectReviewPanel = () => {
        if (!selectedProject) return null;

        const hasTeam = selectedProject.teamMembers && selectedProject.teamMembers.length > 0;

        const handleTeammateChange = (index, field, value) => {
            const updated = [...(projectReviewForm.teamMembers || [])];
            if (updated[index]) {
                updated[index] = { ...updated[index], [field]: value };
                setProjectReviewForm({ ...projectReviewForm, teamMembers: updated });
            }
        };

        return (
            <section id="faculty-in-tab-review-panel" className="faculty-in-tab-review-panel" aria-label="In-Tab Student Project Evaluation Panel">
                <div className="faculty-in-tab-header">
                    <div>
                        <h2>
                            <span>📝 Grade & Suggest:</span>
                            <span style={{ color: '#818cf8' }}>{selectedProject.title}</span>
                            <span className={`status-pill ${selectedProject.status || 'draft'}`}>
                                {(selectedProject.status || 'draft').replace('_', ' ')}
                            </span>
                        </h2>
                        <p>
                            Submitted by <strong>{selectedProject.student?.name || 'Student'}</strong>{' '}
                            <span>({selectedProject.student?.email || 'No email'} — Roll: {selectedProject.student?.rollNumber || 'N/A'})</span>
                            {hasTeam && <span style={{ marginLeft: '8px', color: '#38bdf8' }}>• 👥 Team Project ({selectedProject.teamMembers.length + 1} students)</span>}
                        </p>
                    </div>
                    <button
                        type="button"
                        className="faculty-in-tab-close-btn"
                        onClick={() => setSelectedProject(null)}
                        title="Close evaluation panel"
                    >
                        ✕ Close Review
                    </button>
                </div>

                <form className="faculty-review-form mt-18" onSubmit={handleSaveProjectReview}>
                    {/* Overall Evaluation Row */}
                    <div className="form-grid-2col review-status-row">
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
                            <label className="form-label">Overall Project Grade (0 - 100)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                className="form-control"
                                placeholder="e.g. 85"
                                value={projectReviewForm.grade}
                                onChange={e => setProjectReviewForm({ ...projectReviewForm, grade: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* INDIVIDUAL STUDENT GRADES & CONTRIBUTIONS SECTION */}
                    <div className="individual-grading-section mt-18">
                        <div className="section-header-row">
                            <div>
                                <h4 className="section-subtitle">🎯 Individual Student Grades & Contributions</h4>
                                <p className="section-desc">
                                    Based on the contribution of each student, assign individual grades (0–100) and feedback for each member.
                                </p>
                            </div>
                        </div>

                        <div className="faculty-member-grade-cards mt-12">
                            {/* Lead Student Card */}
                            <div className="member-grade-card lead-student-card">
                                <div className="member-card-header">
                                    <div className="member-info">
                                        <span className="member-role-badge lead">👑 Lead Student / Submitter</span>
                                        <strong className="member-name">{selectedProject.student?.name || 'Lead Student'}</strong>
                                        <span className="member-meta">
                                            {selectedProject.student?.email} • Roll: {selectedProject.student?.rollNumber || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="member-grade-input-group">
                                        <label className="grade-label">Individual Grade</label>
                                        <div className="input-with-max">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                className="form-control member-grade-input"
                                                placeholder="Score"
                                                value={projectReviewForm.leadStudentGrade}
                                                onChange={e => setProjectReviewForm({ ...projectReviewForm, leadStudentGrade: e.target.value })}
                                            />
                                            <span className="max-score-tag">/100</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="member-card-body mt-10">
                                    <div className="form-grid-2col">
                                        <div className="form-group">
                                            <label className="form-label-sm">Contribution & Key Tasks Worked On</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. Architecture, core backend REST APIs, system coordination"
                                                value={projectReviewForm.leadStudentContribution}
                                                onChange={e => setProjectReviewForm({ ...projectReviewForm, leadStudentContribution: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label-sm">Specific Feedback for Lead Student</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="e.g. Strong leadership, well-structured models and modular architecture"
                                                value={projectReviewForm.leadStudentFeedback}
                                                onChange={e => setProjectReviewForm({ ...projectReviewForm, leadStudentFeedback: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Teammates Cards */}
                            {(projectReviewForm.teamMembers || []).map((m, idx) => (
                                <div key={m._id || idx} className="member-grade-card teammate-card">
                                    <div className="member-card-header">
                                        <div className="member-info">
                                            <span className="member-role-badge">👥 Teammate • {m.role || 'Developer'}</span>
                                            <strong className="member-name">{m.name}</strong>
                                            <span className="member-meta">
                                                {m.email} {m.rollNumber ? `• Roll: ${m.rollNumber}` : ''}
                                            </span>
                                        </div>
                                        <div className="member-grade-input-group">
                                            <label className="grade-label">Individual Grade</label>
                                            <div className="input-with-max">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    className="form-control member-grade-input"
                                                    placeholder="Score"
                                                    value={m.grade ?? ''}
                                                    onChange={e => handleTeammateChange(idx, 'grade', e.target.value)}
                                                />
                                                <span className="max-score-tag">/100</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="member-card-body mt-10">
                                        <div className="form-grid-2col">
                                            <div className="form-group">
                                                <label className="form-label-sm">Contribution & Key Tasks Worked On</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="e.g. Frontend UI components, state management, unit tests"
                                                    value={m.contribution || ''}
                                                    onChange={e => handleTeammateChange(idx, 'contribution', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label-sm">Specific Feedback for This Student</label>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="e.g. Excellent UI design and responsive layouts"
                                                    value={m.feedback || ''}
                                                    onChange={e => handleTeammateChange(idx, 'feedback', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CODE SUGGESTIONS */}
                    <div className="form-group mt-18">
                        <label className="form-label">
                            💻 Code Review & Optimization Suggestions
                        </label>
                        <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Provide suggestions based on the student's code (e.g. code modularity, variable naming, error handling, algorithmic time complexity, security issues)..."
                            value={projectReviewForm.codeSuggestions}
                            onChange={e => setProjectReviewForm({ ...projectReviewForm, codeSuggestions: e.target.value })}
                        />
                    </div>

                    {/* TECHNOLOGY SUGGESTIONS */}
                    <div className="form-group mt-16">
                        <label className="form-label">
                            ⚡ Technology & Architecture Suggestions
                        </label>
                        <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Suggest relevant technologies, frameworks, libraries, or architectural upgrades (e.g. recommend Redis for caching, Docker containers, TailwindCSS, TypeScript)..."
                            value={projectReviewForm.techSuggestions}
                            onChange={e => setProjectReviewForm({ ...projectReviewForm, techSuggestions: e.target.value })}
                        />
                    </div>

                    {/* GENERAL FEEDBACK */}
                    <div className="form-group mt-16">
                        <label className="form-label">General Evaluator Feedback</label>
                        <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Overall performance evaluation, remarks, and next milestone instructions..."
                            value={projectReviewForm.feedback}
                            onChange={e => setProjectReviewForm({ ...projectReviewForm, feedback: e.target.value })}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="faculty-in-tab-footer mt-20">
                        <div className="faculty-in-tab-footer-meta">
                            <span>Individual student grades and feedback will be visible in each student's account.</span>
                        </div>
                        <div className="faculty-in-tab-footer-actions">
                            <button type="button" className="btn-secondary-action" onClick={() => setSelectedProject(null)}>
                                ✕ Close Review
                            </button>
                            <button type="submit" className="btn-primary-action" disabled={savingReview}>
                                {savingReview ? 'Saving Evaluation...' : '💾 Save Evaluation & Individual Grades'}
                            </button>
                        </div>
                    </div>
                </form>
            </section>
        );
    };

    // Helper: Render Embedded In-Tab Student Progress Dossier (Image 2 Tab Layout)
    const renderInTabStudentProgressPanel = () => {
        if (progressLoading && selectedStudent) {
            return (
                <div className="faculty-in-tab-progress-panel loading-card animate-fade" id="in-tab-student-progress-panel">
                    <div className="spinner-loader" style={{ width: '28px', height: '28px', margin: '0 auto 10px' }}></div>
                    <p style={{ margin: 0, color: '#38bdf8', fontWeight: 600, fontSize: '14px' }}>
                        Loading student progress dossier for {selectedStudent.name}...
                    </p>
                </div>
            );
        }

        if (!progress || !selectedStudent) return null;

        return (
            <section className="faculty-in-tab-progress-panel animate-fade" id="in-tab-student-progress-panel">
                {/* Header */}
                <div className="progress-panel-header">
                    <div className="progress-student-info">
                        <div className="student-avatar-badge">🎓</div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', fontWeight: 700 }}>
                                    {selectedStudent.name}
                                </h3>
                                <span className="student-year-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.35)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                                    📅 Year: {selectedStudent.academicYear || selectedStudent.year || 'N/A'}
                                </span>
                                <span className="student-scope-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                                    🏢 Branch: {selectedStudent.branch || 'N/A'}
                                </span>
                                <span className="student-scope-pill" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                                    🏷️ Section: Sec {selectedStudent.section || '—'}
                                </span>
                            </div>
                            <p className="student-meta-subline">
                                <span>📧 {selectedStudent.email}</span>
                                {selectedStudent.rollNumber && <span>🆔 {selectedStudent.rollNumber}</span>}
                            </p>
                        </div>
                    </div>
                    <div className="progress-header-actions">
                        <button
                            type="button"
                            className="btn-close-in-tab-progress"
                            onClick={() => { setProgress(null); setSelectedStudent(null); }}
                            title="Close student progress dossier"
                        >
                            ✕ Close Dossier
                        </button>
                    </div>
                </div>

                {/* Summary Metrics Grid */}
                <div className="progress-stats-row">
                    <div className="progress-metric-card readiness-metric">
                        <span className="metric-label">Readiness Index</span>
                        <strong className="metric-val">{selectedStudent.readinessScore || 0}%</strong>
                        <div className="metric-bar-bg">
                            <div className="metric-bar-fill" style={{ width: `${Math.min(100, selectedStudent.readinessScore || 0)}%` }}></div>
                        </div>
                    </div>
                    <div className="progress-metric-card">
                        <span className="metric-label">Aptitude Tests</span>
                        <strong className="metric-val">{progress.attempts?.length || 0}</strong>
                        <span className="metric-subtext">Completed Tests</span>
                    </div>
                    <div className="progress-metric-card">
                        <span className="metric-label">Coding Submissions</span>
                        <strong className="metric-val">{progress.submissions?.length || 0}</strong>
                        <span className="metric-subtext">Problems Solved</span>
                    </div>
                    <div className="progress-metric-card">
                        <span className="metric-label">Projects</span>
                        <strong className="metric-val">{progress.projects?.length || 0}</strong>
                        <span className="metric-subtext">Projects Submitted</span>
                    </div>
                    <div className="progress-metric-card">
                        <span className="metric-label">Lab Attempts</span>
                        <strong className="metric-val">{progress.labAttempts?.length || 0}</strong>
                        <span className="metric-subtext">Lab Tasks Completed</span>
                    </div>
                </div>

                {/* 3 Activity Breakdown Columns */}
                <div className="progress-activity-grid">
                    {/* Column 1: Recent Aptitude Tests */}
                    <div className="activity-column-card">
                        <div className="activity-col-header">
                            <span className="col-icon">📝</span>
                            <h4>Recent Aptitude Tests</h4>
                            <span className="col-count-pill">{progress.attempts?.length || 0}</span>
                        </div>
                        <div className="activity-items-list">
                            {progress.attempts?.length ? progress.attempts.slice(0, 5).map(attempt => (
                                <div key={attempt._id} className="attempt-item-card">
                                    <div className="attempt-item-top">
                                        <strong title={attempt.test?.title || 'Aptitude Test'}>
                                            {attempt.test?.title || 'Aptitude Test'}
                                        </strong>
                                        <span className="attempt-score-chip">
                                            Score: {attempt.score}/{attempt.totalQuestions || 20}
                                        </span>
                                    </div>
                                    <div className="attempt-item-bottom">
                                        <span className="attempt-category">{attempt.test?.category || 'Assessment'}</span>
                                        {attempt.completedAt && (
                                            <span className="attempt-date">{new Date(attempt.completedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="no-data-note">No practice tests attempted for your subjects yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Column 2: Projects Submitted */}
                    <div className="activity-column-card">
                        <div className="activity-col-header">
                            <span className="col-icon">🚀</span>
                            <h4>Projects Submitted</h4>
                            <span className="col-count-pill">{progress.projects?.length || 0}</span>
                        </div>
                        <div className="activity-items-list">
                            {progress.projects?.length ? progress.projects.map(proj => (
                                <div key={proj._id} className="attempt-item-card">
                                    <div className="attempt-item-top">
                                        <strong title={proj.title}>{proj.title}</strong>
                                        <span className={`status-pill-mini ${proj.status || 'draft'}`}>
                                            {(proj.status || 'draft').replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className="attempt-item-bottom">
                                        <span className="proj-grade-text" style={{ color: proj.grade !== null && proj.grade !== undefined ? '#10b981' : '#f59e0b' }}>
                                            {proj.grade !== null && proj.grade !== undefined ? `★ Grade: ${proj.grade}/100` : '⏳ Pending review'}
                                        </span>
                                        {proj.updatedAt && (
                                            <span className="attempt-date">{new Date(proj.updatedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                    {proj.feedback && (
                                        <p className="proj-feedback-snippet"><em>"{proj.feedback}"</em></p>
                                    )}
                                </div>
                            )) : (
                                <p className="no-data-note">No projects submitted yet.</p>
                            )}
                        </div>
                    </div>

                    {/* Column 3: Lab Practice Attempts */}
                    <div className="activity-column-card">
                        <div className="activity-col-header">
                            <span className="col-icon">🧪</span>
                            <h4>Lab Practice Attempts</h4>
                            <span className="col-count-pill">{progress.labAttempts?.length || 0}</span>
                        </div>
                        <div className="activity-items-list">
                            {progress.labAttempts?.length ? progress.labAttempts.slice(0, 5).map(attempt => (
                                <div key={attempt._id} className="attempt-item-card">
                                    <div className="attempt-item-top">
                                        <strong title={attempt.task?.title || 'Lab Task'}>
                                            {attempt.task?.title || 'Lab Task'}
                                        </strong>
                                        <span className="attempt-score-chip lab-score">Score: {attempt.score || 100}</span>
                                    </div>
                                    <div className="attempt-item-bottom">
                                        <span className="attempt-category">Completed</span>
                                        {attempt.updatedAt && (
                                            <span className="attempt-date">{new Date(attempt.updatedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <p className="no-data-note">No lab attempts recorded yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
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

    // Filter projects (Year, Branch, Section, Search)
    const filteredProjects = projects.filter(p => {
        const titleMatch = (p.title || '').toLowerCase().includes(projectSearch.toLowerCase());
        const studentNameMatch = (p.student?.name || '').toLowerCase().includes(projectSearch.toLowerCase());
        const studentRollMatch = (p.student?.rollNumber || '').toLowerCase().includes(projectSearch.toLowerCase());
        const searchMatches = !projectSearch.trim() || titleMatch || studentNameMatch || studentRollMatch;

        const pBranch = p.branch || p.student?.branch || '';
        const branchMatches = !projectBranchFilter || pBranch.toLowerCase() === projectBranchFilter.toLowerCase();

        const pSection = p.section || p.student?.section || '';
        const sectionMatches = !projectSectionFilter || pSection.toLowerCase() === projectSectionFilter.toLowerCase();

        const pYear = p.academicYear || p.student?.academicYear || p.student?.year || '';
        const yearMatches = !projectYearFilter || pYear.toLowerCase().includes(projectYearFilter.toLowerCase());

        return searchMatches && branchMatches && sectionMatches && yearMatches;
    });

    const uniqueProjectBranches = [...new Set(projects.map(p => p.branch || p.student?.branch).filter(Boolean))];
    const uniqueProjectSections = [...new Set(projects.map(p => p.section || p.student?.section).filter(Boolean))];
    const uniqueProjectYears = [...new Set(projects.map(p => p.academicYear || p.student?.academicYear || p.student?.year).filter(Boolean))];

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

                                {/* IN-TAB STUDENT PROGRESS DOSSIER (IMAGE 2 TAB SPACE) */}
                                {renderInTabStudentProgressPanel()}

                                {loading ? (
                                    <p className="loading-text">Loading student records...</p>
                                ) : (
                                    <div className="students-table-scroll">
                                        <table className="students-table">
                                            <thead>
                                                <tr>
                                                    <th>Student</th>
                                                    <th>Email</th>
                                                    <th>Academic Year</th>
                                                    <th>Branch</th>
                                                    <th>Section</th>
                                                    <th>Readiness Index</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredStudents.map(student => {
                                                    const isViewingThisStudent = selectedStudent?._id === student._id && (progress || progressLoading);
                                                    return (
                                                        <tr key={student._id} className={isViewingThisStudent ? 'row-active-progress' : ''}>
                                                            <td>
                                                                <strong>{student.name}</strong>
                                                                {student.rollNumber && <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>🆔 {student.rollNumber}</div>}
                                                            </td>
                                                            <td>{student.email}</td>
                                                            <td>
                                                                <span className="code-pill" style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.12)', color: '#c7d2fe', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                                                                    {student.academicYear || student.year || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="code-pill" style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                                                    {student.branch || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="code-pill" style={{ fontSize: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)', fontWeight: 600 }}>
                                                                    Sec {student.section || '—'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={`score-badge ${student.readinessScore >= 70 ? 'high' : student.readinessScore >= 40 ? 'medium' : 'low'}`}>
                                                                    {student.readinessScore || 0}%
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className={`btn-view ${isViewingThisStudent ? 'active' : ''}`}
                                                                    onClick={() => viewProgress(student)}
                                                                >
                                                                    {isViewingThisStudent ? '🔼 Hide Progress' : 'View Full Progress'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {filteredStudents.length === 0 && (
                                                    <tr>
                                                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
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
                                            {selectedTestForQuestions ? (
                                                /* QUESTION MANAGEMENT INLINE IN TAB SPACE (IMAGE 2) */
                                                <div className="animate-fade">
                                                    {/* Header with Back button and Add Question button */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => {
                                                                    setSelectedTestForQuestions(null);
                                                                    setShowQuestionForm(false);
                                                                    clearQuestionForm();
                                                                    if (subjectWorkspace?.subject?._id) {
                                                                        fetchSubjectTests(subjectWorkspace.subject._id);
                                                                    }
                                                                }}
                                                            >
                                                                ← Back to Practice Tests
                                                            </button>
                                                            <div>
                                                                <h4 style={{ margin: 0, fontSize: '17px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span>📝</span> Manage Questions — {selectedTestForQuestions.title}
                                                                </h4>
                                                                <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '3px' }}>
                                                                    Question Pool · Shuffles and serves up to {selectedTestForQuestions.questionLimit || 20} questions per student attempt
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!showQuestionForm && (
                                                            <button
                                                                type="button"
                                                                className="btn-gradient-add"
                                                                onClick={handleOpenAddQuestion}
                                                            >
                                                                ➕ Add New Question
                                                            </button>
                                                        )}
                                                    </div>

                                                    {!showQuestionForm ? (
                                                        <>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                                                <span style={{ fontSize: '13.5px', color: '#cbd5e1' }}>
                                                                    Total Questions in Pool: <strong style={{ color: '#c084fc' }}>{testQuestions.length}</strong>
                                                                </span>
                                                            </div>

                                                            {loadingQuestions ? (
                                                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                                                    <div className="spinner-loader"></div>
                                                                    <p style={{ marginTop: '12px', color: '#94a3b8' }}>Fetching question pool...</p>
                                                                </div>
                                                            ) : (
                                                                <div className="questions-pool-list">
                                                                    {testQuestions.length > 0 ? (
                                                                        testQuestions.map((q, idx) => (
                                                                            <div key={q._id || idx} className="question-pool-item">
                                                                                <div className="q-item-header">
                                                                                    <span className="q-number">Question #{idx + 1}</span>
                                                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                                        <span className={`difficulty-badge ${q.difficulty || 'medium'}`}>
                                                                                            {q.difficulty || 'medium'}
                                                                                        </span>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="icon-action-btn edit"
                                                                                            title="Edit Question"
                                                                                            onClick={() => handleOpenEditQuestion(q)}
                                                                                        >
                                                                                            ✏️
                                                                                        </button>
                                                                                        <button
                                                                                            type="button"
                                                                                            className="icon-action-btn delete"
                                                                                            title="Delete Question"
                                                                                            onClick={() => handleDeleteQuestion(q._id)}
                                                                                        >
                                                                                            ❌
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                <div style={{ marginTop: '10px' }}>
                                                                                    <p className="q-text"><strong>{q.questionText}</strong></p>
                                                                                    {q.questionImage && (
                                                                                        <img
                                                                                            src={getImageUrl(q.questionImage)}
                                                                                            alt="Question prompt visual"
                                                                                            className="q-image-thumbnail"
                                                                                        />
                                                                                    )}
                                                                                    <ul className="q-options-list">
                                                                                        {(q.options || []).map((opt, oIdx) => (
                                                                                            <li key={oIdx} className={oIdx === q.correctOptionIndex ? 'correct-option' : ''}>
                                                                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                                                                                    <span>
                                                                                                        <strong>{String.fromCharCode(65 + oIdx)}.</strong> {opt} {oIdx === q.correctOptionIndex && '✓ (Correct)'}
                                                                                                    </span>
                                                                                                </div>
                                                                                                {q.optionImages?.[oIdx] && (
                                                                                                    <img
                                                                                                        src={getImageUrl(q.optionImages[oIdx])}
                                                                                                        alt={`Option ${String.fromCharCode(65 + oIdx)}`}
                                                                                                        style={{ maxHeight: '70px', borderRadius: '4px', marginTop: '6px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                                                    />
                                                                                                )}
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                    {(q.explanation || q.explanationImage) && (
                                                                                        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(15, 23, 42, 0.65)', borderRadius: '6px', fontSize: '12.5px', color: '#cbd5e1' }}>
                                                                                            {q.explanation && <div>💡 <strong>Explanation:</strong> {q.explanation}</div>}
                                                                                            {q.explanationImage && (
                                                                                                <img
                                                                                                    src={getImageUrl(q.explanationImage)}
                                                                                                    alt="Explanation"
                                                                                                    className="q-image-thumbnail"
                                                                                                />
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '10px' }}>
                                                                            <p style={{ margin: 0, fontSize: '15px' }}>No questions in this test pool yet. Click "Add New Question" above to create one.</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        /* Question Add / Edit Form */
                                                        <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(15, 23, 42, 0.4)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                                                                <h4 style={{ margin: 0, color: '#c084fc', fontSize: '16px' }}>
                                                                    {editingQuestionId ? '✏️ Edit MCQ Question' : '➕ Add New MCQ Question'}
                                                                </h4>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-secondary btn-sm"
                                                                    onClick={() => setShowQuestionForm(false)}
                                                                >
                                                                    ← Back to Question Pool
                                                                </button>
                                                            </div>

                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '12.5px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                                                    Question Prompt / Scenario *
                                                                </label>
                                                                <textarea
                                                                    className="form-control"
                                                                    rows={3}
                                                                    placeholder="Enter question text, code problem, or scenario..."
                                                                    value={questionText}
                                                                    onChange={e => setQuestionText(e.target.value)}
                                                                    required
                                                                />
                                                            </div>

                                                            {/* Question Image Upload */}
                                                            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                                                    🖼️ Question Image (Optional)
                                                                </label>
                                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                    <input
                                                                        type="text"
                                                                        className="form-control"
                                                                        placeholder="Image URL or choose file from device..."
                                                                        value={questionImage}
                                                                        onChange={e => setQuestionImage(e.target.value)}
                                                                        style={{ flex: 1, minWidth: '200px' }}
                                                                    />
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        id="faculty-q-image"
                                                                        style={{ display: 'none' }}
                                                                        onChange={e => handleUploadQuestionImage(e.target.files[0], 'question')}
                                                                    />
                                                                    <label htmlFor="faculty-q-image" className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap' }}>
                                                                        {uploadingQImage ? 'Uploading...' : '📁 Choose Image'}
                                                                    </label>
                                                                    {questionImage && (
                                                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuestionImage('')} style={{ color: '#ef4444' }}>
                                                                            Clear
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {questionImage && (
                                                                    <div style={{ marginTop: '10px' }}>
                                                                        <img src={getImageUrl(questionImage)} alt="Question visual preview" style={{ maxHeight: '80px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Options Grid with per-option Image Upload */}
                                                            <div>
                                                                <label style={{ display: 'block', fontSize: '12.5px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>
                                                                    MCQ Options (With Optional Option Images)
                                                                </label>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                                                    {[
                                                                        { label: 'Option A *', val: option1, setVal: setOption1, idx: 0 },
                                                                        { label: 'Option B *', val: option2, setVal: setOption2, idx: 1 },
                                                                        { label: 'Option C', val: option3, setVal: setOption3, idx: 2 },
                                                                        { label: 'Option D', val: option4, setVal: setOption4, idx: 3 }
                                                                    ].map(opt => (
                                                                        <div key={opt.idx} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '12px', borderRadius: '8px', border: correctOptionIndex === opt.idx ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(255,255,255,0.06)' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                                                <label style={{ fontSize: '12px', fontWeight: 600, color: correctOptionIndex === opt.idx ? '#34d399' : '#cbd5e1' }}>
                                                                                    {opt.label} {correctOptionIndex === opt.idx && '✓ (Correct Choice)'}
                                                                                </label>
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                className="form-control"
                                                                                placeholder={`Choice for ${opt.label.replace(' *', '')}`}
                                                                                value={opt.val}
                                                                                onChange={e => opt.setVal(e.target.value)}
                                                                                required={opt.idx < 2}
                                                                            />
                                                                            {/* Option Image Upload */}
                                                                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    id={`faculty-opt-img-${opt.idx}`}
                                                                                    style={{ display: 'none' }}
                                                                                    onChange={e => handleUploadQuestionImage(e.target.files[0], 'option', opt.idx)}
                                                                                />
                                                                                <label htmlFor={`faculty-opt-img-${opt.idx}`} className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, fontSize: '11px', padding: '3px 8px' }}>
                                                                                    {uploadingOptImages[opt.idx] ? 'Uploading...' : '📁 Option Image'}
                                                                                </label>
                                                                                {optionImages[opt.idx] && (
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                        <img
                                                                                            src={getImageUrl(optionImages[opt.idx])}
                                                                                            alt="Option visual"
                                                                                            style={{ maxHeight: '36px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            className="btn btn-secondary btn-sm"
                                                                                            style={{ fontSize: '10px', padding: '2px 6px', color: '#ef4444' }}
                                                                                            onClick={() => setOptionImages(prev => { const arr = [...prev]; arr[opt.idx] = ''; return arr; })}
                                                                                        >
                                                                                            ×
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Correct Option & Difficulty */}
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                                                <div>
                                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                                                        Correct Answer Key *
                                                                    </label>
                                                                    <select
                                                                        className="form-control"
                                                                        value={correctOptionIndex}
                                                                        onChange={e => setCorrectOptionIndex(Number(e.target.value))}
                                                                    >
                                                                        <option value={0}>Option A</option>
                                                                        <option value={1}>Option B</option>
                                                                        <option value={2}>Option C</option>
                                                                        <option value={3}>Option D</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                                                        Difficulty Tier
                                                                    </label>
                                                                    <select
                                                                        className="form-control"
                                                                        value={questionDifficulty}
                                                                        onChange={e => setQuestionDifficulty(e.target.value)}
                                                                    >
                                                                        <option value="easy">Easy</option>
                                                                        <option value="medium">Medium</option>
                                                                        <option value="hard">Hard</option>
                                                                    </select>
                                                                </div>
                                                            </div>

                                                            {/* Explanation Text & Image */}
                                                            <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                                                    💡 Explanation / Solution Step (Optional)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    placeholder="Explain why this option is correct to help students learn..."
                                                                    value={questionExplanation}
                                                                    onChange={e => setQuestionExplanation(e.target.value)}
                                                                    style={{ marginBottom: '8px' }}
                                                                />
                                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        id="faculty-exp-image"
                                                                        style={{ display: 'none' }}
                                                                        onChange={e => handleUploadQuestionImage(e.target.files[0], 'explanation')}
                                                                    />
                                                                    <label htmlFor="faculty-exp-image" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap' }}>
                                                                        {uploadingExpImage ? 'Uploading...' : '📁 Choose Explanation Image'}
                                                                    </label>
                                                                    {explanationImage && (
                                                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExplanationImage('')} style={{ color: '#ef4444' }}>
                                                                            Clear
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {explanationImage && (
                                                                    <div style={{ marginTop: '10px' }}>
                                                                        <img src={getImageUrl(explanationImage)} alt="Explanation visual preview" style={{ maxHeight: '80px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                                                                <button
                                                                    type="submit"
                                                                    className="btn btn-primary"
                                                                    disabled={submittingQuestion}
                                                                    style={{ minWidth: '160px' }}
                                                                >
                                                                    {submittingQuestion ? 'Saving Question...' : '💾 Save Question'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-secondary"
                                                                    onClick={() => setShowQuestionForm(false)}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </form>
                                                    )}
                                                </div>
                                            ) : (
                                                /* REGULAR TESTS LIST VIEW */
                                                <>
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
                                                </>
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
                                            <p className="card-desc">Curriculum preparation subjects assigned to your academic scope (Year & Branch). Click any subject action to access study notes, practice tests, and student reports.</p>
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
                                                        <th>Branch</th>
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
                                                            <td>{s.branch || 'All Branches'}</td>
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
                            <div className="project-tab-header">
                                <div>
                                    <h3>📁 Student Academic Projects Review</h3>
                                    <p className="card-desc">Review submitted capstone and studio projects, inspect code written by students, offer suggestions on code and technology, and download evaluation reports.</p>
                                </div>
                                <div className="project-tab-actions">
                                    <button
                                        type="button"
                                        className="btn-primary-action btn-sm"
                                        onClick={downloadProjectsReportCSV}
                                        disabled={!projects.length}
                                        title="Download full student projects report as CSV"
                                    >
                                        📥 Download Reports (CSV)
                                    </button>
                                </div>
                            </div>

                            {/* PROJECT SCOPE FILTER TOOLBAR */}
                            <div className="section-toolbar mt-16" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(15, 23, 42, 0.4)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '240px' }}>
                                    <input
                                        type="text"
                                        className="form-control"
                                        style={{ maxWidth: '280px', height: '36px', fontSize: '13px' }}
                                        placeholder="Search by project or student..."
                                        value={projectSearch}
                                        onChange={e => setProjectSearch(e.target.value)}
                                    />
                                    <select
                                        className="form-control"
                                        style={{ width: 'auto', minWidth: '130px', height: '36px', fontSize: '13px' }}
                                        value={projectYearFilter}
                                        onChange={e => setProjectYearFilter(e.target.value)}
                                    >
                                        <option value="">All Academic Years</option>
                                        {uniqueProjectYears.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <select
                                        className="form-control"
                                        style={{ width: 'auto', minWidth: '120px', height: '36px', fontSize: '13px' }}
                                        value={projectBranchFilter}
                                        onChange={e => setProjectBranchFilter(e.target.value)}
                                    >
                                        <option value="">All Branches</option>
                                        {uniqueProjectBranches.map(br => <option key={br} value={br}>{br}</option>)}
                                    </select>
                                    <select
                                        className="form-control"
                                        style={{ width: 'auto', minWidth: '120px', height: '36px', fontSize: '13px' }}
                                        value={projectSectionFilter}
                                        onChange={e => setProjectSectionFilter(e.target.value)}
                                    >
                                        <option value="">All Sections</option>
                                        {uniqueProjectSections.map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
                                    </select>
                                </div>
                                <div style={{ fontSize: '12.5px', color: '#94a3b8' }}>
                                    Showing <strong>{filteredProjects.length}</strong> of {projects.length} scoped projects
                                </div>
                            </div>

                            {/* IN-TAB STUDENT PROJECT CODE VIEWER */}
                            {renderInTabProjectCodeViewer()}

                            {/* IN-TAB STUDENT PROJECT REVIEW & INDIVIDUAL GRADING PANEL */}
                            {renderInTabProjectReviewPanel()}

                            {loading ? (
                                <p className="loading-text">Loading projects...</p>
                            ) : (
                                <div className="students-table-scroll mt-16">
                                    <table className="students-table projects-eval-table">
                                        <thead>
                                            <tr>
                                                <th>Project Title & Links</th>
                                                <th>Lead Student & Teammates</th>
                                                <th>Technologies Used</th>
                                                <th>Goals & Objectives</th>
                                                <th>Status</th>
                                                <th>Grade</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProjects.map(p => {
                                                const hasTeam = p.teamMembers && p.teamMembers.length > 0;
                                                const liveUrl = p.deploymentUrl || p.previewUrl;
                                                const pYear = p.academicYear || p.student?.academicYear || p.student?.year;
                                                const pBranch = p.branch || p.student?.branch;
                                                const pSection = p.section || p.student?.section;
                                                return (
                                                    <tr key={p._id} className={`${viewingCodeProject?._id === p._id ? 'row-viewing-code' : ''} ${selectedProject?._id === p._id ? 'row-reviewing-project' : ''}`}>
                                                        <td>
                                                            <div className="table-project-title">
                                                                <strong>{p.title}</strong>
                                                                <div className="project-table-links mt-4">
                                                                    {liveUrl && (
                                                                        <a
                                                                            href={liveUrl.startsWith('http') ? liveUrl : `https://${liveUrl}`}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="table-link-live"
                                                                            title="Open Live Deployment"
                                                                        >
                                                                            🚀 Live App ↗
                                                                        </a>
                                                                    )}
                                                                    {p.repositoryUrl && (
                                                                        <a
                                                                            href={p.repositoryUrl}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="table-link-repo"
                                                                            title="Open GitHub Repository"
                                                                        >
                                                                            💻 GitHub ↗
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="table-student-col">
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <strong>{p.student?.name || 'Student'}</strong>
                                                                    {p.leadStudentGrade !== null && p.leadStudentGrade !== undefined && (
                                                                        <span className="member-grade-pill" title="Lead Student Grade">★ {p.leadStudentGrade}</span>
                                                                    )}
                                                                </div>
                                                                <span className="text-secondary" style={{ fontSize: '11px' }}>
                                                                    {p.student?.email}
                                                                    {p.student?.rollNumber && ` · ${p.student.rollNumber}`}
                                                                </span>
                                                                {/* Scope Badges */}
                                                                <div style={{ marginTop: '4px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                                    {pYear && (
                                                                        <span className="code-pill" style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.12)', color: '#c7d2fe', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                                                                            🎓 {pYear}
                                                                        </span>
                                                                    )}
                                                                    {pBranch && (
                                                                        <span className="code-pill" style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                                                                            🏫 {pBranch}
                                                                        </span>
                                                                    )}
                                                                    {pSection && (
                                                                        <span className="code-pill" style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)', fontWeight: 600 }}>
                                                                            Sec {pSection}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {hasTeam && (
                                                                    <details className="teammates-collapsible mt-4">
                                                                        <summary className="teammates-summary">
                                                                            👥 +{p.teamMembers.length} Teammates
                                                                        </summary>
                                                                        <ul className="teammates-dropdown">
                                                                            {p.teamMembers.map((m, idx) => (
                                                                                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                                                                                    <div>
                                                                                        <strong>{m.name}</strong>
                                                                                        {m.rollNumber && <span> ({m.rollNumber})</span>}
                                                                                        {m.role && <span className="teammate-role-tag"> - {m.role}</span>}
                                                                                    </div>
                                                                                    {m.grade !== null && m.grade !== undefined && (
                                                                                        <span className="member-grade-pill" title="Teammate Individual Grade">★ {m.grade}</span>
                                                                                    )}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </details>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="table-tech-tags">
                                                                {p.technologies && p.technologies.length > 0 ? (
                                                                    p.technologies.map(t => (
                                                                        <span key={t} className="table-tech-pill">{t}</span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-secondary" style={{ fontSize: '11px' }}>General</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="table-goals-cell" title={p.goals || 'No goals specified'}>
                                                                {p.goals ? (
                                                                    p.goals.length > 80 ? `${p.goals.substring(0, 80)}...` : p.goals
                                                                ) : (
                                                                    <span className="text-secondary" style={{ fontSize: '11px' }}>Not documented</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`status-pill ${p.status}`}>
                                                                {(p.status || 'draft').replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {p.grade !== null && p.grade !== undefined ? (
                                                                <strong style={{ color: '#fbbf24' }}>{p.grade}/100</strong>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8' }}>Not graded</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="table-actions-cell">
                                                                <button
                                                                    className={`btn-view ${viewingCodeProject?._id === p._id ? 'active' : ''}`}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (viewingCodeProject?._id === p._id) {
                                                                            setViewingCodeProject(null);
                                                                        } else {
                                                                            setViewingCodeProject(p);
                                                                            setViewingFileIdx(0);
                                                                            setTimeout(() => {
                                                                                const el = document.getElementById('faculty-in-tab-code-viewer');
                                                                                if (el) {
                                                                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                                }
                                                                            }, 80);
                                                                        }
                                                                    }}
                                                                    title="View Code and Files written by student"
                                                                >
                                                                    {viewingCodeProject?._id === p._id ? '🔼 Hide Code' : '👁️ View Code'}
                                                                </button>
                                                                <button
                                                                    className={`btn-primary-action btn-sm ${selectedProject?._id === p._id ? 'active' : ''}`}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (selectedProject?._id === p._id) {
                                                                            setSelectedProject(null);
                                                                        } else {
                                                                            setSelectedProject(p);
                                                                            setProjectReviewForm({
                                                                                status: p.status || 'approved',
                                                                                grade: p.grade ?? '',
                                                                                feedback: p.feedback || '',
                                                                                codeSuggestions: p.codeSuggestions || '',
                                                                                techSuggestions: p.techSuggestions || '',
                                                                                leadStudentGrade: p.leadStudentGrade ?? p.grade ?? '',
                                                                                leadStudentContribution: p.leadStudentContribution || '',
                                                                                leadStudentFeedback: p.leadStudentFeedback || '',
                                                                                teamMembers: (p.teamMembers || []).map(m => ({
                                                                                    ...m,
                                                                                    grade: m.grade ?? '',
                                                                                    contribution: m.contribution || '',
                                                                                    feedback: m.feedback || ''
                                                                                }))
                                                                            });
                                                                            setTimeout(() => {
                                                                                const el = document.getElementById('faculty-in-tab-review-panel');
                                                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                            }, 80);
                                                                        }
                                                                    }}
                                                                    title="Grade individual students and give suggestions on code & technology"
                                                                >
                                                                    {selectedProject?._id === p._id ? '🔼 Hide Form' : '📝 Grade & Suggest'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {!filteredProjects.length && (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                                                        {projects.length ? 'No student projects match current scope filter criteria.' : 'No student project submissions found in your assigned scope.'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
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
                                const subId = String(test.subject?._id || test.subject);
                                return subjects.find(s => String(s._id) === subId) || (typeof test.subject === 'object' ? test.subject : null);
                            }
                            return null;
                        };

                        // Only showcase tests kept by the faculty in their academic subjects (excluding platform generic tests)
                        const currentFacultyId = String(user?._id || user?.id || '');
                        const academicSubjectTests = repoTests.filter(t => {
                            const hasSubjectLink = t.subject && subjects.some(s => String(s._id) === String(t.subject?._id || t.subject));
                            const createdByFaculty = t.createdBy && String(t.createdBy?._id || t.createdBy) === currentFacultyId;
                            return hasSubjectLink || createdByFaculty;
                        });

                        // Filter tests by specific subject selection and search
                        const filteredRepoTests = academicSubjectTests.filter(t => {
                            const sub = getTestSubject(t);
                            const matchesSubject = repoSubjectFilter === 'all' ||
                                (sub && (String(sub._id) === String(repoSubjectFilter) || sub.code?.toLowerCase() === repoSubjectFilter.toLowerCase())) ||
                                (String(t.subject?._id || t.subject) === String(repoSubjectFilter));
                            if (!matchesSubject) return false;

                            if (!repoSearch) return true;
                            const q = repoSearch.toLowerCase();
                            return t.title?.toLowerCase().includes(q) ||
                                   t.category?.toLowerCase().includes(q) ||
                                   t.academicYear?.toLowerCase().includes(q) ||
                                   t.branch?.toLowerCase().includes(q) ||
                                   t.section?.toLowerCase().includes(q) ||
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




                </div>
            </div>
        </>
    );
};

export default FacultyDashboard;
