import crypto from "node:crypto";
import { firestoreService } from "./firestoreService.js";

const MID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const REFERRAL_CODE_PREFIX = "REF";
const MIGRATION_ID = "prime-identity-v8-mid-and-referral-code";
let migrationPromise: Promise<void> | null = null;

function generateUniqueCode(alphabet: string, length: number, used: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = crypto.randomBytes(length);
    let value = "";
    for (const byte of bytes) value += alphabet[byte % alphabet.length];
    if (!used.has(value)) return value;
  }
  throw new Error("Unable to generate a unique customer code");
}

export function generatePrimeMemberId(used = new Set<string>()): string {
  return generateUniqueCode(MID_ALPHABET, 10, used);
}

export function generateReferralCode(used = new Set<string>()): string {
  return `${REFERRAL_CODE_PREFIX}${generateUniqueCode(MID_ALPHABET, 7, used)}`;
}

export function isLegacyPrimeMemberId(value: unknown): value is string {
  return typeof value === "string" && /^PC/i.test(value.trim());
}

export function isValidPrimeMemberId(value: unknown): value is string {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9]{10}$/.test(normalized) && !isLegacyPrimeMemberId(normalized);
}

export function isValidReferralCode(value: unknown): value is string {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^REF[A-Z0-9]{7}$/.test(normalized);
}

const rawGetDocument = firestoreService.getDocument.bind(firestoreService);
const rawGetDocuments = firestoreService.getDocuments.bind(firestoreService);
const rawSetMethod = firestoreService.setDocument;
const rawWriteDocument = rawSetMethod.bind({
  ...firestoreService,
  getDocument: rawGetDocument,
  getDocuments: rawGetDocuments,
});
const rawAddDocument = firestoreService.addDocument.bind({
  ...firestoreService,
  setDocument: rawWriteDocument,
  getDocument: rawGetDocument,
  getDocuments: rawGetDocuments,
});

export async function ensureUniquePrimeMemberId(candidate: unknown, customerId: string): Promise<string> {
  const proposed = String(candidate || "").trim().toUpperCase();
  const customers = await rawGetDocuments("customers");
  const duplicate = proposed && customers.some((customer: any) => String(customer.id) !== customerId && String(customer.primeMemberId || "").toUpperCase() === proposed);
  if (isValidPrimeMemberId(proposed) && !duplicate) return proposed;
  const used = new Set(customers.map((customer: any) => String(customer.primeMemberId || "").toUpperCase()).filter(Boolean));
  return generatePrimeMemberId(used);
}

export async function ensureUniqueReferralCode(candidate: unknown, customerId: string): Promise<string> {
  const proposed = String(candidate || "").trim().toUpperCase();
  const customers = await rawGetDocuments("customers");
  const duplicate = proposed && customers.some((customer: any) => String(customer.id) !== customerId && String(customer.referralCode || "").toUpperCase() === proposed);
  if (isValidReferralCode(proposed) && !duplicate) return proposed;
  const used = new Set(customers.map((customer: any) => String(customer.referralCode || "").toUpperCase()).filter(Boolean));
  return generateReferralCode(used);
}

async function ensureReferralRecord(referralCode: string, referrerId: string) {
  const existing = await rawGetDocument("referrals", referralCode);
  if (existing) return;
  await rawWriteDocument("referrals", referralCode, {
    id: referralCode,
    code: referralCode,
    type: "fixed",
    value: 50,
    minSubtotal: 0,
    active: true,
    isReferral: true,
    referrerId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }, false);
}

async function notifyMidMigration(telegramUserId: string, mid: string) {
  const notifications = await rawGetDocuments("notifications");
  const exists = notifications.some((n: any) =>
    String(n.telegramUserId) === telegramUserId &&
    String(n.type) === "account" &&
    String(n.migrationVersion || "") === "v7" &&
    String(n.message || "").includes(mid),
  );
  if (exists) return;
  await rawAddDocument("notifications", {
    telegramUserId,
    title: "Your PRIME™ Member ID Has Been Migrated",
    message: `Your PRIME™ Member ID has been migrated to ${mid}. This is your new 10-character PRIME™ Member ID for future transactions and support requests.`,
    type: "account",
    iconName: "ShieldAlert",
    color: "#2563eb",
    read: false,
    migrationVersion: "v7",
    createdAt: Date.now(),
  });
}

