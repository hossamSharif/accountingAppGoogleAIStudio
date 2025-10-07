import { useState, useEffect } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    Unsubscribe
} from 'firebase/firestore';
import { db } from '../firebase';
import { Shop, User, Account, Transaction, FinancialYear } from '../types';

export interface ShopDataHook {
    shops: Shop[];
    loading: boolean;
    error: string | null;
    refreshShops: () => void;
    getShopStats: (shopId: string) => ShopStats | null;
}

export interface ShopStats {
    usersCount: number;
    activeUsersCount: number;
    accountsCount: number;
    transactionsCount: number;
    lastTransactionDate?: string;
    totalBalance: number;
    financialYearsCount: number;
}

export const useShopData = (currentUser?: User): ShopDataHook => {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [shopStats, setShopStats] = useState<Map<string, ShopStats>>(new Map());
    const [lastRefresh, setLastRefresh] = useState(Date.now());

    useEffect(() => {
        if (!currentUser) {
            setShops([]);
            setLoading(false);
            return;
        }

        const unsubscribers: Unsubscribe[] = [];

        try {
            // Set up shops listener
            const shopsQuery = currentUser.role === 'admin'
                ? query(collection(db, 'shops'), orderBy('name'))
                : query(
                    collection(db, 'shops'),
                    where('id', '==', currentUser.shopId || ''),
                    orderBy('name')
                );

            const unsubscribeShops = onSnapshot(
                shopsQuery,
                (snapshot) => {
                    const shopsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Shop[];

                    setShops(shopsData);

                    // Load stats for each shop
                    if (shopsData.length > 0) {
                        loadShopStats(shopsData);
                    }

                    setLoading(false);
                    setError(null);
                },
                (err) => {
                    console.error('Error listening to shops:', err);
                    setError('فشل في تحميل بيانات المتاجر');
                    setLoading(false);
                }
            );

            unsubscribers.push(unsubscribeShops);

        } catch (err: any) {
            console.error('Error setting up shop listeners:', err);
            setError('فشل في إعداد الاتصال بقاعدة البيانات');
            setLoading(false);
        }

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [currentUser, lastRefresh]);

    const loadShopStats = async (shopsList: Shop[]) => {
        try {
            const statsMap = new Map<string, ShopStats>();

            // Load stats for each shop in parallel
            const statsPromises = shopsList.map(async (shop) => {
                try {
                    const [users, accounts, transactions, financialYears] = await Promise.all([
                        // Get users for this shop
                        new Promise<User[]>((resolve) => {
                            const usersQuery = query(
                                collection(db, 'users'),
                                where('shopId', '==', shop.id)
                            );
                            const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
                                const userData = snapshot.docs.map(doc => ({
                                    id: doc.id,
                                    ...doc.data()
                                })) as User[];
                                resolve(userData);
                                unsubscribe();
                            });
                        }),

                        // Get accounts for this shop
                        new Promise<Account[]>((resolve) => {
                            const accountsQuery = query(
                                collection(db, 'accounts'),
                                where('shopId', '==', shop.id)
                            );
                            const unsubscribe = onSnapshot(accountsQuery, (snapshot) => {
                                const accountData = snapshot.docs.map(doc => ({
                                    id: doc.id,
                                    ...doc.data()
                                })) as Account[];
                                resolve(accountData);
                                unsubscribe();
                            });
                        }),

                        // Get transactions for this shop
                        new Promise<Transaction[]>((resolve) => {
                            const transactionsQuery = query(
                                collection(db, 'transactions'),
                                where('shopId', '==', shop.id),
                                orderBy('date', 'desc')
                            );
                            const unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
                                const transactionData = snapshot.docs.map(doc => ({
                                    id: doc.id,
                                    ...doc.data()
                                })) as Transaction[];
                                resolve(transactionData);
                                unsubscribe();
                            });
                        }),

                        // Get financial years for this shop
                        new Promise<FinancialYear[]>((resolve) => {
                            const fyQuery = query(
                                collection(db, 'financialYears'),
                                where('shopId', '==', shop.id)
                            );
                            const unsubscribe = onSnapshot(fyQuery, (snapshot) => {
                                const fyData = snapshot.docs.map(doc => ({
                                    id: doc.id,
                                    ...doc.data()
                                })) as FinancialYear[];
                                resolve(fyData);
                                unsubscribe();
                            });
                        })
                    ]);

                    // Calculate total balance from cash and bank accounts
                    const cashAndBankAccounts = accounts.filter(acc =>
                        acc.type === 'الصندوق' || acc.type === 'البنك'
                    );

                    const totalBalance = cashAndBankAccounts.reduce((sum, account) => {
                        // Start with opening balance
                        let accountBalance = account.openingBalance || 0;

                        // Add net effect of all transactions for this account
                        transactions.forEach(transaction => {
                            const accountEntries = transaction.entries?.filter(
                                entry => entry.accountId === account.id
                            ) || [];

                            accountEntries.forEach(entry => {
                                accountBalance += entry.amount;
                            });
                        });

                        return sum + accountBalance;
                    }, 0);

                    const activeUsers = users.filter(user => user.isActive);
                    const lastTransaction = transactions[0]; // Already ordered by date desc

                    const stats: ShopStats = {
                        usersCount: users.length,
                        activeUsersCount: activeUsers.length,
                        accountsCount: accounts.length,
                        transactionsCount: transactions.length,
                        lastTransactionDate: lastTransaction?.date,
                        totalBalance,
                        financialYearsCount: financialYears.length
                    };

                    statsMap.set(shop.id, stats);
                } catch (error) {
                    console.error(`Error loading stats for shop ${shop.id}:`, error);
                    // Set default stats for this shop
                    statsMap.set(shop.id, {
                        usersCount: 0,
                        activeUsersCount: 0,
                        accountsCount: 0,
                        transactionsCount: 0,
                        totalBalance: 0,
                        financialYearsCount: 0
                    });
                }
            });

            await Promise.all(statsPromises);
            setShopStats(statsMap);

        } catch (error) {
            console.error('Error loading shop stats:', error);
        }
    };

    const refreshShops = () => {
        setLastRefresh(Date.now());
    };

    const getShopStats = (shopId: string): ShopStats | null => {
        return shopStats.get(shopId) || null;
    };

    return {
        shops,
        loading,
        error,
        refreshShops,
        getShopStats
    };
};

