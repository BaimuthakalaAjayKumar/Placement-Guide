import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import Editor from '@monaco-editor/react';
import './LabPractice.css';

const TEMPLATES = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Write your Lab Solution in C++ here
    cout << "Lab Exercise Output" << endl;
    return 0;
}`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your Lab Solution in Java here
        System.out.println("Lab Exercise Output");
    }
}`,
  python: `# Write your Lab Solution in Python here
def main():
    print("Lab Exercise Output")

if __name__ == "__main__":
    main()`,
  javascript: `// Write your Lab Solution in JavaScript here
console.log("Lab Exercise Output");`,
  c: `#include <stdio.h>

int main() {
    // Write your Lab Solution in C here
    printf("Lab Exercise Output\\n");
    return 0;
}`,
  sql: `-- Write your SQL Query here
SELECT * FROM table_name;`
};

const LANGUAGES = [
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'sql', label: 'SQL (Generic)' }
];

const LabPractice = () => {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isManager = user?.role === 'admin' || user?.role === 'faculty';

  // Task & data lists
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [message, setMessage] = useState('');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    instructions: '',
    subject: '',
    academicYear: '',
    branch: '',
    section: '',
    maxScore: 100,
    referenceSolution: '',
    solutionLanguage: 'cpp',
    referenceSolutions: {
      cpp: '',
      java: '',
      python: '',
      c: '',
      javascript: '',
      sql: ''
    }
  });
  const [activeTaskFormLang, setActiveTaskFormLang] = useState('cpp');

  // IDE Workspace state
  const [selectedTask, setSelectedTask] = useState(null);
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(TEMPLATES.cpp);
  const [report, setReport] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [stats, setStats] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('output'); // 'output' | 'input' | 'evaluation'
  const [evalResult, setEvalResult] = useState(null);

  // Reports state (for managers)
  const [reportsTask, setReportsTask] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selectedReviewAttempt, setSelectedReviewAttempt] = useState(null);

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Request failed');
    return data;
  };

  const load = async () => {
    try {
      const [tasksData, subjectsData] = await Promise.all([
        request(`${API_URL}/labs/tasks`),
        request(`${API_URL}/academic/subjects`)
      ]);
      setTasks(tasksData.data);
      setSubjects(subjectsData.data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const createTask = async (event) => {
    event.preventDefault();
    try {
      const primaryRef = taskForm.referenceSolutions?.[activeTaskFormLang] || Object.values(taskForm.referenceSolutions || {}).find(v => (v || '').trim()) || taskForm.referenceSolution || '';
      const payload = {
        ...taskForm,
        referenceSolution: primaryRef,
        solutionLanguage: activeTaskFormLang
      };
      await request(`${API_URL}/labs/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setTaskForm({
        title: '',
        instructions: '',
        subject: '',
        academicYear: '',
        branch: '',
        section: '',
        maxScore: 100,
        referenceSolution: '',
        solutionLanguage: 'cpp',
        referenceSolutions: {
          cpp: '',
          java: '',
          python: '',
          c: '',
          javascript: '',
          sql: ''
        }
      });
      setActiveTaskFormLang('cpp');
      setTaskFormOpen(false);
      setMessage('✅ Lab task successfully created with multi-language reference solutions.');
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Open IDE Workspace for a task
  const openPracticeIDE = (task) => {
    setSelectedTask(task);
    setReportsTask(null);

    // Smart initial language: check existing attempt, task reference language, or infer from code/subject
    let initialLang = task.myAttempt?.language || task.solutionLanguage || 'cpp';
    const existingCode = task.myAttempt?.code || task.myAttempt?.submission || '';

    if (existingCode) {
      if (/\b(create\s+(table|database)|select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|alter\s+table|use\s+[a-zA-Z0-9_]+;?)\b/i.test(existingCode)) {
        initialLang = 'sql';
      }
    } else if (task.subject?.name && /database|dbms|sql/i.test(task.subject.name)) {
      initialLang = 'sql';
    } else if (task.title && /database|dbms|sql/i.test(task.title)) {
      initialLang = 'sql';
    }

    setLanguage(initialLang);
    setCode(existingCode || TEMPLATES[initialLang] || '');
    setReport(task.myAttempt?.report || '');
    setInput('');
    setOutput('');
    setStats(null);

    if (task.myAttempt?.evaluationDetails || task.myAttempt?.score !== undefined) {
      setEvalResult({
        score: task.myAttempt.score,
        logicMatchPercentage: task.myAttempt.evaluationDetails?.logicMatchPercentage || 0,
        structuralMatch: task.myAttempt.evaluationDetails?.structuralMatch || 0,
        remarks: task.myAttempt.feedback || task.myAttempt.evaluationDetails?.remarks || '',
        plagiarismPercentage: task.myAttempt.plagiarismPercentage || 0,
        plagiarismStatus: task.myAttempt.plagiarismStatus || 'Original',
        matchedLines: task.myAttempt.matchedLines || [],
        isCorrect: task.myAttempt.evaluationDetails?.isCorrect
      });
      setActiveTab('evaluation');
    } else {
      setEvalResult(null);
      setActiveTab('output');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const isOldTemplate = Object.values(TEMPLATES).some((t) => t.trim() === code.trim());
    if (!code.trim() || isOldTemplate) {
      setCode(TEMPLATES[newLang] || '');
    }
  };

  // Run code on sandbox
  const handleRunCode = async () => {
    if (!code.trim()) {
      setOutput('Please write code in the editor before running.');
      setActiveTab('output');
      return;
    }
    try {
      setRunning(true);
      setActiveTab('output');
      setOutput('⚙️ Compiling and running code in execution sandbox...');
      setStats(null);

      const res = await fetch(`${API_URL}/questions/run-sandbox`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, language, input })
      });

      const data = await res.json();
      if (data.success) {
        if (data.error) {
          setOutput(`⚠️ Execution / Compilation Error:\n${data.error}\n\n${data.stdout || ''}`);
        } else {
          setOutput(data.stdout || '(Execution completed successfully with no output)');
        }
        setStats({
          timeMs: data.timeMs,
          memoryKb: data.memoryKb,
          status: data.status
        });
      } else {
        setOutput(`Server error: ${data.error || 'Failed to run code'}`);
      }
    } catch (err) {
      setOutput(`Connection error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  // Submit and evaluate code against faculty solution & plagiarism check
  const handleSubmitAttempt = async (e) => {
    if (e) e.preventDefault();
    if (!selectedTask) return;
    if (!code.trim()) {
      alert('Please enter your solution code before submitting.');
      return;
    }
    try {
      setSubmitting(true);

      // Auto-detect language if student code is SQL or Python
      let submitLang = language;
      if (/\b(create\s+(table|database)|select\s+.*from|insert\s+into|update\s+.*set|delete\s+from|alter\s+table|use\s+[a-zA-Z0-9_]+;?)\b/i.test(code)) {
        submitLang = 'sql';
        if (language !== 'sql') setLanguage('sql');
      } else if (/^\s*(import\s+(sys|os|numpy|math|pandas)|def\s+[a-zA-Z_]\w*\(|print\(|elif\s+)/m.test(code)) {
        submitLang = 'python';
        if (language !== 'python') setLanguage('python');
      }

      const data = await request(`${API_URL}/labs/tasks/${selectedTask._id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          code,
          submission: code,
          language: submitLang,
          report
        })
      });

      const evalData = data.evaluation || {};
      const plagData = data.plagiarism || {};
      const attemptData = data.data || {};

      setEvalResult({
        score: attemptData.score,
        logicMatchPercentage: evalData.logicMatchPercentage,
        structuralMatch: evalData.structuralMatch,
        remarks: attemptData.feedback || evalData.remarks,
        plagiarismPercentage: plagData.plagiarismPercentage ?? attemptData.plagiarismPercentage ?? 0,
        plagiarismStatus: plagData.status || attemptData.plagiarismStatus || 'Original',
        matchedLines: plagData.matchedLines || [],
        isCorrect: evalData.isCorrect
      });
      setActiveTab('evaluation');
      setMessage('🎉 Lab practice evaluated successfully! Results displayed below.');

      // Update local task state with myAttempt
      setTasks((prev) =>
        prev.map((t) => {
          if (t._id === selectedTask._id) {
            return { ...t, myAttempt: attemptData };
          }
          return t;
        })
      );
    } catch (error) {
      alert(`Submission error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Manager: View reports
  const loadReports = async (task) => {
    try {
      const data = await request(`${API_URL}/labs/tasks/${task._id}/reports`);
      setReportsTask(task);
      setSelectedTask(null);
      setAttempts(data.data);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const downloadReports = () => {
    if (!reportsTask) return;
    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Student', 'Email', 'Section', 'Language', 'Score', 'Logic Match %', 'Plagiarism %', 'Plagiarism Status', 'Matched Peer', 'Feedback', 'Submitted At'],
      ...attempts.map((a) => [
        a.student?.name,
        a.student?.email,
        a.student?.section,
        a.language || 'cpp',
        a.score,
        a.evaluationDetails?.logicMatchPercentage ? `${a.evaluationDetails.logicMatchPercentage}%` : 'N/A',
        a.plagiarismPercentage !== undefined ? `${a.plagiarismPercentage}%` : '0%',
        a.plagiarismStatus || 'Original',
        a.plagiarizedWith?.student?.name || a.plagiarizedWith?.studentName || 'None',
        a.feedback,
        new Date(a.updatedAt || a.createdAt).toLocaleString()
      ])
    ];
    const csv = rows.map((r) => r.map(escape).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportsTask.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_lab_report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header title="Interactive Lab Practice & Code Evaluation" />
      <div className="content-wrapper lab-practice-container animate-fade">
        {message && (
          <div className="lab-toast-banner">
            <span>{message}</span>
            <button className="lab-banner-close" onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {/* ===================== VIEW 1: IDE WORKSPACE ===================== */}
        {selectedTask ? (
          <div className="lab-ide-workspace animate-fade">
            {/* Top Workspace Bar */}
            <div className="lab-ide-topbar glass-card">
              <div className="lab-topbar-row-1">
                <div className="lab-ide-meta">
                  <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTask(null)}>
                    ← Back to Lab Tasks
                  </button>
                  <div>
                    <h2 className="lab-ide-title">{selectedTask.title}</h2>
                    <div className="lab-ide-tags">
                      <span className="badge badge-subject">{selectedTask.subject?.name || 'Subject'}</span>
                      <span className="badge badge-scope">
                        {selectedTask.academicYear} {selectedTask.branch} {selectedTask.section}
                      </span>
                      <span className="badge badge-maxscore">Max: {selectedTask.maxScore || 100} pts</span>
                      {selectedTask.solutionLanguage && (
                        <span className="badge badge-faculty-lang">
                          Reference: {selectedTask.solutionLanguage.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lab-topbar-row-2">
                <div className="lang-picker-wrap">
                  <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    💻 Select Language:
                  </label>
                  <select
                    className="lab-lang-select"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lab-ide-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCode(TEMPLATES[language] || '')}
                    title="Reset code to default template"
                  >
                    ↺ Reset Code
                  </button>
                  <button
                    className="btn btn-primary btn-sm btn-run"
                    onClick={handleRunCode}
                    disabled={running || submitting}
                  >
                    {running ? '⚙️ Running...' : '▶ Run Code'}
                  </button>
                  <button
                    className="btn btn-success btn-sm btn-submit-eval"
                    onClick={handleSubmitAttempt}
                    disabled={running || submitting}
                  >
                    {submitting ? '⏳ Evaluating...' : '🚀 Evaluate & Submit'}
                  </button>
                </div>
              </div>
            </div>

            {/* Split Screen Panels */}
            <div className="lab-ide-split">
              {/* Left Column: Problem & Evaluation Info */}
              <div className="lab-instructions-panel glass-card">
                <div className="panel-section">
                  <h3>📋 Problem Statement & Instructions</h3>
                  <div className="task-instructions-content">
                    {selectedTask.instructions}
                  </div>
                </div>

                {/* Previous / Current Attempt Status Card */}
                {selectedTask.myAttempt && (
                  <div className="panel-section lab-my-attempt-summary">
                    <h4>📌 Submission Status</h4>
                    <div className="attempt-stat-row">
                      <span>Status:</span>
                      <strong className="text-success">Submitted</strong>
                    </div>
                    <div className="attempt-stat-row">
                      <span>Score:</span>
                      <strong>{selectedTask.myAttempt.score ?? 'N/A'} / {selectedTask.maxScore || 100}</strong>
                    </div>
                    {selectedTask.myAttempt.evaluationDetails?.logicMatchPercentage !== undefined && (
                      <div className="attempt-stat-row">
                        <span>Logic Match:</span>
                        <span className="badge badge-match">
                          {selectedTask.myAttempt.evaluationDetails.logicMatchPercentage}%
                        </span>
                      </div>
                    )}
                    {selectedTask.myAttempt.plagiarismPercentage !== undefined && (
                      <div className="attempt-stat-row">
                        <span>Plagiarism Check:</span>
                        <span
                          className={`badge ${
                            selectedTask.myAttempt.plagiarismPercentage > 40
                              ? 'badge-flagged'
                              : selectedTask.myAttempt.plagiarismPercentage > 20
                              ? 'badge-warning'
                              : 'badge-clean'
                          }`}
                        >
                          {selectedTask.myAttempt.plagiarismStatus || 'Checked'} ({selectedTask.myAttempt.plagiarismPercentage}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Lab Report Notes */}
                <div className="panel-section">
                  <h4>📝 Lab Report / Experiment Notes (Optional)</h4>
                  <textarea
                    className="form-control lab-report-textarea"
                    placeholder="Provide experiment observations, algorithm complexity, or notes here..."
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="panel-section eval-hint-box">
                  <small>
                    💡 <strong>Automated Logic Evaluation:</strong> Your code is evaluated against the faculty reference
                    solution using AST and token logic normalization. You may use any variable or function names and
                    your choice of programming language!
                  </small>
                </div>
              </div>

              {/* Right Column: Monaco Code Editor + Output / Input / Evaluation */}
              <div className="lab-editor-column">
                <div className="lab-editor-card glass-card">
                  <Editor
                    height="420px"
                    theme={theme === 'light' ? 'light' : 'vs-dark'}
                    language={language === 'c' || language === 'cpp' ? 'cpp' : language}
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                      tabSize: 4,
                      padding: { top: 12, bottom: 12 }
                    }}
                  />
                </div>

                {/* Bottom Panels (Output / Input / Evaluation) */}
                <div className="lab-bottom-panel glass-card">
                  <div className="lab-tabs-header">
                    <button
                      className={`lab-tab-btn ${activeTab === 'output' ? 'active' : ''}`}
                      onClick={() => setActiveTab('output')}
                    >
                      💻 Console Output {stats && `(${stats.timeMs}ms)`}
                    </button>
                    <button
                      className={`lab-tab-btn ${activeTab === 'input' ? 'active' : ''}`}
                      onClick={() => setActiveTab('input')}
                    >
                      📥 Standard Input (stdin)
                    </button>
                    <button
                      className={`lab-tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
                      onClick={() => setActiveTab('evaluation')}
                    >
                      🎯 Evaluation & Plagiarism Results {evalResult && `(${evalResult.score} pts)`}
                    </button>
                  </div>

                  <div className="lab-tab-body">
                    {/* Tab 1: Terminal Output */}
                    {activeTab === 'output' && (
                      <div className="lab-output-view">
                        <div className="output-stats-bar">
                          {stats ? (
                            <span>⚡ Runtime: {stats.timeMs}ms | 💾 Memory: {stats.memoryKb}KB | Status: {stats.status}</span>
                          ) : (
                            <span>Execution Terminal</span>
                          )}
                        </div>
                        <pre
                          className="lab-terminal-pre"
                          style={{
                            background: theme === 'light' ? '#f8fafc' : '#040b16',
                            color: output.includes('Error:') ? '#ef4444' : theme === 'light' ? '#0f172a' : '#38bdf8'
                          }}
                        >
                          {output || '// Click "Run Code" above to execute your solution in the secure sandbox.'}
                        </pre>
                      </div>
                    )}

                    {/* Tab 2: Custom Stdin */}
                    {activeTab === 'input' && (
                      <div className="lab-input-view">
                        <textarea
                          className="form-control lab-stdin-textarea"
                          placeholder="Provide custom input arguments line-by-line (e.g., test numbers, strings)..."
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          rows={5}
                        />
                      </div>
                    )}

                    {/* Tab 3: Evaluation & Plagiarism Card */}
                    {activeTab === 'evaluation' && (
                      <div className="lab-eval-view">
                        {evalResult ? (
                          <div className="eval-result-card">
                            <div className="eval-result-header">
                              <div className="score-badge-box">
                                <span className="score-label">Score Earned</span>
                                <span className="score-number">
                                  {evalResult.score} <small>/ {selectedTask.maxScore || 100}</small>
                                </span>
                              </div>
                              <div className="match-badge-box">
                                <span className="match-label">Faculty Solution Logic Match</span>
                                <span className="match-number">{evalResult.logicMatchPercentage}%</span>
                                <div className="match-progress-track">
                                  <div
                                    className="match-progress-fill"
                                    style={{ width: `${Math.min(evalResult.logicMatchPercentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                              <div className="plag-badge-box">
                                <span className="plag-label">Peer Plagiarism Check</span>
                                <span
                                  className={`badge-plag ${
                                    evalResult.plagiarismPercentage > 40
                                      ? 'plag-high'
                                      : evalResult.plagiarismPercentage > 20
                                      ? 'plag-mid'
                                      : 'plag-clean'
                                  }`}
                                >
                                  {evalResult.plagiarismStatus} ({evalResult.plagiarismPercentage}%)
                                </span>
                                {evalResult.plagiarismPercentage > 40 && (
                                  <span className="plag-alert-tag">🚨 Alert sent to Faculty & Admin</span>
                                )}
                              </div>
                            </div>

                            <div className="eval-remarks-box">
                              <strong>Evaluator Feedback:</strong>
                              <p>{evalResult.remarks || 'Code successfully submitted and evaluated against faculty reference model.'}</p>
                            </div>

                            {evalResult.matchedLines && evalResult.matchedLines.length > 0 && (
                              <div className="eval-plag-matched-lines">
                                <strong>⚠️ Highly Similar Code Lines with Peer Submissions:</strong>
                                <pre>{evalResult.matchedLines.join('\n')}</pre>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="eval-empty-state">
                            <p>No evaluation recorded yet.</p>
                            <p className="text-secondary">
                              Click <strong>"🚀 Evaluate & Submit"</strong> above to run full AST logic matching against
                              the faculty reference solution and execute automatic peer plagiarism screening.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : reportsTask ? (
          /* ===================== VIEW 2: MANAGER REPORTS VIEW ===================== */
          <div className="lab-reports-view glass-card animate-fade">
            <div className="reports-view-header">
              <div>
                <button className="btn btn-secondary btn-sm" onClick={() => setReportsTask(null)}>
                  ← Back to Lab Tasks
                </button>
                <h2 style={{ marginTop: '10px' }}>{reportsTask.title} — Submission Reports</h2>
                <p className="text-secondary">
                  {reportsTask.subject?.name} · {reportsTask.academicYear} {reportsTask.branch} {reportsTask.section}
                </p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={downloadReports}
                disabled={!attempts.length}
              >
                📥 Export CSV Report
              </button>
            </div>

            <div className="table-responsive" style={{ marginTop: '20px' }}>
              <table className="table lab-reports-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Language</th>
                    <th>Score</th>
                    <th>Logic Match</th>
                    <th>Plagiarism</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((att) => {
                    const plagPercent = att.plagiarismPercentage || 0;
                    return (
                      <tr key={att._id}>
                        <td><strong>{att.student?.name || 'Student'}</strong></td>
                        <td>{att.student?.email}</td>
                        <td><code>{att.language || 'cpp'}</code></td>
                        <td>
                          <span className="badge badge-score">{att.score} / {reportsTask.maxScore || 100}</span>
                        </td>
                        <td>
                          {att.evaluationDetails?.logicMatchPercentage !== undefined ? (
                            <span className="badge badge-match">{att.evaluationDetails.logicMatchPercentage}%</span>
                          ) : (
                            <span className="text-secondary">—</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              plagPercent > 40
                                ? 'badge-flagged'
                                : plagPercent > 20
                                ? 'badge-warning'
                                : 'badge-clean'
                            }`}
                          >
                            {plagPercent > 40 ? '🚨 ' : plagPercent > 20 ? '⚠️ ' : '✅ '}
                            {plagPercent}% ({att.plagiarismStatus || 'Original'})
                          </span>
                        </td>
                        <td><span className="badge badge-scope">{att.status}</span></td>
                        <td>{new Date(att.updatedAt || att.createdAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedReviewAttempt(att)}
                          >
                            👁️ Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!attempts.length && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No students have submitted code for this task yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal for reviewing student submission */}
            {selectedReviewAttempt && (
              <div className="lab-modal-overlay" onClick={() => setSelectedReviewAttempt(null)}>
                <div className="lab-modal-dialog glass-card" onClick={(e) => e.stopPropagation()}>
                  <div className="lab-modal-header">
                    <h3>Review Submission — {selectedReviewAttempt.student?.name}</h3>
                    <button className="lab-banner-close" onClick={() => setSelectedReviewAttempt(null)}>×</button>
                  </div>
                  <div className="lab-modal-body">
                    <div className="modal-meta-grid">
                      <div><strong>Student:</strong> {selectedReviewAttempt.student?.name} ({selectedReviewAttempt.student?.email})</div>
                      <div><strong>Language:</strong> {selectedReviewAttempt.language}</div>
                      <div><strong>Score:</strong> {selectedReviewAttempt.score} / {reportsTask.maxScore || 100}</div>
                      <div>
                        <strong>Plagiarism:</strong>{' '}
                        <span className={selectedReviewAttempt.plagiarismPercentage > 40 ? 'text-danger' : 'text-success'}>
                          {selectedReviewAttempt.plagiarismPercentage || 0}% ({selectedReviewAttempt.plagiarismStatus || 'Original'})
                        </span>
                      </div>
                    </div>

                    <div style={{ marginTop: '15px' }}>
                      <label style={{ fontWeight: 600 }}>Student's Submitted Code:</label>
                      <pre className="lab-code-preview">
                        {selectedReviewAttempt.code || selectedReviewAttempt.submission || '// No code recorded'}
                      </pre>
                    </div>

                    {reportsTask.referenceSolution && (
                      <div style={{ marginTop: '15px' }}>
                        <label style={{ fontWeight: 600 }}>Faculty Reference Solution ({reportsTask.solutionLanguage}):</label>
                        <pre className="lab-code-preview" style={{ opacity: 0.85 }}>
                          {reportsTask.referenceSolution}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="lab-modal-footer">
                    <button className="btn btn-secondary" onClick={() => setSelectedReviewAttempt(null)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ===================== VIEW 3: TASKS LIST VIEW ===================== */
          <div className="lab-tasks-gallery animate-fade">
            {isManager && (
              <div className="glass-card lab-manager-create-card">
                <div className="create-header-row">
                  <div>
                    <h3 style={{ margin: 0 }}>Create Lab Practice Task</h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                      Set up lab tasks and supply a reference solution for automatic logic evaluation & plagiarism monitoring.
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setTaskFormOpen(!taskFormOpen)}
                  >
                    {taskFormOpen ? '▲ Hide Form' : '+ New Task Form'}
                  </button>
                </div>

                {taskFormOpen && (
                  <form className="lab-form" onSubmit={createTask} style={{ marginTop: '18px' }}>
                    <div className="form-row-2">
                      <input
                        className="form-control"
                        placeholder="Task Title (e.g. Binary Search Implementation)"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        required
                      />
                      <select
                        className="form-control"
                        value={taskForm.subject}
                        onChange={(e) => setTaskForm({ ...taskForm, subject: e.target.value })}
                        required
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-row-4">
                      <input
                        className="form-control"
                        placeholder="Academic Year (e.g. 3rd Year)"
                        value={taskForm.academicYear}
                        onChange={(e) => setTaskForm({ ...taskForm, academicYear: e.target.value })}
                        required
                      />
                      <input
                        className="form-control"
                        placeholder="Branch (e.g. CSE)"
                        value={taskForm.branch}
                        onChange={(e) => setTaskForm({ ...taskForm, branch: e.target.value })}
                      />
                      <input
                        className="form-control"
                        placeholder="Section (e.g. C)"
                        value={taskForm.section}
                        onChange={(e) => setTaskForm({ ...taskForm, section: e.target.value })}
                      />
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Max Score"
                        value={taskForm.maxScore}
                        onChange={(e) => setTaskForm({ ...taskForm, maxScore: Number(e.target.value) })}
                      />
                    </div>

                    <textarea
                      className="form-control"
                      placeholder="Lab Instructions and Problem Statement..."
                      value={taskForm.instructions}
                      onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
                      rows={3}
                      required
                    />

                    <div style={{ marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>
                          Default Faculty Reference Solutions (Multi-Language):
                        </label>
                        <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                          ⚡ AST Normalized • Student submissions auto-match corresponding language
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {LANGUAGES.map(lang => {
                          const hasCode = Boolean(taskForm.referenceSolutions?.[lang.value]?.trim());
                          const isActive = activeTaskFormLang === lang.value;
                          return (
                            <button
                              key={lang.value}
                              type="button"
                              onClick={() => setActiveTaskFormLang(lang.value)}
                              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ fontSize: '12px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <span>{lang.label}</span>
                              {hasCode && <span style={{ fontSize: '10px', background: '#10b981', color: '#fff', borderRadius: '8px', padding: '0 5px' }}>✓</span>}
                            </button>
                          );
                        })}
                      </div>

                      <textarea
                        className="form-control"
                        placeholder={`Paste reference solution code for ${LANGUAGES.find(l => l.value === activeTaskFormLang)?.label || 'chosen language'} here...`}
                        value={taskForm.referenceSolutions?.[activeTaskFormLang] || ''}
                        onChange={(e) => {
                          const newCode = e.target.value;
                          const updated = {
                            ...taskForm.referenceSolutions,
                            [activeTaskFormLang]: newCode
                          };
                          setTaskForm({
                            ...taskForm,
                            referenceSolutions: updated,
                            referenceSolution: newCode || Object.values(updated).find(v => (v || '').trim()) || '',
                            solutionLanguage: activeTaskFormLang
                          });
                        }}
                        rows={6}
                        style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                      />
                    </div>

                    <button className="btn btn-primary" type="submit" style={{ justifySelf: 'start', marginTop: '10px' }}>
                      Create Lab Task
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Task Cards Grid */}
            <div className="lab-tasks-grid">
              {tasks.map((task) => {
                const att = task.myAttempt;
                return (
                  <div className="lab-task-card glass-card" key={task._id}>
                    <div className="task-card-header">
                      <span className="badge badge-subject">{task.subject?.name || 'Subject'}</span>
                      <span className="badge badge-scope">
                        {task.academicYear} {task.branch} {task.section}
                      </span>
                    </div>

                    <h3 className="task-card-title">{task.title}</h3>
                    <p className="task-card-desc">{task.instructions}</p>

                    <div className="task-card-footer">
                      <div className="task-status-indicator">
                        {att ? (
                          <div className="att-summary-tag">
                            <span className="text-success font-weight-bold">✅ Attempted</span>
                            <span className="score-pill">{att.score ?? '—'} / {task.maxScore || 100}</span>
                            {att.evaluationDetails?.logicMatchPercentage !== undefined && (
                              <span className="match-pill">{att.evaluationDetails.logicMatchPercentage}% Match</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-secondary">⏳ Not attempted yet</span>
                        )}
                      </div>

                      <div className="task-action-btns">
                        {isManager && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => loadReports(task)}
                          >
                            📊 Reports
                          </button>
                        )}
                        <button
                          className="btn btn-primary btn-sm btn-practice"
                          onClick={() => openPracticeIDE(task)}
                        >
                          💻 {isManager ? 'Test in IDE' : att ? 'Re-practice in IDE' : 'Practice in IDE'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!tasks.length && (
                <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                  <p className="text-secondary" style={{ fontSize: '1.1rem' }}>
                    No lab practice tasks assigned currently for your academic year / section.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LabPractice;
