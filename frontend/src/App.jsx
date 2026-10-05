import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Components
import Sidebar from './components/Sidebar';
import Chatbot from './components/Chatbot';

// Pages
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import AptitudeTests from './pages/AptitudeTests';
import MockInterviews from './pages/MockInterviews';
import JobBoard from './pages/JobBoard';
import AdminPanel from './pages/AdminPanel';
import QuestionBank from './pages/QuestionBank';
import PlagiarismAudit from './pages/PlagiarismAudit';
import Contests from './pages/Contests';
import ContestWorkspace from './pages/ContestWorkspace';
import ContestReport from './pages/ContestReport';
import ContestLeaderboard from './pages/ContestLeaderboard';
import Profile from './pages/Profile';
import DoubtSolver from './pages/DoubtSolver';
import AdminDoubtSolver from './pages/AdminDoubtSolver';
import FacultyDashboard from './pages/FacultyDashboard';
import CoreCSEPrep from './pages/CoreCSEPrep';
import ResumeBuilder from './pages/ResumeBuilder';
import CompanyPrep from './pages/CompanyPrep';
import PersonalizedRoadmap from './pages/PersonalizedRoadmap';
import DiscussionForum from './pages/DiscussionForum';
import CodingPlayground from './pages/CodingPlayground';
import ProjectStudio from './pages/ProjectStudio';
import ChangePassword from './pages/ChangePassword';
import LabPractice from './pages/LabPractice';
import PlacementCalendar from './pages/PlacementCalendar';
import PlacementSuitePage from './pages/PlacementSuitePage';
import AcademicsPage from './pages/AcademicsPage';
import RecruiterDashboard from './pages/RecruiterDashboard';
import HODDashboard from './pages/HODDashboard';

// Helper for home route by role
const getRoleHome = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'faculty') return '/faculty';
  if (role === 'recruiter') return '/recruiter';
  if (role === 'hod') return '/hod';
  return '/dashboard';
};

// Private Route Wrapper
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="dashboard-loading-container">
        <div className="spinner-loader"></div>
        <p>Verifying session security...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Check if Student Dashboard has been locked by Administrator & Main Admin
  if (user.role === 'student' && user.isLocked) {
    const isRiskLock = user.lockReason?.toLowerCase().includes('risk') || user.lockReason?.includes('65');

    return (
      <div className="main-container">
        <Sidebar />
        <div className="student-locked-screen-wrap">
          <div className="student-locked-modal-card">
            <div className="locked-icon-badge">🔒</div>
            <h1 className="locked-title">Student Dashboard Locked</h1>
            <div className="locked-policy-tag">
              {isRiskLock
                ? '🚨 High Placement Risk Policy Enforced (>65% Risk Factor)'
                : '⚠️ Placement Policy Compliance Lock'}
            </div>
            <p className="locked-desc">
              Your access to the Student Placement Dashboard has been locked due to high placement risk or inactivity.
              To revoke this lock, you must contact either the <strong>Administrator</strong> or <strong>Main Admin</strong>.
            </p>

            <div className="locked-details-box">
              <div className="locked-info-row">
                <span>Account Name:</span>
                <strong>{user.name}</strong>
              </div>
              <div className="locked-info-row">
                <span>Email / Roll:</span>
                <strong>{user.rollNumber || user.email}</strong>
              </div>
              <div className="locked-info-row">
                <span>Lock Reason:</span>
                <strong style={{ color: '#F87171' }}>
                  {user.lockReason || 'Placement Risk Factor exceeded 65% critical threshold'}
                </strong>
              </div>
              <div className="locked-info-row">
                <span>Locked By:</span>
                <strong>{user.lockedByName || 'Automated Risk Engine (Admin Enforcement)'}</strong>
              </div>
              {user.lockedAt && (
                <div className="locked-info-row">
                  <span>Date Locked:</span>
                  <strong>{new Date(user.lockedAt).toLocaleDateString()}</strong>
                </div>
              )}
            </div>

            <div className="locked-instructions">
              <h4>📋 Mandatory Procedure to Revoke Dashboard Lock:</h4>
              <p>
                As per college placement regulations, this lock can <strong>ONLY be revoked by an Administrator or the Main Admin</strong>. Faculty coordinators do not have unlocking authority.
              </p>
              <p style={{ marginTop: '0.5rem' }}>
                1. Contact the Training &amp; Placement Administrator or Main Admin (<a href="mailto:campusconnect.supportdesk@gmail.com">campusconnect.supportdesk@gmail.com</a>) or visit the T&amp;P Cell (Admin Block, Ground Floor).<br />
                2. Review your assessment deficit and commit to the recommended remedial preparation schedule.<br />
                3. Once approved, the Administrator or Main Admin will remove the lock on your dashboard.<br />
                4. Click <strong>"Check Unlock Status"</strong> below to refresh your access.
              </p>
            </div>

            <div className="locked-actions-row">
              <button
                className="btn-refresh-lock-status"
                onClick={() => window.location.reload()}
              >
                🔄 Check Unlock Status
              </button>
              <button
                className="btn-locked-logout"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
              >
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <Sidebar />
      {children}
      <Chatbot />
    </div>
  );
};

