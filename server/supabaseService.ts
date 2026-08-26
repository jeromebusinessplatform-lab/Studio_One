import crypto from "node:crypto";

/**
 * Supabase-backed compatibility data layer.
 *
 * The rest of Studio_One still imports `firestoreService`; this module keeps
 * that interface while moving persistence to Supabase/Postgres. Legacy
 * document ids are preserved in metadata.externalId so the business modules
 * do not need a flag-day rewrite.
 */

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SECRET_KEY = String(process.env.SUPABASE_SECRET_KEY || "");
const FETCH_TIMEOUT_MS = 15000;
const MID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

type AnyRecord = Record<string, any>;

const tableMap: Record<string, string> = {
  orders: "orders",
  orderItems: "order_items",
  customers: "customers",
  couriers: "couriers",
  courierConfigs: "courier_configs",
  charges: "charges",
  discounts: "discounts",
  products: "products",
  productImages: "product_images",
  notifications: "notifications",
  activityLog: "activity_log",
  systemConfig: "system_config",
  coupons: "coupons",
  couponRedemptions: "coupon_redemptions",
  referrals: "referral_redemptions",
  referralCampaigns: "referral_campaigns",
  storageAssets: "storage_assets",
};

const directFields: Record<string, Set<string>> = {
  customers: new Set(["telegram_user_id", "telegram_username", "telegram_name", "phone", "email", "prime_member_id", "account_status", "vip_tier", "points", "lifetime_spend", "referral_count", "metadata", "created_at", "updated_at"]),
  products: new Set(["sku", "name", "description", "category", "price", "compare_at_price", "stock_quantity", "active", "metadata", "created_at", "updated_at"]),
  productImages: new Set(["product_id", "storage_path", "alt_text", "sort_order", "is_primary", "created_at"]),
  couriers: new Set(["name", "active", "logo_storage_path", "metadata", "created_at", "updated_at"]),
  courierConfigs: new Set(["courier_id", "delivery_type", "delivery_fee", "eta_minutes", "active", "metadata", "created_at", "updated_at"]),
  charges: new Set(["code", "name", "amount", "calculation_type", "active", "metadata", "created_at", "updated_at"]),
  discounts: new Set(["name", "discount_type", "value", "active", "conditions", "starts_at", "ends_at", "created_at", "updated_at"]),
  coupons: new Set(["code", "active", "discount_type", "discount_value", "priority", "starts_at", "expires_at", "time_window", "cart_rules", "customer_rules", "usage_rules", "stacking_rules", "geographic_rules", "created_at", "updated_at"]),
  couponRedemptions: new Set(["coupon_id", "customer_id", "order_id", "redeemed_at", "metadata"]),
  referralCampaigns: new Set(["name", "active", "expires_at", "minimum_spend", "global_usage_cap", "per_user_limit", "allowed_regions", "allowed_channels", "metadata", "created_at", "updated_at"]),
  referralRedemptions: new Set(["campaign_id", "referral_code", "referrer_customer_id", "referee_customer_id", "order_id", "redeemed_at", "metadata"]),
  orders: new Set(["order_number", "status", "payment_status", "delivery_status", "delivery_provider_id", "delivery_type", "delivery_fee", "subtotal", "discount_total", "charge_total", "total", "coupon_id", "shipping_address", "payment_metadata", "admin_notes", "hold_reason", "receipt_storage_path", "receipt_uploaded_at", "resubmit_requested_at", "created_at", "updated_at"]),
  orderItems: new Set(["order_id", "product_id", "sku", "product_name", "quantity", "unit_price", "line_total", "metadata"]),
  notifications: new Set(["customer_id", "event_type", "title", "message", "entity_type", "entity_id", "read_at", "created_at", "metadata"]),
  activityLog: new Set(["customer_id", "actor_type", "event_type", "entity_type", "entity_id", "occurred_at", "metadata"]),
  systemConfig: new Set(["key", "value", "description", "active", "updated_at"]),
  storageAssets: new Set(["bucket", "storage_path", "asset_type", "product_id", "customer_id", "order_id", "content_type", "file_size", "created_at"]),
};

