import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './MockInterviews.css';

const CODING_PROBLEMS = [
  {
    id: 'two-sum',
    title: 'Two Sum & Pair Search',
    difficulty: 'Easy',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input has exactly one solution.',
    initialCode: 'function twoSum(nums, target) {\n  // Write your solution here\n  \n}',
    promptQuestions: [
      'Explain your approach before writing code.',
      'Why did you choose HashMap over a brute-force O(N²) nested loop or Two Pointers?',
      'What are the exact time and space complexities of your approach?'
    ]
  },
  {
    id: 'longest-substring',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    description: 'Given a string s, find the length of the longest substring without repeating characters.',
    initialCode: 'function lengthOfLongestSubstring(s) {\n  // Implement sliding window\n  \n}',
    promptQuestions: [
      'Explain your mental model and approach for tracking unique characters.',
      'Why did you choose a Sliding Window with a Set/Map rather than checking all substrings?',
      'How does your algorithm handle edge cases like empty strings or strings with all identical characters?'
    ]
  },
  {
    id: 'reverse-linked-list',
    title: 'Reverse a Linked List',
    difficulty: 'Easy',
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
    initialCode: 'function reverseList(head) {\n  // Iterative or Recursive implementation\n  \n}',
    promptQuestions: [
      'Explain whether you prefer iterative or recursive reversal and why.',
      'Why did you choose three pointers (prev, curr, next) for in-place reversal?',
      'What happens to the head pointer during the termination condition?'
    ]
  }
];

const VOICE_PRACTICE_QUESTIONS = [
  {
    id: 1,
    category: 'Behavioral & Introduction',
    question: 'Tell me about yourself, your technical background, and a recent project you are proud of.',
    idealKeywords: ['developed', 'responsible', 'learned', 'team', 'technologies', 'impact', 'solved']
  },
  {
    id: 2,
    category: 'System Design & Problem Solving',
    question: 'Explain the difference between SQL and NoSQL databases, and how you choose between them.',
    idealKeywords: ['relational', 'acid', 'scale', 'schema', 'document', 'performance', 'transactions']
  },
  {
    id: 3,
    category: 'Conflict & Team Collaboration',
    question: 'Describe a situation where you had a technical disagreement with a team member and how you resolved it.',
    idealKeywords: ['perspective', 'compromise', 'discussed', 'data', 'decision', 'result', 'respect']
  }
];

