import crypto from "node:crypto";
import type { Application, Request } from "express";
import { firestoreService } from "./firestoreService.js";
import { appendOrderStateHistory } from "./queueEngine.js";

const TG_COOKIE = "prime_telegram_session";
const ADMIN_COOKIE = "prime_admin_session";
const TG_SECRET = () => process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
const ADMIN_SECRET = () => process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function adminSession(req: Request) {
  const token = cookie(req, ADMIN_COOKIE);
  const secret = ADMIN_SECRET();
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^admin:(\d+)$/);
    return !!match && Number(match[1]) >= Date.now() && sign(payload, secret) === signature;
  } catch {
    return false;
  }
}

function telegramUserId(req: Request) {
  const token = cookie(req, TG_COOKIE);
  const secret = TG_SECRET();
  if (!token || !secret) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^telegram:(\d+):(\d+)$/);
    if (!match || Number(match[2]) < Date.now()) return null;
    return sign(payload, secret) === signature ? match[1] : null;
  } catch {
    return null;
  }
}

const TRANSITIONS: Record<string, readonly string[]> = {
  REVIEW: ["PAYMENT_CONFIRMED", "HOLD_ORDER", "CANCELLED"],
  PAYMENT_CONFIRMED: ["START_PACKING", "HOLD_ORDER", "CANCELLED"],
  START_PACKING: ["READY", "HOLD_ORDER", "CANCELLED"],
  READY: ["AWAITING_RIDER", "HOLD_ORDER", "CANCELLED"],
  AWAITING_RIDER: ["DISPATCHED", "HOLD_ORDER", "CANCELLED"],
  DISPATCHED: ["DELIVERED", "HOLD_ORDER"],
  HOLD_ORDER: ["REVIEW", "REQUEST_RESUBMIT", "CANCELLED"],
  REQUEST_RESUBMIT: ["REVIEW", "CANCELLED"],
};

function transitionAllowed(current: string, next: string) {
  return TRANSITIONS[current]?.includes(next) ?? false;
}

export function installOrderWorkflowRoutes(app: Application) {
  app.get("/api/orders/:id/workflow", async (req, res) => {
    const id = String(req.params.id || "");
    const isAdmin = adminSession(req);
    const tg = telegramUserId(req);
    try {
      const order = await firestoreService.getDocument("orders", id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (!isAdmin && String(order.telegramUserId || "") !== String(tg || "")) return res.status(403).json({ error: "Access denied" });
      return res.json({
        order,
        transitions: isAdmin ? (TRANSITIONS[String(order.orderStatus || "")] || []) : [],
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Unable to load order workflow" });
    }
  });

  app.post("/api/orders/:id/workflow", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id || "");
    const nextStatus = String(req.body?.status || "").trim().toUpperCase();
    if (!id || !nextStatus) return res.status(400).json({ error: "Order and target status are required" });

    try {
      const order = await firestoreService.getDocument("orders", id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      const currentStatus = String(order.orderStatus || "REVIEW");
      if (!transitionAllowed(currentStatus, nextStatus)) {
        return res.status(409).json({ error: `Invalid order transition: ${currentStatus} → ${nextStatus}` });
      }

      const now = Date.now();
      const history = appendOrderStateHistory(order, nextStatus, now);
      const stageTimestamps: Record<string, number> = {
        ...(order.stateTimestamps || {}),
        [nextStatus]: now,
      };
      const patch: any = {
        orderStatus: nextStatus,
        stateHistory: history,
        stateTimestamps: stageTimestamps,
        updatedAt: now,
      };

      if (nextStatus === "PAYMENT_CONFIRMED") patch.paymentStatus = "CONFIRMED";
      if (nextStatus === "REQUEST_RESUBMIT") patch.paymentStatus = "FAILED";
      if (nextStatus === "CANCELLED") patch.cancelledAt = now;
      if (nextStatus === "DISPATCHED") patch.dispatchedAt = now;
      if (nextStatus === "DELIVERED") patch.deliveredAt = now;
      if (typeof req.body?.adminNotes === "string") patch.adminNotes = req.body.adminNotes.slice(0, 500);

      const updated = await firestoreService.updateDocument("orders", id, patch);

      if (nextStatus === "PAYMENT_CONFIRMED" || nextStatus === "START_PACKING" || nextStatus === "READY" || nextStatus === "AWAITING_RIDER" || nextStatus === "DISPATCHED" || nextStatus === "DELIVERED") {
        const labels: Record<string, string> = {
          PAYMENT_CONFIRMED: "Payment Confirmed",
          START_PACKING: "Order is being packed",
          READY: "Order is ready",
          AWAITING_RIDER: "Awaiting Rider",
          DISPATCHED: "Order Dispatched",
          DELIVERED: "Order Delivered",
        };
        await firestoreService.addDocument("notifications", {
          telegramUserId: String(order.telegramUserId || ""),
          title: `Order #${order.orderNumber || id} Update`,
          message: labels[nextStatus] || nextStatus,
          type: "order",
          iconName: "Package",
          color: "#111827",
          read: false,
          createdAt: now,
        });
      }

      return res.json({ success: true, order: updated, nextStatus });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to transition order" });
    }
  });

  app.patch("/api/orders/:id/details", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id || "");
    const allowed = ["receiverName", "contactNumber", "deliveryAddress", "deliveryProviderId", "adminNotes"];
    const data: any = { updatedAt: Date.now() };
    for (const key of allowed) if (key in req.body) data[key] = req.body[key];
    try {
      const updated = await firestoreService.updateDocument("orders", id, data);
      return res.json({ success: true, order: updated });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to edit order" });
    }
  });
}
