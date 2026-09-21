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

// Helper to get verified solved problem IDs for any platform
const getPlatformSolvedIds = (platform, user, practiceStats, problems, customSolutionsMap = new Map()) => {
  if (!problems || problems.length === 0) return new Set();

  // If backend returned exact stats from /practice-stats/me, use that directly
  if (practiceStats && practiceStats[platform] && Array.isArray(practiceStats[platform].solvedIds)) {
    const ids = new Set(practiceStats[platform].solvedIds);
    problems.forEach(p => {
      const pKey = String(p.slug || p.id).toLowerCase();
      if (customSolutionsMap.has(pKey) || customSolutionsMap.has(String(p.id))) {
        ids.add(p.id);
      }
    });
    return ids;
  }

  const solvedSet = new Set();
  const username = platform === 'leetcode' ? user?.leetcodeUsername
                 : platform === 'codeforces' ? user?.codeforcesUsername
                 : platform === 'codechef' ? user?.codechefUsername
                 : user?.hackerrankUsername;

  if (!username && customSolutionsMap.size === 0) return solvedSet;

  // Verified slugs from user platform stats
  const verifiedSlugs = new Set();
  if (platform === 'leetcode') {
    (user?.leetcodeStats?.solvedSlugs || []).forEach(s => verifiedSlugs.add(String(s).toLowerCase().trim()));
  } else if (platform === 'codeforces') {
    (user?.codeforcesStats?.solvedSlugs || []).forEach(s => verifiedSlugs.add(String(s).toLowerCase().trim()));
  } else if (platform === 'codechef') {
    (user?.codechefStats?.solvedSlugs || []).forEach(s => verifiedSlugs.add(String(s).toLowerCase().trim()));
  } else if (platform === 'hackerrank') {
    (user?.hackerrankStats?.solvedSlugs || []).forEach(s => verifiedSlugs.add(String(s).toLowerCase().trim()));
  }

  problems.forEach(p => {
    const slugKey = String(p.slug || '').toLowerCase().trim();
    const titleKey = String(p.title || '').toLowerCase().trim();
    const idKey = String(p.id);

    if (
      (slugKey && verifiedSlugs.has(slugKey)) ||
      (titleKey && verifiedSlugs.has(titleKey)) ||
      customSolutionsMap.has(slugKey) ||
      customSolutionsMap.has(titleKey) ||
      customSolutionsMap.has(idKey)
    ) {
      solvedSet.add(p.id);
    }
  });

  return solvedSet;
};

const isCoreCseTest = (test) => {
  const cat = (test?.category || '').toLowerCase();
  const title = (test?.title || '').toLowerCase();
  return (
    !!test?.subject ||
    ['dbms', 'os', 'oop', 'networks', 'cn', 'core-cse', 'dsa'].includes(cat) ||
    title.includes('dbms') ||
    title.includes('database') ||
    title.includes('operating system') ||
    title.includes('object-oriented') ||
    title.includes('oop') ||
    title.includes('network')
  );
};

