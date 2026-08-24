import crypto from "node:crypto";
import type { Application, Request, Response } from "express";
import { firestoreService } from "./firestoreService.js";
import { generateCouponCode, listCoupons, validateCouponDefinition } from "./couponEngine.js";

const ADMIN_COOKIE = "prime_admin_session";

function adminSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";
}

function getCookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function isAdmin(req: Request) {
  const token = getCookie(req, ADMIN_COOKIE);
  if (!token || !adminSecret()) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^admin:(\d+)$/);
    if (!match || Number(match[1]) < Date.now()) return false;
    const expected = crypto.createHmac("sha256", adminSecret()).update(payload).digest("hex");
    return signature === expected;
  } catch {
    return false;
  }
}

function requireAdmin(req: Request, res: Response): boolean {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Admin authentication required" });
    return false;
  }
  return true;
}

export function installCouponAdminRoutes(app: Application) {
  app.get("/api/admin/coupons", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const coupons = await listCoupons();
      const redemptions = await firestoreService.getDocuments("couponRedemptions");
      const enriched = coupons.map((coupon) => ({
        ...coupon,
        usageCount: redemptions.filter((entry: any) => String(entry.code).toUpperCase() === coupon.code).length,
      }));
      return res.json({ coupons: enriched });
    } catch (error: any) {
      console.error("Coupon list error:", error);
      return res.status(500).json({ error: "Unable to load coupons" });
    }
  });

  app.post("/api/admin/coupons", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const data = validateCouponDefinition(req.body);
      const existing = await firestoreService.getDocuments("coupons");
      if (existing.some((entry: any) => String(entry.code).toUpperCase() === data.code)) return res.status(409).json({ error: "Coupon code already exists" });
      const created = await firestoreService.setDocument("coupons", data.code, { ...data, id: data.code, createdAt: Date.now(), updatedAt: Date.now() }, false);
      return res.status(201).json(created);
    } catch (error: any) {
      console.error("Coupon create error:", error);
      return res.status(400).json({ error: error?.message || "Unable to create coupon" });
    }
  });

  app.patch("/api/admin/coupons/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const id = String(req.params.id || "").trim().toUpperCase();
      if (!id) return res.status(400).json({ error: "Coupon ID required" });
      const data = validateCouponDefinition({ ...req.body, code: id });
      const existing = await firestoreService.getDocuments("coupons");
      if (existing.some((entry: any) => entry.id !== id && String(entry.code).toUpperCase() === data.code)) return res.status(409).json({ error: "Coupon code already exists" });
      const updated = await firestoreService.setDocument("coupons", id, { ...data, id, updatedAt: Date.now() }, true);
      return res.json(updated);
    } catch (error: any) {
      console.error("Coupon update error:", error);
      return res.status(400).json({ error: error?.message || "Unable to update coupon" });
    }
  });

  app.delete("/api/admin/coupons/:id", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      await firestoreService.deleteDocument("coupons", String(req.params.id || "").trim().toUpperCase());
      return res.json({ success: true });
    } catch (error) {
      console.error("Coupon delete error:", error);
      return res.status(500).json({ error: "Unable to delete coupon" });
    }
  });

  app.post("/api/admin/coupons/generate", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const existing = await firestoreService.getDocuments("coupons");
      const used = new Set(existing.map((entry: any) => String(entry.code || "").toUpperCase()));
      const prefix = String(req.body?.prefix || "PRIME").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10) || "PRIME";
      let code = generateCouponCode(prefix, Number(req.body?.length || 6));
      for (let i = 0; i < 20 && used.has(code); i += 1) code = generateCouponCode(prefix, Number(req.body?.length || 6));
      return res.json({ code });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || "Unable to generate coupon code" });
    }
  });
}
