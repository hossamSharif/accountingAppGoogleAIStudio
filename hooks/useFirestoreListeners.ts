import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Shop, Account, Transaction, FinancialYear, Log, Notification } from '../types';

interface FirestoreData {
    users: User[];
    shops: Shop[];
    accounts: Account[];
    transactions: Transaction[];
    financialYears: FinancialYear[];
    logs: Log[];
    notifications: Notification[];
}

interface UseFirestoreListenersOptions {
    includeUsers?: boolean;
    includeShops?: boolean;
    includeAccounts?: boolean;
    includeTransactions?: boolean;
    includeFinancialYears?: boolean;
    includeLogs?: boolean;
    includeNotifications?: boolean;
}

export const useFirestoreListeners = (
    user: User | null,
    options: UseFirestoreListenersOptions = {}
) => {
    const [data, setData] = useState<FirestoreData>({
        users: [],
        shops: [],
        accounts: [],
        transactions: [],
        financialYears: [],
        logs: [],
        notifications: []
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const {
        includeUsers = true,
        includeShops = true,
        includeAccounts = true,
        includeTransactions = true,
        includeFinancialYears = true,
        includeLogs = false,
        includeNotifications = true
    } = options;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubscribers: (() => void)[] = [];
        setLoading(true);
        setError(null);

        try {
            // Set up listeners based on user role
            if (user.role === 'admin') {
                // Admin gets all data
                setupAdminListeners(unsubscribers, setData, {
                    includeUsers,
                    includeShops,
                    includeAccounts,
                    includeTransactions,
                    includeFinancialYears,
                    includeLogs,
                    includeNotifications
                });
            } else {
                // User gets shop-specific data
                setupUserListeners(user.shopId || '', unsubscribers, setData, {
                    includeUsers,
                    includeShops,
                    includeAccounts,
                    includeTransactions,
                    includeFinancialYears,
                    includeLogs,
                    includeNotifications
                });
            }

            setLoading(false);
        } catch (err) {
            console.error('Error setting up Firestore listeners:', err);
            setError('فشل في الاتصال بقاعدة البيانات');
            setLoading(false);
        }

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [user, includeUsers, includeShops, includeAccounts, includeTransactions, includeFinancialYears, includeLogs, includeNotifications]);

    return { data, loading, error };
};

// Setup listeners for admin users (all data)
const setupAdminListeners = (
    unsubscribers: (() => void)[],
    setData: React.Dispatch<React.SetStateAction<FirestoreData>>,
    options: UseFirestoreListenersOptions
) => {
    if (options.includeUsers) {
        const usersUnsubscribe = onSnapshot(
            query(collection(db, 'users'), orderBy('name')),
            (snapshot) => {
                const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setData(prev => ({ ...prev, users }));
            },
            (error) => {
                console.error('Error listening to users:', error);
            }
        );
        unsubscribers.push(usersUnsubscribe);
    }

    if (options.includeShops) {
        const shopsUnsubscribe = onSnapshot(
            query(collection(db, 'shops'), orderBy('name')),
            (snapshot) => {
                const shops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
                setData(prev => ({ ...prev, shops }));
            },
            (error) => {
                console.error('Error listening to shops:', error);
            }
        );
        unsubscribers.push(shopsUnsubscribe);
    }

    if (options.includeAccounts) {
        const accountsUnsubscribe = onSnapshot(
            query(collection(db, 'accounts'), orderBy('accountCode')),
            (snapshot) => {
                const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
                setData(prev => ({ ...prev, accounts }));
            },
            (error) => {
                console.error('Error listening to accounts:', error);
            }
        );
        unsubscribers.push(accountsUnsubscribe);
    }

    if (options.includeTransactions) {
        const transactionsUnsubscribe = onSnapshot(
            query(collection(db, 'transactions'), orderBy('date', 'desc')),
            (snapshot) => {
                const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                setData(prev => ({ ...prev, transactions }));
            },
            (error) => {
                console.error('Error listening to transactions:', error);
            }
        );
        unsubscribers.push(transactionsUnsubscribe);
    }

    if (options.includeFinancialYears) {
        const financialYearsUnsubscribe = onSnapshot(
            query(collection(db, 'financialYears'), orderBy('startDate', 'desc')),
            (snapshot) => {
                const financialYears = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialYear));
                setData(prev => ({ ...prev, financialYears }));
            },
            (error) => {
                console.error('Error listening to financial years:', error);
            }
        );
        unsubscribers.push(financialYearsUnsubscribe);
    }

    if (options.includeLogs) {
        const logsUnsubscribe = onSnapshot(
            query(collection(db, 'logs'), orderBy('timestamp', 'desc')),
            (snapshot) => {
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
                setData(prev => ({ ...prev, logs }));
            },
            (error) => {
                console.error('Error listening to logs:', error);
            }
        );
        unsubscribers.push(logsUnsubscribe);
    }

    if (options.includeNotifications) {
        const notificationsUnsubscribe = onSnapshot(
            query(collection(db, 'notifications'), orderBy('timestamp', 'desc')),
            (snapshot) => {
                const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
                setData(prev => ({ ...prev, notifications }));
            },
            (error) => {
                console.error('Error listening to notifications:', error);
            }
        );
        unsubscribers.push(notificationsUnsubscribe);
    }
};

