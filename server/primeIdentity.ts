import crypto from "node:crypto";
import { firestoreService } from "./firestoreService.js";

const MID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MIGRATION_ID = "prime-mid-v2-10-alphanumeric";
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

export async function migratePrimeMemberIds(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    const marker = await firestoreService.getDocument("systemConfig", MIGRATION_ID);
    if (marker?.completedAt) return;

    const customers = await firestoreService.getDocuments("customers");
    const used = new Set<string>();
    const now = Date.now();

    for (const customer of customers) {
      const customerId = String(customer.id || customer.telegramUserId || "").trim();
      if (!customerId) continue;
      const nextMid = generatePrimeMemberId(used);
      used.add(nextMid);
      await firestoreService.setDocument("customers", customerId, {
        primeMemberId: nextMid,
        updatedAt: now,
        __skipPrimeMidUniqueness: true,
      }, true);

      await firestoreService.addDocument("notifications", {
        telegramUserId: String(customer.telegramUserId || customerId),
        title: "Your PRIME MID Has Been Updated",
        message: `Your PRIME Member ID has been securely changed to ${nextMid}. Please use this new 10-character PRIME MID for future PRIME transactions and support requests.`,
        type: "account",
        iconName: "ShieldAlert",
        color: "#2563eb",
        read: false,
        createdAt: now,
      });
    }

    await firestoreService.setDocument("systemConfig", MIGRATION_ID, {
      completedAt: now,
      customerCount: customers.length,
      version: 2,
    }, false);
  })().catch((error) => {
    migrationPromise = null;
    console.error("PRIME MID migration failed:", error);
  });

  return migrationPromise;
}
