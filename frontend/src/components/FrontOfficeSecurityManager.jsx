import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './FrontOfficeSecurityManager.css';

const FrontOfficeSecurityManager = ({ defaultTab = 'overview' }) => {
  const { user, token } = useAuth();

  // Active sub-tab in Front Office & Security domain
  const [activeTab, setActiveTab] = useState(defaultTab || 'overview');

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // Loading, refreshing & error state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Overview KPIs
  const [kpiData, setKpiData] = useState({
    activeVisitorsCount: 0,
    expectedVisitorsCount: 0,
    completedVisitsCount: 0,
    deniedScansCount: 0,
    todayDateKey: '',
    serverTime: null
  });

  // Visitor Passes Roster
  const [passes, setPasses] = useState([]);
  const [passFilterStatus, setPassFilterStatus] = useState('');
  const [passSearchQuery, setPassSearchQuery] = useState('');

  // Register Visitor Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [idDocumentType, setIdDocumentType] = useState('GOVERNMENT_ID');
  const [maskedIdNumber, setMaskedIdNumber] = useState('');
  const [purpose, setPurpose] = useState('OFFICIAL_MEETING');
  const [purposeDetails, setPurposeDetails] = useState('');
  const [hostType, setHostType] = useState('FACULTY');
  const [hostName, setHostName] = useState('');
  const [hostUser, setHostUser] = useState('');
  const [permittedStartTime, setPermittedStartTime] = useState('');
  const [permittedEndTime, setPermittedEndTime] = useState('');
  const [allowReentry, setAllowReentry] = useState(false);
  const [hostSearchResults, setHostSearchResults] = useState([]);
  const [isSearchingHost, setIsSearchingHost] = useState(false);

  // Issued Pass View Modal (with QR)
  const [viewingPass, setViewingPass] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Revoke Modal
  const [revokingPassId, setRevokingPassId] = useState(null);
  const [revocationReason, setRevocationReason] = useState('');

  // Security Scanner Console
  const [scannerActive, setScannerActive] = useState(false);
  const [manualIdentifier, setManualIdentifier] = useState('');
  const [gateName, setGateName] = useState('Main Gate 1');
  const [lastValidationResult, setLastValidationResult] = useState(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const scannerRef = useRef(null);

  // Guardian Verification Desk
  const [guardianRecords, setGuardianRecords] = useState([]);
  const [guardianSearch, setGuardianSearch] = useState('');
  const [showVerifyGuardianModal, setShowVerifyGuardianModal] = useState(false);
  const [selectedStudentForVerification, setSelectedStudentForVerification] = useState(null);
  const [verifyGuardianName, setVerifyGuardianName] = useState('');
  const [verifyRelationship, setVerifyRelationship] = useState('FATHER');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyProofType, setVerifyProofType] = useState('GOVERNMENT_RELATION_PROOF');
  const [verifyProofRef, setVerifyProofRef] = useState('');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [revokingGuardianId, setRevokingGuardianId] = useState(null);
  const [guardianRevocationReason, setGuardianRevocationReason] = useState('');

  const canVerifyGuardian = ['admin', 'super_admin', 'campus_admin', 'administrator', 'front_office'].includes(user?.role);

  // Gate Access Events Log
  const [gateEvents, setGateEvents] = useState([]);
  const [eventFilterDecision, setEventFilterDecision] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // =========================================================================
  // DATA FETCHING ROUTINES
  // =========================================================================

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/visitors/overview`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setKpiData(data.data);
      } else {
        setErrorMsg(data.error || 'Failed to load visitor overview.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchPasses = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      let url = `${API_URL}/visitors/passes?search=${encodeURIComponent(passSearchQuery)}`;
      if (passFilterStatus) url += `&status=${passFilterStatus}`;
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setPasses(data.data || []);
      } else {
        setErrorMsg(data.error || 'Failed to load passes.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, passFilterStatus, passSearchQuery]);

  const fetchGuardianVerifications = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const url = `${API_URL}/guardians/verifications?search=${encodeURIComponent(guardianSearch)}`;
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setGuardianRecords(data.data || []);
      } else {
        setErrorMsg(data.error || 'Failed to load guardian records.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, guardianSearch]);

  const fetchGateEvents = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      let url = `${API_URL}/security-gate/events?limit=100`;
      if (eventFilterDecision) url += `&decision=${eventFilterDecision}`;
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setGateEvents(data.data || []);
      } else {
        setErrorMsg(data.error || 'Failed to load security audit events.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, eventFilterDecision]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview();
      fetchPasses();
    } else if (activeTab === 'visitor-passes') {
      fetchPasses();
    } else if (activeTab === 'guardian-cards') {
      fetchGuardianVerifications();
    } else if (activeTab === 'gate-events') {
      fetchGateEvents();
    }
  }, [activeTab, fetchOverview, fetchPasses, fetchGuardianVerifications, fetchGateEvents]);

  // =========================================================================
  // HOST SEARCH TYPEAHEAD
  // =========================================================================
  const handleHostSearch = async (query) => {
    setHostName(query);
    if (!query || query.length < 2) {
      setHostSearchResults([]);
      return;
    }
    try {
      setIsSearchingHost(true);
      const res = await fetch(`${API_URL}/visitors/search-hosts?q=${encodeURIComponent(query)}&type=${hostType}`, {
        headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        setHostSearchResults(data.data || []);
      }
    } catch (_) {
    } finally {
      setIsSearchingHost(false);
    }
  };

  const handleSelectHost = (h) => {
    setHostUser(h._id);
    setHostName(`${h.name} (${h.rollNumber || h.email})`);
    setHostSearchResults([]);
  };

  // =========================================================================
  // REGISTER VISITOR & ISSUE PASS
  // =========================================================================
  const handleRegisterVisitor = async (e) => {
    e.preventDefault();
    try {
      setActionProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        visitorName,
        visitorPhone,
        visitorEmail,
        organization,
        idDocumentType,
        maskedIdNumber,
        purpose,
        purposeDetails,
        hostType,
        hostUser: hostUser || null,
        hostName,
        permittedStartTime: permittedStartTime ? new Date(permittedStartTime) : new Date(),
        permittedEndTime: permittedEndTime ? new Date(permittedEndTime) : new Date(Date.now() + 4 * 3600 * 1000),
        allowReentry
      };

      const res = await fetch(`${API_URL}/visitors/register`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to issue visitor pass.');
      }

      setSuccessMsg(`Visitor Pass ${data.data?.pass?.passNumber} generated successfully.`);
      setShowRegisterModal(false);
      resetRegisterForm();

      // View newly created pass with QR
      if (data.data?.qrPayload) {
        const qrUrl = await QRCode.toDataURL(data.data.qrPayload, { width: 220, margin: 1 });
        setQrCodeDataUrl(qrUrl);
        setViewingPass({ ...data.data.pass, visitor: data.data.registration, qrPayload: data.data.qrPayload });
      }

      fetchOverview();
      fetchPasses();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const resetRegisterForm = () => {
    setVisitorName('');
    setVisitorPhone('');
    setVisitorEmail('');
    setOrganization('');
    setIdDocumentType('GOVERNMENT_ID');
    setMaskedIdNumber('');
    setPurpose('OFFICIAL_MEETING');
    setPurposeDetails('');
    setHostType('FACULTY');
    setHostName('');
    setHostUser('');
    setPermittedStartTime('');
    setPermittedEndTime('');
    setAllowReentry(false);
  };

  // =========================================================================
  // REVOKE VISITOR PASS
  // =========================================================================
  const handleRevokePass = async () => {
    if (!revokingPassId || !revocationReason.trim()) return;
    try {
      setActionProcessing(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/visitors/passes/${revokingPassId}/revoke`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ reason: revocationReason.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to revoke visitor pass.');
      }
      setSuccessMsg(data.message || 'Pass revoked successfully.');
      setRevokingPassId(null);
      setRevocationReason('');
      fetchOverview();
      fetchPasses();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  // =========================================================================
  // SECURITY GATE SCANNER & VALIDATION
  // =========================================================================
  const handleValidateIdentifier = async (idToValidate) => {
    const target = (idToValidate || manualIdentifier).trim();
    if (!target) return;
    try {
      setActionProcessing(true);
      setErrorMsg('');
      setLastValidationResult(null);

      const isQr = target.startsWith('CB-PASS|');
      const isGuardianManual = target.toUpperCase().startsWith('GC-');
      const payload = isQr
        ? { qrText: target, gateName }
        : { manualIdentifier: target, manualPassType: isGuardianManual ? 'GUARDIAN_CARD' : 'VISITOR_PASS', gateName };

      const res = await fetch(`${API_URL}/security-gate/validate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      setLastValidationResult({
        httpStatus: res.status,
        decision: data.decision || (data.success ? 'GRANTED' : 'DENIED'),
        denialReason: data.denialReason || '',
        message: data.message || '',
        passType: data.passType || 'VISITOR_PASS',
        data: data.data || null
      });
    } catch (err) {
      setLastValidationResult({
        decision: 'DENIED',
        denialReason: 'SERVER_ERROR',
        message: err.message
      });
    } finally {
      setActionProcessing(false);
    }
  };

  const handleExecuteCheckIn = async (passId) => {
    try {
      setActionProcessing(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/security-gate/check-in`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ passId, gateName })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Check-in failed.');
      }
      setSuccessMsg(data.message || 'Check-in recorded successfully.');
      setLastValidationResult(null);
      setManualIdentifier('');
      fetchOverview();
      fetchGateEvents();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleExecuteCheckOut = async (passId) => {
    try {
      setActionProcessing(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/security-gate/check-out`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ passId, gateName })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Check-out failed.');
      }
      setSuccessMsg(data.message || 'Check-out recorded successfully.');
      setLastValidationResult(null);
      setManualIdentifier('');
      fetchOverview();
      fetchGateEvents();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  // Camera Scanner Setup via html5-qrcode
  useEffect(() => {
    let isMounted = true;
    let html5QrCode = null;

    if (activeTab === 'security-scanner' && scannerActive) {
      const scannerId = 'gate-html5-qrcode-reader';
      html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (!isMounted) return;
          handleValidateIdentifier(decodedText);
          if (html5QrCode) {
            html5QrCode.stop()
              .then(() => {
                try { html5QrCode.clear(); } catch (_) {}
              })
              .catch(() => {
                try { html5QrCode.clear(); } catch (_) {}
              });
          }
          setScannerActive(false);
        },
        () => {}
      ).catch((err) => {
        if (isMounted) {
          console.error('Camera QR scanner error:', err);
          setScannerActive(false);
        }
      });
    }

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        const scannerInstance = scannerRef.current;
        scannerRef.current = null;
        scannerInstance.stop()
          .then(() => {
            try { scannerInstance.clear(); } catch (_) {}
          })
          .catch(() => {
            try { scannerInstance.clear(); } catch (_) {}
          });
      }
    };
  }, [activeTab, scannerActive]);

  // =========================================================================
  // GUARDIAN RELATIONSHIP VERIFICATION
  // =========================================================================
  const handleSearchStudent = async (query) => {
    setStudentSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    try {
      setIsSearchingStudent(true);
      const res = await fetch(`${API_URL}/visitors/search-hosts?type=STUDENT&q=${encodeURIComponent(query)}`, {
        headers: authHeaders
      });
      const data = await res.json();
      if (data.success) {
        setStudentSearchResults(data.data || []);
      }
    } catch (_) {
    } finally {
      setIsSearchingStudent(false);
    }
  };

  const handleSelectStudent = (st) => {
    setSelectedStudentForVerification(st);
    setStudentSearchQuery(`${st.name} (${st.rollNumber || st.email})`);
    setStudentSearchResults([]);
  };

  const resetGuardianModal = () => {
    setShowVerifyGuardianModal(false);
    setSelectedStudentForVerification(null);
    setStudentSearchQuery('');
    setStudentSearchResults([]);
    setVerifyGuardianName('');
    setVerifyRelationship('FATHER');
    setVerifyPhone('');
    setVerifyEmail('');
    setVerifyProofType('GOVERNMENT_RELATION_PROOF');
    setVerifyProofRef('');
    setVerificationNotes('');
  };

  const handleVerifyGuardian = async (e) => {
    e.preventDefault();
    if (!selectedStudentForVerification) return;
    try {
      setActionProcessing(true);
      setErrorMsg('');
      const payload = {
        studentId: selectedStudentForVerification._id,
        guardianName: verifyGuardianName.trim(),
        relationship: verifyRelationship,
        phone: verifyPhone.trim(),
        email: verifyEmail.trim(),
        proofDocumentType: verifyProofType,
        proofReferenceMasked: verifyProofRef.trim(),
        verificationNotes: verificationNotes.trim()
      };

      const res = await fetch(`${API_URL}/guardians/verify`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to verify guardian.');
      }

      setSuccessMsg(data.message || 'Guardian relationship verified and Digital Card issued.');
      resetGuardianModal();
      fetchGuardianVerifications();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  const handleRevokeGuardianCard = async () => {
    if (!revokingGuardianId || !guardianRevocationReason.trim()) return;
    try {
      setActionProcessing(true);
      setErrorMsg('');
      const res = await fetch(`${API_URL}/guardians/${revokingGuardianId}/revoke`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ reason: guardianRevocationReason.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to revoke guardian card.');
      }
      setSuccessMsg(data.message || 'Guardian card revoked successfully.');
      setRevokingGuardianId(null);
      setGuardianRevocationReason('');
      fetchGuardianVerifications();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="frontoffice-container">
      {/* HEADER STRIP */}
      <div className="frontoffice-header">
        <div>
          <h2>🏛️ Front Office & Security Management</h2>
          <p className="frontoffice-sub">
            Campus-scoped visitor registrations, time-bounded passes, checkpoint security scanning, and audited guardian verification.
          </p>
        </div>
        <div className="frontoffice-header-actions">
          <button className="btn-issue-pass" onClick={() => setShowRegisterModal(true)}>
            ➕ Issue Visitor Pass
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {errorMsg && (
        <div className="alert-banner alert-error">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg('')}>&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="alert-banner alert-success">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')}>&times;</button>
        </div>
      )}

      {/* INSTITUTIONAL KPI SUMMARY CARDS */}
      <div className="fo-kpi-grid">
        <div className="fo-kpi-card kpi-active">
          <div className="kpi-icon">🚶</div>
          <div className="kpi-body">
            <span className="kpi-num">{kpiData.activeVisitorsCount}</span>
            <span className="kpi-label">Currently on Campus</span>
            <span className="kpi-sub">Authoritative check-ins</span>
          </div>
        </div>
        <div className="fo-kpi-card kpi-expected">
          <div className="kpi-icon">⏳</div>
          <div className="kpi-body">
            <span className="kpi-num">{kpiData.expectedVisitorsCount}</span>
            <span className="kpi-label">Expected Visitors Today</span>
            <span className="kpi-sub">Issued, awaiting arrival</span>
          </div>
        </div>
        <div className="fo-kpi-card kpi-completed">
          <div className="kpi-icon">🏁</div>
          <div className="kpi-body">
            <span className="kpi-num">{kpiData.completedVisitsCount}</span>
            <span className="kpi-label">Completed Visits</span>
            <span className="kpi-sub">Checked out today</span>
          </div>
        </div>
        <div className="fo-kpi-card kpi-denied">
          <div className="kpi-icon">🛡️</div>
          <div className="kpi-body">
            <span className="kpi-num">{kpiData.deniedScansCount}</span>
            <span className="kpi-label">Gate Denials &amp; Anomaly</span>
            <span className="kpi-sub">Security log exceptions</span>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TABS */}
      <div className="fo-tabs-bar">
        <button
          className={`fo-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Live Visitor Roster
        </button>
        <button
          className={`fo-tab-btn ${activeTab === 'security-scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('security-scanner')}
        >
          📷 Security Gate Scanner
        </button>
        <button
          className={`fo-tab-btn ${activeTab === 'guardian-cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('guardian-cards')}
        >
          🪪 Digital Guardian Cards
        </button>
        <button
          className={`fo-tab-btn ${activeTab === 'gate-events' ? 'active' : ''}`}
          onClick={() => setActiveTab('gate-events')}
        >
          📜 Gate Access Audit Log
        </button>
      </div>

      {/* TAB 1: VISITOR ROSTER & PASSES */}
      {(activeTab === 'overview' || activeTab === 'visitor-passes') && (
        <div className="fo-section-card">
          <div className="fo-filter-row">
            <input
              type="text"
              placeholder="Search by Pass Number, Visitor, or Host..."
              value={passSearchQuery}
              onChange={(e) => setPassSearchQuery(e.target.value)}
              className="fo-search-input"
            />
            <select
              value={passFilterStatus}
              onChange={(e) => setPassFilterStatus(e.target.value)}
              className="fo-select-filter"
            >
              <option value="">All Pass Statuses</option>
              <option value="ISSUED">Issued (Expected)</option>
              <option value="CHECKED_IN">Checked In (On Campus)</option>
              <option value="CHECKED_OUT">Checked Out</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>
            <button className="btn-refresh" onClick={fetchPasses}>🔄 Refresh</button>
          </div>

          {loading ? (
            <div className="fo-empty-state">Loading passes...</div>
          ) : passes.length === 0 ? (
            <div className="fo-empty-state">
              <span className="empty-icon">🎫</span>
              <p>No visitor passes found for the selected criteria.</p>
            </div>
          ) : (
            <div className="fo-table-wrap">
              <table className="fo-table">
                <thead>
                  <tr>
                    <th>Pass ID</th>
                    <th>Visitor Name</th>
                    <th>Host / Department</th>
                    <th>Valid Time Window</th>
                    <th>Status</th>
                    <th>Check-Ins</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {passes.map((p) => {
                    const isCheckedIn = p.status === 'CHECKED_IN';
                    const isIssued = p.status === 'ISSUED';
                    const isRevoked = p.status === 'REVOKED';
                    return (
                      <tr key={p._id}>
                        <td>
                          <span className="mono-pass-id">{p.passNumber}</span>
                        </td>
                        <td>
                          <strong>{p.visitor?.visitorName || 'Visitor'}</strong>
                          <div className="table-sub">{p.visitor?.organization || 'Individual Guest'}</div>
                        </td>
                        <td>
                          <div>{p.visitor?.hostName || 'Host'}</div>
                          <span className="badge-tag">{p.visitor?.purpose || 'Meeting'}</span>
                        </td>
                        <td className="table-dates">
                          <div>From: {new Date(p.permittedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div>To: {new Date(p.permittedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td>
                          <span className={`status-pill status-${p.status.toLowerCase()}`}>
                            {p.status}
                          </span>
                        </td>
                        <td>{p.totalEntries || 0} entry</td>
                        <td>
                          <div className="actions-cell">
                            {isIssued && (
                              <button
                                className="btn-action btn-in"
                                onClick={() => handleExecuteCheckIn(p._id)}
                                disabled={actionProcessing}
                              >
                                Check In
                              </button>
                            )}
                            {isCheckedIn && (
                              <button
                                className="btn-action btn-out"
                                onClick={() => handleExecuteCheckOut(p._id)}
                                disabled={actionProcessing}
                              >
                                Check Out
                              </button>
                            )}
                            {!isRevoked && (
                              <button
                                className="btn-action btn-revoke"
                                onClick={() => setRevokingPassId(p._id)}
                                disabled={actionProcessing}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SECURITY GATE SCANNER */}
      {activeTab === 'security-scanner' && (
        <div className="fo-section-card scanner-panel">
          <div className="scanner-control-bar">
            <div>
              <h3>Checkpoint Security Scanner</h3>
              <p className="table-sub">Live camera scan or manual pass number verification with authoritative server validation.</p>
            </div>
            <div className="gate-select-wrap">
              <label>Gate Location:</label>
              <select value={gateName} onChange={(e) => setGateName(e.target.value)} className="fo-select-filter">
                <option value="Main Gate 1">Main Gate 1 (Front Entrance)</option>
                <option value="North Gate 2">North Gate 2 (Hostel &amp; Sports)</option>
                <option value="Admin Block Gate">Admin Block Gate</option>
              </select>
            </div>
          </div>

          <div className="scanner-grid">
            <div className="scanner-box">
              <div id="gate-html5-qrcode-reader" className="camera-viewport"></div>
              {!scannerActive ? (
                <button className="btn-camera-toggle" onClick={() => setScannerActive(true)}>
                  📷 Start Camera QR Scanner
                </button>
              ) : (
                <button className="btn-camera-toggle btn-stop" onClick={() => setScannerActive(false)}>
                  ⏹️ Stop Camera
                </button>
              )}

              <div className="manual-divider">OR ENTER PASS / CARD IDENTIFIER</div>

              <div className="manual-input-row">
                <input
                  type="text"
                  placeholder="e.g. VP-20261011-8F3A or GC-2026-0814"
                  value={manualIdentifier}
                  onChange={(e) => setManualIdentifier(e.target.value.toUpperCase())}
                  className="manual-id-input"
                />
                <button
                  className="btn-validate"
                  onClick={() => handleValidateIdentifier()}
                  disabled={actionProcessing || !manualIdentifier.trim()}
                >
                  Verify Access
                </button>
              </div>
            </div>

            {/* VALIDATION DECISION DISPLAY */}
            <div className="decision-box">
              {!lastValidationResult ? (
                <div className="decision-idle">
                  <span className="idle-shield">🛡️</span>
                  <h4>Ready for Scan</h4>
                  <p>Scan a visitor pass or digital guardian card QR code to evaluate credentials.</p>
                </div>
              ) : lastValidationResult.decision === 'GRANTED' ? (
                <div className="decision-card decision-granted">
                  <div className="decision-header">
                    <span className="decision-badge">ACCESS GRANTED</span>
                    <span className="pass-type-tag">{lastValidationResult.passType}</span>
                  </div>

                  <div className="decision-fields">
                    <div className="field-row">
                      <span>Subject:</span>
                      <strong>{lastValidationResult.data?.visitorName || lastValidationResult.data?.guardianName}</strong>
                    </div>
                    {lastValidationResult.data?.hostName && (
                      <div className="field-row">
                        <span>Host:</span>
                        <strong>{lastValidationResult.data.hostName}</strong>
                      </div>
                    )}
                    {lastValidationResult.data?.studentName && (
                      <div className="field-row">
                        <span>Student:</span>
                        <strong>{lastValidationResult.data.studentName} ({lastValidationResult.data.studentRollNumber})</strong>
                      </div>
                    )}
                    <div className="field-row">
                      <span>Campus:</span>
                      <strong>{lastValidationResult.data?.campusName || 'GRIET'}</strong>
                    </div>
                  </div>

                  {lastValidationResult.passType === 'VISITOR_PASS' && (
                    <div className="decision-actions">
                      <button
                        className="btn-grant-in"
                        onClick={() => handleExecuteCheckIn(lastValidationResult.data?.passId)}
                        disabled={actionProcessing}
                      >
                        ✅ Confirm Check-In
                      </button>
                      <button
                        className="btn-grant-out"
                        onClick={() => handleExecuteCheckOut(lastValidationResult.data?.passId)}
                        disabled={actionProcessing}
                      >
                        🚪 Confirm Check-Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="decision-card decision-denied">
                  <div className="decision-header">
                    <span className="decision-badge badge-denied">ACCESS DENIED</span>
                    <span className="denial-reason-pill">{lastValidationResult.denialReason}</span>
                  </div>
                  <p className="denial-desc">{lastValidationResult.message || 'Credentials failed server verification.'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DIGITAL GUARDIAN CARDS */}
      {activeTab === 'guardian-cards' && (
        <div className="fo-section-card">
          <div className="fo-filter-row">
            <input
              type="text"
              placeholder="Search by student name, roll number, or guardian..."
              value={guardianSearch}
              onChange={(e) => setGuardianSearch(e.target.value)}
              className="fo-search-input"
            />
            {canVerifyGuardian && (
              <button className="btn-primary" onClick={() => setShowVerifyGuardianModal(true)}>
                ➕ Verify Guardian &amp; Issue Card
              </button>
            )}
            <button className="btn-refresh" onClick={fetchGuardianVerifications}>🔄 Refresh</button>
          </div>

          {loading ? (
            <div className="fo-empty-state">Loading guardian verification records...</div>
          ) : guardianRecords.length === 0 ? (
            <div className="fo-empty-state">
              <span className="empty-icon">🪪</span>
              <p>No audited guardian records found. To verify a student's relationship, audit physical proof at the desk.</p>
            </div>
          ) : (
            <div className="fo-table-wrap">
              <table className="fo-table">
                <thead>
                  <tr>
                    <th>Card Number</th>
                    <th>Guardian Details</th>
                    <th>Enrolled Student</th>
                    <th>Proof Type</th>
                    <th>Status</th>
                    <th>Expiry</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {guardianRecords.map((g) => (
                    <tr key={g._id}>
                      <td>
                        <span className="mono-pass-id">{g.cardNumber || 'NOT_ISSUED'}</span>
                      </td>
                      <td>
                        <strong>{g.guardianName}</strong>
                        <div className="table-sub">{g.relationship}</div>
                      </td>
                      <td>
                        <div>{g.student?.name || 'Student'}</div>
                        <span className="badge-tag">{g.student?.rollNumber || 'Roll N/A'}</span>
                      </td>
                      <td>
                        <span className="proof-tag">{g.proofDocumentType}</span>
                      </td>
                      <td>
                        <span className={`status-pill status-${g.verificationStatus.toLowerCase()}`}>
                          {g.verificationStatus}
                        </span>
                      </td>
                      <td>
                        {g.cardExpiresAt ? new Date(g.cardExpiresAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        {canVerifyGuardian && g.cardStatus === 'ACTIVE' && (
                          <button
                            className="btn-danger"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
                            onClick={() => {
                              setRevokingGuardianId(g._id);
                              setGuardianRevocationReason('');
                            }}
                          >
                            Revoke Card
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: IMMUTABLE GATE ACCESS EVENTS AUDIT LOG */}
      {activeTab === 'gate-events' && (
        <div className="fo-section-card">
          <div className="fo-filter-row">
            <select
              value={eventFilterDecision}
              onChange={(e) => setEventFilterDecision(e.target.value)}
              className="fo-select-filter"
            >
              <option value="">All Decisions (Granted &amp; Denied)</option>
              <option value="GRANTED">Granted Access Only</option>
              <option value="DENIED">Denied Access Only (Anomalies)</option>
            </select>
            <button className="btn-refresh" onClick={fetchGateEvents}>🔄 Refresh Audit Trail</button>
          </div>

          {gateEvents.length === 0 ? (
            <div className="fo-empty-state">
              <span className="empty-icon">📜</span>
              <p>No gate checkpoint events recorded yet.</p>
            </div>
          ) : (
            <div className="fo-table-wrap">
              <table className="fo-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Gate</th>
                    <th>Pass ID</th>
                    <th>Event</th>
                    <th>Decision</th>
                    <th>Subject</th>
                    <th>Operator</th>
                  </tr>
                </thead>
                <tbody>
                  {gateEvents.map((ev) => (
                    <tr key={ev._id}>
                      <td className="table-dates">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td>{ev.gateName}</td>
                      <td><span className="mono-pass-id">{ev.passIdentifier}</span></td>
                      <td><span className="badge-tag">{ev.eventType}</span></td>
                      <td>
                        <span className={`decision-pill decision-${ev.decision.toLowerCase()}`}>
                          {ev.decision}
                          {ev.denialReason !== 'NONE' && ` (${ev.denialReason})`}
                        </span>
                      </td>
                      <td>{ev.subjectName}</td>
                      <td>{ev.scannedByName || 'Gate Operator'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* REGISTER VISITOR MODAL */}
      {showRegisterModal && (
        <div className="fo-modal-backdrop" onClick={() => setShowRegisterModal(false)}>
          <div className="fo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fo-modal-header">
              <h3>🎫 Issue Campus Visitor Pass</h3>
              <button className="btn-close-modal" onClick={() => setShowRegisterModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleRegisterVisitor} className="fo-modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Visitor Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Visitor Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Government ID Type *</label>
                  <select value={idDocumentType} onChange={(e) => setIdDocumentType(e.target.value)}>
                    <option value="GOVERNMENT_ID">General Government ID</option>
                    <option value="AADHAAR">Aadhaar Card</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="INSTITUTIONAL_ID">Institutional / Student ID</option>
                    <option value="OTHER">Other Official ID</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Masked ID Reference (Last 4 digits) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ••••••••4921"
                    value={maskedIdNumber}
                    onChange={(e) => setMaskedIdNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Purpose of Visit *</label>
                  <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                    <option value="OFFICIAL_MEETING">Official Meeting</option>
                    <option value="PARENT_GUARDIAN_VISIT">Parent / Guardian Visit</option>
                    <option value="VENDOR_SERVICE">Vendor / Service Delivery</option>
                    <option value="CAMPUS_TOUR">Campus Tour / Admissions</option>
                    <option value="GUEST_LECTURE">Guest Lecture / Academic</option>
                    <option value="PLACEMENT_DRIVE">Placement Drive / Corporate</option>
                    <option value="OTHER">Other Purpose</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Host Type *</label>
                  <select value={hostType} onChange={(e) => setHostType(e.target.value)}>
                    <option value="FACULTY">Faculty Member</option>
                    <option value="STUDENT">Enrolled Student</option>
                    <option value="ADMINISTRATOR">Administrative Office</option>
                    <option value="DEPARTMENT_OFFICE">Department Head (HOD)</option>
                  </select>
                </div>
              </div>

              <div className="form-group host-lookup-wrap">
                <label>Host Name / Search *</label>
                <input
                  type="text"
                  required
                  placeholder="Type to search host staff or student..."
                  value={hostName}
                  onChange={(e) => handleHostSearch(e.target.value)}
                />
                {isSearchingHost && <div className="lookup-spinner">Searching hosts...</div>}
                {hostSearchResults.length > 0 && (
                  <ul className="host-dropdown">
                    {hostSearchResults.map((h) => (
                      <li key={h._id} onClick={() => handleSelectHost(h)}>
                        <strong>{h.name}</strong> ({h.rollNumber || h.email}) — {h.branch || h.designation || h.role}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Permitted Start Time</label>
                  <input
                    type="datetime-local"
                    value={permittedStartTime}
                    onChange={(e) => setPermittedStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Permitted End Time</label>
                  <input
                    type="datetime-local"
                    value={permittedEndTime}
                    onChange={(e) => setPermittedEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={allowReentry}
                    onChange={(e) => setAllowReentry(e.target.checked)}
                  />
                  <span>Allow Multi-Entry Re-Check-In (Vendor / VIP)</span>
                </label>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionProcessing}>
                  {actionProcessing ? 'Issuing Pass...' : 'Generate & Issue Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ISSUED PASS MODAL (WITH QR) */}
      {viewingPass && (
        <div className="fo-modal-backdrop" onClick={() => setViewingPass(null)}>
          <div className="fo-modal-card fo-pass-card-view" onClick={(e) => e.stopPropagation()}>
            <div className="fo-modal-header">
              <h3>🎫 Official Campus Visitor Pass</h3>
              <button className="btn-close-modal" onClick={() => setViewingPass(null)}>&times;</button>
            </div>

            <div className="pass-print-card">
              <div className="pass-header-strip">
                <h4>GOKARAJU RANGARAJU INSTITUTE OF ENGINEERING &amp; TECHNOLOGY</h4>
                <span>OFFICIAL VISITOR ENTRY PERMIT • HYDERABAD</span>
              </div>

              <div className="pass-body-flex">
                <div className="pass-details-col">
                  <div className="detail-item">
                    <label>Pass Identifier</label>
                    <span className="mono-pass-big">{viewingPass.passNumber}</span>
                  </div>
                  <div className="detail-item">
                    <label>Visitor Name</label>
                    <strong>{viewingPass.visitor?.visitorName || 'Authorized Visitor'}</strong>
                  </div>
                  <div className="detail-item">
                    <label>Host Contact</label>
                    <span>{viewingPass.visitor?.hostName || 'Campus Host'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Valid Window</label>
                    <span>{new Date(viewingPass.permittedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(viewingPass.permittedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="pass-qr-col">
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="Opaque Visitor Pass QR" className="qr-image" />
                  ) : (
                    <div className="qr-placeholder">Generating QR...</div>
                  )}
                  <span className="qr-caption">Opaque Cryptographic Token</span>
                </div>
              </div>
            </div>

            <div className="modal-actions-row">
              <button className="btn-primary" onClick={() => window.print()}>
                🖨️ Print Pass
              </button>
              <button className="btn-secondary" onClick={() => setViewingPass(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVOKE PASS MODAL */}
      {revokingPassId && (
        <div className="fo-modal-backdrop" onClick={() => setRevokingPassId(null)}>
          <div className="fo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fo-modal-header">
              <h3>⚠️ Revoke Visitor Pass</h3>
              <button className="btn-close-modal" onClick={() => setRevokingPassId(null)}>&times;</button>
            </div>
            <div className="fo-modal-form">
              <p>Mandatory security compliance requires an explicit revocation reason for the audit trail.</p>
              <div className="form-group">
                <label>Revocation Reason *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Host unavailable / Security policy non-compliance / Erroneous issuance"
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                />
              </div>
              <div className="modal-actions-row">
                <button className="btn-secondary" onClick={() => setRevokingPassId(null)}>Cancel</button>
                <button
                  className="btn-danger"
                  onClick={handleRevokePass}
                  disabled={actionProcessing || !revocationReason.trim()}
                >
                  {actionProcessing ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERIFY GUARDIAN & ISSUE CARD MODAL */}
      {showVerifyGuardianModal && (
        <div className="fo-modal-backdrop" onClick={resetGuardianModal}>
          <div className="fo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fo-modal-header">
              <h3>🛡️ Verify Legal Guardian &amp; Issue Digital Card</h3>
              <button className="btn-close-modal" onClick={resetGuardianModal}>&times;</button>
            </div>

            <form onSubmit={handleVerifyGuardian} className="fo-modal-form">
              <p className="modal-intro" style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Institutional protocol: Inspect the presented physical relationship proof before issuing an active Digital Guardian Card.
              </p>

              {/* Student Lookup Section */}
              <div className="form-group host-lookup-wrap">
                <label>Target Student (Search by Roll Number / Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="Type 2+ characters to search enrolled student..."
                  value={studentSearchQuery}
                  onChange={(e) => handleSearchStudent(e.target.value)}
                  autoComplete="off"
                />
                {isSearchingStudent && <div className="lookup-spinner">Searching students...</div>}
                {studentSearchResults.length > 0 && (
                  <ul className="host-dropdown">
                    {studentSearchResults.map((st) => (
                      <li key={st._id} onClick={() => handleSelectStudent(st)}>
                        <strong>{st.name}</strong> ({st.rollNumber}) — {st.branch || ''} {st.section ? `Sec ${st.section}` : ''}
                      </li>
                    ))}
                  </ul>
                )}
                {selectedStudentForVerification && (
                  <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#10b981' }}>
                    ✓ Selected: <strong>{selectedStudentForVerification.name}</strong> ({selectedStudentForVerification.rollNumber})
                  </div>
                )}
              </div>

              {/* Guardian Info */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Guardian Legal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full name as in government ID"
                    value={verifyGuardianName}
                    onChange={(e) => setVerifyGuardianName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Relationship to Student *</label>
                  <select
                    value={verifyRelationship}
                    onChange={(e) => setVerifyRelationship(e.target.value)}
                  >
                    <option value="FATHER">Father</option>
                    <option value="MOTHER">Mother</option>
                    <option value="LEGAL_GUARDIAN">Court Appointed Legal Guardian</option>
                    <option value="LOCAL_GUARDIAN">Local Institutional Guardian</option>
                    <option value="OTHER">Other Authorized Relative</option>
                  </select>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Guardian Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number"
                    value={verifyPhone}
                    onChange={(e) => setVerifyPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Guardian Email</label>
                  <input
                    type="email"
                    placeholder="Optional email address"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Physical Proof Document Audit */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Physical Proof Document Type *</label>
                  <select
                    value={verifyProofType}
                    onChange={(e) => setVerifyProofType(e.target.value)}
                  >
                    <option value="GOVERNMENT_RELATION_PROOF">Govt ID / Relation Proof (Aadhaar / Passport / Voter ID)</option>
                    <option value="ADMISSION_AFFIDAVIT">Institutional Admission Affidavit</option>
                    <option value="BIRTH_CERTIFICATE">Student Birth Certificate</option>
                    <option value="COURT_GUARDIANSHIP_ORDER">Court Guardianship Order</option>
                    <option value="NOTARIZED_DECLARATION">Notarized Legal Declaration</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Masked Document Ref # (Zero PII) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ••••••••8812"
                    value={verifyProofRef}
                    onChange={(e) => setVerifyProofRef(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Verification Audit Notes / Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Physical document inspected and verified in-person at Front Office desk."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary" onClick={resetGuardianModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionProcessing || !selectedStudentForVerification || !verifyGuardianName.trim() || !verifyPhone.trim() || !verifyProofRef.trim()}
                >
                  {actionProcessing ? 'Verifying & Issuing...' : 'Verify Proof & Issue Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVOKE GUARDIAN CARD MODAL */}
      {revokingGuardianId && (
        <div className="fo-modal-backdrop" onClick={() => setRevokingGuardianId(null)}>
          <div className="fo-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fo-modal-header">
              <h3>⚠️ Revoke Digital Guardian Card</h3>
              <button className="btn-close-modal" onClick={() => setRevokingGuardianId(null)}>&times;</button>
            </div>
            <div className="fo-modal-form">
              <p>Institutional security compliance requires an explicit revocation reason for the audit trail.</p>
              <div className="form-group">
                <label>Revocation Reason *</label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Graduation of ward / Guardian relationship status change / Lost credential"
                  value={guardianRevocationReason}
                  onChange={(e) => setGuardianRevocationReason(e.target.value)}
                />
              </div>
              <div className="modal-actions-row">
                <button className="btn-secondary" onClick={() => setRevokingGuardianId(null)}>Cancel</button>
                <button
                  className="btn-danger"
                  onClick={handleRevokeGuardianCard}
                  disabled={actionProcessing || !guardianRevocationReason.trim()}
                >
                  {actionProcessing ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrontOfficeSecurityManager;
