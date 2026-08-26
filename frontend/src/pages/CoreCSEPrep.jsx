import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import './CoreCSEPrep.css';

const CS_DOMAINS = [
    { id: 'dsa', name: 'Data Structures and Algorithms', icon: '🧠', color: 'bg-blue-900 border-blue-500' },
    { id: 'dbms', name: 'Database Management Systems', icon: '🗄️', color: 'bg-indigo-900 border-indigo-500' },
    { id: 'os', name: 'Operating Systems', icon: '💻', color: 'bg-purple-900 border-purple-500' },
    { id: 'cn', name: 'Computer Networks', icon: '🌐', color: 'bg-teal-900 border-teal-500' },
    { id: 'oop', name: 'Object-Oriented Programming', icon: '📦', color: 'bg-orange-900 border-orange-500' },
    { id: 'sql', name: 'SQL & Query Optimization', icon: '🔍', color: 'bg-blue-800 border-blue-400' }
];

const PROGRAMMING_LANGUAGES = [
    { id: 'c', name: 'C Programming', icon: 'C' },
    { id: 'cpp', name: 'C++ Programming', icon: 'C++' },
    { id: 'java', name: 'Java Programming', icon: '☕' },
    { id: 'python', name: 'Python Programming', icon: '🐍' },
    { id: 'javascript', name: 'JavaScript', icon: 'JS' }
];

const CoreCSEPrep = () => {
    const [activeTab, setActiveTab] = useState('domains');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleStartPractice = (subjectId) => {
        // Navigate to aptitude test page filtered by core subject category
        navigate(`/aptitude-tests?category=${subjectId}`);
    };

    const handleCodingPractice = (langId) => {
        // Navigate to coding question bank filtered by language or generic
        navigate(`/question-bank?topic=${langId}`);
    };

    return (
        <>
            <Header title="Core CSE Preparation" />
            <div className="content-wrapper core-cse-content animate-fade">

            <div className="header-section">
                <h1>Computer Science Fundamentals</h1>
                <p>Master the core subjective theoretical tests and programming syntax required for top-tier corporate interviews.</p>
            </div>

            <div className="tabs-container">
                <button
                    className={`tab-btn ${activeTab === 'domains' ? 'active' : ''}`}
                    onClick={() => setActiveTab('domains')}
                >
                    Core Subjects
                </button>
                <button
                    className={`tab-btn ${activeTab === 'languages' ? 'active' : ''}`}
                    onClick={() => setActiveTab('languages')}
                >
                    Programming Languages
                </button>
            </div>

            {activeTab === 'domains' && (
                <div className="grid-container">
                    {CS_DOMAINS.map(domain => (
                        <div key={domain.id} className={`subject-card ${domain.color}`}>
                            <div className="subject-icon">{domain.icon}</div>
                            <div className="subject-details">
                                <h3>{domain.name}</h3>
                                <p>Topics, Practice MCQs, Tests</p>
                            </div>
                            <div className="subject-actions">
                                <button className="btn-take-test" onClick={() => handleStartPractice(domain.id)}>
                                    Take Test
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'languages' && (
                <div className="grid-container">
                    {PROGRAMMING_LANGUAGES.map(lang => (
                        <div key={lang.id} className="subject-card bg-slate-800 border-slate-600">
                            <div className="subject-icon language-icon">{lang.icon}</div>
                            <div className="subject-details">
                                <h3>{lang.name}</h3>
                                <p>Syntax MCQs & Algorithms</p>
                            </div>
                            <div className="subject-actions">
                                <button className="btn-take-test mx-1" onClick={() => handleStartPractice(lang.id)}>
                                    MCQ Test
                                </button>
                                <button className="btn-code mx-1" onClick={() => handleCodingPractice(lang.id)}>
                                    Code Mode
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </>
    );
};

export default CoreCSEPrep;
