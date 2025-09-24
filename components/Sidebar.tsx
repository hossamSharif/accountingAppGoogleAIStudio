import React from 'react';
import { User, Page, Notification, LogType } from '../types';

// Icons
const DashboardIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>;
const AccountsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>;
const SettingsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>;
const ProfileIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;
const NotificationIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>;
const ShopLogsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H21"></path></svg>;
const AnalyticsIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg>;
const StatementIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>;


interface SidebarProps {
    page: Page;
    setPage: (page: Page) => void;
    currentUser: User;
    notifications: Notification[];
    onAddLog: (type: LogType, message: string) => void;
    onMarkNotificationsRead: () => void;
}

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    targetPage: Page;
    currentPage: Page;
    setPage: (page: Page) => void;
    badgeCount?: number;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, targetPage, currentPage, setPage, badgeCount = 0, onClick }) => {
    const isActive = currentPage === targetPage;
    return (
        <a
            href="#"
            onClick={(e) => {
                e.preventDefault();
                setPage(targetPage);
                if (onClick) onClick();
            }}
            className={`flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${isActive ? 'bg-primary text-white' : 'text-text-secondary hover:bg-gray-700 hover:text-text-primary'}`}
        >
            {icon}
            <span className="mr-4">{label}</span>
            {badgeCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {badgeCount}
                </span>
            )}
        </a>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ page, setPage, currentUser, notifications, onMarkNotificationsRead }) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const userNavItems = [
        { icon: <DashboardIcon />, label: 'لوحة التحكم', page: Page.DASHBOARD },
        { icon: <AccountsIcon />, label: 'شجرة الحسابات', page: Page.ACCOUNTS },
        { icon: <StatementIcon />, label: 'كشف حساب', page: Page.STATEMENT },
        { icon: <AnalyticsIcon />, label: 'التحليلات', page: Page.ANALYTICS },
        { icon: <ProfileIcon />, label: 'الملف الشخصي', page: Page.PROFILE },
    ];
    
    const adminNavItems = [
        { icon: <DashboardIcon />, label: 'لوحة التحكم', page: Page.DASHBOARD },
        { icon: <StatementIcon />, label: 'كشف حساب', page: Page.STATEMENT },
        { icon: <AnalyticsIcon />, label: 'التحليلات', page: Page.ANALYTICS },
        { icon: <ShopLogsIcon />, label: 'سجلات المتاجر', page: Page.SHOP_LOGS },
        { icon: <SettingsIcon />, label: 'الإعدادات', page: Page.SETTINGS },
    ];

    const navItems = currentUser.role === 'admin' ? adminNavItems : userNavItems;

    return (
        <aside className="w-64 bg-surface text-text-primary flex flex-col p-4 border-l border-gray-700">
            <div className="flex items-center justify-center py-4 mb-6">
                <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1h4v1m-4 10v-1h4v1m-4-7h-2l-1 1v1h3v1h-3v1l1 1h2m0-7V7m0 1v.01"></path></svg>
                <h1 className="text-xl font-bold mr-2">محاسبة</h1>
            </div>
            <nav className="flex-1">
                {navItems.map(item => (
                    <NavItem key={item.page} icon={item.icon} label={item.label} targetPage={item.page} currentPage={page} setPage={setPage} />
                ))}
                {/* Notifications are visible to all */}
                <NavItem 
                    icon={<NotificationIcon />}
                    label="الإشعارات"
                    targetPage={Page.NOTIFICATIONS}
                    currentPage={page}
                    setPage={setPage}
                    badgeCount={unreadCount}
                    onClick={onMarkNotificationsRead}
                />
            </nav>
        </aside>
    );
};

export default Sidebar;