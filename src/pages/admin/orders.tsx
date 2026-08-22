import { OrderListSkeleton } from "@/components/admin/OrderSkeleton.tsx";
import { useState, useMemo } from "react";
import {
  Search,
  Package,
  Truck,
  Eye,
  RefreshCw,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Copy,
  Check,
  ScanLine,
  CreditCard,
  Building,
  ShieldCheck,
  Upload,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useOrders, type CustomerOrder, type OrderStatus } from "@/hooks/useOrders.ts";
import { ReceiptOcrScanner } from "@/components/ReceiptOcrScanner.tsx";
import { analyzeReceiptImage } from "@/lib/ocr.ts";
import type { ReceiptOcrResult } from "@/types/ocr.ts";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils.ts";
import { SalesPerformanceChart } from "@/components/admin/SalesPerformanceChart.tsx";

const STATUS_LABELS: Record<OrderStatus, string> = {
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

const STATUS_COLORS: Record<OrderStatus, string> = {
  REVIEW: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  PAYMENT_CONFIRMED: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  START_PACKING: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  READY: "bg-teal-500/20 text-teal-700 border-teal-500/30",
  AWAITING_RIDER: "bg-indigo-500/20 text-indigo-700 border-indigo-500/30",
  DISPATCHED: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  DELIVERED: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  PAYMENT_FAILED: "bg-rose-500/20 text-rose-700 border-rose-500/30",
  HOLD_ORDER: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  REQUEST_RESUBMIT: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  PAYMENT_CLEARED: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
  FINAL_FOLLOW_UP: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  REJECTED: "bg-rose-500/20 text-rose-700 border-rose-500/30",
  CANCELLED: "bg-neutral-500/20 text-neutral-700 border-neutral-500/30",
};

export default function AdminOrdersPage() {
  const { allOrders: orders, updateOrderStatus, updateOrderOcr, updateOrderPaymentStatus, deleteOrder, loading } = useOrders();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showSalesAnalytics, setShowSalesAnalytics] = useState(true);

  // ... (existing useMemo for filteredOrders) ...
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.receiverName.toLowerCase().includes(search.toLowerCase()) ||
        o.contactNumber.includes(search) ||
        (o.telegramUsername && o.telegramUsername.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === "ALL" || o.orderStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);





  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
    toast.success(`Updated order #${selectedOrder?.orderNumber} status to ${STATUS_LABELS[newStatus]}`);
    if (selectedOrder?._id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, orderStatus: newStatus } : null));
    }
  };

  const handleAutoConfirmPayment = (order: CustomerOrder) => {
    updateOrderPaymentStatus(order._id, "CONFIRMED", "PAYMENT_CONFIRMED");
    toast.success(`Order #${order.orderNumber} payment confirmed via OCR verification!`);
    if (selectedOrder?._id === order._id) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, paymentStatus: "CONFIRMED", orderStatus: "PAYMENT_CONFIRMED" } : null
      );
    }
  };

  const handleScanOrderReceipt = async (order: CustomerOrder, receiptUrl: string) => {
    setIsScanningOcr(true);
    try {
      const result = await analyzeReceiptImage(receiptUrl, {
        expectedAmount: order.total,
        expectedReceiver: "PRIME ENTERPRISE PH",
      });
      updateOrderOcr(order._id, result, receiptUrl);
      if (selectedOrder?._id === order._id) {
        setSelectedOrder((prev) => (prev ? { ...prev, receiptOcrData: result, receiptUrl } : null));
      }
      toast.success(`OCR Analyzed: ${result.channel} payment of ${formatCurrency(result.amount)}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to scan receipt with Gemini OCR");
    } finally {
      setIsScanningOcr(false);
    }
  };

  const handleCopyRef = (refNo: string) => {
    navigator.clipboard.writeText(refNo);
    setCopiedRef(true);
    toast.success("Reference number copied");
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleUpdateNotes = (orderId: string, notes: string) => {
    updateOrderStatus(orderId, selectedOrder?.orderStatus || "REVIEW", notes);
    if (selectedOrder?._id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, adminNotes: notes } : null));
    }
  };

  const handleDelete = (orderId: string) => {
    deleteOrder(orderId);
    if (selectedOrder?._id === orderId) {
      setSelectedOrder(null);
    }
    toast.success("Order removed from queue");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1
            className="text-black text-2xl font-normal tracking-wide uppercase"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            Orders Management
          </h1>
          <p className="text-neutral-500 text-xs mt-0.5 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            Real-time customer orders, payment approvals, and courier dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSalesAnalytics((prev) => !prev)}
            className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white text-xs px-3 py-2 rounded-xl transition cursor-pointer font-normal shadow-2xs"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            <TrendingUp size={13} />
            <span>{showSalesAnalytics ? "Hide Sales Chart" : "Show 30-Day Sales Chart"}</span>
            {showSalesAnalytics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <div className="bg-white border border-neutral-200 rounded-xl px-3.5 py-1.5 flex items-center gap-2">
            <span className="text-neutral-500 text-xs font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Active Orders:</span>
            <span className="text-black font-semibold text-sm" style={{ fontFamily: "'Ubuntu', sans-serif" }}>{orders.length}</span>
          </div>

          <button
            onClick={() => toast.success("Synced latest orders")}
            className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs px-3 py-2 rounded-xl transition cursor-pointer font-normal"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            <RefreshCw size={13} /> Refresh Sync
          </button>
        </div>
      </div>

      {/* 30-Day Sales Performance Visualization */}
      {showSalesAnalytics && (
        <div className="transition-all duration-300">
          <SalesPerformanceChart />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wider" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Pending Review</div>
          <div className="text-blue-950 text-2xl font-normal mt-1" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            {orders.filter((o) => o.orderStatus === "REVIEW").length}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wider" style={{ fontFamily: "'Ubuntu', sans-serif" }}>In Preparation</div>
          <div className="text-blue-950 text-2xl font-normal mt-1" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            {orders.filter((o) => ["PAYMENT_CONFIRMED", "START_PACKING", "READY"].includes(o.orderStatus)).length}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wider" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Out for Delivery</div>
          <div className="text-blue-950 text-2xl font-normal mt-1" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            {orders.filter((o) => ["AWAITING_RIDER", "DISPATCHED"].includes(o.orderStatus)).length}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-neutral-500 text-[10px] font-normal uppercase tracking-wider" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Delivered</div>
          <div className="text-blue-950 text-2xl font-normal mt-1" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            {orders.filter((o) => o.orderStatus === "DELIVERED").length}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2 shadow-2xs">
          <Search size={15} className="text-neutral-400" />
          <input
            type="text"
            placeholder="Search by order #, customer, phone, or handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-black placeholder-neutral-400 outline-none font-normal"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {["ALL", "REVIEW", "START_PACKING", "DISPATCHED", "DELIVERED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-normal whitespace-nowrap cursor-pointer transition ${
                statusFilter === st ? "bg-black text-white" : "bg-white text-neutral-600 hover:text-black border border-neutral-200"
              }`}
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <OrderListSkeleton />
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400">
              <Package size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-normal" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                No orders match the selected filters
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                className={`bg-white border rounded-2xl p-4 transition cursor-pointer hover:border-neutral-400 shadow-2xs ${
                  selectedOrder?._id === order._id ? "border-black ring-1 ring-black" : "border-neutral-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-black font-normal text-lg tracking-wider"
                        style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                      >
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-normal px-2 py-0.5 rounded-full border ${
                          STATUS_COLORS[order.orderStatus]
                        }`}
                        style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                      >
                        {STATUS_LABELS[order.orderStatus]}
                      </span>

                      {/* OCR Status Chip */}
                      {order.receiptOcrData ? (
                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Sparkles size={10} className="text-emerald-600" />
                          <span>{order.receiptOcrData.channel} OCR Verified</span>
                        </span>
                      ) : order.receiptUrl ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                          <FileCheck size={10} className="text-amber-600" />
                          <span>Receipt Attached</span>
                        </span>
                      ) : null}
                    </div>
                    <div className="text-neutral-500 text-xs mt-1 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                      {order.receiverName} {order.telegramUsername ? `(@${order.telegramUsername})` : ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className="text-black font-normal text-lg"
                      style={{ fontFamily: "'Ubuntu', sans-serif" }}
                    >
                      {formatCurrency(order.total)}
                    </div>
                    <div className="text-neutral-400 text-[11px] font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                      {new Date(order._creationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  <div className="flex items-center gap-1.5">
                    <Package size={13} className="text-neutral-400" />
                    <span>
                      {order.items.reduce((s, i) => s + i.quantity, 0)} items ({order.items.map((i) => i.productName).join(", ")})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-neutral-700 font-normal">
                    <Truck size={13} /> {order.courierName}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-1">
          {selectedOrder ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4 sticky top-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div>
                  <div
                    className="text-black font-normal text-xl"
                    style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                  >
                    #{selectedOrder.orderNumber}
                  </div>
                  <div className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    {new Date(selectedOrder._creationTime).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`text-xs font-normal px-2.5 py-1 rounded-full border ${
                    STATUS_COLORS[selectedOrder.orderStatus]
                  }`}
                  style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                >
                  {STATUS_LABELS[selectedOrder.orderStatus]}
                </span>
              </div>

              <div>
                <label className="block text-neutral-500 text-[11px] font-normal uppercase tracking-wider mb-1.5" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  Update Order Status
                </label>
                <select
                  value={selectedOrder.orderStatus}
                  onChange={(e) => handleUpdateStatus(selectedOrder._id, e.target.value as OrderStatus)}
                  className="w-full bg-neutral-100 border border-neutral-300 text-neutral-900 text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer font-normal"
                  style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "14px" }}
                >
                  {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((st) => (
                    <option key={st} value={st}>
                      {STATUS_LABELS[st]}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Receipt & OCR Intelligence Section */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-normal text-neutral-400 uppercase tracking-wider flex items-center gap-1.5" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                    <Sparkles size={12} className="text-amber-500" /> Payment Slip & OCR Verification
                  </div>
                  {selectedOrder.receiptOcrData && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full font-bold">
                      {selectedOrder.receiptOcrData.confidenceScore}% Conf.
                    </span>
                  )}
                </div>

                {selectedOrder.receiptOcrData ? (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-xs space-y-2.5" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-black text-sm">
                        {selectedOrder.receiptOcrData.channel}
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedOrder.receiptOcrData.isAmountMatched ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {selectedOrder.receiptOcrData.isAmountMatched ? "✓ Amount Matched" : "⚠ Amount Difference"}
                      </span>
                    </div>

                    <div className="space-y-1 text-neutral-600 bg-white p-2.5 rounded-lg border border-neutral-200">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400 text-[11px]">Reference No:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-black text-xs">
                          <span>{selectedOrder.receiptOcrData.referenceNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyRef(selectedOrder.receiptOcrData!.referenceNumber)}
                            className="text-neutral-400 hover:text-black cursor-pointer p-0.5"
                            title="Copy Ref"
                          >
                            {copiedRef ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-neutral-400 text-[11px]">Detected Amount:</span>
                        <span className="font-mono font-bold text-black">
                          {formatCurrency(selectedOrder.receiptOcrData.amount)}
                        </span>
                      </div>

                      {selectedOrder.receiptOcrData.senderName && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400 text-[11px]">Sender:</span>
                          <span className="font-medium text-neutral-800">{selectedOrder.receiptOcrData.senderName}</span>
                        </div>
                      )}

                      {selectedOrder.receiptOcrData.receiverName && (
                        <div className="flex justify-between">
                          <span className="text-neutral-400 text-[11px]">Merchant / Recipient:</span>
                          <span className="font-medium text-neutral-800">{selectedOrder.receiptOcrData.receiverName}</span>
                        </div>
                      )}
                    </div>

                    {/* Receipt Image Thumbnail if exists */}
                    {selectedOrder.receiptUrl && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <a
                          href={selectedOrder.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 group cursor-pointer"
                        >
                          <img
                            src={selectedOrder.receiptUrl}
                            alt="Receipt"
                            className="w-10 h-10 rounded-lg object-cover border border-neutral-300 group-hover:opacity-80 transition"
                          />
                          <span className="text-[11px] text-neutral-600 group-hover:text-black underline">
                            View Full Slip
                          </span>
                        </a>

                        <button
                          type="button"
                          disabled={isScanningOcr}
                          onClick={() => handleScanOrderReceipt(selectedOrder, selectedOrder.receiptUrl!)}
                          className="text-[11px] text-neutral-600 hover:text-black bg-white border border-neutral-200 px-2 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={10} className={isScanningOcr ? "animate-spin" : ""} />
                          <span>Re-scan OCR</span>
                        </button>
                      </div>
                    )}

                    {/* Quick Approve Action */}
                    {selectedOrder.paymentStatus !== "CONFIRMED" && (
                      <button
                        type="button"
                        onClick={() => handleAutoConfirmPayment(selectedOrder)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-normal py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition"
                      >
                        <CheckCircle2 size={13} />
                        <span>Confirm Payment (OCR Verified)</span>
                      </button>
                    )}
                  </div>
                ) : selectedOrder.receiptUrl ? (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 text-xs space-y-2" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-700">Receipt attached (unparsed)</span>
                      <a
                        href={selectedOrder.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-neutral-500 hover:text-black underline"
                      >
                        View Image
                      </a>
                    </div>

                    <button
                      type="button"
                      disabled={isScanningOcr}
                      onClick={() => handleScanOrderReceipt(selectedOrder, selectedOrder.receiptUrl!)}
                      className="w-full bg-black hover:bg-neutral-800 text-white font-normal py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Sparkles size={12} className={isScanningOcr ? "animate-spin text-amber-300" : "text-amber-400"} />
                      <span>{isScanningOcr ? "Extracting via Gemini OCR..." : "Analyze with Gemini OCR"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-neutral-50 rounded-xl p-3 border border-dashed border-neutral-200 text-xs text-center space-y-2">
                    <p className="text-neutral-400 text-[11px]" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                      No payment receipt attached by customer.
                    </p>
                    <label className="inline-flex items-center gap-1 text-[11px] bg-white border border-neutral-300 text-neutral-700 hover:text-black px-2.5 py-1 rounded-lg cursor-pointer transition">
                      <Upload size={11} />
                      <span>Upload Slip to Scan</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const b64 = reader.result as string;
                            await handleScanOrderReceipt(selectedOrder, b64);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="text-xs font-normal text-neutral-400 uppercase tracking-wider" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                  Customer & Delivery
                </div>
                <div className="bg-neutral-50 rounded-xl p-3 text-xs space-y-1.5 font-normal border border-neutral-100" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "13px" }}>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Receiver:</span>
                    <span className="text-black font-medium">{selectedOrder.receiverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Contact:</span>
                    <span className="text-black font-medium">{selectedOrder.contactNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Courier:</span>
                    <span className="text-black font-medium">{selectedOrder.courierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Payment:</span>
                    <span className="text-black font-medium">{selectedOrder.paymentMethodName}</span>
                  </div>
                  <div className="pt-1 border-t border-neutral-200">
                    <span className="text-neutral-500 block mb-0.5">Address:</span>
                    <span className="text-neutral-800 leading-snug block">{selectedOrder.deliveryAddress}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <div className="text-xs font-normal text-neutral-400 uppercase tracking-wider" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                  Ordered Items
                </div>
                <div className="space-y-1.5 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1 border-b border-neutral-100">
                      <span className="text-neutral-700">
                        {it.quantity}x {it.productName}
                      </span>
                      <span className="text-black font-medium">{formatCurrency(it.subtotal)}</span>
                    </div>
                  ))}
                  <div className="pt-2 text-xs space-y-1">
                    <div className="flex justify-between text-neutral-500">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-500">
                      <span>Delivery Fee:</span>
                      <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                    </div>
                    <div className="flex justify-between text-black font-semibold text-sm pt-1 border-t border-neutral-200">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100">
                <label className="block text-neutral-500 text-[11px] font-normal uppercase tracking-wider mb-1" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={selectedOrder.adminNotes ?? ""}
                  onChange={(e) => handleUpdateNotes(selectedOrder._id, e.target.value)}
                  placeholder="Add notes for dispatch team..."
                  className="w-full bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs rounded-xl p-2.5 outline-none resize-none placeholder-neutral-400 font-normal"
                  style={{ fontFamily: "'Ubuntu', sans-serif" }}
                />
              </div>

              <button
                type="button"
                onClick={() => handleDelete(selectedOrder._id)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl border border-red-200 cursor-pointer transition-colors"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                <Trash2 size={13} /> Remove Order
              </button>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-neutral-400 shadow-2xs">
              <Eye size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                Select an order from the list to review details and update its processing status.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
