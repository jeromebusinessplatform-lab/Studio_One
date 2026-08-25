import crypto from "node:crypto";
import type { Application, Request } from "express";
import { firestoreService } from "./firestoreService.js";

const ADMIN_COOKIE = "prime_admin_session";

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function adminSession(req: Request) {
  const token = cookie(req, ADMIN_COOKIE);
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^admin:(\d+)$/);
    if (!match || Number(match[1]) < Date.now()) return false;
    return crypto.createHmac("sha256", secret).update(payload).digest("hex") === signature;
  } catch {
    return false;
  }
}

export function installOrderPatchGuardRoutes(app: Application) {
  app.patch("/api/orders/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    if ("orderStatus" in req.body || "paymentStatus" in req.body) {
      return res.status(409).json({ error: "Order status and payment status must use the workflow endpoint" });
    }

    const allowed = ["adminNotes", "receiptOcrData", "receiptUrl"];
    const data: any = { updatedAt: Date.now() };
    for (const key of allowed) if (key in req.body) data[key] = req.body[key];

    try {
      const updated = await firestoreService.updateDocument("orders", String(req.params.id), data);
      return res.json({ success: true, order: updated });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to update order details" });
    }
  });
}
