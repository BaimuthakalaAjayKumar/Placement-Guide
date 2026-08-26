import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import './DiscussionForum.css';

const DiscussionForum = () => {
  const { token, user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Post form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'Placement' });

  // Comment state
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Reply state
  const [activeReplyCommentId, setActiveReplyCommentId] = useState(null);
  const [newReplyText, setNewReplyText] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      let url = `${API_URL}/discussions`;
      const params = [];
      if (activeCategory) params.push(`category=${activeCategory}`);
      if (searchQuery) params.push(`search=${searchQuery}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.data);
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
      fetchPosts();
    }
  }, [token, activeCategory, searchQuery]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;

    try {
      const res = await fetch(`${API_URL}/discussions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newPost)
      });
      const data = await res.json();
      if (data.success) {
        setNewPost({ title: '', content: '', category: 'Placement' });
        setShowCreateForm(false);
        fetchPosts();
      } else {
        alert(data.error || 'Failed to publish post');
      }
    } catch (err) {
      alert('Could not publish discussion post.');
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReply = async (postId, commentId) => {
    if (!newReplyText.trim()) return;

    try {
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
      }
    } catch (err) {
      console.error(err);
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="content-wrapper forum-content animate-fade" style={{ padding: '2rem', overflowY: 'auto' }}>
      <Header title="Placement Discussion Forum" />
          {error && (
            <div className="error-banner">
              <span>{error}</span>
            </div>
          )}

          {/* Action Header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['All', 'Coding', 'Aptitude', 'Interview', 'Placement', 'Technical Subjects'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat === 'All' ? '' : cat)}
                  style={{
                    padding: '6px 12px',
                    background: (cat === 'All' && !activeCategory) || activeCategory === cat ? '#6366f1' : '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : 'Create Post'}
            </button>
          </div>

          {/* Create Post Form */}
          {showCreateForm && (
            <div className="glass-card" style={{ padding: '20px', marginBottom: '25px' }}>
              <form onSubmit={handleCreatePost}>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label">Discussion Title</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter discussion title..."
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    required
                    style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '100%', borderRadius: '6px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={newPost.category}
                    onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                    style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '100%', borderRadius: '6px' }}
                  >
                    {['Coding', 'Aptitude', 'Interview', 'Placement', 'Technical Subjects'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label">Post Content</label>
                  <textarea
                    className="form-control"
                    placeholder="Describe your query, tips, or experiences in detail..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    required
                    rows="5"
                    style={{ background: '#0f172a', color: 'white', border: '1px solid #334155', padding: '10px', width: '100%', borderRadius: '6px' }}
                  />
                </div>

                <button type="submit" className="btn btn-accent">Publish Post</button>
              </form>
            </div>
          )}

          {/* Search bar */}
          <div style={{ marginBottom: '25px' }}>
            <input
              type="text"
              placeholder="Search discussions by keyword..."
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '12px', background: '#1e293b', border: '1px solid #334155', color: 'white', width: '100%', borderRadius: '6px' }}
            />
          </div>

          {/* Posts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {posts.length > 0 ? (
              posts.map(post => (
                <div className="glass-card" key={post._id} style={{ padding: '20px', position: 'relative' }}>
                  
                  {/* Category Badge & Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span
                      style={{
                        background: '#6366f1',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    >
                      {post.category}
                    </span>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleReport(post._id)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        ⚠️ Report
                      </button>
                      {(post.user === user?.id || user?.role === 'admin') && (
                        <button
                          onClick={() => handleDelete(post._id)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 style={{ margin: '0 0 5px 0', color: 'white' }}>{post.title}</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>By {post.userName} on {new Date(post.createdAt).toLocaleDateString()}</span>
                  
                  <p style={{ margin: '15px 0', color: '#cbd5e1', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{post.content}</p>

                  <div style={{ display: 'flex', gap: '15px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                    <button
                      onClick={() => handleLike(post._id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: post.likes.includes(user?.id) ? '#3b82f6' : '#94a3b8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      👍 {post.likes.length} Like{post.likes.length === 1 ? '' : 's'}
                    </button>

                    <button
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post._id ? null : post._id)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                      💬 Comments ({(post.comments || []).length})
                    </button>
                  </div>

                  {/* Comments section */}
                  {activeCommentPostId === post._id && (
                    <div style={{ marginTop: '20px', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '6px' }}>
                      <h4 style={{ color: 'white', margin: '0 0 10px 0' }}>Comments</h4>

                      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          className="form-control"
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          style={{ flex: 1, padding: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '4px' }}
                        />
                        <button className="btn btn-accent btn-sm" onClick={() => handleAddComment(post._id)}>Send</button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(post.comments || []).map(comment => (
                          <div key={comment._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#818cf8', fontSize: '0.85rem' }}>{comment.userName}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p style={{ margin: '4px 0', color: '#cbd5e1', fontSize: '0.9rem' }}>{comment.text}</p>
                            
                            {/* Replies */}
                            <div style={{ marginLeft: '20px', borderLeft: '2px solid #334155', paddingLeft: '10px', marginTop: '10px' }}>
                              {(comment.replies || []).map(reply => (
                                <div key={reply._id} style={{ marginTop: '8px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong style={{ color: '#f59e0b', fontSize: '0.8rem' }}>{reply.userName}</strong>
                                    <span style={{ fontSize: '0.70rem', color: '#64748b' }}>{new Date(reply.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>{reply.text}</p>
                                </div>
                              ))}

                              {/* Write Reply toggle button */}
                              {activeReplyCommentId === comment._id ? (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                  <input
                                    type="text"
                                    placeholder="Write a reply..."
                                    className="form-control"
                                    value={newReplyText}
                                    onChange={(e) => setNewReplyText(e.target.value)}
                                    style={{ flex: 1, padding: '5px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '4px', fontSize: '0.8rem' }}
                                  />
                                  <button className="btn btn-secondary btn-sm" onClick={() => handleAddReply(post._id, comment._id)} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>Reply</button>
                                  <button onClick={() => setActiveReplyCommentId(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.75rem' }}>Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setActiveReplyCommentId(comment._id)}
                                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', marginTop: '8px', padding: 0 }}
                                >
                                  ➜ Reply
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
              <div className="empty-history-placeholder glass-card">
                <p>No discussion posts match your criteria. Create a post to start the thread!</p>
              </div>
            )}
          </div>
        </div>
  );
};

export default DiscussionForum;
