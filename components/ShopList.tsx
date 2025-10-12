
import React from 'react';
import { Shop } from '../types';

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
);
const ToggleOnIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"></path></svg>
);
const ToggleOffIcon = () => (
     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
);
const AccountsIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>;


interface ShopListProps {
    shops: Shop[];
    onEdit: (shop: Shop) => void;
    onToggleStatus: (shopId: string) => void;
    onViewAccounts: (shop: Shop) => void;
    isLoading?: boolean;
}

const ShopList: React.FC<ShopListProps> = ({ shops, onEdit, onToggleStatus, onViewAccounts, isLoading = false }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead>
                    <tr className="border-b border-gray-700 text-text-secondary">
                        <th className="p-3">اسم المتجر</th>
                        <th className="p-3">الوصف</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3 text-left">الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    {shops.map((shop, index) => (
                        <tr key={shop.id} className={`border-b border-gray-700 transition-colors duration-200 hover:bg-background/50 ${index % 2 === 0 ? 'bg-background/20' : ''}`}>
                            <td className="p-3 font-medium text-text-primary">{shop.name}</td>
                            <td className="p-3 text-text-secondary">{shop.description}</td>
                            <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${shop.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {shop.isActive ? 'نشط' : 'غير نشط'}
                                </span>
                            </td>
                            <td className="p-3 text-left">
                                <button
                                    onClick={() => onViewAccounts(shop)}
                                    disabled={isLoading}
                                    className="text-primary hover:text-yellow-400 p-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={`عرض حسابات ${shop.name}`}
                                    aria-label={`عرض حسابات ${shop.name}`}
                                >
                                    <AccountsIcon />
                                </button>
                                <button
                                    onClick={() => onEdit(shop)}
                                    disabled={isLoading}
                                    className="text-accent hover:text-blue-400 p-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={`تعديل ${shop.name}`}
                                    aria-label={`تعديل ${shop.name}`}
                                >
                                    <EditIcon />
                                </button>
                                <button
                                    onClick={() => onToggleStatus(shop.id)}
                                    disabled={isLoading}
                                    className={`p-2 mr-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${shop.isActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                                    title={`${shop.isActive ? 'إلغاء تفعيل' : 'تفعيل'} ${shop.name}`}
                                    aria-label={`${shop.isActive ? 'إلغاء تفعيل' : 'تفعيل'} ${shop.name}`}
                                >
                                    {shop.isActive ? <ToggleOffIcon /> : <ToggleOnIcon />}
                                </button>
                            </td>
                        </tr>
                    ))}
                     {shops.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center p-6 text-text-secondary">
                                لم يتم إضافة أي متاجر بعد.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default ShopList;
