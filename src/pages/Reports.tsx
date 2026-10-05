import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Badge } from '@/components/ui';
import { EmptyState, LoadingPage } from '@/components/ui/Feedback';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
  getDateRange,
  fetchSalesReport,
  fetchPurchaseReport,
  fetchExpenseReport,
  fetchProfitLossReport,
  fetchProductPerformanceReport,
  exportToCSV,
  type DatePreset,
} from '@/services/reports';
import { formatCurrency, EXPENSE_CATEGORIES } from '@/types';
import { Download, Printer, TrendingUp, TrendingDown, DollarSign, Package, Receipt, Wallet, Truck } from 'lucide-react';

type ReportType = 'profit_loss' | 'sales' | 'purchases' | 'expenses' | 'product_performance' | 'stock' | 'customer_due' | 'supplier_payable' | 'delivery' | 'owner_withdrawal';

const REPORT_TABS: { label: string; value: ReportType; icon: React.ReactNode }[] = [
  { label: 'Profit & Loss', value: 'profit_loss', icon: <DollarSign className="w-4 h-4" /> },
  { label: 'Sales', value: 'sales', icon: <TrendingUp className="w-4 h-4" /> },
  { label: 'Purchases', value: 'purchases', icon: <Receipt className="w-4 h-4" /> },
  { label: 'Expenses', value: 'expenses', icon: <Wallet className="w-4 h-4" /> },
  { label: 'Product Performance', value: 'product_performance', icon: <Package className="w-4 h-4" /> },
];

export function Reports() {
  const { businessProfile } = useAuth();
  const { toast } = useToast();
  const currency = businessProfile?.currency ?? 'BDT';
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [activeReport, setActiveReport] = useState<ReportType>('profit_loss');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const range = useMemo(() => getDateRange(preset), [preset]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    const load = async () => {
      try {
        let result: any;
        switch (activeReport) {
          case 'profit_loss':
            result = await fetchProfitLossReport(range);
            break;
          case 'sales':
            result = await fetchSalesReport(range);
            break;
          case 'purchases':
            result = await fetchPurchaseReport(range);
            break;
          case 'expenses':
            result = await fetchExpenseReport(range);
            break;
          case 'product_performance':
            result = await fetchProductPerformanceReport(range);
            break;
          default:
            result = null;
        }
        setData(result);
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to load report', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeReport, range, toast]);

  const handlePrint = () => window.print();

  const handleExport = () => {
    try {
      if (activeReport === 'profit_loss' && data) {
        exportToCSV(`profit_loss_${preset}.csv`, ['Metric', 'Amount'], [
          ['Net Sales', data.netSales],
          ['COGS', data.cogs],
          ['Gross Profit', data.grossProfit],
          ['Operating Expenses', data.operatingExpenses],
          ['Delivery Income', data.deliveryIncome],
          ['Delivery Cost', data.deliveryCost],
          ['Net Profit', data.netProfit],
        ]);
      } else if (activeReport === 'sales' && data) {
        exportToCSV(`sales_${preset}.csv`, ['Metric', 'Value'], [
          ['Total Sales', data.totalSales],
          ['Total Discount', data.totalDiscount],
          ['Delivery Charges', data.totalDeliveryCharge],
          ['Sale Count', data.saleCount],
          ['Total Paid', data.totalPaid],
          ['Total Due', data.totalDue],
        ]);
      } else if (activeReport === 'purchases' && data) {
        exportToCSV(`purchases_${preset}.csv`, ['Metric', 'Value'], [
          ['Total Purchases', data.totalPurchases],
          ['Total Discount', data.totalDiscount],
          ['Purchase Count', data.purchaseCount],
          ['Total Paid', data.totalPaid],
          ['Total Payable', data.totalPayable],
        ]);
      } else if (activeReport === 'expenses' && data) {
        const catRows = Object.entries(data.byCategory).map(([cat, amt]) => [cat, amt] as [string, number]);
        exportToCSV(`expenses_${preset}.csv`, ['Category', 'Amount'], [
          ...catRows,
          ['Total', data.totalExpenses],
        ]);
      } else if (activeReport === 'product_performance' && Array.isArray(data)) {
        exportToCSV(`product_performance_${preset}.csv`,
          ['Product', 'Unit', 'Units Sold', 'Revenue', 'COGS', 'Gross Profit', 'Margin %', 'Current Stock', 'Stock Value'],
          data.map((r: any) => [r.name, r.unit, r.unitsSold, r.revenue, r.cogs, r.grossProfit, r.margin.toFixed(1), r.currentStock, r.stockValue])
        );
      }
      toast('Exported successfully', 'success');
    } catch {
      toast('Export failed', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Financial analysis and business insights"
        action={
          <div className="flex gap-2 no-print">
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading || !data}><Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span></Button>
            <Button variant="secondary" size="sm" onClick={handlePrint}><Printer className="w-4 h-4" /><span className="hidden sm:inline">Print</span></Button>
          </div>
        }
      />

      <div className="mb-4 no-print">
        <DateRangePicker preset={preset} onChange={setPreset} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 no-print">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveReport(tab.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeReport === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingPage message="Generating report..." />
      ) : !data ? (
        <Card><EmptyState icon={<TrendingUp className="w-8 h-8" />} title="No Data" message="No data available for this period." /></Card>
      ) : (
        <div className="animate-fade-in">
          {activeReport === 'profit_loss' && <ProfitLossReport data={data} currency={currency} />}
          {activeReport === 'sales' && <SalesReportView data={data} currency={currency} />}
          {activeReport === 'purchases' && <PurchaseReportView data={data} currency={currency} />}
          {activeReport === 'expenses' && <ExpenseReportView data={data} currency={currency} />}
          {activeReport === 'product_performance' && <ProductPerformanceView data={data} currency={currency} />}
        </div>
      )}
    </div>
  );
}

function ReportRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${bold ? 'border-t border-slate-600 mt-1 pt-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-slate-100' : 'text-slate-400'}`}>{label}</span>
      <span className={`text-sm font-semibold ${color ?? 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

function ProfitLossReport({ data, currency }: { data: any; currency: string }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-slate-200 mb-4">Profit & Loss Statement</h2>
      <ReportRow label="Sales Revenue" value={formatCurrency(data.netSales + data.operatingExpenses, currency)} />
      <ReportRow label="Less: Sales Returns" value={formatCurrency(0, currency)} color="text-red-400" />
      <ReportRow label="Net Sales" value={formatCurrency(data.netSales, currency)} bold />
      <ReportRow label="Cost of Goods Sold (COGS)" value={formatCurrency(data.cogs, currency)} color="text-red-400" />
      <ReportRow label="Gross Profit" value={formatCurrency(data.grossProfit, currency)} bold color={data.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      <ReportRow label="Operating Expenses" value={formatCurrency(data.operatingExpenses, currency)} color="text-red-400" />
      <ReportRow label="Delivery Income" value={formatCurrency(data.deliveryIncome, currency)} color="text-emerald-400" />
      <ReportRow label="Delivery Cost" value={formatCurrency(data.deliveryCost, currency)} color="text-red-400" />
      <ReportRow label="Net Profit" value={formatCurrency(data.netProfit, currency)} bold color={data.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      <div className="mt-4 p-3 bg-slate-700/40 rounded-lg">
        <p className="text-xs text-slate-400">Note: Owner withdrawals and capital are NOT included in profit calculation. They are balance sheet items, not income/expense.</p>
      </div>
    </Card>
  );
}

function SalesReportView({ data, currency }: { data: any; currency: string }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-slate-200 mb-4">Sales Report</h2>
      <ReportRow label="Total Sales" value={formatCurrency(data.totalSales, currency)} bold />
      <ReportRow label="Total Discount" value={formatCurrency(data.totalDiscount, currency)} color="text-red-400" />
      <ReportRow label="Delivery Charges" value={formatCurrency(data.totalDeliveryCharge, currency)} />
      <ReportRow label="Sale Count" value={String(data.saleCount)} />
      <ReportRow label="Total Paid" value={formatCurrency(data.totalPaid, currency)} color="text-emerald-400" />
      <ReportRow label="Total Due" value={formatCurrency(data.totalDue, currency)} color="text-red-400" />
    </Card>
  );
}

function PurchaseReportView({ data, currency }: { data: any; currency: string }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-slate-200 mb-4">Purchase Report</h2>
      <ReportRow label="Total Purchases" value={formatCurrency(data.totalPurchases, currency)} bold />
      <ReportRow label="Total Discount" value={formatCurrency(data.totalDiscount, currency)} color="text-emerald-400" />
      <ReportRow label="Purchase Count" value={String(data.purchaseCount)} />
      <ReportRow label="Total Paid" value={formatCurrency(data.totalPaid, currency)} color="text-emerald-400" />
      <ReportRow label="Total Payable" value={formatCurrency(data.totalPayable, currency)} color="text-red-400" />
    </Card>
  );
}

function ExpenseReportView({ data, currency }: { data: any; currency: string }) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-slate-200 mb-4">Expense Report</h2>
      <ReportRow label="Total Expenses" value={formatCurrency(data.totalExpenses, currency)} bold color="text-red-400" />
      <ReportRow label="Expense Count" value={String(data.count)} />
      <div className="mt-4">
        <p className="text-xs font-medium text-slate-400 mb-2">By Category</p>
        {Object.entries(data.byCategory).map(([cat, amt]: [string, any]) => {
          const label = EXPENSE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
          return <ReportRow key={cat} label={label} value={formatCurrency(amt, currency)} />;
        })}
        {Object.keys(data.byCategory).length === 0 && <p className="text-xs text-slate-500">No expenses in this period</p>}
      </div>
    </Card>
  );
}

