import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './PlacementStatsExport.css';

const PlacementStatsExport = ({ students: propStudents }) => {
  const { user, token } = useAuth();
  const [students, setStudents] = useState(propStudents || []);
  const [loading, setLoading] = useState(false);
  const [recipientRole, setRecipientRole] = useState('Department Placement Faculty Coordinator');
  const [targetBatch, setTargetBatch] = useState('All');
  const [targetBranch, setTargetBranch] = useState('All');
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState('');

  // Fetch real students from API if not supplied via props
  useEffect(() => {
    if (propStudents && propStudents.length > 0) {
      setStudents(propStudents);
      return;
    }

    const fetchRealStudents = async () => {
      try {
        setLoading(true);
        const authToken = token || localStorage.getItem('token');
        if (!authToken) return;

        const res = await axios.get(`${API_URL}/users/students`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (res.data?.success) {
          setStudents(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to load students in PlacementStatsExport:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealStudents();
  }, [propStudents, token]);

  // Extract available batches matching faculty's assigned scope and actual records
  const availableBatches = useMemo(() => {
    const batchesSet = new Set();

    // From faculty scope
    if (user?.managedAcademicYears && user.managedAcademicYears.length > 0) {
      user.managedAcademicYears.forEach(ay => {
        const m = String(ay).match(/20\d\d/);
        if (m) batchesSet.add(m[0]);
        else if (String(ay).includes('4th')) batchesSet.add('2026');
        else if (String(ay).includes('3rd')) batchesSet.add('2027');
        else if (String(ay).includes('2nd')) batchesSet.add('2028');
      });
    }

    if (user?.managedScopes && user.managedScopes.length > 0) {
      user.managedScopes.forEach(s => {
        const m = String(s.academicYear).match(/20\d\d/);
        if (m) batchesSet.add(m[0]);
        else if (String(s.academicYear).includes('4th')) batchesSet.add('2026');
        else if (String(s.academicYear).includes('3rd')) batchesSet.add('2027');
        else if (String(s.academicYear).includes('2nd')) batchesSet.add('2028');
      });
    }

    // From actual student documents
    students.forEach(s => {
      if (s.batch) batchesSet.add(String(s.batch));
    });

    const list = Array.from(batchesSet).filter(Boolean).sort();
    return list.length > 0 ? list : ['2026', '2027', '2028'];
  }, [user, students]);

  // Extract available departments matching faculty's assigned scope and actual records
  const availableDepartments = useMemo(() => {
    const deptSet = new Set();

    // From faculty scope
    if (user?.managedScopes && user.managedScopes.length > 0) {
      user.managedScopes.forEach(s => {
        if (s.branch && s.branch.toLowerCase() !== 'all') {
          deptSet.add(s.branch.toUpperCase());
        }
      });
    }

    // From actual student records
    students.forEach(s => {
      if (s.branch) deptSet.add(s.branch.toUpperCase());
    });

    const list = Array.from(deptSet).filter(Boolean).sort();
    return list.length > 0 ? list : ['CSE', 'IT', 'AIML', 'ECE'];
  }, [user, students]);

  // Filtered dataset for export and preview
  const getFilteredData = () => {
    return students.filter(item => {
      const studentBatch = String(item.batch || '2026');
      const studentBranch = String(item.branch || 'CSE').toUpperCase();

      if (targetBatch !== 'All' && studentBatch !== targetBatch) return false;
      if (targetBranch !== 'All' && studentBranch !== targetBranch.toUpperCase()) return false;
      return true;
    });
  };

  // CSV Export
  const exportToCSV = () => {
    setGenerating(true);
    const data = getFilteredData();
    const headers = ['Roll Number', 'Student Name', 'Department', 'Graduation Batch', 'CGPA', 'Placement Readiness (PRI)', 'Placement Status', 'Tests Attempted', 'Problems Solved'];
    const rows = data.map(d => [
      d.rollNumber || d.rollNo || 'N/A',
      `"${d.name}"`,
      d.branch || 'CSE',
      d.batch || '2026',
      d.cgpa || '8.2',
      `"${d.priScore || d.readinessScore || 0}%"`,
      `"${d.placementStatus || 'Preparing / Active'}"`,
      d.testsAttempted || 0,
      d.codingSolved || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GRIET_Placement_Report_${recipientRole.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setGenerating(false);
    setLastGenerated('CSV Report downloaded successfully.');
  };

  // Excel (.xls) Export
  const exportToExcel = () => {
    setGenerating(true);
    const data = getFilteredData();
    const tableHtml = `
      <table border="1">
        <thead>
          <tr style="background-color: #1e3a8a; color: white;">
            <th>Roll Number</th>
            <th>Student Name</th>
            <th>Department</th>
            <th>Batch</th>
            <th>CGPA</th>
            <th>PRI Score</th>
            <th>Placement Status</th>
            <th>Tests Attempted</th>
            <th>Problems Solved</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(d => `
            <tr>
              <td>${d.rollNumber || d.rollNo || 'N/A'}</td>
              <td>${d.name}</td>
              <td>${d.branch || 'CSE'}</td>
              <td>${d.batch || '2026'}</td>
              <td>${d.cgpa || '8.2'}</td>
              <td>${d.priScore || d.readinessScore || 0}%</td>
              <td>${d.placementStatus || 'Preparing / Active'}</td>
              <td>${d.testsAttempted || 0}</td>
              <td>${d.codingSolved || 0}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GRIET_Placement_Report_${recipientRole.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setGenerating(false);
    setLastGenerated('Excel (.xls) report generated and downloaded.');
  };

  // Printable PDF view
  const exportToPDF = () => {
    window.print();
    setLastGenerated('PDF generation dialog opened.');
  };

  const filteredData = getFilteredData();

  return (
    <div className="stats-export-container animate-fade">
      {/* Header Banner */}
      <div className="export-header-banner glass-card">
        <div>
          <h2>📑 Placement Statistics & Comprehensive Report Exporter</h2>
          <p>
            Generate multi-format compliance and placement progress reports customized for the <strong>Department Placement Faculty Coordinator</strong>, <strong>Head of Department (HOD)</strong>, <strong>Principal</strong>, and <strong>Campus Recruiters</strong>.
          </p>
        </div>

        <div className="recipient-pill">
          <span>Target Audience:</span> <strong>{recipientRole}</strong>
        </div>
      </div>

      {lastGenerated && (
        <div className="success-banner">
          <span>✓ {lastGenerated}</span>
        </div>
      )}

      {/* Configuration Grid */}
      <div className="glass-card export-controls-card">
        <h3>Report Scope & Audience Selection</h3>
        <div className="export-filters-grid">
          <div className="form-group">
            <label>Report Tailored For</label>
            <select
              className="form-control"
              value={recipientRole}
              onChange={(e) => setRecipientRole(e.target.value)}
            >
              <option value="Department Placement Faculty Coordinator">Department Placement Faculty Coordinator</option>
              <option value="Placement Officer">Placement Officer (Executive View)</option>
              <option value="HOD">Head of Department (HOD Academic View)</option>
              <option value="Principal">College Principal (Comprehensive Campus Overview)</option>
              <option value="Campus Recruiter">Campus Recruiter / Corporate Relations</option>
            </select>
          </div>

          <div className="form-group">
            <label>Academic Batch</label>
            <select
              className="form-control"
              value={targetBatch}
              onChange={(e) => setTargetBatch(e.target.value)}
            >
              <option value="All">All Batches ({availableBatches.join(', ')})</option>
              {availableBatches.map(b => (
                <option key={b} value={b}>
                  {b} Batch {b === '2026' ? '(Final Year)' : b === '2027' ? '(Pre-Final Year)' : b === '2028' ? '(Sophomore Year)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Engineering Department</label>
            <select
              className="form-control"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
            >
              <option value="All">All Departments ({availableDepartments.join(', ')})</option>
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'CSE' ? 'Computer Science & Engineering (CSE)'
                    : dept === 'IT' ? 'Information Technology (IT)'
                    : dept === 'AIML' ? 'Artificial Intelligence & ML (AIML)'
                    : dept === 'ECE' ? 'Electronics & Communication (ECE)'
                    : dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Download Format Action Buttons */}
        <div className="export-buttons-row">
          <button
            type="button"
            className="export-btn pdf"
            onClick={exportToPDF}
            disabled={generating}
          >
            <span>📄</span> Download Printable PDF
          </button>

          <button
            type="button"
            className="export-btn excel"
            onClick={exportToExcel}
            disabled={generating}
          >
            <span>📊</span> Export to Excel (.XLS)
          </button>

          <button
            type="button"
            className="export-btn csv"
            onClick={exportToCSV}
            disabled={generating}
          >
            <span>📑</span> Export to CSV Format
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div className="glass-card preview-table-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
          <h4>Previewing Report Dataset ({filteredData.length} records)</h4>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>GRIET Autonomous Placement Cell Records</span>
        </div>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
            <span>Loading real-time placement records...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
            <span>No students found matching selected batch and department scope.</span>
          </div>
        ) : (
          <div className="export-table-wrapper">
            <table className="export-table">
              <thead>
                <tr>
                  <th>ROLL NO</th>
                  <th>CANDIDATE NAME</th>
                  <th>BRANCH</th>
                  <th>BATCH</th>
                  <th>CGPA</th>
                  <th>PRI SCORE</th>
                  <th>PLACEMENT STATUS</th>
                  <th>TESTS ATTEMPTED</th>
                  <th>CODING SOLVED</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(d => (
                  <tr key={d._id || d.rollNumber || d.rollNo}>
                    <td><strong>{d.rollNumber || d.rollNo || 'N/A'}</strong></td>
                    <td>{d.name}</td>
                    <td><span className="branch-tag">{d.branch || 'CSE'}</span></td>
                    <td>{d.batch || '2026'}</td>
                    <td>{d.cgpa || '8.2'}</td>
                    <td><strong style={{ color: '#34d399' }}>{d.priScore || d.readinessScore || 0}%</strong></td>
                    <td><span className="status-text">{d.placementStatus || 'Preparing / Active'}</span></td>
                    <td>{d.testsAttempted || 0}</td>
                    <td>{d.codingSolved || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlacementStatsExport;
