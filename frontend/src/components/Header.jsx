import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

const Header = ({ title }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  if (!user) return null;

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <header className="main-header">
      <div className="header-title">
        <h1>{title}</h1>
        <span className="header-subtitle">{getGreeting()}, {user.name.split(' ')[0]}</span>
      </div>

      <div className="header-actions">
        <button
          type="button"
          className="header-theme-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
        >
          {theme === 'light' ? (
            <svg viewBox="0 0 24 24" className="header-icon" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="header-icon" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></svg>
          )}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>

        <div className="header-date">
          <svg viewBox="0 0 24 24" className="header-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
        
        <div className="header-divider"></div>

        <div className="header-profile">
          <span className="profile-role-badge">{user.role === 'admin' ? 'Admin' : user.role === 'faculty' ? 'Faculty' : 'Student'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
