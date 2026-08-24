import type { NextFunction, Request, Response } from "express";
import { validateReferral } from "./referralEngine.js";

const TG_COOKIE = "prime_telegram_session";

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function signedTelegramUserId(req: Request): string | null {
  const token = cookie(req, TG_COOKIE);
  const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token || !secret) return null;
  const [encoded, signature] = token.split(".");
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^telegram:(\d+):(\d+)$/);
    if (!match || Number(match[2]) < Date.now()) return null;
    const crypto = require("node:crypto");
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return expected === signature ? match[1] : null;
  } catch {
    return null;
  }
}

export function installReferralGuard(app: any) {
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if ((req.path !== "/api/checkout/quote" && req.path !== "/api/orders") || req.method !== "POST") return next();
    const raw = String(req.body?.referralCode || req.body?.referrerCode || "").trim();
    if (!raw) return next();

    const refereeId = signedTelegramUserId(req) || String(req.body?.telegramUserId || "").trim();
    try {
      const result = await validateReferral({
        refereeId,
        referralCode: raw,
        orderAmount: Number(req.body?.orderAmount ?? req.body?.total ?? 0),
        region: req.body?.region || req.body?.deliveryRegion || null,
        channel: req.body?.channel || req.body?.attributionSource || "TELEGRAM_APP",
      });
      if (!result.valid) return res.status(422).json({ error: result.reason || "Referral code is not valid for this order.", referralValidation: result });
      req.body.referralValidation = result;
      return next();
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to validate referral code" });
    }
  });
}
