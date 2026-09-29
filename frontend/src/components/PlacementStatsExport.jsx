import React, { useState } from 'react';
import './PlacementStatsExport.css';

const SAMPLE_EXPORT_DATA = [
  { rollNo: '21241A0501', name: 'Aarav Patel', branch: 'CSE', batch: '2026', cgpa: '8.8', priScore: '92%', status: 'Placed (Amazon, 28 LPA)', testsAttempted: 18, codingSolved: 145 },
  { rollNo: '21241A0502', name: 'Ananya Sharma', branch: 'CSE', batch: '2026', cgpa: '9.1', priScore: '89%', status: 'Placed (TCS Digital, 7.5 LPA)', testsAttempted: 22, codingSolved: 120 },
  { rollNo: '21241A0503', name: 'Bhavya Reddy', branch: 'IT', batch: '2026', cgpa: '8.4', priScore: '85%', status: 'Shortlisted (Cognizant)', testsAttempted: 16, codingSolved: 98 },
  { rollNo: '21241A0504', name: 'Chaitanya Varma', branch: 'AIML', batch: '2026', cgpa: '7.9', priScore: '78%', status: 'Interview Stage (ServiceNow)', testsAttempted: 14, codingSolved: 85 },
  { rollNo: '21241A0505', name: 'Deepika Nair', branch: 'ECE', batch: '2026', cgpa: '8.6', priScore: '82%', status: 'Placed (Capgemini, 5.5 LPA)', testsAttempted: 19, codingSolved: 110 },
  { rollNo: '21241A0506', name: 'Eshwar Rao', branch: 'CSE', batch: '2026', cgpa: '7.5', priScore: '74%', status: 'Preparing / Active', testsAttempted: 12, codingSolved: 62 },
  { rollNo: '22241A0501', name: 'Faizan Ahmed', branch: 'CSE', batch: '2027', cgpa: '8.7', priScore: '88%', status: 'Internship (TCS Elevate)', testsAttempted: 15, codingSolved: 130 },
  { rollNo: '22241A0502', name: 'Gowri Shankar', branch: 'IT', batch: '2027', cgpa: '8.2', priScore: '80%', status: 'Active (Pre-final year)', testsAttempted: 14, codingSolved: 94 }
];

const PlacementStatsExport = () => {
  const [recipientRole, setRecipientRole] = useState('Placement Officer'); // 'Placement Officer' | 'HOD' | 'Principal' | 'Department'
  const [targetBatch, setTargetBatch] = useState('All');
  const [targetBranch, setTargetBranch] = useState('All');
  const [generating, setGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState('');

  // Filtered dataset for export
  const getFilteredData = () => {
    return SAMPLE_EXPORT_DATA.filter(item => {
      if (targetBatch !== 'All' && item.batch !== targetBatch) return false;
      if (targetBranch !== 'All' && item.branch !== targetBranch) return false;
      return true;
    });
  };

  // CSV Export
  const exportToCSV = () => {
    setGenerating(true);
    const data = getFilteredData();
    const headers = ['Roll Number', 'Student Name', 'Department', 'Graduation Batch', 'CGPA', 'Placement Readiness (PRI)', 'Placement Status', 'Tests Attempted', 'Problems Solved'];
    const rows = data.map(d => [
      d.rollNo,
      `"${d.name}"`,
      d.branch,
      d.batch,
      d.cgpa,
      `"${d.priScore}"`,
      `"${d.status}"`,
      d.testsAttempted,
      d.codingSolved
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
    let tableHtml = `
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
              <td>${d.rollNo}</td>
              <td>${d.name}</td>
              <td>${d.branch}</td>
              <td>${d.batch}</td>
              <td>${d.cgpa}</td>
              <td>${d.priScore}</td>
              <td>${d.status}</td>
              <td>${d.testsAttempted}</td>
              <td>${d.codingSolved}</td>
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

  return (
    <div className="stats-export-container animate-fade">
      {/* Header Banner */}
      <div className="export-header-banner glass-card">
        <div>
          <h2>📑 Placement Statistics & Comprehensive Report Exporter</h2>
          <p>
            Generate multi-format compliance and placement progress reports customized for the <strong>Placement Officer</strong>, <strong>Head of Department (HOD)</strong>, <strong>Principal</strong>, and <strong>Department Faculty</strong>.
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
              <option value="Placement Officer">Placement Officer (Executive View)</option>
              <option value="HOD">Head of Department (HOD Academic View)</option>
              <option value="Principal">College Principal (Comprehensive Campus Overview)</option>
              <option value="Department">Department Placement Faculty Coordinators</option>
            </select>
          </div>

          <div className="form-group">
            <label>Academic Batch</label>
            <select
              className="form-control"
              value={targetBatch}
              onChange={(e) => setTargetBatch(e.target.value)}
            >
              <option value="All">All Batches (2026, 2027, 2028)</option>
              <option value="2026">2026 Batch (Final Year)</option>
              <option value="2027">2027 Batch (Pre-Final Year)</option>
              <option value="2028">2028 Batch (Sophomore Year)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Engineering Department</label>
            <select
              className="form-control"
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
            >
              <option value="All">All Departments (CSE, IT, AIML, ECE)</option>
              <option value="CSE">Computer Science & Engineering (CSE)</option>
              <option value="IT">Information Technology (IT)</option>
              <option value="AIML">Artificial Intelligence & ML</option>
              <option value="ECE">Electronics & Communication</option>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4>Previewing Report Dataset ({getFilteredData().length} records)</h4>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>GRIET Autonomous Placement Cell Records</span>
        </div>

        <div className="export-table-wrapper">
          <table className="export-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Candidate Name</th>
                <th>Branch</th>
                <th>Batch</th>
                <th>CGPA</th>
                <th>PRI Score</th>
                <th>Placement Status</th>
                <th>Tests Attempted</th>
                <th>Coding Solved</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredData().map(d => (
                <tr key={d.rollNo}>
                  <td><strong>{d.rollNo}</strong></td>
                  <td>{d.name}</td>
                  <td><span className="branch-tag">{d.branch}</span></td>
                  <td>{d.batch}</td>
                  <td>{d.cgpa}</td>
                  <td><strong style={{ color: '#34d399' }}>{d.priScore}</strong></td>
                  <td><span className="status-text">{d.status}</span></td>
                  <td>{d.testsAttempted}</td>
                  <td>{d.codingSolved}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlacementStatsExport;
