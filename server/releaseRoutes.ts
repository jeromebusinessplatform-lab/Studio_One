import crypto from "node:crypto";
import type { Application, Request, Response } from "express";
import { verifyTelegramInitData } from "./telegramAuth.js";
import { installCheckoutRoutes } from "./checkoutRoutes.js";
import { firestoreService } from "./firestoreService.js";

const TG_COOKIE = "prime_telegram_session";
const TG_TTL_MS = 24 * 60 * 60 * 1000;
const ADMIN_COOKIE = "prime_admin_session";

const DEFAULT_COURIERS = [
  { id: "courier-1", name: "PRIME In-House Express", baseFare: 60, baseDistanceKm: 4, perKmCharge: 12, platformFeeEnabled: false, platformFee: 0, nightDifferentialEnabled: true, nightDifferentialFee: 30, surchargeEnabled: false, surchargeFee: 0, isAvailable: true, logoUrl: "/primelogo.png" },
  { id: "courier-2", name: "Lalamove 2-Wheel", baseFare: 70, baseDistanceKm: 3, perKmCharge: 15, platformFeeEnabled: true, platformFee: 10, nightDifferentialEnabled: true, nightDifferentialFee: 40, surchargeEnabled: true, surchargeFee: 20, isAvailable: true, logoUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=120&auto=format&fit=crop&q=80" },
  { id: "courier-3", name: "GrabExpress Flash", baseFare: 80, baseDistanceKm: 5, perKmCharge: 18, platformFeeEnabled: true, platformFee: 15, nightDifferentialEnabled: false, nightDifferentialFee: 0, surchargeEnabled: false, surchargeFee: 0, isAvailable: true, logoUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=120&auto=format&fit=crop&q=80" },
];

function sign(payload: string, secret: string) { return crypto.createHmac("sha256", secret).update(payload).digest("hex"); }
function sessionCookie(userId: string) { const expires = Date.now() + TG_TTL_MS; const payload = `telegram:${userId}:${expires}`; return `${Buffer.from(payload).toString("base64url")}.${sign(payload, process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "")}`; }
function cookie(req: Request, name: string) { const value = req.headers.cookie || ""; const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return found ? decodeURIComponent(found.slice(name.length + 1)) : null; }
function telegramUserId(req: Request): string | null { const token = cookie(req, TG_COOKIE); const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || ""; if (!token || !secret) return null; const [encoded, signature] = token.split("."); if (!encoded || !signature) return null; try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = payload.match(/^telegram:(\d+):(\d+)$/); if (!match || Number(match[2]) < Date.now()) return null; return sign(payload, secret) === signature ? match[1] : null; } catch { return null; } }
function adminSession(req: Request): boolean { const token = cookie(req, ADMIN_COOKIE); const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || ""; if (!token || !secret) return false; const [encoded, signature] = token.split("."); if (!encoded || !signature) return false; try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = payload.match(/^admin:(\d+)$/); return !!match && Number(match[1]) >= Date.now() && sign(payload, secret) === signature; } catch { return false; } }
function setCookie(res: Response, name: string, value: string, maxAge: number) { res.setHeader("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}Max-Age=${Math.floor(maxAge / 1000)}`); }
function cleanCourier(body: any) { const name = String(body?.name || "").trim(); const baseFare = Number(body?.baseFare); const baseDistanceKm = Number(body?.baseDistanceKm); const perKmCharge = Number(body?.perKmCharge); if (!name || name.length > 120 || !Number.isFinite(baseFare) || baseFare < 0 || !Number.isFinite(baseDistanceKm) || baseDistanceKm < 0 || !Number.isFinite(perKmCharge) || perKmCharge < 0) throw new Error("Invalid courier pricing configuration"); return { name, baseFare, baseDistanceKm, perKmCharge, platformFeeEnabled: body?.platformFeeEnabled === true, platformFee: Math.max(0, Number(body?.platformFee || 0)), nightDifferentialEnabled: body?.nightDifferentialEnabled === true, nightDifferentialFee: Math.max(0, Number(body?.nightDifferentialFee || 0)), surchargeEnabled: body?.surchargeEnabled === true, surchargeFee: Math.max(0, Number(body?.surchargeFee || 0)), isAvailable: body?.isAvailable !== false, logoUrl: String(body?.logoUrl || "/primelogo.png").slice(0, 500), updatedAt: Date.now() }; }

export function installReleaseRoutes(app: Application) {
  installCheckoutRoutes(app);

  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const initData = typeof req.body?.initData === "string" ? req.body.initData : "";
      const result = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || "");
      const user = result.user;
      const existing = await firestoreService.getDocument("customers", String(user.id));
      const now = Date.now();
      const customer: any = {
        id: String(user.id),
        telegramUserId: String(user.id),
        telegramDisplayName: [user.first_name, user.last_name].filter(Boolean).join(" ") || `TG User ${user.id}`,
        telegramUsername: user.username || null,
        updatedAt: now
      };
      if (!existing) {
        Object.assign(customer, {
          vipTier: "Bronze",
          points: 0,
          pointsBalance: 0,
          memberSince: now,
          referrals: 0,
          totalSpending: 0,
          orderCount: 0,
          createdAt: now
        });
      }
      await firestoreService.setDocument("customers", String(user.id), customer, true);
      setCookie(res, TG_COOKIE, sessionCookie(String(user.id)), TG_TTL_MS);
      return res.json({ authenticated: true, user });
    } catch (e: any) {
      return res.status(401).json({ authenticated: false, error: e?.message || "Telegram authentication failed" });
    }
  });

  app.get("/api/auth/telegram/session", (req, res) => res.json({ authenticated: !!telegramUserId(req), telegramUserId: telegramUserId(req) }));

  app.get("/api/couriers", async (req, res) => {
    try {
      const couriers = await firestoreService.getDocuments("couriers");
      return res.json({ couriers: couriers.length > 0 ? couriers : DEFAULT_COURIERS });
    } catch {
      return res.json({ couriers: DEFAULT_COURIERS });
    }
  });

  app.post("/api/admin/couriers", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      const data = cleanCourier(req.body);
      const created = await firestoreService.addDocument("couriers", data);
      return res.status(201).json(created);
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || "Unable to create courier" });
    }
  });

  app.patch("/api/admin/couriers/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      const id = String(req.params.id);
      if (!id || id.length > 150) return res.status(400).json({ error: "Invalid courier id" });
      const data = cleanCourier(req.body);
      const updated = await firestoreService.setDocument("couriers", id, data, true);
      return res.json(updated);
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || "Unable to update courier" });
    }
  });

  app.delete("/api/admin/couriers/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      await firestoreService.deleteDocument("couriers", String(req.params.id));
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: "Unable to delete courier" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    const isAdmin = adminSession(req);
    const tg = telegramUserId(req) || (typeof req.query?.userId === "string" ? req.query.userId : null);
    if (!isAdmin && !tg) {
      return res.json({ orders: [], syncedAt: Date.now() });
    }
    const isForcedSync = req.query?.sync === "true" || req.query?._t !== undefined;
    try {
      const rawOrders = await firestoreService.getDocuments("orders", isForcedSync);
      const orders = rawOrders
        .filter((o) => isAdmin || String(o.telegramUserId) === tg)
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      return res.json({ orders, syncedAt: Date.now(), total: orders.length, forcedSync: isForcedSync });
    } catch (e: any) {
      console.error("Order load error:", e);
      return res.json({ orders: [], syncedAt: Date.now(), total: 0 });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const allowed = ["orderStatus", "paymentStatus", "adminNotes", "receiptOcrData", "receiptUrl"];
    const data: any = {};
    for (const key of allowed) if (key in req.body) data[key] = req.body[key];
    try {
      const updated = await firestoreService.updateDocument("orders", req.params.id, data);
      return res.json({ success: true, order: updated });
    } catch {
      return res.status(500).json({ error: "Unable to update order" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      await firestoreService.deleteDocument("orders", req.params.id);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ error: "Unable to delete order" });
    }
  });
  
  app.get("/api/customers", async (req, res) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    const isAdmin = adminSession(req);
    const tg = telegramUserId(req) || (typeof req.query?.userId === "string" ? req.query.userId : null);
    if (!isAdmin && !tg) {
      return res.json({ customers: [] });
    }
    try {
      if (isAdmin) {
        const rawCustomers = await firestoreService.getDocuments("customers");
        const customers = rawCustomers.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
        return res.json({ customers });
      }
      const single = await firestoreService.getDocument("customers", tg);
      return res.json({ customers: single ? [single] : [] });
    } catch {
      return res.status(500).json({ error: "Unable to load customers" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id);
    if (!id) return res.status(400).json({ error: "Customer ID required" });
    try {
      const allowed = ["vipTier", "points", "pointsBalance", "telegramDisplayName", "primeMemberId"];
      const data: any = {};
      for (const k of allowed) {
        if (k in req.body) data[k] = req.body[k];
      }
      if ("points" in data && !("pointsBalance" in data)) data.pointsBalance = data.points;
      if ("pointsBalance" in data && !("points" in data)) data.points = data.pointsBalance;
      const updated = await firestoreService.updateDocument("customers", id, data);
      return res.json({ success: true, id, ...updated });
    } catch (e: any) {
      console.error("Update customer error:", e);
      return res.status(500).json({ error: "Unable to update customer" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id);
    if (!id) return res.status(400).json({ error: "Customer ID required" });
    try {
      await firestoreService.deleteDocument("customers", id);
      return res.json({ success: true, id });
    } catch (e: any) {
      console.error("Delete customer error:", e);
      return res.status(500).json({ error: "Unable to delete customer" });
    }
  });

  app.post("/api/admin/customers/batch", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const { action, ids, vipTier, pointsDelta } = req.body || {};
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid batch action payload" });
    }
    try {
      if (action === "delete") {
        await firestoreService.batchDelete("customers", ids.map(String));
      } else if (action === "update_vip") {
        if (!vipTier) return res.status(400).json({ error: "Target VIP tier required" });
        await firestoreService.batchUpdate("customers", ids.map(String), { vipTier });
      } else if (action === "adjust_points") {
        const delta = Number(pointsDelta) || 0;
        for (const id of ids) {
          const cust = (await firestoreService.getDocument("customers", String(id))) || {};
          const nextPoints = Math.max(0, Number(cust.pointsBalance ?? cust.points ?? 0) + delta);
          await firestoreService.updateDocument("customers", String(id), {
            points: nextPoints,
            pointsBalance: nextPoints,
          });
        }
      } else {
        return res.status(400).json({ error: "Unknown batch action" });
      }

      return res.json({ success: true, count: ids.length, action });
    } catch (e: any) {
      console.error("Customer batch error:", e);
      return res.status(500).json({ error: e?.message || "Batch customer operation failed" });
    }
  });

  app.post("/api/admin/products/batch", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const { action, ids, category, inventoryDelta, active } = req.body || {};
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Invalid batch product action payload" });
    }
    try {
      if (action === "delete") {
        await firestoreService.batchDelete("products", ids.map(String));
      } else if (action === "update_inventory") {
        const delta = Number(inventoryDelta) || 0;
        for (const id of ids) {
          const product = (await firestoreService.getDocument("products", String(id))) || {};
          const inventory = Math.max(0, Number(product.inventory ?? 0) + delta);
          await firestoreService.updateDocument("products", String(id), { inventory });
        }
      } else if (action === "set_active") {
        await firestoreService.batchUpdate("products", ids.map(String), { active: active !== false });
      } else if (action === "set_category") {
        const nextCategory = String(category || "").trim();
        if (!nextCategory) return res.status(400).json({ error: "Category required" });
        await firestoreService.batchUpdate("products", ids.map(String), { category: nextCategory });
      } else {
        return res.status(400).json({ error: "Unknown batch product action" });
      }
      return res.json({ success: true, count: ids.length, action });
    } catch (e: any) {
      console.error("Product batch error:", e);
      return res.status(500).json({ error: e?.message || "Batch product operation failed" });
    }
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true, service: "studio-one" }));
}
