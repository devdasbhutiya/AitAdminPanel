// Utility helper functions

// Format date to readable string
export const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// Format time to readable string
export const formatTime = (time) => {
    if (!time) return '';
    return time;
};

// Format timestamp from Firestore
export const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    if (timestamp.toDate) {
        return formatDate(timestamp.toDate());
    }
    return formatDate(timestamp);
};

// Get initials from name
export const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Capitalize first letter
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Debounce function
export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// Generate unique ID
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Check if object is empty
export const isEmpty = (obj) => {
    if (!obj) return true;
    return Object.keys(obj).length === 0;
};

// Deep clone object
export const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

// Filter array by search term
export const filterBySearch = (array, searchTerm, keys) => {
    if (!searchTerm) return array;
    const term = searchTerm.toLowerCase();
    return array.filter(item =>
        keys.some(key => {
            const value = item[key];
            return value && value.toString().toLowerCase().includes(term);
        })
    );
};

// Sort array by key
export const sortByKey = (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
        const valueA = a[key] || '';
        const valueB = b[key] || '';
        const comparison = valueA.localeCompare ? valueA.localeCompare(valueB) : valueA - valueB;
        return order === 'asc' ? comparison : -comparison;
    });
};

// Paginate array
export const paginate = (array, page, pageSize) => {
    const startIndex = (page - 1) * pageSize;
    return array.slice(startIndex, startIndex + pageSize);
};

// Get status badge class
export const getStatusClass = (status) => {
    const statusClasses = {
        active: 'status-active',
        inactive: 'status-inactive',
        pending: 'status-pending',
        completed: 'status-completed',
        cancelled: 'status-cancelled'
    };
    return statusClasses[status?.toLowerCase()] || 'status-default';
};

// Day name helpers
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Semester options
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// Section options
export const SECTIONS = ['A', 'B', 'C', 'D'];
