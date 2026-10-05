import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import FacultyTestBuilder from '../components/FacultyTestBuilder';
import PlacementStatsExport from '../components/PlacementStatsExport';
import { API_URL } from '../config/api';
import './HODDashboard.css';

const HODDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'faculties' | 'students' | 'test-builder' | 'reports-export' | 'subjects' | 'projects' | 'labs' | 'broadcast'

  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Department Overview State
  const [overview, setOverview] = useState(null);

  // Faculties State
  const [faculties, setFaculties] = useState([]);
  const [facultyActivities, setFacultyActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // Students State
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [minCgpaFilter, setMinCgpaFilter] = useState(0);
  const [placementFilter, setPlacementFilter] = useState('ALL');

  // Modals
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    phone: '',
    mobileNumber: '',
    assignedYear: '2026',
    assignedSection: 'A',
    designation: 'Assistant Professor'
  });

  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editFacultyForm, setEditFacultyForm] = useState({
    designation: '',
    phone: '',
    mobileNumber: '',
    managedScopes: []
  });

  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentForm, setEditStudentForm] = useState({
    rollNumber: '',
    section: 'A',
    academicYear: '4th Year',
    year: '2026',
    mobileNumber: '',
    sgpaSem1: 0,
    sgpaSem2: 0,
    sgpaSem3: 0,
    sgpaSem4: 0,
    sgpaSem5: 0,
    sgpaSem6: 0,
    sgpaSem7: 0,
    sgpaSem8: 0
  });

  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  // Broadcast Modal State
  const [broadcastForm, setBroadcastForm] = useState({
    targetGroup: 'students',
    title: 'Department Placement & Academic Notification',
    message: '',
    academicYear: 'ALL',
    sendWhatsApp: true,
    specificPhone: '8074701052'
  });

  // Academic Subjects State
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectYearFilter, setSubjectYearFilter] = useState('ALL');
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
    academicYear: '4th Year',
    section: 'All',
    assignedTo: ''
  });
  const [assigningSubject, setAssigningSubject] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Student Projects & Grading State
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL');
  const [gradingProject, setGradingProject] = useState(null);
  const [gradeForm, setGradeForm] = useState({
    grade: 85,
    leadStudentGrade: 85,
    feedback: '',
    codeSuggestions: '',
    techSuggestions: '',
    status: 'approved',
    teamMembers: []
  });
  const [previewingLiveDemo, setPreviewingLiveDemo] = useState(null);
  const [demoDeviceMode, setDemoDeviceMode] = useState('desktop');
  const [demoKey, setDemoKey] = useState(0);
  const [inModalPreviewOpen, setInModalPreviewOpen] = useState(false);

  // Lab Tasks & Practice State
  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [labYearFilter, setLabYearFilter] = useState('ALL');
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [labForm, setLabForm] = useState({
    title: '',
    description: '',
    language: 'python',
    academicYear: '4th Year',
    section: 'All',
    difficulty: 'medium',
    starterCode: '# Write your code here\ndef solution():\n    pass\n',
    points: 10,
    dueDate: '',
    testCases: [{ input: '', output: '', isHidden: false }]
  });
  const [viewingSubmissionsTask, setViewingSubmissionsTask] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Fetch Department Overview
  const fetchOverview = async () => {
    try {
      const res = await fetch(`${API_URL}/hod/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOverview(data.data);
      }
    } catch (err) {
      console.error('Error fetching HOD overview:', err);
    }
  };

  // Fetch Faculties
  const fetchFaculties = async () => {
    try {
      const res = await fetch(`${API_URL}/hod/faculties`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFaculties(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching HOD faculties:', err);
    }
  };

  // Fetch Faculty Activities
  const fetchFacultyActivities = async () => {
    try {
      setActivitiesLoading(true);
      const res = await fetch(`${API_URL}/hod/faculty-activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFacultyActivities(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching faculty activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Fetch Students
  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      const params = new URLSearchParams();
      if (studentSearch.trim()) params.append('search', studentSearch.trim());
      if (academicYearFilter !== 'ALL') params.append('academicYear', academicYearFilter);
      if (sectionFilter !== 'ALL') params.append('section', sectionFilter);
      if (minCgpaFilter > 0) params.append('minCgpa', minCgpaFilter);
      if (placementFilter !== 'ALL') params.append('placementStatus', placementFilter);

      const res = await fetch(`${API_URL}/hod/students?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching HOD students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Fetch Subjects
  const fetchSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const res = await fetch(`${API_URL}/hod/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubjects(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching HOD subjects:', err);
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Add Subject
  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(subjectForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Subject created successfully.');
        setShowAddSubjectModal(false);
        setSubjectForm({
          name: '',
          code: '',
          description: '',
          academicYear: '4th Year',
          section: 'All',
          assignedTo: ''
        });
        fetchSubjects();
      } else {
        setErrorMsg(data.error || 'Failed to add subject.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Assign Subject Teacher (or Assign to HOD themselves)
  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!assigningSubject || !selectedTeacherId) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/subjects/${assigningSubject._id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: selectedTeacherId, action: 'assign' })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Subject assigned successfully.');
        setAssigningSubject(null);
        setSelectedTeacherId('');
        fetchSubjects();
      } else {
        setErrorMsg(data.error || 'Failed to assign subject.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Unassign Subject Teacher
  const handleUnassignTeacher = async (subjectId, teacherId) => {
    if (!window.confirm('Are you sure you want to unassign this instructor from the subject?')) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/subjects/${subjectId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: teacherId, action: 'unassign' })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Instructor unassigned.');
        fetchSubjects();
        if (assigningSubject) {
          setAssigningSubject(prev => ({
            ...prev,
            assignedTeachers: (prev.assignedTeachers || []).filter(t => (t._id || t.id) !== teacherId)
          }));
        }
      } else {
        setErrorMsg(data.error || 'Failed to unassign instructor.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Subject
  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!window.confirm(`Are you sure you want to delete subject "${subjectName}"?`)) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Subject deleted.');
        fetchSubjects();
      } else {
        setErrorMsg(data.error || 'Failed to delete subject.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch Projects
  const fetchProjects = async () => {
    try {
      setProjectsLoading(true);
      const res = await fetch(`${API_URL}/hod/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching HOD projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const formatExternalUrl = (url) => {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  const getProjectLinks = (proj) => {
    if (!proj) return { repoUrl: '', demoUrl: '', rawRepoUrl: '', rawDemoUrl: '' };
    const rawRepo = proj.repositoryUrl || proj.githubRepoUrl || proj.repoUrl || (proj.student?.githubProfileUrl || '');
    const rawDemo = proj.deploymentUrl || proj.previewUrl || proj.liveDemoUrl || '';
    return {
      repoUrl: formatExternalUrl(rawRepo),
      rawRepoUrl: rawRepo,
      demoUrl: formatExternalUrl(rawDemo),
      rawDemoUrl: rawDemo
    };
  };

  const openGradingModalForProject = (proj) => {
    setGradingProject(proj);
    setInModalPreviewOpen(false);
    setGradeForm({
      grade: proj.grade !== undefined && proj.grade !== null ? proj.grade : 85,
      leadStudentGrade: proj.leadStudentGrade !== undefined && proj.leadStudentGrade !== null ? proj.leadStudentGrade : (proj.grade !== undefined && proj.grade !== null ? proj.grade : 85),
      feedback: proj.feedback || '',
      codeSuggestions: proj.codeSuggestions || '',
      techSuggestions: proj.techSuggestions || '',
      status: proj.status || 'approved',
      teamMembers: (proj.teamMembers || []).map(m => ({
        _id: m._id,
        name: m.name,
        rollNumber: m.rollNumber || '',
        email: m.email || '',
        role: m.role || 'Contributor',
        contribution: m.contribution || '',
        grade: m.grade !== undefined && m.grade !== null ? m.grade : (proj.grade || 85),
        feedback: m.feedback || ''
      }))
    });
  };

  // Grade Project Submit
  const handleGradeProjectSubmit = async (e) => {
    e.preventDefault();
    if (!gradingProject) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/projects/${gradingProject._id}/grade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(gradeForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Project graded and evaluated successfully.');
        setGradingProject(null);
        fetchProjects();
      } else {
        setErrorMsg(data.error || 'Failed to grade project.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch Labs
  const fetchLabs = async () => {
    try {
      setLabsLoading(true);
      const res = await fetch(`${API_URL}/hod/labs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLabs(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching HOD labs:', err);
    } finally {
      setLabsLoading(false);
    }
  };

  // Create Lab Task
  const handleCreateLab = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/labs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(labForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Lab task created successfully.');
        setShowAddLabModal(false);
        setLabForm({
          title: '',
          description: '',
          language: 'python',
          academicYear: '4th Year',
          section: 'All',
          difficulty: 'medium',
          starterCode: '# Write your code here\ndef solution():\n    pass\n',
          points: 10,
          dueDate: '',
          testCases: [{ input: '', output: '', isHidden: false }]
        });
        fetchLabs();
      } else {
        setErrorMsg(data.error || 'Failed to create lab task.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Lab Task
  const handleDeleteLab = async (labId, labTitle) => {
    if (!window.confirm(`Are you sure you want to delete lab task "${labTitle}"?`)) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/labs/${labId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Lab task deleted.');
        fetchLabs();
      } else {
        setErrorMsg(data.error || 'Failed to delete lab task.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    } finally {
      setActionLoading(false);
    }
  };

  // View Lab Submissions
  const handleOpenSubmissions = async (task) => {
    setViewingSubmissionsTask(task);
    setSubmissionsLoading(true);
    setSubmissionsList([]);
    try {
      const res = await fetch(`${API_URL}/hod/labs/${task._id}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionsList(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching lab submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Computed Filtered Lists
  const filteredSubjects = subjects.filter(s => {
    if (subjectYearFilter !== 'ALL' && s.academicYear !== subjectYearFilter) return false;
    return true;
  });

  const filteredProjects = projects.filter(p => {
    if (projectStatusFilter !== 'ALL' && p.status !== projectStatusFilter) return false;
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      const matchTitle = (p.title || '').toLowerCase().includes(q);
      const matchStudent = (p.student?.name || '').toLowerCase().includes(q);
      const matchRoll = (p.student?.rollNumber || '').toLowerCase().includes(q);
      if (!matchTitle && !matchStudent && !matchRoll) return false;
    }
    return true;
  });

  const filteredLabs = labs.filter(l => {
    if (labYearFilter !== 'ALL' && l.academicYear !== labYearFilter) return false;
    return true;
  });

  // Initial Data Load
  useEffect(() => {
    if (token) {
      setLoading(true);
      Promise.all([
        fetchOverview(),
        fetchFaculties(),
        fetchStudents(),
        fetchFacultyActivities(),
        fetchSubjects(),
        fetchProjects(),
        fetchLabs()
      ]).finally(() => setLoading(false));
    }
  }, [token]);

  // Handle Tab Switch
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setErrorMsg('');
    setSuccessMsg('');
    if (tabKey === 'overview') fetchOverview();
    if (tabKey === 'faculties') {
      fetchFaculties();
      fetchFacultyActivities();
    }
    if (tabKey === 'students') fetchStudents();
    if (tabKey === 'subjects') fetchSubjects();
    if (tabKey === 'projects') fetchProjects();
    if (tabKey === 'labs') fetchLabs();
  };

  // Add Faculty Submit
  const handleAddFaculty = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/faculties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(facultyForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Faculty added successfully!');
        setShowAddFacultyModal(false);
        setFacultyForm({
          name: '',
          email: '',
          phone: '',
          mobileNumber: '',
          assignedYear: '2026',
          assignedSection: 'A',
          designation: 'Assistant Professor'
        });
        fetchFaculties();
        fetchOverview();
      } else {
        setErrorMsg(data.error || 'Failed to add faculty.');
      }
    } catch (err) {
      setErrorMsg('Error communicating with server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Faculty
  const openEditFaculty = (fac) => {
    setEditingFaculty(fac);
    setEditFacultyForm({
      designation: fac.targetRole || 'Assistant Professor',
      phone: fac.phone || fac.mobileNumber || '',
      mobileNumber: fac.mobileNumber || fac.phone || '',
      managedScopes: fac.managedScopes || []
    });
  };

  // Update Faculty Scope Submit
  const handleUpdateFaculty = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/faculties/${editingFaculty._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editFacultyForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Faculty updated successfully!');
        setEditingFaculty(null);
        fetchFaculties();
      } else {
        setErrorMsg(data.error || 'Failed to update faculty.');
      }
    } catch (err) {
      setErrorMsg('Error updating faculty.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Student
  const openEditStudent = (st) => {
    setEditingStudent(st);
    setEditStudentForm({
      rollNumber: st.rollNumber || '',
      section: st.section || 'A',
      academicYear: st.academicYear || '4th Year',
      year: st.year || '2026',
      mobileNumber: st.mobileNumber || st.phone || '',
      sgpaSem1: st.sgpaSem1 || 0,
      sgpaSem2: st.sgpaSem2 || 0,
      sgpaSem3: st.sgpaSem3 || 0,
      sgpaSem4: st.sgpaSem4 || 0,
      sgpaSem5: st.sgpaSem5 || 0,
      sgpaSem6: st.sgpaSem6 || 0,
      sgpaSem7: st.sgpaSem7 || 0,
      sgpaSem8: st.sgpaSem8 || 0
    });
  };

  // Update Student Submit
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      setActionLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/hod/students/${editingStudent._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editStudentForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Student record updated!');
        setEditingStudent(null);
        fetchStudents();
        fetchOverview();
      } else {
        setErrorMsg(data.error || 'Failed to update student record.');
      }
    } catch (err) {
      setErrorMsg('Error updating student record.');
    } finally {
      setActionLoading(false);
    }
  };

  // Broadcast Message Submit
  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!broadcastForm.message.trim()) {
      setErrorMsg('Please enter a message to broadcast.');
      return;
    }
    try {
      setActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      const res = await fetch(`${API_URL}/hod/broadcast-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(broadcastForm)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message || 'Announcement broadcast successfully across Email & WhatsApp!');
        setBroadcastForm(prev => ({ ...prev, message: '' }));
      } else {
        setErrorMsg(data.error || 'Failed to dispatch broadcast.');
      }
    } catch (err) {
      setErrorMsg('Error dispatching announcement.');
    } finally {
      setActionLoading(false);
    }
  };

  // Export NBA / NAAC Departmental CSV
  const handleExportReport = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/hod/export-branch-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        const rows = data.data;
        if (rows.length === 0) {
          setErrorMsg('No student records found to export.');
          return;
        }

        const headers = ['S.No', 'Roll Number', 'Student Name', 'Branch', 'Section', 'Graduation Year', 'Mobile Number', 'Email', 'CGPA', 'Placement Readiness Index', 'Placement Status', 'Offers Released'];
        const csvContent = [
          headers.join(','),
          ...rows.map(r => [
            r.sNo,
            `"${r.rollNumber}"`,
            `"${r.name}"`,
            r.branch,
            r.section,
            r.year,
            `"${r.mobileNumber}"`,
            `"${r.email}"`,
            r.cgpa,
            r.placementReadinessIndex,
            `"${r.placedStatus}"`,
            `"${(r.offers || '').replace(/"/g, '""')}"`
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `GRIET_IT_Department_Accreditation_Report_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setSuccessMsg('📥 Department NBA/NAAC Accreditation CSV Report downloaded successfully.');
      } else {
        setErrorMsg('Failed to generate export report.');
      }
    } catch (err) {
      setErrorMsg('Error downloading accreditation report.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Header title="HOD Executive Console" />

      <div className="content-wrapper animate-fade">
        <div className="hod-dashboard-container">
        {/* Alerts Banner */}
        {errorMsg && (
          <div className="hod-error-banner animate-fade">
            <span>⚠️ {errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')}>×</button>
          </div>
        )}
        {successMsg && (
          <div className="hod-success-banner animate-fade">
            <span>✓ {successMsg}</span>
            <button type="button" onClick={() => setSuccessMsg('')}>×</button>
          </div>
        )}

        {/* HOD Hero Header */}
        <div className="hod-hero-banner glass-card">
          <div className="hod-hero-left">
            <div className="hod-badge-strip">
              <span className="hod-dept-tag">
                🏛️ Department of Information Technology (IT) • GRIET Hyderabad
              </span>
              <span className="hod-tier-badge">
                ⭐ NBA &amp; NAAC Tier-1 Autonomous
              </span>
            </div>
            <h1 className="hod-hero-title">
              {user?.name || 'Dr. Baimuthakala Ajay Kumar'}
            </h1>
            <p className="hod-hero-desc">
              Executive Departmental Console to supervise faculty academic activities, monitor student records and placement readiness, manage class scopes, and dispatch departmental WhatsApp/Email notices.
            </p>
          </div>

          <div className="hod-hero-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                fetchOverview();
                fetchFaculties();
                fetchStudents();
                fetchFacultyActivities();
                fetchSubjects();
                fetchProjects();
                fetchLabs();
              }}
              title="Refresh all departmental data"
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportReport}
              disabled={actionLoading}
              title="Export complete departmental report for NBA/NAAC"
            >
              📥 Export Accreditation CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/change-password')}
              title="Change Account Password"
              style={{ borderColor: 'rgba(234, 179, 8, 0.4)', color: '#fef08a' }}
            >
              🔑 Change Password
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 700 }}
              onClick={() => setShowAddFacultyModal(true)}
            >
              ➕ Add Faculty Member
            </button>
          </div>
        </div>

        {/* Top Department Metrics KPI Strip */}
        <div className="hod-kpi-grid">
          <div className="hod-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              👨‍🎓
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{overview?.totalStudents || students.length || 0}</span>
              <span className="kpi-label">Total IT Students</span>
            </div>
          </div>

          <div className="hod-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              👨‍🏫
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{overview?.totalFaculties || faculties.length || 0}</span>
              <span className="kpi-label">Department Faculties</span>
            </div>
          </div>

          <div className="hod-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              🎯
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{overview?.placements?.placementPercentage || 0}%</span>
              <span className="kpi-label">Placement Rate ({overview?.placements?.offeredStudentsCount || 0} Placed)</span>
            </div>
          </div>

          <div className="hod-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              💰
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{overview?.placements?.highestPackage || '18.5 LPA'}</span>
              <span className="kpi-label">Highest Package (Avg: {overview?.placements?.averagePackage || '6.5 LPA'})</span>
            </div>
          </div>

          <div className="hod-kpi-card glass-card">
            <div className="kpi-icon-bubble" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              ⚠️
            </div>
            <div className="kpi-info-wrap">
              <span className="kpi-number">{overview?.atRiskCount || 0}</span>
              <span className="kpi-label">At-Risk Students (Need Help)</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="hod-tabs-bar">
          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <span>📊</span>
            <span>Department Overview</span>
          </button>

          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'faculties' ? 'active' : ''}`}
            onClick={() => handleTabChange('faculties')}
          >
            <span>👨‍🏫</span>
            <span>Faculty Management &amp; Activities</span>
            <span className="hod-tab-badge">{faculties.length}</span>
          </button>

          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => handleTabChange('students')}
          >
            <span>🎓</span>
            <span>IT Student Records</span>
            <span className="hod-tab-badge">{students.length}</span>
          </button>

          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'test-builder' ? 'active' : ''}`}
            onClick={() => handleTabChange('test-builder')}
          >
            <span>📝</span>
            <span>Faculty Test Builder</span>
          </button>

          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'reports-export' ? 'active' : ''}`}
            onClick={() => handleTabChange('reports-export')}
          >
            <span>📈</span>
            <span>Status &amp; Report Export</span>
          </button>

          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
            onClick={() => handleTabChange('subjects')}
          >
            <span>📚</span>
            <span>Academic Subjects</span>
            <span className="hod-tab-badge">{subjects.length}</span>
          </button>

          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => handleTabChange('projects')}
          >
            <span>🚀</span>
            <span>Students Projects &amp; Grading</span>
            <span className="hod-tab-badge">{projects.length}</span>
          </button>

          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'labs' ? 'active' : ''}`}
            onClick={() => handleTabChange('labs')}
          >
            <span>💻</span>
            <span>Labs Tasks &amp; Practice</span>
            <span className="hod-tab-badge">{labs.length}</span>
          </button>

          <button
            type="button"
            className={`hod-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`}
            onClick={() => handleTabChange('broadcast')}
          >
            <span>📢</span>
            <span>Department Broadcast &amp; Alerts</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="hod-tab-content">
            <div className="hod-overview-grid">
              {/* Batch Breakdown Card */}
              <div className="glass-card hod-card">
                <div className="hod-card-header">
                  <h3>🎓 Batch Enrollment Distribution (IT)</h3>
                  <span className="badge-pill">Autonomous Intake</span>
                </div>
                <div className="hod-batch-list">
                  {overview?.yearCounts && Object.entries(overview.yearCounts).map(([key, count]) => (
                    <div key={key} className="hod-batch-item">
                      <div className="batch-name-row">
                        <strong>{key}</strong>
                        <span>{count} Students</span>
                      </div>
                      <div className="progress-bar-wrap">
                        <div
                          className="progress-bar-fill"
                          style={{
                            width: `${overview.totalStudents > 0 ? Math.min(100, Math.round((count / overview.totalStudents) * 100)) : 10}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Faculty Productivity Card */}
              <div className="glass-card hod-card">
                <div className="hod-card-header">
                  <h3>👨‍🏫 Faculty Activity Breakdown</h3>
                  <span className="badge-pill">Department Contributions</span>
                </div>
                <div className="hod-stat-strip-vertical">
                  <div className="hod-stat-box">
                    <span className="lbl">Aptitude &amp; Coding Tests Authored</span>
                    <strong className="val" style={{ color: '#38bdf8' }}>
                      {overview?.facultyActivities?.totalTestsCreated || 0}
                    </strong>
                  </div>
                  <div className="hod-stat-box">
                    <span className="lbl">Lab Programming Assignments Posted</span>
                    <strong className="val" style={{ color: '#a855f7' }}>
                      {overview?.facultyActivities?.totalLabsAssigned || 0}
                    </strong>
                  </div>
                  <div className="hod-stat-box">
                    <span className="lbl">Student Doubts Answered</span>
                    <strong className="val" style={{ color: '#34d399' }}>
                      {overview?.facultyActivities?.totalDoubtsAnswered || 0}
                    </strong>
                  </div>
                  <div className="hod-stat-box">
                    <span className="lbl">Average Placement Readiness Index (PRI)</span>
                    <strong className="val" style={{ color: '#fbbf24' }}>
                      {overview?.averagePri || 65}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Faculty Activity Stream */}
            <div className="glass-card hod-card" style={{ marginTop: '1.25rem' }}>
              <div className="hod-card-header">
                <h3>⚡ Recent Faculty Activity Stream</h3>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleTabChange('faculties')}
                >
                  View All Faculty Activities →
                </button>
              </div>

              {facultyActivities.length > 0 ? (
                <div className="hod-activity-timeline">
                  {facultyActivities.slice(0, 6).map((act, i) => (
                    <div key={i} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-body">
                        <div className="timeline-top">
                          <strong>{act.facultyName}</strong>
                          <span className="timeline-category">{act.category}</span>
                          <span className="timeline-date">{new Date(act.date).toLocaleDateString()}</span>
                        </div>
                        <div className="timeline-title">{act.title}</div>
                        <div className="timeline-details">{act.details}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0' }}>
                  No recent faculty activities recorded yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: FACULTY MANAGEMENT & ACTIVITIES */}
        {/* ========================================================================= */}
        {activeTab === 'faculties' && (
          <div className="hod-tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc' }}>
                  👨‍🏫 IT Department Faculty Directory ({faculties.length})
                </h3>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                  Manage faculty assignments, scopes (batches &amp; sections), and track their authored tests and lab tasks.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                onClick={() => setShowAddFacultyModal(true)}
              >
                ➕ Add Faculty to IT Branch
              </button>
            </div>

            {/* Faculties Grid */}
            <div className="hod-faculty-grid">
              {faculties.map((fac) => {
                const initials = fac.name ? fac.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'FC';
                return (
                  <div key={fac._id} className="hod-faculty-card glass-card">
                    <div className="faculty-card-header">
                      <div className="faculty-avatar">{initials}</div>
                      <div className="faculty-info">
                        <h4>{fac.name}</h4>
                        <span className="faculty-role">{fac.targetRole || 'Assistant Professor'}</span>
                      </div>
                    </div>

                    <div className="faculty-meta-list">
                      <div className="meta-row">
                        <span className="lbl">Email:</span>
                        <span className="val">{fac.email}</span>
                      </div>
                      <div className="meta-row">
                        <span className="lbl">📱 Mobile:</span>
                        <span className="val" style={{ color: fac.mobileNumber || fac.phone ? '#38bdf8' : '#64748b' }}>
                          {fac.mobileNumber || fac.phone || 'Not Registered'}
                        </span>
                      </div>
                      <div className="meta-row">
                        <span className="lbl">Assigned Scopes:</span>
                        <span className="val">
                          {fac.managedScopes && fac.managedScopes.length > 0
                            ? fac.managedScopes.map(s => `${s.academicYear} Sec ${s.section || 'All'}`).join(', ')
                            : 'All IT Batches'}
                        </span>
                      </div>
                    </div>

                    <div className="faculty-stat-strip">
                      <div className="fac-stat">
                        <span className="num">{fac.testsCount || 0}</span>
                        <span className="txt">Tests</span>
                      </div>
                      <div className="fac-stat">
                        <span className="num">{fac.labsCount || 0}</span>
                        <span className="txt">Labs</span>
                      </div>
                      <div className="fac-stat">
                        <span className="num">{fac.doubtsCount || 0}</span>
                        <span className="txt">Doubts</span>
                      </div>
                    </div>

                    <div className="faculty-card-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditFaculty(fac)}
                      >
                        ⚙️ Edit Scopes &amp; Info
                      </button>
                      {(fac.mobileNumber || fac.phone) && (
                        <a
                          href={`https://api.whatsapp.com/send?phone=${(fac.mobileNumber || fac.phone).replace(/\D/g, '')}&text=Hello%20Prof.%20${encodeURIComponent(fac.name)}%2C%20from%20HOD%20Office`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#22c55e', textDecoration: 'none' }}
                        >
                          💬 WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Faculty Activity Stream */}
            <div className="glass-card hod-card" style={{ marginTop: '2rem' }}>
              <div className="hod-card-header">
                <h3>📜 Full Department Faculty Activities Log</h3>
                <span className="badge-pill">{facultyActivities.length} Actions</span>
              </div>

              {activitiesLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  Loading activities...
                </div>
              ) : facultyActivities.length > 0 ? (
                <div className="hod-table-wrapper">
                  <table className="hod-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Faculty Coordinator</th>
                        <th>Activity Type</th>
                        <th>Title / Description</th>
                        <th>Details</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facultyActivities.map((act, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap', color: '#94a3b8' }}>
                            {new Date(act.date).toLocaleDateString()}
                          </td>
                          <td>
                            <strong>{act.facultyName}</strong>
                          </td>
                          <td>
                            <span className={`hod-tag ${act.type}`}>
                              {act.category}
                            </span>
                          </td>
                          <td>{act.title}</td>
                          <td style={{ color: '#94a3b8', fontSize: '12px' }}>{act.details}</td>
                          <td>
                            <span style={{ color: '#34d399', fontWeight: 700, fontSize: '11px' }}>
                              ✓ {act.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                  No faculty activities recorded yet.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: STUDENT RECORDS (IT BRANCH SPECIFIC) */}
        {/* ========================================================================= */}
        {activeTab === 'students' && (
          <div className="hod-tab-content">
            {/* Filter Toolbar */}
            <div className="glass-card hod-card" style={{ marginBottom: '1.25rem' }}>
              <div className="hod-student-filters">
                <div style={{ flex: 2, minWidth: '240px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by student name, roll number, or phone..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem 1rem' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '150px' }}>
                  <select
                    className="form-control"
                    value={academicYearFilter}
                    onChange={(e) => setAcademicYearFilter(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                  >
                    <option value="ALL">All Batches (1st - 4th Year)</option>
                    <option value="4th Year">4th Year (Batch 2026)</option>
                    <option value="3rd Year">3rd Year (Batch 2027)</option>
                    <option value="2nd Year">2nd Year (Batch 2028)</option>
                    <option value="1st Year">1st Year (Batch 2029)</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '120px' }}>
                  <select
                    className="form-control"
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                  >
                    <option value="ALL">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '140px' }}>
                  <select
                    className="form-control"
                    value={placementFilter}
                    onChange={(e) => setPlacementFilter(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                  >
                    <option value="ALL">All Placement Statuses</option>
                    <option value="Placed">🎉 Placed / Offered</option>
                    <option value="Selected">🏆 Selected</option>
                    <option value="In Process">⏳ In Process</option>
                    <option value="Eligible">Eligible</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchStudents}
                >
                  🔍 Filter
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="glass-card hod-card">
              <div className="hod-card-header">
                <h3>🎓 IT Branch Students Database ({students.length})</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportReport}
                    title="Export NBA/NAAC CSV"
                  >
                    📥 Export CSV
                  </button>
                </div>
              </div>

              {studentsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Loading IT branch students...
                </div>
              ) : students.length > 0 ? (
                <div className="hod-table-wrapper">
                  <table className="hod-table">
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Batch / Sec</th>
                        <th>Mobile Number</th>
                        <th>CGPA</th>
                        <th>PRI Score</th>
                        <th>Placement Status</th>
                        <th>Offers Released</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((st) => (
                        <tr key={st._id}>
                          <td>
                            <strong style={{ color: '#38bdf8' }}>{st.rollNumber}</strong>
                          </td>
                          <td>
                            <div>
                              <strong>{st.name}</strong>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{st.email}</div>
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {st.academicYear} • Sec {st.section}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: st.mobileNumber ? '#f8fafc' : '#64748b' }}>
                                {st.mobileNumber || 'Not Added'}
                              </span>
                              {st.mobileNumber && (
                                <a
                                  href={`https://api.whatsapp.com/send?phone=${st.mobileNumber.replace(/\D/g, '')}&text=Hello%20${encodeURIComponent(st.name)}%2C%20from%20HOD%20IT%20Office`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    background: 'rgba(34, 197, 94, 0.15)',
                                    color: '#22c55e',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    textDecoration: 'none',
                                    fontWeight: 700
                                  }}
                                  title="WhatsApp message to student"
                                >
                                  💬 WA
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              fontWeight: 800,
                              color: st.cgpa >= 8.0 ? '#34d399' : st.cgpa >= 7.0 ? '#38bdf8' : st.cgpa >= 6.0 ? '#fbbf24' : '#f87171'
                            }}>
                              {st.cgpa}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: '#c084fc', fontWeight: 700 }}>
                              {st.readinessScore}%
                            </span>
                          </td>
                          <td>
                            <span className={`hod-placement-badge ${st.placementTag.toLowerCase().replace(/\s/g, '-')}`}>
                              {st.placementTag}
                            </span>
                          </td>
                          <td style={{ fontSize: '11.5px', color: st.offersCount > 0 ? '#34d399' : '#94a3b8' }}>
                            {st.offers?.join(', ') || 'None'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                onClick={() => setSelectedStudentDetail(st)}
                                title="View Complete Profile & Performance"
                              >
                                👁️ View
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                onClick={() => openEditStudent(st)}
                                title="Update SGPA / Section / Phone"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                  No students found matching current filters.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: DEPARTMENT BROADCAST & WHATSAPP NOTICES */}
        {/* ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="hod-tab-content">
            <div className="glass-card hod-card" style={{ maxWidth: '820px', margin: '0 auto' }}>
              <div className="hod-card-header">
                <h3>📢 Dispatch Departmental Announcement &amp; WhatsApp Alerts</h3>
                <span className="badge-pill">HOD IT Broadcast</span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 1.25rem' }}>
                Broadcast crucial notices, assessment round schedules, lab test dates, or academic deadlines to IT branch students and faculties. Notifications will be instantly dispatched via <strong>Email, Portal Notification, and WhatsApp</strong>.
              </p>

              <form onSubmit={handleBroadcastSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label className="form-label">Target Audience *</label>
                    <select
                      className="form-control"
                      value={broadcastForm.targetGroup}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, targetGroup: e.target.value }))}
                      style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                    >
                      <option value="students">🎓 IT Students Only</option>
                      <option value="faculty">👨‍🏫 IT Faculty Coordinators Only</option>
                      <option value="both">👥 Both Students &amp; Faculty</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Target Batch / Year</label>
                    <select
                      className="form-control"
                      value={broadcastForm.academicYear}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, academicYear: e.target.value }))}
                      style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                    >
                      <option value="ALL">All Batches (1st to 4th Year)</option>
                      <option value="4th Year">4th Year (Batch 2026)</option>
                      <option value="3rd Year">3rd Year (Batch 2027)</option>
                      <option value="2nd Year">2nd Year (Batch 2028)</option>
                      <option value="1st Year">1st Year (Batch 2029)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Announcement Title / Subject *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Mandatory Placement Drive Orientation & Assessment Instructions"
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                  />
                </div>

                <div>
                  <label className="form-label">WhatsApp Target Phone Number (Coordinator / Test)</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={broadcastForm.specificPhone}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, specificPhone: e.target.value }))}
                    placeholder="8074701052"
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                    ⚡ Instant WhatsApp message will be sent to <strong>8074701052</strong> as well as all recipients with registered mobile numbers.
                  </small>
                </div>

                <div>
                  <label className="form-label">Announcement Content / Instructions *</label>
                  <textarea
                    rows="6"
                    className="form-control"
                    required
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Enter detailed notice, venue instructions, syllabus guidelines, or schedule..."
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.75rem', lineHeight: '1.5' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading}
                    style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', padding: '0.8rem 2rem', fontWeight: 700 }}
                  >
                    {actionLoading ? 'Dispatching Notice...' : '🚀 Dispatch Broadcast Across Channels'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: FACULTY TEST BUILDER */}
        {/* ========================================================================= */}
        {activeTab === 'test-builder' && (
          <div className="hod-tab-content">
            <div className="glass-card hod-card" style={{ marginBottom: '1rem' }}>
              <div className="hod-card-header">
                <div>
                  <h3>📝 Department Assessment &amp; Faculty Test Builder</h3>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
                    Design and publish branch-wide or class-specific assessments (MCQs, Coding, SQL, and Descriptive) for IT students with automated evaluation.
                  </p>
                </div>
              </div>
            </div>
            <FacultyTestBuilder />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: STATUS & REPORT EXPORT */}
        {/* ========================================================================= */}
        {activeTab === 'reports-export' && (
          <div className="hod-tab-content">
            <div className="glass-card hod-card" style={{ marginBottom: '1rem' }}>
              <div className="hod-card-header">
                <div>
                  <h3>📈 Comprehensive Department Accreditation &amp; Placement Exports</h3>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
                    Generate real-time departmental statistics, batch-wise readiness reports, placement conversion metrics, and NBA/NAAC compliance files.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 700 }}
                  onClick={handleExportReport}
                  disabled={actionLoading}
                >
                  📥 Download IT Accreditation CSV
                </button>
              </div>
            </div>
            <PlacementStatsExport students={students} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ACADEMIC SUBJECTS */}
        {/* ========================================================================= */}
        {activeTab === 'subjects' && (
          <div className="hod-tab-content">
            <div className="glass-card hod-card">
              <div className="hod-card-header">
                <div>
                  <h3>📚 Information Technology Academic Subjects &amp; Teaching Assignments</h3>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
                    Manage curriculum subjects, track course notes, and assign subjects directly to HOD or departmental faculty members.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="form-control"
                    value={subjectYearFilter}
                    onChange={(e) => setSubjectYearFilter(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.45rem 0.8rem', fontSize: '13px' }}
                  >
                    <option value="ALL">All Academic Years</option>
                    <option value="4th Year">4th Year (Batch 2026)</option>
                    <option value="3rd Year">3rd Year (Batch 2027)</option>
                    <option value="2nd Year">2nd Year (Batch 2028)</option>
                    <option value="1st Year">1st Year (Batch 2029)</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', fontWeight: 700, padding: '0.5rem 1rem', fontSize: '13px' }}
                    onClick={() => setShowAddSubjectModal(true)}
                  >
                    ➕ Add Subject
                  </button>
                </div>
              </div>

              {subjectsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Loading IT academic subjects...
                </div>
              ) : filteredSubjects.length > 0 ? (
                <div className="hod-table-wrapper">
                  <table className="hod-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Subject Name</th>
                        <th>Target Batch &amp; Sec</th>
                        <th>Assigned Instructor(s)</th>
                        <th>Materials / Notes</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map(sub => (
                        <tr key={sub._id}>
                          <td>
                            <span style={{ fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>
                              {sub.code}
                            </span>
                          </td>
                          <td>
                            <strong>{sub.name}</strong>
                            {sub.description && (
                              <div style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sub.description}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{sub.academicYear}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Sec: {sub.section || 'All'}</span>
                          </td>
                          <td>
                            {sub.assignedTeachers && sub.assignedTeachers.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {sub.assignedTeachers.map(tch => {
                                  const isHod = tch.role === 'hod' || (user?._id && String(tch.id || tch._id) === String(user._id)) || (tch.name || '').toLowerCase().includes('ajay');
                                  return (
                                    <span
                                      key={tch.id || tch._id}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: isHod ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                        color: isHod ? '#fbbf24' : '#c084fc',
                                        border: `1px solid ${isHod ? 'rgba(245, 158, 11, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700
                                      }}
                                    >
                                      {isHod ? '🏛️ HOD (You): ' : '👨‍🏫 '} {tch.name}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span style={{ color: '#f87171', fontSize: '11px', fontWeight: 600, background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                ⚠️ Not Assigned
                              </span>
                            )}
                          </td>
                          <td>
                            <span style={{ color: '#34d399', fontWeight: 700, fontSize: '12px' }}>
                              📄 {sub.notesCount || 0} Modules
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px' }}
                                onClick={() => {
                                  setAssigningSubject(sub);
                                  setSelectedTeacherId(user?._id || '');
                                }}
                                title="Assign instructor or yourself to this subject"
                              >
                                👤 Assign
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                                onClick={() => handleDeleteSubject(sub._id, sub.name)}
                                title="Delete subject"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                  No academic subjects found for the selected academic year. Click "Add Subject" to create one.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: STUDENTS PROJECTS & GRADING */}
        {/* ========================================================================= */}
        {activeTab === 'projects' && (
          <div className="hod-tab-content">
            <div className="glass-card hod-card">
              <div className="hod-card-header">
                <div>
                  <h3>🚀 Student Capstone &amp; Academic Projects (IT Branch)</h3>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
                    Review, evaluate, and assign official marks/grades with feedback for IT branch student projects and capstone studios.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="form-control"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Search title, student, roll number..."
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.45rem 0.8rem', fontSize: '13px', width: '220px' }}
                  />
                  <select
                    className="form-control"
                    value={projectStatusFilter}
                    onChange={(e) => setProjectStatusFilter(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.45rem 0.8rem', fontSize: '13px' }}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="changes_requested">Changes Requested</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {projectsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Loading IT student projects...
                </div>
              ) : filteredProjects.length > 0 ? (
                <div className="hod-table-wrapper">
                  <table className="hod-table">
                    <thead>
                      <tr>
                        <th>Project Title &amp; Domain</th>
                        <th>Student &amp; Team</th>
                        <th>Batch / Sec</th>
                        <th>Live Demo &amp; GitHub Repo</th>
                        <th>Status</th>
                        <th>Grade</th>
                        <th>Evaluator</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map(proj => {
                        const { repoUrl, rawRepoUrl, demoUrl, rawDemoUrl } = getProjectLinks(proj);
                        const techList = (proj.technologies && proj.technologies.length > 0 ? proj.technologies : proj.techStack || []);
                        const teamMembersCount = (proj.teamMembers?.length || 0);

                        return (
                          <tr key={proj._id}>
                            <td>
                              <strong style={{ color: '#ffffff', fontSize: '13.5px' }}>{proj.title}</strong>
                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {proj.domain && (
                                  <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    {proj.domain}
                                  </span>
                                )}
                                {techList.slice(0, 3).map((tech, idx) => (
                                  <span key={idx} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', padding: '1px 6px', borderRadius: '4px' }}>
                                    {tech}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <strong style={{ color: '#f1f5f9' }}>{proj.student?.name || 'Unknown Student'}</strong>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{proj.student?.rollNumber || proj.student?.email}</div>
                              {teamMembersCount > 0 && (
                                <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '1px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '3px' }}>
                                  👥 +{teamMembersCount} Team Member{teamMembersCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </td>
                            <td>
                              <span>{proj.student?.academicYear || proj.academicYear || '4th Year'}</span>
                              <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Sec {proj.student?.section || proj.section || 'A'}</span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '130px' }}>
                                {repoUrl && (
                                  <a
                                    href={repoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      color: '#38bdf8',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      textDecoration: 'none',
                                      background: 'rgba(56, 189, 248, 0.12)',
                                      border: '1px solid rgba(56, 189, 248, 0.28)',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      width: 'fit-content'
                                    }}
                                    title={`Open GitHub Repository: ${rawRepoUrl}`}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                                    </svg>
                                    <span>GitHub Repo ↗</span>
                                  </a>
                                )}
                                {demoUrl && (
                                  <div style={{ display: 'inline-flex', gap: '4px', flexWrap: 'wrap' }}>
                                    <a
                                      href={demoUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        color: '#34d399',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        textDecoration: 'none',
                                        background: 'rgba(52, 211, 153, 0.12)',
                                        border: '1px solid rgba(52, 211, 153, 0.28)',
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                      }}
                                      title={`Open Live Demo: ${rawDemoUrl}`}
                                    >
                                      <span>🌐 Live Demo ↗</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => { setPreviewingLiveDemo(proj); setDemoDeviceMode('desktop'); }}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        color: '#a78bfa',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: 'rgba(167, 139, 250, 0.12)',
                                        border: '1px solid rgba(167, 139, 250, 0.3)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                      }}
                                      title="Interactive in-app live preview"
                                    >
                                      <span>👁️ Preview</span>
                                    </button>
                                  </div>
                                )}
                                {!repoUrl && !demoUrl && (
                                  <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>No links submitted</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                background: proj.status === 'approved' ? 'rgba(34, 197, 94, 0.15)' : proj.status === 'changes_requested' ? 'rgba(245, 158, 11, 0.15)' : proj.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                color: proj.status === 'approved' ? '#34d399' : proj.status === 'changes_requested' ? '#fbbf24' : proj.status === 'rejected' ? '#f87171' : '#38bdf8'
                              }}>
                                {proj.status ? proj.status.replace('_', ' ') : 'Draft'}
                              </span>
                            </td>
                            <td>
                              {proj.grade !== undefined && proj.grade !== null ? (
                                <span style={{
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: proj.grade >= 80 ? '#34d399' : proj.grade >= 60 ? '#38bdf8' : '#f87171'
                                }}>
                                  {proj.grade} / 100
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Ungraded</span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                                {proj.reviewedBy ? (proj.reviewedBy.name || 'Faculty') : '—'}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 10px', fontSize: '11px', color: '#c084fc', borderColor: 'rgba(192,132,252,0.4)', fontWeight: 600 }}
                                onClick={() => openGradingModalForProject(proj)}
                              >
                                📝 Grade &amp; Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                  No student projects found matching current criteria.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: LAB TASKS & PRACTICE */}
        {/* ========================================================================= */}
        {activeTab === 'labs' && (
          <div className="hod-tab-content">
            <div className="glass-card hod-card">
              <div className="hod-card-header">
                <div>
                  <h3>💻 Department Programming Labs, Experiments &amp; Practice Tasks</h3>
                  <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
                    Publish lab tasks with starter templates and automated test cases, and inspect student code submissions.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    className="form-control"
                    value={labYearFilter}
                    onChange={(e) => setLabYearFilter(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.45rem 0.8rem', fontSize: '13px' }}
                  >
                    <option value="ALL">All Batches</option>
                    <option value="4th Year">4th Year (Batch 2026)</option>
                    <option value="3rd Year">3rd Year (Batch 2027)</option>
                    <option value="2nd Year">2nd Year (Batch 2028)</option>
                    <option value="1st Year">1st Year (Batch 2029)</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 700, padding: '0.5rem 1rem', fontSize: '13px' }}
                    onClick={() => setShowAddLabModal(true)}
                  >
                    ➕ Create Lab Task
                  </button>
                </div>
              </div>

              {labsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Loading IT branch lab tasks...
                </div>
              ) : filteredLabs.length > 0 ? (
                <div className="hod-table-wrapper">
                  <table className="hod-table">
                    <thead>
                      <tr>
                        <th>Lab Task Title</th>
                        <th>Language</th>
                        <th>Target Batch &amp; Sec</th>
                        <th>Points &amp; Difficulty</th>
                        <th>Submissions / Passed</th>
                        <th>Author</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLabs.map(lab => (
                        <tr key={lab._id}>
                          <td>
                            <strong>{lab.title}</strong>
                            <div style={{ fontSize: '12px', color: '#94a3b8', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {lab.description}
                            </div>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>
                              {lab.language}
                            </span>
                          </td>
                          <td>
                            <span>{lab.academicYear || 'All'}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Sec: {lab.section || 'All'}</span>
                          </td>
                          <td>
                            <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '12px' }}>{lab.points || 10} pts</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'capitalize' }}>{lab.difficulty || 'medium'}</span>
                          </td>
                          <td>
                            <span style={{ color: '#34d399', fontWeight: 700 }}>
                              {lab.passedSubmissions || 0} / {lab.submissionsCount || 0} Passed
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
                              {lab.createdBy?.name || 'HOD IT'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}
                                onClick={() => handleOpenSubmissions(lab)}
                                title="View student submissions"
                              >
                                📊 Submissions ({lab.submissionsCount || 0})
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '11px', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                                onClick={() => handleDeleteLab(lab._id, lab.title)}
                                title="Delete lab task"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                  No lab tasks found. Click "Create Lab Task" to assign one to the department.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: ADD FACULTY TO IT BRANCH */}
        {/* ========================================================================= */}
        {showAddFacultyModal && (
          <div className="hod-modal-backdrop" onClick={() => setShowAddFacultyModal(false)}>
            <div className="hod-modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal-header">
                <h3>➕ Add / Assign Faculty Member to IT Branch</h3>
                <button type="button" onClick={() => setShowAddFacultyModal(false)}>✕</button>
              </div>

              <form onSubmit={handleAddFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Faculty Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={facultyForm.name}
                    onChange={(e) => setFacultyForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Dr. K. Radhika"
                  />
                </div>

                <div>
                  <label className="form-label">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-control"
                    value={facultyForm.email}
                    onChange={(e) => setFacultyForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. radhika.it@grietcollege.com"
                  />
                </div>

                <div>
                  <label className="form-label">Mobile Number (WhatsApp Enabled)</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={facultyForm.mobileNumber}
                    onChange={(e) => setFacultyForm(prev => ({ ...prev, mobileNumber: e.target.value, phone: e.target.value }))}
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">Assigned Batch / Year</label>
                    <select
                      className="form-control"
                      value={facultyForm.assignedYear}
                      onChange={(e) => setFacultyForm(prev => ({ ...prev, assignedYear: e.target.value }))}
                    >
                      <option value="2026">2026 (4th Year)</option>
                      <option value="2027">2027 (3rd Year)</option>
                      <option value="2028">2028 (2nd Year)</option>
                      <option value="2029">2029 (1st Year)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Assigned Section</label>
                    <select
                      className="form-control"
                      value={facultyForm.assignedSection}
                      onChange={(e) => setFacultyForm(prev => ({ ...prev, assignedSection: e.target.value }))}
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="All">All Sections</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Designation / Role</label>
                  <input
                    type="text"
                    className="form-control"
                    value={facultyForm.designation}
                    onChange={(e) => setFacultyForm(prev => ({ ...prev, designation: e.target.value }))}
                    placeholder="e.g. Associate Professor / Placement Coordinator"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddFacultyModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Add Faculty Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: EDIT FACULTY SCOPES */}
        {/* ========================================================================= */}
        {editingFaculty && (
          <div className="hod-modal-backdrop" onClick={() => setEditingFaculty(null)}>
            <div className="hod-modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal-header">
                <h3>⚙️ Edit Faculty Scope &amp; Info: {editingFaculty.name}</h3>
                <button type="button" onClick={() => setEditingFaculty(null)}>✕</button>
              </div>

              <form onSubmit={handleUpdateFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editFacultyForm.designation}
                    onChange={(e) => setEditFacultyForm(prev => ({ ...prev, designation: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editFacultyForm.mobileNumber}
                    onChange={(e) => setEditFacultyForm(prev => ({ ...prev, mobileNumber: e.target.value, phone: e.target.value }))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingFaculty(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Updating...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: EDIT STUDENT RECORD */}
        {/* ========================================================================= */}
        {editingStudent && (
          <div className="hod-modal-backdrop" onClick={() => setEditingStudent(null)}>
            <div className="hod-modal-window" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal-header">
                <h3>✏️ Update Student Record: {editingStudent.name}</h3>
                <button type="button" onClick={() => setEditingStudent(null)}>✕</button>
              </div>

              <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">Roll Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudentForm.rollNumber}
                      onChange={(e) => setEditStudentForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Section</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudentForm.section}
                      onChange={(e) => setEditStudentForm(prev => ({ ...prev, section: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">Academic Year</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editStudentForm.academicYear}
                      onChange={(e) => setEditStudentForm(prev => ({ ...prev, academicYear: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="form-label">Mobile Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={editStudentForm.mobileNumber}
                      onChange={(e) => setEditStudentForm(prev => ({ ...prev, mobileNumber: e.target.value }))}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '6px' }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#38bdf8' }}>Semester SGPA Record (Sem 1 to 8)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <div key={sem}>
                        <label style={{ fontSize: '11px', color: '#94a3b8' }}>Sem {sem}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="10"
                          className="form-control"
                          value={editStudentForm[`sgpaSem${sem}`]}
                          onChange={(e) => setEditStudentForm(prev => ({ ...prev, [`sgpaSem${sem}`]: e.target.value }))}
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingStudent(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Update Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: DETAILED STUDENT PROFILE */}
        {/* ========================================================================= */}
        {selectedStudentDetail && (
          <div className="hod-modal-backdrop" onClick={() => setSelectedStudentDetail(null)}>
            <div className="hod-modal-window" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>{selectedStudentDetail.name}</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {selectedStudentDetail.rollNumber} • {selectedStudentDetail.branch} • Sec {selectedStudentDetail.section} ({selectedStudentDetail.academicYear})
                  </span>
                </div>
                <button type="button" onClick={() => setSelectedStudentDetail(null)}>✕</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Academic Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>CGPA</span>
                    <strong style={{ fontSize: '1.25rem', color: '#38bdf8' }}>{selectedStudentDetail.cgpa}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>PRI Score</span>
                    <strong style={{ fontSize: '1.25rem', color: '#c084fc' }}>{selectedStudentDetail.readinessScore}%</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>LeetCode</span>
                    <strong style={{ fontSize: '1.25rem', color: '#fbbf24' }}>{selectedStudentDetail.leetcodeSolved || 0}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Placement Status</span>
                    <strong style={{ fontSize: '1rem', color: selectedStudentDetail.offersCount > 0 ? '#34d399' : '#38bdf8' }}>
                      {selectedStudentDetail.placementTag}
                    </strong>
                  </div>
                </div>

                {/* Contact Strip */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: '8px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>✉️ {selectedStudentDetail.email}</span>
                  <span>📱 Mobile: <strong>{selectedStudentDetail.mobileNumber || selectedStudentDetail.phone || 'N/A'}</strong></span>
                  {(selectedStudentDetail.mobileNumber || selectedStudentDetail.phone) && (
                    <a
                      href={`https://api.whatsapp.com/send?phone=${(selectedStudentDetail.mobileNumber || selectedStudentDetail.phone).replace(/\D/g, '')}&text=Hello%20${encodeURIComponent(selectedStudentDetail.name)}%2C%20from%20GRIET%20HOD%20Office`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        color: '#22c55e',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        textDecoration: 'none',
                        fontWeight: 700
                      }}
                    >
                      💬 WhatsApp Student
                    </a>
                  )}
                </div>

                {/* Semester SGPA Breakdown */}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#38bdf8' }}>Semester SGPA Record</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px', textAlign: 'center' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <div key={s} style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 2px', borderRadius: '4px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>S{s}</span>
                        <strong style={{ fontSize: '12px', color: selectedStudentDetail[`sgpaSem${s}`] > 0 ? '#f8fafc' : '#64748b' }}>
                          {selectedStudentDetail[`sgpaSem${s}`] || '-'}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Placement Offers */}
                {selectedStudentDetail.offers && selectedStudentDetail.offers.length > 0 && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '12px', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#34d399', fontSize: '13px' }}>🎉 Placement Offers Received</h4>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#f1f5f9', fontSize: '13px' }}>
                      {selectedStudentDetail.offers.map((off, idx) => (
                        <li key={idx}>{off}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* MODAL 5: ADD ACADEMIC SUBJECT */}
        {/* ========================================================================= */}
        {showAddSubjectModal && (
          <div className="hod-modal-backdrop" onClick={() => setShowAddSubjectModal(false)}>
            <div className="hod-modal-window" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal-header">
                <h3>📚 Add New Academic Subject (IT Branch)</h3>
                <button type="button" onClick={() => setShowAddSubjectModal(false)}>✕</button>
              </div>

              <form onSubmit={handleAddSubject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">Subject Name *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={subjectForm.name}
                      onChange={(e) => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Distributed Systems & Cloud Infrastructure"
                    />
                  </div>
                  <div>
                    <label className="form-label">Subject Code *</label>
                    <input
                      type="text"
                      required
                      className="form-control"
                      value={subjectForm.code}
                      onChange={(e) => setSubjectForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. IT402"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">Target Batch / Academic Year *</label>
                    <select
                      className="form-control"
                      value={subjectForm.academicYear}
                      onChange={(e) => setSubjectForm(prev => ({ ...prev, academicYear: e.target.value }))}
                    >
                      <option value="4th Year">4th Year (Batch 2026)</option>
                      <option value="3rd Year">3rd Year (Batch 2027)</option>
                      <option value="2nd Year">2nd Year (Batch 2028)</option>
                      <option value="1st Year">1st Year (Batch 2029)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Section</label>
                    <select
                      className="form-control"
                      value={subjectForm.section}
                      onChange={(e) => setSubjectForm(prev => ({ ...prev, section: e.target.value }))}
                    >
                      <option value="All">All Sections</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Assign Initially To (Optional)</label>
                  <select
                    className="form-control"
                    value={subjectForm.assignedTo}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                  >
                    <option value="">-- Leave Unassigned for now --</option>
                    <option value={user?._id}>🏛️ Assign to Me (HOD - {user?.name || 'Dr. Baimuthakala Ajay Kumar'})</option>
                    {faculties.map(fac => (
                      <option key={fac._id} value={fac._id}>
                        👨‍🏫 {fac.name} ({fac.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Course Description / Objectives</label>
                  <textarea
                    rows="3"
                    className="form-control"
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of syllabus, prerequisites, and learning outcomes..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddSubjectModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Creating...' : 'Create Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 6: ASSIGN TEACHER TO SUBJECT */}
        {/* ========================================================================= */}
        {assigningSubject && (
          <div className="hod-modal-backdrop" onClick={() => setAssigningSubject(null)}>
            <div className="hod-modal-window" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>👤 Assign Instructor: {assigningSubject.name}</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Code: {assigningSubject.code} • {assigningSubject.academicYear}</span>
                </div>
                <button type="button" onClick={() => setAssigningSubject(null)}>✕</button>
              </div>

              {/* Current Instructors */}
              <div style={{ margin: '10px 0 16px' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>Current Assigned Instructors</label>
                {assigningSubject.assignedTeachers && assigningSubject.assignedTeachers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {assigningSubject.assignedTeachers.map(tch => {
                      const isHod = tch.role === 'hod' || (user?._id && String(tch.id || tch._id) === String(user._id)) || (tch.name || '').toLowerCase().includes('ajay');
                      return (
                        <div
                          key={tch.id || tch._id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.04)',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.08)'
                          }}
                        >
                          <div>
                            <strong style={{ color: isHod ? '#fbbf24' : '#c084fc' }}>
                              {isHod ? '🏛️ HOD (You): ' : '👨‍🏫 '} {tch.name}
                            </strong>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{tch.email}</div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#f87171', fontSize: '11px', padding: '2px 8px' }}
                            onClick={() => handleUnassignTeacher(assigningSubject._id, tch.id || tch._id)}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0' }}>No instructors currently assigned to this subject.</p>
                )}
              </div>

              {/* Assign New Instructor */}
              <form onSubmit={handleAssignTeacher} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                <div>
                  <label className="form-label">Select Instructor to Assign *</label>
                  <select
                    className="form-control"
                    required
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                  >
                    <option value="">-- Choose Instructor --</option>
                    <option value={user?._id}>🏛️ Assign to Me (HOD - {user?.name || 'Dr. Baimuthakala Ajay Kumar'})</option>
                    {faculties.map(fac => (
                      <option key={fac._id} value={fac._id}>
                        👨‍🏫 {fac.name} ({fac.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setAssigningSubject(null)}>
                    Done
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading || !selectedTeacherId}>
                    {actionLoading ? 'Assigning...' : 'Assign to Subject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 7: GRADE & EVALUATE PROJECT */}
        {/* ========================================================================= */}
        {gradingProject && (() => {
          const { repoUrl, rawRepoUrl, demoUrl, rawDemoUrl } = getProjectLinks(gradingProject);
          const techList = (gradingProject.technologies && gradingProject.technologies.length > 0 ? gradingProject.technologies : gradingProject.techStack || []);

          return (
            <div className="hod-modal-backdrop" onClick={() => setGradingProject(null)}>
              <div className="hod-modal-window" style={{ maxWidth: '880px', width: '92vw' }} onClick={(e) => e.stopPropagation()}>
                <div className="hod-modal-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0 }}>📝 Evaluate Project: {gradingProject.title}</h3>
                      {gradingProject.domain && (
                        <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {gradingProject.domain}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                      Lead Student: <strong>{gradingProject.student?.name}</strong> ({gradingProject.student?.rollNumber || gradingProject.student?.email}) • Branch: {gradingProject.branch || gradingProject.student?.branch || 'IT'} • Section {gradingProject.section || gradingProject.student?.section || 'A'}
                    </span>
                  </div>
                  <button type="button" onClick={() => setGradingProject(null)}>✕</button>
                </div>

                {/* Quick Inspection Toolbar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>Direct Inspection:</span>
                    {repoUrl ? (
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#38bdf8',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          padding: '5px 10px',
                          borderRadius: '6px'
                        }}
                        title={`Open GitHub Repository: ${rawRepoUrl}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        <span>GitHub Repo ↗</span>
                      </a>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>No GitHub repo</span>
                    )}

                    {demoUrl ? (
                      <a
                        href={demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#34d399',
                          fontSize: '12px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          background: 'rgba(52, 211, 153, 0.15)',
                          border: '1px solid rgba(52, 211, 153, 0.3)',
                          padding: '5px 10px',
                          borderRadius: '6px'
                        }}
                        title={`Open Live Demo: ${rawDemoUrl}`}
                      >
                        <span>🌐 Open Live Demo ↗</span>
                      </a>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>No Live Demo URL</span>
                    )}
                  </div>

                  {demoUrl && (
                    <button
                      type="button"
                      onClick={() => setInModalPreviewOpen(prev => !prev)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: inModalPreviewOpen ? '#6366f1' : 'rgba(99, 102, 241, 0.18)',
                        color: '#ffffff',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        padding: '5px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <span>{inModalPreviewOpen ? '✕ Hide Live Demo Preview' : '👁️ Preview Live Demo Inside Modal'}</span>
                    </button>
                  )}
                </div>

                {/* Embedded Live Preview (Collapsible) */}
                {inModalPreviewOpen && demoUrl && (
                  <div style={{
                    marginBottom: '16px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    background: '#090d16'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      borderBottom: '1px solid rgba(255,255,255,0.08)',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>URL:</span>
                        <code style={{ fontSize: '11.5px', color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {rawDemoUrl}
                        </code>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setDemoKey(k => k + 1)}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#e2e8f0',
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          🔄 Reload
                        </button>
                        <a
                          href={demoUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: '#e2e8f0',
                            padding: '3px 8px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            textDecoration: 'none'
                          }}
                        >
                          ↗ Open in Tab
                        </a>
                      </div>
                    </div>
                    <iframe
                      key={demoKey}
                      src={demoUrl}
                      title="Project In-Modal Live Demo"
                      style={{
                        width: '100%',
                        height: '380px',
                        border: 'none',
                        background: '#ffffff',
                        display: 'block'
                      }}
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                )}

                {/* Project Description & Tech Stack */}
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {techList.map((t, idx) => (
                      <span key={idx} style={{ fontSize: '11px', background: 'rgba(99,102,241,0.15)', color: '#c7d2fe', padding: '2px 8px', borderRadius: '4px' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {gradingProject.description || 'No description provided by the student.'}
                  </p>
                </div>

                {/* Milestones if present */}
                {Array.isArray(gradingProject.milestones) && gradingProject.milestones.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '12px', color: '#94a3b8' }}>Project Milestones Track:</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {gradingProject.milestones.map((m, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>{m.title}</span>
                          <span style={{
                            marginLeft: '8px',
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            background: m.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : m.status === 'in_progress' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.1)',
                            color: m.status === 'completed' ? '#34d399' : m.status === 'in_progress' ? '#38bdf8' : '#94a3b8'
                          }}>
                            {m.status ? m.status.replace('_', ' ') : 'planned'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Members Individual Grading (if present) */}
                {Array.isArray(gradeForm.teamMembers) && gradeForm.teamMembers.length > 0 && (
                  <div style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    marginBottom: '16px'
                  }}>
                    <label className="form-label" style={{ fontSize: '13px', color: '#818cf8', fontWeight: 700, margin: '0 0 8px 0', display: 'block' }}>
                      👥 Team Members Individual Grades &amp; Evaluation:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {gradeForm.teamMembers.map((member, idx) => (
                        <div key={idx} style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 100px 1.5fr',
                          gap: '10px',
                          alignItems: 'center',
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '6px'
                        }}>
                          <div>
                            <strong style={{ fontSize: '13px', color: '#f8fafc' }}>{member.name}</strong>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {member.rollNumber ? `${member.rollNumber} • ` : ''}{member.role || 'Member'}
                            </div>
                            {member.contribution && (
                              <div style={{ fontSize: '10.5px', color: '#cbd5e1', fontStyle: 'italic', marginTop: '2px' }}>
                                Contribution: {member.contribution}
                              </div>
                            )}
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="form-control"
                              placeholder="Score"
                              value={member.grade}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGradeForm(prev => {
                                  const updated = [...prev.teamMembers];
                                  updated[idx] = { ...updated[idx], grade: val };
                                  return { ...prev, teamMembers: updated };
                                });
                              }}
                              style={{ padding: '0.4rem 0.6rem', fontSize: '12px' }}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Member specific remarks..."
                              value={member.feedback || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGradeForm(prev => {
                                  const updated = [...prev.teamMembers];
                                  updated[idx] = { ...updated[idx], feedback: val };
                                  return { ...prev, teamMembers: updated };
                                });
                              }}
                              style={{ padding: '0.4rem 0.6rem', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleGradeProjectSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label className="form-label">Overall Project Score (out of 100) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        className="form-control"
                        value={gradeForm.grade}
                        onChange={(e) => setGradeForm(prev => ({ ...prev, grade: e.target.value }))}
                        style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399' }}
                      />
                    </div>
                    <div>
                      <label className="form-label">Lead Student Score (out of 100)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="form-control"
                        value={gradeForm.leadStudentGrade}
                        onChange={(e) => setGradeForm(prev => ({ ...prev, leadStudentGrade: e.target.value }))}
                        style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8' }}
                      />
                    </div>
                    <div>
                      <label className="form-label">Review Status *</label>
                      <select
                        className="form-control"
                        value={gradeForm.status}
                        onChange={(e) => setGradeForm(prev => ({ ...prev, status: e.target.value }))}
                        style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem' }}
                      >
                        <option value="approved">✅ Approved</option>
                        <option value="under_review">🔍 Under Review</option>
                        <option value="changes_requested">⚠️ Changes Requested</option>
                        <option value="rejected">❌ Rejected</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">HOD Architectural &amp; Code Quality Suggestions</label>
                    <textarea
                      rows="2"
                      className="form-control"
                      value={gradeForm.codeSuggestions}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, codeSuggestions: e.target.value }))}
                      placeholder="e.g. Optimize state management, split monolithic controllers, add unit tests with Jest, use HTTPS for production deployment..."
                      style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label className="form-label">HOD Feedback &amp; Recommendations</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      value={gradeForm.feedback}
                      onChange={(e) => setGradeForm(prev => ({ ...prev, feedback: e.target.value }))}
                      placeholder="Provide constructive evaluation on system architecture, test coverage, project execution, and presentation..."
                      style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#fff', padding: '0.65rem', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setGradingProject(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                      {actionLoading ? 'Saving...' : '💾 Save Grade & Notify Student'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* MODAL 7B: DEDICATED LIVE DEMO INSPECTOR */}
        {/* ========================================================================= */}
        {previewingLiveDemo && (() => {
          const { repoUrl, rawRepoUrl, demoUrl, rawDemoUrl } = getProjectLinks(previewingLiveDemo);

          return (
            <div className="hod-modal-backdrop" onClick={() => setPreviewingLiveDemo(null)}>
              <div className="hod-modal-window preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="hod-modal-header" style={{ marginBottom: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0 }}>🌐 Live Demo Inspector: {previewingLiveDemo.title}</h3>
                      {previewingLiveDemo.domain && (
                        <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {previewingLiveDemo.domain}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Submitted by: <strong>{previewingLiveDemo.student?.name}</strong> ({previewingLiveDemo.student?.rollNumber || previewingLiveDemo.student?.email}) • Branch: {previewingLiveDemo.branch || previewingLiveDemo.student?.branch || 'IT'}
                    </span>
                  </div>
                  <button type="button" onClick={() => setPreviewingLiveDemo(null)}>✕</button>
                </div>

                {/* Toolbar */}
                <div className="demo-toolbar">
                  <div className="demo-url-bar" title={rawDemoUrl}>
                    <span style={{ color: '#94a3b8' }}>🔒 URL:</span>
                    <span>{rawDemoUrl}</span>
                  </div>

                  {/* Device Switcher */}
                  <div className="demo-viewport-toggle">
                    <button
                      type="button"
                      className={`demo-viewport-btn ${demoDeviceMode === 'desktop' ? 'active' : ''}`}
                      onClick={() => setDemoDeviceMode('desktop')}
                    >
                      💻 Desktop
                    </button>
                    <button
                      type="button"
                      className={`demo-viewport-btn ${demoDeviceMode === 'tablet' ? 'active' : ''}`}
                      onClick={() => setDemoDeviceMode('tablet')}
                    >
                      📱 Tablet (768px)
                    </button>
                    <button
                      type="button"
                      className={`demo-viewport-btn ${demoDeviceMode === 'mobile' ? 'active' : ''}`}
                      onClick={() => setDemoDeviceMode('mobile')}
                    >
                      📱 Mobile (375px)
                    </button>
                  </div>

                  {/* Frame Action Controls */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="demo-viewport-btn"
                      onClick={() => setDemoKey(k => k + 1)}
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                      title="Reload application frame"
                    >
                      🔄 Reload
                    </button>
                    {demoUrl && (
                      <a
                        href={demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="demo-viewport-btn"
                        style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', textDecoration: 'none' }}
                        title="Open in external browser window"
                      >
                        ↗ Open External
                      </a>
                    )}
                    {repoUrl && (
                      <a
                        href={repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="demo-viewport-btn"
                        style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', textDecoration: 'none' }}
                        title="Open GitHub code repository"
                      >
                        🐙 GitHub Repo
                      </a>
                    )}
                  </div>
                </div>

                {/* Device Frame */}
                <div className="demo-iframe-container">
                  <div
                    className="demo-iframe-wrapper"
                    style={{
                      width: demoDeviceMode === 'mobile' ? '375px' : demoDeviceMode === 'tablet' ? '768px' : '100%'
                    }}
                  >
                    {demoUrl ? (
                      <iframe
                        key={demoKey}
                        src={demoUrl}
                        title="Student Live Project Demo"
                        className="demo-iframe"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                        No live demo URL provided for this project.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    💡 Viewing in responsive container: <strong>{demoDeviceMode.toUpperCase()}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPreviewingLiveDemo(null)}
                    >
                      Close Inspector
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        const proj = previewingLiveDemo;
                        setPreviewingLiveDemo(null);
                        openGradingModalForProject(proj);
                      }}
                    >
                      📝 Grade This Project Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* MODAL 8: CREATE LAB TASK */}
        {/* ========================================================================= */}
        {showAddLabModal && (
          <div className="hod-modal-backdrop" onClick={() => setShowAddLabModal(false)}>
            <div className="hod-modal-window" style={{ maxWidth: '680px', maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal-header">
                <h3>💻 Create Department Lab Practice Task</h3>
                <button type="button" onClick={() => setShowAddLabModal(false)}>✕</button>
              </div>

              <form onSubmit={handleCreateLab} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Task Title *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={labForm.title}
                    onChange={(e) => setLabForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Implement Dijkstra's Shortest Path Algorithm"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div>
                    <label className="form-label">Language</label>
                    <select
                      className="form-control"
                      value={labForm.language}
                      onChange={(e) => setLabForm(prev => ({ ...prev, language: e.target.value }))}
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Batch / Year</label>
                    <select
                      className="form-control"
                      value={labForm.academicYear}
                      onChange={(e) => setLabForm(prev => ({ ...prev, academicYear: e.target.value }))}
                    >
                      <option value="4th Year">4th Year (2026)</option>
                      <option value="3rd Year">3rd Year (2027)</option>
                      <option value="2nd Year">2nd Year (2028)</option>
                      <option value="1st Year">1st Year (2029)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Section</label>
                    <select
                      className="form-control"
                      value={labForm.section}
                      onChange={(e) => setLabForm(prev => ({ ...prev, section: e.target.value }))}
                    >
                      <option value="All">All Sections</option>
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label">Difficulty</label>
                    <select
                      className="form-control"
                      value={labForm.difficulty}
                      onChange={(e) => setLabForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Points / Score</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={labForm.points}
                      onChange={(e) => setLabForm(prev => ({ ...prev, points: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Task Description &amp; Problem Statement *</label>
                  <textarea
                    rows="4"
                    required
                    className="form-control"
                    value={labForm.description}
                    onChange={(e) => setLabForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="State the problem clearly, input/output specifications, time complexity limits..."
                  />
                </div>

                <div>
                  <label className="form-label">Starter Code Template</label>
                  <textarea
                    rows="4"
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                    value={labForm.starterCode}
                    onChange={(e) => setLabForm(prev => ({ ...prev, starterCode: e.target.value }))}
                  />
                </div>

                {/* Test Cases */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>Automated Test Cases</label>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '2px 8px' }}
                      onClick={() => setLabForm(prev => ({
                        ...prev,
                        testCases: [...prev.testCases, { input: '', output: '', isHidden: false }]
                      }))}
                    >
                      ➕ Add Case
                    </button>
                  </div>

                  {labForm.testCases.map((tc, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Input (e.g. 5)"
                        className="form-control"
                        value={tc.input}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLabForm(prev => {
                            const updated = [...prev.testCases];
                            updated[idx].input = val;
                            return { ...prev, testCases: updated };
                          });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Expected Output (e.g. 120)"
                        className="form-control"
                        value={tc.output}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLabForm(prev => {
                            const updated = [...prev.testCases];
                            updated[idx].output = val;
                            return { ...prev, testCases: updated };
                          });
                        }}
                      />
                      {labForm.testCases.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#f87171', padding: '4px 8px' }}
                          onClick={() => {
                            setLabForm(prev => ({
                              ...prev,
                              testCases: prev.testCases.filter((_, i) => i !== idx)
                            }));
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddLabModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Publishing...' : '🚀 Publish Lab Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 9: VIEW LAB SUBMISSIONS */}
        {/* ========================================================================= */}
        {viewingSubmissionsTask && (
          <div className="hod-modal-backdrop" onClick={() => setViewingSubmissionsTask(null)}>
            <div className="hod-modal-window" style={{ maxWidth: '780px', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
              <div className="hod-modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>📊 Student Submissions: {viewingSubmissionsTask.title}</h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Language: {viewingSubmissionsTask.language?.toUpperCase()} • Max Points: {viewingSubmissionsTask.points}
                  </span>
                </div>
                <button type="button" onClick={() => setViewingSubmissionsTask(null)}>✕</button>
              </div>

              {submissionsLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  Loading submissions...
                </div>
              ) : submissionsList.length > 0 ? (
                <div className="hod-table-wrapper" style={{ marginTop: '10px' }}>
                  <table className="hod-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Roll Number</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissionsList.map(sub => (
                        <tr key={sub._id}>
                          <td>
                            <strong>{sub.student?.name || 'Student'}</strong>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{sub.student?.email}</div>
                          </td>
                          <td>
                            <strong style={{ color: '#38bdf8' }}>{sub.student?.rollNumber || 'N/A'}</strong>
                          </td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: sub.status === 'passed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: sub.status === 'passed' ? '#34d399' : '#f87171',
                              textTransform: 'uppercase'
                            }}>
                              {sub.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: '#fbbf24' }}>
                              {sub.score !== undefined ? sub.score : (sub.status === 'passed' ? viewingSubmissionsTask.points : 0)} pts
                            </span>
                          </td>
                          <td style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                  No student submissions received for this lab task yet.
                </p>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default HODDashboard;
