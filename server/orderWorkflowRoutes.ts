import crypto from "node:crypto";
import type { Application, Request } from "express";
import { firestoreService } from "./firestoreService.js";
import { appendOrderStateHistory } from "./queueEngine.js";
import { sendTelegramMessage } from "./telegramSender.js";

const TG_COOKIE = "prime_telegram_session";
const ADMIN_COOKIE = "prime_admin_session";
const TG_SECRET = () => process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_SECRET = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}
function sign(payload: string, secret: string) { return crypto.createHmac("sha256", secret).update(payload).digest("hex"); }
function adminSession(req: Request) {
  const token = cookie(req, ADMIN_COOKIE), secret = ADMIN_SECRET();
  if (!token || !secret) return false;
  const [encoded, signature] = token.split("."); if (!encoded || !signature) return false;
  try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = payload.match(/^admin:(\d+)$/); return !!match && Number(match[1]) >= Date.now() && sign(payload, secret) === signature; } catch { return false; }
}
function telegramUserId(req: Request) {
  const token = cookie(req, TG_COOKIE), secret = TG_SECRET();
  if (!token || !secret) return null;
  const [encoded, signature] = token.split("."); if (!encoded || !signature) return null;
  try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = payload.match(/^telegram:(\d+):(\d+)$/); if (!match || Number(match[2]) < Date.now()) return null; return sign(payload, secret) === signature ? match[1] : null; } catch { return null; }
}

const TRANSITIONS: Record<string, readonly string[]> = {
  REVIEW: ["PAYMENT_CONFIRMED", "HOLD_ORDER", "CANCELLED"],
  PAYMENT_CONFIRMED: ["START_PACKING", "HOLD_ORDER", "CANCELLED"],
  START_PACKING: ["READY", "HOLD_ORDER", "CANCELLED"],
  READY: ["AWAITING_RIDER", "HOLD_ORDER", "CANCELLED"],
  AWAITING_RIDER: ["DISPATCHED", "HOLD_ORDER", "CANCELLED"],
  DISPATCHED: ["DELIVERED", "HOLD_ORDER"],
  HOLD_ORDER: ["REQUEST_RESUBMIT", "CANCELLED"],
  REQUEST_RESUBMIT: ["REVIEW", "CANCELLED"],
};

function transitionAllowed(current: string, next: string) { return TRANSITIONS[current]?.includes(next) ?? false; }
async function notifyMember(telegramId: string, title: string, message: string, color = "#111827") {
  await firestoreService.addDocument("notifications", { telegramUserId: telegramId, title, message, type: "order", iconName: "Package", color, read: false, createdAt: Date.now() });
  try { await sendTelegramMessage(telegramId, `${title}\n\n${message}`); } catch (error) { console.warn("Telegram order notification failed:", error); }
}

