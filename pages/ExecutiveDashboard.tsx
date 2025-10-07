import React, { useState, useEffect, useCallback } from 'react';
import { DashboardData, DashboardPeriod, DashboardAlert, TopPerformer } from '../types';
import { AnalyticsService } from '../services/analyticsService';
import { ShopService } from '../services/shopService';
import { toast } from '../components/Toast';
import { formatCurrency, formatNumber } from '../utils/formatting';

// KPI Card Component
interface KPICardProps {
  title: string;
  value: number;
  previousValue: number;
  format: 'currency' | 'percentage' | 'number';
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, previousValue, format, trend, icon }) => {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return formatNumber(val, 0);
    }
  };

  const changePercent = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{formatValue(value)}</p>
          <p className={`text-sm ${trendColor} flex items-center`}>
            <span className="mr-1">
              {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '➡️'}
            </span>
            {Math.abs(changePercent).toFixed(1)}% مقارنة بالفترة السابقة
          </p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
};

// Period Selector Component
interface PeriodSelectorProps {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange }) => {
  const periods: { value: DashboardPeriod; label: string }[] = [
    { value: 'today', label: 'اليوم' },
    { value: 'thisWeek', label: 'هذا الأسبوع' },
    { value: 'thisMonth', label: 'هذا الشهر' },
    { value: 'thisQuarter', label: 'هذا الربع' },
    { value: 'thisYear', label: 'هذا العام' },
    { value: 'lastMonth', label: 'الشهر الماضي' },
    { value: 'lastQuarter', label: 'الربع الماضي' },
    { value: 'lastYear', label: 'العام الماضي' }
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DashboardPeriod)}
      className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
      dir="rtl"
    >
      {periods.map(period => (
        <option key={period.value} value={period.value}>{period.label}</option>
      ))}
    </select>
  );
};

// Shop Multi Selector Component
interface ShopMultiSelectorProps {
  value: string[];
  onChange: (shopIds: string[]) => void;
}

