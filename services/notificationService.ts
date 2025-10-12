import {
    addDoc,
    collection,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    writeBatch,
    Timestamp,
    orderBy,
    limit
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { User, LogType, Notification } from '../types';
import { translate } from '../utils/translate';

export interface CreateNotificationData {
    userId: string;
    originatingUserId: string;
    shopId?: string;
    message?: string;  // Deprecated - kept for backwards compatibility
    messageKey?: string;  // NEW: Translation key
    messageParams?: Record<string, any>;  // NEW: Parameters for translation
    logType: LogType;
}

export interface NotificationFilters {
    userId?: string;
    shopId?: string;
    logType?: LogType;
    isRead?: boolean;
    limit?: number;
}

export class NotificationService extends BaseService {
    // Create notification
    static async createNotification(notificationData: CreateNotificationData): Promise<void> {
        try {
            this.validateRequired(notificationData, ['userId', 'originatingUserId', 'logType']);

            // Generate bilingual messages
            let messageAr = '';
            let messageEn = '';

            if (notificationData.messageKey) {
                // Use translation keys
                messageAr = translate(notificationData.messageKey, 'ar', notificationData.messageParams);
                messageEn = translate(notificationData.messageKey, 'en', notificationData.messageParams);
            } else if (notificationData.message) {
                // Fallback to old message field
                messageAr = notificationData.message;
                messageEn = notificationData.message;
            } else {
                throw new Error('Either messageKey or message is required');
            }

            const newNotification: Omit<Notification, 'id'> = {
                userId: notificationData.userId,
                originatingUserId: notificationData.originatingUserId,
                shopId: notificationData.shopId,
                message: messageAr,  // Keep for backwards compatibility
                messageKey: notificationData.messageKey,
                messageParams: notificationData.messageParams,
                messageAr: this.sanitizeString(messageAr),
                messageEn: this.sanitizeString(messageEn),
                logType: notificationData.logType,
                isRead: false,
                timestamp: Timestamp.now().toDate().toISOString()
            };

            await addDoc(collection(this.db, 'notifications'), newNotification);

        } catch (error: any) {
            this.handleError(error, 'createNotification');
        }
    }

    // Create multiple notifications (batch operation)
    static async createBulkNotifications(notifications: CreateNotificationData[]): Promise<void> {
        try {
            if (notifications.length === 0) return;

            const batch = writeBatch(this.db);
            const timestamp = Timestamp.now().toDate().toISOString();

            notifications.forEach(notificationData => {
                this.validateRequired(notificationData, ['userId', 'originatingUserId', 'logType']);

                // Generate bilingual messages
                let messageAr = '';
                let messageEn = '';

                if (notificationData.messageKey) {
                    messageAr = translate(notificationData.messageKey, 'ar', notificationData.messageParams);
                    messageEn = translate(notificationData.messageKey, 'en', notificationData.messageParams);
                } else if (notificationData.message) {
                    messageAr = notificationData.message;
                    messageEn = notificationData.message;
                } else {
                    throw new Error('Either messageKey or message is required');
                }

                const notificationRef = doc(collection(this.db, 'notifications'));
                const newNotification: Omit<Notification, 'id'> = {
                    userId: notificationData.userId,
                    originatingUserId: notificationData.originatingUserId,
                    shopId: notificationData.shopId,
                    message: messageAr,  // Keep for backwards compatibility
                    messageKey: notificationData.messageKey,
                    messageParams: notificationData.messageParams,
                    messageAr: this.sanitizeString(messageAr),
                    messageEn: this.sanitizeString(messageEn),
                    logType: notificationData.logType,
                    isRead: false,
                    timestamp
                };

                batch.set(notificationRef, newNotification);
            });

            await batch.commit();

        } catch (error: any) {
            this.handleError(error, 'createBulkNotifications');
        }
    }

    // Mark notifications as read
    static async markAsRead(notificationIds: string[]): Promise<void> {
        try {
            if (notificationIds.length === 0) return;

            const batch = writeBatch(this.db);
            notificationIds.forEach(id => {
                batch.update(doc(this.db, 'notifications', id), { isRead: true });
            });
            await batch.commit();

        } catch (error: any) {
            this.handleError(error, 'markAsRead');
        }
    }

    // Mark all notifications as read for a user
    static async markAllAsReadForUser(userId: string): Promise<void> {
        try {
            this.validateRequired({ userId }, ['userId']);

            const q = query(
                collection(this.db, 'notifications'),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) return;

            const batch = writeBatch(this.db);
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { isRead: true });
            });
            await batch.commit();

        } catch (error: any) {
            this.handleError(error, 'markAllAsReadForUser');
        }
    }

    // Delete notification
    static async deleteNotification(notificationId: string): Promise<void> {
        try {
            this.validateRequired({ notificationId }, ['notificationId']);
            await deleteDoc(doc(this.db, 'notifications', notificationId));

        } catch (error: any) {
            this.handleError(error, 'deleteNotification');
        }
    }

    // Delete multiple notifications
    static async deleteNotifications(notificationIds: string[]): Promise<void> {
        try {
            if (notificationIds.length === 0) return;

            const batch = writeBatch(this.db);
            notificationIds.forEach(id => {
                batch.delete(doc(this.db, 'notifications', id));
            });
            await batch.commit();

        } catch (error: any) {
            this.handleError(error, 'deleteNotifications');
        }
    }

    // Get notifications with filtering
    static async getNotifications(filters: NotificationFilters): Promise<Notification[]> {
        try {
            let q = collection(this.db, 'notifications');

            // Apply filters
            const constraints: any[] = [];

            if (filters.userId) {
                constraints.push(where('userId', '==', filters.userId));
            }

            if (filters.shopId) {
                constraints.push(where('shopId', '==', filters.shopId));
            }

            if (filters.logType) {
                constraints.push(where('logType', '==', filters.logType));
            }

            if (filters.isRead !== undefined) {
                constraints.push(where('isRead', '==', filters.isRead));
            }

            // Add ordering and limit
            constraints.push(orderBy('timestamp', 'desc'));

            if (filters.limit) {
                constraints.push(limit(filters.limit));
            }

            const queryWithConstraints = query(q, ...constraints);
            const snapshot = await getDocs(queryWithConstraints);

            return snapshot.docs.map(doc => {
                const docData = doc.data();
                // Convert Firestore Timestamp to ISO string if needed
                const timestamp = docData.timestamp?.toDate ? docData.timestamp.toDate().toISOString() : docData.timestamp;
                return {
                    id: doc.id,
                    ...docData,
                    timestamp: timestamp || new Date().toISOString() // Fallback to current date if timestamp is missing
                } as Notification;
            });

        } catch (error: any) {
            console.error('Error getting notifications:', error);
            return [];
        }
    }

    // Get unread count for user
    static async getUnreadCount(userId: string): Promise<number> {
        try {
            this.validateRequired({ userId }, ['userId']);

            const q = query(
                collection(this.db, 'notifications'),
                where('userId', '==', userId),
                where('isRead', '==', false)
            );

            const snapshot = await getDocs(q);
            return snapshot.size;

        } catch (error: any) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    // Auto-create notifications for user actions
    static async notifyAdminsOfUserAction(
        actionUser: User,
        action: string,
        shopId?: string
    ): Promise<void> {
        try {
            // Skip notification for admin users or if the user is not a shop user
            if (actionUser.role === 'admin') {
                return;
            }

            // For shop users, we can't query all admins due to permission restrictions
            // Instead, we'll create a server-side function or use a different approach
            // For now, we'll skip this to prevent permission errors
            console.log(`User action logged: ${actionUser.name} - ${action}`);

            // In production, this should be handled by:
            // 1. Cloud Functions that have admin SDK access
            // 2. Or a notification collection that admins query themselves
            // 3. Or store pending notifications that admins fetch on login

        } catch (error: any) {
            console.error('Error notifying admins:', error);
            // Don't throw error as this is not critical functionality
        }
    }

    // Notify admins of important system events
    static async notifyAdminsOfSystemEvent(
        message: string,
        logType: LogType,
        shopId?: string
    ): Promise<void> {
        try {
            // For system events, we also need admin privileges to query all admins
            // This should be handled by server-side functions
            console.log(`System event logged: ${message}`);

            // In production, this should be handled by:
            // 1. Cloud Functions that have admin SDK access
            // 2. Or a system notification collection that admins query themselves

        } catch (error: any) {
            console.error('Error notifying admins of system event:', error);
            // Don't throw error as this is not critical functionality
        }
    }

    // Notify specific user
    static async notifyUser(
        userId: string,
        messageKeyOrText: string,
        logType: LogType,
        originatingUserId: string = 'system',
        shopId?: string,
        messageParams?: Record<string, any>
    ): Promise<void> {
        try {
            // Check if it's a translation key (contains dot notation) or plain text
            const isTranslationKey = messageKeyOrText.includes('.');

            await this.createNotification({
                userId,
                originatingUserId,
                shopId,
                ...(isTranslationKey
                    ? { messageKey: messageKeyOrText, messageParams }
                    : { message: this.sanitizeString(messageKeyOrText) }
                ),
                logType
            });

        } catch (error: any) {
            console.error('Error notifying user:', error);
            // Don't throw error as this is not critical functionality
        }
    }

    // Clean up old notifications (older than specified days)
    static async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const cutoffTimestamp = cutoffDate.toISOString();

            // Get notifications older than cutoff
            const q = query(
                collection(this.db, 'notifications'),
                where('timestamp', '<', cutoffTimestamp)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) return 0;

            // Delete in batches
            const batchSize = 500;
            let deletedCount = 0;

            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                const batch = writeBatch(this.db);
                const batchDocs = snapshot.docs.slice(i, i + batchSize);

                batchDocs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                deletedCount += batchDocs.length;
            }

            return deletedCount;

        } catch (error: any) {
            console.error('Error cleaning up old notifications:', error);
            return 0;
        }
    }

    // Clean up read notifications for a user (keep only unread)
    static async cleanupReadNotifications(userId: string): Promise<number> {
        try {
            this.validateRequired({ userId }, ['userId']);

            const q = query(
                collection(this.db, 'notifications'),
                where('userId', '==', userId),
                where('isRead', '==', true)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) return 0;

            // Delete in batches
            const batchSize = 500;
            let deletedCount = 0;

            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                const batch = writeBatch(this.db);
                const batchDocs = snapshot.docs.slice(i, i + batchSize);

                batchDocs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                deletedCount += batchDocs.length;
            }

            return deletedCount;

        } catch (error: any) {
            console.error('Error cleaning up read notifications:', error);
            return 0;
        }
    }

    // Get notification statistics
    static async getNotificationStats(userId: string): Promise<{
        total: number;
        unread: number;
        byType: { [key in LogType]?: number };
    }> {
        try {
            this.validateRequired({ userId }, ['userId']);

            const q = query(
                collection(this.db, 'notifications'),
                where('userId', '==', userId)
            );

            const snapshot = await getDocs(q);
            const notifications = snapshot.docs.map(doc => doc.data() as Notification);

            const stats = {
                total: notifications.length,
                unread: notifications.filter(n => !n.isRead).length,
                byType: {} as { [key in LogType]?: number }
            };

            // Count by type
            notifications.forEach(notification => {
                const type = notification.logType;
                stats.byType[type] = (stats.byType[type] || 0) + 1;
            });

            return stats;

        } catch (error: any) {
            console.error('Error getting notification stats:', error);
            return { total: 0, unread: 0, byType: {} };
        }
    }

    // Get admin users helper
    // NOTE: This requires admin privileges and won't work for shop users
    // Should be handled by server-side functions in production
    // private static async getAdminUsers(): Promise<User[]> {
    //     return this.getDocumentsByField<User>('users', 'role', 'admin', 'name');
    // }
}