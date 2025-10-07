import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { NotificationHelper } from './helpers';

// Initialize Admin SDK
admin.initializeApp();

const db = admin.firestore();

// Types (match your existing types)
enum LogType {
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    USER_ACTION = 'USER_ACTION',
    ADD_ENTRY = 'ADD_ENTRY',
    EDIT_ENTRY = 'EDIT_ENTRY',
    DELETE_ENTRY = 'DELETE_ENTRY',
    SHOP_CREATED = 'SHOP_CREATED',
    SHOP_UPDATED = 'SHOP_UPDATED',
    SHOP_DELETED = 'SHOP_DELETED',
    SHOP_ACTIVATED = 'SHOP_ACTIVATED',
    SHOP_DEACTIVATED = 'SHOP_DEACTIVATED',
    USER_CREATED = 'USER_CREATED',
    USER_UPDATED = 'USER_UPDATED',
    USER_DEACTIVATED = 'USER_DEACTIVATED',
    ERROR = 'ERROR',
    SECURITY_ALERT = 'SECURITY_ALERT'
}

interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    shopId?: string;
    isActive: boolean;
}

interface Notification {
    userId: string;
    originatingUserId: string;
    shopId?: string;
    message: string;
    logType: LogType;
    isRead: boolean;
    timestamp: any;
}

// Helper Functions
const isImportantEvent = (logType: LogType): boolean => {
    const importantTypes = [
        LogType.SHOP_CREATED,
        LogType.SHOP_DELETED,
        LogType.SHOP_DEACTIVATED,
        LogType.USER_CREATED,
        LogType.USER_DEACTIVATED,
        LogType.ERROR,
        LogType.SECURITY_ALERT
    ];
    return importantTypes.includes(logType);
};

const getActiveAdmins = async (): Promise<admin.firestore.QuerySnapshot> => {
    return await db.collection('users')
        .where('role', '==', 'admin')
        .where('isActive', '==', true)
        .get();
};

const getLogTypeTitle = (logType: LogType): string => {
    const titles: { [key in LogType]: string } = {
        [LogType.LOGIN]: 'تسجيل دخول',
        [LogType.LOGOUT]: 'تسجيل خروج',
        [LogType.USER_ACTION]: 'إجراء مستخدم',
        [LogType.ADD_ENTRY]: 'إضافة قيد',
        [LogType.EDIT_ENTRY]: 'تعديل قيد',
        [LogType.DELETE_ENTRY]: 'حذف قيد',
        [LogType.SHOP_CREATED]: 'متجر جديد',
        [LogType.SHOP_UPDATED]: 'تحديث متجر',
        [LogType.SHOP_DELETED]: 'حذف متجر',
        [LogType.SHOP_ACTIVATED]: 'تفعيل متجر',
        [LogType.SHOP_DEACTIVATED]: 'إيقاف متجر',
        [LogType.USER_CREATED]: 'مستخدم جديد',
        [LogType.USER_UPDATED]: 'تحديث مستخدم',
        [LogType.USER_DEACTIVATED]: 'إيقاف مستخدم',
        [LogType.ERROR]: 'خطأ',
        [LogType.SECURITY_ALERT]: 'تنبيه أمني'
    };
    return titles[logType] || 'إشعار';
};

// Function 1: Notify admins when a transaction is created
export const onTransactionCreated = functions
    .region('us-central1') // Choose your region
    .firestore
    .document('transactions/{transactionId}')
    .onCreate(async (snapshot, context) => {
        try {
            const transaction = snapshot.data();
            const { transactionId } = context.params;

            console.log('Transaction created:', transactionId, 'shopId:', transaction.shopId);

            // Get the shop to find the owner
            if (!transaction.shopId) {
                console.log('Transaction has no shopId, skipping notification');
                return null;
            }

            const shopDoc = await db.collection('shops').doc(transaction.shopId).get();

            if (!shopDoc.exists) {
                console.error(`Shop ${transaction.shopId} not found`);
                return null;
            }

            const shop = shopDoc.data();
            const shopName = shop?.name || 'Unknown Shop';
            console.log('Shop found:', shopName);

            // Get the shop user (user with this shopId)
            const usersSnapshot = await db.collection('users')
                .where('shopId', '==', transaction.shopId)
                .where('role', '==', 'user')
                .limit(1)
                .get();

            if (usersSnapshot.empty) {
                console.log('No user found for this shop, skipping notification');
                return null;
            }

            const userDoc = usersSnapshot.docs[0];
            const user = userDoc.data() as User;
            console.log('Shop user found:', user.name);

            // Skip if admin user (they don't need notifications about their own actions)
            if (user.role === 'admin') {
                console.log('Skipping notification for admin user action');
                return null;
            }

            // Get all active admin users
            const adminsSnapshot = await getActiveAdmins();

            if (adminsSnapshot.empty) {
                console.log('No active admins found');
                return null;
            }

            console.log(`Found ${adminsSnapshot.size} admins to notify`);

            // Create notifications batch
            const batch = db.batch();
            const timestamp = admin.firestore.FieldValue.serverTimestamp();

            adminsSnapshot.docs.forEach(adminDoc => {
                const notificationRef = db.collection('notifications').doc();
                const notification: Notification = {
                    userId: adminDoc.id,
                    originatingUserId: userDoc.id,
                    shopId: transaction.shopId,
                    message: `المستخدم "${user.name}" أضاف معاملة جديدة من متجر "${shopName}" بقيمة ${transaction.totalAmount} ج.س`,
                    logType: LogType.ADD_ENTRY,
                    isRead: false,
                    timestamp: timestamp
                };
                batch.set(notificationRef, notification);
            });

            // Commit all notifications at once
            await batch.commit();
            console.log(`Created ${adminsSnapshot.size} notifications for transaction ${transactionId}`);

            // Send push notifications to admins
            const pushTitle = 'معاملة جديدة';
            const pushBody = `${user.name} أضاف معاملة من متجر ${shopName} بقيمة ${transaction.totalAmount} ج.س`;
            const pushData = {
                url: '/notifications',
                notificationId: transactionId,
                shopId: transaction.shopId,
                logType: LogType.ADD_ENTRY
            };

            await NotificationHelper.sendPushToAdmins(pushTitle, pushBody, pushData);

            return null;
        } catch (error) {
            console.error('Error in onTransactionCreated:', error);
            return null;
        }
    });

