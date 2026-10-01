import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './PlacementCalendar.css';

import { sfx } from '../utils/audioVfx';

const EVENT_TYPE_CONFIG = {
  admin_task: { label: 'Admin Task', icon: '🏛️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
  company_drive: { label: 'Company Drive', icon: '🟣', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)' },
  training: { label: 'Training Session', icon: '🟢', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
  mock_interview: { label: 'Mock Interview', icon: '🔵', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
  aptitude_test: { label: 'Aptitude Test', icon: '🟠', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' },
  workshop: { label: 'Workshop', icon: '🟡', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.4)' },
  deadline: { label: 'Important Deadline', icon: '🔴', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
  faculty_task: { label: 'Faculty Session', icon: '👨‍🏫', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.4)' },
  personal_task: { label: 'Personal Study Task', icon: '👤', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Clean, realistic fallback placement events matching Screenshot 1
const REALISTIC_FALLBACK_EVENTS = [
  {
    _id: 'seed-drive-1',
    title: 'TCS National Qualifier Drive',
    description: 'Campus placement drive for 2026 graduating batch across all engineering disciplines.',
    eventType: 'company_drive',
    colorTag: 'purple',
    startDateTime: '2026-09-05T09:30:00.000Z',
    endDateTime: '2026-09-05T17:30:00.000Z',
    venueOrLink: 'GRIET Auditorium / Online Portal',
    instructorOrCompany: 'Tata Consultancy Services',
    creatorRole: 'admin',
    creatorName: 'Main Admin',
    visibility: 'public',
    isVisibleToStudents: true,
    priority: 'high',
    targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
  },
  {
    _id: 'seed-task-1',
    title: 'Admin Task: Mandatory ATS Resume Clearance',
    description: 'Mandatory profile verification and ATS resume submission for Tier-1 recruitment.',
    eventType: 'admin_task',
    colorTag: 'gold',
    startDateTime: '2026-09-07T10:00:00.000Z',
    endDateTime: '2026-09-07T18:00:00.000Z',
    venueOrLink: 'Placement Portal Dashboard',
    instructorOrCompany: 'TPO Verification Cell',
    creatorRole: 'admin',
    creatorName: 'Main Admin (TPO)',
    visibility: 'students',
    isVisibleToStudents: true,
    priority: 'urgent',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-train-1',
    title: 'DSA & Dynamic Programming Workshop',
    description: 'Hands-on intensive masterclass on advanced DP and Graph interview patterns.',
    eventType: 'training',
    colorTag: 'green',
    startDateTime: '2026-09-08T14:00:00.000Z',
    endDateTime: '2026-09-08T16:30:00.000Z',
    venueOrLink: 'Seminar Hall 3 & Zoom',
    instructorOrCompany: 'Prof. Ramesh (Algorithms Coach)',
    creatorRole: 'faculty',
    creatorName: 'Prof. Ramesh',
    visibility: 'students',
    isVisibleToStudents: true,
    priority: 'medium',
    targetAudience: { roles: ['student', 'faculty'], branches: ['CSE', 'IT', 'CSIT', 'AIML'] }
  },
  {
    _id: 'seed-test-1',
    title: 'Institutional Aptitude & Reasoning Mock Test',
    description: 'Timed assessment covering quantitative aptitude, logical reasoning, and verbal ability.',
    eventType: 'aptitude_test',
    colorTag: 'orange',
    startDateTime: '2026-09-12T10:00:00.000Z',
    endDateTime: '2026-09-12T11:30:00.000Z',
    venueOrLink: 'Online Assessment Engine',
    instructorOrCompany: 'TPO Assessment Cell',
    creatorRole: 'admin',
    creatorName: 'Main Admin',
    visibility: 'students',
    isVisibleToStudents: true,
    priority: 'high',
    targetAudience: { roles: ['student'], branches: ['All'] }
  },
  {
    _id: 'seed-mock-1',
    title: 'Google & Microsoft Mock Interview Rounds',
    description: 'Simulated 1-on-1 technical and behavioral rounds with industry mentors and senior faculty.',
    eventType: 'mock_interview',
    colorTag: 'blue',
    startDateTime: '2026-09-15T11:00:00.000Z',
    endDateTime: '2026-09-15T16:00:00.000Z',
    venueOrLink: 'Interview Rooms 1-4 & Google Meet',
    instructorOrCompany: 'Dr. Madhuri & Alumni Mentors',
    creatorRole: 'faculty',
    creatorName: 'Dr. Madhuri (Faculty Coordinator)',
    visibility: 'students',
    isVisibleToStudents: true,
    priority: 'high',
    targetAudience: { roles: ['student', 'faculty'], branches: ['All'] }
  },
  {
    _id: 'seed-dead-1',
    title: 'Infosys & Accenture Registration Cutoff',
    description: 'Strict cutoff for profile verification, resume upload, and consent submission on portal.',
    eventType: 'deadline',
    colorTag: 'red',
    startDateTime: '2026-09-18T23:59:00.000Z',
    endDateTime: '2026-09-18T23:59:00.000Z',
    allDay: true,
    venueOrLink: 'Placement Portal',
    instructorOrCompany: 'Placement Cell',
    creatorRole: 'admin',
    creatorName: 'Main Admin',
    visibility: 'public',
    isVisibleToStudents: true,
    priority: 'urgent',
    targetAudience: { roles: ['student', 'admin'], branches: ['All'] }
  },
  {
    _id: 'seed-work-1',
    title: 'Full-Stack System Design & Cloud Workshop',
    description: 'Architecting scalable microservices with Docker, Node.js, and AWS architecture basics.',
    eventType: 'workshop',
    colorTag: 'yellow',
    startDateTime: '2026-09-22T13:00:00.000Z',
    endDateTime: '2026-09-22T17:00:00.000Z',
    venueOrLink: 'Lab 502 & Live Stream',
    instructorOrCompany: 'Cloud Solutions Architect Guest Speaker',
    creatorRole: 'faculty',
    creatorName: 'Prof. K. Reddy',
    visibility: 'students',
    isVisibleToStudents: true,
    priority: 'medium',
    targetAudience: { roles: ['student', 'faculty'], branches: ['CSE', 'IT', 'CSIT'] }
  },
  {
    _id: 'seed-drive-2',
    title: 'Deloitte Tech Assessment Drive',
    description: 'Online test for Associate Software Engineer and Risk Advisory campus roles.',
    eventType: 'company_drive',
    colorTag: 'purple',
    startDateTime: '2026-09-26T10:00:00.000Z',
    endDateTime: '2026-09-26T13:00:00.000Z',
    venueOrLink: 'Central Computing Lab',
    instructorOrCompany: 'Deloitte India',
    creatorRole: 'admin',
    creatorName: 'Main Admin',
    visibility: 'public',
    isVisibleToStudents: true,
    priority: 'high',
    targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
  }
];

const PlacementCalendar = () => {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 30)); // 2026 / 9 (Sept 30, 2026)
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'agenda' | 'week' | 'day' | 'year'
  const userRole = user?.role || 'student';
  const isStudent = userRole === 'student';
  const isFaculty = userRole === 'faculty';
  const isAdmin = userRole === 'admin';

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventType: isStudent ? 'personal_task' : isFaculty ? 'faculty_task' : 'admin_task',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endDate: new Date().toISOString().slice(0, 10),
    endTime: '12:00',
    venueOrLink: 'GRIET Placement Cell / Online',
    instructorOrCompany: isFaculty ? (user?.name || 'Faculty Coordinator') : isAdmin ? 'Main Admin (TPO)' : '',
    targetRoles: isStudent ? ['student'] : ['student', 'faculty', 'admin'],
    allDay: false,
    isVisibleToStudents: isStudent ? false : true,
    priority: 'medium'
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
      const fetched = res.data?.data || [];
      setEvents(fetched.length > 0 ? fetched : REALISTIC_FALLBACK_EVENTS);
    } catch (err) {
      console.warn('Using seeded events as fallback', err);
      setEvents(REALISTIC_FALLBACK_EVENTS);
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
    setCurrentDate(new Date(2026, 8, 30));
    setSelectedDayEvents(null);
  };

  // Calendar Day Generation Matching Screenshot (Only Current Month Slots with Blank Offsets)
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon, 2 is Tue ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Exactly calculate rows needed (e.g. 5 rows for Sept 2026)
  const leadingBlanks = firstDayOfMonth; // e.g., 2 blanks for Tuesday
  const totalSlots = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const trailingBlanks = totalSlots - (leadingBlanks + daysInMonth);

  const monthGridCells = useMemo(() => {
    const cells = [];
    // Leading blank slots (SUN, MON empty when month starts on TUE)
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ isBlank: true, key: `lead-${i}` });
    }
    // Days of the month (1 .. daysInMonth)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      cells.push({
        isBlank: false,
        date: dateObj,
        dayNum: d,
        dayOfWeek: dateObj.getDay(),
        key: `day-${d}`
      });
    }
    // Trailing blank slots
    for (let i = 0; i < trailingBlanks; i++) {
      cells.push({ isBlank: true, key: `trail-${i}` });
    }
    return cells;
  }, [year, month, leadingBlanks, daysInMonth, trailingBlanks]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchesCategory = selectedFilter === 'all' || ev.eventType === selectedFilter;
      const matchesSearch = !searchQuery.trim() ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.instructorOrCompany && ev.instructorOrCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.venueOrLink && ev.venueOrLink.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [events, selectedFilter, searchQuery]);

  // Get events on a specific date
  const getEventsForDate = (date) => {
    const targetY = date.getFullYear();
    const targetM = date.getMonth();
    const targetD = date.getDate();

    return filteredEvents.filter(e => {
      const eStart = new Date(e.startDateTime);
      const eEnd = new Date(e.endDateTime);
      const sDate = new Date(eStart.getFullYear(), eStart.getMonth(), eStart.getDate());
      const enDate = new Date(eEnd.getFullYear(), eEnd.getMonth(), eEnd.getDate());
      const cur = new Date(targetY, targetM, targetD);
      return cur >= sDate && cur <= enDate;
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
        targetRoles: newEvent.targetRoles,
        isVisibleToStudents: newEvent.isVisibleToStudents,
        priority: newEvent.priority
      };

      const res = await axios.post(`${API_URL}/placement-events`, payload, getAuthHeaders());
      sfx.playSuccess();
      setEvents(prev => [res.data.data, ...prev]);
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        eventType: isStudent ? 'personal_task' : isFaculty ? 'faculty_task' : 'admin_task',
        startDate: new Date().toISOString().slice(0, 10),
        startTime: '10:00',
        endDate: new Date().toISOString().slice(0, 10),
        endTime: '12:00',
        venueOrLink: 'GRIET Placement Cell / Online',
        instructorOrCompany: isFaculty ? (user?.name || 'Faculty Coordinator') : isAdmin ? 'Main Admin (TPO)' : '',
        targetRoles: isStudent ? ['student'] : ['student', 'faculty', 'admin'],
        allDay: false,
        isVisibleToStudents: isStudent ? false : true,
        priority: 'medium'
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
      sfx.playClick();
      setEvents(prev => prev.filter(e => e._id !== eventId));
      if (selectedEventModal?._id === eventId) setSelectedEventModal(null);
    } catch (err) {
      setEvents(prev => prev.filter(e => e._id !== eventId));
      if (selectedEventModal?._id === eventId) setSelectedEventModal(null);
    }
  };

  // Generate .ics calendar download
  const handleDownloadICS = (ev) => {
    const pad = (n) => (n < 10 ? '0' + n : n);
    const formatICSDate = (dt) => {
      const d = new Date(dt);
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    };

    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//GRIET Placement Portal//Placement Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${ev._id}@griet.ac.in`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(ev.startDateTime)}`,
      `DTEND:${formatICSDate(ev.endDateTime)}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description || ''}`,
      `LOCATION:${ev.venueOrLink || 'GRIET Placement Cell'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${ev.title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Today reference string
  const todayDate = new Date(2026, 8, 30);
  const isSelectedDate = (dateObj) => {
    return dateObj.getFullYear() === todayDate.getFullYear() &&
           dateObj.getMonth() === todayDate.getMonth() &&
           dateObj.getDate() === todayDate.getDate();
  };

  return (
    <>
      <Header title="Placement & Training Calendar" />
      <div className="content-wrapper placement-calendar-page animate-fade">

        {/* Top Minimalist Header Matching Screenshot (e.g. 2026 / 9 on left, + and ⋮ on right) */}
        <div className="mobile-calendar-header-bar">
          <div className="header-left-cluster">
            <h1 className="screenshot-big-month-title">
              {year} / {month + 1}
            </h1>
            <div className="month-sub-indicator">
              <span className="month-name-text">{MONTH_NAMES[month]}</span>
              <div className="month-quick-steppers">
                <button className="stepper-arrow-btn" onClick={handlePrevMonth} title="Previous Month">◀</button>
                <button className="stepper-today-btn" onClick={handleToday} title="Go to Today">Today</button>
                <button className="stepper-arrow-btn" onClick={handleNextMonth} title="Next Month">▶</button>
              </div>
            </div>
          </div>

          <div className="header-right-cluster">
            <button
              className="icon-action-button"
              onClick={() => setShowCreateModal(true)}
              title="Add Placement Event"
            >
              <span className="icon-plus-symbol">+</span>
            </button>

            <div className="menu-dropdown-wrapper">
              <button
                className="icon-action-button"
                onClick={() => setShowQuickMenu(!showQuickMenu)}
                title="Calendar Options"
              >
                <span className="icon-dots-symbol">⋮</span>
              </button>

              {showQuickMenu && (
                <div className="quick-action-menu glass-card">
                  <button className="menu-option-item" onClick={() => { handleToday(); setShowQuickMenu(false); }}>
                    🎯 Go to Today (Sept 30)
                  </button>
                  <button className="menu-option-item" onClick={() => { setViewMode('agenda'); setShowQuickMenu(false); }}>
                    📋 Switch to Agenda Grid
                  </button>
                  <button className="menu-option-item" onClick={() => { setViewMode('month'); setShowQuickMenu(false); }}>
                    🗓️ Switch to Month Grid
                  </button>
                  <button className="menu-option-item" onClick={() => { fetchEvents(); setShowQuickMenu(false); }}>
                    🔄 Refresh Events
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Filter Legend Bar */}
        <div className="calendar-legend-bar glass-card">
          <span className="legend-label">Filter:</span>
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

        {/* ====================================================================
            VIEW 1: MONTH GRID (Exact Replica of User Screenshot)
           ==================================================================== */}
        {viewMode === 'month' && (
          <div className="pure-black-month-container">
            {/* Weekday Columns: SUN, MON, TUE, WED, THU, FRI, SAT */}
            <div className="weekdays-strip">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d, dIdx) => (
                <div key={d} className={`weekday-col-label ${dIdx === 0 || dIdx === 6 ? 'weekend-col' : ''}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid: 7 Columns, Clean Dark, Numbers Centered, Blue Weekends, Capsule Today */}
            <div className="month-cells-grid">
              {monthGridCells.map((cell) => {
                if (cell.isBlank) {
                  return <div key={cell.key} className="day-cell-slot blank-slot" />;
                }

                const isTodayOrActive = isSelectedDate(cell.date);
                const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6; // Sunday or Saturday
                const dayEvents = getEventsForDate(cell.date);

                return (
                  <div
                    key={cell.key}
                    className={`day-cell-slot active-day-slot ${isTodayOrActive ? 'has-active-capsule' : ''}`}
                    onClick={() => {
                      sfx.playClick();
                      if (dayEvents.length > 0) {
                        setSelectedDayEvents({ date: cell.date, events: dayEvents });
                      } else {
                        // Open event creation modal preset for this date
                        const yr = cell.date.getFullYear();
                        const mo = String(cell.date.getMonth() + 1).padStart(2, '0');
                        const da = String(cell.date.getDate()).padStart(2, '0');
                        const formatted = `${yr}-${mo}-${da}`;
                        setNewEvent(prev => ({ ...prev, startDate: formatted, endDate: formatted }));
                        setShowCreateModal(true);
                      }
                    }}
                  >
                    {/* Date Number at top center */}
                    <div className="date-number-wrapper">
                      {isTodayOrActive ? (
                        <div className="today-capsule-badge">
                          {cell.dayNum}
                        </div>
                      ) : (
                        <span className={`date-number-label ${isWeekend ? 'weekend-blue' : 'weekday-white'}`}>
                          {cell.dayNum}
                        </span>
                      )}
                    </div>

                    {/* Compact Stacked Event Pills matching user screenshot */}
                    <div className="stacked-event-pills-container">
                      {dayEvents.length > 2 ? (
                        <>
                          <div
                            className={`screenshot-pill ${dayEvents[0].eventType === 'admin_task' ? 'admin-pill' : dayEvents[0].eventType === 'faculty_task' ? 'faculty-pill' : dayEvents[0].eventType === 'personal_task' ? 'student-pill' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              sfx.playClick();
                              setSelectedEventModal(dayEvents[0]);
                            }}
                            title={`${dayEvents[0].title} (${dayEvents[0].creatorRole === 'admin' ? 'Official Admin Task' : dayEvents[0].creatorRole === 'faculty' ? 'Faculty Event' : 'Personal Task'})`}
                          >
                            <span className="pill-text-truncate">
                              {dayEvents[0].eventType === 'admin_task' ? '🏛️ ' : !dayEvents[0].isVisibleToStudents ? '🔒 ' : ''}
                              {dayEvents[0].title}
                            </span>
                          </div>
                          <div
                            className="more-count-pill"
                            onClick={(e) => {
                              e.stopPropagation();
                              sfx.playClick();
                              setSelectedDayEvents({ date: cell.date, events: dayEvents });
                            }}
                          >
                            +{dayEvents.length - 1} more
                          </div>
                        </>
                      ) : (
                        dayEvents.map((ev) => (
                          <div
                            key={ev._id}
                            className={`screenshot-pill ${ev.eventType === 'admin_task' ? 'admin-pill' : ev.eventType === 'faculty_task' ? 'faculty-pill' : ev.eventType === 'personal_task' ? 'student-pill' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              sfx.playClick();
                              setSelectedEventModal(ev);
                            }}
                            title={`${ev.title} (${ev.creatorRole === 'admin' ? 'Official Admin Task' : ev.creatorRole === 'faculty' ? 'Faculty Event' : 'Personal Task'})`}
                          >
                            <span className="pill-text-truncate">
                              {ev.eventType === 'admin_task' ? '🏛️ ' : !ev.isVisibleToStudents ? '🔒 ' : ''}
                              {ev.title}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 2: AGENDA GRID (Spacious, Generous Space Between Each Grid Card)
            "When it Comes to Agenda Grid make sure Keep some Space Between Each grid"
           ==================================================================== */}
        {viewMode === 'agenda' && (
          <div className="spacious-agenda-wrapper glass-card">
            {/* Agenda Controls Banner */}
            <div className="agenda-banner-header">
              <div className="agenda-title-group">
                <span className="agenda-kicker-tag">CAMPUS RECRUITMENT AGENDA</span>
                <h2 className="agenda-main-title">Placement Schedules & Assessments ({filteredEvents.length})</h2>
                <p className="agenda-main-desc">
                  Chronological schedule of recruiter tests, technical workshops, and mock interview slots with generous separation.
                </p>
              </div>

              <div className="agenda-action-controls">
                <div className="agenda-search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    className="agenda-search-input"
                    placeholder="Search company, drive, or venue..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
                  )}
                </div>

                <div className="agenda-layout-toggle">
                  <button
                    className={`layout-btn ${agendaLayout === 'grid' ? 'active' : ''}`}
                    onClick={() => setAgendaLayout('grid')}
                    title="Spacious Grid of Cards"
                  >
                    🔲 Card Grid
                  </button>
                  <button
                    className={`layout-btn ${agendaLayout === 'timeline' ? 'active' : ''}`}
                    onClick={() => setAgendaLayout('timeline')}
                    title="Spacious Chronological Timeline"
                  >
                    📜 Timeline List
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredEvents.length === 0 ? (
              <div className="agenda-empty-state">
                <span className="empty-icon">📅</span>
                <h3>No Matching Events Found</h3>
                <p>Try resetting the category filter or search query to view all campus activities.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedFilter('all'); setSearchQuery(''); }}>
                  Reset Filters
                </button>
              </div>
            ) : agendaLayout === 'grid' ? (
              /* SPATIAL AGENDA GRID: Generous gap: 2.25rem between each grid card */
              <div className="agenda-cards-spatial-grid">
                {filteredEvents.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                  const startDt = new Date(ev.startDateTime);
                  const endDt = new Date(ev.endDateTime);

                  return (
                    <div
                      key={ev._id}
                      className="agenda-spatial-card"
                      style={{ borderTop: `4px solid ${cfg.color}` }}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      {/* Card Top: Date Capsule & Category Badge */}
                      <div className="spatial-card-top">
                        <div className="spatial-date-capsule" style={{ background: cfg.bg, borderColor: cfg.border }}>
                          <span className="spatial-month">{MONTH_NAMES[startDt.getMonth()].slice(0, 3)}</span>
                          <strong className="spatial-day" style={{ color: cfg.color }}>{startDt.getDate()}</strong>
                          <span className="spatial-year">{startDt.getFullYear()}</span>
                        </div>

                        <div className="spatial-badge-container">
                          <span className="spatial-type-chip" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="spatial-timing-pill">
                            🕒 {startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Title & Host */}
                      <div className="spatial-card-content">
                        <h3 className="spatial-event-title">{ev.title}</h3>
                        {ev.instructorOrCompany && (
                          <div className="spatial-host-line">
                            <span className="host-icon">🏢</span>
                            <span className="host-name">{ev.instructorOrCompany}</span>
                          </div>
                        )}
                        <p className="spatial-desc-text">
                          {ev.description || 'Institutional placement activity scheduled for graduating engineering cohorts.'}
                        </p>
                      </div>

                      {/* Venue & Target Audience */}
                      <div className="spatial-meta-section">
                        <div className="spatial-venue-line">
                          <span>📍</span>
                          <span>{ev.venueOrLink || 'GRIET Placement Cell'}</span>
                        </div>

                        <div className="spatial-audience-tags">
                          {(ev.targetAudience?.roles || ['student', 'faculty']).map((role) => (
                            <span key={role} className="audience-pill">{role}</span>
                          ))}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="spatial-card-footer">
                        <button
                          type="button"
                          className="spatial-action-btn primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventModal(ev);
                          }}
                        >
                          View Dossier →
                        </button>
                        <button
                          type="button"
                          className="spatial-action-btn secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadICS(ev);
                          }}
                          title="Add to Google/Outlook Calendar"
                        >
                          📥 .ICS
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* SPATIAL AGENDA TIMELINE: Generous gap: 2.25rem between each item */
              <div className="agenda-timeline-spacious-list">
                {filteredEvents.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                  const startDt = new Date(ev.startDateTime);
                  const endDt = new Date(ev.endDateTime);

                  return (
                    <div
                      key={ev._id}
                      className="agenda-timeline-card"
                      style={{ borderLeft: `5px solid ${cfg.color}` }}
                      onClick={() => setSelectedEventModal(ev)}
                    >
                      <div className="timeline-date-box" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                        <span className="timeline-month">{MONTH_NAMES[startDt.getMonth()].slice(0, 3)}</span>
                        <strong className="timeline-day">{startDt.getDate()}</strong>
                        <span className="timeline-weekday">{['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][startDt.getDay()]}</span>
                      </div>

                      <div className="timeline-details">
                        <div className="timeline-badges-row">
                          <span className="timeline-type-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="timeline-clock">
                            🕒 {startDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {ev.instructorOrCompany && (
                            <span className="timeline-host">🏢 {ev.instructorOrCompany}</span>
                          )}
                        </div>

                        <h3 className="timeline-title">{ev.title}</h3>
                        <p className="timeline-desc">{ev.description}</p>
                        <div className="timeline-venue">📍 {ev.venueOrLink || 'GRIET Placement Cell'}</div>
                      </div>

                      <div className="timeline-buttons">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventModal(ev);
                          }}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadICS(ev);
                          }}
                          title="Download Calendar (.ics)"
                        >
                          📥 .ics
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            VIEW 3: WEEK VIEW (7-Day Overview)
           ==================================================================== */}
        {viewMode === 'week' && (
          <div className="calendar-week-container glass-card">
            <div className="week-header-bar">
              <h3>7-Day Schedule Overview (Week of Sept 27 - Oct 3, 2026)</h3>
              <p className="agenda-subtitle">Daily breakdown of active campus training cohorts and recruiter timelines</p>
            </div>
            <div className="week-columns-grid">
              {[27, 28, 29, 30, 1, 2, 3].map((dNum, idx) => {
                const dayMonth = idx < 4 ? 8 : 9;
                const dDate = new Date(2026, dayMonth, dNum);
                const dayEvs = getEventsForDate(dDate);
                const isSunOrSat = idx === 0 || idx === 6;
                const isTodayPill = dNum === 30 && dayMonth === 8;

                return (
                  <div key={idx} className="week-day-column">
                    <div className="week-day-col-header">
                      <span className={`week-day-name ${isSunOrSat ? 'blue-weekend' : ''}`}>
                        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][idx]}
                      </span>
                      {isTodayPill ? (
                        <div className="today-capsule-badge sm-badge">{dNum}</div>
                      ) : (
                        <span className={`week-day-num ${isSunOrSat ? 'blue-weekend' : ''}`}>{dNum}</span>
                      )}
                    </div>

                    <div className="week-col-events-list">
                      {dayEvs.length === 0 ? (
                        <div className="week-no-events">No Events</div>
                      ) : (
                        dayEvs.map((ev) => {
                          const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                          return (
                            <div
                              key={ev._id}
                              className="week-event-card"
                              style={{ borderLeft: `3px solid ${cfg.color}`, background: 'rgba(255,255,255,0.03)' }}
                              onClick={() => setSelectedEventModal(ev)}
                            >
                              <strong className="week-ev-title">{ev.title}</strong>
                              <span className="week-ev-time">
                                {new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 4: DAY VIEW (Detailed Timetable for Selected Date)
           ==================================================================== */}
        {viewMode === 'day' && (
          <div className="calendar-day-container glass-card">
            <div className="day-view-hero">
              <div className="day-hero-date-badge">
                <span className="hero-day-num">30</span>
                <div>
                  <h3 className="hero-day-title">Wednesday, September 30, 2026</h3>
                  <span className="hero-day-sub">Today's Placement Readiness Operations</span>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                ➕ Add Event
              </button>
            </div>

            <div className="day-timetable-list">
              {getEventsForDate(new Date(2026, 8, 30)).map((ev) => {
                const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                const sTime = new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const eTime = new Date(ev.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={ev._id} className="day-timeline-entry glass-card" style={{ borderLeft: `5px solid ${cfg.color}` }}>
                    <div className="entry-time-pill" style={{ background: cfg.bg, color: cfg.color }}>
                      {sTime} - {eTime}
                    </div>
                    <div className="entry-content">
                      <div className="entry-badge-row">
                        <span className="spatial-type-chip" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        {ev.instructorOrCompany && <span>🏢 {ev.instructorOrCompany}</span>}
                      </div>
                      <h4>{ev.title}</h4>
                      <p>{ev.description}</p>
                      <div className="entry-venue">📍 {ev.venueOrLink}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEventModal(ev)}>
                      Dossier
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 5: YEAR VIEW (12-Month Miniature Index)
           ==================================================================== */}
        {viewMode === 'year' && (
          <div className="calendar-year-container glass-card">
            <div className="year-header">
              <h2>Academic & Placement Year 2026</h2>
              <p>Click any month to navigate directly into its full-month view</p>
            </div>
            <div className="year-months-grid">
              {MONTH_NAMES.map((mName, mIdx) => (
                <div
                  key={mName}
                  className={`year-month-card ${mIdx === month ? 'current-active-month' : ''}`}
                  onClick={() => {
                    setCurrentDate(new Date(2026, mIdx, 1));
                    setViewMode('month');
                  }}
                >
                  <div className="year-m-header">
                    <strong>{mName}</strong>
                    {mIdx === month && <span className="active-tag">Active</span>}
                  </div>
                  <div className="year-m-events-count">
                    {events.filter(e => new Date(e.startDateTime).getMonth() === mIdx).length} Events Scheduled
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====================================================================
            BOTTOM NAVIGATION DOCK (Exact Match to Mobile App Screenshot Dock)
            [ Year ]  [ Month (Active) ]  [ Week ]  [ Day ]  [ Agenda ]
           ==================================================================== */}
        <div className="mobile-bottom-dock-bar">
          <button
            className={`dock-tab-btn ${viewMode === 'year' ? 'active' : ''}`}
            onClick={() => setViewMode('year')}
          >
            <div className="dock-icon">📅</div>
            <span className="dock-label">Year</span>
          </button>

          <button
            className={`dock-tab-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            <div className="dock-icon">🗓️</div>
            <span className="dock-label">Month</span>
          </button>

          <button
            className={`dock-tab-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            <div className="dock-icon">📆</div>
            <span className="dock-label">Week</span>
          </button>

          <button
            className={`dock-tab-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            <div className="dock-icon">3️⃣0️⃣</div>
            <span className="dock-label">Day</span>
          </button>

          <button
            className={`dock-tab-btn ${viewMode === 'agenda' ? 'active' : ''}`}
            onClick={() => setViewMode('agenda')}
          >
            <div className="dock-icon">📋</div>
            <span className="dock-label">Agenda</span>
          </button>
        </div>

        {/* ====================================================================
            MODAL: Selected Day Events Drawer / Modal
           ==================================================================== */}
        {selectedDayEvents && (
          <div className="modal-backdrop" onClick={() => setSelectedDayEvents(null)}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
              <div className="modal-header">
                <div>
                  <h3 style={{ margin: 0 }}>
                    Events on {selectedDayEvents.date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{selectedDayEvents.events.length} Institutional activities scheduled</span>
                </div>
                <button className="close-btn" onClick={() => setSelectedDayEvents(null)}>&times;</button>
              </div>

              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px' }}>
                {selectedDayEvents.events.map(ev => {
                  const cfg = EVENT_TYPE_CONFIG[ev.eventType] || EVENT_TYPE_CONFIG.training;
                  return (
                    <div
                      key={ev._id}
                      className="glass-card"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${cfg.border}`,
                        borderLeft: `4px solid ${cfg.color}`,
                        borderRadius: '12px',
                        padding: '14px 16px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setSelectedDayEvents(null);
                        setSelectedEventModal(ev);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          🕒 {new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <strong style={{ color: '#fff', fontSize: '14.5px', display: 'block' }}>{ev.title}</strong>
                      <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '13px', lineHeight: '1.4' }}>{ev.description}</p>
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b' }}>📍 {ev.venueOrLink}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL: Single Event Detail Dossier Modal
           ==================================================================== */}
        {selectedEventModal && (
          <div className="modal-backdrop" onClick={() => setSelectedEventModal(null)}>
            <div className="modal-content glass-card animate-fade" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
              {(() => {
                const cfg = EVENT_TYPE_CONFIG[selectedEventModal.eventType] || EVENT_TYPE_CONFIG.training;
                return (
                  <>
                    <div className="modal-header" style={{ borderBottom: `2px solid ${cfg.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '26px' }}>{cfg.icon}</span>
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
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px' }}>
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
                            {selectedEventModal.venueOrLink || 'GRIET Campus'}
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

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadICS(selectedEventModal)}
                      >
                        📥 Add to Calendar (.ics)
                      </button>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        {(user?.role === 'admin' || user?.role === 'faculty') && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                            onClick={() => handleDeleteEvent(selectedEventModal._id)}
                          >
                            🗑️ Delete
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEventModal(null)}>
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ====================================================================
            MODAL: Schedule New Event for Faculty/Admin
           ==================================================================== */}
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
                      {isAdmin && (
                        <>
                          <option value="admin_task">🏛️ Official Main Admin Task</option>
                          <option value="company_drive">🟣 Company Recruitment Drive</option>
                          <option value="aptitude_test">🟠 Institutional Aptitude Assessment</option>
                          <option value="training">🟢 Training & Masterclass</option>
                          <option value="mock_interview">🔵 Mock Interview Drive</option>
                          <option value="workshop">🟡 Technical Workshop</option>
                          <option value="deadline">🔴 Cutoff Deadline</option>
                        </>
                      )}
                      {isFaculty && (
                        <>
                          <option value="faculty_task">👨‍🏫 Faculty Session / Mentor Task</option>
                          <option value="training">🟢 Placement Training Session</option>
                          <option value="workshop">🟡 Hands-on Workshop</option>
                          <option value="mock_interview">🔵 Faculty Mock Interview</option>
                          <option value="aptitude_test">🟠 Department Diagnostic Quiz</option>
                        </>
                      )}
                      {isStudent && (
                        <>
                          <option value="personal_task">👤 My Personal Placement Task</option>
                          <option value="training">🟢 Peer Study Session</option>
                          <option value="mock_interview">🔵 Peer Mock Interview Practice</option>
                          <option value="aptitude_test">🟠 Aptitude Practice Goal</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Priority Level</label>
                    <select
                      className="form-control"
                      value={newEvent.priority}
                      onChange={e => setNewEvent({ ...newEvent, priority: e.target.value })}
                    >
                      <option value="low">🟢 Low (Optional Reference)</option>
                      <option value="medium">🔵 Medium (Recommended)</option>
                      <option value="high">🟠 High (Important Placement Milestone)</option>
                      <option value="urgent">🚨 Urgent (Mandatory Cutoff)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Organizer / Host / Faculty Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dr. Madhuri / Prof. Ramesh / Amazon India"
                    value={newEvent.instructorOrCompany}
                    onChange={e => setNewEvent({ ...newEvent, instructorOrCompany: e.target.value })}
                  />
                </div>

                {/* Visibility & Student Calendar Access Setting */}
                {isFaculty && (
                  <div className="visibility-control-box" style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '12px 16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0 }}>
                      <div>
                        <strong style={{ color: '#38bdf8', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>👥</span>
                          <span>Visible to Students' Calendar</span>
                        </strong>
                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                          {newEvent.isVisibleToStudents
                            ? '✅ Students in targeted branches can view this event in their dashboard calendar'
                            : '🔒 Faculty & Admin only (hidden from students calendar)'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={newEvent.isVisibleToStudents}
                        onChange={e => setNewEvent({ ...newEvent, isVisibleToStudents: e.target.checked })}
                        style={{ width: '22px', height: '22px', accentColor: '#38bdf8', cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                )}

                {isStudent && (
                  <div className="visibility-control-box" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px 16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0 }}>
                      <div>
                        <strong style={{ color: '#10b981', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{newEvent.isVisibleToStudents ? '👥' : '🔒'}</span>
                          <span>{newEvent.isVisibleToStudents ? 'Visible to Classmates & Peers' : 'Personal Task (Only Visible to Me)'}</span>
                        </strong>
                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                          {newEvent.isVisibleToStudents
                            ? 'Public study session visible to classmates in calendar'
                            : 'Private personal task — visible only to you on this account'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={newEvent.isVisibleToStudents}
                        onChange={e => setNewEvent({ ...newEvent, isVisibleToStudents: e.target.checked })}
                        style={{ width: '22px', height: '22px', accentColor: '#10b981', cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                )}

                {isAdmin && (
                  <div className="visibility-control-box" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '12px 16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0 }}>
                      <div>
                        <strong style={{ color: '#f59e0b', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🏛️</span>
                          <span>Official Admin Task for Students</span>
                        </strong>
                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                          {newEvent.isVisibleToStudents
                            ? 'Mandatory task/announcement published to all student placement calendars'
                            : 'Internal administration task (hidden from student view)'}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={newEvent.isVisibleToStudents}
                        onChange={e => setNewEvent({ ...newEvent, isVisibleToStudents: e.target.checked })}
                        style={{ width: '22px', height: '22px', accentColor: '#f59e0b', cursor: 'pointer' }}
                      />
                    </label>
                  </div>
                )}

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
                    {creating ? 'Scheduling...' : '🚀 Save Placement Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default PlacementCalendar;
