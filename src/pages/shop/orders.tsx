import { Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { useOrders, type CustomerOrder } from "@/hooks/useOrders.ts";
import { formatCurrency } from "@/lib/utils.ts";

const STATUS_LABELS: Record<string, string> = {
  REVIEW: "Under Review",
  PAYMENT_CONFIRMED: "Payment Confirmed",
  START_PACKING: "Packing",
  READY: "Ready for Pickup",
  AWAITING_RIDER: "Awaiting Rider",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  PAYMENT_FAILED: "Payment Failed",
  HOLD_ORDER: "On Hold",
  REQUEST_RESUBMIT: "Resubmit Required",
  PAYMENT_CLEARED: "Payment Cleared",
  FINAL_FOLLOW_UP: "Final Follow-up",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const STATUS_CLASSES: Record<string, string> = {
  REVIEW: "bg-orange-50 text-orange-700 border-orange-200",
  PAYMENT_CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  START_PACKING: "bg-blue-50 text-blue-700 border-blue-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  AWAITING_RIDER: "bg-blue-50 text-blue-700 border-blue-200",
  DISPATCHED: "bg-blue-50 text-blue-700 border-blue-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAYMENT_FAILED: "bg-red-50 text-red-700 border-red-200",
  HOLD_ORDER: "bg-orange-50 text-orange-700 border-orange-200",
  REQUEST_RESUBMIT: "bg-orange-50 text-orange-700 border-orange-200",
  PAYMENT_CLEARED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FINAL_FOLLOW_UP: "bg-orange-50 text-orange-700 border-orange-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export default function OrdersPage() {
  const { customer } = useTelegram();
  const { orders, loading, syncOrders } = useOrders(customer?.telegramUserId);

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-10">
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-black font-normal uppercase text-xl leading-tight" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            MY ORDERS
          </h1>
          <p className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            Order number, date, amount & status
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncOrders()}
          className="text-xs text-black border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 font-normal"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          REFRESH
        </button>
      </div>

      {loading ? (
        <div className="p-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-neutral-200 animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 bg-white m-3 rounded-2xl border border-neutral-200 p-8">
          <Package size={44} className="mb-3 opacity-30" />
          <p className="font-normal text-neutral-700" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            NO ORDERS FOUND
          </p>
          <Link to="/shop" className="mt-4 text-xs bg-black text-white font-normal px-4 py-2 rounded-xl" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            BROWSE PRODUCTS
          </Link>
        </div>
      ) : (
        <div className="p-3">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1.25fr_1fr_0.9fr_1.1fr] gap-2 px-3 py-2.5 bg-neutral-50 border-b border-neutral-200 text-[9px] font-bold uppercase tracking-wider text-neutral-500" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
              <span>Order Number</span>
              <span>Date</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {orders.map((order: CustomerOrder) => (
                <div key={order._id} className="grid grid-cols-[1.25fr_1fr_0.9fr_1.1fr] gap-2 items-center px-3 py-3 text-[10px]" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  <span className="font-mono font-bold text-neutral-900 truncate">#{order.orderNumber}</span>
                  <span className="text-neutral-500 leading-tight">
                    {new Date(order._creationTime).toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" })}
                  </span>
                  <span className="font-mono font-bold text-neutral-900">{formatCurrency(order.total)}</span>
                  <span className={`justify-self-start max-w-full truncate border rounded-full px-2 py-1 text-[8px] font-bold uppercase ${STATUS_CLASSES[order.orderStatus] || "bg-neutral-100 text-neutral-600 border-neutral-200"}`}>
                    {STATUS_LABELS[order.orderStatus] || order.orderStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