export async function ensureCustomerPrimeMemberId(customerId: string, telegramUserId?: string, existingCustomer?: any): Promise<string | null> {
  const id = String(customerId || "").trim();
  if (!id) return null;
  const customer = existingCustomer || await rawGetDocument("customers", id);
  if (!customer) return null;
  const current = String(customer.primeMemberId || "").trim().toUpperCase();
  const next = await ensureUniquePrimeMemberId(current, id);
  const currentReferral = String(customer.referralCode || "").trim().toUpperCase();
  const nextReferral = await ensureUniqueReferralCode(currentReferral, id);
  await ensureReferralRecord(nextReferral, id);
  if (next !== current || nextReferral !== currentReferral) {
    await rawWriteDocument("customers", id, { primeMemberId: next, referralCode: nextReferral, updatedAt: Date.now() }, true);
    if (next !== current) await notifyMidMigration(String(telegramUserId || customer.telegramUserId || id), next);
  }
  return next;
}

export async function repairCustomerPrimeRecord(customer: any): Promise<any> {
  const id = String(customer?.id || customer?.telegramUserId || "").trim();
  if (!id) return customer;
  const repairedMid = await ensureCustomerPrimeMemberId(id, String(customer?.telegramUserId || id), customer);
  const referralCode = await ensureUniqueReferralCode(customer?.referralCode, id);
  await ensureReferralRecord(referralCode, id);
  return { ...customer, primeMemberId: repairedMid || customer?.primeMemberId, referralCode, updatedAt: Date.now() };
}

firestoreService.getDocument = async (collection: string, id: string) => {
  const document = await rawGetDocument(collection, id);
  if (collection !== "customers" || !document) return document;
  return repairCustomerPrimeRecord(document);
};

firestoreService.getDocuments = async (collection: string, forceRefresh = false) => {
  const documents = await rawGetDocuments(collection, forceRefresh);
  if (collection !== "customers") return documents;
  const repaired: any[] = [];
  for (const customer of documents) repaired.push(await repairCustomerPrimeRecord(customer));
  return repaired;
};

firestoreService.setDocument = async (collection: string, id: string, data: Record<string, any>, merge = true) => {
  if (collection !== "customers") return rawWriteDocument(collection, id, data, merge);
  const existing = await rawGetDocument("customers", id);
  const incoming = { ...data };
  const suppliedMid = String(incoming.primeMemberId || "").trim().toUpperCase();
  const suppliedReferral = String(incoming.referralCode || "").trim().toUpperCase();
  incoming.primeMemberId = existing ? await ensureUniquePrimeMemberId(existing.primeMemberId || suppliedMid, id) : await ensureUniquePrimeMemberId(suppliedMid, id);
  incoming.referralCode = existing ? await ensureUniqueReferralCode(existing.referralCode || suppliedReferral, id) : await ensureUniqueReferralCode(suppliedReferral, id);
  await ensureReferralRecord(incoming.referralCode, String(existing?.telegramUserId || id));
  return rawWriteDocument(collection, id, incoming, merge);
};

export async function selfHealPrimeMemberIds(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const customers = await rawGetDocuments("customers");
    let repairedCount = 0;
    for (const customer of customers) {
      const beforeMid = String(customer?.primeMemberId || "").toUpperCase();
      const beforeReferral = String(customer?.referralCode || "").toUpperCase();
      if (isValidPrimeMemberId(beforeMid) && isValidReferralCode(beforeReferral)) {
        await ensureReferralRecord(beforeReferral, String(customer?.telegramUserId || customer?.id));
        continue;
      }
      await repairCustomerPrimeRecord(customer);
      repairedCount += 1;
    }
    await rawWriteDocument("systemConfig", MIGRATION_ID, {
      completedAt: Date.now(),
      customerCount: customers.length,
      repairedCount,
      version: 8,
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
