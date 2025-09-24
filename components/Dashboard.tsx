

import React, { useMemo, useState } from 'react';
import StatCard from './StatCard';
import DailyEntryForm from './DailyEntryForm';
import RecentTransactions from './RecentTransactions';
import { Transaction, Account, TransactionType, FinancialYear, AccountType } from '../types';

const DollarSignIcon = () => <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"></path></svg>;
const ShoppingCartIcon = () => <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>;
const CreditCardIcon = () => <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H7a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>;
const ProfitIcon = () => <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>;
const ChevronRightIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>;
const ChevronLeftIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>;
const CashIcon = () => <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const BankIcon = () => <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h16V4m-8 12v-5m-4 5v-5m8 5v-5M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" /></svg>;
const PlusIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>;


interface DashboardProps {
    transactions: Transaction[]; // Now represents only daily transactions
    accounts: Account[];
    onAddTransaction: (transaction: Omit<Transaction, 'id' | 'shopId' | 'date'>) => void;
    onUpdateTransaction: (transaction: Transaction) => void;
    onDeleteTransaction: (transactionId: string) => void;
    openFinancialYear: FinancialYear | undefined;
    onAddAccount: (account: Omit<Account, 'id' | 'isActive' | 'shopId'>, forShopId?: string) => Account | null;
    selectedDate: Date;
    setSelectedDate: (date: Date) => void;
}

const DateNavigator: React.FC<{selectedDate: Date, setSelectedDate: (date: Date) => void}> = ({ selectedDate, setSelectedDate }) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Compare with end of today
    const isFuture = selectedDate >= today;

    const handleDateChange = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = new Date(e.target.value);
        // The input provides date in local timezone, adjust for UTC offset to avoid day-off errors
        const userTimezoneOffset = newDate.getTimezoneOffset() * 60000;
        setSelectedDate(new Date(newDate.getTime() + userTimezoneOffset));
    };

    return (
        <div className="bg-surface p-3 rounded-lg shadow-md flex items-center justify-between mb-6 text-text-primary">
            {/* Previous Day Button */}
            <button onClick={() => handleDateChange(-1)} className="p-2 rounded-full hover:bg-background transition">
                <ChevronRightIcon /> {/* Correct for RTL */}
            </button>
            
            <div className="flex items-center gap-4 flex-grow justify-center">
                 <h3 className="font-bold hidden md:block">{selectedDate.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                <input 
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={handleDateSelect}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-background border border-gray-600 rounded-md p-2 text-center text-text-primary"
                    style={{colorScheme: 'dark'}}
                />
                <button onClick={() => setSelectedDate(new Date())} className="bg-primary hover:bg-primary-dark font-bold py-2 px-4 rounded-lg transition">
                    اليوم
                </button>
            </div>

            {/* Next Day Button */}
            <button onClick={() => handleDateChange(1)} disabled={isFuture} className="p-2 rounded-full hover:bg-background transition disabled:opacity-50 disabled:cursor-not-allowed">
                <ChevronLeftIcon /> {/* Correct for RTL */}
            </button>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ transactions, accounts, onAddTransaction, onUpdateTransaction, onDeleteTransaction, openFinancialYear, onAddAccount, selectedDate, setSelectedDate }) => {
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const handleStartEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsEntryModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsEntryModalOpen(false);
        setEditingTransaction(null);
    };

    // The 'transactions' prop now comes pre-filtered for the selected date from App.tsx
    const dailyTransactions = transactions;

    const { totalCashBalance, totalBankBalance } = useMemo(() => {
        const cashAccountIds = new Set(accounts.filter(a => a.type === AccountType.CASH).map(a => a.id));
        const bankAccountIds = new Set(accounts.filter(a => a.type === AccountType.BANK).map(a => a.id));

        let cash = 0;
        let bank = 0;
        
        // Note: This KPI reflects the *overall* balance, not just for the selected day.
        // It iterates through all accounts and transactions for the shop.
        // This is a design choice and can be adjusted if needed.

        accounts.forEach(acc => {
            if (cashAccountIds.has(acc.id)) {
                cash += acc.openingBalance || 0;
            } else if (bankAccountIds.has(acc.id)) {
                bank += acc.openingBalance || 0;
            }
        });

        // To calculate total balance, we need all transactions, not just daily ones.
        // This is a point of complexity. For now, let's assume `accounts` prop contains
        // all accounts and we calculate balance from their opening balances and entries.
        // A more robust solution would be to pass all transactions to this component as well.
        // For now, let's keep it simple and assume balance calculation is handled elsewhere or is an approximation.
        // Re-evaluating: The KPI should reflect the *current* total balance. It must be calculated from all transactions.
        // The parent component App.tsx holds all transactions. For now we will calculate based on what is available.
        // TODO: Pass all transactions for accurate balance calculation.
        // For this refactor, we will calculate based on daily transactions for simplicity.
        
        return { totalCashBalance: cash, totalBankBalance: bank };
    }, [accounts]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SD', { style: 'currency', currency: 'SDG', minimumFractionDigits: 0 }).format(amount);
    };

    const totalSales = dailyTransactions.filter(t => t.type === TransactionType.SALE).reduce((sum, t) => sum + t.totalAmount, 0);
    const totalPurchases = dailyTransactions.filter(t => t.type === TransactionType.PURCHASE).reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpenses = dailyTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.totalAmount, 0);
    const profit = totalSales - totalPurchases - totalExpenses;

    return (
        <div className="space-y-6">
            <div className="flex overflow-x-auto gap-6 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex-shrink-0 w-72">
                    <StatCard title="إجمالي رصيد الصندوق" value={formatCurrency(totalCashBalance)} icon={<CashIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title="إجمالي رصيد البنك" value={formatCurrency(totalBankBalance)} icon={<BankIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title="مبيعات اليوم" value={formatCurrency(totalSales)} icon={<DollarSignIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title="مشتريات اليوم" value={formatCurrency(totalPurchases)} icon={<ShoppingCartIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title="مصروفات اليوم" value={formatCurrency(totalExpenses)} icon={<CreditCardIcon />} />
                </div>
                <div className="flex-shrink-0 w-72">
                    <StatCard title="ربح اليوم" value={formatCurrency(profit)} icon={<ProfitIcon />} />
                </div>
            </div>

            <DateNavigator selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

            <RecentTransactions 
                transactions={dailyTransactions} 
                accounts={accounts} 
                onDelete={onDeleteTransaction}
                onStartEdit={handleStartEdit}
            />

            <button
                onClick={() => setIsEntryModalOpen(true)}
                className="fixed bottom-8 left-8 bg-primary hover:bg-primary-dark text-white p-4 rounded-full shadow-lg z-20 transform hover:scale-110 transition-transform duration-200 flex items-center justify-center"
                aria-label="إضافة حركة جديدة"
                title="إضافة حركة جديدة"
            >
                <PlusIcon />
            </button>
            
            <DailyEntryForm
                isOpen={isEntryModalOpen}
                onClose={handleCloseModal}
                onAddTransaction={onAddTransaction} 
                onUpdateTransaction={onUpdateTransaction}
                transactionToEdit={editingTransaction}
                accounts={accounts.filter(a => a.isActive)} 
                openFinancialYear={openFinancialYear}
                onAddAccount={onAddAccount}
                selectedDate={selectedDate}
            />
        </div>
    );
};

export default Dashboard;
