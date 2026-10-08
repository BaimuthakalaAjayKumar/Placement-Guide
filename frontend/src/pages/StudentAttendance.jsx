import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './StudentAttendance.css';

const StudentAttendance = () => {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [preferences, setPreferences] = useState({ inApp: true, email: true, parentOptIn: false });
  const [guardianContacts, setGuardianContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'subjects' | 'history' | 'alerts'
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefMessage, setPrefMessage] = useState('');

  useEffect(() => {
    fetchStudentAttendanceData();
  }, []);

  const fetchStudentAttendanceData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [analyticsRes, historyRes, alertsRes, prefRes] = await Promise.all([
        axios.get(`${API_URL}/attendance/student/analytics`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/attendance/student/history`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/attendance/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/attendance/notifications/preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: {} }))
      ]);

      if (analyticsRes.data?.success) {
        setAnalytics(analyticsRes.data.analytics);
      }
      if (historyRes.data?.success) {
        setHistory(historyRes.data.history || []);
      }
      if (alertsRes.data?.success) {
        setAlerts(alertsRes.data.data || []);
      }
      if (prefRes.data?.success) {
        setPreferences(prefRes.data.preferences || { inApp: true, email: true, parentOptIn: false });
        setGuardianContacts(prefRes.data.guardianContacts || []);
      }
    } catch (err) {
      console.error('Error fetching student attendance data:', err);
      setError(err.response?.data?.error || 'Unable to retrieve your attendance records.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(prev => prev.map(a => a._id === notificationId ? { ...a, isRead: true } : a));
    } catch (err) {
      console.error('Error marking alert as read:', err);
    }
  };

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setPrefSaving(true);
    setPrefMessage('');
    try {
      const res = await axios.put(`${API_URL}/attendance/notifications/preferences`, {
        inApp: preferences.inApp,
        email: preferences.email,
        parentOptIn: preferences.parentOptIn,
        guardianContacts
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setPrefMessage('Preferences updated successfully!');
        setPreferences(res.data.preferences);
        setGuardianContacts(res.data.guardianContacts || []);
      }
    } catch (err) {
      setPrefMessage(err.response?.data?.error || 'Failed to save preferences.');
    } finally {
      setPrefSaving(false);
    }
  };

  const overallPct = analytics?.overallPercentage ?? 100;
  const isShortage = analytics?.shortage || (analytics?.totalClasses > 0 && overallPct < 75);

  return (
    <div className="student-attendance-container">
      {/* Header */}
      <header className="student-att-header">
        <div>
          <h1>My Attendance &amp; Compliance</h1>
          <p className="subtitle">
            Track your verified classroom presence, subject-level ratios, and statutory shortage status.
          </p>
        </div>
        <button className="btn-refresh-att" onClick={fetchStudentAttendanceData} title="Refresh data">
          🔄 Refresh
        </button>
      </header>

      {error && <div className="student-att-error">{error}</div>}

      {/* Shortage Warning Banner */}
      {isShortage && (
        <div className="shortage-warning-banner">
          <div className="shortage-icon">⚠️</div>
          <div className="shortage-content">
            <h3>Attendance Shortage Warning ({overallPct}%)</h3>
            <p>
              Your cumulative classroom attendance is below the mandatory <strong>75% institutional requirement</strong>.
              Immediate attendance compliance is necessary to remain eligible for end-semester exams and campus placements.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stat Ribbon */}
      <div className="stat-cards-grid">
        <div className={`stat-card ${isShortage ? 'card-shortage' : 'card-good'}`}>
          <div className="stat-label">Overall Attendance</div>
          <div className="stat-value">{overallPct}%</div>
          <div className="stat-sub">
            {overallPct >= 75 ? 'Compliant with regulations' : 'Below 75% threshold'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Classes Attended</div>
          <div className="stat-value">{analytics?.attendedClasses || 0}</div>
          <div className="stat-sub">Verified check-ins</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Classes Missed</div>
          <div className="stat-value">{analytics?.missedClasses || 0}</div>
          <div className="stat-sub">Unattended / absent</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Conducted</div>
          <div className="stat-value">{analytics?.totalClasses || 0}</div>
          <div className="stat-sub">Classroom sessions</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="attendance-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Subject Breakdown
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Detailed History Log
        </button>
        <button
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🔔 Alerts &amp; Notifications {alerts.filter(a => !a.isRead).length > 0 && `(${alerts.filter(a => !a.isRead).length})`}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading attendance information...</p>
        </div>
      ) : activeTab === 'overview' ? (
        /* Subject-wise Cards */
        <div className="subjects-grid">
          {(!analytics?.subjects || analytics.subjects.length === 0) ? (
            <div className="no-records-card">
              <p>No classroom sessions recorded for your enrolled subjects yet.</p>
            </div>
          ) : (
            analytics.subjects.map((sub, idx) => (
              <div key={idx} className={`subject-card ${sub.shortage ? 'subject-shortage' : ''}`}>
                <div className="subject-card-header">
                  <div>
                    <h4>{sub.subjectName}</h4>
                    <span className="subject-code">{sub.subjectCode}</span>
                  </div>
                  <span className={`subject-pct-badge ${sub.shortage ? 'badge-shortage' : 'badge-ok'}`}>
                    {sub.percentage}%
                  </span>
                </div>

                <div className="subject-card-body">
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${sub.shortage ? 'fill-shortage' : 'fill-ok'}`}
                      style={{ width: `${Math.min(100, sub.percentage)}%` }}
                    ></div>
                  </div>
                  <div className="subject-metrics">
                    <span>Present: <strong>{sub.present}</strong></span>
                    <span>Total: <strong>{sub.total}</strong></span>
                    <span>Missed: <strong>{sub.absent}</strong></span>
                  </div>
                </div>

                {sub.shortage && (
                  <div className="subject-alert-tag">
                    ⚠️ Shortage in this course (&lt;75%)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'history' ? (
        /* History Log Table */
        <div className="history-table-card">
          {history.length === 0 ? (
            <div className="no-records-card">
              <p>No historical check-in records found for your account.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="student-history-table">
                <thead>
                  <tr>
                    <th>Date &amp; Time</th>
                    <th>Subject</th>
                    <th>Instructor</th>
                    <th>Room</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Correction</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</strong>
                        <span className="cell-sub">
                          {item.scannedAt ? new Date(item.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </td>
                      <td>
                        <strong>{item.subject?.name || 'Class Subject'}</strong>
                        <span className="cell-sub">{item.subject?.code || ''}</span>
                      </td>
                      <td>{item.faculty}</td>
                      <td>{item.room}</td>
                      <td>
                        <span className={`status-tag tag-${item.status?.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.verificationMethod || 'QR_SCAN'}</td>
                      <td>
                        {item.correctionStatus && item.correctionStatus !== 'NONE' ? (
                          <span className={`correction-pill pill-${item.correctionStatus.toLowerCase()}`}>
                            {item.correctionStatus}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Alerts & Preferences View */
        <div className="alerts-tab-layout">
          <div className="alerts-feed-section">
            <h3 className="section-title">Institutional Attendance Alerts</h3>
            {alerts.length === 0 ? (
              <div className="no-records-card">
                <p>No attendance shortage alerts currently active on your account. Keep up the good work!</p>
              </div>
            ) : (
              <div className="alerts-cards-list">
                {alerts.map((al) => (
                  <div key={al._id} className={`att-alert-card ${al.isRead ? 'read' : 'unread'}`}>
                    <div className="att-alert-header">
                      <div className="att-alert-badge">⚠️ Attendance Shortage</div>
                      <span className="att-alert-date">{new Date(al.createdAt).toLocaleString()}</span>
                    </div>
                    <h4 className="att-alert-subject">
                      {al.metadata?.subjectName || 'Course'}
                      {al.metadata?.attendancePercentage !== undefined && (
                        <span className="att-alert-pct"> — {al.metadata.attendancePercentage}% (Required: {al.metadata.threshold || 75}%)</span>
                      )}
                    </h4>
                    <p className="att-alert-message">{al.message}</p>
                    {al.metadata?.recommendedAction && (
                      <div className="att-alert-action">
                        <strong>Recommended Action:</strong> {al.metadata.recommendedAction}
                      </div>
                    )}
                    <div className="att-alert-footer">
                      <span className="att-alert-status-text">
                        {al.isRead ? '✓ Read' : '● Unread'}
                      </span>
                      {!al.isRead && (
                        <button
                          className="btn-mark-read"
                          onClick={() => handleMarkAsRead(al._id)}
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="preferences-sidebar-card">
            <h3 className="section-title">Notification Preferences</h3>
            <p className="pref-description">
              Configure delivery channels for statutory attendance notices and emergency shortage warnings.
            </p>
            {prefMessage && <div className="pref-feedback-msg">{prefMessage}</div>}
            <form onSubmit={handleSavePreferences}>
              <div className="pref-option-item">
                <div>
                  <strong>In-App Notifications</strong>
                  <p className="pref-sub">Real-time alerts displayed inside the CampusBridge portal</p>
                </div>
                <span className="compliance-tag">Mandatory</span>
              </div>

              <div className="pref-option-item">
                <div>
                  <strong>Email Delivery</strong>
                  <p className="pref-sub">Transactional emails sent to {user?.email || 'your email'}</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.email !== false}
                  onChange={(e) => setPreferences({ ...preferences, email: e.target.checked })}
                />
              </div>

              <div className="pref-option-item">
                <div>
                  <strong>Parent / Guardian Bridge</strong>
                  <p className="pref-sub">Allow institutional shortage notices to registered guardian contact</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.parentOptIn === true}
                  onChange={(e) => setPreferences({ ...preferences, parentOptIn: e.target.checked })}
                />
              </div>

              {preferences.parentOptIn && (
                <div className="guardian-edit-box">
                  <h4>Parent/Guardian Contact Details</h4>
                  <p className="pref-sub">Optional contact for automated statutory shortage alerts.</p>
                  <div className="guardian-input-group">
                    <label>Guardian Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Guardian Name"
                      value={guardianContacts[0]?.name || ''}
                      onChange={(e) => {
                        const copy = [...guardianContacts];
                        copy[0] = { ...(copy[0] || {}), name: e.target.value, enabled: true };
                        setGuardianContacts(copy);
                      }}
                    />
                  </div>
                  <div className="guardian-input-group">
                    <label>Guardian Email</label>
                    <input
                      type="email"
                      placeholder="e.g. parent@example.com"
                      value={guardianContacts[0]?.email || ''}
                      onChange={(e) => {
                        const copy = [...guardianContacts];
                        copy[0] = { ...(copy[0] || {}), email: e.target.value, enabled: true };
                        setGuardianContacts(copy);
                      }}
                    />
                  </div>
                  <div className="guardian-input-group">
                    <label>Guardian Mobile Phone</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={guardianContacts[0]?.phone || ''}
                      onChange={(e) => {
                        const copy = [...guardianContacts];
                        copy[0] = { ...(copy[0] || {}), phone: e.target.value, enabled: true };
                        setGuardianContacts(copy);
                      }}
                    />
                  </div>
                </div>
              )}

              <button type="submit" className="btn-save-pref" disabled={prefSaving}>
                {prefSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttendance;
