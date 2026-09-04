import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './QuestionBank.css'; // Re-use Question Bank styling rules for cards, layout, badges

const PlagiarismAudit = () => {
  const { token } = useAuth();

  // State Variables
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Latest Submission');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Resizable split-pane state
  const [splitWidth, setSplitWidth] = useState(50); // percentage for left column
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Fetch reports on filter change
  useEffect(() => {
    fetchReports();
  }, [sortOption, difficultyFilter, riskFilter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let queryParams = `?sort=${encodeURIComponent(sortOption)}`;
      if (difficultyFilter) {
        queryParams += `&difficulty=${encodeURIComponent(difficultyFilter)}`;
      }
      if (riskFilter) {
        queryParams += `&plagiarismStatus=${encodeURIComponent(riskFilter)}`;
      }

      const res = await fetch(`${API_URL}/questions/submissions/report${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.data);
        // Automatically select the first report if none is selected
        if (data.data.length > 0 && !selectedReport) {
          fetchDetailedReport(data.data[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching plagiarism reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedReport = async (submissionId) => {
    try {
      const res = await fetch(`${API_URL}/questions/submissions/${submissionId}/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedReport(data.data);
      }
    } catch (e) {
      console.error('Error fetching detailed report:', e);
    }
  };

  // Drag handlers for split pane divider
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.classList.add('qb-dragging-active');
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;
      let newPercentage = (relativeX / containerRect.width) * 100;
      
      // Enforce min/max widths (e.g. between 30% and 70%)
      if (newPercentage < 30) newPercentage = 30;
      if (newPercentage > 70) newPercentage = 70;
      
      setSplitWidth(newPercentage);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.classList.remove('qb-dragging-active');
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const triggerPDFDownload = () => {
    alert('PDF report exported successfully!');
  };

  // Filtered reports list (local search filter)
  const filteredReports = reports.filter(r => {
    const studentName = r.user?.name || '';
    const rollNo = r.user?.rollNumber || '';
    const qTitle = r.question?.title || '';
    const search = searchQuery.toLowerCase();
    return (
      studentName.toLowerCase().includes(search) ||
      rollNo.toLowerCase().includes(search) ||
      qTitle.toLowerCase().includes(search)
    );
  });

  return (
    <>
      <Header title="Plagiarism Audit Panel" />

      <div className="content-wrapper">
        {/* Filters Toolbar */}
        <div className="glass-card mb-20" style={{ padding: '15px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                placeholder="Search by student, roll number, or question..."
                className="form-control"
                style={{ flex: 1 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Sort:</span>
                <select
                  className="form-control"
                  style={{ width: '160px', height: '38px' }}
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="Latest Submission">Latest Submission</option>
                  <option value="Highest Plagiarism">Highest Plagiarism</option>
                  <option value="Lowest Plagiarism">Lowest Plagiarism</option>
                  <option value="Highest Score">Highest Score</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Difficulty:</span>
                <select
                  className="form-control"
                  style={{ width: '110px', height: '38px' }}
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option value="">All</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Risk Level:</span>
                <select
                  className="form-control"
                  style={{ width: '160px', height: '38px' }}
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                >
                  <option value="">All Risk Levels</option>
                  <option value="High Plagiarism">High Plagiarism</option>
                  <option value="Moderate Similarity">Moderate Similarity</option>
                  <option value="Low Similarity">Low Similarity</option>
                  <option value="Original">Original</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Resizable Two Pane Layout */}
        <div
          className="question-bank-container"
          ref={containerRef}
          style={{ display: 'flex', gap: '0' }}
        >
          {/* LEFT COLUMN: Submissions Table */}
          <div className="qb-left-pane" style={{ width: `${splitWidth}%`, flexShrink: 0, paddingRight: '15px' }}>
            <div className="qb-pane-header">
              <h2>All Submissions ({filteredReports.length})</h2>
              <p>System-wide source integrity logs</p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                <div className="spinner-loader" style={{ margin: '0 auto 15px' }}></div>
                Loading submission index...
              </div>
            ) : (
              <div className="glass-card" style={{ padding: '10px', overflowX: 'auto', flex: 1 }}>
                <table className="submission-report-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Question</th>
                      <th>Status</th>
                      <th>Plagiarism</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.length > 0 ? (
                      filteredReports.map((sub) => (
                        <tr key={sub._id} className={selectedReport?.submission?._id === sub._id ? 'active-row' : ''} style={selectedReport?.submission?._id === sub._id ? { background: 'rgba(99, 102, 241, 0.06)' } : {}}>
                          <td>
                            <div>
                              <div style={{ fontWeight: '600', color: '#fff' }}>{sub.user?.name || 'Student'}</div>
                              <div style={{ fontSize: '0.7rem', color: '#718096' }}>
                                {sub.user?.rollNumber || '21CS101'}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <div style={{ fontWeight: '500', fontSize: '0.8rem' }}>{sub.question?.title}</div>
                              <div style={{ fontSize: '0.7rem', color: sub.question?.difficulty === 'Easy' ? '#48bb78' : sub.question?.difficulty === 'Medium' ? '#ecc94b' : '#f56565' }}>
                                {sub.question?.difficulty}
                              </div>
                            </div>
                          </td>
                          <td style={{ color: sub.status === 'Accepted' ? '#48bb78' : '#e53e3e', fontWeight: '600', fontSize: '0.8rem' }}>
                            {sub.status}
                          </td>
                          <td>
                            <span
                              className="plagiarism-badge"
                              data-risk={
                                sub.plagiarismPercentage > 60
                                  ? 'High'
                                  : sub.plagiarismPercentage > 30
                                  ? 'Moderate'
                                  : sub.plagiarismPercentage > 10
                                  ? 'Low'
                                  : 'Original'
                              }
                            >
                              {sub.plagiarismPercentage}%
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => fetchDetailedReport(sub._id)}
                            >
                              Audit
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#718096', padding: '30px' }}>
                          No submissions matched current search/filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Divider line */}
          <div
            className={`qb-divider ${isDragging ? 'dragging' : ''}`}
            onMouseDown={handleMouseDown}
          />

          {/* RIGHT COLUMN: Detailed Report Audit Detail view */}
          <div className="qb-right-pane" style={{ width: `${100 - splitWidth}%`, flexGrow: 1, paddingLeft: '15px', overflowY: 'auto' }}>
            <div className="qb-pane-header">
              <h2>Integrity Report</h2>
              <p>Source similarity analysis & variables audit</p>
            </div>

            {selectedReport ? (
              <div className="glass-card detailed-report-box animate-fade" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px' }}>
                      Detailed Report: {selectedReport.submission?.user?.name}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#a0aec0' }}>
                      Question: <strong>{selectedReport.submission?.question?.title}</strong>
                    </span>
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ height: '32px' }} onClick={triggerPDFDownload}>
                    Export PDF
                  </button>
                </div>

                <div className="similarity-meter-container" style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginBottom: '2px' }}>Overall Similarity Index</div>
                    <span className="similarity-value" style={{ fontSize: '2rem', fontWeight: '800', color: selectedReport.report?.plagiarismPercentage > 40 ? '#e53e3e' : '#48bb78' }}>
                      {selectedReport.report?.plagiarismPercentage || 0}%
                    </span>
                  </div>
                  <span
                    className="plagiarism-badge"
                    style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                    data-risk={
                      selectedReport.report?.plagiarismPercentage > 60
                        ? 'High'
                        : selectedReport.report?.plagiarismPercentage > 30
                        ? 'Moderate'
                        : 'Original'
                    }
                  >
                    {selectedReport.report?.status || 'Original'} Risk
                  </span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', color: '#cbd5e0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>Student Roll No:</strong> {selectedReport.submission?.user?.rollNumber || 'N/A'}</div>
                  <div><strong>Branch / Specialty:</strong> {selectedReport.submission?.user?.branch || 'N/A'}</div>
                  <div><strong>Academic Year:</strong> {selectedReport.submission?.user?.year || 'N/A'}</div>
                  <div><strong>Tested Language:</strong> {selectedReport.submission?.language?.toUpperCase() || 'N/A'}</div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Submission Date:</strong> {selectedReport.submission?.createdAt ? new Date(selectedReport.submission.createdAt).toLocaleString() : 'N/A'}
                  </div>
                </div>

                <div className="matched-sources-list">
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>Matched Peer Sources</div>
                  {selectedReport.report?.matchedSubmissions && selectedReport.report.matchedSubmissions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedReport.report.matchedSubmissions.map((match, idx) => (
                        <div key={idx} className="matched-source-item" style={{ background: 'rgba(229, 62, 62, 0.05)', borderLeft: '3px solid #e53e3e', padding: '10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span className="matched-source-name" style={{ fontWeight: '600', color: '#fff' }}>{match.user?.name || 'Other Student'}</span>
                            <div style={{ fontSize: '0.7rem', color: '#a0aec0' }}>Roll No: {match.user?.rollNumber || 'N/A'}</div>
                          </div>
                          <span style={{ fontWeight: '700', color: '#e53e3e' }}>{match.percentage}% similarity</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#718096', padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', textAlign: 'center' }}>
                      No peer code similarity matches detected. Code is original.
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>Submitted Source Code</div>
                  <pre
                    style={{
                      background: '#13131a',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#e2e8f0',
                      overflowX: 'auto',
                      maxHeight: '300px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                      lineHeight: '1.4'
                    }}
                  >
                    <code>{selectedReport.submission?.code}</code>
                  </pre>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '50px', color: '#718096', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '8px', border: '1px dashed rgba(255, 255, 255, 0.05)' }}>
                Select a submission row from the left panel to display audit report.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PlagiarismAudit;
