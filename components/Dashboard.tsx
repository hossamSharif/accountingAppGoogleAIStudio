

import React, { useMemo, useState, useEffect } from 'react';
import StatCard from './StatCard';
import DailyEntryForm from './DailyEntryForm';
import RecentTransactions from './RecentTransactions';
import OfflineTransactionsView from './OfflineTransactionsView';
import { Transaction, Account, TransactionType, FinancialYear, AccountType, Shop, LogType, User } from '../types';
import { formatCurrency } from '../utils/formatting';
import { BalanceCalculator } from '../services/balanceCalculator';
import { useTranslation } from '../i18n/useTranslation';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { OfflineManager } from '../services/offlineManager';
import { SyncService } from '../services/syncService';

const DollarSignIcon = () => <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"></path></svg>;
const ShoppingCartIcon = () => <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>;
const CreditCardIcon = () => <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;
const ProfitIcon = () => <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>;
const ChevronRightIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>;
const ChevronLeftIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>;
const CashIcon = () => <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const BankIcon = () => <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h16V4m-8 12v-5m-4 5v-5m8 5v-5M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" /></svg>;
const PlusIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>;


interface DashboardProps {
    transactions: Transaction[]; // Daily transactions for the selected date
    allTransactions: Transaction[]; // All transactions for balance calculation
    accounts: Account[];
    onAddTransaction: (transaction: Omit<Transaction, 'id' | 'shopId' | 'date'>) => void;
    onUpdateTransaction: (transaction: Transaction) => void;
    onDeleteTransaction: (transactionId: string) => void;
    openFinancialYear: FinancialYear | undefined;
    onAddAccount: (account: Omit<Account, 'id' | 'isActive' | 'shopId'>, forShopId?: string) => Account | null;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
    activeShop?: Shop | null;
    onAddLog?: (type: LogType, message: string) => void;
    user?: User | null;
    shops?: Shop[];
    onSelectShop?: (shop: Shop) => void;
}

