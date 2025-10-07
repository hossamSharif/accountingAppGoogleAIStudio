export interface ValidationRule {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    min?: number;
    max?: number;
    custom?: (value: any) => string | null;
}

export interface ValidationResult {
    isValid: boolean;
    errors: { [field: string]: string };
}

export class ValidationUtils {
    /**
     * Validate a single field
     */
    static validateField(value: any, rules: ValidationRule): string | null {
        // Required validation
        if (rules.required && (value === undefined || value === null || value === '')) {
            return 'هذا الحقل مطلوب';
        }

        // Skip other validations if value is empty and not required
        if (!rules.required && (value === undefined || value === null || value === '')) {
            return null;
        }

        const stringValue = String(value);

        // Min length validation
        if (rules.minLength && stringValue.length < rules.minLength) {
            return `يجب أن يكون الحد الأدنى ${rules.minLength} أحرف`;
        }

        // Max length validation
        if (rules.maxLength && stringValue.length > rules.maxLength) {
            return `يجب أن لا يتجاوز ${rules.maxLength} حرف`;
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(stringValue)) {
            return 'التنسيق غير صحيح';
        }

        // Numeric validations
        if (typeof value === 'number' || !isNaN(Number(value))) {
            const numValue = Number(value);

            if (rules.min !== undefined && numValue < rules.min) {
                return `يجب أن يكون أكبر من أو يساوي ${rules.min}`;
            }

            if (rules.max !== undefined && numValue > rules.max) {
                return `يجب أن يكون أقل من أو يساوي ${rules.max}`;
            }
        }

        // Custom validation
        if (rules.custom) {
            return rules.custom(value);
        }

        return null;
    }

