import React, { useState } from 'react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import StudentAcademicsModule from '../components/StudentAcademicsModule';
import FacultyMarksManager from '../components/FacultyMarksManager';

const AcademicsPage = () => {
  const { user } = useAuth();
  const [activeRoleView, setActiveRoleView] = useState(
    user?.role === 'student' ? 'student-view' : 'faculty-marks'
  );

  const isStaff = user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'hod';

  return (
    <>
      <Header title="Academics & CGPA Portal" />
      <div className="content-wrapper academics-content animate-fade">
        <div style={{ maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
          {/* If staff (faculty/admin/hod), give tab switcher to view either as faculty evaluator or student perspective */}
          {isStaff && (
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '1.5rem',
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '8px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              width: 'fit-content'
            }}>
              <button
                type="button"
                onClick={() => setActiveRoleView('faculty-marks')}
                style={{
                  background: activeRoleView === 'faculty-marks' ? '#6366f1' : 'transparent',
                  color: activeRoleView === 'faculty-marks' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                📝 Faculty Marks &amp; CGPA Evaluator
              </button>
              <button
                type="button"
                onClick={() => setActiveRoleView('student-view')}
                style={{
                  background: activeRoleView === 'student-view' ? '#6366f1' : 'transparent',
                  color: activeRoleView === 'student-view' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🎓 Student Academic View &amp; CGPA Simulator
              </button>
            </div>
          )}

          {/* Content based on selected view */}
          {activeRoleView === 'faculty-marks' && isStaff ? (
            <FacultyMarksManager />
          ) : (
            <StudentAcademicsModule />
          )}
        </div>
      </div>
    </>
  );
};

export default AcademicsPage;