const AppRoutes = () => {
  const { token, user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={<HomePage />}
      />
      <Route
        path="/login"
        element={token && user ? <Navigate to={getRoleHome(user.role)} replace /> : <Login />}
      />
      <Route
        path="/register"
        element={token && user ? <Navigate to={getRoleHome(user.role)} replace /> : <Register />}
      />
      <Route
        path="/forgot-password"
        element={token && user ? <Navigate to={getRoleHome(user.role)} replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password/:token"
        element={token && user ? <Navigate to={getRoleHome(user.role)} replace /> : <ResetPassword />}
      />
      <Route
        path="/change-password"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'hod']}>
            <ChangePassword />
          </PrivateRoute>
        }
      />

      {/* Private Student Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/resume-analyzer"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <ResumeAnalyzer />
          </PrivateRoute>
        }
      />
      <Route
        path="/resume-builder"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <ResumeBuilder />
          </PrivateRoute>
        }
      />
      <Route
        path="/learning-roadmap"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <PersonalizedRoadmap />
          </PrivateRoute>
        }
      />
      <Route
        path="/discussion-forum"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <DiscussionForum />
          </PrivateRoute>
        }
      />
      <Route
        path="/coding-playground"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <CodingPlayground />
          </PrivateRoute>
        }
      />
      <Route
        path="/project-studio"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <ProjectStudio />
          </PrivateRoute>
        }
      />
      <Route
        path="/lab-practice"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <LabPractice />
          </PrivateRoute>
        }
      />
      <Route
        path="/aptitude-tests"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <AptitudeTests />
          </PrivateRoute>
        }
      />
      <Route
        path="/practice-modules"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <AptitudeTests />
          </PrivateRoute>
        }
      />
      <Route
        path="/mock-interviews"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <MockInterviews />
          </PrivateRoute>
        }
      />
      <Route
        path="/core-cse"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <CoreCSEPrep />
          </PrivateRoute>
        }
      />
      <Route
        path="/company-prep"
        element={<Navigate to="/dashboard" replace />}
      />
      <Route
        path="/jobs"
        element={
          user?.role === 'admin' ? (
            <PrivateRoute allowedRoles={['admin']}>
              <AdminPanel defaultTab="job-opportunities" />
            </PrivateRoute>
          ) : (
            <PrivateRoute allowedRoles={['student']}>
              <JobBoard />
            </PrivateRoute>
          )
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'hod', 'recruiter']}>
            <Profile />
          </PrivateRoute>
        }
      />

      <Route
        path="/doubt-solver"
        element={<Navigate to="/dashboard" replace />}
      />

      {/* Private Admin Routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminPanel />
          </PrivateRoute>
        }
      />
      <Route
        path="/job-opportunities"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminPanel defaultTab="job-opportunities" />
          </PrivateRoute>
        }
      />
      <Route
        path="/applied-jobs-report"
        element={
          <PrivateRoute allowedRoles={['admin', 'faculty']}>
            <AdminPanel defaultTab="applied-jobs" />
          </PrivateRoute>
        }
      />
      <Route
        path="/job-postings"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminPanel defaultTab="job-opportunities" />
          </PrivateRoute>
        }
      />
      <Route
        path="/manage-jobs"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminPanel defaultTab="job-opportunities" />
          </PrivateRoute>
        }
      />
      <Route
        path="/faculty-staff"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminPanel defaultTab="faculty-staff" />
          </PrivateRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminPanel defaultTab="audit-logs" />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/discussions"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminPanel defaultTab="subject-discussions" />
          </PrivateRoute>
        }
      />
      <Route
        path="/faculty"
        element={
          <PrivateRoute allowedRoles={['faculty', 'admin']}>
            <FacultyDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/plagiarism-audit"
        element={
          <PrivateRoute allowedRoles={['admin', 'faculty']}>
            <PlagiarismAudit />
          </PrivateRoute>
        }
      />

      <Route
        path="/admin/doubt-solver"
        element={<Navigate to="/admin" replace />}
      />

      {/* Private Shared Routes */}
      <Route
        path="/question-bank"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <QuestionBank />
          </PrivateRoute>
        }
      />
      <Route
        path="/contests"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <Contests />
          </PrivateRoute>
        }
      />
      <Route
        path="/placement-calendar"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'recruiter', 'hod']}>
            <PlacementCalendar />
          </PrivateRoute>
        }
      />

      {/* Recruiter Routes */}
      <Route
        path="/recruiter"
        element={
          <PrivateRoute allowedRoles={['recruiter', 'admin']}>
            <RecruiterDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/recruiter-dashboard"
        element={<Navigate to="/recruiter" replace />}
      />

      {/* HOD Routes */}
      <Route
        path="/hod"
        element={
          <PrivateRoute allowedRoles={['hod', 'admin']}>
            <HODDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/hod-dashboard"
        element={<Navigate to="/hod" replace />}
      />
      <Route
        path="/placement-suite"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <PlacementSuitePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/academics"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <AcademicsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/contests/:id/workspace"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin', 'hod']}>
            <ContestWorkspace />
          </PrivateRoute>
        }
      />
      <Route
        path="/contests/:id/report"
        element={
          <PrivateRoute allowedRoles={['admin', 'faculty', 'hod']}>
            <ContestReport />
          </PrivateRoute>
        }
      />
      <Route
        path="/contests/:id/leaderboard"
        element={
          <PrivateRoute allowedRoles={['student', 'admin', 'faculty', 'hod']}>
            <ContestLeaderboard />
          </PrivateRoute>
        }
      />

      {/* Fallback routing */}
      <Route
        path="*"
        element={<Navigate to={token && user ? getRoleHome(user.role) : "/"} replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