// Function 2: Notify admins when a log entry is created
export const onLogCreated = functions
    .region('us-central1')
    .firestore
    .document('logs/{logId}')
    .onCreate(async (snapshot, context) => {
        try {
            const log = snapshot.data();
            const { logId } = context.params;

            // Only process important events
            if (!isImportantEvent(log.type)) {
                console.log(`Skipping non-important log type: ${log.type}`);
                return null;
            }

            // Skip if this is a system-generated log from an admin
            if (log.userId === 'system' || log.userId === 'admin') {
                // For system events, still notify admins
                if (log.userId !== 'system') {
                    return null;
                }
            }

            // Get user information if not a system log
            let userName = 'النظام';
            if (log.userId !== 'system') {
                const userDoc = await db.collection('users').doc(log.userId).get();
                if (userDoc.exists) {
                    const user = userDoc.data() as User;
                    userName = user.name;

                    // Skip if admin user
                    if (user.role === 'admin') {
                        console.log('Skipping notification for admin user log');
                        return null;
                    }
                }
            }

            // Get all active admin users
            const adminsSnapshot = await getActiveAdmins();

            if (adminsSnapshot.empty) {
                console.log('No active admins found');
                return null;
            }

            // Create notifications batch
            const batch = db.batch();
            const timestamp = admin.firestore.FieldValue.serverTimestamp();

            adminsSnapshot.docs.forEach(adminDoc => {
                const notificationRef = db.collection('notifications').doc();
                const notification: Notification = {
                    userId: adminDoc.id,
                    originatingUserId: log.userId,
                    shopId: log.shopId,
                    message: log.message || `${userName}: ${log.type}`,
                    logType: log.type,
                    isRead: false,
                    timestamp: timestamp
                };
                batch.set(notificationRef, notification);
            });

            // Commit all notifications at once
            await batch.commit();
            console.log(`Created ${adminsSnapshot.size} notifications for log ${logId}`);

            // Send push notifications to admins
            const pushTitle = getLogTypeTitle(log.type);
            const pushBody = log.message || `${userName}: ${log.type}`;
            const pushData = {
                url: '/notifications',
                notificationId: logId,
                shopId: log.shopId || '',
                logType: log.type
            };

            await NotificationHelper.sendPushToAdmins(pushTitle, pushBody, pushData);

            return null;
        } catch (error) {
            console.error('Error in onLogCreated:', error);
            return null;
        }
    });

// Function 3: Clean up old notifications (scheduled function - runs daily)
export const cleanupOldNotifications = functions
    .region('us-central1')
    .pubsub
    .schedule('every 24 hours')
    .timeZone('Asia/Riyadh') // Set your timezone
    .onRun(async (context) => {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Query old read notifications
            const oldNotifications = await db.collection('notifications')
                .where('isRead', '==', true)
                .where('timestamp', '<', thirtyDaysAgo)
                .limit(500) // Process in batches to avoid timeout
                .get();

            if (oldNotifications.empty) {
                console.log('No old notifications to clean up');
                return null;
            }

            // Delete in batches
            const batch = db.batch();
            oldNotifications.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`Deleted ${oldNotifications.size} old notifications`);

            return null;
        } catch (error) {
            console.error('Error in cleanupOldNotifications:', error);
            return null;
        }
    });

// Function 4: Process notification queue for batch operations
export const processPendingNotifications = functions
    .region('us-central1')
    .firestore
    .document('notificationQueue/{queueId}')
    .onCreate(async (snapshot, context) => {
        try {
            const queueItem = snapshot.data();
            const { queueId } = context.params;

            // Get all active admin users
            const adminsSnapshot = await getActiveAdmins();

            if (adminsSnapshot.empty) {
                console.log('No active admins found');
                // Mark as processed anyway to avoid reprocessing
                await snapshot.ref.update({ processed: true });
                return null;
            }

            // Create notifications batch
            const batch = db.batch();
            const timestamp = admin.firestore.FieldValue.serverTimestamp();

            adminsSnapshot.docs.forEach(adminDoc => {
                const notificationRef = db.collection('notifications').doc();
                const notification: Notification = {
                    userId: adminDoc.id,
                    originatingUserId: queueItem.originatingUserId,
                    shopId: queueItem.shopId,
                    message: queueItem.message,
                    logType: queueItem.logType,
                    isRead: false,
                    timestamp: timestamp
                };
                batch.set(notificationRef, notification);
            });

            // Mark queue item as processed
            batch.update(snapshot.ref, {
                processed: true,
                processedAt: timestamp
            });

            // Commit all operations
            await batch.commit();
            console.log(`Processed queue item ${queueId}, created ${adminsSnapshot.size} notifications`);

            return null;
        } catch (error) {
            console.error('Error in processPendingNotifications:', error);
            // Don't mark as processed on error, will retry
            return null;
        }
    });