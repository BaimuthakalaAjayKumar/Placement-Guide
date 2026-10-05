import React, { useEffect, useState, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import JSZip from 'jszip';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import { PROJECT_TEMPLATES } from '../utils/projectTemplates';
import { bundleProjectForPreview, isWebProject, isReactProject } from '../utils/previewBundler';
import './ProjectStudio.css';

const COMMON_TECHS = [
  'React', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript', 'TypeScript',
  'Python', 'FastAPI', 'Django', 'Next.js', 'TailwindCSS', 'PostgreSQL',
  'MySQL', 'Docker', 'AWS', 'TensorFlow', 'PyTorch', 'Java', 'C++', 'Firebase'
];

const editorLanguage = (filePath) => {
  if (!filePath) return 'plaintext';
  const extension = filePath.split('.').pop().toLowerCase();
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
  const [activeStudioTab, setActiveStudioTab] = useState('editor'); // 'editor' | 'details' | 'team' | 'feedback' | 'history'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  // Monaco Editor Ref
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goals, setGoals] = useState('');
  const [deploymentUrl, setDeploymentUrl] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [technologies, setTechnologies] = useState([]);
  const [techInput, setTechInput] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  // Faculty Evaluation Fields (Review Mode)
  const [facultyGrade, setFacultyGrade] = useState('');
  const [facultyFeedback, setFacultyFeedback] = useState('');
  const [facultyCodeSuggestions, setFacultyCodeSuggestions] = useState('');
  const [facultyTechSuggestions, setFacultyTechSuggestions] = useState('');
  const [facultyStatus, setFacultyStatus] = useState('submitted');

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
  const [sidebarView, setSidebarView] = useState('explorer'); // 'explorer' | 'search' | 'git' | 'debug' | 'github' | 'ai' | 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [terminalTab, setTerminalTab] = useState('terminal'); // 'terminal' | 'output' | 'problems' | 'debug' | 'github'
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(210);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [editorTabSize, setEditorTabSize] = useState(2);
  const [showMinimap, setShowMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState('on');
  const [editorThemeSetting, setEditorThemeSetting] = useState(theme === 'light' ? 'vs' : 'vs-dark');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [openTabs, setOpenTabs] = useState([0]);
  const [modifiedFiles, setModifiedFiles] = useState(new Set());
  const [expandedFolders, setExpandedFolders] = useState(new Set(['src', 'src/components', 'templates', 'public']));

  // Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('react-vite');
  const [newProjectName, setNewProjectName] = useState('');

  // Debounced Autosave State
  const [autosaveStatus, setAutosaveStatus] = useState('idle'); // 'idle' | 'typing' | 'saving' | 'saved'

  // Structured Execution Sandbox State
  const [structuredOutput, setStructuredOutput] = useState(null);
  const [problems, setProblems] = useState([]);

  // Live Web Preview State
  const [previewActive, setPreviewActive] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [previewKey, setPreviewKey] = useState(1);
  const [previewStatus, setPreviewStatus] = useState('stopped'); // 'stopped' | 'starting' | 'running' | 'error'
  const [debugLogs, setDebugLogs] = useState([]);

  // Search in Files State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchWholeWord, setSearchWholeWord] = useState(false);
  const [searchFileFilter, setSearchFileFilter] = useState('');

  // Interactive Terminal State
  const [terminalCmd, setTerminalCmd] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([
    'Welcome to CampusBridge Web IDE Terminal.',
    'Type "help" to see available commands or click "▶ Run Code" / "▶ Run Project" above.'
  ]);

  // AI Coding Assistant State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiContextScope, setAiContextScope] = useState('file'); // 'file' | 'project'
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // GitHub Account Linking State
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || '');
  const [githubProfile, setGithubProfile] = useState(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubLogs, setGithubLogs] = useState([]);

  // Active file & Feedback Helpers
  const currentFile = project?.files?.[activeFile] || null;
  const hasFeedback = Boolean(project && (project.codeSuggestions || project.techSuggestions || project.feedback || project.grade !== null));

  // Role Checks
  const isFacultyOrAdmin = ['faculty', 'admin', 'hod'].includes(user?.role);
  const isStudentAuthor = project?.student?._id === user?._id || project?.student === user?._id || project?.student?.id === user?.id;
  const isReviewMode = isFacultyOrAdmin && !isStudentAuthor && Boolean(project);

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

  // Iframe console message listener
  useEffect(() => {
    const handlePreviewMessage = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'PREVIEW_CONSOLE') {
        const time = new Date().toLocaleTimeString();
        setDebugLogs(prev => [...prev.slice(-100), { level: e.data.level, message: `[${time}] ${e.data.message}` }]);
        if (e.data.level === 'error') {
          setPreviewStatus('error');
          setProblems(prev => [
            {
              file: e.data.filename ? e.data.filename.split('/').pop() : 'App.jsx',
              line: e.data.lineno || 1,
              message: e.data.message,
              severity: 'error'
            },
            ...prev
          ]);
        }
      } else if (e.data.type === 'PREVIEW_LOADED') {
        setPreviewStatus('running');
      }
    };
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, []);

  // Debounced Autosave Effect
  useEffect(() => {
    if (!project || !project._id || modifiedFiles.size === 0 || isReviewMode) return;

    setAutosaveStatus('typing');
    const timer = setTimeout(async () => {
      try {
        setAutosaveStatus('saving');
        await request(`${API_URL}/academic/projects/${project._id}`, {
          method: 'PUT',
          body: JSON.stringify({
            files: project.files,
            isAutosave: true
          })
        });
        setAutosaveStatus('saved');
        setModifiedFiles(new Set());
        setTimeout(() => setAutosaveStatus('idle'), 3000);
      } catch (err) {
        console.warn('Debounced autosave failed:', err);
        setAutosaveStatus('idle');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [project?.files]);

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
    setStructuredOutput(null);
    setProblems([]);
    setDebugLogs([]);
    setPreviewActive(isWebProject(selected.files));
    setPreviewStatus(isWebProject(selected.files) ? 'stopped' : 'stopped');

    // Populate faculty review state
    setFacultyGrade(selected.grade !== null && selected.grade !== undefined ? selected.grade : '');
    setFacultyFeedback(selected.feedback || '');
    setFacultyCodeSuggestions(selected.codeSuggestions || '');
    setFacultyTechSuggestions(selected.techSuggestions || '');
    setFacultyStatus(selected.status || 'submitted');
  };

  // Create Project with Starter Template
  const handleOpenCreateModal = () => {
    setNewProjectName('Interactive Web Application');
    setSelectedTemplateId('react-vite');
    setShowTemplateModal(true);
  };

  const createProjectFromTemplate = async () => {
    try {
      setSaving(true);
      setShowTemplateModal(false);

      const chosen = PROJECT_TEMPLATES.find(t => t.id === selectedTemplateId) || PROJECT_TEMPLATES[0];
      const initialTitle = newProjectName.trim() || chosen.defaultTitle;

      const data = await request(`${API_URL}/academic/projects`, {
        method: 'POST',
        body: JSON.stringify({
          title: initialTitle,
          description: chosen.description,
          goals: `Develop a comprehensive ${chosen.name} application using CampusBridge Web IDE.`,
          academicYear: user?.academicYear || user?.year || 'Final Year',
          branch: user?.branch || '',
          section: user?.section || '',
          technologies: chosen.techs,
          teamMembers: [],
          deploymentUrl: '',
          repositoryUrl: '',
          projectType: chosen.projectType,
          template: chosen.id,
          files: chosen.files,
          milestones: []
        })
      });

      setProjects(previous => [data.data, ...previous]);
      selectProject(data.data);
      setActiveStudioTab('editor');
      setMessage(`🎉 Created new project from "${chosen.name}" template with starter files!`);
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
    if (!project?.files?.[activeFile] || isReviewMode) return;
    const currentPath = project.files[activeFile].path;
    setModifiedFiles(prev => new Set(prev).add(currentPath));
    setProject(previous => ({
      ...previous,
      files: previous.files.map((file, index) => index === activeFile ? { ...file, content } : file)
    }));
  };

  // Jump to specific file and line in Monaco
  const jumpToFileAndLine = (fileIdx, lineNumber = 1) => {
    handleOpenFile(fileIdx);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(lineNumber);
        editorRef.current.setPosition({ lineNumber, column: 1 });
        editorRef.current.focus();
      }
    }, 100);
  };

  const jumpToPathAndLine = (filePath, lineNumber = 1) => {
    if (!project?.files) return;
    const idx = project.files.findIndex(f => f.path === filePath || f.path.endsWith('/' + filePath));
    if (idx !== -1) {
      jumpToFileAndLine(idx, lineNumber);
    }
  };

  // Format Document in Monaco
  const formatDocument = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  };

  // File Tree Operations
  const addFile = () => {
    if (!project || isReviewMode) return;
    const path = window.prompt('Enter file path (e.g. src/components/Header.jsx, styles.css):', 'src/new-file.js')?.trim();
    if (!path) return;
    if (project.files.some(file => file.path === path)) {
      alert(`File "${path}" already exists.`);
      return;
    }
    const newFiles = [...project.files, { path, content: '' }];
    setProject(previous => ({ ...previous, files: newFiles }));
    const newIdx = project.files.length;
    handleOpenFile(newIdx);
    setModifiedFiles(prev => new Set(prev).add(path));
  };

  const addFolder = () => {
    if (!project || isReviewMode) return;
    const folder = window.prompt('Enter folder path (e.g. src/components, routes, utils):', 'src/components')?.trim();
    if (!folder) return;
    const path = `${folder}/index.js`;
    if (project.files.some(file => file.path === path)) {
      alert(`File "${path}" already exists.`);
      return;
    }
    const newFiles = [...project.files, { path, content: `// Module: ${folder}\n` }];
    setProject(prev => ({ ...prev, files: newFiles }));
    const newIdx = project.files.length;
    handleOpenFile(newIdx);
    setModifiedFiles(prev => new Set(prev).add(path));
    setExpandedFolders(prev => new Set(prev).add(folder));
  };

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const addFileInFolder = (folderPath) => {
    if (isReviewMode) return;
    const fileName = window.prompt(`Enter file name inside "${folderPath}/":`, 'Component.jsx')?.trim();
    if (!fileName) return;
    const fullPath = `${folderPath}/${fileName}`;
    if (project.files.some(f => f.path === fullPath)) {
      alert(`File "${fullPath}" already exists.`);
      return;
    }
    const newFiles = [...project.files, { path: fullPath, content: '' }];
    setProject(prev => ({ ...prev, files: newFiles }));
    const newIdx = project.files.length;
    handleOpenFile(newIdx);
    setModifiedFiles(prev => new Set(prev).add(fullPath));
    setExpandedFolders(prev => new Set(prev).add(folderPath));
  };

  const addFolderInFolder = (parentFolder) => {
    if (isReviewMode) return;
    const folderName = window.prompt(`Enter subfolder name inside "${parentFolder}/":`, 'utils')?.trim();
    if (!folderName) return;
    const fullPath = `${parentFolder}/${folderName}/index.js`;
    if (project.files.some(f => f.path === fullPath)) {
      alert(`Folder already exists.`);
      return;
    }
    const newFiles = [...project.files, { path: fullPath, content: `// Module: ${folderName}\n` }];
    setProject(prev => ({ ...prev, files: newFiles }));
    const newIdx = project.files.length;
    handleOpenFile(newIdx);
    setExpandedFolders(prev => new Set(prev).add(`${parentFolder}/${folderName}`));
  };

  const deleteFolder = (folderPath) => {
    if (isReviewMode) return;
    if (!window.confirm(`Delete folder "${folderPath}" and all contained files?`)) return;
    const prefix = folderPath + '/';
    const remaining = project.files.filter(f => !f.path.startsWith(prefix) && f.path !== folderPath);
    if (remaining.length === 0) {
      alert('Cannot delete all files in project.');
      return;
    }
    setProject(prev => ({ ...prev, files: remaining }));
    setActiveFile(0);
    setOpenTabs([0]);
  };

  const renameFile = (index) => {
    if (!project?.files?.[index] || isReviewMode) return;
    const oldPath = project.files[index].path;
    const newPath = window.prompt(`Rename "${oldPath}" to:`, oldPath)?.trim();
    if (!newPath || newPath === oldPath) return;
    if (project.files.some((f, i) => i !== index && f.path === newPath)) {
      alert(`File "${newPath}" already exists.`);
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

  const duplicateFile = (index) => {
    if (!project?.files?.[index] || isReviewMode) return;
    const src = project.files[index];
    const ext = src.path.includes('.') ? '.' + src.path.split('.').pop() : '';
    const base = ext ? src.path.slice(0, -ext.length) : src.path;
    const newPath = `${base}-copy${ext}`;
    if (project.files.some(f => f.path === newPath)) {
      alert(`File "${newPath}" already exists.`);
      return;
    }
    const newFiles = [...project.files, { path: newPath, content: src.content }];
    setProject(prev => ({ ...prev, files: newFiles }));
    const newIdx = project.files.length;
    handleOpenFile(newIdx);
    setModifiedFiles(prev => new Set(prev).add(newPath));
  };

  const downloadSingleFile = (file) => {
    if (!file) return;
    const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteFile = (indexToDelete = activeFile) => {
    if (!project?.files?.[indexToDelete] || project.files.length === 1 || isReviewMode) {
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
    if (!project || isReviewMode) return;
    if (!window.confirm(`Delete project "${project.title}"? This action cannot be undone.`)) return;
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

  // Download Complete Project as ZIP using JSZip
  const downloadProjectZip = async () => {
    if (!project?.files || project.files.length === 0) return;
    try {
      setMessage('📦 Generating complete project ZIP archive...');
      const zip = new JSZip();
      project.files.forEach(f => {
        zip.file(f.path, f.content || '');
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(project.title || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage('✓ Project ZIP downloaded successfully with all folders and files!');
    } catch (e) {
      setMessage(`ZIP generation error: ${e.message}`);
    }
  };

  // 1. RUN CODE (Single-file Backend Sandbox Execution)
  const runCurrentFile = async () => {
    if (!currentFile) return;
    const lang = editorLanguage(currentFile.path);

    if (!['javascript', 'python', 'cpp', 'java', 'c'].includes(lang)) {
      setOutput(`Notice: Single-file "Run Code" is supported for JavaScript, Python, C, C++, and Java.\nFor complete web applications (HTML/CSS/JS, React), use "▶ Run Project" to launch the Live Preview.`);
      setTerminalTab('output');
      setIsTerminalOpen(true);
      return;
    }

    try {
      setRunning(true);
      setTerminalTab('output');
      setIsTerminalOpen(true);
      setOutput(`[Executing ${currentFile.path} in isolated sandbox engine...]`);

      const data = await request(`${API_URL}/questions/run-sandbox`, {
        method: 'POST',
        body: JSON.stringify({ code: currentFile.content, language: lang, input: '' })
      });

      const structured = {
        success: data.success,
        status: data.status || (data.error ? 'RUNTIME_ERROR' : 'SUCCESS'),
        stdout: data.stdout || '',
        stderr: data.stderr || data.error || '',
        executionTime: data.executionTime || (data.timeMs ? (data.timeMs / 1000).toFixed(2) : '0.01'),
        memory: data.memory || (data.memoryKb ? data.memoryKb * 1024 : 10240)
      };

      setStructuredOutput(structured);

      if (structured.stderr || (structured.status !== 'SUCCESS' && data.error)) {
        setProblems(prev => [
          {
            file: currentFile.path,
            line: 1,
            message: structured.stderr || data.error,
            severity: 'error'
          },
          ...prev.filter(p => p.file !== currentFile.path)
        ]);
      } else {
        setProblems(prev => prev.filter(p => p.file !== currentFile.path));
      }

      const displayOut = data.stdout
        ? data.stdout
        : (data.error ? `Error: ${data.error}` : '(Program executed successfully with no console stdout output)');
      setOutput(displayOut);
    } catch (error) {
      setStructuredOutput({
        success: false,
        status: 'EXECUTION_ERROR',
        stdout: '',
        stderr: error.message,
        executionTime: 0,
        memory: 0
      });
      setOutput(`Sandbox Execution Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  // 2. RUN PROJECT (Complete Web Application Live Preview)
  const runProjectPreview = () => {
    setPreviewActive(true);
    setPreviewStatus('starting');
    setPreviewKey(k => k + 1);
    setTerminalTab('debug');
    setIsTerminalOpen(true);
    setDebugLogs(prev => [
      ...prev,
      { level: 'info', message: `[${new Date().toLocaleTimeString()}] Starting live browser application preview...` }
    ]);
  };

  const stopProjectPreview = () => {
    setPreviewStatus('stopped');
    setDebugLogs(prev => [
      ...prev,
      { level: 'warn', message: `[${new Date().toLocaleTimeString()}] Live application preview stopped.` }
    ]);
  };

  const refreshProjectPreview = () => {
    setPreviewStatus('starting');
    setPreviewKey(k => k + 1);
  };

  const openPreviewNewTab = () => {
    const html = bundleProjectForPreview(project?.files || [], project?.title || 'Preview');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Interactive Terminal Command Handler
  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    const cmd = terminalCmd.trim();
    if (!cmd) return;
    const parts = cmd.split(' ');
    const mainCmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    const outputLines = [`student@campusbridge-ide:~/project$ ${cmd}`];

    switch (mainCmd) {
      case 'help':
        outputLines.push(
          'Available Sandbox Project Commands:',
          '  help               - Show this help reference',
          '  ls / dir           - List all project files',
          '  cat <file>         - Display file contents',
          '  run                - Execute currently open file in sandbox',
          '  preview            - Launch Live Preview for web projects',
          '  node <file>        - Run JavaScript file in sandbox',
          '  python <file>      - Run Python file in sandbox',
          '  git status         - Display modified files and branch',
          '  git log            - Show version history commit snapshots',
          '  clear              - Clear terminal display',
          '  pwd                - Print current workspace directory',
          '  whoami             - Show current user info',
          '  date               - Show current system date & time'
        );
        break;
      case 'ls':
      case 'dir':
        if (project?.files) {
          project.files.forEach(f => outputLines.push(`  ${f.path}`));
        } else {
          outputLines.push('  (no files)');
        }
        break;
      case 'clear':
        setTerminalHistory([]);
        setTerminalCmd('');
        return;
      case 'pwd':
        outputLines.push(`/workspace/campusbridge/${(project?.title || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
        break;
      case 'whoami':
        outputLines.push(`${user?.name || 'student'} (${user?.email || 'student@campusbridge.edu'})`);
        break;
      case 'date':
        outputLines.push(new Date().toString());
        break;
      case 'preview':
        runProjectPreview();
        outputLines.push('Live Preview panel launched.');
        break;
      case 'run':
        runCurrentFile();
        outputLines.push(`Executing ${currentFile?.path || 'file'} in sandbox...`);
        break;
      case 'cat':
        if (!arg) {
          outputLines.push('Usage: cat <filename>');
        } else {
          const target = project?.files?.find(f => f.path.toLowerCase() === arg.toLowerCase() || f.path.endsWith('/' + arg));
          if (target) outputLines.push(target.content || '(empty file)');
          else outputLines.push(`cat: ${arg}: No such file or directory`);
        }
        break;
      case 'git':
        if (arg === 'status') {
          outputLines.push('On branch main');
          if (modifiedFiles.size === 0) {
            outputLines.push('nothing to commit, working tree clean');
          } else {
            outputLines.push('Changes not staged for commit:');
            Array.from(modifiedFiles).forEach(f => outputLines.push(`\tmodified:   ${f}`));
          }
        } else if (arg === 'log') {
          if (!project?.versionHistory || project.versionHistory.length === 0) {
            outputLines.push('No commit history recorded yet.');
          } else {
            project.versionHistory.slice(-5).reverse().forEach(v => {
              outputLines.push(`commit v#${v.versionNumber}`);
              outputLines.push(`Author: ${v.authorName || 'Student'} <${v.authorEmail || ''}>`);
              outputLines.push(`Date:   ${new Date(v.createdAt).toLocaleString()}`);
              outputLines.push(`    ${v.summary || 'Code snapshot'}\n`);
            });
          }
        } else {
          outputLines.push(`git: "${arg}" is not supported in the simulated console. Use the Source Control sidebar tab.`);
        }
        break;
      case 'node':
      case 'python':
        runCurrentFile();
        outputLines.push(`[Sandbox Engine] Launching ${arg || currentFile?.path}...`);
        break;
      default:
        outputLines.push(`Command not found: "${cmd}". This is a safe sandboxed project console. Type "help" for a list of commands.`);
    }

    setTerminalHistory(prev => [...prev, ...outputLines]);
    setTerminalCmd('');
  };

  // AI Coding Assistant Handler
  const askAiAssistant = async (predefinedAction = null) => {
    let promptText = '';
    const fileSnippet = currentFile ? `File: ${currentFile.path}\n\`\`\`\n${currentFile.content.slice(0, 3000)}\n\`\`\`` : '';
    const projectSummary = project?.files ? project.files.map(f => `${f.path} (${f.content.length} chars)`).join(', ') : '';

    if (predefinedAction === 'explain') {
      promptText = `Explain the following code clearly for a computer science student:\n${fileSnippet}`;
    } else if (predefinedAction === 'bug') {
      promptText = `Find any bugs, syntax errors, or logical flaws in this code and explain how to fix them:\n${fileSnippet}`;
    } else if (predefinedAction === 'tests') {
      promptText = `Generate comprehensive unit test cases and test inputs for this code:\n${fileSnippet}`;
    } else if (predefinedAction === 'optimize') {
      promptText = `Analyze and optimize this code for time and memory efficiency:\n${fileSnippet}`;
    } else if (predefinedAction === 'complexity') {
      promptText = `Analyze the Big-O Time Complexity and Space Complexity of this code:\n${fileSnippet}`;
    } else if (predefinedAction === 'readme') {
      promptText = `Generate a comprehensive professional README.md for this project named "${project?.title}". Technologies used: ${(project?.technologies || []).join(', ')}. Project files: ${projectSummary}`;
    } else {
      if (!aiQuery.trim()) return;
      promptText = `${aiQuery.trim()}\n\nContext (${aiContextScope === 'file' ? currentFile?.path : 'Project'}):\n${aiContextScope === 'file' ? fileSnippet : projectSummary}`;
    }

    try {
      setAiLoading(true);
      setAiResponse('');
      const data = await request(`${API_URL}/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({ question: promptText })
      });
      setAiResponse(data.reply || data.answer || 'No response received from AI assistant.');
    } catch (err) {
      setAiResponse(`AI Assistant Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  // GitHub Account Linking Handlers
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

  // Save Project (Explicit Snapshot / Submission)
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
      setAutosaveStatus('saved');
      setTimeout(() => setAutosaveStatus('idle'), 2500);
      setMessage(submit ? '🚀 Project submitted successfully for faculty and administrator evaluation!' : '💾 Project snapshot saved successfully.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Faculty Review Save
  const saveFacultyEvaluation = async () => {
    if (!project || !isFacultyOrAdmin) return;
    try {
      setSaving(true);
      const payload = {
        grade: facultyGrade !== '' ? Number(facultyGrade) : null,
        feedback: facultyFeedback,
        codeSuggestions: facultyCodeSuggestions,
        techSuggestions: facultyTechSuggestions,
        status: facultyStatus
      };

      const data = await request(`${API_URL}/academic/projects/${project._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setProject(data.data);
      setProjects(previous => previous.map(item => item._id === data.data._id ? data.data : item));
      setMessage('✓ Faculty evaluation and feedback recorded successfully!');
    } catch (err) {
      setMessage(`Evaluation Save Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // GitHub Commit & Push Handler
  const handleGitHubPush = async () => {
    if (!project?.files || project.files.length === 0) {
      setMessage('No active project or files to push.');
      return;
    }
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
      `[${timestamp}] Linked Repository: ${repo}`,
      `[${timestamp}] Author: @${githubProfile?.login || githubUsername}`,
      `[${timestamp}] Created recovery commit snapshot in CampusBridge database`,
      `[${timestamp}] To push directly to your remote repository:`,
      `[${timestamp}]    git remote add origin ${repo}`,
      `[${timestamp}]    git push -u origin main`
    ];

    setGithubLogs(prev => [...prev, ...newLogs]);
    await saveProject(false);
    setGithubSyncing(false);
    setMessage(`🐙 Project snapshot recorded and synchronized with @${githubProfile?.login || githubUsername}!`);
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

  // Search Results Memo
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !project?.files) return [];
    const query = searchCaseSensitive ? searchQuery : searchQuery.toLowerCase();
    const matches = [];

    project.files.forEach((file, fIdx) => {
      if (searchFileFilter && !file.path.toLowerCase().includes(searchFileFilter.toLowerCase())) {
        return;
      }
      const lines = file.content.split('\n');
      lines.forEach((line, lIdx) => {
        const textToTest = searchCaseSensitive ? line : line.toLowerCase();
        let matched = false;

        if (searchWholeWord) {
          const regex = new RegExp(`\\b${searchQuery}\\b`, searchCaseSensitive ? '' : 'i');
          matched = regex.test(line);
        } else {
          matched = textToTest.includes(query);
        }

        if (matched) {
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
  }, [searchQuery, searchCaseSensitive, searchWholeWord, searchFileFilter, project?.files]);

  // Hierarchical File Tree
  const fileTree = useMemo(() => {
    const root = { name: '', path: '', isFolder: true, folders: {}, files: [] };
    if (!project?.files) return root;

    project.files.forEach((file, index) => {
      const parts = file.path.split('/');
      let current = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i];
        const folderPath = parts.slice(0, i + 1).join('/');
        if (!current.folders[folderName]) {
          current.folders[folderName] = {
            name: folderName,
            path: folderPath,
            isFolder: true,
            folders: {},
            files: []
          };
        }
        current = current.folders[folderName];
      }
      current.files.push({
        name: parts[parts.length - 1],
        path: file.path,
        index,
        content: file.content
      });
    });

    return root;
  }, [project?.files]);

  // Hierarchical Tree Recursive Renderer
  const renderFolderTree = (node, depth = 0) => {
    const folderKeys = Object.keys(node.folders).sort();
    const sortedFiles = [...node.files].sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div key={node.path || 'root'} className="vsc-tree-node-wrap">
        {node.path && (
          <div
            className="vsc-tree-folder-row"
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            <div className="vsc-tree-folder-label">
              <span className={`vsc-folder-chevron ${expandedFolders.has(node.path) ? 'expanded' : ''}`}>▶</span>
              <span className="vsc-folder-icon">{expandedFolders.has(node.path) ? '📂' : '📁'}</span>
              <span className="vsc-folder-name">{node.name}</span>
            </div>
            {!isReviewMode && (
              <div className="vsc-tree-hover-actions" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="tree-btn-icon"
                  onClick={() => addFileInFolder(node.path)}
                  title={`New File in ${node.name}`}
                >
                  +📄
                </button>
                <button
                  type="button"
                  className="tree-btn-icon"
                  onClick={() => addFolderInFolder(node.path)}
                  title={`New Folder in ${node.name}`}
                >
                  +📁
                </button>
                <button
                  type="button"
                  className="tree-btn-icon danger"
                  onClick={() => deleteFolder(node.path)}
                  title={`Delete folder ${node.name}`}
                >
                  🗑
                </button>
              </div>
            )}
          </div>
        )}

        {(!node.path || expandedFolders.has(node.path)) && (
          <div className="vsc-tree-children">
            {folderKeys.map(k => renderFolderTree(node.folders[k], depth + (node.path ? 1 : 0)))}
            {sortedFiles.map(f => {
              const isCurrent = activeFile === f.index;
              const isModified = modifiedFiles.has(f.path);
              return (
                <div
                  key={f.path}
                  className={`vsc-tree-row ${isCurrent ? 'selected' : ''}`}
                  style={{ paddingLeft: `${(depth + (node.path ? 1 : 0)) * 14 + 6}px` }}
                  onClick={() => handleOpenFile(f.index)}
                >
                  <div className="vsc-tree-file-label">
                    {getFileIcon(f.path)}
                    <span className="vsc-file-name" title={f.path}>{f.name}</span>
                    {isModified && <span className="tree-dirty-dot" title="Modified">●</span>}
                  </div>
                  <div className="vsc-tree-hover-actions" onClick={e => e.stopPropagation()}>
                    {!isReviewMode && (
                      <>
                        <button
                          type="button"
                          className="tree-btn-icon"
                          onClick={() => renameFile(f.index)}
                          title="Rename"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="tree-btn-icon"
                          onClick={() => duplicateFile(f.index)}
                          title="Duplicate"
                        >
                          📋
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="tree-btn-icon"
                      onClick={() => downloadSingleFile(f)}
                      title="Download File"
                    >
                      ⬇
                    </button>
                    {!isReviewMode && (
                      <button
                        type="button"
                        className="tree-btn-icon danger"
                        onClick={() => deleteFile(f.index)}
                        title="Delete File"
                        disabled={project.files.length === 1}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Safe Version Restore Handler
  const handleRestoreVersion = async (versionNumber) => {
    if (!window.confirm(`⚠️ Restore Project to Version #${versionNumber}?\n\nThis will safely roll back your code files to this snapshot. A recovery snapshot of current files will be preserved in history.`)) return;
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

  // Team Management Handlers
  const handleAddMember = (e) => {
    e.preventDefault();
    if (!memberForm.name.trim() || isReviewMode) return;
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
    if (isReviewMode) return;
    const updatedMembers = teamMembers.filter((_, i) => i !== index);
    setTeamMembers(updatedMembers);
    setProject(prev => ({ ...prev, teamMembers: updatedMembers }));
  };

  // Tech Management Handlers
  const handleAddTech = (techToAdd) => {
    const tech = (techToAdd || techInput).trim();
    if (!tech || isReviewMode) return;
    if (!technologies.some(t => t.toLowerCase() === tech.toLowerCase())) {
      const updated = [...technologies, tech];
      setTechnologies(updated);
      setProject(prev => ({ ...prev, technologies: updated }));
    }
    setTechInput('');
  };

  const handleRemoveTech = (techToRemove) => {
    if (isReviewMode) return;
    const updated = technologies.filter(t => t !== techToRemove);
    setTechnologies(updated);
    setProject(prev => ({ ...prev, technologies: updated }));
  };

  // Live Preview HTML Bundle
  const previewBundleHtml = useMemo(() => {
    if (!project?.files) return '';
    return bundleProjectForPreview(project.files, project.title || 'Live Preview');
  }, [project?.files, project?.title]);

  return (
    <>
      <Header title="Project Studio" />
      <div className="content-wrapper project-studio-page animate-fade">

        {/* 1. TOP TOOLBAR */}
        <div className="project-studio-toolbar glass-card">
          <div className="toolbar-info">
            <div className="toolbar-badge-row">
              <span className="studio-badge">⚡ Full Web IDE</span>
              {project && (
                <span className={`status-pill ${project.status || 'draft'}`}>
                  {(project.status || 'draft').replace('_', ' ')}
                </span>
              )}
              {project?.grade !== null && project?.grade !== undefined && (
                <span className="grade-badge">Grade: {project.grade}/100</span>
              )}
              {autosaveStatus === 'saving' && (
                <span className="autosave-pill saving">⏳ Saving...</span>
              )}
              {autosaveStatus === 'saved' && (
                <span className="autosave-pill saved">✓ Saved</span>
              )}
              {project && (
                <span className="team-collab-badge" title="All changes replicate live to team members">
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
            <p className="card-desc">Professional browser development environment with Monaco editor, live web preview, sandboxed execution, and faculty review.</p>
          </div>

          <div className="project-studio-actions">
            {!isReviewMode && (
              <button className="btn btn-secondary btn-sm" type="button" onClick={handleOpenCreateModal} disabled={saving}>
                + New Project
              </button>
            )}
            <button className="btn btn-secondary btn-sm" type="button" onClick={downloadProjectZip} disabled={!project} title="Download entire project as ZIP archive">
              ⬇️ Download ZIP
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={runCurrentFile} disabled={!project || running} title="Execute open file in isolated sandbox">
              {running ? 'Running...' : '▶ Run Code'}
            </button>
            <button
              className={`btn ${previewActive ? 'btn-accent' : 'btn-secondary'} btn-sm`}
              type="button"
              onClick={() => {
                if (previewActive) setPreviewActive(false);
                else runProjectPreview();
              }}
              disabled={!project}
              title="Toggle Live Web Application Preview"
            >
              {previewActive ? '■ Hide Preview' : '🌐 Run Project'}
            </button>
            {!isReviewMode && (
              <>
                <button className="btn btn-primary btn-sm" type="button" onClick={() => saveProject(false)} disabled={!project || saving}>
                  {saving ? 'Saving...' : '💾 Save Snapshot'}
                </button>
                <button className="btn btn-accent btn-sm" type="button" onClick={() => saveProject(true)} disabled={!project || saving}>
                  🚀 {project?.status === 'submitted' ? 'Update Submission' : 'Submit for Review'}
                </button>
                <button className="btn btn-danger btn-sm" type="button" onClick={deleteProject} disabled={!project}>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2. FACULTY REVIEW MODE BANNER */}
        {isReviewMode && (
          <div className="faculty-review-banner animate-fade">
            <div>
              <strong>🎓 Faculty Evaluation Console:</strong> Reviewing student submission for <em>"{project.title}"</em> submitted by <strong>{project.student?.name || 'Student'}</strong> ({project.student?.rollNumber || 'Roll No Not Set'}).
            </div>
            <div className="faculty-review-actions">
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Score / 100"
                value={facultyGrade}
                onChange={e => setFacultyGrade(e.target.value)}
                style={{ width: '100px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #6366f1', background: '#1e293b', color: '#fff' }}
              />
              <select
                value={facultyStatus}
                onChange={e => setFacultyStatus(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #6366f1', background: '#1e293b', color: '#fff' }}
              >
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="approved">Approved</option>
              </select>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={saveFacultyEvaluation}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Grade Project'}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className="success-banner animate-fade">
            <span>{message}</span>
            <button type="button" className="close-alert-btn" onClick={() => setMessage('')}>×</button>
          </div>
        )}

        {loading ? (
          <div className="dashboard-loading-container">
            <div className="spinner-loader"></div>
            <p>Loading projects, templates, and files...</p>
          </div>
        ) : (
          <div className="project-studio-container">
            {/* PROJECTS SELECTOR SECTION */}
            <section className="your-projects-top-section glass-card">
              <div className="your-projects-header">
                <div className="your-projects-header-info">
                  <div className="title-with-badge">
                    <h3>📁 Your Projects</h3>
                    <span className="badge-counter">{projects.length}</span>
                  </div>
                  <p className="section-subtitle">
                    Select a project to work on its source code, launch live preview, manage teammates, or submit for evaluation.
                  </p>
                </div>
                {!isReviewMode && (
                  <button className="btn btn-primary btn-sm" type="button" onClick={handleOpenCreateModal} disabled={saving}>
                    + New Project
                  </button>
                )}
              </div>

              {projects.length === 0 ? (
                <div className="no-projects-notice">
                  <p className="text-secondary">No projects created yet. Start with a project starter template.</p>
                  <button className="btn btn-primary btn-sm mt-10" type="button" onClick={handleOpenCreateModal}>Choose Template & Start</button>
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
                          {isSelected && <span className="active-indicator-pill">● Active</span>}
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
                            <span className="meta-tag live-tag">🚀 Live Demo</span>
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

            <div className="studio-section-spacer"></div>

            {project ? (
              <section className="project-editor-shell glass-card">
                {/* STUDIO NAVIGATION TABS */}
                <div className="studio-tabs-bar">
                  <button
                    type="button"
                    className={`studio-tab-btn ${activeStudioTab === 'editor' ? 'active' : ''}`}
                    onClick={() => setActiveStudioTab('editor')}
                  >
                    💻 Web IDE ({project.files?.length || 0} Files)
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
                    {/* TOP TITLEBAR */}
                    <div className="vscode-titlebar">
                      <div className="vscode-titlebar-left">
                        <span className="vscode-app-icon" title="CampusBridge IDE">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M17.5 2.5L7 11.5L3 8L1 9.5L6 14L1 18.5L3 20L7 16.5L17.5 25.5L23 23V5L17.5 2.5Z" fill="#007ACC" />
                            <path d="M17.5 8.5L10 14L17.5 19.5V8.5Z" fill="#1F9CF0" />
                          </svg>
                        </span>
                        <div className="vscode-menubar">
                          <span className="menu-item">File</span>
                          <span className="menu-item" onClick={formatDocument} role="button" tabIndex={0} title="Format Document">Format</span>
                          <span className="menu-item" onClick={runCurrentFile} role="button" tabIndex={0}>Run Code</span>
                          <span className="menu-item" onClick={runProjectPreview} role="button" tabIndex={0}>Run Project</span>
                          <span className="menu-item" onClick={() => setIsTerminalOpen(prev => !prev)} role="button" tabIndex={0}>Terminal</span>
                          <span className="menu-item" onClick={() => setAiDrawerOpen(true)} role="button" tabIndex={0} style={{ color: '#818cf8', fontWeight: 600 }}>🧠 Ask AI</span>
                        </div>
                      </div>

                      <div className="vscode-titlebar-center">
                        <span className="vscode-window-title">
                          {project.title || 'Untitled Project'} — CampusBridge Web IDE
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
                            title="Run Current File in Isolated Sandbox"
                          >
                            <span className="btn-icon">▶</span> {running ? 'Running...' : 'Run Code'}
                          </button>
                          <button
                            type="button"
                            className={`vsc-btn ${previewActive ? 'vsc-btn-preview-active' : 'vsc-btn-preview'}`}
                            onClick={() => {
                              if (previewActive) setPreviewActive(false);
                              else runProjectPreview();
                            }}
                            title="Live Browser Web Application Preview"
                          >
                            <span className="btn-icon">🌐</span> {previewActive ? 'Hide Preview' : 'Preview'}
                          </button>
                          <button
                            type="button"
                            className="vsc-btn vsc-btn-save"
                            onClick={() => saveProject(false)}
                            disabled={saving || isReviewMode}
                            title="Save Project Snapshot"
                          >
                            <span className="btn-icon">💾</span> Save
                          </button>
                          <button
                            type="button"
                            className="vsc-btn vsc-btn-ai"
                            onClick={() => setAiDrawerOpen(prev => !prev)}
                            title="Open AI Coding Assistant"
                            style={{ background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(99, 102, 241, 0.5)', color: '#c7d2fe' }}
                          >
                            <span className="btn-icon">🧠</span> AI Help
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PROJECT QUICK TITLE & COMMIT NOTE BAR */}
                    <div className="vscode-quick-bar">
                      <div className="quick-title-wrap">
                        <span className="quick-label">Project:</span>
                        <input
                          className="quick-input project-title-input"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Project title..."
                          disabled={isReviewMode}
                        />
                      </div>
                      <div className="quick-desc-wrap">
                        <span className="quick-label">Summary:</span>
                        <input
                          className="quick-input"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="Summary of project..."
                          disabled={isReviewMode}
                        />
                      </div>
                      <div className="quick-commit-wrap">
                        <span className="quick-label">Snapshot Note:</span>
                        <input
                          className="quick-input"
                          value={commitMessage}
                          onChange={e => setCommitMessage(e.target.value)}
                          placeholder="e.g. Added auth, Fixed UI"
                          disabled={isReviewMode}
                        />
                      </div>
                    </div>

                    {/* MAIN VS CODE WORKSPACE */}
                    <div className="vscode-workspace">
                      {/* ACTIVITY BAR (48px) */}
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
                            title="Search across files"
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
                            title="Source Control"
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
                            title="Run & Execution Engine"
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
                            title="GitHub Synchronization"
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

                          <button
                            type="button"
                            className={`activity-icon-btn ${aiDrawerOpen ? 'active' : ''}`}
                            onClick={() => setAiDrawerOpen(prev => !prev)}
                            title="AI Coding Assistant"
                            style={{ color: '#a5b4fc' }}
                          >
                            <span style={{ fontSize: '18px' }}>🧠</span>
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

                      {/* PRIMARY SIDEBAR */}
                      {isSidebarOpen && (
                        <div className="vscode-sidebar">
                          {/* VIEW 1: EXPLORER (HIERARCHICAL TREE) */}
                          {sidebarView === 'explorer' && (
                            <div className="sidebar-content">
                              <div className="sidebar-header">
                                <span className="sidebar-title">
                                  EXPLORER: {(project.title || 'PROJECT').toUpperCase()}
                                </span>
                                <div className="sidebar-header-actions">
                                  {!isReviewMode && (
                                    <>
                                      <button type="button" className="sidebar-action-btn" onClick={addFile} title="New File in Root">
                                        +📄
                                      </button>
                                      <button type="button" className="sidebar-action-btn" onClick={addFolder} title="New Folder">
                                        +📁
                                      </button>
                                    </>
                                  )}
                                  <button type="button" className="sidebar-action-btn" onClick={downloadProjectZip} title="Download Project ZIP">
                                    ⬇️
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
                                  {renderFolderTree(fileTree)}
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
                                          {!isReviewMode && (
                                            <button
                                              type="button"
                                              className="btn-link-restore"
                                              onClick={() => handleRestoreVersion(ver.versionNumber)}
                                            >
                                              ⏮ Restore
                                            </button>
                                          )}
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

                          {/* VIEW 2: SEARCH ACROSS FILES */}
                          {sidebarView === 'search' && (
                            <div className="sidebar-content">
                              <div className="sidebar-header">
                                <span className="sidebar-title">SEARCH IN PROJECT</span>
                                <button type="button" className="sidebar-action-btn" onClick={() => setIsSidebarOpen(false)} title="Close Sidebar">✕</button>
                              </div>
                              <div className="sidebar-search-box">
                                <input
                                  className="vsc-search-input"
                                  value={searchQuery}
                                  onChange={e => setSearchQuery(e.target.value)}
                                  placeholder="Search text across all files..."
                                  autoFocus
                                />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '11px', color: '#94a3b8' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={searchCaseSensitive}
                                      onChange={e => setSearchCaseSensitive(e.target.checked)}
                                    />
                                    Aa Case
                                  </label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={searchWholeWord}
                                      onChange={e => setSearchWholeWord(e.target.checked)}
                                    />
                                    \b Word
                                  </label>
                                </div>
                                <input
                                  className="vsc-search-input"
                                  style={{ marginTop: '6px', fontSize: '11px', padding: '4px 8px' }}
                                  value={searchFileFilter}
                                  onChange={e => setSearchFileFilter(e.target.value)}
                                  placeholder="Filter files (e.g. *.jsx or src/)"
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
                                    onClick={() => jumpToFileAndLine(item.fileIdx, item.lineNumber)}
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
                                  <div className="vsc-empty-outline">No matches found for "{searchQuery}"</div>
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
                                  {!isReviewMode && (
                                    <>
                                      <button type="button" className="sidebar-action-btn" onClick={() => saveProject(false)} title="Commit & Save">✓</button>
                                      <button type="button" className="sidebar-action-btn" onClick={handleGitHubPush} title="Push to GitHub">🚀</button>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="git-source-control-pane">
                                <div className="git-branch-badge">
                                  <span>⎇ Branch: <strong>main</strong></span>
                                  <span className="git-remote-tag">{githubProfile ? 'origin/main' : 'local'}</span>
                                </div>

                                {!isReviewMode && (
                                  <div className="git-commit-box">
                                    <textarea
                                      className="git-commit-textarea"
                                      value={commitMessage}
                                      onChange={e => setCommitMessage(e.target.value)}
                                      placeholder="Commit message (e.g. Added responsive layout)..."
                                      rows={3}
                                    />
                                    <div className="git-actions-row">
                                      <button
                                        type="button"
                                        className="vsc-btn vsc-btn-primary full-width"
                                        onClick={() => saveProject(false)}
                                        disabled={saving}
                                      >
                                        ✓ Commit Snapshot
                                      </button>
                                      <button
                                        type="button"
                                        className="vsc-btn vsc-btn-secondary full-width mt-6"
                                        onClick={handleGitHubPush}
                                        disabled={githubSyncing}
                                      >
                                        {githubSyncing ? 'Syncing...' : '🐙 Sync with GitHub'}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <div className="git-changes-section mt-12">
                                  <div className="git-changes-header">
                                    <span>MODIFIED FILES ({modifiedFiles.size})</span>
                                    {modifiedFiles.size > 0 && !isReviewMode && (
                                      <button
                                        type="button"
                                        className="btn-text-action"
                                        onClick={() => setModifiedFiles(new Set())}
                                        title="Clear modification flags"
                                      >
                                        Discard
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
                                <span className="sidebar-title">RUN & EXECUTION</span>
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
                                    {running ? 'Executing in Sandbox...' : '▶ Run Code (Sandbox)'}
                                  </button>
                                  <button
                                    type="button"
                                    className="vsc-btn vsc-btn-primary full-width mt-6"
                                    onClick={runProjectPreview}
                                  >
                                    🌐 Run Project (Live Preview)
                                  </button>
                                </div>
                                <div className="debug-env-info mt-14">
                                  <h4>Sandbox Environment:</h4>
                                  <ul>
                                    <li>Node.js v20.x Isolated VM</li>
                                    <li>Python 3.11 Runtime</li>
                                    <li>GCC / G++ 13 Compiler</li>
                                    <li>OpenJDK 21 Compiler</li>
                                    <li>Browser Sandboxed Iframe Runtime</li>
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
                                    </div>

                                    <div className="github-repo-link-box mt-14">
                                      <label className="sidebar-input-label">Project Repository URL</label>
                                      <input
                                        className="vsc-input"
                                        value={repositoryUrl}
                                        onChange={e => setRepositoryUrl(e.target.value)}
                                        placeholder={`https://github.com/${githubProfile.login}/my-project`}
                                        disabled={isReviewMode}
                                      />
                                    </div>

                                    <div className="github-actions-block mt-12">
                                      <button
                                        type="button"
                                        className="vsc-btn vsc-btn-primary full-width"
                                        onClick={handleGitHubPush}
                                        disabled={githubSyncing || isReviewMode}
                                      >
                                        {githubSyncing ? 'Syncing...' : '🚀 Synchronize Repository'}
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
                                      {!isReviewMode && (
                                        <button
                                          type="button"
                                          className="btn-link-danger full-width mt-10"
                                          onClick={handleGitHubDisconnect}
                                        >
                                          Disconnect Account
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="github-connect-card">
                                    <div className="github-lead-icon">🐙</div>
                                    <h4>Link Your GitHub Account</h4>
                                    <p className="github-desc">
                                      Connect your GitHub account to sync project commits and display your portfolio for faculty evaluation.
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
                                        <label className="sidebar-input-label">Repository URL (Optional)</label>
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
                                        {githubLoading ? 'Verifying User...' : '🐙 Link GitHub Profile'}
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

                      {/* MAIN WORKSPACE: SPLIT VIEW (EDITOR + LIVE PREVIEW) */}
                      <div className="vscode-editor-main">
                        <div className="vscode-workspace-main-split" style={{ height: isTerminalOpen ? `calc(100% - ${terminalHeight}px)` : '100%' }}>

                          {/* LEFT/MAIN PANE: MONACO EDITOR */}
                          <div className="vscode-editor-pane">
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

                                {!isReviewMode && (
                                  <button
                                    type="button"
                                    className="vscode-add-tab-btn"
                                    onClick={addFile}
                                    title="New File"
                                  >
                                    +
                                  </button>
                                )}
                              </div>

                              <div className="vscode-tabs-actions">
                                <button
                                  type="button"
                                  className="vsc-tab-action-btn"
                                  onClick={formatDocument}
                                  title="Format Document (Shift+Alt+F)"
                                >
                                  ⚡ Format
                                </button>
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
                                  className="vsc-tab-action-btn"
                                  onClick={() => {
                                    if (previewActive) setPreviewActive(false);
                                    else runProjectPreview();
                                  }}
                                  title="Toggle Live Web Preview"
                                >
                                  🌐 {previewActive ? 'Close Preview' : 'Run Project'}
                                </button>
                                <button
                                  type="button"
                                  className="vsc-tab-action-btn"
                                  onClick={() => setIsTerminalOpen(prev => !prev)}
                                  title="Toggle Bottom Terminal Dock"
                                >
                                  ⌨ Terminal
                                </button>
                              </div>
                            </div>

                            {/* BREADCRUMBS BAR */}
                            <div className="vscode-breadcrumbs-bar">
                              <span className="crumb-icon">📁</span>
                              <span className="crumb-segment">{project?.title || 'project'}</span>
                              <span className="crumb-sep">›</span>
                              {currentFile?.path?.includes('/') && (
                                <>
                                  <span className="crumb-segment">{currentFile.path.substring(0, currentFile.path.lastIndexOf('/'))}</span>
                                  <span className="crumb-sep">›</span>
                                </>
                              )}
                              <span className="crumb-file">
                                {getFileIcon(currentFile?.path)}
                                <span className="crumb-active-name">{currentFile?.path ? currentFile.path.split('/').pop() : 'Untitled'}</span>
                              </span>
                            </div>

                            {/* MONACO EDITOR CONTAINER */}
                            <div className="vscode-monaco-container" style={{ height: 'calc(100% - 68px)' }}>
                              {currentFile ? (
                                <Editor
                                  height="100%"
                                  theme={editorThemeSetting}
                                  language={editorLanguage(currentFile.path)}
                                  value={currentFile.content}
                                  onChange={value => updateActiveFile(value || '')}
                                  onMount={(editor, monaco) => {
                                    editorRef.current = editor;
                                    monacoRef.current = monaco;
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
                                    smoothScrolling: true,
                                    readOnly: isReviewMode
                                  }}
                                />
                              ) : (
                                <div className="vscode-no-file-open">
                                  <div className="no-file-icon">📄</div>
                                  <h3>No File Open</h3>
                                  <p>Select a file from the Explorer sidebar or create a new file.</p>
                                  {!isReviewMode && (
                                    <button type="button" className="vsc-btn vsc-btn-primary" onClick={addFile}>+ Create New File</button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* RIGHT PANE: LIVE WEB APPLICATION PREVIEW */}
                          {previewActive && (
                            <div className="vscode-preview-pane">
                              <div className="vscode-preview-toolbar">
                                <div className="preview-toolbar-left">
                                  <span className={`preview-status-indicator ${previewStatus}`}>
                                    ● {previewStatus === 'running' ? 'Running' : previewStatus === 'starting' ? 'Starting...' : previewStatus === 'error' ? 'Runtime Error' : 'Stopped'}
                                  </span>
                                  {isReactProject(project?.files) && (
                                    <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 600 }}>⚛️ React 18</span>
                                  )}
                                </div>

                                <div className="preview-toolbar-center">
                                  <button
                                    type="button"
                                    className={`preview-device-btn ${previewMode === 'desktop' ? 'active' : ''}`}
                                    onClick={() => setPreviewMode('desktop')}
                                    title="Desktop View (100%)"
                                  >
                                    🖥️ Desktop
                                  </button>
                                  <button
                                    type="button"
                                    className={`preview-device-btn ${previewMode === 'tablet' ? 'active' : ''}`}
                                    onClick={() => setPreviewMode('tablet')}
                                    title="Tablet View (768px)"
                                  >
                                    💻 Tablet
                                  </button>
                                  <button
                                    type="button"
                                    className={`preview-device-btn ${previewMode === 'mobile' ? 'active' : ''}`}
                                    onClick={() => setPreviewMode('mobile')}
                                    title="Mobile View (375px)"
                                  >
                                    📱 Mobile
                                  </button>
                                </div>

                                <div className="preview-toolbar-right">
                                  <button
                                    type="button"
                                    className="preview-action-btn run-btn"
                                    onClick={refreshProjectPreview}
                                    title="Refresh / Rerun Application"
                                  >
                                    ↻ Refresh
                                  </button>
                                  <button
                                    type="button"
                                    className="preview-action-btn stop-btn"
                                    onClick={stopProjectPreview}
                                    title="Stop Running Application"
                                  >
                                    ■ Stop
                                  </button>
                                  <button
                                    type="button"
                                    className="preview-action-btn"
                                    onClick={openPreviewNewTab}
                                    title="Open Application in New Browser Tab"
                                  >
                                    ↗ Pop Out
                                  </button>
                                  <button
                                    type="button"
                                    className="preview-action-btn"
                                    onClick={() => setPreviewActive(false)}
                                    title="Close Preview Panel"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              <div className="vscode-preview-frame-wrap">
                                {isWebProject(project?.files) ? (
                                  <iframe
                                    key={previewKey}
                                    className={`preview-iframe ${previewMode}`}
                                    srcDoc={previewStatus !== 'stopped' ? previewBundleHtml : `<!DOCTYPE html><html><body style="background:#090d16;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h3>Application Stopped</h3><p>Click "↻ Refresh" or "▶ Run Project" to execute.</p></div></body></html>`}
                                    sandbox="allow-scripts allow-modals allow-forms"
                                    title="CampusBridge Application Preview"
                                  />
                                ) : (
                                  <div className="preview-non-web-notice">
                                    <span style={{ fontSize: '3rem' }}>⚡</span>
                                    <h4>Backend / Console Application</h4>
                                    <p>This project is configured as a console application ({project?.projectType || 'Python/C++/Java'}).</p>
                                    <button
                                      type="button"
                                      className="vsc-btn vsc-btn-run mt-10"
                                      onClick={runCurrentFile}
                                      disabled={running}
                                    >
                                      ▶ Run in Sandbox Engine
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* BOTTOM DOCK: TERMINAL, OUTPUT, PROBLEMS, DEBUG CONSOLE, GITHUB */}
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
                                  OUTPUT {structuredOutput && `(${structuredOutput.status})`}
                                </button>
                                <button
                                  type="button"
                                  className={`dock-tab-btn ${terminalTab === 'problems' ? 'active' : ''}`}
                                  onClick={() => setTerminalTab('problems')}
                                >
                                  PROBLEMS ({problems.length})
                                </button>
                                <button
                                  type="button"
                                  className={`dock-tab-btn ${terminalTab === 'debug' ? 'active' : ''}`}
                                  onClick={() => setTerminalTab('debug')}
                                >
                                  DEBUG CONSOLE {debugLogs.length > 0 && `(${debugLogs.length})`}
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
                                    if (terminalTab === 'terminal') setTerminalHistory([]);
                                    else if (terminalTab === 'debug') setDebugLogs([]);
                                    else if (terminalTab === 'github') setGithubLogs([]);
                                    else if (terminalTab === 'problems') setProblems([]);
                                    else { setOutput(''); setStructuredOutput(null); }
                                  }}
                                  title="Clear Dock Output"
                                >
                                  ⊘ Clear
                                </button>
                                <button
                                  type="button"
                                  className="dock-action-btn"
                                  onClick={() => setTerminalHeight(prev => prev === 210 ? 340 : 210)}
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
                              {/* 1. INTERACTIVE TERMINAL */}
                              {terminalTab === 'terminal' && (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                  <pre className="terminal-console-output" style={{ flex: 1, overflowY: 'auto' }}>
                                    {terminalHistory.map((line, idx) => (
                                      <div key={idx} className={line.startsWith('student@') ? 'terminal-prompt-line' : ''}>
                                        {line}
                                      </div>
                                    ))}
                                  </pre>
                                  <form onSubmit={handleTerminalSubmit} className="terminal-interactive-line">
                                    <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 600 }}>student@campusbridge-ide:~/project$</span>
                                    <input
                                      className="terminal-cmd-input"
                                      value={terminalCmd}
                                      onChange={e => setTerminalCmd(e.target.value)}
                                      placeholder="Type 'help', 'ls', 'run', 'preview', 'cat <file>'..."
                                    />
                                  </form>
                                </div>
                              )}

                              {/* 2. STRUCTURED SANDBOX OUTPUT */}
                              {terminalTab === 'output' && (
                                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                  {structuredOutput && (
                                    <div className="structured-output-banner">
                                      <span className={`structured-status-badge ${structuredOutput.status === 'SUCCESS' ? 'success' : 'error'}`}>
                                        Status: {structuredOutput.status}
                                      </span>
                                      <div className="structured-metrics">
                                        <span>Time: <strong>{structuredOutput.executionTime}s</strong></span>
                                        <span>Memory: <strong>{(structuredOutput.memory / 1024).toFixed(0)} KB</strong></span>
                                        <span>Sandbox: <strong>Isolated Container</strong></span>
                                      </div>
                                    </div>
                                  )}
                                  <pre className="terminal-console-output" style={{ flex: 1, overflowY: 'auto' }}>
                                    {output || (
                                      <span className="terminal-muted">
                                        Ready for sandbox execution. Select a file and click "▶ Run Code" above.
                                      </span>
                                    )}
                                  </pre>
                                </div>
                              )}

                              {/* 3. PROBLEMS & DIAGNOSTICS */}
                              {terminalTab === 'problems' && (
                                <div className="problems-list-container">
                                  {problems.length > 0 ? (
                                    problems.map((prob, idx) => (
                                      <div
                                        key={idx}
                                        className="problem-item-row"
                                        onClick={() => jumpToPathAndLine(prob.file, prob.line)}
                                        title="Click to jump to line in editor"
                                      >
                                        <span className={`problem-icon ${prob.severity}`}>
                                          {prob.severity === 'error' ? '❌' : '⚠️'}
                                        </span>
                                        <div className="problem-details">
                                          <span className="problem-location">{prob.file}:{prob.line}</span>
                                          <span className="problem-msg">{prob.message}</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="problems-clean-state" style={{ padding: '1.5rem', textAlign: 'center', color: '#10b981' }}>
                                      <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '6px' }}>✓</span>
                                      <span>No syntax problems or diagnostic errors detected in workspace.</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 4. LIVE PREVIEW DEBUG CONSOLE */}
                              {terminalTab === 'debug' && (
                                <pre className="terminal-console-output" style={{ overflowY: 'auto' }}>
                                  {debugLogs.length > 0 ? (
                                    debugLogs.map((log, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#e2e8f0',
                                          fontFamily: 'Consolas, monospace',
                                          fontSize: '12px',
                                          padding: '2px 0'
                                        }}
                                      >
                                        {log.message}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="terminal-muted">
                                      Debug console ready. Console logs from the running Live Preview will appear here in real-time.
                                    </span>
                                  )}
                                </pre>
                              )}

                              {/* 5. GITHUB EVENT LOGS */}
                              {terminalTab === 'github' && (
                                <pre className="terminal-console-output github-log-output" style={{ overflowY: 'auto' }}>
                                  {githubLogs.length > 0 ? (
                                    githubLogs.map((log, idx) => (
                                      <div key={idx} className="log-line">{log}</div>
                                    ))
                                  ) : (
                                    <span className="terminal-muted">
                                      No Git events recorded. Link your GitHub account in the sidebar to sync commits.
                                    </span>
                                  )}
                                </pre>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* STATUS BAR (BLUE STRIP) */}
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
                          disabled={githubSyncing || isReviewMode}
                          title="Sync Changes with GitHub"
                        >
                          <span className="status-icon">🔄</span> {githubSyncing ? 'Syncing...' : '0↓ 1↑'}
                        </button>
                        <span
                          className="statusbar-item"
                          onClick={() => { setTerminalTab('problems'); setIsTerminalOpen(true); }}
                          style={{ cursor: 'pointer' }}
                        >
                          <span className="status-icon">⊗</span> {problems.filter(p => p.severity === 'error').length} <span className="status-icon ml-4">⚠</span> {problems.filter(p => p.severity === 'warning').length}
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
                          title={githubProfile ? `Linked as @${githubProfile.login}` : 'Link GitHub'}
                        >
                          <span className="status-icon">🐙</span>
                          {githubProfile ? `@${githubProfile.login}` : 'Link GitHub'}
                        </button>
                      </div>
                    </div>

                    {/* AI CODING ASSISTANT SLIDE-OVER DRAWER */}
                    {aiDrawerOpen && (
                      <div className="ai-assistant-drawer animate-fade">
                        <div className="ai-drawer-header">
                          <h3>🧠 AI Coding Assistant</h3>
                          <button
                            type="button"
                            className="sidebar-action-btn"
                            onClick={() => setAiDrawerOpen(false)}
                            title="Close Assistant"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="ai-drawer-body">
                          <div className="ai-scope-selector">
                            <button
                              type="button"
                              className={`ai-scope-btn ${aiContextScope === 'file' ? 'active' : ''}`}
                              onClick={() => setAiContextScope('file')}
                            >
                              📄 Active File ({currentFile?.path ? currentFile.path.split('/').pop() : 'none'})
                            </button>
                            <button
                              type="button"
                              className={`ai-scope-btn ${aiContextScope === 'project' ? 'active' : ''}`}
                              onClick={() => setAiContextScope('project')}
                            >
                              📁 Whole Project ({project?.files?.length || 0} Files)
                            </button>
                          </div>

                          <div className="ai-quick-actions-grid">
                            <button
                              type="button"
                              className="ai-action-chip"
                              onClick={() => askAiAssistant('explain')}
                              disabled={aiLoading}
                            >
                              💡 Explain Code
                            </button>
                            <button
                              type="button"
                              className="ai-action-chip"
                              onClick={() => askAiAssistant('bug')}
                              disabled={aiLoading}
                            >
                              🐛 Find Bug & Fix
                            </button>
                            <button
                              type="button"
                              className="ai-action-chip"
                              onClick={() => askAiAssistant('tests')}
                              disabled={aiLoading}
                            >
                              🧪 Generate Tests
                            </button>
                            <button
                              type="button"
                              className="ai-action-chip"
                              onClick={() => askAiAssistant('optimize')}
                              disabled={aiLoading}
                            >
                              ⚡ Optimize Code
                            </button>
                            <button
                              type="button"
                              className="ai-action-chip"
                              onClick={() => askAiAssistant('complexity')}
                              disabled={aiLoading}
                            >
                              📊 Big-O Complexity
                            </button>
                            <button
                              type="button"
                              className="ai-action-chip"
                              onClick={() => askAiAssistant('readme')}
                              disabled={aiLoading}
                            >
                              📝 Generate README
                            </button>
                          </div>

                          <div className="ai-query-box">
                            <textarea
                              className="ai-query-textarea"
                              rows={3}
                              value={aiQuery}
                              onChange={e => setAiQuery(e.target.value)}
                              placeholder="Ask anything about this code or paste an error..."
                              onKeyDown={e => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  askAiAssistant();
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => askAiAssistant()}
                              disabled={aiLoading || !aiQuery.trim()}
                            >
                              {aiLoading ? 'Analyzing Code...' : 'Ask AI (Ctrl+Enter)'}
                            </button>
                          </div>

                          {aiLoading && (
                            <div style={{ textAlign: 'center', padding: '1rem', color: '#818cf8' }}>
                              <div className="spinner-loader" style={{ width: '24px', height: '24px', margin: '0 auto 8px' }}></div>
                              <p style={{ fontSize: '11px' }}>AI is analyzing code and generating architectural advice...</p>
                            </div>
                          )}

                          {aiResponse && (
                            <div className="ai-response-box">
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong style={{ color: '#818cf8' }}>AI Response:</strong>
                                <button
                                  type="button"
                                  className="btn-text-action"
                                  onClick={() => {
                                    navigator.clipboard.writeText(aiResponse);
                                    setMessage('✓ AI response copied to clipboard!');
                                  }}
                                >
                                  📋 Copy
                                </button>
                              </div>
                              <div className="ai-response-pre">
                                {aiResponse}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: GOALS, TECH STACK & DEPLOYMENT */}
                {activeStudioTab === 'details' && (
                  <div className="tab-pane animate-fade project-details-pane">
                    <div className="deployment-banner-card">
                      <div className="deployment-card-header">
                        <div className="deploy-icon-badge">🚀</div>
                        <div>
                          <h4>Project Deployment & Live Demo Link</h4>
                          <p className="text-secondary">If hosted on Vercel, Netlify, Render, or GitHub Pages, enter the live URL below for evaluation.</p>
                        </div>
                      </div>
                      <div className="deploy-input-group">
                        <input
                          type="url"
                          className="form-control"
                          placeholder="https://your-project.vercel.app or https://github.io/..."
                          value={deploymentUrl}
                          onChange={e => setDeploymentUrl(e.target.value)}
                          disabled={isReviewMode}
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
                          disabled={isReviewMode}
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
                            disabled={isReviewMode}
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
                        disabled={isReviewMode}
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
                        disabled={isReviewMode}
                      />
                    </div>

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

                    <div className="form-group mt-20">
                      <label className="form-label">Technologies & Frameworks Used</label>
                      {!isReviewMode && (
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
                      )}

                      <div className="tech-tags-container mt-10">
                        {technologies.map(t => (
                          <span key={t} className="tech-badge">
                            {t}
                            {!isReviewMode && (
                              <button type="button" className="tag-remove-btn" onClick={() => handleRemoveTech(t)}>×</button>
                            )}
                          </span>
                        ))}
                      </div>

                      {!isReviewMode && (
                        <div className="suggested-techs mt-10">
                          <span className="suggest-label">Suggestions: </span>
                          {COMMON_TECHS.filter(t => !technologies.includes(t)).slice(0, 10).map(t => (
                            <button
                              key={t}
                              type="button"
                              className="suggest-chip"
                              onClick={() => handleAddTech(t)}
                            >
                              + {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!isReviewMode && (
                      <div className="details-save-row mt-20">
                        <button className="btn btn-primary" type="button" onClick={() => saveProject(false)} disabled={saving}>
                          {saving ? 'Saving...' : '💾 Save Goals & Details'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: TEAM MEMBERS */}
                {activeStudioTab === 'team' && (
                  <div className="tab-pane animate-fade team-management-pane">
                    <div className="team-header-row">
                      <div>
                        <h3>Team Members & Role Allocation</h3>
                        <p className="card-desc">Add team members collaborating on this project. Changes will synchronize with each teammate's portal account.</p>
                      </div>
                      {!isReviewMode && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setShowMemberForm(prev => !prev)}
                        >
                          {showMemberForm ? 'Cancel' : '+ Add Teammate'}
                        </button>
                      )}
                    </div>

                    {showMemberForm && !isReviewMode && (
                      <form onSubmit={handleAddMember} className="add-member-card glass-card mt-16 animate-fade">
                        <h4>Add New Team Member</h4>
                        <div className="form-grid-2col mt-10">
                          <div className="form-group">
                            <label className="form-label">Full Name *</label>
                            <input
                              className="form-control"
                              required
                              placeholder="e.g. Sravani Patel"
                              value={memberForm.name}
                              onChange={e => setMemberForm({ ...memberForm, name: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Roll Number</label>
                            <input
                              className="form-control"
                              placeholder="e.g. 23241A12D5"
                              value={memberForm.rollNumber}
                              onChange={e => setMemberForm({ ...memberForm, rollNumber: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Institutional Email</label>
                            <input
                              type="email"
                              className="form-control"
                              placeholder="student@campusbridge.edu"
                              value={memberForm.email}
                              onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Role in Project</label>
                            <select
                              className="form-control"
                              value={memberForm.role}
                              onChange={e => setMemberForm({ ...memberForm, role: e.target.value })}
                            >
                              <option value="Frontend Developer">Frontend Developer</option>
                              <option value="Backend Developer">Backend Developer</option>
                              <option value="Fullstack Developer">Fullstack Developer</option>
                              <option value="UI/UX Designer">UI/UX Designer</option>
                              <option value="ML/AI Specialist">ML/AI Specialist</option>
                              <option value="Database Engineer">Database Engineer</option>
                              <option value="DevOps / QA">DevOps / QA</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group mt-10">
                          <label className="form-label">Assigned Contribution / Modules</label>
                          <input
                            className="form-control"
                            placeholder="e.g. Developed REST APIs, schema design, and Docker containerization"
                            value={memberForm.contribution}
                            onChange={e => setMemberForm({ ...memberForm, contribution: e.target.value })}
                          />
                        </div>

                        <div className="form-actions mt-14">
                          <button type="submit" className="btn btn-primary btn-sm">Add Member</button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowMemberForm(false)}>Cancel</button>
                        </div>
                      </form>
                    )}

                    <div className="team-members-list mt-20">
                      {/* Project Lead */}
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
                          {!isReviewMode && (
                            <button
                              type="button"
                              className="btn-remove-member"
                              onClick={() => handleRemoveMember(index)}
                              title="Remove teammate"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}

                      {teamMembers.length === 0 && (
                        <div className="no-teammates-box">
                          <p className="text-secondary">No additional team members added. This project is currently listed as an individual submission.</p>
                          {!isReviewMode && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm mt-10"
                              onClick={() => setShowMemberForm(true)}
                            >
                              Add Teammates
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {!isReviewMode && (
                      <div className="details-save-row mt-20">
                        <button className="btn btn-primary" type="button" onClick={() => saveProject(false)} disabled={saving}>
                          {saving ? 'Saving...' : '💾 Save Team Changes'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: FACULTY & ADMIN FEEDBACK & SUGGESTIONS */}
                {activeStudioTab === 'feedback' && (
                  <div className="tab-pane animate-fade feedback-pane">
                    <div className="feedback-header">
                      <h3>Faculty & Administrator Evaluation</h3>
                      <p className="card-desc">Review constructive feedback, official grades, code suggestions, and technology recommendations from your faculty coordinators.</p>
                    </div>

                    {isReviewMode ? (
                      /* FACULTY EVALUATION FORM */
                      <div className="glass-card mt-16 p-20 animate-fade">
                        <h4 style={{ color: '#818cf8', marginBottom: '14px' }}>✏️ Enter Evaluation & Architectural Suggestions</h4>
                        <div className="form-grid-2col">
                          <div className="form-group">
                            <label className="form-label">Overall Project Grade (0-100)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="form-control"
                              value={facultyGrade}
                              onChange={e => setFacultyGrade(e.target.value)}
                              placeholder="e.g. 92"
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Review Status</label>
                            <select
                              className="form-control"
                              value={facultyStatus}
                              onChange={e => setFacultyStatus(e.target.value)}
                            >
                              <option value="under_review">Under Review</option>
                              <option value="changes_requested">Changes Requested</option>
                              <option value="approved">Approved</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group mt-14">
                          <label className="form-label">Code Architecture & Syntax Suggestions</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={facultyCodeSuggestions}
                            onChange={e => setFacultyCodeSuggestions(e.target.value)}
                            placeholder="Advice on modularity, security, algorithmic complexity, error handling..."
                          />
                        </div>

                        <div className="form-group mt-14">
                          <label className="form-label">Technology & Scalability Suggestions</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={facultyTechSuggestions}
                            onChange={e => setFacultyTechSuggestions(e.target.value)}
                            placeholder="Recommended libraries, databases, caching mechanisms, or deployment platforms..."
                          />
                        </div>

                        <div className="form-group mt-14">
                          <label className="form-label">General Evaluator Feedback</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={facultyFeedback}
                            onChange={e => setFacultyFeedback(e.target.value)}
                            placeholder="General remarks, strengths, and areas for improvement..."
                          />
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary mt-16"
                          onClick={saveFacultyEvaluation}
                          disabled={saving}
                        >
                          {saving ? 'Recording Grade...' : '💾 Submit Official Grade & Feedback'}
                        </button>
                      </div>
                    ) : (
                      /* STUDENT FEEDBACK VIEW */
                      <>
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
                      </>
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
                          Every time you save or commit, a snapshot is recorded. You can inspect previous versions and safely roll back if needed.
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
                                  {!isReviewMode && (
                                    <button
                                      type="button"
                                      className="btn btn-warning btn-sm"
                                      onClick={() => handleRestoreVersion(version.versionNumber)}
                                      disabled={restoringVersion}
                                      title="Restore code files to this snapshot"
                                    >
                                      {restoringVersion ? 'Restoring...' : '⏮️ Restore Version'}
                                    </button>
                                  )}
                                </div>
                              </div>

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
                                        {copiedSnippet ? '✓ Copied!' : '📋 Copy Code'}
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
                <h3>Start Your Capstone / Academic Project</h3>
                <p className="text-secondary">Create a new project using one of the templates to open the multi-file code editor, test in sandbox, and preview live.</p>
                {!isReviewMode && (
                  <button className="btn btn-primary mt-16" type="button" onClick={handleOpenCreateModal}>+ Choose Template & Create</button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. TEMPLATE SELECTION MODAL */}
        {showTemplateModal && (
          <div className="template-modal-backdrop animate-fade">
            <div className="template-modal-card">
              <div className="template-modal-header">
                <h3>🚀 Choose a Project Starter Template</h3>
                <button
                  type="button"
                  className="sidebar-action-btn"
                  onClick={() => setShowTemplateModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="template-modal-body">
                <label className="form-label">Project Name</label>
                <input
                  className="template-project-name-input"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. My Capstone Project"
                  autoFocus
                />

                <label className="form-label">Select Development Stack</label>
                <div className="template-grid">
                  {PROJECT_TEMPLATES.map(tpl => {
                    const isSel = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        className={`template-card-item ${isSel ? 'selected' : ''}`}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                      >
                        <div className="template-item-top">
                          <span className="template-icon">{tpl.icon}</span>
                          <div>
                            <div className="template-name">{tpl.name}</div>
                            <span style={{ fontSize: '10px', color: '#818cf8' }}>{tpl.category}</span>
                          </div>
                        </div>
                        <p className="template-desc">{tpl.description}</p>
                        <div className="template-tags-row">
                          {tpl.techs.map(t => (
                            <span key={t} className="template-tag-pill">{t}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="template-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTemplateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={createProjectFromTemplate}
                  disabled={saving}
                >
                  {saving ? 'Setting up Project...' : '🚀 Create Project from Template'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default ProjectStudio;
