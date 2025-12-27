// Users Service - Firestore operations for users collection
import {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    query,
    where,
    orderBy,
    Timestamp,
    createUserWithSecondaryApp
} from './firebase';
import { canAccessUserData, canChangeRoles, normalizeRole } from '../utils/permissions';

const COLLECTION = 'users';

export const usersService = {
    // Get all users with optional filters
    async getAll(filters = {}) {
        try {
            let q = collection(db, COLLECTION);
            const constraints = [];

            if (filters.role) {
                constraints.push(where('role', '==', filters.role));
            }
            if (filters.department) {
                constraints.push(where('department', '==', filters.department));
            }

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    // Get users scoped to current user's permissions
    async getForUser(currentUserData, filters = {}) {
        try {
            const role = normalizeRole(currentUserData?.role);

            // Admin can see all users
            if (role === 'admin') {
                return this.getAll(filters);
            }

            // Principal can see all except admin
            if (role === 'principal') {
                const allUsers = await this.getAll(filters);
                return allUsers.filter(user => normalizeRole(user.role) !== 'admin');
            }

            // HOD can see users in their department (except admin/principal)
            if (role === 'hod') {
                const deptUsers = await this.getAll({
                    ...filters,
                    department: currentUserData.department
                });
                return deptUsers.filter(user => {
                    const userRole = normalizeRole(user.role);
                    return userRole !== 'admin' && userRole !== 'principal';
                });
            }

            // Faculty can only see students in their department
            if (role === 'faculty') {
                const students = await this.getAll({
                    role: 'student',
                    department: currentUserData.department
                });
                // Also include own profile
                const ownProfile = await this.getById(currentUserData.uid);
                if (ownProfile) {
                    return [ownProfile, ...students.filter(s => s.id !== currentUserData.uid)];
                }
                return students;
            }

            return [];
        } catch (error) {
            console.error('Error fetching scoped users:', error);
            throw error;
        }
    },

    // Get students in a specific department (for teacher access)
    async getStudentsByDepartment(department) {
        try {
            return this.getAll({ role: 'student', department });
        } catch (error) {
            console.error('Error fetching students by department:', error);
            throw error;
        }
    },

    // Get single user by ID
    async getById(id) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    },

    // Get user by ID with permission check
    async getByIdForUser(id, currentUserData) {
        try {
            const targetUser = await this.getById(id);
            if (!targetUser) return null;

            // Check if current user can access target user's data
            if (!canAccessUserData(currentUserData, targetUser)) {
                throw new Error('You do not have permission to access this user data');
            }

            return targetUser;
        } catch (error) {
            console.error('Error fetching user with permission check:', error);
            throw error;
        }
    },

    // Create new user (with Firebase Auth using secondary app to prevent admin sign-out)
    async create(userData, currentUser) {
        try {
            // Check if current user can change roles
            const role = normalizeRole(currentUser?.role);
            if (role === 'faculty') {
                throw new Error('You do not have permission to create users');
            }

            // Validate role assignment permissions
            if (userData.role && !canChangeRoles(role)) {
                // Non-admin users have restrictions on what roles they can assign
                const targetRole = normalizeRole(userData.role);
                if (role === 'principal' && targetRole === 'admin') {
                    throw new Error('You cannot create admin users');
                }
                if (role === 'hod' && ['admin', 'principal', 'hod'].includes(targetRole)) {
                    throw new Error('You cannot create users with this role');
                }
            }

            // Create Firebase Auth user using secondary app (doesn't sign out admin)
            const newUser = await createUserWithSecondaryApp(
                userData.email,
                userData.password
            );

            // Create Firestore document (admin is still signed in, so this uses admin's auth)
            const userDoc = {
                email: userData.email,
                name: userData.name,
                role: userData.role,
                department: userData.department || '',
                enrollmentId: userData.enrollmentId || '',
                semester: userData.semester || '',
                designation: userData.designation || '',
                assignedCourses: userData.assignedCourses || [],
                assignedSections: userData.assignedSections || [],
                status: 'active',
                createdAt: Timestamp.now(),
                createdBy: currentUser?.uid || '',
                updatedAt: Timestamp.now()
            };

            await setDoc(doc(db, COLLECTION, newUser.uid), userDoc);

            return { id: newUser.uid, ...userDoc };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    // Update user
    async update(id, data, currentUser) {
        try {
            // Get target user to validate access
            const targetUser = await this.getById(id);
            if (!targetUser) {
                throw new Error('User not found');
            }

            const role = normalizeRole(currentUser?.role);

            // Faculty can only update their own profile
            if (role === 'faculty') {
                if (id !== currentUser.uid) {
                    throw new Error('You can only update your own profile');
                }
                // Faculty cannot change their own role
                if (data.role && data.role !== targetUser.role) {
                    throw new Error('You cannot change your role');
                }
            }

            // Check role change permissions
            if (data.role && data.role !== targetUser.role) {
                if (!canChangeRoles(role)) {
                    // Non-admin users have restrictions
                    const newRole = normalizeRole(data.role);
                    if (role === 'principal' && newRole === 'admin') {
                        throw new Error('You cannot assign admin role');
                    }
                    if (role === 'hod') {
                        throw new Error('You cannot change user roles');
                    }
                }
            }

            const docRef = doc(db, COLLECTION, id);
            const updateData = {
                ...data,
                updatedBy: currentUser?.uid || '',
                updatedAt: Timestamp.now()
            };
            // Remove password from update data (handled separately)
            delete updateData.password;

            await updateDoc(docRef, updateData);
            return { id, ...updateData };
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    },

    // Delete user
    async delete(id, currentUser) {
        try {
            const role = normalizeRole(currentUser?.role);

            // Only admin can delete users
            if (role !== 'admin') {
                throw new Error('Only administrators can delete users');
            }

            await deleteDoc(doc(db, COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    },

    // Get users count by role
    async getCountByRole() {
        try {
            const snapshot = await getDocs(collection(db, COLLECTION));
            const counts = { admin: 0, principal: 0, hod: 0, faculty: 0, student: 0 };

            snapshot.docs.forEach(doc => {
                const role = doc.data().role?.toLowerCase();
                if (counts[role] !== undefined) {
                    counts[role]++;
                }
            });

            return counts;
        } catch (error) {
            console.error('Error getting user counts:', error);
            throw error;
        }
    }
};

export default usersService;
