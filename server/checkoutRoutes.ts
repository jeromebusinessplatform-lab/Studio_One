import crypto from "node:crypto";
import type { Application, Request, Response } from "express";
import { cert, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const TG_COOKIE = "prime_telegram_session";
const TG_TTL_MS = 24 * 60 * 60 * 1000;
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || "ai-studio-primecommerce-f59766ab-326b-40a2-bcc8-eae7f46dfe5f";
const TAX_RATE = 0.05;
const FREE_DELIVERY_THRESHOLD = 2500;
const FALLBACK_COURIERS: Record<string, any> = {
  "courier-1": { name: "PRIME In-House Express", baseFare: 60, baseDistanceKm: 4, perKmCharge: 12, platformFeeEnabled: false, platformFee: 0, nightDifferentialEnabled: true, nightDifferentialFee: 30, surchargeEnabled: false, surchargeFee: 0, isAvailable: true },
  "courier-2": { name: "Lalamove 2-Wheel", baseFare: 70, baseDistanceKm: 3, perKmCharge: 15, platformFeeEnabled: true, platformFee: 10, nightDifferentialEnabled: true, nightDifferentialFee: 40, surchargeEnabled: true, surchargeFee: 20, isAvailable: true },
  "courier-3": { name: "GrabExpress Flash", baseFare: 80, baseDistanceKm: 5, perKmCharge: 18, platformFeeEnabled: true, platformFee: 15, nightDifferentialEnabled: false, nightDifferentialFee: 0, surchargeEnabled: false, surchargeFee: 0, isAvailable: true },
};

type PaymentMethod = "TELEGRAM_PAY" | "DIRECT_TRANSFER";
type DeliveryPaymentOption = "PAY_AT_CHECKOUT" | "PAY_UPON_FULFILLMENT";

function db() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (raw?.trim()) initializeApp({ credential: cert(JSON.parse(raw)) });
    else initializeApp({ credential: applicationDefault() });
  }
  return getFirestore(DATABASE_ID);
}

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function telegramUserId(req: Request): string | null {
  const token = cookie(req, TG_COOKIE);
  const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
  if (!token || !secret) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^telegram:(\d+):(\d+)$/);
    if (!match || Number(match[2]) < Date.now()) return null;
    return sign(payload, secret) === signature ? match[1] : null;
  } catch {
    return null;
  }
}

function number(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateCourierCharge(courier: any, distanceKm: number) {
  let charge = number(courier.baseFare);
  charge += Math.max(0, distanceKm - number(courier.baseDistanceKm, 0)) * number(courier.perKmCharge);
  if (courier.platformFeeEnabled) charge += number(courier.platformFee);
  if (courier.surchargeEnabled) charge += number(courier.surchargeFee);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }).format(new Date()));
  if (courier.nightDifferentialEnabled && (hour >= 22 || hour < 5)) charge += number(courier.nightDifferentialFee);
  return roundMoney(Math.max(0, charge));
}

function validateItems(input: any) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 100) throw new Error("Checkout contains no valid items");
  return input.map((item) => {
    const productId = String(item?.productId || "").trim();
    const quantity = Number(item?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("Invalid checkout item");
    return { productId, quantity };
  });
}