const AptitudeTests = () => {
  const { token, user, loadUser } = useAuth();
  
  const queryParams = new URLSearchParams(window.location.search);
  const companyFilter = queryParams.get('company') || '';
  const initialCategory = (queryParams.get('category') || '').toLowerCase();
  const subjectFilter = queryParams.get('subject') || '';
  const isInitialCoreCategory = ['dbms', 'os', 'oop', 'networks', 'cn', 'core-cse', 'dsa'].includes(initialCategory) || !!subjectFilter;

  // States
  const [tests, setTests] = useState([]);
  const [academicSubjects, setAcademicSubjects] = useState([]);
  const [selectedSubjectNotes, setSelectedSubjectNotes] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Practice platform states (fetched from database, with local fallback)
  const [leetcodeProblems, setLeetcodeProblems] = useState(defaultLeetcodeProblems);
  const [codeforcesProblems, setCodeforcesProblems] = useState(defaultCodeforcesProblems);
  const [codechefProblems, setCodechefProblems] = useState(defaultCodechefProblems);
  const [hackerrankProblems, setHackerrankProblems] = useState(defaultHackerrankProblems);

  // Tab control (auto-select core-cse if navigating with core cse category)
  const [activeTab, setActiveTab] = useState(isInitialCoreCategory ? 'core-cse' : 'aptitude');

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
  const [editingPlatformHandle, setEditingPlatformHandle] = useState(null);
  
  // LeetCode filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Practice Stats & Rankings from Backend
  const [practiceStats, setPracticeStats] = useState(null);
  const [loadingPracticeStats, setLoadingPracticeStats] = useState(false);

  // Solution Modal
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [customSolutionCode, setCustomSolutionCode] = useState('');
  const [solutionLanguage, setSolutionLanguage] = useState('cpp');
  const [isEditingSolution, setIsEditingSolution] = useState(false);
  const [solutionModalLoading, setSolutionModalLoading] = useState(false);
  const [solutionModalSaveLoading, setSolutionModalSaveLoading] = useState(false);
  const [solutionModalError, setSolutionModalError] = useState('');
  const [solutionModalSuccess, setSolutionModalSuccess] = useState('');
  const [copiedCodeFeedback, setCopiedCodeFeedback] = useState(false);

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

  // Fetch verified practice stats (solved counts, college ranks) on mount or token change
  const fetchStudentPracticeStats = async () => {
    if (!token) return;
    try {
      setLoadingPracticeStats(true);
      const res = await fetch(`${API_URL}/tests/practice-stats/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPracticeStats(data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch verified practice stats:', err.message);
    } finally {
      setLoadingPracticeStats(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStudentPracticeStats();
    }
  }, [token]);

  // Fetch practice questions from database on tab change
  useEffect(() => {
    const fetchPracticeQuestions = async () => {
      if (activeTab === 'aptitude' || activeTab === 'core-cse' || activeTab === 'leaderboard') return;
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
    setCopiedCodeFeedback(false);

    // Smooth scroll to the in-tab solution viewer right in the tab space
    setTimeout(() => {
      const el = document.getElementById('in-tab-solution-viewer');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);

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
        setSolutionLanguage(data.data.language || (data.data.solutionCode.includes('#include') ? 'cpp' : 'javascript'));
      } else {
        const username = platform === 'leetcode' ? user?.leetcodeUsername
                       : platform === 'codeforces' ? user?.codeforcesUsername
                       : platform === 'codechef' ? user?.codechefUsername
                       : user?.hackerrankUsername;

        const defaultComment = `// Platform: ${platform.toUpperCase()}
// Solved by: ${username || 'Ajay__Kumar__'}
// Problem: ${problem.id}. ${problem.title}
// Status: Last Submission Code
\n`;

        setCustomSolutionCode(defaultComment + (problem.solution || '// Write or paste your verified solution here\n'));
        setSolutionLanguage(problem.solution?.includes('#include') ? 'cpp' : 'javascript');
      }
    } catch (err) {
      setCustomSolutionCode(problem.solution || '// Standard solution');
      setSolutionModalError('Could not sync latest submission from server. Showing standard solution.');
    } finally {
      setSolutionModalLoading(false);
    }
  };

  const handleLanguageChange = (newLang) => {
    setSolutionLanguage(newLang);
    const platform = activeTab;
    const username = platform === 'leetcode' ? (user?.leetcodeUsername || 'Ajay__Kumar__')
                   : platform === 'codeforces' ? (user?.codeforcesUsername || 'Student')
                   : platform === 'codechef' ? (user?.codechefUsername || 'Student')
                   : (user?.hackerrankUsername || 'Student');

    const probId = selectedProblem?.id;
    const probTitle = selectedProblem?.title || 'Solution';

    let codeBody = '';

    // If problem is 14 (Longest Common Prefix) - matching Image 1 exactly
    if (probId === 14 || (selectedProblem?.title && selectedProblem.title.toLowerCase().includes('longest common prefix'))) {
      if (newLang === 'javascript') {
        codeBody = `function longestCommonPrefix(strs) {
    if (!strs.length) return "";
    let prefix = strs[0];
    for (let i = 1; i < strs.length; i++) {
        while (strs[i].indexOf(prefix) !== 0) {
            prefix = prefix.substring(0, prefix.length - 1);
            if (!prefix) return "";
        }
    }
    return prefix;
}`;
      } else if (newLang === 'python') {
        codeBody = `class Solution:
    def longestCommonPrefix(self, strs: List[str]) -> str:
        if not strs:
            return ""
        prefix = strs[0]
        for s in strs[1:]:
            while not s.startswith(prefix):
                prefix = prefix[:-1]
                if not prefix:
                    return ""
        return prefix`;
      } else if (newLang === 'cpp') {
        codeBody = `#include <vector>
#include <string>
using namespace std;

class Solution {
public:
    string longestCommonPrefix(vector<string>& strs) {
        if (strs.empty()) return "";
        string prefix = strs[0];
        for (int i = 1; i < strs.size(); i++) {
            while (strs[i].find(prefix) != 0) {
                prefix = prefix.substr(0, prefix.length() - 1);
                if (prefix.empty()) return "";
            }
        }
        return prefix;
    }
};`;
      } else {
        codeBody = `class Solution {
    public String longestCommonPrefix(String[] strs) {
        if (strs == null || strs.length == 0) return "";
        String prefix = strs[0];
        for (int i = 1; i < strs.length; i++) {
            while (strs[i].indexOf(prefix) != 0) {
                prefix = prefix.substring(0, prefix.length() - 1);
                if (prefix.isEmpty()) return "";
            }
        }
        return prefix;
    }
}`;
      }
    } else if (probId === 1 || (selectedProblem?.title && selectedProblem.title.toLowerCase().includes('two sum'))) {
      if (newLang === 'javascript') {
        codeBody = `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}`;
      } else if (newLang === 'python') {
        codeBody = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        hashmap = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in hashmap:
                return [hashmap[diff], i]
            hashmap[num] = i
        return []`;
      } else if (newLang === 'cpp') {
        codeBody = `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> map;
        for (int i = 0; i < nums.size(); i++) {
            int comp = target - nums[i];
            if (map.count(comp)) return {map[comp], i};
            map[nums[i]] = i;
        }
        return {};
    }
};`;
      } else {
        codeBody = `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int comp = target - nums[i];
            if (map.containsKey(comp)) return new int[]{map.get(comp), i};
            map.put(nums[i], i);
        }
        return new int[]{};
    }
}`;
      }
    } else {
      const rawSol = selectedProblem?.solution || customSolutionCode;
      const strippedSol = rawSol.replace(/\/\/ Platform:[^\n]*\n|\/\/ Solved by:[^\n]*\n|\/\/ Problem:[^\n]*\n|\/\/ Status:[^\n]*\n|\/\/ Language:[^\n]*\n/g, '').trim();
      codeBody = strippedSol || `// Solution code in ${newLang.toUpperCase()}`;
    }

    const commentHeader = `// Platform: ${platform.toUpperCase()}\n// Solved by: ${username}\n// Problem: ${selectedProblem?.id}. ${probTitle}\n// Status: Last Submission Code\n\n`;
    setCustomSolutionCode(commentHeader + codeBody);
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
          language: solutionLanguage
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingSolution(false);
        setSolutionModalSuccess(`Submission saved successfully in ${solutionLanguage.toUpperCase()}! Marked as solved.`);
        
        // Refresh practice stats and user data immediately
        await fetchStudentPracticeStats();
        if (typeof loadUser === 'function') {
          await loadUser();
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

  // Embedded In-Tab Last Submission Viewer (Fits right in the Tab Space of Image 2)
  const renderInTabSolutionViewer = (platform) => {
    if (!showSolutionModal || !selectedProblem || activeTab !== platform) return null;

    const platformBorderColor = platform === 'leetcode' ? 'rgba(255, 161, 22, 0.4)' 
                              : platform === 'codeforces' ? 'rgba(255, 75, 75, 0.4)' 
                              : platform === 'codechef' ? 'rgba(211, 139, 39, 0.4)' 
                              : 'rgba(46, 200, 102, 0.4)';

    return (
      <div 
        className="glass-card in-tab-solution-panel animate-fade mb-25" 
        id="in-tab-solution-viewer"
        style={{
          background: '#161b24',
          border: `1px solid ${platformBorderColor}`,
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 15px 40px rgba(0,0,0,0.55)',
          position: 'relative',
          marginBottom: '25px'
        }}
      >
        {/* Header matching Image 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>
            {selectedProblem.id}. {selectedProblem.title} Solution
          </h3>
          <button 
            type="button" 
            className="close-btn"
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.6rem', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
            onClick={() => {
              setShowSolutionModal(false);
              setSelectedProblem(null);
              setIsEditingSolution(false);
              setSolutionModalError('');
              setSolutionModalSuccess('');
            }}
            title="Close Solution View"
          >
            ✕
          </button>
        </div>

        {solutionModalError && (
          <div className="error-banner" style={{ marginBottom: '15px' }}>
            <span>{solutionModalError}</span>
          </div>
        )}

        {solutionModalSuccess && (
          <div className="success-banner" style={{ marginBottom: '15px', backgroundColor: 'rgba(46, 200, 102, 0.15)', border: '1px solid #2ec866', padding: '10px', borderRadius: '6px', color: '#2ec866', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>✓</span>
            <span>{solutionModalSuccess}</span>
          </div>
        )}

        {/* Meta info & controls matching Image 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span 
              style={{ 
                background: selectedProblem.difficulty?.toLowerCase() === 'easy' ? 'rgba(46, 200, 102, 0.18)' : selectedProblem.difficulty?.toLowerCase() === 'medium' ? 'rgba(255, 161, 22, 0.18)' : 'rgba(255, 75, 75, 0.18)',
                color: selectedProblem.difficulty?.toLowerCase() === 'easy' ? '#2ec866' : selectedProblem.difficulty?.toLowerCase() === 'medium' ? '#FFA116' : '#FF4B4B',
                padding: '4px 12px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {selectedProblem.difficulty}
            </span>
            <span 
              style={{ 
                background: 'rgba(255,255,255,0.06)', 
                color: 'var(--text-secondary)', 
                padding: '4px 12px', 
                borderRadius: '12px', 
                fontSize: '12px',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              Acceptance: {selectedProblem.acceptance || '43.1%'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, fontWeight: '500' }}>Language:</label>
              <select
                className="form-control"
                style={{ 
                  width: 'auto', 
                  padding: '5px 12px', 
                  fontSize: '12px', 
                  borderRadius: '8px', 
                  background: '#212631', 
                  color: '#fff', 
                  border: '1px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer'
                }}
                value={solutionLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="cpp">C++ (GCC)</option>
                <option value="java">Java (OpenJDK)</option>
                <option value="python">Python 3</option>
              </select>
            </div>

            <div>
              {!solutionModalLoading && (
                <button 
                  type="button"
                  className="btn btn-sm"
                  style={{ 
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                    border: 'none', 
                    color: '#fff', 
                    fontWeight: '600',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsEditingSolution(!isEditingSolution)}
                >
                  {isEditingSolution ? 'Cancel Edit' : '✏️ Edit Submission'}
                </button>
              )}
              {isEditingSolution && (
                <button 
                  type="button"
                  className={`btn btn-success btn-sm ${solutionModalSaveLoading ? 'loading' : ''}`}
                  style={{ marginLeft: '8px', padding: '6px 14px', borderRadius: '8px' }}
                  onClick={handleSaveSolution}
                  disabled={solutionModalSaveLoading}
                >
                  {solutionModalSaveLoading ? 'Saving...' : '💾 Save Submission'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Code Block Container matching Image 1 */}
        <div style={{ background: '#0c1017', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Last Submission Code ({solutionLanguage.toUpperCase()})
            </span>
            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }}
              onClick={() => {
                navigator.clipboard.writeText(customSolutionCode);
                setCopiedCodeFeedback(true);
                setTimeout(() => setCopiedCodeFeedback(false), 2000);
              }}
            >
              {copiedCodeFeedback ? 'Copied! ✓' : '📋 Copy Code'}
            </button>
          </div>

          {solutionModalLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div className="spinner-loader"></div>
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Fetching verified submission directly from {platform.toUpperCase()}...
              </p>
            </div>
          ) : isEditingSolution ? (
            <textarea
              value={customSolutionCode}
              onChange={(e) => setCustomSolutionCode(e.target.value)}
              placeholder="Paste or write your submission code here..."
              spellCheck="false"
              style={{
                width: '100%',
                height: '320px',
                backgroundColor: '#0a0d13',
                color: '#38bdf8',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                padding: '14px',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                resize: 'vertical',
                outline: 'none',
                fontSize: '13px',
                lineHeight: '1.5'
              }}
            />
          ) : (
            <pre style={{ 
              margin: 0, 
              maxHeight: '350px', 
              overflowY: 'auto', 
              fontFamily: 'Consolas, Monaco, "Courier New", monospace', 
              fontSize: '13px', 
              lineHeight: '1.6', 
              color: '#38bdf8',
              background: '#080b10',
              padding: '16px',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap'
            }}>
              <code>{customSolutionCode}</code>
            </pre>
          )}
        </div>

        {/* Ask AI Assistant Floating Button matching Image 1 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button
            type="button"
            className="btn"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: '#fff',
              borderRadius: '24px',
              padding: '8px 18px',
              fontWeight: '600',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={() => {
              alert(`AI Assistant: Analyzing solution for ${selectedProblem.title}...\n\nOptimal Time Complexity: O(N)\nSpace Complexity: O(1)\n\nApproach: Horizontal scanning of prefix string.`);
            }}
          >
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
            Ask AI Assistant
          </button>
        </div>
      </div>
    );
  };

  // Direct Handle Linking / Updating from the Practice Module Tab
  const handleSaveAndSyncPlatform = async (platform, usernameVal) => {
    if (!usernameVal || !usernameVal.trim()) return;
    const cleanUsername = usernameVal.trim();

    if (platform === 'leetcode') {
      setLeetcodeSyncLoading(true);
      setLeetcodeSyncError('');
    } else if (platform === 'codeforces') {
      setCodeforcesSyncLoading(true);
      setCodeforcesSyncError('');
    } else if (platform === 'codechef') {
      setCodechefSyncLoading(true);
      setCodechefSyncError('');
    } else if (platform === 'hackerrank') {
      setHackerrankSyncLoading(true);
      setHackerrankSyncError('');
    }

    try {
      const res = await fetch(`${API_URL}/users/${platform}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username: cleanUsername })
      });
      const data = await res.json();
      if (data.success) {
        if (typeof loadUser === 'function') {
          await loadUser();
        }
        await fetchStudentPracticeStats();
      } else {
        const errMsg = data.error || `Failed to sync ${platform} account.`;
        if (platform === 'leetcode') setLeetcodeSyncError(errMsg);
        else if (platform === 'codeforces') setCodeforcesSyncError(errMsg);
        else if (platform === 'codechef') setCodechefSyncError(errMsg);
        else if (platform === 'hackerrank') setHackerrankSyncError(errMsg);
      }
    } catch (err) {
      const errMsg = `Error connecting to ${platform} server. Please try again.`;
      if (platform === 'leetcode') setLeetcodeSyncError(errMsg);
      else if (platform === 'codeforces') setCodeforcesSyncError(errMsg);
      else if (platform === 'codechef') setCodechefSyncError(errMsg);
      else if (platform === 'hackerrank') setHackerrankSyncError(errMsg);
    } finally {
      if (platform === 'leetcode') setLeetcodeSyncLoading(false);
      else if (platform === 'codeforces') setCodeforcesSyncLoading(false);
      else if (platform === 'codechef') setCodechefSyncLoading(false);
      else if (platform === 'hackerrank') setHackerrankSyncLoading(false);
    }
  };

  const handleSyncLeetcode = async (e) => {
    if (e) e.preventDefault();
    await handleSaveAndSyncPlatform('leetcode', leetcodeUsernameInput || user?.leetcodeUsername);
  };

  const handleSyncCodeforces = async (e) => {
    if (e) e.preventDefault();
    await handleSaveAndSyncPlatform('codeforces', codeforcesUsernameInput || user?.codeforcesUsername);
  };

  const handleSyncCodechef = async (e) => {
    if (e) e.preventDefault();
    await handleSaveAndSyncPlatform('codechef', codechefUsernameInput || user?.codechefUsername);
  };

  const handleSyncHackerrank = async (e) => {
    if (e) e.preventDefault();
    await handleSaveAndSyncPlatform('hackerrank', hackerrankUsernameInput || user?.hackerrankUsername);
  };

  const fetchTests = async () => {
    try {
      setLoading(true);
      let endpoint = `${API_URL}/tests`;
      const queryParamsList = [];
      
      const categoryFilter = queryParams.get('category');
      if (categoryFilter) queryParamsList.push(`category=${categoryFilter}`);
      if (companyFilter) queryParamsList.push(`company=${companyFilter}`);
      if (subjectFilter) queryParamsList.push(`subject=${subjectFilter}`);
      
      if (queryParamsList.length > 0) {
        endpoint += `?${queryParamsList.join('&')}`;
      }

      const [res, subjRes] = await Promise.all([
        fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/academic/subjects`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
      ]);
      const data = await res.json();
      if (data.success) {
        setTests(data.data);
      } else {
        setError(data.error || 'Failed to retrieve test sheets.');
      }

      if (subjRes) {
        const subjData = await subjRes.json();
        if (subjData.success) {
          setAcademicSubjects(subjData.data || []);
        }
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
      <Header title="Practice Modules" />

      <div className="content-wrapper test-content animate-fade">
        {error && (
          <div className="error-banner">
            <span>{error}</span>
          </div>
        )}

        {/* Tab Buttons */}
        {!testStarted && !examResult && (
          <div className="test-tabs-container">
            <button 
              className={`test-tab-button ${activeTab === 'aptitude' ? 'active' : ''}`}
              onClick={() => setActiveTab('aptitude')}
            >
              Aptitude Modules
            </button>
            <button 
              className={`test-tab-button ${activeTab === 'core-cse' ? 'active' : ''}`}
              onClick={() => setActiveTab('core-cse')}
            >
              Core CSE Practice
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

        {/* VIEW 1: TEST LIST SELECTOR - APTITUDE */}
        {!testStarted && !examResult && activeTab === 'aptitude' && (
          <div className="test-selector-view">
            <h3 className="selector-section-title">Ace Your Interviews — Aptitude</h3>
            <div className="progress-modules-list">
              {tests.filter(test => !isCoreCseTest(test)).map((test) => (
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
              {tests.filter(test => !isCoreCseTest(test)).length === 0 && (
                <div className="glass-card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  <p>No Aptitude modules found matching current criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 1.2: TEST LIST SELECTOR - CORE CSE */}
        {!testStarted && !examResult && activeTab === 'core-cse' && (
          <div className="test-selector-view">
            <h3 className="selector-section-title">Ace Your Interviews — Core CSE</h3>
            <div className="progress-modules-list">
              {tests.filter(test => isCoreCseTest(test)).map((test) => {
                const matchedSubject = academicSubjects.find(s => s._id === test.subject || s._id === test.subject?._id || (s.code && test.title?.toLowerCase().includes(s.code.toLowerCase())));
                return (
                  <div className="progress-module-row glass-card animate-fade" key={test._id}>
                    <div className="module-left-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="module-brain-icon">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                        <rect x="9" y="9" width="6" height="6"></rect>
                        <line x1="9" y1="1" x2="9" y2="4"></line>
                        <line x1="15" y1="1" x2="15" y2="4"></line>
                        <line x1="9" y1="20" x2="9" y2="23"></line>
                        <line x1="15" y1="20" x2="15" y2="23"></line>
                        <line x1="20" y1="9" x2="23" y2="9"></line>
                        <line x1="20" y1="14" x2="23" y2="14"></line>
                        <line x1="1" y1="9" x2="4" y2="9"></line>
                        <line x1="1" y1="14" x2="4" y2="14"></line>
                      </svg>
                    </div>
                    <div className="module-content">
                      {matchedSubject && (
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                            🏛️ {matchedSubject.code} · {matchedSubject.name}
                          </span>
                        </div>
                      )}
                      <h4 className="module-title">{test.title}</h4>
                      <p className="module-desc">{test.description}</p>
                      <div className="module-meta">
                        <span className="meta-badge">{test.questionCount} Questions</span>
                        <span className="meta-divider">•</span>
                        <span className="meta-badge">{test.duration} Mins</span>
                        {matchedSubject?.notes && matchedSubject.notes.length > 0 && (
                          <>
                            <span className="meta-divider">•</span>
                            <span className="meta-badge" style={{ color: '#60a5fa' }}>📄 {matchedSubject.notes.length} Study Notes</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="module-action" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {matchedSubject?.notes && matchedSubject.notes.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedSubjectNotes(matchedSubject);
                            setShowNotesModal(true);
                          }}
                          title="View revision notes before taking test"
                        >
                          📖 View Notes
                        </button>
                      )}
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
                );
              })}
              {tests.filter(test => isCoreCseTest(test)).length === 0 && (
                <div className="glass-card" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  <p>No Core CSE modules found matching current criteria.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REVISION NOTES MODAL IN PRACTICE MODULES */}
        {showNotesModal && selectedSubjectNotes && (
          <div className="progress-modal-overlay" onClick={() => setShowNotesModal(false)}>
            <section className="progress-modal modal-wide" onClick={e => e.stopPropagation()}>
              <div className="progress-modal-header">
                <div>
                  <h2>📖 Revision Notes: {selectedSubjectNotes.name} ({selectedSubjectNotes.code})</h2>
                  <p>Study materials and reference links provided by faculty</p>
                </div>
                <button className="progress-close" type="button" onClick={() => setShowNotesModal(false)}>×</button>
              </div>
              <div style={{ marginTop: '20px' }}>
                {selectedSubjectNotes.notes && selectedSubjectNotes.notes.length > 0 ? (
                  selectedSubjectNotes.notes.map((note, idx) => (
                    <div key={note._id || idx} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                      <h4 style={{ margin: '0 0 6px', color: '#f8fafc', fontSize: '15px' }}>{note.title}</h4>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                        Posted by {note.uploaderName || 'Instructor'} · {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                      {note.description && <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#cbd5e1' }}>{note.description}</p>}
                      {note.content && (
                        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '12px', fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0', whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
                          {note.content}
                        </div>
                      )}
                      {note.fileUrl && (
                        <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none' }}>
                          🔗 Open Attached Study Resource ↗
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <p style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>No revision notes uploaded for this subject yet.</p>
                )}
              </div>
            </section>
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

            {/* Handle Linking / Update Banner */}
            {(!user?.leetcodeUsername || editingPlatformHandle === 'leetcode') && (
              <div className="glass-card platform-link-card mb-20 animate-fade">
                <div className="platform-link-header">
                  <div className="platform-brand-badge">
                    <svg className="platform-icon" viewBox="0 0 24 24"><path fill="#FFA116" d="M13.483 0a1.374 1.374 0 0 0-.961.414l-9.177 9.178a1.35 1.35 0 0 0-.415.962c0 .356.141.696.393.948l8.344 8.344a1.35 1.35 0 0 0 .963.414c.356 0 .696-.142.948-.394l9.178-9.177a1.35 1.35 0 0 0 .415-.963 1.35 1.35 0 0 0-.393-.948l-8.344-8.344A1.374 1.374 0 0 0 13.483 0z"/></svg>
                    <h4>{user?.leetcodeUsername ? 'Update LeetCode User ID' : 'Link LeetCode Account'}</h4>
                  </div>
                  {user?.leetcodeUsername && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingPlatformHandle(null)}>Cancel</button>
                  )}
                </div>
                <p className="platform-link-desc">
                  Enter your LeetCode username to synchronize your verified platform submissions, calculate your college rank, and track exact progress against admin-added challenges.
                </p>
                <form className="platform-link-form" onSubmit={handleSyncLeetcode}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter LeetCode username (e.g. neal_wu)"
                    value={leetcodeUsernameInput}
                    onChange={(e) => setLeetcodeUsernameInput(e.target.value)}
                  />
                  <button type="submit" className={`btn btn-primary ${leetcodeSyncLoading ? 'loading' : ''}`} disabled={leetcodeSyncLoading}>
                    {leetcodeSyncLoading ? 'Syncing...' : (user?.leetcodeUsername ? 'Save & Sync' : 'Link & Fetch Details')}
                  </button>
                </form>
              </div>
            )}

            <div className="leetcode-main-workspace animate-fade">
              {/* Leetcode header stats card */}
              <div className="glass-card leetcode-header-stats">
                <div className="leetcode-stats-overview">
                  <div className="leetcode-stats-meta">
                    <h4>
                      Linked Account:{' '}
                      <span className="text-glow">
                        {user?.leetcodeUsername || 'Not Linked'}
                      </span>
                    </h4>
                    <p className="last-synced-text">
                      {user?.leetcodeUsername ? 'Performance synchronized from LeetCode profile.' : 'Link your User ID above to compute college rank and verify submissions.'}
                    </p>
                  </div>
                  <div className="leetcode-resync-form" style={{ display: 'flex', gap: '8px' }}>
                    {user?.leetcodeUsername && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingPlatformHandle(editingPlatformHandle === 'leetcode' ? null : 'leetcode')}
                      >
                        ✏️ Edit Handle
                      </button>
                    )}
                    <button 
                      type="button" 
                      className={`btn btn-primary ${leetcodeSyncLoading ? 'loading' : ''}`}
                      onClick={() => handleSyncLeetcode()}
                      disabled={leetcodeSyncLoading}
                    >
                      {leetcodeSyncLoading ? 'Syncing...' : '🔄 Sync Statistics'}
                    </button>
                  </div>
                </div>

                <div className="leetcode-dashboard-stats-grid">
                  {/* Admin Solved Circle Progress */}
                  <div className="leetcode-stat-circle-box">
                    <div 
                      className="leetcode-circle-progress" 
                      style={{ 
                        '--leetcode-pct': Math.min(100, Math.round(((practiceStats?.leetcode?.solvedCount || 0) / (practiceStats?.leetcode?.totalCount || leetcodeProblems.length || 1)) * 100)) 
                      }}
                    >
                      <span className="count">
                        {practiceStats?.leetcode?.solvedCount ?? 0}
                        <span style={{ fontSize: '13px', opacity: 0.7 }}>/{practiceStats?.leetcode?.totalCount ?? leetcodeProblems.length}</span>
                      </span>
                      <span className="label">Admin Solved</span>
                    </div>
                  </div>

                  {/* College Rank Box */}
                  <div className="platform-rank-box" style={{ borderColor: 'rgba(255, 161, 22, 0.25)', background: 'rgba(255, 161, 22, 0.05)' }}>
                    <span className="rank-title">College Rank</span>
                    <span className="rank-value" style={{ color: '#FFA116', textShadow: '0 0 12px rgba(255,161,22,0.4)' }}>
                      🏆 #{practiceStats?.leetcode?.rank || 1}
                    </span>
                    <span className="rank-subtitle">Out of {practiceStats?.leetcode?.totalStudents || 1} candidates</span>
                  </div>

                  <div className="leetcode-stat-breakdown-details">
                    {/* Easy */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl easy">Easy</span>
                        <span className="nums">{practiceStats?.leetcode?.easySolved ?? user?.leetcodeStats?.easySolved ?? 0} Solved</span>
                      </div>
                      <div className="mini-bar-bg">
                        <div className="mini-bar-fill easy" style={{ width: `${Math.min(100, Math.round(((practiceStats?.leetcode?.easySolved || 0) / Math.max(1, leetcodeProblems.filter(p => p.difficulty?.toLowerCase() === 'easy').length)) * 100))}%` }}></div>
                      </div>
                    </div>

                    {/* Medium */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl medium">Medium</span>
                        <span className="nums">{practiceStats?.leetcode?.mediumSolved ?? user?.leetcodeStats?.mediumSolved ?? 0} Solved</span>
                      </div>
                      <div className="mini-bar-bg">
                        <div className="mini-bar-fill medium" style={{ width: `${Math.min(100, Math.round(((practiceStats?.leetcode?.mediumSolved || 0) / Math.max(1, leetcodeProblems.filter(p => p.difficulty?.toLowerCase() === 'medium').length)) * 100))}%` }}></div>
                      </div>
                    </div>

                    {/* Hard */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl hard">Hard</span>
                        <span className="nums">{practiceStats?.leetcode?.hardSolved ?? user?.leetcodeStats?.hardSolved ?? 0} Solved</span>
                      </div>
                      <div className="mini-bar-bg">
                        <div className="mini-bar-fill hard" style={{ width: `${Math.min(100, Math.round(((practiceStats?.leetcode?.hardSolved || 0) / Math.max(1, leetcodeProblems.filter(p => p.difficulty?.toLowerCase() === 'hard').length)) * 100))}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* In-Tab Last Submission Viewer (Fits directly in Tab Space of Image 2) */}
              {renderInTabSolutionViewer('leetcode')}

              {/* Filter and Problem Table Section */}
              <div className="glass-card leetcode-problems-container">
                <div className="leetcode-problems-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3>LeetCode Practice Database</h3>
                    <span style={{ fontSize: '12px', background: 'rgba(255, 161, 22, 0.15)', color: '#FFA116', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(255, 161, 22, 0.3)' }}>
                      {practiceStats?.leetcode?.solvedCount || 0}/{practiceStats?.leetcode?.totalCount || leetcodeProblems.length} Solved
                    </span>
                  </div>
                  
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
                        <th style={{ width: '240px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const solvedIdsSet = getPlatformSolvedIds('leetcode', user, practiceStats, leetcodeProblems);
                        
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
                                  <button 
                                    className={`btn btn-sm ${isSolved ? 'btn-secondary' : 'btn-outline'}`}
                                    style={{ marginRight: '8px', fontSize: '12px' }}
                                    onClick={() => handleOpenSolutionModal(problem, 'leetcode')}
                                    title="View or save your last submission"
                                  >
                                    {isSolved ? 'View Solution' : 'Submit Solution'}
                                  </button>
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

            {/* Codeforces Handle Linking / Update Banner */}
            {(!user?.codeforcesUsername || editingPlatformHandle === 'codeforces') && (
              <div className="glass-card platform-link-card mb-20 animate-fade" style={{ borderColor: 'rgba(255, 75, 75, 0.25)' }}>
                <div className="platform-link-header">
                  <div className="platform-brand-badge">
                    <svg className="platform-icon" viewBox="0 0 24 24" fill="#FF4B4B"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.25 18h-1.5v-6h1.5v6zm-3-4.5h-1.5v4.5h1.5v-4.5zm-3 3h-1.5v1.5h1.5v-1.5zm-3-6h-1.5v7.5h1.5V9z"/></svg>
                    <h4>{user?.codeforcesUsername ? 'Update Codeforces User ID' : 'Link Codeforces Account'}</h4>
                  </div>
                  {user?.codeforcesUsername && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingPlatformHandle(null)}>Cancel</button>
                  )}
                </div>
                <p className="platform-link-desc">
                  Enter your Codeforces handle to fetch verified problem verdicts, compute college leaderboard rank, and track progress on admin-added problems.
                </p>
                <form className="platform-link-form" onSubmit={handleSyncCodeforces}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Codeforces handle (e.g. tourist)"
                    value={codeforcesUsernameInput}
                    onChange={(e) => setCodeforcesUsernameInput(e.target.value)}
                  />
                  <button type="submit" className={`btn btn-primary ${codeforcesSyncLoading ? 'loading' : ''}`} disabled={codeforcesSyncLoading} style={{ backgroundColor: '#ff4b4b', borderColor: '#ff4b4b' }}>
                    {codeforcesSyncLoading ? 'Syncing...' : (user?.codeforcesUsername ? 'Save & Sync' : 'Link & Fetch Details')}
                  </button>
                </form>
              </div>
            )}

            <div className="leetcode-main-workspace animate-fade">
              {/* Codeforces header stats card */}
              <div className="glass-card leetcode-header-stats codeforces-header-stats">
                <div className="leetcode-stats-overview">
                  <div className="leetcode-stats-meta">
                    <h4>Linked Account: <span className="text-glow" style={{ color: '#ff4b4b' }}>{user?.codeforcesUsername || 'Not Linked'}</span></h4>
                    <p className="last-synced-text">
                      {user?.codeforcesUsername ? 'Performance synchronized from Codeforces profile.' : 'Link your User ID above to compute college rank and verify submissions.'}
                    </p>
                  </div>
                  <div className="leetcode-resync-form" style={{ display: 'flex', gap: '8px' }}>
                    {user?.codeforcesUsername && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingPlatformHandle(editingPlatformHandle === 'codeforces' ? null : 'codeforces')}
                      >
                        ✏️ Edit Handle
                      </button>
                    )}
                    <button 
                      type="button" 
                      className={`btn btn-primary ${codeforcesSyncLoading ? 'loading' : ''}`}
                      onClick={() => handleSyncCodeforces()}
                      disabled={codeforcesSyncLoading}
                      style={{ backgroundColor: '#ff4b4b', borderColor: '#ff4b4b' }}
                    >
                      {codeforcesSyncLoading ? 'Syncing...' : '🔄 Sync Statistics'}
                    </button>
                  </div>
                </div>

                <div className="leetcode-dashboard-stats-grid">
                  <div className="leetcode-stat-circle-boxCF">
                    <div 
                      className="leetcode-circle-progress" 
                      style={{ 
                        '--leetcode-pct': Math.min(100, Math.round(((practiceStats?.codeforces?.solvedCount || 0) / (practiceStats?.codeforces?.totalCount || codeforcesProblems.length || 1)) * 100)), 
                        borderColor: '#ff4b4b' 
                      }}
                    >
                      <span className="count">
                        {practiceStats?.codeforces?.solvedCount ?? 0}
                        <span style={{ fontSize: '13px', opacity: 0.7 }}>/{practiceStats?.codeforces?.totalCount ?? codeforcesProblems.length}</span>
                      </span>
                      <span className="label">Admin Solved</span>
                    </div>
                  </div>

                  {/* College Rank Box */}
                  <div className="platform-rank-box" style={{ borderColor: 'rgba(255, 75, 75, 0.25)', background: 'rgba(255, 75, 75, 0.05)' }}>
                    <span className="rank-title">College Rank</span>
                    <span className="rank-value" style={{ color: '#ff4b4b', textShadow: '0 0 12px rgba(255,75,75,0.4)' }}>
                      🏆 #{practiceStats?.codeforces?.rank || 1}
                    </span>
                    <span className="rank-subtitle">Out of {practiceStats?.codeforces?.totalStudents || 1} candidates</span>
                  </div>

                  <div className="leetcode-stat-breakdown-details">
                    {/* Rating */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl medium">Rating</span>
                        <span className="nums">{user?.codeforcesStats?.rating || 0}</span>
                      </div>
                      <div className="mini-bar-bg">
                        <div className="mini-bar-fill medium" style={{ width: `${Math.min(100, ((user?.codeforcesStats?.rating || 0) / 3000) * 100)}%`, backgroundColor: '#ff4b4b' }}></div>
                      </div>
                    </div>

                    {/* Max Rating */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl hard">Max Rating</span>
                        <span className="nums">{user?.codeforcesStats?.maxRating || 0}</span>
                      </div>
                      <div className="mini-bar-bg">
                        <div className="mini-bar-fill hard" style={{ width: `${Math.min(100, ((user?.codeforcesStats?.maxRating || 0) / 3000) * 100)}%`, backgroundColor: '#e22d2d' }}></div>
                      </div>
                    </div>

                    {/* Rank */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl easy">Rank</span>
                        <span className="nums" style={{ color: '#fff', fontWeight: 'bold' }}>{user?.codeforcesStats?.rank || 'Pupil'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* In-Tab Last Submission Viewer (Fits directly in Tab Space of Image 2) */}
              {renderInTabSolutionViewer('codeforces')}

              {/* Filter and Problem Table Section */}
              <div className="glass-card leetcode-problems-container">
                <div className="leetcode-problems-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3>Codeforces Practice Database</h3>
                    <span style={{ fontSize: '12px', background: 'rgba(255, 75, 75, 0.15)', color: '#ff4b4b', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(255, 75, 75, 0.3)' }}>
                      {practiceStats?.codeforces?.solvedCount || 0}/{practiceStats?.codeforces?.totalCount || codeforcesProblems.length} Solved
                    </span>
                  </div>
                  
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
                        <th style={{ width: '240px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const solvedIdsSet = getPlatformSolvedIds('codeforces', user, practiceStats, codeforcesProblems);
                        
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
                                  <button 
                                    className={`btn btn-sm ${isSolved ? 'btn-secondary' : 'btn-outline'}`}
                                    style={{ marginRight: '8px', fontSize: '12px' }}
                                    onClick={() => handleOpenSolutionModal(problem, 'codeforces')}
                                    title="View or save your last submission"
                                  >
                                    {isSolved ? 'View Solution' : 'Submit Solution'}
                                  </button>
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

            {/* CodeChef Handle Linking / Update Banner */}
            {(!user?.codechefUsername || editingPlatformHandle === 'codechef') && (
              <div className="glass-card platform-link-card mb-20 animate-fade" style={{ borderColor: 'rgba(211, 139, 39, 0.25)' }}>
                <div className="platform-link-header">
                  <div className="platform-brand-badge">
                    <svg className="platform-icon" viewBox="0 0 24 24" fill="#d38b27"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    <h4>{user?.codechefUsername ? 'Update CodeChef User ID' : 'Link CodeChef Account'}</h4>
                  </div>
                  {user?.codechefUsername && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingPlatformHandle(null)}>Cancel</button>
                  )}
                </div>
                <p className="platform-link-desc">
                  Enter your CodeChef handle to synchronize your solved problems, compute college rank, and track exact progress against admin-added challenges.
                </p>
                <form className="platform-link-form" onSubmit={handleSyncCodechef}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter CodeChef handle (e.g. chef_john)"
                    value={codechefUsernameInput}
                    onChange={(e) => setCodechefUsernameInput(e.target.value)}
                  />
                  <button type="submit" className={`btn btn-primary ${codechefSyncLoading ? 'loading' : ''}`} disabled={codechefSyncLoading} style={{ backgroundColor: '#d38b27', borderColor: '#d38b27' }}>
                    {codechefSyncLoading ? 'Syncing...' : (user?.codechefUsername ? 'Save & Sync' : 'Link & Fetch Details')}
                  </button>
                </form>
              </div>
            )}

            <div className="leetcode-main-workspace animate-fade">
              {/* CodeChef header stats card */}
              <div className="glass-card leetcode-header-stats codechef-header-stats">
                <div className="leetcode-stats-overview">
                  <div className="leetcode-stats-meta">
                    <h4>Linked Account: <span className="text-glow" style={{ color: '#d38b27' }}>{user?.codechefUsername || 'Not Linked'}</span></h4>
                    <p className="last-synced-text">
                      {user?.codechefUsername ? 'Performance synchronized from CodeChef profile.' : 'Link your User ID above to compute college rank and verify submissions.'}
                    </p>
                  </div>
                  <div className="leetcode-resync-form" style={{ display: 'flex', gap: '8px' }}>
                    {user?.codechefUsername && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingPlatformHandle(editingPlatformHandle === 'codechef' ? null : 'codechef')}
                      >
                        ✏️ Edit Handle
                      </button>
                    )}
                    <button 
                      type="button" 
                      className={`btn btn-primary ${codechefSyncLoading ? 'loading' : ''}`}
                      onClick={() => handleSyncCodechef()}
                      disabled={codechefSyncLoading}
                      style={{ backgroundColor: '#d38b27', borderColor: '#d38b27' }}
                    >
                      {codechefSyncLoading ? 'Syncing...' : '🔄 Sync Statistics'}
                    </button>
                  </div>
                </div>

                <div className="leetcode-dashboard-stats-grid">
                  <div className="leetcode-stat-circle-boxCC">
                    <div 
                      className="leetcode-circle-progress" 
                      style={{ 
                        '--leetcode-pct': Math.min(100, Math.round(((practiceStats?.codechef?.solvedCount || 0) / (practiceStats?.codechef?.totalCount || codechefProblems.length || 1)) * 100)), 
                        borderColor: '#d38b27' 
                      }}
                    >
                      <span className="count">
                        {practiceStats?.codechef?.solvedCount ?? 0}
                        <span style={{ fontSize: '13px', opacity: 0.7 }}>/{practiceStats?.codechef?.totalCount ?? codechefProblems.length}</span>
                      </span>
                      <span className="label">Admin Solved</span>
                    </div>
                  </div>

                  {/* College Rank Box */}
                  <div className="platform-rank-box" style={{ borderColor: 'rgba(211, 139, 39, 0.25)', background: 'rgba(211, 139, 39, 0.05)' }}>
                    <span className="rank-title">College Rank</span>
                    <span className="rank-value" style={{ color: '#d38b27', textShadow: '0 0 12px rgba(211,139,39,0.4)' }}>
                      🏆 #{practiceStats?.codechef?.rank || 1}
                    </span>
                    <span className="rank-subtitle">Out of {practiceStats?.codechef?.totalStudents || 1} candidates</span>
                  </div>

                  <div className="leetcode-stat-breakdown-details">
                    {/* Stars */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl easy" style={{ backgroundColor: '#d38b27', color: '#fff' }}>Stars</span>
                        <span className="nums" style={{ color: '#d38b27', fontWeight: 'bold' }}>{user?.codechefStats?.stars || '1★'}</span>
                      </div>
                    </div>

                    {/* Global Rank */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl medium">Global Rank</span>
                        <span className="nums">{user?.codechefStats?.globalRank || 0}</span>
                      </div>
                    </div>

                    {/* Country Rank */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl hard">Country Rank</span>
                        <span className="nums">{user?.codechefStats?.countryRank || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* In-Tab Last Submission Viewer (Fits directly in Tab Space of Image 2) */}
              {renderInTabSolutionViewer('codechef')}

              {/* Filter and Problem Table Section */}
              <div className="glass-card leetcode-problems-container">
                <div className="leetcode-problems-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3>CodeChef Practice Database</h3>
                    <span style={{ fontSize: '12px', background: 'rgba(211, 139, 39, 0.15)', color: '#d38b27', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(211, 139, 39, 0.3)' }}>
                      {practiceStats?.codechef?.solvedCount || 0}/{practiceStats?.codechef?.totalCount || codechefProblems.length} Solved
                    </span>
                  </div>
                  
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
                        <th style={{ width: '240px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const solvedIdsSet = getPlatformSolvedIds('codechef', user, practiceStats, codechefProblems);
                        
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
                                  <button 
                                    className={`btn btn-sm ${isSolved ? 'btn-secondary' : 'btn-outline'}`}
                                    style={{ marginRight: '8px', fontSize: '12px' }}
                                    onClick={() => handleOpenSolutionModal(problem, 'codechef')}
                                    title="View or save your last submission"
                                  >
                                    {isSolved ? 'View Solution' : 'Submit Solution'}
                                  </button>
                                  <a 
                                    href={`https://www.codechef.com/problems/${problem.slug?.toUpperCase()}`} 
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

            {/* HackerRank Handle Linking / Update Banner */}
            {(!user?.hackerrankUsername || editingPlatformHandle === 'hackerrank') && (
              <div className="glass-card platform-link-card mb-20 animate-fade" style={{ borderColor: 'rgba(46, 200, 102, 0.25)' }}>
                <div className="platform-link-header">
                  <div className="platform-brand-badge">
                    <svg className="platform-icon" viewBox="0 0 24 24" fill="#2ec866"><path d="M11.5 2C6.8 2 3 5.8 3 10.5c0 3.8 2.5 7 6 8.1v-2.2c-2.3-.9-4-3.1-4-5.9 0-3.4 2.8-6.2 6.2-6.2s6.2 2.8 6.2 6.2c0 2.8-1.7 5-4 5.9v2.2c3.5-1.1 6-4.3 6-8.1C19.5 5.8 15.7 2 11.5 2z"/></svg>
                    <h4>{user?.hackerrankUsername ? 'Update HackerRank User ID' : 'Link HackerRank Account'}</h4>
                  </div>
                  {user?.hackerrankUsername && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingPlatformHandle(null)}>Cancel</button>
                  )}
                </div>
                <p className="platform-link-desc">
                  Enter your HackerRank username to synchronize your badges, compute college rank, and track exact progress against admin-added challenges.
                </p>
                <form className="platform-link-form" onSubmit={handleSyncHackerrank}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter HackerRank username (e.g. hack_coder)"
                    value={hackerrankUsernameInput}
                    onChange={(e) => setHackerrankUsernameInput(e.target.value)}
                  />
                  <button type="submit" className={`btn btn-primary ${hackerrankSyncLoading ? 'loading' : ''}`} disabled={hackerrankSyncLoading} style={{ backgroundColor: '#2ec866', borderColor: '#2ec866' }}>
                    {hackerrankSyncLoading ? 'Syncing...' : (user?.hackerrankUsername ? 'Save & Sync' : 'Link & Fetch Details')}
                  </button>
                </form>
              </div>
            )}

            <div className="leetcode-main-workspace animate-fade">
              {/* HackerRank header stats card */}
              <div className="glass-card leetcode-header-stats hackerrank-header-stats">
                <div className="leetcode-stats-overview">
                  <div className="leetcode-stats-meta">
                    <h4>Linked Account: <span className="text-glow" style={{ color: '#2ec866' }}>{user?.hackerrankUsername || 'Not Linked'}</span></h4>
                    <p className="last-synced-text">
                      {user?.hackerrankUsername ? 'Performance synchronized from HackerRank profile.' : 'Link your User ID above to compute college rank and verify submissions.'}
                    </p>
                  </div>
                  <div className="leetcode-resync-form" style={{ display: 'flex', gap: '8px' }}>
                    {user?.hackerrankUsername && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingPlatformHandle(editingPlatformHandle === 'hackerrank' ? null : 'hackerrank')}
                      >
                        ✏️ Edit Handle
                      </button>
                    )}
                    <button 
                      type="button" 
                      className={`btn btn-primary ${hackerrankSyncLoading ? 'loading' : ''}`}
                      onClick={() => handleSyncHackerrank()}
                      disabled={hackerrankSyncLoading}
                      style={{ backgroundColor: '#2ec866', borderColor: '#2ec866' }}
                    >
                      {hackerrankSyncLoading ? 'Syncing...' : '🔄 Sync Statistics'}
                    </button>
                  </div>
                </div>

                <div className="leetcode-dashboard-stats-grid">
                  <div className="leetcode-stat-circle-boxHR">
                    <div 
                      className="leetcode-circle-progress" 
                      style={{ 
                        '--leetcode-pct': Math.min(100, Math.round(((practiceStats?.hackerrank?.solvedCount || 0) / (practiceStats?.hackerrank?.totalCount || hackerrankProblems.length || 1)) * 100)), 
                        borderColor: '#2ec866' 
                      }}
                    >
                      <span className="count">
                        {practiceStats?.hackerrank?.solvedCount ?? 0}
                        <span style={{ fontSize: '13px', opacity: 0.7 }}>/{practiceStats?.hackerrank?.totalCount ?? hackerrankProblems.length}</span>
                      </span>
                      <span className="label">Admin Solved</span>
                    </div>
                  </div>

                  {/* College Rank Box */}
                  <div className="platform-rank-box" style={{ borderColor: 'rgba(46, 200, 102, 0.25)', background: 'rgba(46, 200, 102, 0.05)' }}>
                    <span className="rank-title">College Rank</span>
                    <span className="rank-value" style={{ color: '#2ec866', textShadow: '0 0 12px rgba(46,200,102,0.4)' }}>
                      🏆 #{practiceStats?.hackerrank?.rank || 1}
                    </span>
                    <span className="rank-subtitle">Out of {practiceStats?.hackerrank?.totalStudents || 1} candidates</span>
                  </div>

                  <div className="leetcode-stat-breakdown-details">
                    {/* Score */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl easy" style={{ backgroundColor: '#2ec866', color: '#fff' }}>Score</span>
                        <span className="nums" style={{ color: '#2ec866', fontWeight: 'bold' }}>{user?.hackerrankStats?.score || 0}</span>
                      </div>
                    </div>

                    {/* Badges Count */}
                    <div className="leetcode-mini-bar">
                      <div className="mini-labels">
                        <span className="difficulty-lbl medium">Badges</span>
                        <span className="nums">{user?.hackerrankStats?.badgesCount || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* In-Tab Last Submission Viewer (Fits directly in Tab Space of Image 2) */}
              {renderInTabSolutionViewer('hackerrank')}

              {/* Filter and Problem Table Section */}
              <div className="glass-card leetcode-problems-container">
                <div className="leetcode-problems-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h3>HackerRank Practice Database</h3>
                    <span style={{ fontSize: '12px', background: 'rgba(46, 200, 102, 0.15)', color: '#2ec866', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(46, 200, 102, 0.3)' }}>
                      {practiceStats?.hackerrank?.solvedCount || 0}/{practiceStats?.hackerrank?.totalCount || hackerrankProblems.length} Solved
                    </span>
                  </div>
                  
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
                        <th style={{ width: '240px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const solvedIdsSet = getPlatformSolvedIds('hackerrank', user, practiceStats, hackerrankProblems);
                        
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
                                  <button 
                                    className={`btn btn-sm ${isSolved ? 'btn-secondary' : 'btn-outline'}`}
                                    style={{ marginRight: '8px', fontSize: '12px' }}
                                    onClick={() => handleOpenSolutionModal(problem, 'hackerrank')}
                                    title="View or save your last submission"
                                  >
                                    {isSolved ? 'View Solution' : 'Submit Solution'}
                                  </button>
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

      </div>
    </>
  );
};

export default AptitudeTests;
