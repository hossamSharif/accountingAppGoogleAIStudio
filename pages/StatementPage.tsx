import React, { useState, useMemo } from 'react';
import { Account, Transaction, Shop, TransactionType, User } from '../types';
import { formatCurrency } from '../utils/formatting';
import { exportTableToPDFEnhanced } from '../utils/pdfExportEnhanced';
import MobileSelect from '../components/MobileSelect';
import { useTranslation } from '../i18n/useTranslation';
import { getBilingualText } from '../utils/bilingual';

const ExportIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>;

interface StatementPageProps {
    accounts: Account[];
    transactions: Transaction[];
    activeShop: Shop | null;
    shops: Shop[];
    currentUser: User;
}

const StatementPage: React.FC<StatementPageProps> = ({ accounts, transactions, activeShop, shops, currentUser }) => {
    const { t, language } = useTranslation();
    const [selectedShopId, setSelectedShopId] = useState<string>(activeShop?.id || '');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [filterType, setFilterType] = useState<'range' | 'day'>('range');

    const today = new Date();
    const monthAgo = new Date(new Date().setMonth(today.getMonth() - 1));

    const [startDate, setStartDate] = useState(monthAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [singleDate, setSingleDate] = useState(today.toISOString().split('T')[0]);

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

        const rangeStart = new Date(filterType === 'day' ? singleDate : startDate);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(filterType === 'day' ? singleDate : endDate);
        rangeEnd.setHours(23, 59, 59, 999);

        // Find all child accounts if a parent is selected
        const getChildAccountIds = (parentId: string): string[] => {
            const children = filteredAccounts.filter(a => a.parentId === parentId);
            return [parentId, ...children.flatMap(c => getChildAccountIds(c.id))];
        };
        const targetAccountIds = new Set(getChildAccountIds(selectedAccountId));

        const relevantTransactions = filteredTransactions.filter(t =>
            t.entries.some(e => targetAccountIds.has(e.accountId))
        ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let openingBalance = 0;
        filteredAccounts.forEach(acc => {
            if (targetAccountIds.has(acc.id)) {
                openingBalance += acc.openingBalance || 0;
            }
        });

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

        let totalDebit = 0;
        let totalCredit = 0;
        let runningBalance = openingBalance;

        const getAccountName = (id: string) => {
            const account = filteredAccounts.find(a => a.id === id);
            return account ? getBilingualText(account.name, account.nameEn, language) : t('statements.unknown');
        };

        const rows = relevantTransactions.filter(transaction => {
            const tDate = new Date(transaction.date);
            return tDate >= rangeStart && tDate <= rangeEnd;
        }).map(transaction => {
            let debit = 0;
            let credit = 0;

            const entryForThisAccount = transaction.entries.find(e => targetAccountIds.has(e.accountId));
            const amount = entryForThisAccount ? entryForThisAccount.amount : 0;

            if (amount > 0) debit = amount;
            else credit = -amount;

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
                balance: runningBalance
            };
        });

        const closingBalance = openingBalance + totalDebit - totalCredit;

        return { openingBalance, rows, totalDebit, totalCredit, closingBalance };

    }, [selectedAccountId, filterType, singleDate, startDate, endDate, filteredAccounts, filteredTransactions, language, t]);

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
            const dateRange = filterType === 'day'
                ? new Date(singleDate).toLocaleDateString(locale)
                : `${t('statements.dateLabels.from')} ${new Date(startDate).toLocaleDateString(locale)} ${t('statements.dateLabels.to')} ${new Date(endDate).toLocaleDateString(locale)}`;

            // Get the selected shop for export
            const selectedShop = selectedShopId ? shops.find(s => s.id === selectedShopId) : null;

            // Subtitle
            const shopName = selectedShop ? getBilingualText(selectedShop.name, selectedShop.nameEn, language) : (currentUser.role === 'admin' && !selectedShopId ? t('statements.allShops') : '');
            const subtitle = shopName ? `${shopName} - ${dateRange}` : dateRange;

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
                <div>
                    <label className="text-sm text-text-secondary block mb-1">{t('statements.filterType.label')}</label>
                    <div className="flex bg-background rounded-lg border border-gray-600 p-1">
                        <button onClick={() => setFilterType('range')} className={`px-4 py-1 rounded-md text-sm ${filterType==='range' ? 'bg-primary' : ''}`}>{t('statements.filterType.range')}</button>
                        <button onClick={() => setFilterType('day')} className={`px-4 py-1 rounded-md text-sm ${filterType==='day' ? 'bg-primary' : ''}`}>{t('statements.filterType.day')}</button>
                    </div>
                </div>
                 {filterType === 'range' ? (
                    <div className="flex gap-2 items-end">
                        <div><label className="text-sm text-text-secondary block mb-1">{t('statements.dateLabels.from')}</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-4 focus:ring-primary focus:border-primary" style={{colorScheme: 'dark'}}/></div>
                        <div><label className="text-sm text-text-secondary block mb-1">{t('statements.dateLabels.to')}</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-4 focus:ring-primary focus:border-primary" style={{colorScheme: 'dark'}}/></div>
                    </div>
                 ) : (
                    <div><label className="text-sm text-text-secondary block mb-1">{t('statements.dateLabels.selectDay')}</label><input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-4 focus:ring-primary focus:border-primary" style={{colorScheme: 'dark'}}/></div>
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
                                <thead><tr className="border-b border-gray-700 text-text-secondary"><th className="p-3">{t('statements.table.columns.date')}</th><th className="p-3">{t('statements.table.columns.context')}</th><th className="p-3 text-left">{t('statements.table.columns.debit')}</th><th className="p-3 text-left">{t('statements.table.columns.credit')}</th><th className="p-3 text-left">{t('statements.table.columns.balance')}</th></tr></thead>
                                <tbody>
                                    {statementData.rows.map(row => (
                                        <tr key={row.id} className="border-b border-gray-700 hover:bg-background/50">
                                            <td className="p-3">{row.date}</td>
                                            <td className="p-3">{row.context}</td>
                                            <td className="p-3 text-left font-mono text-green-400">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                                            <td className="p-3 text-left font-mono text-red-400">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                                            <td className="p-3 text-left font-mono">{formatCurrency(row.balance)}</td>
                                        </tr>
                                    ))}
                                    {statementData.rows.length === 0 && (
                                        <tr><td colSpan={5} className="text-center p-8 text-text-secondary">{t('statements.table.empty')}</td></tr>
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
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatementPage;