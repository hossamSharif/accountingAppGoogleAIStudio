import React, { useState, useEffect } from 'react';
import { ProfitCalculationService } from '../services/profitCalculationService';
import { ShopService } from '../services/ShopService';
import { FinancialYearService } from '../services/financialYearService';
import { FinancialYearSelector } from './FinancialYearSelector';
import { useLoading } from '../hooks/useLoading';
import { useToast } from '../hooks/useToast';
import {
    ShopProfitComparison,
    Shop,
    FinancialYear
} from '../types';
import { formatCurrency } from '../utils/formatting';

// Icons
const ChartBarIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const TableIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h3m0 0h6m0 0h3a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V10" />
    </svg>
);

const TrendingUpIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const TrendingDownIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
);

const DownloadIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const RefreshIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h16V4m-8 12v-5m-4 5v-5m8 5v-5M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" />
    </svg>
);

interface ShopSelectorProps {
    allowMultiple?: boolean;
    selectedShopIds?: string[];
    onMultipleShopsChange?: (shopIds: string[]) => void;
}

const ShopSelector: React.FC<ShopSelectorProps> = ({
    allowMultiple = false,
    selectedShopIds = [],
    onMultipleShopsChange
}) => {
    const [shops, setShops] = useState<Shop[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadShops();
    }, []);

    const loadShops = async () => {
        setIsLoading(true);
        try {
            const shopsData = await ShopService.getAllShops();
            setShops(shopsData);
        } catch (error) {
            console.error('Error loading shops:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShopToggle = (shopId: string) => {
        if (allowMultiple && onMultipleShopsChange) {
            const newSelection = selectedShopIds.includes(shopId)
                ? selectedShopIds.filter(id => id !== shopId)
                : [...selectedShopIds, shopId];
            onMultipleShopsChange(newSelection);
        }
    };

    const handleSelectAll = () => {
        if (allowMultiple && onMultipleShopsChange) {
            const allShopIds = shops.map(shop => shop.id);
            onMultipleShopsChange(
                selectedShopIds.length === shops.length ? [] : allShopIds
            );
        }
    };

    if (isLoading) {
        return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
    }

    return (
        <div className="space-y-3">
            {allowMultiple && (
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-gray-700">
                        اختر المتاجر للمقارنة
                    </label>
                    <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        {selectedShopIds.length === shops.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {shops.map(shop => (
                    <label key={shop.id} className="flex items-center space-x-3 space-x-reverse p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectedShopIds.includes(shop.id)}
                            onChange={() => handleShopToggle(shop.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                            <div className="font-medium text-gray-900">{shop.name}</div>
                            {shop.description && (
                                <div className="text-sm text-gray-500">{shop.description}</div>
                            )}
                        </div>
                    </label>
                ))}
            </div>

            {selectedShopIds.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                        تم تحديد {selectedShopIds.length} متجر للمقارنة
                    </p>
                </div>
            )}
        </div>
    );
};

export const MultiShopProfitComparison: React.FC = () => {
    const [selectedShops, setSelectedShops] = useState<string[]>([]);
    const [selectedYears, setSelectedYears] = useState<string[]>([]);
    const [comparisonData, setComparisonData] = useState<ShopProfitComparison | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
    const [sortBy, setSortBy] = useState<'name' | 'average' | 'growth'>('average');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { isLoading, withLoading } = useLoading();
    const { showToast } = useToast();

    const generateComparison = async () => {
        if (selectedShops.length === 0 || selectedYears.length === 0) {
            showToast('يرجى اختيار متاجر وسنوات مالية للمقارنة', 'warning');
            return;
        }

        await withLoading(async () => {
            try {
                const data = await ProfitCalculationService.generateMultiShopComparison(
                    selectedShops,
                    selectedYears
                );
                setComparisonData(data);
                showToast('تم إنشاء المقارنة بنجاح', 'success');
            } catch (error) {
                console.error('Error generating comparison:', error);
                showToast('خطأ في إنشاء المقارنة', 'error');
            }
        });
    };

    const exportToCSV = () => {
        if (!comparisonData) return;

        let csv = 'مقارنة الأرباح بين المتاجر\n\n';
        csv += 'المتجر,';

        // Header row with financial years
        selectedYears.forEach(yearId => {
            csv += `${comparisonData.yearNames[yearId] || yearId},`;
        });
        csv += 'المتوسط,معدل النمو %\n';

        // Sort data
        const sortedShops = getSortedShops();

        // Data rows
        sortedShops.forEach(shopId => {
            const shopData = comparisonData.shopData[shopId];
            csv += `${comparisonData.shopNames[shopId] || shopId},`;

            selectedYears.forEach(yearId => {
                csv += `${shopData.yearlyProfits[yearId] || 0},`;
            });

            csv += `${shopData.averageProfit},${shopData.growthRate.toFixed(1)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `shop-profit-comparison-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const getSortedShops = (): string[] => {
        if (!comparisonData) return [];

        const shopIds = Object.keys(comparisonData.shopData);

        return shopIds.sort((a, b) => {
            const shopA = comparisonData.shopData[a];
            const shopB = comparisonData.shopData[b];

            let comparison = 0;

            switch (sortBy) {
                case 'name':
                    comparison = (comparisonData.shopNames[a] || '').localeCompare(comparisonData.shopNames[b] || '');
                    break;
                case 'average':
                    comparison = shopA.averageProfit - shopB.averageProfit;
                    break;
                case 'growth':
                    comparison = shopA.growthRate - shopB.growthRate;
                    break;
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });
    };

    const renderTableView = () => {
        if (!comparisonData) return null;

        const sortedShops = getSortedShops();

        return (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">مقارنة الأرباح بين المتاجر</h3>
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <label className="text-sm text-gray-600">ترتيب حسب:</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'name' | 'average' | 'growth')}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                            >
                                <option value="name">اسم المتجر</option>
                                <option value="average">متوسط الربح</option>
                                <option value="growth">معدل النمو</option>
                            </select>
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="p-1 text-gray-500 hover:text-gray-700"
                            >
                                {sortOrder === 'desc' ? '↓' : '↑'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    المتجر
                                </th>
                                {selectedYears.map(yearId => (
                                    <th key={yearId} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {comparisonData.yearNames[yearId] || 'سنة مالية'}
                                    </th>
                                ))}
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                                    المتوسط
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50">
                                    النمو %
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedShops.map((shopId, index) => {
                                const shopData = comparisonData.shopData[shopId];
                                return (
                                    <tr key={shopId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">
                                                {comparisonData.shopNames[shopId] || 'متجر'}
                                            </div>
                                        </td>
                                        {selectedYears.map(yearId => (
                                            <td key={yearId} className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="text-green-600 font-medium">
                                                    {formatCurrency(shopData.yearlyProfits[yearId] || 0)}
                                                </span>
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm bg-blue-50">
                                            <span className="font-bold text-blue-600">
                                                {formatCurrency(shopData.averageProfit)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm bg-green-50">
                                            <div className={`flex items-center font-bold ${
                                                shopData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {shopData.growthRate >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                                <span className="mr-1">{shopData.growthRate.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderChartView = () => {
        if (!comparisonData) return null;

        const sortedShops = getSortedShops();
        const maxProfit = Math.max(...Object.values(comparisonData.shopData).map(shop => shop.averageProfit));

        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-gray-900 mb-6">مخطط مقارنة الأرباح</h3>

                <div className="space-y-4">
                    {sortedShops.map((shopId, index) => {
                        const shopData = comparisonData.shopData[shopId];
                        const percentage = maxProfit > 0 ? (shopData.averageProfit / maxProfit) * 100 : 0;

                        return (
                            <div key={shopId} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-gray-900">
                                        {comparisonData.shopNames[shopId] || 'متجر'}
                                    </span>
                                    <div className="flex items-center space-x-4 space-x-reverse">
                                        <span className="text-sm font-bold text-blue-600">
                                            {formatCurrency(shopData.averageProfit)}
                                        </span>
                                        <div className={`flex items-center text-sm ${
                                            shopData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {shopData.growthRate >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                                            <span className="mr-1">{shopData.growthRate.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>

                                {/* Yearly breakdown */}
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    {selectedYears.map(yearId => (
                                        <span key={yearId}>
                                            {comparisonData.yearNames[yearId]}: {formatCurrency(shopData.yearlyProfits[yearId] || 0)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary Stats */}
                <div className="mt-8 grid grid-cols-3 gap-4 pt-6 border-t">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(Object.values(comparisonData.shopData).reduce((sum, shop) => sum + shop.averageProfit, 0))}
                        </div>
                        <div className="text-sm text-gray-600">إجمالي الأرباح</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(Object.values(comparisonData.shopData).reduce((sum, shop) => sum + shop.averageProfit, 0) / Object.keys(comparisonData.shopData).length)}
                        </div>
                        <div className="text-sm text-gray-600">متوسط الأرباح</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {Object.keys(comparisonData.shopData).length}
                        </div>
                        <div className="text-sm text-gray-600">عدد المتاجر</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center">
                    <ChartBarIcon />
                    <span className="mr-2">مقارنة الأرباح بين المتاجر</span>
                </h2>

                <div className="flex space-x-2 space-x-reverse">
                    {comparisonData && (
                        <button
                            onClick={exportToCSV}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                        >
                            <DownloadIcon />
                            <span className="mr-2">تصدير CSV</span>
                        </button>
                    )}

                    <button
                        onClick={generateComparison}
                        disabled={isLoading || selectedShops.length === 0 || selectedYears.length === 0}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                        <RefreshIcon />
                        <span className="mr-2">
                            {isLoading ? 'جاري الإنشاء...' : 'إنشاء المقارنة'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Selection Panel */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Shop Selection */}
                    <div>
                        <ShopSelector
                            allowMultiple={true}
                            selectedShopIds={selectedShops}
                            onMultipleShopsChange={setSelectedShops}
                        />
                    </div>

                    {/* Financial Year Selection */}
                    <div>
                        <FinancialYearSelector
                            allowMultiple={true}
                            selectedYearIds={selectedYears}
                            onMultipleYearsChange={setSelectedYears}
                            label="السنوات المالية للمقارنة"
                            onYearChange={() => {}} // Required but not used in multiple mode
                        />
                    </div>
                </div>
            </div>

            {/* View Mode Toggle */}
            {comparisonData && (
                <div className="flex justify-center">
                    <div className="bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-4 py-2 rounded-md flex items-center space-x-2 space-x-reverse ${
                                viewMode === 'table'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <TableIcon />
                            <span>جدول</span>
                        </button>
                        <button
                            onClick={() => setViewMode('chart')}
                            className={`px-4 py-2 rounded-md flex items-center space-x-2 space-x-reverse ${
                                viewMode === 'chart'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <ChartBarIcon />
                            <span>مخطط</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري إنشاء مقارنة الأرباح...</p>
                </div>
            )}

            {/* Comparison Results */}
            {!isLoading && comparisonData && (
                <div>
                    {viewMode === 'table' ? renderTableView() : renderChartView()}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !comparisonData && (
                <div className="text-center py-12">
                    <ChartBarIcon />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد مقارنة</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        اختر المتاجر والسنوات المالية لإنشاء مقارنة الأرباح
                    </p>
                    <div className="mt-6">
                        <p className="text-xs text-gray-400">
                            يتطلب اختيار متجر واحد على الأقل وسنة مالية واحدة على الأقل
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};