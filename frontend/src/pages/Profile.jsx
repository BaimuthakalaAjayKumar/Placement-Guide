import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './Profile.css';

const INSTITUTIONAL_BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'CSD', 'CSM', 'CSBS', 'AIDS'];
const INSTITUTIONAL_SECTIONS = ['A', 'B', 'C', 'D'];
const INSTITUTIONAL_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export const toOrdinalYear = (val) => {
  if (!val) return 'N/A';
  const s = String(val).trim();
  if (/^1(st)?(\s*year)?$/i.test(s) || s === 'I') return '1st Year';
  if (/^2(nd)?(\s*year)?$/i.test(s) || s === 'II') return '2nd Year';
  if (/^3(rd)?(\s*year)?$/i.test(s) || s === 'III') return '3rd Year';
  if (/^4(th)?(\s*year)?$/i.test(s) || s === 'IV' || /final/i.test(s)) return '4th Year';
  if (s === '2026') return '4th Year';
  if (s === '2027') return '3rd Year';
  if (s === '2028') return '2nd Year';
  if (s === '2029') return '1st Year';
  return s.toLowerCase().includes('year') ? s : `${s} Year`;
};

export const getAcademicSession = (u) => {
  if (u?.academicSession) return u.academicSession;
  const s = String(u?.academicYear || u?.year || '').trim();
  if (/20\d\d[-–]20\d\d/.test(s)) return s;
  return '2026–2027';
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateProfile, uploadProfilePhoto, removeProfilePhoto } = useAuth();
  const permissions = usePermission();

  // Active Tab: 'personal' | 'professional' | 'institutional' | 'security'
  const [activeTab, setActiveTab] = useState('personal');

  // Role eligibility for profile photos: ALL roles EXCEPT librarian & front_office
  const isPhotoEligible = Boolean(user?.role && user.role !== 'librarian' && user.role !== 'front_office');

  // Photo modal states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoSubMode, setPhotoSubMode] = useState('choose'); // 'choose' | 'camera' | 'preview'
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [isPhotoSaving, setIsPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Refs for camera and file inputs
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const mobileCameraInputRef = React.useRef(null);
  const objectUrlRef = React.useRef(null);

  const revokeSafeObjectUrl = () => {
    if (objectUrlRef.current) {
      if (typeof window !== 'undefined' && window.URL && typeof window.URL.revokeObjectURL === 'function') {
        try {
          window.URL.revokeObjectURL(objectUrlRef.current);
        } catch (e) {
          console.warn('Error revoking object URL:', e);
        }
      }
      objectUrlRef.current = null;
    }
  };

  // Role detection
  const isDirectorRole = permissions.isDirector || permissions.isCampusAdmin || user?.role === 'director' || user?.role === 'campus_admin';
  const isPrincipalRole = permissions.isPrincipal || user?.role === 'principal';
  const isHODRole = permissions.isHOD || user?.role === 'hod';
  const isFacultyRole = permissions.isFaculty || (user?.role === 'faculty' && !isHODRole);
  const isSuperAdminRole = permissions.isSuperAdmin || user?.role === 'super_admin' || (user?.role === 'admin' && !user?.campusId);
  const isStudentRole = permissions.isStudent || user?.role === 'student';

  // Camera Management Helpers
  const handleStartCamera = async () => {
    setPhotoError('');
    setCameraError('');
    setPhotoSubMode('camera');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser. Please use the "Upload File" option.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' }
      });
      setCameraStream(stream);
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser or use file upload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Please upload an image file instead.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to start camera stream'}. Please upload an image file instead.`);
      }
    }
  };

  const handleStopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const minDim = Math.min(video.videoWidth || 480, video.videoHeight || 480);
    const startX = ((video.videoWidth || 480) - minDim) / 2;
    const startY = ((video.videoHeight || 480) - minDim) / 2;

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 480, 480);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    handleStopCamera();
    revokeSafeObjectUrl();
    setPreviewImage(dataUrl);
    setSelectedPhotoFile(null);
    setPhotoSubMode('preview');
  };

  const handleRetake = () => {
    revokeSafeObjectUrl();
    setPreviewImage(null);
    setSelectedPhotoFile(null);
    handleStartCamera();
  };

  const handleRetakeOrChooseAnother = () => {
    if (selectedPhotoFile) {
      fileInputRef.current?.click();
    } else {
      handleRetake();
    }
  };

  const handleFileChange = (e) => {
    setPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file later triggers onChange again
    e.target.value = '';

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!file.type || !validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      setShowPhotoModal(true);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size exceeds the 5MB limit. Please choose a smaller image.');
      setShowPhotoModal(true);
      return;
    }

    handleStopCamera();
    revokeSafeObjectUrl();

    setSelectedPhotoFile(file);
    setShowPhotoModal(true);
    setPhotoSubMode('preview');

    if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
      try {
        const objUrl = window.URL.createObjectURL(file);
        objectUrlRef.current = objUrl;
        setPreviewImage(objUrl);
        return;
      } catch (err) {
        console.warn('URL.createObjectURL failed, falling back to FileReader:', err);
      }
    }

    // Fallback if URL.createObjectURL is unavailable
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!previewImage && !selectedPhotoFile) return;
    setIsPhotoSaving(true);
    setPhotoError('');

    try {
      let res;
      if (selectedPhotoFile && typeof uploadProfilePhoto === 'function') {
        res = await uploadProfilePhoto(selectedPhotoFile, true);
      } else if (previewImage && typeof uploadProfilePhoto === 'function') {
        res = await uploadProfilePhoto(previewImage, false);
      } else {
        throw new Error('Upload function is not initialized');
      }

      if (res && res.success) {
        setSuccessMsg('Profile photo updated successfully!');
        handleClosePhotoModal();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setPhotoError(res?.error || 'Failed to save profile photo.');
      }
    } catch (err) {
      setPhotoError(err.message || 'Error uploading profile photo.');
    } finally {
      setIsPhotoSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    setIsPhotoSaving(true);
    try {
      if (typeof removeProfilePhoto === 'function') {
        const res = await removeProfilePhoto();
        if (res && res.success) {
          setSuccessMsg('Profile photo removed.');
          handleClosePhotoModal();
          setTimeout(() => setSuccessMsg(''), 4000);
        } else {
          setPhotoError(res?.error || 'Failed to remove profile photo.');
        }
      }
    } catch (err) {
      setPhotoError(err.message || 'Error removing photo.');
    } finally {
      setIsPhotoSaving(false);
    }
  };

  const handleClosePhotoModal = () => {
    handleStopCamera();
    revokeSafeObjectUrl();
    setShowPhotoModal(false);
    setPhotoSubMode('choose');
    setPreviewImage(null);
    setSelectedPhotoFile(null);
    setCameraError('');
    setPhotoError('');
  };

  useEffect(() => {
    return () => {
      handleStopCamera();
      revokeSafeObjectUrl();
    };
  }, []);

  useEffect(() => {
    if (photoSubMode === 'camera' && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch(e => console.warn('Video playback warning:', e));
    }
  }, [photoSubMode, cameraStream]);

  // Role metadata helper
  const roleMeta = useMemo(() => {
    if (isSuperAdminRole) {
      return {
        key: 'super_admin',
        title: 'Super Administrator',
        shortBadge: 'SUPER ADMIN',
        badgeColor: '#ef4444',
        bgGradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
        defaultDesignation: 'Platform Super Administrator',
        defaultAuthority: 'Platform Governance Council',
        defaultScope: 'System-Wide Infrastructure & Multi-Campus Governance',
        responsibilities: user?.institutionalResponsibilities?.length > 0 ? user.institutionalResponsibilities : [
          'Enterprise Platform Security & Identity Governance',
          'Cross-Campus Tenant Isolation & Integrity Verification',
          'System-Wide Audit Log Oversight & Anomaly Telemetry',
          'Platform Incident Response & High Availability Compliance'
        ]
      };
    }
    if (isDirectorRole) {
      return {
        key: 'director',
        title: 'Executive Director',
        shortBadge: 'DIRECTOR',
        badgeColor: '#8b5cf6',
        bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        defaultDesignation: 'Executive Director',
        defaultAuthority: 'Governing Body / Board of Trustees',
        defaultScope: 'All Campus Departments & Institutional Faculties',
        responsibilities: user?.institutionalResponsibilities?.length > 0 ? user.institutionalResponsibilities : [
          'Strategic Institutional Governance & Long-Term Planning',
          'Accreditation & Regulatory Compliance (UGC / AICTE / NBA / NAAC)',
          'Executive Leadership, Budget & Resource Allocation',
          'Industry Partnerships, Campus Expansion & High-Level Policy'
        ]
      };
    }
    if (isPrincipalRole) {
      return {
        key: 'principal',
        title: 'Institutional Principal',
        shortBadge: 'PRINCIPAL',
        badgeColor: '#06b6d4',
        bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
        defaultDesignation: 'Institutional Principal',
        defaultAuthority: 'Executive Director',
        defaultScope: 'All Academic Departments & Examination Cells',
        responsibilities: user?.institutionalResponsibilities?.length > 0 ? user.institutionalResponsibilities : [
          'Campus Academic Administration & Faculty Roster Oversight',
          'Academic Integrity & Examination Compliance Standards',
          'Inter-Departmental Curriculum Coordination & Academic Audits',
          'Campus Discipline, Student Affairs & Placement Alignment'
        ]
      };
    }
    if (isHODRole) {
      return {
        key: 'hod',
        title: 'Head of Department',
        shortBadge: 'HOD',
        badgeColor: '#f59e0b',
        bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
        defaultDesignation: `Head of Department — ${user?.departmentId?.name || user?.departmentName || user?.branch || 'Information Technology'}`,
        defaultAuthority: 'Institutional Principal',
        defaultScope: `${user?.departmentId?.name || user?.departmentName || user?.branch || 'Department'}-Wide Academic & Laboratory Scopes`,
        responsibilities: user?.institutionalResponsibilities?.length > 0 ? user.institutionalResponsibilities : [
          'Department Curriculum Delivery & Faculty Workload Allocation',
          'Laboratory Infrastructure, Equipment & Safety Governance',
          'Student Academic Grievances & Attendance Review',
          'Department Electives, Technical Seminars & Research Mentorship'
        ]
      };
    }
    if (isFacultyRole) {
      return {
        key: 'faculty',
        title: 'Faculty Member',
        shortBadge: 'FACULTY',
        badgeColor: '#3b82f6',
        bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
        defaultDesignation: user?.designation || 'Assistant Professor',
        defaultAuthority: 'Head of Department (HOD)',
        defaultScope: user?.managedScopes?.length > 0
          ? `${user.managedScopes.length} Assigned Classroom Sections`
          : 'General Department Faculty Scope',
        responsibilities: user?.teachingResponsibilities?.length > 0 ? user.teachingResponsibilities : [
          'Curriculum Instruction & Laboratory Supervision',
          'Daily Attendance Telemetry & Continuous Assessment',
          'Course Material Preparation & Mid-Term Exam Evaluation'
        ]
      };
    }
    if (user?.role === 'front_office') {
      return {
        key: 'front_office',
        title: 'Front Office & Security Operations',
        shortBadge: 'FRONT OFFICE',
        badgeColor: '#10b981',
        bgGradient: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
        defaultDesignation: 'Campus Front Office & Security Desk Officer',
        defaultAuthority: 'Campus Administrator & Security Supervisor',
        defaultScope: `${user?.campusName || user?.campusId?.name || 'Assigned Campus'} Gate & Reception`,
        responsibilities: [
          'Campus Visitor Access Registration & Verification',
          'Physical Pass Generation & RFID Gate Telemetry',
          'Security Incident Logging & Gate Clearance Enforcement'
        ]
      };
    }
    if (user?.role === 'librarian') {
      return {
        key: 'librarian',
        title: 'Central Library Operations',
        shortBadge: 'LIBRARIAN',
        badgeColor: '#8b5cf6',
        bgGradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        defaultDesignation: 'Campus Circulation & Repository Librarian',
        defaultAuthority: 'Institutional Principal',
        defaultScope: `${user?.campusName || user?.campusId?.name || 'Assigned Campus'} Central Library`,
        responsibilities: [
          'Central Library Book Cataloging & Circulation Desk Operations',
          'Student & Faculty Book Issue, Return, and Fine Telemetry',
          'Digital Repository & Periodical Subscription Management'
        ]
      };
    }
    if (user?.role === 'recruiter') {
      return {
        key: 'recruiter',
        title: 'Campus Recruiter',
        shortBadge: 'RECRUITER',
        badgeColor: '#3b82f6',
        bgGradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
        defaultDesignation: user?.companyName ? `Corporate Recruiter — ${user.companyName}` : 'Campus Hiring Partner',
        defaultAuthority: 'Training & Placement Cell',
        defaultScope: 'Placement Drives & Interview Evaluation',
        responsibilities: [
          'Campus Drive Registration & Candidate Shortlisting',
          'Technical & HR Interview Evaluation',
          'Placement Offer Dispatch & Coordination'
        ]
      };
    }
    return {
      key: 'student',
      title: 'Student Profile',
      shortBadge: 'STUDENT',
      badgeColor: '#10b981',
      bgGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      defaultDesignation: user?.targetRole || 'Software Engineering Scholar',
      defaultAuthority: 'Faculty Advisor & Head of Department',
      defaultScope: `Enrolled: ${user?.branch || 'Engineering'}, Sec ${user?.section || 'A'}`,
      responsibilities: []
    };
  }, [isSuperAdminRole, isDirectorRole, isPrincipalRole, isHODRole, isFacultyRole, user]);

  // Profile completion calculation based strictly on applicable, available fields
  const completionStats = useMemo(() => {
    if (!user) return { percentage: 0, missing: [], completedCount: 0, totalCount: 0 };
    let checklist = [];

    if (roleMeta.key === 'super_admin') {
      checklist = [
        { name: 'Full Name', value: user.name },
        { name: 'Official Email', value: user.email },
        { name: 'Contact Phone', value: user.mobileNumber || user.phone },
        { name: 'Office Location', value: user.officeLocation },
        { name: 'Administrative Bio', value: user.bio },
        { name: 'Profile Photo', value: user.profilePicture }
      ];
    } else if (roleMeta.key === 'director' || roleMeta.key === 'principal') {
      checklist = [
        { name: 'Full Name', value: user.name },
        { name: 'Official Email', value: user.email },
        { name: 'Contact Phone', value: user.mobileNumber || user.phone },
        { name: 'Office Location', value: user.officeLocation },
        { name: 'Qualifications', value: user.qualifications },
        { name: 'Specialization', value: user.specialization },
        { name: 'Experience', value: user.experience || (user.experienceYears ? `${user.experienceYears} Years` : '') },
        { name: 'Profile Bio', value: user.bio },
        { name: 'Profile Photo', value: user.profilePicture }
      ];
    } else if (roleMeta.key === 'hod') {
      checklist = [
        { name: 'Full Name', value: user.name },
        { name: 'Official Email', value: user.email },
        { name: 'Contact Phone', value: user.mobileNumber || user.phone },
        { name: 'Office Location', value: user.officeLocation },
        { name: 'Department', value: user.departmentId || user.departmentName || user.branch },
        { name: 'Qualifications', value: user.qualifications },
        { name: 'Specialization', value: user.specialization },
        { name: 'Experience', value: user.experience || (user.experienceYears ? `${user.experienceYears} Years` : '') },
        { name: 'Profile Bio', value: user.bio },
        { name: 'Profile Photo', value: user.profilePicture }
      ];
    } else if (roleMeta.key === 'faculty') {
      checklist = [
        { name: 'Full Name', value: user.name },
        { name: 'Official Email', value: user.email },
        { name: 'Contact Phone', value: user.mobileNumber || user.phone },
        { name: 'Office Location', value: user.officeLocation },
        { name: 'Department', value: user.departmentId || user.departmentName || user.branch },
        { name: 'Qualifications', value: user.qualifications },
        { name: 'Specialization', value: user.specialization },
        { name: 'Experience', value: user.experience || (user.experienceYears ? `${user.experienceYears} Years` : '') },
        { name: 'Teaching Scopes', value: user.managedScopes?.length > 0 },
        { name: 'Profile Bio', value: user.bio },
        { name: 'Profile Photo', value: user.profilePicture }
      ];
    } else if (roleMeta.key === 'front_office' || roleMeta.key === 'librarian') {
      checklist = [
        { name: 'Full Name', value: user.name },
        { name: 'Official Email', value: user.email },
        { name: 'Contact Phone', value: user.mobileNumber || user.phone },
        { name: 'Campus Assignment', value: user.campusId || user.campusName },
        { name: 'Role Designation', value: user.role }
      ];
    } else {
      checklist = [
        { name: 'Full Name', value: user.name },
        { name: 'Roll Number', value: user.rollNumber },
        { name: 'Contact Phone', value: user.mobileNumber || user.phone },
        { name: 'Branch', value: user.branch },
        { name: 'Section', value: user.section },
        { name: 'Target Role', value: user.targetRole },
        { name: 'Technical Skills', value: user.skills?.length > 0 },
        { name: 'Profile Bio', value: user.bio },
        { name: 'Profile Photo', value: user.profilePicture },
        { name: 'Coding Handle (LeetCode)', value: user.leetcodeUsername }
      ];
    }

    const completed = checklist.filter(item => {
      if (typeof item.value === 'boolean') return item.value;
      return item.value !== undefined && item.value !== null && String(item.value).trim() !== '';
    });

    const missing = checklist.filter(item => {
      if (typeof item.value === 'boolean') return !item.value;
      return item.value === undefined || item.value === null || String(item.value).trim() === '';
    }).map(item => item.name);

    const percentage = Math.round((completed.length / checklist.length) * 100);
    return { percentage, missing, completedCount: completed.length, totalCount: checklist.length };
  }, [user, roleMeta]);

  // Editing state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    mobileNumber: '',
    officeLocation: '',
    bio: '',
    qualifications: '',
    specialization: '',
    experience: '',
    experienceYears: '',
    profilePicture: '',
    targetRole: '',
    skillsText: '',
    leetcodeUsername: '',
    codeforcesUsername: '',
    codechefUsername: '',
    hackerrankUsername: '',
    inAppAlerts: true,
    emailAlerts: true,
    dailyDigest: false
  });

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  // Student specific scope request and achievements states
  const [achievementsData, setAchievementsData] = useState(null);
  const [pendingScopeRequest, setPendingScopeRequest] = useState(null);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const [scopeReqBranch, setScopeReqBranch] = useState(user?.branch || 'CSE');
  const [scopeReqSection, setScopeReqSection] = useState(user?.section || 'A');
  const [scopeReqYear, setScopeReqYear] = useState(toOrdinalYear(user?.academicYear || user?.year) || '4th Year');
  const [scopeReqReason, setScopeReqReason] = useState('');

  // General alert banners
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Populate edit form when modal opens or user updates
  useEffect(() => {
    if (user) {
      setEditFormData({
        mobileNumber: user.mobileNumber || user.phone || '',
        officeLocation: user.officeLocation || '',
        bio: user.bio || '',
        qualifications: user.qualifications || '',
        specialization: user.specialization || '',
        experience: user.experience || '',
        experienceYears: user.experienceYears !== undefined && user.experienceYears !== null ? String(user.experienceYears) : '',
        profilePicture: user.profilePicture || '',
        targetRole: user.targetRole || 'Software Engineer',
        skillsText: user.skills?.join(', ') || '',
        leetcodeUsername: user.leetcodeUsername || '',
        codeforcesUsername: user.codeforcesUsername || '',
        codechefUsername: user.codechefUsername || '',
        hackerrankUsername: user.hackerrankUsername || '',
        inAppAlerts: user.attendanceNotificationPreferences?.inApp ?? true,
        emailAlerts: user.attendanceNotificationPreferences?.email ?? true,
        dailyDigest: user.attendanceNotificationPreferences?.dailyDigest ?? false
      });
    }
  }, [user]);

  // Load student scope change requests & achievements
  useEffect(() => {
    if (!isStudentRole) return;

    const fetchScopeRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/academic-scope-requests/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const pending = json.data.find(r => r.status === 'PENDING');
          setPendingScopeRequest(pending || null);
        }
      } catch (e) {
        console.warn('Scope requests fetch error:', e.message);
      }
    };

    const fetchAchievements = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/achievements/my`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && json.data) {
          setAchievementsData(json.data);
        }
      } catch (e) {
        console.warn('Achievements fetch error:', e.message);
      }
    };

    fetchScopeRequests();
    fetchAchievements();
  }, [isStudentRole]);

  // Submit profile edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const payload = {
        mobileNumber: editFormData.mobileNumber.trim(),
        phone: editFormData.mobileNumber.trim(),
        officeLocation: editFormData.officeLocation.trim(),
        bio: editFormData.bio.trim(),
        profilePicture: editFormData.profilePicture.trim()
      };

      if (!isStudentRole) {
        payload.qualifications = editFormData.qualifications.trim();
        payload.specialization = editFormData.specialization.trim();
        payload.experience = editFormData.experience.trim();
        if (editFormData.experienceYears !== '') {
          payload.experienceYears = Number(editFormData.experienceYears);
        }
      }

      if (isFacultyRole) {
        payload.attendanceNotificationPreferences = {
          inApp: editFormData.inAppAlerts,
          email: editFormData.emailAlerts,
          dailyDigest: editFormData.dailyDigest
        };
      }

      if (isStudentRole) {
        payload.targetRole = editFormData.targetRole.trim();
        payload.skills = editFormData.skillsText.split(',').map(s => s.trim()).filter(Boolean);
        payload.leetcodeUsername = editFormData.leetcodeUsername.trim();
        payload.codeforcesUsername = editFormData.codeforcesUsername.trim();
        payload.codechefUsername = editFormData.codechefUsername.trim();
        payload.hackerrankUsername = editFormData.hackerrankUsername.trim();
      }

      const res = await updateProfile(payload);
      if (res.success) {
        setShowEditModal(false);
        setSuccessMsg('Profile information updated successfully.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred while saving profile changes.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Submit Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    setPwSuccess('');
    setPwError('');

    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters in length.');
      setPwLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      setPwLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (data.success) {
        setPwSuccess('Password changed successfully. Your next sign-in will require this new credential.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwError(data.error || 'Failed to change password. Please verify current password.');
      }
    } catch (err) {
      setPwError('Network error while processing password change.');
    } finally {
      setPwLoading(false);
    }
  };

  // Student Scope Request Handlers
  const handleScopeSubmit = async (e) => {
    e.preventDefault();
    if (!scopeReqReason.trim()) {
      setErrorMsg('Please specify a valid administrative justification for scope change.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/academic-scope-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestedScope: {
            academicYear: scopeReqYear,
            branch: scopeReqBranch,
            section: scopeReqSection
          },
          justification: scopeReqReason.trim()
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPendingScopeRequest(json.data);
        setShowScopeModal(false);
        setScopeReqReason('');
        setSuccessMsg(json.message || 'Scope change request submitted to Academic Administration for review.');
      } else {
        setErrorMsg(json.error || 'Failed to submit scope change request.');
      }
    } catch (err) {
      setErrorMsg('Network error while submitting academic scope request.');
    }
  };

  const handleCancelScopeRequest = async () => {
    if (!pendingScopeRequest?._id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/academic-scope-requests/${pendingScopeRequest._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setPendingScopeRequest(null);
        setSuccessMsg('Academic scope change request withdrawn.');
      } else {
        setErrorMsg(json.error || 'Could not withdraw pending request.');
      }
    } catch (err) {
      setErrorMsg('Network error while withdrawing scope change request.');
    }
  };

  // Calculate Cumulative CGPA for student (read-only)
  const calculateCgpa = () => {
    if (user?.cgpa && Number(user.cgpa) > 0) return Number(user.cgpa).toFixed(2);
    const sems = [
      user?.sgpaSem1, user?.sgpaSem2, user?.sgpaSem3, user?.sgpaSem4,
      user?.sgpaSem5, user?.sgpaSem6, user?.sgpaSem7, user?.sgpaSem8
    ].map(Number);
    const completed = sems.filter(v => v > 0);
    if (completed.length === 0) return '0.00';
    return (completed.reduce((a, b) => a + b, 0) / completed.length).toFixed(2);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderValue = (val) => {
    if (val === undefined || val === null || String(val).trim() === '') {
      return <span className="profile-not-provided">Not provided</span>;
    }
    return String(val);
  };

  const employeeIdentifier = user?.employeeId || user?.rollNumber || (
    isStudentRole ? 'Not Assigned' : (user?._id ? `EMP-${user._id.slice(-6).toUpperCase()}` : 'Not Assigned')
  );

  const campusName = user?.campusId?.name || user?.campusName || (user?.campus ? user.campus.name : (
    isSuperAdminRole ? 'All Campuses (Enterprise Grid)' : 'GRIET Main Campus'
  ));

  const departmentName = user?.departmentId?.name || user?.departmentName || user?.branch || (
    isSuperAdminRole ? 'Enterprise Infrastructure' : 'Information Technology'
  );

  return (
    <>
      <Header title={`${roleMeta.title} Profile`} />
      <div className="content-wrapper profile-page-content animate-fade">
        <div className="profile-container">
          {successMsg && (
          <div className="success-banner animate-fade">
            <span className="banner-icon">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="error-banner animate-fade">
            <span className="banner-icon">⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* TOP PROFILE HEADER BANNER */}
        {/* ============================================================ */}
        <div className="glass-card profile-master-header-card">
          <div className="profile-master-header-left">
            <div className="profile-avatar-wrapper">
              <div
                className="profile-avatar-container"
                style={{ borderColor: roleMeta.badgeColor, cursor: isPhotoEligible ? 'pointer' : 'default' }}
                onClick={() => isPhotoEligible && setShowPhotoModal(true)}
                title={isPhotoEligible ? "Click to change profile photograph" : undefined}
              >
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user?.name || 'User Profile'}
                    className="profile-avatar-img"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : null}
                <div
                  className="profile-avatar-fallback"
                  style={{ background: roleMeta.bgGradient }}
                >
                  {getInitials(user?.name)}
                </div>

                {isPhotoEligible && (
                  <div className="profile-avatar-hover-overlay">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span>Update Photo</span>
                  </div>
                )}
              </div>

              {isPhotoEligible && (
                <button
                  type="button"
                  className="profile-avatar-badge-btn"
                  onClick={() => setShowPhotoModal(true)}
                  title="Update profile photo with camera or file upload"
                  aria-label="Update profile photo"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
              )}
            </div>

            <div className="profile-identity-info">
              <div className="profile-title-row">
                <h1 className="profile-user-name">{user?.name || 'User Account'}</h1>
                <span
                  className="profile-role-badge-tag"
                  style={{
                    backgroundColor: `${roleMeta.badgeColor}22`,
                    borderColor: `${roleMeta.badgeColor}66`,
                    color: roleMeta.badgeColor
                  }}
                >
                  {roleMeta.shortBadge}
                </span>
              </div>

              <p className="profile-designation-text">
                {user?.designation || roleMeta.defaultDesignation}
              </p>

              <div className="profile-header-chips">
                <span className="profile-chip">
                  <span className="chip-label">{isStudentRole ? 'Roll:' : 'ID:'}</span>
                  <strong className="chip-value" style={{ color: '#38bdf8' }}>{employeeIdentifier}</strong>
                </span>

                <span className="profile-chip">
                  <span className="chip-label">Campus:</span>
                  <span className="chip-value">{campusName}</span>
                </span>

                {!isSuperAdminRole && (
                  <span className="profile-chip">
                    <span className="chip-label">Dept:</span>
                    <span className="chip-value">{departmentName}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="profile-master-header-right">
            <div className="profile-completion-meter-card">
              <div className="meter-header">
                <span className="meter-title">Profile Completion</span>
                <span className="meter-percentage" style={{ color: completionStats.percentage === 100 ? '#10b981' : '#f59e0b' }}>
                  {completionStats.percentage}%
                </span>
              </div>
              <div className="completion-progress-track">
                <div
                  className="completion-progress-fill"
                  style={{
                    width: `${completionStats.percentage}%`,
                    background: completionStats.percentage === 100
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : 'linear-gradient(90deg, #6366f1, #a855f7)'
                  }}
                />
              </div>
              <p className="meter-caption">
                {completionStats.percentage === 100
                  ? 'All mandatory & applicable profile fields are filled.'
                  : `Missing: ${completionStats.missing.slice(0, 2).join(', ')}${completionStats.missing.length > 2 ? '...' : ''}`}
              </p>
            </div>

            <button
              type="button"
              className="btn-edit-profile-action"
              onClick={() => setShowEditModal(true)}
            >
              ✏️ Edit Profile Details
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* FOUR TAB NAVIGATION BAR */}
        {/* ============================================================ */}
        <div className="profile-tabs-bar">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <span className="tab-icon">👤</span> Personal Details
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'professional' ? 'active' : ''}`}
            onClick={() => setActiveTab('professional')}
          >
            <span className="tab-icon">💼</span> Professional &amp; Academic
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'institutional' ? 'active' : ''}`}
            onClick={() => setActiveTab('institutional')}
          >
            <span className="tab-icon">🏛️</span> Institutional &amp; Governance
          </button>
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <span className="tab-icon">🔒</span> Account &amp; Security
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: PERSONAL DETAILS */}
        {/* ============================================================ */}
        {activeTab === 'personal' && (
          <div className="profile-tab-panel animate-fade">
            <div className="glass-card form-section-card">
              <div className="section-header">
                <span style={{ fontSize: '24px' }}>👤</span>
                <div>
                  <h3 style={{ margin: 0 }}>Personal &amp; Contact Records</h3>
                  <p className="field-help" style={{ margin: 0 }}>
                    Official contact channels and identity parameters on file.
                  </p>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Full Legal Name</span>
                  <div className="detail-value">{renderValue(user?.name)}</div>
                  <span className="detail-protection-tag">🔒 Read-only Account Name</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Official Portal Email</span>
                  <div className="detail-value" style={{ color: '#38bdf8' }}>{renderValue(user?.email)}</div>
                  <span className="detail-protection-tag">🔒 Primary Authentication Identity</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Official Contact Phone</span>
                  <div className="detail-value">{renderValue(user?.mobileNumber || user?.phone)}</div>
                  <span className="detail-note">Used for multi-factor alerts &amp; system dispatches</span>
                </div>

                {!isStudentRole && (
                  <div className="detail-item">
                    <span className="detail-label">Office Location / Cabin</span>
                    <div className="detail-value">{renderValue(user?.officeLocation)}</div>
                    <span className="detail-note">Institutional chamber or office address</span>
                  </div>
                )}

                {isPhotoEligible ? (
                  <div className="detail-item full-span">
                    <span className="detail-label">Profile Photograph</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
                          {user?.profilePicture ? (
                            <img src={user.profilePicture} alt="Avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#94a3b8' }}>👤</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                            {user?.profilePicture ? 'Custom Profile Photo Active' : 'Default System Avatar'}
                          </div>
                          <span className="detail-note">JPEG, PNG, or WebP (Max 5MB)</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => setShowPhotoModal(true)}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          Update Photo
                        </button>
                        {user?.profilePicture && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            onClick={handleRemove}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="detail-item full-span">
                    <span className="detail-label">Profile Photograph</span>
                    <div className="detail-value" style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🔒</span>
                      <span>Profile photo customization is disabled for institutional service desk roles.</span>
                    </div>
                  </div>
                )}

                <div className="detail-item full-span">
                  <span className="detail-label">Professional Dossier / Biography</span>
                  <div className="detail-value bio-text">
                    {renderValue(user?.bio)}
                  </div>
                </div>

                {isStudentRole && (
                  <div className="detail-item full-span">
                    <span className="detail-label">Technical Skills &amp; Proficiencies</span>
                    <div className="skills-preview-list" style={{ marginTop: '6px' }}>
                      {user?.skills?.length > 0 ? (
                        user.skills.map((skill, idx) => (
                          <span className="skill-badge-preview" key={idx}>⚡ {skill}</span>
                        ))
                      ) : (
                        <span className="profile-not-provided">Not provided</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: PROFESSIONAL & ACADEMIC */}
        {/* ============================================================ */}
        {activeTab === 'professional' && (
          <div className="profile-tab-panel animate-fade">
            {/* Non-student Professional Profile (Director, Principal, HOD, Faculty, Super Admin) */}
            {!isStudentRole ? (
              <div className="glass-card form-section-card">
                <div className="section-header">
                  <span style={{ fontSize: '24px' }}>💼</span>
                  <div>
                    <h3 style={{ margin: 0 }}>Professional Credentials &amp; Responsibilities</h3>
                    <p className="field-help" style={{ margin: 0 }}>
                      Academic credentials, areas of expertise, and operational leadership.
                    </p>
                  </div>
                </div>

                <div className="profile-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Designation</span>
                    <div className="detail-value">{renderValue(user?.designation || roleMeta.defaultDesignation)}</div>
                    <span className="detail-protection-tag">🔒 Institutional Post</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Qualifications</span>
                    <div className="detail-value">{renderValue(user?.qualifications)}</div>
                    <span className="detail-note">Highest academic degrees earned</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Domain Specialization</span>
                    <div className="detail-value">{renderValue(user?.specialization)}</div>
                    <span className="detail-note">Core academic or research focus</span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">Professional Experience</span>
                    <div className="detail-value">
                      {renderValue(user?.experience || (user?.experienceYears ? `${user.experienceYears} Years` : ''))}
                    </div>
                    <span className="detail-note">Cumulative teaching &amp; administration history</span>
                  </div>

                  {/* Faculty Specific Fields */}
                  {isFacultyRole && (
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Class Advisor Assignment</span>
                        <div className="detail-value">{renderValue(user?.classAdvisor)}</div>
                        <span className="detail-protection-tag">🔒 Configured by HOD</span>
                      </div>

                      <div className="detail-item">
                        <span className="detail-label">Active Academic Year / Term</span>
                        <div className="detail-value">{getAcademicSession(user)}</div>
                        <span className="detail-protection-tag">🔒 Current Term</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Faculty Assigned Scopes Roster */}
                {isFacultyRole && (
                  <div className="faculty-scopes-section mt-24">
                    <h4 style={{ color: '#c7d2fe', marginBottom: '12px', fontSize: '15px' }}>
                      📚 Authorized Classroom Teaching Scopes &amp; Sections
                    </h4>
                    {user?.managedScopes && user.managedScopes.length > 0 ? (
                      <div className="scopes-cards-grid">
                        {user.managedScopes.map((scope, idx) => (
                          <div className="scope-roster-card" key={scope._id || idx}>
                            <div className="scope-roster-header">
                              <span className="scope-year-badge">📅 {toOrdinalYear(scope.academicYear)}</span>
                              <span className="scope-section-badge">Sec {scope.section || 'All'}</span>
                            </div>
                            <div className="scope-detail-line">
                              <strong>Branch:</strong> {scope.branch || 'All Branches'}
                            </div>
                            {scope.subject && (
                              <div className="scope-detail-line" style={{ color: '#34d399' }}>
                                <strong>Subject:</strong> {scope.subject?.name || scope.subject?.code || String(scope.subject)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-scopes-box">
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                          No specific classroom sections currently assigned. You hold general departmental oversight.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Responsibilities Tags List */}
                <div className="responsibilities-block mt-24">
                  <h4 style={{ color: '#c7d2fe', marginBottom: '12px', fontSize: '15px' }}>
                    📋 Institutional &amp; Operational Responsibilities
                  </h4>
                  <div className="responsibilities-tags-list">
                    {roleMeta.responsibilities.map((resp, idx) => (
                      <div className="responsibility-item" key={idx}>
                        <span className="resp-icon">✓</span>
                        <span>{resp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Student Academic & Competitive Programming Profile */
              <div className="student-professional-wrap">
                {/* Academic Performance (SGPAs - Read-Only, Preserving CGPA Evaluator) */}
                <div className="glass-card form-section-card">
                  <div className="section-header">
                    <span style={{ fontSize: '24px' }}>📊</span>
                    <div>
                      <h3 style={{ margin: 0 }}>Authoritative Academic Performance</h3>
                      <p className="field-help" style={{ margin: 0 }}>
                        Official semester-wise SGPA scores verified by Academic Administration. Read-only for student self-service.
                      </p>
                    </div>
                  </div>

                  <div className="academics-cgpa-banner">
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '13px', display: 'block' }}>Cumulative Grade Point Average</span>
                      <strong style={{ fontSize: '22px', color: '#10b981' }}>{calculateCgpa()} CGPA</strong>
                    </div>
                    <span className="detail-protection-tag">🔒 Official Sealed Academic Record</span>
                  </div>

                  <div className="academics-sgpas-grid mt-16">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                      const val = user?.[`sgpaSem${sem}`] || 0;
                      return (
                        <div className="sgpa-cell-card" key={sem}>
                          <span className="sgpa-label">Semester {sem}</span>
                          <span className="sgpa-val" style={{ color: val > 0 ? '#38bdf8' : '#64748b' }}>
                            {val > 0 ? Number(val).toFixed(2) : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Competitive Programming Profiles */}
                <div className="glass-card form-section-card mt-24">
                  <div className="section-header">
                    <span style={{ fontSize: '24px' }}>💻</span>
                    <div>
                      <h3 style={{ margin: 0 }}>Competitive Programming Handles</h3>
                      <p className="field-help" style={{ margin: 0 }}>
                        Verified platform accounts automatically synced with the global placement leaderboard.
                      </p>
                    </div>
                  </div>

                  <div className="platforms-status-grid">
                    <div className="platform-box">
                      <span className="platform-name leetcode">LeetCode</span>
                      <div className="platform-handle">{renderValue(user?.leetcodeUsername)}</div>
                      <span className={`status-badge ${user?.leetcodeUsername ? 'linked' : 'unlinked'}`}>
                        {user?.leetcodeUsername ? '✓ Linked' : 'Not Linked'}
                      </span>
                    </div>

                    <div className="platform-box">
                      <span className="platform-name codeforces">Codeforces</span>
                      <div className="platform-handle">{renderValue(user?.codeforcesUsername)}</div>
                      <span className={`status-badge ${user?.codeforcesUsername ? 'linked' : 'unlinked'}`}>
                        {user?.codeforcesUsername ? '✓ Linked' : 'Not Linked'}
                      </span>
                    </div>

                    <div className="platform-box">
                      <span className="platform-name codechef">CodeChef</span>
                      <div className="platform-handle">{renderValue(user?.codechefUsername)}</div>
                      <span className={`status-badge ${user?.codechefUsername ? 'linked' : 'unlinked'}`}>
                        {user?.codechefUsername ? '✓ Linked' : 'Not Linked'}
                      </span>
                    </div>

                    <div className="platform-box">
                      <span className="platform-name hackerrank">HackerRank</span>
                      <div className="platform-handle">{renderValue(user?.hackerrankUsername)}</div>
                      <span className={`status-badge ${user?.hackerrankUsername ? 'linked' : 'unlinked'}`}>
                        {user?.hackerrankUsername ? '✓ Linked' : 'Not Linked'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Achievements Preview */}
                {achievementsData && (
                  <div className="glass-card form-section-card mt-24">
                    <div className="section-header">
                      <span style={{ fontSize: '24px' }}>🏆</span>
                      <div>
                        <h3 style={{ margin: 0 }}>Student Badges &amp; Achievements</h3>
                        <p className="field-help" style={{ margin: 0 }}>
                          Gamified platform accomplishments and contest credentials.
                        </p>
                      </div>
                    </div>

                    <div className="achievements-preview-grid">
                      <div className="ach-stat-box">
                        <span className="ach-stat-label">Unlocked Badges</span>
                        <strong className="ach-stat-val" style={{ color: '#818cf8' }}>
                          {achievementsData?.unlockedCount || 0} / {achievementsData?.totalBadges || 35}
                        </strong>
                      </div>
                      <div className="ach-stat-box">
                        <span className="ach-stat-label">Total Points</span>
                        <strong className="ach-stat-val" style={{ color: '#fbbf24' }}>
                          {(achievementsData?.totalPoints || 0).toLocaleString()} PTS
                        </strong>
                      </div>
                      <div className="ach-stat-box">
                        <span className="ach-stat-label">Current Streak</span>
                        <strong className="ach-stat-val" style={{ color: '#f97316' }}>
                          {achievementsData?.currentStreak || 0} Days
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: INSTITUTIONAL & GOVERNANCE SCOPE */}
        {/* ============================================================ */}
        {activeTab === 'institutional' && (
          <div className="profile-tab-panel animate-fade">
            <div className="glass-card form-section-card">
              <div className="section-header">
                <span style={{ fontSize: '24px' }}>🏛️</span>
                <div>
                  <h3 style={{ margin: 0 }}>Institutional Scope &amp; Governance Boundaries</h3>
                  <p className="field-help" style={{ margin: 0 }}>
                    Official organizational mappings, administrative boundaries, and governance protocols.
                  </p>
                </div>
              </div>

              <div className="profile-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Assigned Campus</span>
                  <div className="detail-value">{campusName}</div>
                  <span className="detail-protection-tag">🔒 Multi-Tenant Boundary</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Assigned Department</span>
                  <div className="detail-value">{departmentName}</div>
                  <span className="detail-protection-tag">🔒 Departmental Boundary</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Authorized Scope</span>
                  <div className="detail-value" style={{ color: '#38bdf8' }}>{roleMeta.defaultScope}</div>
                  <span className="detail-note">Enforced via backend scope filters</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Reporting Authority</span>
                  <div className="detail-value">{renderValue(user?.reportingAuthority || roleMeta.defaultAuthority)}</div>
                  <span className="detail-protection-tag">🔒 Governance Hierarchy</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Platform Role Identifier</span>
                  <div className="detail-value" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                    {user?.role || 'N/A'}
                  </div>
                  <span className="detail-protection-tag">🔒 Security Access Level</span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Account Created</span>
                  <div className="detail-value">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'June 2026'}
                  </div>
                  <span className="detail-note">Enrollment timestamp</span>
                </div>
              </div>

              {/* Student Academic Scope Request Workflow */}
              {isStudentRole && (
                <div className="student-scope-transfer-box mt-24">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '15px' }}>
                        📝 Authoritative Academic Scope Transfer
                      </h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                        To prevent arbitrary data tampering, students cannot self-modify enrollment. You may submit a formal scope transfer request.
                      </p>
                    </div>

                    {!pendingScopeRequest && (
                      <button
                        type="button"
                        onClick={() => setShowScopeModal(true)}
                        className="btn btn-secondary btn-sm"
                      >
                        Request Transfer
                      </button>
                    )}
                  </div>

                  {pendingScopeRequest && (
                    <div className="pending-scope-banner">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 700 }}>
                          <span>⏳</span>
                          <span>Pending Administrative Review (Request #{pendingScopeRequest._id ? pendingScopeRequest._id.slice(-6).toUpperCase() : 'PENDING'})</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelScopeRequest}
                          className="btn-withdraw-action"
                        >
                          Withdraw Request
                        </button>
                      </div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#e2e8f0' }}>
                        Requested transfer to: <strong>{pendingScopeRequest.requestedScope?.academicYear}</strong>, Department of <strong>{pendingScopeRequest.requestedScope?.branch}</strong>, Section <strong>{pendingScopeRequest.requestedScope?.section}</strong>.
                      </p>
                      <small style={{ color: '#94a3b8', fontSize: '11.5px', display: 'block' }}>
                        Submitted on {new Date(pendingScopeRequest.createdAt || Date.now()).toLocaleString()}. Records remain bound to current enrollment until approved.
                      </small>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: ACCOUNT & SECURITY */}
        {/* ============================================================ */}
        {activeTab === 'security' && (
          <div className="profile-tab-panel animate-fade">
            {/* Active Sessions & Identity Security Card */}
            <div className="glass-card form-section-card">
              <div className="section-header">
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <div>
                  <h3 style={{ margin: 0 }}>Authentication, Sessions &amp; Security</h3>
                  <p className="field-help" style={{ margin: 0 }}>
                    Cryptographic token security, telemetry sessions, and credential management.
                  </p>
                </div>
              </div>

              <div className="security-telemetry-grid">
                <div className="telemetry-card">
                  <span className="telemetry-label">Last Login Timestamp</span>
                  <strong className="telemetry-val">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Active in current session'}
                  </strong>
                  <span className="telemetry-caption">Recorded via client heartbeat</span>
                </div>

                <div className="telemetry-card">
                  <span className="telemetry-label">Last Client IP Address</span>
                  <strong className="telemetry-val" style={{ color: '#38bdf8' }}>
                    {user?.lastLoginIp || user?.lastIpAddress || 'Verified Gateway IP'}
                  </strong>
                  <span className="telemetry-caption">Strictly logged for audit trails</span>
                </div>

                <div className="telemetry-card">
                  <span className="telemetry-label">Total Authenticated Sessions</span>
                  <strong className="telemetry-val" style={{ color: '#a855f7' }}>
                    {user?.loginCount || 1} Logins
                  </strong>
                  <span className="telemetry-caption">Monitored for suspicious activity</span>
                </div>

                <div className="telemetry-card">
                  <span className="telemetry-label">Session Protection Status</span>
                  <strong className="telemetry-val" style={{ color: '#10b981' }}>
                    Hardware-Enforced JWT
                  </strong>
                  <span className="telemetry-caption">AES-256 Bearer Token Verification</span>
                </div>
              </div>

              {/* Faculty Attendance Dispatch Notifications */}
              {isFacultyRole && (
                <div className="faculty-alert-prefs-box mt-24">
                  <h4 style={{ color: '#f8fafc', marginBottom: '8px', fontSize: '15px' }}>
                    🔔 Attendance Session Dispatch Preferences
                  </h4>
                  <div className="prefs-checkboxes-list">
                    <label className="pref-item">
                      <input
                        type="checkbox"
                        checked={editFormData.inAppAlerts}
                        disabled
                        readOnly
                      />
                      <span>In-App Attendance Telemetry &amp; Anti-Proxy Alerts (Configured)</span>
                    </label>
                    <label className="pref-item">
                      <input
                        type="checkbox"
                        checked={editFormData.emailAlerts}
                        disabled
                        readOnly
                      />
                      <span>Cryptographically Sealed Email Finalization Receipts (Configured)</span>
                    </label>
                    <label className="pref-item">
                      <input
                        type="checkbox"
                        checked={editFormData.dailyDigest}
                        disabled
                        readOnly
                      />
                      <span>Daily Low Attendance Summary Digest (&lt;75% Threshold)</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Change Password Card */}
            <div className="glass-card form-section-card mt-24">
              <div className="section-header">
                <span style={{ fontSize: '24px' }}>🔑</span>
                <div>
                  <h3 style={{ margin: 0 }}>Rotate Account Password</h3>
                  <p className="field-help" style={{ margin: 0 }}>
                    Update your private portal authentication password.
                  </p>
                </div>
              </div>

              {pwSuccess && (
                <div className="success-banner animate-fade" style={{ marginBottom: '16px' }}>
                  <span className="banner-icon">✓</span>
                  <span>{pwSuccess}</span>
                </div>
              )}

              {pwError && (
                <div className="error-banner animate-fade" style={{ marginBottom: '16px' }}>
                  <span className="banner-icon">⚠</span>
                  <span>{pwError}</span>
                </div>
              )}

              {isSuperAdminRole && user?.email === 'vaddeajaykumar2004@gmail.com' ? (
                <div className="security-notice-box">
                  <span style={{ fontSize: '18px' }}>🔒</span>
                  <span>
                    Direct in-browser password rotation is restricted for the root Super Administrator account. Root credentials are maintained via institutional security operations.
                  </span>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="change-password-form">
                  <div className="form-grid-three-col" style={{ marginBottom: '16px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Current Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">New Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Confirm New Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={pwLoading || !currentPassword || !newPassword}
                  >
                    {pwLoading ? 'Verifying & Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* EDIT PROFILE MODAL (ALLOWED FIELDS ONLY) */}
      {/* ============================================================ */}
      {showEditModal && (
        <div className="modal-overlay animate-fade" onClick={() => setShowEditModal(false)}>
          <div
            className="modal-content glass-card edit-profile-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✏️</span> Edit Profile Details
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                &times;
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>
              Update authorized contact channels and professional records. Institutional scopes and identity keys remain protected.
            </p>

            <form onSubmit={handleEditSubmit} className="edit-profile-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Contact Phone / Mobile</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editFormData.mobileNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                    placeholder="e.g. +91 9876543210"
                  />
                  <p className="field-help">Official contact number for critical notifications.</p>
                </div>

                {!isStudentRole && (
                  <div className="form-group">
                    <label className="form-label">Office Location / Cabin</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.officeLocation}
                      onChange={(e) => setEditFormData({ ...editFormData, officeLocation: e.target.value })}
                      placeholder="e.g. Admin Block, Room 204"
                    />
                    <p className="field-help">Chamber or departmental cabin location.</p>
                  </div>
                )}
              </div>

              {isPhotoEligible && (
                <div className="form-group">
                  <label className="form-label">Profile Photograph</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setShowPhotoModal(true);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <span>Update Photo (Camera / Upload)</span>
                    </button>
                    {user?.profilePicture && (
                      <span style={{ fontSize: '12px', color: '#10b981' }}>✓ Photo Active</span>
                    )}
                  </div>
                  <p className="field-help">Supports webcam capture, mobile camera, or image upload (JPEG, PNG, WebP up to 5MB).</p>
                </div>
              )}

              {!isStudentRole && (
                <>
                  <div className="form-grid-three-col">
                    <div className="form-group">
                      <label className="form-label">Qualifications</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.qualifications}
                        onChange={(e) => setEditFormData({ ...editFormData, qualifications: e.target.value })}
                        placeholder="e.g. Ph.D, M.Tech (CSE)"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Domain Specialization</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.specialization}
                        onChange={(e) => setEditFormData({ ...editFormData, specialization: e.target.value })}
                        placeholder="e.g. Distributed AI, Cloud"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Experience</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.experience}
                        onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                        placeholder="e.g. 15 Years in Academia"
                      />
                    </div>
                  </div>
                </>
              )}

              {isFacultyRole && (
                <div className="form-group">
                  <label className="form-label">Attendance Notification Preferences</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.inAppAlerts}
                        onChange={(e) => setEditFormData({ ...editFormData, inAppAlerts: e.target.checked })}
                      />
                      <span>In-App Telemetry &amp; Proxy Alerts</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.emailAlerts}
                        onChange={(e) => setEditFormData({ ...editFormData, emailAlerts: e.target.checked })}
                      />
                      <span>Email Attendance Finalization Receipts</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.dailyDigest}
                        onChange={(e) => setEditFormData({ ...editFormData, dailyDigest: e.target.checked })}
                      />
                      <span>Daily Low Attendance Summary Digest</span>
                    </label>
                  </div>
                </div>
              )}

              {isStudentRole && (
                <>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Target Career Role</label>
                      <select
                        className="form-control"
                        value={editFormData.targetRole}
                        onChange={(e) => setEditFormData({ ...editFormData, targetRole: e.target.value })}
                      >
                        <option value="Software Engineer">Software Engineer</option>
                        <option value="Frontend Developer">Frontend Developer</option>
                        <option value="Backend Developer">Backend Developer</option>
                        <option value="Full Stack Developer">Full Stack Developer</option>
                        <option value="Data Scientist">Data Scientist</option>
                        <option value="Cloud / DevOps Engineer">Cloud / DevOps Engineer</option>
                        <option value="AI / ML Engineer">AI / ML Engineer</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">LeetCode Username</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.leetcodeUsername}
                        onChange={(e) => setEditFormData({ ...editFormData, leetcodeUsername: e.target.value })}
                        placeholder="handle"
                      />
                    </div>
                  </div>

                  <div className="form-grid-three-col">
                    <div className="form-group">
                      <label className="form-label">Codeforces Handle</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.codeforcesUsername}
                        onChange={(e) => setEditFormData({ ...editFormData, codeforcesUsername: e.target.value })}
                        placeholder="handle"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">CodeChef Handle</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.codechefUsername}
                        onChange={(e) => setEditFormData({ ...editFormData, codechefUsername: e.target.value })}
                        placeholder="handle"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">HackerRank Handle</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.hackerrankUsername}
                        onChange={(e) => setEditFormData({ ...editFormData, hackerrankUsername: e.target.value })}
                        placeholder="handle"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Technical Skills (Comma separated)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editFormData.skillsText}
                      onChange={(e) => setEditFormData({ ...editFormData, skillsText: e.target.value })}
                      placeholder="e.g. React, Node.js, Python, SQL"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Biography / Professional Summary</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={editFormData.bio}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  placeholder="Provide an overview of your responsibilities, research, and focus..."
                />
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saveLoading}
                >
                  {saveLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STUDENT SCOPE CHANGE REQUEST MODAL */}
      {/* ============================================================ */}
      {showScopeModal && (
        <div className="modal-overlay animate-fade" onClick={() => setShowScopeModal(false)}>
          <div className="modal-content glass-card" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📝</span> Request Academic Scope Change
              </h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowScopeModal(false)}
              >
                &times;
              </button>
            </div>

            <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Students cannot arbitrarily reassign their institutional enrollment. You may submit a formal scope transfer request to the Registrar / Academic Administration for audit and review.
            </p>

            <form onSubmit={handleScopeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Target Academic Year</label>
                <select
                  className="form-control"
                  value={scopeReqYear}
                  onChange={(e) => setScopeReqYear(e.target.value)}
                >
                  {INSTITUTIONAL_YEARS.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Branch / Department</label>
                <select
                  className="form-control"
                  value={scopeReqBranch}
                  onChange={(e) => setScopeReqBranch(e.target.value)}
                >
                  {INSTITUTIONAL_BRANCHES.map(br => (
                    <option key={br} value={br}>{br}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Section</label>
                <select
                  className="form-control"
                  value={scopeReqSection}
                  onChange={(e) => setScopeReqSection(e.target.value)}
                >
                  {INSTITUTIONAL_SECTIONS.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Justification / Reason *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={scopeReqReason}
                  onChange={(e) => setScopeReqReason(e.target.value)}
                  placeholder="Specify administrative reason, elective alignment, or registrar authorization letter details..."
                  required
                />
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowScopeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Submit Scope Change Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Persistent hidden file inputs for profile photo upload */}
      {isPhotoEligible && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            aria-label="Upload profile photo"
          />
          <input
            ref={mobileCameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            capture="user"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            aria-label="Capture photo with mobile camera"
          />
        </>
      )}

      {/* ============================================================ */}
      {/* SHARED PROFILE PHOTO CAPTURE & UPLOAD MODAL */}
      {/* ============================================================ */}
      {showPhotoModal && isPhotoEligible && (
        <div className="photo-modal-backdrop" onClick={handleClosePhotoModal}>
          <div className="photo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <h3 className="photo-modal-title">
                {photoSubMode === 'camera'
                  ? 'Take Profile Photo'
                  : photoSubMode === 'preview'
                  ? 'Review Profile Photo'
                  : 'Update Profile Photo'}
              </h3>
              <button
                type="button"
                className="photo-modal-close-btn"
                onClick={handleClosePhotoModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="photo-modal-body">
              {photoError && (
                <div className="photo-error-alert animate-fade">
                  <span>⚠</span>
                  <span>{photoError}</span>
                </div>
              )}

              {photoSubMode === 'choose' && (
                <>
                  <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
                    Choose how you would like to set your profile photograph:
                  </p>

                  <div className="photo-options-grid">
                    <div
                      className="photo-option-card"
                      onClick={handleStartCamera}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="photo-option-icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                      </div>
                      <div className="photo-option-title">Take Photo</div>
                      <div className="photo-option-desc">Use device camera or webcam</div>
                    </div>

                    <div
                      className="photo-option-card"
                      onClick={() => fileInputRef.current?.click()}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="photo-option-icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <div className="photo-option-title">Upload File</div>
                      <div className="photo-option-desc">Select image from computer/phone</div>
                    </div>
                  </div>

                  <div className="photo-info-callout">
                    <span>ℹ️</span>
                    <span>Supported: JPEG, PNG, WebP format. Maximum file size: 5MB.</span>
                  </div>

                  {user?.profilePicture && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                      <button
                        type="button"
                        className="photo-remove-btn"
                        onClick={handleRemove}
                        disabled={isPhotoSaving}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        <span>Remove Current Profile Photo</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {photoSubMode === 'camera' && (
                <>
                  {cameraError ? (
                    <div style={{ textAlign: 'center', padding: '16px' }}>
                      <div className="photo-error-alert" style={{ marginBottom: '16px' }}>
                        <span>⚠</span>
                        <span>{cameraError}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload File Instead
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => mobileCameraInputRef.current?.click()}
                        >
                          Mobile Camera
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleStartCamera}
                        >
                          Retry Camera
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="camera-viewfinder-container">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="camera-video-stream"
                        />
                        <div className="camera-target-ring" />
                      </div>
                      <div className="camera-controls-bar">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleClosePhotoModal}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleCaptureFrame}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px' }}
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="9"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          Capture Photo
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {photoSubMode === 'preview' && (
                <>
                  <p style={{ margin: 0, textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
                    Review your photo preview before saving:
                  </p>

                  <div className="photo-preview-box">
                    {previewImage && (
                      <img
                        src={previewImage}
                        alt="Profile preview"
                        className="photo-preview-img"
                      />
                    )}
                  </div>

                  <div className="photo-actions-row">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleClosePhotoModal}
                      disabled={isPhotoSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleRetakeOrChooseAnother}
                      disabled={isPhotoSaving}
                    >
                      Retake / Choose Another Photo
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSavePhoto}
                      disabled={isPhotoSaving}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      {isPhotoSaving ? 'Saving...' : 'Save Profile Photo'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;
