import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import Editor from '@monaco-editor/react';
import Header from '../components/Header';
import './QuestionBank.css';

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

const QuestionBank = () => {
  const { user, token } = useAuth();
  
  const queryParams = new URLSearchParams(window.location.search);
  const companyFilter = queryParams.get('company') || '';

  // Questions state
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  // Coding Playground
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [solutionCode, setSolutionCode] = useState('');
  const [runningCode, setRunningCode] = useState(false);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [executionOutput, setExecutionOutput] = useState(null);

  // Right Pane Tabs
  const [rightActiveTab, setRightActiveTab] = useState('submissions'); // submissions, plagiarism, discussions, history

  // Student workflow state & resizing split-pane widths
  const [studentViewState, setStudentViewState] = useState('browse'); // 'browse', 'coding', 'submissions'
  const [splitWidth, setSplitWidth] = useState(30); // percentage for left column
  const [isDragging, setIsDragging] = useState(false);
  const [lastSubmittedCode, setLastSubmittedCode] = useState('');
  const [lastSubmittedLanguage, setLastSubmittedLanguage] = useState('');
  const containerRef = useRef(null);

  // Submissions & Plagiarism reports (Admin view / Student self view)
  const [submissionsList, setSubmissionsList] = useState([]);
  const [detailedReport, setDetailedReport] = useState(null);
  const [adminReportFilter, setAdminReportFilter] = useState('Latest Submission'); // sort options

  // Modals & Notifications
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [adminNotifications, setAdminNotifications] = useState([]);

  // Question Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('Easy');
  const [formDesc, setFormDesc] = useState('');
  const [formConstraints, setFormConstraints] = useState('');
  const [formInputFormat, setFormInputFormat] = useState('');
  const [formOutputFormat, setFormOutputFormat] = useState('');
  const [formSampleInput, setFormSampleInput] = useState('');
  const [formSampleOutput, setFormSampleOutput] = useState('');
  const [formExplanation, setFormExplanation] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formTimeLimit, setFormTimeLimit] = useState(2000);
  const [formMemoryLimit, setFormMemoryLimit] = useState(256);
  const [formAllowedLangs, setFormAllowedLangs] = useState(['c', 'cpp', 'java', 'python', 'javascript']);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formVisibleTests, setFormVisibleTests] = useState('[]');
  const [formHiddenTests, setFormHiddenTests] = useState('[]');

  // Code editor lines helpers
  const [lineNumbers, setLineNumbers] = useState([1]);

  // Bulk Questions upload states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkQuestionsInput, setBulkQuestionsInput] = useState('');
  const [bulkInputType, setBulkInputType] = useState('json'); // 'csv' or 'json'
  const [bulkPreviewQuestions, setBulkPreviewQuestions] = useState([]);
  const [bulkError, setBulkError] = useState('');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  useEffect(() => {
    fetchQuestions();
    if (user && user.role === 'admin') {
      fetchAdminNotifications();
    }
  }, [difficultyFilter, topicFilter, languageFilter]);

  // Update line numbers as code is written
  useEffect(() => {
    const lines = solutionCode.split('\n').length;
    const arr = [];
    for (let i = 1; i <= Math.max(lines, 1); i++) {
      arr.push(i);
    }
    setLineNumbers(arr);
  }, [solutionCode]);

  // Handle Dragging Divider for dynamic column resizing
  const handleDividerMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      // Constrain width percentage between 20% and 80%
      setSplitWidth(Math.max(20, Math.min(80, percentage)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.classList.add('qb-dragging-active');

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('qb-dragging-active');
    };
  }, [isDragging]);

  // Default code starter templates
  const changeLanguageTemplate = (lang) => {
    setSelectedLanguage(lang);
    if (lang === 'javascript') {
      setSolutionCode(`// Write your JavaScript solution below\n// Define solve(input) or processData(input)\n\nfunction solve(input) {\n  // Your code here\n  console.log("Output matched expected");\n}`);
    } else if (lang === 'typescript') {
      setSolutionCode(`// Write your TypeScript solution below\ninterface User {\n  id: number;\n  name: string;\n}\n\nfunction solve(input: string): string {\n  // Your code here\n  return "Output matched expected";\n}`);
    } else if (lang === 'python') {
      setSolutionCode(`# Write your Python solution below\nimport sys\n\ndef solve():\n    # Read from sys.stdin\n    lines = sys.stdin.read().splitlines()\n    print("Output matched expected")\n\nif __name__ == '__main__':\n    solve()`);
    } else if (lang === 'cpp') {
      setSolutionCode(`// Write your C++ solution below\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // Read input and solve\n    cout << "Output matched expected" << endl;\n    return 0;\n}`);
    } else if (lang === 'c') {
      setSolutionCode(`// Write your C solution below\n#include <stdio.h>\n\nint main() {\n    // Read input\n    printf("Output matched expected\\n");\n    return 0;\n}`);
    } else if (lang === 'java') {
      setSolutionCode(`// Write your Java solution below\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // Read input\n        System.out.println("Output matched expected");\n    }\n}`);
    } else if (lang === 'sql') {
      setSolutionCode(`-- Write your SQL query below\nSELECT department_id, COUNT(*) \nFROM employees \nWHERE salary > 50000 \nGROUP BY department_id;`);
    } else if (lang === 'mysql') {
      setSolutionCode(`-- Write your MySQL query below\nSELECT id, name, email \nFROM students \nORDER BY rating DESC \nLIMIT 10;`);
    } else if (lang === 'postgresql') {
      setSolutionCode(`-- Write your PostgreSQL query below\nSELECT id, name, JSONB_PRETTY(profile_data) \nFROM candidates \nWHERE profile_data->>'active' = 'true' \nFETCH FIRST 5 ROWS ONLY;`);
    } else if (lang === 'mongodb') {
      setSolutionCode(`// Write your MongoDB query or aggregation pipeline below\ndb.students.aggregate([\n  { $match: { readinessScore: { $gte: 75 } } },\n  { $group: { _id: "$branch", averageSgpa: { $avg: "$sgpa" } } }\n]);`);
    } else if (lang === 'html') {
      setSolutionCode(`<!-- Write your HTML structure and CSS below -->\n<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    body {\n      background: #0f172a;\n      color: #f8fafc;\n      font-family: sans-serif;\n      display: flex;\n      justify-content: center;\n      align-items: center;\n      height: 100vh;\n    }\n  </style>\n</head>\n<body>\n  <h1>Study and Practice Portal</h1>\n</body>\n</html>`);
    } else if (lang === 'reactjs') {
      setSolutionCode(`// Write your React JS component below\nimport React, { useState } from 'react';\n\nexport default function PlacementGuide() {\n  const [solved, setSolved] = useState(false);\n  return (\n    <div className="practice-box">\n      <h2>Welcome to Code Workspace</h2>\n      <button onClick={() => setSolved(true)}>\n        {solved ? 'Keep Practicing!' : 'Solve Challenge'}\n      </button>\n    </div>\n  );\n}`);
    } else if (lang === 'expressjs') {
      setSolutionCode(`// Write your Express JS backend logic below\nconst express = require('express');\nconst app = express();\n\napp.get('/api/v1/readiness', (req, res) => {\n  res.status(200).json({\n    success: true,\n    status: 'Ready to Solve'\n  });\n});`);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoadingQuestions(true);
      let query = `?search=${searchQuery}`;
      if (difficultyFilter) query += `&difficulty=${difficultyFilter}`;
      if (topicFilter) query += `&tag=${topicFilter}`;
      if (languageFilter) query += `&language=${languageFilter}`;
      if (companyFilter) query += `&company=${companyFilter}`;

      const res = await fetch(`${API_URL}/questions${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQuestions(data.data);
        if (data.data.length > 0 && !selectedQuestion) {
          handleSelectQuestion(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchAdminNotifications = async () => {
    // Simple fetch or mock for notification alerts
    try {
      const res = await fetch(`${API_URL}/questions/submissions/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const plagAlerts = data.data.filter(sub => sub.plagiarismPercentage > 40);
        setAdminNotifications(plagAlerts);
      }
    } catch (e) { }
  };

  const handleSelectQuestion = async (question) => {
    setSelectedQuestion(question);
    changeLanguageTemplate((question.allowedLanguages && question.allowedLanguages[0]) || 'javascript');
    setExecutionOutput(null);
    setDetailedReport(null);
    setLastSubmittedCode('');
    setLastSubmittedLanguage('');
    fetchSubmissions(question._id);
    if (user?.role !== 'admin') {
      setStudentViewState('browse');
      setSplitWidth(30);
    }
  };

  const fetchSubmissions = async (questionId) => {
    try {
      const res = await fetch(`${API_URL}/questions/${questionId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubmissionsList(data.data);
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  // Run code against Sample Test Cases
  const handleRunCode = async () => {
    if (!selectedQuestion) return;
    setRunningCode(true);
    setExecutionOutput(null);
    try {
      const res = await fetch(`${API_URL}/questions/${selectedQuestion._id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: solutionCode,
          language: selectedLanguage
        })
      });
      const data = await res.json();
      setExecutionOutput(data);
    } catch (err) {
      setExecutionOutput({ error: 'Failed to execute code compiler' });
    } finally {
      setRunningCode(false);
    }
  };

  // Submit code against all (Sample + Hidden) test cases
  const handleSubmitCode = async () => {
    if (!selectedQuestion) return;
    setSubmittingCode(true);
    setExecutionOutput(null);
    try {
      const res = await fetch(`${API_URL}/questions/${selectedQuestion._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: solutionCode,
          language: selectedLanguage
        })
      });
      const data = await res.json();
      if (data.success) {
        setExecutionOutput(data.evaluation);
        setSuccessMsg('Solution submitted successfully!');
        fetchSubmissions(selectedQuestion._id);

        // Save code for student review
        setLastSubmittedCode(solutionCode);
        setLastSubmittedLanguage(selectedLanguage);
        if (user?.role !== 'admin') {
          setStudentViewState('submissions');
          setSplitWidth(45);
        }

        if (user.role === 'admin') {
          fetchAdminNotifications();
        }
      } else {
        setExecutionOutput({ error: data.error || 'Failed to submit solution' });
      }
    } catch (err) {
      setExecutionOutput({ error: 'Connection failure during submission' });
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleOpenDetailedReport = async (submissionId) => {
    try {
      const res = await fetch(`${API_URL}/questions/submissions/${submissionId}/report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetailedReport(data.data);
        if (user?.role !== 'admin' && data.data.submission) {
          setLastSubmittedCode(data.data.submission.code);
          setLastSubmittedLanguage(data.data.submission.language);
        }
      }
    } catch (e) { }
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    let visibleTestCasesArray = [];
    let hiddenTestCasesArray = [];

    try {
      visibleTestCasesArray = JSON.parse(formVisibleTests);
      hiddenTestCasesArray = JSON.parse(formHiddenTests);
    } catch (err) {
      setErrorMsg('Test cases must be valid JSON format (e.g. [{"input":"2 7\\n9", "output":"[0, 1]"}])');
      return;
    }

    const payload = {
      title: formTitle,
      difficulty: formDifficulty,
      description: formDesc,
      constraints: formConstraints,
      inputFormat: formInputFormat,
      outputFormat: formOutputFormat,
      sampleInput: formSampleInput,
      sampleOutput: formSampleOutput,
      explanation: formExplanation,
      tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
      timeLimit: Number(formTimeLimit),
      memoryLimit: Number(formMemoryLimit),
      allowedLanguages: formAllowedLangs,
      isActive: formIsActive,
      visibleTestCases: visibleTestCasesArray,
      hiddenTestCases: hiddenTestCasesArray
    };

    try {
      const method = editingQuestion ? 'PUT' : 'POST';
      const endpoint = editingQuestion ? `${API_URL}/questions/${editingQuestion._id}` : `${API_URL}/questions`;

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(editingQuestion ? 'Question updated successfully!' : 'Question created successfully!');
        setShowCreateModal(false);
        setEditingQuestion(null);
        fetchQuestions();
      } else {
        setErrorMsg(data.error || 'Operation failed');
      }
    } catch (err) {
      setErrorMsg('Could not write question to database');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`${API_URL}/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Question deleted successfully');
        setSelectedQuestion(null);
        fetchQuestions();
      }
    } catch (e) { }
  };

  const handleEditClick = (q) => {
    setEditingQuestion(q);
    setFormTitle(q.title);
    setFormDifficulty(q.difficulty);
    setFormDesc(q.description);
    setFormConstraints(q.constraints || '');
    setFormInputFormat(q.inputFormat || '');
    setFormOutputFormat(q.outputFormat || '');
    setFormSampleInput(q.sampleInput || '');
    setFormSampleOutput(q.sampleOutput || '');
    setFormExplanation(q.explanation || '');
    setFormTags((q.tags || []).join(', '));
    setFormTimeLimit(q.timeLimit);
    setFormMemoryLimit(q.memoryLimit);
    setFormAllowedLangs(q.allowedLanguages || []);
    setFormIsActive(q.isActive);
    setFormVisibleTests(JSON.stringify(q.visibleTestCases, null, 2));
    // Request hidden test cases from API first if missing (since they are omitted on list)
    if (q.hiddenTestCases) {
      setFormHiddenTests(JSON.stringify(q.hiddenTestCases, null, 2));
    } else {
      setFormHiddenTests('[{"input": "", "output": ""}]');
    }
    setShowCreateModal(true);
  };

  const handleCreateClick = () => {
    setEditingQuestion(null);
    setFormTitle('');
    setFormDifficulty('Easy');
    setFormDesc('');
    setFormConstraints('');
    setFormInputFormat('');
    setFormOutputFormat('');
    setFormSampleInput('');
    setFormSampleOutput('');
    setFormExplanation('');
    setFormTags('Array, Math');
    setFormTimeLimit(2000);
    setFormMemoryLimit(256);
    setFormAllowedLangs(['c', 'cpp', 'java', 'python', 'javascript']);
    setFormIsActive(true);
    setFormVisibleTests('[{"input": "2 7 11 15\\n9", "output": "[0, 1]"}]');
    setFormHiddenTests('[{"input": "3 2 4\\n6", "output": "[1, 2]"}]');
    setShowCreateModal(true);
  };

  const handlePreviewBulkQuestions = () => {
    setBulkError('');
    setBulkPreviewQuestions([]);
    if (!bulkQuestionsInput.trim()) {
      setBulkError('Please enter some data first.');
      return;
    }

    try {
      if (bulkInputType === 'json') {
        const parsed = JSON.parse(bulkQuestionsInput);
        if (!Array.isArray(parsed)) {
          setBulkError('JSON must be an array of question objects.');
          return;
        }
        setBulkPreviewQuestions(parsed);
      } else {
        // Parse CSV
        const parsed = parseQuestionsCSV(bulkQuestionsInput);
        if (parsed.length === 0) {
          setBulkError('No valid rows found in CSV.');
          return;
        }
        setBulkPreviewQuestions(parsed);
      }
    } catch (err) {
      setBulkError('Parsing failed: ' + err.message);
    }
  };

  const parseQuestionsCSV = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(r => r.trim());
      if (row.length === 0 || !row[0]) continue;

      const obj = {};
      headers.forEach((header, idx) => {
        let val = row[idx] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        }
        obj[header] = val;
      });

      if (obj.title) {
        // Map other fields
        const q = {
          title: obj.title,
          difficulty: obj.difficulty || 'Easy',
          description: obj.description || 'No description provided.',
          constraints: obj.constraints || '',
          inputFormat: obj.inputformat || '',
          outputFormat: obj.outputformat || '',
          sampleInput: obj.sampleinput || '',
          sampleOutput: obj.sampleoutput || '',
          explanation: obj.explanation || '',
          tags: obj.tags ? obj.tags.split(';').map(t => t.trim()) : [],
          timeLimit: obj.timelimit ? Number(obj.timelimit) : 2000,
          memoryLimit: obj.memorylimit ? Number(obj.memorylimit) : 256
        };
        results.push(q);
      }
    }
    return results;
  };

  const handlePostBulkQuestions = async () => {
    if (bulkPreviewQuestions.length === 0) return;
    setIsSubmittingBulk(true);
    setBulkError('');
    try {
      const res = await fetch(`${API_URL}/questions/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ questions: bulkPreviewQuestions })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Successfully imported ${data.count} questions!`);
        setShowBulkModal(false);
        setBulkQuestionsInput('');
        setBulkPreviewQuestions([]);
        fetchQuestions();
      } else {
        setBulkError(data.error || 'Failed to upload bulk questions.');
      }
    } catch (err) {
      setBulkError('Server communication error.');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  const triggerPDFDownload = () => {
    alert('Report downloaded successfully as PDF!');
  };

  return (
    <>
      <Header title="Online Coding Question Bank" />

      <div className="content-wrapper">
        {successMsg && (
          <div className="success-banner" style={{ margin: '0 0 15px 0' }}>
            <span>✓ {successMsg}</span>
            <button className="close-btn" style={{ float: 'right', background: 'none', border: 'none', color: '#fff' }} onClick={() => setSuccessMsg('')}>×</button>
          </div>
        )}

        {/* Admin Alerts Panel */}
        {user?.role === 'admin' && adminNotifications.length > 0 && (
          <div className="glass-card mb-20" style={{ borderLeft: '4px solid #e53e3e', background: 'rgba(229, 62, 62, 0.05)' }}>
            <h4 style={{ color: '#e53e3e', marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
              ⚠️ High Plagiarism Alerts ({adminNotifications.length})
            </h4>
            <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: '#cbd5e0' }}>
              {adminNotifications.slice(0, 3).map((notif, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  Student <strong>{notif.user?.name || 'Candidate'}</strong> flagged at <strong>{notif.plagiarismPercentage}%</strong> similarity on question "{notif.question?.title}".
                </li>
              ))}
            </ul>
          </div>
        )}
        <div
          className="question-bank-container"
          ref={containerRef}
          style={{ display: 'flex', gap: '0' }}
        >
          {user?.role === 'admin' ? (
            <>
              {/* LEFT COLUMN: Questions List & Filters */}
              <div className="qb-left-pane" style={{ width: `${splitWidth}%`, flexShrink: 0, paddingRight: '15px' }}>
                <div className="qb-pane-header">
                  <h2>Question Bank</h2>
                  <p>Admin Added Coding Tasks</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '15px' }}>
                  <button className="btn btn-primary btn-block" onClick={handleCreateClick} style={{ margin: 0 }}>
                    + Single Add
                  </button>
                  <button className="btn btn-accent btn-block" onClick={() => setShowBulkModal(true)} style={{ margin: 0 }}>
                    📥 Bulk Import
                  </button>
                </div>

                <div className="qb-search-box">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchQuestions()}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <select className="form-control" value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
                      <option value="">All Difficulties</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                    <select className="form-control" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
                      <option value="">All Topics</option>
                      <option value="Array">Array</option>
                      <option value="Linked List">Linked List</option>
                      <option value="Stack">Stack</option>
                      <option value="Tree">Tree</option>
                      <option value="Math">Math</option>
                    </select>
                  </div>
                </div>

                <div className="qb-list">
                  {loadingQuestions ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <div className="spinner-loader"></div>
                    </div>
                  ) : questions.length > 0 ? (
                    questions.map((q) => (
                      <div
                        key={q._id}
                        className={`glass-card qb-card ${selectedQuestion?._id === q._id ? 'active' : ''}`}
                        onClick={() => handleSelectQuestion(q)}
                      >
                        <span className={`status-indicator ${q.isActive ? 'active' : 'inactive'}`}></span>
                        <div className="qb-card-title">{q.title}</div>
                        <div className="qb-card-meta">
                          <span className={`diff-pill ${(q.difficulty || 'Easy').toLowerCase()}`}>
                            {q.difficulty || 'Easy'}
                          </span>
                          {(q.tags || []).slice(0, 2).map((t, idx) => (
                            <span key={idx} className="tag-pill">{t}</span>
                          ))}
                          <span className="qb-card-id" style={{ marginLeft: 'auto' }}>
                            ID: {q._id.substring(q._id.length - 4).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                      No questions match your query.
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`qb-divider ${isDragging ? 'dragging' : ''}`}
                onMouseDown={handleDividerMouseDown}
              />

              {/* RIGHT COLUMN: Problem Workspace & Coding Editor */}
              <div className="qb-center-pane" style={{ width: `${100 - splitWidth}%`, flexGrow: 1, paddingLeft: '15px' }}>
                {selectedQuestion ? (
                  <>
                    <div className="qb-problem-header">
                      <div className="qb-problem-title-section">
                        <h2>{selectedQuestion.title}</h2>
                        <div className="qb-problem-meta">
                          <span className={`diff-pill ${(selectedQuestion.difficulty || 'Easy').toLowerCase()}`}>
                            {selectedQuestion.difficulty || 'Easy'}
                          </span>
                          <span>•</span>
                          <span>Topic: {(selectedQuestion.tags || []).join(', ')}</span>
                          <span>•</span>
                          <span>Submissions: {submissionsList.length}</span>
                        </div>
                      </div>

                      <div className="qb-admin-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEditClick(selectedQuestion)}>
                          Edit Question
                        </button>
                        <button className="btn btn-sm" style={{ border: '1px solid #e53e3e', color: '#e53e3e' }} onClick={() => handleDeleteQuestion(selectedQuestion._id)}>
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="qb-tabs">
                      <button className="qb-tab-btn active">Problem Description</button>
                      <button className="qb-tab-btn" onClick={() => alert('Compiler settings: ' + selectedQuestion.timeLimit + 'ms time limit, ' + selectedQuestion.memoryLimit + 'MB memory limit.')}>
                        Constraints & Limits
                      </button>
                    </div>

                    <div className="qb-tab-content">
                      <div className="problem-description-text">
                        <p style={{ whiteSpace: 'pre-wrap' }}>{selectedQuestion.description}</p>

                        {selectedQuestion.inputFormat && (
                          <>
                            <div className="problem-section-title">Input Format</div>
                            <p>{selectedQuestion.inputFormat}</p>
                          </>
                        )}

                        {selectedQuestion.outputFormat && (
                          <>
                            <div className="problem-section-title">Output Format</div>
                            <p>{selectedQuestion.outputFormat}</p>
                          </>
                        )}

                        {selectedQuestion.sampleInput && (
                          <>
                            <div className="problem-section-title">Sample Input</div>
                            <div className="example-box">{selectedQuestion.sampleInput}</div>
                          </>
                        )}

                        {selectedQuestion.sampleOutput && (
                          <>
                            <div className="problem-section-title">Sample Output</div>
                            <div className="example-box">{selectedQuestion.sampleOutput}</div>
                          </>
                        )}

                        {selectedQuestion.explanation && (
                          <>
                            <div className="problem-section-title">Explanation</div>
                            <p>{selectedQuestion.explanation}</p>
                          </>
                        )}
                      </div>

                      {/* Code Editor Box */}
                      <div className="coding-editor-container">
                        <div className="editor-header-bar">
                          <span className="editor-header-title">Code Editor Workspace</span>
                          <select
                            className="form-control"
                            style={{ width: '130px', height: '32px', fontSize: '0.8rem', padding: '0 8px' }}
                            value={selectedLanguage}
                            onChange={(e) => changeLanguageTemplate(e.target.value)}
                          >
                            {ALL_CORER_LANGUAGES.map((lang) => (
                              <option key={lang.value} value={lang.value}>
                                {lang.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="editor-textarea-wrapper" style={{ height: '400px', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
                          <Editor
                            height="100%"
                            theme="vs-dark"
                            language={
                              selectedLanguage === 'cpp' ? 'cpp' :
                              selectedLanguage === 'python' ? 'python' :
                              selectedLanguage === 'java' ? 'java' :
                              selectedLanguage === 'c' ? 'c' :
                              selectedLanguage === 'typescript' ? 'typescript' :
                              selectedLanguage === 'sql' ? 'sql' :
                              selectedLanguage === 'mysql' ? 'mysql' :
                              selectedLanguage === 'postgresql' ? 'sql' :
                              selectedLanguage === 'html' ? 'html' :
                              selectedLanguage === 'javascript' ? 'javascript' : 'javascript'
                            }
                            value={solutionCode}
                            onChange={(value) => setSolutionCode(value || '')}
                            options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              automaticLayout: true,
                              scrollBeyondLastLine: false,
                              lineNumbers: 'on',
                              tabSize: 4,
                              padding: { top: 10, bottom: 10 }
                            }}
                          />
                        </div>

                        <div className="editor-actions-bar">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => changeLanguageTemplate(selectedLanguage)}
                          >
                            Reset Code
                          </button>

                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              className={`btn btn-secondary btn-sm ${runningCode ? 'loading' : ''}`}
                              onClick={handleRunCode}
                              disabled={runningCode || submittingCode}
                            >
                              {runningCode ? 'Running...' : 'Run Code'}
                            </button>
                            <button
                              className={`btn btn-primary btn-sm ${submittingCode ? 'loading' : ''}`}
                              onClick={handleSubmitCode}
                              disabled={runningCode || submittingCode}
                            >
                              {submittingCode ? 'Submitting...' : 'Submit Solution'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Web Development Live Preview System */}
                      {['html', 'css', 'reactjs', 'expressjs', 'javascript', 'typescript'].includes(selectedLanguage) && (
                        <div className="glass-card mb-20" style={{ padding: '20px', marginTop: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(15, 23, 42, 0.4)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>🌐</span> Live Web Development Preview Runtime
                            </h4>
                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', borderRadius: '12px', fontWeight: 'bold' }}>
                              Interactive Sandbox: On
                            </span>
                          </div>

                          <p style={{ fontSize: '0.8rem', color: '#a0aec0', marginBottom: '15px' }}>
                            This workspace compiles and runs your code in a real-time web rendering frame. Use HTML/inline styles/scripts to see instant outputs.
                          </p>

                          <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', height: '280px', border: '2px solid #2d3748', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}>
                            <iframe
                              srcDoc={selectedLanguage === 'html' ? solutionCode : `
                                <html>
                                  <head>
                                    <style>
                                      body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
                                      ${selectedLanguage === 'css' ? solutionCode : ''}
                                    </style>
                                  </head>
                                  <body>
                                    <div id="root">
                                      <h3>Web Development Output</h3>
                                      <p>Code type: <strong>${selectedLanguage.toUpperCase()}</strong></p>
                                      ${selectedLanguage === 'html' ? '' : '<div id="output" style="font-family: monospace; background: #1e293b; padding: 10px; border-radius: 4px; color: #38bdf8; min-width: 250px;">Evaluating environment...</div>'}
                                    </div>
                                    <script>
                                      try {
                                        const originalLog = console.log;
                                        console.log = (...args) => {
                                          const out = document.getElementById("output");
                                          if (out) out.innerText = args.join(" ");
                                          originalLog(...args);
                                        };
                                        ${selectedLanguage === 'javascript' ? solutionCode : ''}
                                      } catch (err) {
                                        const out = document.getElementById("output");
                                        if (out) {
                                          out.style.color = "#ef4444";
                                          out.innerText = "Error: " + err.message;
                                        }
                                      }
                                    </script>
                                  </body>
                                </html>
                              `}
                              title="Web Dev Live Simulation"
                              sandbox="allow-scripts"
                              style={{ width: '100%', height: '100%', border: 'none', background: selectedLanguage === 'html' ? '#fff' : '#0f172a' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Output Panel */}
                      {executionOutput && (
                        <div className="glass-card" style={{ padding: '15px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <h4 style={{ marginBottom: '10px', color: '#fff', fontSize: '0.95rem' }}>Execution Console</h4>

                          {executionOutput.error ? (
                            <div style={{ color: '#e53e3e', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                              ❌ Error: {executionOutput.error}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.85rem' }}>
                              <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                                <div>
                                  Status:{' '}
                                  <strong
                                    style={{
                                      color: executionOutput.status === 'Accepted' ? '#48bb78' : '#e53e3e'
                                    }}
                                  >
                                    {executionOutput.status}
                                  </strong>
                                </div>
                                <div>
                                  Passed: <strong>{executionOutput.passedTestCasesCount}</strong>
                                </div>
                                <div>
                                  Failed: <strong>{executionOutput.failedTestCasesCount}</strong>
                                </div>
                                {executionOutput.executionTime !== undefined && (
                                  <div>
                                    Time: <strong>{executionOutput.executionTime} ms</strong>
                                  </div>
                                )}
                              </div>

                              {executionOutput.results && executionOutput.results.slice(0, 3).map((res, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '8px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '4px',
                                    marginBottom: '8px',
                                    borderLeft: `3px solid ${res.passed ? '#48bb78' : '#e53e3e'}`
                                  }}
                                >
                                  <div style={{ fontSize: '0.8rem', color: '#a0aec0', fontFamily: 'monospace' }}>
                                    Input: {res.input}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#cbd5e0', fontFamily: 'monospace' }}>
                                    Expected: {res.expectedOutput.trim()}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: '#fff', fontFamily: 'monospace' }}>
                                    Actual: {res.actualOutput.trim()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#718096', padding: '100px 0' }}>
                    Select a question from the left sidebar to start.
                  </div>
                )}
              </div>
            </>
          ) : (
            // ==========================================
            // STUDENT TWO-PANE WORKFLOW STATES
            // ==========================================
            <>
              {studentViewState === 'browse' && (
                <>
                  {/* LEFT PANE: Question Selection List */}
                  <div className="qb-left-pane" style={{ width: `${splitWidth}%`, flexShrink: 0, flexGrow: 0, paddingRight: '15px' }}>
                    <div className="qb-pane-header">
                      <h2>Question Bank</h2>
                      <p>Admin Added Coding Tasks</p>
                    </div>

                    <div className="qb-search-box">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search questions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchQuestions()}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <select className="form-control" value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
                          <option value="">All Difficulties</option>
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                        <select className="form-control" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
                          <option value="">All Topics</option>
                          <option value="Array">Array</option>
                          <option value="Linked List">Linked List</option>
                          <option value="Stack">Stack</option>
                          <option value="Tree">Tree</option>
                          <option value="Math">Math</option>
                        </select>
                      </div>
                    </div>

                    <div className="qb-list">
                      {loadingQuestions ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <div className="spinner-loader"></div>
                        </div>
                      ) : questions.length > 0 ? (
                        questions.map((q) => (
                          <div
                            key={q._id}
                            className={`glass-card qb-card ${selectedQuestion?._id === q._id ? 'active' : ''}`}
                            onClick={() => handleSelectQuestion(q)}
                          >
                            <div className="qb-card-title">{q.title}</div>
                            <div className="qb-card-meta">
                              <span className={`diff-pill ${(q.difficulty || 'Easy').toLowerCase()}`}>
                                {q.difficulty || 'Easy'}
                              </span>
                              {(q.tags || []).slice(0, 2).map((t, idx) => (
                                <span key={idx} className="tag-pill">{t}</span>
                              ))}
                              <span className="qb-card-id" style={{ marginLeft: 'auto' }}>
                                ID: {q._id.substring(q._id.length - 4).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', color: '#718096', padding: '20px' }}>
                          No questions match your query.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drag adjustment bar */}
                  <div
                    className={`qb-divider ${isDragging ? 'dragging' : ''}`}
                    onMouseDown={handleDividerMouseDown}
                  />

                  {/* RIGHT PANE: Selected Question Information */}
                  <div className="qb-center-pane" style={{ width: `${100 - splitWidth}%`, flexGrow: 1, paddingLeft: '15px' }}>
                    {selectedQuestion ? (
                      <>
                        <div className="qb-problem-header">
                          <div className="qb-problem-title-section">
                            <h2>{selectedQuestion.title}</h2>
                            <div className="qb-problem-meta">
                              <span className={`diff-pill ${(selectedQuestion.difficulty || 'Easy').toLowerCase()}`}>
                                {selectedQuestion.difficulty || 'Easy'}
                              </span>
                              <span>•</span>
                              <span>Topic: {(selectedQuestion.tags || []).join(', ')}</span>
                              <span>•</span>
                              <span>Submissions: {submissionsList.length}</span>
                            </div>
                          </div>
                        </div>

                        <div className="qb-tabs">
                          <button className="qb-tab-btn active">Problem Description</button>
                          <button className="qb-tab-btn" onClick={() => alert('Compiler settings: ' + selectedQuestion.timeLimit + 'ms time limit, ' + selectedQuestion.memoryLimit + 'MB memory limit.')}>
                            Constraints & Limits
                          </button>
                        </div>

                        <div className="qb-tab-content">
                          <div className="problem-description-text">
                            <p style={{ whiteSpace: 'pre-wrap' }}>{selectedQuestion.description}</p>

                            {selectedQuestion.inputFormat && (
                              <>
                                <div className="problem-section-title">Input Format</div>
                                <p>{selectedQuestion.inputFormat}</p>
                              </>
                            )}

                            {selectedQuestion.outputFormat && (
                              <>
                                <div className="problem-section-title">Output Format</div>
                                <p>{selectedQuestion.outputFormat}</p>
                              </>
                            )}

                            {selectedQuestion.sampleInput && (
                              <>
                                <div className="problem-section-title">Sample Input</div>
                                <div className="example-box">{selectedQuestion.sampleInput}</div>
                              </>
                            )}

                            {selectedQuestion.sampleOutput && (
                              <>
                                <div className="problem-section-title">Sample Output</div>
                                <div className="example-box">{selectedQuestion.sampleOutput}</div>
                              </>
                            )}

                            {selectedQuestion.explanation && (
                              <>
                                <div className="problem-section-title">Explanation</div>
                                <p>{selectedQuestion.explanation}</p>
                              </>
                            )}
                          </div>

                          <button
                            className="btn btn-primary solve-btn-cta"
                            onClick={() => {
                              setStudentViewState('coding');
                              setSplitWidth(45);
                            }}
                            style={{
                              marginTop: '25px',
                              padding: '14px',
                              fontSize: '1.05rem',
                              fontWeight: 'bold',
                              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                              borderRadius: '8px',
                              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                              width: '100%',
                              cursor: 'pointer'
                            }}
                          >
                            Solve Challenge & Write Code ➜
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#718096', padding: '100px 0' }}>
                        Select a question from the left sidebar to start.
                      </div>
                    )}
                  </div>
                </>
              )}

              {studentViewState === 'coding' && (
                <>
                  {/* LEFT PANE: Question description details */}
                  <div className="qb-center-pane" style={{ width: `${splitWidth}%`, flexShrink: 0, flexGrow: 0, paddingRight: '15px' }}>
                    {selectedQuestion && (
                      <>
                        <div style={{ marginBottom: '15px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setStudentViewState('browse');
                              setSplitWidth(30);
                            }}
                            style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                          >
                            ← Back to Questions
                          </button>
                        </div>

                        <div className="qb-problem-header">
                          <div className="qb-problem-title-section">
                            <h2>{selectedQuestion.title}</h2>
                            <div className="qb-problem-meta">
                              <span className={`diff-pill ${(selectedQuestion.difficulty || 'Easy').toLowerCase()}`}>
                                {selectedQuestion.difficulty || 'Easy'}
                              </span>
                              <span>•</span>
                              <span>Topic: {(selectedQuestion.tags || []).join(', ')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="qb-tab-content">
                          <div className="problem-description-text" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', paddingRight: '10px' }}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{selectedQuestion.description}</p>

                            {selectedQuestion.inputFormat && (
                              <>
                                <div className="problem-section-title">Input Format</div>
                                <p>{selectedQuestion.inputFormat}</p>
                              </>
                            )}

                            {selectedQuestion.outputFormat && (
                              <>
                                <div className="problem-section-title">Output Format</div>
                                <p>{selectedQuestion.outputFormat}</p>
                              </>
                            )}

                            {selectedQuestion.sampleInput && (
                              <>
                                <div className="problem-section-title">Sample Input</div>
                                <div className="example-box">{selectedQuestion.sampleInput}</div>
                              </>
                            )}

                            {selectedQuestion.sampleOutput && (
                              <>
                                <div className="problem-section-title">Sample Output</div>
                                <div className="example-box">{selectedQuestion.sampleOutput}</div>
                              </>
                            )}

                            {selectedQuestion.explanation && (
                              <>
                                <div className="problem-section-title">Explanation</div>
                                <p>{selectedQuestion.explanation}</p>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Drag adjustment bar */}
                  <div
                    className={`qb-divider ${isDragging ? 'dragging' : ''}`}
                    onMouseDown={handleDividerMouseDown}
                  />

                  {/* RIGHT PANE: Code Editor workspace */}
                  <div className="qb-center-pane" style={{ width: `${100 - splitWidth}%`, flexGrow: 1, paddingLeft: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="editor-header-title" style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>Editor Workspace</span>
                      {submissionsList.length > 0 && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setStudentViewState('submissions');
                            setSplitWidth(45);
                          }}
                          style={{ padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          View My Submissions History ➜
                        </button>
                      )}
                    </div>

                    <div className="coding-editor-container">
                      <div className="editor-header-bar">
                        <span className="editor-header-title">Code Editor Workspace</span>
                        <select
                          className="form-control"
                          style={{ width: '130px', height: '32px', fontSize: '0.8rem', padding: '0 8px' }}
                          value={selectedLanguage}
                          onChange={(e) => changeLanguageTemplate(e.target.value)}
                        >
                          {ALL_CORER_LANGUAGES.map((lang) => (
                            <option key={lang.value} value={lang.value}>
                              {lang.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="editor-textarea-wrapper" style={{ height: '400px', border: '1px solid #334155', borderRadius: '6px', overflow: 'hidden' }}>
                        <Editor
                          height="100%"
                          theme="vs-dark"
                          language={
                            selectedLanguage === 'cpp' ? 'cpp' :
                            selectedLanguage === 'python' ? 'python' :
                            selectedLanguage === 'java' ? 'java' :
                            selectedLanguage === 'c' ? 'c' :
                            selectedLanguage === 'typescript' ? 'typescript' :
                            selectedLanguage === 'sql' ? 'sql' :
                            selectedLanguage === 'mysql' ? 'mysql' :
                            selectedLanguage === 'postgresql' ? 'sql' :
                            selectedLanguage === 'html' ? 'html' :
                            selectedLanguage === 'javascript' ? 'javascript' : 'javascript'
                          }
                          value={solutionCode}
                          onChange={(value) => setSolutionCode(value || '')}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                            lineNumbers: 'on',
                            tabSize: 4,
                            padding: { top: 10, bottom: 10 }
                          }}
                        />
                      </div>

                      <div className="editor-actions-bar">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => changeLanguageTemplate(selectedLanguage)}
                        >
                          Reset Code
                        </button>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className={`btn btn-secondary btn-sm ${runningCode ? 'loading' : ''}`}
                            onClick={handleRunCode}
                            disabled={runningCode || submittingCode}
                          >
                            {runningCode ? 'Running...' : 'Run Code'}
                          </button>
                          <button
                            className={`btn btn-primary btn-sm ${submittingCode ? 'loading' : ''}`}
                            onClick={handleSubmitCode}
                            disabled={runningCode || submittingCode}
                          >
                            {submittingCode ? 'Submitting...' : 'Submit Solution'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Web Development Live Preview System */}
                    {['html', 'css', 'reactjs', 'expressjs', 'javascript', 'typescript'].includes(selectedLanguage) && (
                      <div className="glass-card mb-20" style={{ padding: '20px', marginTop: '20px', border: '1px solid rgba(99, 102, 241, 0.2)', background: 'rgba(15, 23, 42, 0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h4 style={{ color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🌐</span> Live Web Development Preview Runtime
                          </h4>
                          <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', borderRadius: '12px', fontWeight: 'bold' }}>
                            Interactive Sandbox: On
                          </span>
                        </div>

                        <p style={{ fontSize: '0.8rem', color: '#a0aec0', marginBottom: '15px' }}>
                          This workspace compiles and runs your code in a real-time web rendering frame. Use HTML/inline styles/scripts to see instant outputs.
                        </p>

                        <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', height: '280px', border: '2px solid #2d3748', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}>
                          <iframe
                            srcDoc={selectedLanguage === 'html' ? solutionCode : `
                              <html>
                                <head>
                                  <style>
                                    body { background: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
                                    ${selectedLanguage === 'css' ? solutionCode : ''}
                                  </style>
                                </head>
                                <body>
                                  <div id="root">
                                    <h3>Web Development Output</h3>
                                    <p>Code type: <strong>${selectedLanguage.toUpperCase()}</strong></p>
                                    ${selectedLanguage === 'html' ? '' : '<div id="output" style="font-family: monospace; background: #1e293b; padding: 10px; border-radius: 4px; color: #38bdf8; min-width: 250px;">Evaluating environment...</div>'}
                                  </div>
                                  <script>
                                    try {
                                      const originalLog = console.log;
                                      console.log = (...args) => {
                                        const out = document.getElementById("output");
                                        if (out) out.innerText = args.join(" ");
                                        originalLog(...args);
                                      };
                                      ${selectedLanguage === 'javascript' ? solutionCode : ''}
                                    } catch (err) {
                                      const out = document.getElementById("output");
                                      if (out) {
                                        out.style.color = "#ef4444";
                                        out.innerText = "Error: " + err.message;
                                      }
                                    }
                                  </script>
                                </body>
                              </html>
                            `}
                            title="Web Dev Live Simulation"
                            sandbox="allow-scripts"
                            style={{ width: '100%', height: '100%', border: 'none', background: selectedLanguage === 'html' ? '#fff' : '#0f172a' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Output Panel */}
                    {executionOutput && (
                      <div className="glass-card" style={{ padding: '15px', border: '1px solid rgba(255,255,255,0.08)', marginTop: '15px' }}>
                        <h4 style={{ marginBottom: '10px', color: '#fff', fontSize: '0.95rem' }}>Execution Console</h4>

                        {executionOutput.error ? (
                          <div style={{ color: '#e53e3e', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                            ❌ Error: {executionOutput.error}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                              <div>
                                Status:{' '}
                                <strong
                                  style={{
                                    color: executionOutput.status === 'Accepted' ? '#48bb78' : '#e53e3e'
                                  }}
                                >
                                  {executionOutput.status}
                                </strong>
                              </div>
                              <div>
                                Passed: <strong>{executionOutput.passedTestCasesCount}</strong>
                              </div>
                              <div>
                                Failed: <strong>{executionOutput.failedTestCasesCount}</strong>
                              </div>
                              {executionOutput.executionTime !== undefined && (
                                <div>
                                  Time: <strong>{executionOutput.executionTime} ms</strong>
                                </div>
                              )}
                            </div>

                            {executionOutput.results && executionOutput.results.slice(0, 3).map((res, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '8px',
                                  background: 'rgba(255,255,255,0.02)',
                                  borderRadius: '4px',
                                  marginBottom: '8px',
                                  borderLeft: `3px solid ${res.passed ? '#48bb78' : '#e53e3e'}`
                                }}
                              >
                                <div style={{ fontSize: '0.8rem', color: '#a0aec0', fontFamily: 'monospace' }}>
                                  Input: {res.input}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#cbd5e0', fontFamily: 'monospace' }}>
                                  Expected: {res.expectedOutput.trim()}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#fff', fontFamily: 'monospace' }}>
                                  Actual: {res.actualOutput.trim()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {studentViewState === 'submissions' && (
                <>
                  {/* LEFT PANE: Submitted Code Snippet */}
                  <div className="qb-center-pane" style={{ width: `${splitWidth}%`, flexShrink: 0, flexGrow: 0, paddingRight: '15px' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setStudentViewState('coding');
                          setSplitWidth(45);
                        }}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        ← Back to Code Editor
                      </button>
                    </div>

                    <div className="qb-problem-header" style={{ marginBottom: '15px' }}>
                      <div className="qb-problem-title-section">
                        <h2>Submitted Code Solution</h2>
                        <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginTop: '4px' }}>
                          Language: <strong>{(lastSubmittedLanguage || selectedLanguage).toUpperCase()}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="coding-editor-container" style={{ padding: '12px', background: '#11111b' }}>
                      <pre style={{
                        margin: 0,
                        padding: '15px',
                        background: '#1e1e2e',
                        borderRadius: '6px',
                        color: '#cdd6f4',
                        fontFamily: 'Consolas, Monaco, monospace',
                        fontSize: '0.85rem',
                        lineHeight: '1.5',
                        maxHeight: 'calc(100vh - 280px)',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        <code>{lastSubmittedCode || solutionCode || '// No submission recorded.'}</code>
                      </pre>
                    </div>
                  </div>

                  {/* Drag adjustment bar */}
                  <div
                    className={`qb-divider ${isDragging ? 'dragging' : ''}`}
                    onMouseDown={handleDividerMouseDown}
                  />

                  {/* RIGHT PANE: My Submissions dashboard history */}
                  <div className="qb-right-pane" style={{ width: `${100 - splitWidth}%`, flexGrow: 1, paddingLeft: '15px' }}>
                    <div className="qb-tabs">
                      <button className="qb-tab-btn active">My Submissions</button>
                      <button className="qb-tab-btn" onClick={() => setStudentViewState('coding')}>Write Code</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                      <div className="glass-card" style={{ padding: '10px', overflowX: 'auto' }}>
                        <table className="submission-report-table">
                          <thead>
                            <tr>
                              <th>Language</th>
                              <th>Status</th>
                              <th>Score</th>
                              <th>Plagiarism</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {submissionsList.length > 0 ? (
                              submissionsList.map((sub) => (
                                <tr key={sub._id}>
                                  <td>{sub.language.toUpperCase()}</td>
                                  <td style={{ color: sub.status === 'Accepted' ? '#48bb78' : '#e53e3e', fontWeight: '600' }}>
                                    {sub.status}
                                  </td>
                                  <td>{sub.totalScore}%</td>
                                  <td>
                                    <span
                                      className="plagiarism-badge"
                                      data-risk={
                                        sub.plagiarismPercentage > 60
                                          ? 'High'
                                          : sub.plagiarismPercentage > 30
                                            ? 'Moderate'
                                            : sub.plagiarismPercentage > 10
                                              ? 'Low'
                                              : 'Original'
                                      }
                                    >
                                      {sub.plagiarismPercentage}%
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-secondary btn-sm"
                                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                                      onClick={() => handleOpenDetailedReport(sub._id)}
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="5" style={{ textAlign: 'center', color: '#718096', padding: '15px' }}>
                                  No submissions recorded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {detailedReport && (
                        <div className="glass-card detailed-report-box animate-fade">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ color: '#fff', fontSize: '0.95rem' }}>
                              Submission Details
                            </h4>
                          </div>

                          <div className="similarity-meter-container">
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#a0aec0' }}>Plagiarism Score</div>
                              <span className="similarity-value" style={{ color: detailedReport.report?.plagiarismPercentage > 40 ? '#e53e3e' : '#48bb78' }}>
                                {detailedReport.report?.plagiarismPercentage || 0}%
                              </span>
                            </div>
                            <span
                              className="plagiarism-badge"
                              data-risk={
                                detailedReport.report?.plagiarismPercentage > 60
                                  ? 'High'
                                  : detailedReport.report?.plagiarismPercentage > 30
                                    ? 'Moderate'
                                    : 'Original'
                              }
                            >
                              {detailedReport.report?.status || 'Original'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: '#cbd5e0' }}>
                            <strong>Tested Code language:</strong> {detailedReport.submission?.language?.toUpperCase()} | <strong>Date:</strong> {new Date(detailedReport.submission?.createdAt).toLocaleDateString()}
                          </div>

                          {detailedReport.report?.plagiarismPercentage > 40 && (
                            <div style={{ color: '#e53e3e', fontSize: '0.8rem', background: 'rgba(229, 62, 62, 0.1)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #e53e3e' }}>
                              ⚠️ Notice: This solution was flagged during administrative plagiarism screening due to matching other submissions.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ADMIN CREATE/EDIT QUESTION FORM OVERLAY */}
      {showCreateModal && (
        <div className="form-modal-overlay">
          <div className="form-modal-content glass-card">
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>
              {editingQuestion ? 'Modify Coding Challenge' : 'Publish New Coding Challenge'}
            </h3>

            {errorMsg && (
              <div className="error-banner" style={{ marginBottom: '15px' }}>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuestion}>
              <div className="form-group">
                <label className="form-label">Question Title</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Two Sum"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-control"
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="Array, Hash Table"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Problem Description</label>
                <textarea
                  className="form-control"
                  rows="4"
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Write clear problem statements..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Constraints</label>
                <input
                  type="text"
                  className="form-control"
                  value={formConstraints}
                  onChange={(e) => setFormConstraints(e.target.value)}
                  placeholder="e.g. 2 <= nums.length <= 10^4"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Input Format</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formInputFormat}
                    onChange={(e) => setFormInputFormat(e.target.value)}
                    placeholder="First line contains N..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Output Format</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formOutputFormat}
                    onChange={(e) => setFormOutputFormat(e.target.value)}
                    placeholder="Output indices..."
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Sample Input</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formSampleInput}
                    onChange={(e) => setFormSampleInput(e.target.value)}
                    placeholder="2 7 11 15\n9"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sample Output</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={formSampleOutput}
                    onChange={(e) => setFormSampleOutput(e.target.value)}
                    placeholder="[0, 1]"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Sample Explanation</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Because nums[0] + nums[1] == 9..."
                />
              </div>

              <div className="form-section-divider">Test Cases (JSON format)</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Visible Test Cases</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formVisibleTests}
                    onChange={(e) => setFormVisibleTests(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hidden Test Cases</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formHiddenTests}
                    onChange={(e) => setFormHiddenTests(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label className="form-label">Time Limit (ms)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formTimeLimit}
                    onChange={(e) => setFormTimeLimit(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Memory Limit (MB)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formMemoryLimit}
                    onChange={(e) => setFormMemoryLimit(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                  />
                  Activate Challenge immediately
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingQuestion ? 'Save Changes' : 'Publish Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ADMIN BULK UPLOAD QUESTIONS OVERLAY */}
      {showBulkModal && (
        <div className="form-modal-overlay">
          <div className="form-modal-content glass-card" style={{ maxWidth: '800px', width: '90%' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px' }}>
              Bulk Import Coding Challenges
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '15px' }}>
              Upload multiple questions instantly using CSV or JSON array representations.
            </p>

            {bulkError && (
              <div className="error-banner" style={{ marginBottom: '15px' }}>
                <span>{bulkError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Upload Format</label>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                  <input
                    type="radio"
                    name="bulkType"
                    checked={bulkInputType === 'json'}
                    onChange={() => { setBulkInputType('json'); setBulkError(''); }}
                  />
                  JSON Array
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}>
                  <input
                    type="radio"
                    name="bulkType"
                    checked={bulkInputType === 'csv'}
                    onChange={() => { setBulkInputType('csv'); setBulkError(''); }}
                  />
                  CSV Format
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Input Data Payload</label>
              <textarea
                className="form-control"
                rows="8"
                style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', color: '#cbd5e0' }}
                placeholder={
                  bulkInputType === 'json'
                    ? '[\n  {\n    "title": "Two Sum",\n    "difficulty": "Easy",\n    "description": "Given an array...",\n    "tags": ["Array", "Math"]\n  }\n]'
                    : 'title,difficulty,description,tags\n"Two Sum",Easy,"Given an array...",Array;Math'
                }
                value={bulkQuestionsInput}
                onChange={(e) => setBulkQuestionsInput(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handlePreviewBulkQuestions}>
                🔍 Run Parse Preview
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (bulkInputType === 'json') {
                    setBulkQuestionsInput(JSON.stringify([
                      {
                        title: "Short Reverse List",
                        difficulty: "Medium",
                        description: "Reverse a linked list range.",
                        constraints: "N <= 1000",
                        inputFormat: "Head node list",
                        outputFormat: "Reversed list node",
                        sampleInput: "1 2 3 4 5",
                        sampleOutput: "5 4 3 2 1",
                        explanation: "All nodes are reversed.",
                        tags: ["Linked List", "Recursion"],
                        timeLimit: 2000,
                        memoryLimit: 256
                      }
                    ], null, 2));
                  } else {
                    setBulkQuestionsInput(`title,difficulty,description,constraints,inputFormat,outputFormat,sampleInput,sampleOutput,explanation,tags,timeLimit,memoryLimit\n"Custom Peak Element",Medium,"Find maximum peak element.","N <= 50","Array string","Peak value","1 3 20 4 1 0",20,"20 is greater than neighbors.",Array;binary-search,2000,256`);
                  }
                }}
              >
                📝 Insert Template Example
              </button>
            </div>

            {/* Preview Section */}
            {bulkPreviewQuestions.length > 0 && (
              <div className="glass-card" style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '10px' }}>
                  Parsed Preview ({bulkPreviewQuestions.length} challenges found)
                </h4>
                <table className="student-roster-table" style={{ fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Difficulty</th>
                      <th>Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreviewQuestions.map((pq, idx) => (
                      <tr key={idx}>
                        <td><strong>{pq.title}</strong></td>
                        <td>
                          <span className={`status-badge-inline ${(pq.difficulty || 'Easy').toLowerCase()}`}>
                            {pq.difficulty}
                          </span>
                        </td>
                        <td>{pq.tags ? pq.tags.join(', ') : 'None'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkQuestionsInput('');
                  setBulkPreviewQuestions([]);
                  setBulkError('');
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={bulkPreviewQuestions.length === 0 || isSubmittingBulk}
                onClick={handlePostBulkQuestions}
              >
                {isSubmittingBulk ? 'Uploading batch…' : '✓ Confirm Batch Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionBank;
