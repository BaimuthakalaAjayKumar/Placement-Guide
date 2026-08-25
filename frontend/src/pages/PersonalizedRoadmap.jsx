import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import './PersonalizedRoadmap.css';

const PersonalizedRoadmap = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchRoadmap = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/roadmaps/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setRoadmap(data.data);
      } else {
        setRoadmap(null);
      }
    } catch (err) {
      setError('Could not retrieve learning roadmap.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (regenerate = false) => {
    try {
      setGenerating(true);
      setError('');
      const endpoint = regenerate ? `${API_URL}/roadmaps/me/regenerate` : `${API_URL}/roadmaps/me`;
      const method = regenerate ? 'POST' : 'GET';
      const res = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRoadmap(data.data);
      } else {
        setError(data.error || 'Failed to construct customized roadmap.');
      }
    } catch (err) {
      setError('Network failure during roadmap construction.');
    } finally {
      setGenerating(false);
    }
  };

  const handleStepStatusChange = async (stepId, currentStatus) => {
    const nextStatusMap = {
      'todo': 'in-progress',
      'in-progress': 'completed',
      'completed': 'todo'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'todo';

    try {
      const res = await fetch(`${API_URL}/roadmaps/steps/${stepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        setRoadmap(data.data);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRoadmap();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner-loader"></div>
        <p>Configuring personalized curriculum...</p>
      </div>
    );
  }

  return (
    <div className="roadmap-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <Sidebar />
      <div className="roadmap-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Header title="Personalized Learning Roadmap" />

        <div className="content-wrapper roadmap-content animate-fade" style={{ padding: '2rem', overflowY: 'auto' }}>
          {error && (
            <div className="error-banner">
              <span>{error}</span>
            </div>
          )}

          {!roadmap ? (
            <div className="empty-roadmap-state glass-card" style={{ padding: '3rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
              <h2>Map Your Placement Pathway</h2>
              <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Analyze your mock performance, aptitude statistics, coding velocity, and resume scores to compile a step-by-step custom preparation roadmap.</p>
              <button className="btn btn-primary" onClick={() => handleGenerate(false)} disabled={generating}>
                {generating ? 'Constructing Pathway...' : 'Generate Roadmap'}
              </button>
            </div>
          ) : (
            <div className="roadmap-container">
              
              {/* Header profile cards */}
              <div className="roadmap-header-cards" style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
                <div className="glass-card header-profile-summary" style={{ flex: 2, padding: '20px', minWidth: '300px' }}>
                  <span className="profile-role-badge">Target Role</span>
                  <h2 style={{ marginTop: '5px', color: 'white' }}>{roadmap.careerInterest}</h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '10px' }}>This roadmap adapts dynamically based on your latest mock exam scores, resume analysis, and solved coding milestones.</p>
                  
                  <button className="btn btn-secondary" style={{ marginTop: '15px' }} onClick={() => handleGenerate(true)} disabled={generating}>
                    {generating ? 'Re-analyzing...' : '⚡ Re-Calculate Roadmap'}
                  </button>
                </div>

                <div className="glass-card strengths-weaknesses-summary" style={{ flex: 3, padding: '20px', minWidth: '300px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ color: '#4ade80', marginBottom: '8px' }}>✓ Observed Strengths</h4>
                      <ul style={{ paddingLeft: '15px', color: '#cbd5e1', fontSize: '0.85rem', listStyleType: 'disc' }}>
                        {roadmap.strengths.map((str, i) => <li key={i}>{str}</li>)}
                        {roadmap.strengths.length === 0 && <li style={{ color: '#94a3b8' }}>Establishing benchmarks...</li>}
                      </ul>
                    </div>
                    <div>
                      <h4 style={{ color: '#f87171', marginBottom: '8px' }}>✗ Development Areas</h4>
                      <ul style={{ paddingLeft: '15px', color: '#cbd5e1', fontSize: '0.85rem', listStyleType: 'disc' }}>
                        {roadmap.weaknesses.map((wk, i) => <li key={i}>{wk}</li>)}
                        {roadmap.weaknesses.length === 0 && <li style={{ color: '#94a3b8' }}>No major weaknesses observed! Keep practicing.</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vertical preparation steps list */}
              <h3 style={{ color: 'white', marginBottom: '20px' }}>Your Customized Preparation Pipeline</h3>
              
              <div className="roadmap-steps-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {roadmap.steps.map((step, idx) => (
                  <div
                    className={`glass-card step-card status-${step.status}`}
                    key={step._id}
                    style={{
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      borderLeft: `4px solid ${step.status === 'completed' ? '#10b981' : step.status === 'in-progress' ? '#3b82f6' : '#64748b'}`
                    }}
                  >
                    {/* Status checkbox indicator */}
                    <div
                      className="step-checkbox"
                      onClick={() => handleStepStatusChange(step._id, step.status)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '2px solid #334155',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        background: step.status === 'completed' ? '#10b981' : step.status === 'in-progress' ? '#3b82f6' : 'transparent',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}
                    >
                      {step.status === 'completed' ? '✓' : step.status === 'in-progress' ? '➜' : ''}
                    </div>

                    {/* Step details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ margin: 0, color: 'white' }}>{step.title}</h4>
                        <span
                          className={`type-badge ${step.type}`}
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            background: step.type === 'coding' ? '#f59e0b' : step.type === 'aptitude' ? '#a855f7' : step.type === 'interview' ? '#10b981' : '#4f46e5',
                            color: 'white'
                          }}
                        >
                          {step.type}
                        </span>
                      </div>
                      <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>{step.description}</p>
                    </div>

                    {/* Quick navigation links */}
                    {step.resourceLink && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(step.resourceLink)}
                      >
                        Navigate
                      </button>
                    )}
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalizedRoadmap;
