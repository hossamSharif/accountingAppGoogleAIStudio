import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    writeBatch,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { BaseService } from './baseService';
import { StockTransitionService } from './stockTransitionService';
import {
    FinancialYear,
    Account,
    AccountType,
    CreateFinancialYearData,
    ValidationResult,
    AccountClassification,
    AccountNature
} from '../types';

export class FinancialYearService extends BaseService {

    /**
     * Create a new financial year with opening stock accounts
     */
    static async createFinancialYear(
        shopId: string,
        name: string,
        startDate: string,
        endDate: string,
        openingStockValue: number = 0,
        shopCode?: string // Optional shop code for account naming
    ): Promise<FinancialYear> {

        const batch = writeBatch(db);

        // 1. Create financial year document
        const financialYearRef = doc(collection(db, 'financialYears'));
        const financialYearData: any = {
            shopId,
            name,
            startDate,
            endDate,
            status: 'open',
            openingStockValue
        };

        batch.set(financialYearRef, financialYearData);

        // 2. Create opening stock account with numeric code only
        const openingStockAccountRef = doc(collection(db, 'accounts'));
        // Use shop code if provided, otherwise extract from name
        const accountSuffix = shopCode || name;
        const openingStockAccount: Omit<Account, 'id'> = {
            shopId,
            accountCode: `1410`, // Numeric code only
            name: `بضاعة أول المدة - ${accountSuffix}`,
            classification: 'الأصول' as any,
            nature: 'مدين' as any,
            type: AccountType.OPENING_STOCK,
            isActive: true,
            openingBalance: openingStockValue
        };

        batch.set(openingStockAccountRef, openingStockAccount);

        // 3. Create closing stock account with numeric code only
        const closingStockAccountRef = doc(collection(db, 'accounts'));
        const closingStockAccount: Omit<Account, 'id'> = {
            shopId,
            accountCode: `1420`, // Numeric code only
            name: `بضاعة آخر المدة - ${accountSuffix}`,
            classification: 'الأصول' as any,
            nature: 'مدين' as any,
            type: AccountType.ENDING_STOCK,
            isActive: true,
            openingBalance: 0
        };

        batch.set(closingStockAccountRef, closingStockAccount);

        // 4. Update financial year with account references
        batch.update(financialYearRef, {
            openingStockAccountId: openingStockAccountRef.id,
            closingStockAccountId: closingStockAccountRef.id
        });

        await batch.commit();

        return {
            id: financialYearRef.id,
            ...financialYearData,
            openingStockAccountId: openingStockAccountRef.id,
            closingStockAccountId: closingStockAccountRef.id
        };
    }

