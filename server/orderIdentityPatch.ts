import { firestoreService } from "./firestoreService.js";

const originalAddDocument = firestoreService.addDocument.bind(firestoreService);

firestoreService.addDocument = async (collection, data) => {
  if (collection === "orders" && data?.telegramUserId) {
    try {
      const customer = await firestoreService.getDocument("customers", String(data.telegramUserId));
      if (customer?.primeMemberId) data = { ...data, primeMemberId: customer.primeMemberId };
    } catch {
      // Keep order creation resilient if the customer profile is temporarily unavailable.
    }
  }
  return originalAddDocument(collection, data);
};
