import React, { useState, useEffect } from 'react';
import { API_URL } from '../config/api';
import './AcademicScopeReviewManager.css';

const AcademicScopeReviewManager = ({ userRole = 'hod', onDecisionSuccess }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // requestId currently being decided
  const [reviewNotes, setReviewNotes] = useState({});
  const [activeModalId, setActiveModalId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_URL}/academic-scope-requests/pending`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setRequests(json.data);
      } else {
        setErrorMsg(json.error || 'Failed to fetch pending scope requests.');
      }
    } catch (err) {
      setErrorMsg('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleDecision = async (requestId, decision) => {
    try {
      setActionLoading(requestId);
      setErrorMsg('');
      setSuccessMsg('');
      const token = localStorage.getItem('token');
      const notes = (reviewNotes[requestId] || '').trim();

      const res = await fetch(`${API_URL}/academic-scope-requests/${requestId}/${decision}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reviewNotes: notes })
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || `Request ${decision}d successfully!`);
        setActiveModalId(null);
        fetchPendingRequests();
        if (typeof onDecisionSuccess === 'function') {
          onDecisionSuccess();
        }
      } else {
        setErrorMsg(json.error || `Failed to ${decision} request.`);
      }
    } catch (err) {
      setErrorMsg('Network error executing decision.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="scope-review-container">
        <div className="scope-review-card" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          Loading pending academic scope requests...
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return null; // Don't clutter UI when there are no pending requests
  }

  return (
    <div className="scope-review-container animate-fade">
      <div className="scope-review-card">
        <div className="scope-review-header">
          <div className="scope-review-title">
            <span>📝</span>
            <span>Pending Academic Scope Change Requests</span>
            <span className="scope-count-badge">{requests.length}</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={fetchPendingRequests}
            title="Refresh requests roster"
          >
            🔄 Refresh
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '8px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#6ee7b7', padding: '8px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
            ✓ {successMsg}
          </div>
        )}

        <div className="scope-requests-grid">
          {requests.map((item) => {
            const isSectionOnly = item.classification?.isSectionOnly ??
              (item.currentScope?.branch?.toUpperCase() === item.requestedScope?.branch?.toUpperCase() &&
               item.currentScope?.academicYear === item.requestedScope?.academicYear &&
               item.currentScope?.section !== item.requestedScope?.section);

            const isBranchChange = item.classification?.isBranchChange ??
              (item.currentScope?.branch?.toUpperCase() !== item.requestedScope?.branch?.toUpperCase());

            const isYearChange = item.classification?.isYearChange ??
              (item.currentScope?.academicYear !== item.requestedScope?.academicYear);

            const canApprove = item.canReview !== undefined ? item.canReview : (userRole !== 'hod' || isSectionOnly);

            return (
              <div className="scope-request-item" key={item._id}>
                <div className="scope-item-top">
                  <div className="student-meta-wrap">
                    <h4>{item.student?.name || 'Student Requester'}</h4>
                    <div className="student-sub-meta">
                      <span>Roll: <strong>{item.student?.rollNumber || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Email: {item.student?.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div>
                    {isSectionOnly ? (
                      <span className="scope-tier-badge hod-authorized">
                        ⭐ Department Section Transfer
                      </span>
                    ) : (
                      <span className="scope-tier-badge admin-required">
                        🏛️ {isBranchChange && isYearChange ? 'Branch & Year Transfer' : isBranchChange ? 'Branch Transfer' : 'Academic Year Transfer'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="scope-comparison-grid">
                  <div className="scope-box">
                    <span className="scope-box-label">Current Enrollment</span>
                    <span className="scope-box-value">
                      {item.currentScope?.branch} • Sec {item.currentScope?.section || '—'} • {item.currentScope?.academicYear}
                    </span>
                  </div>

                  <div className="scope-box">
                    <span className="scope-box-label">Requested Target Scope</span>
                    <span className="scope-box-value" style={{ color: '#38bdf8' }}>
                      {item.requestedScope?.branch} • Sec {item.requestedScope?.section} • {item.requestedScope?.academicYear}
                    </span>
                  </div>
                </div>

                <div className="scope-reason-box">
                  <strong>Justification:</strong> {item.justification || 'No justification provided.'}
                </div>

                {/* Review Notes Input */}
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Decision remarks / administrative notes (optional)..."
                    value={reviewNotes[item._id] || ''}
                    onChange={(e) => setReviewNotes({ ...reviewNotes, [item._id]: e.target.value })}
                    style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f8fafc', padding: '6px 12px', fontSize: '12.5px' }}
                  />
                </div>

                <div className="scope-actions-bar">
                  {canApprove ? (
                    <>
                      <button
                        type="button"
                        className="btn-reject"
                        disabled={actionLoading === item._id}
                        onClick={() => handleDecision(item._id, 'reject')}
                      >
                        {actionLoading === item._id ? 'Rejecting...' : 'Reject Request'}
                      </button>

                      <button
                        type="button"
                        className="btn-approve"
                        disabled={actionLoading === item._id}
                        onClick={() => handleDecision(item._id, 'approve')}
                      >
                        {actionLoading === item._id ? 'Approving...' : isSectionOnly ? 'Approve Section Transfer' : 'Approve Scope Transfer'}
                      </button>
                    </>
                  ) : (
                    <div className="scope-admin-only-notice">
                      <span>🔒</span>
                      <span>Requires Campus Administrator / Registrar approval (Inter-departmental or Year transfer).</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AcademicScopeReviewManager;
