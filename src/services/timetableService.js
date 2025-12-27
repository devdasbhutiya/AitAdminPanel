// Timetable Service - Firestore operations for timetable collection
// Simple structure: timetables/{autoId} with branch, semester, section as fields
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
    Timestamp
} from './firebase';
import { canTeacherAccessTimetable, canTeacherModifyTimetable, normalizeRole } from '../utils/permissions';

const COLLECTION = 'timetables';

export const timetableService = {
    // Get all timetable entries
    async getAll(filters = {}) {
        try {
            const snapshot = await getDocs(collection(db, COLLECTION));

            const entries = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }));

            // Apply filters if provided
            return entries.filter(entry => {
                if (filters.branch && entry.branch !== filters.branch) return false;
                if (filters.semester && entry.semester !== filters.semester) return false;
                if (filters.section && entry.section !== filters.section) return false;
                if (filters.day && entry.day?.toLowerCase() !== filters.day.toLowerCase()) return false;
                return true;
            });
        } catch (error) {
            console.error('Error fetching timetable:', error);
            throw error;
        }
    },

    // Get timetable entries scoped to faculty's assigned sections
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

            // Faculty: get entries for their assigned sections
            const assignedSections = teacherData.assignedSections || [];

            if (assignedSections.length === 0) {
                return [];
            }

            // Get all entries and filter by assigned sections
            const allRecords = await this.getAll(filters);

            // Filter to only entries the faculty is assigned to
            return allRecords.filter(record =>
                canTeacherAccessTimetable(teacherData, record)
            );
        } catch (error) {
            console.error('Error fetching faculty timetable:', error);
            throw error;
        }
    },

    // Get timetable for a specific section
    async getBySection(branch, semester, section) {
        try {
            const allEntries = await this.getAll({ branch, semester, section });
            return allEntries;
        } catch (error) {
            console.error('Error fetching timetable section:', error);
            throw error;
        }
    },

    // Create new timetable entry (with permission check for faculty)
    async create(timetableData, currentUser) {
        try {
            const { branch, semester, section, day, courseId, startTime, endTime, courseName, instructor, room, type } = timetableData;

            if (!branch || !semester || !section || !day) {
                throw new Error('Missing required fields: branch, semester, section, day');
            }

            if (!courseName && !courseId) {
                throw new Error('Either courseName or courseId must be provided');
            }

            const role = normalizeRole(currentUser?.role);

            // Faculty can only create for their assigned sections
            if (role === 'faculty') {
                const canModify = canTeacherModifyTimetable(currentUser, timetableData);
                if (!canModify) {
                    throw new Error('You do not have permission to create timetable entries for this section');
                }
            }

            const docData = {
                branch,
                semester: String(semester),
                section,
                day,
                courseId: courseId || '', // Allow empty courseId if courseName is provided
                courseName: courseName || '',
                startTime,
                endTime,
                instructor: instructor || '',
                room: room || '',
                type: type || 'lecture',
                createdBy: currentUser?.uid || '',
                createdByName: currentUser?.name || 'User',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, COLLECTION), docData);
            return { id: docRef.id, ...docData };
        } catch (error) {
            console.error('Error creating timetable entry:', error);
            throw error;
        }
    },

    // Update timetable entry (with permission check for faculty)
    async update(id, data, currentUser) {
        try {
            const { branch, semester, section, day, courseId, startTime, endTime, courseName, instructor, room, type } = data;

            const role = normalizeRole(currentUser?.role);

            // Faculty can only update entries for their assigned sections
            if (role === 'faculty') {
                if (!canTeacherModifyTimetable(currentUser, data)) {
                    throw new Error('You do not have permission to update this timetable entry');
                }
            }

            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Timetable entry not found');
            }

            const updateData = {
                branch,
                semester: String(semester),
                section,
                day,
                courseId: courseId || '',
                courseName: courseName || '',
                startTime,
                endTime,
                instructor: instructor || '',
                room: room || '',
                type: type || 'lecture',
                updatedBy: currentUser?.uid || '',
                updatedByName: currentUser?.name || 'User',
                updatedAt: Timestamp.now()
            };

            await updateDoc(docRef, updateData);
            return { id, ...updateData };
        } catch (error) {
            console.error('Error updating timetable entry:', error);
            throw error;
        }
    },

    // Delete timetable entry (faculty cannot delete)
    async delete(id, currentUser) {
        try {
            const role = normalizeRole(currentUser?.role);

            // Faculty cannot delete timetable entries
            if (role === 'faculty') {
                throw new Error('You do not have permission to delete timetable entries');
            }

            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                throw new Error('Timetable entry not found');
            }

            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error('Error deleting timetable entry:', error);
            throw error;
        }
    }
};

export default timetableService;
