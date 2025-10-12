import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Shop, User, Page, Notification, LogType } from '../types';
import { useTranslation } from '../i18n/useTranslation';

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
}

const Layout: React.FC<LayoutProps> = ({
    children, activeShop, currentUser, page, setPage, onLogout, shops, onSelectShop,
    notifications, onAddLog, onMarkNotificationsRead
}) => {
    const { dir } = useTranslation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    useEffect(() => {
        const handleResize = () => {
            const desktop = window.innerWidth >= 1024;
            setIsDesktop(desktop);
            if (desktop) {
                setIsSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        if (!isDesktop) {
            setIsSidebarOpen(false);
        }
    };

    return (
        <div className="flex h-screen bg-background" dir={dir}>
            {/* Overlay for mobile */}
            {isSidebarOpen && !isDesktop && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            <Sidebar
                page={page}
                setPage={setPage}
                currentUser={currentUser}
                notifications={notifications}
                onAddLog={onAddLog}
                onMarkNotificationsRead={onMarkNotificationsRead}
                isOpen={isSidebarOpen}
                isDesktop={isDesktop}
                onClose={closeSidebar}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    activeShop={activeShop}
                    currentUser={currentUser}
                    onLogout={onLogout}
                    shops={shops}
                    onSelectShop={onSelectShop}
                    setPage={setPage}
                    onToggleSidebar={toggleSidebar}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;