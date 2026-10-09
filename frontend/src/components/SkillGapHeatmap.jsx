import React, { useState, useEffect } from 'react';
import './SkillGapHeatmap.css';

const SkillGapHeatmap = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState('CSE');
  const [remedialStatus, setRemedialStatus] = useState(null);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_skillgap_modal', handleOpen);
    return () => window.removeEventListener('open_skillgap_modal', handleOpen);
  }, []);

  if (!isOpen) return null;

  // Realistic Diagnostic Competency Matrix
  const cohortsData = [
    {
      name: 'CSE - Section A (High CGPA)',
      dsa: 84,
      sysDesign: 68,
      coreCS: 79,
      aptitude: 91,
      communication: 82,
      atRiskCount: 6
    },
    {
      name: 'CSE - Section B (Standard)',
      dsa: 62,
      sysDesign: 44,
      coreCS: 58,
      aptitude: 76,
      communication: 65,
      atRiskCount: 18
    },
    {
      name: 'CSE - Section C (Lateral Entry)',
      dsa: 41,
      sysDesign: 38,
      coreCS: 52,
      aptitude: 58,
      communication: 48,
      atRiskCount: 29
    },
    {
      name: 'Information Technology (IT-A)',
      dsa: 72,
      sysDesign: 64,
      coreCS: 70,
      aptitude: 84,
      communication: 74,
      atRiskCount: 11
    },
    {
      name: 'ECE (Tech Conversion Cohort)',
      dsa: 48,
      sysDesign: 32,
      coreCS: 64,
      aptitude: 79,
      communication: 71,
      atRiskCount: 24
    }
  ];

  const getCellClass = (score) => {
    if (score >= 75) return 'cell-high';
    if (score >= 50) return 'cell-med';
    return 'cell-low';
  };

  const handleTriggerRemedial = () => {
    setRemedialStatus('enrolling');
    setTimeout(() => {
      setRemedialStatus('enrolled');
    }, 1200);
  };

  return (
    <div className="skillgap-modal-backdrop" onClick={() => setIsOpen(false)}>
      <div className="skillgap-modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="skillgap-header">
          <div className="skillgap-title-wrap">
            <div className="skillgap-icon-badge">📊</div>
            <div>
              <h2>Department Skill-Gap Heatmap &amp; Remedial Governance</h2>
              <div className="skillgap-subtitle">
                Automated Technical Round Diagnostic Matrix for Campus Recruitment Readiness
              </div>
            </div>
          </div>
          <button className="naac-btn-close" onClick={() => setIsOpen(false)} title="Close">
            &times;
          </button>
        </div>

        <div className="skillgap-body">
          {/* Legend */}
          <div className="skillgap-legend">
            <div className="legend-chip">
              <span className="legend-dot dot-green"></span>
              <span>≥ 75%: Industry Ready</span>
            </div>
            <div className="legend-chip">
              <span className="legend-dot dot-amber"></span>
              <span>50% - 74%: Moderate Gap</span>
            </div>
            <div className="legend-chip">
              <span className="legend-dot dot-red"></span>
              <span>&lt; 50%: Critical Skill Deficit</span>
            </div>
          </div>

          {/* Heatmap Grid */}
          <table className="heatmap-table">
            <thead>
              <tr>
                <th>Cohort / Batch Section</th>
                <th>DSA &amp; Algos</th>
                <th>System &amp; Web</th>
                <th>Core CS (OS/DBMS)</th>
                <th>Quantitative Aptitude</th>
                <th>Tech Communication</th>
                <th>At-Risk Count</th>
              </tr>
            </thead>
            <tbody>
              {cohortsData.map((cohort) => (
                <tr key={cohort.name}>
                  <td className="heatmap-row-header">{cohort.name}</td>
                  <td className={`heatmap-cell ${getCellClass(cohort.dsa)}`}>{cohort.dsa}%</td>
                  <td className={`heatmap-cell ${getCellClass(cohort.sysDesign)}`}>{cohort.sysDesign}%</td>
                  <td className={`heatmap-cell ${getCellClass(cohort.coreCS)}`}>{cohort.coreCS}%</td>
                  <td className={`heatmap-cell ${getCellClass(cohort.aptitude)}`}>{cohort.aptitude}%</td>
                  <td className={`heatmap-cell ${getCellClass(cohort.communication)}`}>{cohort.communication}%</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="academic-badge badge-status-at-risk">
                      {cohort.atRiskCount} flagged
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Remedial Action Banner */}
          <div className="remedial-action-box">
            <div className="remedial-desc">
              <h4>🚨 88 Students Identified with Critical Technical Deficits (&lt;50%)</h4>
              <p>
                Students failing DSA and System Design will be locked out of Day-1 Tier-1 campus drives unless they complete the mandatory remedial curriculum.
              </p>
            </div>
            <div>
              {remedialStatus === 'enrolled' ? (
                <span className="academic-badge badge-status-cleared" style={{ fontSize: '0.9rem', padding: '10px 16px' }}>
                  ✓ 88 Students Enrolled into Remedial Bootcamp
                </span>
              ) : (
                <button
                  className="btn-trigger-remedial"
                  onClick={handleTriggerRemedial}
                  disabled={remedialStatus === 'enrolling'}
                >
                  {remedialStatus === 'enrolling' ? 'Assigning Tracks...' : '⚡ Auto-Enroll Cohort in 2-Week Remedial Lab'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillGapHeatmap;
