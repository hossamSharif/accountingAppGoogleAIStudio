# Phase 1: Firebase Integration & Core Infrastructure
## Detailed Task Breakdown (Weeks 1-6)

---

## 🚀 Week 1-2: Authentication & User Management

### **Task 1.1: Complete Firebase Authentication System**
**Priority: CRITICAL | Estimated Time: 8-12 hours**

#### **Subtasks:**

**1.1.1 Fix LoginPage.tsx Firebase Integration**
- **File:** `pages/LoginPage.tsx`
- **Current Issues:** Basic auth exists but needs enhancement
- **Implementation:**
```typescript
// Add to LoginPage.tsx
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';

// Enhanced login with better error handling
const handleLogin = async (email: string, password: string) => {
  try {
    setIsLoading(true);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // Check if email is verified
    if (!userCredential.user.emailVerified) {
      setError('يرجى تفعيل البريد الإلكتروني أولاً');
      await signOut(auth);
      return;
    }

    // Success - App.tsx will handle user state
  } catch (error: any) {
    handleAuthError(error);
  } finally {
    setIsLoading(false);
  }
};
```

**1.1.2 Implement ForgotPasswordModal.tsx**
- **File:** `components/ForgotPasswordModal.tsx`
- **Current State:** UI exists, no Firebase integration
- **Implementation:**
```typescript
import { sendPasswordResetEmail } from 'firebase/auth';

const handlePasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    setSuccess('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني');
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      setError('البريد الإلكتروني غير مسجل في النظام');
    } else {
      setError('حدث خطأ أثناء إرسال رابط الاستعادة');
    }
  }
};
```

**1.1.3 Add Email Verification Flow**
- **New File:** `components/EmailVerificationModal.tsx`
- **Purpose:** Handle email verification for new users
- **Integration:** Add to registration process

**1.1.4 Enhance Error Handling**
- **New File:** `utils/authErrorHandler.ts`
- **Purpose:** Centralized auth error handling with Arabic messages
```typescript
export const getAuthErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'المستخدم غير موجود',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/invalid-email': 'البريد الإلكتروني غير صالح',
    'auth/user-disabled': 'تم تعطيل هذا الحساب',
    'auth/too-many-requests': 'تم تجاوز عدد المحاولات المسموح',
    // ... more error codes
  };
  return errorMessages[errorCode] || 'حدث خطأ في النظام';
};
```

---

### **Task 1.2: Complete User Management System**
**Priority: CRITICAL | Estimated Time: 12-16 hours**

#### **Subtasks:**

**1.2.1 Create Firebase User Service**
- **New File:** `services/userService.ts`
- **Purpose:** Centralized user management operations
```typescript
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export class UserService {
  // Create new user with Firebase Auth + Firestore
  static async createUser(userData: CreateUserData): Promise<User> {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );

    // 2. Create Firestore user document
    const newUser: Omit<User, 'id'> = {
      name: userData.name,
      email: userData.email,
      role: 'user',
      shopId: userData.shopId,
      isActive: true
    };

    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);

    // 3. Send verification email
    await sendEmailVerification(userCredential.user);

    return { id: userCredential.user.uid, ...newUser };
  }

  // Update user data
  static async updateUser(userId: string, userData: Partial<User>): Promise<void> {
    await updateDoc(doc(db, 'users', userId), userData);
  }

  // Toggle user status
  static async toggleUserStatus(userId: string): Promise<void> {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const currentStatus = userDoc.data().isActive;
      await updateDoc(doc(db, 'users', userId), { isActive: !currentStatus });
    }
  }

  // Assign user to shop
  static async assignUserToShop(userId: string, shopId: string): Promise<void> {
    await updateDoc(doc(db, 'users', userId), { shopId });
  }
}
```

**1.2.2 Update UserManagementPage.tsx**
- **File:** `pages/UserManagementPage.tsx`
- **Changes:** Integrate with UserService
```typescript
// Replace manual handlers with service calls
const handleAddUser = async (userData: CreateUserData) => {
  try {
    setIsLoading(true);
    await UserService.createUser(userData);
    setSuccess('تم إنشاء المستخدم بنجاح');
  } catch (error) {
    setError('فشل في إنشاء المستخدم');
  } finally {
    setIsLoading(false);
  }
};
```

