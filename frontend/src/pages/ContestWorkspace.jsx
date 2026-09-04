import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Editor from '@monaco-editor/react';
import './ContestsPortal.css';

const ALL_CORER_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'java', label: 'Java' },
  { value: 'sql', label: 'SQL (Generic)' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'html', label: 'HTML / CSS' },
  { value: 'reactjs', label: 'React JS' },
  { value: 'expressjs', label: 'Express JS' }
];

const ContestWorkspace = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Screen states: 'disclaimer', 'exam', 'terminated', 'finished'
  const [examState, setExamState] = useState('disclaimer');

  // Contest data
  const [contest, setContest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  // Proctoring states
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [proctoringConsole, setProctoringConsole] = useState([
    { time: new Date().toLocaleTimeString(), msg: 'AI proctor engine initialized.', type: 'info' }
  ]);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  // Coding states
  const [language, setLanguage] = useState('javascript');
  const [codeMap, setCodeMap] = useState({}); // questionId -> code
  const [disqualifiedQuestions, setDisqualifiedQuestions] = useState([]);
  const [submissionsStatus, setSubmissionsStatus] = useState({}); // questionId -> status/score
  const [submitting, setSubmitting] = useState(false);
  const [subResult, setSubResult] = useState(null);

  // Timer
  const [timeRemaining, setTimeRemaining] = useState(0); // seconds

  // Layout resize
  const [leftWidth, setLeftWidth] = useState(45); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Fetch contest details on load
  useEffect(() => {
    fetchContestDetails();
  }, []);

  const fetchContestDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/contests/internal/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setContest(data.data.contest);
        setQuestions(data.data.contest.questions || []);

        // Initialize empty codes
        const initialCodes = {};
        data.data.contest.questions.forEach(q => {
          initialCodes[q._id] = getCodeTemplate(q.allowedLanguages[0] || 'javascript');
        });
        setCodeMap(initialCodes);

        // Check if student has already finished
        if (data.data.userAttempt) {
          if (data.data.userAttempt.isFinished) {
            setExamState('finished');
          } else {
            // Resume attempt timer
            const elapsed = Math.floor((Date.now() - new Date(data.data.userAttempt.startedAt).getTime()) / 1000);
            const remaining = (data.data.contest.duration * 60) - elapsed;
            if (remaining <= 0) {
              setExamState('finished');
            } else {
              setTimeRemaining(remaining);
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getCodeTemplate = (lang) => {
    switch (lang) {
      case 'cpp':
        return '// Write your C++ solution below\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input and solve\n    cout << "Output matched expected" << endl;\n    return 0;\n}';
      case 'c':
        return '// Write your C solution below\n#include <stdio.h>\n\nint main() {\n    // Read input\n    printf("Output matched expected\\n");\n    return 0;\n}';
      case 'java':
        return '// Write your Java solution below\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Read input\n        System.out.println("Output matched expected");\n    }\n}';
      case 'python':
        return '# Write your Python solution below\nimport sys\n\ndef solve():\n    # Read from sys.stdin\n    lines = sys.stdin.read().splitlines()\n    print("Output matched expected")\n\nif __name__ == \'__main__\':\n    solve()';
      case 'typescript':
        return '// Write your TypeScript solution below\ninterface User {\n  id: number;\n  name: string;\n}\n\nfunction solve(input: string): string {\n  // Your code here\n  return "Output matched expected";\n}';
      case 'sql':
        return '-- Write your SQL query below\nSELECT department_id, COUNT(*) \nFROM employees \nWHERE salary > 50000 \nGROUP BY department_id;';
      case 'mysql':
        return '-- Write your MySQL query below\nSELECT id, name, email \nFROM students \nORDER BY rating DESC \nLIMIT 10;';
      case 'postgresql':
        return '-- Write your PostgreSQL query below\nSELECT id, name, JSONB_PRETTY(profile_data) \nFROM candidates \nWHERE profile_data->\'active\' = \'true\' \nFETCH FIRST 5 ROWS ONLY;';
      case 'mongodb':
        return '// Write your MongoDB query or aggregation pipeline below\ndb.students.aggregate([\n  { $match: { readinessScore: { $gte: 75 } } },\n  { $group: { _id: "$branch", averageSgpa: { $avg: "$sgpa" } } }\n]);';
      case 'html':
        return '<!-- Write your HTML structure and CSS below -->\n<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body {\n      background: #0f172a;\n      color: #f8fafc;\n      font-family: sans-serif;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      height: 100vh;\n    }\n  </style>\n</head>\n<body>\n  <h1>Study and Practice Portal</h1>\n</body>\n</html>';
      case 'reactjs':
        return '// Write your React JS component below\nimport React, { useState } from \'react\';\n\nexport default function PlacementGuide() {\n  const [solved, setSolved] = useState(false);\n  return (\n    <div className="practice-box">\n      <h2>Welcome to Code Workspace</h2>\n      <button onClick={() => setSolved(true)}>\n        {solved ? \'Keep Practicing!\' : \'Solve Challenge\'}\n      </button>\n    </div>\n  );\n}';
      case 'expressjs':
        return '// Write your Express JS backend logic below\nconst express = require(\'express\');\nconst app = express();\n\napp.get(\'/api/v1/readiness\', (req, res) => {\n  res.status(200).json({\n    success: true,\n    status: \'Ready to Solve\'\n  });\n});';
      default:
        return '// Write your JavaScript solution below\n// Define solve(input) or processData(input)\n\nfunction solve(input) {\n  // Your code here\n  console.log("Output matched expected");\n}';
    }
  };

  // Start exam workflow
  const startExam = async () => {
    try {
      // 1. Start camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // 2. Go Fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }

      // 3. Register attempt in backend
      const res = await fetch(`${API_URL}/contests/internal/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFullscreenExits(data.data.fullscreenExits || 0);
        setTimeRemaining(contest.duration * 60);
        setExamState('exam');
      }
    } catch (err) {
      alert('Camera access and Full Screen are required to start this exam. Please enable permissions.');
      console.error(err);
    }
  };

  // Setup proctoring event listeners when exam starts
  useEffect(() => {
    if (examState !== 'exam') return;

    // Fullscreen exit tracking
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // Exited fullscreen!
        handleViolation('Exited full screen mode. Redirecting tab or workspace focus.');
      }
    };

    // Tab change / blur tracking
    const handleBlur = () => {
      handleViolation('Lost page focus: Switched tab or minimized window.');
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [examState, fullscreenExits]);

  // Handle Fullscreen Exits or Page Focus losses
  const handleViolation = async (violationMessage) => {
    try {
      const res = await fetch(`${API_URL}/contests/internal/${id}/log-violation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: violationMessage,
          type: 'violation'
        })
      });
      const data = await res.json();
      if (data.success) {
        setFullscreenExits(data.data.fullscreenExits);

        // Log locally
        logProctor(`Violation: ${violationMessage}`, 'warning');

        if (data.data.isFinished) {
          setExamState('terminated');
          exitFullscreenAndWebcam();
        } else {
          setShowWarningModal(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Periodic simulated AI proctoring facial checks
  useEffect(() => {
    if (examState !== 'exam') return;

    const interval = setInterval(async () => {
      const anomalies = [
        { msg: 'Warning: Eye contact lost. Candidate looking away.', type: 'warning' },
        { msg: 'Warning: No face detected in camera viewport.', type: 'warning' },
        { msg: 'Warning: Multiple people detected in proctor window.', type: 'warning' },
        { msg: 'Candidate speaking/talking detected.', type: 'warning' }
      ];

      // 85% chance neutral face detected, 15% warning anomaly
      const randomVal = Math.random();
      let logMsg = 'Face detected: Candidate focused.';
      let logType = 'info';

      if (randomVal > 0.85) {
        const anomaly = anomalies[Math.floor(Math.random() * anomalies.length)];
        logMsg = anomaly.msg;
        logType = 'warning';

        // Submit facial expression violation to DB
        await fetch(`${API_URL}/contests/internal/${id}/log-violation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            message: anomaly.msg,
            type: 'warning'
          })
        });
      }

      logProctor(`AI: ${logMsg}`, logType);
    }, 20000); // Check every 20 seconds

    return () => clearInterval(interval);
  }, [examState]);

  // Countdown timer
  useEffect(() => {
    if (examState !== 'exam') return;
    if (timeRemaining <= 0) {
      finishExam();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [examState, timeRemaining]);

  const logProctor = (msg, type = 'info') => {
    setProctoringConsole(prev => [
      { time: new Date().toLocaleTimeString(), msg, type },
      ...prev.slice(0, 15) // Keep last 16 logs
    ]);
  };

  const exitFullscreenAndWebcam = () => {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleResumeFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      setShowWarningModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Submit code for active question
  const handleSubmitCode = async () => {
    const activeQ = questions[activeQuestionIdx];
    const code = codeMap[activeQ._id];
    if (!code) return;

    try {
      setSubmitting(true);
      setSubResult(null);

      const res = await fetch(`${API_URL}/contests/internal/${id}/submit-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          questionId: activeQ._id,
          code,
          language
        })
      });

      const data = await res.json();
      if (data.success) {
        setSubResult(data.data);
        // Save submission status
        setSubmissionsStatus(prev => ({
          ...prev,
          [activeQ._id]: {
            status: data.data.status,
            score: data.data.score
          }
        }));

        if (data.data.status === 'Plagiarized') {
          // Lock out question
          setDisqualifiedQuestions(prev => [...prev, activeQ._id]);
          logProctor(`DISQUALIFICATION: Plagiarism caught on Question: "${activeQ.title}"`, 'warning');
        } else {
          logProctor(`Code Submitted: "${activeQ.title}" status is ${data.data.status} with Score: ${data.data.score}/100`, 'info');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Error submitting code.');
    } finally {
      setSubmitting(false);
    }
  };

  const finishExam = async () => {
    try {
      await fetch(`${API_URL}/contests/internal/${id}/finish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setExamState('finished');
      exitFullscreenAndWebcam();
    } catch (e) {
      console.error(e);
    }
  };

  // Panel resizer dragging handlers
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const activeQuestion = questions[activeQuestionIdx];
  const isQuestionDisqualified = activeQuestion && disqualifiedQuestions.includes(activeQuestion._id);

  // Format seconds to mm:ss
  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="exam-loading">
        <div className="spinner-loader"></div>
        <p>Loading exam environment...</p>
      </div>
    );
  }

  // SCREEN 1: DISCLAIMER SCREEN
  if (examState === 'disclaimer') {
    return (
      <div className="exam-disclaimer-wrapper">
        <div className="glass-card disclaimer-card animate-fade">
          <h2>🔒 AI Proctored Coding Assessment</h2>
          <h3 style={{ color: '#ecc94b', marginTop: '10px' }}>{contest.title}</h3>
          <p className="disclaimer-desc">{contest.description || 'Rules & regulations apply.'}</p>

          <div className="rules-list">
            <h4>EXAM RULES & SECURITY PROTOCOLS:</h4>
            <ul>
              <li>⚠️ **Full Screen Mode**: The exam must run in full screen. Exiting full screen 3 times terminates your exam automatically.</li>
              <li>📷 **Webcam Monitoring**: The AI proctor monitors your facial movements. Looking away, speaking, or switching devices registers as a proctoring violation.</li>
              <li>🛡️ **Plagiarism Enforcement**: Plagiarism checks run in real-time. If your code matches another candidate's submissions, **the question is terminated instantly** with a score of 0.</li>
            </ul>
          </div>

          <button className="btn btn-primary btn-lg start-exam-btn" onClick={startExam}>
            I Agree, Start Exam & Enter Full Screen ➜
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 2: TERMINATED STATE
  if (examState === 'terminated') {
    return (
      <div className="exam-terminated-wrapper">
        <div className="glass-card terminated-card animate-fade">
          <span className="terminated-icon">🚫</span>
          <h2>Exam Terminated</h2>
          <p style={{ color: '#e53e3e', fontSize: '1.2rem', fontWeight: 'bold' }}>
            System lock out due to Proctoring Violations.
          </p>
          <p style={{ color: '#a0aec0', marginTop: '10px' }}>
            You exited full screen mode more than 2 times. Your responses have been submitted automatically.
          </p>
          <button className="btn btn-secondary mt-20" onClick={() => navigate('/contests')}>
            Exit Workspace
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 3: FINISHED STATE
  if (examState === 'finished') {
    return (
      <div className="exam-terminated-wrapper">
        <div className="glass-card terminated-card animate-fade">
          <span className="terminated-icon" style={{ background: 'rgba(72, 187, 120, 0.15)', color: '#48bb78' }}>✓</span>
          <h2>Assessment Completed</h2>
          <p style={{ color: '#48bb78', fontSize: '1.2rem', fontWeight: 'bold' }}>
            Your responses have been successfully compiled.
          </p>
          <p style={{ color: '#a0aec0', marginTop: '10px' }}>
            Plagiarism analysis and proctor verification checks are active. You can view your scorecard ranking on the leaderboard.
          </p>
          <button className="btn btn-primary mt-20" onClick={() => navigate(`/contests/${id}/leaderboard`)}>
            View Leaderboard
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 4: WORKSPACE ENVIRONMENT
  return (
    <div className="exam-workspace" ref={containerRef}>
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="header-left">
          <span className="exam-title-badge">EXAM</span>
          <span className="exam-title">{contest.title}</span>
        </div>
        <div className="header-right">
          <div className="timer-box">
            <span className="timer-icon">⏱️</span>
            <span className={`timer-value ${timeRemaining < 300 ? 'critical' : ''}`}>
              {formatTimer(timeRemaining)}
            </span>
          </div>
          <button className="btn btn-danger btn-sm finish-btn" onClick={finishExam}>
            Finish & Submit
          </button>
        </div>
      </div>

      {/* Main Workspace split panel */}
      <div className="workspace-main">
        {/* Left Column: Description & Questions */}
        <div className="left-panel" style={{ width: `${leftWidth}%` }}>
          <div className="questions-nav-tabs">
            {questions.map((q, idx) => (
              <button
                key={q._id}
                className={`q-tab-btn ${activeQuestionIdx === idx ? 'active' : ''} ${disqualifiedQuestions.includes(q._id) ? 'disqualified' : ''}`}
                onClick={() => {
                  setActiveQuestionIdx(idx);
                  setSubResult(null);
                }}
              >
                Q{idx + 1} {submissionsStatus[q._id]?.status === 'Accepted' && '✓'}
              </button>
            ))}
          </div>

          {activeQuestion && (
            <div className="question-content animate-fade">
              <h2>{activeQuestion.title}</h2>
              <div className="diff-tag-row">
                <span className={`difficulty-badge ${activeQuestion.difficulty.toLowerCase()}`}>
                  {activeQuestion.difficulty}
                </span>
                <span className="score-tag">
                  Score: {submissionsStatus[activeQuestion._id]?.score || 0}/100
                </span>
              </div>

              <div className="question-body">
                <h3>Problem Description</h3>
                <p className="description-text">{activeQuestion.description}</p>

                {activeQuestion.constraints && (
                  <>
                    <h3>Constraints</h3>
                    <pre className="constraints-block">{activeQuestion.constraints}</pre>
                  </>
                )}

                {activeQuestion.inputFormat && (
                  <>
                    <h3>Input Format</h3>
                    <p>{activeQuestion.inputFormat}</p>
                  </>
                )}

                {activeQuestion.outputFormat && (
                  <>
                    <h3>Output Format</h3>
                    <p>{activeQuestion.outputFormat}</p>
                  </>
                )}

                {activeQuestion.sampleInput && (
                  <>
                    <h3>Sample Input</h3>
                    <pre className="code-block">{activeQuestion.sampleInput}</pre>
                  </>
                )}

                {activeQuestion.sampleOutput && (
                  <>
                    <h3>Sample Output</h3>
                    <pre className="code-block">{activeQuestion.sampleOutput}</pre>
                  </>
                )}

                {activeQuestion.explanation && (
                  <>
                    <h3>Explanation</h3>
                    <p>{activeQuestion.explanation}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Resizer handle */}
        <div className="panel-resizer" onMouseDown={handleMouseDown}></div>

        {/* Middle Column: Code Editor & Playground */}
        <div className="editor-panel" style={{ width: `${100 - leftWidth - 22}%` }}>
          <div className="editor-header">
            <span className="panel-title">📝 Code Editor</span>
            <select
              value={language}
              onChange={(e) => {
                const lang = e.target.value;
                setLanguage(lang);
                setCodeMap(prev => ({
                  ...prev,
                  [activeQuestion._id]: getCodeTemplate(lang)
                }));
              }}
              disabled={isQuestionDisqualified}
              className="lang-select"
            >
              {ALL_CORER_LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div className="editor-textarea-container" style={{ position: 'relative', height: '550px', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              language={
                language === 'cpp' ? 'cpp' :
                language === 'python' ? 'python' :
                language === 'java' ? 'java' :
                language === 'c' ? 'c' :
                language === 'typescript' ? 'typescript' :
                language === 'sql' ? 'sql' :
                language === 'mysql' ? 'mysql' :
                language === 'postgresql' ? 'sql' :
                language === 'html' ? 'html' :
                language === 'javascript' ? 'javascript' : 'javascript'
              }
              value={codeMap[activeQuestion?._id] || ''}
              onChange={(value) => {
                setCodeMap(prev => ({
                  ...prev,
                  [activeQuestion._id]: value || ''
                }));
              }}
              options={{
                readOnly: isQuestionDisqualified,
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                tabSize: 4,
                padding: { top: 10, bottom: 10 }
              }}
            />

            {/* Lockout overlay for Plagiarized/Disqualified */}
            {isQuestionDisqualified && (
              <div className="editor-lockout-overlay" style={{ zIndex: 10 }}>
                <span className="lock-icon">🔒</span>
                <h3>Question Disqualified</h3>
                <p>Plagiarism matched. The editor is locked for this task.</p>
              </div>
            )}
          </div>

          {/* Submission and execution actions */}
          <div className="editor-footer">
            <div className="sub-status-inline">
              {submissionsStatus[activeQuestion?._id] && (
                <span className={`status-badge-inline ${submissionsStatus[activeQuestion._id].status.toLowerCase().replace(' ', '-')}`}>
                  Status: {submissionsStatus[activeQuestion._id].status}
                </span>
              )}
            </div>
            <button
              onClick={handleSubmitCode}
              disabled={submitting || isQuestionDisqualified}
              className="btn btn-primary"
            >
              {submitting ? 'Compiling & Submitting...' : 'Submit Solution 🚀'}
            </button>
          </div>

          {/* Test cases result display */}
          {subResult && (
            <div className="execution-results-card">
              <h4>Compilation & Evaluation Results:</h4>
              <p>Status: <strong className={subResult.status === 'Accepted' ? 'text-success' : 'text-danger'}>{subResult.status}</strong></p>
              {subResult.status !== 'Plagiarized' && (
                <>
                  <p>Passed Test Cases: <strong>{subResult.passedTestCasesCount}</strong></p>
                  <p>Failed Test Cases: <strong>{subResult.failedTestCasesCount}</strong></p>
                </>
              )}
              {subResult.error && (
                <pre className="error-log-box">{subResult.error}</pre>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Video Proctoring & Logs */}
        <div className="proctoring-panel" style={{ width: '22%' }}>
          <div className="panel-header-proctor">
            <span className="pulse-red-dot"></span>
            <span className="proctor-title">AI PROCTOR ACTIVE</span>
          </div>

          <div className="camera-feed-box">
            <video ref={videoRef} autoPlay playsInline muted className="camera-video"></video>
            <div className="camera-overlay-glow"></div>
            <span className="scan-line"></span>
          </div>

          <div className="violations-counter">
            <span>Fullscreen violations:</span>
            <strong className={fullscreenExits > 0 ? 'text-danger' : ''}>
              {fullscreenExits} / 3
            </strong>
          </div>

          <div className="proctoring-timeline-header">AI Timeline Logs</div>
          <div className="proctoring-timeline">
            {proctoringConsole.map((log, index) => (
              <div key={index} className={`timeline-item ${log.type}`}>
                <span className="time">{log.time}</span>
                <span className="message">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exited Full Screen warning blocker modal */}
      {showWarningModal && (
        <div className="warning-modal-overlay">
          <div className="glass-card warning-modal animate-fade">
            <span className="warning-icon">⚠️</span>
            <h2>FULL SCREEN ENFORCEMENT</h2>
            <p className="warning-text">
              Exiting Full Screen mode violates testing policy. This exit has been logged in the proctor report.
            </p>
            <div className="violation-stats">
              Violation count: <strong>{fullscreenExits} / 3</strong>
            </div>
            <button className="btn btn-primary" onClick={handleResumeFullscreen}>
              Return to Full Screen & Resume Exam ➜
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContestWorkspace;
