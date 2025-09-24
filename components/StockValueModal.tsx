import React, { useState } from 'react';

interface StockValueModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (stockValue: number) => void;
    financialYearName: string;
}

const AlertIcon = () => (
    <svg className="h-12 w-12 text-yellow-500" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
);

const StockValueModal: React.FC<StockValueModalProps> = ({ isOpen, onClose, onConfirm, financialYearName }) => {
    const [stockValue, setStockValue] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        const value = parseFloat(stockValue);
        if (isNaN(value) || value < 0) {
            setError('الرجاء إدخال قيمة صحيحة للمخزون.');
            return;
        }
        onConfirm(value);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-500/20 mb-4">
                    <AlertIcon />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">إغلاق السنة المالية "{financialYearName}"</h3>
                <p className="text-text-secondary mb-4">لإغلاق السنة المالية، يجب إدخال القيمة الإجمالية لبضاعة آخر المدة (المخزون). هذه العملية لا يمكن التراجع عنها.</p>
                
                <div className="my-4">
                    <label htmlFor="stockValue" className="block text-sm font-medium text-text-secondary mb-1 text-right">قيمة بضاعة آخر المدة</label>
                    <input
                        type="number"
                        id="stockValue"
                        value={stockValue}
                        onChange={(e) => {
                            setStockValue(e.target.value);
                            setError('');
                        }}
                        placeholder="أدخل القيمة الإجمالية للمخزون"
                        className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary text-center"
                        required
                    />
                     {error && <p className="text-red-500 text-xs text-right mt-1">{error}</p>}
                </div>

                <div className="flex justify-center space-x-4 space-x-reverse mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                    >
                        تأكيد الإغلاق
                    </button>
                </div>
            </div>
             <style>{`
                @keyframes fade-in-scale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default StockValueModal;
