import { firestoreService } from "./firestoreService.js";

export const ACTIVE_ORDER_STATUSES = [
  "REVIEW",
  "PAYMENT_CONFIRMED",
  "START_PACKING",
  "READY",
  "AWAITING_RIDER",
] as const;

export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];

const DEFAULT_STAGE_MINUTES = {
  REVIEW: 5,
  PAYMENT_CONFIRMED: 6,
  START_PACKING: 10,
  READY: 6,
  AWAITING_RIDER: 8,
};

function isActiveStatus(status: string): status is ActiveOrderStatus {
  return (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);
}

function median(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (!clean.length) return null;
  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 === 0 ? (clean[middle - 1] + clean[middle]) / 2 : clean[middle];
}

function getHistory(order: any) {
  return Array.isArray(order?.stateHistory) ? order.stateHistory : [];
}

function timestampFor(order: any, status: string) {
  const history = getHistory(order);
  const match = [...history].reverse().find((entry: any) => entry?.status === status && Number.isFinite(Number(entry?.at)));
  return match ? Number(match.at) : null;
}

function stageDuration(order: any, from: string, to: string) {
  const start = timestampFor(order, from);
  const end = timestampFor(order, to);
  if (!start || !end || end < start) return null;
  return (end - start) / 60000;
}

function learnedStageMinutes(orders: any[], from: string, to: string, fallback: number) {
  const learned = orders
    .map((order) => stageDuration(order, from, to))
    .filter((value): value is number => value !== null && value >= 0 && value <= 240)
    .slice(-100);
  return Math.max(1, Math.round((median(learned) ?? fallback) * 10) / 10);
}

function totalHistoricalDispatchMinutes(orders: any[]) {
  const durations = orders
    .map((order) => {
      const start = timestampFor(order, "REVIEW");
      const end = timestampFor(order, "DISPATCHED");
      if (!start || !end || end < start) return null;
      return (end - start) / 60000;
    })
    .filter((value): value is number => value !== null && value >= 0 && value <= 720)
    .slice(-100);
  return median(durations);
}

export async function getQueueSnapshot(telegramUserId?: string | null) {
  const orders = await firestoreService.getDocuments("orders");
  const activeOrders = orders
    .filter((order: any) => isActiveStatus(String(order?.orderStatus || "")))
    .sort((a: any, b: any) => Number(a?.createdAt || 0) - Number(b?.createdAt || 0));

  const customerOrders = telegramUserId
    ? activeOrders.filter((order: any) => String(order?.telegramUserId || "") === String(telegramUserId))
    : [];

  const customerOrder = customerOrders[0] || null;
  let yourPosition: string | number = "--";
  if (customerOrder) {
    const status = String(customerOrder.orderStatus || "");
    if (status === "REVIEW") {
      const reviewOrders = activeOrders.filter((order: any) => String(order?.orderStatus || "") === "REVIEW");
      const index = reviewOrders.findIndex((order: any) => String(order?.id || order?.orderNumber) === String(customerOrder.id || customerOrder.orderNumber));
      yourPosition = index >= 0 ? index + 1 : "--";
    } else if (status === "START_PACKING") yourPosition = "PACKING";
    else if (status === "READY") yourPosition = "READY";
    else if (status === "AWAITING_RIDER") yourPosition = "AWAITING RIDER";
    else if (status === "DISPATCHED") yourPosition = "DISPATCHED";
  }

  const traffic = activeOrders.length <= 5 ? "LIGHT" : activeOrders.length <= 8 ? "MODERATE" : "HEAVY";

  const learningOrders = orders
    .filter((order: any) => Array.isArray(order?.stateHistory) && order.stateHistory.length > 1)
    .sort((a: any, b: any) => Number(a?.createdAt || 0) - Number(b?.createdAt || 0));

  const learnedDispatch = totalHistoricalDispatchMinutes(learningOrders);
  const stageReviewToPayment = learnedStageMinutes(learningOrders, "REVIEW", "PAYMENT_CONFIRMED", DEFAULT_STAGE_MINUTES.REVIEW);
  const stagePaymentToPacking = learnedStageMinutes(learningOrders, "PAYMENT_CONFIRMED", "START_PACKING", DEFAULT_STAGE_MINUTES.PAYMENT_CONFIRMED);
  const stagePackingToReady = learnedStageMinutes(learningOrders, "START_PACKING", "READY", DEFAULT_STAGE_MINUTES.START_PACKING);
  const stageReadyToRider = learnedStageMinutes(learningOrders, "READY", "AWAITING_RIDER", DEFAULT_STAGE_MINUTES.READY);
  const stageRiderToDispatch = learnedStageMinutes(learningOrders, "AWAITING_RIDER", "DISPATCHED", DEFAULT_STAGE_MINUTES.AWAITING_RIDER);

  const estimatedWaitTime = Math.max(
    1,
    Math.round(
      (learnedDispatch ?? (
        stageReviewToPayment +
        stagePaymentToPacking +
        stagePackingToReady +
        stageReadyToRider +
        stageRiderToDispatch
      )) + activeOrders.length * 1.5
    )
  );

  return {
    activeOrders: activeOrders.length,
    yourPosition,
    estimatedWaitTime,
    orderTraffic: traffic,
    activeOrder: customerOrder ? {
      id: String(customerOrder.id || ""),
      orderNumber: String(customerOrder.orderNumber || ""),
      status: String(customerOrder.orderStatus || ""),
      createdAt: Number(customerOrder.createdAt || 0),
    } : null,
    generatedAt: Date.now(),
  };
}

export function appendOrderStateHistory(order: any, nextStatus: string, at = Date.now()) {
  const history = getHistory(order);
  const last = history[history.length - 1];
  if (last?.status === nextStatus) return history;
  return [...history, { status: nextStatus, at }];
}
