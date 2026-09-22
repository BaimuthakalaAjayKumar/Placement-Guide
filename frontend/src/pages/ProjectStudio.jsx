import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './ProjectStudio.css';

const starterFiles = [
  { path: 'README.md', content: '# My Project\n\nDescribe your project, objectives, architecture, and deployment instructions here.' },
  { path: 'src/main.js', content: "console.log('Project Studio - Start building your project!');\n" }
];

const COMMON_TECHS = [
  'React', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript', 'TypeScript',
  'Python', 'FastAPI', 'Django', 'Next.js', 'TailwindCSS', 'PostgreSQL',
  'MySQL', 'Docker', 'AWS', 'TensorFlow', 'PyTorch', 'Java', 'C++', 'Firebase'
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
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState(null);
  const [activeFile, setActiveFile] = useState(0);
  const [activeStudioTab, setActiveStudioTab] = useState('editor'); // 'editor' | 'details' | 'team' | 'feedback'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goals, setGoals] = useState('');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [technologies, setTechnologies] = useState([]);
  const [techInput, setTechInput] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  // Version History State
  const [commitMessage, setCommitMessage] = useState('');
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [previewingHistoryVersion, setPreviewingHistoryVersion] = useState(null);
  const [previewingHistoryFileIdx, setPreviewingHistoryFileIdx] = useState(0);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Add Member State
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: '',
    rollNumber: '',
    email: '',
    role: 'Developer',
    contribution: ''
  });

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
      setProjects(data.data || []);
      if (data.data && data.data.length > 0) {
        selectProject(data.data[0]);
      } else {
        setProject(null);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadProjects();
    }
  }, [token]);

  const selectProject = (selected) => {
    setProject(selected);
    setTitle(selected.title || '');
    setDescription(selected.description || '');
    setGoals(selected.goals || '');
    setDeploymentUrl(selected.deploymentUrl || selected.previewUrl || '');
    setRepositoryUrl(selected.repositoryUrl || '');
    setTechnologies(Array.isArray(selected.technologies) ? selected.technologies : []);
    setTeamMembers(Array.isArray(selected.teamMembers) ? selected.teamMembers : []);
    setActiveFile(0);
    setMessage('');
    setOutput('');
  };

  const createProject = async () => {
    try {
      setSaving(true);
      const data = await request(`${API_URL}/academic/projects`, {
        method: 'POST',
        body: JSON.stringify({
          title: 'Untitled Capstone Project',
          description: '',
          goals: '',
          academicYear: user?.academicYear || user?.year || 'Final Year',
          branch: user?.branch || '',
          section: user?.section || '',
          technologies: [],
          teamMembers: [],
          deploymentUrl: '',
          repositoryUrl: '',
          files: starterFiles,
          milestones: []
        })
      });
      setProjects(previous => [data.data, ...previous]);
      selectProject(data.data);
      setActiveStudioTab('details');
      setMessage('New project created! You can now set up your project details, team members, and code.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
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
    const path = window.prompt('Enter file path (e.g. src/utils.js, styles.css):', 'src/new-file.js')?.trim();
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
      setMessage('Project deleted successfully.');
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
      setOutput('Executing in secure sandbox environment...');
      const data = await request(`${API_URL}/questions/run-sandbox`, {
        method: 'POST',
        body: JSON.stringify({ code: currentFile.content, language: editorLanguage(currentFile.path), input: '' })
      });
      setOutput(data.error ? `Error: ${data.error}\n${data.stdout || ''}` : (data.stdout || '(Program executed with no console output)'));
    } catch (error) {
      setOutput(`Sandbox Execution Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const saveProject = async (submit = false) => {
    if (!project) return;
    try {
      setSaving(true);
      const payload = {
        title: title.trim() || 'Untitled Project',
        description,
        goals,
        academicYear: project.academicYear || user?.academicYear || user?.year || 'Final Year',
        branch: project.branch || user?.branch || '',
        section: project.section || user?.section || '',
        technologies,
        teamMembers,
        deploymentUrl: deploymentUrl.trim(),
        previewUrl: deploymentUrl.trim(),
        repositoryUrl: repositoryUrl.trim(),
        files: project.files,
        commitMessage: commitMessage.trim() || undefined,
        submit
      };

      const data = await request(`${API_URL}/academic/projects/${project._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setProject(data.data);
      setProjects(previous => previous.map(item => item._id === data.data._id ? data.data : item));
      setCommitMessage('');
      setMessage(submit ? '🚀 Project submitted successfully for faculty and administrator review!' : '💾 Project changes saved successfully (new code snapshot recorded).');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (versionNumber) => {
    if (!window.confirm(`⚠️ Restore Project to Version #${versionNumber}?\n\nThis will safely roll back your code files to this snapshot. A new recovery snapshot will be recorded in history.`)) return;
    try {
      setRestoringVersion(true);
      const data = await request(`${API_URL}/academic/projects/${project._id}/restore-version/${versionNumber}`, {
        method: 'POST'
      });
      setProject(data.data);
      setProjects(previous => previous.map(item => item._id === data.data._id ? data.data : item));
      selectProject(data.data);
      setMessage(`⏮️ Successfully restored project files to Version #${versionNumber}!`);
      setActiveStudioTab('editor');
    } catch (error) {
      setMessage(error.message || 'Failed to restore version.');
    } finally {
      setRestoringVersion(false);
    }
  };

  // Team Member Management
  const handleAddMember = (e) => {
    e.preventDefault();
    if (!memberForm.name.trim()) return;

    const newMemberItem = {
      name: memberForm.name.trim(),
      rollNumber: memberForm.rollNumber.trim(),
      email: memberForm.email.trim(),
      role: memberForm.role.trim() || 'Developer',
      contribution: memberForm.contribution.trim()
    };

    const updatedMembers = [...teamMembers, newMemberItem];
    setTeamMembers(updatedMembers);
    setProject(prev => ({ ...prev, teamMembers: updatedMembers }));
    setMemberForm({ name: '', rollNumber: '', email: '', role: 'Developer', contribution: '' });
    setShowMemberForm(false);
    setMessage(`Added team member: ${newMemberItem.name}`);
  };

  const handleRemoveMember = (index) => {
    const updatedMembers = teamMembers.filter((_, i) => i !== index);
    setTeamMembers(updatedMembers);
    setProject(prev => ({ ...prev, teamMembers: updatedMembers }));
  };

  // Technology Tags Management
  const handleAddTech = (techToAdd) => {
    const tech = (techToAdd || techInput).trim();
    if (!tech) return;
    if (!technologies.some(t => t.toLowerCase() === tech.toLowerCase())) {
      const updated = [...technologies, tech];
      setTechnologies(updated);
      setProject(prev => ({ ...prev, technologies: updated }));
    }
    setTechInput('');
  };

  const handleRemoveTech = (techToRemove) => {
    const updated = technologies.filter(t => t !== techToRemove);
    setTechnologies(updated);
    setProject(prev => ({ ...prev, technologies: updated }));
  };

  const currentFile = project?.files?.[activeFile];
  const hasFeedback = project && (project.codeSuggestions || project.techSuggestions || project.feedback || project.grade !== null);

  return (
    <>
      <Header title="Project Studio" />
      <div className="content-wrapper project-studio-page animate-fade">
        <div className="project-studio-toolbar glass-card">
          <div className="toolbar-info">
            <div className="toolbar-badge-row">
              <span className="studio-badge">⚡ Interactive Studio</span>
              {project && (
                <span className={`status-pill ${project.status || 'draft'}`}>
                  {(project.status || 'draft').replace('_', ' ')}
                </span>
              )}
              {project?.grade !== null && project?.grade !== undefined && (
                <span className="grade-badge">Grade: {project.grade}/100</span>
              )}
              {project && (
                <span className="team-collab-badge" title="All changes replicate live to every team member's account">
                  👥 {project.teamMembers?.length > 0 ? `${project.teamMembers.length + 1} Members (Team Project)` : 'Individual Project'}
                  {project.lastUpdatedByName && ` • Last updated by ${project.lastUpdatedByName}`}
                </span>
              )}
              {deploymentUrl && (
                <a
                  href={deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="deployment-live-chip"
                  title="Open live deployment"
                >
                  🚀 Live App ↗
                </a>
              )}
            </div>
            <h2>{project ? project.title || 'Untitled Project' : 'Project Studio'}</h2>
            <p className="card-desc">Build, collaborate with teammates, deploy live links, and submit your project for faculty & administrator evaluation.</p>
          </div>
          <div className="project-studio-actions">
            <button className="btn btn-secondary btn-sm" type="button" onClick={createProject} disabled={saving}>
              + New Project
            </button>
            <button className="btn btn-primary btn-sm" type="button" onClick={() => saveProject(false)} disabled={!project || saving}>
              {saving ? 'Saving...' : '💾 Save Project'}
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={runCurrentFile} disabled={!project || running}>
              {running ? 'Running...' : '▶ Run Code'}
            </button>
            <button className="btn btn-accent btn-sm" type="button" onClick={() => saveProject(true)} disabled={!project || saving}>
              🚀 {project?.status === 'submitted' ? 'Update Submission' : 'Submit for Review'}
            </button>
            <button className="btn btn-danger btn-sm" type="button" onClick={deleteProject} disabled={!project}>
              Delete
            </button>
          </div>
        </div>

        {message && (
          <div className="success-banner animate-fade">
            <span>{message}</span>
            <button type="button" className="close-alert-btn" onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {loading ? (
          <div className="dashboard-loading-container">
            <div className="spinner-loader"></div>
            <p>Loading projects and files...</p>
          </div>
        ) : (
          <div className="project-studio-container">
            {/* 1. FIRST: YOUR PROJECTS SECTION */}
            <section className="your-projects-top-section glass-card">
              <div className="your-projects-header">
                <div className="your-projects-header-info">
                  <div className="title-with-badge">
                    <h3>📁 Your Projects</h3>
                    <span className="badge-counter">{projects.length}</span>
                  </div>
                  <p className="section-subtitle">
                    Select a project to work on its source code, manage teammates, test in the sandbox, or submit for faculty review.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" type="button" onClick={createProject} disabled={saving}>
                  + New Project
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="no-projects-notice">
                  <p className="text-secondary">No projects created yet. Start by creating your first academic project.</p>
                  <button className="btn btn-primary btn-sm mt-10" type="button" onClick={createProject}>Create One Now</button>
                </div>
              ) : (
                <div className="your-projects-grid">
                  {projects.map(item => {
                    const isSelected = project?._id === item._id;
                    const studentScope = item.academicYear || item.student?.academicYear || user?.academicYear || user?.year;
                    const studentBranch = item.branch || item.student?.branch || user?.branch;
                    const studentSection = item.section || item.student?.section || user?.section;
                    return (
                      <div
                        key={item._id}
                        className={`your-project-card ${isSelected ? 'active' : ''}`}
                        onClick={() => selectProject(item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectProject(item); }}
                      >
                        <div className="card-top-row">
                          <span className="project-card-icon">⚡</span>
                          <span className={`status-pill-mini ${item.status || 'draft'}`}>
                            {(item.status || 'draft').replace('_', ' ')}
                          </span>
                          {isSelected && <span className="active-indicator-pill">● Active Selection</span>}
                        </div>
                        <h4 className="project-card-title" title={item.title || 'Untitled Project'}>
                          {item.title || 'Untitled Project'}
                        </h4>
                        {item.description && (
                          <p className="project-card-desc">
                            {item.description.length > 85 ? `${item.description.substring(0, 85)}...` : item.description}
                          </p>
                        )}
                        <div className="project-card-meta-tags">
                          <span className="meta-tag">
                            👥 {item.teamMembers?.length > 0 ? `${item.teamMembers.length + 1} Members` : 'Individual'}
                          </span>
                          {(item.deploymentUrl || item.previewUrl) && (
                            <span className="meta-tag live-tag">🚀 Deployed</span>
                          )}
                          {item.grade !== null && item.grade !== undefined && (
                            <span className="meta-tag grade-tag">★ {item.grade}/100</span>
                          )}
                          {studentScope && (
                            <span className="meta-tag scope-tag" title="Assigned Academic Year">
                              🎓 {studentScope}
                            </span>
                          )}
                          {studentBranch && (
                            <span className="meta-tag branch-tag" title="Branch & Section">
                              🏫 {studentBranch}{studentSection ? ` (${studentSection})` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 2. THEN GIVE SOME SPACE */}
            <div className="studio-section-spacer"></div>

            {/* 3. LATER AFTER THAT SHOW THE NEXT SECTION */}
            {project ? (
              <section className="project-editor-shell glass-card">
                {/* STUDIO NAVIGATION TABS */}
                <div className="studio-tabs-bar">
                  <button
                    type="button"
                    className={`studio-tab-btn ${activeStudioTab === 'editor' ? 'active' : ''}`}
                    onClick={() => setActiveStudioTab('editor')}
                  >
                    💻 Code Studio ({project.files?.length || 0} Files)
                  </button>
                  <button
                    type="button"
                    className={`studio-tab-btn ${activeStudioTab === 'details' ? 'active' : ''}`}
                    onClick={() => setActiveStudioTab('details')}
                  >
                    🎯 Goals, Tech & Deployment
                  </button>
                  <button
                    type="button"
                    className={`studio-tab-btn ${activeStudioTab === 'team' ? 'active' : ''}`}
                    onClick={() => setActiveStudioTab('team')}
                  >
                    👥 Team Members ({teamMembers.length > 0 ? teamMembers.length + 1 : 1})
                  </button>
                  <button
                    type="button"
                    className={`studio-tab-btn ${activeStudioTab === 'feedback' ? 'active' : ''}`}
                    onClick={() => setActiveStudioTab('feedback')}
                  >
                    💡 Faculty & Admin Feedback
                    {hasFeedback && <span className="feedback-indicator-dot" title="Feedback available">•</span>}
                  </button>
                  <button
                    type="button"
                    className={`studio-tab-btn ${activeStudioTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveStudioTab('history')}
                  >
                    📜 History & Restore ({project.versionHistory?.length || 0})
                  </button>
                </div>

                {/* TAB 1: CODE EDITOR & SANDBOX */}
                {activeStudioTab === 'editor' && (
                  <div className="tab-pane animate-fade">
                    <div className="project-details-row">
                      <input
                        className="form-control"
                        value={title}
                        onChange={event => setTitle(event.target.value)}
                        placeholder="Project title"
                      />
                      <input
                        className="form-control"
                        value={description}
                        onChange={event => setDescription(event.target.value)}
                        placeholder="Short summary of project features"
                      />
                      <input
                        className="form-control commit-note-input"
                        value={commitMessage}
                        onChange={event => setCommitMessage(event.target.value)}
                        placeholder="📝 Snapshot note (e.g. Added auth, Fixed UI) - optional"
                      />
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
                          <button
                            key={file.path}
                            type="button"
                            className={`project-file-item ${activeFile === index ? 'active' : ''}`}
                            onClick={() => setActiveFile(index)}
                          >
                            <span className="file-icon">📄</span> {file.path}
                          </button>
                        ))}
                      </div>
                      <div className="project-monaco-wrapper">
                        <div className="project-editor-tabs">
                          {project.files.map((file, index) => (
                            <button
                              key={file.path}
                              type="button"
                              className={`project-editor-tab ${activeFile === index ? 'active' : ''}`}
                              onClick={() => setActiveFile(index)}
                            >
                              {file.path}
                            </button>
                          ))}
                        </div>
                        {currentFile && (
                          <Editor
                            height="520px"
                            theme={theme === 'light' ? 'light' : 'vs-dark'}
                            language={editorLanguage(currentFile.path)}
                            value={currentFile.content}
                            onChange={value => updateActiveFile(value || '')}
                            options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              automaticLayout: true,
                              tabSize: 2
                            }}
                          />
                        )}
                        <pre className="project-output-panel">
                          {output || 'Click "▶ Run Code" above to execute current file in sandbox.'}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: GOALS, TECH STACK & DEPLOYMENT */}
                {activeStudioTab === 'details' && (
                  <div className="tab-pane animate-fade project-details-pane">
                    {/* DEPLOYMENT COLUMN */}
                    <div className="deployment-banner-card">
                      <div className="deployment-card-header">
                        <div className="deploy-icon-badge">🚀</div>
                        <div>
                          <h4>Project Deployment & Live Demo Link</h4>
                          <p className="text-secondary">If you or your team have already built and hosted this project (on Vercel, Netlify, Render, GitHub Pages, etc.), add the live link below.</p>
                        </div>
                      </div>
                      <div className="deploy-input-group">
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://your-project.vercel.app or https://github.io/..."
                          value={deploymentUrl}
                          onChange={e => setDeploymentUrl(e.target.value)}
                        />
                        {deploymentUrl ? (
                          <a
                            href={deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-accent"
                          >
                            🚀 Open Live App ↗
                          </a>
                        ) : (
                          <button className="btn btn-secondary" type="button" disabled>Not Deployed Yet</button>
                        )}
                      </div>
                    </div>

                    <div className="form-grid-2col mt-20">
                      <div className="form-group">
                        <label className="form-label">Project Title *</label>
                        <input
                          className="form-control"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Enter comprehensive project title"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Code Repository URL (GitHub / GitLab)</label>
                        <div className="input-with-action">
                          <input
                            type="url"
                            className="form-control"
                            value={repositoryUrl}
                            onChange={e => setRepositoryUrl(e.target.value)}
                            placeholder="https://github.com/username/project-repo"
                          />
                          {repositoryUrl && (
                            <a
                              href={repositoryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                            >
                              View Repo ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="form-group mt-16">
                      <label className="form-label">Project Goals & Objectives</label>
                      <textarea
                        className="form-control"
                        rows="4"
                        value={goals}
                        onChange={e => setGoals(e.target.value)}
                        placeholder="What problem does this project solve? What are the key architectural goals, user requirements, and expected performance metrics?"
                      />
                    </div>

                    <div className="form-group mt-16">
                      <label className="form-label">Project Description</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="High-level summary of features, user roles, and implementation methodology..."
                      />
                    </div>

                    {/* ACADEMIC EVALUATION SCOPE */}
                    <div className="project-scope-banner mt-16">
                      <div className="scope-banner-header">
                        <span className="scope-badge-icon">🎓</span>
                        <div>
                          <strong>Assigned Academic Scope</strong>
                          <p className="text-secondary">Faculties assigned to this Year, Branch, and Section can view, test, and evaluate this submission.</p>
                        </div>
                      </div>
                      <div className="scope-chips-row">
                        <span className="scope-chip">🎓 <strong>Year:</strong> {project.academicYear || user?.academicYear || user?.year || 'Final Year'}</span>
                        <span className="scope-chip">🏫 <strong>Branch:</strong> {project.branch || user?.branch || 'General'}</span>
                        <span className="scope-chip">📍 <strong>Section:</strong> Sec {project.section || user?.section || '—'}</span>
                      </div>
                    </div>

                    {/* TECHNOLOGIES USED */}
                    <div className="form-group mt-20">
                      <label className="form-label">Technologies & Frameworks Used</label>
                      <div className="tech-input-row">
                        <input
                          className="form-control"
                          value={techInput}
                          onChange={e => setTechInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTech(); } }}
                          placeholder="Type a technology (e.g. React, Node.js) and press Enter or Add"
                        />
                        <button type="button" className="btn btn-secondary" onClick={() => handleAddTech()}>
                          + Add
                        </button>
                      </div>

                      <div className="tech-tags-container mt-10">
                        {technologies.map(t => (
                          <span key={t} className="tech-badge">
                            {t}
                            <button type="button" onClick={() => handleRemoveTech(t)} title={`Remove ${t}`}>×</button>
                          </span>
                        ))}
                        {technologies.length === 0 && (
                          <span className="text-secondary" style={{ fontSize: '0.85rem' }}>No technologies added yet. Select from common suggestions below or type your own:</span>
                        )}
                      </div>

                      {/* Common Tech Suggestions */}
                      <div className="quick-tech-suggestions mt-10">
                        <span className="suggestion-label">Quick Add:</span>
                        {COMMON_TECHS.map(tech => (
                          <button
                            key={tech}
                            type="button"
                            className={`suggestion-pill ${technologies.includes(tech) ? 'selected' : ''}`}
                            onClick={() => technologies.includes(tech) ? handleRemoveTech(tech) : handleAddTech(tech)}
                          >
                            {technologies.includes(tech) ? `✓ ${tech}` : `+ ${tech}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="details-save-row mt-20">
                      <button className="btn btn-primary" type="button" onClick={() => saveProject(false)} disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save Goals & Details'}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: TEAM MEMBERS */}
                {activeStudioTab === 'team' && (
                  <div className="tab-pane animate-fade team-management-pane">
                    <div className="team-header-card">
                      <div>
                        <h3>Team Members & Collaborators</h3>
                        <p className="card-desc">If this project is built by multiple students, add all team members with their roll numbers, emails, and roles.</p>
                      </div>
                      <button
                        className={`btn ${showMemberForm ? 'btn-secondary' : 'btn-accent'} btn-sm`}
                        type="button"
                        onClick={() => setShowMemberForm(prev => !prev)}
                      >
                        {showMemberForm ? '✕ Close Form' : '+ Add Team Member'}
                      </button>
                    </div>

                    {/* IN-TAB EXPANDABLE ADD MEMBER FORM - FITS DIRECTLY IN TAB SPACE */}
                    {showMemberForm && (
                      <div className="in-tab-member-card animate-fade mt-16">
                        <div className="in-tab-member-header">
                          <div className="in-tab-member-title">
                            <span className="in-tab-icon-chip">👥</span>
                            <div>
                              <h4>Add Team Member</h4>
                              <p className="in-tab-member-sub">Add collaborating teammates with their college roll number & role</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="in-tab-close-btn"
                            onClick={() => setShowMemberForm(false)}
                            title="Close form"
                          >
                            ×
                          </button>
                        </div>

                        <form onSubmit={handleAddMember} className="in-tab-member-form">
                          <div className="in-tab-form-grid">
                            <div className="form-group">
                              <label className="form-label">Full Name *</label>
                              <input
                                className="form-control"
                                required
                                value={memberForm.name}
                                onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                                placeholder="Teammate's full name"
                                autoFocus
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Student Roll Number / ID</label>
                              <input
                                className="form-control"
                                value={memberForm.rollNumber}
                                onChange={e => setMemberForm({ ...memberForm, rollNumber: e.target.value })}
                                placeholder="e.g. 23241A12K0"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Email Address</label>
                              <input
                                type="email"
                                className="form-control"
                                value={memberForm.email}
                                onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                                placeholder="teammate@grietcollege.com"
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Contribution Role</label>
                              <select
                                className="form-control"
                                value={memberForm.role}
                                onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                              >
                                <option value="Developer">Developer</option>
                                <option value="Frontend Lead">Frontend Lead</option>
                                <option value="Backend Developer">Backend Developer</option>
                                <option value="Full Stack Engineer">Full Stack Engineer</option>
                                <option value="AI / ML Engineer">AI / ML Engineer</option>
                                <option value="UI / UX Designer">UI / UX Designer</option>
                                <option value="QA & Testing">QA & Testing</option>
                                <option value="DevOps & Deployment">DevOps & Deployment</option>
                                <option value="Documentation & Research">Documentation & Research</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group mt-12">
                            <label className="form-label">Contribution / Key Responsibilities</label>
                            <input
                              className="form-control"
                              value={memberForm.contribution}
                              onChange={e => setMemberForm({ ...memberForm, contribution: e.target.value })}
                              placeholder="e.g. Backend API development, Database modeling, Testing"
                            />
                          </div>

                          <div className="in-tab-actions mt-16">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setShowMemberForm(false)}
                            >
                              Cancel
                            </button>
                            <button type="submit" className="btn btn-primary btn-sm">
                              ➕ Add Team Member
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="team-members-list mt-20">
                      {/* Project Lead (Owner) */}
                      <div className="team-member-card lead-card">
                        <div className="member-avatar">👑</div>
                        <div className="member-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h4>{project.student?.name || user?.name || 'Project Creator'} <span className="lead-tag">Project Lead</span></h4>
                            {project.leadStudentGrade !== null && project.leadStudentGrade !== undefined ? (
                              <span className="member-grade-chip">★ Individual Grade: {project.leadStudentGrade}/100</span>
                            ) : project.grade !== null && project.grade !== undefined ? (
                              <span className="member-grade-chip">★ Grade: {project.grade}/100</span>
                            ) : null}
                          </div>
                          <p className="member-meta">
                            <span>📧 {project.student?.email || user?.email || 'N/A'}</span>
                            {project.student?.rollNumber && <span>🆔 {project.student.rollNumber}</span>}
                            <span>🎓 {project.academicYear || 'Final Year'}</span>
                          </p>
                          {project.leadStudentContribution && (
                            <p className="member-contribution-desc mt-6"><strong>Contribution:</strong> {project.leadStudentContribution}</p>
                          )}
                          {project.leadStudentFeedback && (
                            <p className="member-eval-feedback mt-4"><strong>Evaluator Remarks:</strong> {project.leadStudentFeedback}</p>
                          )}
                        </div>
                      </div>

                      {/* Added Teammates */}
                      {teamMembers.map((member, index) => (
                        <div key={index} className="team-member-card">
                          <div className="member-avatar">👤</div>
                          <div className="member-info">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <h4>{member.name} <span className="role-tag">{member.role || 'Developer'}</span></h4>
                              {member.grade !== null && member.grade !== undefined && (
                                <span className="member-grade-chip">★ Individual Grade: {member.grade}/100</span>
                              )}
                            </div>
                            <p className="member-meta">
                              {member.email && <span>📧 {member.email}</span>}
                              {member.rollNumber && <span>🆔 {member.rollNumber}</span>}
                            </p>
                            {member.contribution && (
                              <p className="member-contribution-desc mt-6"><strong>Contribution:</strong> {member.contribution}</p>
                            )}
                            {member.feedback && (
                              <p className="member-eval-feedback mt-4"><strong>Evaluator Remarks:</strong> {member.feedback}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn-remove-member"
                            onClick={() => handleRemoveMember(index)}
                            title="Remove teammate"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      {teamMembers.length === 0 && (
                        <div className="no-teammates-box">
                          <p className="text-secondary">No additional team members added. This project is currently listed as an individual submission.</p>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm mt-10"
                            onClick={() => setShowMemberForm(true)}
                          >
                            Add Teammates
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="details-save-row mt-20">
                      <button className="btn btn-primary" type="button" onClick={() => saveProject(false)} disabled={saving}>
                        {saving ? 'Saving...' : '💾 Save Team Changes'}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: FACULTY & ADMIN FEEDBACK & SUGGESTIONS */}
                {activeStudioTab === 'feedback' && (
                  <div className="tab-pane animate-fade feedback-pane">
                    <div className="feedback-header">
                      <h3>Faculty & Administrator Evaluation</h3>
                      <p className="card-desc">Review constructive feedback, official grades, code suggestions, and technology recommendations from your faculty coordinators.</p>
                    </div>

                    <div className="evaluation-summary-row mt-16">
                      <div className="eval-card">
                        <span className="eval-label">Project Status</span>
                        <span className={`status-pill ${project.status}`}>{project.status.replace('_', ' ')}</span>
                      </div>
                      <div className="eval-card">
                        <span className="eval-label">Assigned Score</span>
                        <strong className="eval-grade">{project.grade !== null && project.grade !== undefined ? `${project.grade} / 100` : 'Pending Evaluation'}</strong>
                      </div>
                      <div className="eval-card">
                        <span className="eval-label">Evaluator</span>
                        <span>{project.reviewedBy?.name || 'Academic Review Committee'}</span>
                      </div>
                    </div>

                    {/* CODE SUGGESTIONS SECTION */}
                    <div className="suggestion-section code-suggestion-card mt-20">
                      <div className="suggestion-header">
                        <span className="suggestion-icon">💻</span>
                        <div>
                          <h4>Faculty Code Suggestions & Best Practices</h4>
                          <p className="text-secondary">Recommendations on code architecture, syntax optimization, security, and algorithmic efficiency.</p>
                        </div>
                      </div>
                      <div className="suggestion-body">
                        {project.codeSuggestions ? (
                          <div className="suggestion-text-box">
                            {project.codeSuggestions}
                          </div>
                        ) : (
                          <p className="text-secondary italic-note">No code suggestions provided yet. Faculty will review your code files and provide architectural notes here.</p>
                        )}
                      </div>
                    </div>

                    {/* TECHNOLOGY SUGGESTIONS SECTION */}
                    <div className="suggestion-section tech-suggestion-card mt-20">
                      <div className="suggestion-header">
                        <span className="suggestion-icon">⚡</span>
                        <div>
                          <h4>Faculty Technology & Architecture Suggestions</h4>
                          <p className="text-secondary">Advice on frameworks, modern libraries, database choices, cloud hosting, and scalability improvements.</p>
                        </div>
                      </div>
                      <div className="suggestion-body">
                        {project.techSuggestions ? (
                          <div className="suggestion-text-box">
                            {project.techSuggestions}
                          </div>
                        ) : (
                          <p className="text-secondary italic-note">No technology suggestions provided yet. Once reviewed, recommended libraries and tools will be listed here.</p>
                        )}
                      </div>
                    </div>

                    {/* GENERAL FEEDBACK */}
                    {project.feedback && (
                      <div className="suggestion-section feedback-card mt-20">
                        <div className="suggestion-header">
                          <span className="suggestion-icon">📝</span>
                          <div>
                            <h4>General Evaluator Notes</h4>
                          </div>
                        </div>
                        <div className="suggestion-body">
                          <div className="suggestion-text-box">
                            {project.feedback}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: CODE SNAPSHOT HISTORY & ROLLBACK */}
                {activeStudioTab === 'history' && (
                  <div className="tab-pane animate-fade history-pane">
                    <div className="history-header-card">
                      <div>
                        <h3>📜 Code Snapshots & Deployment History</h3>
                        <p className="card-desc">
                          Every time you or your teammates save code or update deployment links, a recovery snapshot is created. If any mistake occurs, inspect previous code snippets or roll back your project with one click.
                        </p>
                      </div>
                      <div className="history-counter-pill">
                        <span>{(project.versionHistory || []).length} Snapshots Saved</span>
                      </div>
                    </div>

                    {(!project.versionHistory || project.versionHistory.length === 0) ? (
                      <div className="no-history-box mt-20">
                        <p className="text-secondary">No previous code snapshots found. Click "💾 Save Project" in the editor to record your first snapshot.</p>
                      </div>
                    ) : (
                      <div className="history-timeline mt-20">
                        {[...(project.versionHistory || [])].reverse().map((version, vIdx) => {
                          const isLatest = vIdx === 0;
                          const isPreviewing = (previewingHistoryVersion?._id && previewingHistoryVersion?._id === version._id) || previewingHistoryVersion?.versionNumber === version.versionNumber;
                          const previewFile = isPreviewing && version.files ? (version.files[previewingHistoryFileIdx] || version.files[0]) : null;

                          return (
                            <div key={version._id || version.versionNumber || vIdx} className={`history-version-card ${isLatest ? 'latest-version' : ''}`}>
                              <div className="version-card-top">
                                <div className="version-badge-col">
                                  <span className="version-number-tag">
                                    v{version.versionNumber}
                                    {isLatest && <span className="current-pill">Current</span>}
                                  </span>
                                  <span className="version-date">
                                    {new Date(version.createdAt).toLocaleString()}
                                  </span>
                                </div>

                                <div className="version-summary-col">
                                  <strong className="version-summary-text">{version.summary || 'Code snapshot'}</strong>
                                  <div className="version-meta-tags">
                                    <span className="author-tag">👤 {version.authorName || 'Team Member'}</span>
                                    <span className="files-count-tag">📁 {version.files?.length || 0} Files</span>
                                    {version.deploymentUrl && (
                                      <span className="deploy-tag">🚀 {version.deploymentUrl}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="version-action-col">
                                  <button
                                    type="button"
                                    className={`btn btn-secondary btn-sm ${isPreviewing ? 'active' : ''}`}
                                    onClick={() => {
                                      if (isPreviewing) {
                                        setPreviewingHistoryVersion(null);
                                      } else {
                                        setPreviewingHistoryVersion(version);
                                        setPreviewingHistoryFileIdx(0);
                                      }
                                    }}
                                  >
                                    {isPreviewing ? '🔼 Hide Snippets' : '👁️ View Snippets'}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-warning btn-sm"
                                    onClick={() => handleRestoreVersion(version.versionNumber)}
                                    disabled={restoringVersion}
                                    title="Restore code files to this snapshot"
                                  >
                                    {restoringVersion ? 'Restoring...' : '⏮️ Restore This Version'}
                                  </button>
                                </div>
                              </div>

                              {/* Code Snippets Inspector for this version */}
                              {isPreviewing && previewFile && (
                                <div className="history-code-preview-drawer mt-14">
                                  <div className="drawer-file-tabs">
                                    {(version.files || []).map((f, fIdx) => (
                                      <button
                                        key={f.path || fIdx}
                                        type="button"
                                        className={`drawer-file-tab ${previewingHistoryFileIdx === fIdx ? 'active' : ''}`}
                                        onClick={() => setPreviewingHistoryFileIdx(fIdx)}
                                      >
                                        📄 {f.path}
                                      </button>
                                    ))}
                                  </div>

                                  <div className="drawer-code-box">
                                    <div className="drawer-code-header">
                                      <span>Snapshot: <strong>{previewFile.path}</strong> (Version #{version.versionNumber})</span>
                                      <button
                                        type="button"
                                        className="btn-copy-snippet"
                                        onClick={() => {
                                          navigator.clipboard.writeText(previewFile.content || '');
                                          setCopiedSnippet(true);
                                          setTimeout(() => setCopiedSnippet(false), 2000);
                                        }}
                                      >
                                        {copiedSnippet ? '✓ Copied!' : '📋 Copy Code Snippet'}
                                      </button>
                                    </div>
                                    <pre className="drawer-code-pre">
                                      {previewFile.content || '(Empty file content)'}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : (
              <div className="glass-card project-empty-state">
                <div className="empty-state-icon">📁</div>
                <h3>Start Your Academic Project</h3>
                <p className="text-secondary">Create a new project to open the multi-file code editor, add your team members, and prepare your deployment.</p>
                <button className="btn btn-primary mt-16" type="button" onClick={createProject}>+ Create Project</button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ProjectStudio;
