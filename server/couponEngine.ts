import { firestoreService } from "./firestoreService.js";

export type CouponType = "fixed" | "percent" | "free_delivery";

export type CouponDefinition = {
  id?: string;
  code: string;
  name?: string;
  description?: string;
  value: number;
  type: CouponType;
  active: boolean;
  minCartValue?: number;
  maxCartValue?: number | null;
  minQuantity?: number;
  eligibleProductIds?: string[];
  eligibleSkus?: string[];
  excludedProductIds?: string[];
  excludedSkus?: string[];
  eligibleCategories?: string[];
  excludedCategories?: string[];
  bogoRules?: Array<{
    buyProductIds?: string[];
    buySkus?: string[];
    buyQuantity?: number;
    rewardProductIds?: string[];
    rewardQuantity?: number;
  }>;
  newCustomersOnly?: boolean;
  existingCustomersOnly?: boolean;
  userIds?: string[];
  emails?: string[];
  userGroups?: string[];
  roles?: string[];
  vipTiers?: string[];
  firstOrderPerUser?: boolean;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  singleUse?: boolean;
  startAt?: string | number | null;
  endAt?: string | number | null;
  timezone?: string;
  daysOfWeek?: number[];
  startTimeOfDay?: string | null;
  endTimeOfDay?: string | null;
  exclusive?: boolean;
  allowAutomaticDiscounts?: boolean;
  allowOtherCoupons?: boolean;
  priority?: number;
  deliveryAreas?: string[];
  fulfillmentMethods?: string[];
  maxDiscount?: number | null;
  createdAt?: number;
  updatedAt?: number;
};