async function buildQuote(input: any) {
  const items = validateItems(input.items);
  const firestore = db();
  const productRefs = items.map((item) => firestore.collection("products").doc(item.productId));
  const snapshots = await Promise.all(productRefs.map((ref) => ref.get()));
  const normalizedItems: any[] = [];
  let subtotal = 0;
  for (let i = 0; i < snapshots.length; i += 1) {
    const snap = snapshots[i];
    const item = items[i];
    if (!snap.exists) throw new Error(`Product ${item.productId} is no longer available`);
    const product: any = snap.data() || {};
    const stock = number(product.stock);
    if (product.available === false || stock < item.quantity) throw new Error(`${String(product.name || item.productId)} is out of stock`);
    const unitPrice = number(product.bundleCalculatedPrice ?? product.salePrice ?? product.price, NaN);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`Invalid price configuration for ${String(product.name || item.productId)}`);
    const lineSubtotal = roundMoney(unitPrice * item.quantity);
    subtotal = roundMoney(subtotal + lineSubtotal);
    normalizedItems.push({ productId: item.productId, productName: String(product.name || item.productId), quantity: item.quantity, unitPrice, subtotal: lineSubtotal, stock });
  }

  const courierId = String(input.deliveryProviderId || "").trim();
  const distanceKm = number(input.distanceKm, NaN);
  if (!courierId) throw new Error("Select a delivery provider");
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > 500) throw new Error("Invalid delivery distance");
  const courierSnap = await firestore.collection("couriers").doc(courierId).get();
  const courier: any = courierSnap.exists ? courierSnap.data() || {} : FALLBACK_COURIERS[courierId];
  if (!courier) throw new Error("Selected delivery provider is unavailable");
  if (courier.isAvailable !== true) throw new Error("Selected delivery provider is currently unavailable");

  const deliveryCharge = subtotal > FREE_DELIVERY_THRESHOLD ? 0 : calculateCourierCharge(courier, distanceKm);
  const deliveryPaymentOption: DeliveryPaymentOption = input.deliveryPaymentOption === "PAY_UPON_FULFILLMENT" ? "PAY_UPON_FULFILLMENT" : "PAY_AT_CHECKOUT";
  const deliveryDueNow = deliveryPaymentOption === "PAY_UPON_FULFILLMENT" ? 0 : deliveryCharge;

  const chargesSnap = await firestore.collection("charges").get();
  const charges = roundMoney(chargesSnap.docs.reduce((sum, doc) => {
    const charge: any = doc.data();
    if (charge.active !== true) return sum;
    const amount = number(charge.amount);
    return sum + (charge.type === "percent" ? subtotal * amount / 100 : amount);
  }, 0));
  const tax = roundMoney((subtotal + charges) * TAX_RATE);
  const total = roundMoney(subtotal + charges + tax + deliveryDueNow);
  const fulfillmentTotal = roundMoney(subtotal + charges + tax + deliveryCharge);
  return { items, normalizedItems, subtotal, charges, tax, deliveryCharge, deliveryDueNow, fulfillmentTotal, total, courier: { id: courierSnap.exists ? courierSnap.id : courierId, name: String(courier.name || "Delivery Provider") }, distanceKm, deliveryPaymentOption };
}

function setTelegramSession(res: Response, userId: string) {
  const expires = Date.now() + TG_TTL_MS;
  const payload = `telegram:${userId}:${expires}`;
  const secret = process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "";
  const token = `${Buffer.from(payload).toString("base64url")}.${sign(payload, secret)}`;
  res.setHeader("Set-Cookie", `${TG_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}Max-Age=${Math.floor(TG_TTL_MS / 1000)}`);
}