    /**
     * Get all financial years for a shop
     */
    static async getFinancialYearsByShop(shopId: string): Promise<FinancialYear[]> {
        const q = query(
            collection(db, 'financialYears'),
            where('shopId', '==', shopId),
            orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as FinancialYear));
    }

    /**
     * Get the current active financial year for a shop
     */
    static async getCurrentFinancialYear(shopId: string): Promise<FinancialYear | null> {
        const q = query(
            collection(db, 'financialYears'),
            where('shopId', '==', shopId),
            where('status', '==', 'open'),
            orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        return {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
        } as FinancialYear;
    }

    /**
     * Close a financial year and transition stock to next year
     */
    static async closeFinancialYear(
        financialYearId: string,
        closingStockValue: number,
        createNextYear: boolean = true
    ): Promise<FinancialYear | null> {

        const financialYearDoc = await getDoc(doc(db, 'financialYears', financialYearId));
        if (!financialYearDoc.exists()) {
            throw new Error('Financial year not found');
        }

        const financialYear = financialYearDoc.data() as FinancialYear;
        const batch = writeBatch(db);

        // 1. Update financial year status and closing stock
        batch.update(doc(db, 'financialYears', financialYearId), {
            status: 'closed',
            closingStockValue
        });

        // 2. Update closing stock account balance
        if (financialYear.closingStockAccountId) {
            batch.update(doc(db, 'accounts', financialYear.closingStockAccountId), {
                openingBalance: closingStockValue
            });
        }

        let nextFinancialYear: FinancialYear | null = null;

        // 3. Create next financial year if requested
        if (createNextYear) {
            const currentYear = new Date(financialYear.startDate).getFullYear();
            const nextYear = currentYear + 1;

            const nextFinancialYearRef = doc(collection(db, 'financialYears'));
            const nextFinancialYearData: Omit<FinancialYear, 'id'> = {
                shopId: financialYear.shopId,
                name: `السنة المالية ${nextYear}`,
                startDate: `${nextYear}-01-01`,
                endDate: `${nextYear}-12-31`,
                status: 'open',
                openingStockValue: closingStockValue // Carry forward closing stock
            };

            batch.set(nextFinancialYearRef, nextFinancialYearData);

            // Create opening stock account for next year with numeric code only
            const openingStockAccountRef = doc(collection(db, 'accounts'));
            const openingStockAccount: Omit<Account, 'id'> = {
                shopId: financialYear.shopId,
                accountCode: `1410`, // Numeric code only
                name: `بضاعة أول المدة - السنة المالية ${nextYear}`,
                classification: 'الأصول' as any,
                nature: 'مدين' as any,
                type: AccountType.OPENING_STOCK,
                isActive: true,
                openingBalance: closingStockValue
            };

            batch.set(openingStockAccountRef, openingStockAccount);

            // Create closing stock account for next year with numeric code only
            const closingStockAccountRef = doc(collection(db, 'accounts'));
            const closingStockAccount: Omit<Account, 'id'> = {
                shopId: financialYear.shopId,
                accountCode: `1420`, // Numeric code only
                name: `بضاعة آخر المدة - السنة المالية ${nextYear}`,
                classification: 'الأصول' as any,
                nature: 'مدين' as any,
                type: AccountType.ENDING_STOCK,
                isActive: true,
                openingBalance: 0
            };

            batch.set(closingStockAccountRef, closingStockAccount);

            // Update next financial year with account references
            batch.update(nextFinancialYearRef, {
                openingStockAccountId: openingStockAccountRef.id,
                closingStockAccountId: closingStockAccountRef.id
            });

            nextFinancialYear = {
                id: nextFinancialYearRef.id,
                ...nextFinancialYearData,
                openingStockAccountId: openingStockAccountRef.id,
                closingStockAccountId: closingStockAccountRef.id
            };
        }

        await batch.commit();
        return nextFinancialYear;
    }

    /**
     * Update closing stock value for a financial year
     */
    static async updateClosingStock(
        financialYearId: string,
        closingStockValue: number
    ): Promise<void> {

        const financialYearDoc = await getDoc(doc(db, 'financialYears', financialYearId));
        if (!financialYearDoc.exists()) {
            throw new Error('Financial year not found');
        }

        const financialYear = financialYearDoc.data() as FinancialYear;
        const batch = writeBatch(db);

        // Update financial year
        batch.update(doc(db, 'financialYears', financialYearId), {
            closingStockValue
        });

        // Update closing stock account balance
        if (financialYear.closingStockAccountId) {
            batch.update(doc(db, 'accounts', financialYear.closingStockAccountId), {
                openingBalance: closingStockValue
            });
        }

        await batch.commit();
    }

    /**
     * Get all financial years across all shops
     */
    static async getAllFinancialYears(): Promise<FinancialYear[]> {
        const q = query(
            collection(db, 'financialYears'),
            orderBy('startDate', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as FinancialYear));
    }

    /**
     * Update an existing financial year
     */
    static async updateFinancialYear(
        financialYearId: string,
        fyData: CreateFinancialYearData
    ): Promise<FinancialYear> {
        try {
            // Validate input data
            this.validateRequired(fyData, ['shopId', 'name', 'startDate', 'endDate']);

            // Check for overlapping financial years (excluding current)
            const hasOverlap = await this.checkForOverlap(
                fyData.shopId,
                fyData.startDate,
                fyData.endDate,
                financialYearId
            );

            if (hasOverlap) {
                throw new Error('يوجد تداخل مع سنة مالية أخرى');
            }

            // Get the existing financial year
            const existingFY = await this.getDocumentById<FinancialYear>('financialYears', financialYearId);
            if (!existingFY) {
                throw new Error('السنة المالية غير موجودة');
            }

            // Prepare updated data
            const updatedData = {
                shopId: fyData.shopId,
                name: fyData.name,
                startDate: fyData.startDate,
                endDate: fyData.endDate,
                openingStockValue: fyData.openingStockValue || 0,
                notes: fyData.notes || ''
            };

            // Update the financial year document
            await updateDoc(doc(db, 'financialYears', financialYearId), updatedData);

            // Update opening stock account if it exists and value changed
            if (existingFY.openingStockAccountId &&
                existingFY.openingStockValue !== updatedData.openingStockValue) {
                await updateDoc(doc(db, 'accounts', existingFY.openingStockAccountId), {
                    openingBalance: updatedData.openingStockValue
                });
            }

            return {
                ...existingFY,
                ...updatedData
            };

        } catch (error) {
            this.handleError(error, 'updateFinancialYear');
            throw error;
        }
    }

    /**
     * Check if a financial year overlaps with existing years for the same shop
     */
    static async checkForOverlap(
        shopId: string,
        startDate: string,
        endDate: string,
        excludeId?: string
    ): Promise<boolean> {

        const q = query(
            collection(db, 'financialYears'),
            where('shopId', '==', shopId)
        );

        const snapshot = await getDocs(q);
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (const doc of snapshot.docs) {
            if (excludeId && doc.id === excludeId) continue;

            const data = doc.data() as FinancialYear;
            const existingStart = new Date(data.startDate);
            const existingEnd = new Date(data.endDate);

            // Check for overlap
            if (start <= existingEnd && end >= existingStart) {
                return true;
            }
        }

        return false;
    }

    // ========== PHASE 2: Enhanced Stock Account Management ==========

    /**
     * Create financial year with automatic stock accounts and enhanced validation
     */
    static async createFinancialYearWithStockAccounts(
        fyData: CreateFinancialYearData
    ): Promise<FinancialYear> {
        try {
            // Validate input data
            this.validateRequired(fyData, ['shopId', 'name', 'startDate', 'endDate']);

            // Check for overlapping financial years
            const hasOverlap = await this.checkForOverlap(
                fyData.shopId,
                fyData.startDate,
                fyData.endDate
            );

            if (hasOverlap) {
                throw new Error('يوجد تداخل مع سنة مالية أخرى');
            }

            const batch = this.createBatch();

            // 1. Create financial year document
            const fyRef = this.getDocumentRef('financialYears');
            const newFY: any = {
                shopId: fyData.shopId,
                name: fyData.name,
                startDate: fyData.startDate,
                endDate: fyData.endDate,
                status: 'open',
                openingStockValue: fyData.openingStockValue || 0
            };

            batch.set(fyRef, newFY);

            // 2. Create opening stock account with financial year suffix
            const openingStockRef = this.getDocumentRef('accounts');
            const openingStockAccount: Omit<Account, 'id'> = {
                shopId: fyData.shopId,
                accountCode: `${fyData.shopId}_OS_${this.extractYearFromDate(fyData.startDate)}`,
                name: `مخزون أول المدة - ${fyData.name}`,
                classification: AccountClassification.ASSETS,
                nature: AccountNature.DEBIT,
                type: AccountType.OPENING_STOCK,
                isActive: true,
                openingBalance: fyData.openingStockValue || 0,
                category: 'stock'
            };

            batch.set(openingStockRef, openingStockAccount);

            // 3. Create ending stock account
            const endingStockRef = this.getDocumentRef('accounts');
            const endingStockAccount: Omit<Account, 'id'> = {
                shopId: fyData.shopId,
                accountCode: `${fyData.shopId}_ES_${this.extractYearFromDate(fyData.startDate)}`,
                name: `مخزون آخر المدة - ${fyData.name}`,
                classification: AccountClassification.ASSETS,
                nature: AccountNature.DEBIT,
                type: AccountType.ENDING_STOCK,
                isActive: true,
                openingBalance: 0,
                category: 'stock'
            };

            batch.set(endingStockRef, endingStockAccount);

            // 4. Update financial year with stock account references
            batch.update(fyRef, {
                openingStockAccountId: openingStockRef.id,
                closingStockAccountId: endingStockRef.id
            });

            await batch.commit();

            return {
                id: fyRef.id,
                ...newFY,
                openingStockAccountId: openingStockRef.id,
                closingStockAccountId: endingStockRef.id
            };

        } catch (error) {
            this.handleError(error, 'createFinancialYearWithStockAccounts');
        }
    }

    /**
     * Validate stock transition between financial years with comprehensive checks
     */
    static async validateStockTransition(
        fromFYId: string,
        toFYId: string,
        closingStockValue: number
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // 1. Validate financial years exist
            const [fromFY, toFY] = await Promise.all([
                this.getDocumentById<FinancialYear>('financialYears', fromFYId),
                this.getDocumentById<FinancialYear>('financialYears', toFYId)
            ]);

            if (!fromFY) {
                errors.push('السنة المالية المصدر غير موجودة');
            }

            if (!toFY) {
                errors.push('السنة المالية الهدف غير موجودة');
            }

            if (errors.length > 0) {
                return { isValid: false, errors, warnings };
            }

            // 2. Validate financial years belong to same shop
            if (fromFY!.shopId !== toFY!.shopId) {
                errors.push('السنوات المالية يجب أن تنتمي لنفس المحل');
            }

            // 3. Validate financial years are consecutive
            const fromEndDate = new Date(fromFY!.endDate);
            const toStartDate = new Date(toFY!.startDate);

            // Calculate days between end of first year and start of second year
            const daysDifference = Math.floor((toStartDate.getTime() - fromEndDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDifference > 1) {
                errors.push('السنوات المالية يجب أن تكون متتالية');
            } else if (daysDifference < 0) {
                errors.push('السنة المالية الهدف يجب أن تكون بعد السنة المصدر');
            }

            // 4. Validate closing stock value
            if (closingStockValue < 0) {
                errors.push('قيمة مخزون آخر المدة لا يمكن أن تكون سالبة');
            }

            if (closingStockValue > 50000000) { // 50 million SAR warning
                warnings.push('قيمة مخزون آخر المدة كبيرة جداً - تأكد من صحة القيمة');
            }

            // 5. Check if transition already exists
            const existingTransition = await this.getExistingStockTransition(fromFYId, toFYId);
            if (existingTransition) {
                errors.push('يوجد انتقال مخزون بالفعل بين هذين السنتين الماليتين');
            }

            // 6. Validate source year is closed or ready to close
            if (fromFY!.status === 'closed' && fromFY!.closingStockValue !== undefined) {
                if (Math.abs(fromFY!.closingStockValue - closingStockValue) > 0.01) {
                    warnings.push('قيمة المخزون المدخلة تختلف عن القيمة المسجلة للسنة المغلقة');
                }
            }

            // 7. Validate target year is open
            if (toFY!.status !== 'open') {
                errors.push('السنة المالية الهدف يجب أن تكون مفتوحة');
            }

            // 8. Check for pending transactions in source year
            const hasPendingTransactions = await this.checkPendingTransactions(fromFYId);
            if (hasPendingTransactions) {
                warnings.push('يوجد معاملات معلقة في السنة المالية المصدر');
            }

        } catch (error) {
            errors.push(`خطأ في التحقق من انتقال المخزون: ${error}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get active financial year for a shop with enhanced validation
     */
    static async getActiveFinancialYear(shopId: string): Promise<FinancialYear | null> {
        try {
            const q = query(
                this.getCollectionRef('financialYears'),
                where('shopId', '==', shopId),
                where('status', '==', 'open'),
                orderBy('startDate', 'desc')
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const financialYear = {
                id: snapshot.docs[0].id,
                ...snapshot.docs[0].data()
            } as FinancialYear;

            // Validate that the current date falls within the financial year
            const currentDate = new Date();
            const startDate = new Date(financialYear.startDate);
            const endDate = new Date(financialYear.endDate);

            if (currentDate >= startDate && currentDate <= endDate) {
                return financialYear;
            }

            // Return the financial year even if dates don't match, but it might need attention
            return financialYear;

        } catch (error) {
            console.error('Error getting active financial year:', error);
            return null;
        }
    }

    /**
     * Get the next financial year for stock transition
     */
    static async getNextFinancialYear(currentFYId: string): Promise<FinancialYear | null> {
        try {
            const currentFY = await this.getDocumentById<FinancialYear>('financialYears', currentFYId);
            if (!currentFY) return null;

            const currentEndDate = new Date(currentFY.endDate);

            // Find the financial year that starts after the current one ends
            const q = query(
                this.getCollectionRef('financialYears'),
                where('shopId', '==', currentFY.shopId),
                where('startDate', '>', currentFY.endDate),
                orderBy('startDate', 'asc')
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            return {
                id: snapshot.docs[0].id,
                ...snapshot.docs[0].data()
            } as FinancialYear;

        } catch (error) {
            console.error('Error getting next financial year:', error);
            return null;
        }
    }

    /**
     * Enhanced financial year closure with comprehensive validation
     */
    static async closeFinancialYearEnhanced(
        financialYearId: string,
        closingStockValue: number,
        closeReason?: string
    ): Promise<{ success: boolean; nextFinancialYear?: FinancialYear }> {
        try {
            const financialYear = await this.getDocumentById<FinancialYear>('financialYears', financialYearId);
            if (!financialYear) {
                throw new Error('السنة المالية غير موجودة');
            }

            if (financialYear.status === 'closed') {
                throw new Error('السنة المالية مغلقة بالفعل');
            }

            // Validate closing stock value
            if (closingStockValue < 0) {
                throw new Error('قيمة مخزون آخر المدة لا يمكن أن تكون سالبة');
            }

            // Check for unbalanced transactions
            const unbalancedTransactions = await this.checkUnbalancedTransactions(financialYearId);
            if (unbalancedTransactions > 0) {
                throw new Error(`يوجد ${unbalancedTransactions} معاملة غير متوازنة - يجب تصحيحها قبل الإغلاق`);
            }

            const batch = this.createBatch();

            // 1. Update financial year status and closing stock
            batch.update(this.getDocumentRef('financialYears', financialYearId), {
                status: 'closed',
                closingStockValue,
                closedAt: new Date().toISOString(),
                closedBy: this.getCurrentUserId(),
                closeReason: closeReason || 'إغلاق السنة المالية'
            });

            // 2. Update closing stock account balance
            if (financialYear.closingStockAccountId) {
                batch.update(this.getDocumentRef('accounts', financialYear.closingStockAccountId), {
                    openingBalance: closingStockValue,
                    updatedAt: new Date().toISOString()
                });
            }

            // 3. Check if next financial year exists and update its opening stock
            const nextFinancialYear = await this.getNextFinancialYear(financialYearId);
            if (nextFinancialYear) {
                batch.update(this.getDocumentRef('financialYears', nextFinancialYear.id), {
                    openingStockValue: closingStockValue
                });

                // Update next year's opening stock account
                if (nextFinancialYear.openingStockAccountId) {
                    batch.update(this.getDocumentRef('accounts', nextFinancialYear.openingStockAccountId), {
                        openingBalance: closingStockValue,
                        updatedAt: new Date().toISOString()
                    });
                }
            }

            await batch.commit();

            return {
                success: true,
                nextFinancialYear: nextFinancialYear || undefined
            };

        } catch (error) {
            this.handleError(error, 'closeFinancialYearEnhanced');
        }
    }

    /**
     * Validate financial year data integrity
     */
    static async validateFinancialYearIntegrity(financialYearId: string): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const financialYear = await this.getDocumentById<FinancialYear>('financialYears', financialYearId);
            if (!financialYear) {
                errors.push('السنة المالية غير موجودة');
                return { isValid: false, errors, warnings };
            }

            // Check stock accounts exist
            if (financialYear.openingStockAccountId) {
                const openingStockAccount = await this.getDocumentById<Account>('accounts', financialYear.openingStockAccountId);
                if (!openingStockAccount) {
                    errors.push('حساب مخزون أول المدة غير موجود');
                } else if (!openingStockAccount.isActive) {
                    warnings.push('حساب مخزون أول المدة غير نشط');
                }
            }

            if (financialYear.closingStockAccountId) {
                const closingStockAccount = await this.getDocumentById<Account>('accounts', financialYear.closingStockAccountId);
                if (!closingStockAccount) {
                    errors.push('حساب مخزون آخر المدة غير موجود');
                } else if (!closingStockAccount.isActive) {
                    warnings.push('حساب مخزون آخر المدة غير نشط');
                }
            }

            // Validate date consistency
            const startDate = new Date(financialYear.startDate);
            const endDate = new Date(financialYear.endDate);

            if (startDate >= endDate) {
                errors.push('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
            }

            // Check financial year duration (should be around 12 months)
            const durationInDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            if (durationInDays < 350 || durationInDays > 380) {
                warnings.push(`مدة السنة المالية غير عادية: ${durationInDays} يوم`);
            }

            // Validate stock values consistency
            if (financialYear.openingStockValue < 0) {
                errors.push('قيمة مخزون أول المدة لا يمكن أن تكون سالبة');
            }

            if (financialYear.closingStockValue !== undefined && financialYear.closingStockValue < 0) {
                errors.push('قيمة مخزون آخر المدة لا يمكن أن تكون سالبة');
            }

        } catch (error) {
            errors.push(`خطأ في التحقق من تكامل السنة المالية: ${error}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    // ========== Private Helper Methods ==========

    private static extractYearFromDate(dateString: string): string {
        return new Date(dateString).getFullYear().toString();
    }

    private static async getExistingStockTransition(fromFYId: string, toFYId: string): Promise<boolean> {
        try {
            const q = query(
                this.getCollectionRef('stockTransitions'),
                where('fromFinancialYearId', '==', fromFYId),
                where('toFinancialYearId', '==', toFYId)
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking existing stock transition:', error);
            return false;
        }
    }

    private static async checkPendingTransactions(financialYearId: string): Promise<boolean> {
        try {
            const q = query(
                this.getCollectionRef('transactions'),
                where('financialYearId', '==', financialYearId),
                where('status', '==', 'draft')
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;
        } catch (error) {
            console.error('Error checking pending transactions:', error);
            return false;
        }
    }

    private static async checkUnbalancedTransactions(financialYearId: string): Promise<number> {
        try {
            // This would require implementing logic to check for unbalanced transactions
            // For now, return 0 as placeholder
            return 0;
        } catch (error) {
            console.error('Error checking unbalanced transactions:', error);
            return 0;
        }
    }
}