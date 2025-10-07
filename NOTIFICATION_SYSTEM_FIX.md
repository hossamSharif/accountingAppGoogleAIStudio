# Notification System Fix for Shop User Permissions

## Problem
Shop users were getting "Missing or insufficient permissions" errors when adding transactions because the notification service was trying to query all admin users, which shop users don't have permission to do.

## Root Cause
1. When a shop user creates a transaction, `LoggingService.logAction()` is called
2. This triggers `NotificationService.notifyAdminsOfUserAction()`
3. That method tries to query all users with role='admin'
4. Firestore rules only allow users to read their own user document or if they're admin
5. Shop users can't query other users, causing the permission error

## Temporary Fix Applied
Modified `notificationService.ts` to:
1. Skip admin notification queries for non-admin users
2. Log actions to console instead
3. Prevent permission errors from blocking transaction creation

## Proper Solution for Production

### Option 1: Cloud Functions (Recommended)
Create a Cloud Function that triggers on transaction creation:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.notifyAdminsOnTransaction = functions.firestore
    .document('transactions/{transactionId}')
    .onCreate(async (snap, context) => {
        const transaction = snap.data();
        const db = admin.firestore();

        // Get the user who created the transaction
        const userDoc = await db.collection('users').doc(transaction.userId).get();
        const user = userDoc.data();

        // Skip if admin user
        if (user.role === 'admin') return;

        // Get all admin users
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .where('isActive', '==', true)
            .get();

        // Create notifications for all admins
        const batch = db.batch();
        adminsSnapshot.docs.forEach(adminDoc => {
            const notificationRef = db.collection('notifications').doc();
            batch.set(notificationRef, {
                userId: adminDoc.id,
                originatingUserId: transaction.userId,
                shopId: transaction.shopId,
                message: `المستخدم "${user.name}" أضاف معاملة جديدة`,
                logType: 'USER_ACTION',
                isRead: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
    });

exports.notifyAdminsOnLog = functions.firestore
    .document('logs/{logId}')
    .onCreate(async (snap, context) => {
        const log = snap.data();
        const db = admin.firestore();

        // Only notify for important events
        if (!isImportantEvent(log.type)) return;

        // Get all admin users
        const adminsSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .where('isActive', '==', true)
            .get();

        // Create notifications
        const batch = db.batch();
        adminsSnapshot.docs.forEach(adminDoc => {
            const notificationRef = db.collection('notifications').doc();
            batch.set(notificationRef, {
                userId: adminDoc.id,
                originatingUserId: log.userId || 'system',
                shopId: log.shopId,
                message: log.message,
                logType: log.type,
                isRead: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
    });

function isImportantEvent(logType) {
    const importantTypes = [
        'SHOP_CREATED', 'SHOP_DELETED', 'USER_CREATED',
        'USER_DEACTIVATED', 'ERROR', 'SECURITY_ALERT'
    ];
    return importantTypes.includes(logType);
}
```

### Option 2: Admin Polling
Admins poll for new logs/transactions on their dashboard:

```typescript
// In admin dashboard component
useEffect(() => {
    if (currentUser?.role !== 'admin') return;

    const checkForNewActivity = async () => {
        // Query recent logs
        const recentLogs = await LoggingService.getLogs({
            limit: 10,
            startDate: lastChecked
        });

        // Create notifications for new activity
        recentLogs.logs.forEach(log => {
            if (log.userId !== 'system' && log.userId !== currentUser.id) {
                // Display notification in UI
                showNotification(log);
            }
        });
    };

    // Poll every 30 seconds
    const interval = setInterval(checkForNewActivity, 30000);
    return () => clearInterval(interval);
}, [currentUser, lastChecked]);
```

### Option 3: Notification Queue Collection
Create a separate collection that doesn't require admin privileges:

```typescript
// When shop user creates transaction
await addDoc(collection(db, 'notificationQueue'), {
    type: 'ADMIN_NOTIFICATION',
    originatingUserId: currentUser.id,
    shopId: currentUser.shopId,
    message: `User action: ${action}`,
    timestamp: serverTimestamp(),
    processed: false
});

// Admin dashboard processes queue
const processNotificationQueue = async () => {
    const queueSnapshot = await getDocs(
        query(
            collection(db, 'notificationQueue'),
            where('processed', '==', false),
            where('type', '==', 'ADMIN_NOTIFICATION')
        )
    );

    // Create actual notifications for admin
    const batch = writeBatch(db);
    queueSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const notificationRef = doc(collection(db, 'notifications'));
        batch.set(notificationRef, {
            userId: currentUser.id, // admin's ID
            ...data,
            isRead: false
        });
        batch.update(doc.ref, { processed: true });
    });

    await batch.commit();
};
```

## Deployment Steps

1. **Deploy Cloud Functions** (if using Option 1):
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

2. **Update Firestore Rules** to allow Cloud Functions access:
   ```
   // Add to firestore.rules
   match /notifications/{notificationId} {
     allow create: if request.auth != null ||
                      request.auth.token.admin == true; // For Cloud Functions
   }
   ```

3. **Test with different user roles**:
   - Admin user: Should work normally
   - Shop user: Should create transactions without errors
   - Notifications should appear for admins

## Testing Checklist
- [ ] Shop user can create transactions without permission errors
- [ ] Admin users still receive notifications (once Cloud Functions deployed)
- [ ] Logs are created successfully
- [ ] No console errors about permissions
- [ ] Transaction creation performance is not impacted