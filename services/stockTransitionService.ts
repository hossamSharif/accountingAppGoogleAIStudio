import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    updateDoc,
    writeBatch,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { FinancialYear, Account, AccountType } from '../types';
import { FinancialYearService } from './financialYearService';

export interface StockTransitionData {
    fromFinancialYearId: string;
    toFinancialYearId?: string; // If not provided, creates new year
    closingStockValue: number;
    notes?: string;
}

export interface StockTransitionValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

export class StockTransitionService {

    /**
     * Validate stock transition request
     */
    static async validateStockTransition(
        shopId: string,
        transitionData: StockTransitionData
    ): Promise<StockTransitionValidation> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // 1. Check if source financial year exists
        const fromYear = await this.getFinancialYearById(transitionData.fromFinancialYearId);
        if (!fromYear) {
            errors.push('السنة المالية المصدر غير موجودة');
        } else {
            // Check if source year belongs to the shop
            if (fromYear.shopId !== shopId) {
                errors.push('السنة المالية المصدر لا تنتمي لهذا المحل');
            }

            // Check if source year is still open
            if (fromYear.status === 'closed') {
                warnings.push('السنة المالية المصدر مغلقة بالفعل');
            }
        }

        // 2. Validate closing stock value
        if (transitionData.closingStockValue < 0) {
            errors.push('قيمة المخزون الختامي يجب أن تكون أكبر من أو تساوي صفر');
        }

        // 3. Check target year if specified
        if (transitionData.toFinancialYearId) {
            const toYear = await this.getFinancialYearById(transitionData.toFinancialYearId);
            if (!toYear) {
                errors.push('السنة المالية الهدف غير موجودة');
            } else {
                if (toYear.shopId !== shopId) {
                    errors.push('السنة المالية الهدف لا تنتمي لهذا المحل');
                }
                if (toYear.status === 'closed') {
                    errors.push('السنة المالية الهدف مغلقة ولا يمكن التعديل عليها');
                }
            }
        }

