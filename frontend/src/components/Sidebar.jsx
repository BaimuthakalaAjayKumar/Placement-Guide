import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './Sidebar.css';

const Sidebar = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

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
        <img src="/college-logo.jpg" alt="GRIET Placement" className="sidebar-logo-img" />
        <span>GRIET Placement</span>
      </div>

      {user.role !== 'student' && (
        <div className="user-badge">
          <div className="user-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role === 'admin' ? 'Administrator' : user.role === 'faculty' ? 'Faculty' : user.targetRole || 'Student'}</span>
          </div>
        </div>
      )}

      <nav className="sidebar-nav">
        {user.role === 'student' && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span>Dashboard</span>
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
              <svg viewBox="0 0 24 24" className="nav-icon"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <span>Progress Tracker</span>
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

            <NavLink to="/mock-interviews" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span>Mock Interviews</span>
            </NavLink>

            <NavLink to="/discussion-forum" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              <span>Discussion Forum</span>
            </NavLink>

            <NavLink to="/company-prep" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h6M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>Company Pathways</span>
            </NavLink>

            <NavLink to="/jobs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
              <span>Job Board</span>
            </NavLink>

            <NavLink to="/doubt-solver" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Doubt Solver</span>
            </NavLink>
          </>
        )}

        {user.role === 'faculty' && (
          <>
            <NavLink to="/faculty" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span>Faculty Dashboard</span>
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
          </>
        )}

        {user.role === 'admin' && (
          <>
            <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              <span>Admin Console</span>
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

            <NavLink to="/admin/doubt-solver" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>Doubt Resolving</span>
            </NavLink>

            <NavLink to="/discussion-forum" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <svg viewBox="0 0 24 24" className="nav-icon" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
              <span>Discussion Forum</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {user.role === 'student' ? (
          <>
            <div className="user-badge-container">
              <div className="user-profile-badge-btn" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
                <div className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role">{user.targetRole || 'Student'}</span>
                </div>
                <span className="chevron-icon">›</span>
              </div>

              {isUserMenuOpen && (
                <div className="user-popover-menu animate-fade">
                  <button
                    onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}
                    className="popover-item"
                  >
                    <svg className="popover-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => { setShowContactModal(true); setIsUserMenuOpen(false); }}
                    className="popover-item"
                  >
                    <svg className="popover-icon" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                    <span>Contact Us</span>
                  </button>
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="logout-btn" style={{ width: '100%' }}>
              <svg viewBox="0 0 24 24" className="logout-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <button onClick={handleLogout} className="logout-btn">
            <svg viewBox="0 0 24 24" className="logout-icon"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            <span>Sign Out</span>
          </button>
        )}
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
