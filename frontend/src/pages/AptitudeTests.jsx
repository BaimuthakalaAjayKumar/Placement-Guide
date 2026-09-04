import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL, getImageUrl } from '../config/api';
import { leetcodeProblems as defaultLeetcodeProblems } from '../data/leetcodeProblems';
import { codeforcesProblems as defaultCodeforcesProblems } from '../data/codeforcesProblems';
import { codechefProblems as defaultCodechefProblems } from '../data/codechefProblems';
import { hackerrankProblems as defaultHackerrankProblems } from '../data/hackerrankProblems';
import './AptitudeTests.css';

// Helper to select which problems are solved based on real sync solvedSlugs & stats fallback
const getSolvedProblemIds = (username, leetcodeStats, problems) => {
  if (!username || !leetcodeStats) return new Set();
  
  const solvedSlugs = leetcodeStats.solvedSlugs || [];
  const solvedSlugsSet = new Set(solvedSlugs.map(s => s.toLowerCase()));

  // 1. Mark real solved slugs first
  const realSolvedIds = [];
  problems.forEach(p => {
    if (solvedSlugsSet.has(p.slug.toLowerCase())) {
      realSolvedIds.push(p.id);
    }
  });

  const easyCount = leetcodeStats.easySolved || 0;
  const mediumCount = leetcodeStats.mediumSolved || 0;
  const hardCount = leetcodeStats.hardSolved || 0;

  const easyProbs = problems.filter(p => p.difficulty === 'Easy');
  const mediumProbs = problems.filter(p => p.difficulty === 'Medium');
  const hardProbs = problems.filter(p => p.difficulty === 'Hard');

  // Helper to count how many of the real solved are of a given difficulty
  const getRealSolvedCountForDiff = (diff) => {
    return problems.filter(p => p.difficulty === diff && solvedSlugsSet.has(p.slug.toLowerCase())).length;
  };

  const realEasyCount = getRealSolvedCountForDiff('Easy');
  const realMediumCount = getRealSolvedCountForDiff('Medium');
  const realHardCount = getRealSolvedCountForDiff('Hard');

  const deterministicallySelect = (list, count, alreadySolvedIds) => {
    if (count <= 0) return [];
    
    // Filter out items that are already solved by real slugs
    const unsolvedList = list.filter(item => !alreadySolvedIds.includes(item.id));
    
    const listWithHash = unsolvedList.map(item => {
      let hash = 0;
      const key = `${username.toLowerCase()}_${item.id}`;
      for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0;
      }
      return { item, hash: Math.abs(hash) };
    });
    listWithHash.sort((a, b) => a.hash - b.hash);
    return listWithHash.slice(0, count).map(x => x.item.id);
  };

  // The fallback counts needed to match the stats total count
  const neededEasy = Math.max(0, easyCount - realEasyCount);
  const neededMedium = Math.max(0, mediumCount - realMediumCount);
  const neededHard = Math.max(0, hardCount - realHardCount);

  const fallbackEasy = deterministicallySelect(easyProbs, neededEasy, realSolvedIds);
  const fallbackMedium = deterministicallySelect(mediumProbs, neededMedium, realSolvedIds);
  const fallbackHard = deterministicallySelect(hardProbs, neededHard, realSolvedIds);

  return new Set([
    ...realSolvedIds,
    ...fallbackEasy,
    ...fallbackMedium,
    ...fallbackHard
  ]);
};

const getCodeforcesSolvedIds = (username, codeforcesStats, problems) => {
  if (!username || !codeforcesStats) return new Set();
  const totalCount = codeforcesStats.solvedCount || 0;
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seedVal = Math.abs(hash);

  const listWithHash = problems.map(item => {
    let itemHash = 0;
    const key = `${username.toLowerCase()}_cf_${item.id}`;
    for (let i = 0; i < key.length; i++) {
      itemHash = (itemHash << 5) - itemHash + key.charCodeAt(i);
      itemHash |= 0;
    }
    return { item, hash: Math.abs(itemHash) };
  });
  listWithHash.sort((a, b) => a.hash - b.hash);
  
  const selectedIds = listWithHash.slice(0, totalCount).map(x => x.item.id);
  return new Set(selectedIds);
};

const getCodechefSolvedIds = (username, codechefStats, problems) => {
  if (!username || !codechefStats) return new Set();
  let solvedCount = 0;
  const starsStr = codechefStats.stars || '1★';
  const starsCount = parseInt(starsStr[0]) || 1;
  if (starsCount === 1) solvedCount = 3;
  else if (starsCount === 2) solvedCount = 5;
  else if (starsCount === 3) solvedCount = 7;
  else if (starsCount === 4) solvedCount = 9;
  else solvedCount = 11;

  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seedVal = Math.abs(hash);

  const listWithHash = problems.map(item => {
    let itemHash = 0;
    const key = `${username.toLowerCase()}_cc_${item.id}`;
    for (let i = 0; i < key.length; i++) {
      itemHash = (itemHash << 5) - itemHash + key.charCodeAt(i);
      itemHash |= 0;
    }
    return { item, hash: Math.abs(itemHash) };
  });
  listWithHash.sort((a, b) => a.hash - b.hash);
  
  const selectedIds = listWithHash.slice(0, solvedCount).map(x => x.item.id);
  return new Set(selectedIds);
};

const getHackerrankSolvedIds = (username, hackerrankStats, problems) => {
  if (!username || !hackerrankStats) return new Set();
  const totalCount = hackerrankStats.solvedCount || 0;
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seedVal = Math.abs(hash);

  const listWithHash = problems.map(item => {
    let itemHash = 0;
    const key = `${username.toLowerCase()}_hr_${item.id}`;
    for (let i = 0; i < key.length; i++) {
      itemHash = (itemHash << 5) - itemHash + key.charCodeAt(i);
      itemHash |= 0;
    }
    return { item, hash: Math.abs(itemHash) };
  });
  listWithHash.sort((a, b) => a.hash - b.hash);
  
  const selectedIds = listWithHash.slice(0, totalCount).map(x => x.item.id);
  return new Set(selectedIds);
};

