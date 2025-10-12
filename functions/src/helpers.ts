import * as admin from 'firebase-admin';

export interface NotificationData {
    userId: string;
    originatingUserId: string;
    shopId?: string;
    message: string;
    logType: string;
    metadata?: any;
}

export class NotificationHelper {
    static async createBulkNotifications(
        notifications: NotificationData[]
    ): Promise<void> {
        const db = admin.firestore();
        const batch = db.batch();
        const timestamp = admin.firestore.FieldValue.serverTimestamp();

        notifications.forEach(notification => {
            const notificationRef = db.collection('notifications').doc();
            batch.set(notificationRef, {
                ...notification,
                isRead: false,
                timestamp: timestamp
            });
        });

        await batch.commit();
    }

    static async getUnreadCount(userId: string): Promise<number> {
        const db = admin.firestore();
        const snapshot = await db.collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false)
            .get();

        return snapshot.size;
    }

    static formatMessage(
        template: string,
        variables: { [key: string]: any }
    ): string {
        let message = template;
        Object.keys(variables).forEach(key => {
            message = message.replace(`{${key}}`, variables[key]);
        });
        return message;
    }

    static async markNotificationsAsRead(
        userId: string,
        notificationIds?: string[]
    ): Promise<void> {
        const db = admin.firestore();
        const batch = db.batch();

        if (notificationIds && notificationIds.length > 0) {
            // Mark specific notifications as read
            notificationIds.forEach(id => {
                const notificationRef = db.collection('notifications').doc(id);
                batch.update(notificationRef, { isRead: true });
            });
        } else {
            // Mark all notifications for user as read
            const snapshot = await db.collection('notifications')
                .where('userId', '==', userId)
                .where('isRead', '==', false)
                .get();

            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { isRead: true });
            });
        }

        await batch.commit();
    }

    static async deleteOldNotifications(daysOld: number = 30): Promise<number> {
        const db = admin.firestore();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const snapshot = await db.collection('notifications')
            .where('timestamp', '<', cutoffDate)
            .where('isRead', '==', true)
            .limit(500)
            .get();

        if (snapshot.empty) {
            return 0;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        return snapshot.size;
    }

    /**
     * Send push notification to a single user
     */
    static async sendPushNotification(
        fcmToken: string,
        title: string,
        body: string,
        data?: { [key: string]: string }
    ): Promise<boolean> {
        try {
            await admin.messaging().send({
                token: fcmToken,
                notification: {
                    title,
                    body
                },
                data: data || {},
                webpush: {
                    fcmOptions: {
                        link: data?.url || '/notifications'
                    },
                    notification: {
                        icon: '/logo.png',
                        badge: '/logo.png',
                        requireInteraction: true,
                        dir: 'ltr' as 'ltr',  // English LTR direction
                        lang: 'en'  // English language
                    }
                }
            });

            console.log(`✅ Push notification sent successfully to token: ${fcmToken.substring(0, 20)}...`);
            return true;
        } catch (error: any) {
            console.error(`❌ Error sending push notification:`, error);

            // If token is invalid, we should clean it up
            if (error.code === 'messaging/invalid-registration-token' ||
                error.code === 'messaging/registration-token-not-registered') {
                console.log('⚠️ Invalid FCM token, should be removed from user document');
            }

            return false;
        }
    }

    /**
     * Send push notifications to multiple users
     */
    static async sendBulkPushNotifications(
        tokens: string[],
        title: string,
        body: string,
        data?: { [key: string]: string }
    ): Promise<{ successCount: number; failureCount: number }> {
        if (tokens.length === 0) {
            return { successCount: 0, failureCount: 0 };
        }

        try {
            const message = {
                notification: {
                    title,
                    body
                },
                data: data || {},
                webpush: {
                    fcmOptions: {
                        link: data?.url || '/notifications'
                    },
                    notification: {
                        icon: '/logo.png',
                        badge: '/logo.png',
                        requireInteraction: true,
                        dir: 'ltr' as 'ltr',  // English LTR direction
                        lang: 'en'  // English language
                    }
                }
            };

            const response = await admin.messaging().sendEachForMulticast({
                tokens,
                ...message
            });

            console.log(`✅ Bulk push: ${response.successCount} sent, ${response.failureCount} failed`);

            // Log any failed tokens
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`Failed to send to token ${tokens[idx].substring(0, 20)}...:`, resp.error);
                    }
                });
            }

            return {
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error: any) {
            console.error('❌ Error sending bulk push notifications:', error);
            return { successCount: 0, failureCount: tokens.length };
        }
    }

    /**
     * Send push notification to admins with FCM tokens
     */
    static async sendPushToAdmins(
        title: string,
        body: string,
        data?: { [key: string]: string }
    ): Promise<void> {
        const db = admin.firestore();

        try {
            // Get all active admins with FCM tokens
            const adminsSnapshot = await db.collection('users')
                .where('role', '==', 'admin')
                .where('isActive', '==', true)
                .get();

            const tokens: string[] = [];

            adminsSnapshot.docs.forEach(doc => {
                const user = doc.data();
                if (user.fcmToken) {
                    tokens.push(user.fcmToken);
                }
            });

            if (tokens.length === 0) {
                console.log('⚠️ No admin users with FCM tokens found');
                return;
            }

            console.log(`📤 Sending push notification to ${tokens.length} admin(s)`);

            await this.sendBulkPushNotifications(tokens, title, body, data);
        } catch (error: any) {
            console.error('❌ Error sending push to admins:', error);
        }
    }
}