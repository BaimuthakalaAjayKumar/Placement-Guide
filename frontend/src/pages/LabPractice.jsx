import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './LabPractice.css';

const LabPractice = () => {
  const { token, user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'faculty';
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [submission, setSubmission] = useState('');
  const [report, setReport] = useState('');
  const [message, setMessage] = useState('');
  const [taskForm, setTaskForm] = useState({ title: '', instructions: '', subject: '', academicYear: '', branch: '', section: '', maxScore: 100 });
  const [attempts, setAttempts] = useState([]);

  const request = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
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

  useEffect(() => { load(); }, [token]);

  const createTask = async (event) => {
    event.preventDefault();
    try {
      await request(`${API_URL}/labs/tasks`, { method: 'POST', body: JSON.stringify(taskForm) });
      setTaskForm({ title: '', instructions: '', subject: '', academicYear: '', branch: '', section: '', maxScore: 100 });
      setMessage('Lab task created.');
      load();
    } catch (error) { setMessage(error.message); }
  };

  const submitAttempt = async (event) => {
    event.preventDefault();
    if (!selectedTask) return;
    try {
      await request(`${API_URL}/labs/tasks/${selectedTask._id}/submit`, { method: 'POST', body: JSON.stringify({ submission, report }) });
      setMessage('Lab practice submitted.');
    } catch (error) { setMessage(error.message); }
  };

  const loadReports = async (task) => {
    try {
      const data = await request(`${API_URL}/labs/tasks/${task._id}/reports`);
      setSelectedTask(task);
      setAttempts(data.data);
    } catch (error) { setMessage(error.message); }
  };

  const downloadReports = () => {
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [['Student', 'Email', 'Section', 'Score', 'Status', 'Feedback', 'Updated'], ...attempts.map(attempt => [attempt.student?.name, attempt.student?.email, attempt.student?.section, attempt.score, attempt.status, attempt.feedback, attempt.updatedAt])];
    const csv = rows.map(row => row.map(escape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'lab_practice_report.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return <>
    <Header title="Lab Practice" />
    <div className="content-wrapper lab-practice-page animate-fade">
      {message && <div className="success-banner">{message}</div>}
      {isManager && <div className="glass-card">
        <h3>Create Lab Practice Task</h3>
        <form className="lab-form" onSubmit={createTask}>
          <input className="form-control" placeholder="Task title" value={taskForm.title} onChange={event => setTaskForm({ ...taskForm, title: event.target.value })} required />
          <select className="form-control" value={taskForm.subject} onChange={event => setTaskForm({ ...taskForm, subject: event.target.value })} required><option value="">Subject</option>{subjects.map(subject => <option key={subject._id} value={subject._id}>{subject.code} - {subject.name}</option>)}</select>
          <input className="form-control" placeholder="Academic year" value={taskForm.academicYear} onChange={event => setTaskForm({ ...taskForm, academicYear: event.target.value })} required />
          <input className="form-control" placeholder="Branch, e.g. CSE" value={taskForm.branch} onChange={event => setTaskForm({ ...taskForm, branch: event.target.value })} />
          <input className="form-control" placeholder="Section, e.g. C" value={taskForm.section} onChange={event => setTaskForm({ ...taskForm, section: event.target.value })} />
          <textarea className="form-control" placeholder="Instructions" value={taskForm.instructions} onChange={event => setTaskForm({ ...taskForm, instructions: event.target.value })} required />
          <button className="btn btn-primary" type="submit">Create Task</button>
        </form>
      </div>}
      <div className="lab-grid">
        <div className="glass-card"><h3>{isManager ? 'Lab Tasks & Reports' : 'Assigned Lab Tasks'}</h3>{tasks.map(task => <div className="lab-task" key={task._id}><div><strong>{task.title}</strong><p>{task.subject?.name} · {task.academicYear} {task.branch} {task.section}</p><small>{task.instructions}</small></div><div className="lab-actions">{isManager ? <button className="btn btn-secondary btn-sm" onClick={() => loadReports(task)}>Reports</button> : <button className="btn btn-primary btn-sm" onClick={() => setSelectedTask(task)}>Practice</button>}</div></div>)}{!tasks.length && <p className="text-secondary">No lab tasks available.</p>}</div>
        {selectedTask && <div className="glass-card"><h3>{isManager ? `${selectedTask.title} Reports` : selectedTask.title}</h3>{isManager ? <><button className="btn btn-secondary btn-sm" onClick={downloadReports} disabled={!attempts.length}>Download Report</button>{attempts.map(attempt => <div className="lab-attempt" key={attempt._id}><strong>{attempt.student?.name}</strong><span>{attempt.score} · {attempt.status}</span><p>{attempt.feedback || 'No feedback yet.'}</p></div>)}</> : <form className="lab-form" onSubmit={submitAttempt}><p>{selectedTask.instructions}</p><textarea className="form-control" placeholder="Paste code or solution" value={submission} onChange={event => setSubmission(event.target.value)} required /><textarea className="form-control" placeholder="Practice report / explanation" value={report} onChange={event => setReport(event.target.value)} /><button className="btn btn-primary" type="submit">Submit Practice</button></form>}</div>}
      </div>
    </div>
  </>;
};

export default LabPractice;
