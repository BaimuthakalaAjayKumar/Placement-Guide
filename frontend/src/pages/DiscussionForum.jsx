import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { API_URL } from '../config/api';
import './DiscussionForum.css';

const GENERAL_CATEGORIES = ['All', 'Placement', 'Coding', 'Aptitude', 'Interview', 'Technical Subjects'];

const DiscussionForum = () => {
  const { token, user } = useAuth();

  // Top-level forum separation: 'general' (the present one) vs 'subject' (subject-wise allocated)
  const [activeForumType, setActiveForumType] = useState('general');

  // Posts state
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // General Forum Filter & Search
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Subject-wise Forum States
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState('');

  // Create Post Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'Placement',
    subjectId: '',
    academicYear: '',
    branch: '',
    section: ''
  });
  const [submittingPost, setSubmittingPost] = useState(false);

  // Comment State
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Reply State
  const [activeReplyCommentId, setActiveReplyCommentId] = useState(null);
  const [newReplyText, setNewReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Fetch subjects available to user (faculty's allocated subjects, student's year/branch subjects, or all for admin)
  const fetchAvailableSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const res = await fetch(`${API_URL}/academic/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSubjects(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load academic subjects', err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // Fetch posts based on active forum type and filters
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `${API_URL}/discussions?forumType=${activeForumType}`;
      const params = [];

      if (activeForumType === 'general') {
        if (activeCategory && activeCategory !== 'All') {
          params.push(`category=${encodeURIComponent(activeCategory)}`);
        }
      } else {
        // Subject-wise forum filters
        if (selectedSubjectFilter && selectedSubjectFilter !== 'All') {
          params.push(`subjectId=${encodeURIComponent(selectedSubjectFilter)}`);
        }
        if (selectedBranchFilter && selectedBranchFilter !== 'All') {
          params.push(`branch=${encodeURIComponent(selectedBranchFilter)}`);
        }
        if (selectedYearFilter && selectedYearFilter !== 'All') {
          params.push(`academicYear=${encodeURIComponent(selectedYearFilter)}`);
        }
      }

      if (searchQuery.trim()) {
        params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      }

      if (params.length > 0) {
        url += `&${params.join('&')}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch discussions.');
      }
    } catch (err) {
      setError('Could not connect to discussion forum server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAvailableSubjects();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchPosts();
    }
  }, [token, activeForumType, activeCategory, selectedSubjectFilter, selectedBranchFilter, selectedYearFilter, searchQuery]);

  // Handle switching forums
  const handleSwitchForumType = (type) => {
    setActiveForumType(type);
    setShowCreateForm(false);
    setSearchQuery('');
    setError('');
  };

  // Create post handler
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Please fill in both title and content.');
      return;
    }

    if (activeForumType === 'subject' && !newPost.subjectId) {
      alert('Please select an Academic Subject for this discussion.');
      return;
    }

    try {
      setSubmittingPost(true);
      const payload = {
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        forumType: activeForumType,
        category: activeForumType === 'subject' ? 'Technical Subjects' : newPost.category,
        subjectId: activeForumType === 'subject' ? newPost.subjectId : undefined,
        academicYear: newPost.academicYear || undefined,
        branch: newPost.branch || undefined,
        section: newPost.section || undefined
      };

      const res = await fetch(`${API_URL}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setNewPost({
          title: '',
          content: '',
          category: 'Placement',
          subjectId: '',
          academicYear: '',
          branch: '',
          section: ''
        });
        setShowCreateForm(false);
        setSuccessMsg(activeForumType === 'subject' ? 'Subject discussion published successfully!' : 'Discussion thread published!');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchPosts();
      } else {
        alert(data.error || 'Failed to publish post');
      }
    } catch (err) {
      alert('Could not publish discussion post.');
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/discussions/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => p._id === postId ? data.data : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (postId) => {
    if (!newCommentText.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await fetch(`${API_URL}/discussions/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: newCommentText })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => p._id === postId ? data.data : p));
        setNewCommentText('');
      } else {
        alert(data.error || 'Failed to add comment');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddReply = async (postId, commentId) => {
    if (!newReplyText.trim()) return;

    try {
      setSubmittingReply(true);
      const res = await fetch(`${API_URL}/discussions/${postId}/comment/${commentId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: newReplyText })
      });
      const data = await res.json();
      if (data.success) {
        setPosts(prev => prev.map(p => p._id === postId ? data.data : p));
        setNewReplyText('');
        setActiveReplyCommentId(null);
      } else {
        alert(data.error || 'Failed to add reply');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReport = async (postId) => {
    try {
      const res = await fetch(`${API_URL}/discussions/${postId}/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        alert('Thank you. The post has been flagged for moderation.');
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this discussion post permanently?')) return;
    try {
      const res = await fetch(`${API_URL}/discussions/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchPosts();
      } else {
        alert(data.error || 'Failed to delete post');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to render author badge with distinct styling
  const renderAuthorBadge = (role = 'student') => {
    if (role === 'faculty') {
      return <span className="author-role-badge author-role-faculty">👨‍🏫 Faculty</span>;
    }
    if (role === 'admin') {
      return <span className="author-role-badge author-role-admin">🛡️ Admin</span>;
    }
    return <span className="author-role-badge author-role-student">🎓 Student</span>;
  };

  // Can delete post check: author, admin, or faculty assigned to subject
  const canDeletePost = (post) => {
    if (user?.role === 'admin') return true;
    if (post.user === user?._id || post.user === user?.id) return true;
    if (user?.role === 'faculty' && post.forumType === 'subject') {
      if (!user.managedScopes || user.managedScopes.length === 0) return true;
      return user.managedScopes.some(s => {
        if (s.subject && post.subject && String(s.subject) === String(post.subject)) return true;
        const yearMatch = !s.academicYear || s.academicYear.toLowerCase() === 'all' || (post.academicYear && post.academicYear.toLowerCase().includes(s.academicYear.toLowerCase()));
        const branchMatch = !s.branch || s.branch.toLowerCase() === 'all' || (post.branch && post.branch.toLowerCase() === s.branch.toLowerCase());
        return yearMatch && branchMatch;
      });
    }
    return false;
  };

  // Unique branches from subjects
  const availableBranches = [...new Set(subjects.map(s => s.branch).filter(Boolean))];
  const availableYears = [...new Set(subjects.map(s => s.academicYear).filter(Boolean))];

  return (
    <>
      <Header title="Collaborative Discussion Forum" />
      <div className="content-wrapper forum-content animate-fade" style={{ padding: '2rem', overflowY: 'auto' }}>
        <div className="forum-container">

          {/* Top-Level Forum Selector Tabs */}
          <div className="forum-top-nav">
            <button
              type="button"
              className={`forum-nav-tab ${activeForumType === 'general' ? 'active' : ''}`}
              onClick={() => handleSwitchForumType('general')}
            >
              <span>🌐 Campus Placement Forum (General)</span>
              <span className="tab-badge">{activeForumType === 'general' ? posts.length : 'All'}</span>
            </button>

            <button
              type="button"
              className={`forum-nav-tab ${activeForumType === 'subject' ? 'active' : ''}`}
              onClick={() => handleSwitchForumType('subject')}
            >
              <span>📚 Subject-wise Academic Forum (Scope Allocated)</span>
              <span className="tab-badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                {subjects.length} Subjects
              </span>
            </button>
          </div>

          {/* Scope Explanation Banner */}
          {activeForumType === 'subject' ? (
            <div className="forum-scope-banner">
              <div className="forum-scope-info">
                <span style={{ fontSize: '20px' }}>🎯</span>
                <div>
                  <strong style={{ color: '#34d399', display: 'block', fontSize: '13.5px' }}>
                    {user?.role === 'faculty'
                      ? 'Faculty Subject-Allocated Discussion Forum'
                      : user?.role === 'student'
                      ? 'Student Academic & Subject Discussions'
                      : 'Admin Master Academic Subject Discussions (All Departments)'}
                  </strong>
                  <span style={{ color: '#94a3b8', fontSize: '12.5px' }}>
                    {user?.role === 'faculty'
                      ? 'Showing discussions matching your assigned subjects & teaching scopes. Connect with students enrolled in your course.'
                      : user?.role === 'student'
                      ? 'Showing discussions for your academic branch, year, and course subjects. Ask doubts and interact with faculty.'
                      : 'Full campus oversight of subject discussions across all engineering branches, semesters, and sections.'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="code-pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' }}>
                  {subjects.length} Accessible Subject{subjects.length === 1 ? '' : 's'}
                </span>
                <button
                  type="button"
                  onClick={fetchPosts}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '12px', padding: '4px 10px' }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="forum-scope-banner" style={{ borderLeftColor: '#6366f1' }}>
              <div className="forum-scope-info">
                <span style={{ fontSize: '20px' }}>💼</span>
                <div>
                  <strong style={{ color: '#818cf8', display: 'block', fontSize: '13.5px' }}>
                    College-Wide Placement & Career Guidance Forum
                  </strong>
                  <span style={{ color: '#94a3b8', fontSize: '12.5px' }}>
                    General placement discussion threads: Interview experiences, coding challenges, aptitude prep, and career strategy.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchPosts}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                🔄 Refresh
              </button>
            </div>
          )}

          {/* Feedback Banners */}
          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button className="banner-close-btn" onClick={() => setError('')}>×</button>
            </div>
          )}
          {successMsg && (
            <div className="success-banner">
              <span>{successMsg}</span>
              <button className="banner-close-btn" onClick={() => setSuccessMsg('')}>×</button>
            </div>
          )}

          {/* Filter & Action Controls */}
          <div className="forum-controls-bar">
            {activeForumType === 'general' ? (
              /* General Forum Category Filter Pills */
              <div className="category-pills-row">
                {GENERAL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-pill ${(cat === 'All' && !activeCategory) || activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat === 'All' ? '' : cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            ) : (
              /* Subject-wise Forum Selectors */
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                <select
                  className="form-control"
                  style={{ maxWidth: '280px', padding: '8px 12px', fontSize: '13px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px' }}
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                >
                  <option value="">📚 All Accessible Subjects ({subjects.length})</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>
                      [{s.code || 'SUB'}] {s.name} {s.branch ? `(${s.branch})` : ''}
                    </option>
                  ))}
                </select>

                {availableBranches.length > 0 && (
                  <select
                    className="form-control"
                    style={{ maxWidth: '170px', padding: '8px 12px', fontSize: '13px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px' }}
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  >
                    <option value="">All Branches</option>
                    {availableBranches.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                )}

                {availableYears.length > 0 && (
                  <select
                    className="form-control"
                    style={{ maxWidth: '170px', padding: '8px 12px', fontSize: '13px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px' }}
                    value={selectedYearFilter}
                    onChange={(e) => setSelectedYearFilter(e.target.value)}
                  >
                    <option value="">All Academic Years</option>
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? '✕ Cancel' : activeForumType === 'subject' ? '➕ Post Subject Discussion' : '➕ Create Post'}
            </button>
          </div>

          {/* Create Post Modal / Expandable Form */}
          {showCreateForm && (
            <div className="glass-card animate-fade" style={{ padding: '22px', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{activeForumType === 'subject' ? '📚 Start Subject Discussion' : '💬 Start General Placement Thread'}</span>
                </h3>
                <span className="code-pill" style={{ background: activeForumType === 'subject' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: activeForumType === 'subject' ? '#34d399' : '#818cf8' }}>
                  Posting as {user?.role ? user.role.toUpperCase() : 'USER'}
                </span>
              </div>

              <form onSubmit={handleCreatePost}>
                {/* If Subject Forum: Subject Selection */}
                {activeForumType === 'subject' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                    <div>
                      <label className="form-label" style={{ fontWeight: 600 }}>Target Academic Subject *</label>
                      <select
                        className="form-control"
                        value={newPost.subjectId}
                        onChange={(e) => {
                          const sId = e.target.value;
                          const found = subjects.find(s => s._id === sId);
                          setNewPost({
                            ...newPost,
                            subjectId: sId,
                            academicYear: found?.academicYear || newPost.academicYear,
                            branch: found?.branch || newPost.branch,
                            section: found?.section || newPost.section
                          });
                        }}
                        required
                        style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '100%', borderRadius: '6px' }}
                      >
                        <option value="">-- Choose Subject ({subjects.length} Available) --</option>
                        {subjects.map(s => (
                          <option key={s._id} value={s._id}>
                            [{s.code || 'CODE'}] {s.name} {s.branch ? `(${s.branch})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Academic Year (Optional Scope)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 3rd Year / 2026"
                        value={newPost.academicYear}
                        onChange={(e) => setNewPost({ ...newPost, academicYear: e.target.value })}
                        style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '100%', borderRadius: '6px' }}
                      />
                    </div>

                    <div>
                      <label className="form-label">Branch & Section (Optional Scope)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. CSE"
                          value={newPost.branch}
                          onChange={(e) => setNewPost({ ...newPost, branch: e.target.value })}
                          style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '60%', borderRadius: '6px' }}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Sec A"
                          value={newPost.section}
                          onChange={(e) => setNewPost({ ...newPost, section: e.target.value })}
                          style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '40%', borderRadius: '6px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* If General Forum: Category Selection */}
                {activeForumType === 'general' && (
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontWeight: 600 }}>Forum Category</label>
                    <select
                      className="form-control"
                      value={newPost.category}
                      onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                      style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '100%', borderRadius: '6px' }}
                    >
                      {GENERAL_CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Discussion Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={activeForumType === 'subject' ? 'e.g. Question on Deadlock Prevention algorithms in Unit 2...' : 'e.g. Tips for cracking Technical Rounds at Google / Amazon...'}
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    required
                    style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '100%', borderRadius: '6px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Post Content *</label>
                  <textarea
                    className="form-control"
                    placeholder="Provide details, code snippets, or specific questions..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    required
                    rows="5"
                    style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '100%', borderRadius: '6px', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary" disabled={submittingPost}>
                    {submittingPost ? 'Publishing Post...' : '🚀 Publish Discussion'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search bar */}
          <div>
            <input
              type="text"
              placeholder={`Search ${activeForumType === 'subject' ? 'subject' : 'placement'} discussions by title, subject, or keywords...`}
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '12px 16px', background: '#1e293b', border: '1px solid #334155', color: 'white', width: '100%', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          {/* Posts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {loading ? (
              <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                <div className="spinner-loader" style={{ margin: '0 auto 12px' }}></div>
                <p>Loading {activeForumType === 'subject' ? 'subject-wise' : 'placement'} discussions...</p>
              </div>
            ) : posts.length > 0 ? (
              posts.map(post => (
                <div className="post-card" key={post._id}>

                  {/* Header: Tags & Moderation Controls */}
                  <div className="post-header">
                    <div className="post-tags">
                      {post.forumType === 'subject' ? (
                        <>
                          <span className="subject-badge">
                            📖 {post.subjectCode ? `[${post.subjectCode}] ` : ''}{post.subjectName || 'Subject Discussion'}
                          </span>
                          {(post.academicYear || post.branch) && (
                            <span className="scope-pill">
                              🎯 {post.academicYear || ''}{post.branch ? ` • ${post.branch}` : ''}{post.section ? ` Sec ${post.section}` : ''}
                            </span>
                          )}
                        </>
                      ) : (
                        <span
                          style={{
                            background: '#6366f1',
                            color: 'white',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}
                        >
                          {post.category || 'Placement'}
                        </span>
                      )}

                      {/* Author Role Badge */}
                      {renderAuthorBadge(post.userRole)}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleReport(post._id)}
                        title="Report inappropriate post"
                        style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        ⚠️ Report
                      </button>
                      {canDeletePost(post) && (
                        <button
                          onClick={() => handleDelete(post._id)}
                          title="Delete this discussion permanently"
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Author Meta */}
                  <h3 className="post-title">{post.title}</h3>
                  <div className="post-author-line">
                    <span>By <strong>{post.userName}</strong></span>
                    {post.userRollNumber && <span>({post.userRollNumber})</span>}
                    <span>•</span>
                    <span>{new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Content */}
                  <p className="post-content-body">{post.content}</p>

                  {/* Actions Bar */}
                  <div className="post-actions-row">
                    <button
                      className={`action-btn ${post.likes?.includes(user?.id) || post.likes?.includes(user?._id) ? 'liked' : ''}`}
                      onClick={() => handleLike(post._id)}
                    >
                      <span>👍</span>
                      <span>{(post.likes || []).length} Like{(post.likes || []).length === 1 ? '' : 's'}</span>
                    </button>

                    <button
                      className="action-btn"
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post._id ? null : post._id)}
                    >
                      <span>💬</span>
                      <span>{(post.comments || []).length} Comment{(post.comments || []).length === 1 ? '' : 's'}</span>
                    </button>
                  </div>

                  {/* Comments Section */}
                  {activeCommentPostId === post._id && (
                    <div className="comments-panel animate-fade">
                      <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Discussion Comments ({(post.comments || []).length})</span>
                      </h4>

                      {/* Add comment input */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <input
                          type="text"
                          placeholder="Write a comment or helpful response..."
                          className="form-control"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddComment(post._id);
                          }}
                          style={{ flex: 1, padding: '8px 12px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px', fontSize: '13px' }}
                        />
                        <button
                          className="btn btn-accent btn-sm"
                          onClick={() => handleAddComment(post._id)}
                          disabled={submittingComment}
                        >
                          {submittingComment ? 'Sending...' : 'Send'}
                        </button>
                      </div>

                      {/* Comments list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {(post.comments || []).map(comment => (
                          <div key={comment._id} className="comment-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ color: '#818cf8', fontSize: '13px' }}>{comment.userName}</strong>
                                {renderAuthorBadge(comment.userRole)}
                              </div>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p style={{ margin: '4px 0 8px 0', color: '#cbd5e1', fontSize: '13.5px', lineHeight: '1.5' }}>
                              {comment.text}
                            </p>

                            {/* Replies Tree */}
                            <div className="replies-branch">
                              {(comment.replies || []).map(reply => (
                                <div key={reply._id} style={{ marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <strong style={{ color: '#f59e0b', fontSize: '12px' }}>{reply.userName}</strong>
                                      {renderAuthorBadge(reply.userRole)}
                                    </div>
                                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                                      {new Date(reply.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '12.5px' }}>{reply.text}</p>
                                </div>
                              ))}

                              {/* Write Reply inline */}
                              {activeReplyCommentId === comment._id ? (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                  <input
                                    type="text"
                                    placeholder="Write your reply..."
                                    className="form-control"
                                    value={newReplyText}
                                    onChange={(e) => setNewReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleAddReply(post._id, comment._id);
                                    }}
                                    style={{ flex: 1, padding: '6px 10px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '4px', fontSize: '12px' }}
                                  />
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleAddReply(post._id, comment._id)}
                                    disabled={submittingReply}
                                    style={{ padding: '4px 10px', fontSize: '12px' }}
                                  >
                                    Reply
                                  </button>
                                  <button
                                    onClick={() => setActiveReplyCommentId(null)}
                                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setActiveReplyCommentId(comment._id)}
                                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', marginTop: '6px', padding: 0 }}
                                >
                                  ↳ Reply to {comment.userName}
                                </button>
                              )}
                            </div>

                          </div>
                        ))}
                      </div>

                    </div>
                  )}

                </div>
              ))
            ) : (
              <div className="glass-card" style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8', borderRadius: '12px' }}>
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>
                  {activeForumType === 'subject' ? '📚' : '💬'}
                </span>
                <h4 style={{ color: 'white', marginBottom: '8px' }}>
                  {activeForumType === 'subject' ? 'No Subject Discussions Found' : 'No Discussion Posts Yet'}
                </h4>
                <p style={{ maxWidth: '500px', margin: '0 auto 18px', fontSize: '13.5px' }}>
                  {activeForumType === 'subject'
                    ? 'No academic threads have been initiated for this subject or filter criteria. Be the first to start a discussion!'
                    : 'No discussion posts match your criteria. Create a post to ask questions or share placement insights!'}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowCreateForm(true)}
                >
                  {activeForumType === 'subject' ? 'Start Subject Discussion' : 'Create First Post'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default DiscussionForum;
