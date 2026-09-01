import crypto from "node:crypto";
import { firestoreService } from "./firestoreService.js";

const MID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MIGRATION_ID = "prime-identity-v9-mid-is-referral-code";
const MID_CACHE_TTL_MS = 30_000;
let migrationPromise: Promise<void> | null = null;
let midCache: { expiresAt: number; used: Set<string>; byCustomerId: Map<string, string> } | null = null;

function generateUniqueCode(length: number, used: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = crypto.randomBytes(length);
    let value = "";
    for (const byte of bytes) value += MID_ALPHABET[byte % MID_ALPHABET.length];
    if (!used.has(value)) return value;
  }
  throw new Error("Unable to generate a unique PRIME Member ID");
}

export function generatePrimeMemberId(used = new Set<string>()): string {
  return generateUniqueCode(12, used);
}

export function isLegacyPrimeMemberId(value: unknown): value is string {
  return typeof value === "string" && /^PC/i.test(value.trim());
}

export function isValidPrimeMemberId(value: unknown): value is string {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9]{12}$/.test(normalized) && !isLegacyPrimeMemberId(normalized);
}

// Referral Code intentionally equals PRIME Member ID. Kept as a named validator for route readability.
export function isValidReferralCode(value: unknown): value is string {
  return isValidPrimeMemberId(value);
}

const rawGetDocument = firestoreService.getDocument.bind(firestoreService);
const rawGetDocuments = firestoreService.getDocuments.bind(firestoreService);
const rawSetMethod = firestoreService.setDocument;
const rawWriteDocument = rawSetMethod.bind({
  ...firestoreService,
  getDocument: rawGetDocument,
  getDocuments: rawGetDocuments,
});

async function loadMidCache(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && midCache && midCache.expiresAt > now) return midCache;

  const customers = await rawGetDocuments("customers", forceRefresh);
  const used = new Set<string>();
  const byCustomerId = new Map<string, string>();
  for (const customer of customers) {
    const mid = String(customer?.primeMemberId || "").trim().toUpperCase();
    const id = String(customer?.id || customer?.telegramUserId || "").trim();
    if (id && mid) byCustomerId.set(id, mid);
    if (mid) used.add(mid);
  }

  midCache = { expiresAt: now + MID_CACHE_TTL_MS, used, byCustomerId };
  return midCache;
}

function invalidateMidCache() {
  midCache = null;
}

async function uniqueMidForCustomer(candidate: unknown, customerId: string): Promise<string> {
  const proposed = String(candidate || "").trim().toUpperCase();
  const cache = await loadMidCache();
  const existingForCustomer = cache.byCustomerId.get(customerId);

  if (isValidPrimeMemberId(proposed)) {
    const existingOwner = Array.from(cache.byCustomerId.entries()).find(([id, mid]) => mid === proposed)?.[0];
    if (!existingOwner || existingOwner === customerId) return proposed;
  }

  if (isValidPrimeMemberId(existingForCustomer)) return existingForCustomer;

  const generated = generatePrimeMemberId(cache.used);
  cache.used.add(generated);
  cache.byCustomerId.set(customerId, generated);
  return generated;
}

export async function ensureUniquePrimeMemberId(candidate: unknown, customerId: string): Promise<string> {
  return uniqueMidForCustomer(candidate, customerId);
}

export async function ensureCustomerPrimeMemberId(
  customerId: string,
  telegramUserId?: string,
  existingCustomer?: any,
  options: { writeBack?: boolean } = {},
): Promise<string | null> {
  const id = String(customerId || "").trim();
  if (!id) return null;

  const customer = existingCustomer || await rawGetDocument("customers", id);
  if (!customer) return null;

  const current = String(customer.primeMemberId || "").trim().toUpperCase();
  const next = await ensureUniquePrimeMemberId(current, id);
  const shouldWriteBack = options.writeBack !== false;

  if (next !== current && shouldWriteBack) {
    await rawWriteDocument("customers", id, {
      primeMemberId: next,
      referralCode: next,
      updatedAt: Date.now(),
    }, true);
    invalidateMidCache();
  } else if (current && String(customer.referralCode || "").trim().toUpperCase() !== current && shouldWriteBack) {
    await rawWriteDocument("customers", id, { referralCode: current, updatedAt: Date.now() }, true);
  }

  return next;
}

