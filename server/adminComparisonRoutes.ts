import crypto from "node:crypto";
import type { Application, Request } from "express";
import { firestoreService } from "./firestoreService.js";

function cookie(req: Request, name: string) {
  const header = req.headers.cookie || "";
  const found = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function adminSession(req: Request): boolean {
  const token = cookie(req, "prime_admin_session");
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^admin:(\d+)$/);
    if (!match || Number(match[1]) < Date.now()) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}

export function installAdminComparisonRoutes(app: Application) {
  app.patch("/api/admin/products/:id/comparison", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id || "");
    if (!/^[A-Za-z0-9_-]{1,150}$/.test(id)) return res.status(400).json({ error: "Invalid product id" });
    const body = req.body || {};
    const specifications = body.specifications && typeof body.specifications === "object" ? body.specifications : {};
    const cleanSpecs: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(specifications)) {
      if (!key.trim() || value === null || typeof value === "object") continue;
      if (typeof value === "string" && value.length > 500) continue;
      cleanSpecs[key.trim().slice(0, 80)] = typeof value === "number" || typeof value === "boolean" ? value : String(value);
    }
    const ratingAverage = Number(body.ratingAverage);
    const ratingCount = Number(body.ratingCount);
    if (!Number.isFinite(ratingAverage) || ratingAverage < 0 || ratingAverage > 5 || !Number.isInteger(ratingCount) || ratingCount < 0) return res.status(400).json({ error: "Invalid comparison rating configuration" });
    try {
      const updated = await firestoreService.updateDocument("products", id, { specifications: cleanSpecs, ratingAverage, ratingCount, comparisonUpdatedAt: Date.now() });
      return res.json({ success: true, product: updated });
    } catch (error) {
      console.error("Admin comparison metadata update error:", error);
      return res.status(500).json({ error: "Unable to update comparison metadata" });
    }
  });
}
