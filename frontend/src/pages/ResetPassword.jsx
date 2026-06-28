import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    const { token } = useParams();
    const { resetPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLocalLoading(true);
        const result = await resetPassword(token, password);
        setLocalLoading(false);

        if (result.success) {
            setSuccess('Your password has been reset successfully! Logging you in...');
            setTimeout(() => {
                if (result.user && result.user.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            }, 2000);
        } else {
            setError(result.error || 'Failed to reset password. The link might be expired or invalid.');
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
                    <h2>Create New Password</h2>
                    <p>Choose a strong, secure new password for your account</p>
                </div>

                {error && (
                    <div className="auth-error-alert" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5' }}>
                        <svg viewBox="0 0 24 24" className="alert-icon"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="auth-error-alert" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#a7f3d0' }}>
                        <svg viewBox="0 0 24 24" className="alert-icon"><circle cx="12" cy="12" r="10" /><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        <span>{success}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">New Password</label>
                        <input
                            type="password"
                            id="password"
                            className="form-control"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group mt-15">
                        <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            className="form-control"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-accent btn-block mt-20" disabled={localLoading}>
                        {localLoading ? (
                            <span className="spinner-loader"></span>
                        ) : (
                            'Save & Log In'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <Link to="/login" className="auth-link">Back to Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
