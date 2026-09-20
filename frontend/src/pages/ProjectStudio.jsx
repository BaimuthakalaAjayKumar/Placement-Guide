import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './ProjectStudio.css';

const starterFiles = [
  { path: 'README.md', content: '# My Project\n\nDescribe your project here.' },
  { path: 'src/main.js', content: "console.log('Start building your project');\n" }
];

const editorLanguage = (filePath) => {
  const extension = filePath.split('.').pop();
  return {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', java: 'java', cpp: 'cpp', c: 'c', html: 'html', css: 'css',
    json: 'json', md: 'markdown'
  }[extension] || 'plaintext';
};

const ProjectStudio = () => {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [activeFile, setActiveFile] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

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

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await request(`${API_URL}/academic/projects`);
      setProjects(data.data);
      if (data.data.length > 0) {
        selectProject(data.data[0]);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [token]);

  const selectProject = (selected) => {
    setProject(selected);
    setTitle(selected.title);
    setDescription(selected.description || '');
    setActiveFile(0);
    setMessage('');
    setOutput('');
  };

  const createProject = async () => {
    try {
      const data = await request(`${API_URL}/academic/projects`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Untitled Project',
          description: '',
          technologies: [],
          files: starterFiles,
          milestones: []
        })
      });
      setProjects(previous => [data.data, ...previous]);
      selectProject(data.data);
      setMessage('Project created.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateActiveFile = (content) => {
    setProject(previous => ({
      ...previous,
      files: previous.files.map((file, index) => index === activeFile ? { ...file, content } : file)
    }));
  };

  const addFile = () => {
    if (!project) return;
    const path = window.prompt('File path', 'src/new-file.js')?.trim();
    if (!path || project.files.some(file => file.path === path)) return;
    setProject(previous => ({
      ...previous,
      files: [...previous.files, { path, content: '' }]
    }));
    setActiveFile(project.files.length);
  };

  const deleteFile = () => {
    if (!project?.files?.[activeFile] || project.files.length === 1) return;
    const file = project.files[activeFile];
    if (!window.confirm(`Delete ${file.path}?`)) return;
    setProject(previous => ({
      ...previous,
      files: previous.files.filter((_, index) => index !== activeFile)
    }));
    setActiveFile(Math.max(0, activeFile - 1));
  };

  const deleteProject = async () => {
    if (!project || !window.confirm(`Delete project "${project.title}"? This cannot be undone.`)) return;
    try {
      await request(`${API_URL}/academic/projects/${project._id}`, { method: 'DELETE' });
      const remaining = projects.filter(item => item._id !== project._id);
      setProjects(remaining);
      if (remaining.length > 0) selectProject(remaining[0]);
      else setProject(null);
      setMessage('Project deleted.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const runCurrentFile = async () => {
    if (!currentFile || !['javascript', 'python', 'cpp', 'java', 'c'].includes(editorLanguage(currentFile.path))) {
      setOutput('Run is available for JavaScript, Python, C, C++, and Java files.');
      return;
    }
    try {
      setRunning(true);
      setOutput('Running in the secure sandbox...');
      const data = await request(`${API_URL}/questions/run-sandbox`, {
        method: 'POST',
        body: JSON.stringify({ code: currentFile.content, language: editorLanguage(currentFile.path), input: '' })
      });
      setOutput(data.error ? `Error: ${data.error}\n${data.stdout || ''}` : (data.stdout || '(No output)'));
    } catch (error) {
      setOutput(error.message);
    } finally {
      setRunning(false);
    }
  };

  const saveProject = async (submit = false) => {
    if (!project) return;
    try {
      setSaving(true);
      const data = await request(`${API_URL}/academic/projects/${project._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title,
          description,
          files: project.files,
          submit
        })
      });
      setProject(data.data);
      setProjects(previous => previous.map(item => item._id === data.data._id ? data.data : item));
      setMessage(submit ? 'Project submitted for administrator review.' : 'Project saved.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const currentFile = project?.files?.[activeFile];

  return (
    <>
      <Header title="Project Studio" />
      <div className="content-wrapper project-studio-page animate-fade">
        <div className="project-studio-toolbar">
          <div>
            <h2>Build Your Project</h2>
            <p className="card-desc">Create files, save your work, and submit a complete project for academic review.</p>
          </div>
          <div className="project-studio-actions">
            <button className="btn btn-secondary" type="button" onClick={createProject}>New Project</button>
            <button className="btn btn-primary" type="button" onClick={() => saveProject(false)} disabled={!project || saving}>Save</button>
            <button className="btn btn-secondary" type="button" onClick={runCurrentFile} disabled={!project || running}>{running ? 'Running...' : 'Run'}</button>
            <button className="btn btn-accent" type="button" onClick={() => saveProject(true)} disabled={!project || saving}>Submit for Review</button>
            <button className="btn btn-danger" type="button" onClick={deleteProject} disabled={!project}>Delete Project</button>
          </div>
        </div>

        {message && <div className="success-banner">{message}</div>}

        {loading ? (
          <div className="dashboard-loading-container"><div className="spinner-loader"></div><p>Loading projects...</p></div>
        ) : (
          <div className="project-studio-layout">
            <aside className="project-list glass-card">
              <h3>Your Projects</h3>
              {projects.length === 0 && <p className="text-secondary">No projects yet.</p>}
              {projects.map(item => (
                <button key={item._id} type="button" className={`project-list-item ${project?._id === item._id ? 'active' : ''}`} onClick={() => selectProject(item)}>
                  <strong>{item.title}</strong>
                  <span>{item.status.replace('_', ' ')}</span>
                </button>
              ))}
            </aside>

            {project ? (
              <section className="project-editor-shell glass-card">
                <div className="project-details-row">
                  <input className="form-control" value={title} onChange={event => setTitle(event.target.value)} placeholder="Project title" />
                  <input className="form-control" value={description} onChange={event => setDescription(event.target.value)} placeholder="Short project description" />
                </div>
                <div className="project-editor-layout">
                  <div className="project-file-tree">
                    <div className="project-file-tree-header">
                      <h4>Explorer</h4>
                      <div>
                        <button type="button" className="editor-icon-button" onClick={addFile} title="New file">+</button>
                        <button type="button" className="editor-icon-button" onClick={deleteFile} title="Delete file" disabled={project.files.length === 1}>-</button>
                      </div>
                    </div>
                    {project.files.map((file, index) => (
                      <button key={file.path} type="button" className={`project-file-item ${activeFile === index ? 'active' : ''}`} onClick={() => setActiveFile(index)}>
                        {file.path}
                      </button>
                    ))}
                  </div>
                  <div className="project-monaco-wrapper">
                    <div className="project-editor-tabs">
                      {project.files.map((file, index) => (
                        <button key={file.path} type="button" className={`project-editor-tab ${activeFile === index ? 'active' : ''}`} onClick={() => setActiveFile(index)}>
                          {file.path}
                        </button>
                      ))}
                    </div>
                    {currentFile && (
                      <Editor
                        height="560px"
                        theme={theme === 'light' ? 'light' : 'vs-dark'}
                        language={editorLanguage(currentFile.path)}
                        value={currentFile.content}
                        onChange={value => updateActiveFile(value || '')}
                        options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
                      />
                    )}
                    <pre className="project-output-panel">{output || 'Run the active file to see output here.'}</pre>
                  </div>
                </div>
              </section>
            ) : (
              <div className="glass-card project-empty-state">
                <h3>Start a project</h3>
                <p className="text-secondary">Create a project to open the multi-file editor.</p>
                <button className="btn btn-primary" type="button" onClick={createProject}>Create Project</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectStudio;
