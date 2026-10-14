import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './SupportDeskManager.css';

const SupportDeskManager = () => {
  const { user, token } = useAuth();

  // Active view tab: 'roster' | 'lookup'
  const [activeTab, setActiveTab] = useState('roster');

  // Loading & notification states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);

  // Summary Metrics
  const [summaryData, setSummaryData] = useState({
    totalVerifiedToday: 0,
    totalPendingCorrectionsToday: 0,
    campusName: ''
  });

  // Corrections list & filters
  const [corrections, setCorrections] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Student Lookup & Status inspect
  const [studentLookupQuery, setStudentLookupQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [isSearchingStudent, setIsSearchingStudent] = useState(false);
  const [inspectedStudent, setInspectedStudent] = useState(null);
  const [inspectedArrivalStatus, setInspectedArrivalStatus] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Correction Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestTargetStudent, setRequestTargetStudent] = useState(null);
  const [correctionReason, setCorrectionReason] = useState('GPS_DRIFT_GEOFENCE_ERROR');
  const [correctionNotes, setCorrectionNotes] = useState('');

  // Dual-Control Review Modal
  const [reviewingLog, setReviewingLog] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const isReviewerRole = ['admin', 'super_admin', 'campus_admin', 'administrator', 'hod', 'director', 'principal'].includes(user?.role);

  // =========================================================================
  // DATA FETCHING ROUTINES
  // =========================================================================

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/attendance/campus-arrival/today-summary`, { headers: authHeaders });
      const data = await res.json();
      if (data.success && data.summary) {
        setSummaryData(data.summary);
      }
    } catch (_) {}
  }, [token]);

  const fetchCorrections = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      let url = `${API_URL}/attendance/campus-arrival/corrections?status=${statusFilter}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setCorrections(data.data || []);
      } else {
        setErrorMsg(data.error || 'Failed to load arrival correction roster.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, searchQuery]);

  useEffect(() => {
    fetchSummary();
    fetchCorrections();
  }, [fetchSummary, fetchCorrections]);

  // =========================================================================
  // STUDENT SEARCH & ARRIVAL LOOKUP
  // =========================================================================

  const handleSearchStudent = async (query) => {
    setStudentLookupQuery(query);
    if (!query || query.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    try {
      setIsSearchingStudent(true);
      const res = await fetch(`${API_URL}/visitors/search-hosts?type=STUDENT&q=${encodeURIComponent(query.trim())}`, {
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

  const handleSelectStudentForInspect = async (student) => {
    setInspectedStudent(student);
    setStudentSearchResults([]);
    setStudentLookupQuery(`${student.name} (${student.rollNumber || student.email})`);
    try {
      setInspectLoading(true);
      const res = await fetch(`${API_URL}/attendance/campus-arrival/status/${student._id}`, { headers: authHeaders });
      const data = await res.json();
      if (data.success) {
        setInspectedArrivalStatus(data);
      } else {
        setInspectedArrivalStatus({ status: 'NOT_ARRIVED' });
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setInspectLoading(false);
    }
  };

  // =========================================================================
  // SUBMIT ARRIVAL CORRECTION REQUEST
  // =========================================================================

  const handleOpenRequestModal = (student) => {
    setRequestTargetStudent(student || inspectedStudent);
    setCorrectionReason('GPS_DRIFT_GEOFENCE_ERROR');
    setCorrectionNotes('');
    setShowRequestModal(true);
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!requestTargetStudent) return;
    try {
      setActionProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');

      const reasonDisplayMap = {
        'GPS_DRIFT_GEOFENCE_ERROR': 'Hardware GPS Drift / Network Geofence Error',
        'GATE_SCANNER_TIMEOUT': 'Gate Kiosk Timeout / QR Camera Read Deficit',
        'OFFICIAL_BUS_DELAY': 'Institutional Bus Transit Delay',
        'SPECIAL_PERMIT': 'Academic / Placement Cell Special Permit',
        'OTHER': 'Administrative Exceptional Review'
      };

      const payload = {
        studentId: requestTargetStudent._id,
        reason: reasonDisplayMap[correctionReason] || correctionReason,
        notes: correctionNotes.trim()
      };

      const res = await fetch(`${API_URL}/attendance/campus-arrival/correction`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit arrival correction.');
      }

      setSuccessMsg(`Arrival Assistance Reference #${data.log?.referenceCode || ''} submitted for dual-control review.`);
      setShowRequestModal(false);
      fetchSummary();
      fetchCorrections();

      // Refresh inspected status if current student
      if (inspectedStudent && inspectedStudent._id === requestTargetStudent._id) {
        handleSelectStudentForInspect(inspectedStudent);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  // =========================================================================
  // DUAL-CONTROL REVIEW EXECUTION (APPROVE / REJECT)
  // =========================================================================

  const handleOpenReview = (log) => {
    setReviewingLog(log);
    setReviewNotes('');
  };

  const handleExecuteReview = async (action) => {
    if (!reviewingLog) return;
    try {
      setActionProcessing(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/attendance/campus-arrival/correction/${reviewingLog._id}/review`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          action,
          notes: reviewNotes.trim()
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to review arrival correction.');
      }

      setSuccessMsg(`Arrival correction ${action === 'APPROVE' ? 'APPROVED' : 'REJECTED'} successfully.`);
      setReviewingLog(null);
      fetchSummary();
      fetchCorrections();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="support-desk-container animate-fade">
      {/* Header */}
      <div className="support-desk-header">
        <div>
          <h2>
            <span>🎧</span> Support Desk & Campus Arrival Assistance
          </h2>
          <div className="support-desk-sub">
            Authorized student lookup, perimeter arrival assistance, and dual-control compliance tracking.
          </div>
        </div>
        <div className="sd-header-actions">
          <button
            type="button"
            className="btn-sd-primary"
            onClick={() => { setActiveTab('lookup'); setInspectedStudent(null); }}
          >
            <span>🔍</span> Student Lookup
          </button>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="dual-control-callout">
        <strong>🛡️ Zero-Impact Attendance Boundary Enforced:</strong> Resolving or approving a campus arrival assistance request updates the physical perimeter log (<code>CampusCheckInLog</code>). It <strong>NEVER</strong> automatically marks course or classroom attendance in academic sessions.
      </div>

      {/* KPI Cards */}
      <div className="sd-kpi-grid">
        <div className="sd-kpi-card green">
          <div className="sd-kpi-icon">📍</div>
          <div className="sd-kpi-info">
            <h3>{summaryData.totalVerifiedToday}</h3>
            <p>Verified Arrivals Today</p>
          </div>
        </div>
        <div className="sd-kpi-card amber">
          <div className="sd-kpi-icon">⏳</div>
          <div className="sd-kpi-info">
            <h3>{summaryData.totalPendingCorrectionsToday}</h3>
            <p>Pending Arrival Corrections</p>
          </div>
        </div>
        <div className="sd-kpi-card blue">
          <div className="sd-kpi-icon">🏫</div>
          <div className="sd-kpi-info">
            <h3 style={{ fontSize: '1.2rem', textTransform: 'uppercase' }}>{summaryData.campusName || 'Main Campus'}</h3>
            <p>Operating Perimeter</p>
          </div>
        </div>
        <div className="sd-kpi-card purple">
          <div className="sd-kpi-icon">📋</div>
          <div className="sd-kpi-info">
            <h3>{corrections.length}</h3>
            <p>Roster Records Loaded</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="error-banner animate-fade" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>⚠️ {errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="success-banner animate-fade" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>✓ {successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="sd-tabs-bar">
        <button
          type="button"
          className={`sd-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          <span>📑</span> Arrival Correction Roster ({corrections.length})
        </button>
        <button
          type="button"
          className={`sd-tab-btn ${activeTab === 'lookup' ? 'active' : ''}`}
          onClick={() => setActiveTab('lookup')}
        >
          <span>🔎</span> Student Arrival Status Lookup
        </button>
      </div>

      {/* TAB 1: CORRECTIONS ROSTER */}
      {activeTab === 'roster' && (
        <div>
          <div className="sd-filter-bar">
            <div className="sd-search-input-wrap">
              <span className="sd-search-icon">🔍</span>
              <input
                type="text"
                className="sd-search-input"
                placeholder="Search by student name, roll number, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="sd-select-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="REQUESTED">Pending Review (REQUESTED)</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="sd-table-wrap">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Ref Code</th>
                  <th>Student</th>
                  <th>Branch / Roll</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Requested By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading arrival correction queue...</td>
                  </tr>
                ) : corrections.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                      No arrival correction records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  corrections.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
                          {item.referenceCode || item._id.slice(-8).toUpperCase()}
                        </strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.user?.name || 'Unknown Student'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{item.user?.email}</div>
                      </td>
                      <td>
                        <div>{item.user?.rollNumber || 'N/A'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{item.user?.branch || 'General'}</div>
                      </td>
                      <td>{item.arrivalDateKey || new Date(item.timestamp).toLocaleDateString()}</td>
                      <td style={{ maxWidth: '240px' }}>
                        <div style={{ fontWeight: 500 }}>{item.correctionReason || 'Arrival assistance'}</div>
                        {item.correctionNotes && (
                          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{item.correctionNotes}</div>
                        )}
                      </td>
                      <td>
                        <span className={`badge-status ${(item.correctionStatus || item.status).toLowerCase()}`}>
                          {item.correctionStatus || item.status}
                        </span>
                      </td>
                      <td>
                        <div>{item.correctionRequestedBy?.name || 'Desk Staff'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                          {item.correctionRequestedAt ? new Date(item.correctionRequestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>
                      <td>
                        {item.correctionStatus === 'REQUESTED' && isReviewerRole ? (
                          <button
                            type="button"
                            className="btn-action-sm btn-review-open"
                            onClick={() => handleOpenReview(item)}
                          >
                            Review
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                            {item.correctionStatus === 'APPROVED' ? '✓ Verified' : item.correctionStatus === 'REJECTED' ? '✕ Denied' : 'Audit Logged'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT LOOKUP & STATUS INSPECT */}
      {activeTab === 'lookup' && (
        <div>
          <div style={{ maxWidth: '640px', marginBottom: '1.5rem', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#e5e7eb' }}>
              Search Enrolled Student:
            </label>
            <div className="sd-search-input-wrap">
              <span className="sd-search-icon">🔍</span>
              <input
                type="text"
                className="sd-search-input"
                placeholder="Type student name or roll number (e.g. 23241A12...)"
                value={studentLookupQuery}
                onChange={(e) => handleSearchStudent(e.target.value)}
              />
            </div>

            {/* Typeahead Results Dropdown */}
            {studentSearchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                zIndex: 50,
                maxHeight: '260px',
                overflowY: 'auto',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)'
              }}>
                {studentSearchResults.map(s => (
                  <div
                    key={s._id}
                    onClick={() => handleSelectStudentForInspect(s)}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(55,65,81,0.5)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#374151'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{s.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{s.rollNumber || s.email}</div>
                    </div>
                    <span style={{ fontSize: '0.75rem', background: '#111827', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#38bdf8' }}>
                      {s.branch || 'Student'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inspected Student Detail Card */}
          {inspectLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Retrieving live arrival telemetry...</div>
          ) : inspectedStudent && (
            <div style={{
              background: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '680px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.3rem' }}>{inspectedStudent.name}</h3>
                  <div style={{ color: '#9ca3af', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                    Roll: <strong>{inspectedStudent.rollNumber || 'N/A'}</strong> • Branch: {inspectedStudent.branch || 'IT'}
                  </div>
                </div>
                <span className={`badge-status ${(inspectedArrivalStatus?.status || 'NOT_ARRIVED').toLowerCase()}`}>
                  {inspectedArrivalStatus?.status || 'NOT_ARRIVED'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase' }}>Today's Date Key</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{inspectedArrivalStatus?.arrivalDateKey || new Date().toISOString().slice(0, 10)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase' }}>Arrival Verification Method</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{inspectedArrivalStatus?.verificationMethod || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase' }}>Check-In Timestamp</div>
                  <div style={{ fontWeight: 600, color: '#fff' }}>
                    {inspectedArrivalStatus?.timestamp ? new Date(inspectedArrivalStatus.timestamp).toLocaleTimeString() : 'Not Checked In'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af', textTransform: 'uppercase' }}>Assistance Request Status</div>
                  <div style={{ fontWeight: 600, color: '#fbbf24' }}>
                    {inspectedArrivalStatus?.correctionStatus || 'NONE'}
                  </div>
                </div>
              </div>

              {inspectedArrivalStatus?.status !== 'VERIFIED' && (
                <div style={{ background: '#111827', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#f87171', fontWeight: 600 }}>Student Not Verified Today</div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Submit an arrival correction request on behalf of this student.</div>
                  </div>
                  <button
                    type="button"
                    className="btn-sd-primary"
                    onClick={() => handleOpenRequestModal(inspectedStudent)}
                  >
                    Submit Assistance
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: SUBMIT ARRIVAL CORRECTION */}
      {showRequestModal && (
        <div className="sd-modal-backdrop" onClick={() => setShowRequestModal(false)}>
          <div className="sd-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3><span>📝</span> Request Campus Arrival Assistance</h3>
              <button type="button" className="sd-modal-close" onClick={() => setShowRequestModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmitCorrection}>
              <div className="sd-modal-body">
                <div style={{ background: '#111827', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, color: '#fff' }}>{requestTargetStudent?.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#9ca3af' }}>
                    Roll: {requestTargetStudent?.rollNumber || 'N/A'} • Branch: {requestTargetStudent?.branch || 'IT'}
                  </div>
                </div>

                <div className="form-group">
                  <label>Operational Reason *</label>
                  <select
                    className="form-select"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    required
                  >
                    <option value="GPS_DRIFT_GEOFENCE_ERROR">Hardware GPS Drift / Network Geofence Error</option>
                    <option value="GATE_SCANNER_TIMEOUT">Gate Kiosk Timeout / QR Camera Read Deficit</option>
                    <option value="OFFICIAL_BUS_DELAY">Institutional Bus Transit Delay</option>
                    <option value="SPECIAL_PERMIT">Academic / Placement Cell Special Permit</option>
                    <option value="OTHER">Administrative Exceptional Review</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Administrative Notes / Evidence</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    placeholder="Enter gate checkpoint details, bus route #, or administrative justification..."
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="sd-modal-footer">
                <button type="button" className="btn-sd-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
                <button type="submit" className="btn-sd-primary" disabled={actionProcessing}>
                  {actionProcessing ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DUAL-CONTROL REVIEW */}
      {reviewingLog && (
        <div className="sd-modal-backdrop" onClick={() => setReviewingLog(null)}>
          <div className="sd-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="sd-modal-header">
              <h3><span>⚖️</span> Dual-Control Arrival Review</h3>
              <button type="button" className="sd-modal-close" onClick={() => setReviewingLog(null)}>×</button>
            </div>
            <div className="sd-modal-body">
              <div style={{ background: '#111827', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>REF CODE:</span>
                  <strong style={{ color: '#38bdf8' }}>{reviewingLog.referenceCode}</strong>
                </div>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '1.1rem' }}>{reviewingLog.user?.name}</div>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Roll: {reviewingLog.user?.rollNumber || 'N/A'}</div>
                <div style={{ marginTop: '0.5rem', color: '#e5e7eb', fontSize: '0.9rem' }}>
                  <strong>Reason:</strong> {reviewingLog.correctionReason}
                </div>
                {reviewingLog.correctionNotes && (
                  <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    <strong>Notes:</strong> {reviewingLog.correctionNotes}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Reviewer Justification / Decision Notes</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Enter audit remarks for approving or rejecting this perimeter check-in..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="sd-modal-footer">
              <button type="button" className="btn-sd-secondary" onClick={() => setReviewingLog(null)}>Cancel</button>
              <button
                type="button"
                style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.65rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => handleExecuteReview('REJECT')}
                disabled={actionProcessing}
              >
                Reject Request
              </button>
              <button
                type="button"
                className="btn-sd-primary"
                onClick={() => handleExecuteReview('APPROVE')}
                disabled={actionProcessing}
              >
                {actionProcessing ? 'Processing...' : 'Approve Campus Arrival'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportDeskManager;
