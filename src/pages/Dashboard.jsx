import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersService, coursesService, assignmentsService, eventsService } from '../services';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const Dashboard = () => {
    const navigate = useNavigate();
    const { userData } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalCourses: 0,
        totalAssignments: 0,
        upcomingEvents: 0
    });
    const [usersByRole, setUsersByRole] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch all data in parallel
            const [users, courses, assignmentsCount, eventsCount, roleCounts] = await Promise.all([
                usersService.getAll(),
                coursesService.getAll(),
                assignmentsService.getCount(),
                eventsService.getUpcomingCount(),
                usersService.getCountByRole()
            ]);

            setStats({
                totalUsers: users.length,
                totalCourses: courses.length,
                totalAssignments: assignmentsCount,
                upcomingEvents: eventsCount
            });

            setUsersByRole(roleCounts);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = (page) => {
        navigate(`/${page}`);
    };

    // Chart data for users by role
    const userChartData = {
        labels: ['Admin', 'Principal', 'HOD', 'Faculty', 'Student'],
        datasets: [{
            data: [
                usersByRole.admin || 0,
                usersByRole.principal || 0,
                usersByRole.hod || 0,
                usersByRole.faculty || 0,
                usersByRole.student || 0
            ],
            backgroundColor: [
                '#ef4444',
                '#8b5cf6',
                '#3b82f6',
                '#10b981',
                '#6b7280'
            ],
            borderWidth: 0
        }]
    };

    // Chart data for departments
    const departmentChartData = {
        labels: ['Computer Science', 'Electronics', 'Mechanical'],
        datasets: [{
            label: 'Users',
            data: [45, 32, 28],
            backgroundColor: [
                'rgba(79, 70, 229, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)'
            ],
            borderRadius: 8
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true
                }
            }
        }
    };

    return (
        <div className="dashboard-content">
            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card gradient-purple">
                    <div className="stat-icon">
                        <span className="material-icons-round">people</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{loading ? '...' : stats.totalUsers}</span>
                        <span className="stat-label">Total Users</span>
                    </div>
                    <div className="stat-trend up">
                        <span className="material-icons-round">trending_up</span>
                        <span>+12%</span>
                    </div>
                </div>

                <div className="stat-card gradient-blue">
                    <div className="stat-icon">
                        <span className="material-icons-round">menu_book</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{loading ? '...' : stats.totalCourses}</span>
                        <span className="stat-label">Active Courses</span>
                    </div>
                    <div className="stat-trend up">
                        <span className="material-icons-round">trending_up</span>
                        <span>+5%</span>
                    </div>
                </div>

                <div className="stat-card gradient-green">
                    <div className="stat-icon">
                        <span className="material-icons-round">assignment</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{loading ? '...' : stats.totalAssignments}</span>
                        <span className="stat-label">Assignments</span>
                    </div>
                    <div className="stat-trend up">
                        <span className="material-icons-round">trending_up</span>
                        <span>+8%</span>
                    </div>
                </div>

                <div className="stat-card gradient-orange">
                    <div className="stat-icon">
                        <span className="material-icons-round">event</span>
                    </div>
                    <div className="stat-info">
                        <span className="stat-value">{loading ? '...' : stats.upcomingEvents}</span>
                        <span className="stat-label">Upcoming Events</span>
                    </div>
                    <div className="stat-trend neutral">
                        <span className="material-icons-round">remove</span>
                        <span>0%</span>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
                <div className="chart-card">
                    <div className="card-header">
                        <h3>Users by Role</h3>
                        <button className="btn-icon">
                            <span className="material-icons-round">more_vert</span>
                        </button>
                    </div>
                    <div className="chart-container">
                        <Doughnut data={userChartData} options={chartOptions} />
                    </div>
                </div>

                <div className="chart-card">
                    <div className="card-header">
                        <h3>Department Distribution</h3>
                        <button className="btn-icon">
                            <span className="material-icons-round">more_vert</span>
                        </button>
                    </div>
                    <div className="chart-container">
                        <Bar data={departmentChartData} options={chartOptions} />
                    </div>
                </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="dashboard-row">
                <div className="activity-card">
                    <div className="card-header">
                        <h3>Recent Activity</h3>
                        <a href="#" className="view-all">View All</a>
                    </div>
                    <div className="activity-list">
                        <div className="activity-item">
                            <div className="activity-icon bg-blue">
                                <span className="material-icons-round">person_add</span>
                            </div>
                            <div className="activity-content">
                                <p>New student registered</p>
                                <span>John Doe - CS Department</span>
                            </div>
                            <span className="activity-time">2 min ago</span>
                        </div>
                        <div className="activity-item">
                            <div className="activity-icon bg-green">
                                <span className="material-icons-round">assignment_turned_in</span>
                            </div>
                            <div className="activity-content">
                                <p>Assignment submitted</p>
                                <span>Data Structures - Binary Trees</span>
                            </div>
                            <span className="activity-time">15 min ago</span>
                        </div>
                        <div className="activity-item">
                            <div className="activity-icon bg-purple">
                                <span className="material-icons-round">campaign</span>
                            </div>
                            <div className="activity-content">
                                <p>New notice published</p>
                                <span>Exam Schedule Released</span>
                            </div>
                            <span className="activity-time">1 hour ago</span>
                        </div>
                    </div>
                </div>

                <div className="quick-actions-card">
                    <div className="card-header">
                        <h3>Quick Actions</h3>
                    </div>
                    <div className="quick-actions-grid">
                        <button className="quick-action" onClick={() => navigateTo('users')}>
                            <span className="material-icons-round">person_add</span>
                            <span>Add User</span>
                        </button>
                        <button className="quick-action" onClick={() => navigateTo('courses')}>
                            <span className="material-icons-round">add_circle</span>
                            <span>Add Course</span>
                        </button>
                        <button className="quick-action" onClick={() => navigateTo('notices')}>
                            <span className="material-icons-round">campaign</span>
                            <span>Post Notice</span>
                        </button>
                        <button className="quick-action" onClick={() => navigateTo('events')}>
                            <span className="material-icons-round">event</span>
                            <span>Add Event</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
