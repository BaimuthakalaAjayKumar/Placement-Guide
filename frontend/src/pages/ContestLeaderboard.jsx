import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './ContestsPortal.css';

const ContestLeaderboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [contestTitle, setContestTitle] = useState('');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/contests/internal/${id}/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setContestTitle(data.data.title);
        setRankings(data.data.rankings || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="exam-loading">
        <div className="spinner-loader"></div>
        <p>Loading scoreboard rankings...</p>
      </div>
    );
  }

  return (
    <>
      <Header title="Contest Leaderboard" />

      <div className="content-wrapper">
        <div className="section-header-flex mb-20 animate-fade">
          <div>
            <h2>🏆 Leaderboard Ranking</h2>
            <h3 style={{ color: '#ecc94b', marginTop: '5px' }}>{contestTitle}</h3>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/contests')}>
            Back to Contests
          </button>
        </div>

        <div className="glass-card scoreboard-card animate-fade">
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
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
                </tr>
              </thead>
              <tbody>
                {rankings.map((r) => (
                  <tr key={r.rank} className={r.rank === 1 ? 'gold-rank' : r.rank === 2 ? 'silver-rank' : r.rank === 3 ? 'bronze-rank' : ''}>
                    <td>{r.date || 'N/A'}</td>
                    <td>
                      <span className="rank-badge">
                        {r.rank === 1 ? '🥇 1' : r.rank === 2 ? '🥈 2' : r.rank === 3 ? '🥉 3' : `#${r.rank}`}
                      </span>
                    </td>
                    <td>{r.rollNumber}</td>
                    <td><strong>{r.name}</strong></td>
                    <td>{r.branch}</td>
                    <td>
                      <span className="status-badge-inline" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e0' }}>
                        {r.languages || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: '#48bb78' }}>
                        {r.solvedCount} / {r.totalQuestions || 0}
                      </strong>
                    </td>
                    <td>
                      <span className="score-badge">{r.score} / 100</span>
                    </td>
                    <td>{r.timeSpent}</td>
                    <td>
                      <span className={`status-badge-inline ${r.isFinished ? 'completed' : 'live'}`}>
                        {r.isFinished ? 'Finished' : 'Coding'}
                      </span>
                    </td>
                  </tr>
                ))}
                {rankings.length === 0 && (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: '#718096' }}>
                      No submissions logged yet. The leaderboard will update once candidates start coding!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ContestLeaderboard;
