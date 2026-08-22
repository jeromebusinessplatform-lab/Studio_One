import { SalesPerformanceChart } from "@/components/admin/SalesPerformanceChart.tsx";
import { useOrders } from "@/hooks/useOrders.ts";
import { TrendingUp, ShoppingBag, DollarSign, PackageCheck, AlertCircle, ArrowUpRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils.ts";

export default function AdminAnalyticsPage() {
  const { allOrders } = useOrders();

  const confirmedOrders = allOrders.filter(
    (o) => o.paymentStatus === "CONFIRMED" || o.orderStatus === "DELIVERED" || o.orderStatus === "PAYMENT_CONFIRMED"
  );

  const totalGrossSales = allOrders.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="p-3 sm:p-5 space-y-4">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-normal uppercase text-black"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            SALES & REVENUE ANALYTICS
          </h1>
          <p
            className="text-xs text-neutral-500 font-normal"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            30-Day performance dashboard, daily metrics, and revenue breakdown
          </p>
        </div>
      </div>

      {/* 30-Day Sales Performance Line Chart */}
      <SalesPerformanceChart />

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            <ShoppingBag size={14} className="text-black" />
            <span>Order Velocity</span>
          </div>
          <div className="text-2xl font-bold text-black font-mono">
            {allOrders.length} Orders
          </div>
          <div className="text-xs text-neutral-500 font-normal">
            {confirmedOrders.length} confirmed / cleared transactions
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            <PackageCheck size={14} className="text-emerald-600" />
            <span>Fulfillment Rate</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {allOrders.length > 0 ? Math.round((confirmedOrders.length / allOrders.length) * 100) : 100}%
          </div>
          <div className="text-xs text-emerald-600 font-normal flex items-center gap-1">
            <ArrowUpRight size={12} /> High dispatch efficiency
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            <DollarSign size={14} className="text-blue-600" />
            <span>Gross Recorded Volume</span>
          </div>
          <div className="text-2xl font-bold text-black font-mono">
            {formatCurrency(totalGrossSales)}
          </div>
          <div className="text-xs text-neutral-500 font-normal">
            Including live cart and automated OCR orders
          </div>
        </div>
      </div>
    </div>
  );
}
