import React, { useState, useEffect } from 'react';
import { FinancialYearService } from '../services/financialYearService';
import { useLoading } from '../hooks/useLoading';
import { useToast } from '../hooks/useToast';
import { FinancialYear } from '../types';

interface FinancialYearSelectorProps {
    shopId?: string;
    selectedYearId?: string;
    onYearChange: (yearId: string) => void;
    allowMultiple?: boolean;
    selectedYearIds?: string[];
    onMultipleYearsChange?: (yearIds: string[]) => void;
    allowAll?: boolean;
    label?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    showStatus?: boolean;
    filterStatus?: 'open' | 'closed' | 'all';
}

// Icons
const CalendarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
);

export const FinancialYearSelector: React.FC<FinancialYearSelectorProps> = ({
    shopId,
    selectedYearId,
    onYearChange,
    allowMultiple = false,
    selectedYearIds = [],
    onMultipleYearsChange,
    allowAll = false,
    label = 'السنة المالية',
    placeholder = 'اختر السنة المالية',
    className = '',
    disabled = false,
    showStatus = true,
    filterStatus = 'all'
}) => {
    const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
    const [filteredYears, setFilteredYears] = useState<FinancialYear[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const { isLoading, withLoading } = useLoading();
    const { showToast } = useToast();

    useEffect(() => {
        loadFinancialYears();
    }, [shopId]);

    useEffect(() => {
        applyFilters();
    }, [financialYears, filterStatus]);

    const loadFinancialYears = async () => {
        await withLoading(async () => {
            try {
                const years = shopId
                    ? await FinancialYearService.getFinancialYearsByShop(shopId)
                    : await FinancialYearService.getAllFinancialYears();

                // Sort by start date (newest first)
                years.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
                setFinancialYears(years);
            } catch (error) {
                console.error('Error loading financial years:', error);
                showToast('خطأ في تحميل السنوات المالية', 'error');
            }
        });
    };

    const applyFilters = () => {
        let filtered = [...financialYears];

        if (filterStatus !== 'all') {
            filtered = filtered.filter(year => year.status === filterStatus);
        }

        setFilteredYears(filtered);
    };

    const handleYearToggle = (yearId: string) => {
        if (disabled) return;

        if (allowMultiple && onMultipleYearsChange) {
            const newSelection = selectedYearIds.includes(yearId)
                ? selectedYearIds.filter(id => id !== yearId)
                : [...selectedYearIds, yearId];
            onMultipleYearsChange(newSelection);
        } else {
            onYearChange(yearId);
            setIsDropdownOpen(false);
        }
    };

    const handleSelectAll = () => {
        if (allowMultiple && onMultipleYearsChange) {
            const allYearIds = filteredYears.map(year => year.id);
            onMultipleYearsChange(
                selectedYearIds.length === filteredYears.length ? [] : allYearIds
            );
        }
    };

    const getSelectedYearName = (): string => {
        if (allowMultiple) {
            if (selectedYearIds.length === 0) return placeholder;
            if (selectedYearIds.length === 1) {
                const year = financialYears.find(y => y.id === selectedYearIds[0]);
                return year?.name || 'سنة مالية';
            }
            return `${selectedYearIds.length} سنوات مالية محددة`;
        } else {
            if (!selectedYearId) return placeholder;
            const year = financialYears.find(y => y.id === selectedYearId);
            return year?.name || 'سنة مالية';
        }
    };

    const getStatusBadge = (status: 'open' | 'closed') => (
        <span className={`text-xs px-2 py-1 rounded-full ${
            status === 'open'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
        }`}>
            {status === 'open' ? 'مفتوحة' : 'مغلقة'}
        </span>
    );

    const renderDropdownContent = () => (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {allowMultiple && allowAll && (
                <div className="p-2 border-b border-gray-200">
                    <button
                        onClick={handleSelectAll}
                        className="w-full text-right p-2 text-sm hover:bg-gray-50 rounded flex items-center justify-between"
                    >
                        <span>
                            {selectedYearIds.length === filteredYears.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                        </span>
                        {selectedYearIds.length === filteredYears.length && <CheckIcon />}
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    جاري التحميل...
                </div>
            ) : filteredYears.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                    لا توجد سنوات مالية متاحة
                </div>
            ) : (
                filteredYears.map(year => {
                    const isSelected = allowMultiple
                        ? selectedYearIds.includes(year.id)
                        : selectedYearId === year.id;

                    return (
                        <div
                            key={year.id}
                            onClick={() => handleYearToggle(year.id)}
                            className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                                isSelected ? 'bg-blue-50' : ''
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 space-x-reverse">
                                    {allowMultiple && (
                                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-300'
                                        }`}>
                                            {isSelected && <CheckIcon />}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-medium text-gray-900">{year.name}</div>
                                        <div className="text-sm text-gray-500">
                                            {new Date(year.startDate).toLocaleDateString('ar-SA')} - {new Date(year.endDate).toLocaleDateString('ar-SA')}
                                        </div>
                                    </div>
                                </div>

                                {showStatus && (
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        {getStatusBadge(year.status)}
                                        {isSelected && !allowMultiple && <CheckIcon />}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );

    if (isLoading && financialYears.length === 0) {
        return (
            <div className={`space-y-2 ${className}`}>
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                </label>
                <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className={`space-y-2 ${className}`}>
            <label className="block text-sm font-medium text-gray-700">
                {allowMultiple ? `${label} (تحديد متعدد)` : label}
            </label>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
                    disabled={disabled}
                    className={`w-full p-3 text-right border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between ${
                        disabled
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-white text-gray-900 hover:bg-gray-50'
                    } ${
                        isDropdownOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'
                    }`}
                >
                    <span className="flex items-center space-x-2 space-x-reverse">
                        <CalendarIcon />
                        <span className={getSelectedYearName() === placeholder ? 'text-gray-500' : 'text-gray-900'}>
                            {getSelectedYearName()}
                        </span>
                    </span>

                    <svg
                        className={`w-5 h-5 transition-transform ${
                            isDropdownOpen ? 'transform rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isDropdownOpen && renderDropdownContent()}
            </div>

            {/* Click outside handler */}
            {isDropdownOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsDropdownOpen(false)}
                />
            )}

            {/* Selected years summary for multiple selection */}
            {allowMultiple && selectedYearIds.length > 0 && (
                <div className="mt-2">
                    <div className="text-sm text-gray-600 mb-2">السنوات المحددة:</div>
                    <div className="flex flex-wrap gap-2">
                        {selectedYearIds.map(yearId => {
                            const year = financialYears.find(y => y.id === yearId);
                            if (!year) return null;

                            return (
                                <span
                                    key={yearId}
                                    className="inline-flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                                >
                                    {year.name}
                                    {showStatus && (
                                        <span className={`mr-2 w-2 h-2 rounded-full ${
                                            year.status === 'open' ? 'bg-green-500' : 'bg-gray-400'
                                        }`} />
                                    )}
                                    <button
                                        onClick={() => handleYearToggle(yearId)}
                                        className="mr-2 text-blue-600 hover:text-blue-800"
                                    >
                                        ✕
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Validation message */}
            {allowMultiple && selectedYearIds.length === 0 && (
                <p className="text-sm text-gray-500">
                    يمكنك تحديد عدة سنوات مالية للمقارنة
                </p>
            )}
        </div>
    );
};