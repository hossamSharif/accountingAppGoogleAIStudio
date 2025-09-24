
import React, { useState } from 'react';
import { Shop, FinancialYear, User, Account, Transaction } from '../types';
import ShopManagementPage from './ShopManagementPage';
import UserManagementPage from './UserManagementPage';
import StockValueModal from '../components/StockValueModal';
import FinancialYearModal from '../components/FinancialYearModal';
import FinancialYearList from '../components/FinancialYearList';
import ShopAccountsView from './ShopAccountsView';
import AccountsPage from './AccountsPage';

enum SettingsTab {
    SHOPS = 'إدارة المتاجر',
    USERS = 'إدارة المستخدمين',
    FINANCIAL_YEARS = 'السنوات المالية',
    ACCOUNTS = 'شجرة الحسابات'
}

interface SettingsPageProps {
    activeShop: Shop | null;
    // Shops
    shops: Shop[];
    onAddShop: (shop: Omit<Shop, 'id'>) => void;
    onUpdateShop: (shop: Shop) => void;
    onToggleShopStatus: (shopId: string) => void;
    // Users
    users: User[];
    onAddUser: (user: Omit<User, 'id' | 'role' | 'isActive'>) => void;
    onUpdateUser: (user: User) => void;
    onToggleUserStatus: (userId: string) => void;
    onDeleteUser: (userId: string) => void;
    // Financial Years
    financialYears: FinancialYear[];
    onAddFinancialYear: (fy: Omit<FinancialYear, 'id' | 'status'>) => void;
    onCloseFinancialYear: (fyId: string, closingStockValue: number) => void;
    // Accounts
    accounts: Account[];
    transactions: Transaction[];
    onAddAccount: (accountData: Omit<Account, 'id' | 'shopId' | 'isActive'>, forShopId?: string) => Account | null;
    onUpdateAccount: (account: Account) => void;
    onToggleAccountStatus: (accountId: string) => void;
    onDeleteAccount: (accountId: string) => void;
}

const PlusIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>;


const SettingsPage: React.FC<SettingsPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>(SettingsTab.SHOPS);
    const [isFyModalOpen, setIsFyModalOpen] = useState(false);
    const [closingYear, setClosingYear] = useState<FinancialYear | null>(null);
    const [viewingAccountsForShop, setViewingAccountsForShop] = useState<Shop | null>(null);

    const handleCloseYear = (stockValue: number) => {
        if (closingYear) {
            props.onCloseFinancialYear(closingYear.id, stockValue);
        }
        setClosingYear(null);
    };
    
    // Reset child view when changing tabs
    React.useEffect(() => {
        setViewingAccountsForShop(null);
    }, [activeTab]);

    const renderActiveTab = () => {
        switch (activeTab) {
            case SettingsTab.SHOPS:
                if (viewingAccountsForShop) {
                    return <ShopAccountsView 
                        shop={viewingAccountsForShop}
                        accounts={props.accounts.filter(a => a.shopId === viewingAccountsForShop.id)}
                        transactions={props.transactions.filter(t => t.shopId === viewingAccountsForShop.id)}
                        onAddAccount={props.onAddAccount}
                        onUpdateAccount={props.onUpdateAccount}
                        onToggleAccountStatus={props.onToggleAccountStatus}
                        onDeleteAccount={props.onDeleteAccount}
                        onBack={() => setViewingAccountsForShop(null)}
                    />
                }
                return <ShopManagementPage 
                    shops={props.shops}
                    onAddShop={props.onAddShop}
                    onUpdateShop={props.onUpdateShop}
                    onToggleShopStatus={props.onToggleShopStatus}
                    onViewAccounts={(shop) => setViewingAccountsForShop(shop)}
                />;
            case SettingsTab.USERS:
                return <UserManagementPage 
                    users={props.users}
                    shops={props.shops}
                    onAddUser={props.onAddUser}
                    onUpdateUser={props.onUpdateUser}
                    onToggleUserStatus={props.onToggleUserStatus}
                    onDeleteUser={props.onDeleteUser}
                />;
            case SettingsTab.FINANCIAL_YEARS:
                 if (!props.activeShop) {
                    return (
                        <div className="text-center bg-surface p-8 rounded-lg mt-6">
                            <h2 className="text-2xl font-bold mb-2">الرجاء تحديد متجر</h2>
                            <p className="text-text-secondary">يجب عليك تحديد متجر من القائمة في الأعلى لعرض وإدارة سنواته المالية.</p>
                        </div>
                    );
                }
                const shopFinancialYears = props.financialYears.filter(fy => fy.shopId === props.activeShop?.id);
                return (
                    <div className="space-y-6">
                         <div className="flex justify-between items-center gap-4 flex-wrap">
                            <h2 className="text-2xl font-bold">السنوات المالية لـ "{props.activeShop.name}"</h2>
                             <button onClick={() => setIsFyModalOpen(true)} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg">
                                 <PlusIcon />
                                 <span>إضافة سنة مالية جديدة</span>
                             </button>
                         </div>
                         <div className="bg-surface p-6 rounded-lg shadow-lg">
                             <FinancialYearList financialYears={shopFinancialYears} onCloseYear={fy => setClosingYear(fy)} />
                         </div>
                     </div>
                );
            case SettingsTab.ACCOUNTS:
                if (!props.activeShop) {
                    return (
                        <div className="text-center bg-surface p-8 rounded-lg mt-6">
                            <h2 className="text-2xl font-bold mb-2">الرجاء تحديد متجر</h2>
                            <p className="text-text-secondary">يجب عليك تحديد متجر من القائمة في الأعلى لعرض شجرة الحسابات الخاصة به.</p>
                        </div>
                    );
                }
                return <AccountsPage
                    accounts={props.accounts.filter(a => a.shopId === props.activeShop?.id)}
                    transactions={props.transactions.filter(t => t.shopId === props.activeShop?.id)}
                    onAddAccount={(accountData) => props.onAddAccount(accountData, props.activeShop?.id)}
                    onUpdateAccount={props.onUpdateAccount}
                    onToggleAccountStatus={props.onToggleAccountStatus}
                    onDeleteAccount={props.onDeleteAccount}
                />;
            default:
                return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">إعدادات النظام</h1>

            <div className="bg-surface rounded-lg p-2 shadow-md">
                <div className="flex space-x-2 space-x-reverse">
                    {(Object.values(SettingsTab) as SettingsTab[]).map(tab => (
                         <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md font-medium transition-colors duration-300 ${activeTab === tab ? 'bg-primary text-white' : 'text-text-secondary hover:bg-background'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="mt-6">
                {renderActiveTab()}
            </div>
            
            {props.activeShop && (
                <FinancialYearModal 
                    isOpen={isFyModalOpen}
                    onClose={() => setIsFyModalOpen(false)}
                    onSave={(fyData) => {
                        props.onAddFinancialYear(fyData);
                        setIsFyModalOpen(false);
                    }}
                    shopId={props.activeShop.id}
                    existingYears={props.financialYears.filter(fy => fy.shopId === props.activeShop?.id)}
                />
            )}
            
            {closingYear && (
                <StockValueModal 
                    isOpen={!!closingYear}
                    onClose={() => setClosingYear(null)}
                    onConfirm={handleCloseYear}
                    financialYearName={closingYear.name}
                />
            )}
        </div>
    );
};

export default SettingsPage;