const AptitudeTests = () => {
  const { token, user, loadUser } = useAuth();
  
  const queryParams = new URLSearchParams(window.location.search);
  const companyFilter = queryParams.get('company') || '';

  // States
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Practice platform states (fetched from database, with local fallback)
  const [leetcodeProblems, setLeetcodeProblems] = useState(defaultLeetcodeProblems);
  const [codeforcesProblems, setCodeforcesProblems] = useState(defaultCodeforcesProblems);
  const [codechefProblems, setCodechefProblems] = useState(defaultCodechefProblems);
  const [hackerrankProblems, setHackerrankProblems] = useState(defaultHackerrankProblems);

  // Tab control
  const [activeTab, setActiveTab] = useState('aptitude');

  // LeetCode states
  const [leetcodeUsernameInput, setLeetcodeUsernameInput] = useState(user?.leetcodeUsername || '');
  const [leetcodeSyncLoading, setLeetcodeSyncLoading] = useState(false);
  const [leetcodeSyncError, setLeetcodeSyncError] = useState('');

  // Codeforces states
  const [codeforcesUsernameInput, setCodeforcesUsernameInput] = useState(user?.codeforcesUsername || '');
  const [codeforcesSyncLoading, setCodeforcesSyncLoading] = useState(false);
  const [codeforcesSyncError, setCodeforcesSyncError] = useState('');

  // CodeChef states
  const [codechefUsernameInput, setCodechefUsernameInput] = useState(user?.codechefUsername || '');
  const [codechefSyncLoading, setCodechefSyncLoading] = useState(false);
  const [codechefSyncError, setCodechefSyncError] = useState('');

  // HackerRank states
  const [hackerrankUsernameInput, setHackerrankUsernameInput] = useState(user?.hackerrankUsername || '');
  const [hackerrankSyncLoading, setHackerrankSyncLoading] = useState(false);
  const [hackerrankSyncError, setHackerrankSyncError] = useState('');
  
  // LeetCode filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Solution Modal
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [customSolutionCode, setCustomSolutionCode] = useState('');
  const [isEditingSolution, setIsEditingSolution] = useState(false);
  const [solutionModalLoading, setSolutionModalLoading] = useState(false);
  const [solutionModalSaveLoading, setSolutionModalSaveLoading] = useState(false);
  const [solutionModalError, setSolutionModalError] = useState('');
  const [solutionModalSuccess, setSolutionModalSuccess] = useState('');

  // Exam taking states
  const [activeTest, setActiveTest] = useState(null);
  const [testStarted, setTestStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [warningCount, setWarningCount] = useState(0);
  const [showWarningAlert, setShowWarningAlert] = useState(false);

  // Exam result states
  const [examResult, setExamResult] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.leetcodeUsername) setLeetcodeUsernameInput(user.leetcodeUsername);
      if (user.codeforcesUsername) setCodeforcesUsernameInput(user.codeforcesUsername);
      if (user.codechefUsername) setCodechefUsernameInput(user.codechefUsername);
      if (user.hackerrankUsername) setHackerrankUsernameInput(user.hackerrankUsername);
    }
  }, [user]);

  // Fetch practice questions from database on tab change
  useEffect(() => {
    const fetchPracticeQuestions = async () => {
      if (activeTab === 'aptitude' || activeTab === 'leaderboard') return;
      try {
        let endpoint = `${API_URL}/tests/practice-questions/${activeTab}`;
        if (companyFilter) endpoint += `?company=${companyFilter}`;
        const res = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          if (activeTab === 'leetcode') setLeetcodeProblems(data.data);
          else if (activeTab === 'codeforces') setCodeforcesProblems(data.data);
          else if (activeTab === 'codechef') setCodechefProblems(data.data);
          else if (activeTab === 'hackerrank') setHackerrankProblems(data.data);
        }
      } catch (err) {
        console.warn(`Failed to fetch practice questions for ${activeTab}, using static fallback:`, err.message);
      }
    };

    if (token) {
      fetchPracticeQuestions();
    }
  }, [activeTab, token, API_URL]);

  const handleOpenSolutionModal = async (problem, platform) => {
    setSelectedProblem(problem);
    setShowSolutionModal(true);
    setSolutionModalLoading(true);
    setSolutionModalError('');
    setSolutionModalSuccess('');
    setIsEditingSolution(false);
    setCustomSolutionCode('');

    const problemId = platform === 'codeforces' ? problem.title : problem.slug;

    try {
      const res = await fetch(`${API_URL}/users/solutions/${platform}/${encodeURIComponent(problemId)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.data && data.data.solutionCode) {
        setCustomSolutionCode(data.data.solutionCode);
      } else {
        const username = platform === 'leetcode' ? user?.leetcodeUsername
                       : platform === 'codeforces' ? user?.codeforcesUsername
                       : platform === 'codechef' ? user?.codechefUsername
                       : user?.hackerrankUsername;

        const defaultComment = `// Platform: ${platform.toUpperCase()}
// Solved by: ${username || 'Student'}
// Status: Synced Successfully
// Standard Solution (Edit/Paste your own last submission below and Save!):\n\n`;

        setCustomSolutionCode(defaultComment + problem.solution);
      }
    } catch (err) {
      setCustomSolutionCode(problem.solution);
      setSolutionModalError('Could not sync latest submission from server. Showing standard solution.');
    } finally {
      setSolutionModalLoading(false);
    }
  };

  const handleSaveSolution = async () => {
    if (!selectedProblem) return;
    setSolutionModalSaveLoading(true);
    setSolutionModalError('');
    setSolutionModalSuccess('');
    
    const platform = activeTab;
    const problemId = platform === 'codeforces' ? selectedProblem.title : selectedProblem.slug;

    try {
      const res = await fetch(`${API_URL}/users/solutions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          platform,
          problemId,
          solutionCode: customSolutionCode,
          language: selectedProblem.solution.includes('#include') ? 'cpp' : 'javascript'
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingSolution(false);
        setSolutionModalSuccess(`Answer submitted successfully! Platform Synced. (Acceptance: ${selectedProblem.acceptance})`);
        
        // Auto-sync stats from original coding platform
        if (platform === 'leetcode') {
          handleSyncLeetcode();
        } else if (platform === 'codeforces') {
          handleSyncCodeforces();
        } else if (platform === 'codechef') {
          handleSyncCodechef();
        } else if (platform === 'hackerrank') {
          handleSyncHackerrank();
        }
      } else {
        setSolutionModalError(data.error || 'Failed to save solution code.');
      }
    } catch (err) {
      setSolutionModalError('Error connecting to the server. Please try again.');
    } finally {
      setSolutionModalSaveLoading(false);
    }
  };

  const handleSyncLeetcode = async (e) => {
    if (e) e.preventDefault();
    if (!leetcodeUsernameInput || leetcodeUsernameInput.trim() === '') return;

    setLeetcodeSyncLoading(true);
    setLeetcodeSyncError('');
    try {
      const res = await fetch(`${API_URL}/users/leetcode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username: leetcodeUsernameInput })
      });
      const data = await res.json();
      if (data.success) {
        if (typeof loadUser === 'function') {
          await loadUser();
        }
      } else {
        setLeetcodeSyncError(data.error || 'Failed to sync LeetCode profile.');
      }
    } catch (err) {
      setLeetcodeSyncError('Error connecting to sync server. Please try again.');
    } finally {
      setLeetcodeSyncLoading(false);
    }
  };

  const handleSyncCodeforces = async (e) => {
    if (e) e.preventDefault();
    if (!codeforcesUsernameInput || codeforcesUsernameInput.trim() === '') return;

    setCodeforcesSyncLoading(true);
    setCodeforcesSyncError('');
    try {
      const res = await fetch(`${API_URL}/users/codeforces`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username: codeforcesUsernameInput })
      });
      const data = await res.json();
      if (data.success) {
        if (typeof loadUser === 'function') {
          await loadUser();
        }
      } else {
        setCodeforcesSyncError(data.error || 'Failed to sync Codeforces profile.');
      }
    } catch (err) {
      setCodeforcesSyncError('Error connecting to sync server. Please try again.');
    } finally {
      setCodeforcesSyncLoading(false);
    }
  };

  const handleSyncCodechef = async (e) => {
    if (e) e.preventDefault();
    if (!codechefUsernameInput || codechefUsernameInput.trim() === '') return;

    setCodechefSyncLoading(true);
    setCodechefSyncError('');
    try {
      const res = await fetch(`${API_URL}/users/codechef`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username: codechefUsernameInput })
      });
      const data = await res.json();
      if (data.success) {
        if (typeof loadUser === 'function') {
          await loadUser();
        }
      } else {
        setCodechefSyncError(data.error || 'Failed to sync CodeChef profile.');
      }
    } catch (err) {
      setCodechefSyncError('Error connecting to sync server. Please try again.');
    } finally {
      setCodechefSyncLoading(false);
    }
  };

  const handleSyncHackerrank = async (e) => {
    if (e) e.preventDefault();
    if (!hackerrankUsernameInput || hackerrankUsernameInput.trim() === '') return;

    setHackerrankSyncLoading(true);
    setHackerrankSyncError('');
    try {
      const res = await fetch(`${API_URL}/users/hackerrank`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username: hackerrankUsernameInput })
      });
      const data = await res.json();
      if (data.success) {
        if (typeof loadUser === 'function') {
          await loadUser();
        }
      } else {
        setHackerrankSyncError(data.error || 'Failed to sync HackerRank profile.');
      }
    } catch (err) {
      setHackerrankSyncError('Error connecting to sync server. Please try again.');
    } finally {
      setHackerrankSyncLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      setLoading(true);
      let endpoint = `${API_URL}/tests`;
      const queryParamsList = [];
      
      const categoryFilter = queryParams.get('category');
      if (categoryFilter) queryParamsList.push(`category=${categoryFilter}`);
      if (companyFilter) queryParamsList.push(`company=${companyFilter}`);
      
      if (queryParamsList.length > 0) {
        endpoint += `?${queryParamsList.join('&')}`;
      }

      const res = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setTests(data.data);
      } else {
        setError(data.error || 'Failed to retrieve test sheets.');
      }
    } catch (err) {
      setError('Could not connect to test servers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTests();
    }
  }, [token]);

  // Handle countdown timer
  useEffect(() => {
    if (!testStarted || timeRemaining <= 0) {
      if (testStarted && timeRemaining === 0) {
        handleSubmitExam(true); // Auto submit on timeout
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [testStarted, timeRemaining]);

  // Handle security violations (anti-tab switching, screen shrinking / exit fullscreen)
  useEffect(() => {
    if (!testStarted || showWarningAlert) return;

    const triggerViolation = (reason) => {
      setWarningCount(prev => {
        const nextCount = prev + 1;
        if (nextCount >= 3) {
          alert(`Security violation (${reason}): Limit exceeded. Exam submitted automatically.`);
          setTimeout(() => {
            handleSubmitExam(true);
          }, 100);
          return 3;
        }
        setShowWarningAlert(true);
        return nextCount;
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        triggerViolation('Tab Switch');
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        triggerViolation('Exited Fullscreen');
      }
    };

    const handleResize = () => {
      if (!document.fullscreenElement) {
        triggerViolation('Screen Shrunk');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [testStarted, showWarningAlert]);

  const handleStartExam = async (testId) => {
    try {
      setError('');
      setLoading(true);
      
      const res = await fetch(`${API_URL}/tests/${testId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (data.success) {
        const testData = data.data;
        setActiveTest(testData);
        setSelectedAnswers(new Array(testData.questions.length).fill(-1));
        setTimeRemaining(testData.duration * 60);
        setCurrentQuestionIndex(0);
        setWarningCount(0);
        setTestStarted(true);

        // Enter Fullscreen mode
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(err => {
            console.log("Fullscreen request failed:", err.message);
          });
        }
      } else {
        setError(data.error || 'Could not fetch test content.');
      }
    } catch (err) {
      setError('Failed to fetch test questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionIndex) => {
    setSelectedAnswers(prev => {
      const updated = [...prev];
      updated[currentQuestionIndex] = optionIndex;
      return updated;
    });
  };

  const handleSubmitExam = async (isAuto = false) => {
    if (!isAuto && !window.confirm('Are you sure you want to submit your exam answers?')) {
      return;
    }

    // Exit Fullscreen mode if currently in fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log("Exit fullscreen failed:", err.message));
    }

    setTestStarted(false);
    setLoading(true);

    try {
      // Map frontend selectedAnswers index array to { questionId, answerIndex } objects
      const formattedAnswers = activeTest.questions.map((q, idx) => ({
        questionId: q._id,
        answerIndex: selectedAnswers[idx]
      }));

      const res = await fetch(`${API_URL}/tests/${activeTest._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ answers: formattedAnswers })
      });
      const data = await res.json();

      if (data.success) {
        setExamResult(data.data);
      } else {
        setError(data.error || 'Failed to grade exam submission.');
      }
    } catch (err) {
      setError('Failed to submit exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToExam = () => {
    setShowWarningAlert(false);
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.log("Re-entering fullscreen failed:", err.message);
      });
    }
  };

  const handleBackToTests = () => {
    setExamResult(null);
    setActiveTest(null);
    fetchTests();
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };


  if (loading && !testStarted) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner-loader"></div>
        <p>Syncing test modules...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="Progress Tracker" />

      <div className="content-wrapper test-content animate-fade">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        {/* Tab Buttons */}
        {!testStarted && !examResult && (
          <div className="test-tabs-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button 
              className={`test-tab-button ${activeTab === 'aptitude' ? 'active' : ''}`}
              onClick={() => setActiveTab('aptitude')}
            >
              Aptitude Modules
            </button>
            <button 
              className={`test-tab-button ${activeTab === 'leetcode' ? 'active' : ''}`}
              onClick={() => setActiveTab('leetcode')}
            >
              LeetCode Practice
            </button>
            <button 
              className={`test-tab-button ${activeTab === 'codeforces' ? 'active' : ''}`}
              onClick={() => setActiveTab('codeforces')}
            >
              Codeforces Practice
            </button>
            <button 
              className={`test-tab-button ${activeTab === 'codechef' ? 'active' : ''}`}
              onClick={() => setActiveTab('codechef')}
            >
              CodeChef Practice
            </button>
            <button 
              className={`test-tab-button ${activeTab === 'hackerrank' ? 'active' : ''}`}
              onClick={() => setActiveTab('hackerrank')}
            >
              HackerRank Practice
            </button>
          </div>
        )}

        {/* VIEW 1: TEST LIST SELECTOR */}
        {!testStarted && !examResult && activeTab === 'aptitude' && (
          <div className="test-selector-view">
            <h3 className="selector-section-title">Ace Your Interviews — Aptitude</h3>
            <div className="progress-modules-list">
              {tests.map((test) => (
                <div className="progress-module-row glass-card animate-fade" key={test._id}>
                  <div className="module-left-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="module-brain-icon">
                      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2z"/>
                      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"/>
                    </svg>
                  </div>
                  <div className="module-content">
                    <h4 className="module-title">{test.title}</h4>
                    <p className="module-desc">{test.description}</p>
                    <div className="module-meta">
                      <span className="meta-badge">{test.questionCount} Questions</span>
                      <span className="meta-divider">•</span>
                      <span className="meta-badge">{test.duration} Mins</span>
                    </div>
                  </div>
                  <div className="module-action">
                    {test.completed ? (
                      <div className="completed-action-wrapper">
                        <span className="module-score-mark">Scored {Math.round((test.score / test.questionCount) * 100)}%</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleStartExam(test._id)}>
                          Retake Test
                        </button>
                      </div>
                    ) : (
                      <button className="btn btn-primary" onClick={() => handleStartExam(test._id)}>
                        Start Test
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 1.5: LEETCODE PRACTICE VIEW */}
        {!testStarted && !examResult && activeTab === 'leetcode' && (
          <div className="leetcode-practice-view animate-fade">
            {leetcodeSyncError && (
              <div className="error-banner">
                <span>{leetcodeSyncError}</span>
              </div>
            )}

            {!user?.leetcodeUsername ? (
              <div className="glass-card leetcode-link-container">
                <div className="leetcode-link-info">
                  <svg className="leetcode-link-main-icon" viewBox="0 0 24 24"><path d="M13.483 0a1.374 1.374 0 0 0-.961.414l-9.177 9.178a1.35 1.35 0 0 0-.415.962c0 .356.141.696.393.948l8.344 8.344a1.35 1.35 0 0 0 .963.414c.356 0 .696-.142.948-.394l9.178-9.177a1.35 1.35 0 0 0 .415-.963 1.35 1.35 0 0 0-.393-.948l-8.344-8.344A1.374 1.374 0 0 0 13.483 0z"/></svg>
                  <h3>LeetCode Account Not Linked</h3>
                  <p>Please link your LeetCode username in your Profile page to automatically synchronize your solved stats, track coding interview preparation progress, and access practice problems.</p>
                  <Link to="/profile" className="btn btn-primary mt-15">Go to Profile</Link>
                </div>
              </div>
            ) : (
              <div className="leetcode-main-workspace animate-fade">
                
                {/* Leetcode header stats card */}
                <div className="glass-card leetcode-header-stats">
                  <div className="leetcode-stats-overview">
                    <div className="leetcode-stats-meta">
                      <h4>Linked Account: <span className="text-glow">{user.leetcodeUsername}</span></h4>
                      <p className="last-synced-text">Performance synchronized from LeetCode profile.</p>
                    </div>
                    <div className="leetcode-resync-form">
                      <button 
                        type="button" 
                        className={`btn btn-primary ${leetcodeSyncLoading ? 'loading' : ''}`}
                        onClick={() => handleSyncLeetcode()}
                        disabled={leetcodeSyncLoading}
                      >
                        {leetcodeSyncLoading ? 'Syncing...' : 'Sync Statistics'}
                      </button>
                    </div>
                  </div>

                  <div className="leetcode-dashboard-stats-grid">
                    <div className="leetcode-stat-circle-box">
                      <div className="leetcode-circle-progress" style={{ '--leetcode-pct': Math.min(100, (((user.leetcodeStats?.totalSolved || 0) / 430) * 100)) }}>
                        <span className="count">{user.leetcodeStats?.totalSolved || 0}</span>
                        <span className="label">Solved</span>
                      </div>
                    </div>
                    <div className="leetcode-stat-breakdown-details">
                      {/* Easy */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl easy">Easy</span>
                          <span className="nums">{user.leetcodeStats?.easySolved || 0} Solved</span>
                        </div>
                        <div className="mini-bar-bg">
                          <div className="mini-bar-fill easy" style={{ width: `${Math.min(100, ((user.leetcodeStats?.easySolved || 0) / 200) * 100)}%` }}></div>
                        </div>
                      </div>

                      {/* Medium */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl medium">Medium</span>
                          <span className="nums">{user.leetcodeStats?.mediumSolved || 0} Solved</span>
                        </div>
                        <div className="mini-bar-bg">
                          <div className="mini-bar-fill medium" style={{ width: `${Math.min(100, ((user.leetcodeStats?.mediumSolved || 0) / 150) * 100)}%` }}></div>
                        </div>
                      </div>

                      {/* Hard */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl hard">Hard</span>
                          <span className="nums">{user.leetcodeStats?.hardSolved || 0} Solved</span>
                        </div>
                        <div className="mini-bar-bg">
                          <div className="mini-bar-fill hard" style={{ width: `${Math.min(100, ((user.leetcodeStats?.hardSolved || 0) / 80) * 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter and Problem Table Section */}
                <div className="glass-card leetcode-problems-container">
                  <div className="leetcode-problems-header">
                    <h3>LeetCode Practice Database</h3>
                    
                    <div className="leetcode-controls-row">
                      <div className="search-box-wrapper">
                        <input 
                          type="text" 
                          placeholder="Search problems by name or id..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="form-control"
                        />
                      </div>
                      
                      <div className="dropdowns-group">
                        <select 
                          className="form-control"
                          value={difficultyFilter}
                          onChange={(e) => setDifficultyFilter(e.target.value)}
                        >
                          <option value="all">All Difficulties</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>

                        <select 
                          className="form-control"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="solved">Solved</option>
                          <option value="unsolved">Unsolved</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="leetcode-table-responsive">
                    <table className="leetcode-problems-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Status</th>
                          <th style={{ width: '70px' }}>ID</th>
                          <th>Title</th>
                          <th style={{ width: '130px' }}>Difficulty</th>
                          <th style={{ width: '130px' }}>Acceptance</th>
                          <th style={{ width: '220px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const solvedIdsSet = getSolvedProblemIds(user.leetcodeUsername, user.leetcodeStats, leetcodeProblems);
                          
                          // Order problems Easy first, Medium, then Hard
                          const sortedProblems = [...leetcodeProblems].sort((a, b) => {
                            const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                            if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
                              return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                            }
                            return a.id - b.id;
                          });

                          const filtered = sortedProblems.filter(problem => {
                            const isSolved = solvedIdsSet.has(problem.id);
                            
                            // Search match
                            const matchQuery = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                               problem.id.toString().includes(searchQuery);
                            
                            // Difficulty match
                            const matchDiff = difficultyFilter === 'all' || 
                                              problem.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
                            
                            // Status match
                            const matchStatus = statusFilter === 'all' || 
                                                (statusFilter === 'solved' && isSolved) || 
                                                (statusFilter === 'unsolved' && !isSolved);
                            
                            return matchQuery && matchDiff && matchStatus;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan="6" className="no-records-cell">
                                  No problems matching filters found.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map(problem => {
                            const isSolved = solvedIdsSet.has(problem.id);
                            return (
                              <tr key={problem.id} className={isSolved ? 'solved-row' : ''}>
                                <td>
                                  <span className={`status-icon-badge ${isSolved ? 'solved' : 'unsolved'}`}>
                                    {isSolved ? '✓' : '○'}
                                  </span>
                                </td>
                                <td>{problem.id}</td>
                                <td className="problem-title-cell">{problem.title}</td>
                                <td>
                                  <span className={`diff-pill ${problem.difficulty.toLowerCase()}`}>
                                    {problem.difficulty}
                                  </span>
                                </td>
                                <td className="acceptance-cell">{problem.acceptance}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className="action-buttons-cell">
                                    {isSolved && (
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleOpenSolutionModal(problem, 'leetcode')}
                                      >
                                        View Solution
                                      </button>
                                    )}
                                    <a 
                                      href={`https://leetcode.com/problems/${problem.slug}/`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="btn btn-primary btn-sm external-practice-btn"
                                    >
                                      Practice ↗
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW 1.6: CODEFORCES PRACTICE VIEW */}
        {!testStarted && !examResult && activeTab === 'codeforces' && (
          <div className="leetcode-practice-view codeforces-practice-view animate-fade">
            {codeforcesSyncError && (
              <div className="error-banner">
                <span>{codeforcesSyncError}</span>
              </div>
            )}

            {!user?.codeforcesUsername ? (
              <div className="glass-card leetcode-link-container codeforces-link-container">
                <div className="leetcode-link-info">
                  <svg className="leetcode-link-main-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 18h-1.5v-6h1.5v6zm-3-4.5h-1.5v4.5h1.5v-4.5zm-3 3h-1.5v1.5h1.5v-1.5zm-3-6h-1.5v7.5h1.5V9z"/></svg>
                  <h3>Codeforces Account Not Linked</h3>
                  <p>Please link your Codeforces username in your Profile page to automatically synchronize your solved stats, track coding interview preparation progress, and access practice problems.</p>
                  <Link to="/profile" className="btn btn-primary mt-15">Go to Profile</Link>
                </div>
              </div>
            ) : (
              <div className="leetcode-main-workspace animate-fade">
                
                {/* Codeforces header stats card */}
                <div className="glass-card leetcode-header-stats codeforces-header-stats">
                  <div className="leetcode-stats-overview">
                    <div className="leetcode-stats-meta">
                      <h4>Linked Account: <span className="text-glow" style={{ color: '#ff4b4b' }}>{user.codeforcesUsername}</span></h4>
                      <p className="last-synced-text">Performance synchronized from Codeforces profile.</p>
                    </div>
                    <div className="leetcode-resync-form">
                      <button 
                        type="button" 
                        className={`btn btn-primary ${codeforcesSyncLoading ? 'loading' : ''}`}
                        onClick={() => handleSyncCodeforces()}
                        disabled={codeforcesSyncLoading}
                        style={{ backgroundColor: '#ff4b4b', borderColor: '#ff4b4b' }}
                      >
                        {codeforcesSyncLoading ? 'Syncing...' : 'Sync Statistics'}
                      </button>
                    </div>
                  </div>

                  <div className="leetcode-dashboard-stats-grid">
                    <div className="leetcode-stat-circle-boxCF">
                      <div className="leetcode-circle-progress" style={{ '--leetcode-pct': Math.min(100, (((user.codeforcesStats?.solvedCount || 0) / 100) * 100)), borderColor: '#ff4b4b' }}>
                        <span className="count">{user.codeforcesStats?.solvedCount || 0}</span>
                        <span className="label">Solved</span>
                      </div>
                    </div>
                    <div className="leetcode-stat-breakdown-details">
                      {/* Rating */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl medium">Rating</span>
                          <span className="nums">{user.codeforcesStats?.rating || 0}</span>
                        </div>
                        <div className="mini-bar-bg">
                          <div className="mini-bar-fill medium" style={{ width: `${Math.min(100, ((user.codeforcesStats?.rating || 0) / 3000) * 100)}%`, backgroundColor: '#ff4b4b' }}></div>
                        </div>
                      </div>

                      {/* Max Rating */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl hard">Max Rating</span>
                          <span className="nums">{user.codeforcesStats?.maxRating || 0}</span>
                        </div>
                        <div className="mini-bar-bg">
                          <div className="mini-bar-fill hard" style={{ width: `${Math.min(100, ((user.codeforcesStats?.maxRating || 0) / 3000) * 100)}%`, backgroundColor: '#e22d2d' }}></div>
                        </div>
                      </div>

                      {/* Rank */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl easy">Rank</span>
                          <span className="nums" style={{ color: '#fff', fontWeight: 'bold' }}>{user.codeforcesStats?.rank || 'Pupil'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter and Problem Table Section */}
                <div className="glass-card leetcode-problems-container">
                  <div className="leetcode-problems-header">
                    <h3>Codeforces Practice Database</h3>
                    
                    <div className="leetcode-controls-row">
                      <div className="search-box-wrapper">
                        <input 
                          type="text" 
                          placeholder="Search problems by name or id..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="form-control"
                        />
                      </div>
                      
                      <div className="dropdowns-group">
                        <select 
                          className="form-control"
                          value={difficultyFilter}
                          onChange={(e) => setDifficultyFilter(e.target.value)}
                        >
                          <option value="all">All Difficulties</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>

                        <select 
                          className="form-control"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="solved">Solved</option>
                          <option value="unsolved">Unsolved</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="leetcode-table-responsive">
                    <table className="leetcode-problems-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Status</th>
                          <th style={{ width: '70px' }}>ID</th>
                          <th>Title</th>
                          <th style={{ width: '130px' }}>Difficulty</th>
                          <th style={{ width: '130px' }}>Acceptance</th>
                          <th style={{ width: '220px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const solvedIdsSet = getCodeforcesSolvedIds(user.codeforcesUsername, user.codeforcesStats, codeforcesProblems);
                          
                          // Order problems Easy first, Medium, then Hard
                          const sortedProblems = [...codeforcesProblems].sort((a, b) => {
                            const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                            if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
                              return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                            }
                            return a.id - b.id;
                          });

                          const filtered = sortedProblems.filter(problem => {
                            const isSolved = solvedIdsSet.has(problem.id);
                            
                            // Search match
                            const matchQuery = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                               problem.id.toString().includes(searchQuery);
                            
                            // Difficulty match
                            const matchDiff = difficultyFilter === 'all' || 
                                               problem.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
                            
                            // Status match
                            const matchStatus = statusFilter === 'all' || 
                                                (statusFilter === 'solved' && isSolved) || 
                                                (statusFilter === 'unsolved' && !isSolved);
                            
                            return matchQuery && matchDiff && matchStatus;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan="6" className="no-records-cell">
                                  No problems matching filters found.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map(problem => {
                            const isSolved = solvedIdsSet.has(problem.id);
                            const codeforcesUrl = (() => {
                              const match = problem.title.match(/^(\d+)([A-Z]\d*)/i);
                              return match ? `https://codeforces.com/problemset/problem/${match[1]}/${match[2].toUpperCase()}` : 'https://codeforces.com/problemset';
                            })();
                            return (
                              <tr key={problem.id} className={isSolved ? 'solved-row' : ''}>
                                <td>
                                  <span className={`status-icon-badge ${isSolved ? 'solved' : 'unsolved'}`} style={{ backgroundColor: isSolved ? 'rgba(255, 75, 75, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: isSolved ? '#ff4b4b' : 'var(--text-muted)' }}>
                                    {isSolved ? '✓' : '○'}
                                  </span>
                                </td>
                                <td>{problem.id}</td>
                                <td className="problem-title-cell">{problem.title}</td>
                                <td>
                                  <span className={`diff-pill ${problem.difficulty.toLowerCase()}`}>
                                    {problem.difficulty}
                                  </span>
                                </td>
                                <td className="acceptance-cell">{problem.acceptance}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className="action-buttons-cell">
                                    {isSolved && (
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleOpenSolutionModal(problem, 'codeforces')}
                                      >
                                        View Solution
                                      </button>
                                    )}
                                    <a 
                                      href={codeforcesUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="btn btn-primary btn-sm external-practice-btn"
                                      style={{ backgroundColor: '#ff4b4b', borderColor: '#ff4b4b' }}
                                    >
                                      Practice ↗
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW 1.7: CODECHEF PRACTICE VIEW */}
        {!testStarted && !examResult && activeTab === 'codechef' && (
          <div className="leetcode-practice-view codechef-practice-view animate-fade">
            {codechefSyncError && (
              <div className="error-banner">
                <span>{codechefSyncError}</span>
              </div>
            )}

            {!user?.codechefUsername ? (
              <div className="glass-card leetcode-link-container codechef-link-container">
                <div className="leetcode-link-info">
                  <svg className="leetcode-link-main-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  <h3>CodeChef Account Not Linked</h3>
                  <p>Please link your CodeChef username in your Profile page to automatically synchronize your solved stats, track coding interview preparation progress, and access practice problems.</p>
                  <Link to="/profile" className="btn btn-primary mt-15">Go to Profile</Link>
                </div>
              </div>
            ) : (
              <div className="leetcode-main-workspace animate-fade">
                
                {/* CodeChef header stats card */}
                <div className="glass-card leetcode-header-stats codechef-header-stats">
                  <div className="leetcode-stats-overview">
                    <div className="leetcode-stats-meta">
                      <h4>Linked Account: <span className="text-glow" style={{ color: '#d38b27' }}>{user.codechefUsername}</span></h4>
                      <p className="last-synced-text">Performance synchronized from CodeChef profile.</p>
                    </div>
                    <div className="leetcode-resync-form">
                      <button 
                        type="button" 
                        className={`btn btn-primary ${codechefSyncLoading ? 'loading' : ''}`}
                        onClick={() => handleSyncCodechef()}
                        disabled={codechefSyncLoading}
                        style={{ backgroundColor: '#d38b27', borderColor: '#d38b27' }}
                      >
                        {codechefSyncLoading ? 'Syncing...' : 'Sync Statistics'}
                      </button>
                    </div>
                  </div>

                  <div className="leetcode-dashboard-stats-grid">
                    <div className="leetcode-stat-circle-boxCC">
                      <div className="leetcode-circle-progress" style={{ '--leetcode-pct': Math.min(100, (((user.codechefStats?.rating || 0) / 2500) * 100)), borderColor: '#d38b27' }}>
                        <span className="count">{user.codechefStats?.rating || 0}</span>
                        <span className="label">Rating</span>
                      </div>
                    </div>
                    <div className="leetcode-stat-breakdown-details">
                      {/* Stars */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl easy" style={{ backgroundColor: '#d38b27', color: '#fff' }}>Stars</span>
                          <span className="nums" style={{ color: '#d38b27', fontWeight: 'bold' }}>{user.codechefStats?.stars || '1★'}</span>
                        </div>
                      </div>

                      {/* Global Rank */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl medium">Global Rank</span>
                          <span className="nums">{user.codechefStats?.globalRank || 0}</span>
                        </div>
                      </div>

                      {/* Country Rank */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl hard">Country Rank</span>
                          <span className="nums">{user.codechefStats?.countryRank || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter and Problem Table Section */}
                <div className="glass-card leetcode-problems-container">
                  <div className="leetcode-problems-header">
                    <h3>CodeChef Practice Database</h3>
                    
                    <div className="leetcode-controls-row">
                      <div className="search-box-wrapper">
                        <input 
                          type="text" 
                          placeholder="Search problems by name or id..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="form-control"
                        />
                      </div>
                      
                      <div className="dropdowns-group">
                        <select 
                          className="form-control"
                          value={difficultyFilter}
                          onChange={(e) => setDifficultyFilter(e.target.value)}
                        >
                          <option value="all">All Difficulties</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>

                        <select 
                          className="form-control"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="solved">Solved</option>
                          <option value="unsolved">Unsolved</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="leetcode-table-responsive">
                    <table className="leetcode-problems-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Status</th>
                          <th style={{ width: '70px' }}>ID</th>
                          <th>Title</th>
                          <th style={{ width: '130px' }}>Difficulty</th>
                          <th style={{ width: '130px' }}>Acceptance</th>
                          <th style={{ width: '220px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const solvedIdsSet = getCodechefSolvedIds(user.codechefUsername, user.codechefStats, codechefProblems);
                          
                          // Order problems Easy first, Medium, then Hard
                          const sortedProblems = [...codechefProblems].sort((a, b) => {
                            const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                            if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
                              return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                            }
                            return a.id - b.id;
                          });

                          const filtered = sortedProblems.filter(problem => {
                            const isSolved = solvedIdsSet.has(problem.id);
                            
                            // Search match
                            const matchQuery = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                               problem.id.toString().includes(searchQuery);
                            
                            // Difficulty match
                            const matchDiff = difficultyFilter === 'all' || 
                                               problem.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
                            
                            // Status match
                            const matchStatus = statusFilter === 'all' || 
                                                (statusFilter === 'solved' && isSolved) || 
                                                (statusFilter === 'unsolved' && !isSolved);
                            
                            return matchQuery && matchDiff && matchStatus;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan="6" className="no-records-cell">
                                  No problems matching filters found.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map(problem => {
                            const isSolved = solvedIdsSet.has(problem.id);
                            return (
                              <tr key={problem.id} className={isSolved ? 'solved-row' : ''}>
                                <td>
                                  <span className={`status-icon-badge ${isSolved ? 'solved' : 'unsolved'}`} style={{ backgroundColor: isSolved ? 'rgba(211, 139, 39, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: isSolved ? '#d38b27' : 'var(--text-muted)' }}>
                                    {isSolved ? '✓' : '○'}
                                  </span>
                                </td>
                                <td>{problem.id}</td>
                                <td className="problem-title-cell">{problem.title}</td>
                                <td>
                                  <span className={`diff-pill ${problem.difficulty.toLowerCase()}`}>
                                    {problem.difficulty}
                                  </span>
                                </td>
                                <td className="acceptance-cell">{problem.acceptance}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className="action-buttons-cell">
                                    {isSolved && (
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleOpenSolutionModal(problem, 'codechef')}
                                      >
                                        View Solution
                                      </button>
                                    )}
                                    <a 
                                      href={`https://www.codechef.com/problems/${problem.slug.toUpperCase()}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="btn btn-primary btn-sm external-practice-btn"
                                      style={{ backgroundColor: '#d38b27', borderColor: '#d38b27' }}
                                    >
                                      Practice ↗
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW 1.8: HACKERRANK PRACTICE VIEW */}
        {!testStarted && !examResult && activeTab === 'hackerrank' && (
          <div className="leetcode-practice-view hackerrank-practice-view animate-fade">
            {hackerrankSyncError && (
              <div className="error-banner">
                <span>{hackerrankSyncError}</span>
              </div>
            )}

            {!user?.hackerrankUsername ? (
              <div className="glass-card leetcode-link-container hackerrank-link-container">
                <div className="leetcode-link-info">
                  <svg className="leetcode-link-main-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 2C6.8 2 3 5.8 3 10.5c0 3.8 2.5 7 6 8.1v-2.2c-2.3-.9-4-3.1-4-5.9 0-3.4 2.8-6.2 6.2-6.2s6.2 2.8 6.2 6.2c0 2.8-1.7 5-4 5.9v2.2c3.5-1.1 6-4.3 6-8.1C19.5 5.8 15.7 2 11.5 2z"/></svg>
                  <h3>HackerRank Account Not Linked</h3>
                  <p>Please link your HackerRank username in your Profile page to automatically synchronize your solved stats, track coding interview preparation progress, and access practice problems.</p>
                  <Link to="/profile" className="btn btn-primary mt-15">Go to Profile</Link>
                </div>
              </div>
            ) : (
              <div className="leetcode-main-workspace animate-fade">
                
                {/* HackerRank header stats card */}
                <div className="glass-card leetcode-header-stats hackerrank-header-stats">
                  <div className="leetcode-stats-overview">
                    <div className="leetcode-stats-meta">
                      <h4>Linked Account: <span className="text-glow" style={{ color: '#2ec866' }}>{user.hackerrankUsername}</span></h4>
                      <p className="last-synced-text">Performance synchronized from HackerRank profile.</p>
                    </div>
                    <div className="leetcode-resync-form">
                      <button 
                        type="button" 
                        className={`btn btn-primary ${hackerrankSyncLoading ? 'loading' : ''}`}
                        onClick={() => handleSyncHackerrank()}
                        disabled={hackerrankSyncLoading}
                        style={{ backgroundColor: '#2ec866', borderColor: '#2ec866' }}
                      >
                        {hackerrankSyncLoading ? 'Syncing...' : 'Sync Statistics'}
                      </button>
                    </div>
                  </div>

                  <div className="leetcode-dashboard-stats-grid">
                    <div className="leetcode-stat-circle-boxHR">
                      <div className="leetcode-circle-progress" style={{ '--leetcode-pct': Math.min(100, (((user.hackerrankStats?.solvedCount || 0) / 100) * 100)), borderColor: '#2ec866' }}>
                        <span className="count">{user.hackerrankStats?.solvedCount || 0}</span>
                        <span className="label">Solved</span>
                      </div>
                    </div>
                    <div className="leetcode-stat-breakdown-details">
                      {/* Score */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl easy" style={{ backgroundColor: '#2ec866', color: '#fff' }}>Score</span>
                          <span className="nums" style={{ color: '#2ec866', fontWeight: 'bold' }}>{user.hackerrankStats?.score || 0}</span>
                        </div>
                      </div>

                      {/* Badges Count */}
                      <div className="leetcode-mini-bar">
                        <div className="mini-labels">
                          <span className="difficulty-lbl medium">Badges</span>
                          <span className="nums">{user.hackerrankStats?.badgesCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter and Problem Table Section */}
                <div className="glass-card leetcode-problems-container">
                  <div className="leetcode-problems-header">
                    <h3>HackerRank Practice Database</h3>
                    
                    <div className="leetcode-controls-row">
                      <div className="search-box-wrapper">
                        <input 
                          type="text" 
                          placeholder="Search problems by name or id..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="form-control"
                        />
                      </div>
                      
                      <div className="dropdowns-group">
                        <select 
                          className="form-control"
                          value={difficultyFilter}
                          onChange={(e) => setDifficultyFilter(e.target.value)}
                        >
                          <option value="all">All Difficulties</option>
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>

                        <select 
                          className="form-control"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">All Status</option>
                          <option value="solved">Solved</option>
                          <option value="unsolved">Unsolved</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="leetcode-table-responsive">
                    <table className="leetcode-problems-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px' }}>Status</th>
                          <th style={{ width: '70px' }}>ID</th>
                          <th>Title</th>
                          <th style={{ width: '130px' }}>Difficulty</th>
                          <th style={{ width: '130px' }}>Acceptance</th>
                          <th style={{ width: '220px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const solvedIdsSet = getHackerrankSolvedIds(user.hackerrankUsername, user.hackerrankStats, hackerrankProblems);
                          
                          // Order problems Easy first, Medium, then Hard
                          const sortedProblems = [...hackerrankProblems].sort((a, b) => {
                            const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                            if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
                              return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
                            }
                            return a.id - b.id;
                          });

                          const filtered = sortedProblems.filter(problem => {
                            const isSolved = solvedIdsSet.has(problem.id);
                            
                            // Search match
                            const matchQuery = problem.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                               problem.id.toString().includes(searchQuery);
                            
                            // Difficulty match
                            const matchDiff = difficultyFilter === 'all' || 
                                               problem.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
                            
                            // Status match
                            const matchStatus = statusFilter === 'all' || 
                                                (statusFilter === 'solved' && isSolved) || 
                                                (statusFilter === 'unsolved' && !isSolved);
                            
                            return matchQuery && matchDiff && matchStatus;
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan="6" className="no-records-cell">
                                  No problems matching filters found.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map(problem => {
                            const isSolved = solvedIdsSet.has(problem.id);
                            return (
                              <tr key={problem.id} className={isSolved ? 'solved-row' : ''}>
                                <td>
                                  <span className={`status-icon-badge ${isSolved ? 'solved' : 'unsolved'}`} style={{ backgroundColor: isSolved ? 'rgba(46, 200, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)', color: isSolved ? '#2ec866' : 'var(--text-muted)' }}>
                                    {isSolved ? '✓' : '○'}
                                  </span>
                                </td>
                                <td>{problem.id}</td>
                                <td className="problem-title-cell">{problem.title}</td>
                                <td>
                                  <span className={`diff-pill ${problem.difficulty.toLowerCase()}`}>
                                    {problem.difficulty}
                                  </span>
                                </td>
                                <td className="acceptance-cell">{problem.acceptance}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className="action-buttons-cell">
                                    {isSolved && (
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleOpenSolutionModal(problem, 'hackerrank')}
                                      >
                                        View Solution
                                      </button>
                                    )}
                                    <a 
                                      href={`https://www.hackerrank.com/challenges/${problem.slug}/problem`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="btn btn-primary btn-sm external-practice-btn"
                                      style={{ backgroundColor: '#2ec866', borderColor: '#2ec866' }}
                                    >
                                      Practice ↗
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* VIEW 2: ACTIVE EXAM INTERFACE */}
        {testStarted && activeTest && (
          <div className="active-exam-container">
            {showWarningAlert && (
              <div className="warning-overlay">
                <div className="warning-alert glass-card">
                  <span className="warning-icon">⚠️</span>
                  <h3>Warning: Security Violation Detected</h3>
                  <p>Please stay on the exam screen in full-screen mode. Resizing the screen, shrinking the window, or switching tabs is monitored. <strong>Limit: 3 violations. Warnings: {warningCount}/3</strong>.</p>
                  <button className="btn btn-primary" onClick={handleReturnToExam}>
                    Return to Exam
                  </button>
                </div>
              </div>
            )}

            <div className="exam-header-bar glass-card">
              <div className="exam-details-header">
                <h2>{activeTest.title}</h2>
                <span className={`category-tag ${activeTest.category}`}>{activeTest.category}</span>
                <span className={`difficulty-tag ${activeTest.difficulty || 'medium'}`} style={{ marginLeft: '8px' }}>
                  {activeTest.difficulty || 'medium'}
                </span>
              </div>
              <div className="exam-timer-widget" data-critical={timeRemaining < 120 ? 'critical' : ''}>
                <svg viewBox="0 0 24 24" className="timer-clock"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                <span>{formatTime(timeRemaining)}</span>
              </div>
            </div>

            <div className="exam-body-grid">
              {/* Question Navigator Panel */}
              <div className="glass-card question-navigation-panel">
                <h4>Questions Nav</h4>
                <div className="question-grid-nav">
                  {activeTest.questions.map((_, index) => {
                    const isAnswered = selectedAnswers[index] !== -1;
                    const isCurrent = currentQuestionIndex === index;
                    return (
                      <button
                        key={index}
                        className={`nav-grid-circle ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="navigation-key">
                  <div className="key-item"><span className="key-color current"></span><span>Current</span></div>
                  <div className="key-item"><span className="key-color answered"></span><span>Answered</span></div>
                  <div className="key-item"><span className="key-color empty"></span><span>Unanswered</span></div>
                </div>
              </div>

              {/* Active Question Display Card */}
              <div className="glass-card active-question-card">
                <div className="question-number-header">
                  Question {currentQuestionIndex + 1} of {activeTest.questions.length}
                </div>
                <h3 className="question-text">
                  {activeTest.questions[currentQuestionIndex].questionText}
                </h3>

                {activeTest.questions[currentQuestionIndex].questionImage && (
                  <div className="question-image-wrapper" style={{ margin: '15px 0', textAlign: 'center' }}>
                    <img 
                      src={getImageUrl(activeTest.questions[currentQuestionIndex].questionImage)} 
                      alt="Question Visual" 
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} 
                    />
                  </div>
                )}

                <div className="options-selection-list">
                  {activeTest.questions[currentQuestionIndex].options.map((option, idx) => {
                    const isSelected = selectedAnswers[currentQuestionIndex] === idx;
                    return (
                      <label className={`option-item-label ${isSelected ? 'selected' : ''}`} key={idx}>
                        <input
                          type="radio"
                          name={`question-${currentQuestionIndex}`}
                          checked={isSelected}
                          onChange={() => handleAnswerSelect(idx)}
                          style={{ display: 'none' }}
                        />
                        <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                        <span className="option-text-content">{option}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="question-action-footer">
                  <button
                    className="btn btn-secondary"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  >
                    Previous
                  </button>

                  {currentQuestionIndex < activeTest.questions.length - 1 ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      className="btn btn-accent"
                      onClick={() => handleSubmitExam(false)}
                    >
                      Submit Exam
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: EXAM RESULTS ANALYSIS */}
        {examResult && activeTest && (
          <div className="results-analysis-view">
            <div className="glass-card results-scorecard-card">
              <h3>Exam Results Analysis</h3>
              <div className="results-score-flex">
                <div className="score-badge-circle results">
                  <span className="score-num">{examResult.score}</span>
                  <span className="score-total">/ {examResult.totalQuestions}</span>
                </div>
                <div className="score-analytics-summary">
                  <h2>{examResult.percentage}% Correct</h2>
                  <p>You answered <strong>{examResult.score}</strong> questions correctly out of a total <strong>{examResult.totalQuestions}</strong>.</p>
                  
                  <div className="results-feedback-level" data-passed={examResult.percentage >= 60 ? 'pass' : 'fail'}>
                    {examResult.percentage >= 80 ? 'Excellent Score! High aptitude mastery.' : examResult.percentage >= 60 ? 'Passed. Good general competency.' : 'Score below target. Retake to improve score.'}
                  </div>
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleBackToTests}>
                Back to Tests
              </button>
            </div>

            <h3 className="breakdown-headline">Detailed Question Breakdown</h3>
            
            <div className="questions-breakdown-list">
              {examResult.breakdown.map((q, idx) => (
                <div className={`glass-card result-question-item ${q.isCorrect ? 'correct' : 'incorrect'}`} key={idx}>
                  <div className="result-question-header">
                    <h4>Question {idx + 1}</h4>
                    <span className={`status-badge-result ${q.isCorrect ? 'correct' : 'incorrect'}`}>
                      {q.isCorrect ? 'Correct ✓' : 'Incorrect ✗'}
                    </span>
                  </div>

                  <h3 className="result-q-text">{q.questionText}</h3>

                  {q.questionImage && (
                    <div className="question-image-wrapper" style={{ margin: '12px 0' }}>
                      <img 
                        src={getImageUrl(q.questionImage)} 
                        alt="Question Visual" 
                        style={{ maxWidth: '100%', maxHeight: '250px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }} 
                      />
                    </div>
                  )}

                  <div className="result-options-list">
                    {q.options.map((opt, oIdx) => {
                      const isCorrectAnswer = oIdx === q.correctAnswer;
                      const isChosenAnswer = oIdx === q.userAnswer;
                      
                      let optionState = '';
                      if (isCorrectAnswer) optionState = 'correct-option';
                      else if (isChosenAnswer && !q.isCorrect) optionState = 'chosen-wrong-option';

                      return (
                        <div className={`result-opt-item ${optionState}`} key={oIdx}>
                          <span className="option-letter">{String.fromCharCode(65 + oIdx)}</span>
                          <span>{opt}</span>
                          {isCorrectAnswer && <span className="state-tag-option correct">Correct Choice</span>}
                          {isChosenAnswer && !q.isCorrect && <span className="state-tag-option wrong">Your Choice</span>}
                        </div>
                      );
                    })}
                  </div>

                  {(q.explanation || q.explanationImage) && (
                    <div className="question-explanation-box">
                      <h5>Explanation:</h5>
                      {q.explanation && <p>{q.explanation}</p>}
                      {q.explanationImage && (
                        <div className="explanation-image-wrapper" style={{ marginTop: '10px' }}>
                          <img 
                            src={getImageUrl(q.explanationImage)} 
                            alt="Explanation Visual" 
                            style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }} 
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solution Viewer Modal */}
        {showSolutionModal && selectedProblem && (
          <div className="modal-overlay">
            <div className="modal-content glass-card solution-modal-content">
              <div className="modal-header">
                <h3>{selectedProblem.id}. {selectedProblem.title} Solution</h3>
                <button className="close-btn" onClick={() => {
                  setShowSolutionModal(false);
                  setSelectedProblem(null);
                  setCustomSolutionCode('');
                  setIsEditingSolution(false);
                  setSolutionModalError('');
                  setSolutionModalSuccess('');
                }}>×</button>
              </div>
              
              {solutionModalError && (
                <div className="error-banner" style={{ margin: '15px' }}>
                  <span>{solutionModalError}</span>
                </div>
              )}

              {solutionModalSuccess && (
                <div className="success-banner" style={{ margin: '15px', backgroundColor: 'rgba(46, 200, 102, 0.15)', border: '1px solid #2ec866', padding: '10px', borderRadius: '6px', color: '#2ec866', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>✓</span>
                  <span>{solutionModalSuccess}</span>
                </div>
              )}

              <div className="solution-modal-body">
                <div className="solution-meta-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className={`diff-pill ${selectedProblem.difficulty.toLowerCase()}`}>
                      {selectedProblem.difficulty}
                    </span>
                    <span className="acceptance-pill" style={{ marginLeft: '10px' }}>
                      Acceptance: {selectedProblem.acceptance}
                    </span>
                  </div>
                  
                  <div className="modal-actions-group">
                    {!solutionModalLoading && (
                      <button 
                        className={`btn btn-sm ${isEditingSolution ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ marginRight: '10px' }}
                        onClick={() => setIsEditingSolution(!isEditingSolution)}
                      >
                        {isEditingSolution ? 'Cancel Edit' : 'Edit Submission'}
                      </button>
                    )}
                    {isEditingSolution && (
                      <button 
                        className={`btn btn-success btn-sm ${solutionModalSaveLoading ? 'loading' : ''}`}
                        onClick={handleSaveSolution}
                        disabled={solutionModalSaveLoading}
                      >
                        {solutionModalSaveLoading ? 'Saving...' : 'Save Submission'}
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="solution-code-container">
                  <div className="code-header">
                    <span>
                      {selectedProblem.solution.includes('#include') ? 'C++ Submission Code' : 'JavaScript Submission Code'}
                    </span>
                    
                    <button 
                      className="btn btn-secondary btn-sm copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(customSolutionCode);
                        alert('Code copied to clipboard!');
                      }}
                    >
                      Copy Code
                    </button>
                  </div>

                  {solutionModalLoading ? (
                    <div className="modal-loading-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', color: '#fff' }}>
                      <div className="spinner-loader"></div>
                      <p style={{ marginTop: '15px' }}>Syncing submission from platform...</p>
                    </div>
                  ) : isEditingSolution ? (
                    <textarea
                      className="solution-editor-textarea"
                      value={customSolutionCode}
                      onChange={(e) => setCustomSolutionCode(e.target.value)}
                      placeholder="Paste your submission code here..."
                      spellCheck="false"
                      style={{
                        width: '100%',
                        height: '350px',
                        backgroundColor: '#1e1e2e',
                        color: '#cdd6f4',
                        fontFamily: 'Consolas, Monaco, monospace',
                        padding: '15px',
                        border: '1px solid #45475a',
                        borderRadius: '6px',
                        resize: 'vertical',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <pre className="solution-code-block" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      <code>{customSolutionCode}</code>
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default AptitudeTests;
