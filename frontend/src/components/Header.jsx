import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = ({ title }) => {
  const { user } = useAuth();
  
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
        <div className="header-date">
          <svg viewBox="0 0 24 24" className="header-icon"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        </div>
        
        <div className="header-divider"></div>

        <div className="header-profile">
          <span className="profile-role-badge">{user.role === 'admin' ? 'Admin' : 'Student'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
