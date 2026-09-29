import React, { useState } from 'react';
import './StudentDiscussionRooms.css';

const PREDEFINED_ROOMS = [
  {
    id: 'tcs-prep',
    name: 'TCS Preparation Room',
    icon: '🏢',
    desc: 'Discuss TCS NQT, Digital, Prime assessments, interview rounds, and tips.',
    members: 248,
    activeTopic: 'NQT Advanced Coding & Quantitative Strategies',
    initialMessages: [
      { id: 1, sender: 'Pooja V (CSE)', text: 'What is the cutoff for TCS Digital this year from GRIET?', time: '10 mins ago', replies: 3 },
      { id: 2, sender: 'Rahul M (IT)', text: 'Focus heavily on Compound Interest, Syllogisms, and 2D Matrix DP for coding round.', time: '1 hour ago', replies: 8 }
    ]
  },
  {
    id: 'amazon-prep',
    name: 'Amazon Preparation Room',
    icon: '🚀',
    desc: 'Amazon WOW, SDE Internship, Leadership Principles, and LeetCode Medium/Hard discussions.',
    members: 195,
    activeTopic: '16 Leadership Principles & Low Level System Design',
    initialMessages: [
      { id: 3, sender: 'Karthik R (CSE)', text: 'Does Amazon ask Graph Dijkstra or standard BFS in Round 1 OA?', time: '25 mins ago', replies: 5 },
      { id: 4, sender: 'Sneha K (ECE)', text: 'Always prepare STAR format answers for "Customer Obsession" and "Bias for Action"!', time: '2 hours ago', replies: 12 }
    ]
  },
  {
    id: 'dsa-discussion',
    name: 'DSA Discussion Room',
    icon: '🌳',
    desc: 'Algorithms, Data Structures, LeetCode daily problems, CP Ladder, and time complexity analysis.',
    members: 412,
    activeTopic: 'Dynamic Programming vs Memoization Patterns',
    initialMessages: [
      { id: 5, sender: 'Aditya N (CSE)', text: 'How do you identify whether a problem needs 0/1 Knapsack or Unbounded Knapsack?', time: '5 mins ago', replies: 7 },
      { id: 6, sender: 'Divya P (AIML)', text: 'Check if items can be reused multiple times. If yes, it is unbounded!', time: '15 mins ago', replies: 2 }
    ]
  },
  {
    id: 'aptitude-mastery',
    name: 'Aptitude Mastery Room',
    icon: '📊',
    desc: 'Speed math, quantitative ability, logical reasoning, data interpretation, and verbal practice.',
    members: 330,
    activeTopic: 'Time, Speed & Distance Shortcut Formulas',
    initialMessages: [
      { id: 7, sender: 'Manoj G (Mech)', text: 'Any shortcut trick for circular track relative speed problems?', time: '40 mins ago', replies: 4 }
    ]
  },
  {
    id: 'interview-experience',
    name: 'Interview Experience Room',
    icon: '🎤',
    desc: 'Recent placement drive debriefs, technical interview questions, and HR round debriefs.',
    members: 380,
    activeTopic: 'Cognizant & Accenture Round 2 Experiences',
    initialMessages: [
      { id: 8, sender: 'Naveen T (CSE)', text: 'Just finished Cognizant GenC Next interview. Asked about Spring Boot annotations and SQL Joins.', time: '30 mins ago', replies: 9 }
    ]
  },
  {
    id: 'resume-review',
    name: 'Resume Review Room',
    icon: '📄',
    desc: 'Get feedback on your resume formatting, ATS scores, action verbs, and project descriptions.',
    members: 275,
    activeTopic: 'Formatting Projects for Maximum ATS Impact',
    initialMessages: [
      { id: 9, sender: 'Harika B (IT)', text: 'Can someone review my full-stack MERN project bullet points?', time: '12 mins ago', replies: 6 }
    ]
  }
];

const StudentDiscussionRooms = () => {
  const [selectedRoomId, setSelectedRoomId] = useState('tcs-prep');
  const [roomMessages, setRoomMessages] = useState(() => {
    const map = {};
    PREDEFINED_ROOMS.forEach(r => { map[r.id] = r.initialMessages; });
    return map;
  });
  const [newMessageText, setNewMessageText] = useState('');

  const currentRoom = PREDEFINED_ROOMS.find(r => r.id === selectedRoomId) || PREDEFINED_ROOMS[0];
  const messages = roomMessages[selectedRoomId] || [];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'You (Student)',
      text: newMessageText.trim(),
      time: 'Just now',
      replies: 0
    };

    setRoomMessages(prev => ({
      ...prev,
      [selectedRoomId]: [newMsg, ...(prev[selectedRoomId] || [])]
    }));
    setNewMessageText('');
  };

  return (
    <div className="discussion-rooms-container animate-fade">
      {/* Room Directory Header */}
      <div className="rooms-header-banner glass-card">
        <div>
          <h2>💬 Student Discussion Rooms</h2>
          <p>Collaborate, share interview insights, ask questions, and prepare together with peers across departments.</p>
        </div>
        <div className="rooms-meta-pill">
          <span>6 Active Rooms</span> · <span>1,800+ Students Active</span>
        </div>
      </div>

      <div className="rooms-grid-layout">
        {/* Left Side: Room Selector Pills */}
        <div className="rooms-sidebar-list glass-card">
          <h4>Select Discussion Room</h4>
          <div className="room-nav-items">
            {PREDEFINED_ROOMS.map(r => (
              <button
                key={r.id}
                type="button"
                className={`room-nav-btn ${selectedRoomId === r.id ? 'active' : ''}`}
                onClick={() => setSelectedRoomId(r.id)}
              >
                <span className="room-icon">{r.icon}</span>
                <div className="room-nav-text">
                  <strong>{r.name}</strong>
                  <span className="room-meta-sub">{r.members} members</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Active Room View */}
        <div className="active-room-panel glass-card">
          <div className="active-room-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span style={{ fontSize: '2rem' }}>{currentRoom.icon}</span>
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc' }}>{currentRoom.name}</h3>
                <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>{currentRoom.desc}</p>
              </div>
            </div>
            <span className="live-topic-tag">
              🔥 Trending: {currentRoom.activeTopic}
            </span>
          </div>

          {/* New message input box */}
          <form onSubmit={handleSendMessage} className="room-composer-form">
            <input
              type="text"
              placeholder={`Share question or insight in ${currentRoom.name}...`}
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="room-input-field"
            />
            <button type="submit" className="room-send-btn">
              Post to Room →
            </button>
          </form>

          {/* Messages list */}
          <div className="room-messages-feed">
            {messages.length > 0 ? (
              messages.map(m => (
                <div key={m.id} className="room-message-card">
                  <div className="message-header-row">
                    <span className="message-sender">
                      <span className="sender-avatar">👤</span> {m.sender}
                    </span>
                    <span className="message-time">{m.time}</span>
                  </div>
                  <p className="message-body">{m.text}</p>
                  <div className="message-footer-row">
                    <button type="button" className="message-reply-action">
                      💬 {m.replies} Replies
                    </button>
                    <button type="button" className="message-reply-action">
                      👍 Helpful
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="room-empty-state">
                <p>No messages yet in this room. Be the first to start the discussion!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDiscussionRooms;
