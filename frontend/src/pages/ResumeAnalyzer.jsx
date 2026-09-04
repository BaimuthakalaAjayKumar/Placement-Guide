import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './ResumeAnalyzer.css';

const ResumeAnalyzer = () => {
  const { token, user } = useAuth();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);

  const fileInputRef = useRef(null);

  const fetchLatestAnalysis = async () => {
    try {
      const res = await fetch(`${API_URL}/resumes/latest`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAnalysis(data.data);
      }
    } catch (err) {
      setError('Could not fetch previous analysis details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLatestAnalysis();
    }
  }, [token]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndUpload(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF resumes are supported.');
      return;
    }
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError('');
    
    // Simulate multi-step analysis stages
    setUploadStep(1); // Reading pdf
    const interval = setInterval(() => {
      setUploadStep(prev => {
        if (prev < 3) return prev + 1; // 2: Extracting skills, 3: Evaluating metrics
        clearInterval(interval);
        return prev;
      });
    }, 1200);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch(`${API_URL}/resumes/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      clearInterval(interval);

      if (data.success) {
        setAnalysis(data.data);
      } else {
        setError(data.error || 'Failed to analyze resume.');
      }
    } catch (err) {
      clearInterval(interval);
      setError('Network connection error. Please try again.');
    } finally {
      setUploading(false);
      setUploadStep(0);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  if (loading) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner-loader"></div>
        <p>Checking resume status...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="AI Resume Analyzer" />
      
      <div className="content-wrapper resume-content animate-fade">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        {/* 1. Uploading State Loader */}
        {uploading && (
          <div className="glass-card analyzer-loader-card">
            <div className="analysis-steps">
              <div className={`step-item ${uploadStep >= 1 ? 'active' : ''}`}>
                <span className="step-circle">{uploadStep > 1 ? '✓' : '1'}</span>
                <span className="step-label">Reading PDF Structure</span>
              </div>
              <div className={`step-item ${uploadStep >= 2 ? 'active' : ''}`}>
                <span className="step-circle">{uploadStep > 2 ? '✓' : '2'}</span>
                <span className="step-label">Parsing Skills & Core Headings</span>
              </div>
              <div className={`step-item ${uploadStep >= 3 ? 'active' : ''}`}>
                <span className="step-circle">{uploadStep >= 3 ? '⚙' : '3'}</span>
                <span className="step-label">Calculating ATS Grade & Role Suggestions</span>
              </div>
            </div>
            <div className="analysis-indicator-bar">
              <div className="indicator-progress" style={{ width: `${(uploadStep / 3) * 100}%` }}></div>
            </div>
            <p className="loader-text">Analyzing file. This takes just a moment...</p>
          </div>
        )}

        {!uploading && !analysis && (
          <div 
            className={`glass-card upload-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
              accept=".pdf"
            />
            
            <div className="upload-illustration">
              <svg viewBox="0 0 24 24" className="upload-svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
            </div>
            
            <h3>Upload your Resume</h3>
            <p className="dropzone-sub">Drag and drop your PDF resume here, or click to browse</p>
            <p className="file-constraints">Supported Format: PDF only (Max 5MB). Optimized for target career role: <strong className="text-glow">{user?.targetRole || 'Software Engineer'}</strong></p>
            
            <button className="btn btn-primary" onClick={triggerFileInput}>
              Browse Files
            </button>
          </div>
        )}

        {!uploading && analysis && (
          <div className="analysis-results-grid">
            {/* Scorecard Gauge */}
            <div className="glass-card analysis-score-card">
              <h3>ATS Score Summary</h3>
              <div className="score-badge-circle">
                <span className="score-num">{analysis.score}</span>
                <span className="score-total">/ 100</span>
              </div>
              
              <div className="score-status-text" data-score={analysis.score >= 80 ? 'optimal' : analysis.score >= 60 ? 'fair' : 'poor'}>
                {analysis.score >= 80 ? 'Optimal' : analysis.score >= 60 ? 'Fair Match' : 'Requires Optimization'}
              </div>

              <p className="role-tag">Evaluated Role: <strong>{user?.targetRole || 'Software Engineer'}</strong></p>
              
              <button className="btn btn-secondary btn-block mt-20" onClick={() => setAnalysis(null)}>
                Analyze New Resume
              </button>
            </div>

            {/* Extracted Skills Card */}
            <div className="glass-card analysis-skills-card">
              <h3>Extracted Technical Skills</h3>
              <p className="card-desc">Identified skills mapped directly from your resume text.</p>
              
              <div className="skills-badge-list">
                {analysis.skills.length > 0 ? (
                  analysis.skills.map((skill, index) => (
                    <span className="skill-badge hover-glow" key={index}>{skill}</span>
                  ))
                ) : (
                  <span className="no-skills-msg">No skills identified. Make sure skills are written in plain text.</span>
                )}
              </div>
            </div>

            {/* Keyword Match Card */}
            <div className="glass-card analysis-keywords-card">
              <h3>Target Keyword Checklist</h3>
              <p className="card-desc">Keywords commonly expected for a <strong>{user?.targetRole || 'Software Engineer'}</strong>.</p>
              
              <div className="keyword-section">
                <h4 className="kw-sec-title missing">Missing Key Terms ({analysis.keywordsMissing.length})</h4>
                <div className="keyword-badges">
                  {analysis.keywordsMissing.length > 0 ? (
                    analysis.keywordsMissing.map((kw, i) => (
                      <span className="kw-badge missing" key={i}>{kw}</span>
                    ))
                  ) : (
                    <span className="kw-all-present">✓ Perfect match! All target keywords found.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actionable Feedback Card */}
            <div className="glass-card analysis-suggestions-card">
              <h3>Actionable Optimization Feedback</h3>
              <div className="suggestions-list">
                {analysis.suggestions.length > 0 ? (
                  analysis.suggestions.map((suggestion, index) => (
                    <div className="suggestion-item" key={index}>
                      <span className="bullet-num">{index + 1}</span>
                      <p className="suggestion-text">{suggestion}</p>
                    </div>
                  ))
                ) : (
                  <div className="perfect-score-celebration">
                    <span className="emoji-star">🏆</span>
                    <p>Your resume meets all the layout, contact, and structural check benchmarks. Excellent work!</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
};

export default ResumeAnalyzer;
