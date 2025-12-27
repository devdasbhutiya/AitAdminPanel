import { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getAccessiblePages } from '../utils/permissions';
import './Login.css';

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const ATTEMPT_STORAGE_KEY = 'login_attempts';
const LOCKOUT_STORAGE_KEY = 'login_lockout';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const [attemptCount, setAttemptCount] = useState(0);

    const { login, isAuthenticated, userData } = useAuth();
    const { showSuccess, showError } = useToast();
    const location = useLocation();
    const navigate = useNavigate();

    // Check lockout status on mount and set up timer
    useEffect(() => {
        checkLockoutStatus();
        const interval = setInterval(() => {
            checkLockoutStatus();
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const checkLockoutStatus = () => {
        const lockoutEnd = localStorage.getItem(LOCKOUT_STORAGE_KEY);
        const attempts = parseInt(localStorage.getItem(ATTEMPT_STORAGE_KEY) || '0');

        setAttemptCount(attempts);

        if (lockoutEnd) {
            const timeLeft = parseInt(lockoutEnd) - Date.now();
            if (timeLeft > 0) {
                setIsLockedOut(true);
                setRemainingTime(Math.ceil(timeLeft / 1000));
            } else {
                // Lockout expired, clear it
                clearLockout();
            }
        }
    };

    const clearLockout = () => {
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        localStorage.removeItem(ATTEMPT_STORAGE_KEY);
        setIsLockedOut(false);
        setRemainingTime(0);
        setAttemptCount(0);
    };

    const incrementFailedAttempts = () => {
        const newCount = attemptCount + 1;
        setAttemptCount(newCount);
        localStorage.setItem(ATTEMPT_STORAGE_KEY, newCount.toString());

        if (newCount >= MAX_ATTEMPTS) {
            const lockoutEnd = Date.now() + LOCKOUT_DURATION;
            localStorage.setItem(LOCKOUT_STORAGE_KEY, lockoutEnd.toString());
            setIsLockedOut(true);
            setRemainingTime(LOCKOUT_DURATION / 1000);
            showError(`Too many failed attempts. Account locked for 15 minutes.`);
        }
    };

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const sanitizeInput = (input) => {
        return input.trim().replace(/[<>]/g, '');
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Redirect if already logged in
    if (isAuthenticated && userData) {
        const accessiblePages = getAccessiblePages(userData.role);
        const defaultPage = accessiblePages.length > 0 ? `/${accessiblePages[0]}` : '/dashboard';
        const from = location.state?.from?.pathname || defaultPage;
        return <Navigate to={from} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Check if locked out
        if (isLockedOut) {
            setError(`Account is locked. Please try again in ${formatTime(remainingTime)}.`);
            return;
        }

        // Validate inputs
        const sanitizedEmail = sanitizeInput(email);
        const sanitizedPassword = sanitizeInput(password);

        if (!validateEmail(sanitizedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }

        if (sanitizedPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);

        try {
            const userData = await login(sanitizedEmail, sanitizedPassword);

            // Clear failed attempts on successful login
            clearLockout();

            showSuccess('Login successful!');

            // Redirect to first accessible page
            const accessiblePages = getAccessiblePages(userData.role);
            const defaultPage = accessiblePages.length > 0 ? `/${accessiblePages[0]}` : '/dashboard';
            navigate(location.state?.from?.pathname || defaultPage, { replace: true });
        } catch (err) {
            // Increment failed attempts
            incrementFailedAttempts();

            // Use generic error message for security
            setError('Invalid email or password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-screen">
            <div className="login-container">
                <div className="login-header">
                    <div className="logo-badge">
                        <span className="material-icons-round">school</span>
                    </div>
                    <h1>AIT Admin Panel</h1>
                    <p>Ahmedabad Institute of Technology</p>
                    <div style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ fontSize: '12px' }}>🔒</span>
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: '500' }}>Secured Login</span>
                    </div>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="input-wrapper">
                            <span className="material-icons-round">email</span>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                autoComplete="email"
                                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="input-wrapper">
                            <span className="material-icons-round">lock</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                autoComplete="current-password"
                                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <span className="material-icons-round">
                                    {showPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    {/* Lockout Warning */}
                    {isLockedOut && (
                        <div className="error-message" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                            🔒 Account locked for security. Try again in {formatTime(remainingTime)}.
                        </div>
                    )}

                    {/* Attempt Warning */}
                    {!isLockedOut && attemptCount > 0 && attemptCount < MAX_ATTEMPTS && (
                        <div className="error-message" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                            ⚠️ Warning: {attemptCount}/{MAX_ATTEMPTS} failed attempts. Account will lock after {MAX_ATTEMPTS} attempts.
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary btn-login"
                        disabled={loading || isLockedOut}
                    >
                        <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                        {!loading && <span className="material-icons-round">arrow_forward</span>}
                    </button>
                </form>

                <div className="login-footer">
                    <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: 0 }}>
                        <span className="material-icons-round" style={{ fontSize: '16px', color: '#6b7280' }}>shield</span>
                        <span>Authorized personnel only</span>
                    </p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>Protected by advanced security measures</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
