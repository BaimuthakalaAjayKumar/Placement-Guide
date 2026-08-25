import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                // Faculty should have an endpoint to get their students or all students
                const res = await axios.get('http://localhost:5000/api/users/students', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.data && res.data.data) {
                    setStudents(res.data.data);
                } else {
                    setStudents([]);
                }
            } catch (err) {
                console.error('Error fetching students:', err);
                setError('Failed to load students. Ensure you have Faculty privileges.');
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [navigate]);

    return (
        <div className="faculty-layout">
            <Sidebar />
            <div className="faculty-main">
                <Header title="Faculty Dashboard" />

                <div className="faculty-content">
                    <div className="stats-cards">
                        <div className="stat-card">
                            <h3>Total Students</h3>
                            <p>{students.length}</p>
                        </div>
                        <div className="stat-card">
                            <h3>Needs Attention</h3>
                            <p>{students.filter(s => s.readinessScore < 40).length}</p>
                        </div>
                    </div>

                    <div className="students-section">
                        <h2>Student Monitoring</h2>
                        {error && <div className="error-alert">{error}</div>}
                        {loading ? (
                            <p>Loading students...</p>
                        ) : (
                            <table className="students-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Branch</th>
                                        <th>Readiness Score</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student._id}>
                                            <td>{student.name}</td>
                                            <td>{student.email}</td>
                                            <td>{student.branch || 'N/A'}</td>
                                            <td>
                                                <span className={`score-badge ${student.readinessScore > 70 ? 'high' : student.readinessScore > 40 ? 'medium' : 'low'}`}>
                                                    {student.readinessScore}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="btn-view" onClick={() => alert(`View details for ${student.name}`)}>View Progress</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan="5">No students found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyDashboard;
