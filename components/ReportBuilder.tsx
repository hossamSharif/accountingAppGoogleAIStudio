import React, { useState, useEffect, useCallback } from 'react';
import {
  ReportConfiguration,
  ReportField,
  CustomReport,
  ReportColumn,
  ReportFilter,
  ReportGrouping,
  ReportSorting,
  ExportConfiguration
} from '../types';
import { ReportService } from '../services/reportService';
import { TransactionService } from '../services/transactionService';
import { AccountService } from '../services/accountService';
import { toast } from './Toast';
import { formatCurrency, formatNumber } from '../utils/formatting';

// Field Drag Item Component
interface FieldDragItemProps {
  field: ReportField;
  onDrag: () => void;
}

const FieldDragItem: React.FC<FieldDragItemProps> = ({ field, onDrag }) => {
  return (
    <div
      draggable
      onDragStart={onDrag}
      className="flex items-center p-2 mb-1 bg-gray-50 rounded cursor-move hover:bg-gray-100"
    >
      <span className="text-sm mr-2">⋮⋮</span>
      <div>
        <div className="font-medium text-sm">{field.label}</div>
        <div className="text-xs text-gray-500">{field.type}</div>
      </div>
    </div>
  );
};

// Report Column Item Component
interface ReportColumnItemProps {
  column: ReportColumn;
  index: number;
  onEdit: (column: ReportColumn) => void;
  onRemove: (index: number) => void;
}

const ReportColumnItem: React.FC<ReportColumnItemProps> = ({ column, index, onEdit, onRemove }) => {
  return (
    <div className="flex items-center justify-between p-2 mb-1 bg-blue-50 border border-blue-200 rounded">
      <div className="flex items-center">
        <span className="text-sm mr-2">⋮⋮</span>
        <div>
          <div className="font-medium text-sm">{column.label}</div>
          <div className="text-xs text-gray-500">{column.calculation || 'Raw'}</div>
        </div>
      </div>
      <div className="flex space-x-2 space-x-reverse">
        <button
          onClick={() => onEdit(column)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ✏️
        </button>
        <button
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// Drag Drop Container Component
interface DragDropContainerProps {
  items: ReportColumn[];
  onReorder: (items: ReportColumn[]) => void;
  onRemove: (index: number) => void;
  renderItem: (item: ReportColumn, index: number) => React.ReactNode;
}

const DragDropContainer: React.FC<DragDropContainerProps> = ({ items, onReorder, onRemove, renderItem }) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    // Handle reordering logic here
  };

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          اسحب الحقول هنا لإضافتها إلى التقرير
        </div>
      ) : (
        items.map((item, index) => (
          <div
            key={item.id}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            className={`${dragOverIndex === index ? 'border-t-2 border-blue-500' : ''}`}
          >
            {renderItem(item, index)}
          </div>
        ))
      )}
    </div>
  );
};

// Filter Builder Component
interface FilterBuilderProps {
  filters: ReportFilter[];
  availableFields: ReportField[];
  onChange: (filters: ReportFilter[]) => void;
}

const FilterBuilder: React.FC<FilterBuilderProps> = ({ filters, availableFields, onChange }) => {
  const addFilter = () => {
    const newFilter: ReportFilter = {
      id: Date.now().toString(),
      fieldId: '',
      operator: 'equals',
      value: '',
      dataType: 'string'
    };
    onChange([...filters, newFilter]);
  };

  const updateFilter = (index: number, updatedFilter: Partial<ReportFilter>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updatedFilter };
    onChange(newFilters);
  };

  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onChange(newFilters);
  };

  return (
    <div className="space-y-3">
      {filters.map((filter, index) => (
        <div key={filter.id} className="flex items-center space-x-2 space-x-reverse p-3 border rounded-lg">
          <select
            value={filter.fieldId}
            onChange={(e) => updateFilter(index, { fieldId: e.target.value })}
            className="flex-1 border border-gray-300 rounded px-2 py-1"
          >
            <option value="">اختر الحقل</option>
            {availableFields.map(field => (
              <option key={field.id} value={field.id}>{field.label}</option>
            ))}
          </select>

          <select
            value={filter.operator}
            onChange={(e) => updateFilter(index, { operator: e.target.value as any })}
            className="border border-gray-300 rounded px-2 py-1"
          >
            <option value="equals">يساوي</option>
            <option value="notEquals">لا يساوي</option>
            <option value="greaterThan">أكبر من</option>
            <option value="lessThan">أصغر من</option>
            <option value="contains">يحتوي على</option>
          </select>

          <input
            type="text"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder="القيمة"
            className="flex-1 border border-gray-300 rounded px-2 py-1"
          />

          <button
            onClick={() => removeFilter(index)}
            className="text-red-600 hover:text-red-800"
          >
            🗑️
          </button>
        </div>
      ))}

      <button
        onClick={addFilter}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
      >
        + إضافة مرشح
      </button>
    </div>
  );
};

