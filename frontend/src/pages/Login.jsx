import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkBackendHealth, API_URL } from '../config/api';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('last_login_email') || '';
  });
  const [password, setPassword] = useState(() => {
    return localStorage.getItem('last_login_password') || '';
  });
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('remember_credentials') !== 'false';
  });
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [checkingServer, setCheckingServer] = useState(false);
  const [serverStatusMsg, setServerStatusMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTestConnection = async () => {
    setCheckingServer(true);
    setServerStatusMsg('Testing connection to backend...');
    const isAlive = await checkBackendHealth();
    setCheckingServer(false);
    if (isAlive) {
      setServerStatusMsg('Backend is online and reachable! You can sign in now.');
      setError('');
    } else {
      setServerStatusMsg(`Unable to reach backend at ${API_URL}. Please ensure backend server is started.`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLocalLoading(true);
    const result = await login(email, password);
    setLocalLoading(false);

    if (result.success) {
      // Preserve last login credentials so user never has to retype
      if (rememberMe) {
        localStorage.setItem('last_login_email', email);
        localStorage.setItem('last_login_password', password);
        localStorage.setItem('remember_credentials', 'true');
      } else {
        localStorage.removeItem('last_login_email');
        localStorage.removeItem('last_login_password');
        localStorage.setItem('remember_credentials', 'false');
      }

      if (result.user && result.user.role === 'admin') {
        navigate('/admin');
      } else if (result.user && result.user.role === 'faculty') {
        navigate('/faculty');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-glow-circle-1"></div>
      <div className="auth-glow-circle-2"></div>

      <div className="auth-card glass-card animate-fade">
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/college-logo.jpg" alt="GRIET Placement" className="auth-logo-img" />
            <span>GRIET Placement</span>
          </div>
          <h2>Welcome Back</h2>
          <p>Accelerate your placement preparation with AI tools</p>
        </div>

        {error && (
          <div className="auth-error-alert" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <svg viewBox="0 0 24 24" className="alert-icon" style={{ flexShrink: 0, marginTop: '2px' }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              <span style={{ fontSize: '13px', lineHeight: '1.4' }}>{error}</span>
            </div>
            {error.toLowerCase().includes('connect') && (
              <div style={{ marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={checkingServer}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    fontSize: '12px',
                    cursor: checkingServer ? 'wait' : 'pointer'
                  }}
                >
                  {checkingServer ? '🔄 Checking Server...' : '🔄 Test Connection'}
                </button>
              </div>
            )}
          </div>
        )}

        {serverStatusMsg && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '12.5px',
            marginBottom: '16px',
            backgroundColor: serverStatusMsg.includes('online') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${serverStatusMsg.includes('online') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: serverStatusMsg.includes('online') ? '#86efac' : '#fca5a5'
          }}>
            {serverStatusMsg}
          </div>
        )}


        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="name@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="auth-form-extra" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-secondary)', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent-primary, #6366f1)', width: '14px', height: '14px' }}
                />
                <span>Remember Credentials</span>
              </label>
              <Link to="/forgot-password" className="auth-link">
                Forgot password?
              </Link>
            </div>
          </div>

          <button type="submit" className="btn btn-accent btn-block" disabled={localLoading}>
            {localLoading ? (
              <span className="spinner-loader"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>New to GRIET Placement? </span>
          <Link to="/register" className="auth-link">Create an Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
