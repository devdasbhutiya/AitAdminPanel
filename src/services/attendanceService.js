// Attendance Service - Firestore operations for attendance collection
import {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp
} from './firebase';
import { canTeacherAccessSection, canTeacherMarkAttendance, normalizeRole } from '../utils/permissions';

const COLLECTION = 'attendance';
const SUMMARY_COLLECTION = 'attendanceSummary';

export const attendanceService = {
    // Get all attendance records with optional filters
    async getAll(filters = {}) {
        try {
            let q = collection(db, COLLECTION);
            const constraints = [];

            if (filters.courseId) {
                constraints.push(where('courseId', '==', filters.courseId));
            }
            if (filters.date) {
                constraints.push(where('date', '==', filters.date));
            }
            if (filters.branch) {
                constraints.push(where('branch', '==', filters.branch));
            }
            if (filters.semester) {
                constraints.push(where('semester', '==', filters.semester));
            }
            if (filters.section) {
                constraints.push(where('section', '==', filters.section));
            }
            // For teacher-specific filtering
            if (filters.markedBy) {
                constraints.push(where('markedBy', '==', filters.markedBy));
            }

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching attendance:', error);
            throw error;
        }
    },

    // Get attendance records scoped to faculty's permissions
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

            // Faculty: filter by their assigned sections or department
            const allRecords = await this.getAll({
                ...filters,
                branch: teacherData.department
            });

            // Further filter by assigned sections/courses
            return allRecords.filter(record =>
                canTeacherAccessSection(teacherData, record) ||
                record.markedBy === teacherData.uid
            );
        } catch (error) {
            console.error('Error fetching faculty attendance:', error);
            throw error;
        }
    },

    // Get single attendance record by ID
    async getById(id) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching attendance record:', error);
            throw error;
        }
    },

    // Get attendance for specific course and date
    async getByDateAndCourse(courseId, date, section) {
        try {
            const docId = `${courseId}_${section}_${date}`;
            const docRef = doc(db, COLLECTION, docId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching attendance by date and course:', error);
            throw error;
        }
    },

    // Mark attendance for a class (with permission check)
    async markAttendance(attendanceData, currentUser) {
        try {
            // Validate faculty can mark attendance for this section
            const role = normalizeRole(currentUser?.role);
            if (role === 'faculty') {
                if (!canTeacherMarkAttendance(currentUser, attendanceData)) {
                    throw new Error('You do not have permission to mark attendance for this section');
                }
            }

            // Create document ID: courseId_section_date format
            const docId = `${attendanceData.courseId}_${attendanceData.section}_${attendanceData.date}`;

            const docData = {
                ...attendanceData,
                markedBy: currentUser?.uid || '',
                markedByName: currentUser?.name || 'Faculty',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            // Use setDoc to create or update with specific ID
            await setDoc(doc(db, COLLECTION, docId), docData);

            // Update attendance summaries for each student
            await this.updateAttendanceSummaries(attendanceData);

            return { id: docId, ...docData };
        } catch (error) {
            console.error('Error marking attendance:', error);
            throw error;
        }
    },

    // Update attendance summaries for all students in a class
    async updateAttendanceSummaries(attendanceData) {
        try {
            const { courseId, presentStudents, totalStudents, totalStudentsList } = attendanceData;

            // We need to get all attendance records for this course to calculate totals
            const courseAttendance = await this.getAll({
                courseId,
                branch: attendanceData.branch,
                section: attendanceData.section
            });

            const totalClasses = courseAttendance.length;

            // Get all unique students - include both present students AND full student list
            const allStudents = new Set();

            // Add students from historical attendance records
            courseAttendance.forEach(record => {
                (record.presentStudents || []).forEach(s => allStudents.add(s));
                // Also add from totalStudentsList if available (for absent students)
                (record.totalStudentsList || []).forEach(s => allStudents.add(s));
            });

            // Add students from the current attendance data
            (presentStudents || []).forEach(s => allStudents.add(s));
            // Add ALL students from the current class (includes absent students)
            (totalStudentsList || []).forEach(s => allStudents.add(s));

            // Update summary for each student
            for (const enrollmentNo of allStudents) {
                let attended = 0;
                courseAttendance.forEach(record => {
                    if ((record.presentStudents || []).includes(enrollmentNo)) {
                        attended++;
                    }
                });

                const percentage = totalClasses > 0 ? Number(((attended / totalClasses) * 100).toFixed(2)) : 0;

                const summaryId = `${enrollmentNo}_${courseId}`;
                const summaryData = {
                    enrollmentNo,
                    courseId,
                    courseName: attendanceData.courseName || '',
                    branch: attendanceData.branch,
                    semester: attendanceData.semester,
                    section: attendanceData.section,
                    attended,
                    total: totalClasses,
                    percentage,
                    updatedAt: Timestamp.now()
                };

                await setDoc(doc(db, SUMMARY_COLLECTION, summaryId), summaryData, { merge: true });
            }
        } catch (error) {
            console.error('Error updating attendance summaries:', error);
            // Don't throw - let the main attendance save succeed
        }
    },

    // Get attendance summary for a student
    async getStudentSummary(enrollmentNo) {
        try {
            const q = query(
                collection(db, SUMMARY_COLLECTION),
                where('enrollmentNo', '==', enrollmentNo)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching student summary:', error);
            throw error;
        }
    },

    // Get attendance summaries for a course/class
    async getClassSummary(filters = {}) {
        try {
            console.log('[attendanceService] getClassSummary called with filters:', filters);

            let q = collection(db, SUMMARY_COLLECTION);
            const constraints = [];

            if (filters.courseId) {
                constraints.push(where('courseId', '==', filters.courseId));
            }
            if (filters.branch) {
                constraints.push(where('branch', '==', filters.branch));
            }
            if (filters.semester !== null && filters.semester !== undefined) {
                // Try to match both string and number versions
                constraints.push(where('semester', '==', filters.semester));
            }
            if (filters.section) {
                constraints.push(where('section', '==', filters.section));
            }

            console.log('[attendanceService] Query constraints count:', constraints.length);

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getDocs(q);
            console.log('[attendanceService] getClassSummary results:', snapshot.docs.length);

            // If no results with number semester, try with string semester
            if (snapshot.docs.length === 0 && filters.semester) {
                console.log('[attendanceService] No results, trying with string semester...');
                const strConstraints = [];
                if (filters.courseId) strConstraints.push(where('courseId', '==', filters.courseId));
                if (filters.branch) strConstraints.push(where('branch', '==', filters.branch));
                strConstraints.push(where('semester', '==', String(filters.semester)));
                if (filters.section) strConstraints.push(where('section', '==', filters.section));

                const strQuery = query(collection(db, SUMMARY_COLLECTION), ...strConstraints);
                const strSnapshot = await getDocs(strQuery);
                console.log('[attendanceService] String semester results:', strSnapshot.docs.length);

                if (strSnapshot.docs.length > 0) {
                    return strSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                }
            }

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching class summary:', error);
            throw error;
        }
    },

    // Create new attendance record (legacy - kept for compatibility)
    async create(attendanceData, currentUser) {
        return this.markAttendance(attendanceData, currentUser);
    },

    // Update attendance record (with permission check)
    async update(id, data, currentUser) {
        try {
            // Get existing record to check ownership
            const existing = await this.getById(id);
            if (!existing) {
                throw new Error('Attendance record not found');
            }

            const role = normalizeRole(currentUser?.role);
            if (role === 'faculty') {
                // Faculty can only update records they created or for their sections
                if (existing.markedBy !== currentUser.uid &&
                    !canTeacherAccessSection(currentUser, existing)) {
                    throw new Error('You do not have permission to update this attendance record');
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

            // Update summaries if presentStudents changed
            if (data.presentStudents) {
                await this.updateAttendanceSummaries({ ...existing, ...data });
            }

            return { id, ...updateData };
        } catch (error) {
            console.error('Error updating attendance record:', error);
            throw error;
        }
    },

    // Delete attendance record
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting attendance record:', error);
            throw error;
        }
    }
};

export default attendanceService;
