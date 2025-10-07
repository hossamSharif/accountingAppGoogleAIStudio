import React, { useState, useMemo, useEffect } from 'react';
import { Account, Transaction, AccountType, TransactionType, FinancialYear } from '../types';
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import { formatCurrency, formatNumber } from '../utils/formatting';

// Icons for KPIs
const CashIcon = () => <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const BankIcon = () => <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h16V4m-8 12v-5m-4 5v-5m8 5v-5M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" /></svg>;
const CreditCardIcon = () => <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;
const DebtorsIcon = () => <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2m0 2a2 2 0 100 4m0-4h-3m-6 0a2 2 0 100 4 2 2 0 000-4zm-7 1a2 2 0 11-4 0 2 2 0 014 0z"/></svg>;
const CreditorsIcon = () => <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ProfitIcon = () => <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>;
const IncomeIcon = () => <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const PIE_COLORS = ['#0D9488', '#F97316', '#3B82F6', '#EF4444', '#8B5CF6', '#F59E0B', '#10B981', '#6366F1'];

type FilterType = 'month' | 'week' | 'today' | 'all' | 'custom';

interface UserAnalyticsPageProps {
    transactions: Transaction[];
    accounts: Account[];
    financialYears: FinancialYear[];
}

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

const UserAnalyticsPage: React.FC<UserAnalyticsPageProps> = ({ transactions, accounts, financialYears }) => {
    const [filterType, setFilterType] = useState<FilterType>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedFyId, setSelectedFyId] = useState<string>('period'); // 'period' means use date range filters

    const shopFinancialYears = useMemo(() => {
        return financialYears.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }, [financialYears]);

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
        const selectedFy = shopFinancialYears.find(fy => fy.id === selectedFyId);
        if (selectedFy) {
            const fyStart = new Date(selectedFy.startDate);
            const fyEnd = new Date(selectedFy.endDate);
            return transactions.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= fyStart && tDate <= fyEnd;
            });
        }

        if (!dateRange.startDate || !dateRange.endDate) {
            return transactions; // 'all' time
        }
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate >= dateRange.startDate! && tDate <= dateRange.endDate!;
        });
    }, [transactions, dateRange, selectedFyId, shopFinancialYears]);

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

        const totalSales = filteredTransactions.filter(t => t.type === TransactionType.SALE).reduce((sum, t) => sum + t.totalAmount, 0);
        const totalPurchases = filteredTransactions.filter(t => t.type === TransactionType.PURCHASE).reduce((sum, t) => sum + t.totalAmount, 0);
        const totalExpenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.totalAmount, 0);

        let profit = 0;
        const selectedFy = shopFinancialYears.find(fy => fy.id === selectedFyId);

        if (selectedFy) {
            const { openingStockValue, closingStockValue } = selectedFy;
            if (closingStockValue !== undefined && closingStockValue !== null) { // Closed year
                profit = totalSales + closingStockValue - (openingStockValue + totalPurchases + totalExpenses);
            } else { // Open year
                profit = totalSales - totalPurchases - totalExpenses;
            }
        } else {
            profit = totalSales - totalPurchases - totalExpenses;
        }

        const totalIncome = totalSales; // Total income is total sales

        return { cash, bank, debtors, creditors: -creditors, totalExpenses, profit, totalIncome, totalSales, totalPurchases };
    }, [accounts, transactions, filteredTransactions, shopFinancialYears, selectedFyId]);

    const profitCardMeta = useMemo(() => {
        const selectedFy = shopFinancialYears.find(fy => fy.id === selectedFyId);
        if (selectedFy) {
            if (selectedFy.status === 'closed') {
                return { title: 'صافي الربح (سنة مالية)' };
            }
            return { title: 'الربح التشغيلي (سنة مالية)' };
        }
        return { title: 'إجمالي الربح (الفترة)' };
    }, [selectedFyId, shopFinancialYears]);

    const chartData = useMemo(() => {
        const monthlyData: { [key: string]: { sales: number, purchases: number, expenses: number } } = {};

        filteredTransactions.forEach(t => {
            const monthKey = new Date(t.date).toLocaleString('ar-EG', { month: 'short', year: 'numeric' });
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { sales: 0, purchases: 0, expenses: 0 };
            }
            if (t.type === TransactionType.SALE) monthlyData[monthKey].sales += t.totalAmount;
            if (t.type === TransactionType.PURCHASE) monthlyData[monthKey].purchases += t.totalAmount;
            if (t.type === TransactionType.EXPENSE) monthlyData[monthKey].expenses += t.totalAmount;
        });

        const sortedKeys = Object.keys(monthlyData).sort((a,b) => {
            const [aMonthStr, aYearStr] = a.split(' ');
            const [bMonthStr, bYearStr] = b.split(' ');
            const monthMap: {[key: string]: number} = {'يناير': 1,'فبراير': 2,'مارس': 3,'أبريل': 4,'مايو': 5,'يونيو': 6,'يوليو': 7,'أغسطس': 8,'سبتمبر': 9,'أكتوبر': 10,'نوفمبر': 11,'ديسمبر': 12};
            const dateA = new Date(parseInt(aYearStr), monthMap[aMonthStr] - 1);
            const dateB = new Date(parseInt(bYearStr), monthMap[bMonthStr] - 1);
            return dateA.getTime() - dateB.getTime();
        });

        return sortedKeys.map(key => ({
            month: key,
            ...monthlyData[key]
        }));
    }, [filteredTransactions]);

    const incomeChartData = useMemo(() => {
        const monthlyIncomeData: { [key: string]: { income: number, profit: number } } = {};

        filteredTransactions.forEach(t => {
            const monthKey = new Date(t.date).toLocaleString('ar-EG', { month: 'short', year: 'numeric' });
            if (!monthlyIncomeData[monthKey]) {
                monthlyIncomeData[monthKey] = { income: 0, profit: 0 };
            }
            if (t.type === TransactionType.SALE) {
                monthlyIncomeData[monthKey].income += t.totalAmount;
            }
            if (t.type === TransactionType.PURCHASE) {
                monthlyIncomeData[monthKey].profit -= t.totalAmount;
            }
            if (t.type === TransactionType.EXPENSE) {
                monthlyIncomeData[monthKey].profit -= t.totalAmount;
            }
        });

        const sortedKeys = Object.keys(monthlyIncomeData).sort((a,b) => {
            const [aMonthStr, aYearStr] = a.split(' ');
            const [bMonthStr, bYearStr] = b.split(' ');
            const monthMap: {[key: string]: number} = {'يناير': 1,'فبراير': 2,'مارس': 3,'أبريل': 4,'مايو': 5,'يونيو': 6,'يوليو': 7,'أغسطس': 8,'سبتمبر': 9,'أكتوبر': 10,'نوفمبر': 11,'ديسمبر': 12};
            const dateA = new Date(parseInt(aYearStr), monthMap[aMonthStr] - 1);
            const dateB = new Date(parseInt(bYearStr), monthMap[bMonthStr] - 1);
            return dateA.getTime() - dateB.getTime();
        });

        return sortedKeys.map(key => {
            const data = monthlyIncomeData[key];
            return {
                month: key,
                income: data.income,
                profit: data.income + data.profit
            };
        });
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
                <div className="flex-grow">
                    <label className="text-xs text-text-secondary block mb-1">السنة المالية</label>
                    <select
                        value={selectedFyId}
                        onChange={(e) => setSelectedFyId(e.target.value)}
                        className="bg-background border border-gray-600 rounded-lg py-1.5 px-3 text-sm w-full md:w-auto"
                    >
                        <option value="period">حسب الفترة المحددة</option>
                        {shopFinancialYears.map(fy => (
                            <option key={fy.id} value={fy.id}>{fy.name} ({fy.status === 'open' ? 'مفتوحة' : 'مغلقة'})</option>
                        ))}
                    </select>
                </div>
                <div className={`flex bg-background rounded-lg border border-gray-600 p-1 ${selectedFyId !== 'period' ? 'opacity-50 pointer-events-none' : ''}`}>
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
                     <div className={`flex gap-2 items-end ${selectedFyId !== 'period' ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div><label className="text-xs text-text-secondary block mb-1">من</label><input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-3 text-sm" style={{colorScheme: 'dark'}}/></div>
                        <div><label className="text-xs text-text-secondary block mb-1">إلى</label><input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="bg-background border border-gray-600 rounded-lg py-1.5 px-3 text-sm" style={{colorScheme: 'dark'}}/></div>
                    </div>
                )}
            </div>

            {/* KPIs */}
            <div className="flex overflow-x-auto gap-6 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex-shrink-0 w-72"><StatCard title="إجمالي الدخل" value={formatCurrency(kpiData.totalIncome)} icon={<IncomeIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title={profitCardMeta.title} value={formatCurrency(kpiData.profit)} icon={<ProfitIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="إجمالي المبيعات" value={formatCurrency(kpiData.totalSales)} icon={<CashIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="إجمالي المشتريات" value={formatCurrency(kpiData.totalPurchases)} icon={<BankIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="إجمالي المصروفات" value={formatCurrency(kpiData.totalExpenses)} icon={<CreditCardIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="رصيد العملاء" value={formatCurrency(kpiData.debtors)} icon={<DebtorsIcon />} /></div>
                <div className="flex-shrink-0 w-72"><StatCard title="رصيد الموردين" value={formatCurrency(kpiData.creditors)} icon={<CreditorsIcon />} /></div>
            </div>

            {/* Income Trend Chart */}
            <div className="bg-surface p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold mb-4">منحنى الدخل والربح</h3>
                {incomeChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={incomeChartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="month" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" tickFormatter={value => formatNumber(value as number, 0)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ direction: 'ltr' }} />
                            <Area
                                type="monotone"
                                name="الدخل"
                                dataKey="income"
                                stroke="#10B981"
                                fillOpacity={1}
                                fill="url(#colorIncome)"
                                strokeWidth={3}
                            />
                            <Area
                                type="monotone"
                                name="صافي الربح"
                                dataKey="profit"
                                stroke="#0D9488"
                                fillOpacity={1}
                                fill="url(#colorProfit)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-64 text-text-secondary">
                        <p>لا توجد بيانات دخل لعرضها في الفترة المحددة.</p>
                    </div>
                )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 bg-surface p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-bold mb-4">المبيعات والمشتريات والمصروفات</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="month" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" tickFormatter={value => formatNumber(value as number, 0)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ direction: 'ltr' }} />
                            <Bar name="المبيعات" dataKey="sales" fill="#0D9488" radius={[4, 4, 0, 0]} />
                            <Bar name="المشتريات" dataKey="purchases" fill="#F97316" radius={[4, 4, 0, 0]} />
                            <Bar name="المصروفات" dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
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
                        <div className="flex items-center justify-center h-96 text-text-secondary"><p>لا توجد بيانات مصروفات للعرض.</p></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserAnalyticsPage;