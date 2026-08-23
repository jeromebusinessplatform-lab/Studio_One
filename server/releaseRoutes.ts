import crypto from "node:crypto";
import type { Application, Request, Response } from "express";
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { verifyTelegramInitData } from "./telegramAuth.js";
import { installCheckoutRoutes } from "./checkoutRoutes.js";

const TG_COOKIE = "prime_telegram_session";
const TG_TTL_MS = 24 * 60 * 60 * 1000;
const ADMIN_COOKIE = "prime_admin_session";
const ADMIN_TTL_MS = 12 * 60 * 60 * 1000;
const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-primecommerce-f59766ab-326b-40a2-bcc8-eae7f46dfe5f";

function db() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw?.trim()) initializeApp({ credential: cert(JSON.parse(raw)) });
    else initializeApp({ credential: applicationDefault() });
  }
  return getFirestore(FIRESTORE_DATABASE_ID);
}
function sign(payload: string, secret: string) { return crypto.createHmac("sha256", secret).update(payload).digest("hex"); }
function sessionCookie(userId: string) {
  const expires = Date.now() + TG_TTL_MS; const payload = `telegram:${userId}:${expires}`;
  return `${Buffer.from(payload).toString("base64url")}.${sign(payload, process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "")}`;
}
function cookie(req: Request, name: string) { const value = req.headers.cookie || ""; const found = value.split(";").map(x => x.trim()).find(x => x.startsWith(`${name}=`)); return found ? decodeURIComponent(found.slice(name.length + 1)) : null; }
function telegramUserId(req: Request): string | null {
  const token = cookie(req, TG_COOKIE); const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token || !secret) return null; const [encoded, signature] = token.split("."); if (!encoded || !signature) return null;
  try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = payload.match(/^telegram:(\d+):(\d+)$/); if (!match || Number(match[2]) < Date.now()) return null; return sign(payload, secret) === signature ? match[1] : null; } catch { return null; }
}
function adminSession(req: Request): boolean {
  const token = cookie(req, ADMIN_COOKIE); const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";
  if (!token || !secret) return false; const [encoded, signature] = token.split("."); if (!encoded || !signature) return false;
  try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = payload.match(/^admin:(\d+)$/); return !!match && Number(match[1]) >= Date.now() && sign(payload, secret) === signature; } catch { return false; }
}
function setCookie(res: Response, name: string, value: string, maxAge: number) { res.setHeader("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}Max-Age=${Math.floor(maxAge / 1000)}`); }
function plain(id: string, data: any) { const out: any = { id, ...data }; for (const [k, v] of Object.entries(out)) if (v instanceof Timestamp || (v && typeof (v as any).toMillis === "function")) out[k] = (v as any).toMillis(); return out; }

export function installReleaseRoutes(app: Application) {
  // Register hardened checkout routes before the legacy order handler so all new checkouts are server-authoritative.
  installCheckoutRoutes(app);

  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const initData = typeof req.body?.initData === "string" ? req.body.initData : "";
      const result = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || "");
      const user = result.user;
      const firestore = db();
      const customerRef = firestore.collection("customers").doc(String(user.id));
      const existing = await customerRef.get();
      const now = FieldValue.serverTimestamp();
      const customer: any = {
        id: String(user.id),
        telegramUserId: String(user.id),
        telegramDisplayName: [user.first_name, user.last_name].filter(Boolean).join(" ") || `TG User ${user.id}`,
        telegramUsername: user.username || null,
        primeMemberId: `PC${String(user.id).slice(0, 8).toUpperCase()}`,
        updatedAt: now
      };
      if (!existing.exists) Object.assign(customer, { vipTier: "Bronze", points: 0, memberSince: now, referrals: 0, totalSpending: 0, orderCount: 0, createdAt: now });
      await customerRef.set(customer, { merge: true });
      setCookie(res, TG_COOKIE, sessionCookie(String(user.id)), TG_TTL_MS);
      return res.json({ authenticated: true, user });
    }
    catch (e: any) { return res.status(401).json({ authenticated: false, error: e?.message || "Telegram authentication failed" }); }
  });
  app.get("/api/auth/telegram/session", (req, res) => { const id = telegramUserId(req); return res.json({ authenticated: !!id, telegramUserId: id }); });

  app.get("/api/orders", async (req, res) => {
    const isAdmin = adminSession(req); const tg = telegramUserId(req); if (!isAdmin && !tg) return res.status(401).json({ error: "Authentication required" });
    try { let query = db().collection("orders").orderBy("createdAt", "desc"); const snap = await query.get(); const orders = snap.docs.map(d => plain(d.id, d.data())).filter(o => isAdmin || String(o.telegramUserId) === tg); return res.json({ orders }); }
    catch { return res.status(500).json({ error: "Unable to load orders" }); }
  });

  app.post("/api/orders", async (req, res) => {
    const tg = telegramUserId(req); if (!tg) return res.status(401).json({ error: "Verified Telegram identity required" });
    const input = req.body || {}; const items = Array.isArray(input.items) ? input.items : []; if (!items.length) return res.status(400).json({ error: "Cannot place an order without items" });
    const firestore = db(); const orderRef = firestore.collection("orders").doc(); const customerRef = firestore.collection("customers").doc(tg);
    try {
      const result = await firestore.runTransaction(async tx => {
        const products = await Promise.all(items.map((item: any) => tx.get(firestore.collection("products").doc(String(item.productId)))));
        const normalized: any[] = []; let subtotal = 0;
        products.forEach((snap, i) => { const item = items[i]; if (!snap.exists) throw new Error(`Product ${item.productId} is no longer available.`); const p: any = snap.data(); const qty = Number(item.quantity); const stock = Number(p.stock || 0); if (!Number.isInteger(qty) || qty <= 0 || p.available === false || stock < qty) throw new Error(`${p.name || item.productId} does not have enough stock.`); const unitPrice = Number(p.bundleCalculatedPrice ?? p.salePrice ?? p.price ?? 0); if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Invalid price configuration for ${p.name || item.productId}.`); const line = Math.round(unitPrice * qty * 100) / 100; subtotal += line; normalized.push({ productId: String(item.productId), productName: p.name || item.productName, quantity: qty, unitPrice, subtotal: line }); tx.update(snap.ref, { stock: stock - qty, updatedAt: FieldValue.serverTimestamp() }); });
        subtotal = Math.round(subtotal * 100) / 100; const discount = Math.max(0, Math.min(Number(input.discount || 0) || 0, subtotal)); const deliveryFee = Math.max(0, Number(input.deliveryFee || 0) || 0); const chargesSnap = await firestore.collection("charges").get(); const base = subtotal - discount; const charges = Math.round(chargesSnap.docs.reduce((sum, d) => { const c: any = d.data(); if (c.active !== true) return sum; const amount = Number(c.amount || 0); return sum + (c.type === "percent" ? base * amount / 100 : amount); }, 0) * 100) / 100; const tax = Math.round((base + charges) * 0.05 * 100) / 100; const total = Math.round((base + charges + tax + deliveryFee) * 100) / 100; const now = FieldValue.serverTimestamp();
        const order = { ...input, telegramUserId: tg, items: normalized, subtotal, discount, charges, deliveryFee, total, paymentStatus: "PENDING", orderStatus: "REVIEW", createdAt: now, updatedAt: now };
        tx.set(orderRef, order); tx.set(customerRef, { id: tg, telegramUserId: tg, telegramDisplayName: String(input.telegramDisplayName || "Unknown"), telegramUsername: input.telegramUsername || null, primeMemberId: `PC${tg.slice(0, 8).toUpperCase()}`, vipTier: "Bronze", updatedAt: now }, { merge: true }); return { ...order, id: orderRef.id };
      }); return res.status(201).json({ order: result });
    } catch (e: any) { return res.status(400).json({ error: e?.message || "Unable to create order" }); }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const allowed = ["orderStatus", "paymentStatus", "adminNotes", "receiptOcrData", "receiptUrl"]; const data: any = {}; for (const key of allowed) if (key in req.body) data[key] = req.body[key]; data.updatedAt = FieldValue.serverTimestamp();
    try { await db().collection("orders").doc(req.params.id).update(data); return res.json({ success: true }); } catch { return res.status(500).json({ error: "Unable to update order" }); }
  });
  app.delete("/api/orders/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { await db().collection("orders").doc(req.params.id).delete(); return res.json({ success: true }); } catch { return res.status(500).json({ error: "Unable to delete order" }); }
  });

  app.get("/api/customers", async (req, res) => {
    const isAdmin = adminSession(req);
    const tg = telegramUserId(req);
    if (!isAdmin && !tg) return res.status(401).json({ error: "Authentication required" });
    try {
      const ref = db().collection("customers");
      if (isAdmin) {
        const snap = await ref.orderBy("updatedAt", "desc").get();
        return res.json({ customers: snap.docs.map(d => plain(d.id, d.data())) });
      }
      const snap = await ref.doc(tg).get();
      return res.json({ customers: snap.exists ? [plain(snap.id, snap.data())] : [] });
    } catch { return res.status(500).json({ error: "Unable to load customers" }); }
  });
}