**1.2.3 Update UserModal.tsx**
- **File:** `components/UserModal.tsx`
- **Changes:** Remove manual UID requirement, add password field
```typescript
// Add password field for new users
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

// Remove UID field (auto-generated)
// Add password validation
```

**1.2.4 Add User Role Management**
- **Enhancement:** Add role switching capability for admins
- **New Component:** `components/UserRoleModal.tsx`

---

## 🔧 Week 3-4: Core Data Operations

### **Task 1.3: Complete Shop Management System**
**Priority: HIGH | Estimated Time: 10-14 hours**

#### **Subtasks:**

**1.3.1 Create Shop Service**
- **New File:** `services/shopService.ts`
```typescript
export class ShopService {
  // Create shop with default accounts
  static async createShop(shopData: CreateShopData): Promise<Shop> {
    const batch = writeBatch(db);

    // 1. Create shop document
    const shopRef = doc(collection(db, 'shops'));
    batch.set(shopRef, {
      name: shopData.name,
      description: shopData.description,
      isActive: true,
      createdAt: Timestamp.now()
    });

    // 2. Create default accounts for shop
    MAIN_ACCOUNT_DEFINITIONS.forEach(accountDef => {
      const accountRef = doc(collection(db, 'accounts'));
      batch.set(accountRef, {
        ...accountDef,
        shopId: shopRef.id,
        isActive: true,
        createdAt: Timestamp.now()
      });
    });

    // 3. Create default financial year
    const fyRef = doc(collection(db, 'financialYears'));
    batch.set(fyRef, {
      name: `السنة المالية ${new Date().getFullYear()}`,
      startDate: `${new Date().getFullYear()}-01-01`,
      endDate: `${new Date().getFullYear()}-12-31`,
      status: 'open',
      openingStockValue: 0,
      shopId: shopRef.id
    });

    await batch.commit();
    return { id: shopRef.id, ...shopData, isActive: true };
  }

  // Update shop
  static async updateShop(shopId: string, shopData: Partial<Shop>): Promise<void> {
    await updateDoc(doc(db, 'shops', shopId), shopData);
  }

  // Toggle shop status
  static async toggleShopStatus(shopId: string): Promise<void> {
    const shopDoc = await getDoc(doc(db, 'shops', shopId));
    if (shopDoc.exists()) {
      const currentStatus = shopDoc.data().isActive;
      await updateDoc(doc(db, 'shops', shopId), { isActive: !currentStatus });
    }
  }
}
```

**1.3.2 Update ShopManagementPage.tsx**
- **File:** `pages/ShopManagementPage.tsx`
- **Current State:** Basic UI exists
- **Required:** Complete Firebase integration

**1.3.3 Update ShopModal.tsx**
- **File:** `components/ShopModal.tsx`
- **Enhancement:** Add validation and better UX

---

### **Task 1.4: Complete Account Management System**
**Priority: HIGH | Estimated Time: 12-16 hours**

#### **Subtasks:**

**1.4.1 Create Account Service**
- **New File:** `services/accountService.ts`
```typescript
export class AccountService {
  // Create account with hierarchy validation
  static async createAccount(accountData: CreateAccountData): Promise<Account> {
    // 1. Validate account code uniqueness
    const existingAccount = await this.getAccountByCode(accountData.accountCode, accountData.shopId);
    if (existingAccount) {
      throw new Error('Account code already exists');
    }

    // 2. Create account document
    const accountRef = doc(collection(db, 'accounts'));
    const newAccount: Omit<Account, 'id'> = {
      ...accountData,
      isActive: true,
      createdAt: Timestamp.now()
    };

    await setDoc(accountRef, newAccount);
    return { id: accountRef.id, ...newAccount };
  }

  // Calculate account balance
  static async calculateAccountBalance(accountId: string): Promise<number> {
    // Get all transactions affecting this account
    const q = query(
      collection(db, 'transactions'),
      where('entries', 'array-contains', { accountId })
    );

    const snapshot = await getDocs(q);
    let balance = 0;

    snapshot.forEach(doc => {
      const transaction = doc.data() as Transaction;
      const entry = transaction.entries.find(e => e.accountId === accountId);
      if (entry) {
        balance += entry.amount;
      }
    });

    return balance;
  }

  // Get account hierarchy
  static async getAccountHierarchy(shopId: string): Promise<AccountTreeNode[]> {
    const accounts = await this.getAccountsByShop(shopId);
    return this.buildAccountTree(accounts);
  }
}
```

