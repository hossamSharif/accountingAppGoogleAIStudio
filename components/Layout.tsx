import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Shop, User, Page, Notification, LogType, Transaction, Account } from '../types';

interface LayoutProps {
    children: React.ReactNode;
    activeShop: Shop | null;
    currentUser: User;
    page: Page;
    setPage: (page: Page) => void;
    onLogout: () => void;
    shops: Shop[];
    onSelectShop: (shop: Shop | null) => void;
    notifications: Notification[];
    onAddLog: (type: LogType, message: string) => void;
    onMarkNotificationsRead: () => void;
    dailyTransactions: Transaction[];
    accounts: Account[];
    selectedDate: Date;
}

const Layout: React.FC<LayoutProps> = ({ 
    children, activeShop, currentUser, page, setPage, onLogout, shops, onSelectShop, 
    notifications, onAddLog, onMarkNotificationsRead, dailyTransactions, accounts, selectedDate
}) => {
    return (
        <div className="flex h-screen bg-background">
            <Sidebar 
                page={page} 
                setPage={setPage} 
                currentUser={currentUser} 
                notifications={notifications}
                onAddLog={onAddLog}
                onMarkNotificationsRead={onMarkNotificationsRead}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    activeShop={activeShop}
                    currentUser={currentUser}
                    onLogout={onLogout}
                    shops={shops}
                    onSelectShop={onSelectShop}
                    onAddLog={onAddLog}
                    dailyTransactions={dailyTransactions}
                    accounts={accounts}
                    selectedDate={selectedDate}
                    setPage={setPage}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;