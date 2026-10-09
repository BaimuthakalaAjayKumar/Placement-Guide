import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import './DriveHallTicketModal.css';

const DriveHallTicketModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open_hall_ticket_modal', handleOpen);
    return () => window.removeEventListener('open_hall_ticket_modal', handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      const qrPayload = `CAMPUS_BRIDGE_PASS|ROLL:${user.rollNumber || '21BCE1042'}|NAME:${user.name}|VENUE:LAB-03-T42|TIME:0930`;
      QRCode.toDataURL(qrPayload, { width: 140, margin: 1 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div className="hallticket-backdrop" onClick={() => setIsOpen(false)}>
      <div className="hallticket-window" onClick={(e) => e.stopPropagation()}>
        <div className="hallticket-header-strip">
          <h3>🎫 Campus Placement Drive Admit Card</h3>
          <button
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer' }}
            onClick={() => setIsOpen(false)}
          >
            &times;
          </button>
        </div>

        <div className="hallticket-content">
          <div className="hallticket-pass-card">
            <div className="pass-college-banner">
              <div className="pass-college-title">
                <h4>{user?.campusName || 'College of Engineering & Technology'}</h4>
                <span>Training &amp; Placement Cell • On-Campus Recruitment Drive</span>
              </div>
              <div className="pass-badge">Official Admit Pass</div>
            </div>

            <div className="pass-grid">
              <div className="pass-info-list">
                <div className="pass-row">
                  <span className="pass-row-label">Candidate:</span>
                  <span className="pass-row-val">{user?.name || 'Aarav Sharma'}</span>
                </div>
                <div className="pass-row">
                  <span className="pass-row-label">Roll Number:</span>
                  <span className="pass-row-val mono-stat">{user?.rollNumber || '21BCE1042'}</span>
                </div>
                <div className="pass-row">
                  <span className="pass-row-label">Department:</span>
                  <span className="pass-row-val">{user?.department || user?.branch || 'Computer Science & Engineering'}</span>
                </div>
                <div className="pass-row">
                  <span className="pass-row-label">Company &amp; Role:</span>
                  <span className="pass-row-val">Oracle Cloud Infrastructure — SDE (Day-1 Slot)</span>
                </div>
                <div className="pass-row">
                  <span className="pass-row-label">Test Venue:</span>
                  <span className="pass-row-val" style={{ color: '#2563eb' }}>Computing Block • Lab 03 — Seat #42</span>
                </div>
                <div className="pass-row">
                  <span className="pass-row-label">Reporting Time:</span>
                  <span className="pass-row-val mono-stat">Oct 18, 2026 • 09:30 AM IST</span>
                </div>
              </div>

              <div className="pass-qr-wrap">
                {qrDataUrl && <img src={qrDataUrl} alt="Admit Card QR" className="pass-qr-img" />}
                <span className="pass-qr-sub">Scan at Lab Entry</span>
              </div>
            </div>

            <div className="pass-instructions">
              <strong>Instructions to Candidate:</strong> 1. Physical College ID Card is mandatory. 2. Electronic devices &amp; smartwatches are strictly prohibited inside the testing terminal. 3. Attendance will be recorded via QR code verification at the lab entrance.
            </div>
          </div>

          <div className="hallticket-actions">
            <button className="btn-ht-print" onClick={() => window.print()}>
              🖨️ Print / Save Admit Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriveHallTicketModal;
