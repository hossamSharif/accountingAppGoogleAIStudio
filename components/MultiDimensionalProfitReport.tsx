import React, { useState, useEffect } from 'react';
import { BalanceCalculator } from '../services/balanceCalculator';
import { FinancialStatementService } from '../services/financialStatementService';
import { FinancialYearService } from '../services/financialYearService';
import { ShopService } from '../services/ShopService';
import { useLoading } from '../hooks/useLoading';
import { useToast } from '../hooks/useToast';
import {
    ProfitMatrix,
    DimensionType,
    ProfitLossStatement,
    ProfitLossDimension,
    FinancialYear,
    Shop
} from '../types';
import { formatCurrency } from '../utils/formatting';

interface MultiDimensionalProfitReportProps {
    shopId?: string;
    financialYearId?: string;
}

// Icons
const ChartBarIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const TableIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0V4a1 1 0 011-1h3m0 0h6m0 0h3a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V10" />
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

export const MultiDimensionalProfitReport: React.FC<MultiDimensionalProfitReportProps> = ({
    shopId,
    financialYearId
}) => {
    const [profitMatrix, setProfitMatrix] = useState<ProfitMatrix | null>(null);
    const [selectedDimension, setSelectedDimension] = useState<DimensionType>('PER_SHOP_PER_YEAR');
    const [viewMode, setViewMode] = useState<'matrix' | 'statement'>('matrix');
    const [profitLossStatement, setProfitLossStatement] = useState<ProfitLossStatement | null>(null);
    const [shops, setShops] = useState<Shop[]>([]);
    const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);

    const { isLoading, withLoading } = useLoading();
    const { showToast } = useToast();

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [shopsData, fyData] = await Promise.all([
                ShopService.getAllShops(),
                FinancialYearService.getAllFinancialYears()
            ]);

            setShops(shopsData);
            setFinancialYears(fyData);
        } catch (error) {
            console.error('Error loading initial data:', error);
            showToast('خطأ في تحميل البيانات الأولية', 'error');
        }
    };

    const generateProfitMatrix = async () => {
        await withLoading(async () => {
            try {
                const matrix = await BalanceCalculator.calculateProfitMatrix(shopId, financialYearId);
                setProfitMatrix(matrix);
                showToast('تم إنشاء مصفوفة الأرباح بنجاح', 'success');
            } catch (error) {
                console.error('Error generating profit matrix:', error);
                showToast('خطأ في إنشاء مصفوفة الأرباح', 'error');
            }
        });
    };

    const generateProfitLossStatement = async () => {
        await withLoading(async () => {
            try {
                const dimension: ProfitLossDimension = {
                    type: selectedDimension,
                    shopId: selectedDimension.includes('SHOP') ? shopId : undefined,
                    financialYearId: selectedDimension.includes('YEAR') ? financialYearId : undefined
                };

                const statement = await FinancialStatementService.generateProfitLossStatement(dimension);
                setProfitLossStatement(statement);
                showToast('تم إنشاء كشف الأرباح والخسائر بنجاح', 'success');
            } catch (error) {
                console.error('Error generating P&L statement:', error);
                showToast('خطأ في إنشاء كشف الأرباح والخسائر', 'error');
            }
        });
    };

    const exportToCSV = () => {
        if (!profitMatrix) return;

        const csvContent = generateCSVContent();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `profit-report-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const generateCSVContent = (): string => {
        if (!profitMatrix) return '';

        let csv = 'تقرير الأرباح متعدد الأبعاد\n\n';
        csv += 'المتجر,';

        // Header row with financial years
        const yearIds = Object.keys(profitMatrix.allShopsPerYear);
        yearIds.forEach(yearId => {
            const year = financialYears.find(fy => fy.id === yearId);
            csv += `${year?.name || yearId},`;
        });
        csv += 'الإجمالي\n';

        // Data rows
        Object.entries(profitMatrix.perShopPerYear).forEach(([shopId, yearData]) => {
            const shop = shops.find(s => s.id === shopId);
            csv += `${shop?.name || shopId},`;

            yearIds.forEach(yearId => {
                csv += `${yearData[yearId] || 0},`;
            });

            csv += `${profitMatrix.perShopAllYears[shopId]}\n`;
        });

        csv += '\nالإجمالي العام:,' + profitMatrix.grandTotal + '\n';

        return csv;
    };

    const renderDimensionSelector = () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
            {[
                { value: 'PER_SHOP_PER_YEAR', label: 'لكل متجر لكل سنة' },
                { value: 'PER_SHOP_ALL_YEARS', label: 'لكل متجر جميع السنوات' },
                { value: 'ALL_SHOPS_PER_YEAR', label: 'جميع المتاجر لكل سنة' },
                { value: 'GRAND_TOTAL', label: 'الإجمالي العام' }
            ].map(dimension => (
                <button
                    key={dimension.value}
                    onClick={() => setSelectedDimension(dimension.value as DimensionType)}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        selectedDimension === dimension.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    {dimension.label}
                </button>
            ))}
        </div>
    );

    const renderProfitMatrix = () => {
        if (!profitMatrix) return null;

        const yearIds = Object.keys(profitMatrix.allShopsPerYear);

        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">مصفوفة الأرباح متعددة الأبعاد</h3>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-right p-3 font-semibold">المتجر</th>
                                {yearIds.map(yearId => {
                                    const year = financialYears.find(fy => fy.id === yearId);
                                    return (
                                        <th key={yearId} className="text-right p-3 font-semibold">
                                            {year?.name || 'سنة مالية'}
                                        </th>
                                    );
                                })}
                                <th className="text-right p-3 font-bold bg-blue-50">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(profitMatrix.perShopPerYear).map(([shopId, yearData]) => {
                                const shop = shops.find(s => s.id === shopId);
                                return (
                                    <tr key={shopId} className="border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium">{shop?.name || 'متجر'}</td>
                                        {yearIds.map(yearId => (
                                            <td key={yearId} className="p-3 text-green-600 font-medium">
                                                {formatCurrency(yearData[yearId] || 0)}
                                            </td>
                                        ))}
                                        <td className="p-3 font-bold text-blue-600 bg-blue-50">
                                            {formatCurrency(profitMatrix.perShopAllYears[shopId])}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-gray-50">
                            <tr>
                                <td className="p-3 font-bold">الإجمالي</td>
                                {yearIds.map(yearId => (
                                    <td key={yearId} className="p-3 font-bold text-blue-600">
                                        {formatCurrency(profitMatrix.allShopsPerYear[yearId])}
                                    </td>
                                ))}
                                <td className="p-3 font-bold text-green-600 bg-green-50">
                                    {formatCurrency(profitMatrix.grandTotal)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        );
    };

    const renderSummaryCards = () => {
        if (!profitMatrix) return null;

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">إجمالي الربح</h3>
                    <p className="text-3xl font-bold">
                        {formatCurrency(profitMatrix.grandTotal)}
                    </p>
                </div>

                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">عدد المتاجر</h3>
                    <p className="text-3xl font-bold">
                        {Object.keys(profitMatrix.perShopPerYear).length}
                    </p>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">عدد السنوات المالية</h3>
                    <p className="text-3xl font-bold">
                        {Object.keys(profitMatrix.allShopsPerYear).length}
                    </p>
                </div>
            </div>
        );
    };

    const renderProfitLossStatement = () => {
        if (!profitLossStatement) return null;

        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">
                    كشف الأرباح والخسائر - {profitLossStatement.metadata.period}
                </h3>

                <div className="space-y-6">
                    {/* Revenue Section */}
                    <div>
                        <h4 className="font-semibold text-green-700 mb-2">الإيرادات</h4>
                        <div className="bg-green-50 rounded-lg p-4">
                            {Object.entries(profitLossStatement.revenue).map(([account, amount]) => (
                                <div key={account} className="flex justify-between py-1">
                                    <span>{account}</span>
                                    <span className="font-medium text-green-600">
                                        {formatCurrency(amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cost of Goods Sold */}
                    <div>
                        <h4 className="font-semibold text-orange-700 mb-2">تكلفة البضاعة المبيعة</h4>
                        <div className="bg-orange-50 rounded-lg p-4">
                            {Object.entries(profitLossStatement.costOfGoodsSold).map(([account, amount]) => (
                                <div key={account} className="flex justify-between py-1">
                                    <span>{account}</span>
                                    <span className="font-medium text-orange-600">
                                        {formatCurrency(amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gross Profit */}
                    <div>
                        <h4 className="font-semibold text-blue-700 mb-2">إجمالي الربح</h4>
                        <div className="bg-blue-50 rounded-lg p-4">
                            {Object.entries(profitLossStatement.grossProfit).map(([account, amount]) => (
                                <div key={account} className="flex justify-between py-1">
                                    <span>{account}</span>
                                    <span className="font-medium text-blue-600">
                                        {formatCurrency(amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Expenses */}
                    <div>
                        <h4 className="font-semibold text-red-700 mb-2">المصروفات</h4>
                        <div className="bg-red-50 rounded-lg p-4">
                            {Object.entries(profitLossStatement.expenses).map(([account, amount]) => (
                                <div key={account} className="flex justify-between py-1">
                                    <span>{account}</span>
                                    <span className="font-medium text-red-600">
                                        {formatCurrency(amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Net Profit */}
                    <div>
                        <h4 className="font-semibold text-purple-700 mb-2">صافي الربح</h4>
                        <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                            {Object.entries(profitLossStatement.netProfit).map(([account, amount]) => (
                                <div key={account} className="flex justify-between py-1">
                                    <span className="font-bold">{account}</span>
                                    <span className="font-bold text-purple-600 text-lg">
                                        {formatCurrency(amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">تقرير الربح متعدد الأبعاد</h2>

                <div className="flex space-x-2 space-x-reverse">
                    <button
                        onClick={generateProfitMatrix}
                        disabled={isLoading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 space-x-reverse"
                    >
                        <RefreshIcon />
                        <span>{isLoading ? 'جاري التحليل...' : 'تحليل الربح'}</span>
                    </button>

                    {profitMatrix && (
                        <button
                            onClick={exportToCSV}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 space-x-reverse"
                        >
                            <DownloadIcon />
                            <span>تصدير CSV</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Dimension Selector */}
            {renderDimensionSelector()}

            {/* View Mode Toggle */}
            <div className="flex justify-center">
                <div className="bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('matrix')}
                        className={`px-4 py-2 rounded-md flex items-center space-x-2 space-x-reverse ${
                            viewMode === 'matrix'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <TableIcon />
                        <span>مصفوفة الأرباح</span>
                    </button>
                    <button
                        onClick={() => {
                            setViewMode('statement');
                            if (!profitLossStatement) {
                                generateProfitLossStatement();
                            }
                        }}
                        className={`px-4 py-2 rounded-md flex items-center space-x-2 space-x-reverse ${
                            viewMode === 'statement'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        <ChartBarIcon />
                        <span>كشف الأرباح والخسائر</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            {profitMatrix && viewMode === 'matrix' && (
                <>
                    {renderSummaryCards()}
                    {renderProfitMatrix()}
                </>
            )}

            {profitLossStatement && viewMode === 'statement' && renderProfitLossStatement()}

            {/* Empty State */}
            {!profitMatrix && !isLoading && (
                <div className="text-center py-12">
                    <ChartBarIcon />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد بيانات أرباح</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        اضغط على "تحليل الربح" لإنشاء تقرير الأرباح متعدد الأبعاد
                    </p>
                </div>
            )}
        </div>
    );
};