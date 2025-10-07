
import React, { useState } from 'react';
import { Shop, FinancialYear, User, Account, Transaction } from '../types';
import ShopManagementPage from './ShopManagementPage';
import UserManagementPage from './UserManagementPage';
import ShopAccountsView from './ShopAccountsView';
import AccountsPage from './AccountsPage';
import { FinancialYearManagementPage } from './FinancialYearManagementPage';

enum SettingsTab {
    SHOPS = 'إدارة المتاجر',
    USERS = 'إدارة المستخدمين',
    FINANCIAL_YEARS = 'السنوات المالية',
    ACCOUNTS = 'شجرة الحسابات',
    ADMIN_TOOLS = 'أدوات الإدارة'
}

interface SettingsPageProps {
    currentUser: User | null;
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
    const [viewingAccountsForShop, setViewingAccountsForShop] = useState<Shop | null>(null);

    // Handle case when user is not logged in
    if (!props.currentUser) {
        return (
            <div className="text-center bg-surface p-8 rounded-lg">
                <h2 className="text-2xl font-bold mb-2">يتطلب تسجيل الدخول</h2>
                <p className="text-text-secondary">يجب عليك تسجيل الدخول للوصول إلى إعدادات النظام.</p>
            </div>
        );
    }

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
                    currentUser={props.currentUser!}
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
                return <FinancialYearManagementPage />;
            case SettingsTab.ACCOUNTS:
                if (!props.activeShop) {
                    return (
                        <div className="text-center bg-surface p-8 rounded-lg mt-6">
                            <h2 className="text-2xl font-bold mb-2">الرجاء تحديد متجر</h2>
                            <p className="text-text-secondary">يجب عليك تحديد متجر من القائمة في الأعلى لعرض شجرة الحسابات الخاصة به.</p>
                        </div>
                    );
                }
                return <AccountsPage />;
            case SettingsTab.ADMIN_TOOLS:
                return (
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4">أدوات الإدارة</h2>
                        <p>المستخدم الحالي: {props.currentUser!.name}</p>
                        <p>الدور: {props.currentUser!.role}</p>
                        {props.currentUser!.role === 'admin' ? (
                            <div className="mt-4 p-4 bg-blue-50 rounded">
                                <p>أدوات الإدارة متاحة</p>
                            </div>
                        ) : (
                            <div className="mt-4 p-4 bg-red-50 rounded">
                                <p>غير مسموح لك بالوصول لأدوات الإدارة</p>
                            </div>
                        )}
                    </div>
                );
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
        </div>
    );
};

export default SettingsPage;