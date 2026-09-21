import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './AdminPanel.css';

const AdminPanel = ({ defaultTab = 'analytics' }) => {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  // Navigation tabs
  const [activeTab, setActiveTab] = useState(tabParam || defaultTab);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [tabParam, defaultTab]);

  // Lists
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Job options list & deletion
  const [jobs, setJobs] = useState([]);
  const [fetchJobsLoading, setFetchJobsLoading] = useState(false);
  const [selectedJobForExpiry, setSelectedJobForExpiry] = useState(null);
  const [jobExpiryDate, setJobExpiryDate] = useState('');
  const [updatingJobExpiry, setUpdatingJobExpiry] = useState(false);

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
  const [adminAcademicYear, setAdminAcademicYear] = useState('');
  const [adminBranch, setAdminBranch] = useState('');
  const [adminSection, setAdminSection] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyAcademicYear, setFacultyAcademicYear] = useState('');
  const [facultyBranch, setFacultyBranch] = useState('');
  const [facultySection, setFacultySection] = useState('');
  const [submittingFaculty, setSubmittingFaculty] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [scopeStaffId, setScopeStaffId] = useState('');
  const [scopeForm, setScopeForm] = useState({ academicYear: '', branch: '', section: '', subject: '' });
  const [savingScope, setSavingScope] = useState(false);

  // Aptitude Tests Manager States
  const [aptitudeTests, setAptitudeTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [examForm, setExamForm] = useState({ title: '', description: '', category: 'subject', duration: 30, academicYear: '', branch: '', section: '', subject: '', questionLimit: 20 });
  const [creatingExam, setCreatingExam] = useState(false);

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

  // Practice Reports states
  const [practiceReportPlatform, setPracticeReportPlatform] = useState('leetcode');
  const [practiceReportsData, setPracticeReportsData] = useState([]);
  const [loadingPracticeReports, setLoadingPracticeReports] = useState(false);
  const [practiceReportsSearch, setPracticeReportsSearch] = useState('');
  const [practiceReportsBranchFilter, setPracticeReportsBranchFilter] = useState('all');
  const [practiceReportsStatusFilter, setPracticeReportsStatusFilter] = useState('all');
  const [selectedStudentPracticeReport, setSelectedStudentPracticeReport] = useState(null);
  const [loadingStudentPracticeReport, setLoadingStudentPracticeReport] = useState(false);
  const [showStudentPracticeModal, setShowStudentPracticeModal] = useState(false);
  const [viewingCodeSnippet, setViewingCodeSnippet] = useState(null);
  const [modalPracticePlatform, setModalPracticePlatform] = useState('leetcode');
  const [modalQuestionFilter, setModalQuestionFilter] = useState('all');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Practice Question URL form state
  const [submittingPracticeQuestion, setSubmittingPracticeQuestion] = useState(false);
  const [pqUrlInput, setPqUrlInput] = useState('');
  const [pqCompanyInput, setPqCompanyInput] = useState('');
  const [pqYearInput, setPqYearInput] = useState(new Date().getFullYear());

  // Mock Interview reports state
  const [mockInterviewReports, setMockInterviewReports] = useState([]);
  const [loadingMockReports, setLoadingMockReports] = useState(false);
  const [selectedMockReport, setSelectedMockReport] = useState(null);

  const [questionBankReports, setQuestionBankReports] = useState([]);
  const [loadingQuestionBankReports, setLoadingQuestionBankReports] = useState(false);
  const [adminLabReports, setAdminLabReports] = useState([]);
  const [loadingAdminLabReports, setLoadingAdminLabReports] = useState(false);
  const [selectedAdminLabReviewAttempt, setSelectedAdminLabReviewAttempt] = useState(null);
  const [academicSubjects, setAcademicSubjects] = useState([]);
  const [academicProjects, setAcademicProjects] = useState([]);
  const [loadingAcademicContent, setLoadingAcademicContent] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', academicYear: '', branch: '', description: '' });
  const [selectedAcademicProject, setSelectedAcademicProject] = useState(null);
  const [projectReview, setProjectReview] = useState({ status: 'under_review', feedback: '', grade: '' });

  // Interview Settings state
  const [interviewRoles, setInterviewRoles] = useState([]);
  const [interviewTechnologies, setInterviewTechnologies] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newTechName, setNewTechName] = useState('');
  const [submittingRole, setSubmittingRole] = useState(false);
  const [submittingTech, setSubmittingTech] = useState(false);
  const [metaSuccess, setMetaSuccess] = useState('');

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

  // Core CSE Subjects & Practice tab states
  const [coreSubjectSearch, setCoreSubjectSearch] = useState('');
  const [coreSubjectYearFilter, setCoreSubjectYearFilter] = useState('');
  const [coreSubjectBranchFilter, setCoreSubjectBranchFilter] = useState('');

  // Core Subject Notes states
  const [adminSubjectWorkspace, setAdminSubjectWorkspace] = useState(null); // { subject, activeView: 'notes' | 'tests' | 'reports' }
  const [adminNotePdfFile, setAdminNotePdfFile] = useState(null);
  const [selectedAdminSubjectForNotes, setSelectedAdminSubjectForNotes] = useState(null);
  const [showAdminNotesModal, setShowAdminNotesModal] = useState(false);
  const [adminNotesList, setAdminNotesList] = useState([]);
  const [loadingAdminNotes, setLoadingAdminNotes] = useState(false);
  const [adminNoteForm, setAdminNoteForm] = useState({ title: '', description: '', content: '', fileUrl: '' });
  const [submittingAdminNote, setSubmittingAdminNote] = useState(false);

  // Core Subject Practice Tests states
  const [selectedAdminSubjectForTests, setSelectedAdminSubjectForTests] = useState(null);
  const [showAdminSubjectTestsModal, setShowAdminSubjectTestsModal] = useState(false);
  const [adminSubjectTestsList, setAdminSubjectTestsList] = useState([]);
  const [loadingAdminSubjectTests, setLoadingAdminSubjectTests] = useState(false);
  const [showAdminCreateSubjectTest, setShowAdminCreateSubjectTest] = useState(false);
  const [adminSubjectTestForm, setAdminSubjectTestForm] = useState({ title: '', description: '', duration: 20, questionLimit: 20, difficulty: 'medium' });
  const [creatingAdminSubjectTest, setCreatingAdminSubjectTest] = useState(false);

  // Core Subject Student Reports states
  const [selectedAdminSubjectForReports, setSelectedAdminSubjectForReports] = useState(null);
  const [showAdminSubjectReportsModal, setShowAdminSubjectReportsModal] = useState(false);
  const [adminSubjectReportsList, setAdminSubjectReportsList] = useState([]);
  const [loadingAdminSubjectReports, setLoadingAdminSubjectReports] = useState(false);

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

  const fetchStaff = async () => {
    try {
      setLoadingStaff(true);
      const res = await fetch(`${API_URL}/users/staff`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setStaffMembers(data.data);
      else setError(data.error || 'Failed to fetch staff records.');
    } catch (err) {
      setError('Could not connect to staff management service.');
    } finally {
      setLoadingStaff(false);
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

  const createAcademicExam = async (event) => {
    event.preventDefault();
    try {
      setCreatingExam(true);
      const res = await fetch(`${API_URL}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...examForm, duration: Number(examForm.duration), questionLimit: Number(examForm.questionLimit) })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create exam.');
      setAptitudeTests(previous => [data.data, ...previous]);
      setExamForm({ title: '', description: '', category: 'subject', duration: 30, academicYear: '', branch: '', section: '', subject: '', questionLimit: 20 });
      setSuccess('Exam created. Open Manage Questions to add the question set.');
    } catch (err) { setError(err.message); }
    finally { setCreatingExam(false); }
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

  const fetchQuestionBankReports = async () => {
    try {
      setLoadingQuestionBankReports(true);
      const res = await fetch(`${API_URL}/questions/submissions/report?sort=Highest%20Plagiarism`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setQuestionBankReports(data.data);
      } else {
        setError(data.error || 'Failed to retrieve Question Bank reports.');
      }
    } catch (err) {
      setError('Could not connect to Question Bank report service.');
    } finally {
      setLoadingQuestionBankReports(false);
    }
  };

  const downloadQuestionBankReport = () => {
    if (questionBankReports.length === 0) return;

    const escapeCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = ['Student', 'Email', 'Question', 'Language', 'Submission Status', 'Plagiarism Percentage', 'Risk Level', 'Submitted At'];
    const rows = questionBankReports.map((report) => {
      const percentage = report.plagiarismPercentage || 0;
      const risk = percentage > 60
        ? 'High Plagiarism'
        : percentage > 30
          ? 'Moderate Similarity'
          : percentage > 10
            ? 'Low Similarity'
            : 'Original';

      return [
        report.user?.name || 'Student',
        report.user?.email || 'No email',
        report.question?.title || 'Question unavailable',
        report.language?.toUpperCase() || 'N/A',
        report.status || 'N/A',
        percentage,
        risk,
        report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'
      ].map(escapeCsvValue).join(',');
    });

    const blob = new Blob([`\uFEFF${[headers.map(escapeCsvValue).join(','), ...rows].join('\n')}`], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `question_bank_plagiarism_report_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchAcademicContent = async () => {
    try {
      setLoadingAcademicContent(true);
      const [subjectsResponse, projectsResponse] = await Promise.all([
        fetch(`${API_URL}/academic/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/academic/projects`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const subjectsData = await subjectsResponse.json();
      const projectsData = await projectsResponse.json();
      if (!subjectsData.success) throw new Error(subjectsData.error || 'Failed to load subjects.');
      if (!projectsData.success) throw new Error(projectsData.error || 'Failed to load projects.');
      setAcademicSubjects(subjectsData.data);
      setAcademicProjects(projectsData.data);
    } catch (err) {
      setError(err.message || 'Could not load academic content.');
    } finally {
      setLoadingAcademicContent(false);
    }
  };

  const createAcademicSubject = async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API_URL}/academic/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(subjectForm)
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to create subject.');
      setAcademicSubjects(previous => [...previous, data.data].sort((a, b) => a.code.localeCompare(b.code)));
      setSubjectForm({ name: '', code: '', academicYear: '', branch: '', description: '' });
      setSuccess('Subject created successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const openProjectReview = (project) => {
    setSelectedAcademicProject(project);
    setProjectReview({
      status: project.status === 'draft' ? 'under_review' : project.status,
      feedback: project.feedback || '',
      grade: project.grade ?? '',
      codeSuggestions: project.codeSuggestions || '',
      techSuggestions: project.techSuggestions || ''
    });
  };

  const saveProjectReview = async (event) => {
    event.preventDefault();
    if (!selectedAcademicProject) return;
    try {
      const response = await fetch(`${API_URL}/academic/projects/${selectedAcademicProject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...projectReview,
          grade: projectReview.grade === '' ? null : Number(projectReview.grade)
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to save project review.');
      setAcademicProjects(previous => previous.map(project => project._id === data.data._id ? data.data : project));
      setSelectedAcademicProject(null);
      setSuccess('Project review and suggestions saved.');
    } catch (err) {
      setError(err.message);
    }
  };

  const downloadAcademicCsv = (filename, headers, rows) => {
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = `\uFEFF${[headers, ...rows].map(row => row.map(escape).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadAcademicSubjects = () => downloadAcademicCsv(
    'academic_subjects',
    ['Subject', 'Code', 'Academic Year', 'Description', 'Active'],
    academicSubjects.map(subject => [subject.name, subject.code, subject.academicYear, subject.description, subject.isActive ? 'Yes' : 'No'])
  );

  const downloadAcademicProjects = () => downloadAcademicCsv(
    'student_projects_comprehensive',
    [
      'Project Title',
      'Lead Student',
      'Student Email',
      'Roll Number',
      'Academic Year',
      'Teammates',
      'Technologies Used',
      'Project Goals',
      'Deployment URL',
      'Repository URL',
      'Status',
      'Grade',
      'Code Suggestions',
      'Tech Suggestions',
      'Evaluator Feedback',
      'Last Updated'
    ],
    academicProjects.map(project => {
      const teamStr = (project.teamMembers || []).map(m => `${m.name} (${m.rollNumber || 'No ID'} - ${m.role || 'Member'})`).join('; ');
      return [
        project.title,
        project.student?.name || 'Student',
        project.student?.email || '',
        project.student?.rollNumber || '',
        project.academicYear,
        teamStr || 'Individual Project',
        (project.technologies || []).join(', '),
        project.goals || '',
        project.deploymentUrl || project.previewUrl || '',
        project.repositoryUrl || '',
        project.status,
        project.grade ?? 'Not graded',
        project.codeSuggestions || '',
        project.techSuggestions || '',
        project.feedback || '',
        project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : ''
      ];
    })
  );

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

  const openJobExpiryEditor = (job) => {
    setSelectedJobForExpiry(job);
    setJobExpiryDate(job.expiresAt ? new Date(job.expiresAt).toISOString().slice(0, 10) : '');
    setError('');
    setSuccess('');
  };

  const handleUpdateJobExpiry = async (e) => {
    e.preventDefault();
    if (!selectedJobForExpiry || !jobExpiryDate) return;

    try {
      setUpdatingJobExpiry(true);
      setError('');
      const res = await fetch(`${API_URL}/jobs/${selectedJobForExpiry._id}/expiry`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ expiresAt: jobExpiryDate })
      });
      const data = await res.json();

      if (data.success) {
        setJobs(prev => prev.map(job => job._id === data.data._id ? data.data : job));
        setSuccess(data.message);
        setSelectedJobForExpiry(null);
      } else {
        setError(data.error || 'Failed to update the job deadline.');
      }
    } catch (err) {
      setError('Could not connect to the job deadline service.');
    } finally {
      setUpdatingJobExpiry(false);
    }
  };

  useEffect(() => {
    if (token) {
      // Always pre-load staff records so staff dropdowns & counts are always available
      fetchStaff();

      if (activeTab === 'analytics') {
        fetchStudents();
      } else if (activeTab === 'job-opportunities' || activeTab === 'jobs' || activeTab === 'job-postings') {
        fetchJobs();
      } else if (activeTab === 'interviews') {
        fetchMockInterviewReports();
      } else if (activeTab === 'question-bank') {
        fetchQuestionBankReports();
      } else if (activeTab === 'lab-reports') {
        fetchAdminLabReports();
      } else if (activeTab === 'core-subjects') {
        fetchAcademicContent();
        fetchAptitudeTests();
      } else if (activeTab === 'academic-content') {
        fetchAcademicContent();
      } else if (activeTab === 'aptitude') {
        fetchAptitudeTests();
        fetch(`${API_URL}/academic/subjects`, { headers: { Authorization: `Bearer ${token}` } })
          .then(response => response.json())
          .then(data => { if (data.success) setAcademicSubjects(data.data); })
          .catch(() => {});
      } else if (activeTab === 'interview-settings') {
        fetchStaff();
        fetchAcademicContent();
      } else if (activeTab === 'faculty-staff') {
        fetchStaff();
        fetchAcademicContent();
      } else if (activeTab === 'practice-reports') {
        fetchPracticeReports(practiceReportPlatform);
      } else if (activeTab === 'settings') {
        fetchStaff();
        fetchAcademicContent();
      }
    }
  }, [token, activeTab]);

  // Core CSE Subjects Handlers
  const openAdminNotesModal = async (subject) => {
    setSelectedAdminSubjectForNotes(subject);
    setAdminSubjectWorkspace({ subject, activeView: 'notes' });
    setShowAdminNotesModal(false);
    setAdminNoteForm({ title: '', description: '', content: '', fileUrl: '' });
    setAdminNotePdfFile(null);
    try {
      setLoadingAdminNotes(true);
      const res = await fetch(`${API_URL}/academic/subjects/${subject._id}/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAdminNotesList(data.success ? data.data : (subject.notes || []));
    } catch {
      setAdminNotesList(subject.notes || []);
    } finally {
      setLoadingAdminNotes(false);
    }
  };

  const handleAddAdminNote = async (e) => {
    e.preventDefault();
    if (!adminNoteForm.title.trim()) return;
    const currentSubject = adminSubjectWorkspace?.subject || selectedAdminSubjectForNotes;
    if (!currentSubject) return;
    try {
      setSubmittingAdminNote(true);
      let res;
      if (adminNotePdfFile) {
        const formData = new FormData();
        formData.append('title', adminNoteForm.title);
        formData.append('description', adminNoteForm.description || '');
        formData.append('content', adminNoteForm.content || '');
        if (adminNoteForm.fileUrl) formData.append('fileUrl', adminNoteForm.fileUrl);
        formData.append('pdfFile', adminNotePdfFile);
        res = await fetch(`${API_URL}/academic/subjects/${currentSubject._id}/notes`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
      } else {
        res = await fetch(`${API_URL}/academic/subjects/${currentSubject._id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(adminNoteForm)
        });
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add study note.');
      setAdminNotesList(prev => [data.data, ...prev]);
      setAcademicSubjects(prev => prev.map(s => s._id === currentSubject._id ? { ...s, notes: [data.data, ...(s.notes || [])] } : s));
      setAdminNoteForm({ title: '', description: '', content: '', fileUrl: '' });
      setAdminNotePdfFile(null);
      setSuccess('Study material and PDF uploaded successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingAdminNote(false);
    }
  };

  const handleDeleteAdminNote = async (noteId) => {
    if (!window.confirm('Delete this study note?')) return;
    const currentSubject = adminSubjectWorkspace?.subject || selectedAdminSubjectForNotes;
    if (!currentSubject) return;
    try {
      const res = await fetch(`${API_URL}/academic/subjects/${currentSubject._id}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete note.');
      setAdminNotesList(prev => prev.filter(n => n._id !== noteId));
      setAcademicSubjects(prev => prev.map(s => s._id === currentSubject._id ? { ...s, notes: (s.notes || []).filter(n => n._id !== noteId) } : s));
      setSuccess('Study note deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const openAdminSubjectTestsModal = (subject) => {
    setSelectedAdminSubjectForTests(subject);
    setAdminSubjectWorkspace({ subject, activeView: 'tests' });
    setShowAdminSubjectTestsModal(false);
    setShowAdminCreateSubjectTest(false);
    setAdminSubjectTestForm({ title: `${subject.code} Practice Test`, description: `Curriculum practice test for ${subject.name}`, duration: 20, questionLimit: 20, difficulty: 'medium' });
    const matched = (aptitudeTests || []).filter(t => t.subject === subject._id || t.subject?._id === subject._id || (t.title && t.title.toLowerCase().includes(subject.code.toLowerCase())));
    setAdminSubjectTestsList(matched);
  };

  const handleCreateAdminSubjectTest = async (e) => {
    e.preventDefault();
    const currentSubject = adminSubjectWorkspace?.subject || selectedAdminSubjectForTests;
    if (!currentSubject) return;
    try {
      setCreatingAdminSubjectTest(true);
      const payload = {
        ...adminSubjectTestForm,
        category: 'core-cse',
        subject: currentSubject._id,
        academicYear: currentSubject.academicYear,
        branch: currentSubject.branch,
        section: currentSubject.section
      };
      const res = await fetch(`${API_URL}/tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create test.');
      setAdminSubjectTestsList(prev => [data.data, ...prev]);
      setAptitudeTests(prev => [data.data, ...prev]);
      setShowAdminCreateSubjectTest(false);
      setSuccess('Practice test created! Click "Manage Questions" to configure questions.');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingAdminSubjectTest(false);
    }
  };

  const openAdminSubjectReportsModal = async (subject) => {
    setSelectedAdminSubjectForReports(subject);
    setAdminSubjectWorkspace({ subject, activeView: 'reports' });
    setShowAdminSubjectReportsModal(false);
    try {
      setLoadingAdminSubjectReports(true);
      const res = await fetch(`${API_URL}/tests/subject/${subject._id}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setAdminSubjectReportsList(data.success ? data.data : []);
    } catch (err) {
      setError('Failed to fetch subject test reports.');
    } finally {
      setLoadingAdminSubjectReports(false);
    }
  };

  const downloadAdminSubjectReportsCSV = () => {
    if (!adminSubjectReportsList.length) return;
    const currentSubject = adminSubjectWorkspace?.subject || selectedAdminSubjectForReports;
    const headers = ['Student Name', 'Roll Number', 'Email', 'Branch', 'Section', 'Academic Year', 'Test Title', 'Score', 'Total Questions', 'Percentage (%)', 'Status', 'Completed Date'];
    const rows = adminSubjectReportsList.map(r => [
      r.student?.name || '',
      r.student?.rollNumber || '',
      r.student?.email || '',
      r.student?.branch || '',
      r.student?.section || '',
      r.student?.academicYear || '',
      r.test?.title || '',
      r.score,
      r.totalQuestions,
      `${r.percentage}%`,
      r.passed ? 'PASSED' : 'NEEDS PRACTICE',
      r.completedAt ? new Date(r.completedAt).toLocaleString() : ''
    ]);
    const filename = `${(currentSubject?.code || 'Subject').replace(/[^a-zA-Z0-9]/g, '_')}_Student_Reports`;
    downloadAcademicCsv(filename, headers, rows);
  };

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

    if (!adminName || !adminEmail || !adminAcademicYear || !adminBranch || !adminSection) {
      setError('Please fill in administrator credentials and academic assignment fields.');
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
          managedScopes: [{ academicYear: adminAcademicYear, branch: adminBranch, section: adminSection }]
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Successfully created new Administrator account for ${adminName}! A password setup link was emailed.`);
        setAdminName('');
        setAdminEmail('');
        setAdminAcademicYear('');
        setAdminBranch('');
        setAdminSection('');
        fetchStaff();
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

  const handleCreateFaculty = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!facultyName || !facultyEmail || !facultyAcademicYear || !facultyBranch || !facultySection) {
      setError('Faculty name, email, academic year, branch, and section are required.');
      return;
    }
    try {
      setSubmittingFaculty(true);
      const res = await fetch(`${API_URL}/users/faculty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: facultyName,
          email: facultyEmail,
          managedScopes: [{ academicYear: facultyAcademicYear, branch: facultyBranch, section: facultySection }]
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create faculty account.');
      setSuccess(`Faculty account created for ${facultyName}. A password setup link was emailed.`);
      setFacultyName('');
      setFacultyEmail('');
      setFacultyAcademicYear('');
      setFacultyBranch('');
      setFacultySection('');
      fetchStaff();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingFaculty(false);
    }
  };

  const resetStaffPassword = async (staff) => {
    if (!window.confirm(`Send a new password setup link to ${staff.name}?`)) return;
    try {
      const res = await fetch(`${API_URL}/users/staff/${staff._id}/reset-password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to reset password.');
      setSuccess(data.message);
      fetchStaff();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteStaff = async (staff) => {
    if (staff.isSuperAdmin || staff.email?.toLowerCase() === 'vaddeajaykumar2004@gmail.com') {
      setError('The Super Admin account is protected and cannot be deleted.');
      return;
    }
    if (!window.confirm(`Remove ${staff.role} account for ${staff.name}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/users/staff/${staff._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.message || 'Failed to remove staff account.');
      setSuccess(data.message || 'Staff member removed successfully.');
      setStaffMembers(previous => previous.filter(member => member._id !== staff._id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStaffScope = async (staffId, scopeId) => {
    if (!window.confirm('Are you sure you want to remove this academic scope from the staff member?')) return;
    try {
      setError('');
      setSuccess('');
      const res = await fetch(`${API_URL}/users/staff/${staffId}/scopes/${scopeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to remove scope.');
      setStaffMembers(previous => previous.map(m => m._id === data.data._id ? data.data : m));
      setSuccess('Academic scope removed successfully.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!window.confirm(`Are you sure you want to delete the academic subject "${subjectName}"? This cannot be undone.`)) return;
    try {
      setError('');
      setSuccess('');
      const res = await fetch(`${API_URL}/academic/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete subject.');
      setSuccess(`Subject "${subjectName}" deleted successfully.`);
      fetchAcademicContent();
    } catch (err) {
      setError(err.message);
    }
  };

  const saveStaffScope = async (event) => {
    event.preventDefault();
    if (!scopeStaffId || !scopeForm.academicYear) return setError('Select a staff member and academic year.');
    try {
      setSavingScope(true);
      const staff = staffMembers.find(member => member._id === scopeStaffId);
      const existing = staff?.managedScopes || [];

      // Check if duplicate scope already exists
      const isDuplicate = existing.some(s =>
        (s.academicYear || '').trim().toLowerCase() === scopeForm.academicYear.trim().toLowerCase() &&
        (s.branch || '').trim().toLowerCase() === (scopeForm.branch || '').trim().toLowerCase() &&
        (s.section || '').trim().toLowerCase() === (scopeForm.section || '').trim().toLowerCase() &&
        (s.subject || '') === (scopeForm.subject || '')
      );
      if (isDuplicate) {
        setError('This staff member is already assigned to this exact academic scope.');
        setSavingScope(false);
        return;
      }

      const scopes = [...existing, scopeForm];
      const res = await fetch(`${API_URL}/users/staff/${scopeStaffId}/scopes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ managedScopes: scopes })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to assign scope.');
      setStaffMembers(previous => previous.map(member => member._id === data.data._id ? data.data : member));
      setScopeForm({ academicYear: '', branch: '', section: '', subject: '' });
      setSuccess('Academic scope assigned successfully.');
    } catch (err) { setError(err.message); }
    finally { setSavingScope(false); }
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

  const handleDownloadPracticeReport = async (platform = practiceReportPlatform) => {
    try {
      const res = await fetch(`${API_URL}/tests/practice-reports/${platform}`, {
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
      const headers = ['Roll Number', 'Student Name', 'Email Address', 'Branch', 'Platform Username', 'Admin Solved', 'Total Solved on Platform'];
      if (platform === 'leetcode') {
        headers.push('Easy Solved', 'Medium Solved', 'Hard Solved');
      } else if (platform === 'codeforces') {
        headers.push('Rating', 'Rank');
      } else if (platform === 'codechef') {
        headers.push('Rating', 'Stars');
      } else if (platform === 'hackerrank') {
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
        if (platform === 'leetcode') {
          baseRow.push(
            item.platformSpecificStats?.easySolved || 0,
            item.platformSpecificStats?.mediumSolved || 0,
            item.platformSpecificStats?.hardSolved || 0
          );
        } else if (platform === 'codeforces') {
          baseRow.push(
            item.platformSpecificStats?.rating || 0,
            `"${item.platformSpecificStats?.rank || 'Unrated'}"`
          );
        } else if (platform === 'codechef') {
          baseRow.push(
            item.platformSpecificStats?.rating || 0,
            `"${item.platformSpecificStats?.stars || '1★'}"`
          );
        } else if (platform === 'hackerrank') {
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
      link.setAttribute("download", `${platform}_students_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Error downloading report: ' + err.message);
    }
  };

  const fetchPracticeReports = async (platform = practiceReportPlatform) => {
    try {
      setLoadingPracticeReports(true);
      const res = await fetch(`${API_URL}/tests/practice-reports/${platform}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPracticeReportsData(data.data);
      } else {
        setPracticeReportsData([]);
      }
    } catch (err) {
      console.error('Failed to fetch practice reports:', err.message);
      setPracticeReportsData([]);
    } finally {
      setLoadingPracticeReports(false);
    }
  };

  const handleOpenStudentPracticeReport = async (studentId) => {
    if (!studentId || studentId === 'undefined' || studentId === 'null') {
      alert('Unable to identify student record. Please refresh the practice reports table.');
      return;
    }
    try {
      setLoadingStudentPracticeReport(true);
      setShowStudentPracticeModal(true);
      setViewingCodeSnippet(null);
      setModalPracticePlatform(practiceReportPlatform);
      setModalQuestionFilter('all');
      const res = await fetch(`${API_URL}/tests/practice-reports/student/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedStudentPracticeReport(data.data);
      } else {
        alert(data.error || 'Failed to load individual student report');
        setShowStudentPracticeModal(false);
      }
    } catch (err) {
      alert('Error loading student practice report: ' + err.message);
      setShowStudentPracticeModal(false);
    } finally {
      setLoadingStudentPracticeReport(false);
    }
  };

  const handleExportIndividualStudentCSV = (studentReport, platformToExport = modalPracticePlatform || practiceReportPlatform) => {
    if (!studentReport || !studentReport.student) return;
    const { student, platforms } = studentReport;
    const currentPlatData = platforms?.[platformToExport];
    if (!currentPlatData) return;

    const headers = ['Problem ID', 'Problem Title', 'Difficulty', 'Acceptance', 'Status', 'Language', 'Submission Date'];
    const rows = (currentPlatData.questions || []).map(q => [
      `"${q.id}"`,
      `"${(q.title || '').replace(/"/g, '""')}"`,
      `"${q.difficulty || 'N/A'}"`,
      `"${q.acceptance || 'N/A'}"`,
      `"${q.isSolved ? 'Solved' : 'Unsolved'}"`,
      `"${q.language || 'N/A'}"`,
      `"${q.solvedAt ? new Date(q.solvedAt).toLocaleDateString() : 'N/A'}"`
    ]);

    const summaryHeader = [
      `"Student: ${student.name} (${student.rollNumber || student.email})"`,
      `"Branch: ${student.branch || 'N/A'}"`,
      `"Platform: ${platformToExport.toUpperCase()}"`,
      `"Handle: ${currentPlatData.username || 'Not Linked'}"`,
      `"Admin Solved: ${currentPlatData.solvedCount}/${currentPlatData.totalCount} (${currentPlatData.solvedPercentage}%)"`,
      `"College Rank: #${currentPlatData.rank || 1}"`
    ];

    const csvContent = "\uFEFF" + [summaryHeader.join(','), '', headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${student.rollNumber || student.name}_${platformToExport}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchAdminLabReports = async () => {
    try {
      setLoadingAdminLabReports(true);
      const res = await fetch(`${API_URL}/labs/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAdminLabReports(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch lab reports.');
      }
    } catch (err) {
      setError('Could not connect to lab reports service.');
    } finally {
      setLoadingAdminLabReports(false);
    }
  };

  const downloadAdminLabReportsCSV = () => {
    if (!adminLabReports.length) return;
    const headers = ['Student Name', 'Email', 'Roll Number', 'Branch', 'Section', 'Academic Year', 'Lab Task Title', 'Assigned Faculty', 'Faculty Email', 'Language', 'Score', 'Max Score', 'Logic Match %', 'Plagiarism %', 'Plagiarism Status', 'Matched Peer', 'Status', 'Feedback', 'Submitted Date'];
    const rows = adminLabReports.map(r => [
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

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Student_Lab_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadStudentsRosterCSV = () => {
    if (!students.length) return;
    const headers = ['Name', 'Email', 'Roll Number', 'Academic Year', 'Branch', 'Section', 'Target Role', 'PRI Readiness Score (%)', 'Readiness Status', 'Registered Date'];
    const rows = students.map(s => [
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.email || '').replace(/"/g, '""')}"`,
      `"${(s.rollNumber || '').replace(/"/g, '""')}"`,
      `"${(s.academicYear || s.year || '').replace(/"/g, '""')}"`,
      `"${(s.branch || '').replace(/"/g, '""')}"`,
      `"${(s.section || '').replace(/"/g, '""')}"`,
      `"${(s.targetRole || 'Software Engineer').replace(/"/g, '""')}"`,
      s.readinessScore || 0,
      s.readinessScore >= 80 ? 'Job Ready' : s.readinessScore >= 50 ? 'Medium' : 'Low',
      `"${s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Students_Preparedness_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <Header
        title={
          activeTab === 'job-opportunities' || activeTab === 'jobs' || activeTab === 'job-postings'
            ? 'Job Opportunities & Placement Drives'
            : activeTab === 'faculty-staff'
            ? 'Faculty & Administrator Management'
            : 'Admin Command Console'
        }
      />

      {selectedJobForExpiry && (
        <div className="modal-overlay" onClick={() => setSelectedJobForExpiry(null)}>
          <div className="modal-content medium-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Extend Job Deadline</h3>
                <p className="modal-subtitle">{selectedJobForExpiry.title} at {selectedJobForExpiry.company}</p>
              </div>
              <button className="close-btn" onClick={() => setSelectedJobForExpiry(null)}>×</button>
            </div>
            <form className="admin-job-form" onSubmit={handleUpdateJobExpiry}>
              <div className="form-group">
                <label className="form-label" htmlFor="jobExpiryDate">New application deadline</label>
                <input
                  id="jobExpiryDate"
                  type="date"
                  className="form-control"
                  value={jobExpiryDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setJobExpiryDate(e.target.value)}
                  required
                />
              </div>
              <p className="card-desc">Matching students will receive an in-app notification and email about the new deadline.</p>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedJobForExpiry(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={updatingJobExpiry}>
                  {updatingJobExpiry ? 'Updating...' : 'Update & Notify Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedAcademicProject && (
        <div className="modal-overlay" onClick={() => setSelectedAcademicProject(null)}>
          <div className="modal-content large-modal" style={{ maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }} onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{selectedAcademicProject.title}</h3>
                <p className="modal-subtitle">
                  Submitted by <strong>{selectedAcademicProject.student?.name}</strong> ({selectedAcademicProject.student?.email}) · Academic Year {selectedAcademicProject.academicYear}
                </p>
              </div>
              <button className="close-btn" type="button" onClick={() => setSelectedAcademicProject(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Project Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>🚀 Live Deployment</span>
                  {(selectedAcademicProject.deploymentUrl || selectedAcademicProject.previewUrl) ? (
                    <a
                      href={selectedAcademicProject.deploymentUrl || selectedAcademicProject.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#34d399', fontWeight: 600, fontSize: '13px' }}
                    >
                      {selectedAcademicProject.deploymentUrl || selectedAcademicProject.previewUrl} ↗
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>Not deployed</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>💻 Repository Link</span>
                  {selectedAcademicProject.repositoryUrl ? (
                    <a
                      href={selectedAcademicProject.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#38bdf8', fontWeight: 600, fontSize: '13px' }}
                    >
                      {selectedAcademicProject.repositoryUrl} ↗
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '12px' }}>No repository URL</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>👥 Team Members</span>
                  <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                    {selectedAcademicProject.teamMembers && selectedAcademicProject.teamMembers.length > 0
                      ? selectedAcademicProject.teamMembers.map(m => `${m.name} (${m.role})`).join(', ')
                      : 'Individual Submission'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', display: 'block' }}>⚡ Technologies</span>
                  <span style={{ fontSize: '13px', color: '#e2e8f0' }}>
                    {(selectedAcademicProject.technologies || []).join(', ') || 'General'}
                  </span>
                </div>
              </div>

              {selectedAcademicProject.goals && (
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', borderLeft: '3px solid #818cf8', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px' }}>
                  <strong style={{ fontSize: '12px', color: '#818cf8' }}>🎯 Project Goals:</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#e2e8f0' }}>{selectedAcademicProject.goals}</p>
                </div>
              )}

              <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '14px' }}>
                {selectedAcademicProject.description || 'No additional project description provided.'}
              </p>

              <h4>Project Code Files ({selectedAcademicProject.files?.length || 0})</h4>
              <div style={{ maxHeight: '280px', overflow: 'auto', background: '#090d16', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                {selectedAcademicProject.files?.map(file => (
                  <details key={file.path} style={{ marginBottom: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#38bdf8' }}>📄 {file.path}</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '8px', color: '#e2e8f0', background: '#0f172a', padding: '10px', borderRadius: '6px', overflowX: 'auto' }}>
                      {file.content || '(Empty file)'}
                    </pre>
                  </details>
                ))}
                {(!selectedAcademicProject.files || selectedAcademicProject.files.length === 0) && (
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>No code files found in this project.</p>
                )}
              </div>

              <form className="admin-job-form mt-20" onSubmit={saveProjectReview}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="projectReviewStatus">Review Status</label>
                    <select id="projectReviewStatus" className="form-control" value={projectReview.status} onChange={event => setProjectReview({ ...projectReview, status: event.target.value })}>
                      <option value="under_review">Under Review</option>
                      <option value="changes_requested">Changes Requested</option>
                      <option value="approved">Approved</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="projectReviewGrade">Grade (0 - 100)</label>
                    <input id="projectReviewGrade" className="form-control" type="number" min="0" max="100" placeholder="e.g. 90" value={projectReview.grade} onChange={event => setProjectReview({ ...projectReview, grade: event.target.value })} />
                  </div>
                </div>

                <div className="form-group mt-14">
                  <label className="form-label" htmlFor="projectReviewCodeSuggestions">💻 Code Review Suggestions</label>
                  <textarea
                    id="projectReviewCodeSuggestions"
                    className="form-control"
                    rows="3"
                    value={projectReview.codeSuggestions || ''}
                    onChange={event => setProjectReview({ ...projectReview, codeSuggestions: event.target.value })}
                    placeholder="Suggestions on code quality, architecture, performance, error handling, security..."
                  />
                </div>

                <div className="form-group mt-14">
                  <label className="form-label" htmlFor="projectReviewTechSuggestions">⚡ Technology & Architecture Suggestions</label>
                  <textarea
                    id="projectReviewTechSuggestions"
                    className="form-control"
                    rows="3"
                    value={projectReview.techSuggestions || ''}
                    onChange={event => setProjectReview({ ...projectReview, techSuggestions: event.target.value })}
                    placeholder="Recommend tools, packages, hosting platforms, database scaling, or libraries..."
                  />
                </div>

                <div className="form-group mt-14">
                  <label className="form-label" htmlFor="projectReviewFeedback">General Evaluator Feedback</label>
                  <textarea
                    id="projectReviewFeedback"
                    className="form-control"
                    rows="3"
                    value={projectReview.feedback}
                    onChange={event => setProjectReview({ ...projectReview, feedback: event.target.value })}
                    placeholder="General comments and recommendations for the student..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedAcademicProject(null)}>Cancel</button>
                  <button className="btn btn-primary" type="submit">Save Review & Suggestions</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
        <div
          className="admin-tabs-nav"
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          <button
            className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📊 Candidate Analytics
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'job-opportunities' || activeTab === 'jobs' || activeTab === 'job-postings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('job-opportunities');
              fetchJobs();
            }}
          >
            💼 Job Opportunities
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'interviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('interviews')}
          >
            🎤 Mock Interview Reports
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'question-bank' ? 'active' : ''}`}
            onClick={() => setActiveTab('question-bank')}
          >
            🛡️ Question Bank Reports
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'lab-reports' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('lab-reports');
              fetchAdminLabReports();
            }}
          >
            🔬 Lab Practice Reports
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'core-subjects' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('core-subjects');
              fetchAcademicContent();
              fetchAptitudeTests();
            }}
          >
            💻 Core CSE Subjects & Tests
          </button>
          <button
            className={`admin-tab-btn ${activeTab === 'academic-content' ? 'active' : ''}`}
            onClick={() => setActiveTab('academic-content')}
          >
            📚 Academic Subjects & Projects
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
            className={`admin-tab-btn ${activeTab === 'practice-reports' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('practice-reports');
              fetchPracticeReports(practiceReportPlatform);
            }}
          >
            📈 Practice Reports
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

              {/* List of Students */}
              <div className="glass-card student-roster-card" style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Student Preparedness Roster</h3>
                    <p className="card-desc" style={{ margin: '4px 0 0' }}>Comprehensive log of students ranked by Placement Readiness Index (PRI).</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={downloadStudentsRosterCSV}
                    disabled={!students.length}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    📥 Download Students Report (CSV)
                  </button>
                </div>

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
            </>
          )
        }

        {
          (activeTab === 'job-opportunities' || activeTab === 'jobs' || activeTab === 'job-postings') && (
            <div className="job-opportunities-management-wrapper animate-fade">
              {/* Header / Intro Card */}
              <div className="glass-card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0' }}>💼 Job Opportunities & Placement Drives</h3>
                    <p className="card-desc" style={{ margin: 0 }}>
                      Publish job opportunities that notify matching students, manage application deadlines, and monitor posted listings.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span className="badge" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                      {jobs.length} Active Job Listings
                    </span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={fetchJobs} title="Refresh Jobs">
                      🔄 Refresh Listings
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-split-layout">
                {/* Admin Panels Left Column: Posted Job Listings (Image 2) */}
                <div className="admin-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
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
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => openJobExpiryEditor(job)}
                                      title="Extend application deadline"
                                    >
                                      Extend Deadline
                                    </button>
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

                {/* Admin Panels Right Column: Post Job Opportunities (Image 1) */}
                <div className="admin-right-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
                </div>
              </div>
            </div>
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
          activeTab === 'core-subjects' && (
            <div className="admin-view-content animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Summary Stats Grid */}
              <div className="admin-stats-summary-grid">
                <div className="glass-card admin-summary-card">
                  <h4>Core CSE Subjects</h4>
                  <span className="admin-stat-number">{academicSubjects.length}</span>
                  <p className="admin-stat-sub">Registered across all batches</p>
                </div>
                <div className="glass-card admin-summary-card">
                  <h4>Uploaded Study Notes</h4>
                  <span className="admin-stat-number">
                    {academicSubjects.reduce((acc, s) => acc + (s.notes ? s.notes.length : 0), 0)}
                  </span>
                  <p className="admin-stat-sub">Materials and revision guides</p>
                </div>
                <div className="glass-card admin-summary-card">
                  <h4>Core Subject Tests</h4>
                  <span className="admin-stat-number">
                    {(aptitudeTests || []).filter(t => t.subject || (academicSubjects.some(s => t.title?.toLowerCase().includes(s.code.toLowerCase())))).length}
                  </span>
                  <p className="admin-stat-sub">Assessments & MCQ modules</p>
                </div>
                <div className="glass-card admin-summary-card">
                  <h4>Active Faculty Scopes</h4>
                  <span className="admin-stat-number">
                    {staffMembers.filter(m => m.role === 'faculty' && m.managedScopes?.length > 0).length}
                  </span>
                  <p className="admin-stat-sub">Instructors with assigned subjects</p>
                </div>
              </div>

              {/* Main Subject Directory or Inline Academic Workspace */}
              <div className="glass-card" style={{ padding: '24px' }}>
                {adminSubjectWorkspace ? (
                  <div className="admin-subject-workspace animate-fade">
                    {/* Workspace Header */}
                    <div className="admin-workspace-header">
                      <div className="admin-workspace-title-row">
                        <button
                          type="button"
                          className="btn-back-subjects"
                          onClick={() => setAdminSubjectWorkspace(null)}
                        >
                          ← Back to Subjects Directory
                        </button>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="code-pill">{adminSubjectWorkspace.subject.code}</span>
                            {adminSubjectWorkspace.subject.name}
                          </h3>
                          <div style={{ fontSize: '12.5px', color: '#94a3b8', marginTop: '4px' }}>
                            {adminSubjectWorkspace.subject.academicYear} · {adminSubjectWorkspace.subject.branch || 'All Branches'} {adminSubjectWorkspace.subject.section ? `(Sec ${adminSubjectWorkspace.subject.section})` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="subject-workspace-subtabs">
                        <button
                          type="button"
                          className={`admin-tab-btn ${adminSubjectWorkspace.activeView === 'notes' ? 'active' : ''}`}
                          onClick={() => {
                            setAdminSubjectWorkspace(prev => ({ ...prev, activeView: 'notes' }));
                            openAdminNotesModal(adminSubjectWorkspace.subject);
                          }}
                        >
                          📝 Notes & PDF Materials ({adminNotesList.length})
                        </button>
                        <button
                          type="button"
                          className={`admin-tab-btn ${adminSubjectWorkspace.activeView === 'tests' ? 'active' : ''}`}
                          onClick={() => {
                            setAdminSubjectWorkspace(prev => ({ ...prev, activeView: 'tests' }));
                            openAdminSubjectTestsModal(adminSubjectWorkspace.subject);
                          }}
                        >
                          🧪 Practice Tests ({adminSubjectTestsList.length})
                        </button>
                        <button
                          type="button"
                          className={`admin-tab-btn ${adminSubjectWorkspace.activeView === 'reports' ? 'active' : ''}`}
                          onClick={() => {
                            setAdminSubjectWorkspace(prev => ({ ...prev, activeView: 'reports' }));
                            openAdminSubjectReportsModal(adminSubjectWorkspace.subject);
                          }}
                        >
                          📊 Student Reports ({adminSubjectReportsList.length})
                        </button>
                      </div>
                    </div>

                    {/* 1. STUDY NOTES & PDF MATERIALS VIEW */}
                    {adminSubjectWorkspace.activeView === 'notes' && (
                      <div>
                        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '20px', marginBottom: '24px' }}>
                          <h4 style={{ margin: '0 0 14px 0', color: '#60a5fa', fontSize: '15.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>➕</span> Upload New Study Material, Notes & PDF Documents (Administrator)
                          </h4>
                          <form onSubmit={handleAddAdminNote}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Note / Chapter Title *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="e.g. Unit 2: Process Scheduling & Deadlocks"
                                  value={adminNoteForm.title}
                                  onChange={e => setAdminNoteForm({ ...adminNoteForm, title: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>Short Description / Topics</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="e.g. FCFS, SJF, Round Robin, Banker's Algorithm"
                                  value={adminNoteForm.description}
                                  onChange={e => setAdminNoteForm({ ...adminNoteForm, description: e.target.value })}
                                />
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                                  📄 Attach PDF Document / Lecture Slide (Optional)
                                </label>
                                <div className="pdf-upload-box">
                                  <input
                                    type="file"
                                    id="adminNotePdfInput"
                                    accept=".pdf,application/pdf"
                                    onChange={e => setAdminNotePdfFile(e.target.files[0] || null)}
                                    style={{ display: 'none' }}
                                  />
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => document.getElementById('adminNotePdfInput')?.click()}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                      📁 Choose PDF Document
                                    </button>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                      {adminNotePdfFile ? `Selected: ${adminNotePdfFile.name} (${(adminNotePdfFile.size / (1024 * 1024)).toFixed(2)} MB)` : 'Upload PDF textbook chapters, lecture slides, lab manuals (Max 30MB)'}
                                    </span>
                                    {adminNotePdfFile && (
                                      <button
                                        type="button"
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                                        onClick={() => setAdminNotePdfFile(null)}
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
                                  placeholder="https://drive.google.com/... or https://..."
                                  value={adminNoteForm.fileUrl}
                                  onChange={e => setAdminNoteForm({ ...adminNoteForm, fileUrl: e.target.value })}
                                />
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                                  Detailed Revision Notes / Key Points (Optional Text / Markdown)
                                </label>
                                <textarea
                                  className="form-control"
                                  rows={4}
                                  placeholder="Add comprehensive revision guide, formulas, interview Q&A..."
                                  value={adminNoteForm.content}
                                  onChange={e => setAdminNoteForm({ ...adminNoteForm, content: e.target.value })}
                                />
                              </div>
                            </div>
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={submittingAdminNote || !adminNoteForm.title.trim()}
                              style={{ minWidth: '180px' }}
                            >
                              {submittingAdminNote ? 'Uploading Note & Document...' : '📤 Post Study Material'}
                            </button>
                          </form>
                        </div>

                        {/* Current Notes */}
                        <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', color: '#f8fafc' }}>
                          Available Subject Study Materials ({adminNotesList.length})
                        </h4>
                        {loadingAdminNotes ? (
                          <p className="loading-text">Loading notes...</p>
                        ) : adminNotesList.length > 0 ? (
                          <div>
                            {adminNotesList.map(note => {
                              const isPdf = Boolean(note.fileUrl && (note.fileUrl.endsWith('.pdf') || note.fileType?.includes('pdf') || note.fileName?.endsWith('.pdf')));
                              const pdfHref = note.fileUrl ? (note.fileUrl.startsWith('http') ? note.fileUrl : `${API_URL.replace('/api', '')}${note.fileUrl}`) : '';
                              return (
                                <div key={note._id} className="note-card-item">
                                  <div className="note-card-header">
                                    <div>
                                      <h5 className="note-card-title">{note.title}</h5>
                                      <div className="note-meta-line">
                                        Uploaded by <strong>{note.uploaderName || 'Administrator'}</strong> ({note.uploaderRole || 'admin'}) · {new Date(note.createdAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', padding: '4px 8px', fontSize: '12px' }}
                                      onClick={() => handleDeleteAdminNote(note._id)}
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
                            No study materials uploaded for this subject yet. Upload notes or PDF documents above!
                          </p>
                        )}
                      </div>
                    )}

                    {/* 2. PRACTICE TESTS VIEW */}
                    {adminSubjectWorkspace.activeView === 'tests' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>
                            Subject Practice Tests ({adminSubjectTestsList.length})
                          </h4>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowAdminCreateSubjectTest(!showAdminCreateSubjectTest)}
                          >
                            {showAdminCreateSubjectTest ? 'Cancel' : '➕ Create Practice Test'}
                          </button>
                        </div>

                        {showAdminCreateSubjectTest && (
                          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '18px', marginBottom: '20px' }}>
                            <h4 style={{ margin: '0 0 12px 0', color: '#c084fc', fontSize: '15px' }}>Create New Practice Test for {adminSubjectWorkspace.subject.code}</h4>
                            <form onSubmit={handleCreateAdminSubjectTest}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Test Title *</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={adminSubjectTestForm.title}
                                    onChange={e => setAdminSubjectTestForm({ ...adminSubjectTestForm, title: e.target.value })}
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
                                    value={adminSubjectTestForm.duration}
                                    onChange={e => setAdminSubjectTestForm({ ...adminSubjectTestForm, duration: Number(e.target.value) })}
                                    required
                                  />
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Difficulty</label>
                                  <select
                                    className="form-control"
                                    value={adminSubjectTestForm.difficulty}
                                    onChange={e => setAdminSubjectTestForm({ ...adminSubjectTestForm, difficulty: e.target.value })}
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
                                    value={adminSubjectTestForm.questionLimit}
                                    onChange={e => setAdminSubjectTestForm({ ...adminSubjectTestForm, questionLimit: Number(e.target.value) })}
                                  />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Test Description / Syllabus</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={adminSubjectTestForm.description}
                                    onChange={e => setAdminSubjectTestForm({ ...adminSubjectTestForm, description: e.target.value })}
                                  />
                                </div>
                              </div>
                              <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={creatingAdminSubjectTest || !adminSubjectTestForm.title.trim()}
                              >
                                {creatingAdminSubjectTest ? 'Creating Test...' : 'Save Practice Test'}
                              </button>
                            </form>
                          </div>
                        )}

                        {/* Subject Tests List */}
                        {adminSubjectTestsList.length > 0 ? (
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
                                {adminSubjectTestsList.map(t => (
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
                    {adminSubjectWorkspace.activeView === 'reports' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>
                            Student Performance Summary ({adminSubjectReportsList.length} Attempts)
                          </h4>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ background: '#10b981', borderColor: '#059669', color: '#ffffff' }}
                            onClick={downloadAdminSubjectReportsCSV}
                            disabled={!adminSubjectReportsList.length}
                          >
                            📥 Download Subject Report (CSV)
                          </button>
                        </div>

                        <div className="progress-summary-grid">
                          <div><span>Total Attempts</span><strong>{adminSubjectReportsList.length}</strong></div>
                          <div><span>Unique Students</span><strong>{new Set(adminSubjectReportsList.map(r => r.student?.id || r.student?.email)).size}</strong></div>
                          <div><span>Passed (&gt;=50%)</span><strong style={{ color: '#10b981' }}>{adminSubjectReportsList.filter(r => r.passed).length}</strong></div>
                          <div><span>Needs Practice</span><strong style={{ color: '#ef4444' }}>{adminSubjectReportsList.filter(r => !r.passed).length}</strong></div>
                          <div>
                            <span>Average Score</span>
                            <strong>{adminSubjectReportsList.length ? Math.round(adminSubjectReportsList.reduce((acc, r) => acc + (r.percentage || 0), 0) / adminSubjectReportsList.length) : 0}%</strong>
                          </div>
                        </div>

                        {loadingAdminSubjectReports ? (
                          <p className="loading-text">Loading student test records...</p>
                        ) : adminSubjectReportsList.length > 0 ? (
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
                                {adminSubjectReportsList.map(report => (
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
                            <p style={{ margin: 0, fontSize: '15px' }}>No students have attempted practice tests for this subject yet.</p>
                            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#64748b' }}>When students in this academic year take tests, their performance will appear here.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>💻 Core Computer Science Curriculum Subjects</h3>
                        <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                          Oversee all subjects, add or review study notes/materials, create practice tests, and download student exam reports.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const headers = ['Subject Name', 'Subject Code', 'Academic Year', 'Branch', 'Section', 'Study Notes Count', 'Description'];
                          const rows = academicSubjects.map(s => [
                            s.name, s.code, s.academicYear, s.branch || 'All', s.section || 'All', s.notes?.length || 0, s.description || ''
                          ]);
                          downloadAcademicCsv('Core_CSE_Subjects_Master', headers, rows);
                        }}
                        disabled={!academicSubjects.length}
                      >
                        📥 Export Subjects Master (CSV)
                      </button>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by subject name or code..."
                        value={coreSubjectSearch}
                        onChange={e => setCoreSubjectSearch(e.target.value)}
                        style={{ flex: '1', minWidth: '220px' }}
                      />
                      <select
                        className="form-control"
                        value={coreSubjectYearFilter}
                        onChange={e => setCoreSubjectYearFilter(e.target.value)}
                        style={{ minWidth: '160px' }}
                      >
                        <option value="">All Academic Years</option>
                        {[...new Set(academicSubjects.map(s => s.academicYear).filter(Boolean))].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <select
                        className="form-control"
                        value={coreSubjectBranchFilter}
                        onChange={e => setCoreSubjectBranchFilter(e.target.value)}
                        style={{ minWidth: '160px' }}
                      >
                        <option value="">All Branches</option>
                        {[...new Set(academicSubjects.map(s => s.branch).filter(Boolean))].map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* Subjects Table */}
                    <div className="students-table-scroll">
                      <table className="students-table">
                        <thead>
                          <tr>
                            <th>Code</th>
                            <th>Subject Name</th>
                            <th>Academic Year</th>
                            <th>Branch & Section</th>
                            <th>Study Notes</th>
                            <th>Practice Tests</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {academicSubjects
                            .filter(s => {
                              const matchesSearch = !coreSubjectSearch ||
                                s.name.toLowerCase().includes(coreSubjectSearch.toLowerCase()) ||
                                s.code.toLowerCase().includes(coreSubjectSearch.toLowerCase());
                              const matchesYear = !coreSubjectYearFilter || s.academicYear === coreSubjectYearFilter;
                              const matchesBranch = !coreSubjectBranchFilter || (s.branch && s.branch.toLowerCase() === coreSubjectBranchFilter.toLowerCase());
                              return matchesSearch && matchesYear && matchesBranch;
                            })
                            .map(subject => {
                              const matchedTestsCount = (aptitudeTests || []).filter(t => t.subject === subject._id || t.subject?._id === subject._id || (t.title && t.title.toLowerCase().includes(subject.code.toLowerCase()))).length;
                              return (
                                <tr key={subject._id}>
                                  <td><span className="code-pill">{subject.code}</span></td>
                                  <td>
                                    <strong>{subject.name}</strong>
                                    {subject.description && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{subject.description}</div>}
                                  </td>
                                  <td>{subject.academicYear}</td>
                                  <td>{subject.branch || 'All'} {subject.section ? `· Sec ${subject.section}` : ''}</td>
                                  <td>
                                    <span style={{ fontSize: '12px', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                                      📄 {subject.notes?.length || 0} Notes
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: '12px', color: '#c084fc', background: 'rgba(168, 85, 247, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
                                      🧪 {matchedTestsCount} Tests
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ color: '#60a5fa', borderColor: 'rgba(59, 130, 246, 0.4)' }}
                                        onClick={() => openAdminNotesModal(subject)}
                                        title="View and upload study notes for this subject"
                                      >
                                        📝 Notes ({subject.notes?.length || 0})
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.4)' }}
                                        onClick={() => openAdminSubjectTestsModal(subject)}
                                        title="Create practice tests and manage questions"
                                      >
                                        🧪 Tests ({matchedTestsCount})
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                                        onClick={() => openAdminSubjectReportsModal(subject)}
                                        title="View student attempts and download CSV report"
                                      >
                                        📥 Reports
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          {academicSubjects.length === 0 && (
                            <tr>
                              <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                No Core CSE subjects registered yet. Switch to "Academic Subjects & Projects" tab to register new curriculum subjects.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        }

        {
          activeTab === 'academic-content' && (
            <div className="admin-split-layout animate-fade">
              <div className="admin-left-column" style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
                <div className="glass-card">
                  <div className="manager-header">
                    <div>
                      <h3>Academic Subjects</h3>
                      <p className="card-desc">Create subject preparation areas for a specific academic year.</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={downloadAcademicSubjects} disabled={!academicSubjects.length}>Download CSV</button>
                  </div>
                  <form className="admin-job-form mt-20" onSubmit={createAcademicSubject}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="academicSubjectName">Subject Name</label>
                      <input id="academicSubjectName" className="form-control" value={subjectForm.name} onChange={event => setSubjectForm({ ...subjectForm, name: event.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="academicSubjectCode">Subject Code</label>
                      <input id="academicSubjectCode" className="form-control" value={subjectForm.code} onChange={event => setSubjectForm({ ...subjectForm, code: event.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="academicSubjectYear">Academic Year</label>
                      <input id="academicSubjectYear" className="form-control" placeholder="e.g. 2026 or 3rd Year" value={subjectForm.academicYear} onChange={event => setSubjectForm({ ...subjectForm, academicYear: event.target.value })} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="academicSubjectBranch">Branch</label>
                      <input id="academicSubjectBranch" className="form-control" placeholder="Branch, e.g. CSE (or leave blank for all branches)" value={subjectForm.branch} onChange={event => setSubjectForm({ ...subjectForm, branch: event.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="academicSubjectDescription">Description</label>
                      <textarea id="academicSubjectDescription" className="form-control" value={subjectForm.description} onChange={event => setSubjectForm({ ...subjectForm, description: event.target.value })} />
                    </div>
                    <button className="btn btn-primary" type="submit">Add Subject</button>
                  </form>
                  <div className="table-responsive-wrapper mt-20">
                    <table className="student-roster-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Code</th>
                          <th>Academic Year</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {academicSubjects.map(subject => (
                          <tr key={subject._id}>
                            <td><strong>{subject.name}</strong></td>
                            <td><span className="code-pill">{subject.code}</span></td>
                            <td>{subject.academicYear}{subject.branch ? ` (${subject.branch})` : ''}</td>
                            <td><span className="status-badge-active">{subject.isActive ? 'Active' : 'Inactive'}</span></td>
                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                type="button"
                                onClick={() => handleDeleteSubject(subject._id, subject.name)}
                                title="Delete Subject"
                              >
                                🗑 Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                        {!academicSubjects.length && <tr><td colSpan="5">No subjects found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="admin-right-column" style={{ minWidth: 0 }}>
                <div className="glass-card">
                  <div className="manager-header">
                    <div>
                      <h3>Student Projects</h3>
                      <p className="card-desc">Review complete project files, status, feedback, and grades across all academic years.</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" type="button" onClick={downloadAcademicProjects} disabled={!academicProjects.length}>Download CSV</button>
                  </div>
                  {loadingAcademicContent ? (
                    <div className="dashboard-loading-container"><div className="spinner-loader"></div><p>Loading academic content...</p></div>
                  ) : (
                    <div className="table-responsive-wrapper mt-20">
                      <table className="student-roster-table">
                        <thead>
                          <tr>
                            <th>Student & Teammates</th>
                            <th>Project Title & Links</th>
                            <th>Technologies</th>
                            <th>Goals</th>
                            <th>Status</th>
                            <th>Grade</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {academicProjects.map(project => {
                            const liveUrl = project.deploymentUrl || project.previewUrl;
                            const hasTeam = project.teamMembers && project.teamMembers.length > 0;
                            return (
                              <tr key={project._id}>
                                <td>
                                  <strong>{project.student?.name || 'Student'}</strong>
                                  <div className="text-secondary" style={{ fontSize: '11px' }}>
                                    {project.student?.email || ''}
                                    {project.student?.rollNumber ? ` · ${project.student.rollNumber}` : ''}
                                  </div>
                                  {hasTeam && (
                                    <div style={{ fontSize: '11px', color: '#a5b4fc', marginTop: '2px' }}>
                                      👥 +{project.teamMembers.length} Teammates: {project.teamMembers.map(m => m.name).join(', ')}
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <strong>{project.title}</strong>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                    {liveUrl && (
                                      <a
                                        href={liveUrl.startsWith('http') ? liveUrl : `https://${liveUrl}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#34d399', fontSize: '11px', fontWeight: 600 }}
                                      >
                                        🚀 Live Demo ↗
                                      </a>
                                    )}
                                    {project.repositoryUrl && (
                                      <a
                                        href={project.repositoryUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}
                                      >
                                        💻 GitHub ↗
                                      </a>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '180px' }}>
                                    {project.technologies && project.technologies.length > 0 ? (
                                      project.technologies.map(t => (
                                        <span key={t} style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc', fontSize: '10px', padding: '1px 5px', borderRadius: '4px' }}>
                                          {t}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-secondary" style={{ fontSize: '11px' }}>General</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ maxWidth: '160px', fontSize: '12px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={project.goals || 'No goals specified'}>
                                    {project.goals || '-'}
                                  </div>
                                </td>
                                <td><span className={`status-pill ${project.status}`}>{project.status.replace('_', ' ')}</span></td>
                                <td>{project.grade !== null && project.grade !== undefined ? <strong>{project.grade}/100</strong> : <span style={{ color: '#94a3b8' }}>Not graded</span>}</td>
                                <td><button className="btn btn-primary btn-sm" type="button" onClick={() => openProjectReview(project)}>Inspect & Review</button></td>
                              </tr>
                            );
                          })}
                          {!academicProjects.length && <tr><td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>No student projects found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }

        {
          activeTab === 'question-bank' && (
            <div className="glass-card animate-fade">
              <div className="manager-header">
                <div>
                  <h3>Question Bank Submission Reports</h3>
                  <p className="card-desc">Review submissions and plagiarism similarity against other users' submissions for the same question.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={downloadQuestionBankReport}
                  disabled={questionBankReports.length === 0}
                  title="Download Question Bank report as CSV"
                >
                  Download CSV
                </button>
              </div>

              {loadingQuestionBankReports ? (
                <div className="dashboard-loading-container">
                  <div className="spinner-loader"></div>
                  <p>Loading Question Bank reports...</p>
                </div>
              ) : questionBankReports.length > 0 ? (
                <div className="table-responsive-wrapper mt-20">
                  <table className="student-roster-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Question</th>
                        <th>Language</th>
                        <th>Status</th>
                        <th>Plagiarism</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questionBankReports.map((report) => {
                        const percentage = report.plagiarismPercentage || 0;
                        const risk = percentage > 60
                          ? 'High Plagiarism'
                          : percentage > 30
                            ? 'Moderate Similarity'
                            : percentage > 10
                              ? 'Low Similarity'
                              : 'Original';

                        return (
                          <tr key={report._id}>
                            <td>
                              <strong>{report.user?.name || 'Student'}</strong>
                              <div className="text-secondary">{report.user?.email || 'No email'}</div>
                            </td>
                            <td>{report.question?.title || 'Question unavailable'}</td>
                            <td>{report.language?.toUpperCase() || 'N/A'}</td>
                            <td>{report.status}</td>
                            <td>
                              <strong className="text-glow">{percentage}%</strong>
                              <div className="text-secondary">{risk}</div>
                            </td>
                            <td>{report.createdAt ? new Date(report.createdAt).toLocaleString() : 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-history-placeholder glass-card">
                  <p>No Question Bank submissions recorded yet.</p>
                </div>
              )}
            </div>
          )
        }

        {
          activeTab === 'lab-reports' && (
            <div className="glass-card animate-fade">
              <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3>🔬 Lab Practice Reports & Student Submissions</h3>
                  <p className="card-desc">Audit laboratory experiments, student submissions, assigned faculty mentors, scores, and download reports.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={fetchAdminLabReports}
                    title="Refresh lab records"
                  >
                    🔄 Refresh
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={downloadAdminLabReportsCSV}
                    disabled={adminLabReports.length === 0}
                    title="Download Student Lab reports as CSV"
                  >
                    📥 Download Student Lab Reports (CSV)
                  </button>
                </div>
              </div>

              {loadingAdminLabReports ? (
                <div className="dashboard-loading-container">
                  <div className="spinner-loader"></div>
                  <p>Loading lab reports and submissions...</p>
                </div>
              ) : adminLabReports.length > 0 ? (
                <div className="table-responsive-wrapper mt-20">
                  <table className="student-roster-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Scope (Year / Branch / Sec)</th>
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
                      {adminLabReports.map((report) => (
                        <tr key={report._id}>
                          <td>
                            <strong>{report.student?.name || 'Student'}</strong>
                            <div className="text-secondary" style={{ fontSize: '12px' }}>{report.student?.email || 'No email'}</div>
                            {report.student?.rollNumber && (
                              <div style={{ fontSize: '11px', color: '#818cf8' }}>Roll: {report.student.rollNumber}</div>
                            )}
                          </td>
                          <td>
                            {report.student?.academicYear || report.student?.year || 'Year N/A'}
                            {report.student?.branch ? ` · ${report.student.branch}` : ''}
                            {report.student?.section ? ` (Sec ${report.student.section})` : ''}
                          </td>
                          <td>
                            <strong>{report.task?.title || 'Lab Task'}</strong>
                          </td>
                          <td>
                            <strong>{report.task?.createdBy?.name || report.reviewedBy?.name || 'Faculty'}</strong>
                            <div className="text-secondary" style={{ fontSize: '11px' }}>
                              {report.task?.createdBy?.email || report.reviewedBy?.email || ''}
                            </div>
                          </td>
                          <td>
                            <span className="status-pill submitted" style={{ textTransform: 'uppercase', fontSize: '11px' }}>
                              {report.language || report.task?.solutionLanguage || 'cpp'}
                            </span>
                          </td>
                          <td>
                            <strong className="text-glow" style={{ color: report.score !== undefined && report.score !== null ? '#10b981' : '#f59e0b' }}>
                              {report.score !== undefined && report.score !== null ? `${report.score}/${report.task?.maxScore || 100}` : 'Pending'}
                            </strong>
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
                            <span className={`pri-level-badge scale-down`} data-level={report.status === 'reviewed' ? 'high' : 'medium'}>
                              {report.status || 'Submitted'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px' }}>
                            {report.updatedAt ? new Date(report.updatedAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 10px', fontSize: '11.5px' }}
                              onClick={() => setSelectedAdminLabReviewAttempt(report)}
                            >
                              👁️ Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-history-placeholder glass-card" style={{ textAlign: 'center', padding: '36px' }}>
                  <p>No student lab practice submissions found.</p>
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

        {
          activeTab === 'practice-reports' && (
            <div className="glass-card practice-reports-manager-card animate-fade">
              {/* Header */}
              <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3>📈 Practice Platform Reports & Verification</h3>
                  <p className="card-desc">
                    Audit student progress on admin-added problems across LeetCode, Codeforces, CodeChef, and HackerRank. View college rankings, exact solved counts, and inspect student submissions.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleDownloadPracticeReport()}
                  >
                    📥 Export All Candidates CSV
                  </button>
                </div>
              </div>

              {/* Platform Selector Tabs */}
              <div className="platform-sub-nav" style={{ display: 'flex', gap: '10px', margin: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '15px' }}>
                {[
                  { id: 'leetcode', name: 'LeetCode', color: '#FFA116' },
                  { id: 'codeforces', name: 'Codeforces', color: '#FF4B4B' },
                  { id: 'codechef', name: 'CodeChef', color: '#d38b27' },
                  { id: 'hackerrank', name: 'HackerRank', color: '#2ec866' }
                ].map(plat => (
                  <button
                    key={plat.id}
                    className={`btn ${practiceReportPlatform === plat.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ 
                      borderColor: practiceReportPlatform === plat.id ? plat.color : undefined,
                      backgroundColor: practiceReportPlatform === plat.id ? plat.color : undefined,
                      color: practiceReportPlatform === plat.id ? '#fff' : undefined
                    }}
                    onClick={() => {
                      setPracticeReportPlatform(plat.id);
                      fetchPracticeReports(plat.id);
                    }}
                  >
                    {plat.name} Reports
                  </button>
                ))}
              </div>

              {/* Summary Stats Overview Grid */}
              <div className="admin-stats-summary-grid" style={{ marginBottom: '25px' }}>
                <div className="glass-card stat-summary-box">
                  <span className="stat-label">Total Candidates</span>
                  <span className="stat-num">{practiceReportsData.length}</span>
                  <span className="stat-sub">Enrolled students</span>
                </div>
                <div className="glass-card stat-summary-box">
                  <span className="stat-label">Linked Accounts</span>
                  <span className="stat-num" style={{ color: '#2ec866' }}>
                    {practiceReportsData.filter(s => s.username).length}
                  </span>
                  <span className="stat-sub">
                    {practiceReportsData.length ? Math.round((practiceReportsData.filter(s => s.username).length / practiceReportsData.length) * 100) : 0}% Linkage Rate
                  </span>
                </div>
                <div className="glass-card stat-summary-box">
                  <span className="stat-label">Active Solvers</span>
                  <span className="stat-num" style={{ color: '#60a5fa' }}>
                    {practiceReportsData.filter(s => s.solvedPracticeCount > 0).length}
                  </span>
                  <span className="stat-sub">Solved ≥ 1 admin question</span>
                </div>
                <div className="glass-card stat-summary-box">
                  <span className="stat-label">Top Performer</span>
                  <span className="stat-num" style={{ fontSize: '1.2rem', color: '#FFA116' }}>
                    {practiceReportsData[0]?.name ? practiceReportsData[0].name.split(' ')[0] : 'None'}
                  </span>
                  <span className="stat-sub">
                    {practiceReportsData[0]?.solvedPracticeCount || 0} Admin Solved
                  </span>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="practice-filters-bar" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by student name, roll no, or handle..."
                    value={practiceReportsSearch}
                    onChange={(e) => setPracticeReportsSearch(e.target.value)}
                  />
                </div>
                <div style={{ width: '160px' }}>
                  <select
                    className="form-control"
                    value={practiceReportsBranchFilter}
                    onChange={(e) => setPracticeReportsBranchFilter(e.target.value)}
                  >
                    <option value="all">All Branches</option>
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                  </select>
                </div>
                <div style={{ width: '160px' }}>
                  <select
                    className="form-control"
                    value={practiceReportsStatusFilter}
                    onChange={(e) => setPracticeReportsStatusFilter(e.target.value)}
                  >
                    <option value="all">All Solved Status</option>
                    <option value="solved">Solved (≥ 1)</option>
                    <option value="unsolved">Unsolved (0)</option>
                  </select>
                </div>
              </div>

              {/* Main Roster Table */}
              {loadingPracticeReports ? (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <div className="spinner-loader"></div>
                  <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Compiling verified practice reports from {practiceReportPlatform}...</p>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="student-roster-table">
                    <thead>
                      <tr>
                        <th style={{ width: '70px' }}>Rank</th>
                        <th>Student Details</th>
                        <th style={{ width: '100px' }}>Branch</th>
                        <th style={{ width: '150px' }}>Platform Handle</th>
                        <th style={{ width: '180px' }}>Admin Questions Solved</th>
                        <th>Solved Problem Titles</th>
                        <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = practiceReportsData.filter(item => {
                          const query = practiceReportsSearch.toLowerCase();
                          const matchesQuery = !query || 
                            (item.name || '').toLowerCase().includes(query) ||
                            (item.rollNumber || '').toLowerCase().includes(query) ||
                            (item.email || '').toLowerCase().includes(query) ||
                            (item.username || '').toLowerCase().includes(query);

                          const matchesBranch = practiceReportsBranchFilter === 'all' || 
                            (item.branch || '').toUpperCase() === practiceReportsBranchFilter.toUpperCase();

                          const matchesStatus = practiceReportsStatusFilter === 'all' ||
                            (practiceReportsStatusFilter === 'solved' && item.solvedPracticeCount > 0) ||
                            (practiceReportsStatusFilter === 'unsolved' && item.solvedPracticeCount === 0);

                          return matchesQuery && matchesBranch && matchesStatus;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan="7" className="table-empty-msg">
                                No student practice records match your filter criteria.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((item, idx) => {
                          const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : null;
                          const studentId = item.studentId || item._id || item.id;
                          const solvedPct = item.solvedPercentage ?? item.percentage ?? 0;
                          return (
                            <tr key={studentId || idx}>
                              <td>
                                <span style={{ fontWeight: '800', color: medal ? '#FFA116' : 'var(--text-primary)', fontSize: '1rem' }}>
                                  {medal ? `${medal} #${item.rank}` : `#${item.rank}`}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {item.rollNumber ? `Roll: ${item.rollNumber}` : item.email}
                                </div>
                              </td>
                              <td>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                                  {item.branch || 'CSE'}
                                </span>
                              </td>
                              <td>
                                {item.username ? (
                                  <span className="text-glow" style={{ fontSize: '13px', fontWeight: '500' }}>
                                    @{item.username}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    Unlinked
                                  </span>
                                )}
                              </td>
                              <td>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                                  <span style={{ fontWeight: '700', color: item.solvedPracticeCount > 0 ? '#2ec866' : 'var(--text-muted)' }}>
                                    {item.solvedPracticeCount} / {item.totalPracticeCount} Solved
                                  </span>
                                  <span style={{ color: 'var(--text-secondary)' }}>{solvedPct}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div 
                                    style={{ 
                                      width: `${solvedPct}%`, 
                                      height: '100%', 
                                      background: solvedPct >= 60 ? '#2ec866' : solvedPct > 0 ? '#FFA116' : 'transparent',
                                      borderRadius: '3px'
                                    }}
                                  ></div>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '350px' }}>
                                  {item.solvedProblemTitles && item.solvedProblemTitles.length > 0 ? (
                                    <>
                                      {item.solvedProblemTitles.slice(0, 3).map((title, tIdx) => (
                                        <span 
                                          key={tIdx}
                                          style={{ 
                                            background: 'rgba(46, 200, 102, 0.12)', 
                                            color: '#2ec866', 
                                            border: '1px solid rgba(46, 200, 102, 0.25)', 
                                            padding: '2px 8px', 
                                            borderRadius: '4px', 
                                            fontSize: '11px', 
                                            maxWidth: '140px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                          }}
                                          title={title}
                                        >
                                          ✓ {title}
                                        </span>
                                      ))}
                                      {item.solvedProblemTitles.length > 3 && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                          +{item.solvedProblemTitles.length - 3} more
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>None solved yet</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleOpenStudentPracticeReport(studentId)}
                                  title="View full questions solved checklist and code"
                                >
                                  🔍 View Report
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
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

        {activeTab === 'faculty-staff' && (
          <div className="faculty-staff-management-wrapper animate-fade">
            {/* Header / Intro Card */}
            <div className="glass-card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px 0' }}>👨‍🏫 Faculty & Administrator Management</h3>
                  <p className="card-desc">
                    View all faculty and administrator accounts created by the Main Admin, monitor their assigned academic scopes, assign multiple preparation scopes, or remove individual scopes.
                  </p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={fetchStaff} title="Refresh Directory">
                  🔄 Refresh Directory ({staffMembers.length})
                </button>
              </div>
            </div>

            {/* Main Showcase Table */}
            <div className="glass-card" style={{ marginBottom: '24px' }}>
              <div className="manager-header">
                <div>
                  <h4 style={{ margin: 0 }}>📋 Registered Staff Directory & Assigned Academic Scopes</h4>
                  <p className="text-secondary small mt-5">
                    Click the red ✕ button on any scope chip to remove that academic scope from the faculty/administrator.
                  </p>
                </div>
              </div>

              <div className="table-responsive-wrapper mt-15">
                {loadingStaff ? <p className="text-secondary">Loading staff records...</p> : (
                  <table className="student-roster-table">
                    <thead>
                      <tr>
                        <th>Staff Member</th>
                        <th>Login Email</th>
                        <th>System Role</th>
                        <th>Assigned Academic Scopes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffMembers.map(staff => (
                        <tr key={staff._id}>
                          <td><strong>{staff.name}</strong></td>
                          <td>{staff.email}</td>
                          <td>
                            <span style={{
                              textTransform: 'capitalize',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              background: staff.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: staff.role === 'admin' ? '#818cf8' : '#34d399',
                              border: `1px solid ${staff.role === 'admin' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                            }}>
                              {staff.role === 'admin' ? 'Administrator' : 'Faculty'}
                            </span>
                          </td>
                          <td>
                            {staff.managedScopes && staff.managedScopes.length > 0 ? (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {staff.managedScopes.map((s, idx) => (
                                  <span
                                    key={s._id || idx}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      background: 'rgba(99, 102, 241, 0.15)',
                                      color: '#c7d2fe',
                                      border: '1px solid rgba(99, 102, 241, 0.35)',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: '500'
                                    }}
                                  >
                                    <span>{s.academicYear}{s.branch ? ` · ${s.branch}` : ''}{s.section ? ` · Sec ${s.section}` : ''}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteStaffScope(staff._id, s._id || idx)}
                                      title="Remove this academic scope from staff member"
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#f87171',
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        fontSize: '13px',
                                        fontWeight: 'bold',
                                        lineHeight: 1
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>General / All Scopes</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                type="button"
                                onClick={() => resetStaffPassword(staff)}
                                title="Send secure password setup link"
                              >
                                🔑 Password Link
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                type="button"
                                onClick={() => {
                                  setScopeStaffId(staff._id);
                                  const formEl = document.getElementById('assignScopeFormCard');
                                  if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
                                }}
                                title="Assign new academic scope to this staff"
                              >
                                ➕ Assign Scope
                              </button>
                              {staff.isSuperAdmin || staff.email?.toLowerCase() === 'vaddeajaykumar2004@gmail.com' ? (
                                <span className="protected-super-admin-badge" title="Super Admin account cannot be removed or deleted">
                                  🛡️ Protected Super Admin
                                </span>
                              ) : (
                                <button
                                  className="btn btn-danger btn-sm"
                                  type="button"
                                  onClick={() => deleteStaff(staff)}
                                  title="Remove staff account"
                                >
                                  🗑 Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!staffMembers.length && (
                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No faculty or administrator accounts registered.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Split Form: Assign Scope & Create Staff */}
            <div className="admin-split-layout" id="assignScopeFormCard">
              {/* Assign Academic Scope to Staff */}
              <div className="glass-card">
                <h4>🎯 Assign Academic Scope to Staff</h4>
                <p className="card-desc">
                  Assign different academic years, branches, sections, or subjects to any faculty member or administrator. Multiple distinct scopes can be assigned to the same staff member.
                </p>

                <form className="admin-job-form mt-20" onSubmit={saveStaffScope}>
                  <div className="form-group">
                    <label className="form-label">Select Staff Member *</label>
                    <select
                      className="form-control"
                      value={scopeStaffId}
                      onChange={event => setScopeStaffId(event.target.value)}
                      onFocus={() => { if (!staffMembers.length) fetchStaff(); }}
                      required
                    >
                      <option value="">
                        {loadingStaff ? 'Loading staff records...' : (staffMembers.length === 0 ? 'No staff found — click Refresh' : `Select Faculty or Administrator (${staffMembers.length} available)`)}
                      </option>
                      {staffMembers.map(member => (
                        <option key={member._id} value={member._id}>
                          {member.name} — {member.email} ({member.role === 'admin' ? 'Administrator' : 'Faculty'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {scopeStaffId && (() => {
                    const selected = staffMembers.find(m => m._id === scopeStaffId);
                    if (!selected) return null;
                    return (
                      <div style={{ padding: '10px 14px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '6px', fontSize: '12px', color: '#c7d2fe', marginBottom: '12px' }}>
                        <strong>{selected.name}</strong> ({selected.email}) · Role: <strong>{selected.role === 'admin' ? 'Administrator' : 'Faculty'}</strong>
                        <div style={{ marginTop: '5px' }}>
                          Current Scopes ({selected.managedScopes?.length || 0}): {selected.managedScopes?.length > 0 ? selected.managedScopes.map((s, i) => `${s.academicYear}${s.branch ? ` (${s.branch})` : ''}${s.section ? ` Sec ${s.section}` : ''}`).join(', ') : 'None (General Access)'}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="form-group">
                    <label className="form-label">Academic Year *</label>
                    <input className="form-control" placeholder="e.g. 4th Year or 3rd Year" value={scopeForm.academicYear} onChange={event => setScopeForm({ ...scopeForm, academicYear: event.target.value })} required />
                  </div>

                  <div className="form-grid-3-col">
                    <div className="form-group">
                      <label className="form-label">Branch (Optional)</label>
                      <input className="form-control" placeholder="e.g. CSE" value={scopeForm.branch} onChange={event => setScopeForm({ ...scopeForm, branch: event.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Section (Optional)</label>
                      <input className="form-control" placeholder="e.g. C" value={scopeForm.section} onChange={event => setScopeForm({ ...scopeForm, section: event.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subject (Optional)</label>
                      <select className="form-control" value={scopeForm.subject} onChange={event => setScopeForm({ ...scopeForm, subject: event.target.value })}>
                        <option value="">All Subjects</option>
                        {academicSubjects.map(subject => <option key={subject._id} value={subject._id}>{subject.code} - {subject.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <button className="btn btn-primary" type="submit" disabled={savingScope}>
                    {savingScope ? 'Assigning...' : '+ Assign Academic Scope'}
                  </button>
                </form>
              </div>

              {/* Create Staff Account Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card">
                  <h4>➕ Create Faculty Account</h4>
                  <p className="card-desc">Create a faculty account and email them a secure password setup link.</p>

                  <form className="admin-job-form mt-15" onSubmit={handleCreateFaculty}>
                    <div className="form-group">
                      <label className="form-label">Faculty Full Name *</label>
                      <input className="form-control" placeholder="e.g. Dr. Ramesh Kumar" value={facultyName} onChange={event => setFacultyName(event.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Login Email *</label>
                      <input type="email" className="form-control" placeholder="faculty@university.edu" value={facultyEmail} onChange={event => setFacultyEmail(event.target.value)} required />
                    </div>
                    <div className="form-grid-3-col">
                      <input className="form-control" placeholder="Year, e.g. 4th Year" value={facultyAcademicYear} onChange={event => setFacultyAcademicYear(event.target.value)} required />
                      <input className="form-control" placeholder="Branch, e.g. CSE" value={facultyBranch} onChange={event => setFacultyBranch(event.target.value)} required />
                      <input className="form-control" placeholder="Section, e.g. C" value={facultySection} onChange={event => setFacultySection(event.target.value)} required />
                    </div>
                    <button className="btn btn-accent" type="submit" disabled={submittingFaculty}>
                      {submittingFaculty ? 'Creating...' : 'Create Faculty & Email Password Link'}
                    </button>
                  </form>
                </div>

                {user?.email?.toLowerCase() === 'vaddeajaykumar2004@gmail.com' && (
                  <div className="glass-card">
                    <h4>➕ Create Administrator Account</h4>
                    <p className="card-desc">Add an administrator to monitor student progress and academic scopes.</p>

                    <form className="admin-job-form mt-15" onSubmit={handleCreateAdmin}>
                      <div className="form-group">
                        <label className="form-label">Administrator Name *</label>
                        <input className="form-control" placeholder="e.g. Admin Jane" value={adminName} onChange={event => setAdminName(event.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Admin Email *</label>
                        <input type="email" className="form-control" placeholder="admin@university.edu" value={adminEmail} onChange={event => setAdminEmail(event.target.value)} required />
                      </div>
                      <div className="form-grid-3-col">
                        <input className="form-control" placeholder="Year, e.g. 4th Year" value={adminAcademicYear} onChange={event => setAdminAcademicYear(event.target.value)} required />
                        <input className="form-control" placeholder="Branch, e.g. CSE" value={adminBranch} onChange={event => setAdminBranch(event.target.value)} required />
                        <input className="form-control" placeholder="Section, e.g. C" value={adminSection} onChange={event => setAdminSection(event.target.value)} required />
                      </div>
                      <button className="btn btn-secondary" type="submit" disabled={submittingAdmin}>
                        {submittingAdmin ? 'Creating...' : 'Create Admin & Email Password Link'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="admin-settings-wrapper animate-fade">
            <div className="admin-settings-grid">
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

      {/* ADMIN LAB REPORT & PLAGIARISM REVIEW MODAL */}
      {selectedAdminLabReviewAttempt && (
        <div className="progress-modal-overlay" onClick={() => setSelectedAdminLabReviewAttempt(null)}>
          <div className="progress-modal" style={{ width: 'min(960px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="progress-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>🔬 Lab Submission Review & Plagiarism Audit</h2>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                  {selectedAdminLabReviewAttempt.student?.name} ({selectedAdminLabReviewAttempt.student?.rollNumber || 'N/A'}) · {selectedAdminLabReviewAttempt.task?.title}
                </p>
              </div>
              <button className="progress-close" type="button" onClick={() => setSelectedAdminLabReviewAttempt(null)}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '20px 0 10px' }}>
              {/* Plagiarism Alert Banner */}
              {selectedAdminLabReviewAttempt.plagiarismPercentage > 40 ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '24px' }}>🚨</span>
                  <div>
                    <strong style={{ color: '#f87171' }}>High Plagiarism Detected: {selectedAdminLabReviewAttempt.plagiarismPercentage}% Similarity</strong>
                    <p style={{ margin: '4px 0 0', color: '#e2e8f0', fontSize: '13px' }}>
                      This submission matched significantly with peer student <strong>{selectedAdminLabReviewAttempt.plagiarizedWith?.studentName || 'a registered student'}</strong>.
                    </p>
                  </div>
                </div>
              ) : selectedAdminLabReviewAttempt.plagiarismPercentage > 15 ? (
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: '8px', padding: '12px 16px' }}>
                  <strong style={{ color: '#fbbf24' }}>⚠️ Moderate Structural Similarity: {selectedAdminLabReviewAttempt.plagiarismPercentage}%</strong>
                  <span style={{ fontSize: '13px', color: '#cbd5e1', marginLeft: '8px' }}>Matched logic with peer {selectedAdminLabReviewAttempt.plagiarizedWith?.studentName || ''}.</span>
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px 16px', color: '#34d399', fontSize: '13px' }}>
                  ✅ <strong>Verified Original Submission</strong> ({selectedAdminLabReviewAttempt.plagiarismPercentage || 0}% peer similarity).
                </div>
              )}

              {/* Evaluation Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'rgba(255, 255, 255, 0.03)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Evaluation Score:</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>{selectedAdminLabReviewAttempt.score ?? 0} / {selectedAdminLabReviewAttempt.task?.maxScore || 100}</div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Logic Match %:</span>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>{selectedAdminLabReviewAttempt.evaluationDetails?.logicMatchPercentage ?? 100}%</div>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Student Language:</span>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#e2e8f0', textTransform: 'uppercase' }}>{selectedAdminLabReviewAttempt.language || 'cpp'}</div>
                </div>
              </div>

              {selectedAdminLabReviewAttempt.feedback && (
                <div style={{ fontSize: '13px', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '6px' }}>
                  <strong>Evaluation Remarks:</strong> {selectedAdminLabReviewAttempt.feedback}
                </div>
              )}

              {/* Code Viewer */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>
                  💻 Student Submitted Code ({(selectedAdminLabReviewAttempt.language || 'cpp').toUpperCase()})
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
                  {selectedAdminLabReviewAttempt.code || selectedAdminLabReviewAttempt.submission || '// No code content recorded'}
                </pre>
              </div>

              {/* Faculty Reference Code */}
              {selectedAdminLabReviewAttempt.task?.referenceSolution && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontWeight: 600, fontSize: '13px', color: '#fbbf24' }}>
                      🎯 Faculty Reference Solution ({(selectedAdminLabReviewAttempt.task?.solutionLanguage || 'cpp').toUpperCase()})
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
                    {selectedAdminLabReviewAttempt.task.referenceSolution}
                  </pre>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 0 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedAdminLabReviewAttempt(null)}>Close</button>
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
      {/* Individual Student Practice Audit & Code Drilldown Modal */}
      {showStudentPracticeModal && (
        <div className="modal-overlay" style={{ zIndex: 1150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '15px' }}>
          <div 
            className="glass-card modal-content animate-fade" 
            style={{ 
              maxWidth: '960px', 
              width: '100%', 
              maxHeight: '92vh', 
              display: 'flex', 
              flexDirection: 'column', 
              padding: 0, 
              overflow: 'hidden',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
            }}
          >
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📋</span> Student Practice Audit & Verification
                </h3>
                {selectedStudentPracticeReport?.student && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontWeight: '600', color: '#fff' }}>{selectedStudentPracticeReport.student.name}</span>
                    <span>•</span>
                    <span>Roll: <strong style={{ color: '#60a5fa' }}>{selectedStudentPracticeReport.student.rollNumber || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>Branch: <strong>{selectedStudentPracticeReport.student.branch || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>Email: <strong>{selectedStudentPracticeReport.student.email}</strong></span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="close-btn"
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', padding: '4px' }}
                onClick={() => {
                  setShowStudentPracticeModal(false);
                  setSelectedStudentPracticeReport(null);
                  setViewingCodeSnippet(null);
                }}
              >
                &times;
              </button>
            </div>

            {/* Platform Sub-Nav inside Modal */}
            <div style={{ display: 'flex', gap: '8px', padding: '12px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { id: 'leetcode', name: 'LeetCode', color: '#FFA116' },
                { id: 'codeforces', name: 'Codeforces', color: '#FF4B4B' },
                { id: 'codechef', name: 'CodeChef', color: '#d38b27' },
                { id: 'hackerrank', name: 'HackerRank', color: '#2ec866' }
              ].map(plat => {
                const isSelected = modalPracticePlatform === plat.id;
                const platData = selectedStudentPracticeReport?.platforms?.[plat.id];
                return (
                  <button
                    key={plat.id}
                    type="button"
                    style={{
                      background: isSelected ? plat.color : 'rgba(255,255,255,0.05)',
                      color: isSelected ? '#fff' : 'var(--text-secondary)',
                      border: isSelected ? `1px solid ${plat.color}` : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    onClick={() => {
                      setModalPracticePlatform(plat.id);
                      setViewingCodeSnippet(null);
                    }}
                  >
                    <span>{plat.name}</span>
                    {platData && (
                      <span style={{ 
                        background: isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontSize: '0.72rem'
                      }}>
                        {platData.solvedCount}/{platData.totalCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {loadingStudentPracticeReport ? (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <div className="spinner-loader"></div>
                  <p style={{ marginTop: '15px', color: 'var(--text-secondary)' }}>Loading student practice audit record...</p>
                </div>
              ) : selectedStudentPracticeReport ? (() => {
                const platData = selectedStudentPracticeReport.platforms?.[modalPracticePlatform];
                const allQuestions = platData?.questions || [];
                const filteredQuestions = allQuestions.filter(q => {
                  if (modalQuestionFilter === 'solved') return q.isSolved;
                  if (modalQuestionFilter === 'unsolved') return !q.isSolved;
                  return true;
                });

                return (
                  <div>
                    {/* Metrics Banner */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Questions Solved</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#2ec866', marginTop: '4px' }}>
                          {platData?.solvedCount || 0} / {platData?.totalCount || 0}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {platData?.solvedPercentage || 0}% Completed
                        </div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>College Rank</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#FFA116', marginTop: '4px' }}>
                          🏆 #{platData?.rank || 1}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Out of {platData?.totalStudents || 1} cohort candidates
                        </div>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform Account</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#60a5fa', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {platData?.username ? `@${platData.username}` : 'Not Linked'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {platData?.username ? '✓ Verified Account' : 'Pending Link'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px' }}
                          onClick={() => handleExportIndividualStudentCSV(selectedStudentPracticeReport, modalPracticePlatform)}
                        >
                          <span style={{ fontSize: '1.2rem' }}>📥</span>
                          <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>Export Student CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Code Snippet Drawer (if viewing a solution) */}
                    {viewingCodeSnippet && (
                      <div 
                        style={{ 
                          marginBottom: '20px', 
                          background: '#090d16', 
                          border: '1px solid #38bdf8', 
                          borderRadius: '12px', 
                          padding: '16px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>
                              Last Submission: {viewingCodeSnippet.title}
                            </span>
                            <span style={{ marginLeft: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>
                              {viewingCodeSnippet.language ? viewingCodeSnippet.language.toUpperCase() : 'CODE'}
                            </span>
                            {viewingCodeSnippet.solvedAt && (
                              <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                Submitted on {new Date(viewingCodeSnippet.solvedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                if (viewingCodeSnippet.solutionCode) {
                                  navigator.clipboard.writeText(viewingCodeSnippet.solutionCode);
                                  setCopiedSnippet(true);
                                  setTimeout(() => setCopiedSnippet(false), 2000);
                                }
                              }}
                            >
                              {copiedSnippet ? 'Copied! ✓' : '📋 Copy Code'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setViewingCodeSnippet(null)}
                            >
                              ✕ Close Viewer
                            </button>
                          </div>
                        </div>

                        <pre style={{ 
                          background: '#040711', 
                          color: '#e2e8f0', 
                          padding: '14px', 
                          borderRadius: '8px', 
                          fontFamily: 'Consolas, Monaco, "Courier New", monospace', 
                          fontSize: '0.82rem', 
                          lineHeight: '1.5', 
                          maxHeight: '260px', 
                          overflowY: 'auto',
                          margin: 0,
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <code>{viewingCodeSnippet.solutionCode || '// Submission verified via profile activity. Direct code stored upon test run.'}</code>
                        </pre>
                      </div>
                    )}

                    {/* Filter row for questions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>
                        Admin Questions Checklist ({filteredQuestions.length} of {allQuestions.length})
                      </h4>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[
                          { id: 'all', label: `All (${allQuestions.length})` },
                          { id: 'solved', label: `Solved (${allQuestions.filter(q => q.isSolved).length})` },
                          { id: 'unsolved', label: `Pending (${allQuestions.filter(q => !q.isSolved).length})` }
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            className={`btn btn-sm ${modalQuestionFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                            onClick={() => setModalQuestionFilter(f.id)}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Questions Table */}
                    <div className="table-responsive-wrapper" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      <table className="student-roster-table mini-table" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '45px' }}>#</th>
                            <th>Problem Title</th>
                            <th style={{ width: '90px' }}>Difficulty</th>
                            <th style={{ width: '100px' }}>Status</th>
                            <th style={{ width: '90px' }}>Language</th>
                            <th style={{ width: '110px' }}>Date</th>
                            <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredQuestions.length === 0 ? (
                            <tr>
                              <td colSpan="7" className="table-empty-msg" style={{ padding: '20px', textAlign: 'center' }}>
                                No questions found in this category.
                              </td>
                            </tr>
                          ) : (
                            filteredQuestions.map(q => (
                              <tr key={q.id}>
                                <td><span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>#{q.id}</span></td>
                                <td>
                                  <div style={{ fontWeight: '600', color: '#fff' }}>{q.title}</div>
                                  {q.slug && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{q.slug}</div>}
                                </td>
                                <td>
                                  <span 
                                    className="badge" 
                                    style={{ 
                                      background: q.difficulty === 'Easy' ? 'rgba(46, 200, 102, 0.15)' : q.difficulty === 'Medium' ? 'rgba(255, 161, 22, 0.15)' : 'rgba(255, 75, 75, 0.15)',
                                      color: q.difficulty === 'Easy' ? '#2ec866' : q.difficulty === 'Medium' ? '#FFA116' : '#FF4B4B',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem'
                                    }}
                                  >
                                    {q.difficulty}
                                  </span>
                                </td>
                                <td>
                                  {q.isSolved ? (
                                    <span style={{ color: '#2ec866', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      ✓ Solved
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      ○ Pending
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {q.isSolved ? (
                                    <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', color: '#e2e8f0' }}>
                                      {(q.language || 'cpp').toUpperCase()}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-secondary)' }}>—</span>
                                  )}
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    {q.solvedAt ? new Date(q.solvedAt).toLocaleDateString() : '—'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {q.isSolved ? (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                                      onClick={() => setViewingCodeSnippet(q)}
                                    >
                                      👁️ View Code
                                    </button>
                                  ) : (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>Not Solved</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })() : null}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: 'rgba(255,255,255,0.02)' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowStudentPracticeModal(false);
                  setSelectedStudentPracticeReport(null);
                  setViewingCodeSnippet(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPanel;