// Setup listeners for regular users (shop-specific data)
const setupUserListeners = (
    shopId: string,
    unsubscribers: (() => void)[],
    setData: React.Dispatch<React.SetStateAction<FirestoreData>>,
    options: UseFirestoreListenersOptions
) => {
    if (!shopId) {
        console.warn('No shopId provided for user listeners');
        return;
    }

    if (options.includeUsers) {
        const usersUnsubscribe = onSnapshot(
            query(
                collection(db, 'users'),
                where('shopId', '==', shopId),
                orderBy('name')
            ),
            (snapshot) => {
                const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setData(prev => ({ ...prev, users }));
            },
            (error) => {
                console.error('Error listening to shop users:', error);
            }
        );
        unsubscribers.push(usersUnsubscribe);
    }

    if (options.includeShops) {
        const shopsUnsubscribe = onSnapshot(
            query(
                collection(db, 'shops'),
                where('__name__', '==', shopId) // Get only this shop
            ),
            (snapshot) => {
                const shops = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
                setData(prev => ({ ...prev, shops }));
            },
            (error) => {
                console.error('Error listening to user shop:', error);
            }
        );
        unsubscribers.push(shopsUnsubscribe);
    }

    if (options.includeAccounts) {
        const accountsUnsubscribe = onSnapshot(
            query(
                collection(db, 'accounts'),
                where('shopId', '==', shopId),
                orderBy('accountCode')
            ),
            (snapshot) => {
                const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
                setData(prev => ({ ...prev, accounts }));
            },
            (error) => {
                console.error('Error listening to shop accounts:', error);
            }
        );
        unsubscribers.push(accountsUnsubscribe);
    }

    if (options.includeTransactions) {
        const transactionsUnsubscribe = onSnapshot(
            query(
                collection(db, 'transactions'),
                where('shopId', '==', shopId),
                orderBy('date', 'desc')
            ),
            (snapshot) => {
                const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                setData(prev => ({ ...prev, transactions }));
            },
            (error) => {
                console.error('Error listening to shop transactions:', error);
            }
        );
        unsubscribers.push(transactionsUnsubscribe);
    }

    if (options.includeFinancialYears) {
        const financialYearsUnsubscribe = onSnapshot(
            query(
                collection(db, 'financialYears'),
                where('shopId', '==', shopId),
                orderBy('startDate', 'desc')
            ),
            (snapshot) => {
                const financialYears = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialYear));
                setData(prev => ({ ...prev, financialYears }));
            },
            (error) => {
                console.error('Error listening to shop financial years:', error);
            }
        );
        unsubscribers.push(financialYearsUnsubscribe);
    }

    if (options.includeLogs) {
        const logsUnsubscribe = onSnapshot(
            query(
                collection(db, 'logs'),
                where('shopId', '==', shopId),
                orderBy('timestamp', 'desc')
            ),
            (snapshot) => {
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));
                setData(prev => ({ ...prev, logs }));
            },
            (error) => {
                console.error('Error listening to shop logs:', error);
            }
        );
        unsubscribers.push(logsUnsubscribe);
    }

    if (options.includeNotifications) {
        const notificationsUnsubscribe = onSnapshot(
            query(
                collection(db, 'notifications'),
                where('userId', '==', shopId), // Assuming notifications are user-specific
                orderBy('timestamp', 'desc')
            ),
            (snapshot) => {
                const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
                setData(prev => ({ ...prev, notifications }));
            },
            (error) => {
                console.error('Error listening to user notifications:', error);
            }
        );
        unsubscribers.push(notificationsUnsubscribe);
    }
};

export default useFirestoreListeners;