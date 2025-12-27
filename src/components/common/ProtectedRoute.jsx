import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from './Loading';

const ProtectedRoute = ({ children, requiredPage }) => {
    const { isAuthenticated, loading, hasPermission } = useAuth();
    const location = useLocation();

    // Show loading while checking auth state
    if (loading) {
        return <Loading fullScreen />;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check page permission if required
    if (requiredPage && !hasPermission(requiredPage)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
