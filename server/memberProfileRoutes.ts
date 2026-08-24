import crypto from "node:crypto";
import type { Application } from "express";
import { firestoreService } from "./firestoreService.js";
import { isValidPrimeMemberId, isValidReferralCode } from "./primeIdentity.js";

const TG_COOKIE = "prime_telegram_session";

function cookie(req: any, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x: string) => x.trim()).find((x: string) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function telegramUserId(req: any): string | null {
  const token = cookie(req, TG_COOKIE);
  const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token || !secret) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^telegram:(\d+):(\d+)$/);
    if (!match || Number(match[2]) < Date.now()) return null;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return expected === signature ? match[1] : null;
  } catch {
    return null;
  }
}

function isPublicPrimeMemberId(value: string) {
  return isValidPrimeMemberId(value) && !/^PC[A-Z0-9]{8}$/.test(value);
}

export function installMemberProfileRoutes(app: Application) {
  app.post("/api/referrals/validate", async (req, res) => {
    const viewerId = telegramUserId(req);
    if (!viewerId) return res.status(401).json({ valid: false, error: "Telegram authentication required" });
    const code = String(req.body?.code || "").trim().toUpperCase();
    if (!isValidReferralCode(code) && !isValidPrimeMemberId(code)) {
      return res.status(400).json({ valid: false, error: "Enter a valid Referral Code or PRIME Member ID" });
    }

    try {
      const customers = await firestoreService.getDocuments("customers");
      const referrer = customers.find((entry: any) =>
        String(entry.referralCode || "").trim().toUpperCase() === code ||
        String(entry.primeMemberId || "").trim().toUpperCase() === code,
      );
      if (!referrer) return res.status(404).json({ valid: false, error: "Referral Code or PRIME Member ID was not found" });
      if (String(referrer.telegramUserId || referrer.id) === viewerId) {
        return res.status(400).json({ valid: false, error: "You cannot use your own Referral Code or PRIME Member ID" });
      }
      return res.json({ valid: true, kind: String(referrer.referralCode || "").trim().toUpperCase() === code ? "REFERRAL_CODE" : "PRIME_MEMBER_ID" });
    } catch (error) {
      console.error("Referral validation error:", error);
      return res.status(500).json({ valid: false, error: "Unable to validate referral" });
    }
  });

  app.get("/api/members/:primeMemberId", async (req, res) => {
    const viewerId = telegramUserId(req);
    if (!viewerId) return res.status(401).json({ error: "Telegram authentication required" });

    const primeMemberId = String(req.params.primeMemberId || "").trim().toUpperCase();
    if (!isPublicPrimeMemberId(primeMemberId)) return res.status(400).json({ error: "Invalid PRIME Member ID" });

    try {
      const customers = await firestoreService.getDocuments("customers");
      const customer = customers.find((entry: any) => String(entry.primeMemberId || "").trim().toUpperCase() === primeMemberId);
      if (!customer) return res.status(404).json({ error: "PRIME Member not found" });

      return res.json({
        member: {
          telegramDisplayName: String(customer.telegramDisplayName || "PRIME Member"),
          telegramUsername: customer.telegramUsername ? String(customer.telegramUsername) : null,
          primeMemberId,
          referralCount: Math.max(0, Number(customer.referrals || (Array.isArray(customer.referees) ? customer.referees.length : 0))),
        },
      });
    } catch (error) {
      console.error("Public member profile lookup error:", error);
      return res.status(500).json({ error: "Unable to load PRIME Member profile" });
    }
  });
}