**1.4.2 Update AccountsPage.tsx**
- **File:** `pages/AccountsPage.tsx`
- **Enhancement:** Add real-time balance calculations
- **New Features:** Account hierarchy display, balance validation

**1.4.3 Update AccountModal.tsx**
- **File:** `components/AccountModal.tsx`
- **Enhancement:** Auto-generate account codes, validate hierarchy

**1.4.4 Create Account Balance Calculator**
- **New File:** `utils/balanceCalculator.ts`
- **Purpose:** Real-time account balance calculations

---

## ⚡ Week 5-6: Real-time Data & Notifications

### **Task 1.5: Implement Real-time Data Synchronization**
**Priority: HIGH | Estimated Time: 14-18 hours**

#### **Subtasks:**

**1.5.1 Create Real-time Listener Manager**
- **New File:** `hooks/useFirestoreListeners.ts`
```typescript
export const useFirestoreListeners = (user: User) => {
  const [data, setData] = useState({
    users: [],
    shops: [],
    accounts: [],
    transactions: [],
    financialYears: [],
    logs: [],
    notifications: []
  });

  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    // Set up listeners based on user role
    if (user.role === 'admin') {
      // Admin gets all data
      unsubscribers.push(setupAdminListeners(setData));
    } else {
      // User gets shop-specific data
      unsubscribers.push(setupUserListeners(user.shopId, setData));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  return data;
};
```

**1.5.2 Optimize App.tsx Data Management**
- **File:** `App.tsx`
- **Enhancement:** Replace manual listeners with hook
- **Performance:** Add proper cleanup and error handling

**1.5.3 Add Loading States**
- **New Component:** `components/LoadingSpinner.tsx`
- **New Component:** `components/SkeletonLoader.tsx`
- **Integration:** Add to all data-loading components

**1.5.4 Create Error Boundary**
- **New Component:** `components/ErrorBoundary.tsx`
- **Purpose:** Catch and handle React errors gracefully

---

### **Task 1.6: Complete Notification System**
**Priority: MEDIUM | Estimated Time: 8-12 hours**

#### **Subtasks:**

**1.6.1 Create Notification Service**
- **New File:** `services/notificationService.ts`
```typescript
export class NotificationService {
  // Create notification
  static async createNotification(notificationData: CreateNotificationData): Promise<void> {
    await addDoc(collection(db, 'notifications'), {
      ...notificationData,
      isRead: false,
      timestamp: Timestamp.now().toDate().toISOString()
    });
  }

  // Mark notifications as read
  static async markAsRead(notificationIds: string[]): Promise<void> {
    const batch = writeBatch(db);
    notificationIds.forEach(id => {
      batch.update(doc(db, 'notifications', id), { isRead: true });
    });
    await batch.commit();
  }

  // Auto-create notifications for user actions
  static async notifyAdminsOfUserAction(
    actionUser: User,
    action: string,
    shopId?: string
  ): Promise<void> {
    // Get all admin users
    const admins = await this.getAdminUsers();

    // Create notification for each admin
    const notifications = admins.map(admin => ({
      userId: admin.id,
      originatingUserId: actionUser.id,
      shopId,
      message: `المستخدم "${actionUser.name}" قام بـ ${action}`,
      logType: LogType.USER_ACTION
    }));

    // Batch create notifications
    const batch = writeBatch(db);
    notifications.forEach(notification => {
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        ...notification,
        isRead: false,
        timestamp: Timestamp.now().toDate().toISOString()
      });
    });
    await batch.commit();
  }
}
```

**1.6.2 Update NotificationsPage.tsx**
- **File:** `pages/NotificationsPage.tsx`
- **Enhancement:** Real-time notifications, better UX
- **Features:** Mark as read, notification filtering, cleanup

**1.6.3 Add Notification Integration**
- **Integration:** Add to all user actions (transactions, account changes, etc.)
- **Real-time:** Update notification badge in real-time

---

## 📋 Week 5-6: Logging & Monitoring

### **Task 1.7: Complete Activity Logging System**
**Priority: MEDIUM | Estimated Time: 6-10 hours**

#### **Subtasks:**

