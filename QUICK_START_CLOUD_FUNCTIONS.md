# Quick Start Guide - Deploy Cloud Functions

## Prerequisites Checklist
- [ ] Node.js installed (v18 or v20)
- [ ] npm installed
- [ ] Firebase project created
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)

## Step 1: Login to Firebase
```bash
firebase login
```

## Step 2: Install Dependencies
```bash
cd functions
npm install
cd ..
```

## Step 3: Build Functions
```bash
cd functions
npm run build
cd ..
```

## Step 4: Deploy Functions

### Option A: Deploy All Functions
```bash
firebase deploy --only functions
```

### Option B: Deploy Specific Functions
```bash
# Deploy only notification functions
firebase deploy --only functions:onTransactionCreated,functions:onLogCreated

# Deploy only cleanup function
firebase deploy --only functions:cleanupOldNotifications

# Deploy only queue processor
firebase deploy --only functions:processPendingNotifications
```

## Step 5: Verify Deployment
```bash
# Check deployment status
firebase functions:list

# View function logs
firebase functions:log --follow

# Open Firebase Console
firebase open functions
```

## Step 6: Test the Functions

1. **Login as a shop user** in your app
2. **Create a new transaction**
3. **Check the browser console** - you should see:
   - `User action logged: [username] - [action]` (no errors)
4. **Check Firebase Console** > Functions > Logs to see:
   - Function execution logs
   - Any errors or warnings
5. **Check Firestore** > notifications collection to verify notifications were created

## Common Issues and Solutions

### Issue: "Missing or insufficient permissions"
**Solution**: Deploy the Cloud Functions - they run with admin privileges

### Issue: "firebase: command not found"
**Solution**: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Issue: "Error: Failed to authenticate"
**Solution**: Login to Firebase
```bash
firebase login
```

### Issue: "Cannot find module 'firebase-admin'"
**Solution**: Install dependencies
```bash
cd functions
npm install
cd ..
```

### Issue: "TypeScript build failed"
**Solution**: Check for TypeScript errors
```bash
cd functions
npx tsc --noEmit
```

## Monitoring

### View Real-time Logs
```bash
firebase functions:log --follow
```

### Check Function Metrics
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Functions
4. View execution count, errors, and performance

## Cost Estimation

| Function | Triggers | Est. Monthly Invocations | Est. Cost |
|----------|----------|-------------------------|-----------|
| onTransactionCreated | New transactions | 1,000 | ~$0.01 |
| onLogCreated | Important logs | 500 | ~$0.01 |
| cleanupOldNotifications | Daily | 30 | ~$0.01 |
| processPendingNotifications | Queue items | 100 | ~$0.01 |
| **Total** | | **1,630** | **~$0.04** |

*Note: First 2 million invocations per month are free*

## Windows Users

Use the provided batch file:
```cmd
deploy-functions.bat
```

## Linux/Mac Users

Use the provided shell script:
```bash
chmod +x deploy-functions.sh
./deploy-functions.sh
```

## Need Help?

1. Check function logs: `firebase functions:log`
2. Review the full guide: `CLOUD_FUNCTIONS_IMPLEMENTATION_GUIDE.md`
3. Check Firebase status: https://status.firebase.google.com/
4. Firebase Support: https://firebase.google.com/support