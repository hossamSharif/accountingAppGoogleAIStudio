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

const App: React.FC = () => {
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

        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
            collection(db, 'transactions'),
            where("shopId", "==", activeShop.id),
            where("date", ">=", startOfDay.toISOString()),
            where("date", "<=", endOfDay.toISOString())
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
            setDailyTransactions(data);
        });

        // Return cleanup function
        return () => unsubscribe();

    }, [activeShop, selectedDate]);
    
    const setupFirestoreListeners = (user: User) => {
        const unsubs: (() => void)[] = [];

        // Base query constraints for user vs admin
        const shopConstraint = user.role === 'user' && user.shopId ? [where("shopId", "==", user.shopId)] : [];

        // Generic listener function
        const createListener = <T,>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>, constraints: any[] = []) => {
            const q = query(collection(db, collectionName), ...constraints);
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
                setter(data);
            });
            unsubs.push(unsubscribe);
        };

        if (user.role === 'admin') {
            createListener<Shop>('shops', setShops);
            createListener<User>('users', setUsers);
        } else {
             const shopsQuery = user.shopId ? query(collection(db, 'shops'), where('__name__', '==', user.shopId)) : query(collection(db, 'shops'));
             unsubs.push(onSnapshot(shopsQuery, (snapshot) => setShops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop)))));
        }

        // Fetch all transactions for analytics and statements, but not for the dashboard's daily view
        createListener<Transaction>('transactions', setTransactions, shopConstraint);
        
        createListener<Account>('accounts', setAccounts, shopConstraint);
        createListener<FinancialYear>('financialYears', setFinancialYears, shopConstraint);

        // Logs listener: Admins see all logs, users see their own shop's logs
        const logConstraints = user.role === 'admin' ? [] : shopConstraint;
        createListener<Log>('logs', setLogs, logConstraints);

        // Notifications listener: Specific to user AND now sorted by the database
        const notificationsQuery = query(
            collection(db, 'notifications'), 
            where("userId", "==", user.id), 
            orderBy("timestamp", "desc")
        );
        unsubs.push(onSnapshot(notificationsQuery, (snapshot) => {
             const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
             setNotifications(data);
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

    // --- HANDLERS ---
    const handleAddLog = async (type: LogType, message: string, user: User | null = currentUser) => {
        if (!user) return;
        const newLog = {
            userId: user.id,
            shopId: activeShop?.id || user.shopId || null,
            type,
            timestamp: Timestamp.now().toDate().toISOString(),
            message,
        };
        await addDoc(collection(db, 'logs'), newLog);

        if (user.role !== 'admin') {
            const adminUsers = await getDoc(doc(db, 'users', 'admin')); // Assuming single admin for simplicity
            const admins = users.filter(u => u.role === 'admin');
            for (const admin of admins) {
                 const newNotification = {
                    userId: admin.id,
                    originatingUserId: user.id,
                    shopId: activeShop?.id,
                    logType: type,
                    message: `User "${user.name}" in shop "${activeShop?.name}" performed action: ${message}`,
                    isRead: false,
                    timestamp: new Date().toISOString()
                };
                await addDoc(collection(db, 'notifications'), newNotification);
            }
        }
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
        if (!activeShop) return;
        const newTransaction = { ...transaction, shopId: activeShop.id, date: selectedDate.toISOString() };
        await addDoc(collection(db, 'transactions'), newTransaction);
        await handleAddLog(LogType.ADD_ENTRY, `Added ${transaction.type} transaction for ${transaction.totalAmount}`);
    };
    
    const handleUpdateTransaction = async (updatedTransaction: Transaction) => {
        const { id, ...data } = updatedTransaction;
        await updateDoc(doc(db, 'transactions', id), data);
        await handleAddLog(LogType.EDIT_ENTRY, `Updated transaction ID ${id}`);
    };
    
    const handleDeleteTransaction = async (transactionId: string) => {
        const tx = transactions.find(t => t.id === transactionId);
        await deleteDoc(doc(db, 'transactions', transactionId));
        if (tx) await handleAddLog(LogType.DELETE_ENTRY, `Deleted transaction ${tx.description}`);
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

    // --- RENDER LOGIC ---
    if (isLoading) {
        return <div className="min-h-screen bg-background flex justify-center items-center"><div className="text-white text-xl animate-pulse">جاري التحقق من الهوية...</div></div>;
    }
    if (!currentUser) { return <LoginPage onLogin={handleLogin} />; }
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
                return <Dashboard transactions={dailyTransactions} accounts={shopData.accounts} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} openFinancialYear={shopData.financialYears.find(fy => fy.status === 'open')} onAddAccount={handleAddAccount} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />;
            case Page.ACCOUNTS:
                return <AccountsPage accounts={shopData.accounts} transactions={shopData.transactions} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onToggleAccountStatus={handleToggleAccountStatus} onDeleteAccount={handleDeleteAccount} />;
            case Page.STATEMENT:
                return <StatementPage accounts={shopData.accounts} transactions={shopData.transactions} activeShop={activeShop} />;
            case Page.SETTINGS:
                return <SettingsPage activeShop={activeShop} shops={shops} onAddShop={handleAddShop} onUpdateShop={handleUpdateShop} onToggleShopStatus={handleToggleShopStatus} users={users.filter(u => u.role === 'user')} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onToggleUserStatus={handleToggleUserStatus} onDeleteUser={handleDeleteUser} financialYears={financialYears} onAddFinancialYear={handleAddFinancialYear} onCloseFinancialYear={handleCloseFinancialYear} accounts={accounts} transactions={transactions} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onToggleAccountStatus={handleToggleAccountStatus} onDeleteAccount={handleDeleteAccount} />;
            case Page.PROFILE:
                return <ProfilePage currentUser={currentUser} onUpdateUser={handleUpdateUser} allUsers={users} />;
            case Page.SHOP_LOGS:
                 return <ShopLogsPage logs={logs.filter(l => l.shopId === activeShop?.id)} users={users} activeShop={activeShop} />;
            case Page.NOTIFICATIONS:
                return <NotificationsPage notifications={userNotifications} onMarkAllRead={handleMarkNotificationsRead} users={users} shops={shops} />;
            case Page.ANALYTICS:
                if (currentUser.role === 'admin') {
                    return <AnalyticsPage shops={shops} accounts={accounts} transactions={transactions} financialYears={financialYears} />;
                }
                return <UserAnalyticsPage transactions={shopData.transactions} accounts={shopData.accounts} />;
            default: return <h1>Page not found</h1>;
        }
    };

    return (
        <Layout activeShop={activeShop} currentUser={currentUser} page={page} setPage={setPage} onLogout={handleLogout} shops={shops} onSelectShop={handleSelectShop} notifications={userNotifications} onAddLog={handleAddLog} onMarkNotificationsRead={handleMarkNotificationsRead} dailyTransactions={dailyTransactions} accounts={accounts.filter(a => a.shopId === activeShop?.id)} selectedDate={selectedDate}>
            {renderPage()}
        </Layout>
    );
};

export default App;
