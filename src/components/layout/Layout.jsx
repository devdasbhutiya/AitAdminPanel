import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

const Layout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Get page title based on current route
    const getPageInfo = () => {
        const path = location.pathname.split('/').pop() || 'dashboard';
        const titles = {
            dashboard: { title: 'Dashboard', subtitle: 'Overview of your LMS' },
            users: { title: 'Users', subtitle: 'Manage users and roles' },
            courses: { title: 'Courses', subtitle: 'Manage courses and subjects' },
            branches: { title: 'Branches', subtitle: 'Manage departments and branches' },
            timetable: { title: 'Timetable', subtitle: 'Manage class schedules' },
            assignments: { title: 'Assignments', subtitle: 'Manage assignments and submissions' },
            events: { title: 'Events', subtitle: 'Manage college events' },
            notices: { title: 'Notices', subtitle: 'Manage announcements' },
            analytics: { title: 'Analytics', subtitle: 'View reports and statistics' },
            attendance: { title: 'Attendance', subtitle: 'Manage attendance records' }
        };
        return titles[path] || { title: 'LMS Admin', subtitle: '' };
    };

    const { title, subtitle } = getPageInfo();

    return (
        <div className={`main-app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar
                collapsed={sidebarCollapsed}
                open={sidebarOpen}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                onClose={() => setSidebarOpen(false)}
            />
            <main className="main-content">
                <Header
                    title={title}
                    subtitle={subtitle}
                    onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                />
                <div className="content-area">
                    <div className="page active">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
