import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

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
      if (result.user && result.user.role === 'admin') {
        navigate('/admin');
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
            <svg viewBox="0 0 24 24" className="logo-icon-auth">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>PrepPortal</span>
          </div>
          <h2>Welcome Back</h2>
          <p>Accelerate your placement preparation with AI tools</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <svg viewBox="0 0 24 24" className="alert-icon"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span>{error}</span>
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
            />
            <div className="auth-form-extra">
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
          <span>New to PrepPortal? </span>
          <Link to="/register" className="auth-link">Create an Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
