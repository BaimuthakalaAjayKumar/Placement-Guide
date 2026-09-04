import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const features = [
  {
    icon: '💻',
    iconClass: 'coding',
    title: 'Coding Practice',
    desc: 'Sharpen your problem-solving skills with a curated question bank, coding playground, and timed practice sessions across all difficulty levels.',
  },
  {
    icon: '🎤',
    iconClass: 'interviews',
    title: 'Mock Interviews',
    desc: 'Simulate real interview experiences with AI-powered mock interviews covering technical, HR, and behavioral rounds.',
  },
  {
    icon: '📊',
    iconClass: 'analytics',
    title: 'Real-Time Analytics',
    desc: 'Track your progress with detailed dashboards, performance insights, and personalized recommendations to fill skill gaps.',
  },
  {
    icon: '📝',
    iconClass: 'resume',
    title: 'Resume Tools',
    desc: 'Build ATS-friendly resumes and get instant AI-powered analysis with actionable feedback to stand out to recruiters.',
  },
  {
    icon: '🏆',
    iconClass: 'contests',
    title: 'Contests & Leaderboards',
    desc: 'Compete with peers in timed coding contests, climb the leaderboard, and benchmark your skills against the best.',
  },
  {
    icon: '📚',
    iconClass: 'cse',
    title: 'Core CSE Preparation',
    desc: 'Master OS, DBMS, CN, and OOPs with structured study materials and practice questions tailored for placement interviews.',
  },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  // If already logged in, redirect to appropriate dashboard
  React.useEffect(() => {
    if (token && user) {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'faculty') navigate('/faculty', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [token, user, navigate]);

  // Don't render homepage if user is authenticated (will redirect)
  if (token && user) return null;

  return (
    <div className="home-page">
      {/* ── Navbar ── */}
      <nav className="home-navbar">
        <Link to="/" className="home-navbar-brand">
          <img src="/college-logo.jpg" alt="GRIET" className="home-navbar-logo" />
          <span className="home-navbar-title">GRIET Placement</span>
        </Link>
        <div className="home-navbar-actions">
          <button className="home-btn-ghost" onClick={() => navigate('/login')}>
            Sign In
          </button>
          <button className="home-btn-cta" onClick={() => navigate('/register')}>
            Create Account
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="home-hero">
        <div className="home-hero-glow-1" />
        <div className="home-hero-glow-2" />
        <div className="home-hero-glow-3" />

        <div className="home-hero-content">
          <div className="home-hero-text">
            <div className="home-hero-badge">
              <span className="home-hero-badge-dot" />
              GRIET Placement Portal
            </div>

            <h1 className="home-hero-heading">
              <span className="line-1">Build Skills.</span>
              <span className="line-2">Get Placed.</span>
            </h1>

            <p className="home-hero-subtitle">
              Coding practice, mock interviews, and real-time analytics — everything
              your college needs to boost placement success.
            </p>

            <div className="home-hero-actions">
              <button
                className="home-btn-get-started"
                onClick={() => navigate('/login')}
              >
                Get Started
                <svg
                  className="arrow-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <button
                className="home-btn-learn-more"
                onClick={() => {
                  document
                    .getElementById('features-section')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Explore Features
              </button>
            </div>
          </div>

          <div className="home-hero-image">
            <img
              src="/hero-illustration.jpg"
              alt="Students preparing for placements"
            />
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="home-stats-bar">
        <div className="home-stat-item">
          <div className="home-stat-number">15+</div>
          <div className="home-stat-label">Preparation Tools</div>
        </div>
        <div className="home-stat-divider" />
        <div className="home-stat-item">
          <div className="home-stat-number">500+</div>
          <div className="home-stat-label">Practice Questions</div>
        </div>
        <div className="home-stat-divider" />
        <div className="home-stat-item">
          <div className="home-stat-number">AI</div>
          <div className="home-stat-label">Powered Analytics</div>
        </div>
        <div className="home-stat-divider" />
        <div className="home-stat-item">
          <div className="home-stat-number">24/7</div>
          <div className="home-stat-label">Access Anytime</div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="home-features" id="features-section">
        <div className="home-section-header">
          <div className="home-section-label">Platform Features</div>
          <h2 className="home-section-title">
            Everything You Need to Get Placed
          </h2>
          <p className="home-section-desc">
            From coding practice to resume building — a complete toolkit
            designed to prepare you for every stage of the placement process.
          </p>
        </div>

        <div className="home-features-grid">
          {features.map((feature, index) => (
            <div className="home-feature-card" key={index}>
              <div className={`home-feature-icon ${feature.iconClass}`}>
                {feature.icon}
              </div>
              <h3 className="home-feature-title">{feature.title}</h3>
              <p className="home-feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="home-cta-section">
        <div className="home-cta-card">
          <h2 className="home-cta-title">Ready to Ace Your Placements?</h2>
          <p className="home-cta-desc">
            Join your peers on GRIET's all-in-one placement preparation
            platform. Sign up in seconds and start building your career today.
          </p>
          <button
            className="home-btn-get-started"
            onClick={() => navigate('/register')}
          >
            Create Free Account
            <svg
              className="arrow-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <p className="home-footer-text">
          © {new Date().getFullYear()} GRIET Placement Portal. Built for students, by students.
        </p>
      </footer>
    </div>
  );
};

export default HomePage;
