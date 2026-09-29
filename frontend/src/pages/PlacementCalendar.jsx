import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import './PlacementCalendar.css';

const EVENT_TYPE_CONFIG = {
  training: { label: 'Training Session', icon: '🟢', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
  mock_interview: { label: 'Mock Interview', icon: '🔵', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
  company_drive: { label: 'Company Drive', icon: '🟣', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)' },
  aptitude_test: { label: 'Aptitude Test', icon: '🟠', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' },
  deadline: { label: 'Important Deadline', icon: '🔴', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
  workshop: { label: 'Workshop', icon: '🟡', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)' }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PlacementCalendar = () => {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'agenda'

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventType: 'company_drive',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endDate: new Date().toISOString().slice(0, 10),
    endTime: '12:00',
    venueOrLink: 'GRIET Placement Cell',
    instructorOrCompany: '',
    targetRoles: ['student', 'faculty', 'admin'],
    allDay: false
  });
  const [creating, setCreating] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/placement-events`;
      if (selectedFilter !== 'all') url += `?eventType=${selectedFilter}`;
      const res = await axios.get(url, getAuthHeaders());
      setEvents(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load placement events', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedFilter]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDayEvents(null);
  };

  // Calendar Day Generation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarCells = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    calendarCells.push({
      date: new Date(year, month - 1, dayNum),
      isCurrentMonth: false,
      dayNum
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
      dayNum: d
    });
  }

  // Next month leading days to complete grid
  const remainingCells = 42 - calendarCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    calendarCells.push({
      date: new Date(year, month + 1, d),
      isCurrentMonth: false,
      dayNum: d
    });
  }

  // Get events on a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return events.filter(e => {
      const eStartStr = new Date(e.startDateTime).toISOString().slice(0, 10);
      const eEndStr = new Date(e.endDateTime).toISOString().slice(0, 10);
      return dateStr >= eStartStr && dateStr <= eEndStr;
    });
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    try {
      setCreating(true);
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime || '00:00'}:00`);
      const endDateTime = new Date(`${newEvent.endDate}T${newEvent.endTime || '23:59'}:00`);

      const payload = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        eventType: newEvent.eventType,
        startDateTime,
        endDateTime,
        venueOrLink: newEvent.venueOrLink.trim(),
        instructorOrCompany: newEvent.instructorOrCompany.trim(),
        allDay: newEvent.allDay,
        targetRoles: newEvent.targetRoles
      };

      const res = await axios.post(`${API_URL}/placement-events`, payload, getAuthHeaders());
      setEvents(prev => [...prev, res.data.data]);
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        eventType: 'company_drive',
        startDate: new Date().toISOString().slice(0, 10),
        startTime: '10:00',
        endDate: new Date().toISOString().slice(0, 10),
        endTime: '12:00',
        venueOrLink: 'GRIET Placement Cell',
        instructorOrCompany: '',
        targetRoles: ['student', 'faculty', 'admin'],
        allDay: false
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create placement event');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event from the Placement Calendar?')) return;
    try {
      await axios.delete(`${API_URL}/placement-events/${eventId}`, getAuthHeaders());
      setEvents(prev => prev.filter(e => e._id !== eventId));
      if (selectedEventModal?._id === eventId) setSelectedEventModal(null);
    } catch (err) {
      alert('Failed to delete event');
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="placement-calendar-page">
      {/* Top Banner */}
      <div className="calendar-hero-card glass-card">
        <div className="calendar-hero-content">
          <div className="calendar-title-badge">
            <span className="calendar-badge-icon">📅</span>
            <span>Centralized Institutional Schedule</span>
          </div>
          <h2 className="calendar-heading">Placement & Training Calendar</h2>
          <p className="calendar-subtitle">
            Synchronized schedule of company recruitment drives, mock interviews, technical workshops, aptitude assessments, and strict application deadlines.
          </p>
        </div>

        {/* Action Controls */}
        <div className="calendar-hero-actions">
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              📅 Month Grid
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'agenda' ? 'active' : ''}`}
              onClick={() => setViewMode('agenda')}
            >
              📋 Agenda View
            </button>
          </div>

          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <button
              className="btn btn-primary schedule-event-btn"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ Schedule Event
            </button>
          )}
        </div>
      </div>

      {/* Category Pills & Legend */}
      <div className="calendar-legend-bar glass-card">
        <span className="legend-label">Filter Category:</span>
        <button
          className={`legend-pill ${selectedFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('all')}
        >
          All Categories ({events.length})
        </button>
        {Object.entries(EVENT_TYPE_CONFIG).map(([typeKey, cfg]) => {
          const count = events.filter(e => e.eventType === typeKey).length;
          return (
            <button
              key={typeKey}
              className={`legend-pill ${selectedFilter === typeKey ? 'active' : ''}`}
              style={{
                borderColor: cfg.border,
                color: cfg.color,
                background: selectedFilter === typeKey ? cfg.bg : 'transparent'
              }}
              onClick={() => setSelectedFilter(typeKey)}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
              <span className="legend-count-badge" style={{ background: cfg.bg, color: cfg.color }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main Calendar Section */}
      {viewMode === 'grid' ? (
        <div className="calendar-grid-card glass-card">
          {/* Calendar Header Navigation */}
          <div className="calendar-nav-bar">
            <div className="month-year-display">
              <h3>{MONTH_NAMES[month]} {year}</h3>
              <span className="events-count-chip">{events.length} Events Scheduled</span>
            </div>

            <div className="nav-controls">
              <button className="btn btn-secondary btn-sm" onClick={handlePrevMonth}>◀ Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={handleToday}>Today</button>
              <button className="btn btn-secondary btn-sm" onClick={handleNextMonth}>Next ▶</button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="weekdays-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="weekday-col-header">{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="days-grid">
            {calendarCells.map((cell, idx) => {
              const dayStr = cell.date.toISOString().slice(0, 10);
              const isToday = dayStr === todayStr;
              const dayEvents = getEventsForDate(cell.date);

              return (
                <div
                  key={idx}
                  className={`day-cell ${!cell.isCurrentMonth ? 'outside-month' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => dayEvents.length > 0 && setSelectedDayEvents({ date: cell.date, events: dayEvents })}
                >
                  <div className="day-cell-top">
                    <span className={`day-number ${isToday ? 'today-pill' : ''}`}>{cell.dayNum}</span>
                    {dayEvents.length > 0 && (
                      <span className="event-dot-count">{dayEvents.length}</span>
                    )}
                  </div>

                  <div className="day-cell-events">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                      return (
                        <div
                          key={ev._id}
                          className="calendar-event-chip"
                          style={{ background: cfg.bg, color: cfg.color, borderLeft: `3px solid ${cfg.color}` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventModal(ev);
                          }}
                          title={ev.title}
                        >
                          <span className="chip-icon">{cfg.icon}</span>
                          <span className="chip-title">{ev.title}</span>
                        </div>
                      );
                    })}

                    {dayEvents.length > 2 && (
                      <span className="more-events-chip">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda List View */
        <div className="calendar-agenda-card glass-card">
          <div className="agenda-header">
            <h3>Upcoming Events Agenda ({events.length})</h3>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Chronological chronological overview of all placement activities</span>
          </div>

          <div className="agenda-list">
            {events.length === 0 ? (
              <div className="empty-agenda-state">
                <span>📅</span>
                <h4>No Events Found in this Category</h4>
                <p>Try switching filters or schedule a new event.</p>
              </div>
            ) : (
              events.map(ev => {
                const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                const startDate = new Date(ev.startDateTime);
                return (
                  <div
                    key={ev._id}
                    className="agenda-item"
                    style={{ borderLeft: `4px solid ${cfg.color}` }}
                    onClick={() => setSelectedEventModal(ev)}
                  >
                    <div className="agenda-date-box" style={{ background: cfg.bg, color: cfg.color }}>
                      <span className="agenda-month">{MONTH_NAMES[startDate.getMonth()].slice(0, 3)}</span>
                      <strong className="agenda-day">{startDate.getDate()}</strong>
                    </div>

                    <div className="agenda-info">
                      <div className="agenda-meta-row">
                        <span className="event-badge" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="agenda-time">
                          🕒 {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ev.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {ev.instructorOrCompany && (
                          <span className="agenda-host">🏢 {ev.instructorOrCompany}</span>
                        )}
                      </div>
                      <h4 className="agenda-title">{ev.title}</h4>
                      <p className="agenda-desc">{ev.description}</p>
                      <div className="agenda-venue">📍 {ev.venueOrLink}</div>
                    </div>

                    <div className="agenda-actions">
                      <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedEventModal(ev); }}>
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Selected Day Events Popup Modal */}
      {selectedDayEvents && (
        <div className="modal-backdrop" onClick={() => setSelectedDayEvents(null)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>Events for {selectedDayEvents.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
              <button className="close-btn" onClick={() => setSelectedDayEvents(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {selectedDayEvents.events.map(ev => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                  return (
                    <div
                      key={ev._id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${cfg.border}`,
                        borderLeft: `4px solid ${cfg.color}`,
                        borderRadius: '8px',
                        padding: '12px 14px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedDayEvents(null);
                        setSelectedEventModal(ev);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <strong style={{ color: '#fff', fontSize: '14px', display: 'block' }}>{ev.title}</strong>
                      <p style={{ margin: '4px 0 0', color: '#cbd5e1', fontSize: '12.5px' }}>{ev.description}</p>
                      <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#64748b' }}>📍 {ev.venueOrLink}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Single Event Detail Dossier Modal */}
      {selectedEventModal && (
        <div className="modal-backdrop" onClick={() => setSelectedEventModal(null)}>
          <div className="modal-content glass-card animate-fade" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            {(() => {
              const cfg = EVENT_TYPE_CONFIG[selectedEventModal.eventType] || EVENT_TYPE_CONFIG.training;
              return (
                <>
                  <div className="modal-header" style={{ borderBottom: `2px solid ${cfg.color}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{cfg.icon}</span>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {cfg.label}
                        </span>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>{selectedEventModal.title}</h3>
                      </div>
                    </div>
                    <button className="close-btn" onClick={() => setSelectedEventModal(null)}>&times;</button>
                  </div>

                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '8px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Start Date & Time</span>
                        <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>
                          {new Date(selectedEventModal.startDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>End Date & Time</span>
                        <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>
                          {new Date(selectedEventModal.endDateTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Host / Instructor</span>
                        <strong style={{ color: '#38bdf8', fontSize: '13px' }}>
                          {selectedEventModal.instructorOrCompany || 'GRIET Placement Cell'}
                        </strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Venue / Mode</span>
                        <strong style={{ color: '#34d399', fontSize: '13px' }}>
                          {selectedEventModal.venueOrLink}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ color: '#fff', margin: '0 0 6px', fontSize: '14px' }}>Event Description</h4>
                      <p style={{ color: '#cbd5e1', fontSize: '13.5px', lineHeight: '1.5', margin: 0 }}>
                        {selectedEventModal.description || 'No detailed instructions provided.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Target Audience:</span>
                      {(selectedEventModal.targetAudience?.roles || ['student', 'faculty', 'admin']).map(r => (
                        <span key={r} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'capitalize' }}>
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px' }}>
                    {(user?.role === 'admin' || user?.role === 'faculty') && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                        onClick={() => handleDeleteEvent(selectedEventModal._id)}
                      >
                        🗑️ Delete Event
                      </button>
                    )}
                    <button className="btn btn-secondary" onClick={() => setSelectedEventModal(null)}>
                      Close
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Create Event Modal for Faculty/Admin */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content glass-card animate-fade" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>➕ Schedule Placement & Academic Event</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateEvent} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px 24px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Event Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Amazon Campus Recruitment Drive"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Event Type *</label>
                  <select
                    className="form-control"
                    value={newEvent.eventType}
                    onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}
                  >
                    <option value="company_drive">🟣 Company Drive</option>
                    <option value="training">🟢 Training Session</option>
                    <option value="mock_interview">🔵 Mock Interview</option>
                    <option value="aptitude_test">🟠 Aptitude Test</option>
                    <option value="deadline">🔴 Strict Deadline</option>
                    <option value="workshop">🟡 Workshop</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Host / Company / Instructor</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Amazon India / Prof. Rao"
                    value={newEvent.instructorOrCompany}
                    onChange={e => setNewEvent({ ...newEvent, instructorOrCompany: e.target.value })}
                  />
                </div>
              </div>

              {/* Start & End Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Start Date & Time *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="date"
                      className="form-control"
                      value={newEvent.startDate}
                      onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                      required
                    />
                    <input
                      type="time"
                      className="form-control"
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>End Date & Time *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="date"
                      className="form-control"
                      value={newEvent.endDate}
                      onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                      required
                    />
                    <input
                      type="time"
                      className="form-control"
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Venue / Meeting Link *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Central Auditorium / Google Meet link"
                  value={newEvent.venueOrLink}
                  onChange={e => setNewEvent({ ...newEvent, venueOrLink: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Event Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Provide instructions, eligibility notes, or preparation links for candidates..."
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Scheduling...' : '🚀 Schedule Placement Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementCalendar;
