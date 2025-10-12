import {
  ExportConfiguration,
  PDFExportConfiguration,
  ScheduledReportConfig,
  ScheduledReport,
  BatchExportItem,
  BatchExportResult,
  ReportConfiguration,
  CustomReport
} from '../types';
import { BaseService } from './baseService';
import { ReportService } from './reportService';
import { collection, doc, setDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { translate, getCurrentLanguage } from '../utils/translate';
import type { Language } from '../i18n/i18nContext';
import { OfflineManager } from './offlineManager';

// Note: In a real implementation, you would import these libraries:
// import * as ExcelJS from 'exceljs';
// import jsPDF from 'jspdf';
// import 'jspdf-autotable';

export class ExportService extends BaseService {

  // Export data to Excel with advanced formatting
  static async exportToExcel(
    data: any[],
    config: ExportConfiguration,
    language: Language = 'ar'
  ): Promise<Blob> {
    try {
      // This is a placeholder implementation
      // In real implementation, you would use ExcelJS library

      const csvContent = this.convertToCSV(data, config, language);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      // Mock Excel export for demonstration
      console.log('Exporting to Excel with config:', config);

      return blob;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      const errorMsg = translate('exports.errors.excelFailed', language);
      throw new Error(errorMsg);
    }
  }

  // Export data to PDF with custom layouts
  static async exportToPDF(
    data: any[],
    config: PDFExportConfiguration,
    language: Language = 'ar'
  ): Promise<Blob> {
    try {
      // This is a placeholder implementation
      // In real implementation, you would use jsPDF library

      const pdfContent = this.generatePDFContent(data, config, language);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });

      console.log('Exporting to PDF with config:', config);

      return blob;
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      const errorMsg = translate('exports.errors.pdfFailed', language);
      throw new Error(errorMsg);
    }
  }

  // Export to CSV format
  static async exportToCSV(
    data: any[],
    config: ExportConfiguration,
    language: Language = 'ar'
  ): Promise<Blob> {
    try {
      const csvContent = this.convertToCSV(data, config, language);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

      return blob;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      const errorMsg = translate('exports.errors.csvFailed', language);
      throw new Error(errorMsg);
    }
  }

  // Export to JSON format
  static async exportToJSON(
    data: any[],
    config: ExportConfiguration,
    language: Language = 'ar'
  ): Promise<Blob> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });

      return blob;
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      const errorMsg = translate('exports.errors.jsonFailed', language);
      throw new Error(errorMsg);
    }
  }

  // Schedule automatic reports
  static async scheduleReport(
    reportConfig: ScheduledReportConfig
  ): Promise<ScheduledReport> {
    try {
      const scheduleRef = doc(collection(db, 'scheduledReports'));
      const newSchedule: Omit<ScheduledReport, 'id'> = {
        ...reportConfig,
        isActive: true,
        lastExecuted: null,
        nextExecution: this.calculateNextExecution(reportConfig.schedule),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        executionCount: 0,
        successCount: 0,
        errorCount: 0
      };

      await setDoc(scheduleRef, newSchedule);

      // In a real implementation, you would register with a job scheduler
      console.log('Scheduled report created:', scheduleRef.id);

      return { id: scheduleRef.id, ...newSchedule };
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw new Error('فشل في جدولة التقرير');
    }
  }

  // Get all scheduled reports
  static async getScheduledReports(userId: string): Promise<ScheduledReport[]> {
    try {
      const q = query(
        collection(db, 'scheduledReports'),
        where('createdBy', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScheduledReport[];
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      throw new Error('فشل في جلب التقارير المجدولة');
    }
  }

  // Update scheduled report
  static async updateScheduledReport(
    reportId: string,
    updates: Partial<ScheduledReport>
  ): Promise<void> {
    try {
      const reportRef = doc(db, 'scheduledReports', reportId);
      await setDoc(reportRef, {
        ...updates,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating scheduled report:', error);
      throw new Error('فشل في تحديث التقرير المجدول');
    }
  }

  // Cancel scheduled report
  static async cancelScheduledReport(reportId: string): Promise<void> {
    try {
      await this.updateScheduledReport(reportId, { isActive: false });
    } catch (error) {
      console.error('Error canceling scheduled report:', error);
      throw new Error('فشل في إلغاء التقرير المجدول');
    }
  }

  // Batch export multiple reports
  static async batchExport(
    reports: BatchExportItem[],
    progressCallback?: (progress: number, current: string) => void,
    language: Language = 'ar'
  ): Promise<BatchExportResult> {
    try {
      const results: BatchExportResult = {
        successful: [],
        failed: [],
        totalCount: reports.length,
        executedAt: new Date().toISOString()
      };

      for (let i = 0; i < reports.length; i++) {
        const item = reports[i];

        try {
          if (progressCallback) {
            progressCallback((i / reports.length) * 100, item.reportConfig.name);
          }

          const data = await this.generateReportData(item.reportConfig);
          const exported = await this.exportToFormat(data, item.exportConfig, language);

          results.successful.push({
            reportName: item.reportConfig.name,
            fileName: item.exportConfig.fileName,
            format: item.exportConfig.format,
            size: exported.size
          });
        } catch (error) {
          const unknownErrorMsg = translate('exports.errors.exportError', language);
          results.failed.push({
            reportName: item.reportConfig.name,
            error: error instanceof Error ? error.message : unknownErrorMsg
          });
        }
      }

      if (progressCallback) {
        const completedMsg = translate('exports.messages.exportSuccess', language);
        progressCallback(100, completedMsg);
      }

      return results;
    } catch (error) {
      console.error('Error in batch export:', error);
      const batchErrorMsg = language === 'ar' ? 'فشل في التصدير المجمع' : 'Batch export failed';
      throw new Error(batchErrorMsg);
    }
  }

  // Generate report data based on configuration
  private static async generateReportData(reportConfig: ReportConfiguration): Promise<any[]> {
    try {
      // Use ReportService to generate the actual report data
      const report = await ReportService.generateReport(reportConfig);
      return report.data || [];
    } catch (error) {
      console.error('Error generating report data:', error);
      throw new Error(`فشل في توليد بيانات التقرير: ${reportConfig.name}`);
    }
  }

  // Export data to specified format
  private static async exportToFormat(
    data: any[],
    config: ExportConfiguration,
    language: Language = 'ar'
  ): Promise<Blob> {
    switch (config.format) {
      case 'EXCEL':
        return this.exportToExcel(data, config, language);
      case 'PDF':
        return this.exportToPDF(data, config as PDFExportConfiguration, language);
      case 'CSV':
        return this.exportToCSV(data, config, language);
      case 'JSON':
        return this.exportToJSON(data, config, language);
      default:
        const errorMsg = translate('exports.errors.invalidFormat', language);
        throw new Error(`${errorMsg}: ${config.format}`);
    }
  }

  // Helper method to convert data to CSV
  private static convertToCSV(data: any[], config: ExportConfiguration, language: Language = 'ar'): string {
    if (data.length === 0) return '';

    // Translate headers if column configuration exists
    let headers = Object.keys(data[0]);
    let csvHeaders: string;

    if (config.columns && config.columns.length > 0) {
      // Use translated headers from config
      csvHeaders = config.columns.map(col => {
        if (col.headerKey) {
          return translate(col.headerKey, language);
        }
        return language === 'ar' ? (col.headerAr || col.header) : (col.headerEn || col.header);
      }).join(',');

      // Use column keys if specified
      headers = config.columns.map(col => col.key || col.header);
    } else {
      // Default headers
      csvHeaders = headers.map(h => translate(`exports.headers.${h}`, language, {}, h)).join(',');
    }

    const csvRows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value.toString();
      }).join(',')
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Helper method to generate PDF content (placeholder)
  private static generatePDFContent(data: any[], config: PDFExportConfiguration, language: Language = 'ar'): string {
    // This is a placeholder - in real implementation would use jsPDF
    const locale = language === 'ar' ? 'ar-SA' : 'en-US';
    const titleLabel = translate('exports.pdf.title', language);
    const generatedOnLabel = translate('exports.pdf.generatedOn', language);
    const recordsLabel = language === 'ar' ? 'سجلات البيانات' : 'Data Records';
    const moreLabel = language === 'ar' ? 'و {count} سجل آخر' : 'and {count} more records';

    const content = `PDF Report

${generatedOnLabel}: ${new Date().toLocaleDateString(locale)}
${titleLabel}: ${config.title || titleLabel}

${recordsLabel}: ${data.length}

${data.slice(0, 10).map((row, index) =>
  `${language === 'ar' ? 'سجل' : 'Record'} ${index + 1}: ${JSON.stringify(row, null, 2)}`
).join('\n\n')}

${data.length > 10 ? `... ${moreLabel.replace('{count}', (data.length - 10).toString())}` : ''}
`;

    return content;
  }

  // Calculate next execution time for scheduled reports
  private static calculateNextExecution(schedule: ScheduledReportConfig['schedule']): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.frequency) {
      case 'DAILY':
        next.setDate(now.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(now.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(now.getMonth() + 1);
        break;
      case 'QUARTERLY':
        next.setMonth(now.getMonth() + 3);
        break;
      case 'YEARLY':
        next.setFullYear(now.getFullYear() + 1);
        break;
      default:
        next.setDate(now.getDate() + 1);
    }

    // Set specific time if provided
    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      next.setHours(hours, minutes, 0, 0);
    }

    return next;
  }

  // Execute scheduled report
  static async executeScheduledReport(reportId: string): Promise<void> {
    try {
      const reportRef = doc(db, 'scheduledReports', reportId);
      const reportDoc = await this.getDocumentById('scheduledReports', reportId);

      if (!reportDoc) {
        throw new Error('تقرير مجدول غير موجود');
      }

      const scheduledReport = reportDoc as ScheduledReport;

      if (!scheduledReport.isActive) {
        return; // Skip inactive reports
      }

      // Generate and export the report
      const data = await this.generateReportData(scheduledReport.reportConfig);
      const exported = await this.exportToFormat(data, scheduledReport.exportConfig);

      // In a real implementation, you would send the report via email or save to storage
      console.log(`Executed scheduled report: ${scheduledReport.name}`);

      // Update execution statistics
      await setDoc(reportRef, {
        lastExecuted: Timestamp.now(),
        nextExecution: this.calculateNextExecution(scheduledReport.schedule),
        executionCount: (scheduledReport.executionCount || 0) + 1,
        successCount: (scheduledReport.successCount || 0) + 1,
        updatedAt: Timestamp.now()
      }, { merge: true });

    } catch (error) {
      console.error('Error executing scheduled report:', error);

      // Update error count
      const reportRef = doc(db, 'scheduledReports', reportId);
      await setDoc(reportRef, {
        errorCount: (await this.getDocumentById('scheduledReports', reportId) as ScheduledReport)?.errorCount + 1 || 1,
        lastError: error instanceof Error ? error.message : 'خطأ غير معروف',
        updatedAt: Timestamp.now()
      }, { merge: true });

      throw error;
    }
  }

  // Get export templates
  static getExportTemplates(): ExportConfiguration[] {
    return [
      {
        name: 'قالب Excel الأساسي',
        format: 'EXCEL',
        fileName: 'تقرير',
        includeHeader: true,
        includeFooter: false,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: '#,##0.00',
        currency: 'SAR',
        encoding: 'UTF-8'
      },
      {
        name: 'قالب PDF التنفيذي',
        format: 'PDF',
        fileName: 'تقرير_تنفيذي',
        includeHeader: true,
        includeFooter: true,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: '#,##0.00',
        currency: 'SAR',
        encoding: 'UTF-8'
      },
      {
        name: 'قالب CSV للتحليل',
        format: 'CSV',
        fileName: 'data_export',
        includeHeader: true,
        includeFooter: false,
        dateFormat: 'YYYY-MM-DD',
        numberFormat: '#,##0.00',
        currency: 'SAR',
        encoding: 'UTF-8'
      }
    ];
  }

  // Validate export configuration
  static validateExportConfig(config: ExportConfiguration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.fileName || config.fileName.trim() === '') {
      errors.push('اسم الملف مطلوب');
    }

    if (!config.format) {
      errors.push('تنسيق التصدير مطلوب');
    }

    if (!['EXCEL', 'PDF', 'CSV', 'JSON'].includes(config.format)) {
      errors.push('تنسيق التصدير غير مدعوم');
    }

    if (config.format === 'PDF') {
      const pdfConfig = config as PDFExportConfiguration;
      if (pdfConfig.orientation && !['portrait', 'landscape'].includes(pdfConfig.orientation)) {
        errors.push('اتجاه الصفحة غير صحيح');
      }
      if (pdfConfig.pageSize && !['a4', 'a3', 'letter'].includes(pdfConfig.pageSize)) {
        errors.push('حجم الصفحة غير مدعوم');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get export history
  static async getExportHistory(userId: string, limit: number = 50): Promise<any[]> {
    try {
      // In a real implementation, you would fetch from an exports history collection
      // This is a placeholder
      return [];
    } catch (error) {
      console.error('Error fetching export history:', error);
      throw new Error('فشل في جلب تاريخ التصدير');
    }
  }

  // ============================================
  // OFFLINE EXPORT METHODS
  // ============================================

  /**
   * Cache recent transactions and reports for offline export
   * Should be called periodically when online
   */
  static async cacheRecentTransactions(
    shopId: string,
    userId: string,
    daysBack: number = 30
  ): Promise<void> {
    try {
      console.log('🔄 Caching recent transactions for offline export...');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      // Fetch recent transactions from Firestore
      const q = query(
        collection(db, 'transactions'),
        where('shopId', '==', shopId),
        where('date', '>=', Timestamp.fromDate(cutoffDate))
      );

      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cache the transactions for offline use
      await OfflineManager.cacheReport({
        id: `cached_transactions_${shopId}`,
        name: 'Recent Transactions',
        type: 'transactions',
        data: transactions,
        shopId,
        userId,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      });

      console.log(`✅ Cached ${transactions.length} transactions for offline export`);
    } catch (error) {
      console.error('Error caching transactions:', error);
      throw new Error('فشل في حفظ البيانات للتصدير دون اتصال');
    }
  }

  /**
   * Export data from offline cache when internet is not available
   */
  static async exportOffline(
    shopId: string,
    config: ExportConfiguration,
    language: Language = 'ar'
  ): Promise<Blob> {
    try {
      console.log('📦 Exporting from offline cache...');

      // Get cached report data
      const cachedData = await this.getCachedReportData(shopId);

      if (!cachedData || cachedData.length === 0) {
        const noDataMsg = language === 'ar'
          ? 'لا توجد بيانات محفوظة للتصدير. يرجى الاتصال بالإنترنت وتحديث البيانات.'
          : 'No cached data available for export. Please connect to internet and refresh.';
        throw new Error(noDataMsg);
      }

      // Export using cached data
      const blob = await this.exportToFormat(cachedData, config, language);

      console.log(`✅ Exported ${cachedData.length} records from offline cache`);
      return blob;
    } catch (error) {
      console.error('Error exporting offline:', error);
      const errorMsg = language === 'ar'
        ? 'فشل في التصدير دون اتصال'
        : 'Offline export failed';
      throw new Error(errorMsg);
    }
  }

  /**
   * Get cached report data for offline export
   */
  static async getCachedReportData(shopId: string): Promise<any[]> {
    try {
      const reportId = `cached_transactions_${shopId}`;
      const cachedReport = await OfflineManager.getCachedReport(reportId);

      if (!cachedReport) {
        console.warn('⚠️ No cached report found for shop:', shopId);
        return [];
      }

      // Check if cache has expired
      if (cachedReport.expiresAt && cachedReport.expiresAt < Date.now()) {
        console.warn('⚠️ Cached report has expired');
        // Don't delete it - better to have old data than no data offline
      }

      return cachedReport.data || [];
    } catch (error) {
      console.error('Error getting cached report:', error);
      return [];
    }
  }

  /**
   * Check if offline export is available for a shop
   */
  static async isOfflineExportAvailable(shopId: string): Promise<boolean> {
    try {
      const data = await this.getCachedReportData(shopId);
      return data.length > 0;
    } catch (error) {
      console.error('Error checking offline export availability:', error);
      return false;
    }
  }

  /**
   * Get information about cached data (for UI display)
   */
  static async getCachedDataInfo(shopId: string): Promise<{
    recordCount: number;
    cachedAt: Date | null;
    expiresAt: Date | null;
    isExpired: boolean;
  } | null> {
    try {
      const reportId = `cached_transactions_${shopId}`;
      const cachedReport = await OfflineManager.getCachedReport(reportId);

      if (!cachedReport) {
        return null;
      }

      const isExpired = cachedReport.expiresAt ? cachedReport.expiresAt < Date.now() : false;

      return {
        recordCount: cachedReport.data?.length || 0,
        cachedAt: cachedReport.cachedAt ? new Date(cachedReport.cachedAt) : null,
        expiresAt: cachedReport.expiresAt ? new Date(cachedReport.expiresAt) : null,
        isExpired
      };
    } catch (error) {
      console.error('Error getting cached data info:', error);
      return null;
    }
  }

  /**
   * Clear cached export data for a shop
   */
  static async clearOfflineCache(shopId: string): Promise<void> {
    try {
      const reportId = `cached_transactions_${shopId}`;
      await OfflineManager.removeCachedReport(reportId);
      console.log('✅ Cleared offline export cache for shop:', shopId);
    } catch (error) {
      console.error('Error clearing offline cache:', error);
      throw new Error('فشل في مسح البيانات المحفوظة');
    }
  }

  // Clean up old export files (background job)
  static async cleanupOldExports(olderThanDays: number = 30): Promise<void> {
    try {
      // In a real implementation, you would clean up old export files from storage
      console.log(`Cleaning up exports older than ${olderThanDays} days`);
    } catch (error) {
      console.error('Error cleaning up old exports:', error);
      throw new Error('فشل في تنظيف الملفات القديمة');
    }
  }
}