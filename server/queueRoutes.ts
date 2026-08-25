import crypto from "node:crypto";
import type { Application, Request } from "express";
import { getQueueSnapshot } from "./queueEngine.js";

const TG_COOKIE = "prime_telegram_session";

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function telegramUserId(req: Request) {
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

export function installQueueRoutes(app: Application) {
  app.get("/api/queue/status", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    const tg = telegramUserId(req);
    try {
      const snapshot = await getQueueSnapshot(tg);
      return res.json({ queue: snapshot });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Unable to calculate live queue" });
    }
  });
}