const MockInterviews = () => {
  const { token, user } = useAuth();

  // Active top-level sub-view tab
  const [activeTab, setActiveTab] = useState('standard'); // 'standard' | 'coding-sim' | 'voice-practice' | 'faculty-feedback'

  // Standard Mock Interview states
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

  // Dynamic roles & technologies
  const [roleOptions, setRoleOptions] = useState(['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist']);
  const [technologyOptions, setTechnologyOptions] = useState(['General', 'JavaScript', 'Python', 'Java', 'C++']);
  const [interviewConfig, setInterviewConfig] = useState({
    jobRole: user?.targetRole || 'Software Engineer',
    technology: 'General',
  });

  // ----------------------------------------------------
  // Coding Interview Simulator State
  // ----------------------------------------------------
  const [selectedCodingProblem, setSelectedCodingProblem] = useState(CODING_PROBLEMS[0]);
  const [codingApproachText, setCodingApproachText] = useState('');
  const [codingSolutionCode, setCodingSolutionCode] = useState(CODING_PROBLEMS[0].initialCode);
  const [codingInterviewerStep, setCodingInterviewerStep] = useState(0); // 0: Explain approach, 1: Code, 2: Followup
  const [codingDialogue, setCodingDialogue] = useState([
    {
      sender: 'interviewer',
      text: `Hello! Today we are tackling "${CODING_PROBLEMS[0].title}". Before writing any code, please explain your approach and how you plan to solve it.`
    }
  ]);
  const [codingFollowupAnswer, setCodingFollowupAnswer] = useState('');

  // ----------------------------------------------------
  // Voice Interview Practice State
  // ----------------------------------------------------
  const [selectedVoiceQIdx, setSelectedVoiceQIdx] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceRecordingActive, setVoiceRecordingActive] = useState(false);
  const [voiceAnalytics, setVoiceAnalytics] = useState(null);
  const [voiceTimerSeconds, setVoiceTimerSeconds] = useState(0);
  const voiceTimerRef = useRef(null);

  // ----------------------------------------------------
  // Faculty Feedback Mock / Real State
  // ----------------------------------------------------
  const [facultyFeedbacks, setFacultyFeedbacks] = useState([
    {
      id: 'fb-1',
      date: '2026-09-24',
      interviewer: 'Dr. K. Srinivas (Placement Cell Mentor)',
      role: 'TCS Digital Technical Mock',
      scores: {
        technicalKnowledge: 4,
        communication: 3,
        problemSolving: 4,
      },
      feedback: 'Good optimization on the core algorithm! Try to articulate edge cases before coding and improve explanation of your approach when prompted.',
      recommendation: 'Recommended for Next Mock Cycle'
    },
    {
      id: 'fb-2',
      date: '2026-09-18',
      interviewer: 'Prof. M. Anita (CSE Faculty Evaluator)',
      role: 'Core Java & System Design Mock',
      scores: {
        technicalKnowledge: 5,
        communication: 4,
        problemSolving: 4,
      },
      feedback: 'Very solid grasp of OOP and Collections framework. Expand more on multithreading concepts and synchronized blocks.',
      recommendation: 'Ready for Tier-1 Company Drives'
    }
  ]);

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

  useEffect(() => {
    if (token) {
      fetchHistory();
    }
  }, [token]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (activeTab === 'voice-practice') {
          setVoiceTranscript(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + transcript);
        } else {
          setCurrentAnswerText(prev => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + transcript);
        }
      };
      rec.onerror = () => {
        setIsRecording(false);
        setVoiceRecordingActive(false);
      };
      rec.onend = () => {
        setIsRecording(false);
        setVoiceRecordingActive(false);
      };
      setRecognition(rec);
    }
  }, [activeTab]);

  // Standard Mock start
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

  // ----------------------------------------------------
  // Coding Interview Simulator Handlers
  // ----------------------------------------------------
  const handleSelectProblem = (prob) => {
    setSelectedCodingProblem(prob);
    setCodingApproachText('');
    setCodingSolutionCode(prob.initialCode);
    setCodingInterviewerStep(0);
    setCodingDialogue([
      {
        sender: 'interviewer',
        text: `Hello! Today we are tackling "${prob.title}". Before jumping into the code, please explain your approach and how you plan to solve it.`
      }
    ]);
  };

  const handleSubmitApproach = () => {
    if (!codingApproachText.trim()) return;
    const newDialogue = [
      ...codingDialogue,
      { sender: 'student', text: codingApproachText },
      {
        sender: 'interviewer',
        text: `Great breakdown! Your approach makes sense. Now, go ahead and write the clean implementation in the code editor on the right.`
      }
    ];
    setCodingDialogue(newDialogue);
    setCodingInterviewerStep(1);
  };

  const handleSubmitCode = () => {
    if (!codingSolutionCode.trim()) return;
    const followupQ = selectedCodingProblem.promptQuestions[1];
    const newDialogue = [
      ...codingDialogue,
      { sender: 'student', text: '[Student submitted code solution]' },
      {
        sender: 'interviewer',
        text: `Nice solution! Let's probe deeper into your engineering choices: ${followupQ}`
      }
    ];
    setCodingDialogue(newDialogue);
    setCodingInterviewerStep(2);
  };

  const handleSubmitFollowup = () => {
    if (!codingFollowupAnswer.trim()) return;
    const finalFeedback = `Excellent clarification! You demonstrated strong mastery over data structures, trade-offs, and edge case handling. In an actual interview at TCS or Amazon, this clarity of communication is exactly what lands offers.`;
    setCodingDialogue([
      ...codingDialogue,
      { sender: 'student', text: codingFollowupAnswer },
      { sender: 'interviewer', text: finalFeedback }
    ]);
    setCodingInterviewerStep(3); // Completed
  };

  // ----------------------------------------------------
  // Voice Interview Practice Handlers
  // ----------------------------------------------------
  const toggleVoiceRecording = () => {
    if (!recognition) {
      alert('Speech Recognition is not supported by your browser. Please use Chrome/Edge or type your response.');
      return;
    }

    if (voiceRecordingActive) {
      recognition.stop();
      setVoiceRecordingActive(false);
      clearInterval(voiceTimerRef.current);
      analyzeVoiceResponse(voiceTranscript, voiceTimerSeconds);
    } else {
      setVoiceTranscript('');
      setVoiceAnalytics(null);
      setVoiceTimerSeconds(0);
      recognition.start();
      setVoiceRecordingActive(true);
      voiceTimerRef.current = setInterval(() => {
        setVoiceTimerSeconds(sec => sec + 1);
      }, 1000);
    }
  };

  const analyzeVoiceResponse = (text, seconds) => {
    const cleanText = text.trim();
    const words = cleanText ? cleanText.split(/\s+/) : [];
    const wordCount = words.length;

    // Speaking pace (WPM)
    const minutes = Math.max(seconds / 60, 0.1);
    const wpm = Math.round(wordCount / minutes);

    // Filler words detection
    const fillers = ['um', 'uh', 'like', 'basically', 'actually', 'you know', 'sort of', 'kind of', 'literally'];
    const fillerFound = {};
    let totalFillers = 0;

    const lowerText = cleanText.toLowerCase();
    fillers.forEach(f => {
      const regex = new RegExp(`\\b${f}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        fillerFound[f] = matches.length;
        totalFillers += matches.length;
      }
    });

    // Pacing rating
    let paceEvaluation = 'Optimal (120 - 160 WPM)';
    if (wpm < 100) paceEvaluation = 'Slightly slow — try speaking with a bit more cadence';
    else if (wpm > 170) paceEvaluation = 'A bit fast — pause between points for clarity';

    // Relevance to question
    const currentQ = VOICE_PRACTICE_QUESTIONS[selectedVoiceQIdx];
    const matchedKeywords = currentQ.idealKeywords.filter(k => lowerText.includes(k.toLowerCase()));
    const relevanceScore = Math.min(Math.round((matchedKeywords.length / 3) * 100), 100);

    // Confidence indicator
    let confidence = 85;
    if (totalFillers > 5) confidence -= 15;
    if (wpm < 80 || wpm > 180) confidence -= 10;
    if (wordCount < 30) confidence -= 20;
    confidence = Math.max(50, Math.min(95, confidence));

    setVoiceAnalytics({
      wordCount,
      seconds,
      wpm,
      paceEvaluation,
      totalFillers,
      fillerFound,
      relevanceScore,
      confidence,
      matchedKeywords
    });
  };

  return (
    <>
      <Header title="AI Mock Interview & Technical Simulator" />

      <div className="content-wrapper interview-content animate-fade">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        {/* --- Top Sub-mode Navigation Switcher --- */}
        <div className="interview-mode-switcher glass-card" style={{
          display: 'flex',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '14px',
          overflowX: 'auto',
          background: 'rgba(15, 23, 42, 0.75)'
        }}>
          <button
            type="button"
            className={`mode-pill ${activeTab === 'standard' ? 'active' : ''}`}
            onClick={() => setActiveTab('standard')}
          >
            🎯 Standard AI Mock Interview
          </button>
          <button
            type="button"
            className={`mode-pill ${activeTab === 'coding-sim' ? 'active' : ''}`}
            onClick={() => setActiveTab('coding-sim')}
          >
            💻 Coding Interview Mode (Simulator)
          </button>
          <button
            type="button"
            className={`mode-pill ${activeTab === 'voice-practice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice-practice')}
          >
            🎤 Voice Interview Practice
          </button>
          <button
            type="button"
            className={`mode-pill ${activeTab === 'faculty-feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('faculty-feedback')}
          >
            ⭐ Faculty Mock Feedback
          </button>
        </div>

        {/* ==========================================================================
            TAB 1: STANDARD MOCK INTERVIEW
            ========================================================================== */}
        {activeTab === 'standard' && (
          <>
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
                          <button className="btn btn-secondary btn-sm" onClick={() => setInterviewResult(session)}>
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
                <div className="interview-progress-bar-wrapper">
                  <div className="interview-progress-info">
                    <span>Question {currentIdx + 1} of {activeInterview.questions.length}</span>
                    <span className="q-type-chip">
                      {activeInterview.questions[currentIdx]?.questionType === 'coding' ? '💻 Coding' : '⚙️ Technical'}
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
                  </div>

                  <div className="interview-question-bubble">
                    <div className="question-index-tag">Question {currentIdx + 1} of {activeInterview.questions.length}</div>
                    <h3>{activeInterview.questions[currentIdx].questionText}</h3>
                  </div>
                </div>

                <div className="glass-card response-form-panel">
                  <div className="response-header-controls">
                    <h4>Your Answer Transcript</h4>
                    <button
                      type="button"
                      className={`btn-voice-toggle ${isRecording ? 'active' : ''}`}
                      onClick={handleVoiceToggle}
                    >
                      <span>{isRecording ? 'Listening (Click to Stop)' : 'Speak Answer'}</span>
                    </button>
                  </div>

                  <textarea
                    className="form-control response-textarea"
                    rows="6"
                    placeholder="Type your response or click 'Speak Answer' to talk..."
                    value={currentAnswerText}
                    onChange={(e) => setCurrentAnswerText(e.target.value)}
                  />

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
                  <button className="btn btn-primary" onClick={() => setInterviewResult(null)}>
                    Back to History
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==========================================================================
            TAB 2: CODING INTERVIEW SIMULATOR MODE
            "Interviewer: Explain your approach -> Student writes code -> System: Why did you choose HashMap?"
            ========================================================================== */}
        {activeTab === 'coding-sim' && (
          <div className="coding-simulator-wrapper animate-fade">
            <div className="glass-card mb-20" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc' }}>Technical Interview Simulation</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                    Simulates a live technical round: First explain your approach, write your code, and defend your data structure decisions under interactive probing.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {CODING_PROBLEMS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProblem(p)}
                      className={`btn btn-sm ${selectedCodingProblem.id === p.id ? 'btn-accent' : 'btn-secondary'}`}
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
              {/* Left Column: Problem details & Code Editor */}
              <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#e2e8f0' }}>{selectedCodingProblem.title}</h3>
                    <span className="badge-pill" style={{ background: '#10b98125', color: '#34d399', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>
                      {selectedCodingProblem.difficulty}
                    </span>
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {selectedCodingProblem.description}
                  </p>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '0.5rem' }}>
                    💻 Your Solution Code:
                  </label>
                  <textarea
                    rows="14"
                    value={codingSolutionCode}
                    onChange={(e) => setCodingSolutionCode(e.target.value)}
                    style={{
                      width: '100%',
                      fontFamily: 'monospace',
                      fontSize: '0.9rem',
                      background: '#090d16',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#38bdf8',
                      borderRadius: '10px',
                      padding: '1rem',
                      resize: 'vertical'
                    }}
                    spellCheck="false"
                  />
                </div>

                {codingInterviewerStep === 1 && (
                  <button className="btn btn-accent" onClick={handleSubmitCode}>
                    Submit Code & Explain Solution →
                  </button>
                )}
              </div>

              {/* Right Column: Live Interviewer Dialogue Panel */}
              <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#6366f125', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                    👨‍💻
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#f8fafc' }}>Technical Interviewer (Simulated)</h4>
                    <span style={{ fontSize: '0.75rem', color: '#10b981' }}>● Live Round in Progress</span>
                  </div>
                </div>

                {/* Dialogue History */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '380px', paddingRight: '0.5rem' }}>
                  {codingDialogue.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.85rem 1.1rem',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        lineHeight: '1.45',
                        maxWidth: '90%',
                        alignSelf: item.sender === 'interviewer' ? 'flex-start' : 'flex-end',
                        background: item.sender === 'interviewer' ? 'rgba(30, 41, 59, 0.8)' : 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(168, 85, 247, 0.4) 100%)',
                        border: item.sender === 'interviewer' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(168, 85, 247, 0.3)',
                        color: '#f8fafc'
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem', color: item.sender === 'interviewer' ? '#818cf8' : '#cbd5e1' }}>
                        {item.sender === 'interviewer' ? 'Interviewer' : 'Student (You)'}
                      </strong>
                      {item.text}
                    </div>
                  ))}
                </div>

                {/* Input Area based on step */}
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                  {codingInterviewerStep === 0 && (
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#e2e8f0', display: 'block', marginBottom: '0.5rem' }}>
                        Step 1: Explain your approach to the interviewer:
                      </label>
                      <textarea
                        rows="3"
                        className="form-control"
                        placeholder="e.g. 'I will use a HashMap to store the numbers and their indices in O(N) time...'"
                        value={codingApproachText}
                        onChange={(e) => setCodingApproachText(e.target.value)}
                        style={{ width: '100%', marginBottom: '0.75rem' }}
                      />
                      <button className="btn btn-primary" onClick={handleSubmitApproach}>
                        Send Approach to Interviewer
                      </button>
                    </div>
                  )}

                  {codingInterviewerStep === 1 && (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                      👉 Now write your solution in the code editor on the left and click <strong>Submit Code</strong> when ready.
                    </div>
                  )}

                  {codingInterviewerStep === 2 && (
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#fbbf24', display: 'block', marginBottom: '0.5rem' }}>
                        Interviewer Follow-up: Defend your choice:
                      </label>
                      <textarea
                        rows="3"
                        className="form-control"
                        placeholder="e.g. 'I chose HashMap because it gives O(1) average lookup time rather than O(N) scanning...'"
                        value={codingFollowupAnswer}
                        onChange={(e) => setCodingFollowupAnswer(e.target.value)}
                        style={{ width: '100%', marginBottom: '0.75rem' }}
                      />
                      <button className="btn btn-primary" onClick={handleSubmitFollowup}>
                        Answer Question
                      </button>
                    </div>
                  )}

                  {codingInterviewerStep === 3 && (
                    <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.25rem' }}>🎉</span>
                      <strong style={{ color: '#34d399' }}>Interview Simulation Completed!</strong>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
                        Excellent communication and approach explanation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================================
            TAB 3: VOICE INTERVIEW PRACTICE 🎤
            Microphone answer recording with pace, filler words, and confidence feedback
            ========================================================================== */}
        {activeTab === 'voice-practice' && (
          <div className="voice-practice-wrapper animate-fade">
            <div className="glass-card mb-20" style={{ padding: '1.25rem', borderLeft: '4px solid #a855f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.75rem' }}>🎤</span>
                <div>
                  <h3 style={{ margin: 0, color: '#f8fafc' }}>Voice Interview Practice & Speech Analytics</h3>
                  <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                    Practice speaking into your microphone to simulate spoken interview delivery and receive pacing, filler-word, and structure feedback.
                  </p>
                </div>
              </div>
            </div>

            {/* Questions selector */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', overflowX: 'auto' }}>
              {VOICE_PRACTICE_QUESTIONS.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelectedVoiceQIdx(idx);
                    setVoiceTranscript('');
                    setVoiceAnalytics(null);
                  }}
                  className={`btn btn-sm ${selectedVoiceQIdx === idx ? 'btn-accent' : 'btn-secondary'}`}
                >
                  Prompt {idx + 1}: {q.category}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
              {/* Question & Voice Recorder */}
              <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase' }}>
                    Interview Question
                  </span>
                  <h3 style={{ margin: '0.5rem 0 0 0', color: '#f8fafc', fontSize: '1.2rem', lineHeight: '1.4' }}>
                    {VOICE_PRACTICE_QUESTIONS[selectedVoiceQIdx].question}
                  </h3>
                </div>

                {/* Big Mic Button & Timer */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0' }}>
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '50%',
                      border: 'none',
                      background: voiceRecordingActive ? '#ef4444' : 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                      color: '#fff',
                      fontSize: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: voiceRecordingActive ? '0 0 25px rgba(239, 68, 68, 0.6)' : '0 10px 25px rgba(168, 85, 247, 0.4)',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    {voiceRecordingActive ? '⏹' : '🎤'}
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: voiceRecordingActive ? '#f87171' : '#cbd5e1' }}>
                      {voiceRecordingActive ? `Recording... ${voiceTimerSeconds}s` : 'Click Microphone to Start Speaking'}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      {voiceRecordingActive ? 'Click Stop when you finish your answer' : 'Web Speech API records your spoken answer'}
                    </span>
                  </div>
                </div>

                {/* Transcript Live Box */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#cbd5e1', display: 'block', marginBottom: '0.4rem' }}>
                    Speech Transcript:
                  </label>
                  <textarea
                    rows="5"
                    className="form-control"
                    placeholder="Your spoken words will appear here automatically..."
                    value={voiceTranscript}
                    onChange={(e) => setVoiceTranscript(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Speech Analytics Card */}
              <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📊 Speech Delivery Analytics
                </h4>

                {voiceAnalytics ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {/* Key Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#38bdf8' }}>{voiceAnalytics.wpm}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Words / Min</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: '800', color: voiceAnalytics.totalFillers > 3 ? '#fbbf24' : '#34d399' }}>
                          {voiceAnalytics.totalFillers}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Filler Words</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                        <span style={{ fontSize: '1.3rem', fontWeight: '800', color: '#a855f7' }}>{voiceAnalytics.confidence}%</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Confidence</span>
                      </div>
                    </div>

                    {/* Cadence assessment */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>Speaking Pace:</strong>
                      <span style={{ fontSize: '0.9rem', color: '#38bdf8' }}>{voiceAnalytics.paceEvaluation}</span>
                    </div>

                    {/* Filler words found breakdown */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>Filler Words Encountered:</strong>
                      {voiceAnalytics.totalFillers > 0 ? (
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {Object.entries(voiceAnalytics.fillerFound).map(([word, cnt]) => (
                            <span key={word} style={{ background: '#f59e0b25', color: '#fbbf24', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                              "{word}": {cnt}x
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: '#34d399' }}>✓ Excellent! No hesitation or filler words detected.</span>
                      )}
                    </div>

                    {/* Relevance & keywords */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#cbd5e1', display: 'block', marginBottom: '0.35rem' }}>Topic Relevance: {voiceAnalytics.relevanceScore}%</strong>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {voiceAnalytics.matchedKeywords.length > 0 ? (
                          voiceAnalytics.matchedKeywords.map(kw => (
                            <span key={kw} style={{ background: '#10b98120', color: '#6ee7b7', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                              ✓ {kw}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Include more technical keywords from the prompt to boost relevance.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                    <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎙️</span>
                    Record your answer to see pace, filler words, confidence score, and relevance breakdown.
                  </div>
                )}

                {/* Important Practice Disclaimer Note */}
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  lineHeight: '1.4'
                }}>
                  <strong style={{ color: '#818cf8', display: 'block', marginBottom: '0.2rem' }}>ℹ️ Practice Feedback Disclaimer:</strong>
                  This analysis is automated coaching to assist with speech pacing and filler reduction. It is not a definitive judgment about your personality or innate ability.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================================
            TAB 4: FACULTY MOCK FEEDBACK
            Technical Knowledge ⭐⭐⭐⭐, Communication ⭐⭐⭐, Problem Solving ⭐⭐⭐⭐
            ========================================================================== */}
        {activeTab === 'faculty-feedback' && (
          <div className="faculty-feedback-wrapper animate-fade">
            <div className="glass-card mb-20" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc' }}>Faculty & Senior Mentor Mock Feedback</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
                Review detailed ratings and actionable feedback provided directly by GRIET faculty and placement coordinators after offline and online mock evaluations.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {facultyFeedbacks.map(fb => (
                <div key={fb.id} className="glass-card" style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.35rem 0', color: '#f8fafc', fontSize: '1.25rem' }}>{fb.role}</h3>
                      <span style={{ fontSize: '0.85rem', color: '#818cf8', fontWeight: '600' }}>
                        Evaluated by: {fb.interviewer} &nbsp;·&nbsp; {fb.date}
                      </span>
                    </div>
                    <span style={{ background: '#10b98120', color: '#34d399', border: '1px solid #10b98140', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '700' }}>
                      {fb.recommendation}
                    </span>
                  </div>

                  {/* 3 Pillars Star Ratings */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Technical Knowledge</span>
                      <div style={{ color: '#fbbf24', fontSize: '1.2rem', marginTop: '0.25rem' }}>
                        {'⭐'.repeat(fb.scores.technicalKnowledge)}
                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginLeft: '0.5rem' }}>({fb.scores.technicalKnowledge}/5)</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Communication</span>
                      <div style={{ color: '#fbbf24', fontSize: '1.2rem', marginTop: '0.25rem' }}>
                        {'⭐'.repeat(fb.scores.communication)}
                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginLeft: '0.5rem' }}>({fb.scores.communication}/5)</span>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>Problem Solving</span>
                      <div style={{ color: '#fbbf24', fontSize: '1.2rem', marginTop: '0.25rem' }}>
                        {'⭐'.repeat(fb.scores.problemSolving)}
                        <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginLeft: '0.5rem' }}>({fb.scores.problemSolving}/5)</span>
                      </div>
                    </div>
                  </div>

                  {/* Qualitative Feedback */}
                  <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1.2rem', borderRadius: '10px' }}>
                    <strong style={{ color: '#818cf8', display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                      💬 Detailed Evaluator Feedback:
                    </strong>
                    <p style={{ margin: 0, color: '#f1f5f9', fontSize: '0.95rem', lineHeight: '1.5' }}>
                      "{fb.feedback}"
                    </p>
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
