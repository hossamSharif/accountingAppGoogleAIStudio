import {
  collection,
  doc,
  setDoc,
  getDocs,
  where,
  orderBy,
  limit as limitQuery,
  Timestamp,
  writeBatch,
  query as firestoreQuery
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { LoggingService } from './loggingService';
import {
  TransactionTemplate,
  CreateTransactionTemplateData,
  SmartTemplateOptions,
  GeneratedTemplate,
  TransactionPattern,
  AccountSuggestion,
  ValidationResult,
  CreateTransactionData,
  EnhancedTransaction,
  TemplateCategory,
  TemplateOverrides,
  Account,
  LogType
} from '../types';

export class TransactionTemplateService extends BaseService {
  /**
   * Create a new transaction template with validation
   */
  static async createTemplate(templateData: CreateTransactionTemplateData): Promise<TransactionTemplate> {
    try {
      // Validate template structure
      const validation = await this.validateTemplateStructure(templateData);
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      const templateRef = doc(collection(this.db, 'transactionTemplates'));
      const newTemplate: Omit<TransactionTemplate, 'id'> = {
        ...templateData,
        usageCount: 0,
        createdAt: Timestamp.now().toDate().toISOString(),
        updatedAt: Timestamp.now().toDate().toISOString(),
        isActive: true,
        tags: this.generateTemplateTags(templateData)
      };

      await setDoc(templateRef, newTemplate);

      // Log template creation
      await LoggingService.logAction(
        templateData.createdBy,
        LogType.ADD_ENTRY,
        `تم إنشاء قالب معاملة: ${templateData.name}`,
        templateData.shopId
      );

      return { id: templateRef.id, ...newTemplate };
    } catch (error) {
      console.error('Error creating transaction template:', error);
      throw new Error('فشل في إنشاء قالب المعاملة');
    }
  }

  /**
   * Get templates for a specific shop and financial year
   */
  static async getTemplatesForShop(
    shopId: string,
    financialYearId?: string,
    category?: TemplateCategory
  ): Promise<TransactionTemplate[]> {
    try {
      let query = collection(this.db, 'transactionTemplates');

      // Build query filters
      const constraints = [
        where('shopId', '==', shopId),
        where('isActive', '==', true)
      ];

      if (financialYearId) {
        constraints.push(where('applicableFinancialYears', 'array-contains', financialYearId));
      }

      if (category) {
        constraints.push(where('category', '==', category));
      }

      // Order by usage count (most used first)
      constraints.push(orderBy('usageCount', 'desc'));

      const firestoreQueryWithConstraints = firestoreQuery(query, ...constraints);
      const snapshot = await getDocs(firestoreQueryWithConstraints);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TransactionTemplate));
    } catch (error) {
      console.error('Error getting transaction templates:', error);
      throw new Error('فشل في جلب قوالب المعاملات');
    }
  }

  /**
   * Apply a template to create transaction data
   */
  static async applyTemplate(
    templateId: string,
    overrides: TemplateOverrides = {}
  ): Promise<CreateTransactionData> {
    try {
      const template = await this.getById(templateId);
      if (!template) {
        throw new Error('القالب غير موجود');
      }

      // Increment usage count
      await this.incrementUsageCount(templateId);

      // Apply overrides to template entries
      const entries = template.entryTemplate.map(entryTemplate => ({
        accountId: entryTemplate.accountId,
        amount: overrides.amounts?.[entryTemplate.accountId] || entryTemplate.defaultAmount || 0,
        type: entryTemplate.type,
        description: overrides.descriptions?.[entryTemplate.accountId] || entryTemplate.description || template.description
      }));

      const transactionData: CreateTransactionData = {
        date: overrides.date || new Date().toISOString().split('T')[0],
        description: overrides.description || template.description,
        shopId: template.shopId,
        entries,
        type: 'TRANSFER' as any,
        reference: `TMPL-${templateId}-${Date.now()}`
      };

      return transactionData;
    } catch (error) {
      console.error('Error applying transaction template:', error);
      throw new Error('فشل في تطبيق قالب المعاملة');
    }
  }

  /**
   * Get most frequently used templates for quick access
   */
  static async getMostUsedTemplates(shopId: string, limit: number = 5): Promise<TransactionTemplate[]> {
    try {
      const constraints = [
        where('shopId', '==', shopId),
        where('isActive', '==', true),
        orderBy('usageCount', 'desc'),
        limitQuery(limit)
      ];

      const query = firestoreQuery(collection(this.db, 'transactionTemplates'), ...constraints);
      const snapshot = await getDocs(query);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TransactionTemplate));
    } catch (error) {
      console.error('Error getting most used templates:', error);
      throw new Error('فشل في جلب القوالب الأكثر استخداماً');
    }
  }

  /**
   * Generate smart templates based on transaction patterns
   */
  static async generateSmartTemplates(
    shopId: string,
    financialYearId: string,
    options: SmartTemplateOptions = {}
  ): Promise<GeneratedTemplate[]> {
    try {
      const {
        minOccurrences = 3,
        analysisWindow = 30, // days
        includeAmounts = false
      } = options;

      // Analyze transaction patterns
      const patterns = await this.analyzeTransactionPatterns(
        shopId,
        financialYearId,
        analysisWindow
      );

      const generatedTemplates: GeneratedTemplate[] = [];

      for (const pattern of patterns) {
        if (pattern.occurrences >= minOccurrences && pattern.confidence >= 0.7) {
          const template = await this.createTemplateFromPattern(
            pattern,
            shopId,
            financialYearId,
            includeAmounts
          );

          generatedTemplates.push({
            template,
            confidence: pattern.confidence,
            basedOnTransactions: pattern.occurrences,
            pattern
          });
        }
      }

      return generatedTemplates;
    } catch (error) {
      console.error('Error generating smart templates:', error);
      throw new Error('فشل في توليد القوالب الذكية');
    }
  }

  /**
   * Provide AI-powered account suggestions based on description
   */
  static async suggestAccountsForDescription(
    description: string,
    shopId: string,
    financialYearId: string
  ): Promise<AccountSuggestion[]> {
    try {
      // Get historical transactions with similar descriptions
      const similarTransactions = await this.findSimilarTransactions(
        description,
        shopId,
        financialYearId
      );

      // Extract account usage patterns
      const accountUsage = new Map<string, { count: number; confidence: number }>();

      for (const transaction of similarTransactions) {
        for (const entry of transaction.entries) {
          const key = `${entry.accountId}_${entry.type}`;
          const current = accountUsage.get(key) || { count: 0, confidence: 0 };

          const similarity = this.calculateSimilarityScore(description, transaction.description);

          accountUsage.set(key, {
            count: current.count + 1,
            confidence: Math.max(current.confidence, similarity)
          });
        }
      }

      // Convert to suggestions and get account details
      const suggestions: AccountSuggestion[] = [];
      for (const [key, usage] of accountUsage.entries()) {
        const [accountId, type] = key.split('_');

        try {
          const account = await this.getAccountById(accountId);
          if (account) {
            suggestions.push({
              account,
              type: type as 'debit' | 'credit',
              confidence: usage.confidence,
              usageCount: usage.count,
              reason: `تم استخدام هذا الحساب ${usage.count} مرة في معاملات مشابهة`
            });
          }
        } catch (error) {
          // Skip if account not found
          continue;
        }
      }

      // Sort by confidence and return top suggestions
      return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);
    } catch (error) {
      console.error('Error suggesting accounts:', error);
      return [];
    }
  }

  /**
   * Update an existing template
   */
  static async updateTemplate(
    templateId: string,
    updateData: Partial<CreateTransactionTemplateData>
  ): Promise<TransactionTemplate> {
    try {
      const templateRef = doc(this.db, 'transactionTemplates', templateId);
      const updatedTemplate = {
        ...updateData,
        updatedAt: Timestamp.now().toDate().toISOString()
      };

      await setDoc(templateRef, updatedTemplate, { merge: true });

      const updated = await this.getById(templateId);
      if (!updated) {
        throw new Error('Template not found after update');
      }

      return updated;
    } catch (error) {
      console.error('Error updating template:', error);
      throw new Error('فشل في تحديث القالب');
    }
  }

  /**
   * Deactivate a template (soft delete)
   */
  static async deactivateTemplate(templateId: string): Promise<void> {
    try {
      const templateRef = doc(this.db, 'transactionTemplates', templateId);
      await setDoc(templateRef, {
        isActive: false,
        updatedAt: Timestamp.now().toDate().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error deactivating template:', error);
      throw new Error('فشل في إلغاء تفعيل القالب');
    }
  }

  // Private helper methods

  /**
   * Validate template structure and business rules
   */
  private static async validateTemplateStructure(
    templateData: CreateTransactionTemplateData
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!templateData.name?.trim()) {
      errors.push('اسم القالب مطلوب');
    }

    if (!templateData.entryTemplate || templateData.entryTemplate.length < 2) {
      errors.push('يجب أن يحتوي القالب على قيدين على الأقل');
    }

    if (!templateData.shopId) {
      errors.push('معرف المتجر مطلوب');
    }

    // Validate entries
    if (templateData.entryTemplate) {
      for (const entry of templateData.entryTemplate) {
        if (!entry.accountId) {
          errors.push('جميع القيود يجب أن تحتوي على حساب محدد');
        }

        if (!entry.type || !['debit', 'credit'].includes(entry.type)) {
          errors.push('نوع القيد يجب أن يكون مدين أو دائن');
        }
      }

      // Check balance if amounts provided
      const hasAmounts = templateData.entryTemplate.some(e => e.defaultAmount && e.defaultAmount > 0);
      if (hasAmounts) {
        const totalDebits = templateData.entryTemplate
          .filter(e => e.type === 'debit')
          .reduce((sum, e) => sum + (e.defaultAmount || 0), 0);
        const totalCredits = templateData.entryTemplate
          .filter(e => e.type === 'credit')
          .reduce((sum, e) => sum + (e.defaultAmount || 0), 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
          warnings.push('القالب غير متوازن - يُنصح بتوازن المبالغ الافتراضية');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate template tags for better categorization
   */
  private static generateTemplateTags(templateData: CreateTransactionTemplateData): string[] {
    const tags: string[] = [];

    // Add category tag
    tags.push(templateData.category);

    // Add entry type tags
    for (const entry of templateData.entryTemplate) {
      tags.push(entry.type);
    }

    // Add descriptive tags from template name and description
    const words = [...templateData.name.split(' '), ...templateData.description.split(' ')];
    for (const word of words) {
      if (word.length > 3) {
        tags.push(word.toLowerCase());
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Analyze transaction patterns for smart template generation
   */
  private static async analyzeTransactionPatterns(
    shopId: string,
    financialYearId: string,
    windowDays: number
  ): Promise<TransactionPattern[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - windowDays);

      // Get recent transactions
      const constraints = [
        where('shopId', '==', shopId),
        where('financialYearId', '==', financialYearId),
        where('createdAt', '>=', Timestamp.fromDate(cutoffDate))
      ];

      const query = firestoreQuery(collection(this.db, 'transactions'), ...constraints);
      const snapshot = await getDocs(query);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EnhancedTransaction));

      // Group transactions by pattern
      const patterns = new Map<string, TransactionPattern>();

      for (const transaction of transactions) {
        const patternKey = this.generatePatternKey(transaction);
        const existing = patterns.get(patternKey);

        if (existing) {
          existing.occurrences++;
          existing.transactions.push(transaction);
        } else {
          patterns.set(patternKey, {
            key: patternKey,
            description: transaction.description,
            accountIds: transaction.entries.map(e => e.accountId),
            entryTypes: transaction.entries.map(e => e.type),
            occurrences: 1,
            transactions: [transaction],
            confidence: 0.8 // Base confidence
          });
        }
      }

      // Calculate confidence based on consistency
      for (const pattern of patterns.values()) {
        pattern.confidence = this.calculatePatternConfidence(pattern);
      }

      return Array.from(patterns.values());
    } catch (error) {
      console.error('Error analyzing transaction patterns:', error);
      throw error;
    }
  }

  /**
   * Generate a unique key for transaction patterns
   */
  private static generatePatternKey(transaction: EnhancedTransaction): string {
    // Sort entries by account ID for consistent key generation
    const sortedEntries = [...transaction.entries].sort((a, b) => a.accountId.localeCompare(b.accountId));

    const accountPattern = sortedEntries.map(e => `${e.accountId}:${e.type}`).join('|');

    return accountPattern;
  }

  /**
   * Calculate confidence score for a transaction pattern
   */
  private static calculatePatternConfidence(pattern: TransactionPattern): number {
    let confidence = 0.5; // Base confidence

    // Higher occurrences increase confidence
    confidence += Math.min(pattern.occurrences * 0.1, 0.3);

    // Consistency in amounts increases confidence
    const amounts = pattern.transactions.flatMap(t => t.entries.map(e => e.amount));
    const uniqueAmounts = new Set(amounts);
    if (uniqueAmounts.size / amounts.length < 0.5) {
      confidence += 0.2;
    }

    // Consistency in descriptions increases confidence
    const descriptions = pattern.transactions.map(t => t.description);
    const uniqueDescriptions = new Set(descriptions);
    if (uniqueDescriptions.size / descriptions.length < 0.3) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Create a template from a transaction pattern
   */
  private static async createTemplateFromPattern(
    pattern: TransactionPattern,
    shopId: string,
    financialYearId: string,
    includeAmounts: boolean
  ): Promise<TransactionTemplate> {
    const averageAmounts = this.calculateAverageAmounts(pattern);

    const entryTemplate = pattern.accountIds.map((accountId, index) => ({
      accountId,
      type: pattern.entryTypes[index] as 'debit' | 'credit',
      defaultAmount: includeAmounts ? averageAmounts[accountId] : undefined,
      description: pattern.description,
      isRequired: true
    }));

    const templateData: CreateTransactionTemplateData = {
      name: `قالب ذكي - ${pattern.description}`,
      description: `تم إنشاؤه تلقائياً من ${pattern.occurrences} معاملة مشابهة`,
      category: 'SMART_GENERATED',
      shopId,
      financialYearId,
      entryTemplate,
      defaultTags: [pattern.description.split(' ')[0]],
      createdBy: 'system'
    };

    return await this.createTemplate(templateData);
  }

  /**
   * Calculate average amounts for accounts in a pattern
   */
  private static calculateAverageAmounts(pattern: TransactionPattern): { [accountId: string]: number } {
    const accountTotals: { [accountId: string]: { sum: number; count: number } } = {};

    for (const transaction of pattern.transactions) {
      for (const entry of transaction.entries) {
        if (!accountTotals[entry.accountId]) {
          accountTotals[entry.accountId] = { sum: 0, count: 0 };
        }
        accountTotals[entry.accountId].sum += entry.amount;
        accountTotals[entry.accountId].count++;
      }
    }

    const averages: { [accountId: string]: number } = {};
    for (const [accountId, totals] of Object.entries(accountTotals)) {
      averages[accountId] = Math.round(totals.sum / totals.count);
    }

    return averages;
  }

  /**
   * Find transactions with similar descriptions
   */
  private static async findSimilarTransactions(
    description: string,
    shopId: string,
    financialYearId: string,
    limit: number = 20
  ): Promise<EnhancedTransaction[]> {
    try {
      const constraints = [
        where('shopId', '==', shopId),
        where('financialYearId', '==', financialYearId),
        orderBy('createdAt', 'desc'),
        limitQuery(100) // Get more for better matching
      ];

      const query = firestoreQuery(collection(this.db, 'transactions'), ...constraints);
      const snapshot = await getDocs(query);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EnhancedTransaction));

      // Filter by similarity score
      return transactions
        .map(transaction => ({
          transaction,
          similarity: this.calculateSimilarityScore(description, transaction.description)
        }))
        .filter(item => item.similarity > 0.3) // Minimum similarity threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.transaction);
    } catch (error) {
      console.error('Error finding similar transactions:', error);
      return [];
    }
  }

  /**
   * Calculate similarity score between two descriptions
   */
  private static calculateSimilarityScore(desc1: string, desc2: string): number {
    const words1 = desc1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const words2 = desc2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  /**
   * Increment template usage count
   */
  private static async incrementUsageCount(templateId: string): Promise<void> {
    try {
      const templateRef = doc(this.db, 'transactionTemplates', templateId);

      // Get current usage count
      const template = await this.getById(templateId);
      if (template) {
        await setDoc(templateRef, {
          usageCount: (template.usageCount || 0) + 1,
          updatedAt: Timestamp.now().toDate().toISOString()
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error incrementing usage count:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get a template by ID
   */
  static async getById(templateId: string): Promise<TransactionTemplate | null> {
    try {
      const templateRef = doc(this.db, 'transactionTemplates', templateId);
      const snapshot = await this.getDoc(templateRef);

      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as TransactionTemplate;
      }

      return null;
    } catch (error) {
      console.error('Error getting template by ID:', error);
      return null;
    }
  }

  /**
   * Get account by ID (helper method)
   */
  private static async getAccountById(accountId: string): Promise<Account | null> {
    try {
      const accountRef = doc(this.db, 'accounts', accountId);
      const snapshot = await this.getDoc(accountRef);

      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Account;
      }

      return null;
    } catch (error) {
      console.error('Error getting account by ID:', error);
      return null;
    }
  }
}