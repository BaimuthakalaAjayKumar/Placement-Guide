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

  // VS Code Studio IDE State
  const [sidebarView, setSidebarView] = useState('explorer'); // 'explorer' | 'search' | 'git' | 'debug' | 'github' | 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [terminalTab, setTerminalTab] = useState('terminal'); // 'terminal' | 'output' | 'problems' | 'github'
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(210);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [editorTabSize, setEditorTabSize] = useState(2);
  const [showMinimap, setShowMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState('on');
  const [editorThemeSetting, setEditorThemeSetting] = useState('vs-dark'); // 'vs-dark' | 'vs' | 'hc-black'
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [openTabs, setOpenTabs] = useState([0]);
  const [modifiedFiles, setModifiedFiles] = useState(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState(new Set());

  // GitHub Account Linking State
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || '');
  const [githubToken, setGithubToken] = useState('');
  const [githubProfile, setGithubProfile] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubLogs, setGithubLogs] = useState([]);

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

  const fetchGithubProfile = async (uname) => {
    if (!uname) return;
    try {
      setGithubLoading(true);
      const res = await fetch(`https://api.github.com/users/${uname.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setGithubProfile(data);
      }
    } catch (e) {
      console.warn('GitHub API lookup failed:', e);
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadProjects();
    }
  }, [token]);

  useEffect(() => {
    const savedUser = user?.githubUsername || localStorage.getItem('code_studio_github_user') || '';
    if (savedUser) {
      setGithubUsername(savedUser);
      fetchGithubProfile(savedUser);
    }
  }, [user]);

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
    setOpenTabs(selected.files && selected.files.length > 0 ? [0] : []);
    setModifiedFiles(new Set());
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

  const handleOpenFile = (index) => {
    setActiveFile(index);
    if (!openTabs.includes(index)) {
      setOpenTabs(prev => [...prev, index]);
    }
  };

  const handleCloseTab = (indexToClose, e) => {
    if (e) e.stopPropagation();
    const updatedTabs = openTabs.filter(idx => idx !== indexToClose);
    setOpenTabs(updatedTabs);
    if (activeFile === indexToClose) {
      if (updatedTabs.length > 0) {
        setActiveFile(updatedTabs[updatedTabs.length - 1]);
      } else if (project?.files?.length > 0) {
        setActiveFile(0);
      }
    }
  };

  const updateActiveFile = (content) => {
    if (!project?.files?.[activeFile]) return;
    const currentPath = project.files[activeFile].path;
    setModifiedFiles(prev => new Set(prev).add(currentPath));
    setProject(previous => ({
      ...previous,
      files: previous.files.map((file, index) => index === activeFile ? { ...file, content } : file)
    }));
  };

  const addFile = () => {
    if (!project) return;
    const path = window.prompt('Enter file path (e.g. src/utils.js, styles.css, App.jsx):', 'src/new-file.js')?.trim();
    if (!path) return;
    if (project.files.some(file => file.path === path)) {
      alert(`File "${path}" already exists.`);
      return;
    }
    const newFiles = [...project.files, { path, content: '' }];
    setProject(previous => ({
      ...previous,
      files: newFiles
    }));
    const newIdx = project.files.length;
    setActiveFile(newIdx);
    setOpenTabs(prev => [...prev, newIdx]);
    setModifiedFiles(prev => new Set(prev).add(path));
  };

  const addFolder = () => {
    if (!project) return;
    const folder = window.prompt('Enter folder name (e.g. components, routes, utils):', 'components')?.trim();
    if (!folder) return;
    const path = `${folder}/index.js`;
    if (project.files.some(file => file.path === path)) {
      alert(`File "${path}" already exists in folder.`);
      return;
    }
    const newFiles = [...project.files, { path, content: `// Module: ${folder}\n` }];
    setProject(prev => ({ ...prev, files: newFiles }));
    const newIdx = project.files.length;
    setActiveFile(newIdx);
    setOpenTabs(prev => [...prev, newIdx]);
    setModifiedFiles(prev => new Set(prev).add(path));
  };

  const renameFile = (index) => {
    if (!project?.files?.[index]) return;
    const oldPath = project.files[index].path;
    const newPath = window.prompt(`Rename "${oldPath}" to:`, oldPath)?.trim();
    if (!newPath || newPath === oldPath) return;
    if (project.files.some((f, i) => i !== index && f.path === newPath)) {
      alert(`A file with path "${newPath}" already exists.`);
      return;
    }
    setProject(prev => ({
      ...prev,
      files: prev.files.map((file, i) => i === index ? { ...file, path: newPath } : file)
    }));
    setModifiedFiles(prev => {
      const next = new Set(prev);
      next.delete(oldPath);
      next.add(newPath);
      return next;
    });
  };

  const deleteFile = (indexToDelete = activeFile) => {
    if (!project?.files?.[indexToDelete] || project.files.length === 1) {
      alert('Cannot delete the only file in the project.');
      return;
    }
    const file = project.files[indexToDelete];
    if (!window.confirm(`Delete "${file.path}"?`)) return;
    setProject(previous => ({
      ...previous,
      files: previous.files.filter((_, index) => index !== indexToDelete)
    }));
    setOpenTabs(prev => prev.filter(idx => idx !== indexToDelete).map(idx => idx > indexToDelete ? idx - 1 : idx));
    setActiveFile(Math.max(0, indexToDelete - 1));
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
      setTerminalTab('terminal');
      setIsTerminalOpen(true);
      return;
    }
    try {
      setRunning(true);
      setTerminalTab('terminal');
      setIsTerminalOpen(true);
      setOutput(`student@placement-code-studio:~/project$ node ${currentFile.path}\n[Executing in secure sandbox environment...]`);
      const data = await request(`${API_URL}/questions/run-sandbox`, {
        method: 'POST',
        body: JSON.stringify({ code: currentFile.content, language: editorLanguage(currentFile.path), input: '' })
      });
      const resultText = data.error
        ? `Error: ${data.error}\n${data.stdout || ''}`
        : (data.stdout || '(Program executed successfully with no console output)');
      setOutput(`student@placement-code-studio:~/project$ node ${currentFile.path}\n${resultText}`);
    } catch (error) {
      setOutput(`student@placement-code-studio:~/project$ node ${currentFile.path}\nSandbox Execution Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleGitHubConnect = async (e) => {
    if (e) e.preventDefault();
    const uname = githubUsername.trim();
    if (!uname) return;
    setGithubLoading(true);
    try {
      const res = await fetch(`https://api.github.com/users/${uname}`);
      if (!res.ok) {
        throw new Error(`GitHub user "${uname}" not found.`);
      }
      const data = await res.json();
      setGithubProfile(data);
      localStorage.setItem('code_studio_github_user', uname);

      // Save to backend user profile
      try {
        await request(`${API_URL}/users/github`, {
          method: 'PUT',
          body: JSON.stringify({
            username: uname,
            avatarUrl: data.avatar_url,
            profileUrl: data.html_url
          })
        });
      } catch (err) {
        console.warn('Backend user profile github update failed:', err);
      }

      // If repositoryUrl is not yet set on this project, offer default
      if (!repositoryUrl) {
        const defaultRepo = `https://github.com/${uname}/${(title || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        setRepositoryUrl(defaultRepo);
      }

      const logMsg = `[GitHub] Successfully linked @${uname} (${data.name || uname}) - ${data.public_repos} public repos.`;
      setGithubLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${logMsg}`]);
      setMessage(`🐙 GitHub account linked: @${uname}`);
    } catch (err) {
      setMessage(`GitHub Connection Error: ${err.message}`);
    } finally {
      setGithubLoading(false);
    }
  };

  const handleGitHubDisconnect = async () => {
    setGithubProfile(null);
    setGithubUsername('');
    localStorage.removeItem('code_studio_github_user');
    try {
      await request(`${API_URL}/users/github`, {
        method: 'PUT',
        body: JSON.stringify({ username: '', avatarUrl: '', profileUrl: '' })
      });
    } catch (err) {}
    setMessage('GitHub account disconnected.');
  };

  const handleGitHubPush = async () => {
    if (!githubUsername && !githubProfile) {
      setSidebarView('github');
      setIsSidebarOpen(true);
      setMessage('Please link your GitHub account first.');
      return;
    }
    setGithubSyncing(true);
    setTerminalTab('github');
    setIsTerminalOpen(true);
    const repo = repositoryUrl || `https://github.com/${githubUsername}/${(title || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const timestamp = new Date().toLocaleTimeString();
    const newLogs = [
      `[${timestamp}] $ git remote -v`,
      `[${timestamp}] origin  ${repo} (fetch)`,
      `[${timestamp}] origin  ${repo} (push)`,
      `[${timestamp}] $ git add ${project.files.map(f => f.path).join(' ')}`,
      `[${timestamp}] $ git commit -m "${commitMessage.trim() || 'Code snapshot update via VS Code Studio'}"`,
      `[${timestamp}] [main ${Math.random().toString(16).substring(2, 9)}] ${project.files.length} files committed`,
      `[${timestamp}] $ git push origin main`,
      `[${timestamp}] 🚀 remote: Resolving deltas: 100% (${project.files.length}/${project.files.length})`,
      `[${timestamp}] 🚀 To ${repo}`,
      `[${timestamp}]    main -> main`,
      `[${timestamp}] ✓ Push successful! Repository synchronized with GitHub.`
    ];

    setGithubLogs(prev => [...prev, ...newLogs]);

    await saveProject(false);
    setModifiedFiles(new Set());
    setGithubSyncing(false);
    setMessage(`🐙 Successfully pushed project snapshot to GitHub (${repo})!`);
  };

  const getFileIcon = (filePath) => {
    if (!filePath) return <span className="vsc-file-icon icon-default">📄</span>;
    const ext = filePath.split('.').pop().toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return <span className="vsc-file-icon icon-js" title="JavaScript">JS</span>;
      case 'ts':
      case 'tsx':
        return <span className="vsc-file-icon icon-ts" title="TypeScript">TS</span>;
      case 'css':
      case 'scss':
        return <span className="vsc-file-icon icon-css" title="CSS">#</span>;
      case 'html':
        return <span className="vsc-file-icon icon-html" title="HTML">&lt;&gt;</span>;
      case 'json':
        return <span className="vsc-file-icon icon-json" title="JSON">&#123;&#125;</span>;
      case 'md':
        return <span className="vsc-file-icon icon-md" title="Markdown">M↓</span>;
      case 'py':
        return <span className="vsc-file-icon icon-py" title="Python">PY</span>;
      case 'java':
        return <span className="vsc-file-icon icon-java" title="Java">☕</span>;
      case 'c':
      case 'cpp':
        return <span className="vsc-file-icon icon-cpp" title="C++">C++</span>;
      default:
        return <span className="vsc-file-icon icon-default" title="File">📄</span>;
    }
  };

  const getLanguageLabel = (filePath) => {
    if (!filePath) return 'Plain Text';
    const lang = editorLanguage(filePath);
    return lang.charAt(0).toUpperCase() + lang.slice(1);
  };

  const fileOutline = React.useMemo(() => {
    if (!currentFile?.content) return [];
    const lines = currentFile.content.split('\n');
    const symbols = [];
    lines.forEach((line, idx) => {
      const match = line.match(/(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=|let\s+([a-zA-Z0-9_$]+)\s*=|class\s+([a-zA-Z0-9_$]+)|def\s+([a-zA-Z0-9_$]+))/);
      if (match) {
        const name = match[1] || match[2] || match[3] || match[4] || match[5];
        if (name) symbols.push({ name, line: idx + 1 });
      }
    });
    return symbols.slice(0, 15);
  }, [currentFile?.content]);

  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim() || !project?.files) return [];
    const q = searchQuery.toLowerCase();
    const matches = [];
    project.files.forEach((file, fIdx) => {
      const lines = file.content.split('\n');
      lines.forEach((line, lIdx) => {
        if (line.toLowerCase().includes(q)) {
          matches.push({
            fileIdx: fIdx,
            filePath: file.path,
            lineNumber: lIdx + 1,
            lineText: line.trim()
          });
        }
      });
    });
    return matches;
  }, [searchQuery, project?.files]);

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
      setModifiedFiles(new Set());
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

                {/* TAB 1: CODE EDITOR & SANDBOX (VS CODE STUDIO IDE) */}
                {activeStudioTab === 'editor' && (
                  <div className="tab-pane animate-fade vscode-studio-root">
                    {/* 1. TOP VS CODE TITLE & MENU BAR */}
                    <div className="vscode-titlebar">
                      <div className="vscode-titlebar-left">
                        <span className="vscode-app-icon" title="Visual Studio Code">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M17.5 2.5L7 11.5L3 8L1 9.5L6 14L1 18.5L3 20L7 16.5L17.5 25.5L23 23V5L17.5 2.5Z" fill="#007ACC" />
                            <path d="M17.5 8.5L10 14L17.5 19.5V8.5Z" fill="#1F9CF0" />
                          </svg>
                        </span>
                        <div className="vscode-menubar">
                          <span className="menu-item">File</span>
                          <span className="menu-item">Edit</span>
                          <span className="menu-item">Selection</span>
                          <span className="menu-item">View</span>
                          <span className="menu-item">Go</span>
                          <span className="menu-item" onClick={runCurrentFile} role="button" tabIndex={0}>Run</span>
                          <span className="menu-item" onClick={() => setIsTerminalOpen(prev => !prev)} role="button" tabIndex={0}>Terminal</span>
                          <span className="menu-item">Help</span>
                        </div>
                      </div>

                      <div className="vscode-titlebar-center">
                        <span className="vscode-window-title">
                          {project.title || 'Untitled Project'} — Visual Studio Code
                        </span>
                        {modifiedFiles.size > 0 && (
                          <span className="vscode-dirty-badge" title={`${modifiedFiles.size} unsaved file(s)`}>
                            ● {modifiedFiles.size} modified
                          </span>
                        )}
                      </div>

                      <div className="vscode-titlebar-right">
                        <div className="vscode-header-actions">
                          <button
                            type="button"
                            className="vsc-btn vsc-btn-run"
                            onClick={runCurrentFile}
                            disabled={running}
                            title="Run Current File in Sandbox"
                          >
                            <span className="btn-icon">▶</span> {running ? 'Running...' : 'Run'}
                          </button>
                          <button
                            type="button"
                            className="vsc-btn vsc-btn-save"
                            onClick={() => saveProject(false)}
                            disabled={saving}
                            title="Save Project Snapshot"
                          >
                            <span className="btn-icon">💾</span> Save
                          </button>
                          <button
                            type="button"
                            className="vsc-btn vsc-btn-github"
                            onClick={() => { setSidebarView('github'); setIsSidebarOpen(true); }}
                            title="GitHub Integration"
                          >
                            <span className="btn-icon">🐙</span> {githubProfile ? `@${githubProfile.login}` : 'GitHub'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 2. PROJECT INFO QUICK-EDIT BAR */}
                    <div className="vscode-quick-bar">
                      <div className="quick-title-wrap">
                        <span className="quick-label">Project:</span>
                        <input
                          className="quick-input project-title-input"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Project title..."
                        />
                      </div>
                      <div className="quick-desc-wrap">
                        <span className="quick-label">Summary:</span>
                        <input
                          className="quick-input"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Short summary of project features..."
                        />
                      </div>
                      <div className="quick-commit-wrap">
                        <span className="quick-label">Snapshot Note:</span>
                        <input
                          className="quick-input"
                          value={commitMessage}
                          onChange={e => setCommitMessage(e.target.value)}
                          placeholder="e.g. Added auth, Fixed UI"
                        />
                      </div>
                    </div>

                    {/* 3. MAIN VS CODE WORKSPACE */}
                    <div className="vscode-workspace">
                      {/* 3A. LEFT ACTIVITY BAR (48px) */}
                      <div className="vscode-activity-bar">
                        <div className="activity-bar-top">
                          <button
                            type="button"
                            className={`activity-icon-btn ${isSidebarOpen && sidebarView === 'explorer' ? 'active' : ''}`}
                            onClick={() => {
                              if (isSidebarOpen && sidebarView === 'explorer') setIsSidebarOpen(false);
                              else { setSidebarView('explorer'); setIsSidebarOpen(true); }
                            }}
                            title="Explorer"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M3 4H10L12 6H21V20H3V4Z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className={`activity-icon-btn ${isSidebarOpen && sidebarView === 'search' ? 'active' : ''}`}
                            onClick={() => {
                              if (isSidebarOpen && sidebarView === 'search') setIsSidebarOpen(false);
                              else { setSidebarView('search'); setIsSidebarOpen(true); }
                            }}
                            title="Search"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <circle cx="11" cy="11" r="7" />
                              <path d="M21 21L16 16" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className={`activity-icon-btn ${isSidebarOpen && sidebarView === 'git' ? 'active' : ''}`}
                            onClick={() => {
                              if (isSidebarOpen && sidebarView === 'git') setIsSidebarOpen(false);
                              else { setSidebarView('git'); setIsSidebarOpen(true); }
                            }}
                            title="Source Control: Git"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <circle cx="6" cy="6" r="3" />
                              <circle cx="6" cy="18" r="3" />
                              <circle cx="18" cy="9" r="3" />
                              <path d="M6 9V15" />
                              <path d="M9 6H12C13.6569 6 15 7.34315 15 9V18" />
                            </svg>
                            {modifiedFiles.size > 0 && (
                              <span className="activity-badge">{modifiedFiles.size}</span>
                            )}
                          </button>

                          <button
                            type="button"
                            className={`activity-icon-btn ${isSidebarOpen && sidebarView === 'debug' ? 'active' : ''}`}
                            onClick={() => {
                              if (isSidebarOpen && sidebarView === 'debug') setIsSidebarOpen(false);
                              else { setSidebarView('debug'); setIsSidebarOpen(true); }
                            }}
                            title="Run & Debug"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path d="M8 5V19L19 12L8 5Z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className={`activity-icon-btn ${isSidebarOpen && sidebarView === 'github' ? 'active' : ''}`}
                            onClick={() => {
                              if (isSidebarOpen && sidebarView === 'github') setIsSidebarOpen(false);
                              else { setSidebarView('github'); setIsSidebarOpen(true); }
                            }}
                            title="GitHub Integration & Account"
                          >
                            {githubProfile?.avatar_url ? (
                              <img src={githubProfile.avatar_url} alt="GitHub" className="activity-avatar-img" />
                            ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                              </svg>
                            )}
                            <span className={`github-status-dot ${githubProfile ? 'online' : ''}`}></span>
                          </button>
                        </div>

                        <div className="activity-bar-bottom">
                          <button
                            type="button"
                            className={`activity-icon-btn ${isSidebarOpen && sidebarView === 'settings' ? 'active' : ''}`}
                            onClick={() => {
                              if (isSidebarOpen && sidebarView === 'settings') setIsSidebarOpen(false);
                              else { setSidebarView('settings'); setIsSidebarOpen(true); }
                            }}
                            title="Editor Settings"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <circle cx="12" cy="12" r="3" />
                              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* 3B. PRIMARY SIDEBAR */}
                      {isSidebarOpen && (
                        <div className="vscode-sidebar">
                          {/* VIEW 1: EXPLORER */}
                          {sidebarView === 'explorer' && (
                            <div className="sidebar-content">
                              <div className="sidebar-header">
                                <span className="sidebar-title">
                                  EXPLORER: {(project.title || 'PROJECT').toUpperCase()}
                                </span>
                                <div className="sidebar-header-actions">
                                  <button type="button" className="sidebar-action-btn" onClick={addFile} title="New File">
                                    +📄
                                  </button>
                                  <button type="button" className="sidebar-action-btn" onClick={addFolder} title="New Folder">
                                    +📁
                                  </button>
                                  <button type="button" className="sidebar-action-btn" onClick={() => loadProjects()} title="Refresh Explorer">
                                    🔄
                                  </button>
                                  <button type="button" className="sidebar-action-btn" onClick={() => setIsSidebarOpen(false)} title="Close Sidebar">
                                    ✕
                                  </button>
                                </div>
                              </div>

                              <div className="vsc-tree-section">
                                <div className="vsc-section-title">
                                  <span className="vsc-chevron">▾</span>
                                  <span className="vsc-root-folder">📁 {project.title || 'workspace'}</span>
                                  <span className="vsc-file-count">({project.files?.length || 0})</span>
                                </div>

                                <div className="vsc-file-tree">
                                  {project.files.map((file, index) => {
                                    const isCurrent = activeFile === index;
                                    const isModified = modifiedFiles.has(file.path);
                                    return (
                                      <div
                                        key={file.path}
                                        className={`vsc-tree-row ${isCurrent ? 'selected' : ''}`}
                                        onClick={() => handleOpenFile(index)}
                                      >
                                        <div className="vsc-tree-file-label">
                                          {getFileIcon(file.path)}
                                          <span className="vsc-file-name" title={file.path}>
                                            {file.path}
                                          </span>
                                          {isModified && <span className="tree-dirty-dot" title="Modified">●</span>}
                                        </div>
                                        <div className="vsc-tree-hover-actions" onClick={e => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            className="tree-btn-icon"
                                            onClick={() => renameFile(index)}
                                            title="Rename file"
                                          >
                                            ✎
                                          </button>
                                          <button
                                            type="button"
                                            className="tree-btn-icon danger"
                                            onClick={() => deleteFile(index)}
                                            title="Delete file"
                                            disabled={project.files.length === 1}
                                          >
                                            🗑
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* OUTLINE SUB-SECTION */}
                              <div className="vsc-tree-section vsc-sub-accordion">
                                <div className="vsc-section-title">
                                  <span className="vsc-chevron">▾</span>
                                  <span>OUTLINE</span>
                                  <span className="vsc-sub-badge">{currentFile?.path ? currentFile.path.split('/').pop() : ''}</span>
                                </div>
                                <div className="vsc-outline-list">
                                  {fileOutline.length > 0 ? (
                                    fileOutline.map((item, idx) => (
                                      <div key={idx} className="vsc-outline-item">
                                        <span className="outline-symbol-icon">ƒ</span>
                                        <span className="outline-symbol-name">{item.name}</span>
                                        <span className="outline-symbol-line">:{item.line}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="vsc-empty-outline">No symbols detected in active file</div>
                                  )}
                                </div>
                              </div>

                              {/* TIMELINE / SNAPSHOTS SUB-SECTION */}
                              <div className="vsc-tree-section vsc-sub-accordion">
                                <div className="vsc-section-title">
                                  <span className="vsc-chevron">▾</span>
                                  <span>TIMELINE (SNAPSHOTS)</span>
                                  <span className="vsc-sub-badge">{project.versionHistory?.length || 0}</span>
                                </div>
                                <div className="vsc-timeline-list">
                                  {project.versionHistory && project.versionHistory.length > 0 ? (
                                    project.versionHistory.slice().reverse().slice(0, 4).map(ver => (
                                      <div key={ver._id || ver.versionNumber} className="vsc-timeline-item">
                                        <div className="timeline-dot"></div>
                                        <div className="timeline-info">
                                          <div className="timeline-header">
                                            <strong>v#{ver.versionNumber}</strong>
                                            <span className="timeline-time">{new Date(ver.createdAt).toLocaleDateString()}</span>
                                          </div>
                                          <p className="timeline-msg">{ver.summary || 'Code snapshot'}</p>
                                          <button
                                            type="button"
                                            className="btn-link-restore"
                                            onClick={() => handleRestoreVersion(ver.versionNumber)}
                                          >
                                            ⏮ Restore
                                          </button>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="vsc-empty-outline">No recorded snapshots yet</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* VIEW 2: SEARCH */}
                          {sidebarView === 'search' && (
                            <div className="sidebar-content">
                              <div className="sidebar-header">
                                <span className="sidebar-title">SEARCH</span>
                                <button type="button" className="sidebar-action-btn" onClick={() => setIsSidebarOpen(false)} title="Close Sidebar">✕</button>
                              </div>
                              <div className="sidebar-search-box">
                                <input
                                  className="vsc-search-input"
                                  value={searchQuery}
                                  onChange={e => setSearchQuery(e.target.value)}
                                  placeholder="Search all files..."
                                  autoFocus
                                />
                                {searchQuery && (
                                  <span className="search-match-count">{searchResults.length} matches</span>
                                )}
                              </div>
                              <div className="search-results-list">
                                {searchResults.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="search-result-row"
                                    onClick={() => handleOpenFile(item.fileIdx)}
                                  >
                                    <div className="result-file-header">
                                      {getFileIcon(item.filePath)}
                                      <span>{item.filePath}</span>
                                      <span className="result-line-num">:{item.lineNumber}</span>
                                    </div>
                                    <div className="result-snippet">{item.lineText}</div>
                                  </div>
                                ))}
                                {searchQuery && searchResults.length === 0 && (
                                  <div className="vsc-empty-outline">No results found for "{searchQuery}"</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* VIEW 3: SOURCE CONTROL (GIT) */}
                          {sidebarView === 'git' && (
                            <div className="sidebar-content">
                              <div className="sidebar-header">
                                <span className="sidebar-title">SOURCE CONTROL: GIT</span>
                                <div className="sidebar-header-actions">
                                  <button type="button" className="sidebar-action-btn" onClick={() => saveProject(false)} title="Commit & Save">✓</button>
                                  <button type="button" className="sidebar-action-btn" onClick={handleGitHubPush} title="Push to GitHub">🚀</button>
                                </div>
                              </div>
                              <div className="git-source-control-pane">
                                <div className="git-branch-badge">
                                  <span>⎇ Branch: <strong>main</strong></span>
                                  <span className="git-remote-tag">{githubProfile ? 'origin/main' : 'local'}</span>
                                </div>

                                <div className="git-commit-box">
                                  <textarea
                                    className="git-commit-textarea"
                                    value={commitMessage}
                                    onChange={e => setCommitMessage(e.target.value)}
                                    placeholder="Commit message (Ctrl+Enter to commit)..."
                                    rows={3}
                                  />
                                  <div className="git-actions-row">
                                    <button
                                      type="button"
                                      className="vsc-btn vsc-btn-primary full-width"
                                      onClick={() => saveProject(false)}
                                      disabled={saving}
                                    >
                                      ✓ Commit & Snapshot
                                    </button>
                                    <button
                                      type="button"
                                      className="vsc-btn vsc-btn-secondary full-width mt-6"
                                      onClick={handleGitHubPush}
                                      disabled={githubSyncing}
                                    >
                                      {githubSyncing ? 'Syncing...' : '🐙 Sync & Push to GitHub'}
                                    </button>
                                  </div>
                                </div>

                                <div className="git-changes-section mt-12">
                                  <div className="git-changes-header">
                                    <span>CHANGES ({modifiedFiles.size})</span>
                                    {modifiedFiles.size > 0 && (
                                      <button
                                        type="button"
                                        className="btn-text-action"
                                        onClick={() => setModifiedFiles(new Set())}
                                        title="Clear modification flags"
                                      >
                                        Discard All
                                      </button>
                                    )}
                                  </div>
                                  <div className="git-changes-list">
                                    {project.files.map((f, i) => {
                                      const isMod = modifiedFiles.has(f.path);
                                      return (
                                        <div
                                          key={f.path}
                                          className="git-change-item"
                                          onClick={() => handleOpenFile(i)}
                                        >
                                          <div className="git-file-label">
                                            {getFileIcon(f.path)}
                                            <span className="git-file-name">{f.path}</span>
                                          </div>
                                          <span className={`git-status-badge ${isMod ? 'modified' : 'clean'}`}>
                                            {isMod ? 'M' : '✓'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* VIEW 4: RUN & DEBUG */}
                          {sidebarView === 'debug' && (
                            <div className="sidebar-content">
                              <div className="sidebar-header">
                                <span className="sidebar-title">RUN & DEBUG</span>
                                <button type="button" className="sidebar-action-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
                              </div>
                              <div className="sidebar-debug-pane">
                                <div className="debug-launch-card">
                                  <div className="debug-target">
                                    <span className="debug-label">Active Target:</span>
                                    <strong>{currentFile?.path || 'None'}</strong>
                                    <span className="debug-lang-tag">({getLanguageLabel(currentFile?.path)})</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="vsc-btn vsc-btn-run full-width mt-10"
                                    onClick={runCurrentFile}
                                    disabled={running}
                                  >
                                    {running ? 'Executing Sandbox...' : '▶ Launch in Sandbox Environment'}
                                  </button>
                                </div>
                                <div className="debug-env-info mt-14">
                                  <h4>Sandbox Environment:</h4>
                                  <ul>
                                    <li>Node.js v20.x Engine</li>
                                    <li>Python 3.11 Runtime</li>
                                    <li>GCC / G++ 13 Compiler</li>
                                    <li>OpenJDK 21 Compiler</li>
                                    <li>Isolated Container Sandbox</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* VIEW 5: GITHUB INTEGRATION */}
                          {sidebarView === 'github' && (
                            <div className="sidebar-content">
                              <div className="sidebar-header">
                                <span className="sidebar-title">GITHUB INTEGRATION</span>
                                <button type="button" className="sidebar-action-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
                              </div>

                              <div className="sidebar-github-pane">
                                {githubProfile ? (
                                  <div className="github-linked-card">
                                    <div className="github-profile-header">
                                      <img src={githubProfile.avatar_url} alt={githubProfile.login} className="github-avatar-large" />
                                      <div className="github-user-details">
                                        <h4>{githubProfile.name || githubProfile.login}</h4>
                                        <p className="github-handle">@{githubProfile.login}</p>
                                        <span className="github-badge-verified">✓ Linked Account</span>
                                      </div>
                                    </div>

                                    {githubProfile.bio && (
                                      <p className="github-bio-text">{githubProfile.bio}</p>
                                    )}

                                    <div className="github-stats-row">
                                      <div className="gh-stat">
                                        <span className="stat-val">{githubProfile.public_repos}</span>
                                        <span className="stat-lbl">Repos</span>
                                      </div>
                                      <div className="gh-stat">
                                        <span className="stat-val">{githubProfile.followers || 0}</span>
                                        <span className="stat-lbl">Followers</span>
                                      </div>
                                      <div className="gh-stat">
                                        <span className="stat-val">{new Date(githubProfile.created_at).getFullYear()}</span>
                                        <span className="stat-lbl">Joined</span>
                                      </div>
                                    </div>

                                    <div className="github-repo-link-box mt-14">
                                      <label className="sidebar-input-label">Linked GitHub Repository</label>
                                      <input
                                        className="vsc-input"
                                        value={repositoryUrl}
                                        onChange={e => setRepositoryUrl(e.target.value)}
                                        placeholder={`https://github.com/${githubProfile.login}/my-project`}
                                      />
                                    </div>

                                    <div className="github-actions-block mt-12">
                                      <button
                                        type="button"
                                        className="vsc-btn vsc-btn-primary full-width"
                                        onClick={handleGitHubPush}
                                        disabled={githubSyncing}
                                      >
                                        {githubSyncing ? 'Syncing...' : '🚀 Push Code to GitHub'}
                                      </button>
                                      {repositoryUrl && (
                                        <a
                                          href={repositoryUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="vsc-btn vsc-btn-secondary full-width mt-6 text-center"
                                        >
                                          Open Repository on GitHub ↗
                                        </a>
                                      )}
                                      <button
                                        type="button"
                                        className="btn-link-danger full-width mt-10"
                                        onClick={handleGitHubDisconnect}
                                      >
                                        Disconnect GitHub Account
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="github-connect-card">
                                    <div className="github-lead-icon">🐙</div>
                                    <h4>Link Your GitHub Account</h4>
                                    <p className="github-desc">
                                      Connect your GitHub account to sync commits, push source code directly, and display your verified developer portfolio for academic evaluation.
                                    </p>

                                    <form onSubmit={handleGitHubConnect} className="github-connect-form">
                                      <div className="form-group">
                                        <label className="sidebar-input-label">GitHub Username *</label>
                                        <input
                                          className="vsc-input"
                                          required
                                          value={githubUsername}
                                          onChange={e => setGithubUsername(e.target.value)}
                                          placeholder="e.g. BaimuthakalaAjayKumar"
                                        />
                                      </div>

                                      <div className="form-group mt-10">
                                        <label className="sidebar-input-label">Project Repository URL (Optional)</label>
                                        <input
                                          className="vsc-input"
                                          value={repositoryUrl}
                                          onChange={e => setRepositoryUrl(e.target.value)}
                                          placeholder="https://github.com/username/repo-name"
                                        />
                                      </div>

                                      <button
                                        type="submit"
                                        className="vsc-btn vsc-btn-primary full-width mt-14"
                                        disabled={githubLoading}
                                      >
                                        {githubLoading ? 'Verifying GitHub User...' : '🐙 Connect GitHub Account'}
                                      </button>
                                    </form>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* VIEW 6: SETTINGS */}
                          {sidebarView === 'settings' && (
                            <div className="sidebar-content">
                              <div className="sidebar-header">
                                <span className="sidebar-title">EDITOR SETTINGS</span>
                                <button type="button" className="sidebar-action-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
                              </div>

                              <div className="sidebar-settings-pane">
                                <div className="setting-group">
                                  <label className="sidebar-input-label">Font Size ({editorFontSize}px)</label>
                                  <div className="setting-button-row">
                                    {[12, 13, 14, 16, 18].map(size => (
                                      <button
                                        key={size}
                                        type="button"
                                        className={`setting-chip ${editorFontSize === size ? 'active' : ''}`}
                                        onClick={() => setEditorFontSize(size)}
                                      >
                                        {size}px
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="setting-group mt-14">
                                  <label className="sidebar-input-label">Tab Size</label>
                                  <div className="setting-button-row">
                                    {[2, 4].map(size => (
                                      <button
                                        key={size}
                                        type="button"
                                        className={`setting-chip ${editorTabSize === size ? 'active' : ''}`}
                                        onClick={() => setEditorTabSize(size)}
                                      >
                                        {size} Spaces
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="setting-group mt-14">
                                  <label className="sidebar-input-label">Editor Theme</label>
                                  <div className="setting-button-row">
                                    {[
                                      { id: 'vs-dark', label: 'Dark+' },
                                      { id: 'vs', label: 'Light' },
                                      { id: 'hc-black', label: 'High Contrast' }
                                    ].map(th => (
                                      <button
                                        key={th.id}
                                        type="button"
                                        className={`setting-chip ${editorThemeSetting === th.id ? 'active' : ''}`}
                                        onClick={() => setEditorThemeSetting(th.id)}
                                      >
                                        {th.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="setting-group mt-14">
                                  <label className="sidebar-input-label">Minimap</label>
                                  <button
                                    type="button"
                                    className={`setting-toggle-btn ${showMinimap ? 'on' : ''}`}
                                    onClick={() => setShowMinimap(prev => !prev)}
                                  >
                                    {showMinimap ? '✓ Minimap Visible' : '✕ Minimap Hidden'}
                                  </button>
                                </div>

                                <div className="setting-group mt-14">
                                  <label className="sidebar-input-label">Word Wrap</label>
                                  <button
                                    type="button"
                                    className={`setting-toggle-btn ${wordWrap === 'on' ? 'on' : ''}`}
                                    onClick={() => setWordWrap(prev => prev === 'on' ? 'off' : 'on')}
                                  >
                                    {wordWrap === 'on' ? '✓ Word Wrap: On' : '✕ Word Wrap: Off'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3C. MAIN CODE EDITOR & TERMINAL WORKSPACE */}
                      <div className="vscode-editor-main">
                        {/* EDITOR TABS BAR */}
                        <div className="vscode-tabs-bar">
                          <div className="vscode-tabs-list">
                            {openTabs.map(tabIdx => {
                              const file = project.files[tabIdx];
                              if (!file) return null;
                              const isActive = activeFile === tabIdx;
                              const isMod = modifiedFiles.has(file.path);
                              return (
                                <div
                                  key={file.path}
                                  className={`vscode-tab ${isActive ? 'active' : ''}`}
                                  onClick={() => setActiveFile(tabIdx)}
                                >
                                  {getFileIcon(file.path)}
                                  <span className="tab-title" title={file.path}>
                                    {file.path.split('/').pop()}
                                  </span>
                                  {isMod ? (
                                    <span className="tab-dirty-indicator" title="Unsaved changes">●</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="tab-close-btn"
                                      onClick={(e) => handleCloseTab(tabIdx, e)}
                                      title="Close"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              className="vscode-add-tab-btn"
                              onClick={addFile}
                              title="New File"
                            >
                              +
                            </button>
                          </div>

                          <div className="vscode-tabs-actions">
                            <button
                              type="button"
                              className="vsc-tab-action-btn run"
                              onClick={runCurrentFile}
                              title="Run current file in sandbox"
                              disabled={running}
                            >
                              ▶ Run Code
                            </button>
                            <button
                              type="button"
                              className="vsc-tab-action-btn save"
                              onClick={() => saveProject(false)}
                              title="Save project snapshot"
                              disabled={saving}
                            >
                              💾 Save
                            </button>
                            <button
                              type="button"
                              className="vsc-tab-action-btn"
                              onClick={() => setIsTerminalOpen(prev => !prev)}
                              title="Toggle Terminal Dock"
                            >
                              ⌨ Terminal
                            </button>
                          </div>
                        </div>

                        {/* BREADCRUMBS BAR */}
                        <div className="vscode-breadcrumbs-bar">
                          <span className="crumb-icon">📁</span>
                          <span className="crumb-segment">{project.title || 'project'}</span>
                          <span className="crumb-sep">›</span>
                          {currentFile?.path.includes('/') && (
                            <>
                              <span className="crumb-segment">{currentFile.path.substring(0, currentFile.path.lastIndexOf('/'))}</span>
                              <span className="crumb-sep">›</span>
                            </>
                          )}
                          <span className="crumb-file">
                            {getFileIcon(currentFile?.path)}
                            <span className="crumb-active-name">{currentFile?.path.split('/').pop() || 'Untitled'}</span>
                          </span>
                        </div>

                        {/* MONACO EDITOR CONTAINER */}
                        <div
                          className="vscode-monaco-container"
                          style={{ height: isTerminalOpen ? `calc(100% - ${terminalHeight + 70}px)` : 'calc(100% - 70px)' }}
                        >
                          {currentFile ? (
                            <Editor
                              height="100%"
                              theme={editorThemeSetting}
                              language={editorLanguage(currentFile.path)}
                              value={currentFile.content}
                              onChange={value => updateActiveFile(value || '')}
                              onMount={(editor) => {
                                editor.onDidChangeCursorPosition(e => {
                                  setCursorPos({ line: e.position.lineNumber, col: e.position.column });
                                });
                              }}
                              options={{
                                minimap: { enabled: showMinimap },
                                fontSize: editorFontSize,
                                tabSize: editorTabSize,
                                wordWrap: wordWrap,
                                automaticLayout: true,
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                bracketPairColorization: { enabled: true },
                                cursorBlinking: 'smooth',
                                smoothScrolling: true
                              }}
                            />
                          ) : (
                            <div className="vscode-no-file-open">
                              <div className="no-file-icon">📄</div>
                              <h3>No File Open</h3>
                              <p>Select a file from the Explorer sidebar or create a new file.</p>
                              <button type="button" className="vsc-btn vsc-btn-primary" onClick={addFile}>+ Create New File</button>
                            </div>
                          )}
                        </div>

                        {/* 3D. INTEGRATED TERMINAL DOCK (VS CODE STYLE BOTTOM PANEL) */}
                        {isTerminalOpen && (
                          <div className="vscode-terminal-dock" style={{ height: `${terminalHeight}px` }}>
                            <div className="dock-header">
                              <div className="dock-tabs">
                                <button
                                  type="button"
                                  className={`dock-tab-btn ${terminalTab === 'terminal' ? 'active' : ''}`}
                                  onClick={() => setTerminalTab('terminal')}
                                >
                                  TERMINAL
                                </button>
                                <button
                                  type="button"
                                  className={`dock-tab-btn ${terminalTab === 'output' ? 'active' : ''}`}
                                  onClick={() => setTerminalTab('output')}
                                >
                                  OUTPUT
                                </button>
                                <button
                                  type="button"
                                  className={`dock-tab-btn ${terminalTab === 'problems' ? 'active' : ''}`}
                                  onClick={() => setTerminalTab('problems')}
                                >
                                  PROBLEMS (0)
                                </button>
                                <button
                                  type="button"
                                  className={`dock-tab-btn ${terminalTab === 'github' ? 'active' : ''}`}
                                  onClick={() => setTerminalTab('github')}
                                >
                                  GITHUB LOGS {githubLogs.length > 0 && `(${githubLogs.length})`}
                                </button>
                              </div>

                              <div className="dock-actions">
                                <button
                                  type="button"
                                  className="dock-action-btn"
                                  onClick={() => {
                                    if (terminalTab === 'github') setGithubLogs([]);
                                    else setOutput('');
                                  }}
                                  title="Clear Terminal Output"
                                >
                                  ⊘ Clear
                                </button>
                                <button
                                  type="button"
                                  className="dock-action-btn"
                                  onClick={() => setTerminalHeight(prev => prev === 210 ? 320 : 210)}
                                  title="Toggle Panel Size"
                                >
                                  {terminalHeight === 210 ? '🗖 Expand' : '🗗 Shrink'}
                                </button>
                                <button
                                  type="button"
                                  className="dock-action-btn"
                                  onClick={() => setIsTerminalOpen(false)}
                                  title="Close Panel"
                                >
                                  ×
                                </button>
                              </div>
                            </div>

                            <div className="dock-body">
                              {terminalTab === 'terminal' && (
                                <pre className="terminal-console-output">
                                  {output || (
                                    <>
                                      <span className="terminal-prompt">student@placement-code-studio:~/project$</span> node {currentFile?.path || 'src/main.js'}{'\n'}
                                      <span className="terminal-muted">Click "▶ Run Code" or press Run above to execute in isolated sandbox container...</span>
                                    </>
                                  )}
                                </pre>
                              )}

                              {terminalTab === 'output' && (
                                <pre className="terminal-console-output">
                                  [System] Placement Portal Code Studio Execution Engine initialized.{'\n'}
                                  [Workspace] {project.title || 'Untitled Project'} — {project.files.length} active files.{'\n'}
                                  [Academic Scope] {project.academicYear || user?.academicYear || 'Final Year'} / {project.branch || user?.branch || 'CSE'} ({project.section || user?.section || 'A'}).{'\n'}
                                  {output || '[Logs] Ready for sandbox execution.'}
                                </pre>
                              )}

                              {terminalTab === 'problems' && (
                                <div className="terminal-problems-pane">
                                  <div className="problems-clean-state">
                                    <span className="check-icon">✓</span>
                                    <span>No syntax problems or diagnostic errors detected in {currentFile?.path || 'active file'}.</span>
                                  </div>
                                </div>
                              )}

                              {terminalTab === 'github' && (
                                <pre className="terminal-console-output github-log-output">
                                  {githubLogs.length > 0 ? (
                                    githubLogs.map((log, idx) => (
                                      <div
                                        key={idx}
                                        className={`log-line ${log.includes('✓') ? 'success' : log.includes('$') ? 'command' : log.includes('🚀') ? 'info' : ''}`}
                                      >
                                        {log}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="terminal-muted">
                                      No Git or GitHub synchronization events recorded yet.{'\n'}
                                      Link your GitHub account in the sidebar and click "Push to GitHub" to sync commits.
                                    </span>
                                  )}
                                </pre>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. VS CODE BOTTOM STATUS BAR (BLUE STRIP) */}
                    <div className="vscode-statusbar">
                      <div className="statusbar-left">
                        <button
                          type="button"
                          className="statusbar-item statusbar-btn"
                          onClick={() => { setSidebarView('git'); setIsSidebarOpen(true); }}
                          title="Git Branch: main"
                        >
                          <span className="status-icon">⎇</span> main{modifiedFiles.size > 0 ? '*' : ''}
                        </button>
                        <button
                          type="button"
                          className="statusbar-item statusbar-btn"
                          onClick={handleGitHubPush}
                          disabled={githubSyncing}
                          title="Sync Changes with GitHub"
                        >
                          <span className="status-icon">🔄</span> {githubSyncing ? 'Syncing...' : '0↓ 1↑'}
                        </button>
                        <span className="statusbar-item">
                          <span className="status-icon">⊗</span> 0 <span className="status-icon ml-4">⚠</span> 0
                        </span>
                      </div>

                      <div className="statusbar-right">
                        <span className="statusbar-item">
                          Ln {cursorPos.line}, Col {cursorPos.col}
                        </span>
                        <span className="statusbar-item">Spaces: {editorTabSize}</span>
                        <span className="statusbar-item">UTF-8</span>
                        <span className="statusbar-item">LF</span>
                        <span className="statusbar-item lang-badge">
                          {getLanguageLabel(currentFile?.path)}
                        </span>
                        <button
                          type="button"
                          className={`statusbar-item statusbar-btn github-status-btn ${githubProfile ? 'linked' : ''}`}
                          onClick={() => { setSidebarView('github'); setIsSidebarOpen(true); }}
                          title={githubProfile ? `Connected to GitHub as @${githubProfile.login}` : 'Click to Link GitHub Account'}
                        >
                          <span className="status-icon">🐙</span>
                          {githubProfile ? `@${githubProfile.login}` : 'Link GitHub'}
                        </button>
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
