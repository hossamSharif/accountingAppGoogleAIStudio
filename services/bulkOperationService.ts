import {
  collection,
  doc,
  getDocs,
  setDoc,
  where,
  orderBy,
  limit as limitQuery,
  Timestamp,
  writeBatch,
  query as firestoreQuery
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { TransactionValidator } from './transactionValidator';
import { TransactionService } from './transactionService';
import { LoggingService } from './loggingService';
import {
  ImportTransactionData,
  BulkValidationResult,
  ImportProgress,
  ImportResult,
  ImportOptions,
  ExportOptions,
  ExportResult,
  BulkEditOperation,
  EnhancedTransaction,
  CreateTransactionData,
  DateRange,
  Account,
  TransactionType,
  LogType
} from '../types';

export class BulkOperationService extends BaseService {
  /**
   * Parse Excel/CSV files for transaction import
   */
  static async parseTransactionFile(file: File): Promise<ImportTransactionData[]> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        return await this.parseCSVFile(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        return await this.parseExcelFile(file);
      } else {
        throw new Error('نوع الملف غير مدعوم. يُرجى استخدام CSV أو Excel');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error('فشل في تحليل الملف');
    }
  }

  /**
   * Parse CSV file content
   */
  private static async parseCSVFile(file: File): Promise<ImportTransactionData[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());

          if (lines.length < 2) {
            throw new Error('الملف فارغ أو لا يحتوي على بيانات صالحة');
          }

          // Skip header row
          const dataLines = lines.slice(1);
          const transactions: ImportTransactionData[] = [];

          for (let i = 0; i < dataLines.length; i++) {
            const columns = this.parseCSVLine(dataLines[i]);

            if (columns.length < 7) {
              console.warn(`Row ${i + 2} has insufficient columns, skipping`);
              continue;
            }

            try {
              const transaction = this.parseTransactionFromColumns(columns, i + 2);
              transactions.push(transaction);
            } catch (error) {
              console.warn(`Error parsing row ${i + 2}:`, error);
              // Continue with other rows
            }
          }

          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Parse Excel file content (simplified implementation)
   */
  private static async parseExcelFile(file: File): Promise<ImportTransactionData[]> {
    // For a real implementation, you would use a library like xlsx or exceljs
    // This is a simplified version that converts to CSV first
    throw new Error('معالجة ملفات Excel غير مدعومة حالياً. يُرجى استخدام CSV');
  }

  /**
   * Parse CSV line handling quoted values
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Parse transaction from CSV columns
   */
  private static parseTransactionFromColumns(columns: string[], rowNumber: number): ImportTransactionData {
    const [date, description, reference, debitAccount, debitAmount, creditAccount, creditAmount, notes] = columns;

    // Validate required fields
    if (!date || !description || !debitAccount || !creditAccount) {
      throw new Error(`الصف ${rowNumber}: حقول مطلوبة مفقودة`);
    }

    // Parse amounts
    const debitAmt = parseFloat(debitAmount?.replace(/[^\d.-]/g, '') || '0');
    const creditAmt = parseFloat(creditAmount?.replace(/[^\d.-]/g, '') || '0');

    if (debitAmt <= 0 || creditAmt <= 0) {
      throw new Error(`الصف ${rowNumber}: المبالغ يجب أن تكون أكبر من صفر`);
    }

    if (Math.abs(debitAmt - creditAmt) > 0.01) {
      throw new Error(`الصف ${rowNumber}: المبالغ غير متوازنة`);
    }

    // Create transaction entries
    const entries = [
      {
        accountId: debitAccount.trim(),
        type: 'debit' as const,
        amount: debitAmt,
        description: description.trim()
      },
      {
        accountId: creditAccount.trim(),
        type: 'credit' as const,
        amount: creditAmt,
        description: description.trim()
      }
    ];

    return {
      date: this.normalizeDate(date),
      description: description.trim(),
      reference: reference?.trim() || undefined,
      entries,
      tags: notes ? [notes.trim()] : undefined
    };
  }

  /**
   * Normalize date format
   */
  private static normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new Error('تاريخ غير صالح');
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      throw new Error(`تاريخ غير صالح: ${dateStr}`);
    }
  }

  /**
   * Validate bulk transactions
   */
  static async validateBulkTransactions(
    transactions: ImportTransactionData[],
    shopId: string,
    financialYearId: string
  ): Promise<BulkValidationResult[]> {
    try {
      const results: BulkValidationResult[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];

        try {
          // Create transaction data for validation
          const transactionData: CreateTransactionData = {
            date: transaction.date,
            description: transaction.description,
            shopId,
            entries: transaction.entries,
            type: TransactionType.TRANSFER,
            reference: transaction.reference
          };

          // Validate using existing validator
          const validation = await TransactionValidator.validateTransaction(transactionData);

          results.push({
            isValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings,
            rowIndex: i
          });
        } catch (error) {
          results.push({
            isValid: false,
            errors: [error instanceof Error ? error.message : 'خطأ غير محدد'],
            warnings: [],
            rowIndex: i
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error validating bulk transactions:', error);
      throw new Error('فشل في التحقق من المعاملات');
    }
  }

  /**
   * Import transactions with progress tracking
   */
  static async importTransactions(
    transactions: ImportTransactionData[],
    shopId: string,
    financialYearId: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    try {
      const result: ImportResult = {
        successful: 0,
        failed: 0,
        errors: []
      };

      const { batchSize = 10, onProgress, validateBeforeImport = true } = options;

      // Process in batches for better performance
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);

        for (const transactionData of batch) {
          try {
            // Update progress
            onProgress?.({
              total: transactions.length,
              processed: result.successful + result.failed,
              failed: result.failed,
              currentItem: transactionData.description
            });

            // Validate if required
            if (validateBeforeImport) {
              const validation = await TransactionValidator.validateTransaction({
                ...transactionData,
                shopId,
                type: TransactionType.TRANSFER
              });

              if (!validation.isValid) {
                result.failed++;
                result.errors.push({
                  row: i + batch.indexOf(transactionData) + 1,
                  error: validation.errors.join(', ')
                });
                continue;
              }
            }

            // Create transaction
            await TransactionService.createTransaction({
              ...transactionData,
              shopId,
              type: TransactionType.TRANSFER
            });

            result.successful++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              row: i + batch.indexOf(transactionData) + 1,
              error: error instanceof Error ? error.message : 'خطأ غير محدد'
            });
          }
        }

        // Small delay between batches to prevent overwhelming Firebase
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Log bulk import
      await LoggingService.logAction(
        'system',
        LogType.ADD_ENTRY,
        `تم استيراد ${result.successful} معاملة، فشل ${result.failed}`,
        shopId
      );

      return result;
    } catch (error) {
      console.error('Error importing transactions:', error);
      throw new Error('فشل في استيراد المعاملات');
    }
  }

  /**
   * Export transactions to various formats
   */
  static async exportTransactions(
    shopId: string,
    financialYearId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const { format, dateRange, includeAccounts, includeBalances, groupBy } = options;

      // Get transactions data
      const transactions = await this.getTransactionsForExport(
        shopId,
        financialYearId,
        dateRange
      );

      // Get additional data if requested
      const accounts = includeAccounts ? await this.getAccountsForExport(shopId) : null;

      // Generate export content based on format
      let content: string;
      let mimeType: string;
      let filename: string;

      switch (format) {
        case 'excel':
          const excelData = await this.generateExcelExport(transactions, accounts, groupBy);
          content = excelData.content;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          filename = `transactions_${shopId}_${new Date().toISOString().split('T')[0]}.xlsx`;
          break;

        case 'csv':
          content = await this.generateCSVExport(transactions, groupBy);
          mimeType = 'text/csv;charset=utf-8';
          filename = `transactions_${shopId}_${new Date().toISOString().split('T')[0]}.csv`;
          break;

        case 'pdf':
          content = await this.generatePDFExport(transactions, accounts);
          mimeType = 'application/pdf';
          filename = `transactions_${shopId}_${new Date().toISOString().split('T')[0]}.pdf`;
          break;

        default:
          throw new Error('نوع التصدير غير مدعوم');
      }

      return {
        content,
        mimeType,
        filename
      };
    } catch (error) {
      console.error('Error exporting transactions:', error);
      throw new Error('فشل في تصدير المعاملات');
    }
  }

  /**
   * Apply bulk edit operations
   */
  static async applyBulkEdits(
    transactionIds: string[],
    operations: BulkEditOperation[],
    shopId: string,
    financialYearId: string
  ): Promise<{ successful: number; failed: number }> {
    try {
      let successful = 0;
      let failed = 0;

      const batch = writeBatch(this.db);

      for (const transactionId of transactionIds) {
        try {
          const transactionRef = doc(this.db, 'transactions', transactionId);
          const updates: any = {
            updatedAt: Timestamp.now().toDate().toISOString()
          };

          // Apply each operation
          for (const operation of operations) {
            switch (operation.type) {
              case 'UPDATE_DESCRIPTION':
                updates.description = operation.value;
                break;
              case 'UPDATE_DATE':
                updates.date = operation.value;
                break;
              case 'UPDATE_REFERENCE':
                updates.reference = operation.value;
                break;
              case 'ADD_TAG':
                // This would require reading the document first
                // For simplicity, we'll add to a tags array
                updates.tags = [...(updates.tags || []), operation.value];
                break;
              case 'REMOVE_TAG':
                // This would require reading the document first
                // For simplicity, we'll filter out the tag
                updates.tags = (updates.tags || []).filter((tag: string) => tag !== operation.value);
                break;
            }
          }

          batch.update(transactionRef, updates);
          successful++;
        } catch (error) {
          console.error(`Error updating transaction ${transactionId}:`, error);
          failed++;
        }
      }

      await batch.commit();

      // Log bulk edit
      await LoggingService.logAction(
        'system',
        LogType.EDIT_ENTRY,
        `تم تحديث ${successful} معاملة بشكل مجمع`,
        shopId
      );

      return { successful, failed };
    } catch (error) {
      console.error('Error applying bulk edits:', error);
      throw new Error('فشل في تطبيق التحديثات المجمعة');
    }
  }

  // Private helper methods

  /**
   * Get transactions for export
   */
  private static async getTransactionsForExport(
    shopId: string,
    financialYearId: string,
    dateRange?: DateRange
  ): Promise<EnhancedTransaction[]> {
    try {
      let constraints = [
        where('shopId', '==', shopId),
        where('financialYearId', '==', financialYearId)
      ];

      if (dateRange) {
        constraints.push(
          where('date', '>=', dateRange.startDate),
          where('date', '<=', dateRange.endDate)
        );
      }

      constraints.push(orderBy('date', 'desc'));

      const query = firestoreQuery(collection(this.db, 'transactions'), ...constraints);
      const snapshot = await getDocs(query);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EnhancedTransaction));
    } catch (error) {
      console.error('Error getting transactions for export:', error);
      throw error;
    }
  }

  /**
   * Get accounts for export
   */
  private static async getAccountsForExport(shopId: string): Promise<Account[]> {
    try {
      const constraints = [
        where('shopId', '==', shopId),
        where('isActive', '==', true)
      ];

      const query = firestoreQuery(collection(this.db, 'accounts'), ...constraints);
      const snapshot = await getDocs(query);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Account));
    } catch (error) {
      console.error('Error getting accounts for export:', error);
      return [];
    }
  }

  /**
   * Generate CSV export
   */
  private static async generateCSVExport(
    transactions: EnhancedTransaction[],
    groupBy?: 'date' | 'account' | 'shop'
  ): Promise<string> {
    const headers = [
      'التاريخ',
      'البيان',
      'المرجع',
      'حساب المدين',
      'مبلغ المدين',
      'حساب الدائن',
      'مبلغ الدائن',
      'الحالة',
      'تاريخ الإنشاء'
    ];

    const rows = [headers];

    for (const transaction of transactions) {
      const debitEntry = transaction.entries.find(e => e.type === 'debit');
      const creditEntry = transaction.entries.find(e => e.type === 'credit');

      rows.push([
        transaction.date,
        transaction.description,
        transaction.reference || '',
        debitEntry?.accountId || '',
        debitEntry?.amount.toString() || '0',
        creditEntry?.accountId || '',
        creditEntry?.amount.toString() || '0',
        transaction.status,
        transaction.createdAt
      ]);
    }

    return rows.map(row =>
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Generate Excel export (simplified)
   */
  private static async generateExcelExport(
    transactions: EnhancedTransaction[],
    accounts: Account[] | null,
    groupBy?: 'date' | 'account' | 'shop'
  ): Promise<{ content: string }> {
    // For a real implementation, you would use a library like exceljs
    // This returns CSV content as a fallback
    const csvContent = await this.generateCSVExport(transactions, groupBy);
    return { content: csvContent };
  }

  /**
   * Generate PDF export (simplified)
   */
  private static async generatePDFExport(
    transactions: EnhancedTransaction[],
    accounts: Account[] | null
  ): Promise<string> {
    // For a real implementation, you would use a library like jsPDF
    // This returns a simple text representation as a fallback
    const lines = [
      'تقرير المعاملات',
      '================',
      ''
    ];

    for (const transaction of transactions) {
      lines.push(`التاريخ: ${transaction.date}`);
      lines.push(`البيان: ${transaction.description}`);
      lines.push(`المرجع: ${transaction.reference || '-'}`);
      lines.push(`الحالة: ${transaction.status}`);
      lines.push('القيود:');

      for (const entry of transaction.entries) {
        lines.push(`  - ${entry.type === 'debit' ? 'مدين' : 'دائن'}: ${entry.accountId} - ${entry.amount} ريال`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}