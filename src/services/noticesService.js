// Notices Service - Firestore operations for notices collection
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
    orderBy,
    Timestamp
} from './firebase';

const COLLECTION = 'notices';

export const noticesService = {
    // Get all notices
    async getAll() {
        try {
            const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching notices:', error);
            // Fallback without orderBy if index doesn't exist
            const snapshot = await getDocs(collection(db, COLLECTION));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
    },

    // Get single notice by ID
    async getById(id) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching notice:', error);
            throw error;
        }
    },

    // Create new notice
    async create(noticeData, currentUser) {
        try {
            const docData = {
                ...noticeData,
                createdBy: currentUser?.uid || '',
                createdByName: currentUser?.name || 'Admin',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            const docRef = await addDoc(collection(db, COLLECTION), docData);
            return { id: docRef.id, ...docData };
        } catch (error) {
            console.error('Error creating notice:', error);
            throw error;
        }
    },

    // Update notice
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
            console.error('Error updating notice:', error);
            throw error;
        }
    },

    // Delete notice
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting notice:', error);
            throw error;
        }
    }
};

export default noticesService;
