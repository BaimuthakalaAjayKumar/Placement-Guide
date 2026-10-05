import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAIContext } from '../context/AIContext';
import { API_URL } from '../config/api';
import './CampusBridgeAIAgent.css';

// Markdown-like minimal renderer for bold, headers, code blocks, lists, and tables
const renderFormattedContent = (content) => {
  if (!content) return null;

  // Split code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const firstNewline = part.indexOf('\n');
      const lang = firstNewline !== -1 ? part.slice(3, firstNewline).trim() : '';
      const code = firstNewline !== -1 ? part.slice(firstNewline + 1, -3) : part.slice(3, -3);

      return (
        <div key={index} style={{ position: 'relative', margin: '8px 0' }}>
          {lang && (
            <div style={{
              position: 'absolute',
              top: '6px',
              right: '10px',
              fontSize: '0.7rem',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {lang}
            </div>
          )}
          <pre>
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // Process paragraphs and linebreaks
    const lines = part.split('\n');
    return (
      <span key={index}>
        {lines.map((line, lIdx) => {
          let formattedLine = line;

          // Header 3
          if (formattedLine.startsWith('### ')) {
            return <h3 key={lIdx}>{formattedLine.replace('### ', '')}</h3>;
          }
          // Header 4
          if (formattedLine.startsWith('#### ')) {
            return <h4 key={lIdx}>{formattedLine.replace('#### ', '')}</h4>;
          }
          // Bullet
          if (formattedLine.startsWith('- ') || formattedLine.startsWith('* ')) {
            return (
              <li key={lIdx} style={{ marginLeft: '12px' }}>
                {parseInlineFormatting(formattedLine.slice(2))}
              </li>
            );
          }
          // Empty line
          if (!formattedLine.trim()) {
            return <div key={lIdx} style={{ height: '4px' }} />;
          }

          return (
            <p key={lIdx} style={{ margin: '3px 0' }}>
              {parseInlineFormatting(formattedLine)}
            </p>
          );
        })}
      </span>
    );
  });
};

// Helper for bold and inline code
const parseInlineFormatting = (text) => {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((seg, i) => {
    if (seg.startsWith('`') && seg.endsWith('`')) {
      return <code key={i}>{seg.slice(1, -1)}</code>;
    }
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return <strong key={i}>{seg.slice(2, -2)}</strong>;
    }
    return seg;
  });
};

