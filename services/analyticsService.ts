import {
  DashboardData,
  DashboardPeriod,
  BusinessInsight,
  PredictiveAnalytics,
  TopPerformer,
  DashboardAlert,
  TrendDirection,
  RevenueGrowthAnalysis,
  ProfitMarginTrend,
  Transaction,
  Shop,
  AnalyticsDateRange,
  PeriodMetrics,
  TrendAnalysis
} from '../types';
import { BaseService } from './baseService';
import { TransactionService } from './transactionService';
import { InventoryService } from './inventoryService';
import { ShopService } from './shopService';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatCurrency } from '../utils/formatting';

export class AnalyticsService extends BaseService {

  // Calculate comprehensive dashboard metrics
  static async calculateDashboardMetrics(
    shopIds: string[],
    period: DashboardPeriod,
    financialYearId?: string
  ): Promise<DashboardData> {
    try {
      const dateRange = this.getPeriodDateRange(period);
      const previousDateRange = this.getPreviousPeriodDateRange(period);

      const [
        currentMetrics,
        previousMetrics,
        trends,
        alerts,
        topPerformers
      ] = await Promise.all([
        this.calculatePeriodMetrics(shopIds, dateRange, financialYearId),
        this.calculatePeriodMetrics(shopIds, previousDateRange, financialYearId),
        this.calculateTrends(shopIds, dateRange, financialYearId),
        this.generateAlerts(shopIds, financialYearId),
        this.getTopPerformers(shopIds, dateRange, financialYearId)
      ]);

      return {
        totalSales: currentMetrics.totalSales,
        previousSales: previousMetrics.totalSales,
        netProfit: currentMetrics.netProfit,
        previousProfit: previousMetrics.netProfit,
        profitMargin: currentMetrics.profitMargin,
        previousMargin: previousMetrics.profitMargin,
        stockValue: currentMetrics.stockValue,
        previousStockValue: previousMetrics.stockValue,
        salesProfitTrend: trends.salesProfitTrend,
        shopSalesDistribution: trends.shopSalesDistribution,
        profitTrend: this.calculateTrendDirection(currentMetrics.netProfit, previousMetrics.netProfit),
        marginTrend: this.calculateTrendDirection(currentMetrics.profitMargin, previousMetrics.profitMargin),
        stockTrend: this.calculateTrendDirection(currentMetrics.stockValue, previousMetrics.stockValue),
        alerts,
        topShops: topPerformers.topShops,
        topProducts: topPerformers.topProducts,
        topCustomers: topPerformers.topCustomers
      };
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      throw new Error('فشل في حساب مؤشرات لوحة القيادة');
    }
  }

