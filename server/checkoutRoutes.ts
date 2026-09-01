import crypto from "node:crypto";
import type { Application, Request, Response } from "express";
import { firestoreService } from "./firestoreService.js";

const TG_COOKIE = "prime_telegram_session";
const TG_TTL_MS = 24 * 60 * 60 * 1000;
const TAX_RATE = 0.05;
const FALLBACK_COURIERS: Record<string, any> = {
  "courier-1": { name: "PRIME In-House Express", baseFare: 60, baseDistanceKm: 4, perKmCharge: 12, platformFeeEnabled: false, platformFee: 0, nightDifferentialEnabled: true, nightDifferentialFee: 30, surchargeEnabled: false, surchargeFee: 0, isAvailable: true },
  "courier-2": { name: "Lalamove 2-Wheel", baseFare: 70, baseDistanceKm: 3, perKmCharge: 15, platformFeeEnabled: true, platformFee: 10, nightDifferentialEnabled: true, nightDifferentialFee: 40, surchargeEnabled: true, surchargeFee: 20, isAvailable: true },
  "courier-3": { name: "GrabExpress Flash", baseFare: 80, baseDistanceKm: 5, perKmCharge: 18, platformFeeEnabled: true, platformFee: 15, nightDifferentialEnabled: false, nightDifferentialFee: 0, surchargeEnabled: false, surchargeFee: 0, isAvailable: true },
};

type PaymentMethod = "TELEGRAM_PAY" | "DIRECT_TRANSFER";
type DeliveryPaymentOption = "PAY_AT_CHECKOUT" | "PAY_UPON_FULFILLMENT";
type AppliedPromo = { code: string; freeDelivery: boolean; discount: number; referrerId?: string };

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

async function resolvePromoOrReferral(telegramId: string, rawCoupon: unknown, rawReferral: unknown, subtotal: number): Promise<AppliedPromo | null> {
  const coupon = String(rawCoupon || "").trim().toUpperCase();
  const referral = String(rawReferral || "").trim().toUpperCase();
  const code = coupon || referral;
  if (!code) return null;

  if (code.length < 2 || code.length > 64 || !/^[A-Z0-9_-]+$/.test(code)) throw new Error("Invalid coupon or referral code");

  let promo = await firestoreService.getDocument("promos", code);
  if (!promo && coupon) {
    const discounts = await firestoreService.getDocuments("discounts");
    promo = discounts.find((d: any) => d.code?.toUpperCase() === code);
  }
  if (!promo && referral) {
    const referrals = await firestoreService.getDocuments("referrals");
    promo = referrals.find((r: any) => r.code?.toUpperCase() === code);
  }
  if (!promo) {
    const customers = await firestoreService.getDocuments("customers");
    const foundCustomer = customers.find((c: any) => c.primeMemberId?.toUpperCase() === code || c.telegramUserId?.toUpperCase() === code);
    if (foundCustomer) {
      promo = { code, type: "fixed", value: 50, minSubtotal: 0, active: true, freeDelivery: false, isReferral: true, referrerId: foundCustomer.telegramUserId };
    }
  }

  if (!promo) throw new Error("Coupon or referral code is invalid or unavailable");
  if (promo.active === false) throw new Error("Coupon or referral code is inactive");

  const freeDelivery = promo.freeDelivery === true || promo.type === "free_delivery" || (number(promo.value) === 0 && promo.code?.includes("SHIP"));
  const eligible = Array.isArray(promo.eligibleTelegramUserIds) ? promo.eligibleTelegramUserIds.map(String) : [];
  if (eligible.length > 0 && !eligible.includes(telegramId)) throw new Error("This code is not available for your account");
  const minSubtotal = number(promo.minSubtotal, 0);
  if (subtotal < minSubtotal) throw new Error(`This code requires a minimum subtotal of PHP ${minSubtotal.toFixed(2)}`);

  let discount = 0;
  const val = number(promo.value, 0);
  if (promo.type === "percent" || (val <= 100 && promo.type === "percent")) {
    discount = roundMoney(subtotal * val / 100);
  } else if (val > 0) {
    discount = roundMoney(Math.min(subtotal, val));
  }

  return { code, freeDelivery: Boolean(freeDelivery), discount, referrerId: promo.referrerId };
}

