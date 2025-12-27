// Courses Service - Firestore operations for courses collection
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

const COLLECTION = 'courses';

export const coursesService = {
    // Get all courses with optional filters
    async getAll(filters = {}) {
        try {
            let q = collection(db, COLLECTION);
            const constraints = [];

            if (filters.department) {
                constraints.push(where('department', '==', filters.department));
            }
            if (filters.semester) {
                constraints.push(where('semester', '==', filters.semester));
            }

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching courses:', error);
            throw error;
        }
    },

    // Get single course by ID
    async getById(id) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching course:', error);
            throw error;
        }
    },

    // Create new course
    async create(courseData) {
        try {
            const docData = {
                ...courseData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            const docRef = await addDoc(collection(db, COLLECTION), docData);
            return { id: docRef.id, ...docData };
        } catch (error) {
            console.error('Error creating course:', error);
            throw error;
        }
    },

    // Update course
    async update(id, data) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const updateData = {
                ...data,
                updatedAt: Timestamp.now()
            };
            await updateDoc(docRef, updateData);
            return { id, ...updateData };
        } catch (error) {
            console.error('Error updating course:', error);
            throw error;
        }
    },

    // Delete course
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting course:', error);
            throw error;
        }
    }
};

export default coursesService;
