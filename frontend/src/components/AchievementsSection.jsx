import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAIContext } from '../context/AIContext';
import { API_URL } from '../config/api';
import './AchievementsSection.css';

const CATEGORIES = [
  'All',
  'Coding',
  'Projects',
  'Learning',
  'Interviews',
  'Resume',
  'Contests',
  'Placement',
  'GitHub',
  'Academic',
  'Community'
];

const RARITIES = ['All Rarities', 'Common', 'Rare', 'Epic', 'Legendary'];

const AchievementsSection = () => {
  const { token, user } = useAuth();
  const { openAgentWithAction } = useAIContext();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState('');
  const [data, setData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'unlocked' | 'locked'
  const [selectedRarity, setSelectedRarity] = useState('All Rarities');

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/achievements/my`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAchievements();
    }
  }, [token]);

  const handleSyncActivity = async () => {
    try {
      setSyncing(true);
      setSyncSuccess('');
      const res = await fetch(`${API_URL}/achievements/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (json.success) {
        setSyncSuccess(
          json.newlyUnlocked?.length > 0
            ? `🎉 Unlocked ${json.newlyUnlocked.length} new badge${json.newlyUnlocked.length > 1 ? 's' : ''}!`
            : '✓ Verified & synchronized with platform records!'
        );
        await fetchAchievements();
        setTimeout(() => setSyncSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Failed to sync achievements:', err);
    } finally {
      setSyncing(false);
    }
  };

  const filteredAchievements = useMemo(() => {
    if (!data?.achievements) return [];

    return data.achievements.filter(item => {
      // Category filter
      if (selectedCategory !== 'All' && item.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus === 'unlocked' && !item.isUnlocked) {
        return false;
      }
      if (selectedStatus === 'locked' && item.isUnlocked) {
        return false;
      }
      // Rarity filter
      if (selectedRarity !== 'All Rarities' && item.rarity !== selectedRarity) {
        return false;
      }
      return true;
    });
  }, [data, selectedCategory, selectedStatus, selectedRarity]);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        <div className="spinner-loader" style={{ margin: '0 auto 16px auto' }} />
        <p>Evaluating and loading your verified CampusBridge achievements...</p>
      </div>
    );
  }

  const {
    totalBadges = 0,
    unlockedCount = 0,
    totalPoints = 0,
    currentStreak = 0,
    longestStreak = 0,
    totalProblemsSolved = 0,
    projectsApproved = 0,
    placementReadiness = null,
    categories = []
  } = data || {};

  const completionPct = totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;

  return (
    <div className="achievements-section-container">
      {/* Hero Stats Card */}
      <div className="achievements-hero-card">
        <div className="achievements-hero-top">
          <div className="achievements-hero-title-group">
            <h2>
              <span>🏆</span> Badges &amp; Achievements
            </h2>
            <p>
              Achievements are earned strictly through genuine platform activity across coding, projects, academics, and placements.
            </p>
          </div>

          <button
            type="button"
            className="achievements-sync-btn"
            onClick={handleSyncActivity}
            disabled={syncing}
            title="Re-evaluate achievements with latest submissions and projects"
          >
            <span>{syncing ? '⏳' : '🔄'}</span>
            <span>{syncing ? 'Evaluating Activity...' : 'Synchronize Live Activity'}</span>
          </button>
        </div>

        {syncSuccess && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}>
            {syncSuccess}
          </div>
        )}

        {/* 4 Core Stat Boxes */}
        <div className="achievements-stats-grid">
          <div className="achievement-stat-box">
            <span className="achievement-stat-icon">🎖️</span>
            <div className="achievement-stat-content">
              <span className="achievement-stat-val">{unlockedCount} / {totalBadges}</span>
              <span className="achievement-stat-lbl">Badges Unlocked ({completionPct}%)</span>
            </div>
          </div>

          <div className="achievement-stat-box">
            <span className="achievement-stat-icon">⚡</span>
            <div className="achievement-stat-content">
              <span className="achievement-stat-val">{totalPoints.toLocaleString()} PTS</span>
              <span className="achievement-stat-lbl">Achievement Points</span>
            </div>
          </div>

          <div className="achievement-stat-box">
            <span className="achievement-stat-icon">🔥</span>
            <div className="achievement-stat-content">
              <span className="achievement-stat-val">{currentStreak} Days</span>
              <span className="achievement-stat-lbl">Current Streak (Best: {longestStreak}d)</span>
            </div>
          </div>

          <div className="achievement-stat-box">
            <span className="achievement-stat-icon">💻</span>
            <div className="achievement-stat-content">
              <span className="achievement-stat-val">{totalProblemsSolved}</span>
              <span className="achievement-stat-lbl">Problems Solved ({projectsApproved} Projects)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Placement Readiness Summary Card */}
      {placementReadiness && (
        <div className="achievements-readiness-card">
          <div className="achievements-readiness-header">
            <div>
              <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.15rem' }}>
                📊 Multi-Pillar Placement Readiness
              </h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.84rem' }}>
                Holistic employability evaluation based on your active CampusBridge milestones.
              </p>
            </div>

            <div className="achievements-readiness-score-banner">
              <span className="readiness-big-score">{placementReadiness.overallPercentage}%</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '700' }}>Overall Readiness</span>
            </div>
          </div>

          <div className="achievements-readiness-bars">
            {[
              { label: 'Projects & Studio', val: placementReadiness.projects },
              { label: 'Academics & CGPA', val: placementReadiness.academics },
              { label: 'Coding & DSA', val: placementReadiness.coding },
              { label: 'Resume ATS', val: placementReadiness.resume },
              { label: 'Mock Interviews', val: placementReadiness.interviews }
            ].map(item => {
              const fillClass = item.val >= 75 ? 'high' : item.val >= 50 ? 'medium' : 'low';
              return (
                <div key={item.label} className="readiness-bar-item">
                  <div className="readiness-bar-labels">
                    <span>{item.label}</span>
                    <span>{item.val}%</span>
                  </div>
                  <div className="readiness-track">
                    <div
                      className={`readiness-fill ${fillClass}`}
                      style={{ width: `${item.val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="achievements-advice-box">
            <div className="achievements-advice-text">
              <strong>💡 AI Recommendation ({placementReadiness.weakestArea}):</strong> {placementReadiness.recommendation}
            </div>
            <button
              type="button"
              className="achievements-ask-ai-btn"
              onClick={() => openAgentWithAction('PLACEMENT_ANALYSIS', 'Analyze my placement readiness breakdown and suggest my weekly preparation plan.')}
            >
              🤖 Ask AI to Guide Me
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs by Category */}
      <div className="achievements-filters-wrap">
        <div className="achievements-categories-scroll">
          {CATEGORIES.map(cat => {
            const catStat = categories.find(c => c.name === cat);
            const countStr = catStat ? `${catStat.unlocked}/${catStat.total}` : '';

            return (
              <button
                key={cat}
                type="button"
                className={`achievements-cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <span>{cat}</span>
                {countStr && <span className="achievements-cat-count">{countStr}</span>}
              </button>
            );
          })}
        </div>

        {/* Status and Rarity Sub-Filters */}
        <div className="achievements-subfilters-row">
          <div className="achievements-status-pills">
            {['All', 'unlocked', 'locked'].map(st => (
              <button
                key={st}
                type="button"
                className={`achievements-pill-btn ${selectedStatus === st ? 'active' : ''}`}
                onClick={() => setSelectedStatus(st)}
              >
                {st === 'All' ? 'All Status' : st === 'unlocked' ? '✅ Unlocked' : '🔒 In Progress'}
              </button>
            ))}
          </div>

          <div className="achievements-rarity-pills">
            {RARITIES.map(r => (
              <button
                key={r}
                type="button"
                className={`achievements-pill-btn ${selectedRarity === r ? 'active' : ''}`}
                onClick={() => setSelectedRarity(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements Cards Grid */}
      <div className="achievements-grid">
        {filteredAchievements.length > 0 ? (
          filteredAchievements.map(ach => {
            const isStreak = ach.category === 'Coding' && ach.slug?.includes('streak');
            const targetVal = ach.progress?.target || ach.criteria?.threshold || 1;
            const curVal = ach.progress?.current || 0;
            const remaining = Math.max(0, targetVal - curVal);

            let remainingText = '';
            if (!ach.isUnlocked && remaining > 0) {
              if (isStreak) {
                remainingText = `${remaining} more day${remaining > 1 ? 's' : ''} to unlock`;
              } else if (ach.category === 'Resume') {
                remainingText = `${remaining} points needed to reach target`;
              } else if (ach.category === 'Academic') {
                remainingText = 'Target next semester evaluation';
              } else {
                remainingText = `${remaining} more to unlock`;
              }
            }

            return (
              <div
                key={ach._id || ach.slug}
                className={`achievement-card ${ach.isUnlocked ? 'unlocked' : 'locked'} rarity-${ach.rarity}`}
              >
                <div>
                  <div className="achievement-card-top">
                    <div className="achievement-icon-wrap">
                      {ach.icon || '🏆'}
                    </div>
                    <div className="achievement-card-info">
                      <div className="achievement-card-title-row">
                        <h4 className="achievement-card-name">{ach.name}</h4>
                        <span className={`achievement-rarity-tag ${ach.rarity}`}>
                          {ach.rarity}
                        </span>
                      </div>
                      <span className="achievement-card-cat">{ach.category}</span>
                    </div>
                  </div>

                  <p className="achievement-card-desc">{ach.description}</p>
                </div>

                <div>
                  {/* Progress Bar */}
                  <div className="achievement-progress-wrap">
                    <div className="achievement-progress-labels">
                      <span className="achievement-progress-title">
                        {isStreak ? 'Current Streak:' : 'Progress:'}
                      </span>
                      <span className="achievement-progress-val">
                        {ach.isUnlocked
                          ? `${targetVal} / ${targetVal}`
                          : ach.progress?.detail || `${curVal} / ${targetVal}`}
                      </span>
                    </div>

                    <div className="achievement-progress-track">
                      <div
                        className="achievement-progress-fill"
                        style={{ width: `${ach.isUnlocked ? 100 : ach.progress?.percentage || 0}%` }}
                      />
                    </div>

                    {!ach.isUnlocked && remainingText && (
                      <div className="achievement-progress-remaining">
                        {remainingText}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Footer */}
                  <div className="achievement-card-footer">
                    <span className="achievement-points-tag">
                      <span>⚡</span> +{ach.points} PTS
                    </span>

                    <span className={`achievement-status-tag ${ach.isUnlocked ? 'unlocked' : 'locked'}`}>
                      {ach.isUnlocked ? (
                        <>
                          <span>✓</span>
                          <span>
                            {ach.earnedAt ? `Unlocked ${new Date(ach.earnedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'Unlocked'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span>🔒</span>
                          <span>In Progress</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{
            gridColumn: '1 / -1',
            padding: '3rem',
            textAlign: 'center',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            color: '#94a3b8'
          }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔍</span>
            <h4>No achievements match your filter criteria</h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              Try selecting "All" categories or adjusting the status/rarity filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsSection;
