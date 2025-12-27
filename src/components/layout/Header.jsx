import { useState } from 'react';
import './Header.css';

const Header = ({ title, subtitle, onMenuClick }) => {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <header className="top-header">
            <div className="header-left">
                <button className="mobile-menu-btn" onClick={onMenuClick}>
                    <span className="material-icons-round">menu</span>
                </button>
                <div className="page-title">
                    <h1>{title}</h1>
                    {subtitle && <p>{subtitle}</p>}
                </div>
            </div>
            <div className="header-right">
                <div className="search-box">
                    <span className="material-icons-round">search</span>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="header-btn">
                    <span className="material-icons-round">notifications</span>
                    <span className="notification-badge">3</span>
                </button>
                <button className="header-btn">
                    <span className="material-icons-round">dark_mode</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