async function buildQuote(input: any, telegramId: string) {
  const items = validateItems(input.items);
  const normalizedItems: any[] = [];
  let subtotal = 0;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const product = await firestoreService.getDocument("products", item.productId);
    if (!product) throw new Error(`Product ${item.productId} is no longer available`);
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
  const courier = (await firestoreService.getDocument("couriers", courierId)) || FALLBACK_COURIERS[courierId];
  if (!courier) throw new Error("Selected delivery provider is unavailable");
  if (courier.isAvailable !== true) throw new Error("Selected delivery provider is currently unavailable");

  let promo: AppliedPromo | null = null;
  let promoError: string | null = null;
  try {
    promo = await resolvePromoOrReferral(telegramId, input.couponCode || input.promoCode, input.referralCode, subtotal);
  } catch (err: any) {
    promoError = err?.message || "Invalid coupon or referral code";
    promo = null;
  }
  const discount = promo?.discount ?? 0;
  const discountedSubtotal = roundMoney(Math.max(0, subtotal - discount));
  const deliveryCharge = promo?.freeDelivery ? 0 : calculateCourierCharge(courier, distanceKm);
  const deliveryPaymentOption: DeliveryPaymentOption = input.deliveryPaymentOption === "PAY_UPON_FULFILLMENT" ? "PAY_UPON_FULFILLMENT" : "PAY_AT_CHECKOUT";
  const deliveryDueNow = deliveryPaymentOption === "PAY_UPON_FULFILLMENT" ? 0 : deliveryCharge;

  const chargesList = await firestoreService.getDocuments("charges");
  const charges = roundMoney(chargesList.reduce((sum, charge) => {
    if (charge.active !== true) return sum;
    const amount = number(charge.amount);
    return sum + (charge.type === "percent" ? discountedSubtotal * amount / 100 : amount);
  }, 0));
  const tax = roundMoney((discountedSubtotal + charges) * TAX_RATE);
  const total = roundMoney(discountedSubtotal + charges + tax + deliveryDueNow);
  const fulfillmentTotal = roundMoney(discountedSubtotal + charges + tax + deliveryCharge);
  return { items, normalizedItems, subtotal, discount, charges, tax, deliveryCharge, deliveryDueNow, fulfillmentTotal, total, courier: { id: courier.id || courierId, name: String(courier.name || "Delivery Provider") }, distanceKm, deliveryPaymentOption, promo, promoError };
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
    const tg = telegramUserId(req) || (typeof req.body?.telegramUserId === "string" && req.body.telegramUserId.trim() ? req.body.telegramUserId.trim() : "guest_web_customer");
    try {
      const quote = await buildQuote(req.body || {}, tg);
      return res.json({ 
        quote: { 
          subtotal: quote.subtotal, 
          charges: quote.charges, 
          tax: quote.tax, 
          deliveryCharge: quote.deliveryCharge, 
          deliveryDueNow: quote.deliveryDueNow, 
          total: quote.total, 
          fulfillmentTotal: quote.fulfillmentTotal, 
          distanceKm: quote.distanceKm, 
          deliveryPaymentOption: quote.deliveryPaymentOption, 
          courierName: quote.courier.name, 
          promoCode: quote.promo?.code || null, 
          freeDelivery: Boolean(quote.promo?.freeDelivery), 
          currency: "PHP" 
        },
        promoError: quote.promoError || null
      });
    } catch (error: any) {
      return res.status(400).json({ error: error?.message || "Unable to calculate checkout quote" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    const input = req.body || {};
    const tg = telegramUserId(req) || (typeof input.telegramUserId === "string" && input.telegramUserId.trim() ? input.telegramUserId.trim() : (input.contactNumber ? `guest_${String(input.contactNumber).replace(/\D/g, "").slice(-10)}` : `guest_${Date.now()}`));
    try {
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
      const quote = await buildQuote({ ...input, deliveryPaymentOption }, tg);
      if (paymentMethod === "DIRECT_TRANSFER" && !input.receiptUrl) throw new Error("Payment proof is required for direct transfer");

      const now = Date.now();
      const formatOrderNumber = (date: Date) => {
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Manila",
          day: "2-digit", month: "2-digit", year: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
          hour12: false
        }).formatToParts(date);
        const values: Record<string, string> = {};
        for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
        return `${values.day}${values.month}${values.year}${values.hour}${values.minute}${values.second}`;
      };
      const orderNumber = formatOrderNumber(new Date(now));

      // Update product stocks
      for (const item of quote.normalizedItems) {
        const product = (await firestoreService.getDocument("products", item.productId)) || {};
        const currentStock = number(product.stock);
        if (product.available === false || currentStock < item.quantity) throw new Error(`${item.productName} does not have enough stock`);
        await firestoreService.updateDocument("products", item.productId, {
          stock: Math.max(0, currentStock - item.quantity),
          updatedAt: now,
        });
      }

      const primeMemberId = `PC${tg.slice(0, 8).toUpperCase()}`;
      const existingCustomer = (await firestoreService.getDocument("customers", tg)) || {};
      const orderCount = number(existingCustomer.orderCount, 0) + 1;
      const totalSpending = roundMoney(number(existingCustomer.totalSpending, 0) + quote.total);
      const discountSaved = quote.discount || 0;
      const totalDiscounts = roundMoney(number(existingCustomer.totalDiscounts, 0) + discountSaved);
      const appliedDiscounts = quote.promo?.code ? [
        { code: quote.promo.code, amountSaved: discountSaved, orderNumber, date: now },
        ...(Array.isArray(existingCustomer.appliedDiscounts) ? existingCustomer.appliedDiscounts : [])
      ] : (Array.isArray(existingCustomer.appliedDiscounts) ? existingCustomer.appliedDiscounts : []);

      let vipTier = "Bronze";
      if (totalSpending >= 30000) vipTier = "Platinum";
      else if (totalSpending >= 15000) vipTier = "Gold";
      else if (totalSpending >= 5000) vipTier = "Silver";

      let referredBy = existingCustomer.referredBy || null;
      if (!referredBy && quote.promo?.referrerId && quote.promo.referrerId !== tg) {
        referredBy = quote.promo.referrerId;
        const referrerRecord = await firestoreService.getDocument("customers", referredBy);
        if (referrerRecord) {
          const referees = Array.isArray(referrerRecord.referees) ? referrerRecord.referees : [];
          if (!referees.includes(tg)) {
            referees.push(tg);
            await firestoreService.updateDocument("customers", referredBy, {
              referees,
              referrals: referees.length,
              updatedAt: now,
            });
          }
        }
      }

      await firestoreService.setDocument("customers", tg, {
        id: tg,
        telegramUserId: tg,
        telegramDisplayName: String(input.telegramDisplayName || receiverName).slice(0, 120),
        telegramUsername: input.telegramUsername ? String(input.telegramUsername).slice(0, 64) : null,
        primeMemberId,
        lastDeliveryAddress: deliveryAddress,
        vipTier,
        orderCount,
        totalSpending,
        totalDiscounts,
        appliedDiscounts,
        referredBy,
        updatedAt: now,
      }, true);

      const estimatedWaitingMinutes = Math.max(15, Math.ceil(number(input.estimatedWaitingMinutes, 15)));
      const order = {
        telegramUserId: tg,
        telegramDisplayName: String(input.telegramDisplayName || receiverName).slice(0, 120),
        telegramUsername: input.telegramUsername ? String(input.telegramUsername).slice(0, 64) : null,
        primeMemberId,
        orderNumber,
        items: quote.normalizedItems.map(({ stock, ...item }) => item),
        subtotal: quote.subtotal,
        discount: quote.discount,
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
        promoCode: quote.promo?.code || null,
        freeDeliveryPromo: Boolean(quote.promo?.freeDelivery),
        createdAt: now,
        updatedAt: now,
      };

      const createdOrder = await firestoreService.addDocument("orders", order);

      // Create server notification for order placement
      await firestoreService.addDocument("notifications", {
        telegramUserId: tg,
        title: `Order #${orderNumber} Placed`,
        message: `Your order has been received and is under review. Estimated queue waiting time: ${estimatedWaitingMinutes} mins.`,
        type: "order",
        iconName: "Clock",
        color: "#f97316",
        read: false,
        createdAt: now,
      });

      setTelegramSession(res, tg);
      return res.status(201).json({ order: createdOrder });
    } catch (error: any) {
      console.error("Hardened checkout order error:", error);
      return res.status(400).json({ error: error?.message || "Unable to create order" });
    }
  });
}