const camelToSnake: Record<string, string> = {
  telegramUserId: "telegram_user_id",
  telegramUsername: "telegram_username",
  telegramName: "telegram_name",
  primeMemberId: "prime_member_id",
  accountStatus: "account_status",
  vipTier: "vip_tier",
  lifetimeSpend: "lifetime_spend",
  referralCount: "referral_count",
  compareAtPrice: "compare_at_price",
  stockQuantity: "stock_quantity",
  storagePath: "storage_path",
  altText: "alt_text",
  sortOrder: "sort_order",
  isPrimary: "is_primary",
  logoStoragePath: "logo_storage_path",
  deliveryType: "delivery_type",
  deliveryFee: "delivery_fee",
  etaMinutes: "eta_minutes",
  calculationType: "calculation_type",
  discountType: "discount_type",
  discountValue: "discount_value",
  startsAt: "starts_at",
  endsAt: "ends_at",
  expiresAt: "expires_at",
  timeWindow: "time_window",
  cartRules: "cart_rules",
  customerRules: "customer_rules",
  usageRules: "usage_rules",
  stackingRules: "stacking_rules",
  geographicRules: "geographic_rules",
  couponId: "coupon_id",
  customerId: "customer_id",
  orderId: "order_id",
  redeemedAt: "redeemed_at",
  campaignId: "campaign_id",
  minimumSpend: "minimum_spend",
  globalUsageCap: "global_usage_cap",
  perUserLimit: "per_user_limit",
  allowedRegions: "allowed_regions",
  allowedChannels: "allowed_channels",
  referralCode: "referral_code",
  referrerCustomerId: "referrer_customer_id",
  refereeCustomerId: "referee_customer_id",
  orderNumber: "order_number",
  paymentStatus: "payment_status",
  deliveryStatus: "delivery_status",
  deliveryProviderId: "delivery_provider_id",
  discountTotal: "discount_total",
  chargeTotal: "charge_total",
  shippingAddress: "shipping_address",
  paymentMetadata: "payment_metadata",
  adminNotes: "admin_notes",
  holdReason: "hold_reason",
  receiptStoragePath: "receipt_storage_path",
  receiptUploadedAt: "receipt_uploaded_at",
  resubmitRequestedAt: "resubmit_requested_at",
  productId: "product_id",
  productName: "product_name",
  unitPrice: "unit_price",
  lineTotal: "line_total",
  eventType: "event_type",
  entityType: "entity_type",
  entityId: "entity_id",
  readAt: "read_at",
  actorType: "actor_type",
  occurredAt: "occurred_at",
  fileSize: "file_size",
  contentType: "content_type",
  sort_order: "sort_order",
  createdAt: "created_at",
  updatedAt: "updated_at",
  completedAt: "completed_at",
};

function toIso(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("Supabase server configuration is missing. Set SUPABASE_URL and SUPABASE_SECRET_KEY on the server.");
  }
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  requireConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function tableFor(collection: string): string {
  const table = tableMap[collection];
  if (!table) throw new Error(`Unsupported data collection: ${collection}`);
  return table;
}

function escapeFilter(value: string): string {
  return value.replace(/([\\,()])/g, "\\$1");
}

function externalIdFrom(data: AnyRecord): string {
  return String(data.id ?? data.externalId ?? `doc_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`);
}

