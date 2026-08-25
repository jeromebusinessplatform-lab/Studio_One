import crypto from "node:crypto";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "perfect-buttress-4dzcr";
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-primecommerce-f59766ab-326b-40a2-bcc8-eae7f46dfe5f";
const API_KEY = process.env.FIREBASE_API_KEY || "AIzaSyDQftTyFCnSE3Iaen3GTe2MhPstRAMI024";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;
const FETCH_TIMEOUT_MS = 15000;
const MID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function uniqueMid(used: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = crypto.randomBytes(10);
    let value = "";
    for (const byte of bytes) value += MID_ALPHABET[byte % MID_ALPHABET.length];
    if (!used.has(value)) return value;
  }
  throw new Error("Unable to generate unique PRIME MID");
}

async function firestoreFetch(url: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val?.toMillis === "function") return { timestampValue: new Date(val.toMillis()).toISOString() };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) if (v !== undefined) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function fromFirestoreValue(val: any): any {
  if (!val || typeof val !== "object") return null;
  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("timestampValue" in val) return Date.parse(val.timestampValue);
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) return Array.isArray(val.arrayValue?.values) ? val.arrayValue.values.map(fromFirestoreValue) : [];
  if ("mapValue" in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) res[k] = fromFirestoreValue(v);
    return res;
  }
  return null;
}

export function documentToPlain(doc: any): any {
  if (!doc) return null;
  const nameParts = (doc.name || "").split("/");
  const id = nameParts[nameParts.length - 1] || "";
  const plain: Record<string, any> = { id };
  if (doc.fields) for (const [k, v] of Object.entries(doc.fields)) plain[k] = fromFirestoreValue(v);
  if (doc.createTime) plain.createdAt = plain.createdAt ?? Date.parse(doc.createTime);
  if (doc.updateTime) plain.updatedAt = plain.updatedAt ?? Date.parse(doc.updateTime);
  return plain;
}

const inMemoryCache: Record<string, Map<string, any>> = {
  orders: new Map(), customers: new Map(), couriers: new Map(), courierConfigs: new Map(), charges: new Map(), discounts: new Map(), products: new Map(), notifications: new Map(), systemConfig: new Map(), coupons: new Map(), couponRedemptions: new Map(), referrals: new Map(),
};

async function mergeCourierConfig(courier: any): Promise<any> {
  if (!courier?.id) return courier;
  try {
    const config = await firestoreService.getDocument("courierConfigs", String(courier.id));
    if (!config) return courier;
    const deliveryType = String(config.deliveryType || config.tier || courier.tier || "STANDARD").toUpperCase();
    const extraFee = deliveryType === "EXPRESS" ? Number(config.expressFee || 0) : deliveryType === "PRIORITY" ? Number(config.priorityFee || 0) : 0;
    return {
      ...courier,
      tier: deliveryType,
      deliveryType,
      priorityFee: Math.max(0, Number(config.priorityFee || 0)),
      expressFee: Math.max(0, Number(config.expressFee || 0)),
      baseFare: Math.round((Number(courier.baseFare || 0) + Math.max(0, Number.isFinite(extraFee) ? extraFee : 0)) * 100) / 100,
    };
  } catch {
    return courier;
  }
}

function fieldsFor(data: Record<string, any>) {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) if (k !== "id" && v !== undefined) fields[k] = toFirestoreValue(v);
  return fields;
}

