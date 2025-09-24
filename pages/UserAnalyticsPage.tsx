import React, { useState, useMemo } from 'react';
import { Account, Transaction, AccountType, TransactionType } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';

// Icons for KPIs
const CashIcon = () => <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const BankIcon = () => <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h16V4m-8 12v-5m-4 5v-5m8 5v-5M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" /></svg>;
const CreditCardIcon = () => <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;
const DebtorsIcon = () => <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2m0 2a2 2 0 100 4m0-4h-3m-6 0a2 2 0 100 4 2 2 0 000-4zm-7 1a2 2 0 11-4 0 2 2 0 014 0z"/></svg>;
const CreditorsIcon = () => <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const PIE_COLORS = ['#0D9488', '#F97316', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B', '#10B981', '#6366F1'];

type FilterType = 'month' | 'week' | 'today' | 'all' | 'custom';

interface UserAnalyticsPageProps {
    transactions: Transaction[];
    accounts: Account[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-SD', { style: 'currency', currency: 'SDG', minimumFractionDigits: 0 }).format(amount);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface/80 backdrop-blur-sm p-4 rounded-lg border border-gray-700 shadow-lg">
        <p className="font-bold text-text-primary mb-2">{label}</p>
        {payload.map((pld: any) => (
          <p key={pld.dataKey} style={{ color: pld.color }} className="text-sm">
            {`${pld.name}: ${formatCurrency(pld.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const UserAnalyticsPage: React.FC<UserAnalyticsPageProps> = ({ transactions, accounts }) => {
    const [filterType, setFilterType] = useState<FilterType>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

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
                if (customStart) customStart.setHours(0,0,0,0);
                const customEnd = customEndDate ? new Date(customEndDate) : null;
                if (customEnd) customEnd.setHours(23,59,59,999);
                return { startDate: customStart, endDate: customEnd };
        }
        return { startDate: start, endDate: end };
    }, [filterType, customStartDate, customEndDate]);

    const filteredTransactions = useMemo(() => {
        if (!dateRange.startDate || !dateRange.endDate) {
            return transactions; // 'all' time
        }
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= dateRange.startDate! && tDate <= dateRange.endDate!;
        });
    }, [transactions, dateRange]);

    const kpiData = useMemo(() => {
        let cash = 0, bank = 0, debtors = 0, creditors = 0;
        const cashIds = new Set(accounts.filter(a => a.type === AccountType.CASH).map(a => a.id));
        const bankIds = new Set(accounts.filter(a => a.type === AccountType.BANK).map(a => a.id));
        const customerIds = new Set(accounts.filter(a => a.type === AccountType.CUSTOMER).map(a => a.id));
        const supplierIds = new Set(accounts.filter(a => a.type === AccountType.SUPPLIER).map(a => a.id));

        accounts.forEach(acc => {
            if (cashIds.has(acc.id)) cash += acc.openingBalance || 0;
            if (bankIds.has(acc.id)) bank += acc.openingBalance || 0;
            if (customerIds.has(acc.id)) debtors += acc.openingBalance || 0;
            if (supplierIds.has(acc.id)) creditors += acc.openingBalance || 0;
        });

        transactions.forEach(t => {
            t.entries.forEach(e => {
                if (cashIds.has(e.accountId)) cash += e.amount;
                if (bankIds.has(e.accountId)) bank += e.amount;
                if (customerIds.has(e.accountId)) debtors += e.amount;
                if (supplierIds.has(e.accountId)) creditors += e.amount;
            });
        });

        // Calculate total expenses for the filtered period
        const totalExpenses = filteredTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.totalAmount, 0);

        return { cash, bank, debtors, creditors: -creditors, totalExpenses }; // Creditors are Cr., so invert for display
    }, [accounts, transactions, filteredTransactions]);

    const salesPurchasesData = useMemo(() => {
        const dataMap: { [key: string]: { sales: number, purchases: number } } = {};
        
        filteredTransactions.forEach(t => {
            const date = new Date(t.date);
            const key = date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
            
            if (!dataMap[key]) dataMap[key] = { sales: 0, purchases: 0 };
            if (t.type === TransactionType.SALE) dataMap[key].sales += t.totalAmount;
            if (t.type === TransactionType.PURCHASE) dataMap[key].purchases += t.totalAmount;
        });

        const sortedKeys = Object.keys(dataMap).sort((a,b) => {
            // A simple sort based on date string might not be robust enough, needs parsing.
            // But for simple day/month format, it might be okay. Let's create real dates to be sure.
            const dateA = new Date(a.replace('،', ''));
            const dateB = new Date(b.replace('،', ''));
            return dateA.getTime() - dateB.getTime();
        });


        return sortedKeys.map(date => ({ date, ...dataMap[date] }));
    }, [filteredTransactions]);

    const expenseBreakdownData = useMemo(() => {
        const expenseMap: { [key: string]: number } = {};
        const expenseTransactions = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
        
        expenseTransactions.forEach(t => {
            if (t.categoryId) {
                const categoryName = accounts.find(a => a.id === t.categoryId)?.name || 'غير معروف';
                if (!expenseMap[categoryName]) expenseMap[categoryName] = 0;
                expenseMap[categoryName] += t.totalAmount;
            }
        });

        return Object.entries(expenseMap).map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0);
    }, [filteredTransactions, accounts]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">تحليلات المتجر</h1>
            
            {/* Filters */}
            <div className="bg-surface p-2 rounded-lg shadow-md flex gap-2 flex-wrap items-end">
                <div className="flex bg-background rounded-lg border border-gray-600 p-1">
                    {(Object.entries({
                        'month': 'هذا الشهر', 'week': 'هذا الأسبوع', 'today': 'اليوم',
                        'all': 'كل الوقت', 'custom': 'فترة مخصصة'
                    }) as [FilterType, string][]).map(([key, label]) => (
                         <button key={key} onClick={() => setFilterType(key)} className={`px-4 py-1 rounded-md text-sm transition-colors ${filterType === key ? 'bg-primary' : 'hover:bg-gray-700'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                {filterType === 'custom' && (
                     <div className="flex gap-2 items-end">
                        <div><label className="text-xs text-text-secondary block mb-1">من</label><input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-3 text-sm" style={{colorScheme: 'dark'}}/></div>
                        <div><label className="text-xs text-text-secondary block mb-1">إلى</label><input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-3 text-sm" style={{colorScheme: 'dark'}}/></div>
                    </div>
                )}
            </div>

            {/* KPIs */}
            <div className="flex overflow-x-auto gap-6 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex-shrink-0 w-72"><StatCard title="رصيد الصندوق" value={formatCurrency(kpiData.cash)} icon={<CashIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="رصيد البنك" value={formatCurrency(kpiData.bank)} icon={<BankIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="إجمالي المصروفات" value={formatCurrency(kpiData.totalExpenses)} icon={<CreditCardIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="رصيد العملاء" value={formatCurrency(kpiData.debtors)} icon={<DebtorsIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="رصيد الموردين" value={formatCurrency(kpiData.creditors)} icon={<CreditorsIcon />} /></div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-surface p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold mb-4">المبيعات والمشتريات</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={salesPurchasesData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="date" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" tickFormatter={value => new Intl.NumberFormat('ar-EG').format(value as number)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ direction: 'ltr' }} />
                            <Bar name="المشتريات" dataKey="purchases" fill="#F97316" radius={[4, 4, 0, 0]} />
                            <Bar name="المبيعات" dataKey="sales" fill="#0D9488" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="lg:col-span-2 bg-surface p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold mb-4">توزيع المصروفات</h3>
                    {expenseBreakdownData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie data={expenseBreakdownData} cx="50%" cy="50%" labelLine={false} outerRadius={120} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {expenseBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{ direction: 'ltr', fontSize: '12px' }}/>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-secondary"><p>لا توجد بيانات مصروفات للعرض.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserAnalyticsPage;