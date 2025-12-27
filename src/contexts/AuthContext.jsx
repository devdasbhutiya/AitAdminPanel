import { createContext, useContext, useState, useEffect } from 'react';
import {
    auth,
    db,
    doc,
    getDoc,
    setDoc,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from '../services/firebase';
import {
    ALLOWED_ROLES,
    hasPageAccess,
    hasActionAccess,
    getRoleScope,
    getAccessiblePages,
    normalizeRole,
    isRoleAllowed,
    isAdmin,
    isPrincipal,
    isAdminOrPrincipal,
    isHOD,
    isTeacherOrFaculty,
    isStudent,
    canManageUsers,
    canDeleteUsers,
    canChangeRoles,
    canTeacherAccessStudent,
    canTeacherAccessSection,
    canTeacherAccessCourse,
    canTeacherAccessTimetable,
    canTeacherModifyTimetable,
    canTeacherModifyAssignment,
    canAccessUserData
} from '../utils/permissions';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch user data from Firestore
    const fetchUserData = async (firebaseUser) => {
        try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                const normalizedRole = normalizeRole(data.role);

                return {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    ...data,
                    role: normalizedRole
                };
            } else {
                // Create user document if it doesn't exist
                const newUserData = {
                    email: firebaseUser.email,
                    name: firebaseUser.email.split('@')[0],
                    role: 'faculty', // Default role
                    department: '',
                    assignedCourses: [],
                    assignedSections: [],
                    createdAt: new Date().toISOString(),
                    createdBy: 'auto-admin-login'
                };
                await setDoc(userRef, newUserData);
                return { uid: firebaseUser.uid, ...newUserData };
            }
        } catch (err) {
            console.error('Error fetching user data:', err);
            throw err;
        }
    };

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            setError(null);

            try {
                if (firebaseUser) {
                    const data = await fetchUserData(firebaseUser);

                    if (isRoleAllowed(data.role)) {
                        setUser(firebaseUser);
                        setUserData(data);
                    } else {
                        setError('Access denied. Your role is not authorized.');
                        await signOut(auth);
                        setUser(null);
                        setUserData(null);
                    }
                } else {
                    setUser(null);
                    setUserData(null);
                }
            } catch (err) {
                setError(err.message);
                setUser(null);
                setUserData(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // Login function
    const login = async (email, password) => {
        setLoading(true);
        setError(null);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const data = await fetchUserData(userCredential.user);

            if (!isRoleAllowed(data.role)) {
                await signOut(auth);
                throw new Error(`Access denied. Your role "${data.role}" is not authorized.`);
            }

            return data;
        } catch (err) {
            let message = 'Login failed';

            if (err.code === 'auth/wrong-password' ||
                err.code === 'auth/user-not-found' ||
                err.code === 'auth/invalid-credential') {
                message = 'Invalid email or password';
            } else if (err.code === 'auth/too-many-requests') {
                message = 'Too many failed attempts. Please try again later.';
            } else if (err.message) {
                message = err.message;
            }

            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    // Logout function
    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserData(null);
        } catch (err) {
            console.error('Logout error:', err);
            throw err;
        }
    };

    // Permission helpers
    const hasPermission = (page) => {
        return hasPageAccess(userData?.role, page);
    };

    const canPerformAction = (action) => {
        return hasActionAccess(userData?.role, action);
    };

    const getScope = () => {
        return getRoleScope(userData?.role);
    };

    const getPages = () => {
        return getAccessiblePages(userData?.role);
    };

    // Faculty-specific permission helpers
    const canAccessStudentData = (studentData) => {
        return canTeacherAccessStudent(userData, studentData);
    };

    const canAccessSectionData = (sectionData) => {
        return canTeacherAccessSection(userData, sectionData);
    };

    const canAccessCourseData = (courseData) => {
        return canTeacherAccessCourse(userData, courseData);
    };

    const canAccessTimetableData = (timetableData) => {
        return canTeacherAccessTimetable(userData, timetableData);
    };

    const canModifyTimetableData = (timetableData) => {
        return canTeacherModifyTimetable(userData, timetableData);
    };

    const canModifyAssignmentData = (assignmentData) => {
        return canTeacherModifyAssignment(userData, assignmentData);
    };

    const canModifyRoles = () => {
        return canChangeRoles(userData?.role);
    };

    const canAccessUser = (targetUserData) => {
        return canAccessUserData(userData, targetUserData);
    };

    // Check if current user is a faculty
    const checkIsTeacherRole = () => {
        return isTeacherOrFaculty(userData?.role);
    };

    // Check if current user is admin or principal
    const checkIsAdminOrPrincipal = () => {
        return isAdminOrPrincipal(userData?.role);
    };

    // Check if current user is HOD
    const checkIsHOD = () => {
        return isHOD(userData?.role);
    };

    // Check if current user can manage target user
    const checkCanManageUser = (targetRole) => {
        return canManageUsers(userData?.role, targetRole);
    };

    const value = {
        user,
        userData,
        loading,
        error,
        login,
        logout,
        // Basic permissions
        hasPermission,
        canPerformAction,
        getScope,
        getPages,
        // Teacher-specific permissions
        canAccessStudentData,
        canAccessSectionData,
        canAccessCourseData,
        canAccessTimetableData,
        canModifyTimetableData,
        canModifyAssignmentData,
        canModifyRoles,
        canAccessUser,
        // Role checks
        isTeacherRole: checkIsTeacherRole,
        isAdminOrPrincipal: checkIsAdminOrPrincipal,
        isHOD: checkIsHOD,
        canManageUser: checkCanManageUser,
        isAuthenticated: !!user && !!userData,
        role: userData?.role
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
