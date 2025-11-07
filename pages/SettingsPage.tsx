
import React, { useState } from 'react';
import { Shop, FinancialYear, User, Account, Transaction } from '../types';
import ShopManagementPage from './ShopManagementPage';
import UserManagementPage from './UserManagementPage';
import ShopAccountsView from './ShopAccountsView';
import AccountsPage from './AccountsPage';
import { FinancialYearManagementPage } from './FinancialYearManagementPage';
import ScrollableTabs from '../components/ScrollableTabs';
import { useTranslation } from '../i18n/useTranslation';
import BackupManager from '../components/BackupManager';

enum SettingsTab {
    SHOPS = 'shops',
    USERS = 'users',
    FINANCIAL_YEARS = 'financialYears',
    ACCOUNTS = 'accounts',
    BACKUP = 'backup'
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
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<SettingsTab>(SettingsTab.SHOPS);
    const [viewingAccountsForShop, setViewingAccountsForShop] = useState<Shop | null>(null);

    // Handle case when user is not logged in
    if (!props.currentUser) {
        return (
            <div className="text-center bg-surface p-8 rounded-lg">
                <h2 className="text-2xl font-bold mb-2">{t('settings.messages.loginRequired')}</h2>
                <p className="text-text-secondary">{t('settings.messages.loginRequiredMessage')}</p>
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
                            <h2 className="text-2xl font-bold mb-2">{t('settings.messages.selectShop')}</h2>
                            <p className="text-text-secondary">{t('settings.messages.selectShopMessage')}</p>
                        </div>
                    );
                }
                return <AccountsPage />;
            case SettingsTab.BACKUP:
                return <BackupManager />;
            default:
                return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">{t('settings.title')}</h1>

            <div className="bg-surface rounded-lg shadow-md">
                <ScrollableTabs
                    tabs={(Object.values(SettingsTab) as SettingsTab[]).map(tab => ({
                        id: tab,
                        label: t(`settings.tabs.${tab}`)
                    }))}
                    activeTab={activeTab}
                    onTabChange={(tabId) => setActiveTab(tabId as SettingsTab)}
                />
            </div>

            <div className="mt-6">
                {renderActiveTab()}
            </div>
        </div>
    );
};

export default SettingsPage;