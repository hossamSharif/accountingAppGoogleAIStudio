import React, { useState, useEffect } from 'react';
import { Shop, FinancialYear } from '../types';
import { FinancialYearService } from '../services/financialYearService';
import { formatNumber } from '../utils/formatting';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shopData: Omit<Shop, 'id'> | Shop) => void;
    shopToEdit: Shop | null;
    isLoading?: boolean;
}

interface ShopFormData {
    name: string;
    shopCode: string; // Added shop code field
    description: string;
    address?: string;
    contactPhone?: string;
    contactEmail?: string;
    openingStockValue: number;
    businessType?: string;
    customBusinessType?: string;
    isActive: boolean;
}

const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onSave, shopToEdit, isLoading = false }) => {
    const [formData, setFormData] = useState<ShopFormData>({
        name: '',
        shopCode: '', // Initialize shop code
        description: '',
        address: '',
        contactPhone: '',
        contactEmail: '',
        openingStockValue: 0,
        businessType: '',
        customBusinessType: '',
        isActive: true
    });
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [isValidating, setIsValidating] = useState(false);
    const [accountPreview, setAccountPreview] = useState<string[]>([]);
    const [currentStep, setCurrentStep] = useState<'basic' | 'details' | 'preview'>('basic');

    useEffect(() => {
        if (shopToEdit) {
            setFormData({
                name: shopToEdit.name,
                shopCode: shopToEdit.shopCode || '', // Include shop code
                description: shopToEdit.description,
                address: (shopToEdit as any).address || '',
                contactPhone: (shopToEdit as any).contactPhone || '',
                contactEmail: (shopToEdit as any).contactEmail || '',
                openingStockValue: (shopToEdit as any).openingStockValue || 0,
                businessType: (shopToEdit as any).businessType || '',
                customBusinessType: (shopToEdit as any).customBusinessType || '',
                isActive: shopToEdit.isActive
            });
        } else {
            setFormData({
                name: '',
                shopCode: '', // Initialize shop code
                description: '',
                address: '',
                contactPhone: '',
                contactEmail: '',
                openingStockValue: 0,
                businessType: '',
                customBusinessType: '',
                isActive: true
            });
        }
        setCurrentStep('basic');
        setErrors({});
    }, [shopToEdit, isOpen]);

    useEffect(() => {
        if (formData.name && currentStep === 'preview') {
            generateAccountPreview();
        }
    }, [formData.name, currentStep]);

    const validateForm = (): boolean => {
        const newErrors: {[key: string]: string} = {};

        // Required fields validation
        if (!formData.name.trim()) {
            newErrors.name = 'اسم المتجر مطلوب';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'اسم المتجر يجب أن يكون أكثر من حرفين';
        }

        // Shop code validation
        if (!formData.shopCode.trim()) {
            newErrors.shopCode = 'رمز المتجر مطلوب';
        } else if (!/^[A-Za-z0-9]{2,10}$/.test(formData.shopCode.trim())) {
            newErrors.shopCode = 'رمز المتجر يجب أن يكون 2-10 أحرف/أرقام إنجليزية فقط';
        }

        // Email validation if provided
        if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'البريد الإلكتروني غير صالح';
        }

        // Phone validation if provided
        if (formData.contactPhone && !/^[0-9+\-\s()]{8,}$/.test(formData.contactPhone)) {
            newErrors.contactPhone = 'رقم الهاتف غير صالح';
        }

        // Opening stock validation (only for new shops)
        if (!shopToEdit && formData.openingStockValue < 0) {
            newErrors.openingStockValue = 'قيمة المخزون لا يمكن أن تكون سالبة';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const generateAccountPreview = () => {
        const suffix = formData.shopCode || formData.name; // Use shop code if available
        const accounts = [
            // Main accounts
            `الصندوق - ${suffix}`,
            `البنك - ${suffix}`,
            `العملاء - ${suffix}`,
            `المخزون - ${suffix}`,
            `الموردين - ${suffix}`,
            // Simplified sub-accounts
            `المبيعات - ${suffix} (حساب فرعي واحد)`,
            `المشتريات - ${suffix} (حساب فرعي واحد)`,
            // Operating expenses
            `المصروفات - ${suffix}`,
            // Stock accounts for financial year
            `بضاعة أول المدة - السنة المالية ${new Date().getFullYear()} - ${suffix}`,
            `بضاعة آخر المدة - السنة المالية ${new Date().getFullYear()} - ${suffix}`
        ];
        setAccountPreview(accounts);
    };

    const handleNext = () => {
        if (currentStep === 'basic' && validateForm()) {
            setCurrentStep('details');
        } else if (currentStep === 'details') {
            setCurrentStep('preview');
        }
    };

    const handleBack = () => {
        if (currentStep === 'details') {
            setCurrentStep('basic');
        } else if (currentStep === 'preview') {
            setCurrentStep('details');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        if (shopToEdit) {
            onSave({ ...shopToEdit, ...formData });
        } else {
            const shopData: Omit<Shop, 'id'> & {
                address?: string;
                contactPhone?: string;
                contactEmail?: string;
                openingStockValue?: number;
                businessType?: string;
                customBusinessType?: string;
            } = formData;
            onSave(shopData as any);
        }
    };

    const updateFormData = (field: keyof ShopFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };
    
    const renderStepIndicator = () => (
        <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-4 space-x-reverse">
                {['basic', 'details', 'preview'].map((step, index) => {
                    const stepNames = { basic: 'المعلومات الأساسية', details: 'التفاصيل', preview: 'المعاينة' };
                    const isActive = currentStep === step;
                    const isCompleted = ['basic', 'details', 'preview'].indexOf(currentStep) > index;

                    return (
                        <div key={step} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isActive ? 'bg-blue-600 text-white' :
                                isCompleted ? 'bg-green-600 text-white' :
                                'bg-gray-300 text-gray-600'
                            }`}>
                                {isCompleted ? '✓' : index + 1}
                            </div>
                            <span className={`ml-2 text-sm ${
                                isActive ? 'text-blue-600 font-semibold' : 'text-gray-600'
                            }`}>
                                {stepNames[step as keyof typeof stepNames]}
                            </span>
                            {index < 2 && (
                                <div className={`w-8 h-0.5 mx-2 ${
                                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                                }`} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderBasicInfo = () => (
        <div className="space-y-4">
            <div>
                <label htmlFor="shopName" className="block text-sm font-medium text-text-secondary mb-1">
                    اسم المتجر *
                </label>
                <input
                    type="text"
                    id="shopName"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="مثال: متجر وسط المدينة"
                    className={`w-full bg-background border rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary ${
                        errors.name ? 'border-red-500' : 'border-gray-600'
                    }`}
                    required
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
                <label htmlFor="shopCode" className="block text-sm font-medium text-text-secondary mb-1">
                    رمز المتجر *
                    <span className="text-xs text-gray-500 mr-2">(يستخدم في تسمية الحسابات)</span>
                </label>
                <input
                    type="text"
                    id="shopCode"
                    value={formData.shopCode}
                    onChange={(e) => updateFormData('shopCode', e.target.value.toUpperCase())}
                    placeholder="مثال: SH01 أو MAIN"
                    className={`w-full bg-background border rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary ${
                        errors.shopCode ? 'border-red-500' : 'border-gray-600'
                    }`}
                    maxLength={10}
                    required
                />
                {errors.shopCode && <p className="text-red-500 text-sm mt-1">{errors.shopCode}</p>}
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">
                    وصف المتجر
                </label>
                <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="وصف مختصر للمتجر أو نشاطه التجاري"
                    rows={3}
                    className="w-full bg-background border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary"
                />
            </div>

            <div>
                <label htmlFor="businessType" className="block text-sm font-medium text-text-secondary mb-1">
                    نوع النشاط
                </label>
                <select
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => updateFormData('businessType', e.target.value)}
                    className="w-full bg-background border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary"
                >
                    <option value="">اختر نوع النشاط</option>
                    <option value="اسبيرات ركشة">اسبيرات ركشة</option>
                    <option value="اليات زراعية">اليات زراعية</option>
                    <option value="ادوات صحية">ادوات صحية</option>
                    <option value="اخري">اخري</option>
                </select>
            </div>

            {formData.businessType === 'اخري' && (
                <div>
                    <label htmlFor="customBusinessType" className="block text-sm font-medium text-text-secondary mb-1">
                        اكتب نوع النشاط
                    </label>
                    <input
                        type="text"
                        id="customBusinessType"
                        value={formData.customBusinessType}
                        onChange={(e) => updateFormData('customBusinessType', e.target.value)}
                        placeholder="مثال: قطع غيار سيارات"
                        className="w-full bg-background border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                </div>
            )}

            {!shopToEdit && (
                <div>
                    <label htmlFor="openingStock" className="block text-sm font-medium text-text-secondary mb-1">
                        قيمة المخزون الافتتاحي (ريال)
                    </label>
                    <input
                        type="number"
                        id="openingStock"
                        value={formData.openingStockValue}
                        onChange={(e) => updateFormData('openingStockValue', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className={`w-full bg-background border rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary ${
                            errors.openingStockValue ? 'border-red-500' : 'border-gray-600'
                        }`}
                    />
                    {errors.openingStockValue && <p className="text-red-500 text-sm mt-1">{errors.openingStockValue}</p>}
                    <p className="text-xs text-gray-500 mt-1">سيتم إنشاء حساب مخزون أول المدة بهذه القيمة</p>
                </div>
            )}
        </div>
    );

    const renderContactDetails = () => (
        <div className="space-y-4">
            <div>
                <label htmlFor="address" className="block text-sm font-medium text-text-secondary mb-1">
                    عنوان المتجر
                </label>
                <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                    placeholder="العنوان الكامل للمتجر"
                    rows={2}
                    className="w-full bg-background border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary"
                />
            </div>

            <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-text-secondary mb-1">
                    رقم الهاتف
                </label>
                <input
                    type="tel"
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => updateFormData('contactPhone', e.target.value)}
                    placeholder="مثال: +966501234567"
                    className={`w-full bg-background border rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary ${
                        errors.contactPhone ? 'border-red-500' : 'border-gray-600'
                    }`}
                />
                {errors.contactPhone && <p className="text-red-500 text-sm mt-1">{errors.contactPhone}</p>}
            </div>

            <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-text-secondary mb-1">
                    البريد الإلكتروني
                </label>
                <input
                    type="email"
                    id="contactEmail"
                    value={formData.contactEmail}
                    onChange={(e) => updateFormData('contactEmail', e.target.value)}
                    placeholder="مثال: shop@example.com"
                    className={`w-full bg-background border rounded-md p-3 focus:ring-2 focus:ring-primary focus:border-primary ${
                        errors.contactEmail ? 'border-red-500' : 'border-gray-600'
                    }`}
                />
                {errors.contactEmail && <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>}
            </div>
        </div>
    );

    const renderPreview = () => (
        <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-3">ملخص المتجر</h3>
                <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">اسم المتجر:</span>
                        <span className="font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">رمز المتجر:</span>
                        <span className="font-medium">{formData.shopCode}</span>
                    </div>
                    {formData.businessType && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">نوع النشاط:</span>
                            <span className="font-medium">
                                {formData.businessType === 'اخري' && formData.customBusinessType
                                    ? formData.customBusinessType
                                    : formData.businessType}
                            </span>
                        </div>
                    )}
                    {!shopToEdit && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">المخزون الافتتاحي:</span>
                            <span className="font-medium">{formData.openingStockValue.toLocaleString('ar-SA')} ريال</span>
                        </div>
                    )}
                    {formData.contactPhone && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">الهاتف:</span>
                            <span className="font-medium">{formData.contactPhone}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">الحسابات التي سيتم إنشاؤها</h3>
                <div className="grid grid-cols-1 gap-2 text-sm max-h-40 overflow-y-auto">
                    {accountPreview.map((account, index) => (
                        <div key={index} className="flex items-center text-blue-700">
                            <span className="w-2 h-2 bg-blue-500 rounded-full ml-2"></span>
                            {account}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-blue-600 mt-3">
                    سيتم إنشاء {accountPreview.length} حساب افتراضي مع السنة المالية الحالية
                </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">السنة المالية</h3>
                <p className="text-green-700 text-sm">
                    سيتم إنشاء السنة المالية {new Date().getFullYear()} تلقائياً مع حسابات المخزون المناسبة
                </p>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    {shopToEdit ? 'تعديل المتجر' : 'إضافة متجر جديد'}
                </h2>

                {!shopToEdit && renderStepIndicator()}

                <form onSubmit={handleSubmit}>
                    {currentStep === 'basic' && renderBasicInfo()}
                    {currentStep === 'details' && renderContactDetails()}
                    {currentStep === 'preview' && renderPreview()}

                    <div className="mt-8 flex justify-between">
                        <div className="flex space-x-2 space-x-reverse">
                            {currentStep !== 'basic' && !shopToEdit && (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    disabled={isLoading}
                                    className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    السابق
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                إلغاء
                            </button>
                        </div>

                        <div className="flex space-x-2 space-x-reverse">
                            {currentStep !== 'preview' && !shopToEdit ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={isLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    التالي
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={isLoading || Object.keys(errors).length > 0}
                                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'جاري المعالجة...' : (shopToEdit ? 'حفظ التعديلات' : 'إنشاء المتجر')}
                                </button>
                            )}
                        </div>
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

export default ShopModal;