function buildRow(collection: string, data: AnyRecord, existingMetadata: AnyRecord = {}): AnyRecord {
  const row: AnyRecord = {};
  const metadata: AnyRecord = { ...existingMetadata, ...(data.metadata && typeof data.metadata === "object" ? data.metadata : {}) };
  const externalId = externalIdFrom(data);
  metadata.externalId = externalId;

  for (const [key, value] of Object.entries(data)) {
    if (key === "id" || key === "externalId" || key === "metadata" || key === "referralCode" || key === "referrerId" || key === "refereeId") continue;
    const column = camelToSnake[key] || key;
    if (!directFields[collection]?.has(column)) {
      metadata[key] = value;
      continue;
    }
    if (value === undefined) continue;
    if (column.endsWith("_at") || ["created_at", "updated_at", "redeemed_at", "occurred_at", "read_at"].includes(column)) {
      const iso = toIso(value);
      if (iso) row[column] = iso;
    } else {
      row[column] = value;
    }
  }

  if (collection === "systemConfig") {
    row.key = String(data.key ?? externalId);
    if (row.value === undefined) row.value = data.value ?? {};
  }

  if (collection === "customers") {
    row.telegram_user_id = String(data.telegramUserId ?? data.telegram_user_id ?? data.id ?? externalId);
    if (row.prime_member_id === undefined && data.primeMemberId) row.prime_member_id = String(data.primeMemberId).toUpperCase();
    if (row.updated_at === undefined) row.updated_at = new Date().toISOString();
    if (row.created_at === undefined) row.created_at = new Date().toISOString();
  } else {
    if (row.updated_at === undefined && directFields[collection]?.has("updated_at")) row.updated_at = new Date().toISOString();
    if (row.created_at === undefined && directFields[collection]?.has("created_at")) row.created_at = new Date().toISOString();
  }

  row.metadata = metadata;
  return row;
}

function fromRow(collection: string, row: AnyRecord): AnyRecord {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const id = String(metadata.externalId || row.id || "");
  const out: AnyRecord = { ...metadata, id };

  for (const [column, value] of Object.entries(row)) {
    if (column === "id" || column === "metadata") continue;
    const camel = Object.entries(camelToSnake).find(([, snake]) => snake === column)?.[0] || column;
    out[camel] = value;
  }

  out.createdAt = out.createdAt ? Date.parse(String(out.createdAt)) || out.createdAt : out.createdAt;
  out.updatedAt = out.updatedAt ? Date.parse(String(out.updatedAt)) || out.updatedAt : out.updatedAt;
  if (out.telegram_user_id && out.telegramUserId === undefined) out.telegramUserId = String(out.telegram_user_id);
  if (out.telegram_username && out.telegramUsername === undefined) out.telegramUsername = String(out.telegram_username);
  if (out.prime_member_id && out.primeMemberId === undefined) out.primeMemberId = String(out.prime_member_id);

  // Preserve PRIME's rule that the member ID is also the referral code.
  if (collection === "customers" && out.primeMemberId) out.referralCode = String(out.primeMemberId).toUpperCase();
  return out;
}

