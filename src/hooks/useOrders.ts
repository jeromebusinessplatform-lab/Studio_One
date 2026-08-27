import { useState, useEffect, useCallback, useMemo } from "react";
import type { ReceiptOcrResult } from "@/types/ocr.ts";

export type OrderStatus = "REVIEW" | "PAYMENT_CONFIRMED" | "START_PACKING" | "READY" | "AWAITING_RIDER" | "DISPATCHED" | "DELIVERED" | "PAYMENT_FAILED" | "HOLD_ORDER" | "REQUEST_RESUBMIT" | "PAYMENT_CLEARED" | "FINAL_FOLLOW_UP" | "REJECTED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED" | "CLEARED";
export type DeliveryPaymentOption = "PAY_AT_CHECKOUT" | "PAY_UPON_FULFILLMENT";
export interface OrderItem { productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number; }
export interface CustomerOrder { _id: string; orderNumber: string; _creationTime: number; telegramUserId?: string; telegramDisplayName?: string; telegramUsername?: string; primeMemberId?: string; items: OrderItem[]; total: number; subtotal: number; discount: number; deliveryFee: number; charges?: number; tax?: number; deliveryDueNow?: number; fulfillmentTotal?: number; receiverName: string; contactNumber: string; deliveryAddress: string; courierName: string; deliveryProviderId?: string; deliveryCharge?: number; deliveryPaymentMethod: string | DeliveryPaymentOption; paymentMethodName: string; paymentStatus: PaymentStatus; orderStatus: OrderStatus; queuePosition: number; estimatedWaitingMinutes: number; estimatedDispatchTime: string; adminNotes?: string; receiptUrl?: string; receiptOcrData?: ReceiptOcrResult; deliveryPaymentOption?: DeliveryPaymentOption; distanceKm?: number; stateHistory?: Array<{ status: string; at: number }>; stateTimestamps?: Record<string, number>; receiptRevision?: number; validatedReceiptRevision?: number; newReceiptAvailable?: boolean; awaitingReceiptResubmission?: boolean; }

function fromApi(data: any): CustomerOrder {
  const createdAt = Number(data.createdAt || Date.now());
  return { ...data, _id: String(data.id || data._id), _creationTime: Number.isFinite(createdAt) ? createdAt : Date.now() } as CustomerOrder;
}

