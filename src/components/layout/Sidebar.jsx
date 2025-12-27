import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getInitials, capitalize } from '../../utils/helpers';
import './Sidebar.css';

const Sidebar = ({ collapsed, open, onToggle, onClose }) => {
    const { userData, logout, hasPermission } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    // Navigation items grouped by section
    const navSections = [
        {
            title: 'Main',
            items: [
                { page: 'dashboard', icon: 'dashboard', label: 'Dashboard' }
            ]
        },
        {
            title: 'Academic',
            items: [
                { page: 'branches', icon: 'account_tree', label: 'Branches' },
                { page: 'courses', icon: 'menu_book', label: 'Courses' },
                { page: 'timetable', icon: 'calendar_today', label: 'Timetable' },
                { page: 'assignments', icon: 'assignment', label: 'Assignments' }
            ]
        },
        {
            title: 'Management',
            items: [
                { page: 'users', icon: 'people', label: 'Users' },
                { page: 'students', icon: 'school', label: 'Students' },
                { page: 'events', icon: 'event', label: 'Events' },
                { page: 'notices', icon: 'campaign', label: 'Notices' }
            ]
        },
        {
            title: 'Reports',
            items: [
                { page: 'analytics', icon: 'analytics', label: 'Analytics' },
                { page: 'attendance', icon: 'fact_check', label: 'Attendance' }
            ]
        }
    ];

    return (
        <>
            {/* Overlay for mobile */}
            {open && <div className="sidebar-overlay" onClick={onClose}></div>}

            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo-small" onClick={collapsed ? onToggle : undefined}>
                        <span className="material-icons-round">school</span>
                    </div>
                    <div className="logo-text">
                        <h2>LMS Panel</h2>
                        <span className={`role-badge role-${userData?.role || 'user'}`}>
                            {userData?.role?.toUpperCase() || 'USER'}
                        </span>
                    </div>
                    <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                        <span className="material-icons-round">
                            {collapsed ? 'chevron_right' : 'chevron_left'}
                        </span>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navSections.map((section) => {
                        // Filter items based on permissions
                        const visibleItems = section.items.filter(item => hasPermission(item.page));
                        if (visibleItems.length === 0) return null;

                        return (
                            <div className="nav-section" key={section.title}>
                                <span className="nav-section-title">{section.title}</span>
                                {visibleItems.map((item) => (
                                    <NavLink
                                        key={item.page}
                                        to={`/${item.page}`}
                                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        onClick={onClose}
                                    >
                                        <span className="material-icons-round">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        );
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {getInitials(userData?.name)}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{userData?.name || 'User'}</span>
                            <span className="user-email">{userData?.email || ''}</span>
                        </div>
                    </div>
                    <button className="btn-logout" onClick={handleLogout}>
                        <span className="material-icons-round">logout</span>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
