import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './HODDashboard.css';

const HODDashboard = () => {
  const { user, token } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'faculties' | 'students' | 'broadcast'

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

  // Initial Data Load
  useEffect(() => {
    if (token) {
      setLoading(true);
      Promise.all([fetchOverview(), fetchFaculties(), fetchStudents(), fetchFacultyActivities()])
        .finally(() => setLoading(false));
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
        </div>
      </div>
    </>
  );
};

export default HODDashboard;
