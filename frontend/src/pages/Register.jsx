import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [codeforcesUsername, setCodeforcesUsername] = useState('');
  const [codechefUsername, setCodechefUsername] = useState('');
  const [hackerrankUsername, setHackerrankUsername] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const normalizedRole = role || 'student';
    const platformUsernames = [leetcodeUsername, codeforcesUsername, codechefUsername, hackerrankUsername].map(value => value?.trim() || '');

    if (normalizedRole === 'student' && platformUsernames.some(username => username.length === 0)) {
      setError('Students must fill all coding platform IDs: LeetCode, Codeforces, CodeChef, and HackerRank.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLocalLoading(true);
    const result = await register(name, email, password, role, leetcodeUsername, codeforcesUsername, codechefUsername, hackerrankUsername);
    setLocalLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Failed to create account. Please try again.');
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
          <h2>Join PrepPortal</h2>
          <p>Get instant access to AI analysis, mock exams, and interviews</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <svg viewBox="0 0 24 24" className="alert-icon"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              className="form-control"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="leetcodeUsername">LeetCode Username <span className="text-secondary">(Required for students)</span></label>
            <input
              type="text"
              id="leetcodeUsername"
              className="form-control"
              placeholder="e.g. neetcode"
              value={leetcodeUsername}
              onChange={(e) => setLeetcodeUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="codeforcesUsername">Codeforces Username <span className="text-secondary">(Required for students)</span></label>
            <input
              type="text"
              id="codeforcesUsername"
              className="form-control"
              placeholder="e.g. tourist"
              value={codeforcesUsername}
              onChange={(e) => setCodeforcesUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="codechefUsername">CodeChef Username <span className="text-secondary">(Required for students)</span></label>
            <input
              type="text"
              id="codechefUsername"
              className="form-control"
              placeholder="e.g. gen_os"
              value={codechefUsername}
              onChange={(e) => setCodechefUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="hackerrankUsername">HackerRank Username <span className="text-secondary">(Required for students)</span></label>
            <input
              type="text"
              id="hackerrankUsername"
              className="form-control"
              placeholder="e.g. hack_tester"
              value={hackerrankUsername}
              onChange={(e) => setHackerrankUsername(e.target.value)}
            />
          </div>



          <button type="submit" className="btn btn-accent btn-block" disabled={localLoading}>
            {localLoading ? (
              <span className="spinner-loader"></span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <Link to="/login" className="auth-link">Sign In</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
