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

function number(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const COURIER_CONFIG_FIELDS = new Set([
  "tier", "deliveryType", "baseFare", "minimumDistanceKm", "minimumFare", "excessPerKm",
  "baseDistanceKm", "perKmCharge", "platformFeeEnabled", "platformFee", "surchargeEnabled", "surchargeFee",
  "priorityFee", "expressFee", "nightDifferentialEnabled", "nightDifferentialFee"
]);

async function mergedCourier(courier: AnyRecord | null): Promise<AnyRecord | null> {
  if (!courier) return null;
  const configs = await legacySupabaseService.getDocuments("courierConfigs");
  const config = configs.find((c: AnyRecord) => String(c.courierId) === String(courier.id));
  if (!config) return courier;

  const metadata = config.metadata && typeof config.metadata === "object" ? config.metadata : {};
  const minimumDistanceKm = number(config.minimumDistanceKm ?? metadata.minimumDistanceKm ?? config.baseDistanceKm, 0);
  const minimumFare = number(config.minimumFare ?? metadata.minimumFare, 0);
  const baseFare = number(config.baseFare ?? metadata.baseFare, 0);
  const excessPerKm = number(config.excessPerKm ?? metadata.excessPerKm ?? config.perKmCharge, 0);
  const deliveryType = String(config.deliveryType ?? metadata.deliveryType ?? courier.deliveryType ?? courier.tier ?? "STANDARD").toUpperCase();

  return {
    ...courier,
    ...metadata,
    deliveryType,
    tier: deliveryType,
    // Backward-compatible aliases allow the existing checkout calculation to use
    // the new explicit model without a second pricing implementation.
    baseFare: baseFare + minimumFare,
    baseDistanceKm: minimumDistanceKm,
    perKmCharge: excessPerKm,
    minimumDistanceKm,
    minimumFare,
    excessPerKm,
    platformFeeEnabled: Boolean(config.platformFeeEnabled ?? metadata.platformFeeEnabled ?? courier.platformFeeEnabled),
    platformFee: number(config.platformFee ?? metadata.platformFee ?? courier.platformFee),
    surchargeEnabled: Boolean(config.surchargeFeeEnabled ?? metadata.surchargeFeeEnabled ?? config.surchargeEnabled ?? metadata.surchargeEnabled ?? courier.surchargeEnabled),
    surchargeFee: number(config.surchargeFee ?? metadata.surchargeFee ?? courier.surchargeFee),
    // The redesigned Logistics model intentionally excludes night differential.
    nightDifferentialEnabled: false,
    nightDifferentialFee: 0,
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

function splitCourierWrite(data: AnyRecord) {
  const core: AnyRecord = { ...data };
  const config: AnyRecord = {};
  for (const key of COURIER_CONFIG_FIELDS) {
    if (key in core) {
      config[key] = core[key];
      delete core[key];
    }
  }
  return { core, config };
}

async function persistCourierConfig(courierId: string, configInput: AnyRecord) {
  const configs = await legacySupabaseService.getDocuments("courierConfigs");
  const existing = configs.find((c: AnyRecord) => String(c.courierId) === String(courierId));
  const deliveryType = ["STANDARD", "EXPRESS", "PRIORITY"].includes(String(configInput.deliveryType || configInput.tier || "STANDARD").toUpperCase())
    ? String(configInput.deliveryType || configInput.tier || "STANDARD").toUpperCase()
    : "STANDARD";

  const payload = {
    courierId,
    deliveryType,
    baseFare: Math.max(0, number(configInput.baseFare, 0)),
    minimumDistanceKm: Math.max(0, number(configInput.minimumDistanceKm ?? configInput.baseDistanceKm, 0)),
    minimumFare: Math.max(0, number(configInput.minimumFare, 0)),
    excessPerKm: Math.max(0, number(configInput.excessPerKm ?? configInput.perKmCharge, 0)),
    platformFeeEnabled: configInput.platformFeeEnabled === true,
    platformFee: Math.max(0, number(configInput.platformFee, 0)),
    surchargeFeeEnabled: configInput.surchargeFeeEnabled === true || configInput.surchargeEnabled === true,
    surchargeFee: Math.max(0, number(configInput.surchargeFee, 0)),
    active: configInput.isAvailable !== false,
    nightDifferentialEnabled: false,
    nightDifferentialFee: 0,
    updatedAt: Date.now(),
  };

  if (existing) return legacySupabaseService.updateDocument("courierConfigs", String(existing.id), payload);
  return legacySupabaseService.addDocument("courierConfigs", payload);
}

async function getMergedCouriers(forceFresh = false): Promise<any[]> {
  const rows = await legacySupabaseService.getDocuments("couriers", forceFresh);
  const merged = await Promise.all(rows.map((row) => mergedCourier(row)));
  return merged.filter(Boolean);
}

export const firestoreService = {
  ...legacySupabaseService,
  async getDocument(collection: string, id: string): Promise<any | null> {
    if (collection === "products") return getProductCompat(String(id));
    if (collection === "couriers") return mergedCourier(await legacySupabaseService.getDocument(collection, id));
    return legacySupabaseService.getDocument(collection, id);
  },
  async getDocuments(collection: string, forceFresh = false): Promise<any[]> {
    if (collection === "couriers") return getMergedCouriers(forceFresh);
    const rows = await legacySupabaseService.getDocuments(collection, forceFresh);
    return collection === "products" ? rows.map(normalizeProduct).filter(Boolean) : rows;
  },
  async setDocument(collection: string, id: string, data: AnyRecord, merge = true): Promise<any> {
    if (collection === "couriers") {
      const { core, config } = splitCourierWrite(data);
      const current = merge ? await legacySupabaseService.getDocument("couriers", id) : null;
      const updated = await legacySupabaseService.setDocument("couriers", id, core, merge);
      await persistCourierConfig(String(updated?.id || current?.id || id), config);
      return mergedCourier(await legacySupabaseService.getDocument("couriers", id));
    }
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
    if (collection === "couriers") {
      const { core, config } = splitCourierWrite(data);
      const created = await legacySupabaseService.addDocument("couriers", core);
      await persistCourierConfig(String(created?.id), config);
      return mergedCourier(await legacySupabaseService.getDocument("couriers", String(created?.id))) || created;
    }
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
    if (collection === "couriers") {
      const { core, config } = splitCourierWrite(updates);
      const updated = await legacySupabaseService.updateDocument("couriers", id, core);
      await persistCourierConfig(String(updated?.id || id), config);
      return mergedCourier(await legacySupabaseService.getDocument("couriers", id)) || updated;
    }
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
  async deleteDocument(collection: string, id: string): Promise<any> {
    if (collection === "couriers") {
      const configs = await legacySupabaseService.getDocuments("courierConfigs");
      const existing = configs.find((c: AnyRecord) => String(c.courierId) === String(id));
      if (existing) await legacySupabaseService.deleteDocument("courierConfigs", String(existing.id));
    }
    return legacySupabaseService.deleteDocument(collection, id);
  },
};

export const supabaseService = firestoreService;
export { toFirestoreValue, fromFirestoreValue, documentToPlain };