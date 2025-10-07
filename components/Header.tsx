import React, { useState, useRef, useEffect } from 'react';
import { Shop, User, Page } from '../types';

const LogoutIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>;
const RefreshIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5M15 4h5v5M9 20H4v-5"></path></svg>;
const ProfileIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;
const MenuIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>;


interface HeaderProps {
    activeShop: Shop | null;
    currentUser: User;
    onLogout: () => void;
    shops: Shop[];
    onSelectShop: (shop: Shop) => void;
    setPage: (page: Page) => void;
    onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeShop, currentUser, onLogout, shops, onSelectShop, setPage, onToggleSidebar }) => {
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleShopChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const shopId = event.target.value;
        const selectedShop = shops.find(s => s.id === shopId);
        if (selectedShop) {
            onSelectShop(selectedShop);
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const activeShops = shops.filter(s => s.isActive);

    return (
        <header className="bg-surface shadow-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {/* Hamburger Menu Button for Mobile */}
                <button
                    onClick={onToggleSidebar}
                    className="lg:hidden p-2 text-text-primary hover:bg-gray-700 rounded-md transition-colors"
                    aria-label="Toggle menu"
                >
                    <MenuIcon />
                </button>

                {/* For User: Show Refresh Button Only */}
                {currentUser.role === 'user' && (
                    <button
                        onClick={handleRefresh}
                        title="تحديث"
                        className="p-2 bg-background text-text-secondary hover:text-text-primary hover:bg-gray-700 rounded-md transition-colors border border-gray-700"
                    >
                        <RefreshIcon />
                    </button>
                )}
            </div>

            {/* User Profile Section */}
            <div className="flex items-center" ref={userDropdownRef}>
                <div className="relative">
                     <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="flex items-center focus:outline-none">
                        <div className="text-left mr-4">
                            <p className="font-bold text-text-primary">{currentUser.name}</p>
                            <p className="text-sm text-text-secondary">{currentUser.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</p>
                            {/* For User: Show Shop Label */}
                            {currentUser.role === 'user' && activeShop && (
                                <p className="text-xs text-primary mt-1">{activeShop.name}</p>
                            )}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                            {currentUser.name.charAt(0)}
                        </div>
                    </button>
                     {isUserDropdownOpen && (
                        <div className="absolute start-0 mt-2 w-48 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-options-menu">
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPage(Page.PROFILE);
                                        setIsUserDropdownOpen(false);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-gray-600 hover:text-white"
                                    role="menuitem"
                                >
                                    <ProfileIcon />
                                    <span className="mr-2">الملف الشخصي</span>
                                </a>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); onLogout(); }}
                                    className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-red-600/50 hover:text-white"
                                    role="menuitem"
                                >
                                    <LogoutIcon />
                                    <span className="mr-2">تسجيل الخروج</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;