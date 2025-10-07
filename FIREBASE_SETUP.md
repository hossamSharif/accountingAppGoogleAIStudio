# Firebase Setup Guide

## Prerequisites

1. **Firebase Project**: You should have a Firebase project set up at https://firebase.google.com/
2. **Firebase Configuration**: The project should be configured with:
   - Authentication enabled (Email/Password provider)
   - Firestore Database created
   - Web app registered with Firebase

## Setup Steps

### 1. Environment Configuration

The `.env.local` file has been created with the Firebase configuration variables. Make sure all values are correct:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2. Firestore Security Rules

Upload the `firestore.rules` file to your Firebase project:

1. Go to Firebase Console → Firestore Database → Rules
2. Copy the contents of `firestore.rules` and paste them
3. Publish the rules

**Important**: The security rules implement role-based access:
- **Admins**: Full access to all data
- **Users**: Access only to their assigned shop's data
- **Authentication**: All operations require valid authentication

### 3. Database Initialization

The app includes an automatic database initialization feature:

#### Default Accounts Created:
- **Admin**: admin@accounting-app.com / Admin123!
- **Test User**: user@example.com / user123

#### Default Data:
- 3 sample shops with Arabic names
- Complete chart of accounts for each shop
- Financial years set up
- Sample user assigned to first shop

### 4. Collections Structure

The app creates the following Firestore collections:

#### `users`
```typescript
{
  id: string;           // Firebase Auth UID
  email: string;
  name: string;
  role: 'admin' | 'user';
  shopId?: string;      // For users assigned to specific shops
  isActive: boolean;
}
```

#### `shops`
```typescript
{
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}
```

#### `accounts`
```typescript
{
  id: string;
  shopId: string;
  accountCode: string;
  name: string;
  classification: AccountClassification;
  nature: AccountNature;
  type: AccountType;
  parentId?: string;
  isActive: boolean;
  openingBalance?: number;
}
```

#### `transactions`
```typescript
{
  id: string;
  shopId: string;
  date: string;         // ISO string
  type: TransactionType;
  description: string;
  totalAmount: number;
  entries: TransactionEntry[];
  categoryId?: string;
  partyId?: string;
}
```

#### `financialYears`
```typescript
{
  id: string;
  shopId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  openingStockValue: number;
  closingStockValue?: number;
}
```

#### `logs`
```typescript
{
  id: string;
  userId: string;
  shopId?: string;
  type: LogType;
  timestamp: string;
  message: string;
}
```

#### `notifications`
```typescript
{
  id: string;
  userId: string;
  originatingUserId?: string;
  shopId?: string;
  logType?: LogType;
  message: string;
  isRead: boolean;
  timestamp: string;
}
```

## Testing the Setup

### 1. Admin Login
- Email: admin@accounting-app.com
- Password: Admin123!
- Should have access to all shops and admin functions

### 2. User Login
- Email: user@example.com
- Password: user123
- Should have access only to assigned shop

### 3. Verification Checklist
- [ ] Authentication works for both admin and user
- [ ] Admin can see all shops in dropdown
- [ ] User can only see their assigned shop
- [ ] Transactions can be created and viewed
- [ ] Accounts management works
- [ ] Real-time updates work across sessions
- [ ] Notifications system functions properly
- [ ] Analytics and reports generate correctly

## Troubleshooting

### Common Issues:

1. **Permission Denied Errors**
   - Check if Firestore security rules are deployed
   - Verify user has proper role and isActive = true

2. **Authentication Errors**
   - Verify Firebase Auth is enabled with Email/Password provider
   - Check environment variables are correct

3. **Data Not Loading**
   - Check if collections exist in Firestore
   - Verify user has shopId assigned (for non-admin users)
   - Check browser console for detailed errors

4. **Initialization Not Working**
   - Make sure Firebase project allows user registration
   - Check if security rules allow write operations during initialization

### Firebase Console Tasks:

1. **Enable Authentication**:
   - Go to Authentication → Sign-in method
   - Enable Email/Password provider

2. **Create Firestore Database**:
   - Go to Firestore Database
   - Create database in production mode
   - Deploy the security rules from `firestore.rules`

3. **Set up Indexes** (if needed):
   - The app may require composite indexes for complex queries
   - Firebase will show error messages with links to create required indexes

## Production Considerations

1. **Security Rules**: Review and test the security rules thoroughly
2. **Environment Variables**: Use proper environment variables for production
3. **Backup Strategy**: Set up automated backups for Firestore
4. **Monitoring**: Enable Firebase Analytics and Performance monitoring
5. **User Management**: Consider implementing proper user invitation system
6. **Data Validation**: Add server-side validation using Cloud Functions if needed