import React, { useState } from 'react';
import { Transaction, TransactionType, Account, Shop, LogType, User, AccountType } from '../types';
import { formatCurrency, formatNumber } from '../utils/formatting';
import { exportTableToPDFEnhanced } from '../utils/pdfExportEnhanced';

interface RecentTransactionsProps {
    transactions: Transaction[]; // Daily transactions
    allTransactions?: Transaction[]; // All transactions for balance calculation
    accounts: Account[];
    onDelete: (transactionId: string) => void;
    onStartEdit: (transaction: Transaction) => void;
    activeShop?: Shop | null;
    selectedDate?: Date;
    onAddLog?: (type: LogType, message: string) => void;
    user?: User | null;
}

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

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
);

const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);

const ShareIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path></svg>
);

const ExportIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
);

const generatePDFReport = async (
    transactions: Transaction[],
    allTransactions: Transaction[],
    accounts: Account[],
    shopName: string,
    date: Date,
    userName?: string,
    shopCode?: string
) => {
    try {
        const getAccountName = (accountId: string | undefined) => accounts.find(a => a.id === accountId)?.name || 'غير معروف';
        const getAccount = (accountId: string | undefined) => accounts.find(a => a.id === accountId);
        const formatCurrencyForPDF = (amount: number) => `${formatNumber(amount, 0)} ج.س`;

        // Get payment source (cash/bank) for each transaction
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

        // Calculate totals
        const totalSales = transactions.filter(t => t.type === TransactionType.SALE).reduce((sum, t) => sum + t.totalAmount, 0);
        const totalPurchases = transactions.filter(t => t.type === TransactionType.PURCHASE).reduce((sum, t) => sum + t.totalAmount, 0);
        const totalExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.totalAmount, 0);
        // حساب الربح: المبيعات - المشتريات - المصروفات (نفس طريقة حساب الربح في Dashboard)
        const totalProfit = totalSales - totalPurchases - totalExpenses;

        // Calculate current balances from ALL transactions using double-entry accounting
        const cashAccounts = accounts.filter(a => a.type === AccountType.CASH);
        const bankAccounts = accounts.filter(a => a.type === AccountType.BANK);
        const customerAccounts = accounts.filter(a => a.type === AccountType.CUSTOMER);
        const supplierAccounts = accounts.filter(a => a.type === AccountType.SUPPLIER);

        // Start with opening balances and process all transactions
        let totalCash = cashAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
        let totalBank = bankAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
        let totalCustomers = customerAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
        let totalSuppliers = supplierAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);

        // Process all transaction entries
        allTransactions.forEach(transaction => {
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
        const headers = ['م', 'النوع', 'البيان', 'الوصف', 'التاريخ', 'المصدر', 'صادر', 'وارد'];

        // Prepare data
        const tableData = transactions.map((t, index) => {
            let context = '';

            if (t.type === TransactionType.TRANSFER) {
                const from = getAccountName(t.entries.find(e => e.amount < 0)?.accountId);
                const to = getAccountName(t.entries.find(e => e.amount > 0)?.accountId);
                context = `من ${from} إلى ${to}`;
            } else {
                const primaryAccount = getAccount(t.partyId) || getAccount(t.categoryId);
                context = primaryAccount?.name || 'غير محدد';
            }

            const typeText = t.type === TransactionType.SALE ? 'مبيعات' :
                t.type === TransactionType.PURCHASE ? 'مشتريات' :
                t.type === TransactionType.EXPENSE ? 'مصروفات' :
                t.type === TransactionType.TRANSFER ? 'تحويل' : t.type;

            const dateFormatted = new Date(t.date).toLocaleDateString('ar-EG-u-nu-latn', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            // Determine صادر (outgoing) / وارد (incoming)
            let outgoing = '-';
            let incoming = '-';

            if (t.type === TransactionType.SALE) {
                incoming = formatCurrencyForPDF(t.totalAmount);
            } else if (t.type === TransactionType.PURCHASE || t.type === TransactionType.EXPENSE) {
                outgoing = formatCurrencyForPDF(t.totalAmount);
            } else {
                outgoing = formatCurrencyForPDF(t.totalAmount);
            }

            return [
                (index + 1).toString(),
                typeText,
                context,
                t.description || '-',
                dateFormatted,
                getPaymentSource(t),
                outgoing,
                incoming
            ];
        });

        // Title with date
        const dayName = date.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long' });
        const dateFormatted = date.toLocaleDateString('ar-EG-u-nu-latn', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const title = `تقرير اليومية ${dayName} ${dateFormatted}`;

        // Shop info line
        const shopInfo = `المتجر: ${shopName}${shopCode ? ` (${shopCode})` : ''} | المستخدم: ${userName || 'غير محدد'}`;

        // Summary - 2 rows layout (4 items)
        const summary = [
            { label: 'إجمالي المبيعات', value: formatCurrencyForPDF(totalSales) },
            { label: 'إجمالي المشتريات', value: formatCurrencyForPDF(totalPurchases) },
            { label: 'إجمالي المصروفات', value: formatCurrencyForPDF(totalExpenses) },
            { label: 'الربح', value: formatCurrencyForPDF(totalProfit) }
        ];

        // Calculate column totals for صادر and وارد
        let totalOutgoing = 0;
        let totalIncoming = 0;

        transactions.forEach(t => {
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
            `daily_report_${date.toISOString().split('T')[0]}.pdf`,
            {
                shopInfo,
                summary,
                orientation: 'portrait',
                balanceCards,
                balanceCardsTitle: 'الأرصدة الحالية'
            }
        );
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('حدث خطأ أثناء تصدير التقرير');
    }
};

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, allTransactions = [], accounts, onDelete, onStartEdit, activeShop, selectedDate, onAddLog, user }) => {
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        isOpen: boolean;
        transactionId: string | null;
        transactionDescription: string;
    }>({
        isOpen: false,
        transactionId: null,
        transactionDescription: ''
    });

    const getAccountName = (accountId: string | undefined) => {
        if (!accountId) return 'غير محدد';
        return accounts.find(a => a.id === accountId)?.name || 'غير معروف';
    };

    const getTransactionContextName = (t: Transaction) => {
        if (t.type === TransactionType.TRANSFER) {
            const fromAccount = getAccountName(t.entries.find(e => e.amount < 0)?.accountId);
            const toAccount = getAccountName(t.entries.find(e => e.amount > 0)?.accountId);
            return `من ${fromAccount} إلى ${toAccount}`;
        }
        if (t.partyId) return getAccountName(t.partyId);
        if (t.categoryId) return getAccountName(t.categoryId);
        return 'حركة عامة'
    };

    const handleShare = async () => {
        if (!activeShop || !selectedDate) return;

        // Calculate daily totals
        const totalSales = transactions.filter(t => t.type === TransactionType.SALE).reduce((s, t) => s + t.totalAmount, 0);
        const totalPurchases = transactions.filter(t => t.type === TransactionType.PURCHASE).reduce((s, t) => s + t.totalAmount, 0);
        const totalExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.totalAmount, 0);
        // حساب الربح: المبيعات - المشتريات - المصروفات
        const dailyProfit = totalSales - totalPurchases - totalExpenses;

        // Calculate current balances from ALL transactions using double-entry accounting
        const cashAccounts = accounts.filter(a => a.type === AccountType.CASH);
        const bankAccounts = accounts.filter(a => a.type === AccountType.BANK);
        const customerAccounts = accounts.filter(a => a.type === AccountType.CUSTOMER);
        const supplierAccounts = accounts.filter(a => a.type === AccountType.SUPPLIER);

        // Start with opening balances and process all transactions
        let totalCash = cashAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
        let totalBank = bankAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
        let totalCustomers = customerAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);
        let totalSuppliers = supplierAccounts.reduce((sum, acc) => sum + (acc.openingBalance || 0), 0);

        // Process all transaction entries
        allTransactions.forEach(transaction => {
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

        // Format currency for display
        const formatCurrencyForShare = (amount: number) => `${formatNumber(amount, 0)} ج.س`;

        // Build comprehensive report
        const dateString = selectedDate.toLocaleDateString('ar-EG-u-nu-latn', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const reportTitle = `📊 تقرير يومية ${activeShop.name}`;

        const reportText = `${reportTitle}
${activeShop.code ? `رمز المتجر: ${activeShop.code}` : ''}
التاريخ: ${dateString}
المستخدم: ${user?.name || 'غير محدد'}

━━━━━━━━━━━━━━━━━━━━
📈 ملخص اليوم:
━━━━━━━━━━━━━━━━━━━━
💰 إجمالي المبيعات: ${formatCurrencyForShare(totalSales)}
🛒 إجمالي المشتريات: ${formatCurrencyForShare(totalPurchases)}
💳 إجمالي المصروفات: ${formatCurrencyForShare(totalExpenses)}
${dailyProfit >= 0 ? '✅' : '⚠️'} الربح: ${formatCurrencyForShare(dailyProfit)}

━━━━━━━━━━━━━━━━━━━━
💼 الأرصدة الحالية:
━━━━━━━━━━━━━━━━━━━━
💵 الرصيد النقدي: ${formatCurrencyForShare(totalCash)}
🏦 الرصيد البنكي: ${formatCurrencyForShare(totalBank)}
👥 رصيد العملاء: ${formatCurrencyForShare(totalCustomers)}
🏭 رصيد الموردين: ${formatCurrencyForShare(totalSuppliers)}

━━━━━━━━━━━━━━━━━━━━
📋 تفاصيل الحركات: ${transactions.length} حركة
━━━━━━━━━━━━━━━━━━━━`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: reportTitle,
                    text: reportText,
                });
                onAddLog?.(LogType.SHARE_REPORT, `تمت مشاركة تقرير يوم ${dateString} بنجاح - ${transactions.length} حركة`);
            } catch (error) {
                console.error('Error sharing:', error);
                // If sharing fails, copy to clipboard as fallback
                try {
                    await navigator.clipboard.writeText(reportText);
                    alert('تم نسخ التقرير إلى الحافظة ✓');
                    onAddLog?.(LogType.SHARE_REPORT, `تم نسخ تقرير يوم ${dateString} إلى الحافظة`);
                } catch (clipboardError) {
                    console.error('Clipboard error:', clipboardError);
                    onAddLog?.(LogType.SHARE_REPORT, 'فشلت عملية المشاركة.');
                }
            }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(reportText);
                alert('تم نسخ التقرير إلى الحافظة ✓\n\nيمكنك الآن لصقه في أي تطبيق مشاركة');
                onAddLog?.(LogType.SHARE_REPORT, `تم نسخ تقرير يوم ${dateString} إلى الحافظة`);
            } catch (error) {
                console.error('Clipboard error:', error);
                alert('خاصية المشاركة غير مدعومة في هذا المتصفح.');
                onAddLog?.(LogType.SHARE_REPORT, 'فشلت عملية المشاركة - المتصفح غير مدعوم.');
            }
        }
    };

    const handleExport = () => {
        if (!activeShop || !selectedDate) return;
        generatePDFReport(transactions, allTransactions, accounts, activeShop.name, selectedDate, user?.name, activeShop.code);
        onAddLog?.(LogType.EXPORT_REPORT, `تم تصدير تقرير يوم ${selectedDate.toLocaleDateString('ar-EG-u-nu-latn')} كملف PDF.`);
    };

    const handleDeleteClick = (transaction: Transaction) => {
        setDeleteConfirmation({
            isOpen: true,
            transactionId: transaction.id,
            transactionDescription: transaction.description || getTransactionContextName(transaction)
        });
    };

    const confirmDelete = () => {
        if (deleteConfirmation.transactionId) {
            onDelete(deleteConfirmation.transactionId);
            onAddLog?.(LogType.TRANSACTION_DELETED, `تم حذف الحركة: ${deleteConfirmation.transactionDescription}`);
        }
        setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' });
    };

    const cancelDelete = () => {
        setDeleteConfirmation({ isOpen: false, transactionId: null, transactionDescription: '' });
    };

    return (
        <div className="bg-surface p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">آخر الحركات المسجلة</h2>
                {activeShop && selectedDate && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleShare}
                            title="مشاركة"
                            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-700 rounded-md transition-colors"
                        >
                            <ShareIcon />
                        </button>
                        <button
                            onClick={handleExport}
                            title="تصدير PDF"
                            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-700 rounded-md transition-colors"
                        >
                            <ExportIcon />
                        </button>
                    </div>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b border-gray-700 text-text-secondary">
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">النوع</th>
                            <th className="p-3">البيان</th>
                            <th className="p-3">الوصف</th>
                            <th className="p-3 text-left">المبلغ</th>
                            <th className="p-3 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.slice(0, 10).map((t, index) => (
                            <tr key={t.id} className={`border-b border-gray-700 ${index % 2 === 0 ? 'bg-background/50' : ''}`}>
                                <td className="p-3 whitespace-nowrap text-text-secondary">{new Date(t.date).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' })}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeStyle(t.type)}`}>
                                        {t.type}
                                    </span>
                                </td>
                                <td className="p-3 text-sm text-text-secondary">{getTransactionContextName(t)}</td>
                                <td className="p-3">{t.description}</td>
                                <td className={`p-3 text-left font-mono font-bold ${t.type === TransactionType.SALE ? 'text-green-400' : t.type === TransactionType.TRANSFER ? 'text-blue-300' : 'text-red-400'}`}>
                                    {formatCurrency(t.totalAmount)}
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => onStartEdit(t)}
                                        className="text-accent hover:text-blue-400 p-2 transition-colors duration-200"
                                        aria-label={`تعديل حركة ${t.description}`}
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(t)}
                                        className="text-red-500 hover:text-red-400 p-2 transition-colors duration-200"
                                        aria-label={`حذف حركة ${t.description}`}
                                    >
                                        <DeleteIcon />
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {transactions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-6 text-text-secondary">
                                    لا توجد حركات مسجلة. قم بإضافة حركة جديدة للبدء.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteConfirmation.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-red-400">تأكيد الحذف</h3>
                        <p className="text-text-primary mb-6">
                            هل أنت متأكد من حذف هذه الحركة؟
                        </p>
                        <div className="bg-background p-3 rounded mb-6">
                            <p className="text-text-secondary text-sm">
                                <span className="font-semibold">الحركة: </span>
                                {deleteConfirmation.transactionDescription}
                            </p>
                        </div>
                        <p className="text-yellow-400 text-sm mb-6">
                            ⚠️ تحذير: لا يمكن التراجع عن هذا الإجراء
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={confirmDelete}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                حذف
                            </button>
                            <button
                                onClick={cancelDelete}
                                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecentTransactions;