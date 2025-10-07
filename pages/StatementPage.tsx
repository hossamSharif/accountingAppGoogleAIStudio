import React, { useState, useMemo } from 'react';
import { Account, Transaction, Shop, TransactionType } from '../types';
import { formatCurrency } from '../utils/formatting';
import { exportTableToPDFEnhanced } from '../utils/pdfExportEnhanced';

const ExportIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>;

interface StatementPageProps {
    accounts: Account[];
    transactions: Transaction[];
    activeShop: Shop | null;
}

const StatementPage: React.FC<StatementPageProps> = ({ accounts, transactions, activeShop }) => {
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [filterType, setFilterType] = useState<'range' | 'day'>('range');
    
    const today = new Date();
    const monthAgo = new Date(new Date().setMonth(today.getMonth() - 1));

    const [startDate, setStartDate] = useState(monthAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
    const [singleDate, setSingleDate] = useState(today.toISOString().split('T')[0]);

    const accountOptions = useMemo(() => {
        const parentAccounts = accounts.filter(a => !a.parentId).sort((a,b) => a.name.localeCompare(b.name));
        // Fix: Changed JSX.Element to React.ReactElement to resolve namespace issue.
        const options: React.ReactElement[] = [];
        parentAccounts.forEach(parent => {
            options.push(<option key={parent.id} value={parent.id} className="font-bold">{parent.name}</option>);
            accounts.filter(a => a.parentId === parent.id).sort((a,b) => a.name.localeCompare(b.name)).forEach(child => {
                options.push(<option key={child.id} value={child.id}>&nbsp;&nbsp;&nbsp;{child.name}</option>);
            });
        });
        return options;
    }, [accounts]);

    const statementData = useMemo(() => {
        if (!selectedAccountId) return null;

        const rangeStart = new Date(filterType === 'day' ? singleDate : startDate);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(filterType === 'day' ? singleDate : endDate);
        rangeEnd.setHours(23, 59, 59, 999);

        // Find all child accounts if a parent is selected
        const getChildAccountIds = (parentId: string): string[] => {
            const children = accounts.filter(a => a.parentId === parentId);
            return [parentId, ...children.flatMap(c => getChildAccountIds(c.id))];
        };
        const targetAccountIds = new Set(getChildAccountIds(selectedAccountId));

        const relevantTransactions = transactions.filter(t => 
            t.entries.some(e => targetAccountIds.has(e.accountId))
        ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let openingBalance = 0;
        accounts.forEach(acc => {
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

        const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || 'غير معروف';

        const rows = relevantTransactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= rangeStart && tDate <= rangeEnd;
        }).map(t => {
            let debit = 0;
            let credit = 0;

            const entryForThisAccount = t.entries.find(e => targetAccountIds.has(e.accountId));
            const amount = entryForThisAccount ? entryForThisAccount.amount : 0;
            
            if (amount > 0) debit = amount;
            else credit = -amount;
            
            totalDebit += debit;
            totalCredit += credit;
            runningBalance += (debit - credit);

            let context = t.description;
            if (t.type === TransactionType.TRANSFER) {
                const fromAccId = t.entries.find(e => e.amount < 0)?.accountId;
                const toAccId = t.entries.find(e => e.amount > 0)?.accountId;
                if (fromAccId === selectedAccountId) { // We are the 'from'
                    context = `تحويل إلى: ${getAccountName(toAccId!)}`;
                } else { // We are the 'to'
                    context = `تحويل من: ${getAccountName(fromAccId!)}`;
                }
            } else {
                 const otherPartyId = t.partyId || t.categoryId;
                 if (otherPartyId && otherPartyId !== selectedAccountId) {
                    context = `${t.type} / ${getAccountName(otherPartyId)} - ${t.description}`;
                 }
            }
            
            return {
                id: t.id,
                date: new Date(t.date).toLocaleDateString('ar-EG'),
                context,
                debit,
                credit,
                balance: runningBalance
            };
        });
        
        const closingBalance = openingBalance + totalDebit - totalCredit;
        
        return { openingBalance, rows, totalDebit, totalCredit, closingBalance };

    }, [selectedAccountId, filterType, singleDate, startDate, endDate, accounts, transactions]);

    const handleExportPDF = async () => {
        if (!statementData || !selectedAccountId) return;

        try {
            const account = accounts.find(a => a.id === selectedAccountId);

            // Prepare headers
            const headers = ['الرصيد', 'دائن', 'مدين', 'البيان', 'التاريخ'];

            // Prepare data
            const tableData = statementData.rows.map(row => [
                formatCurrency(row.balance),
                formatCurrency(row.credit),
                formatCurrency(row.debit),
                row.context,
                row.date,
            ]);

            // Title
            const title = `كشف حساب: ${account?.name || ''}`;

            // Date range
            const dateRange = filterType === 'day'
                ? new Date(singleDate).toLocaleDateString('ar-SA')
                : `من ${new Date(startDate).toLocaleDateString('ar-SA')} إلى ${new Date(endDate).toLocaleDateString('ar-SA')}`;

            // Subtitle
            const subtitle = activeShop ? `${activeShop.name} - ${dateRange}` : dateRange;

            // Summary data
            const summary = [
                { label: 'الرصيد الافتتاحي', value: formatCurrency(statementData.openingBalance) },
                { label: 'إجمالي مدين', value: formatCurrency(statementData.totalDebit) },
                { label: 'إجمالي دائن', value: formatCurrency(statementData.totalCredit) },
                { label: 'الرصيد الختامي', value: formatCurrency(statementData.closingBalance) }
            ];

            // Export to PDF using the enhanced method with Arabic support
            await exportTableToPDFEnhanced(
                headers,
                tableData,
                title,
                `statement_${account?.name}_${new Date().toISOString().split('T')[0]}.pdf`,
                {
                    subtitle,
                    summary,
                    orientation: 'portrait'
                }
            );
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('حدث خطأ أثناء تصدير كشف الحساب');
        }
    };

    return (
        <div className="space-y-6 text-text-primary">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h1 className="text-3xl font-bold">كشف حساب</h1>
                {statementData && (
                     <button onClick={handleExportPDF} className="bg-accent hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg">
                        <ExportIcon />
                        <span>تصدير PDF</span>
                    </button>
                )}
            </div>

            <div className="bg-surface p-4 rounded-lg shadow-md flex gap-4 flex-wrap items-end">
                <div className="flex-grow">
                    <label className="text-sm text-text-secondary block mb-1">اختر الحساب</label>
                    <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-lg py-2 px-4 focus:ring-primary focus:border-primary">
                        <option value="">-- الرجاء اختيار حساب --</option>
                        {accountOptions}
                    </select>
                </div>
                <div>
                    <label className="text-sm text-text-secondary block mb-1">نوع الفترة</label>
                    <div className="flex bg-background rounded-lg border border-gray-600 p-1">
                        <button onClick={() => setFilterType('range')} className={`px-4 py-1 rounded-md text-sm ${filterType==='range' ? 'bg-primary' : ''}`}>فترة</button>
                        <button onClick={() => setFilterType('day')} className={`px-4 py-1 rounded-md text-sm ${filterType==='day' ? 'bg-primary' : ''}`}>يوم</button>
                    </div>
                </div>
                 {filterType === 'range' ? (
                    <div className="flex gap-2 items-end">
                        <div><label className="text-sm text-text-secondary block mb-1">من</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-4 focus:ring-primary focus:border-primary" style={{colorScheme: 'dark'}}/></div>
                        <div><label className="text-sm text-text-secondary block mb-1">إلى</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-4 focus:ring-primary focus:border-primary" style={{colorScheme: 'dark'}}/></div>
                    </div>
                 ) : (
                    <div><label className="text-sm text-text-secondary block mb-1">تحديد اليوم</label><input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-4 focus:ring-primary focus:border-primary" style={{colorScheme: 'dark'}}/></div>
                 )}
            </div>

            {!selectedAccountId ? (
                <div className="text-center bg-surface p-12 rounded-lg">
                    <p className="text-text-secondary">الرجاء اختيار حساب وتحديد فترة لعرض كشف الحساب.</p>
                </div>
            ) : statementData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-surface p-4 rounded-lg text-center"><p className="text-sm text-text-secondary">الرصيد الافتتاحي</p><p className="text-xl font-bold">{formatCurrency(statementData.openingBalance)}</p></div>
                        <div className="bg-surface p-4 rounded-lg text-center"><p className="text-sm text-text-secondary">إجمالي مدين</p><p className="text-xl font-bold text-green-400">{formatCurrency(statementData.totalDebit)}</p></div>
                        <div className="bg-surface p-4 rounded-lg text-center"><p className="text-sm text-text-secondary">إجمالي دائن</p><p className="text-xl font-bold text-red-400">{formatCurrency(statementData.totalCredit)}</p></div>
                        <div className="bg-surface p-4 rounded-lg text-center"><p className="text-sm text-text-secondary">الرصيد الختامي</p><p className="text-xl font-bold text-accent">{formatCurrency(statementData.closingBalance)}</p></div>
                    </div>

                    <div className="bg-surface p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">الحركات</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right">
                                <thead><tr className="border-b border-gray-700 text-text-secondary"><th className="p-3">التاريخ</th><th className="p-3">البيان</th><th className="p-3 text-left">مدين</th><th className="p-3 text-left">دائن</th><th className="p-3 text-left">الرصيد</th></tr></thead>
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
                                        <tr><td colSpan={5} className="text-center p-8 text-text-secondary">لا توجد حركات في الفترة المحددة.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatementPage;