import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  developerRoadmaps,
  bestPractices,
  projectIdeas,
  projectDifficulties,
  projectTypes,
  projectTechTags,
} from '../data/developerRoadmaps';
import './PersonalizedRoadmap.css';

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════════════ */
const STATUS = { LEARNING: 'learning', DONE: 'done', SKIP: 'skip' };

/* ── localStorage helpers ─────────────────────────────────────────────── */
const storageKey = (slug) => `rm-progress-${slug}`;
const loadStatus = (slug) => { try { return JSON.parse(localStorage.getItem(storageKey(slug))) || {}; } catch { return {}; } };
const saveStatus = (slug, data) => localStorage.setItem(storageKey(slug), JSON.stringify(data));

/* ── Difficulty badge ─────────────────────────────────────────────────── */
const DIFFICULTY_META = {
  beginner:     { label: 'Beginner',     cls: 'diff-beginner' },
  intermediate: { label: 'Intermediate', cls: 'diff-intermediate' },
  advanced:     { label: 'Advanced',     cls: 'diff-advanced' },
};

/* ── Fallback topics when GitHub API is rate-limited ─────────────────── */
const FALLBACK_TOPICS = {
  frontend: ['Internet', 'HTML', 'CSS', 'JavaScript', 'Version Control (Git)', 'Package Managers', 'CSS Architecture', 'Build Tools', 'React / Vue / Angular', 'Testing', 'TypeScript', 'Web Security', 'Performance', 'Accessibility', 'PWA'],
  backend:  ['Internet', 'OS & General Knowledge', 'Languages', 'Version Control', 'Relational Databases', 'NoSQL Databases', 'APIs', 'Caching', 'Web Security', 'Testing', 'CI/CD', 'Containers (Docker)', 'Message Brokers', 'Web Servers', 'Scalability'],
  'full-stack': ['Internet', 'HTML/CSS', 'JavaScript', 'Frontend Framework', 'Node.js', 'Databases', 'REST APIs', 'Authentication', 'DevOps Basics', 'Cloud Basics', 'Testing', 'Performance'],
  devops:   ['Programming Language', 'OS Concepts', 'Networking', 'Server Management', 'Docker', 'Kubernetes', 'CI/CD', 'Infrastructure as Code', 'Monitoring', 'Cloud Providers', 'Security'],
  'ai-engineer': ['Programming Basics', 'Mathematics', 'ML Fundamentals', 'Deep Learning', 'NLP', 'LLMs & Prompt Engineering', 'MLOps', 'Vector Databases', 'RAG Systems', 'AI Frameworks', 'Model Deployment'],
  'machine-learning': ['Mathematics', 'Statistics', 'Python', 'Data Processing', 'ML Algorithms', 'Model Evaluation', 'Feature Engineering', 'Deep Learning', 'Computer Vision', 'NLP', 'Deployment'],
  'data-analyst': ['Spreadsheets', 'SQL', 'Python/R', 'Data Visualization', 'Statistics', 'Business Intelligence', 'Data Cleaning', 'Reporting', 'Dashboards'],
  react:    ['JSX', 'Components', 'Props & State', 'Hooks', 'Context API', 'React Router', 'State Management', 'Testing', 'Performance', 'Server Components'],
  nodejs:   ['Introduction', 'Modules', 'npm/yarn', 'HTTP Module', 'Express.js', 'Databases', 'Authentication', 'File System', 'Streams', 'Testing', 'Deployment'],
  python:   ['Basics', 'Data Types', 'Functions', 'OOP', 'Modules', 'File I/O', 'Error Handling', 'Testing', 'Virtual Environments', 'Web Frameworks'],
  docker:   ['Introduction', 'Installation', 'Images', 'Containers', 'Volumes', 'Networking', 'Docker Compose', 'Best Practices', 'Docker Hub', 'Security'],
  kubernetes: ['Core Concepts', 'Pods', 'Services', 'Deployments', 'ConfigMaps', 'Secrets', 'Ingress', 'Helm', 'Monitoring', 'Security', 'Scaling'],
  aws:      ['IAM', 'EC2', 'S3', 'VPC', 'RDS', 'Lambda', 'CloudFront', 'Route53', 'ECS/EKS', 'CloudWatch', 'SQS/SNS'],
  javascript: ['Basics', 'Data Types', 'Functions', 'DOM Manipulation', 'Events', 'Async/Await', 'ES6+', 'Modules', 'APIs', 'Testing'],
  typescript: ['Basic Types', 'Interfaces', 'Classes', 'Generics', 'Enums', 'Decorators', 'Modules', 'Utility Types', 'Advanced Types'],
  'system-design': ['Scalability', 'Load Balancing', 'Caching', 'Databases', 'Microservices', 'Message Queues', 'API Design', 'CAP Theorem', 'Distributed Systems'],
  'cyber-security': ['Networking', 'OS Security', 'Web Security', 'Cryptography', 'Ethical Hacking', 'Penetration Testing', 'Incident Response'],
  android:  ['Java/Kotlin', 'Android Studio', 'UI Design', 'Activities & Fragments', 'Data Storage', 'Networking', 'Background Tasks', 'Testing', 'Publishing'],
  ios:      ['Swift Basics', 'Xcode', 'UIKit/SwiftUI', 'Networking', 'Data Persistence', 'Push Notifications', 'Testing', 'App Store'],
};

