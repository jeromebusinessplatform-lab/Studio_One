import type { Application } from "express";
import { firestoreService } from "./firestoreService.js";

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
    const crypto = require("node:crypto") as typeof import("node:crypto");
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return expected === signature ? match[1] : null;
  } catch {
    return null;
  }
}

export function installMemberProfileRoutes(app: Application) {
  app.get("/api/members/:primeMemberId", async (req, res) => {
    const viewerId = telegramUserId(req);
    if (!viewerId) return res.status(401).json({ error: "Telegram authentication required" });

    const primeMemberId = String(req.params.primeMemberId || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(primeMemberId)) {
      return res.status(400).json({ error: "Invalid PRIME Member ID" });
    }

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
