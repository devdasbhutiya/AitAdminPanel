import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'results';

/**
 * Get all results
 */
const getAll = async () => {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get a single result by ID
 */
const getById = async (id) => {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Result not found');
    return { id: docSnap.id, ...docSnap.data() };
};

/**
 * Get results by enrollment number
 */
const getByEnrollmentNo = async (enrollmentNo) => {
    const q = query(collection(db, COLLECTION), where('enrollmentNo', '==', enrollmentNo));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Get results by branch, semester, and section
 */
const getByBranchSemesterSection = async (branch, semester, section) => {
    const q = query(
        collection(db, COLLECTION),
        where('branch', '==', branch),
        where('semester', '==', semester),
        where('section', '==', section)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Create a new result
 */
const create = async (data, userData) => {
    const resultData = {
        ...data,
        createdAt: Timestamp.now(),
        createdBy: userData?.uid || 'system',
        updatedAt: Timestamp.now(),
        updatedBy: userData?.uid || 'system'
    };

    const docRef = await addDoc(collection(db, COLLECTION), resultData);
    return { id: docRef.id, ...resultData };
};

/**
 * Update an existing result
 */
const update = async (id, data, userData) => {
    const docRef = doc(db, COLLECTION, id);
    const updateData = {
        ...data,
        updatedAt: Timestamp.now(),
        updatedBy: userData?.uid || 'system'
    };

    await updateDoc(docRef, updateData);
    return { id, ...updateData };
};

/**
 * Delete a result
 */
const deleteResult = async (id, userData) => {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
    return { id };
};

/**
 * Bulk create results from Excel upload
 */
const bulkCreate = async (dataArray, userData) => {
    const batch = writeBatch(db);
    const errors = [];
    let successCount = 0;

    for (let i = 0; i < dataArray.length; i++) {
        try {
            const data = dataArray[i];
            const resultData = {
                ...data,
                createdAt: Timestamp.now(),
                createdBy: userData?.uid || 'system',
                updatedAt: Timestamp.now(),
                updatedBy: userData?.uid || 'system'
            };

            const docRef = doc(collection(db, COLLECTION));
            batch.set(docRef, resultData);
            successCount++;
        } catch (error) {
            errors.push({ index: i, error: error.message, data: dataArray[i] });
        }
    }

    try {
        await batch.commit();
        return {
            success: successCount,
            failed: errors.length,
            errors
        };
    } catch (error) {
        throw new Error(`Batch upload failed: ${error.message}`);
    }
};

/**
 * Calculate CGPA for a student based on their results
 */
const calculateCGPA = async (enrollmentNo) => {
    const results = await getByEnrollmentNo(enrollmentNo);

    if (results.length === 0) {
        return { cgpa: 0, totalCredits: 0 };
    }

    let totalGradePoints = 0;
    let totalCredits = 0;

    // Grade to grade point mapping
    const gradePoints = {
        'A+': 10,
        'A': 9,
        'B+': 8,
        'B': 7,
        'C': 6,
        'D': 5,
        'F': 0
    };

    results.forEach(result => {
        const credits = parseFloat(result.credits) || 0;
        const gradePoint = gradePoints[result.grade] || 0;
        totalGradePoints += gradePoint * credits;
        totalCredits += credits;
    });

    const cgpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;

    return {
        cgpa: parseFloat(cgpa),
        totalCredits
    };
};

/**
 * Calculate semester GPA
 */
const calculateSemesterGPA = async (enrollmentNo, semester) => {
    const allResults = await getByEnrollmentNo(enrollmentNo);
    const semesterResults = allResults.filter(r => r.semester === semester);

    if (semesterResults.length === 0) {
        return { gpa: 0, totalCredits: 0 };
    }

    let totalGradePoints = 0;
    let totalCredits = 0;

    // Grade to grade point mapping
    const gradePoints = {
        'A+': 10,
        'A': 9,
        'B+': 8,
        'B': 7,
        'C': 6,
        'D': 5,
        'F': 0
    };

    semesterResults.forEach(result => {
        const credits = parseFloat(result.credits) || 0;
        const gradePoint = gradePoints[result.grade] || 0;
        totalGradePoints += gradePoint * credits;
        totalCredits += credits;
    });

    const gpa = totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : 0;

    return {
        gpa: parseFloat(gpa),
        totalCredits,
        results: semesterResults
    };
};

const resultsService = {
    getAll,
    getById,
    getByEnrollmentNo,
    getByBranchSemesterSection,
    create,
    update,
    delete: deleteResult,
    bulkCreate,
    calculateCGPA,
    calculateSemesterGPA
};

export default resultsService;
