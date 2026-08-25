import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import './CompanyPrep.css';

const CORPORATE_TRACKS = [
    { id: 'google', name: 'Google', type: 'Product', logo: 'G', color: 'border-red-500' },
    { id: 'amazon', name: 'Amazon', type: 'Product', logo: 'A', color: 'border-orange-400' },
    { id: 'microsoft', name: 'Microsoft', type: 'Product', logo: 'M', color: 'border-blue-500' },
    { id: 'tcs', name: 'TCS', type: 'Service', logo: 'T', color: 'border-indigo-400' },
    { id: 'infosys', name: 'Infosys', type: 'Service', logo: 'I', color: 'border-blue-400' },
    { id: 'wipro', name: 'Wipro', type: 'Service', logo: 'W', color: 'border-green-400' }
];

const CompanyPrep = () => {
    const [selectedCompany, setSelectedCompany] = useState(null);
    const navigate = useNavigate();

    const handleTrackSelection = (track) => {
        // In a real app, this would route to a filtered view or fetch data specifically for that company
        navigate(`/question-bank?company=${track}`);
    };

    return (
        <div className="company-prep-layout">
            <Sidebar />
            <div className="company-prep-main">
                <Header title="Company Specific Preparation" />

                <div className="company-prep-content">
                    <div className="company-header-section">
                        <h1>Corporate Hiring Pathways</h1>
                        <p>Target your preparation according to the exact assessment templates utilized by top recruiters.</p>
                    </div>

                    <div className="company-grid">
                        {CORPORATE_TRACKS.map(company => (
                            <div
                                key={company.id}
                                className={`company-card ${company.color} ${selectedCompany === company.id ? 'selected' : ''}`}
                                onClick={() => setSelectedCompany(company.id)}
                            >
                                <div className="company-logo-stub">{company.logo}</div>
                                <h3>{company.name}</h3>
                                <span className="company-badge">{company.type}</span>
                            </div>
                        ))}
                    </div>

                    {selectedCompany && (
                        <div className="company-details-panel">
                            <h2>{CORPORATE_TRACKS.find(c => c.id === selectedCompany)?.name} Preparation Roadmap</h2>

                            <div className="roadmap-stages">
                                <div className="stage-card">
                                    <div className="stage-number">1</div>
                                    <h4>Aptitude & Logic</h4>
                                    <p>Standard numerical reasoning and pattern completions.</p>
                                    <button className="btn-stage" onClick={() => navigate(`/aptitude-tests?company=${selectedCompany}`)}>Practice Aptitude</button>
                                </div>

                                <div className="stage-card">
                                    <div className="stage-number">2</div>
                                    <h4>Coding & Algorithms</h4>
                                    <p>Medium/Hard Data Structure manipulations.</p>
                                    <button className="btn-stage" onClick={() => handleTrackSelection(selectedCompany)}>Solve Problems</button>
                                </div>

                                <div className="stage-card">
                                    <div className="stage-number">3</div>
                                    <h4>Technical & Core</h4>
                                    <p>CS fundamentals including OS, DBMS, networking.</p>
                                    <button className="btn-stage" onClick={() => navigate(`/core-cse`)}>Start Core CSE</button>
                                </div>

                                <div className="stage-card">
                                    <div className="stage-number">4</div>
                                    <h4>Mock Interview</h4>
                                    <p>AI powered conversational behavioral assessments.</p>
                                    <button className="btn-stage" onClick={() => navigate(`/mock-interviews?role=${selectedCompany}`)}>Simulate Interview</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CompanyPrep;
