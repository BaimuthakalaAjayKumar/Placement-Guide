import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Sidebar from './components/Sidebar';

// Pages
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

// Private Route Wrapper
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

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
    return <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'faculty' ? '/faculty' : '/dashboard'} replace />;
  }

  return (
    <div className="main-container">
      <Sidebar />
      {children}
    </div>
  );
};

const AppRoutes = () => {
  const { token, user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={token && user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'faculty' ? '/faculty' : '/dashboard'} replace /> : <Login />}
      />
      <Route
        path="/register"
        element={token && user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'faculty' ? '/faculty' : '/dashboard'} replace /> : <Register />}
      />
      <Route
        path="/forgot-password"
        element={token && user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'faculty' ? '/faculty' : '/dashboard'} replace /> : <ForgotPassword />}
      />
      <Route
        path="/reset-password/:token"
        element={token && user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'faculty' ? '/faculty' : '/dashboard'} replace /> : <ResetPassword />}
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
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin']}>
            <DiscussionForum />
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
        element={
          <PrivateRoute allowedRoles={['student']}>
            <CompanyPrep />
          </PrivateRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <JobBoard />
          </PrivateRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <Profile />
          </PrivateRoute>
        }
      />

      <Route
        path="/doubt-solver"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <DoubtSolver />
          </PrivateRoute>
        }
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
        path="/faculty"
        element={
          <PrivateRoute allowedRoles={['faculty']}>
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
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <AdminDoubtSolver />
          </PrivateRoute>
        }
      />

      {/* Private Shared Routes */}
      <Route
        path="/question-bank"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin']}>
            <QuestionBank />
          </PrivateRoute>
        }
      />
      <Route
        path="/contests"
        element={
          <PrivateRoute allowedRoles={['student', 'faculty', 'admin']}>
            <Contests />
          </PrivateRoute>
        }
      />
      <Route
        path="/contests/:id/workspace"
        element={
          <PrivateRoute allowedRoles={['student']}>
            <ContestWorkspace />
          </PrivateRoute>
        }
      />
      <Route
        path="/contests/:id/report"
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <ContestReport />
          </PrivateRoute>
        }
      />
      <Route
        path="/contests/:id/leaderboard"
        element={
          <PrivateRoute allowedRoles={['student', 'admin']}>
            <ContestLeaderboard />
          </PrivateRoute>
        }
      />

      {/* Fallback routing */}
      <Route
        path="*"
        element={<Navigate to={token && user ? (user.role === 'admin' ? '/admin' : user.role === 'faculty' ? '/faculty' : '/dashboard') : "/login"} replace />}
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