export function installCheckoutRoutes(app: Application) {
  app.post("/api/checkout/quote", async (req, res) => {
    const tg = telegramUserId(req);
    if (!tg) return res.status(401).json({ error: "Verified Telegram identity required" });
    try {
      const quote = await buildQuote(req.body || {});
      return res.json({ quote: { subtotal: quote.subtotal, charges: quote.charges, tax: quote.tax, deliveryCharge: quote.deliveryCharge, deliveryDueNow: quote.deliveryDueNow, total: quote.total, fulfillmentTotal: quote.fulfillmentTotal, distanceKm: quote.distanceKm, deliveryPaymentOption: quote.deliveryPaymentOption, courierName: quote.courier.name, currency: "PHP" } });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to calculate checkout quote" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    const tg = telegramUserId(req);
    if (!tg) return res.status(401).json({ error: "Verified Telegram identity required" });
    try {
      const input = req.body || {};
      const receiverName = String(input.receiverName || "").trim();
      const contactNumber = String(input.contactNumber || "").trim();
      const deliveryAddress = String(input.deliveryAddress || "").trim();
      const paymentMethodName = String(input.paymentMethodName || "").trim();
      if (receiverName.length < 2 || receiverName.length > 120) throw new Error("Invalid receiver name");
      if (!/^[0-9+()\-\s]{7,30}$/.test(contactNumber)) throw new Error("Invalid contact phone number");
      if (deliveryAddress.length < 5 || deliveryAddress.length > 500) throw new Error("Invalid delivery address");
      if (!["Telegram Pay", "Direct Transfer / GCash / Maya"].includes(paymentMethodName)) throw new Error("Invalid payment method");
      const deliveryPaymentOption: DeliveryPaymentOption = input.deliveryPaymentOption === "PAY_UPON_FULFILLMENT" ? "PAY_UPON_FULFILLMENT" : "PAY_AT_CHECKOUT";
      const paymentMethod: PaymentMethod = paymentMethodName === "Telegram Pay" ? "TELEGRAM_PAY" : "DIRECT_TRANSFER";
      const quote = await buildQuote({ ...input, deliveryPaymentOption });
      if (paymentMethod === "DIRECT_TRANSFER" && !input.receiptUrl) throw new Error("Payment proof is required for direct transfer");

      const firestore = db();
      const customerRef = firestore.collection("customers").doc(tg);
      const orderRef = firestore.collection("orders").doc();
      const now = FieldValue.serverTimestamp();
      const orderNumber = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;

      const result = await firestore.runTransaction(async (tx) => {
        for (const item of quote.items) {
          const productRef = firestore.collection("products").doc(item.productId);
          const productSnap = await tx.get(productRef);
          if (!productSnap.exists) throw new Error(`${item.productName} is no longer available`);
          const product: any = productSnap.data() || {};
          const currentStock = number(product.stock);
          if (product.available === false || currentStock < item.quantity) throw new Error(`${item.productName} does not have enough stock`);
          const authoritativeUnitPrice = number(product.bundleCalculatedPrice ?? product.salePrice ?? product.price, NaN);
          if (!Number.isFinite(authoritativeUnitPrice) || authoritativeUnitPrice < 0 || roundMoney(authoritativeUnitPrice) !== roundMoney(item.unitPrice)) throw new Error(`Pricing changed for ${item.productName}. Please review your cart again.`);
          tx.update(productRef, { stock: currentStock - item.quantity, updatedAt: now });
        }
        tx.set(customerRef, { id: tg, telegramUserId: tg, telegramDisplayName: String(input.telegramDisplayName || receiverName).slice(0, 120), telegramUsername: input.telegramUsername ? String(input.telegramUsername).slice(0, 64) : null, primeMemberId: `PC${tg.slice(0, 8).toUpperCase()}`, vipTier: "Bronze", updatedAt: now }, { merge: true });
        const estimatedWaitingMinutes = Math.max(15, Math.ceil(number(input.estimatedWaitingMinutes, 15)));
        const order = {
          telegramUserId: tg,
          telegramDisplayName: String(input.telegramDisplayName || receiverName).slice(0, 120),
          telegramUsername: input.telegramUsername ? String(input.telegramUsername).slice(0, 64) : null,
          orderNumber,
          items: quote.normalizedItems.map(({ stock, ...item }) => item),
          subtotal: quote.subtotal,
          discount: 0,
          charges: quote.charges,
          tax: quote.tax,
          deliveryFee: quote.deliveryCharge,
          deliveryDueNow: quote.deliveryDueNow,
          total: quote.total,
          fulfillmentTotal: quote.fulfillmentTotal,
          receiverName,
          contactNumber,
          deliveryAddress,
          courierName: quote.courier.name,
          deliveryProviderId: quote.courier.id,
          deliveryCharge: quote.deliveryCharge,
          deliveryPaymentMethod: deliveryPaymentOption,
          deliveryPaymentOption,
          paymentMethodName,
          paymentStatus: "PENDING",
          orderStatus: "REVIEW",
          queuePosition: 0,
          estimatedWaitingMinutes,
          estimatedDispatchTime: input.estimatedDispatchTime ? String(input.estimatedDispatchTime).slice(0, 64) : "CALCULATING",
          adminNotes: input.adminNotes ? String(input.adminNotes).slice(0, 160) : null,
          receiptUrl: input.receiptUrl ? String(input.receiptUrl).slice(0, 8_000_000) : null,
          receiptOcrData: input.receiptOcrData || null,
          distanceKm: quote.distanceKm,
          createdAt: now,
          updatedAt: now,
        };
        tx.set(orderRef, order);
        return { ...order, id: orderRef.id };
      });
      setTelegramSession(res, tg);
      return res.status(201).json({ order: result });
    } catch (error: any) {
      console.error("Hardened checkout order error:", error);
      return res.status(400).json({ error: error?.message || "Unable to create order" });
    }
  });
}
