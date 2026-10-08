import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { API_URL, BASE_URL } from '../config/api';
import './FacultyAttendanceSession.css';

const FacultyAttendanceSession = () => {
  const { user, token } = useAuth();
  const { isFaculty, isSuperAdmin, isCampusAdmin, isAdministrator, isHOD } = usePermission();

  // State: Classes and Rooms configuration
  const [authorizedClasses, setAuthorizedClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedClassIndex, setSelectedClassIndex] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState('');

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
        }

        // 2. Resolve faculty authorized classes
        // Check managedScopes first
        const managed = Array.isArray(user?.managedScopes) ? user.managedScopes : [];
        let classesList = [];

        if (managed.length > 0) {
          // If faculty has managedScopes populated
          classesList = managed.map((item, idx) => ({
            id: `managed-${idx}`,
            subjectId: item.subject?._id || item.subject,
            subjectName: item.subject?.name || 'Assigned Subject',
            subjectCode: item.subject?.code || 'SUBJ',
            branch: item.branch || user?.branch || 'IT',
            section: item.section || 'A',
            academicYear: item.academicYear || user?.academicYear || '2024-2025',
            semester: 1
          }));
        }

        // Fetch subjects from academic API to enrich or fallback
        try {
          const subjectsRes = await axios.get(`${API_URL}/academic/subjects`, { headers });
          const fetchedSubjects = subjectsRes.data?.data || subjectsRes.data?.subjects || [];

          if (classesList.length === 0 && fetchedSubjects.length > 0) {
            classesList = fetchedSubjects.map((sub, idx) => ({
              id: `subj-${idx}`,
              subjectId: sub._id,
              subjectName: sub.name,
              subjectCode: sub.code,
              branch: sub.branch || user?.branch || 'IT',
              section: sub.section || user?.section || 'A',
              academicYear: sub.academicYear || user?.academicYear || '2024-2025',
              semester: 1
            }));
          } else if (classesList.length > 0) {
            // Enrich subject names if only ID was present
            classesList = classesList.map(cls => {
              const matched = fetchedSubjects.find(s => s._id === cls.subjectId);
              if (matched) {
                return {
                  ...cls,
                  subjectName: matched.name,
                  subjectCode: matched.code
                };
              }
              return cls;
            });
          }
        } catch (subErr) {
          // Non-blocking fallback
        }

        // Default fallback if no managed scopes found
        if (classesList.length === 0) {
          classesList = [{
            id: 'default-1',
            subjectId: user?.subjectId || null,
            subjectName: 'Core Technical Lecture',
            subjectCode: 'TECH301',
            branch: user?.branch || 'IT',
            section: user?.section || 'A',
            academicYear: user?.academicYear || '2024-2025',
            semester: 1
          }];
        }

        setAuthorizedClasses(classesList);

        // 3. Check if faculty already has an active session in progress
        const activeRes = await axios.get(`${API_URL}/attendance/sessions/active`, { headers });
        const existingSessions = activeRes.data?.sessions || [];
        if (existingSessions.length > 0) {
          const ongoing = existingSessions[0];
          setActiveSession(ongoing);
          setQrToken(ongoing.qrSessionIdentifier || '');
          setQrExpiresAt(ongoing.qrExpiresAt ? new Date(ongoing.qrExpiresAt) : null);

          // Fetch full session details & roster
          const sessionDetailsRes = await axios.get(`${API_URL}/attendance/sessions/${ongoing._id}`, { headers });
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
  }, [token, user]);

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
    if (!token || !sessionId || isRotatingToken) return;

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
    if (!activeSession || activeSession.status !== 'ACTIVE') return;

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
  }, [activeSession]);

  // ============================================================
  // 6. START ATTENDANCE SESSION
  // ============================================================
  const handleStartSession = async () => {
    const selectedClass = authorizedClasses[selectedClassIndex];
    if (!selectedClass) {
      setConfigError('Please select a valid class assignment.');
      return;
    }

    if (!selectedRoomId) {
      setConfigError('Please select an active classroom/lab room.');
      return;
    }

    setIsStartingSession(true);
    setConfigError('');

    try {
      const payload = {
        roomId: selectedRoomId,
        subjectId: selectedClass.subjectId,
        branch: selectedClass.branch,
        section: selectedClass.section,
        academicYear: selectedClass.academicYear,
        semester: selectedClass.semester || 1,
        period: '1',
        qrRefreshInterval: 15,
        geofenceEnforced: true
      };

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
                <button
                  type="button"
                  className="btn-close-session"
                  onClick={() => setShowCloseModal(true)}
                >
                  🔒 Close &amp; Finalize Session
                </button>
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
            <div className="session-launcher-grid">
              {/* Left Column: Authorized Classes List */}
              <div className="launcher-card">
                <div className="card-header-row">
                  <h2 className="card-title">📚 Today's Authorized Classes</h2>
                  <span className="badge-count">{authorizedClasses.length} Available</span>
                </div>
                <p className="card-instruction">
                  Select your assigned course and section to initialize attendance verification.
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
                  <h2 className="card-title">📍 Classroom &amp; Room-Level Geofence</h2>
                </div>
                <p className="card-instruction">
                  Confirm physical classroom location. Room-level boundary is strictly enforced.
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

                {/* Final Summary Display (if just closed a previous session) */}
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
          )}

          {/* ============================================================ */}
          {/* VIEW B: ACTIVE SESSION RUNNING -> DYNAMIC QR & LIVE ROSTER */}
          {/* ============================================================ */}
          {activeSession && (
            <div className="active-session-layout">

              {/* Top Metrics Cards */}
              <div className="session-metrics-grid">
                <div className="metric-card">
                  <span className="metric-label">Subject &amp; Section</span>
                  <strong className="metric-value">
                    {activeSession.subject?.name || activeSession.subjectId?.name || 'Class'}
                  </strong>
                  <span className="metric-sub">
                    {activeSession.branch} &bull; Section {activeSession.section}
                  </span>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Room &amp; Geofence</span>
                  <strong className="metric-value">
                    {activeSession.room?.buildingName} {activeSession.room?.roomNumber}
                  </strong>
                  <span className="metric-sub">
                    Radius: {activeSession.room?.geofenceRadiusMeters || 30}m Active
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

                {/* Left: Dynamic Rolling QR Projection Box */}
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
                  </div>
                </div>

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
                  <div className="projector-qr-box">
                    <canvas ref={projectorCanvasRef} className="projector-canvas"></canvas>
                    <p className="projector-instruction">
                      Scan using your mobile phone's CampusBridge Smart Attendance Scanner.
                    </p>
                  </div>

                  <div className="projector-stats-column">
                    <div className="projector-stat-card">
                      <span className="stat-label">Room</span>
                      <strong className="stat-val">{activeSession.room?.buildingName} {activeSession.room?.roomNumber}</strong>
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
                <h3>Close &amp; Finalize Attendance Session?</h3>
                <p>
                  Closing will lock the session immediately, stop active QR rotation, and calculate final attendance records.
                  Students will no longer be able to check in.
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
                    {isClosingSession ? 'Finalizing...' : 'Yes, Finalize Session'}
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
