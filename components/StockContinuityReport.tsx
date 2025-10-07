import React, { useState, useEffect } from 'react';
import { ProfitCalculationService } from '../services/profitCalculationService';
import { ShopService } from '../services/ShopService';
import { useLoading } from '../hooks/useLoading';
import { useToast } from '../hooks/useToast';
import {
    StockContinuityReport as StockContinuityReportType,
    YearContinuityCheck,
    StockDiscrepancy,
    Shop
} from '../types';
import { formatNumber } from '../utils/formatting';

interface StockContinuityReportProps {
    shopId?: string;
}

// Icons
const ShieldCheckIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.707-1.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 10.586l7.293-7.293a1 1 0 011.414 0z" />
    </svg>
);

const ExclamationTriangleIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const XCircleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const RefreshIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h16V4m-8 12v-5m-4 5v-5m8 5v-5M3 10h18v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);

const DocumentReportIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

interface ShopSelectorProps {
    selectedShopId?: string;
    onShopChange: (shopId: string) => void;
}

const ShopSelector: React.FC<ShopSelectorProps> = ({ selectedShopId, onShopChange }) => {
    const [shops, setShops] = useState<Shop[]>([]);
    const { isLoading } = useLoading();

    useEffect(() => {
        loadShops();
    }, []);

    const loadShops = async () => {
        try {
            const shopsData = await ShopService.getAllShops();
            setShops(shopsData);
        } catch (error) {
            console.error('Error loading shops:', error);
        }
    };

    if (isLoading) {
        return <div className="animate-pulse bg-gray-200 h-10 rounded-lg"></div>;
    }

    return (
        <select
            value={selectedShopId || ''}
            onChange={(e) => onShopChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
            <option value="">اختر المتجر</option>
            {shops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
        </select>
    );
};

export const StockContinuityReport: React.FC<StockContinuityReportProps> = ({ shopId: initialShopId }) => {
    const [continuityReport, setContinuityReport] = useState<StockContinuityReportType | null>(null);
    const [selectedShopId, setSelectedShopId] = useState<string>(initialShopId || '');
    const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

    const { isLoading, withLoading } = useLoading();
    const { showToast } = useToast();

    useEffect(() => {
        if (selectedShopId) {
            generateReport();
        }
    }, [selectedShopId]);

    const generateReport = async () => {
        if (!selectedShopId) return;

        await withLoading(async () => {
            try {
                const report = await ProfitCalculationService.validateStockContinuity(selectedShopId);
                setContinuityReport(report);

                if (report.isValid) {
                    showToast('تقرير استمرارية المخزون: لا توجد مشاكل', 'success');
                } else {
                    showToast(`تم العثور على ${report.discrepancies.length} تناقض في المخزون`, 'warning');
                }
            } catch (error) {
                console.error('Error generating stock continuity report:', error);
                showToast('خطأ في إنشاء تقرير استمرارية المخزون', 'error');
            }
        });
    };

    const getStatusIcon = (isValid: boolean) => (
        isValid ? (
            <CheckCircleIcon />
        ) : (
            <XCircleIcon />
        )
    );

    const getStatusColor = (isValid: boolean) => (
        isValid ? 'text-green-600' : 'text-red-600'
    );

    const getStatusBg = (isValid: boolean) => (
        isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    );

    const renderSummaryView = () => {
        if (!continuityReport) return null;

        const totalYears = continuityReport.years.length;
        const validTransitions = continuityReport.years.filter(year => year.isValid).length;
        const invalidTransitions = totalYears - validTransitions;

        return (
            <div className="space-y-6">
                {/* Overall Status */}
                <div className={`p-6 rounded-lg border-2 ${getStatusBg(continuityReport.isValid)}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3 space-x-reverse">
                            <div className={getStatusColor(continuityReport.isValid)}>
                                {getStatusIcon(continuityReport.isValid)}
                            </div>
                            <h3 className="text-xl font-semibold">
                                {continuityReport.isValid ? 'استمرارية المخزون سليمة' : 'يوجد تناقضات في المخزون'}
                            </h3>
                        </div>
                        <span className="text-sm text-gray-500">
                            {new Date(continuityReport.checkedAt).toLocaleDateString('ar-SA')}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{totalYears}</div>
                            <div className="text-sm text-gray-600">إجمالي الانتقالات</div>
                        </div>
                        <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{validTransitions}</div>
                            <div className="text-sm text-gray-600">انتقالات صحيحة</div>
                        </div>
                        <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">{invalidTransitions}</div>
                            <div className="text-sm text-gray-600">انتقالات بها أخطاء</div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                {continuityReport.years.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">ملخص الانتقالات</h4>
                        <div className="space-y-3">
                            {continuityReport.years.map((yearCheck, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border ${getStatusBg(yearCheck.isValid)}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3 space-x-reverse">
                                            <div className={getStatusColor(yearCheck.isValid)}>
                                                {getStatusIcon(yearCheck.isValid)}
                                            </div>
                                            <span className="font-medium">
                                                {yearCheck.fromYear}
                                            </span>
                                            <ArrowRightIcon />
                                            <span className="font-medium">
                                                {yearCheck.toYear}
                                            </span>
                                        </div>
                                        {!yearCheck.isValid && (
                                            <span className="text-red-600 font-medium">
                                                فرق: {formatNumber(yearCheck.difference, 2)} ريال
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Discrepancies Summary */}
                {continuityReport.discrepancies.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <h4 className="font-semibold text-yellow-800 mb-4 flex items-center">
                            <ExclamationTriangleIcon />
                            <span className="mr-2">التناقضات المكتشفة ({continuityReport.discrepancies.length})</span>
                        </h4>
                        <div className="space-y-3">
                            {continuityReport.discrepancies.map((discrepancy, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg border border-yellow-300">
                                    <div className="font-medium text-yellow-900 mb-1">
                                        {discrepancy.description}
                                    </div>
                                    <div className="text-sm text-yellow-700 mb-2">
                                        المبلغ: {formatNumber(discrepancy.amount, 2)} ريال
                                    </div>
                                    <div className="text-sm text-yellow-600">
                                        <strong>الإجراء المقترح:</strong> {discrepancy.suggestedAction}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderDetailedView = () => {
        if (!continuityReport) return null;

        return (
            <div className="space-y-6">
                {/* Report Header */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">تقرير استمرارية المخزون التفصيلي</h3>
                        <span className="text-sm text-gray-500">
                            تم الإنشاء: {new Date(continuityReport.checkedAt).toLocaleString('ar-SA')}
                        </span>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">المتجر:</span>
                                <span className="font-medium mr-2">{selectedShopId}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">الحالة العامة:</span>
                                <span className={`font-medium mr-2 ${
                                    continuityReport.isValid ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {continuityReport.isValid ? 'سليم' : 'يحتاج مراجعة'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Year Transitions */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">تفاصيل انتقالات المخزون</h4>
                    <div className="space-y-4">
                        {continuityReport.years.map((yearCheck, index) => (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border-2 ${getStatusBg(yearCheck.isValid)}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3 space-x-reverse">
                                        <div className={getStatusColor(yearCheck.isValid)}>
                                            {getStatusIcon(yearCheck.isValid)}
                                        </div>
                                        <h5 className="font-medium text-lg">
                                            انتقال #{index + 1}
                                        </h5>
                                    </div>
                                    <span className={`text-sm px-3 py-1 rounded-full ${
                                        yearCheck.isValid
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {yearCheck.isValid ? 'صحيح' : 'خطأ'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* From Year */}
                                    <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                                        <h6 className="font-medium text-gray-700 mb-2">السنة المالية الأولى</h6>
                                        <div className="text-sm space-y-1">
                                            <div className="font-semibold">{yearCheck.fromYear}</div>
                                            <div>
                                                <span className="text-gray-600">مخزون آخر المدة:</span>
                                                <span className="font-medium mr-1 text-blue-600">
                                                    {formatNumber(yearCheck.closingStock, 2)} ريال
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Transition Arrow */}
                                    <div className="flex items-center justify-center">
                                        <div className="flex flex-col items-center">
                                            <ArrowRightIcon />
                                            <span className="text-xs text-gray-500 mt-1">انتقال</span>
                                            {yearCheck.difference > 0.01 && (
                                                <span className="text-xs text-red-600 mt-1 font-medium">
                                                    فرق: {formatNumber(yearCheck.difference, 2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* To Year */}
                                    <div className="bg-white bg-opacity-50 p-4 rounded-lg">
                                        <h6 className="font-medium text-gray-700 mb-2">السنة المالية الثانية</h6>
                                        <div className="text-sm space-y-1">
                                            <div className="font-semibold">{yearCheck.toYear}</div>
                                            <div>
                                                <span className="text-gray-600">مخزون أول المدة:</span>
                                                <span className="font-medium mr-1 text-green-600">
                                                    {formatNumber(yearCheck.openingStock, 2)} ريال
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Error Details */}
                                {!yearCheck.isValid && (
                                    <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
                                        <div className="text-red-800 text-sm">
                                            <strong>المشكلة:</strong> عدم تطابق قيم المخزون بين السنتين المالیتین
                                        </div>
                                        <div className="text-red-700 text-sm mt-1">
                                            <strong>الفرق:</strong> {formatNumber(yearCheck.difference, 2)} ريال
                                        </div>
                                        <div className="text-red-600 text-sm mt-2">
                                            <strong>التوصية:</strong> مراجعة سجلات انتقال المخزون والتأكد من صحة القيم المدخلة
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Recommendations */}
                {!continuityReport.isValid && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h4 className="font-semibold text-blue-800 mb-4">توصيات للحل</h4>
                        <ul className="space-y-2 text-blue-700 text-sm">
                            <li>• مراجعة جميع معاملات المخزون في الفترات المتأثرة</li>
                            <li>• التأكد من صحة قيم المخزون المدخلة عند إنشاء السنوات المالية</li>
                            <li>• التحقق من وجود معاملات مخزون لم يتم تسجيلها</li>
                            <li>• مراجعة عمليات انتقال المخزون بين السنوات المالية</li>
                            <li>• التنسيق مع المحاسب لضمان دقة البيانات</li>
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center">
                    <ShieldCheckIcon />
                    <span className="mr-2">تقرير استمرارية المخزون</span>
                </h2>

                <div className="flex items-center space-x-2 space-x-reverse">
                    {/* View Mode Toggle */}
                    {continuityReport && (
                        <div className="bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('summary')}
                                className={`px-3 py-1 rounded text-sm ${
                                    viewMode === 'summary'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                ملخص
                            </button>
                            <button
                                onClick={() => setViewMode('detailed')}
                                className={`px-3 py-1 rounded text-sm ${
                                    viewMode === 'detailed'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                تفصيلي
                            </button>
                        </div>
                    )}

                    <button
                        onClick={generateReport}
                        disabled={isLoading || !selectedShopId}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                        <RefreshIcon />
                        <span className="mr-2">
                            {isLoading ? 'جاري التحليل...' : 'تحديث التقرير'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Shop Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر المتجر لفحص استمرارية المخزون
                </label>
                <ShopSelector
                    selectedShopId={selectedShopId}
                    onShopChange={setSelectedShopId}
                />
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">جاري فحص استمرارية المخزون...</p>
                </div>
            )}

            {/* Report Content */}
            {!isLoading && continuityReport && (
                <>
                    {viewMode === 'summary' ? renderSummaryView() : renderDetailedView()}
                </>
            )}

            {/* Empty State */}
            {!isLoading && !continuityReport && selectedShopId && (
                <div className="text-center py-12">
                    <DocumentReportIcon />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">لا توجد بيانات</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        لا توجد سنوات مالية كافية لفحص استمرارية المخزون
                    </p>
                </div>
            )}

            {/* No Shop Selected */}
            {!selectedShopId && (
                <div className="text-center py-12">
                    <ShieldCheckIcon />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">اختر متجر للبدء</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        يرجى اختيار متجر من القائمة أعلاه لإنشاء تقرير استمرارية المخزون
                    </p>
                </div>
            )}
        </div>
    );
};