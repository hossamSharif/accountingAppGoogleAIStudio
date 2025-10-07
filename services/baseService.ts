import { auth, db } from '../firebase';
import {
    writeBatch,
    doc,
    collection,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp
} from 'firebase/firestore';

export abstract class BaseService {
    protected static db = db;
    protected static auth = auth;

    // Common error handling
    protected static handleError(error: any, context: string): never {
        console.error(`Error in ${context}:`, error);

        // If it's a Firebase error, re-throw to preserve error code
        if (error?.code) {
            throw error;
        }

        // Otherwise throw generic error
        throw new Error(`Operation failed: ${context}`);
    }

    // Common validation
    protected static validateRequired(data: any, fields: string[]): void {
        const missingFields = fields.filter(field => {
            const value = data[field];
            // Check if field is missing, null, or undefined
            if (value === null || value === undefined) return true;
            // For strings, check if empty after trimming
            if (typeof value === 'string' && value.trim() === '') return true;
            // All other values (including 0, false, enums) are valid
            return false;
        });

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
    }

    // Generate unique ID
    protected static generateId(): string {
        return doc(collection(this.db, 'temp')).id;
    }

    // Convert Firestore timestamp to ISO string
    protected static timestampToString(timestamp: any): string {
        if (!timestamp) return new Date().toISOString();

        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toISOString();
        }

        return new Date(timestamp).toISOString();
    }

    // Convert ISO string to Firestore timestamp
    protected static stringToTimestamp(dateString: string): Timestamp {
        return Timestamp.fromDate(new Date(dateString));
    }

    // Check if document exists
    protected static async documentExists(collectionName: string, docId: string): Promise<boolean> {
        try {
            const docSnap = await getDoc(doc(this.db, collectionName, docId));
            return docSnap.exists();
        } catch (error) {
            return false;
        }
    }

    // Get current user ID
    protected static getCurrentUserId(): string | null {
        return this.auth.currentUser?.uid || null;
    }

    // Check if current user is authenticated
    protected static requireAuth(): string {
        const userId = this.getCurrentUserId();
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return userId;
    }

    // Batch write helper
    protected static createBatch() {
        return writeBatch(this.db);
    }

    // Common query helpers
    protected static async getDocumentById<T>(collectionName: string, id: string): Promise<T | null> {
        try {
            const docSnap = await getDoc(doc(this.db, collectionName, id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() } as T;
            }
            return null;
        } catch (error) {
            this.handleError(error, `getDocumentById(${collectionName}, ${id})`);
        }
    }

    protected static async getDocumentsByField<T>(
        collectionName: string,
        field: string,
        value: any,
        orderByField?: string,
        limitCount?: number
    ): Promise<T[]> {
        try {
            let q = query(collection(this.db, collectionName), where(field, '==', value));

            if (orderByField) {
                q = query(q, orderBy(orderByField, 'desc'));
            }

            if (limitCount) {
                q = query(q, limit(limitCount));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        } catch (error) {
            this.handleError(error, `getDocumentsByField(${collectionName}, ${field}, ${value})`);
        }
    }

    // Data sanitization helpers
    protected static sanitizeString(input: string): string {
        return input?.toString().trim() || '';
    }

    protected static sanitizeNumber(input: any): number {
        const num = parseFloat(input);
        return isNaN(num) ? 0 : num;
    }

    // Validation helpers
    protected static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    protected static isValidDate(dateString: string): boolean {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    // Document reference helper
    protected static getDocumentRef(collectionName: string, docId?: string) {
        return docId ? doc(this.db, collectionName, docId) : doc(collection(this.db, collectionName));
    }

    // Collection reference helper
    protected static getCollectionRef(collectionName: string) {
        return collection(this.db, collectionName);
    }
}