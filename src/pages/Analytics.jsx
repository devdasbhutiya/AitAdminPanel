import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { usersService, coursesService, assignmentsService } from '../services';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import './Dashboard.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

const Analytics = () => {
    const { showError } = useToast();
    const [stats, setStats] = useState({ users: 0, courses: 0, assignments: 0 });
    const [usersByRole, setUsersByRole] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [users, courses, assignmentsCount, roleCounts] = await Promise.all([
                usersService.getAll(), coursesService.getAll(), assignmentsService.getCount(), usersService.getCountByRole()
            ]);
            setStats({ users: users.length, courses: courses.length, assignments: assignmentsCount });
            setUsersByRole(roleCounts);
        } catch (error) { showError('Failed to load analytics'); }
        finally { setLoading(false); }
    };

    const userChartData = {
        labels: ['Admin', 'Principal', 'HOD', 'Faculty', 'Students'],
        datasets: [{ data: [usersByRole.admin || 0, usersByRole.principal || 0, usersByRole.hod || 0, usersByRole.faculty || 0, usersByRole.student || 0], backgroundColor: ['#ef4444', '#8b5cf6', '#3b82f6', '#10b981', '#6b7280'], borderWidth: 0 }]
    };

    const monthlyData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{ label: 'New Users', data: [12, 19, 8, 15, 22, 18], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', fill: true, tension: 0.4 }]
    };

    const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } } } };

    return (
        <div className="dashboard-content">
            <div className="stats-grid">
                <div className="stat-card gradient-purple"><div className="stat-icon"><span className="material-icons-round">people</span></div><div className="stat-info"><span className="stat-value">{loading ? '...' : stats.users}</span><span className="stat-label">Total Users</span></div></div>
                <div className="stat-card gradient-blue"><div className="stat-icon"><span className="material-icons-round">menu_book</span></div><div className="stat-info"><span className="stat-value">{loading ? '...' : stats.courses}</span><span className="stat-label">Courses</span></div></div>
                <div className="stat-card gradient-green"><div className="stat-icon"><span className="material-icons-round">assignment</span></div><div className="stat-info"><span className="stat-value">{loading ? '...' : stats.assignments}</span><span className="stat-label">Assignments</span></div></div>
            </div>
            <div className="charts-grid">
                <div className="chart-card"><div className="card-header"><h3>Users by Role</h3></div><div className="chart-container"><Doughnut data={userChartData} options={chartOptions} /></div></div>
                <div className="chart-card"><div className="card-header"><h3>Monthly Registrations</h3></div><div className="chart-container"><Line data={monthlyData} options={chartOptions} /></div></div>
            </div>
        </div>
    );
};

export default Analytics;
