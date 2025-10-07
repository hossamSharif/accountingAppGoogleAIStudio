import React, { useState, useEffect } from 'react';
import { FinancialYearService } from '../services/financialYearService';
import { StockTransitionService } from '../services/stockTransitionService';
import { useLoading } from '../hooks/useLoading';
import { useToast } from '../hooks/useToast';
import {
    FinancialYear,
    ValidationResult,
    StockTransitionExecution,
    User
} from '../types';
import { auth } from '../firebase';
import { formatCurrency } from '../utils/formatting';

interface StockTransitionModalProps {
    financialYearId: string;
    onClose: () => void;
    onTransitionComplete: () => void;
}

// Icons
const ArrowRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExclamationTriangleIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
);

const CubeIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const CalculatorIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
);

export const StockTransitionModal: React.FC<StockTransitionModalProps> = ({
    financialYearId,
    onClose,
    onTransitionComplete
}) => {
    const [currentFinancialYear, setCurrentFinancialYear] = useState<FinancialYear | null>(null);
    const [nextFinancialYear, setNextFinancialYear] = useState<FinancialYear | null>(null);
    const [closingStockValue, setClosingStockValue] = useState<number>(0);
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [calculatedStockValue, setCalculatedStockValue] = useState<number | null>(null);
    const [notes, setNotes] = useState<string>('');
    const [currentStep, setCurrentStep] = useState<'setup' | 'validate' | 'execute'>('setup');

    const { isLoading, withLoading } = useLoading();
    const { showToast } = useToast();

    useEffect(() => {
        loadFinancialYearData();
    }, [financialYearId]);

    const loadFinancialYearData = async () => {
        await withLoading(async () => {
            try {
                const currentFY = await FinancialYearService.getById(financialYearId);
                setCurrentFinancialYear(currentFY);

                if (currentFY) {
                    const nextFY = await FinancialYearService.getNextFinancialYear(financialYearId);
                    setNextFinancialYear(nextFY);

                    // Pre-populate with calculated stock value if available
                    const calculatedStock = await StockTransitionService.calculateClosingStockValue(
                        currentFY.shopId,
                        financialYearId
                    );
                    setCalculatedStockValue(calculatedStock);
                    setClosingStockValue(calculatedStock);
                }
            } catch (error) {
                console.error('Error loading financial year data:', error);
                showToast('خطأ في تحميل بيانات السنة المالية', 'error');
            }
        });
    };

    const validateTransition = async () => {
        if (!nextFinancialYear) return;

        setIsValidating(true);
        try {
            const result = await FinancialYearService.validateStockTransition(
                financialYearId,
                nextFinancialYear.id,
                closingStockValue
            );
            setValidationResult(result);

            if (result.isValid) {
                setCurrentStep('validate');
                showToast('تم التحقق من صحة الانتقال بنجاح', 'success');
            } else {
                showToast('يوجد أخطاء في بيانات الانتقال', 'error');
            }
        } catch (error) {
            console.error('Error validating transition:', error);
            showToast('خطأ في التحقق من صحة الانتقال', 'error');
        } finally {
            setIsValidating(false);
        }
    };

    const executeTransition = async () => {
        if (!nextFinancialYear || !validationResult?.isValid || !auth.currentUser) return;

        setIsTransitioning(true);
        try {
            const transitionData: StockTransitionExecution = {
                fromFinancialYearId: financialYearId,
                toFinancialYearId: nextFinancialYear.id,
                closingStockValue,
                executedBy: auth.currentUser.uid,
                notes
            };

            await StockTransitionService.executeStockTransition(transitionData);

            setCurrentStep('execute');
            showToast('تم تنفيذ انتقال المخزون بنجاح', 'success');

            // Wait a moment before calling completion
            setTimeout(() => {
                onTransitionComplete();
            }, 2000);
        } catch (error) {
            console.error('Error executing stock transition:', error);
            showToast('خطأ في تنفيذ انتقال المخزون', 'error');
        } finally {
            setIsTransitioning(false);
        }
    };

    const resetValidation = () => {
        setValidationResult(null);
        setCurrentStep('setup');
    };

    const renderSetupStep = () => (
        <div className="space-y-6">
            {/* Transition Overview */}
            {currentFinancialYear && nextFinancialYear && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div className="text-center">
                            <h4 className="font-semibold text-blue-900">{currentFinancialYear.name}</h4>
                            <p className="text-sm text-blue-700">السنة المالية الحالية</p>
                            <p className="text-xs text-blue-600 mt-1">
                                {new Date(currentFinancialYear.startDate).toLocaleDateString('ar-SA')} -
                                {new Date(currentFinancialYear.endDate).toLocaleDateString('ar-SA')}
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 space-x-reverse">
                            <ArrowRightIcon />
                            <CubeIcon />
                            <ArrowRightIcon />
                        </div>

                        <div className="text-center">
                            <h4 className="font-semibold text-green-900">{nextFinancialYear.name}</h4>
                            <p className="text-sm text-green-700">السنة المالية التالية</p>
                            <p className="text-xs text-green-600 mt-1">
                                {new Date(nextFinancialYear.startDate).toLocaleDateString('ar-SA')} -
                                {new Date(nextFinancialYear.endDate).toLocaleDateString('ar-SA')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stock Value Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CubeIcon />
                    <span className="mr-2">قيمة مخزون آخر المدة (ريال)</span>
                </label>

                {calculatedStockValue !== null && (
                    <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center text-green-700">
                            <CalculatorIcon />
                            <span className="mr-2 text-sm">القيمة المحسوبة تلقائياً:</span>
                            <span className="font-semibold">{formatCurrency(calculatedStockValue)}</span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                            يمكنك تعديل هذه القيمة حسب الحاجة
                        </p>
                    </div>
                )}

                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closingStockValue}
                    onChange={(e) => {
                        setClosingStockValue(parseFloat(e.target.value) || 0);
                        resetValidation();
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                />
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات الانتقال (اختياري)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أضف أي ملاحظات حول انتقال المخزون..."
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {/* Action Button */}
            <button
                onClick={validateTransition}
                disabled={isValidating || !nextFinancialYear}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
                {isValidating ? (
                    <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        جاري التحقق...
                    </>
                ) : (
                    <>
                        <CheckCircleIcon />
                        <span className="mr-2">تحقق من صحة الانتقال</span>
                    </>
                )}
            </button>
        </div>
    );

    const renderValidationStep = () => (
        <div className="space-y-6">
            {/* Validation Results */}
            <div className={`p-4 rounded-lg border-2 ${
                validationResult?.isValid
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
            }`}>
                <div className="flex items-center mb-3">
                    {validationResult?.isValid ? (
                        <>
                            <CheckCircleIcon />
                            <span className="mr-2 font-semibold text-green-800">✓ يمكن تنفيذ انتقال المخزون</span>
                        </>
                    ) : (
                        <>
                            <ExclamationTriangleIcon />
                            <span className="mr-2 font-semibold text-red-800">❌ لا يمكن تنفيذ الانتقال</span>
                        </>
                    )}
                </div>

                {validationResult?.errors && validationResult.errors.length > 0 && (
                    <div className="text-red-800">
                        <p className="font-semibold mb-2">الأخطاء:</p>
                        <ul className="space-y-1">
                            {validationResult.errors.map((error, index) => (
                                <li key={index} className="text-sm">• {error}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {validationResult?.warnings && validationResult.warnings.length > 0 && (
                    <div className="text-yellow-800 mt-3">
                        <p className="font-semibold mb-2">تحذيرات:</p>
                        <ul className="space-y-1">
                            {validationResult.warnings.map((warning, index) => (
                                <li key={index} className="text-sm">• {warning}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Transition Summary */}
            {validationResult?.isValid && (
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">ملخص الانتقال:</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>من السنة المالية:</span>
                            <span className="font-medium">{currentFinancialYear?.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>إلى السنة المالية:</span>
                            <span className="font-medium">{nextFinancialYear?.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>قيمة المخزون المنقول:</span>
                            <span className="font-medium text-blue-600">
                                {formatCurrency(closingStockValue)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>تاريخ التنفيذ:</span>
                            <span className="font-medium">{new Date().toLocaleDateString('ar-SA')}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 space-x-reverse">
                <button
                    onClick={() => setCurrentStep('setup')}
                    className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    تعديل البيانات
                </button>

                {validationResult?.isValid && (
                    <button
                        onClick={executeTransition}
                        disabled={isTransitioning}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                        {isTransitioning ? (
                            <>
                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                جاري التنفيذ...
                            </>
                        ) : (
                            <>
                                <ArrowRightIcon />
                                <span className="mr-2">تنفيذ انتقال المخزون</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );

    const renderExecuteStep = () => (
        <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon />
            </div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
                تم تنفيذ انتقال المخزون بنجاح!
            </h3>
            <p className="text-sm text-gray-600 mb-4">
                تم نقل المخزون من {currentFinancialYear?.name} إلى {nextFinancialYear?.name}
            </p>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-sm">
                <div className="flex justify-between mb-2">
                    <span>قيمة المخزون المنقول:</span>
                    <span className="font-semibold text-green-700">
                        {formatCurrency(closingStockValue)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span>تاريخ التنفيذ:</span>
                    <span className="font-semibold text-green-700">
                        {new Date().toLocaleDateString('ar-SA')}
                    </span>
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!nextFinancialYear) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-semibold text-red-600">
                            لا يمكن تنفيذ انتقال المخزون
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="text-center py-8">
                            <ExclamationTriangleIcon />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                لا توجد سنة مالية تالية
                            </h3>
                            <p className="text-gray-600">
                                يجب إنشاء سنة مالية جديدة أولاً لتنفيذ انتقال المخزون
                            </p>
                        </div>
                    </div>
                    <div className="p-6 border-t bg-gray-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-semibold flex items-center">
                        <CubeIcon />
                        <span className="mr-2">انتقال المخزون بين السنوات المالية</span>
                    </h2>

                    {/* Progress Steps */}
                    <div className="flex items-center mt-4 space-x-4 space-x-reverse">
                        <div className={`flex items-center ${
                            currentStep === 'setup' ? 'text-blue-600' :
                            currentStep === 'validate' || currentStep === 'execute' ? 'text-green-600' : 'text-gray-400'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep === 'setup' ? 'bg-blue-100' :
                                currentStep === 'validate' || currentStep === 'execute' ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                                {currentStep === 'validate' || currentStep === 'execute' ? '✓' : '1'}
                            </div>
                            <span className="mr-2 text-sm">إعداد البيانات</span>
                        </div>

                        <div className={`w-8 h-0.5 ${
                            currentStep === 'validate' || currentStep === 'execute' ? 'bg-green-600' : 'bg-gray-300'
                        }`}></div>

                        <div className={`flex items-center ${
                            currentStep === 'validate' ? 'text-blue-600' :
                            currentStep === 'execute' ? 'text-green-600' : 'text-gray-400'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep === 'validate' ? 'bg-blue-100' :
                                currentStep === 'execute' ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                                {currentStep === 'execute' ? '✓' : '2'}
                            </div>
                            <span className="mr-2 text-sm">التحقق</span>
                        </div>

                        <div className={`w-8 h-0.5 ${
                            currentStep === 'execute' ? 'bg-green-600' : 'bg-gray-300'
                        }`}></div>

                        <div className={`flex items-center ${
                            currentStep === 'execute' ? 'text-green-600' : 'text-gray-400'
                        }`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep === 'execute' ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                                {currentStep === 'execute' ? '✓' : '3'}
                            </div>
                            <span className="mr-2 text-sm">التنفيذ</span>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {currentStep === 'setup' && renderSetupStep()}
                    {currentStep === 'validate' && renderValidationStep()}
                    {currentStep === 'execute' && renderExecuteStep()}
                </div>

                {currentStep !== 'execute' && (
                    <div className="p-6 border-t bg-gray-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                        >
                            إلغاء
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};