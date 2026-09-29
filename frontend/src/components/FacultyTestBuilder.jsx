import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import './FacultyTestBuilder.css';

const FacultyTestBuilder = () => {
  const [activeView, setActiveView] = useState('create'); // 'create' | 'manage'
  const [createdTests, setCreatedTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Test Meta
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(30);
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'

  // Assignment Target Scope
  const [targetType, setTargetType] = useState('branch'); // 'students' | 'class' | 'branch' | 'batch' | 'department' | 'all'
  const [targetValuesInput, setTargetValuesInput] = useState('CSE');

  // Question List
  const [questions, setQuestions] = useState([]);

  // Current Question Builder Draft
  const [qType, setQType] = useState('mcq'); // 'mcq' | 'coding' | 'sql' | 'descriptive'
  const [qTitle, setQTitle] = useState('');
  const [qPoints, setQPoints] = useState(1);

  // MCQ specific
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0);
  const [mcqExplanation, setMcqExplanation] = useState('');

  // Coding specific
  const [codingLanguage, setCodingLanguage] = useState('python');
  const [codingProblem, setCodingProblem] = useState('');
  const [codingStarter, setCodingStarter] = useState('def solution():\n    # Write your logic here\n    pass');
  const [testCaseInput, setTestCaseInput] = useState('');
  const [testCaseOutput, setTestCaseOutput] = useState('');

  // SQL specific
  const [sqlSchema, setSqlSchema] = useState('CREATE TABLE Employees (\n    emp_id INT PRIMARY KEY,\n    name VARCHAR(50),\n    salary INT\n);');
  const [sqlProblem, setSqlProblem] = useState('');
  const [sqlSolution, setSqlSolution] = useState('SELECT name, salary FROM Employees WHERE salary > 50000;');

  // Descriptive specific
  const [descPrompt, setDescPrompt] = useState('');
  const [descRubric, setDescRubric] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchMyTests = async () => {
    try {
      setLoadingTests(true);
      const res = await axios.get(`${API_URL}/tests?limit=50`, getAuthHeaders());
      if (res.data?.success) {
        setCreatedTests(res.data?.data || []);
      }
    } catch (err) {
      console.warn('Failed to load tests:', err.message);
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    fetchMyTests();
  }, []);

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!qTitle.trim() && qType === 'mcq') {
      alert('Please enter question text');
      return;
    }

    let newQ = {
      id: Date.now(),
      questionType: qType,
      title: qTitle || `${qType.toUpperCase()} Question`,
      points: Number(qPoints) || 1,
      difficulty
    };

    if (qType === 'mcq') {
      const validOptions = mcqOptions.map((opt, i) => opt.trim() || `Option ${i + 1}`);
      newQ.options = validOptions;
      newQ.correctOption = correctOptionIdx;
      newQ.explanation = mcqExplanation;
    } else if (qType === 'coding') {
      newQ.codingDetails = {
        language: codingLanguage,
        problemStatement: codingProblem || qTitle,
        starterCode: codingStarter,
        testCases: [{ input: testCaseInput, expectedOutput: testCaseOutput }]
      };
    } else if (qType === 'sql') {
      newQ.sqlDetails = {
        schemaDefinition: sqlSchema,
        problemStatement: sqlProblem || qTitle,
        solutionQuery: sqlSolution
      };
    } else if (qType === 'descriptive') {
      newQ.descriptiveDetails = {
        questionPrompt: descPrompt || qTitle,
        sampleAnswerRubric: descRubric
      };
    }

    setQuestions([...questions, newQ]);

    // Reset question inputs
    setQTitle('');
    setMcqOptions(['', '', '', '']);
    setCorrectOptionIdx(0);
    setMcqExplanation('');
    setCodingProblem('');
    setTestCaseInput('');
    setTestCaseOutput('');
    setSqlProblem('');
    setDescPrompt('');
    setDescRubric('');

    setFeedback({ type: 'success', message: `Added ${qType.toUpperCase()} question to assessment!` });
    setTimeout(() => setFeedback({ type: '', message: '' }), 2500);
  };

  const handleRemoveQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handlePublishTest = async () => {
    if (!title.trim()) {
      alert('Please provide a Test Title (e.g., "DBMS Assessment")');
      return;
    }
    if (questions.length === 0) {
      alert('Please add at least one question before publishing.');
      return;
    }

    try {
      setPublishing(true);
      const targetValues = targetValuesInput
        ? targetValuesInput.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload = {
        title,
        duration: Number(duration) || 30,
        difficulty,
        questionLimit: questions.length,
        questions: questions.map(q => {
          if (q.questionType === 'mcq') {
            return {
              questionType: 'mcq',
              questionText: q.title,
              options: q.options.map(opt => ({ text: opt })),
              correctOption: q.correctOption,
              difficulty: q.difficulty || difficulty,
              explanation: q.explanation || ''
            };
          } else {
            return {
              questionType: q.questionType,
              questionText: q.title,
              difficulty: q.difficulty || difficulty,
              codingDetails: q.codingDetails,
              sqlDetails: q.sqlDetails,
              descriptiveDetails: q.descriptiveDetails
            };
          }
        }),
        assignmentScope: {
          targetType,
          targetValues
        }
      };

      const res = await axios.post(`${API_URL}/tests`, payload, getAuthHeaders());
      if (res.data?.success) {
        setFeedback({
          type: 'success',
          message: `🎉 Assessment "${title}" published and assigned to ${targetType.toUpperCase()}: ${targetValuesInput}!`
        });

        // Reset
        setTitle('');
        setDuration(30);
        setQuestions([]);
        fetchMyTests();
        setActiveView('manage');
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to publish assessment.'
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    try {
      await axios.delete(`${API_URL}/tests/${testId}`, getAuthHeaders());
      setCreatedTests(createdTests.filter(t => t._id !== testId));
      setFeedback({ type: 'success', message: 'Test deleted successfully.' });
      setTimeout(() => setFeedback({ type: '', message: '' }), 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete test.');
    }
  };

  return (
    <div className="test-builder-container animate-fade">
      {/* Top Banner */}
      <div className="test-builder-header">
        <div className="builder-title-info">
          <div className="builder-icon-badge">🛠️</div>
          <div>
            <h2 className="builder-main-title">Faculty Assessment &amp; Test Builder</h2>
            <p className="builder-subtitle">
              Design custom assessments with multi-paradigm questions (MCQ, Live Coding, SQL Queries, Descriptive answers) and assign targeted cohorts.
            </p>
          </div>
        </div>

        <div className="builder-nav-tabs">
          <button
            className={`nav-tab-pill ${activeView === 'create' ? 'active' : ''}`}
            onClick={() => setActiveView('create')}
          >
            ✏️ Create New Assessment
          </button>
          <button
            className={`nav-tab-pill ${activeView === 'manage' ? 'active' : ''}`}
            onClick={() => { setActiveView('manage'); fetchMyTests(); }}
          >
            📋 Assessment Archive ({createdTests.length})
          </button>
        </div>
      </div>

      {feedback.message && (
        <div className={`feedback-alert-banner ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {activeView === 'create' ? (
        <div className="builder-workspace-grid">
          {/* Left Column: Form & Question Creator */}
          <div className="builder-editor-column">
            {/* Step 1: Test Details & Assignment Target */}
            <div className="builder-card">
              <div className="card-section-header">
                <span className="step-badge">Step 1</span>
                <h3>Test Configuration &amp; Target Audience</h3>
              </div>

              <div className="form-grid-2">
                <div className="input-group full-width">
                  <label>Assessment Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. DBMS Assessment, Python Data Structures Quiz..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Duration (Minutes) *</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Difficulty Tier</label>
                  <div className="difficulty-radio-group">
                    {['easy', 'medium', 'hard'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`diff-pill ${difficulty === d ? `active ${d}` : ''}`}
                        onClick={() => setDifficulty(d)}
                      >
                        {d === 'easy' ? '○ Easy' : d === 'medium' ? '○ Medium' : '○ Hard'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Scope Assignment */}
                <div className="input-group">
                  <label>Assign Target Scope *</label>
                  <select value={targetType} onChange={(e) => setTargetType(e.target.value)}>
                    <option value="branch">Branch (e.g. CSE, IT, ECE)</option>
                    <option value="class">Class / Section (e.g. Section-A)</option>
                    <option value="batch">Batch / Year (e.g. 2025, 2026)</option>
                    <option value="department">Department</option>
                    <option value="students">Specific Students (Roll / ID)</option>
                    <option value="all">Entire Institution (All Students)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Target Value(s) (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder={
                      targetType === 'branch' ? 'CSE, IT, ECE' :
                      targetType === 'batch' ? '2025, 2026' :
                      targetType === 'students' ? '21241A0501, 21241A0502' :
                      'Section-A, Section-B'
                    }
                    value={targetValuesInput}
                    onChange={(e) => setTargetValuesInput(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Question Composer with Type Checkboxes */}
            <div className="builder-card">
              <div className="card-section-header">
                <span className="step-badge">Step 2</span>
                <h3>Add Questions to Assessment</h3>
              </div>

              <div className="question-type-selector">
                <span className="type-label">Select Question Type:</span>
                <div className="types-pills">
                  {[
                    { type: 'mcq', label: '☑ MCQ', icon: '🔘' },
                    { type: 'coding', label: '☑ Coding', icon: '💻' },
                    { type: 'sql', label: '☑ SQL', icon: '🗄️' },
                    { type: 'descriptive', label: '☑ Descriptive', icon: '📝' }
                  ].map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      className={`type-btn ${qType === t.type ? 'selected' : ''}`}
                      onClick={() => setQType(t.type)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Question Builder Inputs */}
              <div className="question-draft-form">
                <div className="input-group">
                  <label>Question Prompt / Title *</label>
                  <input
                    type="text"
                    placeholder={
                      qType === 'mcq' ? 'What is the ACID property representing independence?' :
                      qType === 'coding' ? 'Two Sum - Find two numbers that sum up to target' :
                      qType === 'sql' ? 'Write a query to find highest paid employee per department' :
                      'Explain the normalization process up to BCNF with examples.'
                    }
                    value={qTitle}
                    onChange={(e) => setQTitle(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Points / Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={qPoints}
                    onChange={(e) => setQPoints(e.target.value)}
                    style={{ maxWidth: '120px' }}
                  />
                </div>

                {/* MCQ Mode */}
                {qType === 'mcq' && (
                  <div className="mcq-options-builder">
                    <label className="sub-label">Options (Mark radio button for correct option):</label>
                    {mcqOptions.map((opt, idx) => (
                      <div key={idx} className="mcq-option-row">
                        <input
                          type="radio"
                          name="correctOption"
                          checked={correctOptionIdx === idx}
                          onChange={() => setCorrectOptionIdx(idx)}
                        />
                        <span className="opt-prefix">{String.fromCharCode(65 + idx)}.</span>
                        <input
                          type="text"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const copy = [...mcqOptions];
                            copy[idx] = e.target.value;
                            setMcqOptions(copy);
                          }}
                        />
                      </div>
                    ))}
                    <div className="input-group" style={{ marginTop: '0.8rem' }}>
                      <label>Explanation (Optional)</label>
                      <input
                        type="text"
                        placeholder="Why is this option correct?"
                        value={mcqExplanation}
                        onChange={(e) => setMcqExplanation(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Coding Mode */}
                {qType === 'coding' && (
                  <div className="coding-builder-box">
                    <div className="input-group">
                      <label>Language</label>
                      <select value={codingLanguage} onChange={(e) => setCodingLanguage(e.target.value)}>
                        <option value="python">Python 3</option>
                        <option value="cpp">C++ 17</option>
                        <option value="java">Java 11</option>
                        <option value="c">C (GCC)</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label>Starter Code Boilerplate</label>
                      <textarea
                        rows={4}
                        value={codingStarter}
                        onChange={(e) => setCodingStarter(e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>

                    <div className="form-grid-2">
                      <div className="input-group">
                        <label>Sample Test Case Input</label>
                        <input
                          type="text"
                          placeholder="e.g. [2,7,11,15], target = 9"
                          value={testCaseInput}
                          onChange={(e) => setTestCaseInput(e.target.value)}
                        />
                      </div>
                      <div className="input-group">
                        <label>Expected Output</label>
                        <input
                          type="text"
                          placeholder="e.g. [0,1]"
                          value={testCaseOutput}
                          onChange={(e) => setTestCaseOutput(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SQL Mode */}
                {qType === 'sql' && (
                  <div className="sql-builder-box">
                    <div className="input-group">
                      <label>Database Table Schema (DDL)</label>
                      <textarea
                        rows={3}
                        value={sqlSchema}
                        onChange={(e) => setSqlSchema(e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Reference Solution Query</label>
                      <textarea
                        rows={2}
                        value={sqlSolution}
                        onChange={(e) => setSqlSolution(e.target.value)}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>
                )}

                {/* Descriptive Mode */}
                {qType === 'descriptive' && (
                  <div className="desc-builder-box">
                    <div className="input-group">
                      <label>Grading Criteria &amp; Evaluation Rubric</label>
                      <textarea
                        rows={3}
                        placeholder="Key points: 1NF atomicity (2 pts), 2NF full functional dependency (3 pts), 3NF transitive removal (3 pts), BCNF determinant candidate key (2 pts)."
                        value={descRubric}
                        onChange={(e) => setDescRubric(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn-add-question"
                  onClick={handleAddQuestion}
                >
                  ➕ Add Question to Draft
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Assessment Preview & Publish Card */}
          <div className="builder-preview-column">
            <div className="preview-sticky-card">
              <div className="preview-header">
                <h3>Assessment Draft Summary</h3>
                <span className="diff-badge-header">{difficulty.toUpperCase()}</span>
              </div>

              <div className="test-meta-dossier">
                <div className="dossier-row">
                  <span className="dossier-label">Title:</span>
                  <span className="dossier-val">{title || 'Untitled Assessment'}</span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-label">Duration:</span>
                  <span className="dossier-val">⏱️ {duration} mins</span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-label">Target:</span>
                  <span className="dossier-val highlight-target">
                    {targetType.toUpperCase()}: {targetValuesInput || 'All'}
                  </span>
                </div>
                <div className="dossier-row">
                  <span className="dossier-label">Questions:</span>
                  <span className="dossier-val"><strong>{questions.length}</strong> questions added</span>
                </div>
              </div>

              {/* Questions List */}
              <div className="draft-questions-scroll">
                {questions.length === 0 ? (
                  <div className="empty-draft-prompt">
                    <span>📝</span>
                    <p>No questions added yet. Use the question composer on the left to add MCQs, Coding, SQL, or Descriptive questions.</p>
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <div key={q.id} className="draft-question-item">
                      <div className="draft-q-top">
                        <span className={`q-type-badge ${q.questionType}`}>
                          {q.questionType.toUpperCase()}
                        </span>
                        <span className="q-points-tag">{q.points} pt{q.points > 1 ? 's' : ''}</span>
                        <button
                          type="button"
                          className="btn-del-draft-q"
                          onClick={() => handleRemoveQuestion(q.id)}
                          title="Remove question"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="draft-q-title">
                        {idx + 1}. {q.title}
                      </div>
                      {q.questionType === 'mcq' && (
                        <div className="draft-mcq-correct">
                          Correct: Option {String.fromCharCode(65 + q.correctOption)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Publish Action */}
              <button
                type="button"
                className="btn-publish-test"
                disabled={publishing || questions.length === 0 || !title.trim()}
                onClick={handlePublishTest}
              >
                {publishing ? 'Publishing & Notifying Cohort...' : '🚀 Publish Assessment Now'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Assessment Archive View */
        <div className="builder-archive-view">
          <div className="archive-header-row">
            <h3>Institutional Assessment Archive</h3>
            <button className="btn-create-short" onClick={() => setActiveView('create')}>
              ➕ Build New Test
            </button>
          </div>

          {loadingTests ? (
            <div className="archive-loading">
              <div className="builder-spinner"></div>
              <p>Loading assessment catalog...</p>
            </div>
          ) : createdTests.length === 0 ? (
            <div className="archive-empty">
              <span>📋</span>
              <h4>No Assessments Created Yet</h4>
              <p>Create your first custom assessment and assign it to your student cohorts.</p>
            </div>
          ) : (
            <div className="archive-grid">
              {createdTests.map((t) => (
                <div key={t._id} className="archive-test-card">
                  <div className="archive-card-top">
                    <span className={`archive-diff-tag ${t.difficulty || 'medium'}`}>
                      {(t.difficulty || 'medium').toUpperCase()}
                    </span>
                    <span className="archive-time-tag">⏱️ {t.duration || 20}m</span>
                  </div>

                  <h4 className="archive-test-title">{t.title}</h4>

                  <div className="archive-meta-rows">
                    <div>
                      <span className="label">Target:</span>
                      <span className="val">
                        {t.assignmentScope?.targetType
                          ? `${t.assignmentScope.targetType.toUpperCase()}: ${(t.assignmentScope.targetValues || []).join(', ') || 'All'}`
                          : t.branch || 'General'}
                      </span>
                    </div>
                    <div>
                      <span className="label">Questions:</span>
                      <span className="val">{t.questions?.length || t.questionLimit || 0} questions</span>
                    </div>
                  </div>

                  <div className="archive-card-actions">
                    <button
                      className="btn-archive-delete"
                      onClick={() => handleDeleteTest(t._id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FacultyTestBuilder;
