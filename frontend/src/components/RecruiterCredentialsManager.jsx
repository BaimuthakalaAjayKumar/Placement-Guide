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
  const [showCreatedCard, setShowCreatedCard] = useState(null); // holds newly created credentials
  const [form, setForm] = useState({
    name: '',
    email: '',
    companyName: '',
    companyWebsite: '',
    companyLogo: '',
    password: '',
    expiryDays: '30',
    recruiterNotes: ''
  });

  // Password visibility map (id -> boolean)
  const [visiblePasswords, setVisiblePasswords] = useState({});

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

  // Generate random secure password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    let pass = 'Rec@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, password: pass }));
  };

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
        setSuccessMsg(`🎉 Temporary recruiter credentials generated for ${data.credentials?.companyName}!`);
        setShowCreatedCard(data.credentials);
        setShowCreateModal(false);
        setForm({
          name: '',
          email: '',
          companyName: '',
          companyWebsite: '',
          companyLogo: '',
          password: '',
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

  // Revoke Recruiter Account
  const handleRevoke = async (id, name, company) => {
    if (!window.confirm(`Are you sure you want to revoke temporary credentials for ${name} (${company})?`)) {
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

  // Copy invitation text to clipboard
  const handleCopyInvitation = (cred) => {
    const loginUrl = `${window.location.origin}/login`;
    const text = `Campus Placement Portal Temporary Credentials:
Company: ${cred.companyName}
Contact: ${cred.name}
Login URL: ${loginUrl}
Email: ${cred.email}
Temporary Password: ${cred.temporaryPassword || cred.tempPasswordPlain}
Expires At: ${cred.expiresAt ? new Date(cred.expiresAt).toLocaleDateString() : '30 Days'}
Role: Recruiter`;

    navigator.clipboard.writeText(text);
    sfx.playClick();
    setSuccessMsg('📋 Complete login credentials copied to clipboard!');
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
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

      {/* Newly Created Credentials Success Modal / Card */}
      {showCreatedCard && (
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
                ✓ TEMPORARY CREDENTIALS READY
              </div>
              <h3 style={{ margin: '0 0 6px 0', color: '#FFFFFF' }}>
                Recruiter Credentials for {showCreatedCard.companyName}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1' }}>
                Share these temporary login details with the recruiter so they can access their dashboard and review eligible students.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleCopyInvitation(showCreatedCard)}
              >
                📋 Copy All Details
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowCreatedCard(null)}
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '14px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', fontSize: '13px' }}>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>LOGIN EMAIL</span>
              <strong style={{ color: '#FFFFFF' }}>{showCreatedCard.email}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>TEMPORARY PASSWORD</span>
              <strong style={{ color: '#fbbf24', letterSpacing: '0.05em' }}>{showCreatedCard.temporaryPassword}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px' }}>VALID UNTIL</span>
              <strong style={{ color: '#38bdf8' }}>{new Date(showCreatedCard.expiresAt).toLocaleDateString()} ({showCreatedCard.daysValid} days)</strong>
            </div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="glass-card" style={{ padding: '1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              <span>🔑</span> Recruiter Temporary Accounts &amp; Access Control
            </h3>
            <p className="card-desc" style={{ margin: 0 }}>
              Issue temporary login credentials to visiting campus recruitment teams. Recruiters get a dedicated dashboard to post on-campus drives, view suitable student profiles, and advance candidates through interview rounds.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fetchRecruiters}
              title="Refresh roster"
            >
              🔄 Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', fontWeight: 700 }}
              onClick={() => {
                generateRandomPassword();
                setShowCreateModal(true);
              }}
            >
              ➕ Generate Recruiter Credentials
            </button>
          </div>
        </div>
      </div>

      {/* Recruiter Accounts Table */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h4 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.1rem' }}>
            Active Recruiter Credentials ({recruiters.length})
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
                  <th>Temporary Password</th>
                  <th>Validity &amp; Expiry</th>
                  <th>Logins</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map((r) => {
                  const isVisible = visiblePasswords[r._id];
                  const plainPass = r.tempPasswordPlain || '••••••••';

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

                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '3px 8px', borderRadius: '4px', color: '#fbbf24' }}>
                            {isVisible ? plainPass : '••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(r._id)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}
                            title={isVisible ? 'Hide password' : 'Show password'}
                          >
                            {isVisible ? '🙈' : '👁️'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(plainPass);
                              sfx.playClick();
                              setSuccessMsg(`Password for ${r.companyName} copied to clipboard!`);
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '12px' }}
                            title="Copy password"
                          >
                            📋
                          </button>
                        </div>
                      </td>

                      <td>
                        {r.isExpired ? (
                          <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px' }}>
                            ⚠️ Expired
                          </span>
                        ) : (
                          <div>
                            <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px' }}>
                              ● {r.daysRemaining} days remaining
                            </span>
                            <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                              Expires: {r.recruiterExpiresAt ? new Date(r.recruiterExpiresAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                          {r.loginCount || 0} times
                        </span>
                        {r.lastLoginAt && (
                          <span style={{ display: 'block', fontSize: '10.5px', color: '#64748b' }}>
                            {new Date(r.lastLoginAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => handleCopyInvitation(r)}
                            title="Copy invitation message"
                          >
                            📋 Copy Invite
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => handleExtend(r._id, 15)}
                            title="Extend access by 15 days"
                          >
                            +15d
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            onClick={() => handleRevoke(r._id, r.name, r.companyName)}
                            title="Revoke access"
                          >
                            🗑 Revoke
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
              No temporary recruiter credentials issued yet.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                generateRandomPassword();
                setShowCreateModal(true);
              }}
            >
              ➕ Issue Temporary Credentials
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
                <span>🔑</span> Issue Temporary Recruiter Credentials
              </h3>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.3rem', cursor: 'pointer' }}
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {user?.campusName && (
                <div style={{ padding: '8px 12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '6px', fontSize: '12px', color: '#38bdf8' }}>
                  📍 Campus Scope: <strong>{user.campusName}</strong> (automatically assigned to this recruiter account)
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
                    placeholder="e.g. Sarah Jenkins (HR Lead)"
                  />
                </div>

                <div className="recruiter-form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    required
                    value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                    placeholder="e.g. Google / Microsoft / TCS"
                  />
                </div>

                <div className="recruiter-form-group full-width">
                  <label>Official Recruiter Email (Login ID) *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="e.g. sarah.jenkins@google.com"
                  />
                </div>

                <div className="recruiter-form-group">
                  <label>Temporary Password *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Enter or generate password"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={generateRandomPassword}
                      title="Generate random secure password"
                    >
                      🎲 Gen
                    </button>
                  </div>
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
                  <label>Internal TPO Notes (Optional)</label>
                  <input
                    type="text"
                    value={form.recruiterNotes}
                    onChange={(e) => setForm({ ...form, recruiterNotes: e.target.value })}
                    placeholder="e.g. Visiting college on Oct 18 for FTE campus recruitment"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                  style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', fontWeight: 700 }}
                >
                  {actionLoading ? 'Generating...' : '✓ Generate & Issue Credentials'}
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
