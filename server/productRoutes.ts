import crypto from "node:crypto";
import type { Application, Request } from "express";
import { supabaseService } from "./supabaseService.js";

function number(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function adminSession(req: Request): boolean {
  const header = String(req.headers.cookie || "");
  const token = header.split(";").map((part) => part.trim()).find((part) => part.startsWith("prime_admin_session="));
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";
  if (!token || !secret) return false;
  const value = decodeURIComponent(token.slice("prime_admin_session=".length));
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^admin:(\d+)$/);
    if (!match || Number(match[1]) < Date.now()) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function normalizeProduct(product: any) {
  const metadata = product?.metadata && typeof product.metadata === "object" ? product.metadata : {};
  const stock = Math.max(0, number(product?.stock ?? product?.stockQuantity ?? product?.stock_quantity ?? metadata.stock ?? metadata.stockQuantity));
  const active = product?.active !== false && metadata.active !== false;
  return {
    ...metadata,
    ...product,
    _id: String(product?.id ?? product?.externalId ?? metadata.externalId ?? ""),
    name: String(product?.name ?? metadata.name ?? "Untitled Product"),
    price: number(product?.price ?? metadata.price),
    salePrice: product?.salePrice ?? metadata.salePrice,
    stock,
    available: product?.available !== false && active && stock > 0,
    active,
    image: product?.image ?? metadata.image ?? metadata.imageUrl ?? null,
  };
}

function cleanProductInput(body: any) {
  const name = String(body?.name || "").trim();
  const price = number(body?.price, NaN);
  const stock = number(body?.stock ?? body?.stockQuantity, NaN);
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isFinite(stock) || !Number.isInteger(stock) || stock < 0) {
    throw new Error("Invalid product name, price, or stock quantity");
  }
  const payload: Record<string, any> = { ...body, name, price, stockQuantity: stock, active: body?.active !== false };
  delete payload._id;
  delete payload.stock;
  payload.available = stock > 0 && payload.active !== false;
  return payload;
}

export function installProductRoutes(app: Application) {
  app.get("/api/products", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    try {
      const all = await supabaseService.getDocuments("products", true);
      const ids = new Set(String(req.query.ids || "").split(",").map((id) => id.trim().toLowerCase()).filter(Boolean));
      const name = String(req.query.name || "").trim().toLowerCase();
      const products = all.map(normalizeProduct).filter((product: any) => {
        if (ids.size === 0 && !name) return true;
        const candidates = [product._id, product.id, product.sku, product.metadata?.externalId, product.name]
          .map((value) => String(value ?? "").trim().toLowerCase());
        return (ids.size > 0 && candidates.some((value) => ids.has(value))) || (name && candidates.includes(name));
      });
      return res.json({ products, syncedAt: Date.now() });
    } catch (error: any) {
      console.error("Product catalog API error:", error);
      return res.status(500).json({ error: error?.message || "Unable to load products" });
    }
  });

  app.post("/api/admin/products", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      const payload = cleanProductInput(req.body);
      const product = await supabaseService.addDocument("products", payload);
      return res.status(201).json({ success: true, product: normalizeProduct(product) });
    } catch (error: any) {
      console.error("Admin product create error:", error);
      return res.status(400).json({ error: error?.message || "Unable to create product" });
    }
  });

  app.patch("/api/admin/products/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id || "");
    if (!id || id.length > 150) return res.status(400).json({ error: "Invalid product id" });
    try {
      const payload = cleanProductInput({ ...(req.body || {}) });
      const existing = await supabaseService.getDocument("products", id);
      if (!existing) return res.status(404).json({ error: "Product not found" });
      const updated = await supabaseService.updateDocument("products", id, payload);
      return res.json({ success: true, product: normalizeProduct(updated) });
    } catch (error: any) {
      console.error("Admin product update error:", error);
      return res.status(400).json({ error: error?.message || "Unable to update product" });
    }
  });

  app.delete("/api/admin/products/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const id = String(req.params.id || "");
    if (!id || id.length > 150) return res.status(400).json({ error: "Invalid product id" });
    try {
      const deleted = await supabaseService.deleteDocument("products", id);
      return res.json({ success: deleted });
    } catch (error: any) {
      console.error("Admin product delete error:", error);
      return res.status(500).json({ error: error?.message || "Unable to delete product" });
    }
  });

  app.post("/api/admin/products/batch", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    const action = String(req.body?.action || "");
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String).filter(Boolean) : [];
    if (!ids.length) return res.status(400).json({ error: "No products selected" });

    try {
      if (action === "delete") {
        await supabaseService.batchDelete("products", ids);
      } else if (action === "update_category") {
        const category = String(req.body?.category || "").trim();
        if (!category) return res.status(400).json({ error: "Category is required" });
        await supabaseService.batchUpdate("products", ids, { category });
      } else if (action === "set_availability") {
        const available = Boolean(req.body?.available);
        await Promise.all(ids.map(async (id) => {
          if (available) {
            const current = await supabaseService.getDocument("products", id);
            const currentStock = number(current?.stockQuantity ?? current?.stock, 0);
            await supabaseService.updateDocument("products", id, { active: true, stockQuantity: currentStock });
          } else {
            await supabaseService.updateDocument("products", id, { active: false, stockQuantity: 0 });
          }
        }));
      } else if (action === "set_badge") {
        const badge = String(req.body?.badge || "").trim();
        const badgeExpiry = String(req.body?.badgeExpiry || "").trim();
        await supabaseService.batchUpdate("products", ids, { badge: badge || undefined, badgeExpiry: badgeExpiry || undefined });
      } else {
        return res.status(400).json({ error: "Unsupported batch product action" });
      }
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Admin product batch error:", error);
      return res.status(500).json({ error: error?.message || "Unable to apply batch product action" });
    }
  });
}
