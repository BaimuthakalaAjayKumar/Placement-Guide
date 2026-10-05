import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const AIContext = createContext(null);

// Route to human-readable page name mapping
const ROUTE_PAGE_MAP = {
  '/dashboard': 'Student Dashboard',
  '/project-studio': 'Project Studio IDE',
  '/academics': 'Academics & CGPA Hub',
  '/placement-suite': 'Placement Preparation Suite',
  '/jobs': 'Campus Recruitment Drives',
  '/resume-analyzer': 'AI Resume Analyzer',
  '/resume-builder': 'AI Resume Builder',
  '/interviews': 'AI Mock Interviews',
  '/questions': 'Question Bank & DSA',
  '/coding-playground': 'Coding Playground',
  '/contests': 'Coding Contests',
  '/roadmaps': 'Career Roadmaps',
  '/discussions': 'Discussion Forum',
  '/doubts': 'Doubt Resolution Solver',
  '/profile': 'Student Profile',
  '/lab-practice': 'Lab Practice Workspace'
};

const getPageNameForRoute = (pathname) => {
  if (ROUTE_PAGE_MAP[pathname]) return ROUTE_PAGE_MAP[pathname];
  for (const [route, name] of Object.entries(ROUTE_PAGE_MAP)) {
    if (pathname.startsWith(route)) return name;
  }
  return 'CampusBridge';
};

// Client-side sanitization: Redact sensitive tokens and passwords
const sanitizeForAI = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/bearer\s+[A-Za-z0-9\-_=.]+/gi, '[REDACTED_TOKEN]')
    .replace(/(?:password|secret|apikey|api_key|token|mongo_uri|mongodb\+srv)[:=]\s*['"]?[^\s,'"]+/gi, '[REDACTED_SECRET]')
    .slice(0, 3000);
};

export const AIContextProvider = ({ children }) => {
  const location = useLocation();

  const [currentRoute, setCurrentRoute] = useState(location.pathname);
  const [currentPage, setCurrentPage] = useState(() => getPageNameForRoute(location.pathname));
  const [visibleSection, setVisibleSection] = useState('');
  const [activeProject, setActiveProject] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedContest, setSelectedContest] = useState(null);
  const [selectedAcademicData, setSelectedAcademicData] = useState(null);
  const [visibleErrors, setVisibleErrors] = useState([]);
  const [learningMode, setLearningMode] = useState('LEARNING MODE'); // 'LEARNING MODE' | 'HINT MODE' | 'SOLUTION MODE' | 'INTERVIEW MODE' | 'TEACHING MODE'
  const [isAIAgentOpen, setIsAIAgentOpen] = useState(false);
  const [pendingAgentAction, setPendingAgentAction] = useState(null);

  // Sync route on navigation
  useEffect(() => {
    setCurrentRoute(location.pathname);
    setCurrentPage(getPageNameForRoute(location.pathname));
    // Clear transient selections on route change
    setSelectedText('');
    setVisibleErrors([]);
  }, [location.pathname]);

  const addVisibleError = useCallback((error) => {
    const cleanErr = sanitizeForAI(typeof error === 'string' ? error : error?.message || 'Error detected');
    if (!cleanErr) return;
    setVisibleErrors(prev => {
      if (prev.includes(cleanErr)) return prev;
      return [cleanErr, ...prev.slice(0, 4)];
    });
  }, []);

  const clearVisibleErrors = useCallback(() => {
    setVisibleErrors([]);
  }, []);

  const openAgentWithAction = useCallback((action, customPrompt = '') => {
    setPendingAgentAction({
      action,
      prompt: customPrompt,
      timestamp: Date.now()
    });
    setIsAIAgentOpen(true);
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingAgentAction(null);
  }, []);

  // Assemble safe context payload for AI backend
  const getSafeContextPayload = useCallback(() => {
    return {
      currentRoute,
      currentPage,
      visibleSection: sanitizeForAI(visibleSection),
      activeProject: activeProject ? {
        id: activeProject._id || activeProject.id,
        title: sanitizeForAI(activeProject.title),
        technologies: activeProject.technologies || [],
        status: activeProject.status,
        grade: activeProject.grade
      } : null,
      activeFile: activeFile ? {
        path: sanitizeForAI(activeFile.path),
        language: activeFile.language,
        codeSnippet: sanitizeForAI(activeFile.content || activeFile.codeSnippet || '')
      } : null,
      selectedText: sanitizeForAI(selectedText),
      selectedQuestion: selectedQuestion ? {
        title: sanitizeForAI(selectedQuestion.title),
        difficulty: selectedQuestion.difficulty,
        category: selectedQuestion.category
      } : null,
      selectedJob: selectedJob ? {
        company: sanitizeForAI(selectedJob.companyName || selectedJob.company),
        title: sanitizeForAI(selectedJob.title),
        eligibilityCriteria: sanitizeForAI(selectedJob.eligibilityCriteria)
      } : null,
      selectedContest: selectedContest ? {
        title: sanitizeForAI(selectedContest.title)
      } : null,
      selectedAcademicData,
      visibleErrors: visibleErrors.map(e => sanitizeForAI(e)),
      mode: learningMode
    };
  }, [
    currentRoute,
    currentPage,
    visibleSection,
    activeProject,
    activeFile,
    selectedText,
    selectedQuestion,
    selectedJob,
    selectedContest,
    selectedAcademicData,
    visibleErrors,
    learningMode
  ]);

  return (
    <AIContext.Provider
      value={{
        currentRoute,
        currentPage,
        visibleSection,
        setVisibleSection,
        activeProject,
        setActiveProject,
        activeFile,
        setActiveFile,
        selectedText,
        setSelectedText,
        selectedQuestion,
        setSelectedQuestion,
        selectedJob,
        setSelectedJob,
        selectedContest,
        setSelectedContest,
        selectedAcademicData,
        setSelectedAcademicData,
        visibleErrors,
        addVisibleError,
        clearVisibleErrors,
        learningMode,
        setLearningMode,
        isAIAgentOpen,
        setIsAIAgentOpen,
        pendingAgentAction,
        openAgentWithAction,
        clearPendingAction,
        getSafeContextPayload
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAIContext = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAIContext must be used within an AIContextProvider');
  }
  return context;
};
