import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './Auth.css';

const ChangePassword = () => {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 6) return setError('New password must be at least 6 characters.');
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');

    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Unable to change password.');
      if (localStorage.getItem('remember_credentials') !== 'false') {
        localStorage.setItem('last_login_password', newPassword);
      }
      setSuccess('Password changed successfully. Reloading your portal...');
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Change Your Password</h1>
        <p className="auth-subtitle">Your account uses a temporary password. Set a new private password before continuing.</p>
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="form-label" htmlFor="currentPassword">Temporary Password</label>
          <input id="currentPassword" className="form-control" type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required />
          <label className="form-label" htmlFor="newPassword">New Password</label>
          <input id="newPassword" className="form-control" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength="6" required />
          <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
          <input id="confirmPassword" className="form-control" type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength="6" required />
          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>{saving ? 'Updating...' : 'Change Password'}</button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