const getFallbackTopics = (slug) => {
  const list = FALLBACK_TOPICS[slug] || ['Introduction', 'Core Concepts', 'Advanced Topics', 'Best Practices', 'Projects & Practice'];
  return list.map((name, i) => ({ id: `${slug}-${i}`, name }));
};

/* ── Resource data per topic name (free resources) ─────────────────────── */
const TOPIC_RESOURCES = {
  'Internet':            [{ type: 'Article', label: 'How does the Internet work?', url: 'https://developer.mozilla.org/en-US/docs/Learn/Common_questions/How_does_the_Internet_work' }, { type: 'Video', label: 'The Internet in 5 Minutes', url: 'https://www.youtube.com/watch?v=7_LPdttKXPc' }],
  'HTML':                [{ type: 'Roadmap', label: 'Visit Dedicated HTML Roadmap', url: 'https://roadmap.sh/html' }, { type: 'Article', label: 'MDN HTML Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML' }, { type: 'Video', label: 'HTML Full Course – freeCodeCamp', url: 'https://www.youtube.com/watch?v=pQN-pnXPaVg' }],
  'CSS':                 [{ type: 'Roadmap', label: 'Visit Dedicated CSS Roadmap', url: 'https://roadmap.sh/css' }, { type: 'Article', label: 'MDN CSS Reference', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS' }, { type: 'Video', label: 'CSS Full Course', url: 'https://www.youtube.com/watch?v=1Rs2ND1ryYc' }],
  'JavaScript':          [{ type: 'Roadmap', label: 'Visit Dedicated JavaScript Roadmap', url: 'https://roadmap.sh/javascript' }, { type: 'Book', label: 'JavaScript from Beginner to Professional', url: 'https://eloquentjavascript.net/' }, { type: 'Article', label: 'The Modern JavaScript Tutorial', url: 'https://javascript.info' }, { type: 'Video', label: 'JavaScript Crash Course For Beginners', url: 'https://www.youtube.com/watch?v=hdI2bqOjy3c' }],
  'TypeScript':          [{ type: 'Roadmap', label: 'Visit Dedicated TypeScript Roadmap', url: 'https://roadmap.sh/typescript' }, { type: 'Article', label: 'TypeScript Official Docs', url: 'https://www.typescriptlang.org/docs/' }, { type: 'Video', label: 'TypeScript Crash Course', url: 'https://www.youtube.com/watch?v=BCg4U1FzODs' }],
  'React / Vue / Angular': [{ type: 'Roadmap', label: 'React Roadmap', url: 'https://roadmap.sh/react' }, { type: 'Roadmap', label: 'Vue Roadmap', url: 'https://roadmap.sh/vue' }, { type: 'Roadmap', label: 'Angular Roadmap', url: 'https://roadmap.sh/angular' }],
  'Version Control (Git)': [{ type: 'Roadmap', label: 'Git & GitHub Roadmap', url: 'https://roadmap.sh/git-github' }, { type: 'Article', label: 'Git Official Documentation', url: 'https://git-scm.com/doc' }, { type: 'Video', label: 'Git Tutorial for Beginners', url: 'https://www.youtube.com/watch?v=8JJ101D3knE' }],
  'Docker':              [{ type: 'Roadmap', label: 'Visit Dedicated Docker Roadmap', url: 'https://roadmap.sh/docker' }, { type: 'Article', label: 'Docker Official Docs', url: 'https://docs.docker.com/' }, { type: 'Video', label: 'Docker Crash Course', url: 'https://www.youtube.com/watch?v=pg19Z8LL06w' }],
  'Kubernetes':          [{ type: 'Roadmap', label: 'Visit Dedicated Kubernetes Roadmap', url: 'https://roadmap.sh/kubernetes' }, { type: 'Article', label: 'Kubernetes Official Docs', url: 'https://kubernetes.io/docs/home/' }, { type: 'Video', label: 'Kubernetes Course – Full Beginners Tutorial', url: 'https://www.youtube.com/watch?v=d6WC5n9G_sM' }],
  'Node.js':             [{ type: 'Roadmap', label: 'Visit Dedicated Node.js Roadmap', url: 'https://roadmap.sh/nodejs' }, { type: 'Article', label: 'Node.js Official Docs', url: 'https://nodejs.org/en/docs' }, { type: 'Video', label: 'Node.js Crash Course', url: 'https://www.youtube.com/watch?v=fBNz5xF-Kx4' }],
  'Python':              [{ type: 'Roadmap', label: 'Visit Dedicated Python Roadmap', url: 'https://roadmap.sh/python' }, { type: 'Article', label: 'Python Official Docs', url: 'https://docs.python.org/3/' }, { type: 'Video', label: 'Python for Beginners', url: 'https://www.youtube.com/watch?v=eWRfhZUzrAc' }],
  'SQL':                 [{ type: 'Roadmap', label: 'Visit Dedicated SQL Roadmap', url: 'https://roadmap.sh/sql' }, { type: 'Article', label: 'W3Schools SQL Tutorial', url: 'https://www.w3schools.com/sql/' }, { type: 'Video', label: 'SQL Full Course', url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY' }],
  'APIs':                [{ type: 'Article', label: 'What is a REST API?', url: 'https://www.redhat.com/en/topics/api/what-is-a-rest-api' }, { type: 'Video', label: 'REST API Tutorial', url: 'https://www.youtube.com/watch?v=lsMQRaeKNDk' }],
  'Testing':             [{ type: 'Article', label: 'JavaScript Testing Best Practices', url: 'https://github.com/goldbergyoni/javascript-testing-best-practices' }, { type: 'Video', label: 'Testing for Beginners', url: 'https://www.youtube.com/watch?v=Jv2uxzhPFl4' }],
  'CI/CD':              [{ type: 'Article', label: 'CI/CD Explained', url: 'https://www.redhat.com/en/topics/devops/what-is-ci-cd' }, { type: 'Video', label: 'CI/CD Pipeline Tutorial', url: 'https://www.youtube.com/watch?v=R8_veQiYBjI' }],
  'Web Security':        [{ type: 'Roadmap', label: 'Cyber Security Roadmap', url: 'https://roadmap.sh/cyber-security' }, { type: 'Article', label: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/' }, { type: 'Video', label: 'Web Security Basics', url: 'https://www.youtube.com/watch?v=qcgh8f5bqYM' }],
  'Linux':               [{ type: 'Article', label: 'Linux Command Line Tutorial', url: 'https://ubuntu.com/tutorials/command-line-for-beginners' }, { type: 'Video', label: 'Linux Tutorial for Beginners', url: 'https://www.youtube.com/watch?v=sWbUDq4S6Y8' }],
  'AWS':                 [{ type: 'Roadmap', label: 'Visit Dedicated AWS Roadmap', url: 'https://roadmap.sh/aws' }, { type: 'Article', label: 'AWS Official Docs', url: 'https://docs.aws.amazon.com/' }, { type: 'Video', label: 'AWS Free Tier Tutorial', url: 'https://www.youtube.com/watch?v=3hLmDS179YE' }],
};

const TYPE_COLORS = {
  Roadmap: '#a855f7',
  Book:    '#f59e0b',
  Article: '#10b981',
  Video:   '#ef4444',
  Course:  '#6366f1',
};

/* ══════════════════════════════════════════════════════════════════════════
   RESOURCE SLIDE PANEL (shown when topic clicked — mimics roadmap.sh)
   ══════════════════════════════════════════════════════════════════════════ */
const ResourcePanel = ({ topic, slug, status, onChangeStatus, onClose }) => {
  const [activeTab, setActiveTab] = useState('resources');
  const resources = TOPIC_RESOURCES[topic.name] || [];
  const topicStatus = status[topic.id];

  return (
    <div className="rp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rp-panel animate-rp">
        {/* Header */}
        <div className="rp-header">
          <div className="rp-tabs">
            <button className={`rp-tab${activeTab === 'resources' ? ' active' : ''}`}
                    onClick={() => setActiveTab('resources')}>
              <span>🎯</span> Resources
            </button>
            <button className={`rp-tab${activeTab === 'ai' ? ' active' : ''}`}
                    onClick={() => setActiveTab('ai')}>
              <span>✨</span> AI Tutor
            </button>
          </div>

          {/* Status buttons — Learning / Done / Skip */}
          <div className="rp-status-row">
            {Object.values(STATUS).map((st) => (
              <button
                key={st}
                type="button"
                className={`rp-status-btn rp-${st}${topicStatus === st ? ' active' : ''}`}
                onClick={() => onChangeStatus(topic.id, st)}
              >
                {st === STATUS.LEARNING && '📖 '}
                {st === STATUS.DONE     && '✓ '}
                {st === STATUS.SKIP     && '✕ '}
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
            <button className="rp-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="rp-body">
          {activeTab === 'resources' ? (
            <>
              <h2 className="rp-title">{topic.name}</h2>
              <p className="rp-intro">
                Learn about <strong>{topic.name}</strong> as part of the{' '}
                <em>{slug.replace(/-/g, ' ')}</em> roadmap. Use the resources below to guide your learning.
              </p>

              {/* Free Resources */}
              <div className="rp-resource-section">
                <h3 className="rp-resource-heading">
                  <span className="rp-resource-dot" style={{ background: '#10b981' }} />
                  Free Resources
                </h3>
                {resources.length > 0 ? (
                  <ul className="rp-resource-list">
                    {resources.map((r, i) => (
                      <li key={i} className="rp-resource-item">
                        <span
                          className="rp-resource-type"
                          style={{ background: TYPE_COLORS[r.type] || '#6366f1' }}
                        >
                          {r.type}
                        </span>
                        <a href={r.url} target="_blank" rel="noreferrer" className="rp-resource-link">
                          {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rp-no-resources">
                    Browse the full resource list on{' '}
                    <a href={`https://roadmap.sh/${slug}`} target="_blank" rel="noreferrer">
                      roadmap.sh ↗
                    </a>
                  </p>
                )}
              </div>

              {/* Official Docs link */}
              <div className="rp-official">
                <a
                  href={`https://roadmap.sh/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rp-official-btn"
                >
                  View Full Roadmap on roadmap.sh ↗
                </a>
              </div>
            </>
          ) : (
            /* AI Tutor placeholder */
            <div className="rp-ai-placeholder">
              <span>✨</span>
              <h3>AI Tutor</h3>
              <p>Ask anything about <strong>{topic.name}</strong> and get an instant explanation.</p>
              <p className="rp-ai-sub">Coming soon — visit roadmap.sh for AI-assisted learning.</p>
              <a
                href={`https://roadmap.sh/${slug}`}
                target="_blank"
                rel="noreferrer"
                className="rp-official-btn"
              >
                Open AI Tutor on roadmap.sh ↗
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   PAN/ZOOM IMAGE VIEWER
   ══════════════════════════════════════════════════════════════════════════ */
const ImageViewer = ({ src, alt }) => {
  const containerRef = useRef(null);
  const [scale,    setScale]    = useState(1);
  const [offset,   setOffset]   = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError,  setImgError]  = useState(false);

  useEffect(() => { setScale(1); setOffset({ x: 0, y: 0 }); setImgLoaded(false); setImgError(false); }, [src]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setScale((s) => Math.min(4, Math.max(0.3, s - e.deltaY * 0.001)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setStartPan({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    e.preventDefault();
  };
  const onMouseMove = (e) => { if (dragging) setOffset({ x: e.clientX - startPan.x, y: e.clientY - startPan.y }); };
  const onMouseUp   = () => setDragging(false);

  const zoomIn  = () => setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.3, +(s - 0.25).toFixed(2)));
  const reset   = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  return (
    <div className="iv-wrap" ref={containerRef}
         onMouseDown={onMouseDown} onMouseMove={onMouseMove}
         onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
         style={{ cursor: dragging ? 'grabbing' : 'grab' }}>

      {!imgLoaded && !imgError && (
        <div className="iv-loading">
          <div className="iv-spinner" />
          <p>Loading roadmap diagram…</p>
        </div>
      )}
      {imgError ? (
        <div className="iv-error">
          <span>🗺️</span>
          <p>Diagram unavailable. View it directly on roadmap.sh.</p>
        </div>
      ) : (
        <img src={src} alt={alt} draggable={false} className="iv-img"
             style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', opacity: imgLoaded ? 1 : 0 }}
             onLoad={() => setImgLoaded(true)}
             onError={() => setImgError(true)} />
      )}

      <div className="iv-controls">
        <button className="iv-btn" onClick={zoomIn}  title="Zoom in">＋</button>
        <button className="iv-btn iv-btn-reset" onClick={reset}>{Math.round(scale * 100)}%</button>
        <button className="iv-btn" onClick={zoomOut} title="Zoom out">－</button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   TOPICS PANEL (right sidebar inside viewer)
   ══════════════════════════════════════════════════════════════════════════ */
const TopicsPanel = ({ slug, topics, status, onToggle, onTopicClick }) => {
  const done     = Object.values(status).filter((s) => s === STATUS.DONE).length;
  const learning = Object.values(status).filter((s) => s === STATUS.LEARNING).length;
  const total    = topics.length;
  const pct      = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="tp-panel">
      <div className="tp-progress-wrap">
        <div className="tp-progress-header">
          <span className="tp-progress-label">Your Progress</span>
          <span className="tp-progress-pct">{pct}%</span>
        </div>
        <div className="tp-progress-bar">
          <div className="tp-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="tp-progress-stats">
          <span className="tp-stat tp-stat--done">✓ {done} Done</span>
          <span className="tp-stat tp-stat--learning">📖 {learning} Learning</span>
          <span className="tp-stat tp-stat--total">/ {total}</span>
        </div>
      </div>

      <div className="tp-hint">Click a topic for resources · use buttons to mark status</div>

      <div className="tp-list">
        {topics.length === 0 ? (
          <div className="tp-loading"><div className="tp-spinner" /><span>Loading topics…</span></div>
        ) : (
          topics.map((topic) => {
            const s = status[topic.id];
            return (
              <div key={topic.id} className={`tp-item${s ? ` tp-item--${s}` : ''}`}>
                <button className="tp-item-name-btn" onClick={() => onTopicClick(topic)}>
                  {topic.name}
                </button>
                <div className="tp-item-btns">
                  {Object.values(STATUS).map((st) => (
                    <button key={st} type="button"
                            className={`tp-status-btn${s === st ? ' active' : ''} tp-${st}`}
                            title={st.charAt(0).toUpperCase() + st.slice(1)}
                            onClick={(e) => { e.stopPropagation(); onToggle(topic.id, st); }}>
                      {st === STATUS.LEARNING ? '📖' : st === STATUS.DONE ? '✓' : '✕'}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="tp-status-btn tp-todo-add"
                    title="Add to Study Checklist"
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        const saved = JSON.parse(localStorage.getItem('griet-roadmap-study-todos') || '[]');
                        const title = `Study ${topic.name} (${slug})`;
                        if (!saved.some(t => t.text === title)) {
                          saved.push({ id: `t-${Date.now()}`, text: title, completed: false, category: slug });
                          localStorage.setItem('griet-roadmap-study-todos', JSON.stringify(saved));
                          alert(`Added "${topic.name}" to your Study Checklist!`);
                        } else {
                          alert(`"${topic.name}" is already in your Study Checklist.`);
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    ＋📝
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {(done + learning > 0) && (
        <button className="tp-reset-btn"
                onClick={() => { if (window.confirm('Reset all progress for this roadmap?')) onToggle('__RESET__', null); }}>
          Reset Progress
        </button>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   ROADMAP VIEWER MODAL
   ══════════════════════════════════════════════════════════════════════════ */
const RoadmapViewer = ({ item, onClose }) => {
  const [topics,    setTopics]    = useState([]);
  const [status,    setStatus]    = useState(() => loadStatus(item.slug));
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);

  /* lock body scroll */
  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  /* ESC to close */
  useEffect(() => { const h = (e) => { if (e.key === 'Escape') { if (selectedTopic) setSelectedTopic(null); else onClose(); } }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose, selectedTopic]);

  /* Fetch topics */
  useEffect(() => {
    if (!item.slug) return;
    setTopics([]);
    const url = `https://api.github.com/repos/nilbuild/developer-roadmap/contents/src/data/roadmaps/${item.slug}/content`;
    fetch(url, { headers: { Accept: 'application/vnd.github.v3+json' } })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((files) => {
        if (!Array.isArray(files)) throw new Error('bad');
        const parsed = files
          .filter((f) => f.type === 'file' && f.name.endsWith('.md'))
          .map((f) => ({
            id: f.sha || f.name,
            name: f.name.replace(/^\d+[-.@]/, '').replace(/\.md$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim() || f.name,
          }))
          .filter((t) => t.name.length > 0);
        setTopics(parsed);
      })
      .catch(() => setTopics(getFallbackTopics(item.slug)));
  }, [item.slug]);

  const handleToggle = useCallback((topicId, newStatus) => {
    if (topicId === '__RESET__') { setStatus({}); saveStatus(item.slug, {}); return; }
    setStatus((prev) => {
      const next = { ...prev };
      if (next[topicId] === newStatus) delete next[topicId]; else next[topicId] = newStatus;
      saveStatus(item.slug, next);
      return next;
    });
  }, [item.slug]);

  return (
    <div className="rv-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rv-shell">
        {/* Header */}
        <div className="rv-header">
          <div className="rv-header-left">
            <span className="rv-category">{item.category === 'best-practice' ? 'Best Practice' : `${item.category} Roadmap`}</span>
            <h2 className="rv-title">{item.name}</h2>
          </div>
          <div className="rv-header-right">
            <button className={`rv-panel-toggle${panelOpen ? ' active' : ''}`}
                    onClick={() => setPanelOpen((v) => !v)}>📋 Topics</button>
            <a href={item.url} target="_blank" rel="noreferrer" className="rm-btn rm-btn-primary">Open on roadmap.sh ↗</a>
            <button className="rm-btn rm-btn-secondary" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        {/* Body */}
        <div className="rv-body">
          <div className="rv-viewer">
            <ImageViewer src={item.imageUrl} alt={`${item.name} roadmap`} />
          </div>
          {panelOpen && (
            <TopicsPanel
              slug={item.slug}
              topics={topics}
              status={status}
              onToggle={handleToggle}
              onTopicClick={setSelectedTopic}
            />
          )}
        </div>
      </div>

      {/* Resource slide panel */}
      {selectedTopic && (
        <ResourcePanel
          topic={selectedTopic}
          slug={item.slug}
          status={status}
          onChangeStatus={handleToggle}
          onClose={() => setSelectedTopic(null)}
        />
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   PROJECT CARD
   ══════════════════════════════════════════════════════════════════════════ */
const ProjectCard = ({ item }) => {
  const meta = DIFFICULTY_META[item.difficulty] || DIFFICULTY_META.beginner;
  return (
    <a href={`https://roadmap.sh/projects/${item.slug}`} target="_blank" rel="noreferrer" className="proj-card">
      <div className="proj-badges">
        <span className={`proj-badge ${meta.cls}`}>{meta.label}</span>
        <span className="proj-badge proj-type">{item.type}</span>
      </div>
      <div className="proj-body">
        <strong className="proj-name">{item.name}</strong>
        <p className="proj-desc">{item.description}</p>
      </div>
      <div className="proj-tags">
        {item.tags.slice(0, 4).map((t) => <span className="proj-tag" key={t}>{t}</span>)}
      </div>
    </a>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */
const PersonalizedRoadmap = () => {
  const [search, setSearch]                 = useState('');
  const [activeSection, setActiveSection]   = useState('all');
  const [selectedItem,  setSelectedItem]    = useState(null);
  const [projDiff, setProjDiff]             = useState('All');
  const [projType, setProjType]             = useState('All');
  const [projTag,  setProjTag]              = useState('All');

  const q = search.toLowerCase().trim();

  const roleRoadmaps  = useMemo(() => developerRoadmaps.filter((r) => r.category === 'Role'),  []);
  const skillRoadmaps = useMemo(() => developerRoadmaps.filter((r) => r.category === 'Skill'), []);

  const filteredRole  = useMemo(() => q ? roleRoadmaps.filter((r)  => r.name.toLowerCase().includes(q)) : roleRoadmaps,  [roleRoadmaps, q]);
  const filteredSkill = useMemo(() => q ? skillRoadmaps.filter((r) => r.name.toLowerCase().includes(q)) : skillRoadmaps, [skillRoadmaps, q]);
  const filteredBP    = useMemo(() => q ? bestPractices.filter((b) => b.name.toLowerCase().includes(q)) : bestPractices, [q]);

  const filteredProjects = useMemo(() => {
    let list = projectIdeas;
    if (projDiff !== 'All') list = list.filter((p) => p.difficulty === projDiff);
    if (projType !== 'All') list = list.filter((p) => p.type === projType);
    if (projTag  !== 'All') list = list.filter((p) => p.tags.includes(projTag));
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    return list;
  }, [projDiff, projType, projTag, q]);

  const DEFAULT_TODOS = [
    { id: 't1', text: 'Study DBMS ACID properties & Normalization (1NF to BCNF)', completed: false, category: 'DBMS' },
    { id: 't2', text: 'Practice 15 Medium LeetCode Array & Two-Pointer problems', completed: false, category: 'DSA' },
    { id: 't3', text: 'Review Operating Systems Process vs Thread & Deadlocks', completed: false, category: 'OS' },
    { id: 't4', text: 'Understand Computer Networks 3-way handshake & OSI layers', completed: false, category: 'Networks' },
    { id: 't5', text: 'Add Certifications & Projects to AI Resume Builder', completed: false, category: 'Career' },
  ];

  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('griet-roadmap-study-todos');
      return saved ? JSON.parse(saved) : DEFAULT_TODOS;
    } catch {
      return DEFAULT_TODOS;
    }
  });

  const [newTodoText, setNewTodoText] = useState('');
  const [todoFilter, setTodoFilter] = useState('all');

  useEffect(() => {
    try {
      localStorage.setItem('griet-roadmap-study-todos', JSON.stringify(todos));
    } catch (e) {
      console.error(e);
    }
  }, [todos]);

  // Field progress calculator
  const getRoadmapProgress = useCallback((slug) => {
    const stat = loadStatus(slug);
    const doneCount = Object.values(stat).filter(s => s === STATUS.DONE).length;
    const learningCount = Object.values(stat).filter(s => s === STATUS.LEARNING).length;
    const topicList = FALLBACK_TOPICS[slug] || [];
    const total = Math.max(topicList.length, Object.keys(stat).length, 6);
    const pct = total > 0 ? Math.min(100, Math.round((doneCount / total) * 100)) : 0;
    return {
      doneCount,
      learningCount,
      total,
      pct,
      hasStarted: (doneCount + learningCount) > 0
    };
  }, []);

  const activeFieldTrackers = useMemo(() => {
    return developerRoadmaps
      .map(r => ({ ...r, progress: getRoadmapProgress(r.slug) }))
      .filter(r => r.progress.hasStarted);
  }, [getRoadmapProgress]);

  const NAV_ITEMS = [
    { id: 'all',            label: 'All',            count: developerRoadmaps.length + bestPractices.length },
    { id: 'role',           label: 'Role-Based',     count: roleRoadmaps.length },
    { id: 'skill',          label: 'Skill-Based',    count: skillRoadmaps.length },
    { id: 'best-practices', label: 'Best Practices', count: bestPractices.length },
    { id: 'projects',       label: 'Project Ideas',  count: projectIdeas.length },
    { id: 'todos',          label: 'Study Checklist', count: todos.length },
  ];

  const showRole  = (activeSection === 'all' || activeSection === 'role') && activeSection !== 'todos';
  const showSkill = (activeSection === 'all' || activeSection === 'skill') && activeSection !== 'todos';
  const showBP    = (activeSection === 'all' || activeSection === 'best-practices') && activeSection !== 'todos';
  const showProj  = activeSection === 'projects';
  const showTodos = activeSection === 'todos';
  const noResults = !showProj && !showTodos && !filteredRole.length && !filteredSkill.length && !filteredBP.length;

  return (
    /* ── content-wrapper gives correct margin-left offset past the fixed sidebar ── */
    <div className="content-wrapper rm-outer">
      <div className="rm-page">

        {/* Hero */}
        <div className="rm-hero">
          <h1 className="rm-hero-title">Developer Roadmaps</h1>
          <p className="rm-hero-sub">
            Community driven roadmaps, guides and other educational content to help
            developers pick up a path and guide their learning.
          </p>
          <div className="rm-search-wrap">
            <svg className="rm-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" className="rm-search"
                   placeholder="Search roadmaps, skills, project ideas…"
                   value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && <button className="rm-search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
        </div>

        {/* Tabs - View Source Removed */}
        <div className="rm-tabs-bar">
          {NAV_ITEMS.map(({ id, label, count }) => (
            <button key={id} type="button"
                    className={`rm-tab${activeSection === id ? ' active' : ''}`}
                    onClick={() => { setActiveSection(id); setSelectedItem(null); }}>
              {label}<span className="rm-tab-count">{count}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rm-content">

          {/* Active Field Trackers Bar */}
          {activeFieldTrackers.length > 0 && activeSection !== 'todos' && !search && (
            <section className="rm-active-trackers-banner glass-card animate-fade">
              <div className="rm-active-trackers-header">
                <div className="rm-tracker-title-box">
                  <span className="rm-tracker-pulse-icon">🚀</span>
                  <div>
                    <h3>Your Active Learning Trackers</h3>
                    <p>Track what you are currently studying across developer pathways</p>
                  </div>
                </div>
                <span className="rm-active-count-badge">{activeFieldTrackers.length} Fields in Progress</span>
              </div>

              <div className="rm-active-trackers-grid">
                {activeFieldTrackers.map(item => (
                  <div key={item.slug} className="rm-active-tracker-card" onClick={() => setSelectedItem(item)}>
                    <div className="rm-active-card-top">
                      <strong className="rm-active-card-name">{item.name}</strong>
                      <span className="rm-active-card-pct">{item.progress.pct}%</span>
                    </div>
                    <div className="rm-active-card-bar">
                      <div className="rm-active-card-fill" style={{ width: `${item.progress.pct}%` }} />
                    </div>
                    <div className="rm-active-card-footer">
                      <span>✓ {item.progress.doneCount} Done • 📖 {item.progress.learningCount} Learning</span>
                      <span className="rm-active-card-action">Continue →</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {showRole && filteredRole.length > 0 && (
            <section className="rm-section">
              <h2 className="rm-section-label">Role-based Roadmaps</h2>
              <div className="rm-grid">
                {filteredRole.map((item) => {
                  const prog = getRoadmapProgress(item.slug);
                  return (
                    <button key={item.slug} type="button" className="rm-card" onClick={() => setSelectedItem(item)}>
                      <div className="rm-card-header-line">
                        <span className="rm-card-dot rm-card-dot--role">◈</span>
                        <span className="rm-card-name">{item.name}</span>
                      </div>
                      {prog.hasStarted ? (
                        <div className="rm-card-tracker">
                          <div className="rm-card-tracker-bar">
                            <div className="rm-card-tracker-fill" style={{ width: `${prog.pct}%` }} />
                          </div>
                          <span className="rm-card-tracker-txt">✓ {prog.pct}% ({prog.doneCount}/{prog.total})</span>
                        </div>
                      ) : (
                        <span className="rm-card-ready-badge">Start Learning →</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {showSkill && filteredSkill.length > 0 && (
            <section className="rm-section">
              <h2 className="rm-section-label">Skill-based Roadmaps</h2>
              <div className="rm-grid">
                {filteredSkill.map((item) => {
                  const prog = getRoadmapProgress(item.slug);
                  return (
                    <button key={item.slug} type="button" className="rm-card" onClick={() => setSelectedItem(item)}>
                      <div className="rm-card-header-line">
                        <span className="rm-card-dot rm-card-dot--skill">◇</span>
                        <span className="rm-card-name">{item.name}</span>
                      </div>
                      {prog.hasStarted ? (
                        <div className="rm-card-tracker">
                          <div className="rm-card-tracker-bar">
                            <div className="rm-card-tracker-fill" style={{ width: `${prog.pct}%` }} />
                          </div>
                          <span className="rm-card-tracker-txt">✓ {prog.pct}% ({prog.doneCount}/{prog.total})</span>
                        </div>
                      ) : (
                        <span className="rm-card-ready-badge">Start Learning →</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {showBP && filteredBP.length > 0 && (
            <section className="rm-section">
              <h2 className="rm-section-label">Best Practices</h2>
              <div className="rm-grid rm-grid--bp">
                {filteredBP.map((item) => (
                  <button key={item.slug} type="button" className="rm-card rm-card--bp"
                          onClick={() => setSelectedItem({ ...item, category: 'best-practice' })}>
                    <span className="rm-bp-icon">{item.icon}</span>
                    <div className="rm-bp-body">
                      <span className="rm-card-name">{item.name}</span>
                      <span className="rm-bp-desc">{item.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {showProj && (
            <section className="rm-section">
              <div className="rm-proj-topbar">
                <h2 className="rm-section-label" style={{ margin: 0 }}>Project Ideas</h2>
                <span className="rm-proj-count">{filteredProjects.length} projects</span>
              </div>
              <div className="rm-proj-filters">
                <div className="rm-filter-row">
                  <span className="rm-filter-label">Difficulty</span>
                  <div className="rm-chips">{projectDifficulties.map((d) => (
                    <button key={d} type="button" className={`rm-chip${projDiff === d ? ' active' : ''}`}
                            onClick={() => setProjDiff(d)}>
                      {d === 'All' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}</div>
                </div>
                <div className="rm-filter-row">
                  <span className="rm-filter-label">Type</span>
                  <div className="rm-chips">{projectTypes.map((t) => (
                    <button key={t} type="button" className={`rm-chip${projType === t ? ' active' : ''}`}
                            onClick={() => setProjType(t)}>{t}</button>
                  ))}</div>
                </div>
                <div className="rm-filter-row">
                  <span className="rm-filter-label">Tech</span>
                  <div className="rm-chips rm-chips--scroll">{projectTechTags.map((tag) => (
                    <button key={tag} type="button" className={`rm-chip${projTag === tag ? ' active' : ''}`}
                            onClick={() => setProjTag(tag)}>{tag}</button>
                  ))}</div>
                </div>
                {(projDiff !== 'All' || projType !== 'All' || projTag !== 'All' || search) && (
                  <button className="rm-chip rm-chip--reset"
                          onClick={() => { setProjDiff('All'); setProjType('All'); setProjTag('All'); setSearch(''); }}>
                    ✕ Reset Filters
                  </button>
                )}
              </div>
              {filteredProjects.length > 0 ? (
                <div className="proj-grid">{filteredProjects.map((item) => <ProjectCard key={item.slug} item={item} />)}</div>
              ) : (
                <div className="rm-empty"><span>📭</span><p>No projects match your filters.</p>
                  <button className="rm-btn rm-btn-secondary" onClick={() => { setProjDiff('All'); setProjType('All'); setProjTag('All'); setSearch(''); }}>Reset Filters</button>
                </div>
              )}
            </section>
          )}

          {/* VIEW 5: STUDY TODO CHECKLIST */}
          {showTodos && (
            <section className="rm-todos-section animate-fade">
              <div className="rm-todos-header glass-card">
                <div className="rm-todos-header-info">
                  <h2>📋 My Learning TODO Checklist</h2>
                  <p>Stay organized with clear study goals. Add topics you are learning and check them off to build confidence.</p>
                </div>
                
                {/* Progress Bar */}
                <div className="rm-todos-progress-container">
                  <div className="rm-todos-progress-header">
                    <span>Overall Study Progress</span>
                    <strong>{todos.length > 0 ? Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0}%</strong>
                  </div>
                  <div className="rm-todos-progress-bar">
                    <div
                      className="rm-todos-progress-fill"
                      style={{ width: `${todos.length > 0 ? Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="rm-todos-progress-sub">
                    {todos.filter(t => t.completed).length} of {todos.length} study tasks completed
                  </span>
                </div>
              </div>

              {/* Add Goal Box */}
              <div className="rm-todos-input-card glass-card">
                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newTodoText.trim()) return;
                  setTodos(prev => [...prev, { id: `t-${Date.now()}`, text: newTodoText.trim(), completed: false, category: 'Custom' }]);
                  setNewTodoText('');
                }} className="rm-todos-form">
                  <input
                    type="text"
                    className="rm-todos-input"
                    placeholder="Add a new study topic or goal (e.g., 'Master Dijkstra Algorithm', 'Study Docker networking')..."
                    value={newTodoText}
                    onChange={(e) => setNewTodoText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" disabled={!newTodoText.trim()}>
                    + Add Study Goal
                  </button>
                </form>

                {/* Suggested Quick Add Chips */}
                <div className="rm-quick-suggestions">
                  <span className="rm-quick-label">⚡ Quick Add:</span>
                  {[
                    'Learn DBMS ACID Properties',
                    'Practice Binary Search on LeetCode',
                    'Study Operating System Deadlocks',
                    'Review OOP 4 Core Pillars',
                    'Learn TCP/IP Handshake & DNS',
                    'Build Full-Stack Project for Resume'
                  ].map((sug, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      className="rm-suggestion-chip"
                      onClick={() => {
                        if (!todos.some(t => t.text === sug)) {
                          setTodos(prev => [...prev, { id: `sug-${Date.now()}-${sIdx}`, text: sug, completed: false, category: 'Recommended' }]);
                        }
                      }}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="rm-todos-filter-bar">
                {['all', 'active', 'completed'].map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`rm-todo-filter-btn ${todoFilter === f ? 'active' : ''}`}
                    onClick={() => setTodoFilter(f)}
                  >
                    {f === 'all' ? `All (${todos.length})` : f === 'active' ? `Pending (${todos.filter(t => !t.completed).length})` : `Completed (${todos.filter(t => t.completed).length})`}
                  </button>
                ))}
              </div>

              {/* TODOs List */}
              <div className="rm-todos-list">
                {todos
                  .filter(t => {
                    if (todoFilter === 'active') return !t.completed;
                    if (todoFilter === 'completed') return t.completed;
                    return true;
                  })
                  .map(todo => (
                    <div key={todo.id} className={`rm-todo-row glass-card ${todo.completed ? 'completed' : ''}`}>
                      <label className="rm-todo-checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => {
                            setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t));
                          }}
                        />
                        <span className="rm-todo-text">{todo.text}</span>
                      </label>
                      <div className="rm-todo-actions">
                        {todo.category && <span className="rm-todo-category-badge">{todo.category}</span>}
                        <button
                          type="button"
                          className="rm-todo-delete-btn"
                          onClick={() => setTodos(prev => prev.filter(t => t.id !== todo.id))}
                          title="Remove task"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}

                {todos.length === 0 && (
                  <div className="rm-empty glass-card" style={{ padding: '30px' }}>
                    <span>🎉</span>
                    <p>No study tasks yet! Add a goal above to start planning your preparation.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {noResults && (
            <div className="rm-empty">
              <span>🔍</span><p>No results for "<strong>{search}</strong>".</p>
              <button className="rm-btn rm-btn-secondary" onClick={() => setSearch('')}>Clear Search</button>
            </div>
          )}
        </div>

      </div>

      {/* Roadmap viewer (full-screen modal, outside content-wrapper scroll) */}
      {selectedItem && (
        <RoadmapViewer item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
};

export default PersonalizedRoadmap;