export async function repairCustomerPrimeRecord(customer: any, options: { writeBack?: boolean } = {}): Promise<any> {
  const id = String(customer?.id || customer?.telegramUserId || "").trim();
  if (!id) return customer;

  const repairedMid = await ensureCustomerPrimeMemberId(
    id,
    String(customer?.telegramUserId || id),
    customer,
    options,
  );
  const normalizedMid = repairedMid || String(customer?.primeMemberId || "").trim().toUpperCase();
  return {
    ...customer,
    primeMemberId: normalizedMid,
    referralCode: normalizedMid,
    ...(normalizedMid !== String(customer?.primeMemberId || "").trim().toUpperCase() ? { updatedAt: Date.now() } : {}),
  };
}

firestoreService.getDocument = async (collection: string, id: string) => {
  const document = await rawGetDocument(collection, id);
  if (collection !== "customers" || !document) return document;
  return repairCustomerPrimeRecord(document, { writeBack: true });
};

firestoreService.getDocuments = async (collection: string, forceRefresh = false) => {
  const documents = await rawGetDocuments(collection, forceRefresh);
  if (collection !== "customers") return documents;

  // Repair the in-memory records using a single shared MID cache rather than
  // re-reading the entire customer collection for every customer.
  await loadMidCache(forceRefresh);
  const repaired: any[] = [];
  for (const customer of documents) {
    repaired.push(await repairCustomerPrimeRecord(customer, { writeBack: true }));
  }
  return repaired;
};

firestoreService.setDocument = async (collection: string, id: string, data: Record<string, any>, merge = true) => {
  if (collection !== "customers") return rawWriteDocument(collection, id, data, merge);

  const existing = await rawGetDocument("customers", id);
  const incoming = { ...data };
  const suppliedMid = String(incoming.primeMemberId || existing?.primeMemberId || "").trim().toUpperCase();

  incoming.primeMemberId = existing && isValidPrimeMemberId(String(existing.primeMemberId || ""))
    ? String(existing.primeMemberId).trim().toUpperCase()
    : await ensureUniquePrimeMemberId(suppliedMid, id);
  incoming.referralCode = incoming.primeMemberId;

  invalidateMidCache();
  return rawWriteDocument(collection, id, incoming, merge);
};

export async function selfHealPrimeMemberIds(): Promise<void> {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const customers = await rawGetDocuments("customers");
    const cache = await loadMidCache(true);
    let repairedCount = 0;

    for (const customer of customers) {
      const beforeMid = String(customer?.primeMemberId || "").toUpperCase();
      const beforeReferral = String(customer?.referralCode || "").toUpperCase();
      if (isValidPrimeMemberId(beforeMid) && beforeReferral === beforeMid) continue;

      const id = String(customer?.id || customer?.telegramUserId || "").trim();
      if (!id) continue;

      let next = beforeMid;
      if (!isValidPrimeMemberId(next) || Array.from(cache.byCustomerId.entries()).some(([owner, mid]) => owner !== id && mid === next)) {
        next = generatePrimeMemberId(cache.used);
        cache.used.add(next);
        cache.byCustomerId.set(id, next);
      }

      await rawWriteDocument("customers", id, {
        primeMemberId: next,
        referralCode: next,
        updatedAt: Date.now(),
      }, true);
      repairedCount += 1;
    }

    invalidateMidCache();
    await rawWriteDocument("systemConfig", MIGRATION_ID, {
      completedAt: Date.now(),
      customerCount: customers.length,
      repairedCount,
      version: 9,
    }, false);
  })().catch((error) => {
    migrationPromise = null;
    console.error("PRIME identity self-healing failed:", error);
  });

  return migrationPromise;
}

export async function migratePrimeMemberIds(): Promise<void> {
  await selfHealPrimeMemberIds();
}
