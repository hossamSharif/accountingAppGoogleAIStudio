import React from 'react';
import { FinancialYear } from '../types';
import { formatCurrency } from '../utils/formatting';

const LockIcon = () => (
    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
);

interface FinancialYearListProps {
    financialYears: FinancialYear[];
    onCloseYear: (fy: FinancialYear) => void;
}

const FinancialYearList: React.FC<FinancialYearListProps> = ({ financialYears, onCloseYear }) => {
    
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatCurrencyValue = (amount: number | undefined) => {
        if (amount === undefined) return '-';
        return formatCurrency(amount, false);
    };
    
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead>
                    <tr className="border-b border-gray-700 text-text-secondary">
                        <th className="p-3">اسم السنة</th>
                        <th className="p-3">تاريخ البدء</th>
                        <th className="p-3">تاريخ الانتهاء</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">بضاعة أول المدة</th>
                        <th className="p-3">بضاعة آخر المدة</th>
                        <th className="p-3 text-left">الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    {financialYears.sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map((fy, index) => (
                        <tr key={fy.id} className={`border-b border-gray-700 transition-colors duration-200 hover:bg-background/50 ${index % 2 === 0 ? 'bg-background/20' : ''}`}>
                            <td className="p-3 font-medium text-text-primary">{fy.name}</td>
                            <td className="p-3 text-text-secondary">{formatDate(fy.startDate)}</td>
                            <td className="p-3 text-text-secondary">{formatDate(fy.endDate)}</td>
                            <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${fy.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {fy.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                                </span>
                            </td>
                            <td className="p-3 font-mono">{formatCurrencyValue(fy.openingStockValue)}</td>
                            <td className="p-3 font-mono">{formatCurrencyValue(fy.closingStockValue)}</td>
                            <td className="p-3 text-left">
                                {fy.status === 'open' && (
                                     <button 
                                        onClick={() => onCloseYear(fy)}
                                        className="bg-red-600/80 hover:bg-red-600 text-white font-bold py-1 px-3 text-sm rounded-md transition duration-300 flex items-center"
                                    >
                                        <LockIcon />
                                        <span>إغلاق السنة</span>
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                     {financialYears.length === 0 && (
                        <tr>
                            <td colSpan={7} className="text-center p-6 text-text-secondary">
                                لم يتم إضافة أي سنوات مالية لهذا المتجر بعد.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default FinancialYearList;