const DateNavigator: React.FC<{selectedDate: Date, setSelectedDate: (date: Date) => void}> = ({ selectedDate, setSelectedDate }) => {
    const { t, language } = useTranslation();
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Compare with end of today
    const isFuture = selectedDate >= today;

    // Helper function to format date in YYYY-MM-DD using local timezone
    const formatDateForInput = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleDateChange = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Parse the date string as local date (YYYY-MM-DD format)
        const [year, month, day] = e.target.value.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        setSelectedDate(newDate);
    };

    const locale = language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';

    return (
        <div className="bg-surface p-3 rounded-lg shadow-md flex items-center justify-between mb-6 text-text-primary">
            {/* Previous Day Button */}
            <button onClick={() => handleDateChange(-1)} className="p-2 rounded-full hover:bg-background transition">
                <ChevronRightIcon /> {/* Correct for RTL */}
            </button>

            <div className="flex items-center gap-4 flex-grow justify-center">
                 <h3 className="font-bold hidden md:block">{selectedDate.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                <input
                    type="date"
                    value={formatDateForInput(selectedDate)}
                    onChange={handleDateSelect}
                    max={formatDateForInput(new Date())}
                    className="bg-background border border-gray-600 rounded-md p-2 text-center text-text-primary"
                    style={{colorScheme: 'dark'}}
                />
                <button onClick={() => setSelectedDate(new Date())} className="bg-primary hover:bg-primary-dark font-bold py-2 px-4 rounded-lg transition">
                    {t('dashboard.dateNavigator.today')}
                </button>
            </div>

            {/* Next Day Button */}
            <button onClick={() => handleDateChange(1)} disabled={isFuture} className="p-2 rounded-full hover:bg-background transition disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeftIcon /> {/* Correct for RTL */}
            </button>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, allTransactions, accounts, onAddTransaction, onUpdateTransaction, onDeleteTransaction, openFinancialYear, onAddAccount, selectedDate, setSelectedDate, activeShop, onAddLog, user, shops, onSelectShop }) => {
    const { t, language } = useTranslation();
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isCalculatingBalances, setIsCalculatingBalances] = useState(false);
    const [balancesCache, setBalancesCache] = useState<{ cash: number; bank: number }>({ cash: 0, bank: 0 });

    // Offline Support
    const connectionStatus = useConnectionStatus();
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [showOfflineTransactions, setShowOfflineTransactions] = useState(false);

    const handleStartEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsEntryModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsEntryModalOpen(false);
        setEditingTransaction(null);
    };

    // Update pending count
    useEffect(() => {
        const updateCount = async () => {
            if (activeShop) {
                const count = await OfflineManager.getPendingCount(activeShop.id);
                setPendingCount(count);
            }
        };

        updateCount();
        const interval = setInterval(updateCount, 5000);
        return () => clearInterval(interval);
    }, [activeShop]);

    // Manual sync handler
    const handleManualSync = async () => {
        if (!user || !activeShop || isSyncing) return;

        setIsSyncing(true);
        try {
            await SyncService.syncPendingTransactions(user, activeShop.id);
            const count = await OfflineManager.getPendingCount(activeShop.id);
            setPendingCount(count);
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // The 'transactions' prop now comes pre-filtered for the selected date from App.tsx
    const dailyTransactions = transactions;

    // Real-time balance calculation from financial year start to selected date using double-entry accounting
    const { totalCashBalance, totalBankBalance } = useMemo(() => {
        const cashAccounts = accounts.filter(a => a.type === AccountType.CASH);
        const bankAccounts = accounts.filter(a => a.type === AccountType.BANK);

        let cash = 0;
        let bank = 0;

        // Start with opening balances
        cashAccounts.forEach(acc => {
            cash += acc.openingBalance || 0;
        });

        bankAccounts.forEach(acc => {
            bank += acc.openingBalance || 0;
        });

        // Filter transactions from financial year start to selected date
        const selectedDateStr = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        const filteredTransactions = allTransactions.filter(transaction => {
            if (openFinancialYear) {
                // Only include transactions within financial year period and up to selected date
                return transaction.date >= openFinancialYear.startDate &&
                       transaction.date <= selectedDateStr;
            }
            // Fallback: if no FY is open, include transactions up to selected date
            return transaction.date <= selectedDateStr;
        });

        // Process filtered transactions to calculate balance
        filteredTransactions.forEach(transaction => {
            transaction.entries?.forEach(entry => {
                const account = accounts.find(a => a.id === entry.accountId);
                if (account) {
                    // Debit increases, Credit decreases for cash/bank accounts
                    const amount = entry.type === 'debit' ? entry.amount : -entry.amount;

                    if (account.type === AccountType.CASH) {
                        cash += amount;
                    } else if (account.type === AccountType.BANK) {
                        bank += amount;
                    }
                }
            });
        });

        // Store in cache for quick access
        setBalancesCache({ cash, bank });

        return { totalCashBalance: cash, totalBankBalance: bank };
    }, [accounts, allTransactions, selectedDate, openFinancialYear]);

    // Accrual-basis calculations (full invoice amounts)
    const totalSales = dailyTransactions.filter(t => t.type === TransactionType.SALE).reduce((sum, t) => sum + t.totalAmount, 0);
    const totalPurchases = dailyTransactions.filter(t => t.type === TransactionType.PURCHASE).reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpenses = dailyTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.totalAmount, 0);
    const accrualProfit = totalSales - totalPurchases - totalExpenses;

    // Cash-basis calculations (only actual cash/bank payments)
    const cashAccountIds = new Set(accounts.filter(a => a.type === AccountType.CASH || a.type === AccountType.BANK).map(a => a.id));

    // Calculate cash received from sales (debits to cash/bank accounts in SALE transactions)
    const cashSales = dailyTransactions
        .filter(t => t.type === TransactionType.SALE)
        .reduce((sum, t) => {
            const cashEntries = t.entries?.filter(e => cashAccountIds.has(e.accountId) && e.amount > 0) || [];
            return sum + cashEntries.reduce((entrySum, e) => entrySum + e.amount, 0);
        }, 0);

    // Calculate cash paid for purchases (credits to cash/bank accounts in PURCHASE transactions)
    const cashPurchases = dailyTransactions
        .filter(t => t.type === TransactionType.PURCHASE)
        .reduce((sum, t) => {
            const cashEntries = t.entries?.filter(e => cashAccountIds.has(e.accountId) && e.amount < 0) || [];
            return sum + Math.abs(cashEntries.reduce((entrySum, e) => entrySum + e.amount, 0));
        }, 0);

    // Expenses are always fully paid in cash
    const cashExpenses = totalExpenses;

    // Cash profit = cash received - cash paid
    const cashProfit = cashSales - cashPurchases - cashExpenses;

    const handleShopChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        if (!shops || !onSelectShop) return;
        const shopId = event.target.value;
        const selectedShop = shops.find(s => s.id === shopId);
        if (selectedShop) {
            onSelectShop(selectedShop);
        }
    };

    const activeShops = shops?.filter(s => s.isActive) || [];

    return (
        <div className="space-y-6">
            {/* Connection Status Banner - Offline */}
            {!connectionStatus.isFullyOnline && (
                <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-300 px-4 py-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-semibold">وضع عدم الاتصال</p>
                            <p className="text-sm">يمكنك متابعة العمل. سيتم المزامنة عند استعادة الاتصال.</p>
                        </div>
                    </div>
                    {pendingCount > 0 && (
                        <span className="bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">
                            {pendingCount} معلق
                        </span>
                    )}
                </div>
            )}

            {/* Sync Button - Online with pending transactions */}
            {connectionStatus.isFullyOnline && pendingCount > 0 && (
                <div className="bg-blue-500/20 border border-blue-500 text-blue-300 px-4 py-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <div>
                            <p className="font-semibold">لديك {pendingCount} معاملة بانتظار المزامنة</p>
                            <p className="text-sm">انقر للمزامنة الآن أو انتظر المزامنة التلقائية</p>
                        </div>
                    </div>
                    <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSyncing ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>جاري المزامنة...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>مزامنة الآن</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Shop Selector for Admin */}
            {user?.role === 'admin' && activeShop && shops && onSelectShop && (
                <div className="bg-surface p-4 rounded-lg shadow-md">
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                        {t('common.ui.selectShop')}
                    </label>
                    <div className="relative">
                        <select
                            value={activeShop.id}
                            onChange={handleShopChange}
                            className="w-full bg-background border border-gray-600 rounded-lg py-3 px-4 text-text-primary focus:ring-primary focus:border-primary appearance-none pr-10"
                            aria-label="Select Shop"
                        >
                            {activeShops.map(shop => (
                                <option key={shop.id} value={shop.id}>{shop.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-gray-400">
                            <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex overflow-x-auto gap-6 pb-4 custom-scrollbar">
                <div className="flex-shrink-0 w-72">
                    <StatCard title={`${t('dashboard.stats.total')} ${t('dashboard.stats.cashBalance')}`} value={formatCurrency(totalCashBalance)} icon={<CashIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title={`${t('dashboard.stats.total')} ${t('dashboard.stats.bankBalance')}`} value={formatCurrency(totalBankBalance)} icon={<BankIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title={`${t('dashboard.stats.sales')} ${t('dashboard.stats.daily')}`} value={formatCurrency(totalSales)} icon={<DollarSignIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title={`${t('dashboard.stats.purchases')} ${t('dashboard.stats.daily')}`} value={formatCurrency(totalPurchases)} icon={<ShoppingCartIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title={`${t('dashboard.stats.expenses')} ${t('dashboard.stats.daily')}`} value={formatCurrency(totalExpenses)} icon={<CreditCardIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title={t('dashboard.stats.dailyRevenue')} value={formatCurrency(Math.abs(cashProfit))} icon={<ProfitIcon />} />
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    height: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1f2937;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #4b5563;
                    border-radius: 10px;
                    border: 2px solid #1f2937;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                }
                .custom-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: #4b5563 #1f2937;
                }
            `}</style>

            <DateNavigator selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

            {/* Offline Transactions Section */}
            {pendingCount > 0 && (
                <div className="bg-surface rounded-lg shadow-md">
                    <button
                        onClick={() => setShowOfflineTransactions(!showOfflineTransactions)}
                        className="w-full p-4 flex items-center justify-between hover:bg-background/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-lg font-semibold text-text-primary">
                                {t('dashboard.offlineTransactions', language === 'ar' ? 'المعاملات غير المتصلة' : 'Offline Transactions')} ({pendingCount})
                            </span>
                        </div>
                        <svg
                            className={`w-5 h-5 text-text-secondary transform transition-transform ${showOfflineTransactions ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {showOfflineTransactions && user && activeShop && (
                        <div className="p-4 border-t border-gray-700">
                            <OfflineTransactionsView
                                user={user}
                                activeShop={activeShop}
                                onUpdate={async () => {
                                    // Update pending count after any changes
                                    const count = await OfflineManager.getPendingCount(activeShop.id);
                                    setPendingCount(count);
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            <RecentTransactions
                transactions={dailyTransactions}
                allTransactions={allTransactions}
                accounts={accounts}
                onDelete={onDeleteTransaction}
                onStartEdit={handleStartEdit}
                activeShop={activeShop}
                selectedDate={selectedDate}
                onAddLog={onAddLog}
                user={user}
            />

            <button
                onClick={() => setIsEntryModalOpen(true)}
                className="fixed bottom-8 ltr:right-8 rtl:left-8 bg-primary hover:bg-primary-dark text-white p-4 rounded-full shadow-lg z-20 transform hover:scale-110 transition-transform duration-200 flex items-center justify-center"
                aria-label={t('dashboard.actions.addTransaction')}
                title={t('dashboard.actions.addTransaction')}
            >
                <PlusIcon />
            </button>
            
            <DailyEntryForm
                isOpen={isEntryModalOpen}
                onClose={handleCloseModal}
                onAddTransaction={async (transaction) => {
                    // Store old balances
                    const oldBalances = { ...balancesCache };

                    // Add the transaction
                    await onAddTransaction(transaction);

                    // Log balance changes if significant
                    if (onAddLog && (Math.abs(balancesCache.cash - oldBalances.cash) > 0.01 || Math.abs(balancesCache.bank - oldBalances.bank) > 0.01)) {
                        await onAddLog(
                            LogType.BALANCE_CHANGE,
                            `Balance updated - Cash: ${formatCurrency(balancesCache.cash)}, Bank: ${formatCurrency(balancesCache.bank)}`
                        );
                    }
                }}
                onUpdateTransaction={async (transaction) => {
                    // Store old balances
                    const oldBalances = { ...balancesCache };

                    // Update the transaction
                    await onUpdateTransaction(transaction);

                    // Log balance changes if significant
                    if (onAddLog && (Math.abs(balancesCache.cash - oldBalances.cash) > 0.01 || Math.abs(balancesCache.bank - oldBalances.bank) > 0.01)) {
                        await onAddLog(
                            LogType.BALANCE_CHANGE,
                            `Balance updated after edit - Cash: ${formatCurrency(balancesCache.cash)}, Bank: ${formatCurrency(balancesCache.bank)}`
                        );
                    }
                }}
                transactionToEdit={editingTransaction}
                accounts={accounts.filter(a => a.isActive)}
                openFinancialYear={openFinancialYear}
                onAddAccount={onAddAccount}
                selectedDate={selectedDate}
                activeShopId={activeShop?.id}
                currentUserId={user?.id}
            />
        </div>
    );
};

export default Dashboard;
