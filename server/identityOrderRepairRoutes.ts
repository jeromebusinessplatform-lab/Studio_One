import type { Application, Request, Response } from "express";
import { verifyTelegramInitData } from "./telegramAuth.js";
import { firestoreService } from "./firestoreService.js";
import { ensureUniquePrimeMemberId, isValidPrimeMemberId } from "./primeIdentity.js";
import crypto from "node:crypto";

const TG_COOKIE = "prime_telegram_session";
const TG_TTL_MS = 24 * 60 * 60 * 1000;
const ADMIN_COOKIE = "prime_admin_session";

function sign(payload: string, secret: string) { return crypto.createHmac("sha256", secret).update(payload).digest("hex"); }
function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}
function telegramUserId(req: Request): string | null {
  const token = cookie(req, TG_COOKIE);
  const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token || !secret) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^telegram:(\d+):(\d+)$/);
    if (!match || Number(match[2]) < Date.now()) return null;
    return sign(payload, secret) === signature ? match[1] : null;
  } catch { return null; }
}
function setTelegramSession(res: Response, userId: string) {
  const expires = Date.now() + TG_TTL_MS;
  const payload = `telegram:${userId}:${expires}`;
  const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
  const token = `${Buffer.from(payload).toString("base64url")}.${sign(payload, secret)}`;
  res.setHeader("Set-Cookie", `${TG_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}Max-Age=${Math.floor(TG_TTL_MS / 1000)}`);
}
function isAdmin(req: Request) {
  const token = cookie(req, ADMIN_COOKIE);
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^admin:(\d+)$/);
    return !!match && Number(match[1]) >= Date.now() && sign(payload, secret) === signature;
  } catch { return false; }
}
function asId(value: any) { return String(value ?? "").trim(); }
function manilaOrderNumber(timestamp: unknown) {
  const date = new Date(Number(timestamp));
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";
  return `${get("day")}${get("month")}${get("year")}${get("hour")}${get("minute")}${get("second")}`;
}

async function ensureMigrationNotification(telegramId: string, mid: string) {
  const notifications = await firestoreService.getDocuments("notifications");
  const exists = notifications.some((n: any) => String(n.telegramUserId) === telegramId && String(n.type) === "account" && String(n.migrationVersion || "") === "v3" && String(n.message || "").includes(mid));
  if (!exists) {
    await firestoreService.addDocument("notifications", {
      telegramUserId: telegramId,
      title: "Your PRIME™ Member ID Has Been Migrated",
      message: `Your PRIME™ Member ID has been migrated to ${mid}. This is your new 10-character PRIME™ Member ID for future transactions and support requests.`,
      type: "account",
      iconName: "ShieldAlert",
      color: "#2563eb",
      read: false,
      migrationVersion: "v3",
      createdAt: Date.now(),
    });
  }
}

async function hydrateCustomerOrders(telegramId: string, customer: any, rawOrders: any[]) {
  const currentMid = asId(customer?.primeMemberId).toUpperCase();
  const username = asId(customer?.telegramUsername).replace(/^@/, "").toLowerCase();
  const displayName = asId(customer?.telegramDisplayName).toLowerCase();
  const matches = rawOrders.filter((order: any) => {
    const ids = [order.telegramUserId, order.userId, order.customerId, order.customerTelegramUserId].map(asId).filter(Boolean);
    if (ids.includes(telegramId)) return true;
    const orderUsername = asId(order.telegramUsername).replace(/^@/, "").toLowerCase();
    const orderDisplayName = asId(order.telegramDisplayName).toLowerCase();
    if (username && orderUsername && username === orderUsername) return true;
    if (displayName && orderDisplayName && displayName === orderDisplayName) return true;
    const mids = [order.primeMemberId, order.customerPrimeMemberId, order.memberId].map((v) => asId(v).toUpperCase()).filter(Boolean);
    return !!currentMid && mids.includes(currentMid);
  });

  for (const order of matches) {
    const patch: any = {};
    if (asId(order.telegramUserId) !== telegramId) patch.telegramUserId = telegramId;
    if (currentMid && asId(order.primeMemberId).toUpperCase() !== currentMid) patch.primeMemberId = currentMid;
    const normalizedOrderNumber = /^\d{12}$/.test(asId(order.orderNumber)) ? asId(order.orderNumber) : manilaOrderNumber(order.createdAt || order._creationTime || Date.now());
    if (normalizedOrderNumber && asId(order.orderNumber) !== normalizedOrderNumber) patch.orderNumber = normalizedOrderNumber;
    if (Object.keys(patch).length) {
      try { await firestoreService.updateDocument("orders", String(order.id || order._id), patch); Object.assign(order, patch); } catch (error) { console.warn("Order hydration skipped:", error); }
    }
  }

  const orderCount = matches.length;
  const totalSpending = matches.reduce((sum, order) => sum + Number(order.total || 0), 0);
  if (Number(customer?.orderCount || 0) !== orderCount || Number(customer?.totalSpending || 0) !== Math.round(totalSpending * 100) / 100) {
    try { await firestoreService.updateDocument("customers", telegramId, { orderCount, totalSpending: Math.round(totalSpending * 100) / 100, updatedAt: Date.now() }); } catch (error) { console.warn("Customer order stats hydration skipped:", error); }
  }
  return matches;
}

