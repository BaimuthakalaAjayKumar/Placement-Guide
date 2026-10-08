import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './FacultyAttendanceHistory.css';

const FacultyAttendanceHistory = () => {
  const { token, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected session for drawer / modal
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionRecords, setSessionRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Correction Modal State
  const [correctionTargetRecord, setCorrectionTargetRecord] = useState(null);
  const [correctionStatus, setCorrectionStatus] = useState('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState('');
  const [correctionError, setCorrectionError] = useState('');

  // At-Risk State (Phase 5)
  const [atRiskList, setAtRiskList] = useState([]);
  const [showAtRiskModal, setShowAtRiskModal] = useState(false);
  const [notifyConfirmOpen, setNotifyConfirmOpen] = useState(false);
  const [notifyDispatching, setNotifyDispatching] = useState(false);
  const [notifyResult, setNotifyResult] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [statusFilter, sectionFilter, startDate, endDate]);

  const fetchHistory = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (sectionFilter) params.append('section', sectionFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const [res, shortageRes] = await Promise.all([
        axios.get(`${API_URL}/attendance/sessions/history?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/attendance/reports/shortage`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: {} }))
      ]);

      if (res.data?.success) {
        setSessions(res.data.sessions || []);
      }
      if (shortageRes.data?.success) {
        setAtRiskList(shortageRes.data.students || []);
      }
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      setError(err.response?.data?.error || 'Failed to load attendance session history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchAtRisk = async () => {
    setNotifyDispatching(true);
    try {
      const res = await axios.post(`${API_URL}/attendance/notifications/dispatch-at-risk`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setNotifyResult(res.data.summary);
        setNotifyConfirmOpen(false);
      }
    } catch (err) {
      console.error('Error dispatching at-risk notifications:', err);
      alert(err.response?.data?.error || 'Failed to dispatch at-risk alerts.');
    } finally {
      setNotifyDispatching(false);
    }
  };

  const handleViewSession = async (session) => {
    setSelectedSession(session);
    setRecordsLoading(true);
    setSessionRecords([]);
    try {
      const res = await axios.get(`${API_URL}/attendance/sessions/${session._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setSessionRecords(res.data.records || []);
      }
    } catch (err) {
      console.error('Error loading session records:', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleOpenCorrection = (record) => {
    setCorrectionTargetRecord(record);
    setCorrectionStatus(record.status === 'PRESENT' ? 'ABSENT' : 'PRESENT');
    setCorrectionReason('');
    setCorrectionNotes('');
    setCorrectionSuccess('');
    setCorrectionError('');
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      setCorrectionError('Please provide a reason for the correction request.');
      return;
    }
    setCorrectionSubmitting(true);
    setCorrectionError('');
    setCorrectionSuccess('');
    try {
      const res = await axios.post(
        `${API_URL}/attendance/records/${correctionTargetRecord._id}/correction`,
        {
          requestedStatus: correctionStatus,
          reason: correctionReason,
          notes: correctionNotes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success) {
        setCorrectionSuccess('Correction request submitted for administrative review.');
        // Update local records
        setSessionRecords((prev) =>
          prev.map((r) =>
            r._id === correctionTargetRecord._id
              ? { ...r, correctionStatus: 'REQUESTED', correctionRequestedStatus: correctionStatus }
              : r
          )
        );
        setTimeout(() => {
          setCorrectionTargetRecord(null);
          setCorrectionSuccess('');
        }, 1800);
      }
    } catch (err) {
      setCorrectionError(err.response?.data?.error || 'Failed to submit correction request.');
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  return (
    <div className="faculty-history-container">
      {/* Header */}
      <header className="history-header">
        <div>
          <h1>Attendance Session History</h1>
          <p className="subtitle">Audit and review historical classroom attendance sessions, rosters, and correction records.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn-at-risk-toggle"
            style={{
              background: atRiskList.length > 0 ? '#e11d48' : '#334155',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={() => setShowAtRiskModal(true)}
          >
            ⚠️ At-Risk Students ({atRiskList.length})
          </button>
          <button className="btn-refresh" onClick={fetchHistory} title="Refresh records">
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="filter-card">
        <div className="filter-group">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="FINALIZED">FINALIZED</option>
            <option value="LOCKED">LOCKED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Section</label>
          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>
        <div className="filter-group">
          <label>From Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>To Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {error && <div className="history-error-alert">{error}</div>}

      {/* Sessions Grid */}
      {loading ? (
        <div className="history-loading">
          <div className="spinner"></div>
          <p>Loading attendance session history...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="history-empty">
          <span className="empty-icon">📋</span>
          <h3>No Attendance Sessions Found</h3>
          <p>No historical sessions match your selected filter criteria.</p>
        </div>
      ) : (
        <div className="sessions-table-wrapper">
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Subject</th>
                <th>Branch &amp; Sec</th>
                <th>Room</th>
                <th>Status</th>
                <th>Attendance %</th>
                <th>Present / Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess) => {
                const dateStr = sess.sessionDate ? new Date(sess.sessionDate).toLocaleDateString() : 'N/A';
                const timeStr = sess.actualStartTime ? new Date(sess.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const pct = sess.attendancePercentage || 0;
                return (
                  <tr key={sess._id}>
                    <td>
                      <strong>{dateStr}</strong>
                      <span className="cell-sub">{timeStr}</span>
                    </td>
                    <td>
                      <strong>{sess.subject?.name || 'Class Subject'}</strong>
                      <span className="cell-sub">{sess.subject?.code || ''}</span>
                    </td>
                    <td>{sess.branch} - Sec {sess.section}</td>
                    <td>{sess.room ? `${sess.room.buildingName} ${sess.room.roomNumber}` : 'Classroom'}</td>
                    <td>
                      <span className={`status-pill status-${sess.status?.toLowerCase()}`}>
                        {sess.status}
                      </span>
                    </td>
                    <td>
                      <div className="pct-bar-wrapper">
                        <span className="pct-text">{pct}%</span>
                        <div className="pct-bar-track">
                          <div
                            className={`pct-bar-fill ${pct < 75 ? 'shortage' : ''}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{sess.totalPresent || 0}</strong> / {sess.totalEnrolled || 0}
                    </td>
                    <td>
                      <button className="btn-view" onClick={() => handleViewSession(sess)}>
                        View Roster
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Session Details Drawer / Modal */}
      {selectedSession && (
        <div className="modal-backdrop" onClick={() => setSelectedSession(null)}>
          <div className="modal-content session-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedSession.subject?.name || 'Session Details'}</h2>
                <p className="modal-subtitle">
                  {selectedSession.branch} - Section {selectedSession.section} &bull; {selectedSession.room?.buildingName} {selectedSession.room?.roomNumber}
                </p>
              </div>
              <button className="btn-close" onClick={() => setSelectedSession(null)}>&times;</button>
            </div>

            <div className="session-stats-ribbon">
              <div className="ribbon-card">
                <span>Present</span>
                <strong>{selectedSession.totalPresent || 0}</strong>
              </div>
              <div className="ribbon-card">
                <span>Absent</span>
                <strong>{selectedSession.totalAbsent || 0}</strong>
              </div>
              <div className="ribbon-card">
                <span>Total Enrolled</span>
                <strong>{selectedSession.totalEnrolled || 0}</strong>
              </div>
              <div className="ribbon-card">
                <span>Percentage</span>
                <strong>{selectedSession.attendancePercentage || 0}%</strong>
              </div>
            </div>

            <div className="roster-section">
              <h3>Student Attendance Roster</h3>
              {recordsLoading ? (
                <p className="roster-loading">Loading student records...</p>
              ) : sessionRecords.length === 0 ? (
                <p className="roster-empty">No individual check-in records for this session.</p>
              ) : (
                <div className="records-table-container">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Status</th>
                        <th>Method</th>
                        <th>Time</th>
                        <th>Correction</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionRecords.map((rec) => (
                        <tr key={rec._id}>
                          <td><strong>{rec.rollNumber}</strong></td>
                          <td>{rec.studentName}</td>
                          <td>
                            <span className={`record-status status-${rec.status?.toLowerCase()}`}>
                              {rec.status}
                            </span>
                          </td>
                          <td>{rec.verificationMethod || 'QR_SCAN'}</td>
                          <td>{rec.scannedAt ? new Date(rec.scannedAt).toLocaleTimeString() : 'N/A'}</td>
                          <td>
                            {rec.correctionStatus && rec.correctionStatus !== 'NONE' ? (
                              <span className={`correction-badge badge-${rec.correctionStatus?.toLowerCase()}`}>
                                {rec.correctionStatus}
                              </span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td>
                            <button className="btn-correct" onClick={() => handleOpenCorrection(rec)}>
                              Dispute / Correct
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attendance Correction Modal */}
      {correctionTargetRecord && (
        <div className="modal-backdrop" onClick={() => setCorrectionTargetRecord(null)}>
          <div className="modal-content correction-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Attendance Correction</h3>
              <button className="btn-close" onClick={() => setCorrectionTargetRecord(null)}>&times;</button>
            </div>
            <form onSubmit={handleSubmitCorrection} className="correction-form">
              <p className="correction-info">
                Student: <strong>{correctionTargetRecord.studentName} ({correctionTargetRecord.rollNumber})</strong><br />
                Current Status: <span className="status-current">{correctionTargetRecord.status}</span>
              </p>

              {correctionError && <div className="form-error">{correctionError}</div>}
              {correctionSuccess && <div className="form-success">{correctionSuccess}</div>}

              <div className="form-group">
                <label>Requested New Status</label>
                <select value={correctionStatus} onChange={(e) => setCorrectionStatus(e.target.value)}>
                  <option value="PRESENT">PRESENT</option>
                  <option value="ABSENT">ABSENT</option>
                  <option value="LATE">LATE</option>
                  <option value="EXCUSED">EXCUSED</option>
                </select>
              </div>

              <div className="form-group">
                <label>Justification Reason (Required)</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Device camera malfunction, physical presence verified by faculty in lab."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Optional Supporting Notes</label>
                <input
                  type="text"
                  placeholder="Additional context for HOD review"
                  value={correctionNotes}
                  onChange={(e) => setCorrectionNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setCorrectionTargetRecord(null)}
                  disabled={correctionSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit-correction"
                  disabled={correctionSubmitting}
                >
                  {correctionSubmitting ? 'Submitting...' : 'Submit Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 5: At-Risk Students Drawer / Modal */}
      {showAtRiskModal && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: '850px', width: '90%' }}>
            <div className="modal-header">
              <div>
                <h2>At-Risk Students (&lt;75% Attendance)</h2>
                <p className="subtitle">
                  Authorized students across your classroom sessions requiring attendance intervention.
                </p>
              </div>
              <button className="btn-close" onClick={() => { setShowAtRiskModal(false); setNotifyResult(null); }}>
                &times;
              </button>
            </div>

            {notifyResult && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e',
                color: '#4ade80',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <strong>Notification Dispatch Complete:</strong>
                {' '}Requested: {notifyResult.requested}, Authorized: {notifyResult.authorized}, Notified: {notifyResult.notified}, Skipped (Cooldown): {notifyResult.skipped}, Failed: {notifyResult.failed}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                Total Flagged Students: <strong>{atRiskList.length}</strong>
              </span>
              {atRiskList.length > 0 && (
                <button
                  style={{
                    background: '#e11d48',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => setNotifyConfirmOpen(true)}
                  disabled={notifyDispatching}
                >
                  📢 Notify At-Risk Students
                </button>
              )}
            </div>

            {atRiskList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                ✅ All students currently meet or exceed the mandatory 75% attendance threshold.
              </div>
            ) : (
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="student-history-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Subject</th>
                      <th>Branch &amp; Sec</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskList.map((st, i) => (
                      <tr key={i}>
                        <td><strong>{st.rollNumber}</strong></td>
                        <td>{st.studentName}</td>
                        <td>{st.subjectName}</td>
                        <td>{st.branch} {st.section ? `- ${st.section}` : ''}</td>
                        <td>
                          <span style={{ color: '#f87171', fontWeight: 700 }}>
                            {st.attendancePercentage}% ({st.present}/{st.total})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                className="btn-cancel"
                onClick={() => { setShowAtRiskModal(false); setNotifyResult(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Bulk Notification */}
      {notifyConfirmOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Confirm Notification Dispatch</h2>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.5' }}>
              You are about to notify <strong>{atRiskList.length} students</strong> with attendance shortage alerts across in-app and institutional email channels.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Duplicate alerts will automatically be suppressed if within the 7-day cooldown window.
            </p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setNotifyConfirmOpen(false)}
                disabled={notifyDispatching}
              >
                Cancel
              </button>
              <button
                style={{
                  background: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={handleDispatchAtRisk}
                disabled={notifyDispatching}
              >
                {notifyDispatching ? 'Dispatching...' : 'Yes, Dispatch Alerts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyAttendanceHistory;
