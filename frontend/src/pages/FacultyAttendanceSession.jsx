import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { API_URL, BASE_URL } from '../config/api';
import './FacultyAttendanceSession.css';

// Pre-defined catalog constants for quick faculty tab selection
const DEFAULT_CATALOG_SUBJECTS = [
  { id: 'sub-dbms', name: 'Database Management Systems', code: 'GR22A2069', branch: 'CSE' },
  { id: 'sub-wt', name: 'Web Technologies', code: 'GR22A2072', branch: 'IT' },
  { id: 'sub-os', name: 'Operating Systems', code: 'GR22A2065', branch: 'CSE' },
  { id: 'sub-cn', name: 'Computer Networks', code: 'GR22A2075', branch: 'IT' },
  { id: 'sub-aiml', name: 'Artificial Intelligence & ML', code: 'GR22A3010', branch: 'AIML' },
  { id: 'sub-dsa', name: 'Data Structures & Algorithms', code: 'GR22A1040', branch: 'CSE' },
  { id: 'sub-se', name: 'Software Engineering', code: 'GR22A2080', branch: 'IT' },
  { id: 'sub-cloud', name: 'Cloud Computing & DevOps', code: 'GR22A3025', branch: 'CSE' }
];

const CAMPUS_BLOCKS = [
  {
    id: 'IT Block',
    name: 'IT Block',
    icon: '🏢',
    rooms: ['Lab 03,3502', 'Room 3501', 'Room 3503', 'Lab 01', 'Lab 02', 'Seminar Hall A']
  },
  {
    id: 'CSE Block',
    name: 'CSE Block',
    icon: '💻',
    rooms: ['Room 201', 'Room 202', 'Room 203', 'CSE Lab 01', 'CSE Lab 02', 'Auditorium C']
  },
  {
    id: 'Main Academic Block',
    name: 'Main Academic Block',
    icon: '🏛️',
    rooms: ['Lab 03', 'Room 101', 'Room 102', 'Room 103', 'Central Hall', 'Lab 04']
  },
  {
    id: 'Mechanical Block',
    name: 'Mechanical Block',
    icon: '⚙️',
    rooms: ['Room M-101', 'CAD/CAM Lab', 'Workshop A', 'Seminar Hall M']
  },
  {
    id: 'Civil Block',
    name: 'Civil Block',
    icon: '📐',
    rooms: ['Room C-101', 'Survey Lab', 'Structures Lab', 'Room C-202']
  },
  {
    id: 'Pharmacy & Science Block',
    name: 'Pharmacy & Science Block',
    icon: '🧪',
    rooms: ['Pharma Lab 01', 'Analysis Lab', 'Lecture Hall P-1', 'Lecture Hall P-2']
  }
];

const ACADEMIC_YEARS = [
  { id: '1st Year', label: '1st Year', sub: 'Freshman (Sem 1 & 2)' },
  { id: '2nd Year', label: '2nd Year', sub: 'Sophomore (Sem 3 & 4)' },
  { id: '3rd Year', label: '3rd Year', sub: 'Junior (Sem 5 & 6)' },
  { id: '4th Year', label: '4th Year', sub: 'Senior (Sem 7 & 8)' }
];

const BRANCHES = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL', 'AIML', 'CSD'];
const SECTIONS = ['A', 'B', 'C', 'D'];

const PERIOD_SLOTS = [
  { num: '1', time: '09:00 - 09:50 AM', label: 'Period 1' },
  { num: '2', time: '09:50 - 10:40 AM', label: 'Period 2' },
  { num: '3', time: '10:50 - 11:40 AM', label: 'Period 3' },
  { num: '4', time: '11:40 - 12:30 PM', label: 'Period 4' },
  { num: '5', time: '01:10 - 02:00 PM', label: 'Period 5' },
  { num: '6', time: '02:00 - 02:50 PM', label: 'Period 6' },
  { num: '7', time: '02:50 - 03:40 PM', label: 'Period 7' }
];

