import React, { useState, useEffect } from 'react';
import { FinancialYear } from '../types';

interface FinancialYearModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (fyData: Omit<FinancialYear, 'id' | 'status'>) => void;
    shopId: string;
    existingYears: FinancialYear[];
}

const FinancialYearModal: React.FC<FinancialYearModalProps> = ({ isOpen, onClose, onSave, shopId, existingYears }) => {
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [openingStock, setOpeningStock] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            const currentYear = new Date().getFullYear();
            setName(`سنة ${currentYear}`);
            setStartDate(`${currentYear}-01-01`);
            setEndDate(`${currentYear}-12-31`);
            setOpeningStock('');
            setError('');
        }
    }, [isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !startDate || !endDate || !openingStock.trim()) {
            setError('يرجى ملء جميع الحقول.');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const openingStockValue = parseFloat(openingStock);
        
        if (start >= end) {
            setError('تاريخ البدء يجب أن يكون قبل تاريخ الانتهاء.');
            return;
        }

        if (isNaN(openingStockValue) || openingStockValue < 0) {
            setError('الرجاء إدخال قيمة صحيحة لبضاعة أول المدة.');
            return;
        }

        const isOverlapping = existingYears.some(fy => {
            const existingStart = new Date(fy.startDate);
            const existingEnd = new Date(fy.endDate);
            return (start <= existingEnd && end >= existingStart);
        });

        if (isOverlapping) {
            setError('التواريخ المدخلة تتداخل مع سنة مالية موجودة بالفعل.');
            return;
        }
        
        onSave({ 
            name, 
            shopId,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            openingStockValue,
        });
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
                <h2 className="text-2xl font-bold mb-6">إضافة سنة مالية جديدة</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="fyName" className="block text-sm font-medium text-text-secondary mb-1">اسم السنة المالية</label>
                            <input
                                type="text"
                                id="fyName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="مثال: سنة 2024"
                                className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-text-secondary mb-1">تاريخ البدء</label>
                                <input
                                    type="date"
                                    id="startDate"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-text-secondary mb-1">تاريخ الانتهاء</label>
                                <input
                                    type="date"
                                    id="endDate"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="openingStock" className="block text-sm font-medium text-text-secondary mb-1">قيمة بضاعة أول المدة (المخزون)</label>
                            <input
                                type="number"
                                id="openingStock"
                                value={openingStock}
                                onChange={(e) => setOpeningStock(e.target.value)}
                                placeholder="أدخل قيمة المخزون عند بدء السنة"
                                className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded-md">{error}</p>}
                    </div>
                    <div className="mt-8 flex justify-end space-x-4 space-x-reverse">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            إضافة السنة المالية
                        </button>
                    </div>
                </form>
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

export default FinancialYearModal;
