import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Package,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
  Truck,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useOrders, type CustomerOrder, type OrderStatus } from "@/hooks/useOrders.ts";
import { formatCurrency } from "@/lib/utils.ts";
import { analyzeReceiptImage } from "@/lib/ocr.ts";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  REVIEW: "Under Review",
  PAYMENT_CONFIRMED: "Payment Confirmed",
  START_PACKING: "Packing",
  READY: "Ready",
  AWAITING_RIDER: "Awaiting Rider",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  PAYMENT_FAILED: "Payment Failed",
  HOLD_ORDER: "On Hold",
  REQUEST_RESUBMIT: "Resubmit Required",
  CANCELLED: "Cancelled",
};

const STATUS_CLASSES: Record<string, string> = {
  REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  PAYMENT_CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  START_PACKING: "bg-blue-50 text-blue-700 border-blue-200",
  READY: "bg-teal-50 text-teal-700 border-teal-200",
  AWAITING_RIDER: "bg-indigo-50 text-indigo-700 border-indigo-200",
  DISPATCHED: "bg-purple-50 text-purple-700 border-purple-200",
  DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAYMENT_FAILED: "bg-red-50 text-red-700 border-red-200",
  HOLD_ORDER: "bg-orange-50 text-orange-700 border-orange-200",
  REQUEST_RESUBMIT: "bg-yellow-50 text-yellow-700 border-yellow-200",
  CANCELLED: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const PRIMARY_ACTIONS: Partial<Record<OrderStatus, string>> = {
  PAYMENT_CONFIRMED: "START PACKING",
  START_PACKING: "READY",
  READY: "AWAITING RIDER",
  AWAITING_RIDER: "DISPATCH",
  DISPATCHED: "DELIVERED",
  HOLD_ORDER: "REQUEST RESUBMIT",
  REQUEST_RESUBMIT: "REVALIDATE",
};

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const {
    allOrders,
    loading,
    isSyncing,
    syncOrders,
    updateOrderStatus,
    updateOrderOcr,
    updateOrderPaymentStatus,
    editOrder,
    deleteOrder,
  } = useOrders();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rescanning, setRescanning] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...allOrders]
      .filter((order) => !q || [
        order.orderNumber,
        order.receiverName,
        order.contactNumber,
        order.telegramUsername || "",
        order.primeMemberId || "",
      ].some((value) => String(value).toLowerCase().includes(q)))
      .sort((a, b) => Number(a._creationTime || 0) - Number(b._creationTime || 0));
  }, [allOrders, search]);

  const selectedOrder = orders.find((order) => order._id === selectedId) || allOrders.find((order) => order._id === selectedId) || null;

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    if (!selectedOrder) return;
    setBusyAction(label);
    try {
      await action();
      toast.success(`${label} completed for #${selectedOrder.orderNumber}`);
    } catch (error: any) {
      toast.error(error?.message || `${label} failed`);
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrimary = async () => {
    if (!selectedOrder) return;
    if (selectedOrder.orderStatus === "REVIEW") {
      setZoom(1);
      setReviewOpen(true);
      return;
    }
    const next = {
      PAYMENT_CONFIRMED: "START_PACKING",
      START_PACKING: "READY",
      READY: "AWAITING_RIDER",
      AWAITING_RIDER: "DISPATCHED",
      DISPATCHED: "DELIVERED",
      HOLD_ORDER: "REQUEST_RESUBMIT",
    }[selectedOrder.orderStatus] as OrderStatus | undefined;
    if (next) await runAction(PRIMARY_ACTIONS[selectedOrder.orderStatus] || next, () => updateOrderStatus(selectedOrder._id, next));
  };

  const handleHold = async () => {
    if (!selectedOrder) return;
    await runAction("HOLD", () => updateOrderStatus(selectedOrder._id, "HOLD_ORDER"));
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    await runAction("CONFIRM PAYMENT", () => updateOrderPaymentStatus(selectedOrder._id, "CONFIRMED", "PAYMENT_CONFIRMED"));
    setReviewOpen(false);
  };

  const handleReviewHold = async () => {
    if (!selectedOrder) return;
    await runAction("REQUEST RESUBMIT", () => updateOrderStatus(selectedOrder._id, "REQUEST_RESUBMIT"));
    setReviewOpen(false);
  };

  const handleRescan = async () => {
    if (!selectedOrder?.receiptUrl) return;
    setRescanning(true);
    try {
      const result = await analyzeReceiptImage(selectedOrder.receiptUrl, {
        expectedAmount: selectedOrder.total,
        expectedReceiver: "PRIME ENTERPRISE PH",
      });
      await updateOrderOcr(selectedOrder._id, result, selectedOrder.receiptUrl);
      toast.success("Receipt OCR re-scanned successfully");
    } catch (error: any) {
      toast.error(error?.message || "Unable to rescan receipt");
    } finally {
      setRescanning(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedOrder) return;
    await runAction("CANCEL", () => updateOrderStatus(selectedOrder._id, "CANCELLED"));
    setCancelOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-black p-3 sm:p-4 space-y-3">
      <div className="bg-white border border-neutral-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate("/admin")} className="p-1.5 rounded-lg hover:bg-neutral-100" aria-label="Back">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>ORDER MANAGEMENT</h1>
            <p className="text-[11px] text-neutral-500" style={{ fontFamily: "'Ubuntu', sans-serif" }}>FIFO fulfillment queue • server-controlled workflow</p>
          </div>
        </div>
        <button type="button" onClick={() => void syncOrders()} disabled={isSyncing} className="px-3 py-2 rounded-xl bg-black text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
          <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "SYNCING" : "SYNC ORDERS"}
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl p-3 flex items-center gap-2">
        <Search size={14} className="text-neutral-400" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order, customer, phone, handle, MID..." className="w-full outline-none text-xs" />
        <span className="text-[10px] font-mono text-neutral-400 whitespace-nowrap">{orders.length} ORDERS</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Metric label="Review" value={allOrders.filter((o) => o.orderStatus === "REVIEW").length} />
        <Metric label="Packing" value={allOrders.filter((o) => ["PAYMENT_CONFIRMED", "START_PACKING"].includes(o.orderStatus)).length} />
        <Metric label="Ready" value={allOrders.filter((o) => o.orderStatus === "READY").length} />
        <Metric label="Rider" value={allOrders.filter((o) => ["AWAITING_RIDER", "DISPATCHED"].includes(o.orderStatus)).length} />
        <Metric label="Active" value={allOrders.filter((o) => ["REVIEW", "PAYMENT_CONFIRMED", "START_PACKING", "READY", "AWAITING_RIDER"].includes(o.orderStatus)).length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3 items-start">
        <div className="space-y-2.5">
          {loading ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-xs text-neutral-500">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-xs text-neutral-500">No orders found.</div>
          ) : (
            orders.map((order) => (
              <button
                key={order._id}
                type="button"
                onClick={() => setSelectedId(order._id)}
                className={`w-full text-left bg-white border rounded-2xl p-3.5 shadow-2xs transition ${selectedId === order._id ? "border-black ring-1 ring-black" : "border-neutral-200 hover:border-neutral-400"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm">#{order.orderNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold uppercase ${STATUS_CLASSES[order.orderStatus] || "bg-neutral-100"}`}>{STATUS_LABELS[order.orderStatus] || order.orderStatus}</span>
                    </div>
                    <div className="text-xs mt-1 font-semibold truncate">{order.receiverName}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{formatDateTime(order._creationTime)} • {order.courierName}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm">{formatCurrency(order.total)}</div>
                    <div className="text-[9px] text-neutral-400 font-mono">QUEUE #{order.queuePosition || "--"}</div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="flex items-center gap-1"><Package size={11} /> {order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                  <span className="flex items-center gap-1"><CalendarClock size={11} /> FIFO {new Date(order._creationTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-3">
          {!selectedOrder ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-xs text-neutral-500">Select an order to open full details.</div>
          ) : (
            <OrderDetail
              order={selectedOrder}
              busyAction={busyAction}
              onPrimary={handlePrimary}
              onHold={handleHold}
              onEdit={() => setEditOpen(true)}
              onCancel={() => setCancelOpen(true)}
              onReview={() => { setZoom(1); setReviewOpen(true); }}
            />
          )}
        </div>
      </div>

      {reviewOpen && selectedOrder && (
        <ReceiptReviewModal
          order={selectedOrder}
          zoom={zoom}
          setZoom={setZoom}
          rescanning={rescanning}
          onRescan={handleRescan}
          onConfirm={handleConfirmPayment}
          onHold={handleReviewHold}
          onClose={() => setReviewOpen(false)}
        />
      )}

      {editOpen && selectedOrder && (
        <EditOrderModal
          order={selectedOrder}
          onClose={() => setEditOpen(false)}
          onSave={async (details) => {
            await runAction("EDIT ORDER", () => editOrder(selectedOrder._id, details));
            setEditOpen(false);
          }}
        />
      )}

      {cancelOpen && selectedOrder && (
        <ConfirmModal
          title="CANCEL ORDER"
          message={`Cancel order #${selectedOrder.orderNumber}? This will remove it from the active fulfillment queue.`}
          confirmLabel="CANCEL ORDER"
          onCancel={() => setCancelOpen(false)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="bg-white border border-neutral-200 rounded-xl p-2.5"><div className="text-[9px] text-neutral-500 uppercase">{label}</div><div className="text-lg font-mono font-bold mt-0.5">{value}</div></div>;
}

function OrderDetail({ order, busyAction, onPrimary, onHold, onEdit, onCancel, onReview }: { order: CustomerOrder; busyAction: string | null; onPrimary: () => void; onHold: () => void; onEdit: () => void; onCancel: () => void; onReview: () => void }) {
  const primaryLabel = order.orderStatus === "REVIEW" ? "REVIEW" : PRIMARY_ACTIONS[order.orderStatus] || "WORKFLOW COMPLETE";
  const primaryDisabled = order.orderStatus === "REQUEST_RESUBMIT" || order.orderStatus === "CANCELLED" || order.orderStatus === "DELIVERED";
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3">
        <div>
          <div className="font-mono font-bold text-lg">#{order.orderNumber}</div>
          <div className="text-[10px] text-neutral-500">{formatDateTime(order._creationTime)}</div>
        </div>
        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase ${STATUS_CLASSES[order.orderStatus] || "bg-neutral-100"}`}>{STATUS_LABELS[order.orderStatus] || order.orderStatus}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Info label="TELEGRAM" value={order.telegramUsername ? `@${order.telegramUsername}` : order.telegramDisplayName || "N/A"} />
        <Info label="PRIME MID" value={order.primeMemberId || "N/A"} mono />
        <Info label="RECEIVER" value={order.receiverName} />
        <Info label="CONTACT" value={order.contactNumber} mono />
        <div className="col-span-2"><Info label="ADDRESS" value={order.deliveryAddress} /></div>
        <Info label="COURIER" value={order.courierName} />
        <Info label="TOTAL" value={formatCurrency(order.total)} mono />
      </div>

      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-1.5 text-xs">
        <div className="flex justify-between"><span className="text-neutral-500">Payment</span><strong>{order.paymentStatus}</strong></div>
        <div className="flex justify-between"><span className="text-neutral-500">Items</span><strong>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</strong></div>
        <div className="flex justify-between"><span className="text-neutral-500">Estimated wait at order</span><strong>{order.estimatedWaitingMinutes} min</strong></div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ActionButton label={primaryLabel} icon={<Eye size={14} />} onClick={onPrimary} disabled={primaryDisabled || !!busyAction} busy={busyAction === primaryLabel} primary />
        <ActionButton label={order.orderStatus === "HOLD_ORDER" ? "HOLD ACTIVE" : "HOLD"} icon={<Clock3 size={14} />} onClick={onHold} disabled={order.orderStatus === "CANCELLED" || order.orderStatus === "DELIVERED" || !!busyAction} busy={busyAction === "HOLD"} />
        <ActionButton label="EDIT" icon={<Edit3 size={14} />} onClick={onEdit} disabled={!!busyAction || order.orderStatus === "CANCELLED"} />
        <ActionButton label="CANCEL" icon={<X size={14} />} onClick={onCancel} disabled={!!busyAction || ["CANCELLED", "DELIVERED"].includes(order.orderStatus)} danger />
      </div>

      {order.orderStatus === "REQUEST_RESUBMIT" && <div className="text-[10px] text-orange-700 bg-orange-50 border border-orange-200 rounded-xl p-2.5">REVALIDATE is intentionally disabled until a replacement receipt upload is detected.</div>}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><div className="text-[8px] text-neutral-400 uppercase tracking-wider">{label}</div><div className={`text-xs font-semibold truncate ${mono ? "font-mono" : ""}`}>{value}</div></div>;
}

function ActionButton({ label, icon, onClick, disabled, busy, primary, danger }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; busy?: boolean; primary?: boolean; danger?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className={`py-2.5 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${primary ? "bg-black text-white border-black" : danger ? "bg-white text-red-700 border-red-200" : "bg-white text-neutral-800 border-neutral-200"}`}>{busy ? <Loader2 size={13} className="animate-spin" /> : icon}{label}</button>;
}

function ReceiptReviewModal({ order, zoom, setZoom, rescanning, onRescan, onConfirm, onHold, onClose }: { order: CustomerOrder; zoom: number; setZoom: (value: number) => void; rescanning: boolean; onRescan: () => void; onConfirm: () => void; onHold: () => void; onClose: () => void }) {
  const receipt = order.receiptUrl;
  return (
    <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
          <div><h2 className="font-bold uppercase text-sm">PAYMENT REVIEW • #{order.orderNumber}</h2><p className="text-[10px] text-neutral-500">Receipt verification and OCR analysis</p></div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100"><X size={17} /></button>
        </div>

        <div className="p-4 space-y-3">
          {!receipt ? (
            <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-xs text-neutral-500"><FileText size={28} className="mx-auto mb-2 opacity-40" />No receipt uploaded.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setZoom(Math.max(0.7, zoom - 0.25))} className="p-1.5 border rounded-lg"><ZoomOut size={14} /></button>
                  <button type="button" onClick={() => setZoom(Math.min(2.5, zoom + 0.25))} className="p-1.5 border rounded-lg"><ZoomIn size={14} /></button>
                  <span className="text-[10px] font-mono text-neutral-500">{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <a href={receipt} download={`receipt-${order.orderNumber}`} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg border border-neutral-200 text-[10px] font-semibold flex items-center gap-1.5"><Download size={12} /> DOWNLOAD</a>
                  <button type="button" onClick={onRescan} disabled={rescanning} className="px-2.5 py-1.5 rounded-lg bg-black text-white text-[10px] font-semibold flex items-center gap-1.5 disabled:opacity-50"><RotateCw size={12} className={rescanning ? "animate-spin" : ""} /> RESCAN</button>
                </div>
              </div>
              <div className="bg-neutral-100 border border-neutral-200 rounded-xl overflow-auto min-h-[320px] max-h-[55vh] flex items-center justify-center p-3">
                <img src={receipt} alt="Payment receipt" style={{ width: `${zoom * 100}%` }} className="max-w-none object-contain rounded-lg shadow-sm" />
              </div>
            </>
          )}

          {order.receiptOcrData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <OcrStat label="CHANNEL" value={order.receiptOcrData.channel} />
              <OcrStat label="AMOUNT" value={formatCurrency(order.receiptOcrData.amount)} />
              <OcrStat label="REFERENCE" value={order.receiptOcrData.referenceNumber} mono />
              <OcrStat label="CONFIDENCE" value={`${order.receiptOcrData.confidenceScore}%`} />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-100">
            <ActionButton label="CONFIRM" icon={<CheckCircle2 size={14} />} onClick={onConfirm} primary />
            <ActionButton label="HOLD" icon={<Clock3 size={14} />} onClick={onHold} />
            <div className="hidden sm:block" />
            <ActionButton label="CLOSE" icon={<X size={14} />} onClick={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OcrStat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-2.5"><div className="text-[8px] text-neutral-400 uppercase">{label}</div><div className={`text-xs font-bold mt-1 truncate ${mono ? "font-mono" : ""}`}>{value}</div></div>;
}

function EditOrderModal({ order, onClose, onSave }: { order: CustomerOrder; onClose: () => void; onSave: (details: Record<string, any>) => Promise<void> }) {
  const [receiverName, setReceiverName] = useState(order.receiverName);
  const [contactNumber, setContactNumber] = useState(order.contactNumber);
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress);
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await onSave({ receiverName, contactNumber, deliveryAddress, adminNotes }); } finally { setSaving(false); }
  };

  return <ModalShell title={`EDIT ORDER #${order.orderNumber}`} onClose={onClose}>
    <div className="space-y-3">
      <Field label="Receiver" value={receiverName} onChange={setReceiverName} />
      <Field label="Contact" value={contactNumber} onChange={setContactNumber} />
      <label className="block"><span className="text-[10px] font-semibold uppercase text-neutral-500">Delivery Address</span><textarea value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={3} className="mt-1 w-full border rounded-xl p-2.5 text-xs outline-none" /></label>
      <label className="block"><span className="text-[10px] font-semibold uppercase text-neutral-500">Admin Notes</span><textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} className="mt-1 w-full border rounded-xl p-2.5 text-xs outline-none" /></label>
      <div className="flex gap-2 pt-1"><button type="button" onClick={onClose} className="flex-1 border rounded-xl py-2.5 text-xs">CLOSE</button><button type="button" onClick={() => void save()} disabled={saving} className="flex-1 bg-black text-white rounded-xl py-2.5 text-xs font-bold">{saving ? "SAVING..." : "SAVE CHANGES"}</button></div>
    </div>
  </ModalShell>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="text-[10px] font-semibold uppercase text-neutral-500">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-xl p-2.5 text-xs outline-none" /></label>;
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-3"><div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"><div className="px-4 py-3 border-b flex items-center justify-between"><h3 className="font-bold text-sm uppercase">{title}</h3><button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100"><X size={16} /></button></div><div className="p-4">{children}</div></div></div>;
}

function ConfirmModal({ title, message, confirmLabel, onCancel, onConfirm }: { title: string; message: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return <ModalShell title={title} onClose={onCancel}><div className="space-y-4"><p className="text-xs text-neutral-600 leading-relaxed">{message}</p><div className="flex gap-2"><button type="button" onClick={onCancel} className="flex-1 border rounded-xl py-2.5 text-xs">KEEP</button><button type="button" onClick={() => void onConfirm()} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-xs font-bold">{confirmLabel}</button></div></div></ModalShell>;
}