const CampusBridgeAIAgent = () => {
  const { user, token } = useAuth();
  const {
    currentRoute,
    currentPage,
    activeProject,
    activeFile,
    selectedText,
    visibleErrors,
    learningMode,
    setLearningMode,
    isAIAgentOpen,
    setIsAIAgentOpen,
    pendingAgentAction,
    clearPendingAction,
    getSafeContextPayload
  } = useAIContext();

  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('griet_openai_key') || '');
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome-agent',
      role: 'assistant',
      text: `👋 **Hi ${user?.name ? user.name.split(' ')[0] : 'there'}! I am your CampusBridge AI Assistant.**\n\nI am aware of your current screen: **${currentPage}**.\n\nHow can I help you excel today? Click any quick action below or ask me anything directly!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    if (isAIAgentOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAIAgentOpen]);

  // Focus input on open
  useEffect(() => {
    if (isAIAgentOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isAIAgentOpen]);

  // Handle external pending actions (e.g. from ProjectStudio "Ask AI to Explain Error" or "Explain Selection")
  useEffect(() => {
    if (pendingAgentAction && pendingAgentAction.action) {
      const { action, prompt: customPrompt } = pendingAgentAction;
      clearPendingAction();

      let defaultText = '';
      if (action === 'EXPLAIN_ERROR') {
        defaultText = 'Explain this error, why it happened, and how I can fix it.';
      } else if (action === 'EXPLAIN_SELECTION') {
        defaultText = 'Explain the selected code and its time/space complexity.';
      } else if (action === 'FIND_BUG') {
        defaultText = 'Review the active code and identify potential edge cases or bugs.';
      } else if (action === 'EXPLAIN_SCREEN') {
        defaultText = 'Explain this screen and what I should focus on next.';
      } else {
        defaultText = customPrompt || action;
      }

      handleSend(customPrompt || defaultText, action);
    }
  }, [pendingAgentAction]);

  // Listen to legacy 'open-ai-chatbot' event
  useEffect(() => {
    const handleOpen = () => setIsAIAgentOpen(true);
    window.addEventListener('open-ai-chatbot', handleOpen);
    return () => window.removeEventListener('open-ai-chatbot', handleOpen);
  }, []);

  // Compute page-specific quick actions
  const quickActions = useMemo(() => {
    const actions = [];

    // Project Studio
    if (currentRoute.includes('/project-studio')) {
      if (visibleErrors.length > 0) {
        actions.push({ label: '❌ Explain Error', action: 'EXPLAIN_ERROR', isDanger: true });
      }
      if (selectedText) {
        actions.push({ label: '🔍 Explain Selection', action: 'EXPLAIN_SELECTION' });
        actions.push({ label: '🐞 Find Bug', action: 'FIND_BUG' });
      }
      actions.push({ label: '🚀 Explain Project', action: 'EXPLAIN_PROJECT' });
      actions.push({ label: '📝 Review Code', action: 'REVIEW_CODE' });
      actions.push({ label: '📄 Generate README', action: 'GENERATE_README' });
      actions.push({ label: '🧪 Generate Tests', action: 'GENERATE_TESTS' });
    }
    // Academics
    else if (currentRoute.includes('/academics')) {
      actions.push({ label: '🎓 Explain My SGPA', action: 'EXPLAIN_SGPA' });
      actions.push({ label: '📊 Analyze Performance', action: 'ANALYZE_MARKS' });
      actions.push({ label: '🎯 Target SGPA Plan', action: 'TARGET_SGPA' });
    }
    // Coding / Questions
    else if (currentRoute.includes('/questions') || currentRoute.includes('/coding')) {
      actions.push({ label: '💡 Give Hint', action: 'GIVE_HINT' });
      actions.push({ label: '⏱️ Analyze Complexity', action: 'ANALYZE_COMPLEXITY' });
      actions.push({ label: '🧩 Similar Problem', action: 'SIMILAR_PROBLEM' });
      actions.push({ label: '🚫 Don\'t give full code', action: 'TEACH_ME' });
    }
    // Placement / Jobs
    else if (currentRoute.includes('/placement') || currentRoute.includes('/jobs')) {
      actions.push({ label: '💼 Explain Drive', action: 'EXPLAIN_DRIVE' });
      actions.push({ label: '✅ Check Eligibility', action: 'CHECK_ELIGIBILITY' });
      actions.push({ label: '📅 7-Day Prep Plan', action: 'PREP_PLAN' });
    }
    // Resume
    else if (currentRoute.includes('/resume')) {
      actions.push({ label: '📄 Improve ATS Score', action: 'IMPROVE_RESUME' });
      actions.push({ label: '🔑 Missing Keywords', action: 'KEYWORDS_CHECK' });
    }
    // Mock Interview
    else if (currentRoute.includes('/interview')) {
      actions.push({ label: '🎤 Start Mock Technical', action: 'MOCK_TECH' });
      actions.push({ label: '🤝 Start Mock HR', action: 'MOCK_HR' });
      actions.push({ label: '📊 Evaluate My Answer', action: 'EVALUATE_ANSWER' });
    }

    // Always available common actions
    actions.push({ label: '📍 Explain This Screen', action: 'EXPLAIN_SCREEN' });
    actions.push({ label: '📈 Placement Readiness', action: 'PLACEMENT_ANALYSIS' });
    actions.push({ label: '📚 What should I learn next?', action: 'LEARN_NEXT' });

    return actions;
  }, [currentRoute, visibleErrors, selectedText]);

  const handleSaveApiKey = () => {
    const trimmed = userApiKey.trim();
    if (trimmed) {
      localStorage.setItem('griet_openai_key', trimmed);
    } else {
      localStorage.removeItem('griet_openai_key');
    }
    setShowSettings(false);
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: `🧹 **Chat conversation cleared.**\n\nI am currently tracking **${currentPage}**. Ask whatever you need or click any quick action below!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async (customText = null, actionTrigger = '') => {
    const query = (customText || inputPrompt).trim();
    if (!query || loading) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      time
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const activeApiKey = userApiKey.trim() || localStorage.getItem('griet_openai_key') || undefined;
      const safeContext = getSafeContextPayload();

      const res = await fetch(`${API_URL}/ai/agent-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(activeApiKey ? { 'X-OpenAI-Key': activeApiKey } : {})
        },
        body: JSON.stringify({
          message: query,
          action: actionTrigger,
          screenContext: safeContext,
          mode: learningMode,
          openaiApiKey: activeApiKey,
          history: messages.slice(-6).map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await res.json();
      if (data.success && data.answer) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            text: data.answer,
            source: data.source || 'campusbridge-ai',
            model: data.model || 'CampusBridge Assistant',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(data.error || 'Agent did not return an answer');
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **CampusBridge Agent Notice:**\n${err.message || 'Could not connect to assistant service.'}\n\nPlease try again or verify your network connection.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isAIAgentOpen && (
        <div className="cb-ai-fab-container">
          <button
            type="button"
            className="cb-ai-fab-button"
            onClick={() => setIsAIAgentOpen(true)}
            title="Open CampusBridge AI Agent"
          >
            <span className="cb-ai-fab-avatar">🤖</span>
            <span className="cb-ai-fab-text">Ask CampusBridge AI</span>
            <span className="cb-ai-fab-context-pill">
              📍 {currentPage.split(' ')[0]}
            </span>
            {visibleErrors.length > 0 && (
              <span className="cb-ai-fab-error-badge" title="Errors detected on screen">
                {visibleErrors.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Main Agent Window */}
      {isAIAgentOpen && (
        <div className="cb-ai-window animate-fade">
          {/* Header */}
          <div className="cb-ai-header">
            <div className="cb-ai-header-top">
              <div className="cb-ai-title-wrap">
                <span className="cb-ai-icon-large">🤖</span>
                <div>
                  <h3 className="cb-ai-title">
                    CampusBridge AI <span className="cb-ai-pro-badge">AGENT</span>
                  </h3>
                  <p className="cb-ai-subtitle">Context-Aware Student Mentor</p>
                </div>
              </div>

              <div className="cb-ai-header-actions">
                <button
                  type="button"
                  className="cb-ai-action-btn"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Configure Custom OpenAI Key"
                >
                  ⚙️
                </button>
                <button
                  type="button"
                  className="cb-ai-action-btn"
                  onClick={handleClearChat}
                  title="Clear conversation"
                >
                  🔄
                </button>
                <button
                  type="button"
                  className="cb-ai-action-btn cb-ai-close-btn"
                  onClick={() => setIsAIAgentOpen(false)}
                  title="Close Assistant"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Context bar with Mode Switcher */}
            <div className="cb-ai-context-bar">
              <div className="cb-ai-context-indicator" title={`Active Screen: ${currentPage}`}>
                <span>📍</span>
                <span>{activeFile?.path ? `${currentPage}: ${activeFile.path.split('/').pop()}` : currentPage}</span>
              </div>

              <select
                className="cb-ai-mode-select"
                value={learningMode}
                onChange={(e) => setLearningMode(e.target.value)}
                title="Select Assistant Mode"
              >
                <option value="LEARNING MODE">🎓 Mentor (Teaching)</option>
                <option value="HINT MODE">💡 Hint Mode</option>
                <option value="SOLUTION MODE">⚡ Solution Mode</option>
                <option value="INTERVIEW MODE">🎤 Mock Interview</option>
              </select>
            </div>
          </div>

          {/* Settings Overlay */}
          {showSettings && (
            <div className="cb-ai-settings-modal">
              <h4 className="cb-ai-settings-title">⚙️ AI Model Configuration</h4>
              <p className="cb-ai-settings-desc">
                CampusBridge AI includes built-in contextual assistance. You can optionally link your own OpenAI key for direct GPT-4o-mini generation.
              </p>
              <input
                type="password"
                className="cb-ai-settings-input"
                placeholder="sk-proj-..."
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
              />
              <div className="cb-ai-settings-btns">
                <button
                  type="button"
                  className="cb-ai-settings-cancel"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cb-ai-settings-save"
                  onClick={handleSaveApiKey}
                >
                  Save Key
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions Scroll Bar */}
          <div className="cb-ai-quick-actions-bar">
            {quickActions.map((qa, idx) => (
              <button
                key={idx}
                type="button"
                className={`cb-ai-quick-chip ${qa.isDanger ? 'danger' : ''}`}
                onClick={() => handleSend(null, qa.action)}
                disabled={loading}
              >
                {qa.label}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="cb-ai-messages">
            {messages.map((m) => (
              <div key={m.id} className={`cb-ai-msg ${m.role}`}>
                <div className="cb-ai-msg-avatar">
                  {m.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className="cb-ai-msg-bubble">
                  {renderFormattedContent(m.text)}

                  <div className="cb-ai-msg-meta">
                    <span>{m.time}</span>
                    {m.role === 'assistant' && (
                      <button
                        type="button"
                        className="cb-ai-copy-btn"
                        onClick={() => handleCopyText(m.id, m.text)}
                        title="Copy text"
                      >
                        {copiedId === m.id ? '✓ Copied' : '📋 Copy'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="cb-ai-msg assistant">
                <div className="cb-ai-msg-avatar">🤖</div>
                <div className="cb-ai-msg-bubble">
                  <div className="cb-ai-typing">
                    <div className="cb-ai-typing-dot" />
                    <div className="cb-ai-typing-dot" />
                    <div className="cb-ai-typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="cb-ai-input-bar">
            <div className="cb-ai-input-wrap">
              <input
                ref={inputRef}
                type="text"
                className="cb-ai-input"
                placeholder={
                  activeFile?.path
                    ? `Ask about ${activeFile.path.split('/').pop()} or your screen...`
                    : `Ask CampusBridge AI anything...`
                }
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                type="button"
                className="cb-ai-send-btn"
                onClick={() => handleSend()}
                disabled={!inputPrompt.trim() || loading}
                title="Send query"
              >
                ➤
              </button>
            </div>
            <div className="cb-ai-security-footer">
              <span>🔒 Context Guard Active</span> • <span>Credentials & tokens redacted</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CampusBridgeAIAgent;