        // 4. Check if there are pending transactions
        const hasPendingTransactions = await this.hasPendingTransactions(
            shopId,
            transitionData.fromFinancialYearId
        );
        if (hasPendingTransactions) {
            warnings.push('هناك معاملات معلقة في السنة المالية المصدر');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Execute stock transition between financial years
     */
    static async executeStockTransition(
        shopId: string,
        transitionData: StockTransitionData
    ): Promise<{
        fromYear: FinancialYear;
        toYear: FinancialYear;
        success: boolean;
    }> {

        // Validate transition
        const validation = await this.validateStockTransition(shopId, transitionData);
        if (!validation.isValid) {
            throw new Error(`تعذر تنفيذ الانتقال: ${validation.errors.join(', ')}`);
        }

        const batch = writeBatch(db);

        // Get source financial year
        const fromYear = await this.getFinancialYearById(transitionData.fromFinancialYearId);
        if (!fromYear) {
            throw new Error('السنة المالية المصدر غير موجودة');
        }

        // 1. Update closing stock value and close source year
        batch.update(doc(db, 'financialYears', transitionData.fromFinancialYearId), {
            closingStockValue: transitionData.closingStockValue,
            status: 'closed'
        });

        // 2. Update closing stock account balance
        if (fromYear.closingStockAccountId) {
            batch.update(doc(db, 'accounts', fromYear.closingStockAccountId), {
                openingBalance: transitionData.closingStockValue
            });
        }

        let toYear: FinancialYear;

        // 3. Create or update target year
        if (transitionData.toFinancialYearId) {
            // Update existing target year
            toYear = await this.getFinancialYearById(transitionData.toFinancialYearId);
            if (!toYear) {
                throw new Error('السنة المالية الهدف غير موجودة');
            }

            batch.update(doc(db, 'financialYears', transitionData.toFinancialYearId), {
                openingStockValue: transitionData.closingStockValue
            });

            // Update opening stock account
            if (toYear.openingStockAccountId) {
                batch.update(doc(db, 'accounts', toYear.openingStockAccountId), {
                    openingBalance: transitionData.closingStockValue
                });
            }
        } else {
            // Create new financial year
            toYear = await FinancialYearService.closeFinancialYear(
                transitionData.fromFinancialYearId,
                transitionData.closingStockValue,
                true // createNextYear
            ) as FinancialYear;
        }

        // 4. Log the transition
        const logRef = doc(collection(db, 'stockTransitions'));
        batch.set(logRef, {
            shopId,
            fromFinancialYearId: transitionData.fromFinancialYearId,
            toFinancialYearId: toYear.id,
            closingStockValue: transitionData.closingStockValue,
            openingStockValue: transitionData.closingStockValue, // Same value
            notes: transitionData.notes || '',
            transitionDate: Timestamp.now().toDate().toISOString(),
            executedBy: 'system' // TODO: Add user ID when available
        });

        await batch.commit();

        return {
            fromYear: {
                ...fromYear,
                closingStockValue: transitionData.closingStockValue,
                status: 'closed'
            },
            toYear: {
                ...toYear,
                openingStockValue: transitionData.closingStockValue
            },
            success: true
        };
    }

    /**
     * Get stock transition history for a shop
     */
    static async getStockTransitionHistory(shopId: string): Promise<any[]> {
        const q = query(
            collection(db, 'stockTransitions'),
            where('shopId', '==', shopId),
            orderBy('transitionDate', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    /**
     * Reverse stock transition (reopen financial year)
     */
    static async reverseStockTransition(
        shopId: string,
        transitionId: string,
        reason: string
    ): Promise<boolean> {

        // Get transition record
        const transitionDoc = await getDoc(doc(db, 'stockTransitions', transitionId));
        if (!transitionDoc.exists()) {
            throw new Error('سجل الانتقال غير موجود');
        }

        const transitionData = transitionDoc.data();

        // Validate permissions
        if (transitionData.shopId !== shopId) {
            throw new Error('لا يمكنك عكس انتقال خاص بمحل آخر');
        }

        const batch = writeBatch(db);

        // 1. Reopen source financial year
        batch.update(doc(db, 'financialYears', transitionData.fromFinancialYearId), {
            status: 'open',
            closingStockValue: null
        });

        // 2. Reset target year opening stock (if it was automatically created)
        if (transitionData.toFinancialYearId) {
            const toYear = await this.getFinancialYearById(transitionData.toFinancialYearId);
            if (toYear && toYear.openingStockValue === transitionData.closingStockValue) {
                batch.update(doc(db, 'financialYears', transitionData.toFinancialYearId), {
                    openingStockValue: 0
                });

                // Reset opening stock account
                if (toYear.openingStockAccountId) {
                    batch.update(doc(db, 'accounts', toYear.openingStockAccountId), {
                        openingBalance: 0
                    });
                }
            }
        }

        // 3. Mark transition as reversed
        batch.update(doc(db, 'stockTransitions', transitionId), {
            status: 'reversed',
            reversalReason: reason,
            reversalDate: Timestamp.now().toDate().toISOString()
        });

        await batch.commit();
        return true;
    }

    /**
     * Check if there are open financial years before the specified year
     */
    static async hasOpenPreviousYears(
        shopId: string,
        financialYearId: string
    ): Promise<boolean> {
        const currentYear = await this.getFinancialYearById(financialYearId);
        if (!currentYear) return false;

        const q = query(
            collection(db, 'financialYears'),
            where('shopId', '==', shopId),
            where('status', '==', 'open'),
            where('startDate', '<', currentYear.startDate)
        );

        const snapshot = await getDocs(q);
        return !snapshot.empty;
    }

    /**
     * Get recommended closing stock value based on recent transactions
     */
    static async getRecommendedClosingStock(
        shopId: string,
        financialYearId: string
    ): Promise<{
        recommendedValue: number;
        basis: string;
        confidence: 'high' | 'medium' | 'low';
    }> {

        // TODO: Implement logic to calculate recommended closing stock
        // This would analyze recent purchase/sales transactions,
        // current stock levels, etc.

        const financialYear = await this.getFinancialYearById(financialYearId);
        const openingStock = financialYear?.openingStockValue || 0;

        // For now, return opening stock as fallback
        return {
            recommendedValue: openingStock,
            basis: 'استنادًا على المخزون الافتتاحي (يتطلب تحديث)',
            confidence: 'low'
        };
    }

    /**
     * Validate stock continuity across financial years
     */
    static async validateStockContinuity(shopId: string): Promise<{
        isValid: boolean;
        discrepancies: Array<{
            fromYear: string;
            toYear: string;
            expectedOpening: number;
            actualOpening: number;
            difference: number;
        }>;
    }> {
        const financialYears = await FinancialYearService.getFinancialYearsByShop(shopId);
        const sortedYears = financialYears.sort((a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        const discrepancies: any[] = [];

        for (let i = 0; i < sortedYears.length - 1; i++) {
            const currentYear = sortedYears[i];
            const nextYear = sortedYears[i + 1];

            if (currentYear.closingStockValue !== undefined &&
                nextYear.openingStockValue !== currentYear.closingStockValue) {

                discrepancies.push({
                    fromYear: currentYear.name,
                    toYear: nextYear.name,
                    expectedOpening: currentYear.closingStockValue,
                    actualOpening: nextYear.openingStockValue,
                    difference: nextYear.openingStockValue - currentYear.closingStockValue
                });
            }
        }

        return {
            isValid: discrepancies.length === 0,
            discrepancies
        };
    }

    // ========== Helper Methods ==========

    private static async getFinancialYearById(financialYearId: string): Promise<FinancialYear | null> {
        try {
            const fyDoc = await getDoc(doc(db, 'financialYears', financialYearId));
            if (!fyDoc.exists()) return null;

            return {
                id: fyDoc.id,
                ...fyDoc.data()
            } as FinancialYear;
        } catch (error) {
            console.error('Error getting financial year:', error);
            return null;
        }
    }

    private static async hasPendingTransactions(
        shopId: string,
        financialYearId: string
    ): Promise<boolean> {
        // TODO: Implement logic to check for pending transactions
        // This would check for draft transactions, unbalanced entries, etc.
        return false;
    }
}