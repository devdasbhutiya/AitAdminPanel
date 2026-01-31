/**
 * ERP-Style Role-Based Access Control (RBAC) for LMS Admin Panel
 * 
 * Role Hierarchy:
 * 1. Admin - Full system access
 * 2. Principal - Institution-wide access (can't modify admin)
 * 3. HOD - Department-level access
 * 4. Faculty - Section-level access
 * 5. Student - Read-only access to own data
 */

// Valid roles in the system
export const ROLES = {
    ADMIN: 'admin',
    PRINCIPAL: 'principal',
    HOD: 'hod',
    FACULTY: 'faculty',
    STUDENT: 'student'
};

// Roles allowed to access the admin panel
export const ALLOWED_ROLES = ['admin', 'principal', 'hod', 'faculty'];

// Normalize role to lowercase
export const normalizeRole = (role) => {
    if (!role) return 'student';
    return role.toLowerCase().trim();
};

// Check if role is allowed to access admin panel
export const isRoleAllowed = (role) => {
    return ALLOWED_ROLES.includes(normalizeRole(role));
};

/**
 * PERMISSIONS - Define what each role can access
 */
export const PERMISSIONS = {
    admin: {
        pages: ['dashboard', 'branches', 'courses', 'timetable', 'users', 'students', 'assignments', 'events', 'notices', 'analytics', 'attendance', 'results'],
        actions: { create: true, read: true, update: true, delete: true },
        scope: 'all',
        canManageAdmins: true
    },
    principal: {
        pages: ['dashboard', 'branches', 'courses', 'timetable', 'users', 'students', 'assignments', 'events', 'notices', 'analytics', 'attendance', 'results'],
        actions: { create: true, read: true, update: true, delete: true },
        scope: 'all',
        canManageAdmins: false
    },
    hod: {
        pages: ['dashboard', 'courses', 'timetable', 'students', 'assignments', 'events', 'notices', 'analytics', 'attendance', 'results'],
        actions: { create: true, read: true, update: true, delete: true },
        scope: 'department'
    },
    faculty: {
        pages: ['timetable', 'students', 'assignments', 'notices', 'events', 'attendance', 'results'],
        actions: { create: true, read: true, update: true, delete: false },
        scope: 'assigned'
    },
    student: {
        pages: ['dashboard', 'timetable', 'assignments', 'notices', 'events'],
        actions: { create: false, read: true, update: false, delete: false },
        scope: 'own'
    }
};

/**
 * Check if a role has access to a specific page
 */
export const hasPageAccess = (role, page) => {
    const normalizedRole = normalizeRole(role);
    const permissions = PERMISSIONS[normalizedRole];
    if (!permissions) return false;
    return permissions.pages.includes(page);
};

/**
 * Check if a role can perform a specific action
 */
export const hasActionAccess = (role, action) => {
    const normalizedRole = normalizeRole(role);
    const permissions = PERMISSIONS[normalizedRole];
    if (!permissions) return false;
    return permissions.actions[action] || false;
};

/**
 * Get the scope for a role
 */
export const getRoleScope = (role) => {
    const normalizedRole = normalizeRole(role);
    const permissions = PERMISSIONS[normalizedRole];
    return permissions?.scope || 'own';
};

/**
 * Get all accessible pages for a role
 */
export const getAccessiblePages = (role) => {
    const normalizedRole = normalizeRole(role);
    const permissions = PERMISSIONS[normalizedRole];
    return permissions?.pages || [];
};

// ═══════════════════════════════════════════════════════════════════
// ROLE CHECK HELPERS
// ═══════════════════════════════════════════════════════════════════

export const isAdmin = (role) => normalizeRole(role) === 'admin';
export const isPrincipal = (role) => normalizeRole(role) === 'principal';
export const isAdminOrPrincipal = (role) => ['admin', 'principal'].includes(normalizeRole(role));
export const isHOD = (role) => normalizeRole(role) === 'hod';
export const isTeacherOrFaculty = (role) => normalizeRole(role) === 'faculty';
export const isStudent = (role) => normalizeRole(role) === 'student';

// ═══════════════════════════════════════════════════════════════════
// PERMISSION CHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if user can manage (create/update) other users
 */
