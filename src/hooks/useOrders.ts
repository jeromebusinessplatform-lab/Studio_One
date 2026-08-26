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
  if (!response.ok) throw new Error(`Failed to load orders (${response.status})`);
  const payload = await response.json();
  return Array.isArray(payload) ? payload.map(fromApi) : Array.isArray(payload.orders) ? payload.orders.map(fromApi) : [];
}

export function useOrders(telegramUserId?: string) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (forceSync = false) => {
    setLoading(true);
    try {
      const next = await fetchOrders(telegramUserId, forceSync);
      setOrders(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load orders");
    } finally {
      setLoading(false);
    }
  }, [telegramUserId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const activeOrders = useMemo(() => orders.filter((order) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(order.orderStatus)), [orders]);
  const latestOrder = useMemo(() => activeOrders[0] || orders[0] || null, [activeOrders, orders]);

  return { orders, activeOrders, latestOrder, loading, error, refresh };
}
