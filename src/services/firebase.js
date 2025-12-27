// Firebase Configuration for LMS Admin Panel
import { initializeApp, deleteApp, getApps, getApp } from 'firebase/app';
import {
    getFirestore,
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
    limit,
    startAfter,
    getCountFromServer,
    onSnapshot,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBOtBlp2l7dww4miSqXBXdCT-ZDYRemdEw",
    authDomain: "lmd-ait.firebaseapp.com",
    projectId: "lmd-ait",
    storageBucket: "lmd-ait.firebasestorage.app",
    messagingSenderId: "402242157132",
    appId: "1:402242157132:web:admin-panel"
};

// Initialize Firebase (primary app)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Create a new user using a secondary Firebase app instance.
 * This prevents the admin from being signed out when creating new users.
 * Uses a unique app name each time to avoid caching issues.
 * 
 * @param {string} email - New user's email
 * @param {string} password - New user's password
 * @returns {Promise<{uid: string, email: string}>} The created user's info
 */
export const createUserWithSecondaryApp = async (email, password) => {
    // Generate a unique name for this secondary app instance
    const uniqueAppName = `SecondaryApp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    let secondaryApp = null;

    try {
        // Create a new secondary Firebase app instance with unique name
        secondaryApp = initializeApp(firebaseConfig, uniqueAppName);
        const secondaryAuth = getAuth(secondaryApp);

        // Create user with secondary auth (doesn't affect primary auth state)
        const userCredential = await createUserWithEmailAndPassword(
            secondaryAuth,
            email,
            password
        );

        // Get the user info before cleanup
        const newUser = {
            uid: userCredential.user.uid,
            email: userCredential.user.email
        };

        // Sign out from secondary app (cleanup)
        await signOut(secondaryAuth);

        // Delete the secondary app instance
        await deleteApp(secondaryApp);

        return newUser;
    } catch (error) {
        // Cleanup on error
        if (secondaryApp) {
            try {
                await deleteApp(secondaryApp);
            } catch (deleteError) {
                console.warn('Error deleting secondary app:', deleteError);
            }
        }
        throw error;
    }
};

// Export Firebase instances and utilities
export {
    app,
    db,
    auth,
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
    limit,
    startAfter,
    getCountFromServer,
    onSnapshot,
    Timestamp,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
};
