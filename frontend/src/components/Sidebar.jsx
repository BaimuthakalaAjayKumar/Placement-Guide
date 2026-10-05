import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './Sidebar.css';

const Sidebar = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const menuRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  // Contact Form state
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactError('');
    try {
      const res = await fetch(`${API_URL}/doubts/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ subject: contactSubject, message: contactMessage })
      });
      const data = await res.json();
      if (data.success) {
        setContactSuccess(true);
        setTimeout(() => {
          setShowContactModal(false);
          setContactSuccess(false);
          setContactSubject('');
          setContactMessage('');
        }, 2500);
      } else {
        setContactError(data.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      setContactError('Connection error. Please check your network.');
    } finally {
      setContactSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/campus-bridge-logo.png" alt="Campus Bridge" className="sidebar-logo-img" />
        <span>Campus Bridge</span>
      </div>

      <nav className="sidebar-nav">
        {user.role === 'student' && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive && !location.search.includes('tab=achievements') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/dashboard?tab=achievements" className={() => `nav-link ${location.search.includes('tab=achievements') ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
              <span>Achievements</span>
            </NavLink>

            <NavLink to="/academics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <span>Academics &amp; CGPA</span>
            </NavLink>

            <NavLink to="/resume-builder" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              <span>Resume Builder</span>
            </NavLink>

            <NavLink to="/resume-analyzer" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              <span>Resume Analyzer</span>
            </NavLink>

            <NavLink to="/learning-roadmap" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>
              <span>Learning Roadmap</span>
            </NavLink>

            <NavLink to="/aptitude-tests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span>Practice Modules</span>
            </NavLink>

            <NavLink to="/core-cse" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
              <span>Core CSE Prep</span>
            </NavLink>

            <NavLink to="/question-bank" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              <span>Question Bank</span>
            </NavLink>

            <NavLink to="/contests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Coding Contests</span>
            </NavLink>

            <NavLink to="/coding-playground" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              <span>Coding Playground</span>
            </NavLink>

            <NavLink to="/project-studio" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h5M8 16h8" /></svg>
              <span>Project Studio</span>
            </NavLink>

            <NavLink to="/lab-practice" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
              <span>Lab Practice</span>
            </NavLink>

            <NavLink to="/mock-interviews" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span>Mock Interviews</span>
            </NavLink>

            <NavLink to="/discussion-forum" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              <span>Discussion Forum</span>
            </NavLink>

            <NavLink to="/placement-calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Placement Calendar</span>
            </NavLink>

            <NavLink to="/placement-suite" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
              <span>Placement Suite</span>
            </NavLink>

            <NavLink to="/jobs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              <span>Placement Drives &amp; Job Board</span>
            </NavLink>
          </>
        )}

        {user.role === 'faculty' && (
          <>
            <NavLink to="/faculty" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span>Faculty Dashboard</span>
            </NavLink>

            <NavLink to="/academics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <span>Marks &amp; CGPA Evaluator</span>
            </NavLink>

            <NavLink to="/plagiarism-audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              <span>Plagiarism Audit</span>
            </NavLink>

            <NavLink to="/question-bank" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              <span>Question Bank</span>
            </NavLink>

            <NavLink to="/contests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Coding Contests</span>
            </NavLink>

            <NavLink to="/coding-playground" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              <span>Coding Playground</span>
            </NavLink>

            <NavLink to="/discussion-forum" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              <span>Discussion Forum</span>
            </NavLink>

            <NavLink to="/placement-calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Placement Calendar</span>
            </NavLink>

            <NavLink to="/placement-suite" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
              <span>Placement Suite</span>
            </NavLink>
          </>
        )}

        {user.role === 'admin' && (
          <>
            <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span>Admin Console</span>
            </NavLink>

            <NavLink to="/academics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <span>Academics &amp; Marks Hub</span>
            </NavLink>

            <NavLink to="/job-opportunities" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>Placement Drives &amp; Jobs</span>
            </NavLink>

            <NavLink to="/applied-jobs-report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Applied Jobs Report</span>
            </NavLink>

            <NavLink to="/faculty-staff" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Faculty & Administrators</span>
            </NavLink>

            <NavLink to="/audit-logs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Student Audit Logs</span>
            </NavLink>

            <NavLink to="/admin/discussions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <span>Subject Discussions</span>
            </NavLink>

            <NavLink to="/question-bank" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              <span>Question Bank</span>
            </NavLink>

            <NavLink to="/plagiarism-audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              <span>Plagiarism Audit</span>
            </NavLink>

            <NavLink to="/contests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Coding Contests</span>
            </NavLink>

            <NavLink to="/coding-playground" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              <span>Coding Playground</span>
            </NavLink>


            <NavLink to="/discussion-forum" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              <span>Discussion Forum</span>
            </NavLink>

            <NavLink to="/placement-calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Placement Calendar</span>
            </NavLink>

            <NavLink to="/placement-suite" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
              <span>Placement Suite</span>
            </NavLink>
          </>
        )}

        {user.role === 'recruiter' && (
          <>
            <NavLink to="/recruiter" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span>Recruiter Dashboard</span>
            </NavLink>

            <NavLink to="/placement-calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Campus Placement Calendar</span>
            </NavLink>
          </>
        )}

        {user.role === 'hod' && (
          <>
            <NavLink to="/hod" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <span>HOD Console ({user.department || user.branch || 'IT'})</span>
            </NavLink>

            <NavLink to="/academics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <span>Academics &amp; CGPA</span>
            </NavLink>

            <NavLink to="/placement-calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Placement Calendar</span>
            </NavLink>

            <NavLink to="/question-bank" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
              <span>Question Bank</span>
            </NavLink>

            <NavLink to="/contests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              <span>Coding Contests</span>
            </NavLink>

            <NavLink to="/discussion-forum" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              <span>Discussions</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge-container" ref={menuRef}>
          <div
            className="user-profile-badge-btn"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title="Click to view account options (Profile, Password, Support, Sign Out)"
          >
            <div
              className="user-avatar"
              style={
                user.role === 'hod'
                  ? { background: 'linear-gradient(135deg, #10b981, #0d9488)', color: '#fff', fontWeight: 'bold' }
                  : user.role === 'recruiter'
                  ? { background: 'linear-gradient(135deg, #2563eb, #06b6d4)', color: '#fff', fontWeight: 'bold' }
                  : user.role === 'faculty'
                  ? { background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff', fontWeight: 'bold' }
                  : user.role === 'admin'
                  ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 'bold' }
                  : undefined
              }
            >
              {user.role === 'hod'
                ? '🎓'
                : user.role === 'recruiter'
                ? '🏢'
                : user.role === 'admin'
                ? '🛡️'
                : (user.name ? user.name.charAt(0).toUpperCase() : 'U')}
            </div>
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span
                className="user-role"
                style={{
                  color:
                    user.role === 'hod'
                      ? '#34d399'
                      : user.role === 'recruiter'
                      ? '#60a5fa'
                      : user.role === 'faculty'
                      ? '#c084fc'
                      : user.role === 'admin'
                      ? '#fbbf24'
                      : undefined,
                  fontWeight: 600
                }}
              >
                {user.role === 'hod'
                  ? `HOD (${user.department || user.branch || 'IT'})`
                  : user.role === 'recruiter'
                  ? (user.companyName || 'Campus Recruiter')
                  : user.role === 'faculty'
                  ? (user.designation || 'Faculty Coordinator')
                  : user.role === 'admin'
                  ? 'Super Administrator'
                  : (user.targetRole || 'Student')}
              </span>
            </div>
            <span
              className={`chevron-icon ${isUserMenuOpen ? 'open' : ''}`}
              style={{
                transform: isUserMenuOpen ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
                color: '#94a3b8',
                fontSize: '18px'
              }}
            >
              ›
            </span>
          </div>

          {isUserMenuOpen && (
            <div className="user-popover-menu animate-fade">
              {user.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}
                  className="popover-item"
                >
                  <svg className="popover-icon" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>Profile</span>
                </button>
              )}

              {user.role !== 'recruiter' && user.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => { navigate('/change-password'); setIsUserMenuOpen(false); }}
                  className="popover-item"
                >
                  <svg className="popover-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span>Change Password</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => { setShowContactModal(true); setIsUserMenuOpen(false); }}
                className="popover-item"
              >
                <svg className="popover-icon" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Contact Support</span>
              </button>

              <div className="popover-divider" />

              <button
                type="button"
                onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                className="popover-item popover-logout-item logout"
                title="Sign out of your account"
              >
                <svg viewBox="0 0 24 24" className="popover-icon">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showContactModal && (
        <div className="modal-overlay contact-modal-overlay">
          <div className="modal-content glass-card contact-modal-content">
            <div className="modal-header">
              <h3>Contact Placement Support</h3>
              <button className="close-btn" onClick={() => { setShowContactModal(false); setContactError(''); setContactSuccess(false); }}>×</button>
            </div>

            {contactSuccess ? (
              <div className="contact-success-state animate-fade">
                <div className="success-icon-circle">✓</div>
                <h4>Message Sent!</h4>
                <p>Thank you for reaching out. The placement coordinator has received your message and will respond to your registered email shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="modal-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" value={user.name} disabled />
                </div>

                <div className="form-group">
                  <label className="form-label">Student Email</label>
                  <input type="email" className="form-control" value={user.email} disabled />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-subject">Subject</label>
                  <input
                    type="text"
                    id="contact-subject"
                    className="form-control"
                    placeholder="What can we help you with?"
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="contact-message">Message</label>
                  <textarea
                    id="contact-message"
                    className="form-control"
                    rows="4"
                    placeholder="Describe your issue or question in detail..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                  />
                </div>

                {contactError && (
                  <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>{contactError}</p>
                )}

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={contactSubmitting}>
                    {contactSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
