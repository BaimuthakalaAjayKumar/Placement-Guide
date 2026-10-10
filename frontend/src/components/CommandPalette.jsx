import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import './CommandPalette.css';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isSuperAdmin,
    isCampusAdmin,
    isAdministrator,
    isDirector,
    isPrincipal,
    isHOD,
    isFaculty,
    isPlacementOfficer,
    isRecruiter,
    isStudent
  } = usePermission();

  const isAdminGroup = isSuperAdmin || isCampusAdmin || isAdministrator || user?.role === 'admin' || isDirector || isPrincipal;

  // Global Key Listener for Cmd/Ctrl + K and Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomTrigger = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open_command_palette', handleCustomTrigger);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open_command_palette', handleCustomTrigger);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build commands tailored to university stakeholders
  const allCommands = [
    // Executive & Institutional
    ...(isAdminGroup
      ? [
          {
            id: 'admin-console',
            title: isDirector ? 'Executive Leadership Console' : 'Administration Console',
            desc: 'Multi-campus metrics, governance, and user controls',
            category: '🏛️ Institutional Leadership',
            icon: '🏛️',
            action: () => navigate('/admin')
          },
          {
            id: 'naac-dossier',
            title: 'NAAC / NIRF Criteria 5.2 Dossier Generator',
            desc: 'Generate audit-compliant student placement progression reports',
            category: '🏛️ Institutional Leadership',
            icon: '📜',
            action: () => {
              navigate('/admin');
              window.dispatchEvent(new CustomEvent('open_naac_modal'));
            }
          },
          {
            id: 'placement-drives-mgr',
            title: 'Placement Drives & Job Postings',
            desc: 'Manage campus recruitments, slots, and eligibility criteria',
            category: '🏛️ Institutional Leadership',
            icon: '💼',
            action: () => navigate('/job-opportunities')
          },
          {
            id: 'faculty-staff',
            title: 'Faculty & Coordinator Directory',
            desc: 'Roster of academic faculty, HODs, and placement officers',
            category: '🏛️ Institutional Leadership',
            icon: '👨‍🏫',
            action: () => navigate('/faculty-staff')
          },
          {
            id: 'audit-logs',
            title: 'Student Integrity & Audit Trail',
            desc: 'Security event logs, exam attempts, and system audits',
            category: '🏛️ Institutional Leadership',
            icon: '🔍',
            action: () => navigate('/audit-logs')
          }
        ]
      : []),

    // HOD & Department Specific
    ...(isHOD || isAdminGroup
      ? [
          {
            id: 'hod-dashboard',
            title: 'HOD Department Console',
            desc: 'Department placement conversion, faculty guide tracker',
            category: '🎓 Department Governance',
            icon: '🎓',
            action: () => navigate('/hod')
          },
          {
            id: 'skill-gap-heatmap',
            title: 'Department Skill-Gap Heatmap & Remedial Tagging',
            desc: 'Diagnose student cohorts across DSA, System Design, and Aptitude',
            category: '🎓 Department Governance',
            icon: '📊',
            action: () => {
              navigate(isHOD ? '/hod' : '/admin');
              window.dispatchEvent(new CustomEvent('open_skillgap_modal'));
            }
          },
          {
            id: 'hod-attendance',
            title: 'Department Attendance Analytics',
            desc: 'Course attendance heatmaps and lab compliance',
            category: '🎓 Department Governance',
            icon: '📋',
            action: () => navigate('/hod/attendance')
          }
        ]
      : []),

    // Faculty & Mentor Workbench
    ...(isFaculty || isAdminGroup || isHOD
      ? [
          {
            id: 'faculty-desk',
            title: 'Faculty Academic Workbench',
            desc: 'Mentees progress, project reviews, and assessment marks',
            category: '👨‍🏫 Faculty Workbench',
            icon: '📝',
            action: () => navigate('/faculty')
          },
          {
            id: 'question-bank',
            title: 'Question Bank & Company Blueprints',
            desc: 'Curate coding challenges, MCQ tests, and company interview sets',
            category: '👨‍🏫 Faculty Workbench',
            icon: '📚',
            action: () => navigate('/question-bank')
          },
          {
            id: 'project-studio',
            title: 'ProjectStudio & Capstone Viva Panel',
            desc: 'Grade student repositories, live demos, and plagiarism reports',
            category: '👨‍🏫 Faculty Workbench',
            icon: '💻',
            action: () => navigate('/project-studio')
          },
          {
            id: 'plagiarism-audit',
            title: 'Code Plagiarism Audit Room',
            desc: 'Cross-repository token similarity & source code originality',
            category: '👨‍🏫 Faculty Workbench',
            icon: '⚖️',
            action: () => navigate('/plagiarism-audit')
          },
          {
            id: 'smart-attendance',
            title: 'Live Session QR Attendance Generator',
            desc: 'Launch real-time dynamic QR for classroom & lab check-in',
            category: '👨‍🏫 Faculty Workbench',
            icon: '📱',
            action: () => navigate('/faculty/attendance')
          }
        ]
      : []),

    // Student Placement & Career Hub
    ...(isStudent || isAdminGroup
      ? [
          {
            id: 'student-dashboard',
            title: 'My Placement Readiness Dashboard',
            desc: 'Profile readiness score, recent drives, and target goals',
            category: '🚀 Student Hub',
            icon: '🎯',
            action: () => navigate('/dashboard')
          },
          {
            id: 'job-board',
            title: 'Placement Drives & Company Pipeline',
            desc: 'Explore visiting companies, eligibility check, and application status',
            category: '🚀 Student Hub',
            icon: '🏢',
            action: () => navigate('/job-opportunities')
          },
          {
            id: 'student-kanban-pipeline',
            title: 'My Drive Application Pipeline (Kanban)',
            desc: 'Track stage progress: Applied ➔ OA ➔ Tech ➔ HR ➔ Offer',
            category: '🚀 Student Hub',
            icon: '📊',
            action: () => {
              navigate('/dashboard');
              window.dispatchEvent(new CustomEvent('open_pipeline_tab'));
            }
          },
          {
            id: 'drive-admit-card',
            title: 'Drive Hall Ticket / QR Admit Card',
            desc: 'Print or display your lab seat verification pass for physical drives',
            category: '🚀 Student Hub',
            icon: '🎫',
            action: () => {
              window.dispatchEvent(new CustomEvent('open_hall_ticket_modal'));
            }
          },
          {
            id: 'coding-playground',
            title: 'Coding Playground & IDE',
            desc: 'In-browser code editor with multi-language execution',
            category: '🚀 Student Hub',
            icon: '⚡',
            action: () => navigate('/coding-playground')
          },
          {
            id: 'resume-analyzer',
            title: 'ATS Resume Scorer & Analyzer',
            desc: 'Scan your resume against job role keywords and receive feedback',
            category: '🚀 Student Hub',
            icon: '📄',
            action: () => navigate('/resume-analyzer')
          },
          {
            id: 'coding-contests',
            title: 'Campus Coding Contests',
            desc: 'Compete in live algorithmic contests and climb the leaderboard',
            category: '🚀 Student Hub',
            icon: '🏆',
            action: () => navigate('/contests')
          },
          {
            id: 'mock-interviews',
            title: 'AI Mock Technical Interviewer',
            desc: 'Voice & text simulation with technical follow-up questions',
            category: '🚀 Student Hub',
            icon: '🎙️',
            action: () => navigate('/mock-interviews')
          }
        ]
      : []),

    // General Utility
    ...(!isSuperAdmin
      ? [
          {
            id: 'placement-calendar',
            title: 'Institutional Placement Calendar',
            desc: 'Company arrival schedules, PPT slots, and written exam dates',
            category: '📅 University Schedule',
            icon: '📅',
            action: () => navigate('/placement-calendar')
          }
        ]
      : []),
    {
      id: 'discussion-forum',
      title: 'Placement Discussion Forum & Senior Debriefs',
      desc: 'Peer problem solving and interview question experiences',
      category: '📅 University Schedule',
      icon: '💬',
      action: () => navigate('/discussion-forum')
    },
    {
      id: 'user-profile',
      title: 'User Profile & Academic Credentials',
      desc: 'View verified CGPA, certifications, and account settings',
      category: '⚙️ Account Settings',
      icon: '👤',
      action: () => navigate('/profile')
    }
  ];

  const filteredCommands = allCommands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.desc.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  const handleSelect = (cmd) => {
    cmd.action();
    setIsOpen(false);
  };

  return (
    <div className="cmd-palette-backdrop" onClick={() => setIsOpen(false)}>
      <div className="cmd-palette-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-search-bar">
          <svg className="cmd-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="cmd-search-input"
            placeholder="Type a command, feature, or page (e.g. 'NAAC', 'Pipeline', 'At-Risk', 'Drives')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <span className="cmd-esc-badge">ESC</span>
        </div>

        <div className="cmd-results-list">
          {filteredCommands.length === 0 ? (
            <div className="cmd-empty">
              No matching commands or actions found for "{query}".
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`cmd-item ${idx === selectedIndex ? 'active' : ''}`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleSelect(cmd)}
              >
                <div className="cmd-item-left">
                  <div className="cmd-item-icon">{cmd.icon}</div>
                  <div className="cmd-item-content">
                    <span className="cmd-item-title">{cmd.title}</span>
                    <span className="cmd-item-desc">{cmd.desc}</span>
                  </div>
                </div>
                <span className="cmd-item-shortcut">{cmd.category.split(' ')[0]}</span>
              </div>
            ))
          )}
        </div>

        <div className="cmd-footer">
          <span>Campus Bridge • University Command Center</span>
          <div className="cmd-footer-keys">
            <div className="cmd-footer-key-item">
              <span className="cmd-footer-kbd">↑</span>
              <span className="cmd-footer-kbd">↓</span>
              <span>Navigate</span>
            </div>
            <div className="cmd-footer-key-item">
              <span className="cmd-footer-kbd">↵</span>
              <span>Open</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
