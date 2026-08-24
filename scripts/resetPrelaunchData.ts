import { firestoreService } from "../server/firestoreService.js";

const REQUIRED_CONFIRMATION = "RESET_ALL_TRANSACTIONAL_DATA";

function resetUsageFields(record: Record<string, any>) {
  const next = { ...record };
  const zeroFields = ["usageCount", "usedCount", "redemptionCount", "redemptionsCount", "totalUses", "currentUses"];
  const emptyArrayFields = ["usedBy", "redeemedBy", "redemptions", "usageHistory"];
  for (const field of zeroFields) if (field in next) next[field] = 0;
  for (const field of emptyArrayFields) if (field in next) next[field] = [];
  return next;
}

function resetCustomerTransactionalState(customer: Record<string, any>) {
  return {
    ...customer,
    points: 0,
    totalPoints: 0,
    pointsBalance: 0,
    orderCount: 0,
    totalSpending: 0,
    totalDiscounts: 0,
    appliedDiscounts: [],
    referrals: 0,
    referees: [],
    referredBy: null,
    vipTier: "Bronze",
    updatedAt: Date.now(),
  };
}

async function main() {
  if (process.env.PRELAUNCH_RESET_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Refusing to run. Set PRELAUNCH_RESET_CONFIRM=${REQUIRED_CONFIRMATION} explicitly before executing this one-time pre-launch reset.`,
    );
  }

  const [customers, discounts, promos] = await Promise.all([
    firestoreService.getDocuments("customers", true),
    firestoreService.getDocuments("discounts", true),
    firestoreService.getDocuments("promos", true),
  ]);

  console.log(`Pre-launch reset: ${customers.length} customers, ${discounts.length} discounts, ${promos.length} promos`);

  // Delete all mock/test transaction and activity records. Product/catalog/configuration records are untouched.
  for (const collection of ["orders", "notifications", "referrals"]) {
    const records = await firestoreService.getDocuments(collection, true);
    for (const record of records) await firestoreService.deleteDocument(collection, String(record.id));
    console.log(`Deleted ${records.length} records from ${collection}`);
  }

  // Preserve every customer's Telegram identity and PRIME MID; clear only transactional/loyalty state.
  for (const customer of customers) {
    const reset = resetCustomerTransactionalState(customer);
    await firestoreService.setDocument("customers", String(customer.id), reset, true);
  }

  // Preserve discount/promo definitions while resetting usage counters/history.
  for (const discount of discounts) {
    const reset = resetUsageFields(discount);
    await firestoreService.setDocument("discounts", String(discount.id), reset, true);
  }
  for (const promo of promos) {
    const reset = resetUsageFields(promo);
    await firestoreService.setDocument("promos", String(promo.id), reset, true);
  }

  await firestoreService.setDocument(
    "systemConfig",
    "prelaunch-reset-v1",
    {
      id: "prelaunch-reset-v1",
      completedAt: Date.now(),
      scope: "transactional-test-data",
      note: "One-time pre-launch reset. Member identity and PRIME MIDs preserved.",
    },
    false,
  );

  console.log("Pre-launch transactional reset completed successfully.");
}

main().catch((error) => {
  console.error("Pre-launch reset failed:", error);
  process.exitCode = 1;
});
