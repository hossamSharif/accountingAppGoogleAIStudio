import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { NotificationHelper } from './helpers';
import { CURRENCY_SYMBOL_AR, pushNotificationTemplates } from './config';
import { EmailService } from './emailService';

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

// English titles for push notifications
const getLogTypeTitleEnglish = (logType: LogType): string => {
    const titles: { [key in LogType]: string } = {
        [LogType.LOGIN]: 'Login',
        [LogType.LOGOUT]: 'Logout',
        [LogType.USER_ACTION]: 'User Action',
        [LogType.ADD_ENTRY]: 'New Entry',
        [LogType.EDIT_ENTRY]: 'Entry Updated',
        [LogType.DELETE_ENTRY]: 'Entry Deleted',
        [LogType.SHOP_CREATED]: 'New Shop',
        [LogType.SHOP_UPDATED]: 'Shop Updated',
        [LogType.SHOP_DELETED]: 'Shop Deleted',
        [LogType.SHOP_ACTIVATED]: 'Shop Activated',
        [LogType.SHOP_DEACTIVATED]: 'Shop Deactivated',
        [LogType.USER_CREATED]: 'New User',
        [LogType.USER_UPDATED]: 'User Updated',
        [LogType.USER_DEACTIVATED]: 'User Deactivated',
        [LogType.ERROR]: 'Error',
        [LogType.SECURITY_ALERT]: 'Security Alert'
    };
    return titles[logType] || 'Notification';
};

// Helper to format template
const formatTemplate = (template: string, variables: { [key: string]: any }): string => {
    let formatted = template;
    Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{${key}}`, 'g');
        formatted = formatted.replace(regex, variables[key] || '');
    });
    return formatted;
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
                    message: `المستخدم "${user.name}" أضاف معاملة جديدة من متجر "${shopName}" بقيمة ${transaction.totalAmount} ${CURRENCY_SYMBOL_AR}`,
                    logType: LogType.ADD_ENTRY,
                    isRead: false,
                    timestamp: timestamp
                };
                batch.set(notificationRef, notification);
            });

            // Commit all notifications at once
            await batch.commit();
            console.log(`Created ${adminsSnapshot.size} notifications for transaction ${transactionId}`);

            // Send push notifications to admins (English)
            const pushTitle = pushNotificationTemplates.transaction.created.title;
            const pushBody = formatTemplate(pushNotificationTemplates.transaction.created.body, {
                userName: user.name,
                transactionType: transaction.type,
                amount: transaction.totalAmount,
                shopName
            });
            const pushData = {
                url: '/notifications',
                notificationId: transactionId,
                shopId: transaction.shopId,
                logType: LogType.ADD_ENTRY
            };

            await NotificationHelper.sendPushToAdmins(pushTitle, pushBody, pushData);

            // Send email notification to admins
            await EmailService.sendTransactionEmail('created', {
                userName: user.name,
                shopName,
                transactionType: transaction.type,
                amount: transaction.totalAmount,
                description: transaction.description || 'No description',
                date: new Date(transaction.date).toLocaleString('en-US', {
                    timeZone: 'Africa/Khartoum',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            });

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

            // Send push notifications to admins (English)
            const pushTitle = getLogTypeTitleEnglish(log.type);
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

// Function 5: Sync email updates from Firestore to Firebase Authentication
export const onUserEmailUpdate = functions
    .region('us-central1')
    .firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        try {
            const { userId } = context.params;
            const beforeData = change.before.data();
            const afterData = change.after.data();

            // Check if email was changed
            if (beforeData.email === afterData.email) {
                console.log('Email not changed, skipping auth update');
                return null;
            }

            const oldEmail = beforeData.email;
            const newEmail = afterData.email;

            console.log(`📧 Email changed for user ${userId}: ${oldEmail} → ${newEmail}`);

            // Update Firebase Authentication email
            try {
                await admin.auth().updateUser(userId, {
                    email: newEmail
                });

                console.log(`✅ Successfully updated Firebase Auth email for user ${userId}`);

                // Send notification email to the user about the email change
                await EmailService.sendEmail({
                    to: [newEmail, oldEmail], // Send to both old and new email
                    subject: 'Email Address Updated - Vavidia Accounting System',
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #2c3e50;">Email Address Updated ✅</h1>
                            <p style="color: #34495e; font-size: 16px;">
                                Your email address has been successfully updated in the Vavidia Accounting System.
                            </p>
                            <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <p style="color: #34495e; margin: 5px 0;">
                                    <strong>Previous Email:</strong> ${oldEmail}
                                </p>
                                <p style="color: #34495e; margin: 5px 0;">
                                    <strong>New Email:</strong> ${newEmail}
                                </p>
                                <p style="color: #34495e; margin: 5px 0;">
                                    <strong>Date:</strong> ${new Date().toLocaleString('en-US', {
                                        timeZone: 'Africa/Khartoum',
                                        dateStyle: 'full',
                                        timeStyle: 'long'
                                    })}
                                </p>
                            </div>
                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                                <p style="color: #856404; margin: 0;">
                                    <strong>⚠️ Security Notice:</strong> If you did not make this change, please contact your administrator immediately.
                                </p>
                            </div>
                            <hr style="border: 1px solid #ecf0f1; margin: 20px 0;">
                            <p style="color: #95a5a6; font-size: 12px; text-align: center;">
                                Vavidia Accounting System - Email Notifications
                            </p>
                        </div>
                    `,
                    text: `Email Address Updated\n\nYour email address has been successfully updated.\n\nPrevious Email: ${oldEmail}\nNew Email: ${newEmail}\n\nIf you did not make this change, please contact your administrator immediately.`
                });

                // Notify admins if this is a regular user
                if (afterData.role !== 'admin') {
                    await NotificationHelper.sendPushToAdmins(
                        'User Email Updated',
                        `User "${afterData.name}" changed their email from ${oldEmail} to ${newEmail}`,
                        {
                            url: '/settings',
                            userId: userId,
                            logType: LogType.USER_UPDATED
                        }
                    );
                }

                return null;
            } catch (authError: any) {
                console.error('❌ Failed to update Firebase Auth email:', authError);

                // If the email is already in use, revert the Firestore change
                if (authError.code === 'auth/email-already-exists') {
                    await change.after.ref.update({
                        email: oldEmail
                    });
                    console.log('⚠️ Email already in use, reverted Firestore change');
                }

                throw authError;
            }
        } catch (error) {
            console.error('Error in onUserEmailUpdate:', error);
            return null;
        }
    });

