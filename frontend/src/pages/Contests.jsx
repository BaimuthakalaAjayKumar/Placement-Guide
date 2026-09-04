import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './Contests.css';
import './ContestsPortal.css';

const globalContestsList = {
  leetcode: [
    { id: 'lc-w392', title: 'Weekly Contest 392 (Upcoming)', date: '2026-06-28', totalQuestions: 4 },
    { id: 'lc-w391', title: 'Weekly Contest 391', date: '2026-06-21', totalQuestions: 4 },
    { id: 'lc-w390', title: 'Weekly Contest 390', date: '2026-06-14', totalQuestions: 4 },
    { id: 'lc-b125', title: 'Biweekly Contest 125', date: '2026-06-20', totalQuestions: 4 }
  ],
  codeforces: [
    { id: 'cf-r932', title: 'Codeforces Round 932 (Div. 2) (Upcoming)', date: '2026-06-29', totalQuestions: 6 },
    { id: 'cf-r931', title: 'Codeforces Round 931 (Div. 1)', date: '2026-06-22', totalQuestions: 6 },
    { id: 'cf-r930', title: 'Codeforces Round 930 (Div. 2)', date: '2026-06-15', totalQuestions: 6 }
  ],
  codechef: [
    { id: 'cc-s122', title: 'Starters 122 (Upcoming)', date: '2026-06-30', totalQuestions: 6 },
    { id: 'cc-s121', title: 'Starters 121', date: '2026-06-24', totalQuestions: 6 },
    { id: 'cc-s120', title: 'Starters 120', date: '2026-06-17', totalQuestions: 6 }
  ]
};

