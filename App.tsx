import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Page, User, Shop, Account, Transaction, FinancialYear, Log, Notification, LogType } from './types';
import { MAIN_ACCOUNT_DEFINITIONS } from './constants';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import AccountsPage from './pages/AccountsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import ShopLogsPage from './pages/ShopLogsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StatementPage from './pages/StatementPage';
import UserAnalyticsPage from './pages/UserAnalyticsPage';
import TransactionsPage from './pages/TransactionsPage';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    where,
    addDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    setDoc,
    Timestamp,
    orderBy
} from 'firebase/firestore';
import { NotificationService } from './services/notificationService';
import { LoggingService } from './services/loggingService';
import { usePushNotifications } from './hooks/usePushNotifications';
import NotificationPermissionPrompt from './components/NotificationPermissionPrompt';
import { I18nProvider, useI18n } from './i18n/i18nContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { OfflineManager } from './services/offlineManager';
import { SyncService } from './services/syncService';
import { useConnectionStatus } from './hooks/useConnectionStatus';

// Utility function to format date as YYYY-MM-DD (date-only string)
const formatDateOnly = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AppContent: React.FC = () => {
    const { t } = useI18n();
    // --- STATE MANAGEMENT ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeShop, setActiveShop] = useState<Shop | null>(null);
    const [page, setPage] = useState<Page>(Page.DASHBOARD);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Live Database State
    const [users, setUsers] = useState<User[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [dailyTransactions, setDailyTransactions] = useState<Transaction[]>([]);
    const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    
    const unsubscribeCallbacks = useRef<(() => void)[]>([]);

    // Push Notifications
    const pushNotifications = usePushNotifications(currentUser);
    const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

    // Offline Support
    const connectionStatus = useConnectionStatus();
    const [pendingCount, setPendingCount] = useState(0);

    // --- COMPUTED STATE ---
    // Notifications now arrive pre-sorted from Firestore
    const userNotifications = useMemo(() => notifications, [notifications]);
    
    // --- EFFECTS ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            // Clean up old listeners before setting up new ones
            unsubscribeCallbacks.current.forEach(unsub => unsub());
            unsubscribeCallbacks.current = [];

            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const appUser = { id: userDocSnap.id, ...userDocSnap.data() } as User;

                        if (appUser.isActive) {
                            setCurrentUser(appUser);
                            setupFirestoreListeners(appUser);
                        } else {
                            await signOut(auth); // Force sign out if app user is inactive
                            setCurrentUser(null);
                        }
                    } else {
                        console.error("User document not found in Firestore.");
                        await signOut(auth);
                        setCurrentUser(null);
                    }
                } catch (error) {
                    console.error("Error fetching user document:", error instanceof Error ? error.message : String(error));
                    await signOut(auth);
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
            setIsLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeCallbacks.current.forEach(unsub => unsub());
        };
    }, []);

    // New effect to listen for daily transactions specifically
    useEffect(() => {
        if (!activeShop) {
            setDailyTransactions([]);
            return;
        }

        // Format selected date as YYYY-MM-DD for comparison
        const selectedDateStr = formatDateOnly(selectedDate);

        const q = query(
            collection(db, 'transactions'),
            where("shopId", "==", activeShop.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
            // Filter by date string comparison
            const filteredData = data.filter(transaction => {
                // Handle both old ISO format and new date-only format
                const transactionDateStr = transaction.date.includes('T')
                    ? formatDateOnly(new Date(transaction.date))  // Old format: convert ISO to date-only
                    : transaction.date;  // New format: already date-only
                return transactionDateStr === selectedDateStr;
            });
            setDailyTransactions(filteredData);
        }, (error) => {
            console.error("Daily transactions listener error:", error);
            setDailyTransactions([]); // Set empty array on error to prevent crashes
        });

        // Return cleanup function
        return () => unsubscribe();

    }, [activeShop, selectedDate]);

    // Show notification prompt for admin users without push notification permission
    useEffect(() => {
        console.log('🔔 Notification Prompt Check:');
        console.log('  - Current User:', currentUser?.name || 'None');
        console.log('  - Is Admin:', currentUser?.role === 'admin');
        console.log('  - Push Supported:', pushNotifications.isSupported);
        console.log('  - Permission:', pushNotifications.permission);
        console.log('  - Has FCM Token:', !!currentUser?.fcmToken);

        if (
            currentUser &&
            currentUser.role === 'admin' &&
            pushNotifications.isSupported &&
            pushNotifications.permission === 'default' &&
            !currentUser.fcmToken
        ) {
            console.log('✅ All conditions met! Showing prompt in 3 seconds...');
            // Show prompt after 3 seconds to give user time to settle in
            const timer = setTimeout(() => {
                console.log('🎯 Displaying notification permission prompt NOW');
                setShowNotificationPrompt(true);
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            console.log('❌ Conditions not met for showing notification prompt');
        }
    }, [currentUser, pushNotifications.isSupported, pushNotifications.permission]);

    // Initialize offline manager
    useEffect(() => {
        OfflineManager.initDB().then(() => {
            console.log('✅ Offline manager initialized');
        });
    }, []);

    // Update pending count
    useEffect(() => {
        const updatePendingCount = async () => {
            if (activeShop) {
                const count = await OfflineManager.getPendingCount(activeShop.id);
                setPendingCount(count);
            }
        };

        updatePendingCount();

        // Update every 10 seconds
        const interval = setInterval(updatePendingCount, 10000);
        return () => clearInterval(interval);
    }, [activeShop]);

    // Auto-sync when connection is restored
    useEffect(() => {
        const handleReconnection = async () => {
            if (connectionStatus.isFullyOnline && currentUser && activeShop) {
                const needsSync = await SyncService.needsSync(activeShop.id);

                if (needsSync) {
                    console.log('🔄 Connection restored, starting auto-sync...');

                    try {
                        const results = await SyncService.syncPendingTransactions(
                            currentUser,
                            activeShop.id
                        );

                        if (results.success > 0) {
                            console.log(`✅ Auto-sync: ${results.success} transactions synced`);
                        }

                        // Update pending count
                        const count = await OfflineManager.getPendingCount(activeShop.id);
                        setPendingCount(count);
                    } catch (error) {
                        console.error('❌ Auto-sync failed:', error);
                    }
                }
            }
        };

        handleReconnection();
    }, [connectionStatus.isFullyOnline, currentUser, activeShop]);

    const setupFirestoreListeners = (user: User) => {
        const unsubs: (() => void)[] = [];

        // Base query constraints for user vs admin
        const shopConstraint = user.role === 'user' && user.shopId ? [where("shopId", "==", user.shopId)] : [];

        // Generic listener function with error handling
        const createListener = <T,>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>, constraints: any[] = []) => {
            const q = query(collection(db, collectionName), ...constraints);
            const unsubscribe = onSnapshot(q,
                (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
                    setter(data);
                },
                (error) => {
                    console.error(`Error in ${collectionName} listener:`, error);
                    setter([]); // Set empty array on error to prevent crashes
                }
            );
            unsubs.push(unsubscribe);
        };

        if (user.role === 'admin') {
            createListener<Shop>('shops', setShops);
            createListener<User>('users', setUsers);
        } else {
             const shopsQuery = user.shopId ? query(collection(db, 'shops'), where('__name__', '==', user.shopId)) : query(collection(db, 'shops'));
             unsubs.push(onSnapshot(shopsQuery,
                (snapshot) => setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop))),
                (error) => {
                    console.error("Shops listener error:", error);
                    setShops([]); // Set empty array on error to prevent crashes
                }
             ));
        }

        // Fetch all transactions for analytics and statements, but not for the dashboard's daily view
        createListener<Transaction>('transactions', setTransactions, shopConstraint);
        
        createListener<Account>('accounts', setAccounts, shopConstraint);
        createListener<FinancialYear>('financialYears', setFinancialYears, shopConstraint);

        // Logs listener: Admins see all logs, users see their own shop's logs
        const logConstraints = user.role === 'admin' ? [] : shopConstraint;
        createListener<Log>('logs', setLogs, logConstraints);

        // Notifications listener: Specific to user (removed orderBy to avoid index requirement)
        const notificationsQuery = query(
            collection(db, 'notifications'),
            where("userId", "==", user.id)
        );
        unsubs.push(onSnapshot(notificationsQuery, (snapshot) => {
             const data = snapshot.docs.map(doc => {
                 const docData = doc.data();
                 // Convert Firestore Timestamp to ISO string if needed
                 const timestamp = docData.timestamp?.toDate ? docData.timestamp.toDate().toISOString() : docData.timestamp;
                 return {
                     id: doc.id,
                     ...docData,
                     timestamp: timestamp || new Date().toISOString() // Fallback to current date if timestamp is missing
                 };
             }) as Notification[];
             // Sort manually to avoid index requirement
             const sortedData = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
             setNotifications(sortedData);
        }, (error) => {
            console.error("Notifications listener error:", error);
            setNotifications([]); // Set empty array on error to prevent crashes
        }));

        unsubscribeCallbacks.current = unsubs;
    };

    // Effect to set active shop after login and data fetch
    useEffect(() => {
        if (currentUser && shops.length > 0) {
            if (currentUser.role === 'admin') {
                const firstActiveShop = shops.find(s => s.isActive);
                setActiveShop(activeShop => activeShop ? shops.find(s => s.id === activeShop.id) || firstActiveShop || null : firstActiveShop || null);
            } else if (currentUser.shopId) {
                const userShop = shops.find(s => s.id === currentUser.shopId && s.isActive);
                setActiveShop(userShop || null);
            }
        } else if (!currentUser) {
            setActiveShop(null);
        }
    }, [currentUser, shops]);

    // Expose db for migration scripts (development only)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).db = db;
        }
    }, []);

    // --- HANDLERS ---
    const handleAddLog = async (type: LogType, message: string, user: User | null = currentUser) => {
        if (!user) return;

        // Use LoggingService which automatically handles admin notifications
        await LoggingService.logAction(
            user,
            type,
            message,
            activeShop?.id || user.shopId || null
        );
    };
    
    const handleLogin = async (email: string, password: string): Promise<true | string> => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error: any) {
            console.error("Firebase Login Error:", error instanceof Error ? error.message : String(error));
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                return 'البريد الإلكتروني أو كلمة المرور غير صالحة.';
            }
            return 'حدث خطأ أثناء تسجيل الدخول.';
        }
    };

    const handleLogout = async () => {
        if(currentUser) {
            await handleAddLog(LogType.LOGOUT, "User logged out.");
            await signOut(auth);
            setPage(Page.DASHBOARD);
        }
    };
    
    const handleSelectShop = (shop: Shop | null) => { setActiveShop(shop); setPage(Page.DASHBOARD); }
    
    const handleAddTransaction = async (transaction: Omit<Transaction, 'id' | 'shopId' | 'date'>) => {
        if (!activeShop || !currentUser) return;
        const newTransaction = { ...transaction, shopId: activeShop.id, date: formatDateOnly(selectedDate) };
        const docRef = await addDoc(collection(db, 'transactions'), newTransaction);

        // Log and notify admins with detailed information
        const message = `Added ${transaction.type} transaction for ${transaction.totalAmount} SD - ${transaction.description || 'No description'}`;
        await handleAddLog(LogType.ADD_ENTRY, message);

        // Send real-time notification to admins
        if (currentUser.role !== 'admin') {
            const currencySymbol = t('currency.symbol', {}, 'common');
            await NotificationService.notifyAdminsOfSystemEvent(
                `معاملة جديدة في ${activeShop.name}: (${transaction.type}) - ${transaction.totalAmount} ${currencySymbol}`,
                LogType.ADD_ENTRY,
                activeShop.id
            );
        }
    };

    const handleUpdateTransaction = async (updatedTransaction: Transaction) => {
        if (!activeShop || !currentUser) return;
        const { id, ...data } = updatedTransaction;

        // Get original transaction for comparison
        const originalTx = transactions.find(t => t.id === id);
        await updateDoc(doc(db, 'transactions', id), data);

        // Log with details about what changed
        const message = originalTx
            ? `Updated ${originalTx.type} transaction from ${originalTx.totalAmount} to ${updatedTransaction.totalAmount} SD`
            : `Updated transaction ID ${id}`;
        await handleAddLog(LogType.EDIT_ENTRY, message);

        // Send real-time notification to admins
        if (currentUser.role !== 'admin') {
            const txType = updatedTransaction.type || (originalTx ? originalTx.type : '');
            const currencySymbol = t('currency.symbol', {}, 'common');
            await NotificationService.notifyAdminsOfSystemEvent(
                `تعديل معاملة في ${activeShop.name}: (${txType}) - ${updatedTransaction.totalAmount} ${currencySymbol}`,
                LogType.EDIT_ENTRY,
                activeShop.id
            );
        }
    };

    const handleDeleteTransaction = async (transactionId: string) => {
        if (!activeShop || !currentUser) return;
        const tx = transactions.find(t => t.id === transactionId);
        await deleteDoc(doc(db, 'transactions', transactionId));

        if (tx) {
            const message = `Deleted ${tx.type} transaction: ${tx.description} - ${tx.totalAmount} SD`;
            await handleAddLog(LogType.DELETE_ENTRY, message);

            // Send real-time notification to admins
            if (currentUser.role !== 'admin') {
                const currencySymbol = t('currency.symbol', {}, 'common');
                await NotificationService.notifyAdminsOfSystemEvent(
                    `حذف معاملة في ${activeShop.name}: (${tx.type}) - ${tx.totalAmount} ${currencySymbol}`,
                    LogType.DELETE_ENTRY,
                    activeShop.id
                );
            }
        }
    };
    
    const handleAddAccount = async (accountData: Omit<Account, 'id' | 'shopId' | 'isActive'>, forShopId?: string): Promise<Account | null> => {
        const targetShopId = forShopId || activeShop?.id;
        if (!targetShopId) return null;
        const newAccountData = { ...accountData, shopId: targetShopId, isActive: true };
        const docRef = await addDoc(collection(db, 'accounts'), newAccountData);
        return { ...newAccountData, id: docRef.id };
    }

    const handleUpdateAccount = async (updatedAccount: Account) => {
        const { id, ...data } = updatedAccount;
        await updateDoc(doc(db, 'accounts', id), data);
    };

    const handleToggleAccountStatus = async (accountId: string) => {
        const account = accounts.find(a => a.id === accountId);
        if(account) await updateDoc(doc(db, 'accounts', accountId), { isActive: !account.isActive });
    };
    
    const handleDeleteAccount = async (accountId: string) => {
        const acc = accounts.find(a => a.id === accountId);
        if (acc) {
            await deleteDoc(doc(db, 'accounts', accountId));
            await handleAddLog(LogType.DELETE_ACCOUNT, `Deleted account "${acc.name}"`);
        }
    };

    const handleAddShop = async (shopData: Omit<Shop, 'id'>) => {
        const newShopRef = doc(collection(db, 'shops'));
        const batch = writeBatch(db);
        batch.set(newShopRef, shopData);
        MAIN_ACCOUNT_DEFINITIONS.forEach(def => {
            const accountRef = doc(collection(db, 'accounts'));
            batch.set(accountRef, { ...def, shopId: newShopRef.id, isActive: true });
        });
        await batch.commit();
    };

    const handleUpdateShop = async (updatedShop: Shop) => {
        const { id, ...data } = updatedShop;
        await updateDoc(doc(db, 'shops', id), data);
    };

    const handleToggleShopStatus = async (shopId: string) => {
        const shop = shops.find(s => s.id === shopId);
        if(shop) await updateDoc(doc(db, 'shops', shopId), { isActive: !shop.isActive });
    };
    
    const handleAddUser = async (userData: Omit<User, 'role' | 'isActive'>) => {
        const { id, ...data } = userData;
        const newUser: Omit<User, 'id'> = { ...data, role: 'user', isActive: true };
        await setDoc(doc(db, "users", id), newUser);
    };

    const handleUpdateUser = async (updatedUser: User) => {
        const { id, ...data } = updatedUser;
        await updateDoc(doc(db, 'users', id), data);
        if (currentUser && currentUser.id === updatedUser.id) {
            setCurrentUser(updatedUser);
        }
    };
    
    const handleToggleUserStatus = async (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (user) await updateDoc(doc(db, 'users', userId), { isActive: !user.isActive });
    };

    const handleDeleteUser = async (userId: string) => {
        // Note: This only deletes the Firestore user doc, not the Auth user.
        // This must be done manually in the Firebase console for security.
        await deleteDoc(doc(db, 'users', userId));
    };
    
    const handleAddFinancialYear = async (fyData: Omit<FinancialYear, 'id' | 'status'>) => {
        await addDoc(collection(db, 'financialYears'), { ...fyData, status: 'open' });
    };
    
    const handleCloseFinancialYear = async (fyId: string, closingStockValue: number) => {
        await updateDoc(doc(db, 'financialYears', fyId), { status: 'closed', closingStockValue });
    };
    
    const handleMarkNotificationsRead = async () => {
        if (!currentUser) return;
        const unread = notifications.filter(n => !n.isRead);
        const batch = writeBatch(db);
        unread.forEach(n => {
            batch.update(doc(db, 'notifications', n.id), { isRead: true });
        });
        await batch.commit();
    };

    const handleDeleteNotifications = async (notificationIds: string[]) => {
        if (!currentUser || currentUser.role !== 'admin') {
            console.error('Only admins can delete notifications');
            return;
        }

        try {
            const batch = writeBatch(db);
            notificationIds.forEach(id => {
                batch.delete(doc(db, 'notifications', id));
            });
            await batch.commit();

            await LoggingService.logAction(
                currentUser,
                LogType.USER_ACTION,
                `Deleted ${notificationIds.length} notification(s)`,
                activeShop?.id
            );
        } catch (error) {
            console.error('Error deleting notifications:', error);
            throw error;
        }
    };

    const handleDeleteLogs = async (logIds: string[]) => {
        if (!currentUser || currentUser.role !== 'admin') {
            console.error('Only admins can delete logs');
            return;
        }

        try {
            const batch = writeBatch(db);
            logIds.forEach(id => {
                batch.delete(doc(db, 'logs', id));
            });
            await batch.commit();

            await LoggingService.logAction(
                currentUser,
                LogType.USER_ACTION,
                `Deleted ${logIds.length} log record(s)`,
                activeShop?.id
            );
        } catch (error) {
            console.error('Error deleting logs:', error);
            throw error;
        }
    };


    // --- RENDER LOGIC ---
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex justify-center items-center">
                <div className="text-white text-xl animate-pulse">جاري التحقق من الهوية...</div>
            </div>
        );
    }

    if (!currentUser) {
        return <LoginPage onLogin={handleLogin} />;
    }
    if (!activeShop && currentUser.role === 'user') {
         return <div className="min-h-screen bg-background flex flex-col justify-center items-center text-text-primary">
            <h1 className="text-2xl font-bold">الحساب أو المتجر غير نشط</h1>
            <p className="text-text-secondary mt-2">قد يكون متجرك المخصص غير نشط أو ليس لديك متجر معين. يرجى الاتصال بالمسؤول.</p>
            <button onClick={handleLogout} className="mt-6 bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">تسجيل الخروج</button>
        </div>
    }

    const renderPage = () => {
        const shopData = {
            transactions: transactions.filter(t => t.shopId === activeShop?.id),
            accounts: accounts.filter(a => a.shopId === activeShop?.id),
            financialYears: financialYears.filter(fy => fy.shopId === activeShop?.id)
        };
        
        switch (page) {
            case Page.DASHBOARD:
                // Pass the new dailyTransactions state to the Dashboard
                // Also pass ALL transactions for accurate balance calculation
                return <Dashboard transactions={dailyTransactions} allTransactions={shopData.transactions} accounts={shopData.accounts} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} openFinancialYear={shopData.financialYears.find(fy => fy.status === 'open')} onAddAccount={handleAddAccount} selectedDate={selectedDate} setSelectedDate={setSelectedDate} activeShop={activeShop} onAddLog={handleAddLog} user={currentUser} shops={shops} onSelectShop={handleSelectShop} />;
            case Page.ACCOUNTS:
                return <AccountsPage />;
            case Page.STATEMENT:
                return <StatementPage
                    accounts={accounts}
                    transactions={transactions}
                    activeShop={activeShop}
                    shops={shops}
                    currentUser={currentUser}
                    onUpdateTransaction={handleUpdateTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onAddAccount={handleAddAccount}
                    openFinancialYear={financialYears.find(fy => fy.shopId === activeShop?.id && fy.status === 'open')}
                    financialYears={financialYears}
                />;
            case Page.TRANSACTIONS:
                return <TransactionsPage user={currentUser} activeShop={activeShop} shops={shops} accounts={accounts} onNavigate={setPage} onAddLog={handleAddLog} onDeleteTransaction={handleDeleteTransaction} onUpdateTransaction={handleUpdateTransaction} financialYears={financialYears} onAddAccount={handleAddAccount} />;
            case Page.SETTINGS:
                return <SettingsPage currentUser={currentUser} activeShop={activeShop} shops={shops} onAddShop={handleAddShop} onUpdateShop={handleUpdateShop} onToggleShopStatus={handleToggleShopStatus} users={users.filter(u => u.role === 'user')} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onToggleUserStatus={handleToggleUserStatus} onDeleteUser={handleDeleteUser} financialYears={financialYears} onAddFinancialYear={handleAddFinancialYear} onCloseFinancialYear={handleCloseFinancialYear} accounts={accounts} transactions={transactions} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onToggleAccountStatus={handleToggleAccountStatus} onDeleteAccount={handleDeleteAccount} />;
            case Page.PROFILE:
                return <ProfilePage currentUser={currentUser} onUpdateUser={handleUpdateUser} allUsers={users} />;
            case Page.SHOP_LOGS:
                 return <ShopLogsPage logs={logs} users={users} activeShop={activeShop} shops={shops} currentUser={currentUser} onDeleteLogs={handleDeleteLogs} />;
            case Page.NOTIFICATIONS:
                return <NotificationsPage notifications={userNotifications} onMarkAllRead={handleMarkNotificationsRead} onDeleteNotifications={handleDeleteNotifications} users={users} shops={shops} currentUser={currentUser} />;
            case Page.ANALYTICS:
                if (currentUser.role === 'admin') {
                    return <AnalyticsPage shops={shops} accounts={accounts} transactions={transactions} financialYears={financialYears} />;
                }
                return <UserAnalyticsPage transactions={shopData.transactions} accounts={shopData.accounts} financialYears={shopData.financialYears} />;
            default: return <h1>Page not found</h1>;
        }
    };

    return (
        <>
            <Layout activeShop={activeShop} currentUser={currentUser} page={page} setPage={setPage} onLogout={handleLogout} shops={shops} onSelectShop={handleSelectShop} notifications={userNotifications} onAddLog={handleAddLog} onMarkNotificationsRead={handleMarkNotificationsRead}>
                {renderPage()}
            </Layout>

            {/* Push Notification Permission Prompt */}
            {showNotificationPrompt && pushNotifications.isSupported && (
                <NotificationPermissionPrompt
                    onRequestPermission={async () => {
                        const token = await pushNotifications.requestPermission();
                        if (token) {
                            setShowNotificationPrompt(false);
                        }
                        return token;
                    }}
                    onDismiss={() => setShowNotificationPrompt(false)}
                    isLoading={pushNotifications.isLoading}
                />
            )}
        </>
    );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <I18nProvider>
                <AppContent />
            </I18nProvider>
        </ThemeProvider>
    );
};

export default App;
