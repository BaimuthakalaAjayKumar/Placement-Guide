import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
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
    <>
      <Header title="Personalized Learning Roadmap" />
      <div className="content-wrapper roadmap-content animate-fade" style={{ padding: '2rem', overflowY: 'auto' }}>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
        </div>
      )}

      {!roadmap ? (
        <div className="glass-card empty-roadmap-state animate-fade">
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🗺️</div>
          <h3 style={{ color: 'white', marginBottom: '10px' }}>No Learning Roadmap Found</h3>
          <p style={{ color: '#94a3b8', marginBottom: '25px', fontSize: '0.95rem' }}>
            Get a tailored, AI-generated preparation path mapping study materials, mock questions, and syntax trackers to your placement profile goal.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => handleGenerate(false)}
            disabled={generating}
          >
            {generating ? 'Running AI Profile Analysis...' : '🚀 Generate My Learning Roadmap'}
          </button>
        </div>
      ) : (
        <div className="roadmap-container">
          
          {/* Dashboard Summary Card */}
          <div className="glass-card" style={{ padding: '25px', marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <span className="profile-role-badge">{roadmap.targetRole} Preparation Path</span>
                <h2 style={{ color: 'white', marginTop: '8px', fontSize: '1.75rem' }}>AI Learning Roadmap</h2>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Overall Completion:</span>
                <h3 style={{ color: '#10b981', margin: '4px 0 0 0' }}>{roadmap.completionPercentage}%</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ color: '#3b82f6', marginBottom: '8px' }}>✓ Identified Strengths</h4>
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
                {/* Checkbox selector */}
                <div
                  className="step-checkbox"
                  onClick={() => handleStepStatusChange(step._id, step.status)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    border: `2px solid ${step.status === 'completed' ? '#10b981' : '#475569'}`,
                    background: step.status === 'completed' ? '#10b981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {step.status === 'completed' && '✓'}
                </div>

                {/* Step Details */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: step.status === 'completed' ? '#10b981' : step.status === 'in-progress' ? '#3b82f6' : '#94a3b8' }}>
                      Step {idx + 1}: {step.status.replace('-', ' ')}
                    </span>
                  </div>
                  <h4 style={{ color: 'white', margin: '4px 0' }}>{step.topic}</h4>
                  <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.85rem' }}>{step.resources}</p>
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
  </>
  );
};

export default PersonalizedRoadmap;
