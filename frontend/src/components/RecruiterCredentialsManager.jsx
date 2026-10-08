import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { sfx } from '../utils/audioVfx';

const RecruiterCredentialsManager = () => {
  const { user } = useAuth();
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationResult, setCreationResult] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    companyName: '',
    companyWebsite: '',
    companyLogo: '',
    expiryDays: '30',
    recruiterNotes: ''
  });

  const token = localStorage.getItem('token');

  const fetchRecruiters = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/recruiter/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRecruiters(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch recruiter accounts.');
      }
    } catch (err) {
      setError('Could not connect to recruiter service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiters();
  }, []);

  // Submit Create Recruiter Account
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/recruiter/create-temporary-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        const emailNotice = data.emailStatus === 'sent'
          ? `Credentials have been automatically emailed to ${form.email} via Brevo.`
          : `Account created, but email delivery encountered an issue. You can resend credentials.`;

        setSuccessMsg(`🎉 Recruiter account created for ${form.companyName}! ${emailNotice}`);
        setCreationResult({
          companyName: form.companyName,
          name: form.name,
          email: form.email,
          emailStatus: data.emailStatus,
          expiresAt: data.data?.recruiterExpiresAt
        });
        setShowCreateModal(false);
        setForm({
          name: '',
          email: '',
          companyName: '',
          companyWebsite: '',
          companyLogo: '',
          expiryDays: '30',
          recruiterNotes: ''
        });
        fetchRecruiters();
      } else {
        setError(data.error || 'Failed to create credentials.');
      }
    } catch (err) {
      setError('Could not create recruiter credentials.');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset Recruiter Password & Dispatch via Brevo
  const handleResetPassword = async (id, name, email, company) => {
    if (!window.confirm(`Generate a new temporary password and email credentials to ${name} (${email})? The recruiter will be required to change their password on next login.`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/recruiter/accounts/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`🔑 Temporary password reset! New credentials emailed to ${email}.`);
        fetchRecruiters();
      } else {
        setError(data.error || 'Failed to reset password.');
      }
    } catch (err) {
      setError('Could not reset recruiter password.');
    } finally {
      setActionLoading(false);
    }
  };

  // Resend Credentials via Brevo
  const handleResendCredentials = async (id, name, email) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');

      const res = await fetch(`${API_URL}/recruiter/accounts/${id}/resend-credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`✉️ Login credentials resent to ${email}.`);
        fetchRecruiters();
      } else {
        setError(data.error || 'Failed to resend credentials.');
      }
    } catch (err) {
      setError('Could not resend credentials.');
    } finally {
      setActionLoading(false);
    }
  };

  // Revoke Recruiter Account
  const handleRevoke = async (id, name, company) => {
    if (!window.confirm(`Are you sure you want to revoke recruiter credentials for ${name} (${company})? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/recruiter/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        sfx.playClick();
        setSuccessMsg(`Access revoked for ${name} (${company}).`);
        fetchRecruiters();
      } else {
        setError(data.error || 'Failed to revoke access.');
      }
    } catch (err) {
      setError('Could not complete revocation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Extend Expiration Date
  const handleExtend = async (id, days) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/recruiter/accounts/${id}/extend`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ addDays: days })
      });
      const data = await res.json();
      if (data.success) {
        sfx.playSuccess();
        setSuccessMsg(`Access extended by ${days} days for ${data.data?.name}!`);
        fetchRecruiters();
      } else {
        setError(data.error || 'Failed to extend access.');
      }
    } catch (err) {
      setError('Could not extend access.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="recruiter-credentials-manager animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Notifications */}
      {error && (
        <div className="error-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button type="button" className="banner-close-btn" onClick={() => setError('')}>×</button>
        </div>
      )}
      {successMsg && (
        <div className="success-banner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{successMsg}</span>
          <button type="button" className="banner-close-btn" onClick={() => setSuccessMsg('')}>×</button>
        </div>
      )}

      {/* Creation Confirmation Banner */}
      {creationResult && (
        <div
          className="glass-card"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 78, 59, 0.35))',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '14px',
            padding: '1.5rem',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, background: 'rgba(16, 185, 129, 0.3)', color: '#6ee7b7', padding: '3px 8px', borderRadius: '6px', marginBottom: '6px' }}>
                ✓ RECRUITER ACCOUNT CONFIGURED
              </div>
              <h3 style={{ margin: '0 0 6px 0', color: '#FFFFFF' }}>
                Account Provisioned for {creationResult.companyName}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                A secure temporary password was generated and transmitted to <strong>{creationResult.email}</strong> via Brevo HTTPS API.
                In accordance with institutional security policies, plaintext passwords are never stored in the database.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setCreationResult(null)}
            >
              ✕ Dismiss
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>LOGIN ID</span>
              <strong style={{ color: '#FFFFFF' }}>{creationResult.email}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>EMAIL DELIVERY STATUS</span>
              <strong style={{ color: creationResult.emailStatus === 'sent' ? '#34d399' : '#f87171' }}>
                {creationResult.emailStatus === 'sent' ? '✓ Delivered via Brevo' : '⚠️ Delivery Pending / Retry'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>PASSWORD REQUIREMENT</span>
              <strong style={{ color: '#fbbf24' }}>Must Change on First Login</strong>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              <span>🔑</span> Recruiter Account Management &amp; Credential Control
            </h3>
            <p className="card-desc" style={{ margin: 0 }}>
              Issue and manage recruiter credentials for visiting campus placement teams. Credentials are automatically delivered to recruiters via Brevo HTTPS API with enforced temporary-password changes on first login.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchRecruiters}
              title="Refresh roster"
              disabled={loading || actionLoading}
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', fontWeight: 700 }}
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Create Recruiter Account
            </button>
          </div>
        </div>
      </div>

      {/* Recruiter Accounts Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.1rem' }}>
            Configured Recruiter Accounts ({recruiters.length})
          </h4>
        </div>

        {loading ? (
          <div className="dashboard-loading-container" style={{ padding: '2rem' }}>
            <div className="spinner-loader"></div>
            <p>Loading recruiter accounts...</p>
          </div>
        ) : recruiters.length > 0 ? (
          <div className="table-responsive-wrapper">
            <table className="student-roster-table">
              <thead>
                <tr>
                  <th>Company &amp; Recruiter</th>
                  <th>Login Email</th>
                  <th>Password Status</th>
                  <th>Email Status</th>
                  <th>Account Validity</th>
                  <th>Audit &amp; Activity</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map((r) => {
                  const isTempPassword = r.mustChangePassword;
                  const emailStatus = r.credentialEmailStatus || 'sent';

                  return (
                    <tr key={r._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                            {r.companyName ? r.companyName.charAt(0).toUpperCase() : 'R'}
                          </div>
                          <div>
                            <strong style={{ color: '#FFFFFF', display: 'block' }}>{r.companyName}</strong>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{r.name}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '12.5px', color: '#cbd5e1' }}>{r.email}</span>
                      </td>

                      {/* Password Status */}
                      <td>
                        {isTempPassword ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(245, 158, 11, 0.15)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              padding: '4px 9px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            🔑 Temporary Password
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              padding: '4px 9px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            ✓ Password Changed
                          </span>
                        )}
                        {r.lastPasswordChangeAt && (
                          <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '3px' }}>
                            Updated: {new Date(r.lastPasswordChangeAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      {/* Email Status */}
                      <td>
                        {emailStatus === 'sent' ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              color: '#6ee7b7',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px'
                            }}
                          >
                            ✉️ Sent (Brevo)
                          </span>
                        ) : emailStatus === 'failed' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span
                              className="badge"
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: '#f87171',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px'
                              }}
                              title={r.credentialEmailError || 'Delivery failure'}
                            >
                              ⚠️ Delivery Failed
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResendCredentials(r._id, r.name, r.email)}
                              disabled={actionLoading}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#38bdf8',
                                fontSize: '10.5px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                textDecoration: 'underline'
                              }}
                            >
                              Resend now
                            </button>
                          </div>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: 'rgba(148, 163, 184, 0.15)',
                              color: '#94a3b8',
                              border: '1px solid rgba(148, 163, 184, 0.25)',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px'
                            }}
                          >
                            ⏳ Pending
                          </span>
                        )}
                      </td>

                      {/* Account Validity */}
                      <td>
                        {r.isExpired ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px' }}>
                            ⚠️ Expired
                          </span>
                        ) : (
                          <div>
                            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px' }}>
                              ● {r.daysRemaining}d remaining
                            </span>
                            <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              Expires: {r.recruiterExpiresAt ? new Date(r.recruiterExpiresAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Audit & Activity */}
                      <td>
                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                          <div>Logins: <strong>{r.loginCount || 0}</strong></div>
                          {r.lastLoginAt ? (
                            <span style={{ color: '#94a3b8' }}>
                              Last: {new Date(r.lastLoginAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>Never logged in</span>
                          )}
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            Created: {new Date(r.createdAt).toLocaleDateString()}
                            {r.createdBy?.name && ` by ${r.createdBy.name}`}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                            onClick={() => handleResetPassword(r._id, r.name, r.email, r.companyName)}
                            disabled={actionLoading}
                            title="Reset password and email new temporary credentials via Brevo"
                          >
                            🔄 Reset
                          </button>

                          {emailStatus !== 'sent' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px', color: '#38bdf8' }}
                              onClick={() => handleResendCredentials(r._id, r.name, r.email)}
                              disabled={actionLoading}
                              title="Resend login credentials via Brevo"
                            >
                              ✉️ Resend
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => handleExtend(r._id, 15)}
                            disabled={actionLoading}
                            title="Extend access by 15 days"
                          >
                            +15d
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => handleRevoke(r._id, r.name, r.companyName)}
                            disabled={actionLoading}
                            title="Revoke recruiter access"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-history-placeholder" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 10px 0', color: '#94a3b8' }}>
              No recruiter accounts configured yet.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Create Recruiter Account
            </button>
          </div>
        )}
      </div>

      {/* CREATE CREDENTIALS MODAL */}
      {showCreateModal && (
        <div className="recruiter-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="recruiter-modal-window" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔑</span> Provision Recruiter Account
              </h3>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', fontSize: '12px', color: '#c7d2fe', marginBottom: '14px', lineHeight: 1.5 }}>
              🛡️ <strong>Automated Credential Issuance:</strong> A cryptographically secure temporary password will be automatically generated and emailed to the recruiter via the centralized Brevo HTTPS service. Only the bcrypt hash is stored in MongoDB. The recruiter will be required to change their temporary password upon their first login.
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {user?.campusName && (
                <div style={{ padding: '8px 12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', fontSize: '12px', color: '#38bdf8' }}>
                  📍 Campus Scope: <strong>{user.campusName}</strong> (assigned to this recruiter account)
                </div>
              )}
              <div className="recruiter-form-grid">
                <div className="recruiter-form-group">
                  <label>Recruiter Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                  />
                </div>

                <div className="recruiter-form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Microsoft / Google / Infosys"
                  />
                </div>

                <div className="recruiter-form-group full-width">
                  <label>Official Recruiter Email (Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. recruiter@company.com"
                  />
                </div>

                <div className="recruiter-form-group">
                  <label>Company Website (Optional)</label>
                  <input
                    type="url"
                    value={form.companyWebsite}
                    onChange={(e) => setForm({ ...form, companyWebsite: e.target.value })}
                    placeholder="https://company.com"
                  />
                </div>

                <div className="recruiter-form-group">
                  <label>Validity Duration</label>
                  <select
                    value={form.expiryDays}
                    onChange={(e) => setForm({ ...form, expiryDays: e.target.value })}
                  >
                    <option value="7">7 Days (Short Visit)</option>
                    <option value="14">14 Days (Drive Week)</option>
                    <option value="30">30 Days (Standard Placement Season)</option>
                    <option value="60">60 Days (Extended Season)</option>
                    <option value="90">90 Days (Full Semester)</option>
                  </select>
                </div>

                <div className="recruiter-form-group full-width">
                  <label>Internal Placement Cell Notes (Optional)</label>
                  <input
                    type="text"
                    value={form.recruiterNotes}
                    onChange={(e) => setForm({ ...form, recruiterNotes: e.target.value })}
                    placeholder="e.g. On-campus recruitment for 2026 Batch FTE Software Engineers"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', fontWeight: 700 }}
                >
                  {actionLoading ? 'Creating & Sending Email...' : '✓ Create & Send Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterCredentialsManager;
