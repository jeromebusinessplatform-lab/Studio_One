import type { Application, Request, Response } from "express";
import { firestoreService } from "./firestoreService.js";

const MAX_COMPARE = 3;

function parseIds(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter((id) => /^[A-Za-z0-9_-]{1,150}$/.test(id)))];
}

function normalizeSpecs(product: any): Record<string, string | number | boolean> {
  const source = product?.specifications && typeof product.specifications === "object" ? product.specifications : product?.specs && typeof product.specs === "object" ? product.specs : {};
  const specs: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!key || typeof value === "object" || value === null || value === undefined) continue;
    specs[String(key)] = typeof value === "number" || typeof value === "boolean" ? value : String(value);
  }
  return specs;
}

function normalizeProduct(product: any) {
  const price = Number(product?.price) || 0;
  const rawSale = Number(product?.salePrice);
  const salePrice = Number.isFinite(rawSale) ? rawSale : undefined;
  return {
    _id: String(product.id || product._id),
    name: String(product.name || "Untitled Product"),
    subname: product.subname || undefined,
    description: product.description || undefined,
    image: product.image || undefined,
    price,
    salePrice,
    stock: Math.max(0, Number(product.stock) || 0),
    available: product.available !== false,
    category: product.category || undefined,
    specifications: normalizeSpecs(product),
    ratingAverage: Math.min(5, Math.max(0, Number(product.ratingAverage ?? product.rating ?? 4.8) || 0)),
    ratingCount: Math.max(0, Math.floor(Number(product.ratingCount ?? 12) || 0)),
    badge: product.badge || undefined,
  };
}

export function installProductComparisonRoutes(app: Application) {
  app.get("/api/products/compare", async (req: Request, res: Response) => {
    const ids = parseIds(req.query.ids);
    if (ids.length < 2) return res.status(400).json({ error: "Select at least 2 products to compare" });
    if (ids.length > MAX_COMPARE) return res.status(400).json({ error: "You can compare up to 3 products at a time" });
    try {
      const products = await Promise.all(ids.map((id) => firestoreService.getDocument("products", id)));
      const found = products.filter(Boolean).map(normalizeProduct);
      if (found.length !== ids.length) return res.status(404).json({ error: "One or more selected products are no longer available" });
      return res.json({ products: found, maxCompare: MAX_COMPARE, fetchedAt: Date.now() });
    } catch (error) {
      console.error("Product comparison error:", error);
      return res.status(500).json({ error: "Unable to load comparison data" });
    }
  });
}
