import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import Header from '../components/Header';
import './ChangePassword.css';

const ChangePassword = () => {
  const { token, user, logout, loadUser } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Compute password strength
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: '', class: '' };

    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', class: 'weak' };
      case 2:
        return { score: 2, label: 'Fair', class: 'fair' };
      case 3:
        return { score: 3, label: 'Good', class: 'good' };
      case 4:
        return { score: 4, label: 'Strong', class: 'strong' };
      default:
        return { score: 1, label: 'Weak', class: 'weak' };
    }
  }, [newPassword]);

  // Compute password matching state
  const isMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      return setError('Please enter your current temporary password.');
    }
    if (newPassword.length < 6) {
      return setError('New password must be at least 6 characters long.');
    }
    if (newPassword === currentPassword) {
      return setError('New password must be different from your temporary password.');
    }
    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match. Please verify.');
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unable to update password. Please check your credentials.');
      }

      if (localStorage.getItem('remember_credentials') !== 'false') {
        localStorage.setItem('last_login_password', newPassword);
      }

      setSuccess('Password updated successfully! Reloading your secure portal...');

      if (typeof loadUser === 'function') {
        await loadUser();
      }

      setTimeout(() => {
        window.location.reload();
      }, 900);
    } catch (err) {
      setError(err.message || 'An error occurred while changing password.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const roleName = user?.role === 'admin'
    ? 'Administrator'
    : user?.role === 'faculty'
    ? 'Faculty Portal'
    : user?.role === 'recruiter'
    ? 'Recruiter Portal'
    : 'Student Portal';

  return (
    <>
      <Header title="Account Security" />

      <div className="content-wrapper change-password-page-wrapper animate-fade">
        <div className="change-password-container">
          <div className="change-password-card">
            
            {/* Header / Security Icon */}
            <div className="cp-header">
              <div className="cp-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h2>Change Your Password</h2>
              <p>
                {user?.role === 'admin' || user?.role === 'recruiter' 
                  ? 'Password changes are restricted for Administrator and Recruiter roles.'
                  : 'Update your account password securely.'}
              </p>
            </div>

            {(user?.role === 'admin' || user?.role === 'recruiter') && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '16px',
                borderRadius: '8px',
                color: '#fca5a5',
                fontSize: '13.5px',
                marginBottom: '16px',
                lineHeight: '1.5'
              }}>
                🔒 <strong>Password Modification Restricted:</strong> Direct password changes are disabled for Super Administrator and Campus Recruiter accounts for institutional security compliance.
              </div>
            )}

            {/* User identity banner */}
            {user && (
              <div className="cp-user-banner">
                <div className="cp-user-info">
                  <div className="cp-user-avatar">
                    {userInitial}
                  </div>
                  <div className="cp-user-meta">
                    <span className="cp-user-name">{user.name}</span>
                    <span className="cp-user-role">{roleName}</span>
                  </div>
                </div>
                <span className="cp-badge-temp">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Temporary Access
                </span>
              </div>
            )}

            {/* Error & Success alerts */}
            {error && (
              <div className="cp-alert cp-alert-error">
                <svg viewBox="0 0 24 24" className="cp-alert-icon" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="cp-alert cp-alert-success">
                <svg viewBox="0 0 24 24" className="cp-alert-icon" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{success}</span>
              </div>
            )}

            {/* Password change form */}
            {!(user?.role === 'admin' || user?.role === 'recruiter') && (
            <form onSubmit={handleSubmit} className="cp-form">
              
              {/* Current Password Field */}
              <div className="cp-field-group">
                <label className="cp-field-label" htmlFor="currentPassword">
                  <span>Current / Temporary Password</span>
                </label>
                <div className="cp-input-wrapper">
                  <input
                    id="currentPassword"
                    className="cp-input"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Enter temporary password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="cp-toggle-pw"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showCurrent ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* New Password Field */}
              <div className="cp-field-group">
                <label className="cp-field-label" htmlFor="newPassword">
                  <span>New Password</span>
                </label>
                <div className="cp-input-wrapper">
                  <input
                    id="newPassword"
                    className="cp-input"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Enter at least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="cp-toggle-pw"
                    onClick={() => setShowNew(!showNew)}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password strength meter */}
                {newPassword && (
                  <div className="cp-strength-meter">
                    <div className="cp-strength-bars">
                      <div className={`cp-strength-bar ${passwordStrength.score >= 1 ? passwordStrength.class : ''}`} />
                      <div className={`cp-strength-bar ${passwordStrength.score >= 2 ? passwordStrength.class : ''}`} />
                      <div className={`cp-strength-bar ${passwordStrength.score >= 3 ? passwordStrength.class : ''}`} />
                      <div className={`cp-strength-bar ${passwordStrength.score >= 4 ? passwordStrength.class : ''}`} />
                    </div>
                    <div className="cp-strength-meta">
                      <span>Password Strength</span>
                      <span className={`cp-strength-label ${passwordStrength.class}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="cp-field-group">
                <label className="cp-field-label" htmlFor="confirmPassword">
                  <span>Confirm New Password</span>
                </label>
                <div className="cp-input-wrapper">
                  <input
                    id="confirmPassword"
                    className="cp-input"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="cp-toggle-pw"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Match indicator */}
                {isMatch !== null && (
                  <span className={`cp-match-status ${isMatch ? 'match' : 'mismatch'}`}>
                    {isMatch ? (
                      <>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Passwords match
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Passwords do not match
                      </>
                    )}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="cp-submit-btn"
                disabled={saving || (confirmPassword.length > 0 && isMatch === false)}
              >
                {saving ? (
                  <>
                    <span className="cp-spinner" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Update Password & Continue</span>
                  </>
                )}
              </button>
            </form>
            )}

            {/* Footer with Sign Out option */}
            <div className="cp-footer">
              <span>Need to switch accounts?</span>
              <button type="button" onClick={handleSignOut} className="cp-signout-link">
                Sign Out
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;
