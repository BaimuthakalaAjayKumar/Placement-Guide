import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  
  // Profile settings state
  const [targetRole, setTargetRole] = useState(user?.targetRole || 'Software Engineer');
  const [bio, setBio] = useState(user?.bio || '');
  const [skillsText, setSkillsText] = useState(user?.skills?.join(', ') || '');
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');
  const [branch, setBranch] = useState(user?.branch || '');
  const [year, setYear] = useState(user?.year || '');
  
  // Platform usernames state
  const [leetcodeUsername, setLeetcodeUsername] = useState(user?.leetcodeUsername || '');
  const [codeforcesUsername, setCodeforcesUsername] = useState(user?.codeforcesUsername || '');
  const [codechefUsername, setCodechefUsername] = useState(user?.codechefUsername || '');
  const [hackerrankUsername, setHackerrankUsername] = useState(user?.hackerrankUsername || '');
  
  // UI States
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
 
  // Sync state if user changes in context
  useEffect(() => {
    if (user) {
      setTargetRole(user.targetRole || 'Software Engineer');
      setBio(user.bio || '');
      setSkillsText(user.skills?.join(', ') || '');
      setRollNumber(user.rollNumber || '');
      setBranch(user.branch || '');
      setYear(user.year || '');
      setLeetcodeUsername(user.leetcodeUsername || '');
      setCodeforcesUsername(user.codeforcesUsername || '');
      setCodechefUsername(user.codechefUsername || '');
      setHackerrankUsername(user.hackerrankUsername || '');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const parsedSkills = skillsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const res = await updateProfile({
        targetRole,
        bio,
        skills: parsedSkills,
        rollNumber: rollNumber.trim(),
        branch: branch.trim(),
        year: year.trim(),
        leetcodeUsername: leetcodeUsername.trim(),
        codeforcesUsername: codeforcesUsername.trim(),
        codechefUsername: codechefUsername.trim(),
        hackerrankUsername: hackerrankUsername.trim()
      });

      if (res.success) {
        setSuccessMsg('Profile and platform accounts updated successfully!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'S';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <Header title="My Profile" />
      <div className="content-wrapper profile-page-content animate-fade">
        {successMsg && (
          <div className="success-banner animate-fade">
            <span className="banner-icon">✓</span>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="error-banner animate-fade">
            <span className="banner-icon">⚠</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="profile-grid">
          {/* Left Column: Summary Card */}
          <div className="profile-summary-column">
            <div className="glass-card student-info-card">
              <div className="student-profile-header">
                <div className="profile-avatar-large">
                  {getInitials(user?.name)}
                </div>
                <h2>{user?.name}</h2>
                <p className="student-email">{user?.email}</p>
                <div className="profile-role-pill">{user?.role === 'admin' ? 'Administrator' : targetRole}</div>
              </div>
              
              <div className="student-meta-list">
                <div className="meta-item">
                  <span className="meta-label">Account Type:</span>
                  <span className="meta-value">{user?.role === 'admin' ? 'Admin' : 'Student'}</span>
                </div>
                {user?.rollNumber && (
                  <div className="meta-item animate-fade">
                    <span className="meta-label">Roll Number:</span>
                    <span className="meta-value">{user.rollNumber}</span>
                  </div>
                )}
                {user?.branch && (
                  <div className="meta-item animate-fade">
                    <span className="meta-label">Branch:</span>
                    <span className="meta-value">{user.branch}</span>
                  </div>
                )}
                {user?.year && (
                  <div className="meta-item animate-fade">
                    <span className="meta-label">Grad Year:</span>
                    <span className="meta-value">{user.year}</span>
                  </div>
                )}
                <div className="meta-item">
                  <span className="meta-label">Joined On:</span>
                  <span className="meta-value">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'June 2026'}
                  </span>
                </div>
              </div>

              <div className="profile-divider-horizontal"></div>

              <div className="linked-platforms-status">
                <h3>Platform Accounts Status</h3>
                <div className="status-item">
                  <span className="platform-name leetcode">LeetCode</span>
                  <span className={`status-badge ${user?.leetcodeUsername ? 'linked' : 'unlinked'}`}>
                    {user?.leetcodeUsername ? 'Linked' : 'Not Linked'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="platform-name codeforces">Codeforces</span>
                  <span className={`status-badge ${user?.codeforcesUsername ? 'linked' : 'unlinked'}`}>
                    {user?.codeforcesUsername ? 'Linked' : 'Not Linked'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="platform-name codechef">CodeChef</span>
                  <span className={`status-badge ${user?.codechefUsername ? 'linked' : 'unlinked'}`}>
                    {user?.codechefUsername ? 'Linked' : 'Not Linked'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="platform-name hackerrank">HackerRank</span>
                  <span className={`status-badge ${user?.hackerrankUsername ? 'linked' : 'unlinked'}`}>
                    {user?.hackerrankUsername ? 'Linked' : 'Not Linked'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Edit Forms */}
          <div className="profile-form-column">
            <form onSubmit={handleSubmit} className="profile-edit-form">
              {/* Profile Details Card */}
              <div className="glass-card form-section-card">
                <div className="section-header">
                  <svg className="section-icon" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  <h3>Personal & Placement Details</h3>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="targetRole">Target Career Role</label>
                  <select
                    id="targetRole"
                    className="form-control"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  >
                    <option value="Software Engineer">Software Engineer</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Full Stack Developer">Full Stack Developer</option>
                    <option value="Data Scientist">Data Scientist</option>
                  </select>
                  <p className="field-help">This role guides custom preparation content and recommendations.</p>
                </div>

                <div className="form-grid-three-col">
                  <div className="form-group">
                    <label className="form-label" htmlFor="rollNumber">Roll Number</label>
                    <input
                      type="text"
                      id="rollNumber"
                      className="form-control"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. 21H11A0501"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="branch">Branch</label>
                    <input
                      type="text"
                      id="branch"
                      className="form-control"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="e.g. CSE"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="year">Graduation Year</label>
                    <input
                      type="text"
                      id="year"
                      className="form-control"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="e.g. 2026"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="bio">Professional Summary / Bio</label>
                  <textarea
                    id="bio"
                    className="form-control"
                    rows="4"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about your background, achievements, and career focus..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="skills">Skills</label>
                  <input
                    type="text"
                    id="skills"
                    className="form-control"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    placeholder="e.g. React, Node.js, C++, SQL, Python"
                  />
                  <p className="field-help">Enter your skills separated by commas.</p>
                  
                  {/* Real-time skill badges */}
                  {skillsText.trim() && (
                    <div className="skills-preview-list">
                      {skillsText.split(',').map(s => s.trim()).filter(Boolean).map((skill, idx) => (
                        <span className="skill-badge-preview animate-fade" key={idx}>{skill}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Coding Platforms Card */}
              <div className="glass-card form-section-card mt-24">
                <div className="section-header">
                  <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
                  <h3>Competitive Programming Profiles</h3>
                </div>
                <p className="section-desc">
                  Provide your coding platform usernames. We use these handles to sync your solved questions and achievements.
                </p>

                <div className="form-group">
                  <label className="form-label platform-label" htmlFor="leetcode">
                    <svg className="platform-icon" viewBox="0 0 24 24" style={{ fill: '#FFA116' }}><path d="M13.483 0a1.374 1.374 0 0 0-.961.414l-9.177 9.178a1.35 1.35 0 0 0-.415.962c0 .356.141.696.393.948l8.344 8.344a1.35 1.35 0 0 0 .963.414c.356 0 .696-.142.948-.394l9.178-9.177a1.35 1.35 0 0 0 .415-.963 1.35 1.35 0 0 0-.393-.948l-8.344-8.344A1.374 1.374 0 0 0 13.483 0zM13.775 2.228c.1 0 .2.04.27.11l7.305 7.305c.148.148.148.39 0 .538l-8.158 8.158a.38.38 0 0 1-.27.11c-.1 0-.2-.04-.27-.11l-7.305-7.305a.38.38 0 0 1-.11-.27c0-.1.04-.2.11-.27l8.158-8.158c.07-.07.17-.11.27-.11z"/></svg>
                    LeetCode Username
                  </label>
                  <input
                    type="text"
                    id="leetcode"
                    className="form-control"
                    value={leetcodeUsername}
                    onChange={(e) => setLeetcodeUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label platform-label" htmlFor="codeforces">
                    <svg className="platform-icon" viewBox="0 0 24 24" style={{ fill: '#FF4B4B' }}><path d="M4.5 7.5h1.5v15H4.5zM0 12h1.5v10.5H0zM9 3h1.5v19.5H9z"/></svg>
                    Codeforces Username
                  </label>
                  <input
                    type="text"
                    id="codeforces"
                    className="form-control"
                    value={codeforcesUsername}
                    onChange={(e) => setCodeforcesUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label platform-label" htmlFor="codechef">
                    <span className="platform-star" style={{ color: '#D4AF37' }}>★</span>
                    CodeChef Username
                  </label>
                  <input
                    type="text"
                    id="codechef"
                    className="form-control"
                    value={codechefUsername}
                    onChange={(e) => setCodechefUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label platform-label" htmlFor="hackerrank">
                    <svg className="platform-icon" viewBox="0 0 24 24" style={{ fill: '#2EC866' }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                    HackerRank Username
                  </label>
                  <input
                    type="text"
                    id="hackerrank"
                    className="form-control"
                    value={hackerrankUsername}
                    onChange={(e) => setHackerrankUsername(e.target.value)}
                    placeholder="username"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="profile-form-actions mt-24">
                <button type="submit" className="btn btn-primary btn-lg" disabled={saveLoading}>
                  {saveLoading ? (
                    <>
                      <span className="spinner-mini"></span>
                      Saving Changes...
                    </>
                  ) : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
