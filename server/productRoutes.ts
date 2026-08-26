import type { Application } from "express";
import { firestoreService } from "./firestoreService.js";

function number(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProduct(product: any) {
  const metadata = product?.metadata && typeof product.metadata === "object" ? product.metadata : {};
  const stock = Math.max(0, number(product?.stock ?? product?.stockQuantity ?? metadata.stock ?? metadata.stockQuantity));
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

export function installProductRoutes(app: Application) {
  app.get("/api/products", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    try {
      const all = await firestoreService.getDocuments("products", true);
      const ids = new Set(
        String(req.query.ids || "")
          .split(",")
          .map((id) => id.trim().toLowerCase())
          .filter(Boolean),
      );
      const name = String(req.query.name || "").trim().toLowerCase();
      const products = all
        .map(normalizeProduct)
        .filter((product: any) => {
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
}