// Additional hook for shop-specific real-time data
export const useShopRealTimeData = (shopId: string) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!shopId) {
            setLoading(false);
            return;
        }

        const unsubscribers: Unsubscribe[] = [];

        try {
            // Accounts listener
            const accountsQuery = query(
                collection(db, 'accounts'),
                where('shopId', '==', shopId),
                orderBy('accountCode')
            );
            const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
                setAccounts(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Account[]);
            });
            unsubscribers.push(unsubAccounts);

            // Transactions listener (last 50 transactions)
            const transactionsQuery = query(
                collection(db, 'transactions'),
                where('shopId', '==', shopId),
                orderBy('date', 'desc')
            );
            const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
                setTransactions(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Transaction[]);
            });
            unsubscribers.push(unsubTransactions);

            // Financial Years listener
            const fyQuery = query(
                collection(db, 'financialYears'),
                where('shopId', '==', shopId),
                orderBy('startDate', 'desc')
            );
            const unsubFY = onSnapshot(fyQuery, (snapshot) => {
                setFinancialYears(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as FinancialYear[]);
            });
            unsubscribers.push(unsubFY);

            // Users listener
            const usersQuery = query(
                collection(db, 'users'),
                where('shopId', '==', shopId)
            );
            const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
                setUsers(snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as User[]);
                setLoading(false);
            });
            unsubscribers.push(unsubUsers);

        } catch (error) {
            console.error('Error setting up shop real-time listeners:', error);
            setLoading(false);
        }

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [shopId]);

    return {
        accounts,
        transactions,
        financialYears,
        users,
        loading
    };
};