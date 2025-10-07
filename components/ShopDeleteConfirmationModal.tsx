import React, { useState } from 'react';
import { Shop } from '../types';

interface ShopDeleteConfirmationModalProps {
    isOpen: boolean;
    shop: Shop | null;
    shopStats: {
        usersCount: number;
        activeUsersCount: number;
        accountsCount: number;
        transactionsCount: number;
        lastTransactionDate?: string;
    } | null;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

const ShopDeleteConfirmationModal: React.FC<ShopDeleteConfirmationModalProps> = ({
    isOpen,
    shop,
    shopStats,
    onClose,
    onConfirm,
    isLoading = false
}) => {
    const [confirmText, setConfirmText] = useState('');
    const [step, setStep] = useState<'warning' | 'confirm'>('warning');

    if (!isOpen || !shop) return null;

    const hasData = shopStats && (
        shopStats.accountsCount > 0 ||
        shopStats.transactionsCount > 0 ||
        shopStats.usersCount > 0
    );

    const handleProceed = () => {
        setStep('confirm');
    };

    const handleConfirm = () => {
        if (confirmText === shop.shopCode) {
            onConfirm();
        }
    };

    const handleClose = () => {
        setConfirmText('');
        setStep('warning');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
                {step === 'warning' ? (
                    <>
                        <div className="flex items-center mb-4">
                            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-red-400">تحذير: حذف المتجر نهائياً</h2>
                        </div>

                        <div className="mb-6">
                            <p className="text-lg mb-2">
                                أنت على وشك حذف متجر: <strong className="text-primary">{shop.name}</strong>
                            </p>
                            <p className="text-sm text-gray-400">
                                رمز المتجر: <strong>{shop.shopCode}</strong>
                            </p>
                        </div>

                        {hasData && (
                            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
                                <h3 className="font-semibold text-red-400 mb-3">⚠️ سيتم حذف البيانات التالية نهائياً:</h3>
                                <ul className="space-y-2 text-sm">
                                    {shopStats.accountsCount > 0 && (
                                        <li className="flex justify-between">
                                            <span>عدد الحسابات:</span>
                                            <span className="font-bold text-red-400">{shopStats.accountsCount} حساب</span>
                                        </li>
                                    )}
                                    {shopStats.transactionsCount > 0 && (
                                        <li className="flex justify-between">
                                            <span>عدد المعاملات:</span>
                                            <span className="font-bold text-red-400">{shopStats.transactionsCount} معاملة</span>
                                        </li>
                                    )}
                                    {shopStats.usersCount > 0 && (
                                        <li className="flex justify-between">
                                            <span>المستخدمون المرتبطون:</span>
                                            <span className="font-bold text-red-400">
                                                {shopStats.usersCount} مستخدم
                                                {shopStats.activeUsersCount > 0 && ` (${shopStats.activeUsersCount} نشط)`}
                                            </span>
                                        </li>
                                    )}
                                    {shopStats.lastTransactionDate && (
                                        <li className="flex justify-between">
                                            <span>آخر معاملة:</span>
                                            <span className="font-bold text-yellow-400">
                                                {new Date(shopStats.lastTransactionDate).toLocaleDateString('ar-SA')}
                                            </span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4 mb-6">
                            <h3 className="font-semibold text-yellow-400 mb-2">⚠️ تنبيه مهم:</h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-300">
                                <li>هذا الإجراء لا يمكن التراجع عنه</li>
                                <li>سيتم حذف جميع البيانات المرتبطة بالمتجر نهائياً</li>
                                <li>لن تتمكن من استعادة البيانات المحذوفة</li>
                                <li>يُنصح بأخذ نسخة احتياطية قبل المتابعة</li>
                            </ul>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={handleClose}
                                disabled={isLoading}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleProceed}
                                disabled={isLoading}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                            >
                                أدرك المخاطر، المتابعة
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center mb-4">
                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-red-400">تأكيد الحذف النهائي</h2>
                        </div>

                        <div className="mb-6">
                            <p className="text-lg mb-4">
                                للتأكيد النهائي، اكتب رمز المتجر: <strong className="text-red-400">{shop.shopCode}</strong>
                            </p>

                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                                placeholder={`اكتب ${shop.shopCode} للتأكيد`}
                                className="w-full bg-background border border-red-500 rounded-md p-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center text-lg font-bold"
                                disabled={isLoading}
                            />

                            {confirmText && confirmText !== shop.shopCode && (
                                <p className="text-red-400 text-sm mt-2">
                                    الرمز غير صحيح، يرجى كتابة: {shop.shopCode}
                                </p>
                            )}
                        </div>

                        <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-300 text-center">
                                بالضغط على "حذف نهائياً" ستقوم بحذف المتجر وجميع بياناته بشكل نهائي
                            </p>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={handleClose}
                                disabled={isLoading}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={confirmText !== shop.shopCode || isLoading}
                                className={`font-bold py-2 px-6 rounded-lg transition duration-300 ${
                                    confirmText === shop.shopCode
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                {isLoading ? 'جاري الحذف...' : 'حذف نهائياً'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ShopDeleteConfirmationModal;