export const firestoreService = {
  async getDocuments(collection: string, forceFresh = false): Promise<any[]> {
    try {
      const url = `${BASE_URL}/${encodeURIComponent(collection)}?key=${API_KEY}&_t=${Date.now()}`;
      const response = await firestoreFetch(url, { headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" }, cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        let docs = Array.isArray(data.documents) ? data.documents.map(documentToPlain) : [];
        if (collection === "couriers") docs = await Promise.all(docs.map(mergeCourierConfig));
        const cache = new Map<string, any>();
        docs.forEach((d) => cache.set(d.id, d));
        inMemoryCache[collection] = cache;
        return docs;
      }
      throw new Error(`Firestore list ${collection} returned ${response.status}`);
    } catch (e) {
      console.warn(`Firestore REST list warning for ${collection}:`, (e as any)?.message || e);
    }
    const cache = inMemoryCache[collection] || (inMemoryCache[collection] = new Map());
    return Array.from(cache.values());
  },

  async getDocument(collection: string, id: string): Promise<any | null> {
    try {
      const url = `${BASE_URL}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}?key=${API_KEY}`;
      const response = await firestoreFetch(url, { headers: { "Content-Type": "application/json" }, cache: "no-store" });
      if (response.ok) {
        const doc = await response.json();
        let plain = documentToPlain(doc);
        if (collection === "couriers") plain = await mergeCourierConfig(plain);
        const cache = inMemoryCache[collection] || (inMemoryCache[collection] = new Map());
        cache.set(id, plain);
        return plain;
      }
      if (response.status !== 404) throw new Error(`Firestore get ${collection}/${id} returned ${response.status}`);
    } catch (e) {
      console.warn(`Firestore REST get warning for ${collection}/${id}:`, (e as any)?.message || e);
    }
    const cache = inMemoryCache[collection];
    return cache?.get(id) || null;
  },

  async setDocument(collection: string, id: string, data: Record<string, any>, merge = true): Promise<any> {
    const incoming = { ...data };
    const skipMidUniqueness = incoming.__skipPrimeMidUniqueness === true;
    delete incoming.__skipPrimeMidUniqueness;
    const existing = merge ? (await this.getDocument(collection, id)) || {} : {};

    if (collection === "customers" && !skipMidUniqueness) {
      const candidate = String(incoming.primeMemberId ?? existing.primeMemberId ?? "").trim().toUpperCase();
      const customers = await this.getDocuments("customers");
      const used = new Set<string>(customers.filter((c: any) => String(c.id) !== id).map((c: any) => String(c.primeMemberId || "").toUpperCase()).filter(Boolean) as string[]);
      if (!/^[A-Z0-9]{10}$/.test(candidate) || used.has(candidate)) incoming.primeMemberId = uniqueMid(used);
      else incoming.primeMemberId = candidate;
    }

    const merged = { ...existing, ...incoming, id, updatedAt: Date.now() };
    const previous = inMemoryCache[collection]?.get(id);

    try {
      if (merge && previous) {
        const url = `${BASE_URL}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}?key=${API_KEY}`;
        const response = await firestoreFetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: fieldsFor(merged) }) });
        if (!response.ok) throw new Error(`Firestore update ${collection}/${id} returned ${response.status}`);
      } else {
        const url = `${BASE_URL}/${encodeURIComponent(collection)}?documentId=${encodeURIComponent(id)}&key=${API_KEY}`;
        const response = await firestoreFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: fieldsFor(merged) }) });
        if (!response.ok) throw new Error(`Firestore create ${collection}/${id} returned ${response.status}`);
      }
    } catch (e) {
      console.error(`Firestore REST write error for ${collection}/${id}:`, (e as any)?.message || e);
      if (previous) inMemoryCache[collection]?.set(id, previous);
      throw e;
    }

    const cache = inMemoryCache[collection] || (inMemoryCache[collection] = new Map());
    cache.set(id, merged);
    return merged;
  },

  async addDocument(collection: string, data: Record<string, any>): Promise<any> {
    const id = data.id || `doc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    return this.setDocument(collection, id, { ...data, createdAt: data.createdAt || Date.now() }, false);
  },

  async updateDocument(collection: string, id: string, updates: Record<string, any>): Promise<any> {
    return this.setDocument(collection, id, updates, true);
  },

  async deleteDocument(collection: string, id: string): Promise<boolean> {
    const cache = inMemoryCache[collection];
    if (cache) cache.delete(id);
    try {
      const url = `${BASE_URL}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}?key=${API_KEY}`;
      const response = await firestoreFetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" } });
      if (!(response.ok || response.status === 404)) throw new Error(`Firestore delete ${collection}/${id} returned ${response.status}`);
      return true;
    } catch (e) {
      console.error(`Firestore REST delete error for ${collection}/${id}:`, (e as any)?.message || e);
      return false;
    }
  },

  async batchDelete(collection: string, ids: string[]): Promise<void> { await Promise.all(ids.map((id) => this.deleteDocument(collection, id))); },
  async batchUpdate(collection: string, ids: string[], updates: Record<string, any>): Promise<void> { await Promise.all(ids.map((id) => this.updateDocument(collection, id, updates))); },
};
