// Students Service - Firestore operations for students collection
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
    Timestamp,
    setDoc,
    createUserWithSecondaryApp
} from './firebase';

const COLLECTION = 'students';

export const studentsService = {
    // Get all students with optional filters
    async getAll(filters = {}) {
        try {
            let q = collection(db, COLLECTION);
            const constraints = [];

            if (filters.branch) {
                constraints.push(where('branch', '==', filters.branch));
            }
            if (filters.semester) {
                constraints.push(where('semester', '==', filters.semester));
            }
            if (filters.section) {
                constraints.push(where('section', '==', filters.section));
            }
            if (filters.admissionYear) {
                constraints.push(where('admissionYear', '==', filters.admissionYear));
            }
            if (filters.isDtoD !== undefined) {
                constraints.push(where('isDtoD', '==', filters.isDtoD));
            }

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching students:', error);
            throw error;
        }
    },

    // Get single student by ID
    async getById(id) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching student:', error);
            throw error;
        }
    },

    // Get student by enrollment number
    async getByEnrollmentNo(enrollmentNo) {
        try {
            const q = query(collection(db, COLLECTION), where('enrollmentNo', '==', enrollmentNo));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Error fetching student by enrollment:', error);
            throw error;
        }
    },

    // Create new student with Firebase Auth account
    async create(studentData, currentUser) {
        try {
            // Email is required for Firebase Auth
            if (!studentData.email || !studentData.email.trim()) {
                throw new Error('Email is required to create a student account');
            }

            // Check if enrollment number already exists
            const existing = await this.getByEnrollmentNo(studentData.enrollmentNo);
            if (existing) {
                throw new Error('A student with this enrollment number already exists');
            }

            // Use enrollment number as default password
            const defaultPassword = studentData.enrollmentNo.toString();

            // Create Firebase Auth account using secondary app (doesn't logout admin)
            const newUser = await createUserWithSecondaryApp(
                studentData.email.trim(),
                defaultPassword
            );

            // Create user document in 'users' collection with auth UID
            await setDoc(doc(db, 'users', newUser.uid), {
                name: studentData.name,
                email: studentData.email.trim(),
                role: 'student',
                enrollmentNo: studentData.enrollmentNo,
                branch: studentData.branch,
                semester: studentData.semester,
                section: studentData.section,
                createdBy: currentUser?.uid || '',
                createdByName: currentUser?.name || 'User',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            // Create student document in 'students' collection
            const docData = {
                ...studentData,
                authUid: newUser.uid, // Link to Firebase Auth UID
                createdBy: currentUser?.uid || '',
                createdByName: currentUser?.name || 'User',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            const docRef = await addDoc(collection(db, COLLECTION), docData);
            return { id: docRef.id, ...docData };
        } catch (error) {
            console.error('Error creating student:', error);
            throw error;
        }
    },

    // Update student
    async update(id, data, currentUser) {
        try {
            // If enrollment number is being changed, check for duplicates
            if (data.enrollmentNo) {
                const existing = await this.getByEnrollmentNo(data.enrollmentNo);
                if (existing && existing.id !== id) {
                    throw new Error('A student with this enrollment number already exists');
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
            console.error('Error updating student:', error);
            throw error;
        }
    },

    // Delete student
    async delete(id, currentUser) {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
        }
    },

    // Bulk create students (for Excel import)
    async bulkCreate(studentsArray, currentUser) {
        try {
            const results = {
                success: 0,
                failed: 0,
                errors: []
            };

            for (const studentData of studentsArray) {
                try {
                    await this.create(studentData, currentUser);
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.errors.push({
                        enrollmentNo: studentData.enrollmentNo,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('Error bulk creating students:', error);
            throw error;
        }
    }
};

export default studentsService;