async function fetchOrders(telegramUserId?: string, forceSync = false) {
  const params = new URLSearchParams();
  if (telegramUserId) params.set("userId", telegramUserId);
  if (forceSync) { params.set("sync", "true"); params.set("_t", Date.now().toString()); }
  const qs = params.toString();
  const response = await fetch(qs ? `/api/orders?${qs}` : "/api/orders", { credentials: "same-origin", cache: "no-store", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) return { orders: [], syncedAt: Date.now() };
  if (!response.ok) throw new Error(data.error || "Unable to load orders");
  return { orders: Array.isArray(data.orders) ? data.orders.map(fromApi) : [], syncedAt: data.syncedAt || Date.now() };
}

function withSavedCheckoutCodes(orderData: Record<string, any>) {
  const next = { ...orderData };
  try {
    const saved = JSON.parse(sessionStorage.getItem("prime_checkout_codes_v2") || "{}");
    if (!next.promoCode && typeof saved?.coupon === "string" && saved.coupon.trim()) next.promoCode = saved.coupon.trim().toUpperCase();
    if (!next.referralCode && typeof saved?.referral === "string" && saved.referral.trim()) next.referralCode = saved.referral.trim().toUpperCase();
  } catch {}
  return next;
}

export function useOrders(telegramUserId?: string) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isManualSync = false) => {
    if (isManualSync) setIsSyncing(true);
    try {
      const res = await fetchOrders(telegramUserId, isManualSync);
      setOrders(res.orders); setLastSyncedAt(res.syncedAt || Date.now()); setError(null); return res.orders;
    } catch (e: any) { console.warn("Order API load notice:", e?.message || e); setError(null); return []; }
    finally { setLoading(false); setIsSyncing(false); }
  }, [telegramUserId]);

  const syncOrders = useCallback(async () => load(true), [load]);

  useEffect(() => {
    void load(false);
    const POLL_MS = 30000; let timer: number | null = null;
    const schedule = () => { if (timer !== null) window.clearTimeout(timer); if (document.visibilityState !== "visible") return; timer = window.setTimeout(async () => { await load(false); schedule(); }, POLL_MS); };
    const handleVisibility = () => { if (document.visibilityState === "visible") void load(false); schedule(); };
    document.addEventListener("visibilitychange", handleVisibility); schedule();
    return () => { if (timer !== null) window.clearTimeout(timer); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [load]);

  const createOrder = useCallback(async (orderData: Record<string, any>) => {
    const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch("/api/orders", { method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal, headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" }, body: JSON.stringify(withSavedCheckoutCodes(orderData)) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create order");
      if (!data.order) throw new Error("Server created no order record");
      const created = fromApi(data.order); try { window.dispatchEvent(new CustomEvent("prime:order-success", { detail: { order: created } })); } catch {} return created;
    } catch (error: any) { if (error?.name === "AbortError") throw new Error("Order submission timed out. Please check your Orders tab before trying again."); throw error; }
    finally { window.clearTimeout(timeout); }
  }, []);

  const transitionOrder = useCallback(async (id: string, status: OrderStatus, adminNotes?: string) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}/workflow`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ...(adminNotes !== undefined ? { adminNotes } : {}) }) });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Unable to transition order"); await load(); return fromApi(data.order);
  }, [load]);
  const updateOrderStatus = useCallback((id: string, status: OrderStatus, notes?: string) => transitionOrder(id, status, notes), [transitionOrder]);

  const updateOrderOcr = useCallback(async (id: string, ocrData: ReceiptOcrResult, receiptUrl?: string) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiptOcrData: ocrData, ...(receiptUrl ? { receiptUrl } : {}) }) });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Unable to save OCR result"); await load(); return fromApi(data.order);
  }, [load]);

  const updateOrderPaymentStatus = useCallback(async (_id: string, _paymentStatus: PaymentStatus, orderStatus?: OrderStatus) => {
    if (!orderStatus) throw new Error("A workflow status is required for payment changes"); return transitionOrder(_id, orderStatus);
  }, [transitionOrder]);

  const editOrder = useCallback(async (id: string, details: Record<string, any>) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}/details`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Unable to edit order"); await load(); return fromApi(data.order);
  }, [load]);

  const uploadReplacementReceipt = useCallback(async (id: string, receiptUrl: string) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}/receipt`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiptUrl }) });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Unable to upload replacement receipt"); await load(); return fromApi(data.order);
  }, [load]);

  const revalidateReceipt = useCallback(async (id: string) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}/revalidate`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" } });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Unable to revalidate receipt"); await load(); return fromApi(data.order);
  }, [load]);

  const deleteOrder = useCallback(async (id: string) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
    const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Unable to delete order"); await load();
  }, [load]);

  const activeOrders = useMemo(() => orders.filter((order) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(order.orderStatus)), [orders]);
  const latestOrder = useMemo(() => activeOrders[0] || orders[0] || null, [activeOrders, orders]);
  const customerFilteredOrders = telegramUserId ? orders.filter((o) => o.telegramUserId === telegramUserId) : orders;
  return useMemo(() => ({ orders: customerFilteredOrders, allOrders: orders, activeOrders, latestOrder, loading, error, isSyncing, lastSyncedAt, syncOrders, refresh: load, createOrder, updateOrderStatus, updateOrderOcr, updateOrderPaymentStatus, editOrder, uploadReplacementReceipt, revalidateReceipt, deleteOrder }), [customerFilteredOrders, orders, activeOrders, latestOrder, loading, error, isSyncing, lastSyncedAt, syncOrders, load, createOrder, updateOrderStatus, updateOrderOcr, updateOrderPaymentStatus, editOrder, uploadReplacementReceipt, revalidateReceipt, deleteOrder]);
}
