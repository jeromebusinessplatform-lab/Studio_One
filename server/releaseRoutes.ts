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
const DEFAULT_COURIERS = [
  { id: "courier-1", name: "PRIME In-House Express", baseFare: 60, baseDistanceKm: 4, perKmCharge: 12, platformFeeEnabled: false, platformFee: 0, nightDifferentialEnabled: true, nightDifferentialFee: 30, surchargeEnabled: false, surchargeFee: 0, isAvailable: true, logoUrl: "/primelogo.png" },
  { id: "courier-2", name: "Lalamove 2-Wheel", baseFare: 70, baseDistanceKm: 3, perKmCharge: 15, platformFeeEnabled: true, platformFee: 10, nightDifferentialEnabled: true, nightDifferentialFee: 40, surchargeEnabled: true, surchargeFee: 20, isAvailable: true, logoUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=120&auto=format&fit=crop&q=80" },
  { id: "courier-3", name: "GrabExpress Flash", baseFare: 80, baseDistanceKm: 5, perKmCharge: 18, platformFeeEnabled: true, platformFee: 15, nightDifferentialEnabled: false, nightDifferentialFee: 0, surchargeEnabled: false, surchargeFee: 0, isAvailable: true, logoUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=120&auto=format&fit=crop&q=80" },
];

function db() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw?.trim()) initializeApp({ credential: cert(JSON.parse(raw)) });
    else initializeApp({ credential: applicationDefault() });
  }
  return getFirestore(FIRESTORE_DATABASE_ID);
}
function sign(payload: string, secret: string) { return crypto.createHmac("sha256", secret).update(payload).digest("hex"); }
function sessionCookie(userId: string) { const expires = Date.now() + TG_TTL_MS; const payload = `telegram:${userId}:${expires}`; return `${Buffer.from(payload).toString("base64url")}.${sign(payload, process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "")}`; }
function cookie(req: Request, name: string) { const value = req.headers.cookie || ""; const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return found ? decodeURIComponent(found.slice(name.length + 1)) : null; }
function telegramUserId(req: Request): string | null { const token = cookie(req, TG_COOKIE); const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || ""; if (!token || !secret) return null; const [encoded, signature] = token.split("."); if (!encoded || !signature) return null; try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = payload.match(/^telegram:(\d+):(\d+)$/); if (!match || Number(match[2]) < Date.now()) return null; return sign(payload, secret) === signature ? match[1] : null; } catch { return null; } }
function adminSession(req: Request): boolean { const token = cookie(req, ADMIN_COOKIE); const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || ""; if (!token || !secret) return false; const [encoded, signature] = token.split("."); if (!encoded || !signature) return false; try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = payload.match(/^admin:(\d+)$/); return !!match && Number(match[1]) >= Date.now() && sign(payload, secret) === signature; } catch { return false; } }
function setCookie(res: Response, name: string, value: string, maxAge: number) { res.setHeader("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}Max-Age=${Math.floor(maxAge / 1000)}`); }
function plain(id: string, data: any) { const out: any = { id, ...data }; for (const [k, v] of Object.entries(out)) if (v instanceof Timestamp || (v && typeof (v as any).toMillis === "function")) out[k] = (v as any).toMillis(); return out; }
function cleanCourier(body: any) { const name = String(body?.name || "").trim(); const baseFare = Number(body?.baseFare); const baseDistanceKm = Number(body?.baseDistanceKm); const perKmCharge = Number(body?.perKmCharge); if (!name || name.length > 120 || !Number.isFinite(baseFare) || baseFare < 0 || !Number.isFinite(baseDistanceKm) || baseDistanceKm < 0 || !Number.isFinite(perKmCharge) || perKmCharge < 0) throw new Error("Invalid courier pricing configuration"); return { name, baseFare, baseDistanceKm, perKmCharge, platformFeeEnabled: body?.platformFeeEnabled === true, platformFee: Math.max(0, Number(body?.platformFee || 0)), nightDifferentialEnabled: body?.nightDifferentialEnabled === true, nightDifferentialFee: Math.max(0, Number(body?.nightDifferentialFee || 0)), surchargeEnabled: body?.surchargeEnabled === true, surchargeFee: Math.max(0, Number(body?.surchargeFee || 0)), isAvailable: body?.isAvailable !== false, logoUrl: String(body?.logoUrl || "/primelogo.png").slice(0, 500), updatedAt: FieldValue.serverTimestamp() }; }

export function installReleaseRoutes(app: Application) {
  installCheckoutRoutes(app);

  app.post("/api/auth/telegram", async (req, res) => { try { const initData = typeof req.body?.initData === "string" ? req.body.initData : ""; const result = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || ""); const user = result.user; const firestore = db(); const customerRef = firestore.collection("customers").doc(String(user.id)); const existing = await customerRef.get(); const now = FieldValue.serverTimestamp(); const customer: any = { id: String(user.id), telegramUserId: String(user.id), telegramDisplayName: [user.first_name, user.last_name].filter(Boolean).join(" ") || `TG User ${user.id}`, telegramUsername: user.username || null, primeMemberId: `PC${String(user.id).slice(0, 8).toUpperCase()}`, updatedAt: now }; if (!existing.exists) Object.assign(customer, { vipTier: "Bronze", points: 0, memberSince: now, referrals: 0, totalSpending: 0, orderCount: 0, createdAt: now }); await customerRef.set(customer, { merge: true }); setCookie(res, TG_COOKIE, sessionCookie(String(user.id)), TG_TTL_MS); return res.json({ authenticated: true, user }); } catch (e: any) { return res.status(401).json({ authenticated: false, error: e?.message || "Telegram authentication failed" }); } });
  app.get("/api/auth/telegram/session", (req, res) => res.json({ authenticated: !!telegramUserId(req), telegramUserId: telegramUserId(req) }));

  app.get("/api/couriers", async (req, res) => {
    try {
      const snap = await db().collection("couriers").get();
      const couriers = snap.empty ? DEFAULT_COURIERS : snap.docs.map((d) => plain(d.id, d.data()));
      return res.json({ couriers });
    } catch {
      return res.json({ couriers: DEFAULT_COURIERS });
    }
  });
  app.post("/api/admin/couriers", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { const data = cleanCourier(req.body); const ref = await db().collection("couriers").add({ ...data, createdAt: FieldValue.serverTimestamp() }); return res.status(201).json({ id: ref.id, ...data }); } catch (e: any) { return res.status(400).json({ error: e?.message || "Unable to create courier" }); } });
  app.patch("/api/admin/couriers/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { const id = String(req.params.id); if (!id || id.length > 150) return res.status(400).json({ error: "Invalid courier id" }); const data = cleanCourier(req.body); await db().collection("couriers").doc(id).set(data, { merge: true }); return res.json({ id, ...data }); } catch (e: any) { return res.status(400).json({ error: e?.message || "Unable to update courier" }); } });
  app.delete("/api/admin/couriers/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { await db().collection("couriers").doc(String(req.params.id)).delete(); return res.json({ success: true }); } catch { return res.status(500).json({ error: "Unable to delete courier" }); } });

  app.get("/api/orders", async (req, res) => {
    const isAdmin = adminSession(req);
    const tg = telegramUserId(req) || (typeof req.query?.userId === "string" ? req.query.userId : null);
    if (!isAdmin && !tg) {
      return res.json({ orders: [] });
    }
    try {
      const snap = await db().collection("orders").orderBy("createdAt", "desc").get();
      const orders = snap.docs.map((d) => plain(d.id, d.data())).filter((o) => isAdmin || String(o.telegramUserId) === tg);
      return res.json({ orders });
    } catch (e: any) {
      console.error("Order load error:", e);
      return res.status(500).json({ error: "Unable to load orders" });
    }
  });
  app.patch("/api/orders/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); const allowed = ["orderStatus", "paymentStatus", "adminNotes", "receiptOcrData", "receiptUrl"]; const data: any = {}; for (const key of allowed) if (key in req.body) data[key] = req.body[key]; data.updatedAt = FieldValue.serverTimestamp(); try { await db().collection("orders").doc(req.params.id).update(data); return res.json({ success: true }); } catch { return res.status(500).json({ error: "Unable to update order" }); } });
  app.delete("/api/orders/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { await db().collection("orders").doc(req.params.id).delete(); return res.json({ success: true }); } catch { return res.status(500).json({ error: "Unable to delete order" }); } });
  app.get("/api/customers", async (req, res) => {
    const isAdmin = adminSession(req);
    const tg = telegramUserId(req) || (typeof req.query?.userId === "string" ? req.query.userId : null);
    if (!isAdmin && !tg) {
      return res.json({ customers: [] });
    }
    try {
      const ref = db().collection("customers");
      if (isAdmin) {
        const snap = await ref.orderBy("updatedAt", "desc").get();
        return res.json({ customers: snap.docs.map((d) => plain(d.id, d.data())) });
      }
      const snap = await ref.doc(tg).get();
      return res.json({ customers: snap.exists ? [plain(snap.id, snap.data())] : [] });
    } catch {
      return res.status(500).json({ error: "Unable to load customers" });
    }
  });
}
