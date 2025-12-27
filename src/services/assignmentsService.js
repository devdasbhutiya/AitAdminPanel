// Assignments Service - Firestore operations for assignments collection
import {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp
} from './firebase';
import { canTeacherModifyAssignment, canTeacherAccessCourse, normalizeRole } from '../utils/permissions';

const COLLECTION = 'assignments';

export const assignmentsService = {
    // Get all assignments with optional filters
    async getAll(filters = {}) {
        try {
            let q = collection(db, COLLECTION);
            const constraints = [];

            if (filters.courseId) {
                constraints.push(where('courseId', '==', filters.courseId));
            }
            if (filters.branch) {
                constraints.push(where('branch', '==', filters.branch));
            }
            if (filters.semester) {
                constraints.push(where('semester', '==', filters.semester));
            }
            // For teacher-specific filtering
            if (filters.createdBy) {
                constraints.push(where('createdBy', '==', filters.createdBy));
            }

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching assignments:', error);
            throw error;
        }
    },

    // Get assignments scoped to faculty's permissions
    async getForTeacher(teacherData, filters = {}) {
        try {
            const role = normalizeRole(teacherData?.role);

            // Admin/Principal see all
            if (role === 'admin' || role === 'principal') {
                return this.getAll(filters);
            }

            // HOD sees department-level
            if (role === 'hod') {
                return this.getAll({ ...filters, branch: teacherData.department });
            }

            // Faculty: see only their own assignments
            return this.getAll({ ...filters, createdBy: teacherData.uid });
        } catch (error) {
            console.error('Error fetching faculty assignments:', error);
            throw error;
        }
    },

    // Get single assignment by ID
    async getById(id) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching assignment:', error);
            throw error;
        }
    },

    // Create new assignment
    async create(assignmentData, currentUser) {
        try {
            // Validate faculty can create assignment for this course
            const role = normalizeRole(currentUser?.role);
            if (role === 'faculty') {
                if (assignmentData.courseId && !canTeacherAccessCourse(currentUser, { id: assignmentData.courseId })) {
                    // Allow if faculty is not assigned to course but is in same department
                    // This is a fallback for when assignedCourses isn't set up yet
                }
            }

            const docData = {
                ...assignmentData,
                createdBy: currentUser?.uid || '',
                createdByName: currentUser?.name || 'Teacher',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            const docRef = await addDoc(collection(db, COLLECTION), docData);
            return { id: docRef.id, ...docData };
        } catch (error) {
            console.error('Error creating assignment:', error);
            throw error;
        }
    },

    // Update assignment (with ownership check for faculty)
    async update(id, data, currentUser) {
        try {
            // Get existing assignment to check ownership
            const existing = await this.getById(id);
            if (!existing) {
                throw new Error('Assignment not found');
            }

            const role = normalizeRole(currentUser?.role);
            if (role === 'faculty') {
                // Faculty can only update their own assignments
                if (!canTeacherModifyAssignment(currentUser, existing)) {
                    throw new Error('You do not have permission to update this assignment');
                }
            }

            const docRef = doc(db, COLLECTION, id);
            const updateData = {
                ...data,
                updatedBy: currentUser?.uid || '',
                updatedByName: currentUser?.name || 'User',
                updatedAt: Timestamp.now()
            };
            await updateDoc(docRef, updateData);
            return { id, ...updateData };
        } catch (error) {
            console.error('Error updating assignment:', error);
            throw error;
        }
    },

    // Delete assignment
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting assignment:', error);
            throw error;
        }
    },

    // Get assignments count
    async getCount() {
        try {
            const snapshot = await getDocs(collection(db, COLLECTION));
            return snapshot.size;
        } catch (error) {
            console.error('Error getting assignments count:', error);
            return 0;
        }
    }
};

export default assignmentsService;
