import React, { useState } from 'react';
import './BatchComparison.css';

const BATCH_DATA = {
  '2026': {
    batchName: '2026 Batch (Final Year)',
    totalStudents: 420,
    placedCount: 295,
    metrics: {
      testParticipation: 88, // %
      averageScores: 79, // %
      codingActivity: 92, // %
      resumeCompletion: 96, // %
      interviewPractice: 85, // %
    },
    topCompanies: ['Amazon (12)', 'TCS Digital (68)', 'Cognizant (82)', 'Infosys (95)'],
    weakestTopic: 'Advanced Graphs & System Design',
    strongestTopic: 'Arrays, Strings & OOPs'
  },
  '2027': {
    batchName: '2027 Batch (Pre-Final Year)',
    totalStudents: 460,
    placedCount: 45, // Internships
    metrics: {
      testParticipation: 76,
      averageScores: 71,
      codingActivity: 84,
      resumeCompletion: 82,
      interviewPractice: 64,
    },
    topCompanies: ['Amazon WOW (8)', 'ServiceNow Intern (15)', 'TCS Elevate (22)'],
    weakestTopic: 'Dynamic Programming & DBMS Transactions',
    strongestTopic: 'Core Java & Data Structures'
  },
  '2028': {
    batchName: '2028 Batch (Sophomore Year)',
    totalStudents: 480,
    placedCount: 0,
    metrics: {
      testParticipation: 62,
      averageScores: 65,
      codingActivity: 70,
      resumeCompletion: 54,
      interviewPractice: 38,
    },
    topCompanies: ['Smart India Hackathon', 'Google Summer of Code (Prep)'],
    weakestTopic: 'Recursion & Graph Traversal',
    strongestTopic: 'C Programming & Logic'
  }
};

const METRIC_DEFINITIONS = [
  { key: 'testParticipation', label: 'Test Participation Rate', icon: '📝', desc: 'Percentage of students taking mock aptitude and core subject tests' },
  { key: 'averageScores', label: 'Average Assessment Score', icon: '📊', desc: 'Class-wide average percentage score across all test modules' },
  { key: 'codingActivity', label: 'Coding Activity & CP Ladder', icon: '💻', desc: 'LeetCode, CodeChef, and internal contest problem solving engagement' },
  { key: 'resumeCompletion', label: 'Resume ATS Readiness', icon: '📄', desc: 'Completed and verified student resumes with ATS score ≥ 75%' },
  { key: 'interviewPractice', label: 'Mock Interview Practice', icon: '🎤', desc: 'Completion of AI recruiter, voice, and faculty technical mocks' }
];

const BatchComparison = () => {
  const [selectedBatches, setSelectedBatches] = useState(['2026', '2027', '2028']);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');

  const toggleBatch = (batchKey) => {
    if (selectedBatches.includes(batchKey)) {
      if (selectedBatches.length > 1) {
        setSelectedBatches(selectedBatches.filter(b => b !== batchKey));
      }
    } else {
      setSelectedBatches([...selectedBatches, batchKey]);
    }
  };

  return (
    <div className="batch-comparison-container animate-fade">
      {/* Header Banner */}
      <div className="batch-header-banner glass-card">
        <div>
          <h2>📊 Multi-Batch Placement & Preparedness Comparison</h2>
          <p>
            Cross-evaluate performance across 2026, 2027, and 2028 batches on core measurable metrics to identify departmental strengths and targeted intervention areas.
          </p>
        </div>

        <div className="batch-toggles-row">
          {['2026', '2027', '2028'].map(b => (
            <button
              key={b}
              type="button"
              className={`batch-toggle-pill ${selectedBatches.includes(b) ? 'active' : ''}`}
              onClick={() => toggleBatch(b)}
            >
              {selectedBatches.includes(b) ? '✓ ' : '+ '}
              {b} Batch
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="batch-kpi-grid">
        {selectedBatches.map(bKey => {
          const b = BATCH_DATA[bKey];
          return (
            <div key={bKey} className="glass-card batch-kpi-card">
              <div className="batch-card-top">
                <h3>{b.batchName}</h3>
                <span className="batch-student-count">{b.totalStudents} Enrolled</span>
              </div>

              <div className="kpi-score-badge">
                <span className="kpi-num">{b.metrics.averageScores}%</span>
                <span className="kpi-label">Class Average Score</span>
              </div>

              <div className="batch-details-list">
                <div className="batch-detail-row">
                  <span>Placed / Offers:</span>
                  <strong>{b.placedCount} Candidates</strong>
                </div>
                <div className="batch-detail-row">
                  <span>Strongest Topic:</span>
                  <strong style={{ color: '#34d399' }}>{b.strongestTopic}</strong>
                </div>
                <div className="batch-detail-row">
                  <span>Focus / Weak Area:</span>
                  <strong style={{ color: '#f87171' }}>{b.weakestTopic}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Metric Comparison Table */}
      <div className="glass-card metric-comparison-card">
        <h3>Class-to-Class Metric Breakdown</h3>
        <p className="sub-desc">Comparison on test participation, scores, coding activity, resume completion, and interview mocks.</p>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Measurable Metric</th>
                {selectedBatches.map(bKey => (
                  <th key={bKey} style={{ textAlign: 'center' }}>
                    {BATCH_DATA[bKey].batchName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_DEFINITIONS.map(m => (
                <tr key={m.key}>
                  <td>
                    <div className="metric-info-cell">
                      <span className="m-icon">{m.icon}</span>
                      <div>
                        <strong>{m.label}</strong>
                        <span className="m-desc">{m.desc}</span>
                      </div>
                    </div>
                  </td>
                  {selectedBatches.map(bKey => {
                    const val = BATCH_DATA[bKey].metrics[m.key];
                    return (
                      <td key={bKey} style={{ textAlign: 'center' }}>
                        <div className="table-bar-container">
                          <span className="table-val-text">{val}%</span>
                          <div className="table-bar-bg">
                            <div
                              className={`table-bar-fill ${val >= 80 ? 'green' : val >= 65 ? 'amber' : 'red'}`}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BatchComparison;
