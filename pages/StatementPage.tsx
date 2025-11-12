import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction, Shop, TransactionType, User, FinancialYear } from '../types';
import { formatCurrency } from '../utils/formatting';
import { exportTableToPDFEnhanced } from '../utils/pdfExportEnhanced';
import MobileSelect from '../components/MobileSelect';
import { useTranslation } from '../i18n/useTranslation';
import { getBilingualText } from '../utils/bilingual';
import DailyEntryForm from '../components/DailyEntryForm';

const ExportIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>;

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
    </svg>
);

const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
    </svg>
);

type FilterType = 'month' | 'week' | 'today' | 'all' | 'custom';

interface StatementPageProps {
    accounts: Account[];
    transactions: Transaction[];
    activeShop: Shop | null;
    shops: Shop[];
    currentUser: User;
    onUpdateTransaction: (transaction: Transaction) => void;
    onDeleteTransaction: (transactionId: string) => void;
    onAddAccount?: (account: Omit<Account, 'id' | 'isActive' | 'shopId'>, forShopId?: string) => Account | null;
    openFinancialYear?: FinancialYear;
    financialYears: FinancialYear[];
}

const StatementPage: React.FC<StatementPageProps> = ({
    accounts,
    transactions,
    activeShop,
    shops,
    currentUser,
    onUpdateTransaction,
    onDeleteTransaction,
    onAddAccount,
    openFinancialYear,
    financialYears
}) => {
    const { t, language } = useTranslation();
    const [selectedShopId, setSelectedShopId] = useState<string>(activeShop?.id || '');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [filterType, setFilterType] = useState<FilterType>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedFyId, setSelectedFyId] = useState<string>('period'); // 'period' means use date range filters

    // State for edit functionality
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // State for delete confirmation
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        transactionId: string | null;
        transactionDescription: string;
    }>({ isOpen: false, transactionId: null, transactionDescription: '' });

    // Reset financial year filter when shop changes
    useEffect(() => {
        setSelectedFyId('period');
    }, [selectedShopId]);

    // Filter financial years by selected shop
    const shopFinancialYears = useMemo(() => {
        if (!selectedShopId) return [];
        return financialYears
            .filter(fy => fy.shopId === selectedShopId)
            .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [selectedShopId, financialYears]);

    // Calculate date range based on filter type
    const dateRange = useMemo(() => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);
        end.setHours(23, 59, 59, 999);

        switch (filterType) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'week':
                const firstDayOfWeek = now.getDate() - now.getDay();
                start = new Date(now.setDate(firstDayOfWeek));
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'all':
                return { startDate: null, endDate: null };
            case 'custom':
                const customStart = customStartDate ? new Date(customStartDate) : null;
                if (customStart) customStart.setHours(0, 0, 0, 0);
                const customEnd = customEndDate ? new Date(customEndDate) : null;
                if (customEnd) customEnd.setHours(23, 59, 59, 999);
                return { startDate: customStart, endDate: customEnd };
        }
        return { startDate: start, endDate: end };
    }, [filterType, customStartDate, customEndDate]);

    // Filter accounts by selected shop
    const filteredAccounts = useMemo(() => {
        if (!selectedShopId) return accounts; // Show all accounts if no shop selected (admin viewing all shops)
        return accounts.filter(a => a.shopId === selectedShopId);
    }, [accounts, selectedShopId]);

    // Filter transactions by selected shop
    const filteredTransactions = useMemo(() => {
        if (!selectedShopId) return transactions; // Show all transactions if no shop selected
        return transactions.filter(t => t.shopId === selectedShopId);
    }, [transactions, selectedShopId]);

    const accountOptions = useMemo(() => {
        const parentAccounts = filteredAccounts.filter(a => !a.parentId).sort((a,b) => a.name.localeCompare(b.name));
        const options: Array<{ value: string; label: string }> = [];

        parentAccounts.forEach(parent => {
            const parentName = getBilingualText(parent.name, parent.nameEn, language);
            options.push({ value: parent.id, label: parentName });

            filteredAccounts.filter(a => a.parentId === parent.id).sort((a,b) => a.name.localeCompare(b.name)).forEach(child => {
                const childName = getBilingualText(child.name, child.nameEn, language);
                options.push({ value: child.id, label: `   ${childName}` }); // Indentation for child accounts
            });
        });
        return options;
    }, [filteredAccounts, language]);

    const statementData = useMemo(() => {
        if (!selectedAccountId) return null;

        // Determine date range: FY dates take priority over period filters
        let rangeStart: Date | null = null;
        let rangeEnd: Date | null = null;

        const selectedFy = shopFinancialYears.find(fy => fy.id === selectedFyId);
        if (selectedFy) {
            // Use FY dates
            rangeStart = new Date(selectedFy.startDate);
            rangeStart.setHours(0, 0, 0, 0);
            rangeEnd = new Date(selectedFy.endDate);
            rangeEnd.setHours(23, 59, 59, 999);
        } else {
            // Use period filter dates
            rangeStart = dateRange.startDate;
            rangeEnd = dateRange.endDate;
        }

        // Find all child accounts if a parent is selected
        const getChildAccountIds = (parentId: string): string[] => {
            const children = filteredAccounts.filter(a => a.parentId === parentId);
            return [parentId, ...children.flatMap(c => getChildAccountIds(c.id))];
        };
        const targetAccountIds = new Set(getChildAccountIds(selectedAccountId));

        const relevantTransactions = filteredTransactions.filter(t =>
            t.entries.some(e => targetAccountIds.has(e.accountId)) ||
            targetAccountIds.has(t.partyId || '')
        ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let openingBalance = 0;
        filteredAccounts.forEach(acc => {
            if (targetAccountIds.has(acc.id)) {
                openingBalance += acc.openingBalance || 0;
            }
        });

        // Calculate opening balance only if rangeStart is defined
        if (rangeStart) {
            relevantTransactions.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate < rangeStart) {
                    t.entries.forEach(e => {
                        if (targetAccountIds.has(e.accountId)) {
                            openingBalance += e.amount;
                        }
                    });
                }
            });
        }

        let totalDebit = 0;
        let totalCredit = 0;
        let runningBalance = openingBalance;

        const getAccountName = (id: string) => {
            const account = filteredAccounts.find(a => a.id === id);
            return account ? getBilingualText(account.name, account.nameEn, language) : t('statements.unknown');
        };

        const rows = relevantTransactions.filter(transaction => {
            // If rangeStart or rangeEnd is null (filterType === 'all'), include all transactions
            if (!rangeStart || !rangeEnd) return true;
            const tDate = new Date(transaction.date);
            return tDate >= rangeStart && tDate <= rangeEnd;
        }).map(transaction => {
            let debit = 0;
            let credit = 0;

            const entryForThisAccount = transaction.entries.find(e => targetAccountIds.has(e.accountId));

            if (entryForThisAccount) {
                // Transaction has an entry for this account
                const amount = entryForThisAccount.amount;
                if (amount > 0) debit = amount;
                else credit = -amount;
            } else if (targetAccountIds.has(transaction.partyId || '')) {
                // Transaction included via partyId but has no entry (fully-paid sale/purchase)
                // Show both debit and credit to reflect the transaction activity with net zero balance
                if (transaction.type === TransactionType.SALE) {
                    debit = transaction.totalAmount;  // Sale to customer
                    credit = transaction.totalAmount; // Paid in same transaction
                } else if (transaction.type === TransactionType.PURCHASE) {
                    credit = transaction.totalAmount; // Purchase from supplier
                    debit = transaction.totalAmount;  // Paid in same transaction
                }
            }

            totalDebit += debit;
            totalCredit += credit;
            runningBalance += (debit - credit);

            let context = transaction.description;
            if (transaction.type === TransactionType.TRANSFER) {
                const fromAccId = transaction.entries.find(e => e.amount < 0)?.accountId;
                const toAccId = transaction.entries.find(e => e.amount > 0)?.accountId;
                if (fromAccId === selectedAccountId) { // We are the 'from'
                    context = t('statements.transfer.to', { account: getAccountName(toAccId!) });
                } else { // We are the 'to'
                    context = t('statements.transfer.from', { account: getAccountName(fromAccId!) });
                }
            } else {
                 const otherPartyId = transaction.partyId || transaction.categoryId;
                 if (otherPartyId && otherPartyId !== selectedAccountId) {
                    context = `${transaction.type} / ${getAccountName(otherPartyId)} - ${transaction.description}`;
                 }
            }

            return {
                id: transaction.id,
                date: new Date(transaction.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US'),
                context,
                debit,
                credit,
                balance: runningBalance,
                transaction // Preserve the original transaction object for edit/delete operations
            };
        });

        const closingBalance = openingBalance + totalDebit - totalCredit;

        return { openingBalance, rows, totalDebit, totalCredit, closingBalance };

    }, [selectedAccountId, filterType, customStartDate, customEndDate, filteredAccounts, filteredTransactions, language, t, selectedFyId, shopFinancialYears, dateRange]);

    // Edit handlers
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
        handleCloseEditModal();
    };

    // Delete handlers
    const handleDeleteClick = (transaction: Transaction) => {
        const description = transaction.description || `${transaction.type} - ${formatCurrency(transaction.totalAmount)}`;
        setDeleteConfirmation({
            isOpen: true,
            transactionId: transaction.id,
            transactionDescription: description
        });
    };

    const confirmDelete = () => {
        if (deleteConfirmation.transactionId) {
            onDeleteTransaction(deleteConfirmation.transactionId);
        }
        setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' });
    };

    const cancelDelete = () => {
        setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' });
    };

    const handleExportPDF = async () => {
        if (!statementData || !selectedAccountId) return;

        try {
            const account = filteredAccounts.find(a => a.id === selectedAccountId);
            const accountName = account ? getBilingualText(account.name, account.nameEn, language) : '';

            // Prepare headers based on language
            const headers = language === 'ar'
                ? ['الرصيد', 'دائن', 'مدين', 'البيان', 'التاريخ']
                : [t('statements.table.columns.balance'), t('statements.table.columns.credit'),
                   t('statements.table.columns.debit'), t('statements.table.columns.context'),
                   t('statements.table.columns.date')];

            // Prepare data
            const tableData = statementData.rows.map(row => [
                formatCurrency(row.balance),
                formatCurrency(row.credit),
                formatCurrency(row.debit),
                row.context,
                row.date,
            ]);

            // Title
            const title = `${t('statements.title')}: ${accountName}`;

            // Date range
            const locale = language === 'ar' ? 'ar-SA' : 'en-US';
            let dateRangeText = '';

            const selectedFy = shopFinancialYears.find(fy => fy.id === selectedFyId);
            if (selectedFy) {
                dateRangeText = `${selectedFy.name} (${new Date(selectedFy.startDate).toLocaleDateString(locale)} - ${new Date(selectedFy.endDate).toLocaleDateString(locale)})`;
            } else if (filterType === 'all') {
                dateRangeText = t('analytics.periods.all');
            } else if (filterType === 'today') {
                dateRangeText = new Date().toLocaleDateString(locale);
            } else if (filterType === 'week') {
                dateRangeText = t('analytics.periods.week');
            } else if (filterType === 'month') {
                dateRangeText = t('analytics.periods.month');
            } else if (filterType === 'custom' && customStartDate && customEndDate) {
                dateRangeText = `${t('statements.dateLabels.from')} ${new Date(customStartDate).toLocaleDateString(locale)} ${t('statements.dateLabels.to')} ${new Date(customEndDate).toLocaleDateString(locale)}`;
            }

            // Get the selected shop for export
            const selectedShop = selectedShopId ? shops.find(s => s.id === selectedShopId) : null;

            // Subtitle
            const shopName = selectedShop ? getBilingualText(selectedShop.name, selectedShop.nameEn, language) : (currentUser.role === 'admin' && !selectedShopId ? t('statements.allShops') : '');
            const subtitle = shopName ? `${shopName} - ${dateRangeText}` : dateRangeText;

            // Summary data
            const summary = [
                { label: t('statements.summary.openingBalance'), value: formatCurrency(statementData.openingBalance) },
                { label: t('statements.summary.totalDebit'), value: formatCurrency(statementData.totalDebit) },
                { label: t('statements.summary.totalCredit'), value: formatCurrency(statementData.totalCredit) },
                { label: t('statements.summary.closingBalance'), value: formatCurrency(statementData.closingBalance) }
            ];

            // Export to PDF using the enhanced method with Arabic support
            await exportTableToPDFEnhanced(
                headers,
                tableData,
                title,
                `statement_${accountName}_${new Date().toISOString().split('T')[0]}.pdf`,
                {
                    subtitle,
                    summary,
                    orientation: 'portrait'
                }
            );
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert(t('statements.messages.exportError'));
        }
    };

    return (
        <div className="space-y-6 text-text-primary">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h1 className="text-3xl font-bold">{t('statements.title')}</h1>
                {statementData && (
                     <button onClick={handleExportPDF} className="bg-accent hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg">
                        <ExportIcon />
                        <span>{t('statements.actions.exportPDF')}</span>
                    </button>
                )}
            </div>

            {/* Shop Selector for Admin */}
            {currentUser.role === 'admin' && shops.length > 0 && (
                <div className="bg-surface p-4 rounded-lg shadow-md mb-6">
                    <MobileSelect
                        label={t('statements.selectShop')}
                        value={selectedShopId}
                        onChange={(value) => {
                            setSelectedShopId(value);
                            setSelectedAccountId(''); // Reset account selection when shop changes
                        }}
                        options={[
                            { value: '', label: t('statements.allShops') },
                            ...shops.filter(s => s.isActive).map(shop => ({
                                value: shop.id,
                                label: getBilingualText(shop.name, shop.nameEn, language)
                            }))
                        ]}
                    />
                </div>
            )}

            <div className="bg-surface p-4 rounded-lg shadow-md flex gap-4 flex-wrap items-end">
                <div className="flex-grow min-w-[200px]">
                    <MobileSelect
                        label={t('statements.selectAccount')}
                        value={selectedAccountId}
                        onChange={(value) => setSelectedAccountId(value)}
                        placeholder={t('statements.selectAccountPlaceholder')}
                        options={accountOptions}
                    />
                </div>
                {selectedShopId && (
                    <div className="flex-1 min-w-[200px]">
                        <MobileSelect
                            label={t('analytics.periods.financialYear')}
                            value={selectedFyId}
                            onChange={(value) => setSelectedFyId(value)}
                            options={[
                                { value: 'period', label: t('analytics.filters.usePeriodFilters') },
                                ...shopFinancialYears.map(fy => ({
                                    value: fy.id,
                                    label: `${fy.name} (${fy.status === 'open' ? t('common.status.open') : t('common.status.closed')})`
                                }))
                            ]}
                        />
                    </div>
                )}
                <div className={`flex bg-background rounded-lg border border-gray-600 p-1 ${selectedFyId !== 'period' ? 'opacity-50 pointer-events-none' : ''}`}>
                    {(Object.entries({
                        'month': t('analytics.periods.month'),
                        'week': t('analytics.periods.week'),
                        'today': t('analytics.periods.today'),
                        'all': t('analytics.periods.all'),
                        'custom': t('analytics.periods.custom')
                    }) as [FilterType, string][]).map(([key, label]) => (
                         <button key={key} onClick={() => setFilterType(key)} className={`px-4 py-1 rounded-md text-sm transition-colors ${filterType === key ? 'bg-primary' : 'hover:bg-gray-700'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                {filterType === 'custom' && (
                     <div className={`flex gap-2 items-end ${selectedFyId !== 'period' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div><label className="text-xs text-text-secondary block mb-1">{t('analytics.filters.from')}</label><input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-3 text-sm" style={{colorScheme: 'dark'}}/></div>
                        <div><label className="text-xs text-text-secondary block mb-1">{t('analytics.filters.to')}</label><input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-3 text-sm" style={{colorScheme: 'dark'}}/></div>
                    </div>
                )}
            </div>

            {!selectedAccountId ? (
                <div className="text-center bg-surface p-12 rounded-lg">
                    <p className="text-text-secondary">{t('statements.messages.selectAccountPrompt')}</p>
                </div>
            ) : statementData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-surface p-4 rounded-lg text-center"><p className="text-sm text-text-secondary">{t('statements.summary.openingBalance')}</p><p className="text-xl font-bold">{formatCurrency(statementData.openingBalance)}</p></div>
                        <div className="bg-surface p-4 rounded-lg text-center"><p className="text-sm text-text-secondary">{t('statements.summary.totalDebit')}</p><p className="text-xl font-bold text-green-400">{formatCurrency(statementData.totalDebit)}</p></div>
                        <div className="bg-surface p-4 rounded-lg text-center"><p className="text-sm text-text-secondary">{t('statements.summary.totalCredit')}</p><p className="text-xl font-bold text-red-400">{formatCurrency(statementData.totalCredit)}</p></div>
                        <div className="bg-surface p-4 rounded-lg text-center"><p className="text-sm text-text-secondary">{t('statements.summary.closingBalance')}</p><p className="text-xl font-bold text-accent">{formatCurrency(statementData.closingBalance)}</p></div>
                    </div>

                    <div className="bg-surface p-4 md:p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">{t('statements.table.title')}</h2>

                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-right">
                                <thead className="border-2 text-base font-semibold" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                                    <tr>
                                        <th className="p-3">{t('statements.table.columns.date')}</th>
                                        <th className="p-3">{t('statements.table.columns.context')}</th>
                                        <th className="p-3 text-left">{t('statements.table.columns.debit')}</th>
                                        <th className="p-3 text-left">{t('statements.table.columns.credit')}</th>
                                        <th className="p-3 text-left">{t('statements.table.columns.balance')}</th>
                                        <th className="p-3 text-center sticky left-0 bg-surface-hover">{t('statements.table.columns.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statementData.rows.map(row => (
                                        <tr key={row.id} className="border-b border-gray-700 hover:bg-background/50">
                                            <td className="p-3">{row.date}</td>
                                            <td className="p-3">{row.context}</td>
                                            <td className="p-3 text-left font-mono text-green-400">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                            <td className="p-3 text-left font-mono text-red-400">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                            <td className="p-3 text-left font-mono">{formatCurrency(row.balance)}</td>
                                            <td className="p-3 sticky left-0 bg-surface">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleStartEdit(row.transaction)}
                                                        className="text-blue-400 hover:text-blue-300 p-1.5 rounded hover:bg-background transition-colors"
                                                        title={t('statements.actions.edit')}
                                                    >
                                                        <EditIcon />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(row.transaction)}
                                                        className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-background transition-colors"
                                                        title={t('statements.actions.delete')}
                                                    >
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {statementData.rows.length === 0 && (
                                        <tr><td colSpan={6} className="text-center p-8 text-text-secondary">{t('statements.table.empty')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-3">
                            {statementData.rows.length === 0 ? (
                                <div className="text-center p-8 text-text-secondary">{t('statements.table.empty')}</div>
                            ) : (
                                statementData.rows.map(row => (
                                    <div key={row.id} className="bg-background border border-gray-700 rounded-lg p-4 space-y-2">
                                        {/* Date and Context */}
                                        <div className="border-b border-gray-700 pb-2">
                                            <p className="text-text-secondary text-sm">{row.date}</p>
                                            <p className="text-text-primary font-medium">{row.context}</p>
                                        </div>

                                        {/* Debit, Credit, Balance */}
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div>
                                                <p className="text-xs text-text-secondary">{t('statements.table.columns.debit')}</p>
                                                <p className="font-mono text-green-400 font-bold">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-text-secondary">{t('statements.table.columns.credit')}</p>
                                                <p className="font-mono text-red-400 font-bold">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-text-secondary">{t('statements.table.columns.balance')}</p>
                                                <p className="font-mono text-accent font-bold">{formatCurrency(row.balance)}</p>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-700">
                                            <button
                                                onClick={() => handleStartEdit(row.transaction)}
                                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded hover:bg-surface transition-colors text-sm"
                                            >
                                                <EditIcon />
                                                <span>{t('statements.actions.edit')}</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(row.transaction)}
                                                className="flex items-center gap-1 text-red-400 hover:text-red-300 px-3 py-1.5 rounded hover:bg-surface transition-colors text-sm"
                                            >
                                                <DeleteIcon />
                                                <span>{t('statements.actions.delete')}</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Transaction Modal */}
            <DailyEntryForm
                isOpen={showEditModal}
                onClose={handleCloseEditModal}
                onAddTransaction={() => {}}
                onUpdateTransaction={handleUpdateTransactionWithRefresh}
                transactionToEdit={editingTransaction}
                accounts={accounts}
                openFinancialYear={openFinancialYear}
                onAddAccount={onAddAccount}
                selectedDate={selectedDate}
                activeShopId={selectedShopId || activeShop?.id}
                currentUserId={currentUser.id}
            />

            {/* Delete Confirmation Dialog */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-surface rounded-lg p-6 max-w-md w-full space-y-4">
                        <h3 className="text-xl font-bold text-text-primary">{t('statements.deleteConfirmation.title')}</h3>
                        <p className="text-text-secondary">
                            {t('statements.deleteConfirmation.message')}
                        </p>
                        <p className="text-text-primary font-medium bg-background p-3 rounded">
                            {deleteConfirmation.transactionDescription}
                        </p>
                        <p className="text-red-400 text-sm">
                            {t('statements.deleteConfirmation.warning')}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={cancelDelete}
                                className="px-4 py-2 rounded-lg bg-background hover:bg-surface-hover text-text-primary transition-colors"
                            >
                                {t('statements.deleteConfirmation.cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                            >
                                {t('statements.deleteConfirmation.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatementPage;