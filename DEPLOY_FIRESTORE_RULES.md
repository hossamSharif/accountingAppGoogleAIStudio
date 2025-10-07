# Deploy Firestore Rules - Instructions

## Problem Fixed
The issue was that users were being created in Firebase Authentication but not in the Firestore database due to insufficient permissions in the security rules.

## Changes Made

### 1. Updated Firestore Rules (firestore.rules)
- Split `write` permission into `create`, `update`, and `delete` for users collection
- Allowed admins to create users for other people
- Fixed permissions for transactions and logs collections to handle null resources
- Added more flexible admin checking

### 2. Fixed User Creation Flow (services/userService.ts)
- Implemented secondary Firebase app instance for user creation
- This prevents the admin from being logged out when creating new users
- Added proper cleanup if Firestore document creation fails (deletes orphaned auth user)
- Ensures admin session remains active after creating new users

## Deploy the Rules to Firebase

### Option 1: Via Firebase Console (Recommended for immediate fix)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `accounting-appgoogle-ai`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the entire content from `firestore.rules` file
5. Paste it in the rules editor
6. Click **Publish**

### Option 2: Via Firebase CLI
1. Open a terminal in the project directory
2. Run: `firebase login` (follow the browser prompts)
3. Run: `firebase use accounting-appgoogle-ai`
4. Run: `firebase deploy --only firestore:rules`

## Testing the Fix

1. Log in as admin
2. Go to User Management page
3. Create a new user:
   - Fill in all required fields
   - Select a shop for the user
   - Click Save

The user should now be:
- Created in Firebase Authentication ✓
- Added to Firestore users collection ✓
- Admin session should remain active ✓

## Important Notes
- The admin user will no longer be logged out when creating new users
- If Firestore fails, the auth user will be automatically deleted to prevent orphaned accounts
- The error messages are properly handled and displayed in Arabic