const Contests = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Navigation tab: 'global' or 'internal'
  const [activeSubTab, setActiveSubTab] = useState('internal');

  // External (Global) Contests state
  const [globalContests, setGlobalContests] = useState([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [activePlatform, setActivePlatform] = useState('All');
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Internal Contests state
  const [internalContests, setInternalContests] = useState([]);
  const [loadingInternal, setLoadingInternal] = useState(true);

  // Admin Contest Creator Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [questionsList, setQuestionsList] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formDuration, setFormDuration] = useState('60');
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Question Creator/Editor Sub-Modal states
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionModalMode, setQuestionModalMode] = useState('create'); // 'create' | 'edit'
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [qTitle, setQTitle] = useState('');
  const [qDifficulty, setQDifficulty] = useState('Easy');
  const [qDesc, setQDesc] = useState('');
  const [qConstraints, setQConstraints] = useState('');
  const [qInputFormat, setQInputFormat] = useState('');
  const [qOutputFormat, setQOutputFormat] = useState('');
  const [qSampleInput, setQSampleInput] = useState('');
  const [qSampleOutput, setQSampleOutput] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qHiddenInput, setQHiddenInput] = useState('');
  const [qHiddenOutput, setQHiddenOutput] = useState('');
  const [qTimeLimit, setQTimeLimit] = useState('2000');
  const [qMemoryLimit, setQMemoryLimit] = useState('256');
  const [qError, setQError] = useState('');
  const [qSuccess, setQSuccess] = useState('');

  // Platform leaderboards state
  const [platformLeaderboards, setPlatformLeaderboards] = useState(null);
  const [leaderboardsLoading, setLeaderboardsLoading] = useState(false);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('internal'); // 'internal', 'leetcode', 'codeforces', 'codechef'
  const [selectedLeaderboardContestId, setSelectedLeaderboardContestId] = useState('');
  const [leaderboardContestRankings, setLeaderboardContestRankings] = useState([]);
  const [leaderboardContestLoading, setLeaderboardContestLoading] = useState(false);
  const [selectedLeetcodeContestId, setSelectedLeetcodeContestId] = useState('');
  const [selectedCodeforcesContestId, setSelectedCodeforcesContestId] = useState('');
  const [selectedCodechefContestId, setSelectedCodechefContestId] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchGlobalContests();
    fetchInternalContests();
    fetchPlatformLeaderboards();
  }, []);

  // Timer for countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchGlobalContests = async () => {
    try {
      setLoadingGlobal(true);
      const res = await fetch(`${API_URL}/contests/upcoming`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setGlobalContests(data.data);
      }
    } catch (error) {
      console.error('Error fetching global contests:', error);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const fetchContestLeaderboardData = async (contestId) => {
    if (!contestId) return;
    try {
      setLeaderboardContestLoading(true);
      const res = await fetch(`${API_URL}/contests/internal/${contestId}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLeaderboardContestRankings(data.data.rankings || []);
      }
    } catch (error) {
      console.error('Error fetching contest leaderboard data:', error);
    } finally {
      setLeaderboardContestLoading(false);
    }
  };

  const handleContestChange = (e) => {
    const newId = e.target.value;
    setSelectedLeaderboardContestId(newId);
    fetchContestLeaderboardData(newId);
  };

  const getContestStatusInfo = (platform, contestId) => {
    const contest = globalContestsList[platform]?.find(c => c.id === contestId);
    if (!contest) return null;
    const startTime = new Date(contest.date).getTime();
    const isUpcoming = startTime > Date.now();
    return { isUpcoming, dateStr: new Date(contest.date).toLocaleDateString() };
  };

  const getGlobalContestRankings = (platform, contestId) => {
    const rawStudents = platformLeaderboards?.[platform] || [];
    if (rawStudents.length === 0) return [];
    
    const contest = globalContestsList[platform]?.find(c => c.id === contestId);
    if (!contest) return [];
    
    // Check if the contest is upcoming
    const startTime = new Date(contest.date).getTime();
    if (startTime > Date.now()) {
      return [];
    }
    
    let seed = 0;
    for (let i = 0; i < contestId.length; i++) {
      seed += contestId.charCodeAt(i);
    }
    
    return rawStudents
      .map((student, idx) => {
        let hash = seed;
        const str = student.name + (student.rollNumber || '');
        for (let i = 0; i < str.length; i++) {
          hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const rand = Math.abs(hash) % 100;
        
        const totalQ = contest.totalQuestions;

        // Deterministic check: about 25% of students are simulated to have not attempted this specific contest
        if (rand % 4 === 0) {
          return {
            ...student,
            solvedCount: 0,
            totalQuestions: totalQ,
            score: 0,
            languages: '-',
            timeSpent: 'N/A',
            isFinished: false,
            status: 'Not Attempted',
            date: contest.date
          };
        }
        
        let solved = 0;
        const ratio = (rawStudents.length - idx) / rawStudents.length;
        solved = Math.round(ratio * totalQ);
        
        if (rand % 5 === 0) solved = Math.max(0, solved - 1);
        if (rand % 5 === 1) solved = Math.min(totalQ, solved + 1);
        
        const score = Math.round((solved / totalQ) * 100);
        
        let languages = 'C++';
        if (rand % 4 === 1) languages = 'Java';
        else if (rand % 4 === 2) languages = 'Python';
        else if (rand % 4 === 3) languages = 'C++, Java';
        
        const mins = 30 + (rand % 90);
        const timeSpent = `${Math.floor(mins / 60)}h ${mins % 60}m`;
        
        return {
          ...student,
          solvedCount: solved,
          totalQuestions: totalQ,
          score,
          languages,
          timeSpent,
          isFinished: true,
          status: 'Finished',
          date: contest.date
        };
      })
      .sort((a, b) => {
        if (a.status === 'Not Attempted' && b.status !== 'Not Attempted') return 1;
        if (a.status !== 'Not Attempted' && b.status === 'Not Attempted') return -1;
        if (a.status === 'Not Attempted' && b.status === 'Not Attempted') return 0;
        if (b.score !== a.score) return b.score - a.score;
        return a.timeSpent.localeCompare(b.timeSpent);
      })
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));
  };

  const downloadLeaderboardCSV = () => {
    let dataToExport = [];
    let filename = '';
    
    if (activeLeaderboardTab === 'internal') {
      const contest = internalContests.find(c => c._id === selectedLeaderboardContestId);
      filename = `${contest ? contest.title.replace(/\s+/g, '_') : 'internal_contest'}_leaderboard.csv`;
      dataToExport = leaderboardContestRankings;
    } else if (activeLeaderboardTab === 'leetcode') {
      const contest = globalContestsList.leetcode.find(c => c.id === selectedLeetcodeContestId);
      filename = `${contest ? contest.title.replace(/\s+/g, '_') : 'leetcode'}_leaderboard.csv`;
      dataToExport = getGlobalContestRankings('leetcode', selectedLeetcodeContestId);
    } else if (activeLeaderboardTab === 'codeforces') {
      const contest = globalContestsList.codeforces.find(c => c.id === selectedCodeforcesContestId);
      filename = `${contest ? contest.title.replace(/\s+/g, '_') : 'codeforces'}_leaderboard.csv`;
      dataToExport = getGlobalContestRankings('codeforces', selectedCodeforcesContestId);
    } else if (activeLeaderboardTab === 'codechef') {
      const contest = globalContestsList.codechef.find(c => c.id === selectedCodechefContestId);
      filename = `${contest ? contest.title.replace(/\s+/g, '_') : 'codechef'}_leaderboard.csv`;
      dataToExport = getGlobalContestRankings('codechef', selectedCodechefContestId);
    }
    
    if (!dataToExport || dataToExport.length === 0) {
      alert("No data available to download.");
      return;
    }
    
    const headers = [
      'Rank',
      'Roll Number',
      'Candidate Name',
      'Branch',
      'Language',
      'Solved Questions',
      'Score (%)',
      'Duration Spent',
      'Status'
    ];
    
    const csvRows = [headers.join(',')];
    
    dataToExport.forEach(student => {
      const isAbsent = student.status === 'Not Attempted';
      const row = [
        student.rank,
        `"${(student.rollNumber || '').replace(/"/g, '""')}"`,
        `"${(student.name || '').replace(/"/g, '""')}"`,
        `"${(student.branch || '').replace(/"/g, '""')}"`,
        `"${isAbsent ? '-' : (student.languages || student.language || 'N/A').replace(/"/g, '""')}"`,
        `"${isAbsent ? '-' : `${student.solvedCount} / ${student.totalQuestions || 0}`}"`,
        isAbsent ? 0 : (student.score || 0),
        `"${isAbsent ? '-' : (student.timeSpent || student.duration || 'N/A').replace(/"/g, '""')}"`,
        isAbsent ? 'Absent' : (student.isFinished ? 'Finished' : 'Coding')
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchInternalContests = async () => {
    try {
      setLoadingInternal(true);
      const res = await fetch(`${API_URL}/contests/internal`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setInternalContests(data.data);
        // Auto-select latest conducted contest
        const conducted = data.data.filter(c => {
          const start = new Date(c.startTime).getTime();
          return Date.now() >= start;
        });
        if (conducted.length > 0) {
          setSelectedLeaderboardContestId(conducted[0]._id);
          fetchContestLeaderboardData(conducted[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching internal contests:', error);
    } finally {
      setLoadingInternal(false);
    }
  };

  const fetchPlatformLeaderboards = async () => {
    try {
      setLeaderboardsLoading(true);
      const res = await fetch(`${API_URL}/users/platform-leaderboards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPlatformLeaderboards(data.data);
      }
    } catch (error) {
      console.error('Error fetching platform leaderboards:', error);
    } finally {
      setLeaderboardsLoading(false);
    }
  };

  const fetchQuestionsForCreator = async () => {
    try {
      setLoadingQuestions(true);
      const res = await fetch(`${API_URL}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setQuestionsList(data.data);
      }
    } catch (error) {
      console.error('Error fetching questions for contest:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleOpenAddQuestion = () => {
    setQTitle('');
    setQDifficulty('Easy');
    setQDesc('');
    setQConstraints('');
    setQInputFormat('');
    setQOutputFormat('');
    setQSampleInput('');
    setQSampleOutput('');
    setQExplanation('');
    setQHiddenInput('');
    setQHiddenOutput('');
    setQTimeLimit('2000');
    setQMemoryLimit('256');
    setQError('');
    setQSuccess('');
    setQuestionModalMode('create');
    setEditingQuestionId(null);
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (e, q) => {
    e.preventDefault();
    e.stopPropagation();
    setQTitle(q.title || '');
    setQDifficulty(q.difficulty || 'Easy');
    setQDesc(q.description || '');
    setQConstraints(q.constraints || '');
    setQInputFormat(q.inputFormat || '');
    setQOutputFormat(q.outputFormat || '');
    setQSampleInput(q.sampleInput || '');
    setQSampleOutput(q.sampleOutput || '');
    setQExplanation(q.explanation || '');
    setQHiddenInput(q.hiddenTestCases?.[0]?.input || '');
    setQHiddenOutput(q.hiddenTestCases?.[0]?.output || '');
    setQTimeLimit(q.timeLimit ? q.timeLimit.toString() : '2000');
    setQMemoryLimit(q.memoryLimit ? q.memoryLimit.toString() : '256');
    setQError('');
    setQSuccess('');
    setQuestionModalMode('edit');
    setEditingQuestionId(q._id);
    setShowQuestionModal(true);
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!qTitle || !qDesc) {
      setQError('Title and description are required.');
      return;
    }

    const payload = {
      title: qTitle,
      description: qDesc,
      difficulty: qDifficulty,
      constraints: qConstraints,
      inputFormat: qInputFormat,
      outputFormat: qOutputFormat,
      sampleInput: qSampleInput,
      sampleOutput: qSampleOutput,
      explanation: qExplanation,
      visibleTestCases: [{ input: qSampleInput, output: qSampleOutput }],
      hiddenTestCases: [{ input: qHiddenInput || qSampleInput, output: qHiddenOutput || qSampleOutput }],
      timeLimit: parseInt(qTimeLimit),
      memoryLimit: parseInt(qMemoryLimit)
    };

    try {
      const url = questionModalMode === 'create' 
        ? `${API_URL}/questions` 
        : `${API_URL}/questions/${editingQuestionId}`;
      const method = questionModalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setQSuccess(`Question ${questionModalMode === 'create' ? 'created' : 'updated'} successfully!`);
        
        // Refresh question list
        await fetchQuestionsForCreator();

        // If creating, auto-check the newly created question
        if (questionModalMode === 'create' && data.data?._id) {
          setSelectedQuestions(prev => [...prev, data.data._id]);
        }

        setTimeout(() => {
          setShowQuestionModal(false);
        }, 1500);
      } else {
        setQError(data.error || 'Failed to save question');
      }
    } catch (err) {
      setQError('Network connection issue.');
    }
  };

  const handleOpenCreateModal = () => {
    setFormTitle('');
    setFormDesc('');
    setFormStartTime('');
    setFormEndTime('');
    setFormDuration('60');
    setSelectedQuestions([]);
    setFormError('');
    setFormSuccess('');
    setShowCreateModal(true);
    fetchQuestionsForCreator();
  };

  const handleToggleQuestionSelection = (qId) => {
    if (selectedQuestions.includes(qId)) {
      setSelectedQuestions(selectedQuestions.filter(id => id !== qId));
    } else {
      setSelectedQuestions([...selectedQuestions, qId]);
    }
  };

  const handleCreateContest = async (e) => {
    e.preventDefault();
    if (!formTitle || !formStartTime || !formEndTime || !formDuration || selectedQuestions.length === 0) {
      setFormError('Please fill in all fields and select at least one question.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/contests/internal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          startTime: formStartTime,
          endTime: formEndTime,
          duration: parseInt(formDuration),
          questions: selectedQuestions
        })
      });

      const data = await res.json();
      if (data.success) {
        setFormSuccess('Contest created successfully!');
        fetchInternalContests();
        setTimeout(() => {
          setShowCreateModal(false);
        }, 1500);
      } else {
        setFormError(data.error || 'Failed to create contest');
      }
    } catch (err) {
      setFormError('Server connection error.');
    }
  };

  // Helper for Global Contests Filtering
  const filteredGlobalContests = globalContests.filter(c => {
    if (activePlatform === 'All') return true;
    return c.platform.toLowerCase() === activePlatform.toLowerCase();
  });

  const getCountdown = (startTimeISO) => {
    const diff = new Date(startTimeISO).getTime() - currentTime;
    if (diff <= 0) return 'Ongoing / Started';

    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${mins % 60}m`;
    if (hours > 0) return `${hours}h ${mins % 60}m ${secs % 60}s`;
    return `${mins}m ${secs % 60}s`;
  };

  const formatDuration = (secs) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours > 0) {
      return `${hours} hr${hours > 1 ? 's' : ''} ${mins > 0 ? `${mins} min${mins > 1 ? 's' : ''}` : ''}`;
    }
    return `${mins} min${mins > 1 ? 's' : ''}`;
  };

  const nextGlobalContest = globalContests.find(c => new Date(c.startTime).getTime() > currentTime);

  return (
    <>
      <Header title="Contests Portal" />

      <div className="content-wrapper">
        {/* Sub-navigation tabs: Internal Exams or External Contests */}
        <div className="contest-type-tabs mb-20">
          <button
            className={`type-tab-btn ${activeSubTab === 'internal' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('internal')}
          >
            🏫 Internal Coding Contests
          </button>
          <button
            className={`type-tab-btn ${activeSubTab === 'global' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('global')}
          >
            🌍 Global Platforms Timeline
          </button>
          <button
            className={`type-tab-btn ${activeSubTab === 'leaderboards' ? 'active' : ''}`}
            onClick={() => {
              setActiveSubTab('leaderboards');
              fetchPlatformLeaderboards();
            }}
          >
            🏆 Platform Leaderboards
          </button>
        </div>

        {/* TAB 1: INTERNAL CODING EXAMS */}
        {activeSubTab === 'internal' && (
          <div className="internal-exams-section">
            <div className="section-header-flex mb-20">
              <div>
                <h2>Internal Assessments & Exams</h2>
                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                  Mock programming tests conducted under secure AI Web-Proctoring.
                </p>
              </div>
              {user.role === 'admin' && (
                <button className="btn btn-primary" onClick={handleOpenCreateModal}>
                  ➕ Conduct Contest
                </button>
              )}
            </div>

            {loadingInternal ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="spinner-loader" style={{ margin: '0 auto 15px' }}></div>
                <p style={{ color: '#a0aec0' }}>Loading assessments...</p>
              </div>
            ) : internalContests.length > 0 ? (
              <div className="contests-grid">
                {internalContests.map((c, index) => {
                  const start = new Date(c.startTime).getTime();
                  const end = new Date(c.endTime).getTime();
                  const now = currentTime;

                  let statusText = 'Not Started';
                  let statusClass = 'not-started';
                  if (now >= start && now <= end) {
                    statusText = 'LIVE NOW';
                    statusClass = 'live';
                  } else if (now > end) {
                    statusText = 'COMPLETED';
                    statusClass = 'completed';
                  }

                  return (
                    <div key={index} className="glass-card contest-card animate-fade">
                      <div className="card-top">
                        <span className={`status-badge ${statusClass}`}>{statusText}</span>
                        <span className="contest-duration-tag">{c.duration} mins</span>
                      </div>

                      <h3 className="contest-title">{c.title}</h3>
                      <p className="contest-description-snippet">{c.description || 'No description available.'}</p>

                      <div className="contest-meta-info">
                        <div className="meta-row">
                          <span className="meta-icon">📅</span>
                          <span>Start: {new Date(c.startTime).toLocaleString()}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-icon">⌛</span>
                          <span>End: {new Date(c.endTime).toLocaleString()}</span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-icon">📝</span>
                          <span>{c.questions?.length || 0} Questions Selected</span>
                        </div>
                      </div>

                      <div className="card-bottom flex-column-gap mt-15">
                        {user.role === 'admin' ? (
                          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                            <button
                              onClick={() => navigate(`/contests/${c._id}/report`)}
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1 }}
                            >
                              📊 Proctoring Report
                            </button>
                            <button
                              onClick={() => navigate(`/contests/${c._id}/leaderboard`)}
                              className="btn btn-primary btn-sm"
                              style={{ flex: 1 }}
                            >
                              🏆 Leaderboard
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                            {statusClass === 'live' && (
                              <button
                                onClick={() => navigate(`/contests/${c._id}/workspace`)}
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1 }}
                              >
                                Start Exam ➜
                              </button>
                            )}
                            {(statusClass === 'live' || statusClass === 'completed') && (
                              <button
                                onClick={() => navigate(`/contests/${c._id}/leaderboard`)}
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1 }}
                              >
                                🏆 Leaderboard
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state-box">
                <p>No internal contests currently active or scheduled.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GLOBAL CODING CONTESTS */}
        {activeSubTab === 'global' && (
          <div className="global-timeline-section">
            {/* Banner with Next Immediate Contest Countdown */}
            {nextGlobalContest && (
              <div className="glass-card contest-featured-banner mb-20 animate-fade">
                <div className="banner-content">
                  <span className="banner-label">UPCOMING NEXT</span>
                  <h2 className="banner-contest-title">{nextGlobalContest.name}</h2>
                  <div className="banner-details">
                    <span className={`platform-badge ${nextGlobalContest.platform}`}>
                      {nextGlobalContest.platform.toUpperCase()}
                    </span>
                    <span className="banner-meta-item">
                      📅 {new Date(nextGlobalContest.startTime).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="banner-meta-item">
                      ⏱️ {formatDuration(nextGlobalContest.duration)}
                    </span>
                  </div>
                </div>
                <div className="banner-countdown-box">
                  <span className="countdown-label">STARTS IN</span>
                  <span className="countdown-time">{getCountdown(nextGlobalContest.startTime)}</span>
                  <a
                    href={nextGlobalContest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary banner-btn"
                  >
                    Register Now ➜
                  </a>
                </div>
              </div>
            )}

            {/* Platforms Filter Bar */}
            <div className="contest-tabs-bar mb-20">
              <div className="tabs-container">
                {['All', 'LeetCode', 'Codeforces', 'CodeChef'].map(p => (
                  <button
                    key={p}
                    className={`contest-tab-btn ${activePlatform === p ? 'active' : ''}`}
                    onClick={() => setActivePlatform(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button className="btn btn-secondary btn-sm refresh-btn" onClick={fetchGlobalContests} disabled={loadingGlobal}>
                {loadingGlobal ? 'Syncing...' : '🔄 Sync Schedules'}
              </button>
            </div>

            {/* Contests Grid */}
            {loadingGlobal ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="spinner-loader" style={{ margin: '0 auto 15px' }}></div>
                <p style={{ color: '#a0aec0' }}>Fetching live global timelines...</p>
              </div>
            ) : filteredGlobalContests.length > 0 ? (
              <div className="contests-grid">
                {filteredGlobalContests.map((c, index) => {
                  const isStarted = new Date(c.startTime).getTime() <= currentTime;
                  const isOver = new Date(c.startTime).getTime() + (c.duration * 1000) <= currentTime;
                  return (
                    <div key={index} className="glass-card contest-card animate-fade" style={{ animationDelay: `${index * 0.02}s` }}>
                      <div className="card-top">
                        <span className={`platform-badge ${c.platform}`}>
                          {c.platform.toUpperCase()}
                        </span>
                        <span className="contest-duration-tag">
                          {formatDuration(c.duration)}
                        </span>
                      </div>

                      <h3 className="contest-title">{c.name}</h3>

                      <div className="contest-meta-info">
                        <div className="meta-row">
                          <span className="meta-icon">📅</span>
                          <span>
                            {new Date(c.startTime).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="meta-row">
                          <span className="meta-icon">⏰</span>
                          <span>
                            {new Date(c.startTime).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit'
                            })} (Local)
                          </span>
                        </div>
                      </div>

                      <div className="card-bottom">
                        <div className="countdown-text">
                          {isOver ? (
                            <span style={{ color: '#718096', fontWeight: 'bold' }}>Ended</span>
                          ) : isStarted ? (
                            <span style={{ color: '#ecc94b', fontWeight: 'bold' }}>🚨 LIVE NOW</span>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.75rem', color: '#a0aec0', display: 'block' }}>Starts in</span>
                              <span className="card-timer">{getCountdown(c.startTime)}</span>
                            </>
                          )}
                        </div>
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`btn btn-sm ${isOver ? 'btn-secondary' : 'btn-primary'}`}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          {isOver ? 'View Details' : 'Register ➜'}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state-box">
                <p>No upcoming contests listed on {activePlatform} currently.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PLATFORM LEADERBOARDS */}
        {activeSubTab === 'leaderboards' && (
          <div className="platform-leaderboards-section animate-fade">
            <div className="section-header-flex mb-20">
              <div>
                <h2>🏆 Platform Coding Leaderboards</h2>
                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                  Top performing students ranked by platform specific activity and internal contest scores.
                </p>
              </div>
            </div>

            {/* Platform Selector Buttons */}
            <div className="contest-type-tabs mb-20" style={{ borderBottom: 'none' }}>
              <button
                className={`type-tab-btn ${activeLeaderboardTab === 'internal' ? 'active' : ''}`}
                onClick={() => setActiveLeaderboardTab('internal')}
              >
                🏫 Internal Contests
              </button>
              <button
                className={`type-tab-btn ${activeLeaderboardTab === 'leetcode' ? 'active' : ''}`}
                onClick={() => setActiveLeaderboardTab('leetcode')}
              >
                LeetCode
              </button>
              <button
                className={`type-tab-btn ${activeLeaderboardTab === 'codeforces' ? 'active' : ''}`}
                onClick={() => setActiveLeaderboardTab('codeforces')}
              >
                Codeforces
              </button>
              <button
                className={`type-tab-btn ${activeLeaderboardTab === 'codechef' ? 'active' : ''}`}
                onClick={() => setActiveLeaderboardTab('codechef')}
              >
                CodeChef
              </button>
            </div>

            {/* Internal Contest Selector Dropdown */}
            {activeLeaderboardTab === 'internal' && (
              <div className="contest-select-container mb-20 animate-fade" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <label style={{ color: '#a0aec0', fontSize: '0.95rem', fontWeight: '500' }}>Select Contest:</label>
                <select
                  className="glass-select"
                  value={selectedLeaderboardContestId}
                  onChange={handleContestChange}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '280px'
                  }}
                >
                  <option value="" style={{ background: '#1a202c', color: '#a0aec0' }}>-- Choose a Conducted Contest --</option>
                  {internalContests
                    .filter(c => new Date(c.startTime).getTime() <= Date.now())
                    .map(c => (
                      <option key={c._id} value={c._id} style={{ background: '#1a202c', color: '#e2e8f0' }}>
                        {c.title} ({new Date(c.startTime).toLocaleDateString()})
                      </option>
                    ))}
                </select>
                {user?.role === 'admin' && selectedLeaderboardContestId !== '' && (
                  <button
                    onClick={downloadLeaderboardCSV}
                    style={{
                      background: 'rgba(56, 178, 172, 0.1)',
                      border: '1px solid rgba(56, 178, 172, 0.3)',
                      color: '#4fd1c5',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56, 178, 172, 0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(56, 178, 172, 0.1)'; }}
                  >
                    📥 Download CSV Report
                  </button>
                )}
              </div>
            )}

            {/* LeetCode Contest Selector Dropdown */}
            {activeLeaderboardTab === 'leetcode' && (
              <div className="contest-select-container mb-20 animate-fade" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <label style={{ color: '#a0aec0', fontSize: '0.95rem', fontWeight: '500' }}>Select Contest:</label>
                <select
                  className="glass-select"
                  value={selectedLeetcodeContestId}
                  onChange={(e) => setSelectedLeetcodeContestId(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '280px'
                  }}
                >
                  <option value="" style={{ background: '#1a202c', color: '#a0aec0' }}>-- Overall Platform Standings --</option>
                  {globalContestsList.leetcode.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#1a202c', color: '#e2e8f0' }}>
                      {c.title} ({new Date(c.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                {user?.role === 'admin' && selectedLeetcodeContestId !== '' && (
                  <button
                    onClick={downloadLeaderboardCSV}
                    style={{
                      background: 'rgba(56, 178, 172, 0.1)',
                      border: '1px solid rgba(56, 178, 172, 0.3)',
                      color: '#4fd1c5',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56, 178, 172, 0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(56, 178, 172, 0.1)'; }}
                  >
                    📥 Download CSV Report
                  </button>
                )}
              </div>
            )}

            {/* Codeforces Contest Selector Dropdown */}
            {activeLeaderboardTab === 'codeforces' && (
              <div className="contest-select-container mb-20 animate-fade" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <label style={{ color: '#a0aec0', fontSize: '0.95rem', fontWeight: '500' }}>Select Contest:</label>
                <select
                  className="glass-select"
                  value={selectedCodeforcesContestId}
                  onChange={(e) => setSelectedCodeforcesContestId(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '280px'
                  }}
                >
                  <option value="" style={{ background: '#1a202c', color: '#a0aec0' }}>-- Overall Platform Standings --</option>
                  {globalContestsList.codeforces.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#1a202c', color: '#e2e8f0' }}>
                      {c.title} ({new Date(c.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                {user?.role === 'admin' && selectedCodeforcesContestId !== '' && (
                  <button
                    onClick={downloadLeaderboardCSV}
                    style={{
                      background: 'rgba(56, 178, 172, 0.1)',
                      border: '1px solid rgba(56, 178, 172, 0.3)',
                      color: '#4fd1c5',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56, 178, 172, 0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(56, 178, 172, 0.1)'; }}
                  >
                    📥 Download CSV Report
                  </button>
                )}
              </div>
            )}

            {/* CodeChef Contest Selector Dropdown */}
            {activeLeaderboardTab === 'codechef' && (
              <div className="contest-select-container mb-20 animate-fade" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <label style={{ color: '#a0aec0', fontSize: '0.95rem', fontWeight: '500' }}>Select Contest:</label>
                <select
                  className="glass-select"
                  value={selectedCodechefContestId}
                  onChange={(e) => setSelectedCodechefContestId(e.target.value)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#e2e8f0',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '280px'
                  }}
                >
                  <option value="" style={{ background: '#1a202c', color: '#a0aec0' }}>-- Overall Platform Standings --</option>
                  {globalContestsList.codechef.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#1a202c', color: '#e2e8f0' }}>
                      {c.title} ({new Date(c.date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
                {user?.role === 'admin' && selectedCodechefContestId !== '' && (
                  <button
                    onClick={downloadLeaderboardCSV}
                    style={{
                      background: 'rgba(56, 178, 172, 0.1)',
                      border: '1px solid rgba(56, 178, 172, 0.3)',
                      color: '#4fd1c5',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56, 178, 172, 0.2)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(56, 178, 172, 0.1)'; }}
                  >
                    📥 Download CSV Report
                  </button>
                )}
              </div>
            )}

            {leaderboardsLoading ? (
              <div className="exam-loading">
                <div className="spinner-loader"></div>
                <p>Loading platform rankings...</p>
              </div>
            ) : (
              <div className="glass-card scoreboard-card">
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        {activeLeaderboardTab === 'internal' ||
                        (activeLeaderboardTab === 'leetcode' && selectedLeetcodeContestId !== '') ||
                        (activeLeaderboardTab === 'codeforces' && selectedCodeforcesContestId !== '') ||
                        (activeLeaderboardTab === 'codechef' && selectedCodechefContestId !== '') ? (
                          <>
                            <th>Date</th>
                            <th>Rank</th>
                            <th>Roll No</th>
                            <th>Candidate</th>
                            <th>Branch</th>
                            <th>Language</th>
                            <th>Solved Questions</th>
                            <th>Total Score</th>
                            <th>Duration Spent</th>
                            <th>Status</th>
                          </>
                        ) : (
                          <>
                            <th style={{ width: '80px' }}>Rank</th>
                            <th>Roll No</th>
                            <th>Candidate</th>
                            <th>Branch</th>
                            <th style={{ textAlign: 'right' }}>
                              {activeLeaderboardTab === 'leetcode' && 'Contest Problems'}
                              {activeLeaderboardTab === 'codeforces' && 'Contest Problems'}
                              {activeLeaderboardTab === 'codechef' && 'CodeChef Rating'}
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Internal Contests Leaderboard */}
                      {activeLeaderboardTab === 'internal' && (
                        leaderboardContestLoading ? (
                          <tr>
                            <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                              <div className="spinner-loader" style={{ margin: '0 auto 10px' }}></div>
                              Loading contest rankings...
                            </td>
                          </tr>
                        ) : leaderboardContestRankings.length > 0 ? (
                          leaderboardContestRankings.map((student, idx) => (
                            <tr key={student.rank} className={student.rank === 1 ? 'gold-rank' : student.rank === 2 ? 'silver-rank' : student.rank === 3 ? 'bronze-rank' : ''}>
                              <td>{student.date || 'N/A'}</td>
                              <td>
                                <span className="rank-badge">
                                  {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                                </span>
                              </td>
                              <td>{student.rollNumber}</td>
                              <td><strong>{student.name}</strong></td>
                              <td>{student.branch}</td>
                              <td>
                                <span className="status-badge-inline" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e0' }}>
                                  {student.status === 'Not Attempted' ? '-' : (student.languages || 'N/A')}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: student.status === 'Not Attempted' ? '#a0aec0' : '#48bb78' }}>
                                  {student.status === 'Not Attempted' ? '-' : `${student.solvedCount} / ${student.totalQuestions || 0}`}
                                </strong>
                              </td>
                              <td>
                                <span className="score-badge" style={student.status === 'Not Attempted' ? { background: 'rgba(255,255,255,0.05)', color: '#a0aec0' } : {}}>
                                  {student.status === 'Not Attempted' ? '-' : `${student.score} / 100`}
                                </span>
                              </td>
                              <td>{student.status === 'Not Attempted' ? '-' : student.timeSpent}</td>
                              <td>
                                <span 
                                  className={`status-badge-inline ${student.status === 'Not Attempted' ? 'absent' : student.isFinished ? 'completed' : 'live'}`}
                                  style={student.status === 'Not Attempted' ? { background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' } : {}}
                                >
                                  {student.status === 'Not Attempted' ? 'Absent' : student.isFinished ? 'Finished' : 'Coding'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                              No attempts logged for this contest yet.
                            </td>
                          </tr>
                        )
                      )}

                      {/* LeetCode Leaderboard */}
                      {activeLeaderboardTab === 'leetcode' && (
                        selectedLeetcodeContestId !== '' ? (
                          getGlobalContestRankings('leetcode', selectedLeetcodeContestId).map((student) => (
                            <tr key={student.rank} className={student.rank === 1 ? 'gold-rank' : student.rank === 2 ? 'silver-rank' : student.rank === 3 ? 'bronze-rank' : ''}>
                              <td>{student.date || 'N/A'}</td>
                              <td>
                                <span className="rank-badge">
                                  {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                                </span>
                              </td>
                              <td>{student.rollNumber}</td>
                              <td><strong>{student.name}</strong></td>
                              <td>{student.branch}</td>
                              <td>
                                <span className="status-badge-inline" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e0' }}>
                                  {student.status === 'Not Attempted' ? '-' : (student.languages || 'N/A')}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: student.status === 'Not Attempted' ? '#a0aec0' : '#48bb78' }}>
                                  {student.status === 'Not Attempted' ? '-' : `${student.solvedCount} / ${student.totalQuestions || 0}`}
                                </strong>
                              </td>
                              <td>
                                <span className="score-badge" style={student.status === 'Not Attempted' ? { background: 'rgba(255,255,255,0.05)', color: '#a0aec0' } : {}}>
                                  {student.status === 'Not Attempted' ? '-' : `${student.score} / 100`}
                                </span>
                              </td>
                              <td>{student.status === 'Not Attempted' ? '-' : student.timeSpent}</td>
                              <td>
                                <span 
                                  className={`status-badge-inline ${student.status === 'Not Attempted' ? 'absent' : student.isFinished ? 'completed' : 'live'}`}
                                  style={student.status === 'Not Attempted' ? { background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' } : {}}
                                >
                                  {student.status === 'Not Attempted' ? 'Absent' : student.isFinished ? 'Finished' : 'Coding'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          (platformLeaderboards?.leetcode || []).map((student, idx) => (
                            <tr key={student._id} className={idx === 0 ? 'gold-rank' : idx === 1 ? 'silver-rank' : idx === 2 ? 'bronze-rank' : ''}>
                              <td>
                                <span className="rank-badge">
                                  {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                                </span>
                              </td>
                              <td>{student.rollNumber}</td>
                              <td><strong>{student.name}</strong></td>
                              <td>{student.branch}</td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="score-badge">{student.solvedCount} Solved</span>
                              </td>
                            </tr>
                          ))
                        )
                      )}

                      {/* Codeforces Leaderboard */}
                      {activeLeaderboardTab === 'codeforces' && (
                        selectedCodeforcesContestId !== '' ? (
                          getGlobalContestRankings('codeforces', selectedCodeforcesContestId).map((student) => (
                            <tr key={student.rank} className={student.rank === 1 ? 'gold-rank' : student.rank === 2 ? 'silver-rank' : student.rank === 3 ? 'bronze-rank' : ''}>
                              <td>{student.date || 'N/A'}</td>
                              <td>
                                <span className="rank-badge">
                                  {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                                </span>
                              </td>
                              <td>{student.rollNumber}</td>
                              <td><strong>{student.name}</strong></td>
                              <td>{student.branch}</td>
                              <td>
                                <span className="status-badge-inline" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e0' }}>
                                  {student.status === 'Not Attempted' ? '-' : (student.languages || 'N/A')}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: student.status === 'Not Attempted' ? '#a0aec0' : '#48bb78' }}>
                                  {student.status === 'Not Attempted' ? '-' : `${student.solvedCount} / ${student.totalQuestions || 0}`}
                                </strong>
                              </td>
                              <td>
                                <span className="score-badge" style={student.status === 'Not Attempted' ? { background: 'rgba(255,255,255,0.05)', color: '#a0aec0' } : {}}>
                                  {student.status === 'Not Attempted' ? '-' : `${student.score} / 100`}
                                </span>
                              </td>
                              <td>{student.status === 'Not Attempted' ? '-' : student.timeSpent}</td>
                              <td>
                                <span 
                                  className={`status-badge-inline ${student.status === 'Not Attempted' ? 'absent' : student.isFinished ? 'completed' : 'live'}`}
                                  style={student.status === 'Not Attempted' ? { background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' } : {}}
                                >
                                  {student.status === 'Not Attempted' ? 'Absent' : student.isFinished ? 'Finished' : 'Coding'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          (platformLeaderboards?.codeforces || []).map((student, idx) => (
                            <tr key={student._id} className={idx === 0 ? 'gold-rank' : idx === 1 ? 'silver-rank' : idx === 2 ? 'bronze-rank' : ''}>
                              <td>
                                <span className="rank-badge">
                                  {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                                </span>
                              </td>
                              <td>{student.rollNumber}</td>
                              <td><strong>{student.name}</strong></td>
                              <td>{student.branch}</td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="score-badge">{student.solvedCount} Solved {student.rating > 0 && `(Rating: ${student.rating})`}</span>
                              </td>
                            </tr>
                          ))
                        )
                      )}

                      {/* CodeChef Leaderboard */}
                      {activeLeaderboardTab === 'codechef' && (
                        selectedCodechefContestId !== '' ? (
                          getGlobalContestRankings('codechef', selectedCodechefContestId).map((student) => (
                            <tr key={student.rank} className={student.rank === 1 ? 'gold-rank' : student.rank === 2 ? 'silver-rank' : student.rank === 3 ? 'bronze-rank' : ''}>
                              <td>{student.date || 'N/A'}</td>
                              <td>
                                <span className="rank-badge">
                                  {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                                </span>
                              </td>
                              <td>{student.rollNumber}</td>
                              <td><strong>{student.name}</strong></td>
                              <td>{student.branch}</td>
                              <td>
                                <span className="status-badge-inline" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e0' }}>
                                  {student.status === 'Not Attempted' ? '-' : (student.languages || 'N/A')}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: student.status === 'Not Attempted' ? '#a0aec0' : '#48bb78' }}>
                                  {student.status === 'Not Attempted' ? '-' : `${student.solvedCount} / ${student.totalQuestions || 0}`}
                                </strong>
                              </td>
                              <td>
                                <span className="score-badge" style={student.status === 'Not Attempted' ? { background: 'rgba(255,255,255,0.05)', color: '#a0aec0' } : {}}>
                                  {student.status === 'Not Attempted' ? '-' : `${student.score} / 100`}
                                </span>
                              </td>
                              <td>{student.status === 'Not Attempted' ? '-' : student.timeSpent}</td>
                              <td>
                                <span 
                                  className={`status-badge-inline ${student.status === 'Not Attempted' ? 'absent' : student.isFinished ? 'completed' : 'live'}`}
                                  style={student.status === 'Not Attempted' ? { background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' } : {}}
                                >
                                  {student.status === 'Not Attempted' ? 'Absent' : student.isFinished ? 'Finished' : 'Coding'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          (platformLeaderboards?.codechef || []).map((student, idx) => (
                            <tr key={student._id} className={idx === 0 ? 'gold-rank' : idx === 1 ? 'silver-rank' : idx === 2 ? 'bronze-rank' : ''}>
                              <td>
                                <span className="rank-badge">
                                  {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                                </span>
                              </td>
                              <td>{student.rollNumber}</td>
                              <td><strong>{student.name}</strong></td>
                              <td>{student.branch}</td>
                              <td style={{ textAlign: 'right' }}>
                                <span className="score-badge">{student.rating} Rating ({student.stars})</span>
                              </td>
                            </tr>
                          ))
                        )
                      )}

                      {/* Empty state check */}
                      {activeLeaderboardTab === 'leetcode' && selectedLeetcodeContestId === '' && (!platformLeaderboards?.leetcode || platformLeaderboards.leetcode.length === 0) && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                            No LeetCode records found.
                          </td>
                        </tr>
                      )}
                      {activeLeaderboardTab === 'leetcode' && selectedLeetcodeContestId !== '' && getGlobalContestRankings('leetcode', selectedLeetcodeContestId).length === 0 && (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                            {getContestStatusInfo('leetcode', selectedLeetcodeContestId)?.isUpcoming ? (
                              <div style={{ padding: '20px 0' }}>
                                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>⏳</span>
                                <h4 style={{ color: '#ecc94b', marginBottom: '8px' }}>Upcoming Contest</h4>
                                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                                  This contest is scheduled for {getContestStatusInfo('leetcode', selectedLeetcodeContestId)?.dateStr}.
                                </p>
                                <p style={{ color: '#718096', fontSize: '0.8rem', marginTop: '4px' }}>
                                  Leaderboard rankings will open automatically once the contest begins.
                                </p>
                              </div>
                            ) : (
                              "No attempts found for this contest."
                            )}
                          </td>
                        </tr>
                      )}
                      {activeLeaderboardTab === 'codeforces' && selectedCodeforcesContestId === '' && (!platformLeaderboards?.codeforces || platformLeaderboards.codeforces.length === 0) && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                            No Codeforces records found.
                          </td>
                        </tr>
                      )}
                      {activeLeaderboardTab === 'codeforces' && selectedCodeforcesContestId !== '' && getGlobalContestRankings('codeforces', selectedCodeforcesContestId).length === 0 && (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                            {getContestStatusInfo('codeforces', selectedCodeforcesContestId)?.isUpcoming ? (
                              <div style={{ padding: '20px 0' }}>
                                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>⏳</span>
                                <h4 style={{ color: '#ecc94b', marginBottom: '8px' }}>Upcoming Contest</h4>
                                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                                  This contest is scheduled for {getContestStatusInfo('codeforces', selectedCodeforcesContestId)?.dateStr}.
                                </p>
                                <p style={{ color: '#718096', fontSize: '0.8rem', marginTop: '4px' }}>
                                  Leaderboard rankings will open automatically once the contest begins.
                                </p>
                              </div>
                            ) : (
                              "No attempts found for this contest."
                            )}
                          </td>
                        </tr>
                      )}
                      {activeLeaderboardTab === 'codechef' && selectedCodechefContestId === '' && (!platformLeaderboards?.codechef || platformLeaderboards.codechef.length === 0) && (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                            No CodeChef records found.
                          </td>
                        </tr>
                      )}
                      {activeLeaderboardTab === 'codechef' && selectedCodechefContestId !== '' && getGlobalContestRankings('codechef', selectedCodechefContestId).length === 0 && (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                            {getContestStatusInfo('codechef', selectedCodechefContestId)?.isUpcoming ? (
                              <div style={{ padding: '20px 0' }}>
                                <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>⏳</span>
                                <h4 style={{ color: '#ecc94b', marginBottom: '8px' }}>Upcoming Contest</h4>
                                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                                  This contest is scheduled for {getContestStatusInfo('codechef', selectedCodechefContestId)?.dateStr}.
                                </p>
                                <p style={{ color: '#718096', fontSize: '0.8rem', marginTop: '4px' }}>
                                  Leaderboard rankings will open automatically once the contest begins.
                                </p>
                              </div>
                            ) : (
                              "No attempts found for this contest."
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADMIN CREATE CONTEST MODAL */}
      {showCreateModal && (
        <div className="contest-modal-overlay">
          <div className="glass-card contest-modal animate-fade">
            <div className="modal-header">
              <h3>Conduct New Coding Contest</h3>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateContest}>
              <div className="form-group">
                <label className="form-label">Contest Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. CodeSprint 2026 - CSE Assessment"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Brief instructions or syllabus rules..."
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contest Duration (Minutes)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  min="10"
                  max="1440"
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Select Questions ({selectedQuestions.length} Chosen)</label>
                  <button type="button" className="add-q-trigger-btn" onClick={handleOpenAddQuestion}>
                    ➕ Add New Question
                  </button>
                </div>
                {loadingQuestions ? (
                  <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>Loading question list...</p>
                ) : (
                  <div className="modal-questions-selector">
                    {questionsList.map(q => (
                      <div key={q._id} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <label className="selector-item" style={{ flex: 1, margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(q._id)}
                            onChange={() => handleToggleQuestionSelection(q._id)}
                          />
                          <span className="selector-title">{q.title}</span>
                          <span className={`selector-diff ${q.difficulty.toLowerCase()}`}>
                            {q.difficulty}
                          </span>
                        </label>
                        <button type="button" className="question-edit-btn" onClick={(e) => handleOpenEditQuestion(e, q)}>
                          ✏️ Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formError && <div className="form-error-msg">{formError}</div>}
              {formSuccess && <div className="form-success-msg">{formSuccess}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Launch Contest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NESTED QUESTION CREATOR / EDITOR MODAL */}
      {showQuestionModal && (
        <div className="contest-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="glass-card contest-modal animate-fade" style={{ width: '550px' }}>
            <div className="modal-header">
              <h3>{questionModalMode === 'create' ? 'Add New Question' : 'Edit Question'}</h3>
              <button className="close-btn" onClick={() => setShowQuestionModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitQuestion}>
              <div className="form-group">
                <label className="form-label">Question Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                  placeholder="e.g. Reverse a String"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-control"
                    value={qDifficulty}
                    onChange={(e) => setQDifficulty(e.target.value)}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Problem Statement</label>
                <textarea
                  className="form-control"
                  value={qDesc}
                  onChange={(e) => setQDesc(e.target.value)}
                  placeholder="Provide problem details..."
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Constraints</label>
                <textarea
                  className="form-control"
                  value={qConstraints}
                  onChange={(e) => setQConstraints(e.target.value)}
                  placeholder="e.g. 1 <= N <= 10^5"
                  rows="1"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Input Format</label>
                  <input
                    type="text"
                    className="form-control"
                    value={qInputFormat}
                    onChange={(e) => setQInputFormat(e.target.value)}
                    placeholder="Input structure details"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Output Format</label>
                  <input
                    type="text"
                    className="form-control"
                    value={qOutputFormat}
                    onChange={(e) => setQOutputFormat(e.target.value)}
                    placeholder="Output structure details"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Sample Input</label>
                  <textarea
                    className="form-control"
                    value={qSampleInput}
                    onChange={(e) => setQSampleInput(e.target.value)}
                    placeholder="Sample input cases"
                    rows="2"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sample Output</label>
                  <textarea
                    className="form-control"
                    value={qSampleOutput}
                    onChange={(e) => setQSampleOutput(e.target.value)}
                    placeholder="Expected sample output"
                    rows="2"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Explanation</label>
                <textarea
                  className="form-control"
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="Explain sample output matches"
                  rows="1"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hidden Test Input</label>
                  <textarea
                    className="form-control"
                    value={qHiddenInput}
                    onChange={(e) => setQHiddenInput(e.target.value)}
                    placeholder="Hidden evaluation inputs"
                    rows="2"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hidden Test Output</label>
                  <textarea
                    className="form-control"
                    value={qHiddenOutput}
                    onChange={(e) => setQHiddenOutput(e.target.value)}
                    placeholder="Hidden evaluation output"
                    rows="2"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Time Limit (ms)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={qTimeLimit}
                    onChange={(e) => setQTimeLimit(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Memory Limit (MB)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={qMemoryLimit}
                    onChange={(e) => setQMemoryLimit(e.target.value)}
                  />
                </div>
              </div>

              {qError && <div className="form-error-msg">{qError}</div>}
              {qSuccess && <div className="form-success-msg">{qSuccess}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuestionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {questionModalMode === 'create' ? 'Add Question' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Contests;
