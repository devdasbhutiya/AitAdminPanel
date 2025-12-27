import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        setToast({ message, type, id: Date.now() });

        setTimeout(() => {
            setToast(null);
        }, duration);
    }, []);

    const showSuccess = useCallback((message) => {
        showToast(message, 'success');
    }, [showToast]);

    const showError = useCallback((message) => {
        showToast(message, 'error');
    }, [showToast]);

    const showInfo = useCallback((message) => {
        showToast(message, 'info');
    }, [showToast]);

    const showWarning = useCallback((message) => {
        showToast(message, 'warning');
    }, [showToast]);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    const value = {
        toast,
        showToast,
        showSuccess,
        showError,
        showInfo,
        showWarning,
        hideToast
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast && <Toast {...toast} onClose={hideToast} />}
        </ToastContext.Provider>
    );
};

// Toast Component
const Toast = ({ message, type, onClose }) => {
    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info',
        warning: 'warning'
    };

    return (
        <div className={`toast ${type} show`}>
            <span className="toast-icon material-icons-round">{icons[type]}</span>
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={onClose}>
                <span className="material-icons-round">close</span>
            </button>
        </div>
    );
};

export default ToastContext;
