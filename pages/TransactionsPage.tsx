import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, TransactionType, Account, Shop, LogType, User, Page, FinancialYear, AccountType } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatting';
import { exportTableToPDFEnhanced } from '../utils/pdfExportEnhanced';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import DailyEntryForm from '../components/DailyEntryForm';
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, transactionTypeTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

interface TransactionsPageProps {
    user: User | null;
    activeShop: Shop | null;
    shops: Shop[];
    accounts: Account[];
    onNavigate: (page: Page) => void;
    onAddLog?: (type: LogType, message: string) => void;
    onDeleteTransaction: (transactionId: string) => void;
    onUpdateTransaction: (transaction: Transaction) => void;
    financialYears?: FinancialYear[];
    onAddAccount?: (account: Omit<Account, 'id' | 'shopId' | 'createdAt' | 'updatedAt'>) => void;
}

// Icons
const FilterIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

const ShareIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);

const ExportIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const SearchIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const TransactionsPage: React.FC<TransactionsPageProps> = ({
    user,
    activeShop,
    shops,
    accounts,
    onNavigate,
    onAddLog,
    onDeleteTransaction,
    onUpdateTransaction,
    financialYears = [],
    onAddAccount
}) => {
    const { t, language } = useTranslation();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        transactionId: string | null;
        transactionDescription: string;
    }>({
        isOpen: false,
        transactionId: null,
        transactionDescription: ''
    });
    const [filters, setFilters] = useState({
        type: 'all' as TransactionType | 'all',
        shopId: 'all' as string,
        startDate: '',
        endDate: '',
        searchTerm: '',
        minAmount: '',
        maxAmount: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const transactionsPerPage = 20;

    // Check if user is admin
    const isAdmin = user?.role === 'admin';

    // Load transactions based on filters
    useEffect(() => {
        loadTransactions();
    }, [filters.shopId, filters.startDate, filters.endDate]);

    const loadTransactions = async () => {
        setLoading(true);
        try {
            let q;
            const constraints = [];

            // Base query based on user role
            if (isAdmin && filters.shopId !== 'all') {
                // Admin with specific shop filter
                constraints.push(where('shopId', '==', filters.shopId));
            } else if (!isAdmin && user?.shopId) {
                // Regular user - only their shop
                constraints.push(where('shopId', '==', user.shopId));
            } else if (isAdmin) {
                // Admin viewing all shops - no shop constraint
            }

            // Date range filter
            if (filters.startDate) {
                const startTimestamp = Timestamp.fromDate(new Date(filters.startDate));
                constraints.push(where('date', '>=', startTimestamp.toDate().toISOString()));
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                const endTimestamp = Timestamp.fromDate(endDate);
                constraints.push(where('date', '<=', endTimestamp.toDate().toISOString()));
            }

            // Apply constraints
            q = query(
                collection(db, 'transactions'),
                ...constraints,
                orderBy('date', 'desc'),
                limit(500)
            );

            const querySnapshot = await getDocs(q);
            const loadedTransactions: Transaction[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                loadedTransactions.push({
                    id: doc.id,
                    ...data
                } as Transaction);
            });

            setTransactions(loadedTransactions);
            // Removed automatic logging when loading transactions to reduce log noise
        } catch (error) {
            console.error('Error loading transactions:', error);
            onAddLog?.(LogType.SYSTEM_ERROR, 'فشل تحميل الحركات');
        } finally {
            setLoading(false);
        }
    };

    // Filter transactions based on all criteria
    const filteredTransactions = useMemo(() => {
        let filtered = [...transactions];

        // Type filter
        if (filters.type !== 'all') {
            filtered = filtered.filter(t => t.type === filters.type);
        }

        // Search filter
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.description?.toLowerCase().includes(term) ||
                getTransactionContextName(t).toLowerCase().includes(term)
            );
        }

        // Amount range filter
        if (filters.minAmount) {
            const min = parseFloat(filters.minAmount);
            filtered = filtered.filter(t => t.totalAmount >= min);
        }
        if (filters.maxAmount) {
            const max = parseFloat(filters.maxAmount);
            filtered = filtered.filter(t => t.totalAmount <= max);
        }

        return filtered;
    }, [transactions, filters]);

    // Pagination
    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * transactionsPerPage;
        return filteredTransactions.slice(startIndex, startIndex + transactionsPerPage);
    }, [filteredTransactions, currentPage]);

    const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

    // Helper functions
    const getAccountName = (accountId: string | undefined) => {
        if (!accountId) return t('transactions.context.unknown');
        const account = accounts.find(a => a.id === accountId);
        return account ? getBilingualText(account.name, account.nameEn, language) : t('transactions.context.unknown');
    };

    const getShopName = (shopId: string) => {
        const shop = shops.find(s => s.id === shopId);
        return shop ? getBilingualText(shop.name, shop.nameEn, language) : t('transactions.context.unknown');
    };

    const getTransactionContextName = (tx: Transaction) => {
        if (tx.type === TransactionType.TRANSFER) {
            const fromAccount = getAccountName(tx.entries.find(e => e.amount < 0)?.accountId);
            const toAccount = getAccountName(tx.entries.find(e => e.amount > 0)?.accountId);
            return t('transactions.context.transfer', { from: fromAccount, to: toAccount });
        }
        if (tx.partyId) return getAccountName(tx.partyId);
        if (tx.categoryId) return getAccountName(tx.categoryId);
        return t('transactions.context.general');
    };

    const getTransactionTypeStyle = (type: TransactionType) => {
        switch (type) {
            case TransactionType.SALE:
                return 'bg-green-500/20 text-green-400';
            case TransactionType.PURCHASE:
                return 'bg-yellow-500/20 text-yellow-400';
            case TransactionType.EXPENSE:
                return 'bg-red-500/20 text-red-400';
            case TransactionType.TRANSFER:
                return 'bg-blue-500/20 text-blue-400';
            default:
                return 'bg-gray-500/20 text-gray-400';
        }
    };

    // Export to PDF
    const generatePDFReport = async () => {
        try {
            const currencySymbol = t('currency.symbol', {}, 'common');
            const formatCurrencyForPDF = (amount: number) => `${formatNumber(amount, 0)} ${currencySymbol}`;
            const getAccount = (accountId: string | undefined) => accounts.find(a => a.id === accountId);

            // Get payment source
            const getPaymentSource = (t: Transaction): string => {
                const cashEntry = t.entries.find(e => {
                    const acc = getAccount(e.accountId);
                    return acc?.type === AccountType.CASH;
                });
                const bankEntry = t.entries.find(e => {
                    const acc = getAccount(e.accountId);
                    return acc?.type === AccountType.BANK;
                });

                if (cashEntry) return 'نقدي';
                if (bankEntry) return 'بنك';
                return '-';
            };

            // Calculate summary
            const totalSales = filteredTransactions.filter(t => t.type === TransactionType.SALE)
                .reduce((sum, t) => sum + t.totalAmount, 0);
            const totalPurchases = filteredTransactions.filter(t => t.type === TransactionType.PURCHASE)
                .reduce((sum, t) => sum + t.totalAmount, 0);
            const totalExpenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE)
                .reduce((sum, t) => sum + t.totalAmount, 0);
            // حساب الربح: المبيعات - المشتريات - المصروفات (نفس طريقة حساب الربح في Dashboard)
            const totalProfit = totalSales - totalPurchases - totalExpenses;

            // Calculate current balances from ALL filtered transactions using double-entry accounting
            const cashAccounts = accounts.filter(a => a.type === AccountType.CASH);
            const bankAccounts = accounts.filter(a => a.type === AccountType.BANK);
            const customerAccounts = accounts.filter(a => a.type === AccountType.CUSTOMER);
            const supplierAccounts = accounts.filter(a => a.type === AccountType.SUPPLIER);

            // Start with opening balances and process all transactions
            let totalCash = cashAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
            let totalBank = bankAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
            let totalCustomers = customerAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
            let totalSuppliers = supplierAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);

            // Process all filtered transaction entries
            filteredTransactions.forEach(transaction => {
                transaction.entries?.forEach(entry => {
                    const account = accounts.find(a => a.id === entry.accountId);
                    if (account) {
                        const amount = entry.type === 'debit' ? entry.amount : -entry.amount;

                        if (account.type === AccountType.CASH) {
                            totalCash += amount;
                        } else if (account.type === AccountType.BANK) {
                            totalBank += amount;
                        } else if (account.type === AccountType.CUSTOMER) {
                            totalCustomers += amount;
                        } else if (account.type === AccountType.SUPPLIER) {
                            totalSuppliers += amount;
                        }
                    }
                });
            });

            // Prepare headers: م | النوع | البيان | الوصف | التاريخ | المصدر | صادر | وارد
            const headers = isAdmin
                ? ['م', 'المتجر', 'النوع', 'البيان', 'الوصف', 'التاريخ', 'المصدر', 'صادر', 'وارد']
                : ['م', 'النوع', 'البيان', 'الوصف', 'التاريخ', 'المصدر', 'صادر', 'وارد'];

            // Prepare data
            const tableData = filteredTransactions.slice(0, 100).map((t, index) => {
                const typeText = t.type === TransactionType.SALE ? 'مبيعات' :
                    t.type === TransactionType.PURCHASE ? 'مشتريات' :
                    t.type === TransactionType.EXPENSE ? 'مصروفات' :
                    t.type === TransactionType.TRANSFER ? 'تحويل' : t.type;

                const dateFormatted = new Date(t.date).toLocaleDateString('ar-EG-u-nu-latn', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });

                // صادر/وارد logic
                let outgoing = '-';
                let incoming = '-';

                if (t.type === TransactionType.SALE) {
                    incoming = formatCurrencyForPDF(t.totalAmount);
                } else if (t.type === TransactionType.PURCHASE || t.type === TransactionType.EXPENSE) {
                    outgoing = formatCurrencyForPDF(t.totalAmount);
                } else {
                    outgoing = formatCurrencyForPDF(t.totalAmount);
                }

                const baseRow = [
                    (index + 1).toString(),
                    typeText,
                    getTransactionContextName(t),
                    t.description || '-',
                    dateFormatted,
                    getPaymentSource(t),
                    outgoing,
                    incoming
                ];

                if (isAdmin) {
                    return [(index + 1).toString(), getShopName(t.shopId), ...baseRow.slice(1)];
                }
                return baseRow;
            });

            // Title with period
            const title = isAdmin ? 'تقرير شامل للحركات المالية - جميع المتاجر' : `تقرير شامل للحركات المالية - ${activeShop?.name}`;
            const dateRange = `${filters.startDate || 'البداية'} - ${filters.endDate || 'النهاية'}`;

            // Shop info line
            const shopInfo = activeShop
                ? `المتجر: ${activeShop.name}${activeShop.code ? ` (${activeShop.code})` : ''} | المستخدم: ${user?.name || 'غير محدد'} | الفترة: ${dateRange}`
                : `المستخدم: ${user?.name || 'غير محدد'} | الفترة: ${dateRange}`;

            // Summary - 2 rows (4 items)
            const summary = [
                { label: 'إجمالي المبيعات', value: formatCurrencyForPDF(totalSales) },
                { label: 'إجمالي المشتريات', value: formatCurrencyForPDF(totalPurchases) },
                { label: 'إجمالي المصروفات', value: formatCurrencyForPDF(totalExpenses) },
                { label: 'الربح', value: formatCurrencyForPDF(totalProfit) }
            ];

            // Calculate column totals for صادر and وارد
            let totalOutgoing = 0;
            let totalIncoming = 0;

            filteredTransactions.slice(0, 100).forEach(t => {
                if (t.type === TransactionType.SALE) {
                    totalIncoming += t.totalAmount;
                } else if (t.type === TransactionType.PURCHASE || t.type === TransactionType.EXPENSE) {
                    totalOutgoing += t.totalAmount;
                } else {
                    totalOutgoing += t.totalAmount;
                }
            });

            // Balance cards
            const balanceCards = [
                { title: 'الرصيد النقدي', value: formatCurrencyForPDF(totalCash), color: '#e3f2fd' },
                { title: 'الرصيد البنكي', value: formatCurrencyForPDF(totalBank), color: '#f3e5f5' },
                { title: 'رصيد العملاء', value: formatCurrencyForPDF(totalCustomers), color: '#e8f5e9' },
                { title: 'رصيد الموردين', value: formatCurrencyForPDF(totalSuppliers), color: '#fff3e0' }
            ];

            await exportTableToPDFEnhanced(
                headers,
                tableData,
                title,
                `transactions_report_${new Date().toISOString().split('T')[0]}.pdf`,
                {
                    shopInfo,
                    summary,
                    orientation: 'portrait',
                    balanceCards,
                    balanceCardsTitle: 'الأرصدة الحالية'
                }
            );

            onAddLog?.(LogType.EXPORT_REPORT, 'تم تصدير تقرير الحركات كملف PDF');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('حدث خطأ أثناء تصدير التقرير');
        }
    };

    // Handle edit
    const handleStartEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setSelectedDate(new Date(transaction.date));
        setShowEditModal(true);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setEditingTransaction(null);
    };

    const handleUpdateTransactionWithRefresh = async (updatedTransaction: Transaction) => {
        await onUpdateTransaction(updatedTransaction);
        // Update the transaction in local state
        setTransactions(transactions.map(t =>
            t.id === updatedTransaction.id ? updatedTransaction : t
        ));
        handleCloseEditModal();
    };

    // Handle delete click
    const handleDeleteClick = (transaction: Transaction) => {
        setDeleteConfirmation({
            isOpen: true,
            transactionId: transaction.id,
            transactionDescription: transaction.description || getTransactionContextName(transaction)
        });
    };

    // Confirm delete
    const confirmDelete = () => {
        if (deleteConfirmation.transactionId) {
            onDeleteTransaction(deleteConfirmation.transactionId);
            onAddLog?.(LogType.TRANSACTION_DELETED, `تم حذف الحركة: ${deleteConfirmation.transactionDescription}`);
            // Remove the transaction from local state
            setTransactions(transactions.filter(t => t.id !== deleteConfirmation.transactionId));
        }
        setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' });
    };

    // Cancel delete
    const cancelDelete = () => {
        setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' });
    };

    // Share functionality
    const handleShare = async () => {
        const totalTransactions = filteredTransactions.length;
        const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
        const reportTitle = isAdmin ? 'تقرير الحركات - جميع المتاجر' : `تقرير الحركات - ${activeShop?.name}`;

        const reportText = `${reportTitle}
إجمالي الحركات: ${totalTransactions}
إجمالي المبالغ: ${formatCurrency(totalAmount)}
الفترة: ${filters.startDate || 'البداية'} إلى ${filters.endDate || 'النهاية'}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: reportTitle,
                    text: reportText,
                });
                onAddLog?.(LogType.SHARE_REPORT, 'تمت مشاركة تقرير الحركات بنجاح');
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(reportText);
            alert('تم نسخ التقرير إلى الحافظة');
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">{t('transactions.title')}</h1>
                <p className="text-text-secondary">
                    {isAdmin
                        ? t('transactions.subtitle')
                        : `${t('transactions.subtitle')} - ${activeShop ? getBilingualText(activeShop.name, activeShop.nameEn, language) : ''}`}
                </p>
            </div>

            {/* Filters Section */}
            <div className="bg-surface rounded-lg shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 text-accent hover:text-accent-hover transition-colors"
                    >
                        <FilterIcon />
                        <span>{showFilters ? t('transactions.filters.hideFilters') : t('transactions.filters.showFilters')}</span>
                    </button>

                    <div className="flex gap-2">
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            <ShareIcon />
                            <span>{t('transactions.actions.share')}</span>
                        </button>
                        <button
                            onClick={generatePDFReport}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                            <ExportIcon />
                            <span>{t('transactions.actions.export')}</span>
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {/* Transaction Type Filter */}
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('transactions.filters.type')}</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
                                className="w-full p-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-accent"
                            >
                                <option value="all">{t('transactions.filters.allTypes')}</option>
                                <option value={TransactionType.SALE}>{translateEnum(TransactionType.SALE, transactionTypeTranslations, language)}</option>
                                <option value={TransactionType.PURCHASE}>{translateEnum(TransactionType.PURCHASE, transactionTypeTranslations, language)}</option>
                                <option value={TransactionType.EXPENSE}>{translateEnum(TransactionType.EXPENSE, transactionTypeTranslations, language)}</option>
                                <option value={TransactionType.TRANSFER}>{translateEnum(TransactionType.TRANSFER, transactionTypeTranslations, language)}</option>
                            </select>
                        </div>

                        {/* Shop Filter (Admin only) */}
                        {isAdmin && (
                            <div>
                                <label className="block text-sm font-medium mb-2">{t('transactions.filters.shop')}</label>
                                <select
                                    value={filters.shopId}
                                    onChange={(e) => setFilters({ ...filters, shopId: e.target.value })}
                                    className="w-full p-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-accent"
                                >
                                    <option value="all">{t('transactions.filters.allShops')}</option>
                                    {shops.map(shop => (
                                        <option key={shop.id} value={shop.id}>{getBilingualText(shop.name, shop.nameEn, language)}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('transactions.filters.from')}</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="w-full p-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-accent"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('transactions.filters.to')}</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="w-full p-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-accent"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>

                        {/* Search */}
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('transactions.filters.search')}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={filters.searchTerm}
                                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                                    placeholder={t('transactions.filters.searchPlaceholder')}
                                    className="w-full p-2 pr-10 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-accent"
                                />
                                <SearchIcon />
                            </div>
                        </div>

                        {/* Amount Range */}
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('transactions.filters.minAmount')}</label>
                            <input
                                type="number"
                                value={filters.minAmount}
                                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                placeholder="0"
                                className="w-full p-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-accent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">{t('transactions.filters.maxAmount')}</label>
                            <input
                                type="number"
                                value={filters.maxAmount}
                                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                                placeholder="999999"
                                className="w-full p-2 bg-background border border-gray-600 rounded-lg focus:ring-2 focus:ring-accent"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface p-4 rounded-lg">
                    <h3 className="text-sm text-text-secondary mb-1">{t('transactions.summary.totalTransactions')}</h3>
                    <p className="text-2xl font-bold">{filteredTransactions.length}</p>
                </div>
                <div className="bg-surface p-4 rounded-lg">
                    <h3 className="text-sm text-text-secondary mb-1">{t('transactions.summary.totalSales')}</h3>
                    <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(
                            filteredTransactions
                                .filter(t => t.type === TransactionType.SALE)
                                .reduce((sum, t) => sum + t.totalAmount, 0)
                        )}
                    </p>
                </div>
                <div className="bg-surface p-4 rounded-lg">
                    <h3 className="text-sm text-text-secondary mb-1">{t('transactions.summary.totalPurchases')}</h3>
                    <p className="text-2xl font-bold text-yellow-400">
                        {formatCurrency(
                            filteredTransactions
                                .filter(t => t.type === TransactionType.PURCHASE)
                                .reduce((sum, t) => sum + t.totalAmount, 0)
                        )}
                    </p>
                </div>
                <div className="bg-surface p-4 rounded-lg">
                    <h3 className="text-sm text-text-secondary mb-1">{t('transactions.summary.totalExpenses')}</h3>
                    <p className="text-2xl font-bold text-red-400">
                        {formatCurrency(
                            filteredTransactions
                                .filter(t => t.type === TransactionType.EXPENSE)
                                .reduce((sum, t) => sum + t.totalAmount, 0)
                        )}
                    </p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-surface rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-background">
                            <tr className="text-gray-400">
                                <th className="p-4 text-right">{t('transactions.list.columns.date')}</th>
                                <th className="p-4 text-right">{t('transactions.list.columns.type')}</th>
                                <th className="p-4 text-right">{t('transactions.list.columns.context')}</th>
                                <th className="p-4 text-right">{t('transactions.list.columns.description')}</th>
                                <th className="p-4 text-left">{t('transactions.list.columns.amount')}</th>
                                {isAdmin && <th className="p-4 text-right">{t('transactions.list.columns.shop')}</th>}
                                <th className="p-4 text-center">{t('transactions.list.columns.actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="text-center p-8">
                                        <div className="inline-flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                                            <span>{t('transactions.list.loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="text-center p-8 text-gray-400">
                                        {t('transactions.list.noResults')}
                                    </td>
                                </tr>
                            ) : (
                                paginatedTransactions.map((transaction, index) => (
                                    <tr key={transaction.id} className={index % 2 === 0 ? 'bg-background/50' : ''}>
                                        <td className="p-4 whitespace-nowrap text-gray-300">
                                            {new Date(transaction.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeStyle(transaction.type)}`}>
                                                {translateEnum(transaction.type, transactionTypeTranslations, language)}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-300">{getTransactionContextName(transaction)}</td>
                                        <td className="p-4 text-gray-200">{transaction.description || '-'}</td>
                                        <td className={`p-4 text-left font-mono font-bold ${
                                            transaction.type === TransactionType.SALE ? 'text-green-400' :
                                            transaction.type === TransactionType.TRANSFER ? 'text-blue-300' :
                                            'text-red-400'
                                        }`}>
                                            {formatCurrency(transaction.totalAmount)}
                                        </td>
                                        {isAdmin && (
                                            <td className="p-4 text-gray-300">{getShopName(transaction.shopId)}</td>
                                        )}
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => handleStartEdit(transaction)}
                                                className="text-accent hover:text-blue-400 p-2 transition-colors duration-200"
                                                aria-label={t('transactions.actions.edit')}
                                            >
                                                <EditIcon />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(transaction)}
                                                className="text-red-500 hover:text-red-400 p-2 transition-colors duration-200"
                                                aria-label={t('transactions.actions.delete')}
                                            >
                                                <DeleteIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-700">
                        <div className="text-sm text-text-secondary">
                            {t('transactions.list.pagination.showingRange', {
                                start: ((currentPage - 1) * transactionsPerPage) + 1,
                                end: Math.min(currentPage * transactionsPerPage, filteredTransactions.length),
                                total: filteredTransactions.length
                            })}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-background rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                            >
                                {t('transactions.list.pagination.first')}
                            </button>
                            <button
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-background rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                            >
                                {t('transactions.list.pagination.previous')}
                            </button>
                            <span className="px-3 py-1">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-background rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                            >
                                {t('transactions.list.pagination.next')}
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-background rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
                            >
                                {t('transactions.list.pagination.last')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-red-400">{t('transactions.deleteConfirm.title')}</h3>
                        <p className="text-text-primary mb-6">
                            {t('transactions.deleteConfirm.message')}
                        </p>
                        <div className="bg-background p-3 rounded mb-6">
                            <p className="text-gray-300 text-sm">
                                <span className="font-semibold">{t('transactions.deleteConfirm.transactionLabel')}</span>
                                {deleteConfirmation.transactionDescription}
                            </p>
                        </div>
                        <p className="text-yellow-400 text-sm mb-6">
                            {t('transactions.deleteConfirm.warning')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmDelete}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                {t('transactions.deleteConfirm.confirmButton')}
                            </button>
                            <button
                                onClick={cancelDelete}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                {t('transactions.deleteConfirm.cancelButton')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transaction Modal */}
            {showEditModal && (
                <DailyEntryForm
                    isOpen={showEditModal}
                    onClose={handleCloseEditModal}
                    onAddTransaction={() => {}} // Not used in edit mode
                    onUpdateTransaction={handleUpdateTransactionWithRefresh}
                    transactionToEdit={editingTransaction}
                    accounts={accounts.filter(a => a.shopId === activeShop?.id)}
                    openFinancialYear={financialYears.find(fy => fy.shopId === activeShop?.id && fy.status === 'open')}
                    onAddAccount={onAddAccount}
                    selectedDate={selectedDate}
                />
            )}
        </div>
    );
};

export default TransactionsPage;