async function queryRows(collection: string): Promise<AnyRecord[]> {
  const table = tableFor(collection);
  const response = await supabaseFetch(`${table}?select=*`);
  if (!response.ok) throw new Error(`Supabase list ${collection} returned ${response.status}: ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function findRow(collection: string, externalId: string): Promise<AnyRecord | null> {
  const table = tableFor(collection);
  const escaped = encodeURIComponent(externalId);
  if (collection === "systemConfig") {
    const response = await supabaseFetch(`${table}?select=*&key=eq.${escaped}&limit=1`);
    if (!response.ok) throw new Error(`Supabase get ${collection}/${externalId} returned ${response.status}: ${await response.text()}`);
    const rows = await response.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }
  if (collection === "customers") {
    const byTelegram = await supabaseFetch(`${table}?select=*&telegram_user_id=eq.${escaped}&limit=1`);
    if (!byTelegram.ok) throw new Error(`Supabase get ${collection}/${externalId} returned ${byTelegram.status}: ${await byTelegram.text()}`);
    const telegramRows = await byTelegram.json();
    if (Array.isArray(telegramRows) && telegramRows.length) return telegramRows[0];
  }
  const response = await supabaseFetch(`${table}?select=*&metadata->>externalId=eq.${escaped}&limit=1`);
  if (!response.ok) throw new Error(`Supabase get ${collection}/${externalId} returned ${response.status}: ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

function uniqueMid(used: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = crypto.randomBytes(10);
    let value = "";
    for (const byte of bytes) value += MID_ALPHABET[byte % MID_ALPHABET.length];
    if (!used.has(value)) return value;
  }
  throw new Error("Unable to generate unique PRIME Member ID");
}

async function ensurePrimeMemberId(incoming: AnyRecord, id: string): Promise<string> {
  const candidate = String(incoming.primeMemberId || "").trim().toUpperCase();
  const customers = await queryRows("customers");
  const used = new Set(customers.map((row) => String(row.prime_member_id || "").toUpperCase()).filter(Boolean));
  if (/^[A-Z0-9]{10}$/.test(candidate) && !used.has(candidate)) return candidate;
  const existing = customers.find((row) => String(row.telegram_user_id || row.metadata?.externalId || "") === id);
  if (existing && /^[A-Z0-9]{10}$/.test(String(existing.prime_member_id || ""))) return String(existing.prime_member_id).toUpperCase();
  return uniqueMid(used);
}

export function toFirestoreValue(value: any): any { return value; }
export function fromFirestoreValue(value: any): any { return value; }
export function documentToPlain(doc: any): any { return doc ? fromRow("customers", doc) : null; }

export const supabaseService = {
  async getDocuments(collection: string, _forceFresh = false): Promise<any[]> {
    const rows = await queryRows(collection);
    return rows.map((row) => fromRow(collection, row));
  },

  async getDocument(collection: string, id: string): Promise<any | null> {
    const row = await findRow(collection, id);
    return row ? fromRow(collection, row) : null;
  },

  async setDocument(collection: string, id: string, data: AnyRecord, merge = true): Promise<any> {
    let incoming = { ...data, id };
    const existingRow = merge ? await findRow(collection, id) : null;
    const existing = existingRow ? fromRow(collection, existingRow) : {};

    if (collection === "customers") {
      incoming.primeMemberId = existing.primeMemberId && /^[A-Z0-9]{10}$/.test(String(existing.primeMemberId))
        ? String(existing.primeMemberId).toUpperCase()
        : await ensurePrimeMemberId(incoming, id);
      incoming.referralCode = incoming.primeMemberId;
    }

    const merged = { ...existing, ...incoming, id };
    const row = buildRow(collection, merged, existingRow?.metadata || {});

    if (existingRow) {
      const actualId = String(existingRow.id);
      const response = await supabaseFetch(`${tableFor(collection)}?id=eq.${encodeURIComponent(actualId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      if (!response.ok) throw new Error(`Supabase update ${collection}/${id} returned ${response.status}: ${await response.text()}`);
    } else {
      const response = await supabaseFetch(tableFor(collection), {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(row),
      });
      if (!response.ok) throw new Error(`Supabase create ${collection}/${id} returned ${response.status}: ${await response.text()}`);
    }

    return (await this.getDocument(collection, id)) || merged;
  },

  async addDocument(collection: string, data: AnyRecord): Promise<any> {
    const id = externalIdFrom(data);
    return this.setDocument(collection, id, { ...data, id, createdAt: data.createdAt || Date.now() }, false);
  },

  async updateDocument(collection: string, id: string, updates: AnyRecord): Promise<any> {
    return this.setDocument(collection, id, updates, true);
  },

  async deleteDocument(collection: string, id: string): Promise<boolean> {
    const row = await findRow(collection, id);
    if (!row) return true;
    const response = await supabaseFetch(`${tableFor(collection)}?id=eq.${encodeURIComponent(String(row.id))}`, { method: "DELETE" });
    if (!response.ok) throw new Error(`Supabase delete ${collection}/${id} returned ${response.status}: ${await response.text()}`);
    return true;
  },

  async batchDelete(collection: string, ids: string[]): Promise<void> {
    for (const id of ids) await this.deleteDocument(collection, id);
  },

  async batchUpdate(collection: string, ids: string[], updates: AnyRecord): Promise<void> {
    for (const id of ids) await this.updateDocument(collection, id, updates);
  },
};

export const firestoreService = supabaseService;