export const canManageUsers = (currentUserRole, targetUserRole = null) => {
    const role = normalizeRole(currentUserRole);
    const targetRole = targetUserRole ? normalizeRole(targetUserRole) : null;

    // Admin can manage anyone
    if (role === 'admin') return true;

    // Principal can manage anyone except admin
    if (role === 'principal') {
        return targetRole !== 'admin';
    }

    // HOD can manage faculty and students
    if (role === 'hod') {
        return ['faculty', 'student'].includes(targetRole);
    }

    // Faculty/Student cannot manage others
    return false;
};

/**
 * Check if user can delete users
 */
export const canDeleteUsers = (role) => {
    return normalizeRole(role) === 'admin';
};

/**
 * Check if user can change roles
 */
export const canChangeRoles = (role) => {
    return isAdminOrPrincipal(role);
};

/**
 * Check if faculty can access a specific student's data
 */
export const canTeacherAccessStudent = (teacherData, studentData) => {
    if (!teacherData || !studentData) return false;

    const role = normalizeRole(teacherData.role);

    // Admin/Principal can access all
    if (isAdminOrPrincipal(role)) return true;

    // HOD can access department students
    if (role === 'hod') return teacherData.department === studentData.department;

    // Faculty can access students in their department
    if (isTeacherOrFaculty(role)) {
        return teacherData.department === studentData.department;
    }

    return false;
};

/**
 * Check if faculty can access/modify a section
 * STRICT: Faculty MUST have the section assigned to them
 */
export const canTeacherAccessSection = (teacherData, sectionData) => {
    if (!teacherData || !sectionData) return false;

    const role = normalizeRole(teacherData.role);

    if (isAdminOrPrincipal(role)) return true;
    if (role === 'hod') return teacherData.department === sectionData.branch;

    // Faculty - check assigned sections (NO department fallback)
    if (isTeacherOrFaculty(role)) {
        const assignedSections = teacherData.assignedSections || [];

        if (assignedSections.length === 0) {
            return false;
        }

        // Check if section matches exactly
        return assignedSections.some(s => {
            if (typeof s === 'object') {
                return s.branch === sectionData.branch &&
                    String(s.semester) === String(sectionData.semester) &&
                    s.section === sectionData.section;
            }
            return s === `${sectionData.branch}-${sectionData.semester}-${sectionData.section}`;
        });
    }

    return false;
};

/**
 * Check if faculty can access a timetable entry
 */
export const canTeacherAccessTimetable = (teacherData, timetableData) => {
    if (!teacherData || !timetableData) return false;

    const role = normalizeRole(teacherData.role);

    // All authenticated users can READ timetable
    if (timetableData) return true;

    return true;
};

/**
 * Check if faculty can modify (create/update) a timetable entry
 * STRICT: Faculty MUST have the section assigned to them
 */
export const canTeacherModifyTimetable = (teacherData, timetableData) => {
    if (!teacherData || !timetableData) {
        console.log('[Permission] Missing data - teacherData:', !!teacherData, 'timetableData:', !!timetableData);
        return false;
    }

    const role = normalizeRole(teacherData.role);
    console.log('[Permission] Checking role:', role, 'for branch:', timetableData.branch, 'sem:', timetableData.semester, 'sec:', timetableData.section);

    // Admin/Principal can modify any timetable
    if (isAdminOrPrincipal(role)) {
        console.log('[Permission] Admin/Principal - allowed');
        return true;
    }

    // HOD can modify entries in their department
    if (role === 'hod') {
        const allowed = teacherData.department === timetableData.branch;
        console.log('[Permission] HOD check - department:', teacherData.department, 'vs branch:', timetableData.branch, '=', allowed);
        return allowed;
    }

    // Faculty can ONLY modify entries in their assigned sections
    // No department fallback - must have explicit section assignment
    if (isTeacherOrFaculty(role)) {
        const assignedSections = teacherData.assignedSections || [];
        console.log('[Permission] Faculty assignedSections:', JSON.stringify(assignedSections));

        // If no sections assigned, faculty cannot modify any timetable
        if (assignedSections.length === 0) {
            console.log('[Permission] No sections assigned - denied');
            return false;
        }

        const result = assignedSections.some(s => {
            if (typeof s === 'object') {
                const branchMatch = s.branch === timetableData.branch;
                const semesterMatch = String(s.semester) === String(timetableData.semester);
                const sectionMatch = s.section === timetableData.section;
                console.log('[Permission] Comparing:',
                    'branch:', s.branch, '===', timetableData.branch, '=', branchMatch,
                    '| sem:', s.semester, '===', timetableData.semester, '=', semesterMatch,
                    '| sec:', s.section, '===', timetableData.section, '=', sectionMatch
                );
                return branchMatch && semesterMatch && sectionMatch;
            }
            const strMatch = s === `${timetableData.branch}-${timetableData.semester}-${timetableData.section}`;
            console.log('[Permission] String match:', s, '===', `${timetableData.branch}-${timetableData.semester}-${timetableData.section}`, '=', strMatch);
            return strMatch;
        });

        console.log('[Permission] Final result:', result);
        return result;
    }

    console.log('[Permission] Role not faculty - denied');
    return false;
};

