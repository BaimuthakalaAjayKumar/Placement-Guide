import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import { API_URL } from '../config/api';
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
    const [curriculumSubjects, setCurriculumSubjects] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [selectedSubjectForNotes, setSelectedSubjectForNotes] = useState(null);
    const [showNotesReader, setShowNotesReader] = useState(false);
    const navigate = useNavigate();

    const queryParams = new URLSearchParams(window.location.search);
    const companyFilter = queryParams.get('company') || '';

    useEffect(() => {
        const fetchCurriculumData = async () => {
            try {
                setLoadingSubjects(true);
                const token = localStorage.getItem('token');
                const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const [subjRes, testsRes] = await Promise.all([
                    axios.get(`${API_URL}/academic/subjects`, headers).catch(() => ({ data: { data: [] } })),
                    axios.get(`${API_URL}/tests`, headers).catch(() => ({ data: { data: [] } }))
                ]);
                setCurriculumSubjects(subjRes.data?.data || []);
                setAllTests(testsRes.data?.data || []);
            } catch (err) {
                console.error('Failed to load curriculum subjects in Core CSE Prep:', err);
            } finally {
                setLoadingSubjects(false);
            }
        };

        fetchCurriculumData();
    }, []);

    const handleStartPractice = (subjectId) => {
        let url = `/aptitude-tests?category=${subjectId}`;
        if (companyFilter) url += `&company=${companyFilter}`;
        navigate(url);
    };

    const handleStartSubjectPractice = (subject) => {
        let url = `/aptitude-tests?category=core-cse&subject=${subject._id}`;
        if (companyFilter) url += `&company=${companyFilter}`;
        navigate(url);
    };

    const handleCodingPractice = (langId) => {
        let url = `/question-bank?topic=${langId}`;
        if (companyFilter) url += `&company=${companyFilter}`;
        navigate(url);
    };

    const openNotesReader = (subject) => {
        if (selectedSubjectForNotes?._id === subject._id && showNotesReader) {
            setShowNotesReader(false);
            setSelectedSubjectForNotes(null);
            return;
        }
        setSelectedSubjectForNotes(subject);
        setShowNotesReader(true);
        setTimeout(() => {
            document.getElementById('in-tab-notes-viewer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
    };

    return (
        <>
            <Header title="Core CSE Preparation" />
            <div className="content-wrapper core-cse-content animate-fade">

            <div className="header-section">
                <h1>Computer Science Fundamentals</h1>
                <p>Master the core subjective theoretical tests, faculty notes, and programming syntax required for top-tier corporate interviews.</p>
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
                <div>
                    {/* 1. CURRICULUM SUBJECTS ASSIGNED BY FACULTY */}
                    <div className="curriculum-section">
                        <div className="curriculum-header">
                            <h2>🏛️ Assigned Curriculum Subjects ({curriculumSubjects.length})</h2>
                            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Subject notes, revision guides & custom tests by your faculty</span>
                        </div>

                        {/* IN-TAB STUDY NOTES VIEWER (FITS SEAMLESSLY IN THE TAB SPACE OF IMAGE 2) */}
                        {showNotesReader && selectedSubjectForNotes && (
                            <div id="in-tab-notes-viewer" className="in-tab-notes-panel animate-fade">
                                <div className="in-tab-notes-header">
                                    <div>
                                        <h3>
                                            <span>📖</span> Study Notes & Materials: {selectedSubjectForNotes.name}
                                        </h3>
                                        <div className="in-tab-notes-tags">
                                            <span className="curriculum-code-badge" style={{ margin: 0 }}>{selectedSubjectForNotes.code}</span>
                                            <span className="scope-pill-tag">
                                                📅 {selectedSubjectForNotes.academicYear} {selectedSubjectForNotes.branch ? `· ${selectedSubjectForNotes.branch}` : ''}
                                            </span>
                                            <span className="notes-count-tag">
                                                📄 {(selectedSubjectForNotes.notes || []).length} Available Notes
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ fontSize: '12.5px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            onClick={() => handleStartSubjectPractice(selectedSubjectForNotes)}
                                        >
                                            🚀 Take Practice Test
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-close-notes-panel"
                                            onClick={() => { setShowNotesReader(false); setSelectedSubjectForNotes(null); }}
                                        >
                                            ✕ Close Notes
                                        </button>
                                    </div>
                                </div>

                                <div className="in-tab-notes-body">
                                    {selectedSubjectForNotes.notes && selectedSubjectForNotes.notes.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            {selectedSubjectForNotes.notes.map((note, idx) => (
                                                <div key={note._id || idx} className="note-card-item">
                                                    <div className="note-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                                        <div>
                                                            <h4 className="note-card-title">{note.title}</h4>
                                                            <div className="note-meta-line">
                                                                Posted by <strong>{note.uploaderName || 'Instructor'}</strong> ({note.uploaderRole || 'faculty'}) · {new Date(note.createdAt).toLocaleDateString()}
                                                                {note.section && <span style={{ marginLeft: '8px', color: '#38bdf8' }}>· Sec {note.section}</span>}
                                                            </div>
                                                        </div>
                                                        {note.fileUrl && (
                                                            <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" className="note-file-link">
                                                                📄 Open PDF / Attachment ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                    {note.description && (
                                                        <p style={{ margin: '0 0 10px', fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.5' }}>{note.description}</p>
                                                    )}
                                                    {note.content && (
                                                        <div className="note-content-box">
                                                            {note.content}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="in-tab-notes-empty">
                                            <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>
                                                No study notes or materials have been uploaded for this subject yet.
                                            </p>
                                            <p style={{ margin: '6px 0 18px', fontSize: '13px', color: '#94a3b8' }}>
                                                Check back soon as your faculty uploads lecture summaries and cheat sheets.
                                            </p>
                                            <button
                                                type="button"
                                                className="btn-orange-test"
                                                onClick={() => handleStartSubjectPractice(selectedSubjectForNotes)}
                                            >
                                                🚀 Practice Test for this Subject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {loadingSubjects ? (
                            <p className="loading-text" style={{ padding: '16px 0', color: '#94a3b8' }}>Loading assigned curriculum subjects...</p>
                        ) : curriculumSubjects.length > 0 ? (
                            <div className="grid-container" style={{ marginBottom: '2.5rem' }}>
                                {curriculumSubjects.map(subject => {
                                    const testCount = allTests.filter(t => t.subject === subject._id || t.subject?._id === subject._id || (t.title && t.title.toLowerCase().includes(subject.code.toLowerCase()))).length;
                                    const notesCount = subject.notes?.length || 0;
                                    const isViewingNotes = selectedSubjectForNotes?._id === subject._id && showNotesReader;
                                    return (
                                        <div
                                            key={subject._id}
                                            className="curriculum-card"
                                            style={isViewingNotes ? { borderColor: '#818cf8', boxShadow: '0 0 20px rgba(99, 102, 241, 0.35)' } : {}}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <span className="curriculum-code-badge">{subject.code}</span>
                                                    <span style={{ fontSize: '12px', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                                                        {subject.academicYear} {subject.branch ? `· ${subject.branch}` : ''}
                                                    </span>
                                                </div>
                                                <h3 style={{ margin: '8px 0 4px', fontSize: '1.2rem', color: '#f8fafc' }}>{subject.name}</h3>
                                                <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
                                                    {subject.description || 'Curriculum core computer science subject.'}
                                                </p>
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                                                  <span style={{ fontSize: '12px', color: '#93c5fd', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                                      📄 {notesCount} Notes
                                                  </span>
                                                  <span style={{ fontSize: '12px', color: '#c084fc', background: 'rgba(168, 85, 247, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                                                      🧪 {testCount} Practice Tests
                                                  </span>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-study-notes"
                                                        style={{
                                                            flex: 1,
                                                            justifyContent: 'center',
                                                            background: isViewingNotes ? 'rgba(99, 102, 241, 0.35)' : undefined,
                                                            borderColor: isViewingNotes ? '#818cf8' : undefined,
                                                            color: isViewingNotes ? '#ffffff' : undefined
                                                        }}
                                                        onClick={() => openNotesReader(subject)}
                                                    >
                                                        {isViewingNotes ? '📖 Viewing Notes (✕)' : `📖 Notes (${notesCount})`}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-take-test"
                                                        style={{ flex: 1 }}
                                                        onClick={() => handleStartSubjectPractice(subject)}
                                                    >
                                                        🚀 Take Test
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', marginBottom: '2.5rem' }}>
                                <p style={{ margin: 0 }}>No curriculum subjects assigned for your batch yet. You can explore standard CS domains below!</p>
                            </div>
                        )}
                    </div>

                    {/* 2. STANDARD CS DOMAINS */}
                    <div className="curriculum-header">
                        <h2>🧠 Standard Computer Science Interview Domains</h2>
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Comprehensive foundational MCQ test banks</span>
                    </div>

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