// Test Email Function (for verifying email setup)
export const testEmail = functions
    .region('us-central1')
    .https.onRequest(async (req, res) => {
        try {
            console.log('📧 Test email function triggered');

            // Get test email address from query parameter or use default
            const testEmailAddress = (req.query.email as string) || 'hossamsharif1990@gmail.com';

            await EmailService.sendEmail({
                to: [testEmailAddress],
                subject: 'Test Email - Vavidia Accounting System',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                        <h1 style="color: #2c3e50;">Test Email Successful! ✅</h1>
                        <p style="color: #34495e; font-size: 16px;">
                            This is a test email from the Vavidia Accounting System.
                        </p>
                        <div style="background-color: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #27ae60;">Email Configuration Working:</h3>
                            <ul style="color: #34495e;">
                                <li>Gmail SMTP connection successful</li>
                                <li>Nodemailer configured correctly</li>
                                <li>Firebase Functions can send emails</li>
                            </ul>
                        </div>
                        <p style="color: #7f8c8d; font-size: 14px;">
                            <strong>Test Time:</strong> ${new Date().toLocaleString('en-US', {
                                timeZone: 'Africa/Khartoum',
                                dateStyle: 'full',
                                timeStyle: 'long'
                            })}
                        </p>
                        <hr style="border: 1px solid #ecf0f1; margin: 20px 0;">
                        <p style="color: #95a5a6; font-size: 12px; text-align: center;">
                            Vavidia Accounting System - Email Notifications
                        </p>
                    </div>
                `,
                text: 'Test Email Successful! This is a test email from the Vavidia Accounting System. Email configuration is working correctly.'
            });

            res.status(200).send(`
                <html>
                <head><title>Email Test Result</title></head>
                <body style="font-family: Arial; padding: 20px;">
                    <h1>✅ Test Email Sent Successfully!</h1>
                    <p>Check the inbox of: <strong>${testEmailAddress}</strong></p>
                    <p>The email should arrive within a few seconds.</p>
                    <hr>
                    <p><small>You can test with a different email by adding ?email=youremail@example.com to the URL</small></p>
                </body>
                </html>
            `);
        } catch (error: any) {
            console.error('❌ Test email failed:', error);
            res.status(500).send(`
                <html>
                <head><title>Email Test Failed</title></head>
                <body style="font-family: Arial; padding: 20px;">
                    <h1>❌ Test Email Failed</h1>
                    <p style="color: red;"><strong>Error:</strong> ${error.message}</p>
                    <h3>Troubleshooting Steps:</h3>
                    <ol>
                        <li>Check Firebase Functions logs: <code>firebase functions:log</code></li>
                        <li>Verify SMTP credentials are set: <code>firebase functions:config:get</code></li>
                        <li>Ensure 2FA is enabled on Gmail account</li>
                        <li>Verify app password is correct (16 characters)</li>
                        <li>Check Gmail account hasn't blocked the login</li>
                    </ol>
                </body>
                </html>
            `);
        }
    });