    /**
     * Validate multiple fields
     */
    static validateFields(data: { [field: string]: any }, rules: { [field: string]: ValidationRule }): ValidationResult {
        const errors: { [field: string]: string } = {};

        Object.keys(rules).forEach(field => {
            const error = this.validateField(data[field], rules[field]);
            if (error) {
                errors[field] = error;
            }
        });

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Shop validation rules
     */
    static getShopValidationRules(): { [field: string]: ValidationRule } {
        return {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Zأ-ي\s0-9\-_.]+$/
            },
            description: {
                maxLength: 500
            },
            address: {
                maxLength: 300
            },
            contactPhone: {
                pattern: /^[+]?[0-9\s\-()]{8,20}$/,
                custom: (value: string) => {
                    if (value && value.length > 0 && value.length < 8) {
                        return 'رقم الهاتف قصير جداً';
                    }
                    return null;
                }
            },
            contactEmail: {
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                custom: (value: string) => {
                    if (value && !this.isValidEmail(value)) {
                        return 'البريد الإلكتروني غير صالح';
                    }
                    return null;
                }
            },
            businessType: {
                maxLength: 50
            },
            openingStockValue: {
                min: 0,
                max: 999999999,
                custom: (value: number) => {
                    if (value && isNaN(value)) {
                        return 'يجب أن تكون قيمة صحيحة';
                    }
                    return null;
                }
            }
        };
    }

    /**
     * User validation rules
     */
    static getUserValidationRules(): { [field: string]: ValidationRule } {
        return {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Zأ-ي\s]+$/
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            },
            role: {
                required: true,
                custom: (value: string) => {
                    if (!['admin', 'user'].includes(value)) {
                        return 'الدور غير صالح';
                    }
                    return null;
                }
            }
        };
    }

    /**
     * Account validation rules
     */
    static getAccountValidationRules(): { [field: string]: ValidationRule } {
        return {
            name: {
                required: true,
                minLength: 2,
                maxLength: 100
            },
            accountCode: {
                required: true,
                minLength: 3,
                maxLength: 20,
                pattern: /^[0-9\-A-Za-z]+$/
            },
            openingBalance: {
                min: -999999999,
                max: 999999999
            },
            type: {
                required: true
            },
            classification: {
                required: true
            },
            nature: {
                required: true
            }
        };
    }

    /**
     * Transaction validation rules
     */
    static getTransactionValidationRules(): { [field: string]: ValidationRule } {
        return {
            date: {
                required: true,
                custom: (value: string) => {
                    if (value && !this.isValidDate(value)) {
                        return 'التاريخ غير صالح';
                    }
                    return null;
                }
            },
            description: {
                required: true,
                minLength: 3,
                maxLength: 200
            },
            type: {
                required: true
            },
            totalAmount: {
                required: true,
                min: 0.01,
                max: 999999999
            }
        };
    }

    /**
     * Financial Year validation rules
     */
    static getFinancialYearValidationRules(): { [field: string]: ValidationRule } {
        return {
            name: {
                required: true,
                minLength: 3,
                maxLength: 100
            },
            startDate: {
                required: true,
                custom: (value: string) => {
                    if (value && !this.isValidDate(value)) {
                        return 'تاريخ البداية غير صالح';
                    }
                    return null;
                }
            },
            endDate: {
                required: true,
                custom: (value: string) => {
                    if (value && !this.isValidDate(value)) {
                        return 'تاريخ النهاية غير صالح';
                    }
                    return null;
                }
            },
            openingStockValue: {
                min: 0,
                max: 999999999
            }
        };
    }

    /**
     * Validate financial year date range
     */
    static validateFinancialYearDates(startDate: string, endDate: string): string | null {
        if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
            return 'التواريخ غير صالحة';
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start >= end) {
            return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
        }

        // Check if the period is reasonable (between 1 month and 2 years)
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());

        if (diffMonths < 1) {
            return 'الفترة المالية قصيرة جداً (أقل من شهر)';
        }

        if (diffMonths > 24) {
            return 'الفترة المالية طويلة جداً (أكثر من سنتين)';
        }

        return null;
    }

    /**
     * Validate transaction entries (double entry)
     */
    static validateTransactionEntries(entries: { amount: number; type: 'debit' | 'credit' }[]): string | null {
        if (!entries || entries.length < 2) {
            return 'يجب أن تحتوي المعاملة على قيدين على الأقل';
        }

        const totalDebits = entries
            .filter(e => e.type === 'debit')
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        const totalCredits = entries
            .filter(e => e.type === 'credit')
            .reduce((sum, e) => sum + (e.amount || 0), 0);

        const difference = Math.abs(totalDebits - totalCredits);

        if (difference > 0.01) {
            return `المعاملة غير متوازنة: الفرق ${difference.toFixed(2)} ريال`;
        }

        return null;
    }

    /**
     * Utility methods
     */
    static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    static isValidDate(dateString: string): boolean {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date.getTime());
    }

    static isValidPhoneNumber(phone: string): boolean {
        const phoneRegex = /^[+]?[0-9\s\-()]{8,20}$/;
        return phoneRegex.test(phone);
    }

    static sanitizeString(str: string): string {
        return str?.toString().trim() || '';
    }

    static sanitizeNumber(num: any): number {
        const parsed = parseFloat(num);
        return isNaN(parsed) ? 0 : parsed;
    }

    /**
     * Get user-friendly error messages in Arabic
     */
    static getFieldLabel(field: string): string {
        const labels: { [key: string]: string } = {
            name: 'الاسم',
            description: 'الوصف',
            address: 'العنوان',
            contactPhone: 'رقم الهاتف',
            contactEmail: 'البريد الإلكتروني',
            businessType: 'نوع النشاط',
            openingStockValue: 'قيمة المخزون الافتتاحي',
            email: 'البريد الإلكتروني',
            role: 'الدور',
            accountCode: 'رمز الحساب',
            openingBalance: 'الرصيد الافتتاحي',
            type: 'النوع',
            classification: 'التصنيف',
            nature: 'الطبيعة',
            date: 'التاريخ',
            totalAmount: 'المبلغ الإجمالي',
            startDate: 'تاريخ البداية',
            endDate: 'تاريخ النهاية'
        };

        return labels[field] || field;
    }

    /**
     * Format validation error for display
     */
    static formatValidationError(field: string, error: string): string {
        const fieldLabel = this.getFieldLabel(field);
        return `${fieldLabel}: ${error}`;
    }
}