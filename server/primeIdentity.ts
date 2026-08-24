import crypto from "node:crypto";
import { firestoreService } from "./firestoreService.js";

const MID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MIGRATION_ID = "prime-mid-v4-read-path-self-healing";
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

export async function ensureUniquePrimeMemberId(candidate: unknown, customerId: string): Promise<string> {
  const proposed = String(candidate || "").trim().toUpperCase();
  const customers = await firestoreService.getDocuments("customers");
  const duplicate = proposed && customers.some((customer: any) => String(customer.id) !== customerId && String(customer.primeMemberId || "").toUpperCase() === proposed);
  if (isValidPrimeMemberId(proposed) && !duplicate) return proposed;
  const used = new Set(customers.map((customer: any) => String(customer.primeMemberId || "").toUpperCase()).filter(Boolean));
  return generatePrimeMemberId(used);
}

async function notifyMidMigration(telegramUserId: string, mid: string) {
  const notifications = await firestoreService.getDocuments("notifications");
  const exists = notifications.some((n: any) =>
    String(n.telegramUserId) === telegramUserId &&
    String(n.type) === "account" &&
    String(n.migrationVersion || "") === "v4" &&
    String(n.message || "").includes(mid),
  );
  if (exists) return;
  await firestoreService.addDocument("notifications", {
    telegramUserId,
    title: "Your PRIME™ Member ID Has Been Migrated",
    message: `Your PRIME™ Member ID has been migrated to ${mid}. This is your new 10-character PRIME™ Member ID for future transactions and support requests.`,
    type: "account",
    iconName: "ShieldAlert",
    color: "#2563eb",
    read: false,
    migrationVersion: "v4",
    createdAt: Date.now(),
  });
}

export async function ensureCustomerPrimeMemberId(customerId: string, telegramUserId?: string): Promise<string | null> {
  const id = String(customerId || "").trim();
  if (!id) return null;
  const customer = await firestoreService.getDocument("customers", id);
  if (!customer) return null;

  const current = String(customer.primeMemberId || "").trim().toUpperCase();
  if (isValidPrimeMemberId(current)) return current;

  const next = await ensureUniquePrimeMemberId(current, id);
  await firestoreService.updateDocument("customers", id, { primeMemberId: next, updatedAt: Date.now() });
  await notifyMidMigration(String(telegramUserId || customer.telegramUserId || id), next);
  return next;
}

export async function selfHealPrimeMemberIds(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const customers = await firestoreService.getDocuments("customers");
    for (const customer of customers) {
      const customerId = String(customer.id || customer.telegramUserId || "").trim();
      if (!customerId || isValidPrimeMemberId(String(customer.primeMemberId || "").toUpperCase())) continue;
      await ensureCustomerPrimeMemberId(customerId, String(customer.telegramUserId || customerId));
    }
    await firestoreService.setDocument("systemConfig", MIGRATION_ID, {
      completedAt: Date.now(),
      customerCount: customers.length,
      version: 4,
    }, false);
  })().catch((error) => {
    migrationPromise = null;
    console.error("PRIME MID self-healing failed:", error);
  });
  return migrationPromise;
}

const originalSetDocument = firestoreService.setDocument.bind(firestoreService);
firestoreService.setDocument = async (collection, id, data, merge = true) => {
  if (collection === "customers" && data?.__skipPrimeMidUniqueness !== true) {
    const existing = await firestoreService.getDocument("customers", id);
    const candidate = String(data?.primeMemberId || "").trim().toUpperCase();
    if (!existing && !isValidPrimeMemberId(candidate)) {
      const used = new Set((await firestoreService.getDocuments("customers")).map((customer: any) => String(customer.primeMemberId || "").toUpperCase()).filter((value) => isValidPrimeMemberId(value)));
      data = { ...data, primeMemberId: generatePrimeMemberId(used) };
    }
  }
  if (data?.__skipPrimeMidUniqueness === true) {
    const { __skipPrimeMidUniqueness: _skip, ...cleanData } = data;
    data = cleanData;
  }
  return originalSetDocument(collection, id, data, merge);
};

export async function migratePrimeMemberIds(): Promise<void> {
  await selfHealPrimeMemberIds();
}
