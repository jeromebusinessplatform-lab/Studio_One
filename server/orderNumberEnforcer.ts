import { firestoreService } from "./firestoreService.js";

const MANILA_TIME_ZONE = "Asia/Manila";
let installed = false;

function formatOrderNumber(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MANILA_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.day}${values.month}${values.year}${values.hour}${values.minute}${values.second}`;
}

async function nextAvailableOrderNumber(): Promise<string> {
  const orders = await firestoreService.getDocuments("orders");
  const used = new Set(orders.map((order: any) => String(order?.orderNumber || "").trim()).filter(Boolean));
  const base = Date.now();

  for (let offsetSeconds = 0; offsetSeconds < 120; offsetSeconds += 1) {
    const candidate = formatOrderNumber(new Date(base + offsetSeconds * 1000));
    if (!used.has(candidate)) return candidate;
  }

  throw new Error("Unable to allocate a unique PRIME Order Number");
}

export function installOrderNumberEnforcer() {
  if (installed) return;
  installed = true;

  const originalAddDocument = firestoreService.addDocument.bind(firestoreService);
  firestoreService.addDocument = async (collection: string, data: Record<string, any>) => {
    if (collection === "orders") {
      const orderNumber = await nextAvailableOrderNumber();
      return originalAddDocument(collection, { ...data, orderNumber });
    }
    return originalAddDocument(collection, data);
  };
}
