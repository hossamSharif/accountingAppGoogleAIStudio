
import React, { useState, useMemo } from 'react';
import { Account, AccountType, Transaction, Shop } from '../types';
import AccountList from '../components/AccountList';
import AccountModal from '../components/AccountModal';
import ConfirmationModal from '../components/ConfirmationModal';

interface ShopAccountsViewProps {
    shop: Shop;
    accounts: Account[];
    transactions: Transaction[];
    onAddAccount: (account: Omit<Account, 'id' | 'isActive' | 'shopId'>, forShopId: string) => void;
    onUpdateAccount: (account: Account) => void;
    onToggleAccountStatus: (accountId: string) => void;
    onDeleteAccount: (accountId: string) => void;
    onBack: () => void;
}

const PlusIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>;
const SearchIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
const BackIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>;


const ShopAccountsView: React.FC<ShopAccountsViewProps> = ({ shop, accounts, transactions, onAddAccount, onUpdateAccount, onToggleAccountStatus, onBack, onDeleteAccount }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [togglingStatusAccount, setTogglingStatusAccount] = useState<Account | null>(null);
    const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleOpenModal = (account: Account | null = null) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };
    const handleSaveAccount = (accountData: Omit<Account, 'id' | 'isActive' | 'shopId'> | Account) => {
        if ('id' in accountData) {
            onUpdateAccount(accountData as Account);
        } else {
            onAddAccount(accountData, shop.id);
        }
        handleCloseModal();
    };
    const handleConfirmToggleStatus = () => {
        if (togglingStatusAccount) {
            onToggleAccountStatus(togglingStatusAccount.id);
            setTogglingStatusAccount(null);
        }
    };
    
    const handleConfirmDelete = () => {
        if (deletingAccount) {
            onDeleteAccount(deletingAccount.id);
            setDeletingAccount(null);
        }
    };

    const accountBalances = useMemo(() => {
        const balances: { [key: string]: number } = {};
        accounts.forEach(acc => { balances[acc.id] = 0; });
        transactions.forEach(t => {
            t.entries.forEach(entry => { if (balances[entry.accountId] !== undefined) balances[entry.accountId] += entry.amount; });
        });
        const parentIds = new Set(accounts.filter(a => a.parentId).map(a => a.parentId));
        const childBalances: { [key: string]: number } = {};
        for(const acc of accounts){
             if(!parentIds.has(acc.id)){ let current = acc; let balance = balances[acc.id];
                while(current.parentId){
                    if(!childBalances[current.parentId]) childBalances[current.parentId] = 0;
                    childBalances[current.parentId] += balance;
                    const parent = accounts.find(a => a.id === current.parentId); if(!parent) break; current = parent;
                }
             }
        }
        const finalBalances = {...balances};
        for(const accId in childBalances) finalBalances[accId] += childBalances[accId];
        return finalBalances;
    }, [accounts, transactions]);

    const filteredAccounts = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return accounts;
        const matchingAccounts = accounts.filter(acc => acc.name.toLowerCase().includes(query));
        const matchingAccountIds = new Set(matchingAccounts.map(acc => acc.id));
        matchingAccounts.forEach(acc => { if (acc.parentId) matchingAccountIds.add(acc.parentId); });
        return accounts.filter(acc => matchingAccountIds.has(acc.id));
    }, [accounts, searchQuery]);

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center gap-4 flex-wrap">
                <h2 className="text-2xl font-bold">شجرة حسابات: <span className="text-primary">{shop.name}</span></h2>
                <button onClick={onBack} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg">
                    <BackIcon />
                    <span>الرجوع للمتاجر</span>
                </button>
            </div>
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><SearchIcon /></div>
                    <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن حساب بالاسم..." className="w-full bg-surface border border-gray-600 rounded-lg p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary placeholder-gray-400" />
                </div>
                <button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex items-center shadow-lg transform hover:scale-105">
                    <PlusIcon />
                    <span>إضافة حساب جديد</span>
                </button>
            </div>
            <AccountList 
                accounts={filteredAccounts} 
                transactions={transactions}
                onEdit={(account) => handleOpenModal(account)} 
                onToggleStatus={(account) => setTogglingStatusAccount(account)} 
                onDelete={(account) => setDeletingAccount(account)}
                accountBalances={accountBalances} 
            />
            <AccountModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveAccount} accountToEdit={editingAccount} accounts={accounts} />
            {togglingStatusAccount && (
                <ConfirmationModal isOpen={!!togglingStatusAccount} onClose={() => setTogglingStatusAccount(null)} onConfirm={handleConfirmToggleStatus} title={togglingStatusAccount.isActive ? 'تأكيد إلغاء التفعيل' : 'تأكيد التفعيل'} message={`هل أنت متأكد من ${togglingStatusAccount.isActive ? 'إلغاء تفعيل' : 'تفعيل'} حساب "${togglingStatusAccount.name}"؟`} confirmText={togglingStatusAccount.isActive ? 'إلغاء التفعيل' : 'تفعيل'} isDestructive={togglingStatusAccount.isActive} />
            )}
            {deletingAccount && (
                <ConfirmationModal 
                    isOpen={!!deletingAccount} 
                    onClose={() => setDeletingAccount(null)}
                    onConfirm={handleConfirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف حساب "${deletingAccount.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                    confirmText="حذف"
                    isDestructive={true}
                />
            )}
        </div>
    );
};

export default ShopAccountsView;