**1.7.1 Create Logging Service**
- **New File:** `services/loggingService.ts`
```typescript
export class LoggingService {
  // Log user action
  static async logAction(
    user: User,
    action: LogType,
    message: string,
    shopId?: string,
    metadata?: any
  ): Promise<void> {
    await addDoc(collection(db, 'logs'), {
      userId: user.id,
      shopId: shopId || user.shopId,
      type: action,
      message,
      metadata,
      timestamp: Timestamp.now().toDate().toISOString()
    });

    // Auto-create notifications if needed
    if (user.role !== 'admin') {
      await NotificationService.notifyAdminsOfUserAction(user, message, shopId);
    }
  }

  // Get logs with filtering
  static async getLogs(filters: LogFilters): Promise<Log[]> {
    let q = collection(db, 'logs');

    // Apply filters
    if (filters.shopId) {
      q = query(q, where('shopId', '==', filters.shopId));
    }
    if (filters.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    // Add ordering and limit
    q = query(q, orderBy('timestamp', 'desc'), limit(filters.limit || 100));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
  }
}
```

**1.7.2 Update ShopLogsPage.tsx**
- **File:** `pages/ShopLogsPage.tsx`
- **Enhancement:** Add filtering, search, export functionality

**1.7.3 Integrate Logging Everywhere**
- **Integration:** Add logging to all CRUD operations
- **Auto-logging:** Transaction logging, account changes, user actions

---

## 🔧 Technical Infrastructure Tasks

### **Task 1.8: Create Service Layer Architecture**
**Priority: HIGH | Estimated Time: 6-8 hours**

#### **Subtasks:**

**1.8.1 Create Base Service Class**
- **New File:** `services/baseService.ts`
```typescript
export abstract class BaseService {
  protected static db = db;
  protected static auth = auth;

  // Common error handling
  protected static handleError(error: any, context: string): never {
    console.error(`Error in ${context}:`, error);
    throw new Error(`Operation failed: ${context}`);
  }

  // Common validation
  protected static validateRequired(data: any, fields: string[]): void {
    fields.forEach(field => {
      if (!data[field]) {
        throw new Error(`${field} is required`);
      }
    });
  }
}
```

**1.8.2 Create Type Definitions**
- **New File:** `types/serviceTypes.ts`
- **Purpose:** Type definitions for service layer

**1.8.3 Create Validation Utilities**
- **New File:** `utils/validators.ts`
- **Purpose:** Data validation functions

---

### **Task 1.9: Error Handling & User Feedback**
**Priority: MEDIUM | Estimated Time: 4-6 hours**

#### **Subtasks:**

**1.9.1 Create Toast Notification System**
- **New Component:** `components/Toast.tsx`
- **New Hook:** `hooks/useToast.ts`
- **Purpose:** User feedback for all operations

**1.9.2 Create Loading Manager**
- **New Hook:** `hooks/useLoading.ts`
- **Purpose:** Centralized loading state management

**1.9.3 Add Form Validation**
- **Enhancement:** Add validation to all forms
- **Library:** Consider using react-hook-form with yup

---

## 🎯 Success Criteria for Phase 1

### **Week 1-2 Completion Criteria:**
- [ ] Users can log in/logout with proper error handling
- [ ] Password reset functionality works
- [ ] Email verification flow implemented
- [ ] Admin can create/manage users with Firebase Auth
- [ ] User roles and permissions enforced

### **Week 3-4 Completion Criteria:**
- [ ] Shop creation with auto-account setup works
- [ ] Account management with hierarchy functions
- [ ] Real-time data synchronization active
- [ ] All CRUD operations use Firebase services

### **Week 5-6 Completion Criteria:**
- [ ] Notification system fully functional
- [ ] Activity logging works for all actions
- [ ] Error handling and loading states everywhere
- [ ] Data integrity maintained across operations

### **Overall Phase 1 Success:**
- [ ] Complete Firebase integration for core features
- [ ] Multi-user system with proper access control
- [ ] Real-time data synchronization
- [ ] Comprehensive error handling
- [ ] Activity logging and notifications
- [ ] Foundation for Phase 2 accounting features

---

## 📚 Resources & Documentation

### **Firebase Documentation References:**
- Authentication: https://firebase.google.com/docs/auth
- Firestore: https://firebase.google.com/docs/firestore
- Security Rules: https://firebase.google.com/docs/rules

### **Code Examples Repository:**
- All code snippets above should be implemented
- Follow TypeScript best practices
- Maintain Arabic RTL interface
- Use existing component patterns

This detailed breakdown provides clear, actionable tasks for completing Phase 1 of the Firebase integration. Each task includes specific file modifications, code examples, and success criteria.