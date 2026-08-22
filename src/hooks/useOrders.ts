import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase.ts";
import type { ReceiptOcrResult } from "@/types/ocr.ts";

export type OrderStatus = "REVIEW" | "PAYMENT_CONFIRMED" | "START_PACKING" | "READY" | "AWAITING_RIDER" | "DISPATCHED" | "DELIVERED" | "PAYMENT_FAILED" | "HOLD_ORDER" | "REQUEST_RESUBMIT" | "PAYMENT_CLEARED" | "FINAL_FOLLOW_UP" | "REJECTED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED" | "CLEARED";
export type DeliveryPaymentOption = "PAY_AT_CHECKOUT" | "PAY_UPON_FULFILLMENT";
export interface OrderItem { productId: string; productName: string; quantity: number; unitPrice: number; subtotal: number; }
export interface CustomerOrder { _id: string; orderNumber: string; _creationTime: number; telegramUserId?: string; telegramDisplayName?: string; telegramUsername?: string; items: OrderItem[]; total: number; subtotal: number; discount: number; deliveryFee: number; charges?: number; receiverName: string; contactNumber: string; deliveryAddress: string; courierName: string; deliveryProviderId?: string; deliveryCharge?: number; deliveryPaymentMethod?: DeliveryPaymentOption; paymentMethodName: string; paymentStatus: PaymentStatus; orderStatus: OrderStatus; queuePosition: number; estimatedWaitingMinutes: number; estimatedDispatchTime: string; adminNotes?: string; receiptUrl?: string; receiptOcrData?: ReceiptOcrResult; deliveryPaymentOption?: DeliveryPaymentOption; }
function fromFirestore(id: string, data: any): CustomerOrder { const createdAt = data.createdAt; return { ...data, _id: id, _creationTime: createdAt instanceof Timestamp ? createdAt.toMillis() : Number(createdAt || Date.now()) }; }

export function useOrders(telegramUserId?: string) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { setLoading(true); const q = query(collection(db, "orders"), orderBy("createdAt", "desc")); return onSnapshot(q, s => { setOrders(s.docs.map(d => fromFirestore(d.id, d.data()))); setLoading(false); }, e => { console.error(e); setError("Unable to load orders. Please refresh and try again."); setLoading(false); }); }, []);
  const createOrder = useCallback(async (orderData: Omit<CustomerOrder, "_id" | "_creationTime">) => { const response = await fetch("/api/orders", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orderData) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Unable to create order"); return data.order as CustomerOrder; }, []);
  const mutate = useCallback(async (id: string, patch: Record<string, any>) => { const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Unable to update order"); }, []);
  const updateOrderStatus = useCallback((id: string, status: OrderStatus, notes?: string) => mutate(id, { orderStatus: status, ...(notes !== undefined ? { adminNotes: notes } : {}) }), [mutate]);
  const updateOrderOcr = useCallback((id: string, ocrData: ReceiptOcrResult, receiptUrl?: string) => mutate(id, { receiptOcrData: ocrData, ...(receiptUrl ? { receiptUrl } : {}) }), [mutate]);
  const updateOrderPaymentStatus = useCallback((id: string, paymentStatus: PaymentStatus, orderStatus?: OrderStatus) => mutate(id, { paymentStatus, ...(orderStatus ? { orderStatus } : {}) }), [mutate]);
  const deleteOrder = useCallback(async (id: string) => { const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" }); if (!response.ok) throw new Error("Unable to delete order"); }, []);
  const customerFilteredOrders = telegramUserId ? orders.filter(o => o.telegramUserId === telegramUserId) : orders;
  return { orders: customerFilteredOrders, allOrders: orders, loading, error, createOrder, updateOrderStatus, updateOrderOcr, updateOrderPaymentStatus, deleteOrder };
}
