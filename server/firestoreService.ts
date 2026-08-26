import { supabaseService as legacySupabaseService, toFirestoreValue, fromFirestoreValue, documentToPlain } from "./supabaseService.js";

type AnyRecord = Record<string, any>;

function normalizeProduct(product: AnyRecord | null): AnyRecord | null {
  if (!product) return null;
  const metadata = product.metadata && typeof product.metadata === "object" ? product.metadata : {};
  const stock = Number(product.stock ?? product.stockQuantity ?? metadata.stock ?? metadata.stockQuantity ?? 0);
  const active = product.active !== false && metadata.active !== false;
  return {
    ...product,
    id: String(product.id ?? metadata.externalId ?? ""),
    stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
    available: product.available !== false && active && stock > 0,
  };
}

async function getProductCompat(id: string): Promise<AnyRecord | null> {
  const direct = await legacySupabaseService.getDocument("products", id);
  if (direct) return normalizeProduct(direct);

  const products = await legacySupabaseService.getDocuments("products");
  const wanted = String(id).trim().toLowerCase();
  const match = products.find((p: AnyRecord) => {
    const meta = p.metadata && typeof p.metadata === "object" ? p.metadata : {};
    return [p.id, p.externalId, p.sku, meta.externalId, meta.firebaseId].some(
      (value) => String(value ?? "").trim().toLowerCase() === wanted,
    );
  });
  return normalizeProduct(match || null);
}

export const firestoreService = {
  ...legacySupabaseService,
  async getDocument(collection: string, id: string): Promise<any | null> {
    if (collection === "products") return getProductCompat(String(id));
    return legacySupabaseService.getDocument(collection, id);
  },
  async getDocuments(collection: string, forceFresh = false): Promise<any[]> {
    const rows = await legacySupabaseService.getDocuments(collection, forceFresh);
    return collection === "products" ? rows.map(normalizeProduct).filter(Boolean) : rows;
  },
  async setDocument(collection: string, id: string, data: AnyRecord, merge = true): Promise<any> {
    if (collection === "products") {
      const normalized = { ...data };
      if (normalized.stock !== undefined && normalized.stockQuantity === undefined) {
        normalized.stockQuantity = Math.max(0, Number(normalized.stock) || 0);
        delete normalized.stock;
      }
      if (normalized.available !== undefined && normalized.active === undefined) {
        normalized.active = normalized.available !== false;
        delete normalized.available;
      }
      return legacySupabaseService.setDocument(collection, id, normalized, merge);
    }
    return legacySupabaseService.setDocument(collection, id, data, merge);
  },
  async addDocument(collection: string, data: AnyRecord): Promise<any> {
    if (collection === "products") {
      const normalized = { ...data };
      if (normalized.stock !== undefined && normalized.stockQuantity === undefined) {
        normalized.stockQuantity = Math.max(0, Number(normalized.stock) || 0);
        delete normalized.stock;
      }
      if (normalized.available !== undefined && normalized.active === undefined) {
        normalized.active = normalized.available !== false;
        delete normalized.available;
      }
      return legacySupabaseService.addDocument(collection, normalized);
    }
    return legacySupabaseService.addDocument(collection, data);
  },
  async updateDocument(collection: string, id: string, updates: AnyRecord): Promise<any> {
    if (collection === "products") {
      const normalized = { ...updates };
      if (normalized.stock !== undefined && normalized.stockQuantity === undefined) {
        normalized.stockQuantity = Math.max(0, Number(normalized.stock) || 0);
        delete normalized.stock;
      }
      if (normalized.available !== undefined && normalized.active === undefined) {
        normalized.active = normalized.available !== false;
        delete normalized.available;
      }
      return legacySupabaseService.updateDocument(collection, id, normalized);
    }
    return legacySupabaseService.updateDocument(collection, id, updates);
  },
};

export const supabaseService = firestoreService;
export { toFirestoreValue, fromFirestoreValue, documentToPlain };