const ShopMultiSelector: React.FC<ShopMultiSelectorProps> = ({ value, onChange }) => {
  const [shops, setShops] = useState<Array<{ id: string; name: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadShops = async () => {
      try {
        const shopsData = await ShopService.getAll();
        setShops(shopsData);
      } catch (error) {
        console.error('Error loading shops:', error);
      }
    };
    loadShops();
  }, []);

  const handleShopToggle = (shopId: string) => {
    if (value.includes(shopId)) {
      onChange(value.filter(id => id !== shopId));
    } else {
      onChange([...value, shopId]);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="border border-gray-300 rounded-lg px-3 py-2 bg-white flex items-center"
      >
        المتاجر ({value.length}) ⬇️
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="p-2">
            <button
              onClick={() => onChange(shops.map(s => s.id))}
              className="text-sm text-blue-600 hover:underline mb-2"
            >
              تحديد الكل
            </button>
            <button
              onClick={() => onChange([])}
              className="text-sm text-gray-600 hover:underline mb-2 mr-2"
            >
              إلغاء الكل
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {shops.map(shop => (
              <label key={shop.id} className="flex items-center p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={value.includes(shop.id)}
                  onChange={() => handleShopToggle(shop.id)}
                  className="mr-2"
                />
                {shop.name}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Chart Components (placeholder implementations)
interface SalesAndProfitChartProps {
  data: Array<{ date: string; sales: number; profit: number }>;
  period: DashboardPeriod;
}

const SalesAndProfitChart: React.FC<SalesAndProfitChartProps> = ({ data, period }) => {
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
      <div className="text-center">
        <div className="text-4xl mb-2">📈</div>
        <p className="text-gray-600">مخطط المبيعات والأرباح</p>
        <p className="text-sm text-gray-500">{data.length} نقطة بيانات</p>
      </div>
    </div>
  );
};

interface ShopSalesDistributionChartProps {
  data: Array<{ shopName: string; sales: number; percentage: number }>;
}

const ShopSalesDistributionChart: React.FC<ShopSalesDistributionChartProps> = ({ data }) => {
  return (
    <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
      <div className="text-center">
        <div className="text-4xl mb-2">🍰</div>
        <p className="text-gray-600">توزيع المبيعات حسب المتجر</p>
        <p className="text-sm text-gray-500">{data.length} متجر</p>
      </div>
    </div>
  );
};

// Top Performers Card Component
interface TopPerformersCardProps {
  title: string;
  items: TopPerformer[];
  metric: 'sales' | 'quantity' | 'value';
}

const TopPerformersCard: React.FC<TopPerformersCardProps> = ({ title, items, metric }) => {
  const formatMetric = (value: number) => {
    switch (metric) {
      case 'sales':
      case 'value':
        return formatCurrency(value);
      case 'quantity':
        return formatNumber(value, 0);
      default:
        return value.toString();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {items.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </div>
            <span className="text-sm text-gray-600">{formatMetric(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Quick Actions Panel Component
const QuickActionsPanel: React.FC = () => {
  const actions = [
    { label: 'إدخال معاملة جديدة', icon: '➕', href: '/daily-entry' },
    { label: 'تقرير مالي سريع', icon: '📊', action: () => window.open('/reports/financial', '_blank') },
    { label: 'إدارة المخزون', icon: '📦', href: '/inventory' },
    { label: 'معاينة التدفق النقدي', icon: '💰', action: () => window.open('/reports/cash-flow', '_blank') }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">إجراءات سريعة</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-center transition-colors"
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <p className="text-sm font-medium">{action.label}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

// Main Executive Dashboard Component
export const ExecutiveDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('thisMonth');
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(300000); // 5 minutes

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AnalyticsService.calculateDashboardMetrics(
        selectedShops,
        selectedPeriod
      );
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('فشل في تحميل بيانات لوحة القيادة');
    } finally {
      setLoading(false);
    }
  }, [selectedShops, selectedPeriod]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const interval = setInterval(loadDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [loadDashboardData, refreshInterval]);

  const renderKPICards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard
        title="إجمالي المبيعات"
        value={dashboardData?.totalSales || 0}
        previousValue={dashboardData?.previousSales || 0}
        format="currency"
        trend="up"
        icon="💰"
      />
      <KPICard
        title="صافي الربح"
        value={dashboardData?.netProfit || 0}
        previousValue={dashboardData?.previousProfit || 0}
        format="currency"
        trend={dashboardData?.profitTrend || 'neutral'}
        icon="📈"
      />
      <KPICard
        title="هامش الربح"
        value={dashboardData?.profitMargin || 0}
        previousValue={dashboardData?.previousMargin || 0}
        format="percentage"
        trend={dashboardData?.marginTrend || 'neutral'}
        icon="📊"
      />
      <KPICard
        title="قيمة المخزون"
        value={dashboardData?.stockValue || 0}
        previousValue={dashboardData?.previousStockValue || 0}
        format="currency"
        trend={dashboardData?.stockTrend || 'neutral'}
        icon="📦"
      />
    </div>
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">تطور المبيعات والأرباح</h3>
        <SalesAndProfitChart
          data={dashboardData?.salesProfitTrend || []}
          period={selectedPeriod}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">توزيع المبيعات حسب المتجر</h3>
        <ShopSalesDistributionChart
          data={dashboardData?.shopSalesDistribution || []}
        />
      </div>
    </div>
  );

  const renderTopPerformers = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <TopPerformersCard
        title="أفضل المتاجر أداءً"
        items={dashboardData?.topShops || []}
        metric="sales"
      />
      <TopPerformersCard
        title="أكثر المنتجات مبيعاً"
        items={dashboardData?.topProducts || []}
        metric="quantity"
      />
      <TopPerformersCard
        title="أكبر العملاء"
        items={dashboardData?.topCustomers || []}
        metric="value"
      />
    </div>
  );

  const renderAlerts = () => {
    if (!dashboardData?.alerts || dashboardData.alerts.length === 0) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">تنبيهات مهمة</h3>
        <div className="space-y-2">
          {dashboardData.alerts.map((alert, index) => (
            <div key={index} className={`flex items-center p-2 rounded ${
              alert.severity === 'high' ? 'bg-red-100 text-red-800' :
              alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              <span className="mr-2">
                {alert.severity === 'high' ? '🚨' :
                 alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
              </span>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل لوحة القيادة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">لوحة القيادة التنفيذية</h1>
          <div className="flex space-x-4 space-x-reverse items-center">
            <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
            <ShopMultiSelector value={selectedShops} onChange={setSelectedShops} />
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              🔄 تحديث
            </button>
          </div>
        </div>

        {renderAlerts()}
        {renderKPICards()}
        {renderCharts()}
        {renderTopPerformers()}

        {/* Quick Actions */}
        <QuickActionsPanel />
      </div>
    </div>
  );
};