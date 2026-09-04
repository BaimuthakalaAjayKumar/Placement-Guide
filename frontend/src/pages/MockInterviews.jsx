import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './MockInterviews.css';

const MockInterviews = () => {
  const { token, user } = useAuth();

  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeInterview, setActiveInterview] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [currentAnswerText, setCurrentAnswerText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [interviewResult, setInterviewResult] = useState(null);

  // Dynamic roles & technologies from API
  const [roleOptions, setRoleOptions] = useState(['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist']);
  const [technologyOptions, setTechnologyOptions] = useState(['General', 'JavaScript', 'Python', 'Java', 'C++']);
  const [metadataLoading, setMetadataLoading] = useState(false);

  const [interviewConfig, setInterviewConfig] = useState({
    jobRole: user?.targetRole || 'Software Engineer',
    technology: 'General',
  });

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/interviews/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setInterviews(data.data);
    } catch (err) {
      setError('Could not retrieve interview history files.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      setMetadataLoading(true);
      const res = await fetch(`${API_URL}/interviews/metadata`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (data.data.roles.length > 0) setRoleOptions(data.data.roles);
        if (data.data.technologies.length > 0) setTechnologyOptions(data.data.technologies);
      }
    } catch (err) {
      // Fallback to default options silently
    } finally {
      setMetadataLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHistory();
      fetchMetadata();
    }
  }, [token]);

  useEffect(() => {
    if (user?.targetRole) {
      setInterviewConfig(prev => ({ ...prev, jobRole: user.targetRole }));
    }
  }, [user]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        setCurrentAnswerText(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + transcript);
      };
      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);
      setRecognition(rec);
    }
  }, []);

  const handleStartInterview = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await fetch(`${API_URL}/interviews/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          jobRole: interviewConfig.jobRole,
          technology: interviewConfig.technology,
          questionCount: 10
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveInterview(data.data);
        setUserAnswers(new Array(data.data.questions.length).fill(''));
        setCurrentIdx(0);
        setCurrentAnswerText('');
        setInterviewResult(null);
      } else {
        setError(data.error || 'Failed to start interview. Try again.');
      }
    } catch (err) {
      setError('Failed to setup mock interview session.');
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceToggle = () => {
    if (!recognition) {
      alert('Speech Recognition is not supported by your browser. Please type your responses.');
      return;
    }
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleNextQuestion = () => {
    setUserAnswers(prev => {
      const updated = [...prev];
      updated[currentIdx] = currentAnswerText;
      return updated;
    });
    if (isRecording) recognition.stop();
    if (currentIdx < activeInterview.questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setCurrentAnswerText(userAnswers[currentIdx + 1] || '');
    }
  };

  const handlePrevQuestion = () => {
    setUserAnswers(prev => {
      const updated = [...prev];
      updated[currentIdx] = currentAnswerText;
      return updated;
    });
    if (isRecording) recognition.stop();
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
      setCurrentAnswerText(userAnswers[currentIdx - 1]);
    }
  };

  const handleSubmitInterview = async () => {
    const finalAnswers = [...userAnswers];
    finalAnswers[currentIdx] = currentAnswerText;
    if (!window.confirm('Are you sure you want to finish the interview and submit responses for grading?')) return;
    if (isRecording) recognition.stop();
    setLoading(true);
    try {
      const formattedResponses = activeInterview.questions.map((q, idx) => ({
        questionId: q._id.toString(),
        answer: finalAnswers[idx] || ''
      }));
      const res = await fetch(`${API_URL}/interviews/${activeInterview._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ responses: formattedResponses })
      });
      const data = await res.json();
      if (data.success) {
        setInterviewResult(data.data);
        setActiveInterview(null);
      } else {
        setError(data.error || 'Failed to submit responses.');
      }
    } catch (err) {
      setError('Connection failure during evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewHistory = (session) => {
    setInterviewResult(session);
    setActiveInterview(null);
  };

  const handleReset = () => {
    setInterviewResult(null);
    setActiveInterview(null);
    fetchHistory();
  };

  const isCodingQuestion = activeInterview && activeInterview.questions[currentIdx]?.questionType === 'coding';

  if (loading && !activeInterview) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner-loader"></div>
        <p>Configuring interview modules...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="AI Mock Interview Module" />

      <div className="content-wrapper interview-content animate-fade">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        {!activeInterview && !interviewResult && (
          <div className="history-start-view">
            <div className="glass-card start-promo-card">
              <div className="promo-text-side">
                <h2>Simulate a Realistic Technical Interview</h2>
                <p>Practice a role-specific mock interview with a realistic mix of behavioural, technical, and coding questions tailored for: <strong className="text-glow">{user?.targetRole || 'Software Engineer'}</strong>.</p>
                <p className="promo-note">Choose your target role and programming language/technology focus. Every session will have exactly <strong>10 questions</strong> ending with a detailed AI-scored report.</p>

                <div className="form-grid-2-col mt-20">
                  <div className="form-group">
                    <label className="form-label">Target Role</label>
                    <select
                      className="form-control"
                      value={interviewConfig.jobRole}
                      onChange={(e) => setInterviewConfig(prev => ({ ...prev, jobRole: e.target.value }))}
                      disabled={metadataLoading}
                    >
                      {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Technology / Language</label>
                    <select
                      className="form-control"
                      value={interviewConfig.technology}
                      onChange={(e) => setInterviewConfig(prev => ({ ...prev, technology: e.target.value }))}
                      disabled={metadataLoading}
                    >
                      {technologyOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                </div>

                <div className="interview-fixed-count-badge">
                  <span>🎯</span>
                  <span>This session will contain exactly <strong>10 questions</strong> — behavioral, technical, and coding.</span>
                </div>

                <button className="btn btn-accent mt-20" onClick={handleStartInterview}>
                  Start Mock Interview
                </button>
              </div>
              <div className="promo-avatar-illustration">
                <div className="visual-circle-glow">
                  <span className="avatar-emoji">🤖</span>
                </div>
              </div>
            </div>

            <h3 className="breakdown-headline">Your Interview History</h3>

            <div className="interview-history-list">
              {interviews.length > 0 ? (
                interviews.map((session) => (
                  <div className="glass-card history-session-card" key={session._id}>
                    <div className="history-session-info">
                      <h4>{session.jobRole} Interview</h4>
                      <span className="session-date">
                        {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        &nbsp;·&nbsp;{session.technology || 'General'}
                      </span>
                    </div>
                    <div className="history-session-results">
                      <div className="session-score-indicator" data-score={session.overallScore >= 80 ? 'good' : session.overallScore >= 60 ? 'average' : 'low'}>
                        {session.overallScore}% Score
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleReviewHistory(session)}>
                        Review Report
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-history-placeholder glass-card">
                  <p>No mock interviews recorded yet. Click "Start Mock Interview" to begin your training.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeInterview && (
          <div className="active-interview-container">
            {/* Progress Bar */}
            <div className="interview-progress-bar-wrapper">
              <div className="interview-progress-info">
                <span>Question {currentIdx + 1} of {activeInterview.questions.length}</span>
                <span className={`q-type-chip ${isCodingQuestion ? 'coding' : ''}`}>
                  {isCodingQuestion ? '💻 Coding Question' : activeInterview.questions[currentIdx].questionType === 'behavioral' ? '🤝 Behavioral' : '⚙️ Technical'}
                </span>
              </div>
              <div className="interview-progress-track">
                <div
                  className="interview-progress-fill"
                  style={{ width: `${((currentIdx + 1) / activeInterview.questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="glass-card interviewer-panel">
              <div className="interviewer-avatar-col">
                <div className="speaking-avatar-pulse" data-recording={isRecording ? 'recording' : ''}>
                  <span className="avatar-face">👨‍💼</span>
                </div>
                <span className="avatar-title">AI Recruiter</span>
                <span className="avatar-subtitle">Interactive Mode</span>
              </div>

              <div className="interview-question-bubble">
                <div className="question-index-tag">Question {currentIdx + 1} of {activeInterview.questions.length}</div>
                <div style={{ marginBottom: '8px' }}>
                  <span className="q-score-badge" data-score={isCodingQuestion ? 'high' : 'medium'}>
                    {isCodingQuestion ? '💻 Coding Question' : 'Interview Question'}
                  </span>
                </div>
                <h3>{activeInterview.questions[currentIdx].questionText}</h3>
              </div>
            </div>

            <div className="glass-card response-form-panel">
              <div className="response-header-controls">
                <h4>{isCodingQuestion ? 'Write Your Code Solution' : 'Your Answer Transcript'}</h4>

                {!isCodingQuestion && (
                  <button
                    type="button"
                    className={`btn-voice-toggle ${isRecording ? 'active' : ''}`}
                    onClick={handleVoiceToggle}
                  >
                    <svg viewBox="0 0 24 24" className="mic-svg-icon"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>
                    <span>{isRecording ? 'Listening (Click to Stop)' : 'Speak Answer'}</span>
                  </button>
                )}
              </div>

              {isCodingQuestion ? (
                <div className="code-editor-wrapper">
                  <div className="code-editor-header">
                    <span className="code-editor-lang">{activeInterview.technology || 'Code'}</span>
                    <span className="code-editor-hint">💡 Write your approach, algorithm and code below</span>
                  </div>
                  <textarea
                    className="form-control code-editor-textarea"
                    rows="10"
                    placeholder={`// Write your ${activeInterview.technology || 'code'} solution here...\n// Include:\n//  1. Your approach / algorithm\n//  2. The actual code implementation\n//  3. Time and space complexity`}
                    value={currentAnswerText}
                    onChange={(e) => setCurrentAnswerText(e.target.value)}
                    spellCheck="false"
                  />
                </div>
              ) : (
                <textarea
                  className="form-control response-textarea"
                  rows="6"
                  placeholder="Type your response here or click the 'Speak Answer' button to use voice dictation..."
                  value={currentAnswerText}
                  onChange={(e) => setCurrentAnswerText(e.target.value)}
                />
              )}

              <div className="question-action-footer">
                <button
                  className="btn btn-secondary"
                  disabled={currentIdx === 0}
                  onClick={handlePrevQuestion}
                >
                  Previous
                </button>

                {currentIdx < activeInterview.questions.length - 1 ? (
                  <button className="btn btn-primary" onClick={handleNextQuestion}>
                    Next Question
                  </button>
                ) : (
                  <button className="btn btn-accent" onClick={handleSubmitInterview}>
                    Submit Interview
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {interviewResult && (
          <div className="interview-report-view">
            <div className="glass-card results-scorecard-card">
              <h3>Interview Feedback Report</h3>
              <div className="results-score-flex">
                <div className="score-badge-circle results">
                  <span className="score-num">{interviewResult.overallScore}</span>
                  <span className="score-total">%</span>
                </div>
                <div className="score-analytics-summary">
                  <h2>{interviewResult.jobRole} Role Evaluation</h2>
                  <p className="summary-para">{interviewResult.generalFeedback}</p>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleReset}>
                Back to History
              </button>
            </div>

            {/* Strengths & Weaknesses Analysis */}
            <div className="glass-card analysis-grid-card" style={{ marginTop: '20px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>Performance Analysis</h3>
                <span className="q-score-badge" data-score={interviewResult.overallScore >= 80 ? 'high' : interviewResult.overallScore >= 60 ? 'medium' : 'low'}>
                  Readiness: {interviewResult.interviewReadiness || (interviewResult.overallScore >= 80 ? 'Highly Placement Ready' : interviewResult.overallScore >= 60 ? 'Needs Practice' : 'Requires Significant Work')}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div>
                  <h4 style={{ color: '#4ade80', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>✓</span> Strengths
                  </h4>
                  <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: '#94a3b8' }}>
                    {(interviewResult.strengths && interviewResult.strengths.length > 0) ? (
                      interviewResult.strengths.map((str, idx) => <li key={idx}>{str}</li>)
                    ) : (
                      <li>Strong foundational performance</li>
                    )}
                  </ul>
                </div>
                
                <div>
                  <h4 style={{ color: '#f87171', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>✗</span> Weaknesses
                  </h4>
                  <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: '#94a3b8' }}>
                    {(interviewResult.weaknesses && interviewResult.weaknesses.length > 0) ? (
                      interviewResult.weaknesses.map((wk, idx) => <li key={idx}>{wk}</li>)
                    ) : (
                      <li>Opportunity to elaborate further</li>
                    )}
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '15px' }}>
                <h4 style={{ color: '#6366f1', marginBottom: '8px' }}>💡 Suggestions for Improvement</h4>
                <ul style={{ paddingLeft: '20px', listStyleType: 'disc', color: '#94a3b8' }}>
                  {(interviewResult.improvementSuggestions && interviewResult.improvementSuggestions.length > 0) ? (
                    interviewResult.improvementSuggestions.map((sug, idx) => <li key={idx}>{sug}</li>)
                  ) : (
                    <li>Incorporate more technical jargon and detail when expanding answers.</li>
                  )}
                </ul>
              </div>
            </div>

            <h3 className="breakdown-headline">Question-by-Question AI Analysis</h3>

            <div className="evaluation-questions-list">
              {interviewResult.questions.map((q, idx) => (
                <div className="glass-card report-question-card" key={idx}>
                  <div className="report-q-header">
                    <h4>Question {idx + 1}</h4>
                    <span className="q-score-badge" data-score={q.score >= 80 ? 'high' : q.score >= 60 ? 'medium' : 'low'}>
                      Score: {q.score}/100
                    </span>
                  </div>

                  <p className="report-question-text"><strong>Q:</strong> {q.questionText}</p>
                  <p className="text-secondary">Type: {q.questionType || 'technical'}</p>

                  <div className="report-answer-box">
                    <p className="box-title">Your Response:</p>
                    <p className="answer-text-content">"{q.userResponse || 'No answer provided.'}"</p>
                  </div>

                  <div className="report-feedback-box">
                    <p className="box-title">AI Recruiter Critique:</p>
                    <p className="feedback-text-content">{q.feedback}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MockInterviews;
