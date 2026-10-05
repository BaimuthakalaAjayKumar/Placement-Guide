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

// Dynamic, realistic fallback placement events anchoring around today's live date
const generateRealisticEvents = () => {
  const now = new Date();
  const yr = now.getFullYear();
  const mo = now.getMonth();
  const day = now.getDate();

  return [
    {
      _id: 'seed-task-today',
      title: 'TPO Placement Cell: ATS Profile & Resume Clearance',
      description: 'Mandatory profile verification and ATS resume submission for upcoming tier-1 recruitment drives.',
      eventType: 'admin_task',
      colorTag: 'gold',
      startDateTime: new Date(yr, mo, day, 10, 0).toISOString(),
      endDateTime: new Date(yr, mo, day, 18, 0).toISOString(),
      venueOrLink: 'Placement Portal Dashboard',
      instructorOrCompany: 'Main Admin (TPO Cell)',
      creatorRole: 'admin',
      creatorName: 'Main Admin (TPO)',
      visibility: 'public',
      isVisibleToStudents: true,
      priority: 'urgent',
      targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
    },
    {
      _id: 'seed-drive-1',
      title: 'TCS National Qualifier Campus Drive',
      description: 'Campus placement drive for 2026 graduating batch across all engineering disciplines.',
      eventType: 'company_drive',
      colorTag: 'purple',
      startDateTime: new Date(yr, mo, day + 2, 9, 30).toISOString(),
      endDateTime: new Date(yr, mo, day + 2, 17, 30).toISOString(),
      venueOrLink: 'Campus Bridge Auditorium / Online Portal',
      instructorOrCompany: 'Tata Consultancy Services',
      creatorRole: 'admin',
      creatorName: 'Main Admin',
      visibility: 'public',
      isVisibleToStudents: true,
      priority: 'high',
      targetAudience: { roles: ['student', 'faculty', 'admin'], branches: ['All'] }
    },
    {
      _id: 'seed-train-1',
      title: 'DSA & Dynamic Programming Masterclass',
      description: 'Hands-on intensive masterclass on advanced DP and Graph interview patterns with senior algorithms coach.',
      eventType: 'training',
      colorTag: 'green',
      startDateTime: new Date(yr, mo, day + 4, 14, 0).toISOString(),
      endDateTime: new Date(yr, mo, day + 4, 16, 30).toISOString(),
      venueOrLink: 'Seminar Hall 3 & Zoom',
      instructorOrCompany: 'Prof. Ramesh (Algorithms Coach)',
      creatorRole: 'faculty',
      creatorName: 'Prof. Ramesh (Faculty Coordinator)',
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
      startDateTime: new Date(yr, mo, day + 6, 10, 0).toISOString(),
      endDateTime: new Date(yr, mo, day + 6, 11, 30).toISOString(),
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
      startDateTime: new Date(yr, mo, day + 8, 11, 0).toISOString(),
      endDateTime: new Date(yr, mo, day + 8, 16, 0).toISOString(),
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
      startDateTime: new Date(yr, mo, day + 11, 23, 59).toISOString(),
      endDateTime: new Date(yr, mo, day + 11, 23, 59).toISOString(),
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
      startDateTime: new Date(yr, mo, day + 14, 13, 0).toISOString(),
      endDateTime: new Date(yr, mo, day + 14, 17, 0).toISOString(),
      venueOrLink: 'Lab 502 & Live Stream',
      instructorOrCompany: 'Cloud Solutions Architect Guest Speaker',
      creatorRole: 'faculty',
      creatorName: 'Prof. K. Reddy (Faculty)',
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
      startDateTime: new Date(yr, mo, day + 18, 10, 0).toISOString(),
      endDateTime: new Date(yr, mo, day + 18, 13, 0).toISOString(),
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
};

const PlacementCalendar = () => {
  const { user, token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date()); // Live real-time current date
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [creatorScopeFilter, setCreatorScopeFilter] = useState('all'); // 'all' | 'admin' | 'faculty' | 'personal' | 'pinned'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [selectedEventModal, setSelectedEventModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'agenda' | 'week' | 'day' | 'year'
  const [agendaLayout, setAgendaLayout] = useState('grid'); // 'grid' | 'timeline'
  const [notificationToast, setNotificationToast] = useState('');

  const userRole = user?.role || 'student';
  const isStudent = userRole === 'student';
  const isFaculty = userRole === 'faculty';
  const isAdmin = userRole === 'admin';
  const userId = user?._id || user?.id || 'guest';

  // Pinned Everyday Schedule State (persisted per user)
  const storageKeyPinned = `pinned_calendar_events_${userId}`;
  const [pinnedIds, setPinnedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKeyPinned);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Daily Tasks Completion State (persisted per user for today)
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const storageKeyCompleted = `daily_completed_tasks_${userId}_${todayDateStr}`;
  const [completedTaskIds, setCompletedTaskIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKeyCompleted);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Toggle Pin on an event
  const togglePinEvent = (eventId, e) => {
    if (e) e.stopPropagation();
    sfx.playClick();
    setPinnedIds(prev => {
      const isPinned = prev.includes(eventId);
      const next = isPinned ? prev.filter(id => id !== eventId) : [...prev, eventId];
      try {
        localStorage.setItem(storageKeyPinned, JSON.stringify(next));
      } catch {}
      setNotificationToast(isPinned ? '📍 Unpinned from Everyday Schedule' : '📌 Pinned to Everyday Schedule!');
      setTimeout(() => setNotificationToast(''), 3000);
      return next;
    });
  };

  // Toggle task complete for today
  const toggleTaskCompleted = (taskId, e) => {
    if (e) e.stopPropagation();
    setCompletedTaskIds(prev => {
      const isDone = prev.includes(taskId);
      const next = isDone ? prev.filter(id => id !== taskId) : [...prev, taskId];
      if (!isDone) {
        sfx.playSuccess();
      } else {
        sfx.playClick();
      }
      try {
        localStorage.setItem(storageKeyCompleted, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Trigger browser & in-app notification reminder for everyday tasks
  const triggerEverydayTasksNotification = () => {
    sfx.playSuccess();
    const count = todayPinnedOrScheduled.length;
    const title = 'Placement Calendar — Everyday Tasks Reminder';
    const body = count > 0
      ? `You have ${count} placement task(s) and milestone(s) on your daily schedule today!`
      : 'Your daily placement schedule is clean! Check out upcoming drives and training workshops.';

    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
          }
        });
      }
    }

    setNotificationToast(`🔔 Everyday Tasks Alert: You have ${count} task(s) on your schedule today!`);
    setTimeout(() => setNotificationToast(''), 4500);
  };

  // New Event Form State with Audience Scope
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    audienceScope: isStudent ? 'personal' : 'students', // 'personal' | 'students'
    isForPersonal: isStudent ? true : false,
    eventType: isStudent ? 'personal_task' : isFaculty ? 'faculty_task' : 'company_drive',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endDate: new Date().toISOString().slice(0, 10),
    endTime: '12:00',
    venueOrLink: isStudent ? 'Personal Desk / Online' : 'Campus Bridge Placement Cell / Online',
    instructorOrCompany: isFaculty ? (user?.name || 'Faculty Coordinator') : isAdmin ? 'Main Admin (TPO)' : (user?.name || 'Self'),
    targetRoles: isStudent ? ['student'] : ['student', 'faculty', 'admin'],
    targetBranches: ['All'],
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
      setEvents(fetched.length > 0 ? fetched : generateRealisticEvents());
    } catch (err) {
      console.warn('Using seeded events as fallback', err);
      setEvents(generateRealisticEvents());
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

  // Calendar Day Generation Matching Screenshot (Only Current Month Slots with Blank Offsets)
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon, 2 is Tue ...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Exactly calculate rows needed
  const leadingBlanks = firstDayOfMonth;
  const totalSlots = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const trailingBlanks = totalSlots - (leadingBlanks + daysInMonth);

  const monthGridCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < leadingBlanks; i++) {
      cells.push({ isBlank: true, key: `lead-${i}` });
    }
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
    for (let i = 0; i < trailingBlanks; i++) {
      cells.push({ isBlank: true, key: `trail-${i}` });
    }
    return cells;
  }, [year, month, leadingBlanks, daysInMonth, trailingBlanks]);

  // Dynamic 7-day Week Generation
  const activeWeekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Filtered Events with Category, Scope (Admin, Faculty, Personal, Pinned), and Search
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      const matchesCategory = selectedFilter === 'all' || ev.eventType === selectedFilter;

      let matchesScope = true;
      if (creatorScopeFilter === 'admin') {
        matchesScope = ev.creatorRole === 'admin';
      } else if (creatorScopeFilter === 'faculty') {
        matchesScope = ev.creatorRole === 'faculty';
      } else if (creatorScopeFilter === 'personal') {
        matchesScope = String(ev.createdBy) === String(userId) || ev.creatorRole === 'student' || ev.eventType === 'personal_task';
      } else if (creatorScopeFilter === 'pinned') {
        matchesScope = pinnedIds.includes(ev._id);
      }

      const matchesSearch = !searchQuery.trim() ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.instructorOrCompany && ev.instructorOrCompany.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.venueOrLink && ev.venueOrLink.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesScope && matchesSearch;
    });
  }, [events, selectedFilter, creatorScopeFilter, searchQuery, pinnedIds, userId]);

  // Today's Scheduled or Pinned Tasks for the Everyday Schedule Panel
  const todayPinnedOrScheduled = useMemo(() => {
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    return events.filter(ev => {
      const isPinned = pinnedIds.includes(ev._id);
      const startDt = new Date(ev.startDateTime);
      const isToday = startDt.getFullYear() === todayY &&
                      startDt.getMonth() === todayM &&
                      startDt.getDate() === todayD;
      return isPinned || isToday;
    });
  }, [events, pinnedIds]);

  const completedTodayCount = useMemo(() => {
    return todayPinnedOrScheduled.filter(e => completedTaskIds.includes(e._id)).length;
  }, [todayPinnedOrScheduled, completedTaskIds]);

  const dailyProgressPercent = useMemo(() => {
    if (todayPinnedOrScheduled.length === 0) return 0;
    return Math.round((completedTodayCount / todayPinnedOrScheduled.length) * 100);
  }, [completedTodayCount, todayPinnedOrScheduled]);

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
      const isPersonal = newEvent.audienceScope === 'personal';

      const payload = {
        title: newEvent.title.trim(),
        description: newEvent.description.trim(),
        eventType: newEvent.eventType,
        audienceScope: newEvent.audienceScope,
        isForPersonal: isPersonal,
        startDateTime,
        endDateTime,
        venueOrLink: newEvent.venueOrLink.trim(),
        instructorOrCompany: newEvent.instructorOrCompany.trim(),
        allDay: newEvent.allDay,
        targetRoles: isPersonal ? [userRole] : newEvent.targetRoles,
        targetBranches: newEvent.targetBranches || ['All'],
        isVisibleToStudents: isPersonal ? false : newEvent.isVisibleToStudents,
        priority: newEvent.priority
      };

      const res = await axios.post(`${API_URL}/placement-events`, payload, getAuthHeaders());
      sfx.playSuccess();
      const created = res.data.data;
      setEvents(prev => [created, ...prev]);
      setShowCreateModal(false);

      // Auto pin personal tasks to everyday schedule
      if (isPersonal && created?._id) {
        togglePinEvent(created._id);
      }

      setNotificationToast(`✅ Event "${created.title}" successfully scheduled!`);
      setTimeout(() => setNotificationToast(''), 3500);

      setNewEvent({
        title: '',
        description: '',
        audienceScope: isStudent ? 'personal' : 'students',
        isForPersonal: isStudent ? true : false,
        eventType: isStudent ? 'personal_task' : isFaculty ? 'faculty_task' : 'company_drive',
        startDate: new Date().toISOString().slice(0, 10),
        startTime: '10:00',
        endDate: new Date().toISOString().slice(0, 10),
        endTime: '12:00',
        venueOrLink: isStudent ? 'Personal Desk / Online' : 'Campus Bridge Placement Cell / Online',
        instructorOrCompany: isFaculty ? (user?.name || 'Faculty Coordinator') : isAdmin ? 'Main Admin (TPO)' : (user?.name || 'Self'),
        targetRoles: isStudent ? ['student'] : ['student', 'faculty', 'admin'],
        targetBranches: ['All'],
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
      'PRODID:-//Campus Bridge//Placement Calendar//EN',
      'BEGIN:VEVENT',
      `UID:${ev._id}@campusbridge.edu`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(ev.startDateTime)}`,
      `DTEND:${formatICSDate(ev.endDateTime)}`,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.description || ''}`,
      `LOCATION:${ev.venueOrLink || 'Campus Bridge Placement Cell'}`,
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
  const todayDate = useMemo(() => new Date(), []);
  const isSelectedDate = (dateObj) => {
    return dateObj.getFullYear() === todayDate.getFullYear() &&
           dateObj.getMonth() === todayDate.getMonth() &&
           dateObj.getDate() === todayDate.getDate();
  };

  const todayFormattedDate = useMemo(() => {
    return todayDate.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [todayDate]);

  return (
    <>
      <Header title="Placement & Training Calendar" />
      <div className="content-wrapper placement-calendar-page animate-fade">

        {/* Notification Toast Alert Banner */}
        {notificationToast && (
          <div className="notification-alert-banner">
            <div className="notification-alert-left">
              <span>{notificationToast}</span>
            </div>
            <button className="btn-close-toast" onClick={() => setNotificationToast('')}>✕</button>
          </div>
        )}

        {/* Top Minimalist Header (e.g. 2026 / 10 on left, stepper buttons, + and ⋮ on right) */}
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
              onClick={() => {
                setNewEvent(prev => ({
                  ...prev,
                  startDate: new Date().toISOString().slice(0, 10),
                  endDate: new Date().toISOString().slice(0, 10)
                }));
                setShowCreateModal(true);
              }}
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
                    🎯 Go to Today ({todayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                  </button>
                  <button className="menu-option-item" onClick={() => { setViewMode('agenda'); setShowQuickMenu(false); }}>
                    📋 Switch to Agenda Grid
                  </button>
                  <button className="menu-option-item" onClick={() => { setViewMode('month'); setShowQuickMenu(false); }}>
                    🗓️ Switch to Month Grid
                  </button>
                  <button className="menu-option-item" onClick={() => { triggerEverydayTasksNotification(); setShowQuickMenu(false); }}>
                    🔔 Send Today's Schedule Alert
                  </button>
                  <button className="menu-option-item" onClick={() => { fetchEvents(); setShowQuickMenu(false); }}>
                    🔄 Refresh Live Events
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================================
            EVERYDAY SCHEDULE & DAILY TASK PLANNER (PINNED SCHEDULE)
            Allows pinning any event/task to everyday schedule, tracking daily completion,
            and receiving daily notifications.
           ==================================================================== */}
        <div className="everyday-schedule-card glass-card">
          <div className="everyday-schedule-header">
            <div className="schedule-header-left">
              <div className="schedule-badge-pulse">
                <span className="pulse-dot"></span>
                <span className="pulse-text">TODAY'S DAILY SCHEDULE</span>
              </div>
              <h3 className="everyday-schedule-title">
                📌 Everyday Schedule &amp; Daily Tasks ({todayPinnedOrScheduled.length})
              </h3>
              <p className="everyday-schedule-desc">
                Personal preparation routine, pinned milestones, and campus tasks for {todayFormattedDate}.
              </p>
            </div>

            <div className="schedule-header-right">
              <button
                className="btn-daily-notify"
                onClick={triggerEverydayTasksNotification}
                title="Trigger Notification Reminder for Everyday Tasks"
              >
                <span>🔔</span>
                <span>Notify Everyday Tasks</span>
              </button>

              <button
                className="btn-add-daily-task"
                onClick={() => {
                  setNewEvent({
                    title: '',
                    description: '',
                    audienceScope: isStudent ? 'personal' : 'students',
                    isForPersonal: isStudent ? true : false,
                    eventType: isStudent ? 'personal_task' : isFaculty ? 'faculty_task' : 'company_drive',
                    startDate: new Date().toISOString().slice(0, 10),
                    startTime: '10:00',
                    endDate: new Date().toISOString().slice(0, 10),
                    endTime: '12:00',
                    venueOrLink: isStudent ? 'Personal Desk / Online' : 'Campus Bridge Placement Cell / Online',
                    instructorOrCompany: isFaculty ? (user?.name || 'Faculty Coordinator') : isAdmin ? 'Main Admin (TPO)' : (user?.name || 'Self'),
                    targetRoles: isStudent ? ['student'] : ['student', 'faculty', 'admin'],
                    targetBranches: ['All'],
                    allDay: false,
                    isVisibleToStudents: isStudent ? false : true,
                    priority: 'medium'
                  });
                  setShowCreateModal(true);
                }}
              >
                <span>➕</span>
                <span>Add Daily Task</span>
              </button>
            </div>
          </div>

          {/* Daily Progress Tracker Bar */}
          {todayPinnedOrScheduled.length > 0 && (
            <div className="daily-progress-container">
              <div className="progress-info-row">
                <span>Daily Task Progress</span>
                <strong>{completedTodayCount} of {todayPinnedOrScheduled.length} Completed ({dailyProgressPercent}%)</strong>
              </div>
              <div className="progress-track-bar">
                <div className="progress-fill-bar" style={{ width: `${dailyProgressPercent}%` }}></div>
              </div>
            </div>
          )}

          {/* Daily Tasks List */}
          <div className="everyday-tasks-grid">
            {todayPinnedOrScheduled.length === 0 ? (
              <div className="empty-daily-tasks">
                <span className="empty-icon">📌</span>
                <p>No tasks currently pinned to your everyday schedule for today.</p>
                <span className="empty-sub">
                  Click the "📌 Pin" button on any company drive, faculty workshop, or admin task below to pin it to your daily routine, or click "+ Add Daily Task" to log your personal goals.
                </span>
              </div>
            ) : (
              todayPinnedOrScheduled.map(item => {
                const isDone = completedTaskIds.includes(item._id);
                const isPinned = pinnedIds.includes(item._id);
                const cfg = EVENT_TYPE_CONFIG[item.eventType] || EVENT_TYPE_CONFIG.training;

                return (
                  <div
                    key={item._id}
                    className={`daily-task-item ${isDone ? 'is-completed' : ''}`}
                    style={{ borderLeftColor: cfg.color }}
                  >
                    <div className="task-check-column">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => toggleTaskCompleted(item._id, e)}
                        title="Mark task completed for today"
                        className="task-checkbox"
                      />
                    </div>

                    <div className="task-details-column" onClick={() => setSelectedEventModal(item)}>
                      <div className="task-meta-line">
                        <span className="task-type-badge" style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                          {cfg.icon} {cfg.label}
                        </span>

                        {item.creatorRole === 'admin' ? (
                          <span className="creator-badge admin-badge">🏛️ TPO Admin</span>
                        ) : item.creatorRole === 'faculty' ? (
                          <span className="creator-badge faculty-badge">👨‍🏫 Faculty: {item.creatorName || item.instructorOrCompany || 'Coordinator'}</span>
                        ) : (
                          <span className="creator-badge personal-badge">👤 My Personal Task</span>
                        )}

                        <span className="task-time-pill">
                          🕒 {new Date(item.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <h4 className={`task-item-title ${isDone ? 'done-strike' : ''}`}>{item.title}</h4>
                      {item.description && (
                        <p className="task-item-desc">{item.description}</p>
                      )}
                    </div>

                    <div className="task-actions-column">
                      <button
                        className={`btn-pin-toggle ${isPinned ? 'pinned-active' : ''}`}
                        onClick={(e) => togglePinEvent(item._id, e)}
                        title={isPinned ? 'Unpin from Everyday Schedule' : 'Pin to Everyday Schedule'}
                      >
                        {isPinned ? '📌 Pinned' : '📍 Pin'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Audience Scope & Creator Filter Bar */}
        <div className="calendar-legend-bar glass-card" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <span className="legend-label">Scope:</span>
          <button
            className={`legend-pill ${creatorScopeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCreatorScopeFilter('all')}
          >
            All Activities ({events.length})
          </button>
          <button
            className={`legend-pill ${creatorScopeFilter === 'pinned' ? 'active' : ''}`}
            style={{ color: '#facc15', borderColor: creatorScopeFilter === 'pinned' ? '#facc15' : 'rgba(234, 179, 8, 0.4)' }}
            onClick={() => setCreatorScopeFilter('pinned')}
          >
            <span>📌 Pinned to Everyday ({pinnedIds.length})</span>
          </button>
          <button
            className={`legend-pill ${creatorScopeFilter === 'admin' ? 'active' : ''}`}
            style={{ color: '#f59e0b', borderColor: creatorScopeFilter === 'admin' ? '#f59e0b' : 'rgba(245, 158, 11, 0.4)' }}
            onClick={() => setCreatorScopeFilter('admin')}
          >
            <span>🏛️ Official Admin &amp; Drives ({events.filter(e => e.creatorRole === 'admin').length})</span>
          </button>
          <button
            className={`legend-pill ${creatorScopeFilter === 'faculty' ? 'active' : ''}`}
            style={{ color: '#38bdf8', borderColor: creatorScopeFilter === 'faculty' ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)' }}
            onClick={() => setCreatorScopeFilter('faculty')}
          >
            <span>👨‍🏫 Faculty Sessions ({events.filter(e => e.creatorRole === 'faculty').length})</span>
          </button>
          <button
            className={`legend-pill ${creatorScopeFilter === 'personal' ? 'active' : ''}`}
            style={{ color: '#10b981', borderColor: creatorScopeFilter === 'personal' ? '#10b981' : 'rgba(16, 185, 129, 0.4)' }}
            onClick={() => setCreatorScopeFilter('personal')}
          >
            <span>👤 My Personal Tasks ({events.filter(e => String(e.createdBy) === String(userId) || e.creatorRole === 'student' || e.eventType === 'personal_task').length})</span>
          </button>
        </div>

        {/* Category Filter Legend Bar */}
        <div className="calendar-legend-bar glass-card">
          <span className="legend-label">Type:</span>
          <button
            className={`legend-pill ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilter('all')}
          >
            All Types ({events.length})
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
                          {ev.creatorRole === 'admin' ? (
                            <span className="creator-badge admin-badge">🏛️ TPO Admin</span>
                          ) : ev.creatorRole === 'faculty' ? (
                            <span className="creator-badge faculty-badge">👨‍🏫 Faculty</span>
                          ) : (
                            <span className="creator-badge personal-badge">👤 Personal</span>
                          )}
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
                          <span>{ev.venueOrLink || 'Campus Bridge Placement Cell'}</span>
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
                          className={`btn-pin-toggle ${pinnedIds.includes(ev._id) ? 'pinned-active' : ''}`}
                          onClick={(e) => togglePinEvent(ev._id, e)}
                          title={pinnedIds.includes(ev._id) ? 'Pinned to Everyday Schedule' : 'Pin to Everyday Schedule'}
                        >
                          📌 {pinnedIds.includes(ev._id) ? 'Pinned' : 'Pin'}
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
                          {ev.creatorRole === 'admin' ? (
                            <span className="creator-badge admin-badge">🏛️ TPO Admin</span>
                          ) : ev.creatorRole === 'faculty' ? (
                            <span className="creator-badge faculty-badge">👨‍🏫 Faculty</span>
                          ) : (
                            <span className="creator-badge personal-badge">👤 Personal</span>
                          )}
                          {ev.instructorOrCompany && (
                            <span className="timeline-host">🏢 {ev.instructorOrCompany}</span>
                          )}
                        </div>

                        <h3 className="timeline-title">{ev.title}</h3>
                        <p className="timeline-desc">{ev.description}</p>
                        <div className="timeline-venue">📍 {ev.venueOrLink || 'Campus Bridge Placement Cell'}</div>
                      </div>

                      <div className="timeline-buttons">
                        <button
                          type="button"
                          className={`btn-pin-toggle ${pinnedIds.includes(ev._id) ? 'pinned-active' : ''}`}
                          onClick={(e) => togglePinEvent(ev._id, e)}
                          title={pinnedIds.includes(ev._id) ? 'Pinned to Everyday Schedule' : 'Pin to Everyday Schedule'}
                        >
                          📌 {pinnedIds.includes(ev._id) ? 'Pinned' : 'Pin'}
                        </button>
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
            VIEW 3: WEEK VIEW (Dynamic 7-Day Live Overview)
           ==================================================================== */}
        {viewMode === 'week' && (
          <div className="calendar-week-container glass-card">
            <div className="week-header-bar">
              <h3>
                7-Day Schedule Overview ({activeWeekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {activeWeekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})
              </h3>
              <p className="agenda-subtitle">Daily breakdown of active campus training cohorts and recruiter timelines</p>
            </div>
            <div className="week-columns-grid">
              {activeWeekDays.map((dDate, idx) => {
                const dNum = dDate.getDate();
                const dayEvs = getEventsForDate(dDate);
                const isSunOrSat = idx === 0 || idx === 6;
                const isTodayPill = isSelectedDate(dDate);

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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong className="week-ev-title">{ev.title}</strong>
                                {pinnedIds.includes(ev._id) && <span title="Pinned to Everyday Schedule">📌</span>}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                <span className="week-ev-time">
                                  {new Date(ev.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {ev.creatorRole === 'admin' ? (
                                  <span className="creator-badge admin-badge" style={{ fontSize: '10px', padding: '1px 4px' }}>🏛️ Admin</span>
                                ) : ev.creatorRole === 'faculty' ? (
                                  <span className="creator-badge faculty-badge" style={{ fontSize: '10px', padding: '1px 4px' }}>👨‍🏫 Faculty</span>
                                ) : (
                                  <span className="creator-badge personal-badge" style={{ fontSize: '10px', padding: '1px 4px' }}>👤 Personal</span>
                                )}
                              </div>
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
            VIEW 4: DAY VIEW (Detailed Timetable for Live Date)
           ==================================================================== */}
        {viewMode === 'day' && (
          <div className="calendar-day-container glass-card">
            <div className="day-view-hero">
              <div className="day-hero-date-badge">
                <span className="hero-day-num">{currentDate.getDate()}</span>
                <div>
                  <h3 className="hero-day-title">
                    {currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <span className="hero-day-sub">Daily Placement & Academic Routine</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleToday}>📅 Today</button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                  ➕ Add Event
                </button>
              </div>
            </div>

            <div className="day-timetable-list">
              {getEventsForDate(currentDate).length === 0 ? (
                <div className="agenda-empty-state" style={{ padding: '2.5rem 1rem' }}>
                  <span className="empty-icon">📅</span>
                  <h3>No Events Scheduled for This Day</h3>
                  <p>Click "Add Event" to schedule an activity, task, or recruitment milestone.</p>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                    ➕ Add Task or Event
                  </button>
                </div>
              ) : (
                getEventsForDate(currentDate).map((ev) => {
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
                          {ev.creatorRole === 'admin' ? (
                            <span className="creator-badge admin-badge">🏛️ TPO Admin</span>
                          ) : ev.creatorRole === 'faculty' ? (
                            <span className="creator-badge faculty-badge">👨‍🏫 Faculty</span>
                          ) : (
                            <span className="creator-badge personal-badge">👤 Personal</span>
                          )}
                          {ev.instructorOrCompany && <span>🏢 {ev.instructorOrCompany}</span>}
                        </div>
                        <h4>{ev.title}</h4>
                        <p>{ev.description}</p>
                        <div className="entry-venue">📍 {ev.venueOrLink}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          type="button"
                          className={`btn-pin-toggle ${pinnedIds.includes(ev._id) ? 'pinned-active' : ''}`}
                          onClick={(e) => togglePinEvent(ev._id, e)}
                        >
                          📌 {pinnedIds.includes(ev._id) ? 'Pinned' : 'Pin'}
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEventModal(ev)}>
                          Dossier
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ====================================================================
            VIEW 5: YEAR VIEW (12-Month Miniature Index)
           ==================================================================== */}
        {viewMode === 'year' && (
          <div className="calendar-year-container glass-card">
            <div className="year-header">
              <h2>Academic & Placement Year {year}</h2>
              <p>Click any month to navigate directly into its full-month view</p>
            </div>
            <div className="year-months-grid">
              {MONTH_NAMES.map((mName, mIdx) => (
                <div
                  key={mName}
                  className={`year-month-card ${mIdx === month ? 'current-active-month' : ''}`}
                  onClick={() => {
                    setCurrentDate(new Date(year, mIdx, 1));
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
            <div className="dock-icon">📅</div>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {cfg.label}
                            </span>
                            {selectedEventModal.creatorRole === 'admin' ? (
                              <span className="creator-badge admin-badge">🏛️ TPO Admin</span>
                            ) : selectedEventModal.creatorRole === 'faculty' ? (
                              <span className="creator-badge faculty-badge">👨‍🏫 Faculty Session</span>
                            ) : (
                              <span className="creator-badge personal-badge">👤 Personal Task</span>
                            )}
                          </div>
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
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Organizer / Company</span>
                          <strong style={{ color: '#38bdf8', fontSize: '13px' }}>
                            {selectedEventModal.instructorOrCompany || selectedEventModal.creatorName || 'Placement Cell'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Venue / Mode</span>
                          <strong style={{ color: '#34d399', fontSize: '13px' }}>
                            {selectedEventModal.venueOrLink || 'Campus Bridge'}
                          </strong>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ color: '#fff', margin: '0 0 6px', fontSize: '14px' }}>Event Description</h4>
                        <p style={{ color: '#cbd5e1', fontSize: '13.5px', lineHeight: '1.5', margin: 0 }}>
                          {selectedEventModal.description || 'No detailed instructions provided.'}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Target Audience & Scope:</span>
                        {selectedEventModal.isVisibleToStudents ? (
                          <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                            🎓 Published to Students' Calendar
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                            🔒 Private Personal Schedule (Hidden from Students)
                          </span>
                        )}
                        {(selectedEventModal.targetAudience?.roles || ['student', 'faculty', 'admin']).map(r => (
                          <span key={r} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', textTransform: 'capitalize' }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownloadICS(selectedEventModal)}
                        >
                          📥 Add to Calendar (.ics)
                        </button>
                        <button
                          type="button"
                          className={`btn-pin-toggle ${pinnedIds.includes(selectedEventModal._id) ? 'pinned-active' : ''}`}
                          onClick={(e) => togglePinEvent(selectedEventModal._id, e)}
                        >
                          📌 {pinnedIds.includes(selectedEventModal._id) ? 'Pinned to Everyday Schedule' : 'Pin to Everyday Schedule'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        {(isAdmin || isFaculty || String(selectedEventModal.createdBy) === String(userId)) && (
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
                {/* 1. AUDIENCE SCOPE SELECTOR: Clear 2-option interactive cards */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Event Purpose & Target Audience *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '10px' }}>
                    {/* Option 1: Personal Schedule */}
                    <div
                      className={`scope-select-card ${newEvent.audienceScope === 'personal' ? 'selected' : ''}`}
                      onClick={() => setNewEvent(prev => ({
                        ...prev,
                        audienceScope: 'personal',
                        isForPersonal: true,
                        isVisibleToStudents: false,
                        eventType: isStudent ? 'personal_task' : isFaculty ? 'faculty_task' : 'admin_task'
                      }))}
                    >
                      <div className="scope-radio-row">
                        <input
                          type="radio"
                          name="audienceScope"
                          checked={newEvent.audienceScope === 'personal'}
                          onChange={() => {}}
                        />
                        <strong>👤 For My Personal Schedule</strong>
                      </div>
                      <p>
                        {isAdmin
                          ? 'Private administrative task. Kept strictly private and hidden from students.'
                          : isFaculty
                          ? 'Personal schedule or reminder. Kept strictly private and hidden from students.'
                          : 'Personal study task or goal. Visible only to you.'}
                      </p>
                    </div>

                    {/* Option 2: Broadcast to Students */}
                    <div
                      className={`scope-select-card ${newEvent.audienceScope === 'students' ? 'selected' : ''}`}
                      onClick={() => setNewEvent(prev => ({
                        ...prev,
                        audienceScope: 'students',
                        isForPersonal: false,
                        isVisibleToStudents: true,
                        eventType: isStudent ? 'training' : isFaculty ? 'training' : 'company_drive'
                      }))}
                    >
                      <div className="scope-radio-row">
                        <input
                          type="radio"
                          name="audienceScope"
                          checked={newEvent.audienceScope === 'students'}
                          onChange={() => {}}
                        />
                        <strong>{isStudent ? '👥 Peer Study Group' : '🎓 For Students (Campus Calendar)'}</strong>
                      </div>
                      <p>
                        {isAdmin
                          ? 'Official drive, assessment, or cutoff published to all students’ Placement Calendars.'
                          : isFaculty
                          ? 'Official training, workshop, or mock interview for students.'
                          : 'Collaborative study session visible to classmates in calendar.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Event Title */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Event Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={
                      newEvent.audienceScope === 'personal'
                        ? 'e.g. Complete 5 LeetCode DP Problems / Review System Design'
                        : 'e.g. Google Campus Recruitment Drive / Placement Masterclass'
                    }
                    value={newEvent.title}
                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    required
                  />
                </div>

                {/* 3. Event Type & Priority */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Event Type *</label>
                    <select
                      className="form-control"
                      value={newEvent.eventType}
                      onChange={e => setNewEvent({ ...newEvent, eventType: e.target.value })}
                    >
                      {newEvent.audienceScope === 'personal' ? (
                        <>
                          <option value={isStudent ? 'personal_task' : isFaculty ? 'faculty_task' : 'admin_task'}>
                            {isStudent ? '👤 Personal Study Task' : isFaculty ? '👨‍🏫 Faculty Personal Prep' : '🏛️ Admin Internal Task'}
                          </option>
                          <option value="training">🟢 Personal Learning / Study Session</option>
                          <option value="aptitude_test">🟠 Aptitude Practice Goal</option>
                          <option value="mock_interview">🔵 Mock Interview Preparation</option>
                          <option value="deadline">🔴 Self Target Deadline</option>
                        </>
                      ) : (
                        <>
                          {isAdmin && (
                            <>
                              <option value="company_drive">🟣 Company Recruitment Drive</option>
                              <option value="admin_task">🏛️ Official Placement Cell Task / Clearance</option>
                              <option value="aptitude_test">🟠 Institutional Aptitude Assessment</option>
                              <option value="training">🟢 Placement Training Masterclass</option>
                              <option value="mock_interview">🔵 Mock Interview Drive</option>
                              <option value="workshop">🟡 Technical Workshop</option>
                              <option value="deadline">🔴 Registration / Consent Cutoff</option>
                            </>
                          )}
                          {isFaculty && (
                            <>
                              <option value="training">🟢 Department Training Session</option>
                              <option value="workshop">🟡 Hands-on Workshop</option>
                              <option value="mock_interview">🔵 Faculty Mock Interview</option>
                              <option value="faculty_task">👨‍🏫 Faculty Mentoring Session</option>
                              <option value="aptitude_test">🟠 Department Diagnostic Quiz</option>
                            </>
                          )}
                          {isStudent && (
                            <>
                              <option value="training">🟢 Peer Study Session</option>
                              <option value="mock_interview">🔵 Peer Mock Interview Practice</option>
                              <option value="aptitude_test">🟠 Group Aptitude Challenge</option>
                            </>
                          )}
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

                {/* 4. Host / Instructor */}
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
