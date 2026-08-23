import { useState, useEffect, useCallback } from "react";
import type { ReceiptOcrResult } from "@/types/ocr.ts";

export type OrderStatus = "REVIEW" | "PAYMENT_CONFIRMED" | "START_PACKING" | "READY" | "AWAITING_RIDER" | "DISPATCHED" | "DELIVERED" | "PAYMENT_FAILED" | "HOLD_ORDER" | "REQUEST_RESUBMIT" | "PAYMENT_CLEARED" | "FINAL_FOLLOW_UP" | "REJECTED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED" | "CLEARED";
export type DeliveryPaymentOption = "PAY_AT_CHECKOUT" | "PAY_UPON_FULFILLMENT";
export interface OrderItem { productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number; }
export interface CustomerOrder { _id: string; orderNumber: string; _creationTime: number; telegramUserId?: string; telegramDisplayName?: string; telegramUsername?: string; primeMemberId?: string; items: OrderItem[]; total: number; subtotal: number; discount: number; deliveryFee: number; charges?: number; tax?: number; deliveryDueNow?: number; fulfillmentTotal?: number; receiverName: string; contactNumber: string; deliveryAddress: string; courierName: string; deliveryProviderId?: string; deliveryCharge?: number; deliveryPaymentMethod?: DeliveryPaymentOption; paymentMethodName: string; paymentStatus: PaymentStatus; orderStatus: OrderStatus; queuePosition: number; estimatedWaitingMinutes: number; estimatedDispatchTime: string; adminNotes?: string; receiptUrl?: string; receiptOcrData?: ReceiptOcrResult; deliveryPaymentOption?: DeliveryPaymentOption; distanceKm?: number; }

function fromApi(data: any): CustomerOrder {
  const createdAt = Number(data.createdAt || Date.now());
  return { ...data, _id: String(data.id || data._id), _creationTime: Number.isFinite(createdAt) ? createdAt : Date.now() } as CustomerOrder;
}

async function fetchOrders(telegramUserId?: string, forceSync = false) {
  const params = new URLSearchParams();
  if (telegramUserId) params.set("userId", telegramUserId);
  if (forceSync) {
    params.set("sync", "true");
    params.set("_t", Date.now().toString());
  }
  const qs = params.toString();
  const url = qs ? `/api/orders?${qs}` : "/api/orders";
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) return { orders: [], syncedAt: Date.now() };
  if (!response.ok) throw new Error(data.error || "Unable to load orders");
  const list = Array.isArray(data.orders) ? data.orders.map(fromApi) : [];
  return { orders: list, syncedAt: data.syncedAt || Date.now() };
}

export function useOrders(telegramUserId?: string) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isManualSync = false) => {
    if (isManualSync) {
      setIsSyncing(true);
    }
    try {
      const res = await fetchOrders(telegramUserId, isManualSync);
      setOrders(res.orders);
      setLastSyncedAt(res.syncedAt || Date.now());
      setError(null);
      return res.orders;
    } catch (e: any) {
      console.warn("Order API load notice:", e?.message || e);
      setError(null);
      return [];
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [telegramUserId]);

  const syncOrders = useCallback(async () => {
    return await load(true);
  }, [load]);

  useEffect(() => {
    void load(false);
    const timer = window.setInterval(() => {
      void load(false);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const createOrder = useCallback(async (orderData: Record<string, any>) => {
    const response = await fetch("/api/orders", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderData) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to create order");
    if (!data.order) throw new Error("Server created no order record");
    return fromApi(data.order);
  }, []);

  const mutate = useCallback(async (id: string, patch: Record<string, any>) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to update order");
    await load();
  }, [load]);

  const updateOrderStatus = useCallback((id: string, status: OrderStatus, notes?: string) => mutate(id, { orderStatus: status, ...(notes !== undefined ? { adminNotes: notes } : {}) }), [mutate]);
  const updateOrderOcr = useCallback((id: string, ocrData: ReceiptOcrResult, receiptUrl?: string) => mutate(id, { receiptOcrData: ocrData, ...(receiptUrl ? { receiptUrl } : {}) }), [mutate]);
  const updateOrderPaymentStatus = useCallback((id: string, paymentStatus: PaymentStatus, orderStatus?: OrderStatus) => mutate(id, { paymentStatus, ...(orderStatus ? { orderStatus } : {}) }), [mutate]);
  const deleteOrder = useCallback(async (id: string) => {
    const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to delete order");
    await load();
  }, [load]);

  const customerFilteredOrders = telegramUserId ? orders.filter(o => o.telegramUserId === telegramUserId) : orders;
  return {
    orders: customerFilteredOrders,
    allOrders: orders,
    loading,
    isSyncing,
    lastSyncedAt,
    syncOrders,
    refresh: load,
    createOrder,
    updateOrderStatus,
    updateOrderOcr,
    updateOrderPaymentStatus,
    deleteOrder,
  };
}
