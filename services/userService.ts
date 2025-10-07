import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signOut, getAuth } from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { BaseService } from './baseService';
import { User } from '../types';

export interface CreateUserData {
    name: string;
    email: string;
    password: string;
    shopId: string;
}

export class UserService extends BaseService {
    // Create new user with Firebase Auth + Firestore
    static async createUser(userData: CreateUserData): Promise<User> {
        let userCredential: any = null;
        let secondaryApp: any = null;
        let secondaryAuth: any = null;

        try {
            // Validate input data
            this.validateRequired(userData, ['name', 'email', 'password', 'shopId']);

            if (!this.isValidEmail(userData.email)) {
                throw new Error('Invalid email format');
            }

            if (userData.password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            // Create a secondary Firebase app instance for user creation
            // This prevents the admin from being logged out
            const firebaseConfig = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
                storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
                appId: import.meta.env.VITE_FIREBASE_APP_ID
            };

            // Create secondary app with unique name
            const secondaryAppName = `createUser_${Date.now()}`;
            secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
            secondaryAuth = getAuth(secondaryApp);

            // 1. Create Firebase Auth user using secondary auth instance
            userCredential = await createUserWithEmailAndPassword(
                secondaryAuth,
                userData.email,
                userData.password
            );

            // 2. Update display name in Firebase Auth
            await updateProfile(userCredential.user, {
                displayName: userData.name
            });

            // 3. Create Firestore user document (using main DB instance)
            const newUser: Omit<User, 'id'> = {
                name: this.sanitizeString(userData.name),
                email: userData.email.toLowerCase().trim(),
                role: 'user',
                shopId: userData.shopId,
                isActive: true
            };

            try {
                await setDoc(doc(this.db, 'users', userCredential.user.uid), newUser);
            } catch (firestoreError: any) {
                // If Firestore fails, delete the auth user to prevent orphaned auth accounts
                console.error('Firestore error, deleting auth user:', firestoreError);
                await userCredential.user.delete();
                throw firestoreError;
            }

            // 4. Send verification email
            await sendEmailVerification(userCredential.user);

            // 5. Sign out from secondary auth (this doesn't affect the main auth instance)
            await signOut(secondaryAuth);

            // 6. Clean up secondary app
            await deleteApp(secondaryApp);

            return { id: userCredential.user.uid, ...newUser };

        } catch (error: any) {
            // If auth user was created but something else failed, clean it up
            if (userCredential && userCredential.user) {
                try {
                    await userCredential.user.delete();
                } catch (deleteError) {
                    console.error('Failed to delete orphaned auth user:', deleteError);
                }
            }

            // Clean up secondary app if it exists
            if (secondaryApp) {
                try {
                    await deleteApp(secondaryApp);
                } catch (deleteError) {
                    console.error('Failed to delete secondary app:', deleteError);
                }
            }

            this.handleError(error, 'createUser');
        }
    }

    // Update user data in Firestore
    static async updateUser(userId: string, userData: Partial<Omit<User, 'id' | 'role'>>): Promise<void> {
        try {
            this.validateRequired({ userId }, ['userId']);

            // Sanitize data
            const updateData: any = {};

            if (userData.name) {
                updateData.name = this.sanitizeString(userData.name);
            }

            if (userData.email) {
                if (!this.isValidEmail(userData.email)) {
                    throw new Error('Invalid email format');
                }
                updateData.email = userData.email.toLowerCase().trim();
            }

            if (userData.shopId !== undefined) {
                updateData.shopId = userData.shopId;
            }

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid data to update');
            }

            await updateDoc(doc(this.db, 'users', userId), updateData);

        } catch (error: any) {
            this.handleError(error, 'updateUser');
        }
    }

    // Toggle user active status
    static async toggleUserStatus(userId: string): Promise<void> {
        try {
            this.validateRequired({ userId }, ['userId']);

            // Get current user data
            const userDoc = await this.getDocumentById<User>('users', userId);
            if (!userDoc) {
                throw new Error('User not found');
            }

            // Update status
            await updateDoc(doc(this.db, 'users', userId), {
                isActive: !userDoc.isActive
            });

        } catch (error: any) {
            this.handleError(error, 'toggleUserStatus');
        }
    }

    // Delete user from Firestore (Note: Firebase Auth user must be deleted manually from console)
    static async deleteUser(userId: string): Promise<void> {
        try {
            this.validateRequired({ userId }, ['userId']);

            // Check if user has transactions before deletion
            const hasTransactions = await this.hasTransactions(userId);
            if (hasTransactions) {
                throw new Error('Cannot delete user with existing transactions');
            }

            await deleteDoc(doc(this.db, 'users', userId));

        } catch (error: any) {
            this.handleError(error, 'deleteUser');
        }
    }

    // Check if user has any transactions
    static async hasTransactions(userId: string): Promise<boolean> {
        try {
            // Check in logs first (faster query)
            const logsQuery = query(
                collection(this.db, 'logs'),
                where('userId', '==', userId)
            );

            const logsSnapshot = await getDocs(logsQuery);
            return !logsSnapshot.empty;

        } catch (error: any) {
            // If error, assume user has transactions to be safe
            console.error('Error checking user transactions:', error);
            return true;
        }
    }

    // Assign user to shop
    static async assignUserToShop(userId: string, shopId: string): Promise<void> {
        try {
            this.validateRequired({ userId, shopId }, ['userId', 'shopId']);

            // Verify shop exists
            const shopExists = await this.documentExists('shops', shopId);
            if (!shopExists) {
                throw new Error('Shop not found');
            }

            await updateDoc(doc(this.db, 'users', userId), { shopId });

        } catch (error: any) {
            this.handleError(error, 'assignUserToShop');
        }
    }

    // Get user by ID
    static async getUserById(userId: string): Promise<User | null> {
        return this.getDocumentById<User>('users', userId);
    }

    // Get users by shop
    static async getUsersByShop(shopId: string): Promise<User[]> {
        return this.getDocumentsByField<User>('users', 'shopId', shopId, 'name');
    }

    // Get all admin users
    static async getAdminUsers(): Promise<User[]> {
        return this.getDocumentsByField<User>('users', 'role', 'admin', 'name');
    }

    // Search users by name or email
    static async searchUsers(searchTerm: string, shopId?: string): Promise<User[]> {
        try {
            // Get all users (Firestore doesn't support text search natively)
            let users: User[];

            if (shopId) {
                users = await this.getUsersByShop(shopId);
            } else {
                const snapshot = await getDocs(collection(this.db, 'users'));
                users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            }

            // Filter by search term
            const searchLower = searchTerm.toLowerCase().trim();
            return users.filter(user =>
                user.name.toLowerCase().includes(searchLower) ||
                user.email.toLowerCase().includes(searchLower)
            );

        } catch (error: any) {
            this.handleError(error, 'searchUsers');
        }
    }

    // Validate user permissions for shop access
    static async canUserAccessShop(userId: string, shopId: string): Promise<boolean> {
        try {
            const user = await this.getUserById(userId);
            if (!user || !user.isActive) {
                return false;
            }

            // Admin can access all shops
            if (user.role === 'admin') {
                return true;
            }

            // Regular user can only access their assigned shop
            return user.shopId === shopId;

        } catch (error: any) {
            console.error('Error checking user shop access:', error);
            return false;
        }
    }
}