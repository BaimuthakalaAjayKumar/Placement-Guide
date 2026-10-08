import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './HODAttendanceDashboard.css';

const HODAttendanceDashboard = () => {
  const { token, user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // At-Risk Notification State (Phase 5)
  const [notifyConfirmOpen, setNotifyConfirmOpen] = useState(false);
  const [notifyDispatching, setNotifyDispatching] = useState(false);
  const [notifyResult, setNotifyResult] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const deptName = user?.department || user?.branch || 'Department';

  const handleDispatchDepartmentAtRisk = async () => {
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
      console.error('Error dispatching department at-risk notifications:', err);
      alert(err.response?.data?.error || 'Failed to dispatch department at-risk alerts.');
    } finally {
      setNotifyDispatching(false);
    }
  };

  useEffect(() => {
    fetchDepartmentReport();
  }, [startDate, endDate, sectionFilter]);

  const fetchDepartmentReport = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (sectionFilter) params.append('section', sectionFilter);

      const res = await axios.get(`${API_URL}/attendance/reports/department?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setReport(res.data.report);
      }
    } catch (err) {
      console.error('Error fetching HOD department report:', err);
      setError(err.response?.data?.error || 'Failed to load department attendance intelligence.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!token) return;
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (sectionFilter) params.append('section', sectionFilter);

      const response = await axios.get(`${API_URL}/attendance/reports/shortage.csv?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${deptName}_Attendance_Shortage_Report.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Failed to export shortage CSV report.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="hod-attendance-container">
      {/* Header */}
      <header className="hod-att-header">
        <div>
          <h1>Department Attendance Intelligence</h1>
          <p className="subtitle">
            HOD Oversight for <strong>{deptName}</strong> &bull; Monitor classroom compliance, faculty activity, and shortage risks.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn-export-csv"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting CSV...' : '📥 Export Shortage CSV'}
          </button>
          <button className="btn-refresh-hod" onClick={fetchDepartmentReport}>
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="hod-filter-bar">
        <div className="filter-item">
          <label>Section Filter</label>
          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
            <option value="">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
            <option value="D">Section D</option>
          </select>
        </div>
        <div className="filter-item">
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="filter-item">
          <label>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {error && <div className="hod-att-error">{error}</div>}

      {/* Metrics Ribbon */}
      <div className="hod-metrics-ribbon">
        <div className="hod-metric-card highlight-metric">
          <div className="metric-label">Department Average</div>
          <div className="metric-value">{report?.averageAttendance || 0}%</div>
          <div className="metric-sub">Classroom presence</div>
        </div>

        <div className="hod-metric-card">
          <div className="metric-label">Total Sessions</div>
          <div className="metric-value">{report?.totalSessions || 0}</div>
          <div className="metric-sub">Lectures conducted</div>
        </div>

        <div className="hod-metric-card">
          <div className="metric-label">Enrolled Students</div>
          <div className="metric-value">{report?.totalStudents || 0}</div>
          <div className="metric-sub">Active department students</div>
        </div>

        <div className={`hod-metric-card ${(report?.shortageCount || 0) > 0 ? 'metric-alert' : ''}`}>
          <div className="metric-label">Shortage Students</div>
          <div className="metric-value">{report?.shortageCount || 0}</div>
          <div className="metric-sub">&lt; 75% attendance threshold</div>
        </div>
      </div>

      {loading ? (
        <div className="hod-loading">
          <div className="spinner"></div>
          <p>Analyzing departmental attendance patterns...</p>
        </div>
      ) : (
        <div className="hod-dashboard-content">
          {/* Section & Subject Breakdowns Grid */}
          <div className="analytics-split-grid">
            {/* Subject-Wise Performance */}
            <div className="dashboard-panel">
              <h3>Subject Attendance Distribution</h3>
              {(!report?.subjectAttendance || report.subjectAttendance.length === 0) ? (
                <p className="panel-empty">No subject data found for this period.</p>
              ) : (
                <div className="table-responsive">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Subject</th>
                        <th>Sessions</th>
                        <th>Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.subjectAttendance.map((sub, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{sub.subjectName}</strong>
                            <span className="sub-code-text">{sub.subjectCode}</span>
                          </td>
                          <td>{sub.sessionsCount}</td>
                          <td>
                            <div className="table-pct-cell">
                              <span className="pct-num">{sub.attendancePercentage}%</span>
                              <div className="mini-track">
                                <div
                                  className={`mini-fill ${sub.attendancePercentage < 75 ? 'fill-short' : ''}`}
                                  style={{ width: `${Math.min(100, sub.attendancePercentage)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Section Breakdown */}
            <div className="dashboard-panel">
              <h3>Section Attendance Ratios</h3>
              {(!report?.sectionAttendance || report.sectionAttendance.length === 0) ? (
                <p className="panel-empty">No section data found for this period.</p>
              ) : (
                <div className="table-responsive">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Section</th>
                        <th>Sessions</th>
                        <th>Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.sectionAttendance.map((sec, i) => (
                        <tr key={i}>
                          <td><strong>Section {sec.section}</strong></td>
                          <td>{sec.sessionsCount}</td>
                          <td>
                            <span className={`ratio-badge ${sec.attendancePercentage < 75 ? 'badge-low' : 'badge-good'}`}>
                              {sec.attendancePercentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Faculty Activity Panel */}
          <div className="dashboard-panel full-panel">
            <h3>Faculty Classroom Activity &amp; Compliance</h3>
            {(!report?.facultyActivity || report.facultyActivity.length === 0) ? (
              <p className="panel-empty">No faculty sessions registered in this timeframe.</p>
            ) : (
              <div className="table-responsive">
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Faculty Member</th>
                      <th>Email</th>
                      <th>Sessions Conducted</th>
                      <th>Total Present Checked-In</th>
                      <th>Average Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.facultyActivity.map((fac, i) => (
                      <tr key={i}>
                        <td><strong>{fac.facultyName}</strong></td>
                        <td>{fac.facultyEmail}</td>
                        <td>{fac.sessionsCount}</td>
                        <td>{fac.totalPresent}</td>
                        <td>
                          <strong>{fac.averageAttendance}%</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Shortage Risk Student Registry */}
          <div className="dashboard-panel full-panel shortage-panel">
            <div className="panel-header-flex">
              <div>
                <h3>At-Risk Students (&lt; 75% Attendance)</h3>
                <p className="sub-p">Students requiring immediate counseling and administrative notification.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="shortage-count-tag">
                  {report?.shortageStudents?.length || 0} Students Flagged
                </span>
                {report?.shortageStudents?.length > 0 && (
                  <button
                    style={{
                      background: '#e11d48',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={() => setNotifyConfirmOpen(true)}
                    disabled={notifyDispatching}
                  >
                    📢 Notify Department At-Risk Students
                  </button>
                )}
              </div>
            </div>

            {notifyResult && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid #22c55e',
                color: '#4ade80',
                padding: '12px 16px',
                borderRadius: '8px',
                margin: '16px 0'
              }}>
                <strong>Department Notification Complete:</strong>
                {' '}Requested: {notifyResult.requested}, Authorized: {notifyResult.authorized}, Notified: {notifyResult.notified}, Skipped (Cooldown): {notifyResult.skipped}, Failed: {notifyResult.failed}
              </div>
            )}

            {(!report?.shortageStudents || report.shortageStudents.length === 0) ? (
              <div className="all-clear-box">
                ✅ No students currently below the 75% statutory shortage threshold in this query.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="shortage-table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Student Name</th>
                      <th>Present Classes</th>
                      <th>Total Classes</th>
                      <th>Current %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.shortageStudents.map((st, i) => (
                      <tr key={i}>
                        <td><strong>{st.rollNumber}</strong></td>
                        <td>{st.studentName}</td>
                        <td>{st.presentCount}</td>
                        <td>{st.totalCount}</td>
                        <td>
                          <span className="shortage-pct-red">{st.attendancePercentage}%</span>
                        </td>
                        <td>
                          <span className="shortage-label">CRITICAL SHORTAGE</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Department Bulk Notification */}
      {notifyConfirmOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '480px',
            width: '90%'
          }}>
            <h2 style={{ margin: '0 0 12px', color: '#ffffff', fontSize: '1.25rem' }}>
              Confirm Department Notification
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.5' }}>
              You are about to notify <strong>{report?.shortageStudents?.length || 0} students</strong> in <strong>{deptName}</strong> with official institutional attendance alerts.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
              Delivery adheres strictly to department boundaries. Deduplication suppresses alerts sent within the 7-day cooldown.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button
                style={{
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => setNotifyConfirmOpen(false)}
                disabled={notifyDispatching}
              >
                Cancel
              </button>
              <button
                style={{
                  background: '#e11d48',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                onClick={handleDispatchDepartmentAtRisk}
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

export default HODAttendanceDashboard;