  // Generate business intelligence insights
  static async generateBusinessInsights(
    shopId: string,
    financialYearId: string
  ): Promise<BusinessInsight[]> {
    try {
      const insights: BusinessInsight[] = [];

      // Revenue growth analysis
      const revenueGrowth = await this.analyzeRevenueGrowth(shopId, financialYearId);
      if (revenueGrowth.growthRate > 0.1) {
        insights.push({
          type: 'POSITIVE',
          category: 'REVENUE',
          title: 'نمو ممتاز في الإيرادات',
          description: `نمو الإيرادات بنسبة ${(revenueGrowth.growthRate * 100).toFixed(1)}% مقارنة بالفترة السابقة`,
          actionable: true,
          recommendations: ['استمر في الاستراتيجية الحالية', 'فكر في التوسع']
        });
      }

      // Profit margin analysis
      const marginTrend = await this.analyzeProfitMarginTrend(shopId, financialYearId);
      if (marginTrend.trend === 'declining') {
        insights.push({
          type: 'WARNING',
          category: 'PROFITABILITY',
          title: 'انخفاض في هامش الربح',
          description: `هامش الربح انخفض بنسبة ${Math.abs(marginTrend.changePercent).toFixed(1)}%`,
          actionable: true,
          recommendations: ['مراجعة تكاليف التشغيل', 'تحسين استراتيجية التسعير']
        });
      }

      // Inventory turnover analysis
      const inventoryTurnover = await this.calculateInventoryTurnover(shopId, financialYearId);
      if (inventoryTurnover < 4) {
        insights.push({
          type: 'WARNING',
          category: 'INVENTORY',
          title: 'دوران مخزون منخفض',
          description: `معدل دوران المخزون ${inventoryTurnover.toFixed(1)} مرات في السنة`,
          actionable: true,
          recommendations: ['مراجعة استراتيجية الشراء', 'تحسين إدارة المخزون']
        });
      }

      // Cash flow analysis
      const cashFlowHealth = await this.analyzeCashFlowHealth(shopId, financialYearId);
      if (cashFlowHealth.score < 0.6) {
        insights.push({
          type: 'CRITICAL',
          category: 'CASH_FLOW',
          title: 'تحدي في التدفق النقدي',
          description: `مؤشر صحة التدفق النقدي ${(cashFlowHealth.score * 100).toFixed(0)}%`,
          actionable: true,
          recommendations: ['تحسين إدارة الذمم المدينة', 'مراجعة شروط الدفع مع الموردين']
        });
      }

      // Seasonal pattern analysis
      const seasonalInsights = await this.analyzeSeasonalPatterns(shopId, financialYearId);
      if (seasonalInsights.strongSeasonality) {
        insights.push({
          type: 'INFO',
          category: 'PATTERNS',
          title: 'نمط موسمي واضح',
          description: `أفضل الشهور: ${seasonalInsights.peakMonths.join('، ')}`,
          actionable: true,
          recommendations: ['التخطيط المسبق للمواسم المرتفعة', 'تحسين إدارة المخزون الموسمي']
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating business insights:', error);
      throw new Error('فشل في توليد التحليلات التجارية');
    }
  }

  // Predictive analytics for future trends
  static async generatePredictiveAnalytics(
    shopId: string,
    financialYearId: string,
    forecastMonths: number = 3
  ): Promise<PredictiveAnalytics> {
    try {
      const historicalData = await this.getHistoricalData(shopId, financialYearId, 12);

      // Simple linear regression for sales forecast
      const salesForecast = this.forecastSales(historicalData, forecastMonths);

      // Cash flow prediction based on historical patterns
      const cashFlowForecast = this.forecastCashFlow(historicalData, forecastMonths);

      // Inventory optimization recommendations
      const inventoryRecommendations = await this.generateInventoryRecommendations(shopId, financialYearId);

      return {
        salesForecast,
        cashFlowForecast,
        inventoryRecommendations,
        riskFactors: await this.identifyRiskFactors(shopId, financialYearId),
        opportunities: await this.identifyOpportunities(shopId, financialYearId),
        confidenceLevel: this.calculateForecastConfidence(historicalData)
      };
    } catch (error) {
      console.error('Error generating predictive analytics:', error);
      throw new Error('فشل في توليد التحليلات التنبؤية');
    }
  }

  // Helper methods
  private static getPeriodDateRange(period: DashboardPeriod): AnalyticsDateRange {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisWeek':
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisQuarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        start.setMonth(quarterStart, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(quarterStart + 3, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisYear':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        start.setMonth(now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastQuarter':
        const lastQuarterStart = Math.floor(now.getMonth() / 3) * 3 - 3;
        start.setMonth(lastQuarterStart, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(lastQuarterStart + 3, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastYear':
        start.setFullYear(now.getFullYear() - 1, 0, 1);
        start.setHours(0, 0, 0, 0);
        end.setFullYear(now.getFullYear() - 1, 11, 31);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  private static getPreviousPeriodDateRange(period: DashboardPeriod): AnalyticsDateRange {
    const current = this.getPeriodDateRange(period);
    const duration = current.end.getTime() - current.start.getTime();

    return {
      start: new Date(current.start.getTime() - duration),
      end: new Date(current.end.getTime() - duration)
    };
  }

  private static async calculatePeriodMetrics(
    shopIds: string[],
    dateRange: AnalyticsDateRange,
    financialYearId?: string
  ): Promise<PeriodMetrics> {
    try {
      let totalSales = 0;
      let totalExpenses = 0;
      let stockValue = 0;

      for (const shopId of shopIds) {
        // Get transactions for the period
        const salesQuery = query(
          collection(db, 'transactions'),
          where('shopId', '==', shopId),
          where('date', '>=', Timestamp.fromDate(dateRange.start)),
          where('date', '<=', Timestamp.fromDate(dateRange.end)),
          ...(financialYearId ? [where('financialYearId', '==', financialYearId)] : [])
        );

        const salesSnapshot = await getDocs(salesQuery);

        salesSnapshot.forEach(doc => {
          const transaction = doc.data() as Transaction;
          if (transaction.type === 'sale') {
            totalSales += transaction.totalAmount || 0;
          } else if (transaction.type === 'expense') {
            totalExpenses += transaction.totalAmount || 0;
          }
        });

        // Get current stock value
        const currentStockValue = await InventoryService.calculateTotalStockValue(shopId);
        stockValue += currentStockValue;
      }

      const netProfit = totalSales - totalExpenses;
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      return {
        totalSales,
        totalExpenses,
        netProfit,
        profitMargin,
        stockValue
      };
    } catch (error) {
      console.error('Error calculating period metrics:', error);
      throw error;
    }
  }

  private static calculateTrendDirection(current: number, previous: number): TrendDirection {
    if (previous === 0) return 'neutral';
    const change = ((current - previous) / previous) * 100;
    if (change > 2) return 'up';
    if (change < -2) return 'down';
    return 'neutral';
  }

  private static async calculateTrends(
    shopIds: string[],
    dateRange: AnalyticsDateRange,
    financialYearId?: string
  ): Promise<TrendAnalysis> {
    try {
      // Generate daily data points for the period
      const salesProfitTrend = await this.generateSalesProfitTrend(shopIds, dateRange, financialYearId);

      // Calculate shop distribution
      const shopSalesDistribution = await this.calculateShopSalesDistribution(shopIds, dateRange, financialYearId);

      return {
        salesProfitTrend,
        shopSalesDistribution
      };
    } catch (error) {
      console.error('Error calculating trends:', error);
      throw error;
    }
  }

  private static async generateSalesProfitTrend(
    shopIds: string[],
    dateRange: AnalyticsDateRange,
    financialYearId?: string
  ): Promise<Array<{ date: string; sales: number; profit: number }>> {
    const trend = [];
    const dayMs = 24 * 60 * 60 * 1000;

    for (let date = new Date(dateRange.start); date <= dateRange.end; date.setTime(date.getTime() + dayMs)) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayMetrics = await this.calculatePeriodMetrics(shopIds, { start: dayStart, end: dayEnd }, financialYearId);

      trend.push({
        date: date.toISOString().split('T')[0],
        sales: dayMetrics.totalSales,
        profit: dayMetrics.netProfit
      });
    }

    return trend;
  }

  private static async calculateShopSalesDistribution(
    shopIds: string[],
    dateRange: AnalyticsDateRange,
    financialYearId?: string
  ): Promise<Array<{ shopName: string; sales: number; percentage: number }>> {
    const distribution = [];
    let totalSales = 0;

    // Calculate sales for each shop
    const shopSales = await Promise.all(shopIds.map(async shopId => {
      const metrics = await this.calculatePeriodMetrics([shopId], dateRange, financialYearId);
      const shop = await ShopService.getById(shopId);
      totalSales += metrics.totalSales;
      return {
        shopId,
        shopName: shop?.name || 'متجر غير معروف',
        sales: metrics.totalSales
      };
    }));

    // Calculate percentages
    shopSales.forEach(shop => {
      distribution.push({
        shopName: shop.shopName,
        sales: shop.sales,
        percentage: totalSales > 0 ? (shop.sales / totalSales) * 100 : 0
      });
    });

    return distribution.sort((a, b) => b.sales - a.sales);
  }

  private static async generateAlerts(
    shopIds: string[],
    financialYearId?: string
  ): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    for (const shopId of shopIds) {
      // Check for low stock alerts
      const lowStockItems = await InventoryService.getLowStockItems(shopId);
      if (lowStockItems.length > 0) {
        alerts.push({
          id: `low-stock-${shopId}`,
          type: 'LOW_STOCK',
          severity: 'medium',
          message: `${lowStockItems.length} عنصر بحاجة إلى إعادة تخزين`,
          shopId,
          timestamp: new Date(),
          actionRequired: true
        });
      }

      // Check for overdue receivables
      const overdueAmount = await this.calculateOverdueReceivables(shopId);
      if (overdueAmount > 10000) {
        alerts.push({
          id: `overdue-${shopId}`,
          type: 'OVERDUE_RECEIVABLES',
          severity: 'high',
          message: `ذمم مدينة متأخرة بقيمة ${formatCurrency(overdueAmount)}`,
          shopId,
          timestamp: new Date(),
          actionRequired: true
        });
      }

      // Check for negative cash flow
      const cashFlowHealth = await this.analyzeCashFlowHealth(shopId, financialYearId);
      if (cashFlowHealth.score < 0.3) {
        alerts.push({
          id: `cash-flow-${shopId}`,
          type: 'NEGATIVE_CASH_FLOW',
          severity: 'high',
          message: 'تدفق نقدي سلبي يتطلب اهتماماً فورياً',
          shopId,
          timestamp: new Date(),
          actionRequired: true
        });
      }
    }

    return alerts;
  }

  private static async getTopPerformers(
    shopIds: string[],
    dateRange: AnalyticsDateRange,
    financialYearId?: string
  ): Promise<{ topShops: TopPerformer[]; topProducts: TopPerformer[]; topCustomers: TopPerformer[] }> {
    // Implement top performers calculation
    // This is a simplified implementation
    return {
      topShops: [],
      topProducts: [],
      topCustomers: []
    };
  }

  // Additional helper methods for business insights and predictions
  private static async analyzeRevenueGrowth(shopId: string, financialYearId: string): Promise<RevenueGrowthAnalysis> {
    // Implement revenue growth analysis
    return {
      currentRevenue: 0,
      previousRevenue: 0,
      growthRate: 0,
      trend: 'stable'
    };
  }

  private static async analyzeProfitMarginTrend(shopId: string, financialYearId: string): Promise<ProfitMarginTrend> {
    // Implement profit margin trend analysis
    return {
      currentMargin: 0,
      previousMargin: 0,
      changePercent: 0,
      trend: 'stable'
    };
  }

  private static async calculateInventoryTurnover(shopId: string, financialYearId: string): Promise<number> {
    // Implement inventory turnover calculation
    return 6; // Placeholder
  }

  private static async analyzeCashFlowHealth(shopId: string, financialYearId?: string): Promise<{ score: number }> {
    // Implement cash flow health analysis
    return { score: 0.7 }; // Placeholder
  }

  private static async analyzeSeasonalPatterns(shopId: string, financialYearId: string): Promise<{
    strongSeasonality: boolean;
    peakMonths: string[];
  }> {
    // Implement seasonal pattern analysis
    return {
      strongSeasonality: false,
      peakMonths: []
    };
  }

  private static async calculateOverdueReceivables(shopId: string): Promise<number> {
    // Implement overdue receivables calculation
    return 0; // Placeholder
  }

  private static async getHistoricalData(shopId: string, financialYearId: string, months: number): Promise<any[]> {
    // Implement historical data retrieval
    return []; // Placeholder
  }

  private static forecastSales(historicalData: any[], months: number): Array<{ month: string; predictedSales: number; confidence: number }> {
    // Implement sales forecasting
    return []; // Placeholder
  }

  private static forecastCashFlow(historicalData: any[], months: number): Array<{ month: string; predictedCashFlow: number; confidence: number }> {
    // Implement cash flow forecasting
    return []; // Placeholder
  }

  private static async generateInventoryRecommendations(shopId: string, financialYearId: string): Promise<Array<{ item: string; action: string; reason: string }>> {
    // Implement inventory recommendations
    return []; // Placeholder
  }

  private static async identifyRiskFactors(shopId: string, financialYearId: string): Promise<Array<{ factor: string; severity: 'low' | 'medium' | 'high'; description: string }>> {
    // Implement risk factor identification
    return []; // Placeholder
  }

  private static async identifyOpportunities(shopId: string, financialYearId: string): Promise<Array<{ opportunity: string; potential: number; description: string }>> {
    // Implement opportunity identification
    return []; // Placeholder
  }

  private static calculateForecastConfidence(historicalData: any[]): number {
    // Implement forecast confidence calculation
    return 0.75; // Placeholder
  }
}