export type CouponCartItem = {
  productId: string;
  sku?: string;
  category?: string;
  name?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type CouponCustomer = Record<string, any>;

export type CouponEvaluationContext = {
  code: string;
  userId: string;
  customer: CouponCustomer;
  items: CouponCartItem[];
  subtotal: number;
  deliveryAddress?: string;
  deliveryArea?: string;
  fulfillmentMethod?: string;
  automaticDiscountCodes?: string[];
  otherCouponCodes?: string[];
  now?: Date;
};

export type CouponEvaluation = {
  valid: boolean;
  error?: string;
  coupon?: CouponDefinition;
  discount: number;
  freeDelivery: boolean;
  discountBase: number;
  referrerId?: string;
};

const COUPON_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_TIMEZONE = "Asia/Manila";

function normalizeList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDefinition(input: any): CouponDefinition {
  const code = String(input?.code || "").trim().toUpperCase();
  const type: CouponType = input?.type === "percent" ? "percent" : input?.type === "free_delivery" ? "free_delivery" : "fixed";
  return {
    ...input,
    code,
    value: Math.max(0, number(input?.value)),
    type,
    active: input?.active !== false,
    minCartValue: Math.max(0, number(input?.minCartValue ?? input?.minSubtotal, 0)),
    maxCartValue: input?.maxCartValue === null || input?.maxCartValue === undefined || input?.maxCartValue === "" ? null : Math.max(0, number(input.maxCartValue)),
    minQuantity: Math.max(0, Math.floor(number(input?.minQuantity, 0))),
    eligibleProductIds: normalizeList(input?.eligibleProductIds),
    eligibleSkus: normalizeList(input?.eligibleSkus).map((x) => x.toUpperCase()),
    excludedProductIds: normalizeList(input?.excludedProductIds),
    excludedSkus: normalizeList(input?.excludedSkus).map((x) => x.toUpperCase()),
    eligibleCategories: normalizeList(input?.eligibleCategories).map((x) => x.toLowerCase()),
    excludedCategories: normalizeList(input?.excludedCategories).map((x) => x.toLowerCase()),
    newCustomersOnly: input?.newCustomersOnly === true,
    existingCustomersOnly: input?.existingCustomersOnly === true,
    userIds: normalizeList(input?.userIds),
    emails: normalizeList(input?.emails).map((x) => x.toLowerCase()),
    userGroups: normalizeList(input?.userGroups),
    roles: normalizeList(input?.roles),
    vipTiers: normalizeList(input?.vipTiers),
    firstOrderPerUser: input?.firstOrderPerUser === true,
    maxUses: input?.maxUses === null || input?.maxUses === undefined || input?.maxUses === "" ? null : Math.max(0, Math.floor(number(input.maxUses))),
    maxUsesPerUser: input?.maxUsesPerUser === null || input?.maxUsesPerUser === undefined || input?.maxUsesPerUser === "" ? null : Math.max(0, Math.floor(number(input.maxUsesPerUser))),
    singleUse: input?.singleUse === true,
    startAt: input?.startAt ?? null,
    endAt: input?.endAt ?? null,
    timezone: String(input?.timezone || DEFAULT_TIMEZONE),
    daysOfWeek: Array.isArray(input?.daysOfWeek) ? input.daysOfWeek.map(Number).filter((day: number) => Number.isInteger(day) && day >= 0 && day <= 6) : [],
    startTimeOfDay: input?.startTimeOfDay ? String(input.startTimeOfDay).slice(0, 5) : null,
    endTimeOfDay: input?.endTimeOfDay ? String(input.endTimeOfDay).slice(0, 5) : null,
    exclusive: input?.exclusive === true,
    allowAutomaticDiscounts: input?.allowAutomaticDiscounts !== false,
    allowOtherCoupons: input?.allowOtherCoupons !== false,
    priority: Math.floor(number(input?.priority, 0)),
    deliveryAreas: normalizeList(input?.deliveryAreas).map((x) => x.toLowerCase()),
    fulfillmentMethods: normalizeList(input?.fulfillmentMethods),
    maxDiscount: input?.maxDiscount === null || input?.maxDiscount === undefined || input?.maxDiscount === "" ? null : Math.max(0, number(input.maxDiscount)),
  };
}

export function validateCouponDefinition(input: any): CouponDefinition {
  const definition = normalizeDefinition(input);
  if (!definition.code || !/^[A-Z0-9_-]{3,32}$/.test(definition.code)) throw new Error("Coupon code must be 3-32 characters using A-Z, 0-9, _ or -");
  if (definition.type === "percent" && definition.value > 100) throw new Error("Percent discount cannot exceed 100%");
  if (definition.minCartValue && definition.maxCartValue !== null && definition.maxCartValue < definition.minCartValue) throw new Error("Maximum cart value cannot be lower than minimum cart value");
  if (definition.newCustomersOnly && definition.existingCustomersOnly) throw new Error("New Customers Only and Existing Customers Only cannot both be enabled");
  if (definition.singleUse) definition.maxUses = 1;
  if (definition.startTimeOfDay && !/^([01]\d|2[0-3]):[0-5]\d$/.test(definition.startTimeOfDay)) throw new Error("Start time must be HH:MM");
  if (definition.endTimeOfDay && !/^([01]\d|2[0-3]):[0-5]\d$/.test(definition.endTimeOfDay)) throw new Error("End time must be HH:MM");
  return { ...definition, updatedAt: Date.now() };
}

export function generateCouponCode(prefix = "PRIME", length = 6): string {
  const cleanPrefix = String(prefix || "PRIME").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10) || "PRIME";
  let suffix = "";
  for (let i = 0; i < Math.max(4, Math.min(12, length)); i += 1) {
    suffix += COUPON_ALPHABET[Math.floor(Math.random() * COUPON_ALPHABET.length)];
  }
  return `${cleanPrefix}${suffix}`.slice(0, 32);
}

async function loadCoupon(code: string): Promise<CouponDefinition | null> {
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return null;
  const direct = await firestoreService.getDocument("coupons", normalized);
  if (direct) return normalizeDefinition(direct);
  const discounts = await firestoreService.getDocuments("discounts");
  const legacy = discounts.find((entry: any) => String(entry?.code || "").trim().toUpperCase() === normalized);
  return legacy ? normalizeDefinition(legacy) : null;
}

async function redemptionRecords(code: string): Promise<any[]> {
  return firestoreService.getDocuments("couponRedemptions");
}

