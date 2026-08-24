import { firestoreService } from "./firestoreService.js";

const rawSetDocument = firestoreService.setDocument.bind(firestoreService);
const rawUpdateDocument = firestoreService.updateDocument.bind(firestoreService);
const rawAddDocument = firestoreService.addDocument.bind(firestoreService);

let installed = false;
let activityWriteInProgress = false;

function text(value: unknown, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function customerName(customer: any) {
  return text(customer?.telegramDisplayName, "Your account");
}

async function addActivity(telegramUserId: string, title: string, message: string, type: string, iconName: string, eventKey?: string) {
  const id = text(telegramUserId);
  if (!id || id.startsWith("guest_")) return;

  if (eventKey) {
    const existing = await rawGetNotifications();
    if (existing.some((n: any) => text(n.telegramUserId) === id && text(n.eventKey) === eventKey)) return;
  }

  activityWriteInProgress = true;
  try {
    await rawAddDocument("notifications", {
      telegramUserId: id,
      title,
      message,
      type,
      iconName,
      read: false,
      eventKey: eventKey || null,
      createdAt: Date.now(),
    });
  } finally {
    activityWriteInProgress = false;
  }
}

async function rawGetNotifications() {
  return await firestoreService.getDocuments("notifications");
}

function changed(before: any, after: any, key: string) {
  const previous = text(before?.[key]);
  const next = text(after?.[key]);
  return previous !== next;
}

async function logCustomerActivity(id: string, before: any, after: any) {
  if (!after) return;
  const telegramUserId = text(after.telegramUserId || id);
  const name = customerName(after);

  if (!before) {
    await addActivity(
      telegramUserId,
      "Membership profile created",
      `${name}'s PRIME membership profile is now active. Your VIP tier, points, spending history and PRIME Member ID are stored on this account.`,
      "account",
      "UserPlus",
      `customer-created:${telegramUserId}`,
    );
    return;
  }

  if (changed(before, after, "telegramDisplayName") || changed(before, after, "telegramUsername")) {
    await addActivity(
      telegramUserId,
      "Profile information updated",
      "Your Telegram profile information was synchronized with your PRIME membership record. Your VIP tier, points and spending history were preserved.",
      "account",
      "UserRoundPen",
      `profile-sync:${telegramUserId}:${text(after.updatedAt)}`,
    );
  }

  if (changed(before, after, "lastDeliveryAddress")) {
    await addActivity(
      telegramUserId,
      "Delivery details updated",
      "Your saved delivery address was updated on your PRIME membership profile.",
      "account",
      "MapPinPen",
      `address:${telegramUserId}:${text(after.updatedAt)}`,
    );
  }

  if (changed(before, after, "vipTier")) {
    await addActivity(
      telegramUserId,
      `VIP tier updated to ${text(after.vipTier, "Bronze")}`,
      `Your PRIME VIP tier is now ${text(after.vipTier, "Bronze")}. Your existing points and spending history remain attached to this account.`,
      "account",
      "Crown",
      `vip:${telegramUserId}:${text(after.updatedAt)}`,
    );
  }

  if (changed(before, after, "pointsBalance") || changed(before, after, "points")) {
    const balance = Number(after.pointsBalance ?? after.points ?? 0);
    await addActivity(
      telegramUserId,
      "PRIME points balance updated",
      `Your current PRIME points balance is ${Number.isFinite(balance) ? balance.toLocaleString() : "0"} points.`,
      "account",
      "Coins",
      `points:${telegramUserId}:${text(after.updatedAt)}`,
    );
  }

  if (changed(before, after, "primeMemberId") && text(after.primeMemberId)) {
    await addActivity(
      telegramUserId,
      "PRIME Member ID updated",
      `Your PRIME Member ID is now ${text(after.primeMemberId)}. This identifier remains attached to your Telegram account record.`,
      "account",
      "BadgeCheck",
      `mid:${telegramUserId}:${text(after.primeMemberId)}`,
    );
  }
}

async function logOrderActivity(id: string, before: any, after: any, isCreate: boolean) {
  if (!after) return;
  const telegramUserId = text(after.telegramUserId);
  if (!telegramUserId || telegramUserId.startsWith("guest_")) return;
  const orderNumber = text(after.orderNumber, id);

  if (isCreate) return; // order placement already has a dedicated server notification.

  if (text(before?.orderStatus) !== text(after.orderStatus) && text(after.orderStatus)) {
    await addActivity(
      telegramUserId,
      `Order #${orderNumber} status updated`,
      `Your order status is now ${text(after.orderStatus)}.`,
      "order",
      "PackageCheck",
      `order-status:${orderNumber}:${text(after.orderStatus)}`,
    );
  }

  if (text(before?.paymentStatus) !== text(after.paymentStatus) && text(after.paymentStatus)) {
    await addActivity(
      telegramUserId,
      `Order #${orderNumber} payment updated`,
      `Your payment status is now ${text(after.paymentStatus)}.`,
      "order",
      "ReceiptText",
      `order-payment:${orderNumber}:${text(after.paymentStatus)}`,
    );
  }

  if (text(before?.adminNotes) !== text(after.adminNotes) && text(after.adminNotes)) {
    await addActivity(
      telegramUserId,
      `Order #${orderNumber} received an update`,
      `There is a new update on your order from the PRIME team. Open the order details to review it.`,
      "order",
      "MessageSquareText",
      `order-note:${orderNumber}:${text(after.updatedAt)}`,
    );
  }
}

export function installActivityLogger() {
  if (installed) return;
  installed = true;

  firestoreService.setDocument = async (collection: string, id: string, data: Record<string, any>, merge = true) => {
    if (activityWriteInProgress || !["customers", "orders"].includes(collection)) {
      return rawSetDocument(collection, id, data, merge);
    }
    const before = merge ? await firestoreService.getDocument(collection, id) : null;
    const result = await rawSetDocument(collection, id, data, merge);
    const after = result || (await firestoreService.getDocument(collection, id));

    try {
      if (collection === "customers") await logCustomerActivity(id, before, after);
      else await logOrderActivity(id, before, after, !before);
    } catch (error) {
      console.error("Activity logger customer/order write hook failed:", error);
    }
    return result;
  };

  firestoreService.updateDocument = async (collection: string, id: string, updates: Record<string, any>) => {
    return firestoreService.setDocument(collection, id, updates, true);
  };

  firestoreService.addDocument = async (collection: string, data: Record<string, any>) => {
    if (activityWriteInProgress || !["customers", "orders"].includes(collection)) {
      return rawAddDocument(collection, data);
    }
    return firestoreService.setDocument(collection, data.id || `doc_${Date.now()}`, { ...data, createdAt: data.createdAt || Date.now() }, false);
  };
}
