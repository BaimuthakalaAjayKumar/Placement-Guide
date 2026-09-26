import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LeetCodeThemeToggle from './LeetCodeThemeToggle';
import { API_URL } from '../config/api';
import './Header.css';

const Header = ({ title }) => {
  const { user, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  useEffect(() => {
    if (!token) return;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) setNotifications(data.data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();
  }, [token]);

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(notification =>
        notification._id === notificationId ? { ...notification, isRead: true } : notification
      ));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const dismissNotification = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const unreadCount = notifications.filter(notification => !notification.isRead).length;

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
        <div className="notification-center">
          <button
            type="button"
            className="notification-btn"
            onClick={() => setShowNotifications(prev => !prev)}
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            title="Notifications"
          >
            <svg viewBox="0 0 24 24" className="header-icon" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
            {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className="notification-popover">
              <div className="notification-popover-header">
                <div>
                  <strong>Notifications</strong>
                  <span style={{ marginLeft: '8px' }}>{unreadCount} unread</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#818cf8',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="notification-empty">No notifications yet.</p>
              ) : (
                notifications.slice(0, 8).map(notification => (
                  <div
                    className={`notification-item ${notification.isRead ? 'read' : ''}`}
                    key={notification._id}
                    onClick={() => markNotificationRead(notification._id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: '8px' }}>
                      <span style={{ display: 'block', fontSize: '12.5px', lineHeight: '1.4' }}>{notification.message}</span>
                      <small style={{ display: 'block', marginTop: '4px', color: '#94a3b8' }}>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => dismissNotification(e, notification._id)}
                      title="Dismiss notification"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '16px',
                        lineHeight: 1,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        flexShrink: 0
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <LeetCodeThemeToggle showLabel={true} />

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
