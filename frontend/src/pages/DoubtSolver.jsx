import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './DoubtSolver.css';

const DoubtSolver = () => {
    const { token, user } = useAuth();
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const UPLOADS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');

    const fetchDoubts = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/doubts/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setDoubts(data.data);
        } catch (err) {
            setError('Could not load your past queries. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchDoubts();
    }, [token]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) {
            setError('Please fill in both subject and description.');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const formData = new FormData();
            formData.append('subject', subject.trim());
            formData.append('description', description.trim());
            if (imageFile) formData.append('image', imageFile);

            const res = await fetch(`${API_URL}/doubts`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                setSuccess('Your query has been submitted! The placement admin has been notified and will respond to your registered email.');
                setSubject('');
                setDescription('');
                handleRemoveImage();
                fetchDoubts();
            } else {
                setError(data.error || 'Failed to submit your query. Please try again.');
            }
        } catch (err) {
            setError('Connection error. Please check your network and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Header title="Live Query & Doubt Solver" />

            <div className="content-wrapper doubt-page-wrapper animate-fade">
                {/* Submit New Doubt Form */}
                <div className="glass-card doubt-submit-card">
                    <div className="doubt-card-header">
                        <div className="doubt-header-icon">💬</div>
                        <div>
                            <h3>Ask a Question</h3>
                            <p className="doubt-header-sub">Describe your problem, optionally attach a screenshot. The admin will reply to your email.</p>
                        </div>
                    </div>

                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <form onSubmit={handleSubmit} className="doubt-form">
                        <div className="form-group">
                            <label className="form-label">Subject / Topic *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Issue with Aptitude Test Score, Interview Question Doubt…"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Describe Your Problem in Detail *</label>
                            <textarea
                                className="form-control doubt-textarea"
                                rows="5"
                                placeholder="Explain your question or problem clearly. Include any relevant context, what you tried, expected outcomes, etc."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Attach Screenshot / Image (Optional)</label>
                            {imagePreview ? (
                                <div className="image-preview-block">
                                    <img src={imagePreview} alt="Attached problem screenshot" className="image-preview-img" />
                                    <button type="button" className="remove-image-btn" onClick={handleRemoveImage}>
                                        ✕ Remove Image
                                    </button>
                                </div>
                            ) : (
                                <div className="image-upload-zone" onClick={() => fileInputRef.current.click()}>
                                    <span className="upload-icon">📎</span>
                                    <span>Click to attach an image (JPEG, PNG, max 5MB)</span>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageChange}
                            />
                        </div>

                        <button type="submit" className="btn btn-accent" disabled={submitting}>
                            {submitting ? 'Submitting Query...' : '📨 Submit Query to Admin'}
                        </button>
                    </form>
                </div>

                {/* Past Doubts List */}
                <div className="doubt-history-section">
                    <h3 className="breakdown-headline">Your Past Queries</h3>

                    {loading ? (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            Loading your query history...
                        </div>
                    ) : doubts.length === 0 ? (
                        <div className="glass-card empty-doubts-card">
                            <span className="empty-icon">🔍</span>
                            <p>You have not submitted any queries yet. Use the form above to ask your first question.</p>
                        </div>
                    ) : (
                        <div className="doubt-list">
                            {doubts.map((doubt) => (
                                <div className={`glass-card doubt-item-card status-${doubt.status}`} key={doubt._id}>
                                    <div className="doubt-item-header">
                                        <div className="doubt-item-subject">
                                            <span className="doubt-item-icon">{doubt.status === 'answered' ? '✅' : '⏳'}</span>
                                            <h4>{doubt.subject}</h4>
                                        </div>
                                        <span className={`doubt-status-badge ${doubt.status}`}>
                                            {doubt.status === 'answered' ? 'Answered' : 'Pending'}
                                        </span>
                                    </div>

                                    <p className="doubt-description">{doubt.description}</p>

                                    {doubt.imageUrl && (
                                        <div className="doubt-image-wrapper">
                                            <img
                                                src={`${UPLOADS_URL}/${doubt.imageUrl}`}
                                                alt="Attached problem screenshot"
                                                className="doubt-attached-img"
                                            />
                                        </div>
                                    )}

                                    <div className="doubt-meta">
                                        <span>Submitted: {new Date(doubt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>

                                    {doubt.status === 'answered' && doubt.answer && (
                                        <div className="doubt-answer-block">
                                            <div className="answer-header">
                                                <span className="answer-icon">👨‍💼</span>
                                                <strong>Admin Response</strong>
                                                <span className="answer-date">
                                                    {doubt.answeredAt ? new Date(doubt.answeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                                                </span>
                                            </div>
                                            <p className="answer-text">{doubt.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default DoubtSolver;
