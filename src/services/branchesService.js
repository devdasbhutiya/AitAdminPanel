// Branches Service - Firestore operations for branches collection
import {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    Timestamp
} from './firebase';

const COLLECTION = 'branches';

export const branchesService = {
    // Get all branches
    async getAll() {
        try {
            const snapshot = await getDocs(collection(db, COLLECTION));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching branches:', error);
            throw error;
        }
    },

    // Get single branch by ID
    async getById(id) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching branch:', error);
            throw error;
        }
    },

    // Create new branch
    async create(branchData) {
        try {
            const docData = {
                ...branchData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            const docRef = await addDoc(collection(db, COLLECTION), docData);
            return { id: docRef.id, ...docData };
        } catch (error) {
            console.error('Error creating branch:', error);
            throw error;
        }
    },

    // Update branch
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
            console.error('Error updating branch:', error);
            throw error;
        }
    },

    // Delete branch
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting branch:', error);
            throw error;
        }
    }
};

export default branchesService;