/**
 * Check if faculty can modify an assignment
 */
export const canTeacherModifyAssignment = (teacherData, assignmentData) => {
    if (!teacherData || !assignmentData) return false;

    const role = normalizeRole(teacherData.role);

    if (isAdminOrPrincipal(role)) return true;
    if (role === 'hod') return teacherData.department === assignmentData.branch;

    // Faculty can only modify their own assignments
    if (isTeacherOrFaculty(role)) {
        return assignmentData.createdBy === teacherData.uid;
    }

    return false;
};

/**
 * Check if faculty can mark attendance for a class
 * STRICT: Faculty MUST have the section assigned to them
 */
export const canTeacherMarkAttendance = (teacherData, attendanceData) => {
    if (!teacherData || !attendanceData) return false;

    const role = normalizeRole(teacherData.role);

    // Admin/Principal can mark attendance for any class
    if (isAdminOrPrincipal(role)) return true;

    // HOD can mark attendance for their department
    if (role === 'hod') {
        return teacherData.department === attendanceData.branch;
    }

    // Faculty can ONLY mark attendance for their assigned sections
    if (isTeacherOrFaculty(role)) {
        const assignedSections = teacherData.assignedSections || [];

        // If no sections assigned, faculty cannot mark attendance
        if (assignedSections.length === 0) {
            return false;
        }

        // Check if section matches exactly
        return assignedSections.some(s => {
            if (typeof s === 'object') {
                return s.branch === attendanceData.branch &&
                    String(s.semester) === String(attendanceData.semester) &&
                    s.section === attendanceData.section;
            }
            return s === `${attendanceData.branch}-${attendanceData.semester}-${attendanceData.section}`;
        });
    }

    return false;
};

/**
 * Check if user can access another user's data
 */
export const canAccessUserData = (currentUserData, targetUserData) => {
    if (!currentUserData || !targetUserData) return false;

    // User can always access their own data
    if (currentUserData.uid === targetUserData.id) return true;

    const role = normalizeRole(currentUserData.role);
    const targetRole = normalizeRole(targetUserData.role);

    // Admin can access all
    if (role === 'admin') return true;

    // Principal can access non-admin users
    if (role === 'principal') return targetRole !== 'admin';

    // HOD can access department users
    if (role === 'hod') {
        return currentUserData.department === targetUserData.department;
    }

    // Faculty can access students in their department
    if (isTeacherOrFaculty(role)) {
        return targetRole === 'student' &&
            currentUserData.department === targetUserData.department;
    }

    return false;
};

/**
 * Check if faculty can access a course
 */
export const canTeacherAccessCourse = (teacherData, courseData) => {
    if (!teacherData || !courseData) return false;

    // All authenticated users can READ courses
    return true;
};

/**
 * Filter data by teacher's scope (deprecated - use service-level filtering)
 */
export const filterByTeacherScope = (teacherData, records, branchField = 'branch') => {
    if (!teacherData || !records) return [];

    const role = normalizeRole(teacherData.role);

    // Admin/Principal see all
    if (isAdminOrPrincipal(role)) return records;

    // HOD sees department records
    if (role === 'hod') {
        return records.filter(r => r[branchField] === teacherData.department);
    }

    // Faculty sees department records
    if (isTeacherOrFaculty(role)) {
        return records.filter(r => r[branchField] === teacherData.department);
    }

    return [];
};

export default {
    ROLES,
    ALLOWED_ROLES,
    PERMISSIONS,
    normalizeRole,
    isRoleAllowed,
    hasPageAccess,
    hasActionAccess,
    getRoleScope,
    getAccessiblePages,
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
    canTeacherAccessTimetable,
    canTeacherModifyTimetable,
    canTeacherModifyAssignment,
    canTeacherMarkAttendance,
    canAccessUserData,
    canTeacherAccessCourse,
    filterByTeacherScope
};
