import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config/api';
import './Chatbot.css';

const QUICK_PROMPTS = [
  '🎯 Explain question on my screen',
  '💡 Hint for current problem',
  'Explain ACID properties in DBMS',
  'Difference between Process and Thread',
  'What are the 4 pillars of OOP?',
  'Explain TCP vs UDP',
  'How do Practice Modules tests work?',
  'Explain MergeSort time complexity'
];

const captureLiveScreenContext = () => {
  try {
    const pageTitle = document.title || 'GRIET Placement Portal';
    const path = window.location.pathname;

    const context = {
      pageTitle,
      path,
      activeSection: '',
      problemTitle: '',
      problemDescription: '',
      editorCode: ''
    };

    // 1. Contest Workspace or Question Bank
    const contestTitleElem = document.querySelector('.exam-header-title, .contest-exam-title, .workspace-header h3');
    const problemTitleElem = document.querySelector('.problem-title, .question-title, .qb-problem-title, .exam-question-title');
    const problemDescElem = document.querySelector('.problem-desc-content, .question-description, .exam-desc, .problem-statement');

    if (contestTitleElem) context.activeSection = contestTitleElem.innerText.trim();
    if (problemTitleElem) context.problemTitle = problemTitleElem.innerText.trim();
    if (problemDescElem) context.problemDescription = problemDescElem.innerText.trim().slice(0, 1000);

    // 2. Practice Modules / Roadmaps
    const activeTabElem = document.querySelector('.test-tab-button.active, .filter-tab-btn.active, .nav-link.active');
    const activeTestElem = document.querySelector('.selector-section-title, .test-question-text, .roadmap-active-title');
    if (activeTabElem) context.activeSection = (context.activeSection ? `${context.activeSection} - ` : '') + activeTabElem.innerText.trim();
    if (activeTestElem && !context.problemTitle) context.problemTitle = activeTestElem.innerText.trim();

    // 3. Current code in Monaco Editor if present on screen
    const monacoLines = document.querySelectorAll('.monaco-editor .view-line');
    if (monacoLines && monacoLines.length > 0) {
      const codeLines = Array.from(monacoLines).map(l => l.innerText).slice(0, 50);
      context.editorCode = codeLines.join('\n').trim();
    }

    return context;
  } catch (err) {
    return { path: window.location.pathname, pageTitle: document.title };
  }
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('griet_openai_key') || '');
  const [savedStatus, setSavedStatus] = useState(false);
  const [screenContextActive, setScreenContextActive] = useState(true);
  const [currentScreenSummary, setCurrentScreenSummary] = useState('');

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      source: 'chatgpt',
      text: `👋 **Hi! I am your GRIET Placement AI Assistant, powered by ChatGPT.**\n\nI can **interact directly with your live screen** to explain the problem you are solving, review your code, or resolve doubts on **Computer Science subjects** (DSA, DBMS, OS, OOP, CN).\n\nAsk whatever doubt you have or click any topic below:`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto detect screen on open and periodically
  useEffect(() => {
    if (isOpen && screenContextActive) {
      const ctx = captureLiveScreenContext();
      const label = ctx.problemTitle || ctx.activeSection || ctx.pageTitle || 'Current Page';
      setCurrentScreenSummary(label);
    }
  }, [isOpen, screenContextActive]);

  // Listen for custom event from anywhere in the app to open the bot
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-ai-chatbot', handleOpen);
    return () => window.removeEventListener('open-ai-chatbot', handleOpen);
  }, []);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSaveKey = () => {
    const trimmed = userApiKey.trim();
    if (trimmed) {
      localStorage.setItem('griet_openai_key', trimmed);
    } else {
      localStorage.removeItem('griet_openai_key');
    }
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      setShowSettings(false);
    }, 1500);
  };

  const handleSend = async (userText) => {
    let query = (userText || input).trim();
    if (!query || loading) return;

    // Expand quick prompt for screen
    const liveScreenContext = screenContextActive ? captureLiveScreenContext() : null;
    if (query === '🎯 Explain question on my screen') {
      if (liveScreenContext && (liveScreenContext.problemTitle || liveScreenContext.problemDescription)) {
        query = `Can you explain the problem currently displayed on my screen ("${liveScreenContext.problemTitle || liveScreenContext.pageTitle}") and give me an intuitive breakdown of what it asks?`;
      } else {
        query = `Can you explain what is currently displayed on my screen (${document.title})?`;
      }
    } else if (query === '💡 Hint for current problem') {
      if (liveScreenContext && liveScreenContext.problemTitle) {
        query = `Can you give me a conceptual hint for solving "${liveScreenContext.problemTitle}" on my screen without giving away the full answer?`;
      } else {
        query = `Can you give me a hint for the coding problem on my screen?`;
      }
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      time
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const activeKey = userApiKey.trim() || localStorage.getItem('griet_openai_key') || undefined;

      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeKey ? { 'X-OpenAI-Key': activeKey } : {})
        },
        body: JSON.stringify({
          question: query,
          openaiApiKey: activeKey,
          screenContext: liveScreenContext,
          history: messages.slice(-6).map(m => ({ role: m.role, text: m.text }))
        })
      });

      const data = await res.json();
      if (data.success && (data.answer || data.reply)) {
        const text = data.answer || data.reply;
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            text,
            source: data.source || 'chatgpt',
            model: data.model || 'ChatGPT',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        throw new Error(data.error || 'Could not fetch answer');
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Could not connect to ChatGPT service.** Please check your connection or try asking again.`,
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

  // Helper to render basic markdown lines
  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Header 3 (### )
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="bot-h4">{line.replace('### ', '')}</h4>;
      }
      // Bullet points (- or * )
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const bulletText = line.trim().substring(2);
        return (
          <li key={idx} className="bot-bullet">
            <span dangerouslySetInnerHTML={{ __html: formatInline(bulletText) }} />
          </li>
        );
      }
      // Numbered lists (1. , 2. )
      const numMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <div key={idx} className="bot-num-line">
            <span className="bot-num-badge">{numMatch[1]}</span>
            <span dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }} />
          </div>
        );
      }
      // Table rows (| ... |)
      if (line.includes('|')) {
        const parts = line.split('|').filter(p => p.trim() !== '' && !p.includes('---'));
        if (parts.length > 0) {
          return (
            <div key={idx} className="bot-table-row">
              {parts.map((part, pIdx) => (
                <span key={pIdx} className="bot-table-cell" dangerouslySetInnerHTML={{ __html: formatInline(part.trim()) }} />
              ))}
            </div>
          );
        }
        return null;
      }
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '6px' }} />;
      }
      return <p key={idx} className="bot-p" dangerouslySetInnerHTML={{ __html: formatInline(line) }} />;
    });
  };

  const formatInline = (str) => {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bot-code">$1</code>');
  };

  return (
    <div className="chatbot-root">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          className="chatbot-launcher-btn animate-fade"
          onClick={() => setIsOpen(true)}
          title="Ask AI Assistant (ChatGPT with Live Screen Interaction)"
        >
          <div className="chatbot-launcher-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="9" cy="10" r="1" fill="currentColor" />
              <circle cx="15" cy="10" r="1" fill="currentColor" />
            </svg>
          </div>
          <span className="chatbot-launcher-text">Ask AI Assistant</span>
          <span className="chatgpt-mini-tag">ChatGPT</span>
          <span className="chatbot-pulse-ring"></span>
        </button>
      )}

      {/* Chat Dialog Window */}
      {isOpen && (
        <div className="chatbot-window glass-card animate-fade">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar-pulse">
                <svg viewBox="0 0 24 24" className="bot-avatar-svg" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                  <rect x="4" y="8" width="16" height="12" rx="4" />
                  <circle cx="9" cy="13" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="13" r="1.5" fill="currentColor" />
                  <path d="M9 17h6" strokeLinecap="round" />
                </svg>
                <span className="online-indicator"></span>
              </div>
              <div className="chatbot-title-group">
                <div className="chatbot-title-line">
                  <h3>GRIET AI Assistant</h3>
                  <span className="chatgpt-status-pill">⚡ ChatGPT</span>
                </div>
                <span className="chatbot-status-subtitle">
                  {screenContextActive ? '🎯 Live Screen Reader Active' : 'Subject Doubts & Portal Guidance'}
                </span>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className={`chatbot-icon-btn ${screenContextActive ? 'active-screen-btn' : ''}`}
                onClick={() => setScreenContextActive(!screenContextActive)}
                title={screenContextActive ? 'Live Screen Reader: Connected (Click to toggle)' : 'Enable Live Screen Reader'}
              >
                🎯
              </button>
              <button
                type="button"
                className={`chatbot-icon-btn ${showSettings ? 'active-btn' : ''}`}
                onClick={() => setShowSettings(!showSettings)}
                title="Configure ChatGPT Key"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '15px', height: '15px' }}>
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>
              {/* Note: Delete/Clear button removed per user request */}
              <button
                type="button"
                className="chatbot-icon-btn close-btn"
                onClick={() => setIsOpen(false)}
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Live Screen Context Bar */}
          {screenContextActive && currentScreenSummary && (
            <div className="chatbot-screen-bar animate-fade">
              <span className="screen-bar-indicator"></span>
              <span className="screen-bar-text">
                Live Screen: <strong>{currentScreenSummary}</strong>
              </span>
              <button
                type="button"
                className="screen-bar-action"
                onClick={() => handleSend('🎯 Explain question on my screen')}
              >
                Ask about screen ➜
              </button>
            </div>
          )}

          {/* ChatGPT Settings Panel */}
          {showSettings && (
            <div className="chatbot-settings-panel animate-fade">
              <div className="settings-panel-header">
                <h4>⚡ ChatGPT (OpenAI) Key</h4>
                <button type="button" className="settings-close-x" onClick={() => setShowSettings(false)}>✕</button>
              </div>
              <p className="settings-panel-text">
                Enter your OpenAI API key to query <strong>ChatGPT</strong> directly for any technical question:
              </p>
              <div className="settings-panel-row">
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  className="settings-panel-input"
                />
                <button
                  type="button"
                  className="settings-panel-save-btn"
                  onClick={handleSaveKey}
                >
                  {savedStatus ? '✓ Saved!' : 'Save'}
                </button>
              </div>
              {userApiKey && (
                <button
                  type="button"
                  className="settings-panel-remove-btn"
                  onClick={() => {
                    localStorage.removeItem('griet_openai_key');
                    setUserApiKey('');
                  }}
                >
                  Remove personal key
                </button>
              )}
            </div>
          )}

          {/* Messages Container */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chatbot-msg-row ${msg.role === 'user' ? 'user-row' : 'bot-row'}`}>
                {msg.role === 'assistant' && (
                  <div className="bot-msg-avatar">
                    <span>AI</span>
                  </div>
                )}
                <div className={`chatbot-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  {msg.source === 'chatgpt' && (
                    <div className="chatgpt-verified-badge">
                      <span>⚡ ChatGPT</span>
                    </div>
                  )}
                  {renderFormattedText(msg.text)}
                  <span className="chatbot-time">{msg.time}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="chatbot-msg-row bot-row">
                <div className="bot-msg-avatar">
                  <span>AI</span>
                </div>
                <div className="chatbot-bubble bot-bubble typing-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="chatbot-chips-bar">
            {QUICK_PROMPTS.map((prompt, pIdx) => (
              <button
                key={pIdx}
                type="button"
                className="chatbot-chip"
                onClick={() => handleSend(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="chatbot-input-bar">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              placeholder={screenContextActive ? "Ask ChatGPT about your screen or any subject doubt..." : "Ask ChatGPT any doubt on OS, DBMS, DSA..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows="1"
            />
            <button
              type="button"
              className="chatbot-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