export function installOrderWorkflowRoutes(app: Application) {
  app.get("/api/orders/:id/workflow", async (req, res) => {
    const id = String(req.params.id || ""), isAdmin = adminSession(req), tg = telegramUserId(req);
    try {
      const order = await firestoreService.getDocument("orders", id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (!isAdmin && String(order.telegramUserId || "") !== String(tg || "")) return res.status(403).json({ error: "Access denied" });
      return res.json({ order, transitions: isAdmin ? (TRANSITIONS[String(order.orderStatus || "")] || []) : [] });
    } catch (error: any) { return res.status(500).json({ error: error?.message || "Unable to load order workflow" }); }
  });

  app.post("/api/orders/:id/workflow", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id || ""), nextStatus = String(req.body?.status || "").trim().toUpperCase();
    if (!id || !nextStatus) return res.status(400).json({ error: "Order and target status are required" });
    try {
      const order = await firestoreService.getDocument("orders", id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      const currentStatus = String(order.orderStatus || "REVIEW");
      if (!transitionAllowed(currentStatus, nextStatus)) return res.status(409).json({ error: `Invalid order transition: ${currentStatus} → ${nextStatus}` });
      const now = Date.now();
      const patch: any = { orderStatus: nextStatus, stateHistory: appendOrderStateHistory(order, nextStatus, now), stateTimestamps: { ...(order.stateTimestamps || {}), [nextStatus]: now }, updatedAt: now };
      if (nextStatus === "PAYMENT_CONFIRMED") patch.paymentStatus = "CONFIRMED";
      if (nextStatus === "REQUEST_RESUBMIT") { patch.paymentStatus = "FAILED"; patch.awaitingReceiptResubmission = true; patch.validatedReceiptRevision = Number(order.receiptRevision || 0); }
      if (nextStatus === "CANCELLED") patch.cancelledAt = now;
      if (nextStatus === "DISPATCHED") patch.dispatchedAt = now;
      if (nextStatus === "DELIVERED") patch.deliveredAt = now;
      if (nextStatus === "REVIEW") patch.awaitingReceiptResubmission = false;
      if (typeof req.body?.adminNotes === "string") patch.adminNotes = req.body.adminNotes.slice(0, 500);
      const updated = await firestoreService.updateDocument("orders", id, patch);
      const messages: Record<string, [string, string, string]> = {
        PAYMENT_CONFIRMED: ["Payment Confirmed", "Your payment has been confirmed and your order is moving to packing.", "#059669"],
        START_PACKING: ["Order Update", "Your order is now being packed.", "#2563eb"],
        READY: ["Order Ready", "Your order is ready for rider assignment.", "#0f766e"],
        AWAITING_RIDER: ["Rider Update", "Your order is awaiting rider assignment.", "#4f46e5"],
        DISPATCHED: ["Order Dispatched", "Your order has been dispatched.", "#7c3aed"],
        DELIVERED: ["Order Delivered", "Your order has been marked delivered.", "#059669"],
        REQUEST_RESUBMIT: ["Payment Receipt Required", `Please submit a new payment receipt for Order #${order.orderNumber || id}.`, "#ea580c"],
      };
      if (messages[nextStatus]) await notifyMember(String(order.telegramUserId || ""), `Order #${order.orderNumber || id}: ${messages[nextStatus][0]}`, messages[nextStatus][1], messages[nextStatus][2]);
      return res.json({ success: true, order: updated, nextStatus });
    } catch (error: any) { return res.status(400).json({ error: error?.message || "Unable to transition order" }); }
  });

  app.post("/api/orders/:id/receipt", async (req, res) => {
    const tg = telegramUserId(req); if (!tg) return res.status(401).json({ error: "Telegram authentication required" });
    const id = String(req.params.id || ""), receiptUrl = String(req.body?.receiptUrl || "");
    if (!receiptUrl.startsWith("data:image/")) return res.status(400).json({ error: "Receipt must be an image upload" });
    if (receiptUrl.length > 8_000_000) return res.status(413).json({ error: "Receipt image is too large" });
    try {
      const order = await firestoreService.getDocument("orders", id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (String(order.telegramUserId || "") !== tg) return res.status(403).json({ error: "Access denied" });
      if (String(order.orderStatus || "") !== "REQUEST_RESUBMIT") return res.status(409).json({ error: "Receipt resubmission is not currently requested" });
      const revision = Number(order.receiptRevision || 0) + 1;
      const updated = await firestoreService.updateDocument("orders", id, { receiptUrl, receiptOcrData: null, receiptRevision: revision, receiptSubmittedAt: Date.now(), newReceiptAvailable: true, updatedAt: Date.now() });
      await notifyMember(tg, `Order #${order.orderNumber || id}: Receipt Received`, "Your new payment receipt has been received. The team can now revalidate it.", "#2563eb");
      return res.json({ success: true, order: updated });
    } catch (error: any) { return res.status(400).json({ error: error?.message || "Unable to upload replacement receipt" }); }
  });

  app.post("/api/orders/:id/revalidate", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id || "");
    try {
      const order = await firestoreService.getDocument("orders", id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      const revision = Number(order.receiptRevision || 0), validated = Number(order.validatedReceiptRevision || 0);
      if (String(order.orderStatus || "") !== "REQUEST_RESUBMIT" || revision <= validated || !order.receiptUrl) return res.status(409).json({ error: "A new receipt upload is required before revalidation" });
      const now = Date.now();
      const updated = await firestoreService.updateDocument("orders", id, { orderStatus: "REVIEW", paymentStatus: "PENDING", awaitingReceiptResubmission: false, newReceiptAvailable: false, validatedReceiptRevision: revision, updatedAt: now, stateHistory: appendOrderStateHistory(order, "REVIEW", now), stateTimestamps: { ...(order.stateTimestamps || {}), REVIEW: now } });
      return res.json({ success: true, order: updated, nextStatus: "REVIEW" });
    } catch (error: any) { return res.status(400).json({ error: error?.message || "Unable to revalidate receipt" }); }
  });

  app.patch("/api/orders/:id/details", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id || "");
    const allowed = ["receiverName", "contactNumber", "deliveryAddress", "deliveryProviderId", "adminNotes"];
    const data: any = { updatedAt: Date.now() }; for (const key of allowed) if (key in req.body) data[key] = req.body[key];
    try { const updated = await firestoreService.updateDocument("orders", id, data); return res.json({ success: true, order: updated }); } catch (error: any) { return res.status(400).json({ error: error?.message || "Unable to edit order" }); }
  });
}