function timeContext(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || DEFAULT_TIMEZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const values: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: weekdayMap[values.weekday] ?? now.getDay(), minutes: Number(values.hour || 0) * 60 + Number(values.minute || 0) };
}

function matchesTimeWindow(currentMinutes: number, start?: string | null, end?: string | null) {
  if (!start && !end) return true;
  const parse = (value: string | null | undefined) => {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };
  const startMinutes = parse(start);
  const endMinutes = parse(end);
  if (startMinutes === null || endMinutes === null) return true;
  if (startMinutes <= endMinutes) return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function matchesBogoRule(rule: any, items: CouponCartItem[]) {
  const buyProductIds = normalizeList(rule?.buyProductIds);
  const buySkus = normalizeList(rule?.buySkus).map((x) => x.toUpperCase());
  const requiredQuantity = Math.max(1, Math.floor(number(rule?.buyQuantity, 1)));
  const quantity = items.reduce((sum, item) => {
    const idMatch = buyProductIds.length === 0 || buyProductIds.includes(item.productId);
    const skuMatch = buySkus.length === 0 || buySkus.includes(String(item.sku || "").toUpperCase());
    return sum + (idMatch && skuMatch ? item.quantity : 0);
  }, 0);
  if (quantity < requiredQuantity) return false;
  const rewardIds = normalizeList(rule?.rewardProductIds);
  const rewardQuantity = Math.max(0, Math.floor(number(rule?.rewardQuantity, 0)));
  if (rewardIds.length && rewardQuantity > 0) {
    const rewarded = items.reduce((sum, item) => sum + (rewardIds.includes(item.productId) ? item.quantity : 0), 0);
    if (rewarded < rewardQuantity) return false;
  }
  return true;
}

export async function evaluateCoupon(context: CouponEvaluationContext): Promise<CouponEvaluation> {
  const code = String(context.code || "").trim().toUpperCase();
  if (!code) return { valid: true, discount: 0, freeDelivery: false, discountBase: 0 };
  const coupon = await loadCoupon(code);
  if (!coupon) return { valid: false, error: "Coupon code is invalid or unavailable", discount: 0, freeDelivery: false, discountBase: 0 };
  if (!coupon.active) return { valid: false, error: "Coupon code is inactive", discount: 0, freeDelivery: false, discountBase: 0, coupon };

  const now = context.now || new Date();
  const startAt = parseDate(coupon.startAt);
  const endAt = parseDate(coupon.endAt);
  if (startAt !== null && now.getTime() < startAt) return { valid: false, error: "Coupon is not active yet", discount: 0, freeDelivery: false, discountBase: 0, coupon };
  if (endAt !== null && now.getTime() > endAt) return { valid: false, error: "Coupon has expired", discount: 0, freeDelivery: false, discountBase: 0, coupon };

  const clock = timeContext(now, coupon.timezone || DEFAULT_TIMEZONE);
  if (coupon.daysOfWeek?.length && !coupon.daysOfWeek.includes(clock.weekday)) return { valid: false, error: "Coupon is not available today", discount: 0, freeDelivery: false, discountBase: 0, coupon };
  if (!matchesTimeWindow(clock.minutes, coupon.startTimeOfDay, coupon.endTimeOfDay)) return { valid: false, error: "Coupon is outside its active time window", discount: 0, freeDelivery: false, discountBase: 0, coupon };

  if (context.subtotal < number(coupon.minCartValue, 0)) return { valid: false, error: `Minimum cart value is PHP ${number(coupon.minCartValue).toFixed(2)}`, discount: 0, freeDelivery: false, discountBase: 0, coupon };
  if (coupon.maxCartValue !== null && context.subtotal > number(coupon.maxCartValue)) return { valid: false, error: `Maximum eligible cart value is PHP ${number(coupon.maxCartValue).toFixed(2)}`, discount: 0, freeDelivery: false, discountBase: 0, coupon };
  const cartQuantity = context.items.reduce((sum, item) => sum + item.quantity, 0);
  if (cartQuantity < number(coupon.minQuantity, 0)) return { valid: false, error: `Minimum quantity is ${number(coupon.minQuantity)}`, discount: 0, freeDelivery: false, discountBase: 0, coupon };

  if (coupon.eligibleProductIds?.length || coupon.eligibleSkus?.length || coupon.eligibleCategories?.length) {
    const matches = context.items.some((item) =>
      (coupon.eligibleProductIds?.length ? coupon.eligibleProductIds.includes(item.productId) : false) ||
      (coupon.eligibleSkus?.length ? coupon.eligibleSkus.includes(String(item.sku || "").toUpperCase()) : false) ||
      (coupon.eligibleCategories?.length ? coupon.eligibleCategories.includes(String(item.category || "").toLowerCase()) : false),
    );
    if (!matches) return { valid: false, error: "No eligible products in the cart", discount: 0, freeDelivery: false, discountBase: 0, coupon };
  }

  const bogoRules = Array.isArray(coupon.bogoRules) ? coupon.bogoRules : [];
  if (bogoRules.length && !bogoRules.every((rule) => matchesBogoRule(rule, context.items))) return { valid: false, error: "Coupon bundle / BOGO requirement is not met", discount: 0, freeDelivery: false, discountBase: 0, coupon };

  const excludedProductIds = new Set(coupon.excludedProductIds || []);
  const excludedSkus = new Set(coupon.excludedSkus || []);
  const excludedCategories = new Set(coupon.excludedCategories || []);
  const baseItems = context.items.filter((item) => {
    if (excludedProductIds.has(item.productId)) return false;
    if (excludedSkus.has(String(item.sku || "").toUpperCase())) return false;
    if (excludedCategories.has(String(item.category || "").toLowerCase())) return false;
    const includedByPositiveRule = Boolean(coupon.eligibleProductIds?.length || coupon.eligibleSkus?.length || coupon.eligibleCategories?.length);
    if (!includedByPositiveRule) return true;
    return Boolean(
      (coupon.eligibleProductIds?.length && coupon.eligibleProductIds.includes(item.productId)) ||
      (coupon.eligibleSkus?.length && coupon.eligibleSkus.includes(String(item.sku || "").toUpperCase())) ||
      (coupon.eligibleCategories?.length && coupon.eligibleCategories.includes(String(item.category || "").toLowerCase())),
    );
  });
  const discountBase = roundMoney(baseItems.reduce((sum, item) => sum + item.subtotal, 0));
  if (discountBase <= 0) return { valid: false, error: "No eligible cart value remains after exclusions", discount: 0, freeDelivery: false, discountBase: 0, coupon };

  const customer = context.customer || {};
  const orderCount = Math.max(0, number(customer.orderCount, 0));
  if (coupon.newCustomersOnly && orderCount > 0) return { valid: false, error: "Coupon is for new customers only", discount: 0, freeDelivery: false, discountBase, coupon };
  if (coupon.existingCustomersOnly && orderCount === 0) return { valid: false, error: "Coupon is for existing customers only", discount: 0, freeDelivery: false, discountBase, coupon };
  if (coupon.userIds?.length && !coupon.userIds.includes(context.userId)) return { valid: false, error: "Coupon is restricted to selected customers", discount: 0, freeDelivery: false, discountBase, coupon };
  const email = String(customer.email || "").toLowerCase();
  if (coupon.emails?.length && !coupon.emails.includes(email)) return { valid: false, error: "Coupon is restricted to an approved email list", discount: 0, freeDelivery: false, discountBase, coupon };
  const group = String(customer.userGroup || customer.group || customer.customerGroup || "");
  const role = String(customer.role || customer.userRole || "");
  if (coupon.userGroups?.length && !coupon.userGroups.includes(group)) return { valid: false, error: "Coupon is restricted to selected customer groups", discount: 0, freeDelivery: false, discountBase, coupon };
  if (coupon.roles?.length && !coupon.roles.includes(role)) return { valid: false, error: "Coupon is restricted to selected roles", discount: 0, freeDelivery: false, discountBase, coupon };
  if (coupon.vipTiers?.length && !coupon.vipTiers.includes(String(customer.vipTier || "Bronze"))) return { valid: false, error: "Coupon is restricted to selected VIP tiers", discount: 0, freeDelivery: false, discountBase, coupon };

  const redemptions = await redemptionRecords(coupon.code);
  const userRedemptions = redemptions.filter((entry) => String(entry.userId) === context.userId && String(entry.code).toUpperCase() === coupon.code);
  if (coupon.firstOrderPerUser && userRedemptions.length > 0) return { valid: false, error: "Coupon has already been used by this customer", discount: 0, freeDelivery: false, discountBase, coupon };
  if (coupon.singleUse && redemptions.some((entry) => String(entry.code).toUpperCase() === coupon.code)) return { valid: false, error: "Coupon has already been redeemed", discount: 0, freeDelivery: false, discountBase, coupon };
  if (coupon.maxUses !== null && coupon.maxUses !== undefined && redemptions.filter((entry) => String(entry.code).toUpperCase() === coupon.code).length >= coupon.maxUses) return { valid: false, error: "Coupon usage limit has been reached", discount: 0, freeDelivery: false, discountBase, coupon };
  if (coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined && userRedemptions.length >= coupon.maxUsesPerUser) return { valid: false, error: "You have reached the redemption limit for this coupon", discount: 0, freeDelivery: false, discountBase, coupon };

  if (coupon.exclusive && ((context.automaticDiscountCodes?.length || 0) > 0 || (context.otherCouponCodes?.length || 0) > 0)) return { valid: false, error: "Coupon cannot be combined with other discounts", discount: 0, freeDelivery: false, discountBase, coupon };
  if (!coupon.allowAutomaticDiscounts && (context.automaticDiscountCodes?.length || 0) > 0) return { valid: false, error: "Coupon cannot be combined with automatic discounts", discount: 0, freeDelivery: false, discountBase, coupon };
  if (!coupon.allowOtherCoupons && (context.otherCouponCodes?.length || 0) > 0) return { valid: false, error: "Coupon cannot be combined with another coupon", discount: 0, freeDelivery: false, discountBase, coupon };

  const addressHaystack = `${context.deliveryAddress || ""} ${context.deliveryArea || ""}`.toLowerCase();
  if (coupon.deliveryAreas?.length && !coupon.deliveryAreas.some((area) => addressHaystack.includes(area))) return { valid: false, error: "Coupon is not valid for this delivery area", discount: 0, freeDelivery: false, discountBase, coupon };
  if (coupon.fulfillmentMethods?.length && !coupon.fulfillmentMethods.includes(String(context.fulfillmentMethod || ""))) return { valid: false, error: "Coupon is not valid for this fulfillment method", discount: 0, freeDelivery: false, discountBase, coupon };

  let discount = 0;
  if (coupon.type === "percent") discount = roundMoney(discountBase * coupon.value / 100);
  else if (coupon.type === "fixed") discount = roundMoney(Math.min(discountBase, coupon.value));
  if (coupon.maxDiscount !== null && coupon.maxDiscount !== undefined) discount = Math.min(discount, coupon.maxDiscount);

  return {
    valid: true,
    coupon,
    discount: roundMoney(discount),
    freeDelivery: coupon.type === "free_delivery",
    discountBase,
  };
}

export async function recordCouponRedemption(code: string, userId: string, orderId: string, discount: number) {
  if (!code || !userId || !orderId) return;
  const id = `${code.toUpperCase()}_${userId}_${orderId}`.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 140);
  await firestoreService.setDocument("couponRedemptions", id, {
    id,
    code: code.toUpperCase(),
    userId,
    orderId,
    discount: roundMoney(discount),
    redeemedAt: Date.now(),
  }, true);
}

export async function listCoupons(): Promise<CouponDefinition[]> {
  const coupons = await firestoreService.getDocuments("coupons");
  return coupons.map(normalizeDefinition).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export async function getCoupon(code: string): Promise<CouponDefinition | null> {
  return loadCoupon(code);
}
