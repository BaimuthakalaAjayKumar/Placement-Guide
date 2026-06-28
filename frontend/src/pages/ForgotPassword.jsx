import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Auth.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email) {
            setError('Please provide an email address.');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/forgotpassword`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            if (data.success) {
                setSuccess('A password reset link has been sent to your email address. Please check your inbox!');
                setEmail('');
            } else {
                setError(data.error || 'Failed to send password reset letter.');
            }
        } catch (err) {
            setError('Could not connect to the authentication service.');
        } finally {
            setLoading(false);
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
                    <h2>Reset Password</h2>
                    <p>Provide your email address to receive a secure password recovery link</p>
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
                    <div className="form-group animate-slide">
                        <label className="form-label" htmlFor="email">Registered Email Address</label>
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

                    <button type="submit" className="btn btn-accent btn-block mt-20" disabled={loading}>
                        {loading ? (
                            <span className="spinner-loader"></span>
                        ) : (
                            'Send Recovery Link'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    <span>Remember your password? </span>
                    <Link to="/login" className="auth-link">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
