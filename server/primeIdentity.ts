import crypto from "node:crypto";
import { firestoreService } from "./firestoreService.js";

const MID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MIGRATION_ID = "prime-identity-v9-mid-is-referral-code";
let migrationPromise: Promise<void> | null = null;

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
  return generateUniqueCode(10, used);
}

export function isLegacyPrimeMemberId(value: unknown): value is string {
  return typeof value === "string" && /^PC/i.test(value.trim());
}

export function isValidPrimeMemberId(value: unknown): value is string {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return /^[A-Z0-9]{10}$/.test(normalized) && !isLegacyPrimeMemberId(normalized);
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

export async function ensureCustomerPrimeMemberId(customerId: string, telegramUserId?: string, existingCustomer?: any): Promise<string | null> {
  const id = String(customerId || "").trim();
  if (!id) return null;
  const customer = existingCustomer || await rawGetDocument("customers", id);
  if (!customer) return null;

  const current = String(customer.primeMemberId || "").trim().toUpperCase();
  const next = await ensureUniquePrimeMemberId(current, id);
  if (next !== current) {
    await rawWriteDocument("customers", id, { primeMemberId: next, referralCode: next, updatedAt: Date.now() }, true);
    const notifications = await rawGetDocuments("notifications");
    const tg = String(telegramUserId || customer.telegramUserId || id);
    const exists = notifications.some((n: any) => String(n.telegramUserId) === tg && String(n.type) === "account" && String(n.migrationVersion || "") === "v9" && String(n.message || "").includes(next));
    if (!exists) {
      await rawAddDocument("notifications", {
        telegramUserId: tg,
        title: "Your PRIME™ Member ID Has Been Migrated",
        message: `Your PRIME™ Member ID has been migrated to ${next}. Your PRIME Member ID is also your Referral Code.`,
        type: "account",
        iconName: "ShieldAlert",
        color: "#2563eb",
        read: false,
        migrationVersion: "v9",
        createdAt: Date.now(),
      });
    }
  } else if (String(customer.referralCode || "").trim().toUpperCase() !== current) {
    await rawWriteDocument("customers", id, { referralCode: current, updatedAt: Date.now() }, true);
  }
  return next;
}

export async function repairCustomerPrimeRecord(customer: any): Promise<any> {
  const id = String(customer?.id || customer?.telegramUserId || "").trim();
  if (!id) return customer;
  const repairedMid = await ensureCustomerPrimeMemberId(id, String(customer?.telegramUserId || id), customer);
  const normalizedMid = repairedMid || String(customer?.primeMemberId || "").trim().toUpperCase();
  return { ...customer, primeMemberId: normalizedMid, referralCode: normalizedMid, updatedAt: Date.now() };
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
  const suppliedMid = String(incoming.primeMemberId || existing?.primeMemberId || "").trim().toUpperCase();
  incoming.primeMemberId = existing && isValidPrimeMemberId(String(existing.primeMemberId || ""))
    ? String(existing.primeMemberId).trim().toUpperCase()
    : await ensureUniquePrimeMemberId(suppliedMid, id);
  incoming.referralCode = incoming.primeMemberId;
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
      if (isValidPrimeMemberId(beforeMid) && beforeReferral === beforeMid) continue;
      await repairCustomerPrimeRecord(customer);
      repairedCount += 1;
    }
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