function ProductPerformanceView({ data, currency }: { data: any[]; currency: string }) {
  if (data.length === 0) return <Card><EmptyState icon={<Package className="w-8 h-8" />} title="No Sales Data" message="No products were sold in this period." /></Card>;
  return (
    <Card>
      <div className="p-5 border-b border-slate-700/50"><h2 className="text-base font-semibold text-slate-200">Product Performance</h2></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-700/30">
            <tr className="text-left text-xs text-slate-400">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium text-right">Units Sold</th>
              <th className="px-4 py-3 font-medium text-right">Revenue</th>
              <th className="px-4 py-3 font-medium text-right">COGS</th>
              <th className="px-4 py-3 font-medium text-right">Gross Profit</th>
              <th className="px-4 py-3 font-medium text-right">Margin</th>
              <th className="px-4 py-3 font-medium text-right">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {data.map((r) => (
              <tr key={r.productId} className="hover:bg-slate-700/30">
                <td className="px-4 py-3 font-medium text-slate-200">{r.name}</td>
                <td className="px-4 py-3 text-right text-slate-300">{r.unitsSold} {r.unit}</td>
                <td className="px-4 py-3 text-right text-slate-200">{formatCurrency(r.revenue, currency)}</td>
                <td className="px-4 py-3 text-right text-red-400">{formatCurrency(r.cogs, currency)}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-400">{formatCurrency(r.grossProfit, currency)}</td>
                <td className="px-4 py-3 text-right"><Badge variant={r.margin >= 30 ? 'success' : r.margin >= 10 ? 'warning' : 'danger'}>{r.margin.toFixed(1)}%</Badge></td>
                <td className="px-4 py-3 text-right text-slate-400">{r.currentStock} {r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
