import crypto from "node:crypto";
import type { Application, Request } from "express";
import { firestoreService } from "./firestoreService.js";

const ADMIN_COOKIE = "prime_admin_session";
const TG_COOKIE = "prime_telegram_session";

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function signedSessionValid(token: string | null, prefix: string, secret: string) {
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const parts = payload.split(":");
    const expires = Number(parts[parts.length - 1]);
    if (!payload.startsWith(`${prefix}:`) || !Number.isFinite(expires) || expires < Date.now()) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function adminSession(req: Request) {
  return signedSessionValid(cookie(req, ADMIN_COOKIE), "admin", process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "");
}

function telegramUserId(req: Request) {
  const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
  const token = cookie(req, TG_COOKIE);
  if (!signedSessionValid(token, "telegram", secret)) return null;
  try {
    const [encoded] = String(token).split(".");
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^telegram:(\d+):(\d+)$/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function normalizeCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

async function resolveCode(code: string, kind: "coupon" | "referral", telegramId: string, subtotal: number) {
  if (!/^[A-Z0-9_-]{2,64}$/.test(code)) return null;
  let promo = await firestoreService.getDocument("promos", code);
  if (!promo && kind === "coupon") {
    const discounts = await firestoreService.getDocuments("discounts");
    promo = discounts.find((d: any) => normalizeCode(d.code) === code);
  }
  if (!promo && kind === "referral") {
    const referrals = await firestoreService.getDocuments("referrals");
    promo = referrals.find((r: any) => normalizeCode(r.code) === code);
    if (!promo) {
      const customers = await firestoreService.getDocuments("customers");
      const referrer = customers.find((c: any) => normalizeCode(c.primeMemberId) === code || String(c.telegramUserId || "") === code);
      if (referrer) promo = { code, type: "fixed", value: 50, active: true, referrerId: referrer.telegramUserId, freeDelivery: false };
    }
  }
  if (!promo || promo.active === false) return null;
  const eligible = Array.isArray(promo.eligibleTelegramUserIds) ? promo.eligibleTelegramUserIds.map(String) : [];
  if (eligible.length && !eligible.includes(telegramId)) return null;
  const minSubtotal = Number(promo.minSubtotal || 0);
  if (!Number.isFinite(minSubtotal) || subtotal < minSubtotal) return null;
  const value = Number(promo.value || 0);
  const discount = promo.type === "percent" ? Math.round(subtotal * Math.max(0, value) / 100 * 100) / 100 : Math.round(Math.min(subtotal, Math.max(0, value)) * 100) / 100;
  return {
    code,
    discount,
    freeDelivery: promo.freeDelivery === true || promo.type === "free_delivery",
  };
}

function cleanCourierConfig(body: any) {
  const deliveryType = String(body?.deliveryType || body?.tier || "STANDARD").toUpperCase();
  if (!["STANDARD", "PRIORITY", "EXPRESS"].includes(deliveryType)) throw new Error("Invalid delivery type");
  const priorityFee = Number(body?.priorityFee ?? 0);
  const expressFee = Number(body?.expressFee ?? 0);
  if (!Number.isFinite(priorityFee) || priorityFee < 0 || !Number.isFinite(expressFee) || expressFee < 0) throw new Error("Invalid delivery tier fee");
  return {
    deliveryType,
    tier: deliveryType,
    priorityFee: Math.round(priorityFee * 100) / 100,
    expressFee: Math.round(expressFee * 100) / 100,
    updatedAt: Date.now(),
  };
}

export function installCommerceRepairRoutes(app: Application) {
  app.post("/api/checkout/validate-code", async (req, res) => {
    try {
      const telegramId = telegramUserId(req) || String(req.body?.telegramUserId || "").trim();
      if (!telegramId) return res.status(401).json({ valid: false, error: "Customer authentication required" });
      const code = normalizeCode(req.body?.code);
      const kind = req.body?.kind === "referral" ? "referral" : "coupon";
      const subtotal = Number(req.body?.subtotal || 0);
      if (!code) return res.json({ valid: false });
      const result = await resolveCode(code, kind, telegramId, Number.isFinite(subtotal) ? subtotal : 0);
      return res.json(result ? { valid: true, ...result } : { valid: false });
    } catch (error: any) {
      console.error("Validate checkout code error:", error);
      return res.status(500).json({ valid: false, error: "Unable to validate code" });
    }
  });

  app.get("/api/admin/courier-config", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const configs = await firestoreService.getDocuments("courierConfigs");
    return res.json({ configs });
  });

  app.patch("/api/admin/courier-config/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      const id = String(req.params.id || "").trim();
      if (!id || id.length > 150) return res.status(400).json({ error: "Invalid courier id" });
      const config = cleanCourierConfig(req.body);
      const saved = await firestoreService.setDocument("courierConfigs", id, config, true);
      return res.json(saved);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to save courier delivery configuration" });
    }
  });
}
