import React, { useState } from 'react';
import Header from '../components/Header';
import './ResumeBuilder.css';

const ResumeBuilder = () => {
    const [formData, setFormData] = useState({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1 (555) 123-4567',
        linkedin: 'linkedin.com/in/johndoe',
        github: 'github.com/johndoe',
        education: [
            { institution: 'University of Engineering', degree: 'B.Tech in Computer Science', year: '2020 - 2024', grade: '8.5 CGPA' }
        ],
        experience: [
            { company: 'Tech Solutions Inc.', role: 'Software Engineering Intern', duration: 'May 2023 - Aug 2023', description: 'Developed REST APIs using Node.js and Express. Improved database querying speed by 20%.' }
        ],
        projects: [
            { title: 'Placement Preparation Portal', tech: 'MERN Stack, Socket.IO', description: 'A comprehensive SAAS platform for interview preparation featuring real-time collaborative coding and AI resume reviews.' }
        ],
        skills: 'JavaScript, React.js, Node.js, Express, MongoDB, Python, Java, C++, SQL',
        certifications: [
            { name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', year: '2023', link: 'aws.amazon.com/verification' }
        ],
        achievements: [
            { title: 'Winner - National Smart India Hackathon', organization: 'Ministry of Education / AICTE', year: '2023', description: 'Secured 1st place among 450+ teams nationally for developing an AI-driven student placement readiness analytics engine.' }
        ]
    });

    const handleChange = (e, section, index, field) => {
        if (section === 'personal') {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        } else if (section === 'skills') {
            setFormData({ ...formData, skills: e.target.value });
        } else {
            const updatedSection = [...formData[section]];
            updatedSection[index][field] = e.target.value;
            setFormData({ ...formData, [section]: updatedSection });
        }
    };

    const handleAddField = (section, defaultObj) => {
        setFormData({ ...formData, [section]: [...formData[section], defaultObj] });
    };

    const handleRemoveField = (section, index) => {
        const updatedSection = formData[section].filter((_, i) => i !== index);
        setFormData({ ...formData, [section]: updatedSection });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <Header title="AI Resume Builder" />
            <div className="content-wrapper resume-builder-content animate-fade">

                <div className="builder-container no-print">
                    <div className="editor-panel">
                        <h2>Resume Details</h2>

                        <div className="form-section">
                            <h3>Personal Info</h3>
                            <input type="text" name="name" value={formData.name} onChange={(e) => handleChange(e, 'personal')} placeholder="Full Name" />
                            <input type="email" name="email" value={formData.email} onChange={(e) => handleChange(e, 'personal')} placeholder="Email" />
                            <input type="text" name="phone" value={formData.phone} onChange={(e) => handleChange(e, 'personal')} placeholder="Phone Number" />
                            <input type="text" name="linkedin" value={formData.linkedin} onChange={(e) => handleChange(e, 'personal')} placeholder="LinkedIn URL" />
                            <input type="text" name="github" value={formData.github} onChange={(e) => handleChange(e, 'personal')} placeholder="GitHub URL" />
                        </div>

                        <div className="form-section">
                            <h3>Education</h3>
                            {formData.education.map((edu, i) => (
                                <div key={i} className="dynamic-field">
                                    <div className="dynamic-field-header">
                                        <span className="field-badge">Education #{i + 1}</span>
                                        {formData.education.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn-remove-item"
                                                onClick={() => handleRemoveField('education', i)}
                                                title="Remove this education"
                                            >
                                                ✕ Remove
                                            </button>
                                        )}
                                    </div>
                                    <input type="text" value={edu.institution} onChange={(e) => handleChange(e, 'education', i, 'institution')} placeholder="Institution Name" />
                                    <input type="text" value={edu.degree} onChange={(e) => handleChange(e, 'education', i, 'degree')} placeholder="Degree (e.g., B.Tech CSE)" />
                                    <input type="text" value={edu.year} onChange={(e) => handleChange(e, 'education', i, 'year')} placeholder="Duration (e.g., 2020 - 2024)" />
                                    <input type="text" value={edu.grade} onChange={(e) => handleChange(e, 'education', i, 'grade')} placeholder="Grade / CGPA" />
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn-add"
                                onClick={() => handleAddField('education', { institution: '', degree: '', year: '', grade: '' })}
                            >
                                + Add Education
                            </button>
                        </div>

                        <div className="form-section">
                            <h3>Experience (Internships/Jobs)</h3>
                            {formData.experience.map((exp, i) => (
                                <div key={i} className="dynamic-field">
                                    <div className="dynamic-field-header">
                                        <span className="field-badge">Experience #{i + 1}</span>
                                        <button
                                            type="button"
                                            className="btn-remove-item"
                                            onClick={() => handleRemoveField('experience', i)}
                                            title="Remove this experience"
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                    <input type="text" value={exp.company} onChange={(e) => handleChange(e, 'experience', i, 'company')} placeholder="Company Name" />
                                    <input type="text" value={exp.role} onChange={(e) => handleChange(e, 'experience', i, 'role')} placeholder="Role" />
                                    <input type="text" value={exp.duration} onChange={(e) => handleChange(e, 'experience', i, 'duration')} placeholder="Duration" />
                                    <textarea value={exp.description} onChange={(e) => handleChange(e, 'experience', i, 'description')} placeholder="Description / Impact" rows="3"></textarea>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn-add"
                                onClick={() => handleAddField('experience', { company: '', role: '', duration: '', description: '' })}
                            >
                                + Add Experience
                            </button>
                        </div>

                        <div className="form-section">
                            <h3>Projects</h3>
                            {formData.projects.map((proj, i) => (
                                <div key={i} className="dynamic-field">
                                    <div className="dynamic-field-header">
                                        <span className="field-badge">Project #{i + 1}</span>
                                        <button
                                            type="button"
                                            className="btn-remove-item"
                                            onClick={() => handleRemoveField('projects', i)}
                                            title="Remove this project"
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                    <input type="text" value={proj.title} onChange={(e) => handleChange(e, 'projects', i, 'title')} placeholder="Project Title" />
                                    <input type="text" value={proj.tech} onChange={(e) => handleChange(e, 'projects', i, 'tech')} placeholder="Tech Stack" />
                                    <textarea value={proj.description} onChange={(e) => handleChange(e, 'projects', i, 'description')} placeholder="Project Description" rows="3"></textarea>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn-add"
                                onClick={() => handleAddField('projects', { title: '', tech: '', description: '' })}
                            >
                                + Add Project
                            </button>
                        </div>

                        <div className="form-section">
                            <h3>Technical Skills</h3>
                            <textarea name="skills" value={formData.skills} onChange={(e) => handleChange(e, 'skills')} placeholder="Comma separated skills (e.g., React.js, Node.js, Python)" rows="3"></textarea>
                        </div>

                        {/* Certifications Section */}
                        <div className="form-section">
                            <h3>Certifications</h3>
                            {formData.certifications.map((cert, i) => (
                                <div key={i} className="dynamic-field">
                                    <div className="dynamic-field-header">
                                        <span className="field-badge">Certification #{i + 1}</span>
                                        <button
                                            type="button"
                                            className="btn-remove-item"
                                            onClick={() => handleRemoveField('certifications', i)}
                                            title="Remove this certification"
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                    <input type="text" value={cert.name} onChange={(e) => handleChange(e, 'certifications', i, 'name')} placeholder="Certification Name (e.g. AWS Solutions Architect)" />
                                    <input type="text" value={cert.issuer} onChange={(e) => handleChange(e, 'certifications', i, 'issuer')} placeholder="Issuing Organization (e.g. Amazon Web Services)" />
                                    <input type="text" value={cert.year} onChange={(e) => handleChange(e, 'certifications', i, 'year')} placeholder="Issue Date / Year (e.g. 2023)" />
                                    <input type="text" value={cert.link} onChange={(e) => handleChange(e, 'certifications', i, 'link')} placeholder="Credential URL or ID" />
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn-add"
                                onClick={() => handleAddField('certifications', { name: '', issuer: '', year: '', link: '' })}
                            >
                                + Add Certification
                            </button>
                        </div>

                        {/* Achievements & Honors Section */}
                        <div className="form-section">
                            <h3>Achievements & Honors</h3>
                            {formData.achievements.map((ach, i) => (
                                <div key={i} className="dynamic-field">
                                    <div className="dynamic-field-header">
                                        <span className="field-badge">Achievement #{i + 1}</span>
                                        <button
                                            type="button"
                                            className="btn-remove-item"
                                            onClick={() => handleRemoveField('achievements', i)}
                                            title="Remove this achievement"
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                    <input type="text" value={ach.title} onChange={(e) => handleChange(e, 'achievements', i, 'title')} placeholder="Achievement Title / Honor" />
                                    <input type="text" value={ach.organization} onChange={(e) => handleChange(e, 'achievements', i, 'organization')} placeholder="Awarding Organization / Context" />
                                    <input type="text" value={ach.year} onChange={(e) => handleChange(e, 'achievements', i, 'year')} placeholder="Year (e.g. 2023)" />
                                    <textarea value={ach.description} onChange={(e) => handleChange(e, 'achievements', i, 'description')} placeholder="Achievement Description / Details" rows="2"></textarea>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="btn-add"
                                onClick={() => handleAddField('achievements', { title: '', organization: '', year: '', description: '' })}
                            >
                                + Add Achievement
                            </button>
                        </div>

                        <div className="form-actions">
                            <button className="btn-download" onClick={handlePrint}>Download PDF</button>
                        </div>
                    </div>

                    <div className="preview-panel">
                        <div className="a4-resume-preview print-area">
                            <div className="resume-header">
                                <h1>{formData.name || 'Your Name'}</h1>
                                <div className="contact-links">
                                    <span>{formData.email}</span>
                                    {formData.phone && <span> | {formData.phone}</span>}
                                    {formData.linkedin && <span> | {formData.linkedin}</span>}
                                    {formData.github && <span> | {formData.github}</span>}
                                </div>
                            </div>

                            {formData.education.length > 0 && formData.education[0].institution !== '' && (
                                <div className="resume-section">
                                    <h2>EDUCATION</h2>
                                    <hr />
                                    {formData.education.map((edu, i) => (
                                        <div key={i} className="resume-item">
                                            <div className="item-header">
                                                <strong>{edu.institution}</strong>
                                                <span>{edu.year}</span>
                                            </div>
                                            <div className="item-subheader">
                                                <span>{edu.degree}</span>
                                                <span>{edu.grade}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {formData.skills && (
                                <div className="resume-section">
                                    <h2>TECHNICAL SKILLS</h2>
                                    <hr />
                                    <p className="skills-text">{formData.skills}</p>
                                </div>
                            )}

                            {formData.experience.length > 0 && formData.experience[0].company !== '' && (
                                <div className="resume-section">
                                    <h2>EXPERIENCE</h2>
                                    <hr />
                                    {formData.experience.map((exp, i) => (
                                        <div key={i} className="resume-item">
                                            <div className="item-header">
                                                <strong>{exp.company}</strong>
                                                <span>{exp.duration}</span>
                                            </div>
                                            <div className="item-subheader">
                                                <em>{exp.role}</em>
                                            </div>
                                            <p className="item-desc">{exp.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {formData.projects.length > 0 && formData.projects[0].title !== '' && (
                                <div className="resume-section">
                                    <h2>PROJECTS</h2>
                                    <hr />
                                    {formData.projects.map((proj, i) => (
                                        <div key={i} className="resume-item">
                                            <div className="item-header">
                                                <strong>{proj.title}</strong>
                                                <em> | {proj.tech}</em>
                                            </div>
                                            <p className="item-desc mt-1">{proj.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* CERTIFICATIONS PREVIEW */}
                            {formData.certifications && formData.certifications.length > 0 && formData.certifications[0].name !== '' && (
                                <div className="resume-section">
                                    <h2>CERTIFICATIONS</h2>
                                    <hr />
                                    {formData.certifications.map((cert, i) => (
                                        <div key={i} className="resume-item">
                                            <div className="item-header">
                                                <strong>{cert.name}</strong>
                                                <span>{cert.year}</span>
                                            </div>
                                            <div className="item-subheader">
                                                <span>{cert.issuer}</span>
                                                {cert.link && <span className="cert-link">{cert.link}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ACHIEVEMENTS PREVIEW */}
                            {formData.achievements && formData.achievements.length > 0 && formData.achievements[0].title !== '' && (
                                <div className="resume-section">
                                    <h2>ACHIEVEMENTS & HONORS</h2>
                                    <hr />
                                    {formData.achievements.map((ach, i) => (
                                        <div key={i} className="resume-item">
                                            <div className="item-header">
                                                <strong>{ach.title}</strong>
                                                <span>{ach.year}</span>
                                            </div>
                                            {ach.organization && (
                                                <div className="item-subheader">
                                                    <em>{ach.organization}</em>
                                                </div>
                                            )}
                                            {ach.description && <p className="item-desc mt-1">{ach.description}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResumeBuilder;
