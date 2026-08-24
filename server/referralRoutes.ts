import type { Application, Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { firestoreService } from "./firestoreService.js";
import { validateReferral } from "./referralEngine.js";

const ADMIN_COOKIE = "prime_admin_session";

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = cookie(req, ADMIN_COOKIE);
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";
  if (!token || !secret) return res.status(401).json({ error: "Admin authentication required" });
  const [encoded, signature] = token.split(".");
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^admin:(\d+)$/);
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (!match || Number(match[1]) < Date.now() || signature !== expected) return res.status(401).json({ error: "Admin authentication required" });
  } catch {
    return res.status(401).json({ error: "Admin authentication required" });
  }
  return next();
}

function cleanCampaign(body: any) {
  const startAt = body?.startAt ? String(body.startAt) : null;
  const endAt = body?.endAt ? String(body.endAt) : null;
  return {
    id: "default",
    active: body?.active !== false,
    name: String(body?.name || "PRIME Referral Campaign").slice(0, 120),
    description: String(body?.description || "").slice(0, 500),
    maxUses: body?.maxUses == null || body.maxUses === "" ? null : Math.max(0, Number(body.maxUses)),
    minSpend: Math.max(0, Number(body?.minSpend || 0)),
    rewardAmount: Math.max(0, Number(body?.rewardAmount ?? 50)),
    startAt,
    endAt,
    daysOfWeek: Array.isArray(body?.daysOfWeek) ? body.daysOfWeek.map(Number).filter((n: number) => n >= 0 && n <= 6) : [],
    startTimeOfDay: body?.startTimeOfDay ? String(body.startTimeOfDay) : null,
    endTimeOfDay: body?.endTimeOfDay ? String(body.endTimeOfDay) : null,
    allowedRegions: Array.isArray(body?.allowedRegions) ? body.allowedRegions.map(String).map((v: string) => v.trim().toUpperCase()).filter(Boolean) : [],
    allowedChannels: Array.isArray(body?.allowedChannels) ? body.allowedChannels.map(String).map((v: string) => v.trim().toUpperCase()).filter(Boolean) : [],
    updatedAt: Date.now(),
  };
}

export function installReferralRoutes(app: Application) {
  app.post("/api/referrals/validate", async (req, res) => {
    try {
      const refereeId = String(req.body?.refereeId || req.body?.telegramUserId || "").trim();
      const result = await validateReferral({
        refereeId,
        referralCode: req.body?.referralCode,
        orderAmount: Number(req.body?.orderAmount || 0),
        region: req.body?.region,
        channel: req.body?.channel,
      });
      return res.status(result.valid ? 200 : 422).json(result);
    } catch (error: any) {
      return res.status(400).json({ valid: false, reason: error?.message || "Unable to validate referral" });
    }
  });

  app.get("/api/admin/referral-campaign", requireAdmin, async (_req, res) => {
    try {
      const campaign = await firestoreService.getDocument("referralCampaigns", "default");
      const referrals = await firestoreService.getDocuments("referrals");
      return res.json({ campaign: campaign || cleanCampaign({}), usageCount: referrals.filter((entry: any) => String(entry.campaignId || "default") === "default").length });
    } catch (error) {
      return res.status(500).json({ error: "Unable to load referral campaign" });
    }
  });

  app.put("/api/admin/referral-campaign", requireAdmin, async (req, res) => {
    try {
      const campaign = cleanCampaign(req.body);
      const saved = await firestoreService.setDocument("referralCampaigns", "default", campaign, true);
      return res.json(saved);
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to save referral campaign" });
    }
  });
}
