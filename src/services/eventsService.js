// Events Service - Firestore operations for events collection
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

const COLLECTION = 'events';

export const eventsService = {
    // Get all events with optional filters
    async getAll(filters = {}) {
        try {
            let q = collection(db, COLLECTION);
            const constraints = [];

            if (filters.upcoming) {
                constraints.push(where('date', '>=', Timestamp.now()));
                constraints.push(orderBy('date', 'asc'));
            }

            if (constraints.length > 0) {
                q = query(q, ...constraints);
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    },

    // Get single event by ID
    async getById(id) {
        try {
            const docRef = doc(db, COLLECTION, id);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch (error) {
            console.error('Error fetching event:', error);
            throw error;
        }
    },

    // Create new event
    async create(eventData) {
        try {
            const docData = {
                ...eventData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            const docRef = await addDoc(collection(db, COLLECTION), docData);
            return { id: docRef.id, ...docData };
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    },

    // Update event
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
            console.error('Error updating event:', error);
            throw error;
        }
    },

    // Delete event
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTION, id));
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    },

    // Get upcoming events count
    async getUpcomingCount() {
        try {
            const q = query(
                collection(db, COLLECTION),
                where('date', '>=', Timestamp.now())
            );
            const snapshot = await getDocs(q);
            return snapshot.size;
        } catch (error) {
            console.error('Error getting upcoming events count:', error);
            return 0;
        }
    }
};

export default eventsService;
