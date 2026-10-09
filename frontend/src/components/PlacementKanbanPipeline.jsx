import React from 'react';
import './PlacementKanbanPipeline.css';

const PlacementKanbanPipeline = () => {
  const pipelineStages = [
    {
      id: 'applied',
      title: 'Applied / Eligible',
      jobs: [
        { id: 1, company: 'Microsoft', role: 'Software Engineer', ctc: '₹ 32.0 LPA', date: 'Applied Oct 04', tier: 'Dream' },
        { id: 2, company: 'Cisco Systems', role: 'Network Software Engineer', ctc: '₹ 15.0 LPA', date: 'Applied Oct 07', tier: 'Standard' }
      ]
    },
    {
      id: 'oa',
      title: 'Online Assessment',
      jobs: [
        { id: 3, company: 'Amazon', role: 'SDE-I (AWS Cloud)', ctc: '₹ 28.5 LPA', date: 'Test: Oct 18, 10 AM', tier: 'Dream', showAdmitCard: true },
        { id: 4, company: 'ServiceNow', role: 'Associate Software QA', ctc: '₹ 14.0 LPA', date: 'Test: Oct 19, 02 PM', tier: 'Standard' }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Interview',
      jobs: [
        { id: 5, company: 'Oracle', role: 'MTS - Cloud Platform', ctc: '₹ 19.2 LPA', date: 'Slot: Oct 14, 11 AM', tier: 'Dream' }
      ]
    },
    {
      id: 'hr',
      title: 'HR & Managerial',
      jobs: [
        { id: 6, company: 'Deloitte', role: 'Cloud Consultant', ctc: '₹ 9.5 LPA', date: 'Slot: Today, 04 PM', tier: 'Standard' }
      ]
    },
    {
      id: 'offered',
      title: 'Offers Released 🎉',
      jobs: [
        { id: 7, company: 'TCS Digital', role: 'Systems Engineer', ctc: '₹ 7.5 LPA', date: 'Offer Letter Verified', tier: 'Mass', isOffer: true }
      ]
    }
  ];

  const handleOpenAdmitCard = (e) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('open_hall_ticket_modal'));
  };

  return (
    <div className="kanban-pipeline-container">
      <div className="kanban-pipeline-header">
        <h3>
          <span>📌</span> My Placement Application Pipeline (Kanban)
        </h3>
        <button
          className="academic-badge badge-tier-dream"
          style={{ cursor: 'pointer', padding: '6px 14px' }}
          onClick={() => window.dispatchEvent(new CustomEvent('open_hall_ticket_modal'))}
        >
          🎫 View Drive Admit Pass
        </button>
      </div>

      <div className="kanban-pipeline-board">
        {pipelineStages.map((stage) => (
          <div key={stage.id} className="kanban-column">
            <div className="kanban-col-header">
              <span className="kanban-col-title">{stage.title}</span>
              <span className="kanban-count-badge">{stage.jobs.length}</span>
            </div>

            <div className="kanban-cards-list">
              {stage.jobs.map((job) => (
                <div key={job.id} className="kanban-job-card">
                  <div className="kanban-card-top">
                    <span className="kanban-company-name">{job.company}</span>
                    <span
                      className={`academic-badge ${
                        job.tier === 'Dream'
                          ? 'badge-tier-dream'
                          : job.tier === 'Standard'
                          ? 'badge-tier-standard'
                          : 'badge-tier-mass'
                      }`}
                    >
                      {job.tier}
                    </span>
                  </div>

                  <div className="kanban-card-role">{job.role}</div>

                  <div className="kanban-card-meta">
                    <span className="kanban-ctc-pill">{job.ctc}</span>
                    <span className="kanban-date-note">{job.date}</span>
                  </div>

                  {job.showAdmitCard && (
                    <button
                      className="btn-secondary"
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        borderRadius: '6px'
                      }}
                      onClick={handleOpenAdmitCard}
                    >
                      🎫 Download Hall Ticket
                    </button>
                  )}

                  {job.isOffer && (
                    <div className="kanban-card-offer-banner">
                      ✓ Offer Letter Stamped &amp; Validated
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlacementKanbanPipeline;