// Grouping and Sort Builder Component
interface GroupingAndSortBuilderProps {
  grouping: ReportGrouping[];
  sorting: ReportSorting[];
  availableFields: ReportField[];
  onChange: (grouping: ReportGrouping[], sorting: ReportSorting[]) => void;
}

const GroupingAndSortBuilder: React.FC<GroupingAndSortBuilderProps> = ({
  grouping,
  sorting,
  availableFields,
  onChange
}) => {
  const addGrouping = () => {
    const newGrouping: ReportGrouping = {
      fieldId: '',
      order: grouping.length + 1
    };
    onChange([...grouping, newGrouping], sorting);
  };

  const addSorting = () => {
    const newSorting: ReportSorting = {
      fieldId: '',
      direction: 'asc',
      order: sorting.length + 1
    };
    onChange(grouping, [...sorting, newSorting]);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">التجميع</h4>
        <div className="space-y-2">
          {grouping.map((group, index) => (
            <div key={index} className="flex items-center space-x-2 space-x-reverse">
              <select
                value={group.fieldId}
                onChange={(e) => {
                  const newGrouping = [...grouping];
                  newGrouping[index].fieldId = e.target.value;
                  onChange(newGrouping, sorting);
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-1"
              >
                <option value="">اختر الحقل</option>
                {availableFields.map(field => (
                  <option key={field.id} value={field.id}>{field.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const newGrouping = grouping.filter((_, i) => i !== index);
                  onChange(newGrouping, sorting);
                }}
                className="text-red-600 hover:text-red-800"
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            onClick={addGrouping}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + إضافة تجميع
          </button>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">الترتيب</h4>
        <div className="space-y-2">
          {sorting.map((sort, index) => (
            <div key={index} className="flex items-center space-x-2 space-x-reverse">
              <select
                value={sort.fieldId}
                onChange={(e) => {
                  const newSorting = [...sorting];
                  newSorting[index].fieldId = e.target.value;
                  onChange(grouping, newSorting);
                }}
                className="flex-1 border border-gray-300 rounded px-2 py-1"
              >
                <option value="">اختر الحقل</option>
                {availableFields.map(field => (
                  <option key={field.id} value={field.id}>{field.label}</option>
                ))}
              </select>
              <select
                value={sort.direction}
                onChange={(e) => {
                  const newSorting = [...sorting];
                  newSorting[index].direction = e.target.value as 'asc' | 'desc';
                  onChange(grouping, newSorting);
                }}
                className="border border-gray-300 rounded px-2 py-1"
              >
                <option value="asc">تصاعدي</option>
                <option value="desc">تنازلي</option>
              </select>
              <button
                onClick={() => {
                  const newSorting = sorting.filter((_, i) => i !== index);
                  onChange(grouping, newSorting);
                }}
                className="text-red-600 hover:text-red-800"
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            onClick={addSorting}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + إضافة ترتيب
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Report Builder Component
interface ReportBuilderProps {
  onReportGenerated: (report: CustomReport) => void;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ onReportGenerated }) => {
  const [reportConfig, setReportConfig] = useState<ReportConfiguration>({
    id: '',
    name: '',
    description: '',
    type: 'FINANCIAL',
    dataSource: 'TRANSACTIONS',
    filters: [],
    grouping: [],
    sorting: [],
    columns: [],
    calculations: [],
    formatting: {
      currency: 'SAR',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: '#,##0.00'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: '',
    isTemplate: false,
    tags: []
  });

  const [availableFields, setAvailableFields] = useState<ReportField[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available fields based on data source
  useEffect(() => {
    const loadFields = async () => {
      try {
        const fields = await ReportService.getAvailableFields(reportConfig.dataSource);
        setAvailableFields(fields);
      } catch (error) {
        console.error('Error loading fields:', error);
        toast.error('فشل في تحميل الحقول المتاحة');
      }
    };

    loadFields();
  }, [reportConfig.dataSource]);

  const addFieldToReport = useCallback((field: ReportField) => {
    const newColumn: ReportColumn = {
      id: Date.now().toString(),
      fieldId: field.id,
      label: field.label,
      type: field.type,
      width: 120,
      alignment: 'right',
      visible: true,
      sortable: true,
      calculation: field.type === 'number' ? 'sum' : undefined
    };

    setReportConfig(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn]
    }));
  }, []);

  const editColumn = useCallback((column: ReportColumn) => {
    // Open column edit modal
    console.log('Edit column:', column);
  }, []);

  const removeColumn = useCallback((index: number) => {
    setReportConfig(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
  }, []);

  const reorderColumns = useCallback((columns: ReportColumn[]) => {
    setReportConfig(prev => ({
      ...prev,
      columns
    }));
  }, []);

  const updateFilters = useCallback((filters: ReportFilter[]) => {
    setReportConfig(prev => ({
      ...prev,
      filters
    }));
  }, []);

  const updateGroupingAndSort = useCallback((grouping: ReportGrouping[], sorting: ReportSorting[]) => {
    setReportConfig(prev => ({
      ...prev,
      grouping,
      sorting
    }));
  }, []);

  const generatePreview = useCallback(async () => {
    try {
      setLoading(true);
      const preview = await ReportService.generatePreview(reportConfig);
      setPreviewData(preview);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('فشل في توليد معاينة التقرير');
    } finally {
      setLoading(false);
    }
  }, [reportConfig]);

  const saveAndGenerateReport = useCallback(async () => {
    try {
      if (!reportConfig.name.trim()) {
        toast.error('يرجى إدخال اسم التقرير');
        return;
      }

      if (reportConfig.columns.length === 0) {
        toast.error('يرجى إضافة حقل واحد على الأقل');
        return;
      }

      setLoading(true);
      const report = await ReportService.createCustomReport(reportConfig);
      onReportGenerated(report);
      toast.success('تم إنشاء التقرير بنجاح');
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error('فشل في إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  }, [reportConfig, onReportGenerated]);

  const formatCellValue = (value: any, column: ReportColumn) => {
    if (value === null || value === undefined) return '';

    switch (column.type) {
      case 'currency':
        return formatCurrency(parseFloat(value));
      case 'number':
        return formatNumber(parseFloat(value), 2);
      case 'date':
        return new Date(value).toLocaleDateString('ar-SA');
      case 'percentage':
        return `${formatNumber(parseFloat(value) * 100, 1)}%`;
      default:
        return value.toString();
    }
  };

  // Render Methods
  const renderDataSourceSelector = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">مصدر البيانات</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'TRANSACTIONS', label: 'المعاملات', icon: '💳' },
          { id: 'ACCOUNTS', label: 'الحسابات', icon: '📁' },
          { id: 'FINANCIAL_YEARS', label: 'السنوات المالية', icon: '📅' },
          { id: 'SHOPS', label: 'المتاجر', icon: '🏪' }
        ].map(source => (
          <button
            key={source.id}
            onClick={() => setReportConfig({...reportConfig, dataSource: source.id as any})}
            className={`p-4 border rounded-lg text-center transition-colors ${
              reportConfig.dataSource === source.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-2">{source.icon}</div>
            <div className="font-medium">{source.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderFieldSelector = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">الحقول المتاحة</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3">الحقول المتاحة</h4>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-4">
            {availableFields.map(field => (
              <FieldDragItem
                key={field.id}
                field={field}
                onDrag={() => addFieldToReport(field)}
              />
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">الحقول المحددة</h4>
          <div className="min-h-64 border-2 border-dashed border-gray-300 rounded-lg p-4">
            <DragDropContainer
              items={reportConfig.columns}
              onReorder={reorderColumns}
              onRemove={removeColumn}
              renderItem={(column, index) => (
                <ReportColumnItem
                  key={column.id}
                  column={column}
                  index={index}
                  onEdit={editColumn}
                  onRemove={removeColumn}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFiltersAndGrouping = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">المرشحات</h3>
        <FilterBuilder
          filters={reportConfig.filters}
          availableFields={availableFields}
          onChange={updateFilters}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">التجميع والترتيب</h3>
        <GroupingAndSortBuilder
          grouping={reportConfig.grouping}
          sorting={reportConfig.sorting}
          availableFields={availableFields}
          onChange={updateGroupingAndSort}
        />
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">معاينة التقرير</h3>
        <button
          onClick={generatePreview}
          disabled={loading || reportConfig.columns.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'جاري التحميل...' : 'تحديث المعاينة'}
        </button>
      </div>

      {previewData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {reportConfig.columns.map(column => (
                  <th key={column.id} className="px-4 py-2 text-right font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 10).map((row, index) => (
                <tr key={index} className="border-b">
                  {reportConfig.columns.map(column => (
                    <td key={column.id} className="px-4 py-2">
                      {formatCellValue(row[column.fieldId], column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {previewData.length > 10 && (
            <div className="text-center py-2 text-gray-500">
              ... و {previewData.length - 10} صف إضافي
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {reportConfig.columns.length === 0
            ? 'أضف حقولاً لعرض المعاينة'
            : 'لا توجد بيانات للمعاينة'
          }
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">منشئ التقارير المخصصة</h1>
        <p className="text-gray-600">قم بإنشاء تقارير مخصصة بسحب الحقول وتطبيق المرشحات</p>

        {/* Report Name and Description */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={reportConfig.name}
            onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder="اسم التقرير"
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
          <input
            type="text"
            value={reportConfig.description}
            onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
            placeholder="وصف التقرير (اختياري)"
            className="border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {renderDataSourceSelector()}
      {renderFieldSelector()}
      {renderFiltersAndGrouping()}
      {renderPreview()}

      <div className="flex justify-end space-x-4 space-x-reverse">
        <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          إلغاء
        </button>
        <button
          onClick={saveAndGenerateReport}
          disabled={loading || !reportConfig.name.trim() || reportConfig.columns.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'جاري الإنشاء...' : 'حفظ وإنشاء التقرير'}
        </button>
      </div>
    </div>
  );
};