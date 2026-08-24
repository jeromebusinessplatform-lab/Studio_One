import crypto from "node:crypto";
import { firestoreService } from "./firestoreService.js";

const MID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MIGRATION_ID = "prime-mid-v6-read-write-boundary-self-healing";
let migrationPromise: Promise<void> | null = null;

export function generatePrimeMemberId(used = new Set<string>()): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const bytes = crypto.randomBytes(10);
    let value = "";
    for (const byte of bytes) value += MID_ALPHABET[byte % MID_ALPHABET.length];
    if (!used.has(value)) return value;
  }
  throw new Error("Unable to generate a unique PRIME MID");
}

export function isValidPrimeMemberId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z0-9]{10}$/.test(value);
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

async function notifyMidMigration(telegramUserId: string, mid: string) {
  const notifications = await rawGetDocuments("notifications");
  const exists = notifications.some((n: any) =>
    String(n.telegramUserId) === telegramUserId &&
    String(n.type) === "account" &&
    String(n.migrationVersion || "") === "v6" &&
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
    migrationVersion: "v6",
    createdAt: Date.now(),
  });
}

export async function ensureCustomerPrimeMemberId(customerId: string, telegramUserId?: string, existingCustomer?: any): Promise<string | null> {
  const id = String(customerId || "").trim();
  if (!id) return null;
  const customer = existingCustomer || await rawGetDocument("customers", id);
  if (!customer) return null;
  const current = String(customer.primeMemberId || "").trim().toUpperCase();
  if (isValidPrimeMemberId(current)) return current;

  const next = await ensureUniquePrimeMemberId(current, id);
  await rawWriteDocument("customers", id, { primeMemberId: next, updatedAt: Date.now() }, true);
  await notifyMidMigration(String(telegramUserId || customer.telegramUserId || id), next);
  return next;
}

export async function repairCustomerPrimeRecord(customer: any): Promise<any> {
  const id = String(customer?.id || customer?.telegramUserId || "").trim();
  if (!id) return customer;
  const mid = String(customer?.primeMemberId || "").trim().toUpperCase();
  if (isValidPrimeMemberId(mid)) return customer;
  const next = await ensureCustomerPrimeMemberId(id, String(customer?.telegramUserId || id), customer);
  return next ? { ...customer, primeMemberId: next, updatedAt: Date.now() } : customer;
}

// Customer reads are self-healing: legacy PC... values are never exposed to the client.
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

// Writes are also guarded. This is critical because Telegram authentication runs on every
// app open and previously wrote PC{telegramId} back into Firestore after migration.
firestoreService.setDocument = async (collection: string, id: string, data: Record<string, any>, merge = true) => {
  if (collection !== "customers") return rawWriteDocument(collection, id, data, merge);
  const existing = await rawGetDocument("customers", id);
  const incoming = { ...data };
  const supplied = String(incoming.primeMemberId || "").trim().toUpperCase();
  if (existing && isValidPrimeMemberId(String(existing.primeMemberId || "").trim().toUpperCase())) {
    incoming.primeMemberId = String(existing.primeMemberId).trim().toUpperCase();
  } else {
    incoming.primeMemberId = await ensureUniquePrimeMemberId(supplied, id);
  }
  return rawWriteDocument(collection, id, incoming, merge);
};

export async function selfHealPrimeMemberIds(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const customers = await rawGetDocuments("customers");
    let migratedCount = 0;
    for (const customer of customers) {
      const before = String(customer?.primeMemberId || "").toUpperCase();
      if (isValidPrimeMemberId(before)) continue;
      await repairCustomerPrimeRecord(customer);
      migratedCount += 1;
    }
    await rawWriteDocument("systemConfig", MIGRATION_ID, {
      completedAt: Date.now(),
      customerCount: customers.length,
      migratedCount,
      version: 6,
    }, false);
  })().catch((error) => {
    migrationPromise = null;
    console.error("PRIME MID self-healing failed:", error);
  });
  return migrationPromise;
}

export async function migratePrimeMemberIds(): Promise<void> {
  await selfHealPrimeMemberIds();
}
