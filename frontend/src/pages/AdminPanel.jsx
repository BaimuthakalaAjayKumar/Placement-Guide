import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './AdminPanel.css';

const AdminPanel = () => {
  const { token } = useAuth();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' or 'aptitude'

  // Lists
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Job options list & deletion
  const [jobs, setJobs] = useState([]);
  const [fetchJobsLoading, setFetchJobsLoading] = useState(false);

  // Job form fields
  const [jobTitle, setJobTitle] = useState('');
  const [jobCompany, setJobCompany] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobReqsText, setJobReqsText] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobSalary, setJobSalary] = useState('');
  const [jobExp, setJobExp] = useState('');
  const [jobApply, setJobApply] = useState('');
  const [jobTargetBatch, setJobTargetBatch] = useState('All');
  const [submittingJob, setSubmittingJob] = useState(false);

  // Admin creation form states
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  // Aptitude Tests Manager States
  const [aptitudeTests, setAptitudeTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);

  // Modals visibility
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);

  // Questions list inside modal
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Question Form inside modal
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null); // null means Add mode
  const [questionText, setQuestionText] = useState('');
  const [questionImage, setQuestionImage] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [option4, setOption4] = useState('');
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [questionDifficulty, setQuestionDifficulty] = useState('medium');
  const [questionExplanation, setQuestionExplanation] = useState('');
  const [explanationImage, setExplanationImage] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [uploadingQImage, setUploadingQImage] = useState(false);
  const [uploadingExpImage, setUploadingExpImage] = useState(false);

  // Attempts list inside modal
  const [attempts, setAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Practice Platforms manager states
  const [practicePlatform, setPracticePlatform] = useState('leetcode'); // leetcode, codeforces, codechef, hackerrank
  const [practiceQuestions, setPracticeQuestions] = useState([]);
  const [loadingPracticeQuestions, setLoadingPracticeQuestions] = useState(false);
  const [showPracticeForm, setShowPracticeForm] = useState(false);
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceDifficulty, setPracticeDifficulty] = useState('all');

  // Practice Question URL form state
  const [submittingPracticeQuestion, setSubmittingPracticeQuestion] = useState(false);
  const [pqUrlInput, setPqUrlInput] = useState('');
  const [pqCompanyInput, setPqCompanyInput] = useState('');
  const [pqYearInput, setPqYearInput] = useState(new Date().getFullYear());

  // Mock Interview reports state
  const [mockInterviewReports, setMockInterviewReports] = useState([]);
  const [loadingMockReports, setLoadingMockReports] = useState(false);
  const [selectedMockReport, setSelectedMockReport] = useState(null);

  // Interview Settings state
  const [interviewRoles, setInterviewRoles] = useState([]);
  const [interviewTechnologies, setInterviewTechnologies] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newTechName, setNewTechName] = useState('');
  const [submittingRole, setSubmittingRole] = useState(false);
  const [submittingTech, setSubmittingTech] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState('');

  // Settings / Holidays states
  const [holidays, setHolidays] = useState([]);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');
  const [submittingHoliday, setSubmittingHoliday] = useState(false);

  // Bulk delete state
  const [deleteYear, setDeleteYear] = useState('');
  const [deletingBulk, setDeletingBulk] = useState(false);

  // Bulk jobs states
  const [jobPostMode, setJobPostMode] = useState('single'); // 'single' or 'bulk'
  const [bulkInputText, setBulkInputText] = useState('');
  const [bulkInputType, setBulkInputType] = useState('csv'); // 'csv' or 'json'
  const [parsedPreviewJobs, setParsedPreviewJobs] = useState([]);
  const [parsingError, setParsingError] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Bulk Practice questions uploads
  const [showPracticeBulkForm, setShowPracticeBulkForm] = useState(false);
  const [practiceBulkInput, setPracticeBulkInput] = useState('');
  const [practiceBulkInputType, setPracticeBulkInputType] = useState('csv'); // csv or json
  const [practiceBulkPreview, setPracticeBulkPreview] = useState([]);
  const [practiceBulkError, setPracticeBulkError] = useState('');
  const [isSubmittingPracticeBulk, setIsSubmittingPracticeBulk] = useState(false);

  // Edit Practice questions options
  const [showPracticeEditForm, setShowPracticeEditForm] = useState(false);
  const [editingPracticeQuestion, setEditingPracticeQuestion] = useState(null);
  const [editPqTitle, setEditPqTitle] = useState('');
  const [editPqDifficulty, setEditPqDifficulty] = useState('Medium');
  const [editPqAcceptance, setEditPqAcceptance] = useState('50%');
  const [editPqSlug, setEditPqSlug] = useState('');
  const [editPqSolution, setEditPqSolution] = useState('');
  const [editPqTagsText, setEditPqTagsText] = useState('');
  const [editPqCompany, setEditPqCompany] = useState('');
  const [editPqYear, setEditPqYear] = useState(new Date().getFullYear());
  const [submittingPracticeEdit, setSubmittingPracticeEdit] = useState(false);

  // Student Academics Modal states
  const [showAcademicsModal, setShowAcademicsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sgpas, setSgpas] = useState({
    sgpaSem1: 0,
    sgpaSem2: 0,
    sgpaSem3: 0,
    sgpaSem4: 0,
    sgpaSem5: 0,
    sgpaSem6: 0,
    sgpaSem7: 0,
    sgpaSem8: 0
  });
  const [savingAcademics, setSavingAcademics] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/users/students`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data);
      } else {
        setError(data.error || 'Failed to fetch student lists.');
      }
    } catch (err) {
      setError('Could not connect to admin metrics services.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAptitudeTests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/tests`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setAptitudeTests(data.data);
      } else {
        setError(data.error || 'Failed to retrieve aptitude tests.');
      }
    } catch (err) {
      setError('Could not connect to aptitude test server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMockInterviewReports = async () => {
    try {
      setLoadingMockReports(true);
      const res = await fetch(`${API_URL}/interviews/admin/reports`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setMockInterviewReports(data.data);
      } else {
        setError(data.error || 'Failed to retrieve mock interview reports.');
      }
    } catch (err) {
      setError('Could not connect to mock interview report service.');
    } finally {
      setLoadingMockReports(false);
    }
  };

  const fetchJobs = async () => {
    try {
      setFetchJobsLoading(true);
      const res = await fetch(`${API_URL}/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      } else {
        setError(data.error || 'Failed to fetch job listings.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to job service.');
    } finally {
      setFetchJobsLoading(false);
    }
  };

  const handleDeleteJob = async (jobId, jobTitle) => {
    if (!window.confirm(`Are you sure you want to permanently delete the job listing for "${jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully deleted job listing for "${jobTitle}".`);
        setJobs(prev => prev.filter(j => j._id !== jobId));
      } else {
        setError(data.error || 'Failed to delete job listing.');
      }
    } catch (err) {
      setError('Could not connect to job deletion service.');
    }
  };

  useEffect(() => {
    if (token) {
      if (activeTab === 'analytics') {
        fetchStudents();
        fetchJobs();
      } else if (activeTab === 'interviews') {
        fetchMockInterviewReports();
      } else if (activeTab === 'aptitude') {
        fetchAptitudeTests();
      }
    }
  }, [token, activeTab]);

  const handlePostJob = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!jobTitle || !jobCompany || !jobDesc) {
      setError('Please fill out the job title, company name, and description.');
      return;
    }

    setSubmittingJob(true);

    const reqsArray = jobReqsText
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: jobTitle,
          company: jobCompany,
          description: jobDesc,
          requirements: reqsArray,
          location: jobLocation || 'Remote',
          salary: jobSalary || 'Not Specified',
          experienceLevel: jobExp || 'Entry Level',
          applyLink: jobApply,
          targetBatch: jobTargetBatch
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully posted job listing for "${jobTitle}" at ${jobCompany}!`);
        setJobTitle('');
        setJobCompany('');
        setJobDesc('');
        setJobReqsText('');
        setJobLocation('');
        setJobSalary('');
        setJobExp('');
        setJobApply('');
        setJobTargetBatch('All');
        fetchJobs();
      } else {
        setError(data.error || 'Failed to create job posting.');
      }
    } catch (err) {
      setError('Could not connect to job creation backend.');
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!adminName || !adminEmail || !adminPassword) {
      setError('Please fill in all admin credential fields.');
      return;
    }

    if (adminPassword.length < 6) {
      setError('Admin password must be at least 6 characters.');
      return;
    }

    setSubmittingAdmin(true);

    try {
      const res = await fetch(`${API_URL}/users/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully created new Administrator account for ${adminName}!`);
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('');
      } else {
        setError(data.error || 'Failed to create Administrator.');
      }
    } catch (err) {
      setError('Could not connect to Admin creation service.');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to permanently delete student "${studentName}" and all of their test/interview history? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      const res = await fetch(`${API_URL}/users/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully removed student "${studentName}" from the system.`);
        setStudents(prev => prev.filter(s => s._id !== studentId));
      } else {
        setError(data.error || 'Failed to delete student.');
      }
    } catch (err) {
      setError('Could not connect to user management service.');
    }
  };

  // Aptitude Tests Operations
  const openQuestionsModal = async (test) => {
    setSelectedTest(test);
    setShowQuestionsModal(true);
    setShowQuestionForm(false);
    setEditingQuestionId(null);
    clearQuestionForm();
    await fetchTestQuestions(test._id);
  };

  const fetchTestQuestions = async (testId) => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`${API_URL}/tests/${testId}/questions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
      } else {
        alert(data.error || 'Failed to retrieve test questions.');
      }
    } catch (err) {
      alert('Error connecting to servers.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const clearQuestionForm = () => {
    setQuestionText('');
    setQuestionImage('');
    setOption1('');
    setOption2('');
    setOption3('');
    setOption4('');
    setCorrectOptionIndex(0);
    setQuestionDifficulty('medium');
    setQuestionExplanation('');
    setExplanationImage('');
  };

  const handleOpenAddQuestion = () => {
    setEditingQuestionId(null);
    clearQuestionForm();
    setShowQuestionForm(true);
  };

  const handleOpenEditQuestion = (q) => {
    setEditingQuestionId(q._id);
    setQuestionText(q.questionText);
    setQuestionImage(q.questionImage || '');
    setOption1(q.options[0] || '');
    setOption2(q.options[1] || '');
    setOption3(q.options[2] || '');
    setOption4(q.options[3] || '');
    setCorrectOptionIndex(q.correctOptionIndex);
    setQuestionDifficulty(q.difficulty || 'medium');
    setQuestionExplanation(q.explanation || '');
    setExplanationImage(q.explanationImage || '');
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionText || !option1 || !option2) {
      alert('Question and at least two options are required.');
      return;
    }

    setSubmittingQuestion(true);
    const optionsArray = [option1, option2];
    if (option3) optionsArray.push(option3);
    if (option4) optionsArray.push(option4);

    const questionBody = {
      questionText,
      questionImage,
      options: optionsArray,
      correctOptionIndex: parseInt(correctOptionIndex),
      difficulty: questionDifficulty,
      explanation: questionExplanation,
      explanationImage
    };

    try {
      let res;
      if (editingQuestionId) {
        // Edit mode
        res = await fetch(`${API_URL}/tests/${selectedTest._id}/questions/${editingQuestionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(questionBody)
        });
      } else {
        // Add mode
        res = await fetch(`${API_URL}/tests/${selectedTest._id}/questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(questionBody)
        });
      }

      const data = await res.json();
      if (data.success) {
        setShowQuestionForm(false);
        clearQuestionForm();
        await fetchTestQuestions(selectedTest._id);
        fetchAptitudeTests(); // Update test question counts on main list
      } else {
        alert(data.error || 'Failed to save question.');
      }
    } catch (err) {
      alert('Error connecting to test management services.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`${API_URL}/tests/${selectedTest._id}/questions/${qId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        await fetchTestQuestions(selectedTest._id);
        fetchAptitudeTests();
      } else {
        alert(data.error || 'Failed to delete question.');
      }
    } catch (err) {
      alert('Error connecting to backend services.');
    }
  };

  const openAttemptsModal = async (test) => {
    setSelectedTest(test);
    setShowAttemptsModal(true);
    await fetchTestAttempts(test._id);
  };

  const fetchTestAttempts = async (testId) => {
    setLoadingAttempts(true);
    try {
      const res = await fetch(`${API_URL}/tests/admin/attempts`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        // Filter attempts to only match the selected test
        const testAttempts = data.data.filter(att => att.test?._id === testId);
        setAttempts(testAttempts);
      } else {
        alert(data.error || 'Failed to retrieve attempts.');
      }
    } catch (err) {
      alert('Could not connect to reporting server.');
    } finally {
      setLoadingAttempts(false);
    }
  };

  const downloadAttemptsCSV = (test) => {
    if (attempts.length === 0) {
      alert('No student attempts available to download.');
      return;
    }

    const headers = ['Roll Number', 'Student Name', 'Email Address', 'Branch', 'Score Obtained', 'Total Questions', 'Percentage', 'Date Completed'];
    const rows = attempts.map(att => {
      const u = att.user || {};
      const score = att.score;
      const total = att.totalQuestions;
      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      const date = new Date(att.completedAt).toLocaleDateString();

      return [
        `"${u.rollNumber || 'N/A'}"`,
        `"${u.name || 'N/A'}"`,
        `"${u.email || 'N/A'}"`,
        `"${u.branch || 'N/A'}"`,
        score,
        total,
        `${pct}%`,
        `"${date}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${test.title.replace(/\s+/g, '_')}_Student_Attempts_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadImage = async (file, type) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    if (type === 'question') {
      setUploadingQImage(true);
    } else {
      setUploadingExpImage(true);
    }

    try {
      const res = await fetch(`${API_URL}/tests/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'question') {
          setQuestionImage(data.url);
        } else {
          setExplanationImage(data.url);
        }
      } else {
        alert(data.error || 'Failed to upload image');
      }
    } catch (err) {
      alert('Error uploading image');
    } finally {
      if (type === 'question') {
        setUploadingQImage(false);
      } else {
        setUploadingExpImage(false);
      }
    }
  };

  const fetchPracticeQuestions = async (platform) => {
    try {
      setLoadingPracticeQuestions(true);
      const res = await fetch(`${API_URL}/tests/practice-questions/${platform}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPracticeQuestions(data.data);
      } else {
        setError(data.error || 'Failed to fetch practice questions.');
      }
    } catch (err) {
      setError('Could not connect to database.');
    } finally {
      setLoadingPracticeQuestions(false);
    }
  };

  const handleAddPracticeQuestion = async (e) => {
    e.preventDefault();
    const officialUrl = pqUrlInput.trim();

    if (!officialUrl) {
      alert('Please provide a valid question URL.');
      return;
    }

    setSubmittingPracticeQuestion(true);

    try {
      const res = await fetch(`${API_URL}/tests/practice-questions/${practicePlatform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          officialUrl,
          company: pqCompanyInput,
          year: pqYearInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Practice question added successfully!');
        setShowPracticeForm(false);
        setPqUrlInput('');
        fetchPracticeQuestions(practicePlatform);
      } else {
        alert(data.error || 'Failed to add practice question.');
      }
    } catch (err) {
      alert('Error connecting to backend.');
    } finally {
      setSubmittingPracticeQuestion(false);
    }
  };

  const handleDeletePracticeQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this practice question from the platform list?')) return;
    try {
      const res = await fetch(`${API_URL}/tests/practice-questions/${practicePlatform}/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Practice question deleted.');
        fetchPracticeQuestions(practicePlatform);
      } else {
        alert(data.error || 'Failed to delete question.');
      }
    } catch (err) {
      alert('Error deleting question.');
    }
  };

  const handleOpenPracticeEdit = (q) => {
    setEditingPracticeQuestion(q);
    setEditPqTitle(q.title);
    setEditPqDifficulty(q.difficulty);
    setEditPqAcceptance(q.acceptance || '50%');
    setEditPqSlug(q.slug);
    setEditPqSolution(q.solution || '');
    setEditPqTagsText(q.tags ? q.tags.join(', ') : '');
    setShowPracticeEditForm(true);
  };

  const handleSavePracticeEdit = async (e) => {
    e.preventDefault();
    if (!editingPracticeQuestion) return;
    setSubmittingPracticeEdit(true);

    const tagsArray = editPqTagsText
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`${API_URL}/tests/practice-questions/${practicePlatform}/${editingPracticeQuestion.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editPqTitle,
          difficulty: editPqDifficulty,
          acceptance: editPqAcceptance,
          slug: editPqSlug,
          solution: editPqSolution,
          tags: tagsArray
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Practice question updated successfully!');
        setShowPracticeEditForm(false);
        fetchPracticeQuestions(practicePlatform);
      } else {
        alert(data.error || 'Failed to update question.');
      }
    } catch (err) {
      alert('Error updating question.');
    } finally {
      setSubmittingPracticeEdit(false);
    }
  };

  const handlePreviewPracticeBulk = () => {
    setPracticeBulkError('');
    setPracticeBulkPreview([]);
    if (!practiceBulkInput.trim()) {
      setPracticeBulkError('Please enter some data payload first.');
      return;
    }

    try {
      if (practiceBulkInputType === 'json') {
        const parsed = JSON.parse(practiceBulkInput);
        if (!Array.isArray(parsed)) {
          setPracticeBulkError('JSON must be a valid array of objects.');
          return;
        }
        setPracticeBulkPreview(parsed);
      } else {
        // Parse CSV
        const parsed = parsePracticeCSV(practiceBulkInput);
        if (parsed.length === 0) {
          setPracticeBulkError('No valid rows parsed in CSV.');
          return;
        }
        setPracticeBulkPreview(parsed);
      }
    } catch (err) {
      setPracticeBulkError('Parsing failed: ' + err.message);
    }
  };

  const parsePracticeCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(r => r.trim());
      if (row.length === 0 || !row[0]) continue;

      const obj = {};
      headers.forEach((header, idx) => {
        let val = row[idx] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        obj[header] = val;
      });

      const urlStr = obj.officialurl || obj.url || obj.questionurl || '';
      const finalSlug = obj.slug || '';
      if (urlStr || finalSlug) {
        results.push({
          officialUrl: urlStr,
          slug: finalSlug,
          title: obj.title || '',
          difficulty: obj.difficulty || 'Medium',
          acceptance: obj.acceptance || '50%',
          solution: obj.solution || '',
          tags: obj.tags ? obj.tags.split(';').map(t => t.trim()) : []
        });
      }
    }
    return results;
  };

  const handlePostPracticeBulk = async () => {
    if (practiceBulkPreview.length === 0) return;
    setIsSubmittingPracticeBulk(true);
    setPracticeBulkError('');

    try {
      const res = await fetch(`${API_URL}/tests/practice-questions/${practicePlatform}/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions: practiceBulkPreview })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully imported ${data.count} practice questions!`);
        setShowPracticeBulkForm(false);
        setPracticeBulkInput('');
        setPracticeBulkPreview([]);
        fetchPracticeQuestions(practicePlatform);
      } else {
        setPracticeBulkError(data.error || 'Failed to submit bulk practice questions');
      }
    } catch (err) {
      setPracticeBulkError('Server communication error.');
    } finally {
      setIsSubmittingPracticeBulk(false);
    }
  };

  const handleDownloadPracticeReport = async () => {
    try {
      const res = await fetch(`${API_URL}/tests/practice-reports/${practicePlatform}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to fetch report');
        return;
      }

      // Convert report data to CSV
      const headers = ['Roll Number', 'Student Name', 'Email Address', 'Branch', 'Platform Username', 'Solved (DB List)', 'Total Solved on Platform'];
      if (practicePlatform === 'leetcode') {
        headers.push('Easy Solved', 'Medium Solved', 'Hard Solved');
      } else if (practicePlatform === 'codeforces') {
        headers.push('Rating', 'Rank');
      } else if (practicePlatform === 'codechef') {
        headers.push('Rating', 'Stars');
      } else if (practicePlatform === 'hackerrank') {
        headers.push('Score', 'Badges');
      }

      const rows = data.data.map(item => {
        const baseRow = [
          `"${item.rollNumber}"`,
          `"${item.name}"`,
          `"${item.email}"`,
          `"${item.branch}"`,
          `"${item.username || 'N/A'}"`,
          `"${item.solvedPracticeCount}/${item.totalPracticeCount}"`,
          `"${item.platformTotalSolved}"`
        ];
        if (practicePlatform === 'leetcode') {
          baseRow.push(
            item.platformSpecificStats?.easySolved || 0,
            item.platformSpecificStats?.mediumSolved || 0,
            item.platformSpecificStats?.hardSolved || 0
          );
        } else if (practicePlatform === 'codeforces') {
          baseRow.push(
            item.platformSpecificStats?.rating || 0,
            `"${item.platformSpecificStats?.rank || 'Unrated'}"`
          );
        } else if (practicePlatform === 'codechef') {
          baseRow.push(
            item.platformSpecificStats?.rating || 0,
            `"${item.platformSpecificStats?.stars || '1★'}"`
          );
        } else if (practicePlatform === 'hackerrank') {
          baseRow.push(
            item.platformSpecificStats?.score || 0,
            item.platformSpecificStats?.badges || 0
          );
        }
        return baseRow.join(',');
      });

      const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${practicePlatform}_students_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error downloading report: ' + err.message);
    }
  };

  if (loading && !showQuestionsModal && !showAttemptsModal) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner-loader"></div>
        <p>Loading Admin Console metrics...</p>
      </div>
    );
  }

  const totalStudentsCount = students.length;
  const averageReadinessScore = totalStudentsCount > 0
    ? Math.round(students.reduce((sum, s) => sum + s.readinessScore, 0) / totalStudentsCount)
    : 0;

  const fetchInterviewMetadata = async () => {
    try {
      const res = await fetch(`${API_URL}/interviews/metadata`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setInterviewRoles(data.data.roles);
        setInterviewTechnologies(data.data.technologies);
      }
    } catch (err) {
      setError('Failed to load interview metadata.');
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setSubmittingRole(true);
    setMetaSuccess('');
    try {
      const res = await fetch(`${API_URL}/interviews/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newRoleName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setMetaSuccess(`Role "${newRoleName.trim()}" added successfully!`);
        setNewRoleName('');
        fetchInterviewMetadata();
        setTimeout(() => setMetaSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to add role.');
      }
    } catch (err) {
      setError('Error adding role.');
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleAddTechnology = async (e) => {
    e.preventDefault();
    if (!newTechName.trim()) return;
    setSubmittingTech(true);
    setMetaSuccess('');
    try {
      const res = await fetch(`${API_URL}/interviews/technologies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newTechName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setMetaSuccess(`Technology "${newTechName.trim()}" added successfully!`);
        setNewTechName('');
        fetchInterviewMetadata();
        setTimeout(() => setMetaSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to add technology.');
      }
    } catch (err) {
      setError('Error adding technology.');
    } finally {
      setSubmittingTech(false);
    }
  };

  const downloadMockInterviewReport = (report) => {
    if (!report) return;

    const studentName = report.user?.name || 'Student';
    const lines = [
      `Mock Interview Report - ${studentName}`,
      `Email: ${report.user?.email || 'N/A'}`,
      `Role: ${report.jobRole || 'N/A'}`,
      `Technology: ${report.technology || 'General'}`,
      `Overall Score: ${report.overallScore || 0}%`,
      `Questions Asked: ${report.questionCount || report.questions?.length || 0}`,
      '',
      'Summary',
      report.generalFeedback || 'No summary provided.',
      '',
      'Question-by-question review'
    ];

    (report.questions || []).forEach((question, index) => {
      lines.push('', `Question ${index + 1}`);
      lines.push(`Type: ${question.questionType || 'technical'}`);
      lines.push(`Score: ${question.score || 0}/100`);
      lines.push(`Question: ${question.questionText || 'N/A'}`);
      lines.push(`Student Response: ${question.userResponse || 'No answer provided.'}`);
      lines.push(`Feedback: ${question.feedback || 'No feedback provided.'}`);
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${studentName.replace(/\s+/g, '_').toLowerCase()}_mock_interview_report.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${API_URL}/holidays`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setHolidays(data.data);
      }
    } catch (err) {
      console.error('Failed to retrieve holidays:', err);
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!holidayDate) return alert('Please select a date.');
    setSubmittingHoliday(true);
    try {
      const res = await fetch(`${API_URL}/holidays`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: holidayDate,
          description: holidayDesc || 'Holiday'
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Holiday added successfully!');
        setHolidayDate('');
        setHolidayDesc('');
        fetchHolidays();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        alert(data.error || 'Failed to add holiday.');
      }
    } catch (err) {
      alert('Error adding holiday.');
    } finally {
      setSubmittingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;
    try {
      const res = await fetch(`${API_URL}/holidays/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Holiday deleted successfully.');
        fetchHolidays();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        alert(data.error || 'Failed to delete holiday.');
      }
    } catch (err) {
      alert('Error deleting holiday.');
    }
  };

  const handleDownloadStudentReport = async () => {
    try {
      const res = await fetch(`${API_URL}/users/students/export`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to export reports.');
        return;
      }

      const headers = ['Roll Number', 'Name', 'Branch', 'Year', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8', 'CGPA'];
      const rows = data.data.map(s => [
        `"${s.rollNumber}"`,
        `"${s.name}"`,
        `"${s.branch}"`,
        `"${s.year}"`,
        s.sgpaSem1,
        s.sgpaSem2,
        s.sgpaSem3,
        s.sgpaSem4,
        s.sgpaSem5,
        s.sgpaSem6,
        s.sgpaSem7,
        s.sgpaSem8,
        s.cgpa
      ]);

      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `student_academics_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error exporting student report: ' + err.message);
    }
  };

  const handleBulkDeleteStudents = async (e) => {
    e.preventDefault();
    if (!deleteYear.trim()) return alert('Please enter an academic year.');

    const count = students.filter(s => s.year === deleteYear.trim()).length;
    const confirmMessage = `WARNING: You are about to bulk delete students for the year "${deleteYear.trim()}".\nThis will remove student accounts, resumes, test attempts, solution records, and mock interviews matching this year.\nAre you absolutely sure?`;

    if (!window.confirm(confirmMessage)) return;
    if (!window.confirm(`Double Confirmation: Enter "DELETE" to confirm.`)) {
      return;
    }

    setDeletingBulk(true);
    try {
      const res = await fetch(`${API_URL}/users/students/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ year: deleteYear.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || 'Students deleted successfully.');
        setDeleteYear('');
        fetchStudents();
        setTimeout(() => setSuccess(''), 4000);
      } else {
        alert(data.error || 'Failed to bulk-delete students.');
      }
    } catch (err) {
      alert('Error connecting to deletion services.');
    } finally {
      setDeletingBulk(false);
    }
  };

  const openAcademicsModal = (student) => {
    setSelectedStudent(student);
    setSgpas({
      sgpaSem1: student.sgpaSem1 || 0,
      sgpaSem2: student.sgpaSem2 || 0,
      sgpaSem3: student.sgpaSem3 || 0,
      sgpaSem4: student.sgpaSem4 || 0,
      sgpaSem5: student.sgpaSem5 || 0,
      sgpaSem6: student.sgpaSem6 || 0,
      sgpaSem7: student.sgpaSem7 || 0,
      sgpaSem8: student.sgpaSem8 || 0
    });
    setShowAcademicsModal(true);
  };

  const handleSaveAcademics = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setSavingAcademics(true);
    try {
      const res = await fetch(`${API_URL}/users/students/${selectedStudent._id}/academics`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(sgpas)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully updated academic report card for ${selectedStudent.name}.`);
        setShowAcademicsModal(false);
        fetchStudents();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        alert(data.error || 'Failed to save academic details.');
      }
    } catch (err) {
      alert('Error updating academic details.');
    } finally {
      setSavingAcademics(false);
    }
  };

  const calculateCgpa = () => {
    const sems = Object.values(sgpas).map(Number);
    const completed = sems.filter(v => v > 0);
    if (completed.length === 0) return 0;
    return (completed.reduce((a, b) => a + b, 0) / completed.length).toFixed(2);
  };

  const handlePreviewBulkJobs = () => {
    setParsingError('');
    setParsedPreviewJobs([]);

    if (!bulkInputText.trim()) {
      setParsingError('Please paste CSV or JSON content first.');
      return;
    }

    try {
      let parsed = [];
      if (bulkInputType === 'json') {
        parsed = parseJSONText(bulkInputText);
      } else {
        parsed = parseCSVText(bulkInputText);
      }

      if (parsed.length === 0) {
        setParsingError('No valid job listings found. Make sure headers "title" and "company" are present and filled.');
      } else {
        setParsedPreviewJobs(parsed);
      }
    } catch (err) {
      setParsingError(err.message || 'Parsing failed. Check the structure.');
    }
  };

  const handleCsvFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setBulkInputText(text);
      setBulkInputType('csv');

      // Auto-preview on upload for better UX
      try {
        setParsingError('');
        const parsed = parseCSVText(text);
        if (parsed.length === 0) {
          setParsingError('CSV upload parsed to 0 jobs. Ensure headers "title" and "company" exist.');
        } else {
          setParsedPreviewJobs(parsed);
        }
      } catch (err) {
        setParsingError('Failed to parse uploaded CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const parseCSVText = (text) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    return lines.slice(1).map(line => {
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const item = {};
      headers.forEach((header, index) => {
        let val = values[index] || '';
        val = val.replace(/^["']|["']$/g, '').trim();

        if (header === 'title') item.title = val;
        else if (header === 'company') item.company = val;
        else if (header === 'description') item.description = val;
        else if (header === 'requirements' || header === 'skills') {
          item.requirements = val ? val.split(/;\s*|,\s*/).map(s => s.trim()).filter(s => s.length > 0) : [];
        }
        else if (header === 'location') item.location = val;
        else if (header === 'salary') item.salary = val;
        else if (header === 'experiencelevel' || header === 'experience') item.experienceLevel = val;
        else if (header === 'targetbatch' || header === 'batch') item.targetBatch = val;
        else if (header === 'applylink' || header === 'link') item.applyLink = val;
      });
      return item;
    }).filter(job => job.title && job.company);
  };

  const parseJSONText = (text) => {
    try {
      const data = JSON.parse(text);
      const jobsList = Array.isArray(data) ? data : (data.jobs || []);
      return jobsList.map(j => ({
        title: j.title || '',
        company: j.company || '',
        description: j.description || '',
        requirements: Array.isArray(j.requirements) ? j.requirements : (j.requirements || '').split(',').map(s => s.trim()).filter(Boolean),
        location: j.location || 'Remote',
        salary: j.salary || 'Not Specified',
        experienceLevel: j.experienceLevel || 'Entry Level',
        targetBatch: String(j.targetBatch || 'All'),
        applyLink: j.applyLink || ''
      })).filter(job => job.title && job.company);
    } catch (err) {
      throw new Error('Invalid JSON structure. Expecting standard array [ {...}, {...} ]');
    }
  };

  const handlePostBulkJobs = async () => {
    if (parsedPreviewJobs.length === 0) return;
    setError('');
    setSuccess('');
    setIsSubmittingBulk(true);

    try {
      const res = await fetch(`${API_URL}/jobs/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ jobs: parsedPreviewJobs })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully posted ${data.count} jobs in bulk! Batch email notifications triggered.`);
        setBulkInputText('');
        setParsedPreviewJobs([]);
        fetchJobs();
      } else {
        setError(data.error || 'Failed to bulk post job listings.');
      }
    } catch (err) {
      setError('Could not connect to bulk jobs endpoint.');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = "title,company,description,requirements,location,salary,experienceLevel,targetBatch,applyLink\n" +
      "\"Software Engineer Intern\",\"Google\",\"Exciting summer internship for CS students\",\"Java, Python, Algorithms\",\"Bangalore, India\",\"₹50,000 / month\",\"Internship\",\"2026\",\"https://careers.google.com\"\n" +
      "\"Frontend Developer\",\"InnovateTech\",\"Build beautiful React screens\",\"React, TypeScript, CSS\",\"Remote\",\"₹10,00,000 LPA\",\"Entry Level\",\"All\",\"https://careers.innovatetech.com\"";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bulk_jobs_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Header title="Admin Command Console" />

      {/* Mock Interview Report Modal — placed at fragment root so overlay is truly fullscreen */}
      {selectedMockReport && (
        <div className="modal-overlay" onClick={() => setSelectedMockReport(null)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedMockReport.user?.name || 'Student'} Mock Interview Report</h3>
                <p className="modal-subtitle">Review the full interview session and export it for records.</p>
              </div>
              <div className="modal-actions">
                <button className="btn btn-accent btn-sm" onClick={() => downloadMockInterviewReport(selectedMockReport)}>
                  Download Report
                </button>
                <button className="close-btn" onClick={() => setSelectedMockReport(null)}>×</button>
              </div>
            </div>
            <div className="modal-body report-modal-body">
              <div className="report-summary-card">
                <div className="report-meta-list">
                  <span className="meta-chip">Role: {selectedMockReport.jobRole}</span>
                  <span className="meta-chip">Technology: {selectedMockReport.technology || 'General'}</span>
                  <span className="meta-chip" style={{ background: selectedMockReport.overallScore >= 80 ? 'rgba(16,185,129,0.14)' : selectedMockReport.overallScore >= 60 ? 'rgba(245,158,11,0.14)' : 'rgba(239,68,68,0.14)', color: selectedMockReport.overallScore >= 80 ? '#34d399' : selectedMockReport.overallScore >= 60 ? '#fbbf24' : '#f87171' }}>
                    Overall Score: {selectedMockReport.overallScore}%
                  </span>
                  <span className="meta-chip">Questions: {selectedMockReport.questionCount || selectedMockReport.questions?.length || 0}</span>
                </div>
                <p className="summary-para">{selectedMockReport.generalFeedback}</p>
              </div>
              <div className="evaluation-questions-list">
                {selectedMockReport.questions?.map((q, idx) => (
                  <div className="report-question-card" key={idx}>
                    <div className="report-q-header">
                      <div>
                        <h4>Question {idx + 1}</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{q.questionType || 'technical'}</span>
                      </div>
                      <span className="q-score-badge" data-score={q.score >= 80 ? 'high' : q.score >= 60 ? 'medium' : 'low'}>
                        Score: {q.score}/100
                      </span>
                    </div>
                    <p className="report-question-text"><strong>Q:</strong> {q.questionText}</p>
                    <div className="report-answer-box">
                      <p className="box-title">Student Response:</p>
                      <p className="answer-text-content">&ldquo;{q.userResponse || 'No answer provided.'}&rdquo;</p>
                    </div>
                    <div className="report-feedback-box">
                      <p className="box-title">AI Feedback:</p>
                      <p className="feedback-text-content">{q.feedback || 'No feedback available.'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="content-wrapper admin-content animate-fade">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-banner">
            <span>{success}</span>
          </div>
        )}

        {/* Console Tab Toggles */}
        <div className="admin-tabs-nav">
          <button
            className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Candidate Analytics
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'interviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('interviews')}
          >
            🎤 Mock Interview Reports
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'aptitude' ? 'active' : ''}`}
            onClick={() => setActiveTab('aptitude')}
          >
            🧠 Aptitude Tests Manager
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('practice');
              fetchPracticeQuestions(practicePlatform);
            }}
          >
            💻 Practice Platforms
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'interview-settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('interview-settings');
              fetchInterviewMetadata();
            }}
          >
            🎯 Interview Settings
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              fetchHolidays();
            }}
          >
            ⚙️ Settings
          </button>
        </div>

        {
          activeTab === 'analytics' && (
            <>
              {/* Aggregate Stats Cards */}
              <div className="admin-stats-summary-grid">
                <div className="glass-card admin-summary-card">
                  <h4>Total Registered Candidates</h4>
                  <span className="admin-stat-number">{totalStudentsCount}</span>
                  <p className="admin-stat-sub">Active job seekers preparing</p>
                </div>

                <div className="glass-card admin-summary-card">
                  <h4>Average Placement Readiness</h4>
                  <span className="admin-stat-number">{averageReadinessScore}%</span>
                  <div className="progress-bar-bg mt-10">
                    <div className="progress-bar-fill aptitude" style={{ width: `${averageReadinessScore}%` }}></div>
                  </div>
                </div>

                <div className="glass-card admin-summary-card">
                  <h4>Job-Ready Students (PRI ≥ 80)</h4>
                  <span className="admin-stat-number">{students.filter(s => s.readinessScore >= 80).length}</span>
                  <p className="admin-stat-sub">Qualified for interview pipelines</p>
                </div>
              </div>

              <div className="admin-split-layout">
                {/* Admin Panels Left Column */}
                <div className="admin-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>

                  {/* List of Students */}
                  <div className="glass-card student-roster-card">
                    <h3>Student Preparedness Roster</h3>
                    <p className="card-desc">Comprehensive log of students ranked by Placement Readiness Index (PRI).</p>

                    <div className="table-responsive-wrapper">
                      <table className="student-roster-table">
                        <thead>
                          <tr>
                            <th>Student Name</th>
                            <th>Email Address</th>
                            <th>Target Role</th>
                            <th>PRI Score</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.length > 0 ? (
                            students.map((student) => (
                              <tr key={student._id}>
                                <td>
                                  <div className="table-student-name">
                                    <span className="table-avatar">{student.name.charAt(0).toUpperCase()}</span>
                                    <span>{student.name}</span>
                                  </div>
                                </td>
                                <td>{student.email}</td>
                                <td className="text-secondary">{student.targetRole || 'Software Engineer'}</td>
                                <td>
                                  <strong className="text-glow">{student.readinessScore}%</strong>
                                </td>
                                <td>
                                  <span className={`pri-level-badge scale-down`} data-level={student.readinessScore >= 80 ? 'high' : student.readinessScore >= 50 ? 'medium' : 'low'}>
                                    {student.readinessScore >= 80 ? 'Job Ready' : student.readinessScore >= 50 ? 'Medium' : 'Low'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => openAcademicsModal(student)}
                                      title="Edit Academics"
                                    >
                                      🎓 Academics
                                    </button>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleDeleteStudent(student._id, student.name)}
                                      title="Remove Student"
                                    >
                                      🗑 Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="table-empty-msg">No students registered yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Posted Job Listings */}
                  <div className="glass-card posted-jobs-card">
                    <h3>Posted Job Listings</h3>
                    <p className="card-desc">Review and manage job postings currently visible to students.</p>

                    <div className="table-responsive-wrapper">
                      <table className="student-roster-table">
                        <thead>
                          <tr>
                            <th>Job Title</th>
                            <th>Company</th>
                            <th>Location</th>
                            <th>Salary</th>
                            <th>Target Batch</th>
                            <th style={{ textAlign: 'center' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fetchJobsLoading ? (
                            <tr>
                              <td colSpan="6" className="table-empty-msg">
                                <span className="spinner-loader" style={{ margin: '10px auto' }}></span>
                              </td>
                            </tr>
                          ) : jobs.length > 0 ? (
                            jobs.map((job) => (
                              <tr key={job._id}>
                                <td>
                                  <strong>{job.title}</strong>
                                </td>
                                <td>{job.company}</td>
                                <td>{job.location}</td>
                                <td>{job.salary}</td>
                                <td>
                                  <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                    {job.targetBatch || 'All'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <button
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleDeleteJob(job._id, job.title)}
                                      title="Delete Job"
                                    >
                                      🗑 Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="table-empty-msg">No job postings found.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Admin Panels Right Column */}
                <div className="admin-right-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Add Job form */}
                  <div className="glass-card create-job-form-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <h3 style={{ margin: 0 }}>Post Job Opportunities</h3>
                      <div className="job-mode-toggle" style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '6px' }}>
                        <button
                          className={`btn btn-sm ${jobPostMode === 'single' ? 'btn-primary' : ''}`}
                          style={{ background: jobPostMode === 'single' ? 'var(--primary)' : 'transparent', border: 'none', padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => setJobPostMode('single')}
                        >
                          Single Job
                        </button>
                        <button
                          className={`btn btn-sm ${jobPostMode === 'bulk' ? 'btn-primary' : ''}`}
                          style={{ background: jobPostMode === 'bulk' ? 'var(--primary)' : 'transparent', border: 'none', padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => setJobPostMode('bulk')}
                        >
                          Bulk Jobs
                        </button>
                      </div>
                    </div>
                    {jobPostMode === 'single' ? (
                      <>
                        <p className="card-desc">Publish a single job opportunity that notifies matching students on the platform.</p>
                        <form onSubmit={handlePostJob} className="admin-job-form" style={{ marginTop: '8px' }}>
                          <div className="form-grid-2-col">
                            <div className="form-group">
                              <label className="form-label" htmlFor="title">Job Title</label>
                              <input
                                type="text"
                                id="title"
                                className="form-control"
                                placeholder="e.g. Associate Software Engineer"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label" htmlFor="company">Company Name</label>
                              <input
                                type="text"
                                id="company"
                                className="form-control"
                                placeholder="e.g. Google"
                                value={jobCompany}
                                onChange={(e) => setJobCompany(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="description">Job Description</label>
                            <textarea
                              id="description"
                              className="form-control"
                              rows="4"
                              placeholder="Outline key responsibilities and expectations..."
                              value={jobDesc}
                              onChange={(e) => setJobDesc(e.target.value)}
                              required
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="requirements">Skill Requirements (comma-separated)</label>
                            <input
                              type="text"
                              id="requirements"
                              className="form-control"
                              placeholder="React, Node.js, Git, SQL"
                              value={jobReqsText}
                              onChange={(e) => setJobReqsText(e.target.value)}
                            />
                          </div>

                          <div className="form-grid-3-col">
                            <div className="form-group">
                              <label className="form-label" htmlFor="location">Location</label>
                              <input
                                type="text"
                                id="location"
                                className="form-control"
                                placeholder="Remote / Bangalore"
                                value={jobLocation}
                                onChange={(e) => setJobLocation(e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label" htmlFor="salary">Salary Estimate</label>
                              <input
                                type="text"
                                id="salary"
                                className="form-control"
                                placeholder="₹8,0,000 LPA"
                                value={jobSalary}
                                onChange={(e) => setJobSalary(e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label" htmlFor="experience">Experience Level</label>
                              <select
                                id="experience"
                                className="form-control"
                                value={jobExp}
                                onChange={(e) => setJobExp(e.target.value)}
                              >
                                <option value="Entry Level">Entry Level</option>
                                <option value="Internship">Internship</option>
                                <option value="Associate">Associate</option>
                                <option value="Mid-Senior">Mid-Senior</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" htmlFor="apply">External Apply URL</label>
                              <input
                                type="url"
                                id="apply"
                                className="form-control"
                                placeholder="https://careers.company.com/apply"
                                value={jobApply}
                                onChange={(e) => setJobApply(e.target.value)}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label" htmlFor="targetBatch">Target Batch Year</label>
                              <select
                                id="targetBatch"
                                className="form-control"
                                value={jobTargetBatch}
                                onChange={(e) => setJobTargetBatch(e.target.value)}
                              >
                                <option value="All">All Batches (Email All)</option>
                                <option value="2024">2024 Batch</option>
                                <option value="2025">2025 Batch</option>
                                <option value="2026">2026 Batch</option>
                                <option value="2027">2027 Batch</option>
                                <option value="2028">2028 Batch</option>
                              </select>
                            </div>
                          </div>

                          <button type="submit" className="btn btn-primary btn-block" disabled={submittingJob} style={{ marginTop: '16px' }}>
                            {submittingJob ? 'Publishing...' : 'Publish Job Listing'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <>
                        <p className="card-desc">Parse structured CSV/JSON data or upload a direct spreadsheet template of target job openings.</p>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                          <button className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate} type="button">
                            ⬇️ CSV Template
                          </button>
                          <label className="btn btn-accent btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                            📁 Upload File
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleCsvFileUpload}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>

                        <div className="form-group" style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label className="form-label">Data Paste Console</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <input
                                  type="radio"
                                  name="bulkType"
                                  checked={bulkInputType === 'csv'}
                                  onChange={() => setBulkInputType('csv')}
                                /> CSV
                              </label>
                              <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                <input
                                  type="radio"
                                  name="bulkType"
                                  checked={bulkInputType === 'json'}
                                  onChange={() => setBulkInputType('json')}
                                /> JSON
                              </label>
                            </div>
                          </div>
                          <textarea
                            className="form-control"
                            rows="6"
                            placeholder={bulkInputType === 'csv'
                              ? 'title,company,description,requirements,location,salary,experienceLevel,targetBatch,applyLink\n"Software Tester","Google","Run tests","Python, Selenium","Remote","₹6,00,000","Entry Level","2026","https://..."'
                              : '[\n  {\n    "title": "Software Tester",\n    "company": "Google",\n    "description": "Run tests",\n    "requirements": ["Python", "Selenium"],\n    "location": "Remote"\n  }\n]'
                            }
                            value={bulkInputText}
                            onChange={(e) => setBulkInputText(e.target.value)}
                            style={{ fontFamily: 'Courier New, Courier, monospace', fontSize: '12px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}
                          />
                        </div>

                        {parsingError && (
                          <div style={{ color: '#f87171', fontSize: '12px', margin: '8px 0', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.18)' }}>
                            ⚠️ {parsingError}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                          <button
                            className="btn btn-secondary btn-block"
                            onClick={handlePreviewBulkJobs}
                            type="button"
                          >
                            🔎 Preview Parsed Listings
                          </button>
                        </div>

                        {parsedPreviewJobs.length > 0 && (
                          <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'white', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Parsed Listings Preview</span>
                              <span style={{ color: '#818cf8' }}>{parsedPreviewJobs.length} Jobs Found</span>
                            </h4>
                            <div style={{ maxHeight: '160px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase' }}>
                                    <th style={{ paddingBottom: '4px' }}>Title</th>
                                    <th style={{ paddingBottom: '4px' }}>Company</th>
                                    <th style={{ paddingBottom: '4px' }}>Location</th>
                                    <th style={{ paddingBottom: '4px' }}>Batch</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {parsedPreviewJobs.map((pJob, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#f1f5f9' }}>
                                      <td style={{ padding: '6px 0', fontWeight: 'bold' }}>{pJob.title}</td>
                                      <td>{pJob.company}</td>
                                      <td>{pJob.location || 'Remote'}</td>
                                      <td>{pJob.targetBatch || 'All'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <button
                              className="btn btn-primary btn-block"
                              onClick={handlePostBulkJobs}
                              disabled={isSubmittingBulk}
                              style={{ marginTop: '12px' }}
                              type="button"
                            >
                              {isSubmittingBulk ? 'Uploading & Notifying...' : `🚀 Confirm & Upload ${parsedPreviewJobs.length} Jobs`}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Add Admin form */}
                  <div className="glass-card create-admin-form-card">
                    <h3>Create Administrator Account</h3>
                    <p className="card-desc">Add secondary administrators to help monitor student readiness and post job slots.</p>

                    <form onSubmit={handleCreateAdmin} className="admin-job-form">
                      <div className="form-group">
                        <label className="form-label" htmlFor="adminName">Admin Full Name</label>
                        <input
                          type="text"
                          id="adminName"
                          className="form-control"
                          placeholder="e.g. John Doe"
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="adminEmail">Email Address</label>
                        <input
                          type="email"
                          id="adminEmail"
                          className="form-control"
                          placeholder="name@university.edu"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" htmlFor="adminPassword">Login Password</label>
                        <input
                          type="password"
                          id="adminPassword"
                          className="form-control"
                          placeholder="At least 6 characters"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          required
                        />
                      </div>

                      <button type="submit" className="btn btn-accent btn-block" disabled={submittingAdmin}>
                        {submittingAdmin ? 'Creating...' : 'Create Admin Account'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )
        }

        {
          activeTab === 'interviews' && (
            <div className="glass-card animate-fade">
              <h3>Mock Interview Candidate Reports</h3>
              <p className="card-desc">Review every student attempt, score, and per-question feedback from the mock interview sessions.</p>

              {loadingMockReports ? (
                <div className="dashboard-loading-container">
                  <div className="spinner-loader"></div>
                  <p>Loading interview reports...</p>
                </div>
              ) : mockInterviewReports.length > 0 ? (
                <div className="interview-history-list">
                  {mockInterviewReports.map((report) => (
                    <div className="glass-card history-session-card" key={report._id}>
                      <div className="history-session-info">
                        <h4>{report.user?.name || 'Student'}</h4>
                        <span className="session-date">{report.user?.email || 'No email'}</span>
                        <p className="text-secondary">Role: {report.jobRole} · Tech: {report.technology || 'General'} · Questions: {report.questionCount || report.questions?.length || 0}</p>
                      </div>
                      <div className="history-session-results">
                        <div className="session-score-indicator" data-score={report.overallScore >= 80 ? 'good' : report.overallScore >= 60 ? 'average' : 'low'}>
                          {report.overallScore}% Score
                        </div>
                        <button className="btn btn-accent btn-sm" onClick={() => downloadMockInterviewReport(report)}>
                          Download
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedMockReport(report)}>
                          View Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-history-placeholder glass-card">
                  <p>No mock interview attempts recorded yet.</p>
                </div>
              )}
            </div>
          )
        }

        {
          activeTab === 'aptitude' && (
            /* Aptitude Tests Manager View */
            <div className="glass-card aptitude-tests-manager-card animate-fade">
              <div className="manager-header">
                <div>
                  <h3>Aptitude Tests Module Coordinator</h3>
                  <p className="card-desc">Add questions, edit question attributes, delete options, and export candidates' grading reports.</p>
                </div>
              </div>

              <div className="table-responsive-wrapper mt-20">
                <table className="student-roster-table">
                  <thead>
                    <tr>
                      <th>Test Category Title</th>
                      <th>Subtype</th>
                      <th>Question Pool</th>
                      <th>Time Limit</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aptitudeTests.length > 0 ? (
                      aptitudeTests.map((test) => (
                        <tr key={test._id}>
                          <td>
                            <strong>{test.title}</strong>
                            <div className="text-secondary small mt-5">{test.description}</div>
                          </td>
                          <td>
                            <span className="status-badge-inline" style={{ textTransform: 'capitalize' }}>
                              {test.category}
                            </span>
                          </td>
                          <td>{test.questionCount} Questions (20 Picked)</td>
                          <td>
                            <span className="text-glow">{test.duration} Mins</span>
                          </td>
                          <td>
                            <div className="admin-actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openQuestionsModal(test)}
                              >
                                📝 Manage Questions
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => openAttemptsModal(test)}
                              >
                                📊 View Reports
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="table-empty-msg">No aptitude tests fetched.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }

        {
          activeTab === 'practice' && (
            <div className="glass-card practice-platforms-manager-card animate-fade">
              <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3>Practice Platforms Coordinator</h3>
                  <p className="card-desc">Sync questions, add new ones from original platforms, remove questions, and download student reports.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-accent" onClick={() => setShowPracticeForm(true)}>
                    ➕ Add Practice Question
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowPracticeBulkForm(true)}>
                    📥 Bulk Import Practice
                  </button>
                  <button className="btn btn-primary" onClick={handleDownloadPracticeReport}>
                    📥 Export Candidates Report
                  </button>
                </div>
              </div>

              {/* Platform Sub-Toggles */}
              <div className="platform-sub-nav" style={{ display: 'flex', gap: '10px', margin: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px' }}>
                {['leetcode', 'codeforces', 'codechef', 'hackerrank'].map(plat => (
                  <button
                    key={plat}
                    className={`btn ${practicePlatform === plat ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ textTransform: 'capitalize' }}
                    onClick={() => {
                      setPracticePlatform(plat);
                      fetchPracticeQuestions(plat);
                    }}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              {/* Search and Filters */}
              <div className="practice-filters-bar" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search questions by title or ID..."
                    value={practiceSearch}
                    onChange={(e) => setPracticeSearch(e.target.value)}
                  />
                </div>
                <div style={{ width: '150px' }}>
                  <select
                    className="form-control"
                    value={practiceDifficulty}
                    onChange={(e) => setPracticeDifficulty(e.target.value)}
                  >
                    <option value="all">All Difficulties</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {loadingPracticeQuestions ? (
                <div style={{ padding: '50px 0', textAlign: 'center' }}>
                  <div className="spinner-loader"></div>
                  <p style={{ marginTop: '15px' }}>Retrieving practice questions list...</p>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="student-roster-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Prob ID</th>
                        <th>Question Title</th>
                        <th>Difficulty</th>
                        <th>Acceptance</th>
                        <th>Slug / Key Identifier</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {practiceQuestions
                        .filter(q => {
                          const matchesSearch = q.title.toLowerCase().includes(practiceSearch.toLowerCase()) || String(q.id).includes(practiceSearch);
                          const matchesDifficulty = practiceDifficulty === 'all' || q.difficulty === practiceDifficulty;
                          return matchesSearch && matchesDifficulty;
                        })
                        .map((q) => (
                          <tr key={q._id}>
                            <td><strong>#{q.id}</strong></td>
                            <td>
                              <strong>{q.title}</strong>
                              <div className="text-secondary small mt-5">
                                Tags: {q.tags && q.tags.length > 0 ? q.tags.join(', ') : 'None'}
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge-inline ${q.difficulty.toLowerCase()}`}>
                                {q.difficulty}
                              </span>
                            </td>
                            <td>{q.acceptance}</td>
                            <td>
                              <code className="slug-code">{q.slug}</code>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <a
                                  href={
                                    practicePlatform === 'leetcode' ? `https://leetcode.com/problems/${q.slug}/`
                                      : practicePlatform === 'codeforces' ? `https://codeforces.com/problemset/problem/${q.id}/${q.slug.replace(String(q.id), '')}`
                                        : practicePlatform === 'codechef' ? `https://www.codechef.com/problems/${q.slug}`
                                          : `https://www.hackerrank.com/challenges/${q.slug}/problem`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  🔗 Open
                                </a>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenPracticeEdit(q)}
                                >
                                  📝 Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeletePracticeQuestion(q.id)}
                                >
                                  🗑 Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {practiceQuestions.length === 0 && (
                        <tr>
                          <td colSpan="6" className="table-empty-msg">No practice questions found in this platform bank.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        }

        {activeTab === 'interview-settings' && (
          <div className="interview-settings-wrapper animate-fade">
            <div className="glass-card interview-settings-header-card">
              <h3>🎯 Interview Settings</h3>
              <p>Manage the Roles and Technologies students can select when starting a Mock Interview.</p>
            </div>

            {metaSuccess && (
              <div className="success-banner">
                <span>{metaSuccess}</span>
              </div>
            )}

            <div className="interview-settings-grid">
              {/* Roles Section */}
              <div className="glass-card interview-settings-section">
                <div className="isection-top">
                  <div className="isection-label">
                    <span className="isection-icon">👔</span>
                    <div>
                      <h4>Job Roles</h4>
                      <p className="isection-sub">{interviewRoles.length} roles available</p>
                    </div>
                  </div>
                  <form onSubmit={handleAddRole} className="isection-add-form">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Add new role, e.g. Cloud Architect"
                      value={newRoleName}
                      onChange={(newVal) => setNewRoleName(newVal.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={submittingRole}>
                      {submittingRole ? 'Adding…' : '+ Add Role'}
                    </button>
                  </form>
                </div>
                <div className="isection-chips">
                  {interviewRoles.map((role) => (
                    <span key={role} className="meta-chip isection-chip-role">{role}</span>
                  ))}
                  {interviewRoles.length === 0 && (
                    <p className="isection-empty">No roles loaded. Click the tab again to refresh.</p>
                  )}
                </div>
              </div>

              {/* Technologies Section */}
              <div className="glass-card interview-settings-section">
                <div className="isection-top">
                  <div className="isection-label">
                    <span className="isection-icon">💻</span>
                    <div>
                      <h4>Technologies & Languages</h4>
                      <p className="isection-sub">{interviewTechnologies.length} technologies available</p>
                    </div>
                  </div>
                  <form onSubmit={handleAddTechnology} className="isection-add-form">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Add new technology, e.g. Flutter"
                      value={newTechName}
                      onChange={(newVal) => setNewTechName(newVal.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={submittingTech}>
                      {submittingTech ? 'Adding…' : '+ Add Tech'}
                    </button>
                  </form>
                </div>
                <div className="isection-chips">
                  {interviewTechnologies.map((tech) => (
                    <span key={tech} className="meta-chip isection-chip-tech">{tech}</span>
                  ))}
                  {interviewTechnologies.length === 0 && (
                    <p className="isection-empty">No technologies loaded. Click the tab again to refresh.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="admin-settings-wrapper animate-fade">
            <div className="glass-card admin-settings-header-card">
              <h3>⚙️ Console Settings & System Administration</h3>
              <p>Assign academic holidays, export bulk student academic data, or decommission candidates registry by year.</p>
            </div>

            <div className="admin-settings-grid">
              {/* Holiday Manager */}
              <div className="glass-card holiday-manager-section">
                <h3>🗓 Academic Holiday Manager</h3>
                <p className="card-desc">Add official holidays to clear student calendar dashboard benchmarks.</p>

                <form onSubmit={handleCreateHoliday} className="holiday-form" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="date"
                      className="form-control"
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Independence Day"
                      value={holidayDesc}
                      onChange={(e) => setHolidayDesc(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={submittingHoliday}>
                    {submittingHoliday ? 'Adding...' : 'Add Holiday'}
                  </button>
                </form>

                <div className="table-responsive-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="student-roster-table mini-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Holiday Event Description</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holidays.length > 0 ? (
                        holidays.map((h) => {
                          const localShowDate = new Date(h.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          });
                          return (
                            <tr key={h._id}>
                              <td><strong>{localShowDate}</strong></td>
                              <td>{h.description}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleDeleteHoliday(h._id)}
                                >
                                  🗑 Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="3" className="table-empty-msg">No academic holidays defined yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data & Batch Management */}
              <div className="glass-card data-management-section">
                <h3>🗄 System Data & Registry Manager</h3>
                <p className="card-desc">Execute bulk updates, export academic records, or decommission years.</p>

                <div className="settings-action-card border-bottom" style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <h4>📝 Export Student Academic Directory</h4>
                  <p className="text-secondary small mt-5" style={{ marginBottom: '15px' }}>
                    Generate a CSV spreadsheet containing full academic records for all registered candidates, including SGPAs and computed CGPA.
                  </p>
                  <button className="btn btn-accent" onClick={handleDownloadStudentReport}>
                    📥 Download Student Report (CSV)
                  </button>
                </div>

                <div className="settings-action-card">
                  <h4>⚠️ Bulk Decommission by Academy Year</h4>
                  <p className="text-secondary small mt-5" style={{ marginBottom: '15px' }}>
                    Permanently delete all candidate profiles, solution records, resumes, tests and mock sessions matching the specified academic year. This action is irreversible.
                  </p>
                  <form onSubmit={handleBulkDeleteStudents} style={{ display: 'flex', gap: '12px' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Year (e.g. 2026)"
                      value={deleteYear}
                      onChange={(e) => setDeleteYear(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-danger" disabled={deletingBulk}>
                      {deletingBulk ? 'Decommissioning...' : 'Bulk Delete Candidates'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div >

      {/* PRACTICE QUESTION FORM MODAL */}
      {
        showPracticeForm && (
          <div className="modal-overlay">
            <div className="modal-content glass-card medium-modal">
              <div className="modal-header">
                <h3>Add Practice Question to {practicePlatform.toUpperCase()}</h3>
                <button className="close-btn" onClick={() => setShowPracticeForm(false)}>×</button>
              </div>
              <form onSubmit={handleAddPracticeQuestion}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Official Question URL</label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder={`Paste ${practicePlatform} question URL here`}
                      value={pqUrlInput}
                      onChange={(e) => setPqUrlInput(e.target.value)}
                      required
                      autoFocus
                    />
                    <small className="text-secondary">The title, ID, and slug will be created from this URL and shown in the practice list.</small>
                  </div>
                </div>
                <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPracticeForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-accent practice-submit-btn" disabled={submittingPracticeQuestion}>
                    {submittingPracticeQuestion ? 'Saving...' : 'Submit URL'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* ACADEMICS MODAL */}
      {showAcademicsModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content glass-card medium-modal">
            <div className="modal-header">
              <div>
                <h3>Academic Report Card — {selectedStudent.name}</h3>
                <p className="modal-subtitle">Academic details are view-only. SGPAs are filled by the student on their Profile settings tab.</p>
              </div>
              <button className="close-btn" onClick={() => setShowAcademicsModal(false)}>×</button>
            </div>
            <div className="modal-body academics-modal-body">
              <div className="academics-cgpa-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
                <span className="text-secondary" style={{ fontWeight: '500' }}>Roll Number: {selectedStudent.rollNumber || 'N/A'}</span>
                <span style={{ fontSize: '15px' }}>Computed CGPA: <strong className="text-glow" style={{ fontSize: '18px' }}>{calculateCgpa()}</strong></span>
              </div>

              <div className="academics-sgpas-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <div className="form-group" key={sem}>
                    <label className="form-label">Semester {sem} SGPA</label>
                    <input
                      type="number"
                      className="form-control"
                      value={sgpas[`sgpaSem${sem}`] || '0'}
                      readOnly
                      disabled
                      style={{ opacity: 0.8, cursor: 'not-allowed' }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '15px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAcademicsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUESTIONS MANAGEMENT MODAL */}
      {
        showQuestionsModal && selectedTest && (
          <div className="modal-overlay">
            <div className="modal-content glass-card large-modal">
              <div className="modal-header">
                <h3>Manage Questions — {selectedTest.title}</h3>
                <button className="close-btn" onClick={() => setShowQuestionsModal(false)}>×</button>
              </div>

              <div className="modal-body">
                {!showQuestionForm ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <p className="text-secondary">Manage the question pool. Each test run shuffles and serves exactly 20 questions.</p>
                      <button className="btn btn-accent" onClick={handleOpenAddQuestion}>
                        ➕ Add New Question
                      </button>
                    </div>

                    {loadingQuestions ? (
                      <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="spinner-loader"></div>
                        <p className="mt-10">Fetching question pool...</p>
                      </div>
                    ) : (
                      <div className="questions-pool-list">
                        {questions.length > 0 ? (
                          questions.map((q, idx) => (
                            <div key={q._id} className="question-pool-item glass-card">
                              <div className="q-item-header">
                                <span className="q-number">Question #{idx + 1}</span>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span className={`difficulty-badge ${q.difficulty}`}>
                                    {q.difficulty}
                                  </span>
                                  <button
                                    className="icon-action-btn edit"
                                    title="Edit Question"
                                    onClick={() => handleOpenEditQuestion(q)}
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    className="icon-action-btn delete"
                                    title="Delete Question"
                                    onClick={() => handleDeleteQuestion(q._id)}
                                  >
                                    ❌
                                  </button>
                                </div>
                              </div>
                              <div className="q-item-body mt-10">
                                <p className="q-text"><strong>{q.questionText}</strong></p>
                                <ul className="q-options-list mt-10">
                                  {q.options.map((opt, oIdx) => (
                                    <li key={oIdx} className={oIdx === q.correctOptionIndex ? 'correct-option' : ''}>
                                      {String.fromCharCode(65 + oIdx)}. {opt} {oIdx === q.correctOptionIndex && '✓ (Correct)'}
                                    </li>
                                  ))}
                                </ul>
                                {q.explanation && (
                                  <p className="q-explanation mt-10 small text-secondary">
                                    <strong>Explanation:</strong> {q.explanation}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p style={{ textAlign: 'center', padding: '40px' }} className="text-secondary">
                            No questions in this test pool yet. Click "Add New Question" to create one.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* Question Add/Edit Form */
                  <form onSubmit={handleSaveQuestion} className="question-editor-form animate-fade">
                    <h4>{editingQuestionId ? 'Edit Question' : 'Add New Question'}</h4>

                    <div className="form-group">
                      <label className="form-label">Question text</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Enter question scenario or problem description..."
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Question Image (Optional)</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Image URL (e.g. /uploads/...) or upload below"
                          value={questionImage}
                          onChange={(e) => setQuestionImage(e.target.value)}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          id="question-image-upload"
                          style={{ display: 'none' }}
                          onChange={(e) => handleUploadImage(e.target.files[0], 'question')}
                        />
                        <label htmlFor="question-image-upload" className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap' }}>
                          {uploadingQImage ? 'Uploading...' : '📁 Choose File'}
                        </label>
                      </div>
                      {questionImage && (
                        <div className="image-preview-container" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={questionImage.startsWith('http') || questionImage.startsWith('/') ? questionImage : `${API_URL.replace('/api', '')}${questionImage.startsWith('/') ? '' : '/'}${questionImage}`}
                            alt="Question Preview"
                            style={{ maxHeight: '80px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuestionImage('')}>Clear</button>
                        </div>
                      )}
                    </div>

                    <div className="form-grid-2-col">
                      <div className="form-group">
                        <label className="form-label">Option A</label>
                        <input
                          type="text"
                          className="form-control"
                          value={option1}
                          onChange={(e) => setOption1(e.target.value)}
                          placeholder="Option A choice"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Option B</label>
                        <input
                          type="text"
                          className="form-control"
                          value={option2}
                          onChange={(e) => setOption2(e.target.value)}
                          placeholder="Option B choice"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-grid-2-col">
                      <div className="form-group">
                        <label className="form-label">Option C (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={option3}
                          onChange={(e) => setOption3(e.target.value)}
                          placeholder="Option C choice"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Option D (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          value={option4}
                          onChange={(e) => setOption4(e.target.value)}
                          placeholder="Option D choice"
                        />
                      </div>
                    </div>

                    <div className="form-grid-2-col">
                      <div className="form-group">
                        <label className="form-label">Correct Option Index</label>
                        <select
                          className="form-control"
                          value={correctOptionIndex}
                          onChange={(e) => setCorrectOptionIndex(e.target.value)}
                        >
                          <option value={0}>Option A (Index 0)</option>
                          <option value={1}>Option B (Index 1)</option>
                          {option3 && <option value={2}>Option C (Index 2)</option>}
                          {option4 && <option value={3}>Option D (Index 3)</option>}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Difficulty Level</label>
                        <select
                          className="form-control"
                          value={questionDifficulty}
                          onChange={(e) => setQuestionDifficulty(e.target.value)}
                        >
                          <option value="easy">Easy (Served in first 7 questions)</option>
                          <option value="medium">Medium (Served in middle 7 questions)</option>
                          <option value="hard">Hard (Served in final 6 questions)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Explanation (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={questionExplanation}
                        onChange={(e) => setQuestionExplanation(e.target.value)}
                        placeholder="Why is the chosen option correct?"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Explanation Image (Optional)</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Image URL (e.g. /uploads/...) or upload below"
                          value={explanationImage}
                          onChange={(e) => setExplanationImage(e.target.value)}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          id="explanation-image-upload"
                          style={{ display: 'none' }}
                          onChange={(e) => handleUploadImage(e.target.files[0], 'explanation')}
                        />
                        <label htmlFor="explanation-image-upload" className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap' }}>
                          {uploadingExpImage ? 'Uploading...' : '📁 Choose File'}
                        </label>
                      </div>
                      {explanationImage && (
                        <div className="image-preview-container" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={explanationImage.startsWith('http') || explanationImage.startsWith('/') ? explanationImage : `${API_URL.replace('/api', '')}${explanationImage.startsWith('/') ? '' : '/'}${explanationImage}`}
                            alt="Explanation Preview"
                            style={{ maxHeight: '80px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                          />
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setExplanationImage('')}>Clear</button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowQuestionForm(false)}
                        disabled={submittingQuestion}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={submittingQuestion}
                      >
                        {submittingQuestion ? 'Saving...' : 'Save Question'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* VIEW ATTEMPTS & REPORTS MODAL */}
      {
        showAttemptsModal && selectedTest && (
          <div className="modal-overlay">
            <div className="modal-content glass-card large-modal">
              <div className="modal-header">
                <h3>Grades Report — {selectedTest.title}</h3>
                <button className="close-btn" onClick={() => setShowAttemptsModal(false)}>×</button>
              </div>

              <div className="modal-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <p className="text-secondary">Student scores list. Results are compiled in real-time as users submit their tests.</p>
                  <button
                    className="btn btn-accent"
                    onClick={() => downloadAttemptsCSV(selectedTest)}
                    disabled={attempts.length === 0}
                  >
                    📥 Download CSV Report
                  </button>
                </div>

                {loadingAttempts ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner-loader"></div>
                    <p className="mt-10">Compiling candidates history...</p>
                  </div>
                ) : (
                  <div className="table-responsive-wrapper">
                    <table className="student-roster-table">
                      <thead>
                        <tr>
                          <th>Student Candidate</th>
                          <th>Roll No</th>
                          <th>Branch</th>
                          <th>Score</th>
                          <th>Percentage</th>
                          <th>Completion Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attempts.length > 0 ? (
                          attempts.map((att) => {
                            const u = att.user || {};
                            const pct = att.totalQuestions > 0 ? Math.round((att.score / att.totalQuestions) * 100) : 0;
                            return (
                              <tr key={att._id}>
                                <td>
                                  <strong>{u.name || 'N/A'}</strong>
                                  <div className="small text-secondary">{u.email || 'N/A'}</div>
                                </td>
                                <td>{u.rollNumber || 'N/A'}</td>
                                <td>{u.branch || 'N/A'}</td>
                                <td>{att.score} / {att.totalQuestions}</td>
                                <td>
                                  <strong className="text-glow">{pct}%</strong>
                                </td>
                                <td>{new Date(att.completedAt).toLocaleString()}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="table-empty-msg">No students have taken this test yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
      {/* PRACTICE QUESTION EDIT MODAL */}
      {showPracticeEditForm && editingPracticeQuestion && (
        <div className="modal-overlay">
          <div className="modal-content glass-card medium-modal">
            <div className="modal-header">
              <h3>Edit Practice Question — #{editingPracticeQuestion.id}</h3>
              <button className="close-btn" onClick={() => setShowPracticeEditForm(false)}>×</button>
            </div>
            <form onSubmit={handleSavePracticeEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Question Title</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={editPqTitle}
                    onChange={(e) => setEditPqTitle(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select
                      className="form-control"
                      value={editPqDifficulty}
                      onChange={(e) => setEditPqDifficulty(e.target.value)}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Acceptance Rate</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editPqAcceptance}
                      onChange={(e) => setEditPqAcceptance(e.target.value)}
                      placeholder="e.g. 54.8%"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Slug / Key Identifier</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={editPqSlug}
                    onChange={(e) => setEditPqSlug(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editPqTagsText}
                    onChange={(e) => setEditPqTagsText(e.target.value)}
                    placeholder="Array, Hash Table"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Solution Reference / Explanation</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={editPqSolution}
                    onChange={(e) => setEditPqSolution(e.target.value)}
                    placeholder="Write a summary or instructions for the student..."
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPracticeEditForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingPracticeEdit}>
                  {submittingPracticeEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRACTICE QUESTION BULK UPLOAD MODAL */}
      {showPracticeBulkForm && (
        <div className="modal-overlay">
          <div className="modal-content glass-card medium-modal" style={{ maxWidth: '750px', width: '90%' }}>
            <div className="modal-header">
              <h3>Bulk Import Questions to {practicePlatform.toUpperCase()}</h3>
              <button className="close-btn" onClick={() => {
                setShowPracticeBulkForm(false);
                setPracticeBulkInput('');
                setPracticeBulkPreview([]);
                setPracticeBulkError('');
              }}>×</button>
            </div>
            <div className="modal-body">
              {practiceBulkError && (
                <div className="error-banner" style={{ marginBottom: '15px' }}>
                  <span>{practiceBulkError}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Upload Format</label>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                    <input
                      type="radio"
                      name="pqBulkType"
                      checked={practiceBulkInputType === 'json'}
                      onChange={() => { setPracticeBulkInputType('json'); setPracticeBulkError(''); }}
                    />
                    JSON Array
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                    <input
                      type="radio"
                      name="pqBulkType"
                      checked={practiceBulkInputType === 'csv'}
                      onChange={() => { setPracticeBulkInputType('csv'); setPracticeBulkError(''); }}
                    />
                    CSV Format
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Input Data Payload</label>
                <textarea
                  className="form-control"
                  rows="7"
                  style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', color: '#cbd5e0' }}
                  placeholder={
                    practiceBulkInputType === 'json'
                      ? '[\n  {\n    "officialUrl": "https://leetcode.com/problems/two-sum/",\n    "title": "Two Sum",\n    "difficulty": "Easy"\n  }\n]'
                      : 'officialUrl,slug,title,difficulty,acceptance,tags\n"https://leetcode.com/problems/two-sum/",two-sum,"Two Sum",Easy,"49.2%",Array;Hash-Table'
                  }
                  value={practiceBulkInput}
                  onChange={(e) => setPracticeBulkInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handlePreviewPracticeBulk}>
                  🔍 Run Parse Preview
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    if (practiceBulkInputType === 'json') {
                      setPracticeBulkInput(JSON.stringify([
                        {
                          officialUrl: practicePlatform === 'leetcode' ? "https://leetcode.com/problems/reverse-string/" : `https://codeforces.com/problemset/problem/1/A`,
                          slug: practicePlatform === 'leetcode' ? "reverse-string" : "1A",
                          title: practicePlatform === 'leetcode' ? "Reverse String" : "Theatre Square",
                          difficulty: "Easy",
                          acceptance: "75%",
                          tags: ["String", "Two-Pointers"]
                        }
                      ], null, 2));
                    } else {
                      setPracticeBulkInput(`officialUrl,slug,title,difficulty,acceptance,tags\n"${practicePlatform === 'leetcode' ? 'https://leetcode.com/problems/merge-sorted-array/' : 'https://codeforces.com/problemset/problem/4/A'}",${practicePlatform === 'leetcode' ? 'merge-sorted-array,"Merge Sorted Array"' : '4A,"Watermelon"'},Easy,"45%",Array;Sorting`);
                    }
                  }}
                >
                  📝 Insert Example Template
                </button>
              </div>

              {/* Preview table */}
              {practiceBulkPreview.length > 0 && (
                <div className="glass-card" style={{ padding: '10px', maxHeight: '160px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '8px' }}>Parsed Preview ({practiceBulkPreview.length} questions)</h4>
                  <table className="student-roster-table mini-table" style={{ fontSize: '0.75rem' }}>
                    <thead>
                      <tr>
                        <th>Title / Slug</th>
                        <th>URL</th>
                        <th>Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {practiceBulkPreview.map((pq, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{pq.title || 'Untitled'}</strong>
                            <div className="text-secondary small">{pq.slug || 'No Slug'}</div>
                          </td>
                          <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pq.officialUrl || 'N/A'}</td>
                          <td>{pq.difficulty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowPracticeBulkForm(false);
                  setPracticeBulkInput('');
                  setPracticeBulkPreview([]);
                  setPracticeBulkError('');
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={practiceBulkPreview.length === 0 || isSubmittingPracticeBulk}
                onClick={handlePostPracticeBulk}
              >
                {isSubmittingPracticeBulk ? 'Submitting Batch...' : '✓ Confirm Batch Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPanel;
