# Complete Cloud Functions Implementation Guide for Notification System

## Table of Contents
1. [Understanding Cloud Functions](#understanding-cloud-functions)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Implementation](#implementation)
5. [Deployment](#deployment)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Cost Optimization](#cost-optimization)

## Understanding Cloud Functions

### What are Firebase Cloud Functions?
Firebase Cloud Functions are serverless functions that run in Google's cloud infrastructure. They execute backend code in response to events triggered by Firebase features and HTTPS requests.

### Why Use Cloud Functions for Notifications?
1. **Admin SDK Access**: Cloud Functions run with administrative privileges, bypassing Firestore security rules
2. **Event-Driven**: Automatically trigger when documents are created/updated/deleted
3. **Scalable**: Auto-scales based on load
4. **No Permission Issues**: Runs server-side with full database access
5. **Background Processing**: Doesn't block user operations

### How It Works
```
Shop User Creates Transaction → Firestore Trigger → Cloud Function Executes → Creates Notifications for Admins
```

## Prerequisites

### Required Tools
```bash
# Check if Node.js is installed (v18 or v20 recommended)
node --version

# Check if npm is installed
npm --version

# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Check Firebase CLI version
firebase --version
```

## Project Setup

### Step 1: Initialize Firebase Functions

```bash
# In your project root directory
firebase init functions

# Select:
# - Use an existing project (select your project)
# - JavaScript or TypeScript (recommend TypeScript)
# - Use ESLint? Yes
# - Install dependencies? Yes
```

This creates a `functions/` directory with:
```
functions/
├── src/
│   └── index.ts         # Main functions file
├── lib/                 # Compiled JavaScript (TypeScript only)
├── node_modules/        # Dependencies
├── .eslintrc.js        # ESLint configuration
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration (if using TS)
└── .gitignore
```

### Step 2: Install Required Dependencies

```bash
cd functions
npm install firebase-admin@latest firebase-functions@latest

# Optional but recommended for better logging
npm install --save-dev @types/node firebase-functions-test
```

### Step 3: Update package.json

```json
{
  "name": "functions",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^5.48.0",
    "@typescript-eslint/parser": "^5.48.0",
    "eslint": "^8.31.0",
    "eslint-config-google": "^0.14.0",
    "eslint-plugin-import": "^2.26.0",
    "firebase-functions-test": "^3.0.0",
    "typescript": "^4.9.4"
  },
  "private": true
}
```

## Implementation

### Step 4: Create the Cloud Functions Code

Create `functions/src/index.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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

// Function 1: Notify admins when a transaction is created
export const onTransactionCreated = functions
    .region('us-central1') // Choose your region
    .firestore
    .document('transactions/{transactionId}')
    .onCreate(async (snapshot, context) => {
        try {
            const transaction = snapshot.data();
            const { transactionId } = context.params;

            // Get the user who created the transaction
            const userDoc = await db.collection('users').doc(transaction.userId).get();

            if (!userDoc.exists) {
                console.error(`User ${transaction.userId} not found`);
                return null;
            }

            const user = userDoc.data() as User;

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

            // Create notifications batch
            const batch = db.batch();
            const timestamp = admin.firestore.FieldValue.serverTimestamp();

            adminsSnapshot.docs.forEach(adminDoc => {
                const notificationRef = db.collection('notifications').doc();
                const notification: Notification = {
                    userId: adminDoc.id,
                    originatingUserId: transaction.userId,
                    shopId: transaction.shopId,
                    message: `المستخدم "${user.name}" أضاف معاملة جديدة بقيمة ${transaction.amount} ريال`,
                    logType: LogType.ADD_ENTRY,
                    isRead: false,
                    timestamp: timestamp
                };
                batch.set(notificationRef, notification);
            });

            // Commit all notifications at once
            await batch.commit();
            console.log(`Created ${adminsSnapshot.size} notifications for transaction ${transactionId}`);

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

// Function 4: HTTP endpoint to manually create notifications (for testing)
export const createNotification = functions
    .region('us-central1')
    .https.onRequest(async (request, response) => {
        try {
            // Check for authorization (add your own auth logic)
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                response.status(401).send('Unauthorized');
                return;
            }

            // Verify the request method
            if (request.method !== 'POST') {
                response.status(405).send('Method Not Allowed');
                return;
            }

            const { userId, message, logType, shopId } = request.body;

            if (!userId || !message || !logType) {
                response.status(400).send('Missing required fields');
                return;
            }

            // Create the notification
            const notificationRef = db.collection('notifications').doc();
            await notificationRef.set({
                userId,
                originatingUserId: 'system',
                shopId,
                message,
                logType,
                isRead: false,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });

            response.status(200).json({
                success: true,
                notificationId: notificationRef.id
            });
        } catch (error) {
            console.error('Error in createNotification:', error);
            response.status(500).send('Internal Server Error');
        }
    });

// Function 5: Batch notification processor for high-volume events
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
```

### Step 5: Create Helper Functions Module

Create `functions/src/helpers.ts`:

```typescript
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
}
```

### Step 6: Create Configuration File

Create `functions/src/config.ts`:

```typescript
export const config = {
    region: 'us-central1', // Change to your preferred region
    timezone: 'Asia/Riyadh', // Change to your timezone
    cleanup: {
        daysToKeep: 30,
        batchSize: 500
    },
    notifications: {
        maxBatchSize: 500,
        retryAttempts: 3
    }
};

export const messageTemplates = {
    transaction: {
        created: 'المستخدم "{userName}" أضاف معاملة جديدة بقيمة {amount} ريال',
        updated: 'المستخدم "{userName}" عدل معاملة بقيمة {amount} ريال',
        deleted: 'المستخدم "{userName}" حذف معاملة'
    },
    shop: {
        created: 'تم إنشاء متجر جديد "{shopName}"',
        updated: 'تم تحديث متجر "{shopName}"',
        deleted: 'تم حذف متجر "{shopName}"',
        activated: 'تم تفعيل متجر "{shopName}"',
        deactivated: 'تم إلغاء تفعيل متجر "{shopName}"'
    },
    user: {
        created: 'تم إنشاء مستخدم جديد "{userName}"',
        updated: 'تم تحديث بيانات المستخدم "{userName}"',
        deactivated: 'تم إلغاء تفعيل المستخدم "{userName}"'
    },
    system: {
        error: 'خطأ في النظام: {error}',
        warning: 'تحذير: {warning}',
        info: 'معلومة: {info}'
    }
};
```

## Deployment

### Step 7: Configure Firebase

Update `firebase.json` in your project root:

```json
{
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "runtime": "nodejs20"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Step 8: Set Environment Variables

```bash
# Set configuration variables
firebase functions:config:set app.name="Accounting App"
firebase functions:config:set app.admin_email="admin@accounting-app.com"
firebase functions:config:set app.timezone="Asia/Riyadh"

# View current configuration
firebase functions:config:get

# Deploy configuration
firebase deploy --only functions:config
```

### Step 9: Deploy Functions

```bash
# Build TypeScript
cd functions
npm run build

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:onTransactionCreated

# Deploy multiple specific functions
firebase deploy --only functions:onTransactionCreated,functions:onLogCreated
```

## Testing

### Step 10: Local Testing with Emulators

```bash
# Install emulators (first time only)
firebase init emulators

# Start emulators
firebase emulators:start

# Or start specific emulators
firebase emulators:start --only functions,firestore

# In another terminal, run tests
cd functions
npm test
```

### Step 11: Create Test File

Create `functions/src/test/notifications.test.ts`:

```typescript
import * as functions from 'firebase-functions-test';
import * as admin from 'firebase-admin';

const test = functions();

describe('Notification Functions', () => {
    let myFunctions: any;

    before(() => {
        myFunctions = require('../index');
    });

    after(() => {
        test.cleanup();
    });

    it('should create notifications when transaction is created', async () => {
        const wrapped = test.wrap(myFunctions.onTransactionCreated);

        const data = {
            userId: 'user123',
            shopId: 'shop123',
            amount: 100,
            description: 'Test transaction'
        };

        const snap = test.firestore.makeDocumentSnapshot(data, 'transactions/trans123');

        await wrapped(snap, {
            params: { transactionId: 'trans123' }
        });

        // Add assertions here
    });
});
```

### Step 12: Monitor Functions

```bash
# View logs in real-time
firebase functions:log --follow

# View last 50 log entries
firebase functions:log -n 50

# View logs for specific function
firebase functions:log --only onTransactionCreated

# Open Firebase Console for detailed monitoring
firebase open functions
```

## Cost Optimization

### Best Practices to Minimize Costs

1. **Batch Operations**: Process multiple items in single function execution
2. **Efficient Queries**: Use proper indexes and limit query results
3. **Cold Start Optimization**: Keep functions warm with minimum instances
4. **Memory Allocation**: Use appropriate memory (default 256MB is usually enough)
5. **Region Selection**: Deploy in region closest to users

### Configure Function Resources

```typescript
export const optimizedFunction = functions
    .region('us-central1')
    .runWith({
        timeoutSeconds: 60,
        memory: '256MB', // or '512MB', '1GB', '2GB'
        minInstances: 0,  // Keep 0 for dev, 1 for production critical functions
        maxInstances: 10, // Prevent runaway scaling
    })
    .firestore
    .document('path/{docId}')
    .onCreate(async (snap, context) => {
        // Function logic
    });
```

## Update Your App Code

### Step 13: Remove Direct Notification Calls

Update your app to use the queue system if needed:

```typescript
// Instead of calling NotificationService.notifyAdminsOfUserAction()
// For important custom notifications, use the queue:

import { addDoc, collection } from 'firebase/firestore';

async function queueAdminNotification(
    message: string,
    logType: string,
    shopId?: string
) {
    await addDoc(collection(db, 'notificationQueue'), {
        type: 'ADMIN_NOTIFICATION',
        originatingUserId: currentUser.id,
        shopId: shopId || currentUser.shopId,
        message,
        logType,
        timestamp: serverTimestamp(),
        processed: false
    });
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Permission Denied Errors**
   ```bash
   # Ensure you're logged in
   firebase login

   # Check project selection
   firebase use --add
   ```

2. **Function Timeout**
   - Increase timeout in function configuration
   - Optimize database queries
   - Use batch operations

3. **Cold Start Issues**
   - Set minInstances to 1 for critical functions
   - Use lightweight dependencies
   - Optimize imports

4. **Memory Errors**
   - Increase memory allocation
   - Process data in chunks
   - Clear variables after use

5. **Deployment Failures**
   ```bash
   # Clear cache and rebuild
   cd functions
   rm -rf node_modules
   npm install
   npm run build
   firebase deploy --only functions
   ```

## Security Considerations

1. **Authentication**: Always verify user authentication in HTTP functions
2. **Input Validation**: Sanitize all input data
3. **Rate Limiting**: Implement rate limiting for HTTP endpoints
4. **Secrets Management**: Use Firebase Functions config for sensitive data
5. **Error Handling**: Never expose internal errors to clients

## Next Steps

1. Deploy the functions to production
2. Monitor function performance and errors
3. Set up alerts for function failures
4. Implement additional notification channels (email, SMS)
5. Create admin dashboard for notification analytics

## Additional Resources

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Cloud Functions Best Practices](https://cloud.google.com/functions/docs/bestpractices)
- [Firebase Functions Samples](https://github.com/firebase/functions-samples)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)