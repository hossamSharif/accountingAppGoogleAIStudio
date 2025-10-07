# Cloud Functions Local Testing Guide

This guide will help you test the notification cloud functions locally using Firebase Emulators before deploying to production.

## <¯ Overview

You will be testing:
- **onTransactionCreated** - Notification when transactions are created
- **onLogCreated** - Notification when important logs are created
- **cleanupOldNotifications** - Scheduled cleanup (manual testing)
- **processPendingNotifications** - Queue processing

## =Ë Prerequisites

1. **Firebase CLI** installed (already verified )
   ```bash
   firebase --version  # Should show 14.17.0
   ```

2. **Node.js** installed
   ```bash
   node --version
   ```

3. **Firebase Admin SDK**
   ```bash
   npm install firebase-admin
   ```

## =€ Step-by-Step Local Testing

### Step 1: Start Firebase Emulators

Open a terminal and start the emulators:

```bash
firebase emulators:start
```

This will start:
- **Auth Emulator**: http://localhost:9099
- **Firestore Emulator**: http://localhost:8080
- **Functions Emulator**: http://localhost:5001
- **Emulator UI**: http://localhost:4000

**Important**: Keep this terminal window open. The emulators need to keep running.

### Step 2: Configure Your App for Emulators

The app is already configured to use emulators when `.env.local` is present.

**Option A: Use the provided .env.local**
```bash
# The .env.local file is already created with VITE_USE_EMULATORS=true
# Just restart your dev server
npm run dev
```

**Option B: Temporarily enable emulators without .env.local**
```bash
# Set environment variable before starting dev server
VITE_USE_EMULATORS=true npm run dev
```

When you start your app, you should see in the console:
```
=' Connecting to Firebase Emulators...
 Connected to Firebase Emulators
   - Auth: http://localhost:9099
   - Firestore: http://localhost:8080
   - Functions: http://localhost:5001
   - UI: http://localhost:4000
```

### Step 3: Run Automated Tests

In a **new terminal window** (keep emulators running), run:

```bash
node test-cloud-functions-local.js
```

This script will:
1.  Create test users (admin and shop user)
2.  Create a test shop
3.  Create a test transaction ’ triggers `onTransactionCreated`
4.  Create a test log ’ triggers `onLogCreated`
5.  Check that notifications were created
6.  Display results

**Expected Output:**
```
=€ Starting Cloud Functions Local Tests

==================================================

=' Setting up test data...

 Created test admin user
 Created test shop user
 Created test shop

=Ý Testing transaction notification...

 Created test transaction: xyz123
 Notification created successfully!
   Message: 'DE3*./E "Shop Test User" #6'A E9'ED) ,/J/) (BJE) 500 1J'D
   Log Type: ADD_ENTRY
   Is Read: false

=Ë Testing log notification...

 Created test log: abc456
 Notification created successfully!
   Message: E*,1 ,/J/ *E %F4'$G DD'.*('1
   Log Type: SHOP_CREATED

=ì Checking all notifications...

Found 2 notification(s):

1. E*,1 ,/J/ *E %F4'$G DD'.*('1
   Type: SHOP_CREATED
   User: test-admin-1
   Read: false

2. 'DE3*./E "Shop Test User" #6'A E9'ED) ,/J/) (BJE) 500 1J'D
   Type: ADD_ENTRY
   User: test-admin-1
   Read: false

==================================================

 Tests completed!
```

### Step 4: Manual Testing via App

With emulators and your app running:

1. **Create a shop user account** in your app
2. **Login as a shop user**
3. **Create a transaction** ’ This should trigger the cloud function
4. **Login as an admin** ’ Check notifications panel
5. **Verify notifications appear**

### Step 5: View Emulator UI

Open http://localhost:4000 in your browser to:
- =Ê View Firestore data
- =e Check created users
- =Ý See transactions
- = Inspect notifications
- =Ë View function logs
- = Debug function executions

## >ê Testing Checklist

- [ ] Emulators start successfully
- [ ] App connects to emulators (check console logs)
- [ ] Automated test script runs without errors
- [ ] Transaction creation triggers notifications
- [ ] Important log creation triggers notifications
- [ ] Notifications appear for admin users only
- [ ] Notifications have correct Arabic messages
- [ ] Emulator UI shows all data correctly
- [ ] Function logs show successful executions

## = Monitoring & Debugging

### View Function Logs

**In Emulator UI:**
http://localhost:4000 ’ Functions tab ’ View logs

**In Terminal:**
```bash
# In another terminal window
firebase emulators:logs --only functions
```

### Common Issues & Solutions

#### L "Connection refused" or "ECONNREFUSED"
**Solution**: Make sure emulators are running
```bash
firebase emulators:start
```

#### L App not connecting to emulators
**Solution**: Check `.env.local` file exists and has:
```
VITE_USE_EMULATORS=true
```
Then restart your dev server.

#### L Notifications not appearing
**Solution**: Check function logs in Emulator UI
- Look for errors in function execution
- Verify test users are created correctly
- Ensure admin user has `role: 'admin'` and `isActive: true`

#### L Test script fails with "Cannot find module 'firebase-admin'"
**Solution**: Install firebase-admin
```bash
npm install firebase-admin
```

## >ù Cleanup Test Data

After testing, clean up emulator data:

```bash
# Run cleanup script
node test-cloud-functions-local.js cleanup
```

Or restart emulators (data is not persisted):
```bash
# Stop emulators (Ctrl+C)
# Then start again
firebase emulators:start
```

## =Ê What to Test

### Test Case 1: Shop User Creates Transaction
1. Login as shop user
2. Create a new transaction
3. **Expected**: Admin users receive notification in Arabic
4. **Verify**: Notification appears in admin's notification panel

### Test Case 2: Important Log Created
1. Perform important action (create shop, create user, etc.)
2. **Expected**: Admin receives notification
3. **Verify**: Notification type matches log type

### Test Case 3: Admin Creates Transaction
1. Login as admin
2. Create a transaction
3. **Expected**: NO notification created (admins don't get notified of own actions)

### Test Case 4: Inactive Admin
1. Set an admin user's `isActive` to `false`
2. Create a transaction as shop user
3. **Expected**: Inactive admin does NOT receive notification

## <“ Next Steps After Successful Testing

1. **Stop emulators**: `Ctrl+C` in emulator terminal
2. **Review test results**: Make sure all tests pass
3. **Deploy to production**:
   ```bash
   firebase deploy --only functions
   ```
4. **Monitor production**:
   ```bash
   firebase functions:log --follow
   ```

## =Ý Production Deployment Checklist

Before deploying to production:

- [ ] All local tests pass
- [ ] Function logs show no errors
- [ ] Notifications display correctly in Arabic
- [ ] Admin-only notifications work properly
- [ ] Non-important events are filtered out
- [ ] Firebase project is set correctly: `firebase use vavidiaapp`
- [ ] Functions are built successfully: `cd functions && npm run build`

## <˜ Getting Help

If you encounter issues:

1. **Check emulator logs**: http://localhost:4000 ’ Logs
2. **Check function code**: `functions/src/index.ts`
3. **Review Firebase console**: https://console.firebase.google.com
4. **Test connection**: Verify emulators are running on correct ports

## <‰ Success Criteria

Your local testing is successful when:
-  Emulators start without errors
-  App connects to emulators
-  Automated tests pass
-  Notifications created for transactions
-  Notifications created for important logs
-  Only admin users receive notifications
-  Messages display in Arabic
-  Function logs show successful executions

You're now ready to deploy to production! =€