export function installIdentityOrderRepairRoutes(app: Application) {
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const initData = typeof req.body?.initData === "string" ? req.body.initData : "";
      const result = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || "");
      const user = result.user;
      const id = String(user.id);
      const existing = await firestoreService.getDocument("customers", id);
      const now = Date.now();
      let primeMemberId = asId(existing?.primeMemberId).toUpperCase();
      let changed = false;
      if (!isValidPrimeMemberId(primeMemberId)) {
        primeMemberId = await ensureUniquePrimeMemberId("", id);
        changed = true;
      }
      const customer: any = {
        ...(existing || {}),
        id,
        telegramUserId: id,
        telegramDisplayName: [user.first_name, user.last_name].filter(Boolean).join(" ") || `TG User ${id}`,
        telegramUsername: user.username || null,
        primeMemberId,
        updatedAt: now,
      };
      if (!existing) Object.assign(customer, { vipTier: "Bronze", points: 0, pointsBalance: 0, memberSince: now, referrals: 0, totalSpending: 0, totalDiscounts: 0, orderCount: 0, avatarUrl: user.photo_url || null, createdAt: now });
      await firestoreService.setDocument("customers", id, customer, true);
      if (existing && changed) await ensureMigrationNotification(id, primeMemberId);
      setTelegramSession(res, id);
      return res.json({ authenticated: true, user, customer: { ...customer, primeMemberId } });
    } catch (error: any) {
      return res.status(401).json({ authenticated: false, error: error?.message || "Telegram authentication failed" });
    }
  });

  app.get("/api/customers", async (req, res, next) => {
    if (isAdmin(req)) return next();
    const tg = telegramUserId(req);
    if (!tg) return next();
    try {
      const customer = await firestoreService.getDocument("customers", tg);
      if (!customer) return res.json({ customers: [] });
      const rawOrders = await firestoreService.getDocuments("orders", true);
      const hydratedOrders = await hydrateCustomerOrders(tg, customer, rawOrders);
      const refreshed = await firestoreService.getDocument("customers", tg);
      return res.json({ customers: [{ ...(refreshed || customer), orderCount: hydratedOrders.length, totalSpending: hydratedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0) }] });
    } catch (error) {
      console.warn("Customer hydration route failed:", error);
      return next();
    }
  });

  app.get("/api/orders", async (req, res, next) => {
    if (isAdmin(req)) return next();
    const tg = telegramUserId(req);
    if (!tg) return next();
    try {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      const customer = await firestoreService.getDocument("customers", tg);
      if (!customer) return res.json({ orders: [], syncedAt: Date.now(), total: 0 });
      const rawOrders = await firestoreService.getDocuments("orders", true);
      const orders = await hydrateCustomerOrders(tg, customer, rawOrders);
      orders.sort((a, b) => Number(b.createdAt || b._creationTime || 0) - Number(a.createdAt || a._creationTime || 0));
      return res.json({ orders, syncedAt: Date.now(), total: orders.length, forcedSync: true });
    } catch (error) {
      console.warn("Order hydration route failed:", error);
      return next();
    }
  });

  app.post("/api/orders", (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = ((payload: any) => {
      const order = payload?.order;
      if (order) {
        const normalizedOrderNumber = /^\d{12}$/.test(asId(order.orderNumber)) ? asId(order.orderNumber) : manilaOrderNumber(order.createdAt || order._creationTime || Date.now());
        if (normalizedOrderNumber) order.orderNumber = normalizedOrderNumber;
      }
      void (async () => {
        try {
          const tg = telegramUserId(req) || asId(req.body?.telegramUserId);
          if (!tg || !order) return;
          const customer = await firestoreService.getDocument("customers", tg);
          if (!customer) return;
          const mid = isValidPrimeMemberId(customer.primeMemberId) ? String(customer.primeMemberId).toUpperCase() : await ensureUniquePrimeMemberId("", tg);
          const orderId = asId(order.id || order._id);
          if (orderId) await firestoreService.updateDocument("orders", orderId, { telegramUserId: tg, primeMemberId: mid, orderNumber: order.orderNumber });
          const rawOrders = await firestoreService.getDocuments("orders", true);
          const matches = rawOrders.filter((o: any) => asId(o.telegramUserId) === tg || asId(o.primeMemberId).toUpperCase() === mid);
          await firestoreService.updateDocument("customers", tg, { primeMemberId: mid, orderCount: matches.length, totalSpending: Math.round(matches.reduce((s, o) => s + Number(o.total || 0), 0) * 100) / 100, updatedAt: Date.now() });
        } catch (error) { console.warn("Post-order identity repair skipped:", error); }
      })();
      return originalJson(payload);
    }) as any;
    next();
  });
}
