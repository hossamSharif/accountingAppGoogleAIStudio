# Deploy Firestore Rules Fix - URGENT

## Date: 2025-10-02

## Issue
Shop users are getting "Missing or insufficient permissions" error when trying to create sub-accounts for expenses, customers, or suppliers from the transaction modal.

## Root Cause
The Firestore security rules were too restrictive - only allowing admins to create accounts.

## Solution Applied
Updated the Firestore rules in `firestore.rules` to allow shop users to create sub-accounts.

## Changes Made to firestore.rules

### OLD Rules (Too Restrictive):
```javascript
match /accounts/{accountId} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated() && (
    isAdmin() ||
    request.auth.token.email == 'admin@accounting-app.com'
  );
  allow create: if isAuthenticated() && (
    isAdmin() ||
    request.auth.token.email == 'admin@accounting-app.com'
  );
}
```

### NEW Rules (Fixed):
```javascript
match /accounts/{accountId} {
  allow read: if isAuthenticated();

  // Allow creation if:
  // 1. User is admin, OR
  // 2. User is creating account for their own shop AND account has a parentId (sub-account)
  allow create: if isAuthenticated() && (
    isAdmin() ||
    request.auth.token.email == 'admin@accounting-app.com' ||
    // Allow users to create sub-accounts for their shop
    (isActiveUser() &&
     request.resource.data.shopId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.shopId &&
     'parentId' in request.resource.data &&
     request.resource.data.parentId != null)
  );

  // Allow update if admin or user owns the shop
  allow update: if isAuthenticated() && (
    isAdmin() ||
    (isActiveUser() &&
     resource.data.shopId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.shopId)
  );

  // Only admins can delete accounts
  allow delete: if isAdmin();
}
```

## Key Security Features
1. **Shop Isolation**: Users can only create accounts for their assigned shop
2. **Sub-accounts Only**: Users must provide a `parentId` (can't create root accounts)
3. **Active Users Only**: Inactive users cannot create accounts
4. **Admin Override**: Admins retain full control

## Deployment Instructions

### Option 1: Firebase CLI (Recommended)
```bash
# 1. Login to Firebase
firebase login

# 2. Initialize project (if not already done)
firebase init firestore

# 3. Select your project
firebase use <your-project-id>

# 4. Deploy the rules
firebase deploy --only firestore:rules
```

### Option 2: Firebase Console (Manual)
1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the entire content of `firestore.rules` file
5. Paste it in the Rules editor
6. Click **Publish**
7. Wait for confirmation message

### Option 3: Using gcloud CLI
```bash
# If you have gcloud CLI installed
gcloud firestore databases update --project=<your-project-id> --rules-file=firestore.rules
```

## Testing After Deployment

### Test as Shop User:
1. Login as a shop user (not admin)
2. Open transaction modal
3. For **Expense** transaction:
   - Click "+" next to "حساب الفئة"
   - Enter new expense category name
   - Click Save
   - ✅ Should succeed without permission error

4. For **Sale** transaction:
   - Click "+" next to "العميل"
   - Enter new customer name
   - Click Save
   - ✅ Should succeed without permission error

5. For **Purchase** transaction:
   - Click "+" next to "المورد"
   - Enter new supplier name
   - Click Save
   - ✅ Should succeed without permission error

### Expected Behavior:
- ✅ Sub-accounts created successfully
- ✅ No permission errors
- ✅ New accounts appear in dropdowns
- ✅ Transactions can be completed

### Error Messages Fixed:
- ❌ "FirebaseError: Missing or insufficient permissions"
- ❌ "400 (Bad Request)" on Firestore write

## Rollback Instructions (If Needed)
If there are issues, you can rollback by:
1. Going to Firebase Console → Firestore → Rules
2. Click on "History" tab
3. Select the previous version
4. Click "Restore"

## Security Validation
The new rules maintain security by:
- ✅ Requiring authentication
- ✅ Checking user is active
- ✅ Verifying shop ownership
- ✅ Requiring parentId (prevents root account creation)
- ✅ Admin bypass for full control

## Notes
- Changes take effect immediately after publishing
- No code changes required in the application
- All existing functionality remains intact
- This fix enables the new transaction modal features to work properly