const FacultyAttendanceSession = () => {
  const { user, token } = useAuth();
  const { isFaculty, isSuperAdmin, isCampusAdmin, isAdministrator, isHOD, isDirector, isPrincipal, isAuditor } = usePermission();

  const isSupervisor = useMemo(() => {
    return Boolean(isDirector || isPrincipal || isSuperAdmin || isCampusAdmin || isAdministrator || isHOD || isAuditor);
  }, [isDirector, isPrincipal, isSuperAdmin, isCampusAdmin, isAdministrator, isHOD, isAuditor]);

  // Supervisory & Live Class States
  const [currentClock, setCurrentClock] = useState(Date.now());
  const [campusSessions, setCampusSessions] = useState([]);
  const [activeTabMode, setActiveTabMode] = useState(() => (isSupervisor ? 'monitor' : 'launch'));
  const [isObservingOnly, setIsObservingOnly] = useState(false);
  const [monitorBranchFilter, setMonitorBranchFilter] = useState('ALL');
  const [monitorPeriodFilter, setMonitorPeriodFilter] = useState('ALL');

  // Clock tick every 1000ms for second-by-second live timers
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentClock(Date.now());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  const getElapsedSeconds = (startTime) => {
    if (!startTime) return 0;
    const start = new Date(startTime).getTime();
    return Math.max(0, Math.floor((currentClock - start) / 1000));
  };

  const formatLiveTimer = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchCampusSessions = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/attendance/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sessions = res.data?.sessions || [];
      setCampusSessions(sessions);
    } catch (err) {
      // background poll
    }
  };

  useEffect(() => {
    fetchCampusSessions();
    const pollInterval = setInterval(fetchCampusSessions, 10000);
    return () => clearInterval(pollInterval);
  }, [token]);

  const handleInspectSession = async (sess) => {
    if (!token || !sess?._id) return;
    try {
      setLoadingConfig(true);
      const res = await axios.get(`${API_URL}/attendance/sessions/${sess._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.session) {
        setActiveSession(res.data.session);
        setIsObservingOnly(true);
        setQrToken(res.data.session.qrSessionIdentifier || '');
        setQrExpiresAt(res.data.session.qrExpiresAt ? new Date(res.data.session.qrExpiresAt) : null);
        setRoster(res.data.records || []);
      }
    } catch (err) {
      console.error('Error inspecting live session:', err);
      alert(err.response?.data?.error || 'Unable to inspect live session.');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleExitObservation = () => {
    setActiveSession(null);
    setIsObservingOnly(false);
    setRoster([]);
    setQrToken('');
    fetchCampusSessions();
  };

  // Launcher Mode: 'interactive' (Tabs & Custom Selectors) | 'schedule' (Pre-assigned Schedule)
  const [launcherMode, setLauncherMode] = useState('interactive');
  const [configSubTab, setConfigSubTab] = useState('all');

  // State: Classes and Rooms configuration
  const [authorizedClasses, setAuthorizedClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');

  // Assigned Scopes Extraction (Restricted to Faculty Profile)
  const assignedScopeYears = useMemo(() => {
    const years = new Set();
    if (Array.isArray(user?.managedScopes)) {
      user.managedScopes.forEach((s) => {
        if (s.academicYear) years.add(s.academicYear.trim());
      });
    }
    if (user?.academicYear) years.add(user.academicYear.trim());
    if (Array.isArray(user?.managedAcademicYears)) {
      user.managedAcademicYears.forEach((y) => { if (y) years.add(y.trim()); });
    }
    return Array.from(years);
  }, [user]);

  const assignedScopeBranches = useMemo(() => {
    const branches = new Set();
    if (Array.isArray(user?.managedScopes)) {
      user.managedScopes.forEach((s) => {
        if (s.branch) branches.add(s.branch.trim().toUpperCase());
      });
    }
    if (user?.branch) branches.add(user.branch.trim().toUpperCase());
    if (user?.department) branches.add(user.department.trim().toUpperCase());
    return Array.from(branches);
  }, [user]);

  const assignedScopeSections = useMemo(() => {
    const sections = new Set();
    if (Array.isArray(user?.managedScopes)) {
      user.managedScopes.forEach((s) => {
        if (s.section) sections.add(s.section.trim().toUpperCase());
      });
    }
    if (user?.section) sections.add(user.section.trim().toUpperCase());
    return Array.from(sections);
  }, [user]);

  // Interactive Tabs States
  const [catalogSubjects, setCatalogSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSubjectName, setSelectedSubjectName] = useState('');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [customSubjectCode, setCustomSubjectCode] = useState('');

  // Block & Room selection
  const [selectedBlock, setSelectedBlock] = useState('IT Block');
  const [isCustomBlock, setIsCustomBlock] = useState(false);
  const [customBlockName, setCustomBlockName] = useState('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');

  // Cohort & Period selection
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('4th Year');
  const [selectedBranch, setSelectedBranch] = useState(user?.branch || 'CSE');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedPeriod, setSelectedPeriod] = useState('1');

  // Attendance Scanning Window Timer & Live Transition State
  const [attendanceTimerMinutes, setAttendanceTimerMinutes] = useState(10);
  const [isClosingAttendance, setIsClosingAttendance] = useState(false);

  // State: Active Session Lifecycle
  const [activeSession, setActiveSession] = useState(null);
  const [roster, setRoster] = useState([]);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [finalSummary, setFinalSummary] = useState(null);

  // State: Dynamic QR & Rotation
  const [qrToken, setQrToken] = useState('');
  const [qrExpiresAt, setQrExpiresAt] = useState(null);
  const [countdownSeconds, setCountdownSeconds] = useState(15);
  const [isRotatingToken, setIsRotatingToken] = useState(false);
  const [rotationError, setRotationError] = useState('');
  const [isProjectorMode, setIsProjectorMode] = useState(false);

  // State: Elapsed Time Counter
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  // Refs
  const qrCanvasRef = useRef(null);
  const projectorCanvasRef = useRef(null);
  const socketRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const elapsedIntervalRef = useRef(null);

  // Helper: Format duration as mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Format timestamp as hh:mm:ss AM/PM
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // ============================================================
  // 1. INITIAL LOAD: FETCH AUTHORIZED CLASSES & ACTIVE ROOMS
  // ============================================================
  useEffect(() => {
    if (!token) return;

    const loadConfiguration = async () => {
      setLoadingConfig(true);
      setConfigError('');

      try {
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch available campus classrooms
        const roomsRes = await axios.get(`${API_URL}/attendance/rooms`, { headers });
        const availableRooms = roomsRes.data?.rooms || [];
        setRooms(availableRooms);
        if (availableRooms.length > 0) {
          setSelectedRoomId(availableRooms[0]._id);
          if (availableRooms[0].buildingName) setSelectedBlock(availableRooms[0].buildingName);
          if (availableRooms[0].roomNumber) setSelectedRoomNumber(availableRooms[0].roomNumber);
        }

        // 2. Fetch subjects from academic API to enrich or fallback
        let fetchedSubjects = [];
        try {
          const subjectsRes = await axios.get(`${API_URL}/academic/subjects`, { headers });
          fetchedSubjects = subjectsRes.data?.data || subjectsRes.data?.subjects || [];
        } catch (subErr) {
          // non-fatal
        }

        // 3. Resolve faculty assigned subjects & authorized classes
        const managed = Array.isArray(user?.managedScopes) ? user.managedScopes : [];
        let classesList = [];
        const assignedSubjectsList = [];
        const seenSubjectKeys = new Set();

        if (managed.length > 0) {
          classesList = managed.map((item, idx) => {
            let matched = null;
            if (item.subject && typeof item.subject === 'object') {
              matched = item.subject;
            } else if (item.subject) {
              matched = fetchedSubjects.find(
                (s) => s._id === item.subject.toString() || s.id === item.subject.toString()
              );
            }

            const sName = matched?.name || (typeof item.subject === 'string' ? 'Assigned Course' : 'Assigned Subject');
            const sCode = matched?.code || 'SUBJ';
            const sId = matched?._id || item.subject?._id || item.subject || `managed-sub-${idx}`;

            const key = (sCode || sName).toLowerCase();
            if (!seenSubjectKeys.has(key)) {
              seenSubjectKeys.add(key);
              assignedSubjectsList.push({
                id: sId,
                name: sName,
                code: sCode,
                branch: item.branch || user?.branch || 'CSE',
                academicYear: item.academicYear,
                section: item.section
              });
            }

            return {
              id: `managed-${idx}`,
              subjectId: sId,
              subjectName: sName,
              subjectCode: sCode,
              branch: item.branch || user?.branch || 'CSE',
              section: item.section || 'A',
              academicYear: item.academicYear || user?.academicYear || '4th Year',
              semester: 1
            };
          });
        }

        // Single subject assignment check on user profile
        if (user?.subjectId) {
          const match = fetchedSubjects.find((s) => s._id === user.subjectId.toString());
          if (match && !seenSubjectKeys.has((match.code || match.name).toLowerCase())) {
            seenSubjectKeys.add((match.code || match.name).toLowerCase());
            assignedSubjectsList.push({
              id: match._id,
              name: match.name,
              code: match.code,
              branch: match.branch || user?.branch || 'CSE'
            });
          }
        }

        // Fallback for unassigned faculty/testing: check department/branch subjects
        if (assignedSubjectsList.length === 0) {
          const facultyBranchSubs = fetchedSubjects.filter(
            (s) =>
              (user?.branch && s.branch?.toLowerCase() === user.branch.toLowerCase()) ||
              (user?.department && s.branch?.toLowerCase() === user.department.toLowerCase())
          );
          if (facultyBranchSubs.length > 0) {
            facultyBranchSubs.forEach((s) => {
              const k = (s.code || s.name).toLowerCase();
              if (!seenSubjectKeys.has(k)) {
                seenSubjectKeys.add(k);
                assignedSubjectsList.push({
                  id: s._id,
                  name: s.name,
                  code: s.code,
                  branch: s.branch || user?.branch || 'CSE'
                });
              }
            });
          }
        }

        // SHOW ONLY ASSIGNED SUBJECTS (Unassigned catalog subjects are removed!)
        if (assignedSubjectsList.length > 0) {
          setCatalogSubjects(assignedSubjectsList);
          setSelectedSubjectId(assignedSubjectsList[0].id);
          setSelectedSubjectName(assignedSubjectsList[0].name);
          setSelectedSubjectCode(assignedSubjectsList[0].code);
          setIsCustomSubject(false);
        } else {
          setCatalogSubjects([]);
          setIsCustomSubject(true);
        }

        setAuthorizedClasses(classesList);

        // Pre-initialize Year, Branch, Section with faculty assigned scopes
        if (assignedScopeYears.length > 0) {
          setSelectedAcademicYear(assignedScopeYears[0]);
        }
        if (assignedScopeBranches.length > 0) {
          setSelectedBranch(assignedScopeBranches[0]);
        }
        if (assignedScopeSections.length > 0) {
          setSelectedSection(assignedScopeSections[0]);
        }

        // 4. Check if faculty already has an active session in progress
        const activeRes = await axios.get(`${API_URL}/attendance/sessions/active`, { headers });
        const existingSessions = activeRes.data?.sessions || [];
        setCampusSessions(existingSessions);

        const currentUserId = user?._id?.toString();
        const myOngoing = existingSessions.find((s) => {
          const fid = s.facultyId?._id || s.facultyId;
          return fid && fid.toString() === currentUserId;
        });

        if (myOngoing) {
          setActiveSession(myOngoing);
          setIsObservingOnly(false);
          setQrToken(myOngoing.qrSessionIdentifier || '');
          setQrExpiresAt(myOngoing.qrExpiresAt ? new Date(myOngoing.qrExpiresAt) : null);

          // Fetch full session details & roster
          const sessionDetailsRes = await axios.get(`${API_URL}/attendance/sessions/${myOngoing._id}`, { headers });
          if (sessionDetailsRes.data?.records) {
            setRoster(sessionDetailsRes.data.records);
          }
        }
      } catch (err) {
        console.error('Error initializing faculty attendance config:', err);
        setConfigError(err.response?.data?.error || 'Unable to load attendance configuration.');
      } finally {
        setLoadingConfig(false);
      }
    };

    loadConfiguration();
  }, [token, user, assignedScopeYears, assignedScopeBranches, assignedScopeSections]);

  // ============================================================
  // 2. RENDER QR CODE ON CANVAS
  // ============================================================
  useEffect(() => {
    if (!qrToken || !activeSession) return;

    // Build standard payload encoding session ID and temporary token
    // NEVER encode room coordinates, passwords, or credentials
    const qrPayload = JSON.stringify({
      sessionId: activeSession._id,
      token: qrToken,
      subject: activeSession.subject?.name || activeSession.subjectId?.name || 'Class',
      room: activeSession.room?.roomNumber || 'Room'
    });

    const renderQr = (canvas) => {
      if (!canvas) return;
      QRCode.toCanvas(canvas, qrPayload, {
        width: isProjectorMode ? 420 : 300,
        margin: 2,
        color: {
          dark: '#0f172a', // Slate 900
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      }, (err) => {
        if (err) console.error('QR rendering error:', err);
      });
    };

    renderQr(qrCanvasRef.current);
    if (isProjectorMode && projectorCanvasRef.current) {
      renderQr(projectorCanvasRef.current);
    }
  }, [qrToken, activeSession, isProjectorMode]);

  // ============================================================
  // 3. SOCKET.IO INTEGRATION (REAL-TIME LIVE ROSTER)
  // ============================================================
  useEffect(() => {
    if (!activeSession?._id) return;

    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Join active attendance session room
      socket.emit('join_attendance_session', activeSession._id);
    });

    // Listen for live student check-ins
    socket.on('attendance_checked_in', (payload) => {
      // Safely update live roster without exposing GPS
      setRoster((prev) => {
        const exists = prev.some((r) => r.studentId === payload.studentId || r.rollNumber === payload.rollNumber);
        if (exists) return prev;
        return [
          {
            _id: payload.recordId,
            studentId: payload.studentId,
            rollNumber: payload.rollNumber,
            studentName: payload.studentName,
            status: payload.status || 'PRESENT',
            scannedAt: payload.scannedAt || new Date().toISOString(),
            verificationMethod: 'QR_SCAN',
            locationVerificationStatus: 'VERIFIED'
          },
          ...prev
        ];
      });

      // Update active session counters
      setActiveSession((prev) => {
        if (!prev) return prev;
        const newPresent = payload.totalPresent !== undefined ? payload.totalPresent : (prev.totalPresent || 0) + 1;
        const totalEnrolled = prev.totalEnrolled || 0;
        return {
          ...prev,
          totalPresent: newPresent,
          totalAbsent: Math.max(0, totalEnrolled - newPresent)
        };
      });
    });

    // Listen for remote QR rotation if synchronized
    socket.on('qr_token_refresh', (payload) => {
      if (payload.token) {
        setQrToken(payload.token);
        setQrExpiresAt(new Date(payload.expiresAt));
        setCountdownSeconds(payload.refreshInterval || 15);
      }
    });

    // Listen for attendance window closed & class transitioned to LIVE
    socket.on('attendance_closed_live_started', (payload) => {
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          attendanceClosed: true,
          attendanceClosedAt: payload.attendanceClosedAt,
          lectureStatus: 'LIVE_CLASS'
        };
      });
      setQrToken('');
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_attendance_session', activeSession._id);
        socketRef.current.disconnect();
      }
    };
  }, [activeSession?._id]);

  // ============================================================
  // 4. ELAPSED TIME COUNTER
  // ============================================================
  useEffect(() => {
    if (!activeSession) {
      setSessionElapsedSeconds(0);
      return;
    }

    const start = activeSession.actualStartTime ? new Date(activeSession.actualStartTime).getTime() : Date.now();
    setSessionElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));

    elapsedIntervalRef.current = setInterval(() => {
      setSessionElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, [activeSession]);

  // ============================================================
  // 5. ROTATING QR TOKEN COUNTDOWN & AUTOMATIC ROTATION
  // ============================================================
  const rotateSessionToken = async (sessionId) => {
    if (!token || !sessionId || isRotatingToken || activeSession?.attendanceClosed) return;

    setIsRotatingToken(true);
    setRotationError('');

    try {
      const res = await axios.post(
        `${API_URL}/attendance/sessions/${sessionId}/rotate-token`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success && res.data.qr) {
        setQrToken(res.data.qr.token);
        const newExpiry = new Date(res.data.qr.expiresAt);
        setQrExpiresAt(newExpiry);
        const interval = res.data.qr.refreshInterval || 15;
        setCountdownSeconds(interval);
      }
    } catch (err) {
      console.error('Error rotating QR token:', err);
      setRotationError('Token rotation delay. Re-attempting...');
    } finally {
      setIsRotatingToken(false);
    }
  };

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'ACTIVE' || activeSession.attendanceClosed) return;

    countdownIntervalRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          // Trigger token rotation on timer zero
          rotateSessionToken(activeSession._id);
          return 15; // Reset interval buffer
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [activeSession, activeSession?.attendanceClosed]);

  // ============================================================
  // 6. START ATTENDANCE SESSION
  // ============================================================
  const handleStartSession = async () => {
    setIsStartingSession(true);
    setConfigError('');

    try {
      let payload;

      if (launcherMode === 'schedule') {
        const selectedClass = authorizedClasses[selectedClassIndex];
        if (!selectedClass) {
          setConfigError('Please select a valid class assignment.');
          setIsStartingSession(false);
          return;
        }

        if (!selectedRoomId) {
          setConfigError('Please select an active classroom/lab room.');
          setIsStartingSession(false);
          return;
        }

        payload = {
          roomId: selectedRoomId,
          subjectId: selectedClass.subjectId,
          subjectName: selectedClass.subjectName,
          subjectCode: selectedClass.subjectCode,
          branch: selectedClass.branch,
          section: selectedClass.section,
          academicYear: selectedClass.academicYear,
          semester: selectedClass.semester || 1,
          period: selectedPeriod || '1',
          attendanceTimerMinutes: attendanceTimerMinutes || 10,
          qrRefreshInterval: 15,
          geofenceEnforced: true
        };
      } else {
        // Interactive Tabbed Generator Mode
        const finalSubjectName = (isCustomSubject ? customSubjectName : selectedSubjectName || '').trim();
        const finalSubjectCode = (isCustomSubject ? customSubjectCode : selectedSubjectCode || '').trim() || 'SUBJ';
        const finalRoomNumber = selectedRoomNumber.trim();
        const finalBlock = (isCustomBlock ? customBlockName : selectedBlock || 'IT Block').trim();

        if (!finalSubjectName) {
          setConfigError('Please select or specify a Subject Name.');
          setIsStartingSession(false);
          return;
        }

        if (!finalRoomNumber) {
          setConfigError('Please enter a Room Number / Lab manually.');
          setIsStartingSession(false);
          return;
        }

        // Match with existing loaded rooms if available
        const matchedRoom = rooms.find(
          (r) =>
            r.buildingName?.trim().toLowerCase() === finalBlock.toLowerCase() &&
            r.roomNumber?.trim().toLowerCase() === finalRoomNumber.toLowerCase()
        ) || rooms.find((r) => r.roomNumber?.trim().toLowerCase() === finalRoomNumber.toLowerCase()) || rooms.find((r) => r._id === selectedRoomId);

        payload = {
          roomId: matchedRoom?._id || undefined,
          buildingName: finalBlock,
          roomNumber: finalRoomNumber,
          subjectId: (!isCustomSubject && selectedSubjectId) ? selectedSubjectId : undefined,
          subjectName: finalSubjectName,
          subjectCode: finalSubjectCode,
          branch: selectedBranch || 'CSE',
          section: selectedSection || 'A',
          academicYear: selectedAcademicYear || '4th Year',
          semester: selectedAcademicYear === '1st Year' ? 1 : selectedAcademicYear === '2nd Year' ? 3 : selectedAcademicYear === '3rd Year' ? 5 : 7,
          period: selectedPeriod || '1',
          attendanceTimerMinutes: attendanceTimerMinutes || 10,
          qrRefreshInterval: 15,
          geofenceEnforced: true
        };
      }

      const res = await axios.post(`${API_URL}/attendance/sessions`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success && res.data.session) {
        const newSession = res.data.session;
        setActiveSession(newSession);
        setQrToken(newSession.qr.token);
        setQrExpiresAt(new Date(newSession.qr.expiresAt));
        setCountdownSeconds(newSession.qr.refreshInterval || 15);
        setRoster([]);
        setFinalSummary(null);
      }
    } catch (err) {
      console.error('Error starting attendance session:', err);
      setConfigError(err.response?.data?.error || 'Failed to initiate attendance session.');
    } finally {
      setIsStartingSession(false);
    }
  };

  // ============================================================
  // 6A. CLOSE ATTENDANCE WINDOW & MAKE CLASS LIVE
  // ============================================================
  const handleCloseAttendanceAndGoLive = async () => {
    if (!activeSession?._id || isClosingAttendance) return;

    setIsClosingAttendance(true);
    try {
      const res = await axios.post(
        `${API_URL}/attendance/sessions/${activeSession._id}/close-attendance`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success && res.data.session) {
        setActiveSession(res.data.session);
        setQrToken('');
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    } catch (err) {
      console.error('Error closing attendance window:', err);
      alert(err.response?.data?.error || 'Failed to close attendance.');
    } finally {
      setIsClosingAttendance(false);
    }
  };

  // ============================================================
  // 7. CLOSE ATTENDANCE SESSION
  // ============================================================
  const handleConfirmClose = async () => {
    if (!activeSession?._id) return;

    setIsClosingSession(true);
    try {
      const res = await axios.post(
        `${API_URL}/attendance/sessions/${activeSession._id}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setFinalSummary(res.data.summary);
        setActiveSession(null);
        setQrToken('');
        setShowCloseModal(false);
        setIsProjectorMode(false);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      }
    } catch (err) {
      console.error('Error closing attendance session:', err);
      alert(err.response?.data?.error || 'Failed to finalize attendance session.');
    } finally {
      setIsClosingSession(false);
    }
  };

  // Computed metrics
  const totalEnrolled = activeSession?.totalEnrolled || 0;
  const totalPresent = roster.filter(r => r.status === 'PRESENT').length || (activeSession?.totalPresent || 0);
  const totalAbsent = Math.max(0, totalEnrolled - totalPresent);
  const attendanceRate = totalEnrolled > 0 ? Math.round((totalPresent / totalEnrolled) * 100) : 0;

  return (
    <>
      <Header title="Smart Attendance — Faculty Console" />

      <div className="content-wrapper faculty-attendance-content animate-fade">
        <div className="faculty-attendance-container">

          {/* Top Banner / Breadcrumb */}
          <div className="attendance-page-header">
            <div>
              <h1 className="attendance-page-title">
                <span className="title-icon">📡</span>
                CampusBridge Smart Attendance
              </h1>
              <p className="attendance-page-subtitle">
                Anti-Proxy Dynamic QR Rotation &bull; Room Geofencing &bull; Live Socket Roster
              </p>
            </div>

            {activeSession && (
              <div className="header-actions">
                <button
                  type="button"
                  className="btn-projector-toggle"
                  onClick={() => setIsProjectorMode(!isProjectorMode)}
                  title="Toggle Fullscreen Projector Mode"
                >
                  📽️ {isProjectorMode ? 'Exit Projector Mode' : 'Projector Mode'}
                </button>
                {isObservingOnly ? (
                  <button
                    type="button"
                    className="btn-exit-observation"
                    onClick={handleExitObservation}
                  >
                    ⬅️ Back to All Live Classes
                  </button>
                ) : (
                  <>
                    {!activeSession.attendanceClosed ? (
                      <button
                        type="button"
                        className="btn-close-attendance-live"
                        onClick={handleCloseAttendanceAndGoLive}
                        disabled={isClosingAttendance}
                        title="Close student scanning and transition class to LIVE"
                      >
                        {isClosingAttendance ? 'Locking...' : '🔒 Close Attendance & Mark Class LIVE'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-close-session"
                        onClick={() => setShowCloseModal(true)}
                        title="Finalize live lecture session"
                      >
                        🏁 End Live Class &amp; Finalize Session
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Error Banner */}
          {configError && (
            <div className="attendance-alert-banner alert-error animate-slide-down">
              <span>⚠️ {configError}</span>
              <button type="button" onClick={() => setConfigError('')}>&times;</button>
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW A: NO ACTIVE SESSION -> CONFIGURATION & LAUNCH LAUNCHPAD */}
          {/* ============================================================ */}
          {!activeSession && (
            <div className="attendance-launcher-wrapper animate-fade">
              {/* Top View Selector: Live Classes Monitor vs Session Launcher */}
              {(isSupervisor || campusSessions.length > 0) && (
                <div className="attendance-launcher-modes-bar" style={{ marginBottom: '1.25rem' }}>
                  <button
                    type="button"
                    className={`launcher-mode-tab ${activeTabMode === 'monitor' ? 'active' : ''}`}
                    onClick={() => setActiveTabMode('monitor')}
                  >
                    📡 Live Classes Monitor ({campusSessions.length} Active Now)
                  </button>
                  <button
                    type="button"
                    className={`launcher-mode-tab ${activeTabMode === 'launch' ? 'active' : ''}`}
                    onClick={() => setActiveTabMode('launch')}
                  >
                    ⚡ Faculty QR Session Launcher
                  </button>
                </div>
              )}

              {/* SUPERVISORY LIVE CLASSES MONITOR */}
              {activeTabMode === 'monitor' && (
                <div className="supervisory-monitor-view animate-fade">
                  <div className="monitor-header-card">
                    <div className="monitor-title-group">
                      <div className="live-beacon-group">
                        <span className="live-pulsing-badge">
                          <span className="live-radar-dot"></span>
                          LIVE CAMPUS TELEMETRY
                        </span>
                        <span className="live-period-tag" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                          {campusSessions.length} {campusSessions.length === 1 ? 'Class' : 'Classes'} In Session
                        </span>
                      </div>
                      <h2>
                        {isHOD ? `${user?.department || user?.branch || ''} Department Live Classes` : 'Campus-Wide Live Classes & Attendance Stream'}
                      </h2>
                      <p className="monitor-subtext">
                        Real-time lecture surveillance with live ticking timers, physical room geofencing, and student turnout.
                      </p>
                    </div>

                    <div className="header-actions">
                      <button
                        type="button"
                        className="btn-refresh-monitor"
                        onClick={fetchCampusSessions}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#e2e8f0',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          padding: '0.6rem 1.1rem',
                          borderRadius: '10px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        🔄 Refresh Stream
                      </button>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="monitor-filters-bar">
                    <span className="monitor-filter-lbl">Branch:</span>
                    <div className="monitor-filter-pills">
                      {['ALL', ...BRANCHES].map((br) => (
                        <button
                          key={br}
                          type="button"
                          className={`monitor-filter-btn ${monitorBranchFilter === br ? 'active' : ''}`}
                          onClick={() => setMonitorBranchFilter(br)}
                        >
                          {br}
                        </button>
                      ))}
                    </div>

                    <span className="monitor-filter-lbl" style={{ marginLeft: '12px' }}>Period:</span>
                    <div className="monitor-filter-pills">
                      {['ALL', '1', '2', '3', '4', '5', '6', '7'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`monitor-filter-btn ${monitorPeriodFilter === p ? 'active' : ''}`}
                          onClick={() => setMonitorPeriodFilter(p)}
                        >
                          {p === 'ALL' ? 'All Periods' : `P${p}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtered Active Sessions Grid */}
                  {(() => {
                    const filtered = campusSessions.filter((s) => {
                      const matchBranch = monitorBranchFilter === 'ALL' || (s.branch || '').toUpperCase() === monitorBranchFilter.toUpperCase();
                      const matchPeriod = monitorPeriodFilter === 'ALL' || (s.period || '1') === monitorPeriodFilter;
                      return matchBranch && matchPeriod;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="empty-campus-sessions animate-fade">
                          <div className="empty-sessions-icon">🏛️</div>
                          <h3>No Active Classes Running Currently</h3>
                          <p>
                            {campusSessions.length === 0
                              ? 'There are currently no live lectures in session across campus. Timetable is currently on break or between periods.'
                              : `No active sessions match filter "${monitorBranchFilter}" / Period "${monitorPeriodFilter}".`}
                          </p>
                          {isFaculty && (
                            <button
                              type="button"
                              className="btn-launch-session"
                              style={{ width: 'auto', display: 'inline-block', padding: '0.65rem 1.4rem' }}
                              onClick={() => setActiveTabMode('launch')}
                            >
                              ⚡ Start an Attendance Session
                            </button>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div className="monitor-grid">
                        {filtered.map((sess) => {
                          const elapsed = getElapsedSeconds(sess.actualStartTime);
                          const total = sess.totalEnrolled || 0;
                          const present = sess.totalPresent || 0;
                          const pct = total > 0 ? Math.round((present / total) * 100) : 0;

                          return (
                            <div key={sess._id} className="monitor-class-card is-live animate-fade">
                              <div className="monitor-card-top">
                                <div>
                                  <div className="live-beacon-group" style={{ marginBottom: '6px' }}>
                                    {sess.attendanceClosed || sess.lectureStatus === 'LIVE_CLASS' ? (
                                      <span className="live-pulsing-badge live-pulsing-badge-red" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                                        <span className="live-radar-dot live-radar-dot-red" style={{ background: '#ef4444' }}></span> 🔴 LIVE CLASS
                                      </span>
                                    ) : (
                                      <span className="live-pulsing-badge">
                                        <span className="live-radar-dot"></span> 📡 ATTENDANCE OPEN
                                      </span>
                                    )}
                                    <span className="live-period-tag">Period {sess.period || '1'}</span>
                                    {sess.attendanceClosed && (
                                      <span className="live-status-pill-closed" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                        Attendance Locked
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="card-subject-name">{sess.subjectId?.name || sess.subject?.name || 'Academic Class'}</h3>
                                  <span className="card-subject-code">{sess.subjectId?.code || sess.subject?.code || ''}</span>
                                </div>
                                <div className="monitor-timer-badge">
                                  <span className="monitor-timer-val">⏱️ {formatLiveTimer(elapsed)}</span>
                                  <span className="monitor-timer-sub">Elapsed</span>
                                </div>
                              </div>

                              <div className="monitor-meta-grid">
                                <div className="monitor-meta-item">
                                  <span className="monitor-meta-lbl">Faculty</span>
                                  <span className="monitor-meta-val">{sess.facultyId?.name || 'Assigned Staff'}</span>
                                </div>
                                <div className="monitor-meta-item">
                                  <span className="monitor-meta-lbl">Room</span>
                                  <span className="monitor-meta-val">{sess.roomId?.buildingName} {sess.roomId?.roomNumber || 'Room'}</span>
                                </div>
                                <div className="monitor-meta-item">
                                  <span className="monitor-meta-lbl">Cohort</span>
                                  <span className="monitor-meta-val">{sess.academicYear} &bull; {sess.branch} - Sec {sess.section}</span>
                                </div>
                                <div className="monitor-meta-item">
                                  <span className="monitor-meta-lbl">Geofence</span>
                                  <span className="monitor-meta-val text-success">🛡️ {sess.roomId?.geofenceRadiusMeters || 30}m Active</span>
                                </div>
                              </div>

                              <div className="monitor-turnout-section">
                                <div className="monitor-turnout-labels">
                                  <span>Turnout: <strong>{present} / {total}</strong></span>
                                  <span className="turnout-pct">{pct}%</span>
                                </div>
                                <div className="monitor-turnout-track">
                                  <div className="monitor-turnout-fill" style={{ width: `${Math.min(100, pct)}%` }}></div>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="btn-inspect-session"
                                onClick={() => handleInspectSession(sess)}
                              >
                                👁️ Inspect Live Session &amp; Roster
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SESSION LAUNCHER (When monitor is not active or user toggles to launcher) */}
              {activeTabMode === 'launch' && (
                <div>
                  {/* Top Navigation Mode Bar */}
                  <div className="attendance-launcher-modes-bar">
                    <button
                      type="button"
                      className={`launcher-mode-tab ${launcherMode === 'interactive' ? 'active' : ''}`}
                      onClick={() => setLauncherMode('interactive')}
                    >
                      ⚡ Custom QR Code Generator (Tabs &amp; Selectors)
                    </button>
                    <button
                      type="button"
                      className={`launcher-mode-tab ${launcherMode === 'schedule' ? 'active' : ''}`}
                      onClick={() => setLauncherMode('schedule')}
                    >
                      📅 Today's Assigned Timetable ({authorizedClasses.length} Available)
                    </button>
                  </div>

              {/* MODE 1: INTERACTIVE TABBED QR GENERATOR */}
              {launcherMode === 'interactive' && (
                <div>
                  {/* Category Filter Sub-Tabs */}
                  <div className="config-subtabs-nav">
                    <button
                      type="button"
                      className={`config-subtab-btn ${configSubTab === 'all' ? 'active' : ''}`}
                      onClick={() => setConfigSubTab('all')}
                    >
                      📋 All Parameters
                    </button>
                    <button
                      type="button"
                      className={`config-subtab-btn ${configSubTab === 'subject' ? 'active' : ''}`}
                      onClick={() => setConfigSubTab('subject')}
                    >
                      📖 1. Subject ({isCustomSubject ? (customSubjectName || 'Custom') : (selectedSubjectName || 'Select Subject')})
                    </button>
                    <button
                      type="button"
                      className={`config-subtab-btn ${configSubTab === 'block_room' ? 'active' : ''}`}
                      onClick={() => setConfigSubTab('block_room')}
                    >
                      🏢 2. Block &amp; Room ({isCustomBlock ? (customBlockName || 'Custom') : selectedBlock} &bull; {selectedRoomNumber || 'Enter Room'})
                    </button>
                    <button
                      type="button"
                      className={`config-subtab-btn ${configSubTab === 'cohort' ? 'active' : ''}`}
                      onClick={() => setConfigSubTab('cohort')}
                    >
                      🎓 3. Year &amp; Section ({selectedAcademicYear} &bull; {selectedBranch} &bull; Sec {selectedSection})
                    </button>
                    <button
                      type="button"
                      className={`config-subtab-btn ${configSubTab === 'period' ? 'active' : ''}`}
                      onClick={() => setConfigSubTab('period')}
                    >
                      ⏰ 4. Period &amp; Timer (P{selectedPeriod} &bull; {attendanceTimerMinutes}m)
                    </button>
                  </div>

                  <div className="session-launcher-grid">
                    {/* Left Column: Interactive Tabbed Controls */}
                    <div className="launcher-card interactive-config-container">

                      {/* SUB-SECTION 1: ASSIGNED SUBJECTS ONLY */}
                      {(configSubTab === 'all' || configSubTab === 'subject') && (
                        <div className="config-section-group animate-fade">
                          <label className="config-section-label">
                            📖 Course / Subject
                            <span className="label-hint">Showing only subjects assigned to your faculty profile</span>
                          </label>
                          <div className="config-pills-row">
                            {catalogSubjects.map((sub) => {
                              const isSelected = !isCustomSubject && (selectedSubjectName === sub.name || selectedSubjectId === sub.id);
                              return (
                                <button
                                  key={sub.id || sub.code || sub.name}
                                  type="button"
                                  className={`config-pill-btn ${isSelected ? 'active' : ''}`}
                                  onClick={() => {
                                    setIsCustomSubject(false);
                                    setSelectedSubjectId(sub.id || '');
                                    setSelectedSubjectName(sub.name);
                                    setSelectedSubjectCode(sub.code);
                                  }}
                                >
                                  <span>{sub.name}</span>
                                  <span className="pill-code">{sub.code}</span>
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              className={`config-pill-btn ${isCustomSubject ? 'active' : ''}`}
                              onClick={() => setIsCustomSubject(true)}
                            >
                              <span>✏️ + Other / Custom Subject</span>
                            </button>
                          </div>

                          {catalogSubjects.length === 0 && !isCustomSubject && (
                            <div className="empty-assigned-notice" style={{ margin: '10px 0', padding: '10px 14px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', color: '#a5b4fc', fontSize: '0.86rem' }}>
                              ℹ️ No subjects are explicitly assigned to your profile in Managed Scopes. Please enter your subject manually below or contact the Administrator.
                            </div>
                          )}

                          {isCustomSubject && (
                            <div className="custom-input-box animate-slide-down">
                              <div className="custom-input-grid">
                                <div>
                                  <label>Custom Subject Name</label>
                                  <input
                                    type="text"
                                    className="custom-text-input"
                                    placeholder="e.g. Unified Modelling Language Lab"
                                    value={customSubjectName}
                                    onChange={(e) => setCustomSubjectName(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label>Course Code</label>
                                  <input
                                    type="text"
                                    className="custom-text-input"
                                    placeholder="e.g. GR22A4064"
                                    value={customSubjectCode}
                                    onChange={(e) => setCustomSubjectCode(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUB-SECTION 2: BLOCK & MANUAL ROOM */}
                      {(configSubTab === 'all' || configSubTab === 'block_room') && (
                        <div className="config-section-group animate-fade">
                          <label className="config-section-label">
                            🏢 Campus Block / Building
                            <span className="label-hint">Select the physical campus facility or specify custom block</span>
                          </label>
                          <div className="config-pills-row">
                            {CAMPUS_BLOCKS.map((blk) => (
                              <button
                                key={blk.id}
                                type="button"
                                className={`config-pill-btn ${!isCustomBlock && selectedBlock === blk.id ? 'active' : ''}`}
                                onClick={() => {
                                  setIsCustomBlock(false);
                                  setSelectedBlock(blk.id);
                                }}
                              >
                                <span>{blk.icon} {blk.name}</span>
                              </button>
                            ))}
                            <button
                              type="button"
                              className={`config-pill-btn ${isCustomBlock ? 'active' : ''}`}
                              onClick={() => setIsCustomBlock(true)}
                            >
                              <span>✏️ + Other / Custom Block</span>
                            </button>
                          </div>

                          {isCustomBlock && (
                            <div className="custom-input-box animate-slide-down" style={{ marginTop: '10px' }}>
                              <label>Custom Campus Block / Building Name</label>
                              <input
                                type="text"
                                className="custom-text-input"
                                placeholder="e.g. Science & Humanities Block, New Tech Wing"
                                value={customBlockName}
                                onChange={(e) => setCustomBlockName(e.target.value)}
                              />
                            </div>
                          )}

                          <label className="config-section-label" style={{ marginTop: '16px' }}>
                            📍 Room Number in {isCustomBlock ? (customBlockName || 'Custom Block') : selectedBlock}
                            <span className="label-hint">Enter laboratory or lecture hall manually</span>
                          </label>
                          <div className="manual-room-input-box">
                            <input
                              type="text"
                              className="custom-text-input manual-room-text-input"
                              placeholder="e.g. Lab 03,3502, Room 3501, Seminar Hall A"
                              value={selectedRoomNumber}
                              onChange={(e) => setSelectedRoomNumber(e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {/* SUB-SECTION 3: ASSIGNED ACADEMIC YEAR, BRANCH & SECTION */}
                      {(configSubTab === 'all' || configSubTab === 'cohort') && (
                        <div className="config-section-group animate-fade">
                          <label className="config-section-label">
                            🎓 Academic Year
                            <span className="label-hint">
                              {assignedScopeYears.length > 0 ? 'Assigned scope year(s) for your profile' : 'Which year of study is assigned'}
                            </span>
                          </label>
                          <div className="academic-years-grid">
                            {(assignedScopeYears.length > 0
                              ? ACADEMIC_YEARS.filter((yr) =>
                                  assignedScopeYears.some(
                                    (ay) =>
                                      ay.toLowerCase() === yr.id.toLowerCase() ||
                                      ay.toLowerCase().includes(yr.id.toLowerCase().split(' ')[0])
                                  )
                                )
                              : ACADEMIC_YEARS
                            ).map((yr) => (
                              <button
                                key={yr.id}
                                type="button"
                                className={`academic-year-card ${selectedAcademicYear === yr.id ? 'active' : ''}`}
                                onClick={() => setSelectedAcademicYear(yr.id)}
                              >
                                <strong className="year-title">{yr.label}</strong>
                                <span className="year-sub">{yr.sub}</span>
                              </button>
                            ))}
                          </div>

                          <div className="cohort-branch-section-grid" style={{ marginTop: '16px' }}>
                            <div>
                              <label className="config-section-label">
                                🏫 Branch / Department
                                <span className="label-hint">
                                  {assignedScopeBranches.length > 0 ? 'Assigned branch' : 'Department'}
                                </span>
                              </label>
                              <div className="config-pills-row">
                                {(assignedScopeBranches.length > 0 ? assignedScopeBranches : BRANCHES).map((br) => (
                                  <button
                                    key={br}
                                    type="button"
                                    className={`config-pill-btn ${selectedBranch === br ? 'active' : ''}`}
                                    onClick={() => setSelectedBranch(br)}
                                  >
                                    <span>{br}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="config-section-label">
                                👥 Section
                                <span className="label-hint">
                                  {assignedScopeSections.length > 0 ? 'Assigned sections' : 'Section'}
                                </span>
                              </label>
                              <div className="config-pills-row">
                                {(assignedScopeSections.length > 0 ? assignedScopeSections : SECTIONS).map((sec) => (
                                  <button
                                    key={sec}
                                    type="button"
                                    className={`config-pill-btn ${selectedSection === sec ? 'active' : ''}`}
                                    onClick={() => setSelectedSection(sec)}
                                  >
                                    <span>Section {sec}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SUB-SECTION 4: MANUAL PERIOD NUMBER & ATTENDANCE TIMER */}
                      {(configSubTab === 'all' || configSubTab === 'period') && (
                        <div className="config-section-group animate-fade">
                          <label className="config-section-label">
                            ⏰ Period Number &amp; Schedule Slot
                            <span className="label-hint">Enter the period number manually or choose a preset slot</span>
                          </label>

                          <div className="manual-period-input-box">
                            <div className="custom-input-grid">
                              <div>
                                <label>Period Number (Manual Entry)</label>
                                <input
                                  type="text"
                                  className="custom-text-input"
                                  placeholder="e.g. 1, 2, 3, or Lab Slot 1"
                                  value={selectedPeriod}
                                  onChange={(e) => setSelectedPeriod(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="period-quick-presets" style={{ marginTop: '12px' }}>
                              <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                                Timetable Period Presets:
                              </span>
                              <div className="period-pills-grid">
                                {PERIOD_SLOTS.map((slot) => (
                                  <button
                                    key={slot.num}
                                    type="button"
                                    className={`period-pill-btn ${selectedPeriod === slot.num ? 'active' : ''}`}
                                    onClick={() => setSelectedPeriod(slot.num)}
                                  >
                                    <span className="period-num">Period {slot.num}</span>
                                    <span className="period-time">{slot.time}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="attendance-timer-config-box" style={{ marginTop: '22px' }}>
                            <label className="config-section-label">
                              ⏱️ Attendance Scanning Window Timer
                              <span className="label-hint">Set timer in minutes. When closed by faculty, this section immediately goes LIVE.</span>
                            </label>
                            <div className="timer-presets-row" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0' }}>
                              {[5, 10, 15, 20, 30].map((mins) => (
                                <button
                                  key={mins}
                                  type="button"
                                  className={`config-pill-btn ${attendanceTimerMinutes === mins ? 'active' : ''}`}
                                  onClick={() => setAttendanceTimerMinutes(mins)}
                                >
                                  <span>⏱️ {mins} Mins</span>
                                </button>
                              ))}
                            </div>
                            <div className="custom-timer-input-wrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Custom Window:</span>
                              <input
                                type="number"
                                min="1"
                                max="180"
                                className="custom-text-input"
                                style={{ width: '100px' }}
                                value={attendanceTimerMinutes}
                                onChange={(e) => setAttendanceTimerMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                              />
                              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Minutes</span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Right Column: Live Session Preview Card & Action */}
                    <div className="launcher-card">
                      <div className="card-header-row">
                        <h2 className="card-title">🚀 Session Spec &amp; QR Launch</h2>
                        <span className="badge-count" style={{ background: '#10b981', color: '#fff' }}>Verified Spec</span>
                      </div>
                      <p className="card-instruction">
                        Preview selected classroom parameters before generating dynamic rolling QR code.
                      </p>

                      <div className="preview-spec-card animate-fade">
                        <div className="preview-spec-grid">
                          <div className="preview-spec-item">
                            <span className="preview-spec-lbl">📖 Course / Subject</span>
                            <strong className="preview-spec-val">
                              {isCustomSubject ? (customSubjectName || 'Not Specified') : (selectedSubjectName || 'No Subject Selected')}
                            </strong>
                            <span className="preview-spec-sub">
                              Code: {isCustomSubject ? (customSubjectCode || 'CUSTOM') : (selectedSubjectCode || 'SUBJ')}
                            </span>
                          </div>

                          <div className="preview-spec-item">
                            <span className="preview-spec-lbl">🏢 Location &amp; Geofence</span>
                            <strong className="preview-spec-val">
                              {isCustomBlock ? (customBlockName || 'Custom Block') : selectedBlock} &bull; {selectedRoomNumber || 'Manual Room'}
                            </strong>
                            <span className="preview-spec-sub">
                              Room Geofence: 30m physical boundary active
                            </span>
                          </div>

                          <div className="preview-spec-item">
                            <span className="preview-spec-lbl">🎓 Target Cohort</span>
                            <strong className="preview-spec-val">
                              {selectedAcademicYear} &bull; {selectedBranch} &bull; Section {selectedSection}
                            </strong>
                            <span className="preview-spec-sub">
                              Semester {selectedAcademicYear === '1st Year' ? '1/2' : selectedAcademicYear === '2nd Year' ? '3/4' : selectedAcademicYear === '3rd Year' ? '5/6' : '7/8'}
                            </span>
                          </div>

                          <div className="preview-spec-item">
                            <span className="preview-spec-lbl">⏰ Period &amp; Timer</span>
                            <strong className="preview-spec-val" style={{ color: '#4f46e5' }}>
                              Period {selectedPeriod} &bull; {attendanceTimerMinutes}m Window
                            </strong>
                            <span className="preview-spec-sub">
                              Class transitions to LIVE upon closing attendance
                            </span>
                          </div>
                        </div>

                        <div className="security-notice-box" style={{ marginTop: '16px' }}>
                          <div className="security-badge-icon">🛡️</div>
                          <div>
                            <strong>Anti-Proxy Protection Active:</strong>
                            <ul>
                              <li>HMAC-SHA256 signed dynamic QR rotates every 15 seconds.</li>
                              <li>Authoritative GPS geofence checks student physical presence in room.</li>
                              <li>Real-time live roster synchronization via WebSocket.</li>
                            </ul>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn-launch-session"
                          onClick={handleStartSession}
                          disabled={isStartingSession || loadingConfig}
                        >
                          {isStartingSession ? (
                            <>
                              <div className="spinner-loader-sm"></div>
                              Generating QR &amp; Starting Session...
                            </>
                          ) : (
                            '🚀 Generate Dynamic QR & Start Session'
                          )}
                        </button>
                      </div>

                      {/* Final Summary Display (if closed previous session) */}
                      {finalSummary && (
                        <div className="final-summary-card animate-fade">
                          <h3 className="summary-title">✅ Previous Session Summary</h3>
                          <div className="summary-stats-grid">
                            <div className="summary-stat-box">
                              <span className="stat-num text-success">{finalSummary.totalPresent}</span>
                              <span className="stat-lbl">Present</span>
                            </div>
                            <div className="summary-stat-box">
                              <span className="stat-num text-danger">{finalSummary.totalAbsent}</span>
                              <span className="stat-lbl">Absent</span>
                            </div>
                            <div className="summary-stat-box">
                              <span className="stat-num">{finalSummary.totalEnrolled}</span>
                              <span className="stat-lbl">Total Enrolled</span>
                            </div>
                            <div className="summary-stat-box">
                              <span className="stat-num text-indigo">{finalSummary.attendancePercentage}%</span>
                              <span className="stat-lbl">Turnout</span>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: ASSIGNED TIMETABLE (FALLBACK SCHEDULE) */}
              {launcherMode === 'schedule' && (
                <div className="session-launcher-grid animate-fade">
                  {/* Left Column: Authorized Classes List */}
                  <div className="launcher-card">
                    <div className="card-header-row">
                      <h2 className="card-title">📚 Today's Authorized Classes</h2>
                      <span className="badge-count">{authorizedClasses.length} Available</span>
                    </div>
                    <p className="card-instruction">
                      Select your assigned course and section from the pre-configured timetable.
                    </p>

                    {loadingConfig ? (
                      <div className="loading-state-box">
                        <div className="spinner-loader"></div>
                        <p>Loading authorized courses &amp; rooms...</p>
                      </div>
                    ) : (
                      <div className="classes-picker-list">
                        {authorizedClasses.map((cls, idx) => (
                          <div
                            key={cls.id || idx}
                            className={`class-picker-item ${selectedClassIndex === idx ? 'selected' : ''}`}
                            onClick={() => setSelectedClassIndex(idx)}
                          >
                            <div className="picker-radio">
                              <input
                                type="radio"
                                name="selectedClass"
                                checked={selectedClassIndex === idx}
                                onChange={() => setSelectedClassIndex(idx)}
                              />
                            </div>
                            <div className="picker-info">
                              <div className="picker-subject-row">
                                <strong className="subject-name">{cls.subjectName}</strong>
                                <span className="subject-code">{cls.subjectCode}</span>
                              </div>
                              <div className="picker-meta-row">
                                <span>Branch: <strong>{cls.branch}</strong></span>
                                <span>Section: <strong>{cls.section}</strong></span>
                                <span>Year: <strong>{cls.academicYear}</strong></span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Classroom Selection & Launch Panel */}
                  <div className="launcher-card">
                    <div className="card-header-row">
                      <h2 className="card-title">📍 Classroom &amp; Period Selection</h2>
                    </div>
                    <p className="card-instruction">
                      Confirm physical classroom location and period for this assigned lecture.
                    </p>

                    <div className="form-group-box">
                      <label htmlFor="roomSelect">Select Designated Classroom / Lab</label>
                      <select
                        id="roomSelect"
                        className="select-dropdown"
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                        disabled={loadingConfig || rooms.length === 0}
                      >
                        {rooms.map((rm) => (
                          <option key={rm._id} value={rm._id}>
                            {rm.buildingName} — {rm.roomNumber} ({rm.roomType}, Floor {rm.floor}, Cap: {rm.capacity}) &bull; {rm.geofenceRadiusMeters}m Geofence
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group-box" style={{ marginTop: '14px' }}>
                      <label>Period Number</label>
                      <div className="config-pills-row">
                        {PERIOD_SLOTS.map((slot) => (
                          <button
                            key={slot.num}
                            type="button"
                            className={`config-pill-btn ${selectedPeriod === slot.num ? 'active' : ''}`}
                            onClick={() => setSelectedPeriod(slot.num)}
                          >
                            <span>Period {slot.num}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="security-notice-box">
                      <div className="security-badge-icon">🛡️</div>
                      <div>
                        <strong>Anti-Proxy Protection Active:</strong>
                        <ul>
                          <li>Dynamic rolling QR rotates every 15 seconds.</li>
                          <li>Authoritative room-level GPS verification (approx 30m boundary).</li>
                          <li>Strict duplicate check-in prevention.</li>
                        </ul>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-launch-session"
                      onClick={handleStartSession}
                      disabled={isStartingSession || loadingConfig || rooms.length === 0}
                    >
                      {isStartingSession ? (
                        <>
                          <div className="spinner-loader-sm"></div>
                          Starting Session...
                        </>
                      ) : (
                        '🚀 Start Attendance Session'
                      )}
                    </button>
                  </div>
                </div>
              )}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* VIEW B: ACTIVE SESSION RUNNING -> DYNAMIC QR & LIVE ROSTER */}
          {/* ============================================================ */}
          {activeSession && (
            <div className="active-session-layout">

              {/* Supervisory Mode Notice */}
              {isObservingOnly && (
                <div className="supervisory-obs-strip animate-fade">
                  <div>
                    <strong>👁️ Supervisory Live Observation Mode</strong> &bull; You are monitoring this active lecture in real time ({user?.role?.toUpperCase() || 'SUPERVISOR'}).
                  </div>
                  <button type="button" className="btn-exit-observation" onClick={handleExitObservation}>
                    ⬅️ Return to All Live Classes
                  </button>
                </div>
              )}

              {/* Real-Time Live Class Progress & Ticking Digital Timer Banner */}
              {(() => {
                const isAttendanceClosed = Boolean(activeSession.attendanceClosed || activeSession.lectureStatus === 'LIVE_CLASS');
                const scanningWindowMins = activeSession.attendanceTimerMinutes || attendanceTimerMinutes || 10;
                const windowRemainingSeconds = Math.max(0, scanningWindowMins * 60 - getElapsedSeconds(activeSession.actualStartTime));

                return (
                  <>
                    <div className="live-class-hero-banner animate-fade">
                      <div className="live-class-hero-left">
                        <div className="live-beacon-group">
                          {isAttendanceClosed ? (
                            <span className="live-pulsing-badge live-pulsing-badge-red" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                              <span className="live-radar-dot live-radar-dot-red" style={{ background: '#ef4444' }}></span>
                              🔴 LIVE CLASS IN PROGRESS
                            </span>
                          ) : (
                            <span className="live-pulsing-badge">
                              <span className="live-radar-dot"></span>
                              📡 ATTENDANCE SCANNING IN PROGRESS
                            </span>
                          )}
                          <span className="live-period-tag">
                            Period {activeSession.period || selectedPeriod}
                          </span>
                          {isAttendanceClosed ? (
                            <span className="live-status-pill-closed" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                              Attendance Locked
                            </span>
                          ) : (
                            <span className="live-timer-chip" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                              ⏱️ Window: {scanningWindowMins}m
                            </span>
                          )}
                        </div>
                        <div className="live-class-title-row">
                          <h2 className="live-class-subject-title">
                            {activeSession.subject?.name || activeSession.subjectId?.name || selectedSubjectName || 'Live Classroom Session'}
                          </h2>
                          <span className="live-class-code-badge">
                            {activeSession.subject?.code || activeSession.subjectId?.code || selectedSubjectCode || 'ACAD'}
                          </span>
                        </div>
                        <div className="live-class-meta-ribbon">
                          <span>📍 <strong>{activeSession.room?.buildingName || selectedBlock}</strong> — {activeSession.room?.roomNumber || selectedRoomNumber}</span>
                          <span className="bullet-sep">&bull;</span>
                          <span>🎓 <strong>{activeSession.academicYear || selectedAcademicYear}</strong> &bull; {activeSession.branch || selectedBranch} (Sec {activeSession.section || selectedSection})</span>
                          <span className="bullet-sep">&bull;</span>
                          <span>👨‍🏫 <strong>{activeSession.facultyId?.name || user?.name}</strong> {activeSession.facultyId?.designation ? `(${activeSession.facultyId.designation})` : ''}</span>
                          <span className="bullet-sep">&bull;</span>
                          <span className="geofence-live-chip">🛡️ {activeSession.room?.geofenceRadiusMeters || 30}m Geofence Active</span>
                        </div>
                      </div>

                      <div className="live-class-hero-right">
                        {isAttendanceClosed ? (
                          <div className="live-timer-card timer-card-live" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.9))', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                            <div className="timer-header-lbl" style={{ color: '#f87171' }}>⏱️ LIVE CLASS ELAPSED</div>
                            <div className="live-timer-digital-display" style={{ color: '#fecaca' }}>
                              {formatLiveTimer(getElapsedSeconds(activeSession.actualStartTime))}
                            </div>
                            <div className="timer-sub-lbl">
                              {activeSession.attendanceClosedAt ? `Attendance closed at ${formatTime(activeSession.attendanceClosedAt)}` : `Started at ${formatTime(activeSession.actualStartTime)}`}
                            </div>
                          </div>
                        ) : (
                          <div className="live-timer-card timer-card-scanning" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(15, 23, 42, 0.9))', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                            <div className="timer-header-lbl" style={{ color: '#93c5fd' }}>⏳ ATTENDANCE WINDOW</div>
                            <div className="live-timer-digital-display" style={{ color: windowRemainingSeconds < 60 ? '#f87171' : '#bfdbfe' }}>
                              {formatDuration(windowRemainingSeconds)}
                            </div>
                            <div className="timer-sub-lbl">
                              {windowRemainingSeconds === 0 ? 'Window Ended — Click Close to Go LIVE' : `${scanningWindowMins} mins total scanning window`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attendance Scanning Active Alert Strip */}
                    {!isAttendanceClosed && (
                      <div className="attendance-scan-active-bar animate-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '12px', padding: '12px 18px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.4rem' }}>📡</span>
                          <div style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                            <strong style={{ color: '#93c5fd', display: 'block', marginBottom: '2px' }}>
                              Attendance Scanning Window is Active ({scanningWindowMins} Mins Allocated)
                            </strong>
                            Students can scan the dynamic QR code in <strong>{activeSession.room?.buildingName || selectedBlock} {activeSession.room?.roomNumber || selectedRoomNumber}</strong>. When you close attendance, check-ins lock and this class transitions to <strong>LIVE</strong>.
                          </div>
                        </div>
                        {!isObservingOnly && (
                          <button
                            type="button"
                            className="btn-scan-bar-close-live"
                            onClick={handleCloseAttendanceAndGoLive}
                            disabled={isClosingAttendance}
                            style={{
                              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                              color: '#fff',
                              border: 'none',
                              padding: '10px 18px',
                              borderRadius: '8px',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            {isClosingAttendance ? 'Locking...' : '🔒 Close Attendance & Mark Class LIVE'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Live Class Announcement Strip */}
                    {isAttendanceClosed && (
                      <div className="live-class-announcement-strip animate-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px', padding: '12px 18px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.4rem' }}>🎙️</span>
                          <div style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                            <strong style={{ color: '#f87171', display: 'block', marginBottom: '2px' }}>
                              Class is LIVE in Session — Dynamic QR Scans Locked
                            </strong>
                            Attendance for this section is finalized ({totalPresent} Present &bull; {totalAbsent} Absent). Live telemetry is streaming to Department &amp; Campus Leadership.
                          </div>
                        </div>
                        {!isObservingOnly && (
                          <button
                            type="button"
                            className="btn-strip-finalize"
                            onClick={() => setShowCloseModal(true)}
                            style={{
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color: '#fff',
                              border: 'none',
                              padding: '10px 18px',
                              borderRadius: '8px',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}
                          >
                            🏁 End Live Class &amp; Finalize Session
                          </button>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Top Metrics Cards */}
              <div className="session-metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Subject &amp; Cohort</span>
                  <strong className="metric-value">
                    {activeSession.subject?.name || activeSession.subjectId?.name || selectedSubjectName || 'Class'}
                  </strong>
                  <span className="metric-sub">
                    {activeSession.branch || selectedBranch} &bull; Section {activeSession.section || selectedSection} &bull; {activeSession.academicYear || selectedAcademicYear}
                  </span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Location &amp; Period</span>
                  <strong className="metric-value">
                    {activeSession.room?.buildingName || selectedBlock} {activeSession.room?.roomNumber || selectedRoomNumber}
                  </strong>
                  <span className="metric-sub">
                    Period {activeSession.period || selectedPeriod} &bull; Radius: {activeSession.room?.geofenceRadiusMeters || 30}m Active
                  </span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Live Attendance Count</span>
                  <strong className="metric-value text-success">
                    {totalPresent} <span className="metric-total">/ {totalEnrolled}</span>
                  </strong>
                  <span className="metric-sub">
                    {totalAbsent} Pending &bull; {attendanceRate}% Turnout
                  </span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Elapsed Session Time</span>
                  <strong className="metric-value text-indigo">
                    ⏱️ {formatDuration(sessionElapsedSeconds)}
                  </strong>
                  <span className="metric-sub">
                    Started at {formatTime(activeSession.actualStartTime)}
                  </span>
                </div>
              </div>

              {/* Center Work Area: Dynamic QR Projection + Live Roster */}
              <div className="live-workarea-grid">

                {/* Left: Dynamic Rolling QR Projection Box OR Live Lecture Card */}
                {activeSession.attendanceClosed || activeSession.lectureStatus === 'LIVE_CLASS' ? (
                  <div className="live-lecture-active-card animate-fade">
                    <div className="live-lecture-card-header">
                      <div className="live-beacon-group">
                        <span className="live-pulsing-badge-red" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                          <span className="live-radar-dot live-radar-dot-red" style={{ background: '#ef4444' }}></span>
                          🔴 CLASS IS LIVE IN PROGRESS
                        </span>
                        <span className="live-status-pill-closed" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                          🔒 Attendance Closed
                        </span>
                      </div>
                      <span className="live-time-stamp" style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {activeSession.attendanceClosedAt ? `Closed at ${formatTime(activeSession.attendanceClosedAt)}` : 'Attendance Locked'}
                      </span>
                    </div>

                    <div className="live-lecture-card-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
                      <div className="live-mic-avatar" style={{ margin: '0 auto 16px', width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(99, 102, 241, 0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '2px solid rgba(239, 68, 68, 0.4)' }}>
                        🎙️
                      </div>

                      <h3 className="live-lecture-title" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#f8fafc', marginBottom: '6px' }}>
                        {activeSession.subject?.name || activeSession.subjectId?.name || selectedSubjectName || 'Live Classroom Lecture'}
                      </h3>
                      <p className="live-lecture-meta" style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '20px' }}>
                        Period {activeSession.period || selectedPeriod} &bull; {activeSession.room?.buildingName || selectedBlock} {activeSession.room?.roomNumber || selectedRoomNumber}
                      </p>

                      <div className="live-duration-pill-box" style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Active Lecture Stopwatch
                        </span>
                        <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fca5a5', fontFamily: 'monospace' }}>
                          {formatLiveTimer(getElapsedSeconds(activeSession.actualStartTime))}
                        </div>
                      </div>

                      <div className="live-roster-summary-mini" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '10px 6px' }}>
                          <span style={{ fontSize: '0.74rem', color: '#6ee7b7', display: 'block' }}>Verified Present</span>
                          <strong style={{ fontSize: '1.15rem', color: '#34d399' }}>{totalPresent}</strong>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '10px 6px' }}>
                          <span style={{ fontSize: '0.74rem', color: '#fca5a5', display: 'block' }}>Absent</span>
                          <strong style={{ fontSize: '1.15rem', color: '#f87171' }}>{totalAbsent}</strong>
                        </div>
                        <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '10px 6px' }}>
                          <span style={{ fontSize: '0.74rem', color: '#a5b4fc', display: 'block' }}>Turnout</span>
                          <strong style={{ fontSize: '1.15rem', color: '#818cf8' }}>{attendanceRate}%</strong>
                        </div>
                      </div>

                      <div className="live-lecture-info-notice" style={{ background: 'rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '20px', lineHeight: 1.5, textAlign: 'left' }}>
                        🔒 <strong>Dynamic QR Deactivated:</strong> Attendance has been closed. Students can no longer check in. Lecture is currently marked <strong>LIVE</strong> across supervisor screens.
                      </div>

                      {!isObservingOnly && (
                        <button
                          type="button"
                          className="btn-end-live-class-primary"
                          onClick={() => setShowCloseModal(true)}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color: '#fff',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '10px',
                            fontWeight: '800',
                            fontSize: '0.92rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)'
                          }}
                        >
                          🏁 End Live Class &amp; Finalize Session
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="qr-projection-card">
                    <div className="qr-card-header">
                      <div>
                        <h3 className="qr-title">Classroom Dynamic QR Code</h3>
                        <p className="qr-subtitle">Scan via CampusBridge Student Scanner</p>
                      </div>
                      <div className="timer-pill">
                        <span className="timer-icon">⏳</span>
                        <span>Rotates in <strong>{countdownSeconds}s</strong></span>
                      </div>
                    </div>

                    {/* Canvas Container */}
                    <div className="qr-canvas-wrapper">
                      <canvas ref={qrCanvasRef} className="qr-canvas"></canvas>

                      {isRotatingToken && (
                        <div className="qr-refreshing-overlay">
                          <div className="spinner-loader"></div>
                          <span>Refreshing QR Token...</span>
                        </div>
                      )}
                    </div>

                    {rotationError && (
                      <div className="rotation-warning">{rotationError}</div>
                    )}

                    {/* QR Security & Refresh Bar */}
                    <div className="qr-footer-actions">
                      <div className="qr-progress-bar">
                        <div
                          className="qr-progress-fill"
                          style={{ width: `${(countdownSeconds / 15) * 100}%` }}
                        ></div>
                      </div>

                      <div className="qr-action-row">
                        <span className="anti-proxy-badge">
                          🔒 HMAC-SHA256 Signed &bull; Geofence Active
                        </span>
                        <button
                          type="button"
                          className="btn-manual-refresh"
                          onClick={() => rotateSessionToken(activeSession._id)}
                          disabled={isRotatingToken}
                          title="Rotate QR Token immediately"
                        >
                          🔄 Refresh Now
                        </button>
                      </div>

                      {!isObservingOnly && (
                        <button
                          type="button"
                          className="btn-close-attendance-prominent"
                          onClick={handleCloseAttendanceAndGoLive}
                          disabled={isClosingAttendance}
                          style={{
                            marginTop: '12px',
                            width: '100%',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: '#fff',
                            border: 'none',
                            padding: '11px',
                            borderRadius: '10px',
                            fontWeight: '700',
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                          }}
                        >
                          {isClosingAttendance ? 'Locking Attendance...' : '🔒 Close Attendance & Mark Class LIVE'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Right: Live Updating Student Roster */}
                <div className="live-roster-card">
                  <div className="roster-header">
                    <div>
                      <h3 className="roster-title">Live Class Roster</h3>
                      <p className="roster-subtitle">Real-time socket updates as students verify presence</p>
                    </div>
                    <span className="roster-live-indicator">
                      <span className="live-dot"></span> LIVE SOCKET
                    </span>
                  </div>

                  <div className="roster-table-wrapper">
                    {roster.length === 0 ? (
                      <div className="empty-roster-state">
                        <div className="empty-icon">📱</div>
                        <p>Waiting for students to scan the QR code...</p>
                        <span>Present students will appear here in real time.</span>
                      </div>
                    ) : (
                      <table className="roster-table">
                        <thead>
                          <tr>
                            <th>Roll Number</th>
                            <th>Student Name</th>
                            <th>Time</th>
                            <th>Method</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roster.map((rec) => (
                            <tr key={rec._id || rec.studentId} className="roster-row animate-fade">
                              <td>
                                <strong className="roll-text">{rec.rollNumber}</strong>
                              </td>
                              <td>{rec.studentName}</td>
                              <td className="time-text">{formatTime(rec.scannedAt)}</td>
                              <td>
                                <span className="method-pill">{rec.verificationMethod || 'QR_SCAN'}</span>
                              </td>
                              <td>
                                <span className="status-badge-present">
                                  ✓ PRESENT
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* PROJECTOR FULLSCREEN MODAL OVERLAY */}
          {/* ============================================================ */}
          {isProjectorMode && activeSession && (
            <div className="projector-overlay-modal animate-fade">
              <div className="projector-card">
                <div className="projector-top-bar">
                  <div className="brand-group">
                    <span className="brand-logo">🏛️</span>
                    <div>
                      <h2>CampusBridge Smart Attendance</h2>
                      <p>{activeSession.subject?.name} ({activeSession.branch} - Sec {activeSession.section})</p>
                    </div>
                  </div>

                  <div className="projector-controls">
                    <div className="projector-timer">
                      ⏳ Rotates in <strong>{countdownSeconds}s</strong>
                    </div>
                    <button
                      type="button"
                      className="btn-exit-projector"
                      onClick={() => setIsProjectorMode(false)}
                    >
                      ✕ Exit Projector Mode
                    </button>
                  </div>
                </div>

                <div className="projector-body">
                  {activeSession.attendanceClosed || activeSession.lectureStatus === 'LIVE_CLASS' ? (
                    <div className="projector-live-lecture-box" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', textAlign: 'center', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: '800', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}></span>
                        🔴 CLASS IS LIVE IN PROGRESS
                      </span>
                      <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🎙️</div>
                      <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#f8fafc', marginBottom: '0.5rem' }}>
                        {activeSession.subject?.name || activeSession.subjectId?.name || selectedSubjectName}
                      </h1>
                      <p style={{ fontSize: '1.1rem', color: '#94a3b8', maxWidth: '500px', marginBottom: '2rem' }}>
                        Attendance scanning has ended and roster is locked. The classroom lecture is currently in active session.
                      </p>
                      <div style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '16px 32px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                          Elapsed Lecture Time
                        </span>
                        <div style={{ fontSize: '2.6rem', fontWeight: '900', color: '#fca5a5', fontFamily: 'monospace' }}>
                          {formatLiveTimer(getElapsedSeconds(activeSession.actualStartTime))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="projector-qr-box">
                      <canvas ref={projectorCanvasRef} className="projector-canvas"></canvas>
                      <p className="projector-instruction">
                        Scan using your mobile phone's CampusBridge Smart Attendance Scanner.
                      </p>
                    </div>
                  )}

                  <div className="projector-stats-column">
                    <div className="projector-stat-card">
                      <span className="stat-label">Location</span>
                      <strong className="stat-val">{activeSession.room?.buildingName || selectedBlock} {activeSession.room?.roomNumber || selectedRoomNumber}</strong>
                    </div>
                    <div className="projector-stat-card">
                      <span className="stat-label">Period &amp; Cohort</span>
                      <strong className="stat-val text-indigo">Period {activeSession.period || selectedPeriod} &bull; Sec {activeSession.section || selectedSection} ({activeSession.academicYear || selectedAcademicYear})</strong>
                    </div>
                    <div className="projector-stat-card">
                      <span className="stat-label">Present</span>
                      <strong className="stat-val text-success">{totalPresent} / {totalEnrolled}</strong>
                    </div>
                    <div className="projector-stat-card">
                      <span className="stat-label">Elapsed</span>
                      <strong className="stat-val text-indigo">{formatDuration(sessionElapsedSeconds)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* CONFIRM CLOSE SESSION MODAL */}
          {/* ============================================================ */}
          {showCloseModal && (
            <div className="modal-backdrop-confirm">
              <div className="modal-confirm-card animate-scale-up">
                <div className="modal-icon-badge">🔒</div>
                <h3>Submit Attendance Session?</h3>
                <p>
                  Submitting will lock active QR scanning and start an institutional 10-minute rectification period.
                  Authorized corrections can be made during this window before automated parent WhatsApp absence alerts are dispatched.
                </p>

                <div className="modal-actions-row">
                  <button
                    type="button"
                    className="btn-cancel-modal"
                    onClick={() => setShowCloseModal(false)}
                    disabled={isClosingSession}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-confirm-modal"
                    onClick={handleConfirmClose}
                    disabled={isClosingSession}
                  >
                    {isClosingSession ? 'Submitting...' : 'Yes, Submit Attendance'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default FacultyAttendanceSession;
