import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './AdminDoubtSolver.css';

const AdminDoubtSolver = () => {
    const { token } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const UPLOADS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'answered'
    const [answers, setAnswers] = useState({}); // { [doubtId]: answerText }
    const [submitting, setSubmitting] = useState({});
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [expandedDoubt, setExpandedDoubt] = useState(null);

    const fetchDoubts = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/doubts/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setDoubts(data.data);
        } catch (err) {
            setError('Failed to load queries.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchDoubts();
    }, [token]);

    const handleAnswerSubmit = async (doubtId) => {
        const answerText = answers[doubtId] || '';
        if (!answerText.trim()) {
            setError('Please type an answer before submitting.');
            return;
        }

        setSubmitting(prev => ({ ...prev, [doubtId]: true }));
        setError('');
        setSuccess('');

        try {
            const res = await fetch(`${API_URL}/doubts/${doubtId}/answer`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ answer: answerText })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`Answer submitted! The student has been notified via email.`);
                setAnswers(prev => ({ ...prev, [doubtId]: '' }));
                fetchDoubts();
                setTimeout(() => setSuccess(''), 4000);
            } else {
                setError(data.error || 'Failed to submit answer.');
            }
        } catch (err) {
            setError('Connection error. Please try again.');
        } finally {
            setSubmitting(prev => ({ ...prev, [doubtId]: false }));
        }
    };

    const filteredDoubts = doubts.filter(d => {
        if (filter === 'pending') return d.status === 'pending';
        if (filter === 'answered') return d.status === 'answered';
        return true;
    });

    const pendingCount = doubts.filter(d => d.status === 'pending').length;

    return (
        <>
            <Header title="Doubt Resolving Center" />

            <div className="content-wrapper admin-doubt-wrapper animate-fade">
                {/* Stats Bar */}
                <div className="admin-doubt-stats glass-card">
                    <div className="doubt-stat-item">
                        <span className="doubt-stat-num">{doubts.length}</span>
                        <span className="doubt-stat-label">Total Queries</span>
                    </div>
                    <div className="doubt-stat-divider" />
                    <div className="doubt-stat-item">
                        <span className="doubt-stat-num text-warning">{pendingCount}</span>
                        <span className="doubt-stat-label">Pending</span>
                    </div>
                    <div className="doubt-stat-divider" />
                    <div className="doubt-stat-item">
                        <span className="doubt-stat-num text-success">{doubts.length - pendingCount}</span>
                        <span className="doubt-stat-label">Answered</span>
                    </div>
                </div>

                {success && <div className="alert-banner success-banner">{success}</div>}
                {error && <div className="alert-banner error-banner-red">{error}</div>}

                {/* Filter Tabs */}
                <div className="admin-tabs-nav">
                    {['all', 'pending', 'answered'].map(f => (
                        <button
                            key={f}
                            className={`admin-tab-btn ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? '🗂 All Queries' : f === 'pending' ? '⏳ Pending' : '✅ Answered'}
                            {f === 'pending' && pendingCount > 0 && (
                                <span className="pending-badge">{pendingCount}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Doubts List */}
                {loading ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        Loading student queries...
                    </div>
                ) : filteredDoubts.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No queries found for this filter.
                    </div>
                ) : (
                    <div className="admin-doubt-list">
                        {filteredDoubts.map((doubt) => (
                            <div
                                className={`glass-card admin-doubt-card status-${doubt.status} ${expandedDoubt === doubt._id ? 'expanded' : ''}`}
                                key={doubt._id}
                            >
                                {/* Card Header */}
                                <div
                                    className="admin-doubt-card-header"
                                    onClick={() => setExpandedDoubt(expandedDoubt === doubt._id ? null : doubt._id)}
                                >
                                    <div className="admin-doubt-left">
                                        <span className="admin-doubt-status-dot status-dot-${doubt.status}">
                                            {doubt.status === 'pending' ? '⏳' : '✅'}
                                        </span>
                                        <div>
                                            <h4 className="admin-doubt-subject">{doubt.subject}</h4>
                                            <span className="admin-doubt-student">
                                                👤 {doubt.student?.name} &nbsp;·&nbsp; {doubt.student?.email}
                                                &nbsp;·&nbsp; {new Date(doubt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="admin-doubt-right">
                                        <span className={`doubt-status-badge ${doubt.status}`}>
                                            {doubt.status === 'pending' ? 'Pending' : 'Answered'}
                                        </span>
                                        <span className="expand-chevron">{expandedDoubt === doubt._id ? '▲' : '▼'}</span>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedDoubt === doubt._id && (
                                    <div className="admin-doubt-expanded-body">
                                        <div className="student-query-block">
                                            <p className="query-block-title">Student Description:</p>
                                            <p className="query-block-text">{doubt.description}</p>
                                        </div>

                                        {doubt.imageUrl && (
                                            <div className="admin-doubt-img-block">
                                                <p className="query-block-title">Attached Screenshot:</p>
                                                <img
                                                    src={`${UPLOADS_URL}/${doubt.imageUrl}`}
                                                    alt="Student submitted screenshot"
                                                    className="admin-doubt-img"
                                                />
                                            </div>
                                        )}

                                        {doubt.status === 'answered' ? (
                                            <div className="existing-answer-block">
                                                <p className="query-block-title">Your Previous Response:</p>
                                                <p className="existing-answer-text">{doubt.answer}</p>
                                                <span className="answered-meta">
                                                    Answered on {doubt.answeredAt ? new Date(doubt.answeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="reply-form-block">
                                                <label className="form-label">Write Your Answer / Response:</label>
                                                <textarea
                                                    className="form-control reply-textarea"
                                                    rows="4"
                                                    placeholder="Type your detailed answer or guidance here. The student will receive an email notification with your response."
                                                    value={answers[doubt._id] || ''}
                                                    onChange={(e) => setAnswers(prev => ({ ...prev, [doubt._id]: e.target.value }))}
                                                />
                                                <button
                                                    className="btn btn-accent"
                                                    onClick={() => handleAnswerSubmit(doubt._id)}
                                                    disabled={submitting[doubt._id]}
                                                >
                                                    {submitting[doubt._id] ? 'Sending...' : '✉️ Send Answer & Notify Student'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminDoubtSolver;
