import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Edit2,
  Loader2,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  Tag,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext.tsx";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { useOrders } from "@/hooks/useOrders.ts";
import { useCouriers } from "@/hooks/useCouriers.ts";
import { useAddressAutocomplete } from "@/hooks/useAddressAutocomplete.ts";
import { GeoAddressAutocomplete } from "@/components/GeoAddressAutocomplete.tsx";
import { ReceiptOcrScanner } from "@/components/ReceiptOcrScanner.tsx";
import type { ReceiptOcrResult } from "@/types/ocr.ts";
import { formatCurrency } from "@/lib/utils.ts";

type Step = 1 | 2 | 3 | 4;
type DeliveryPaymentOption = "PAY_AT_CHECKOUT" | "PAY_UPON_FULFILLMENT";
type PaymentMethod = "TELEGRAM_PAY" | "DIRECT_TRANSFER";

type Quote = {
  subtotal: number;
  charges: number;
  tax: number;
  deliveryCharge: number;
  deliveryDueNow: number;
  total: number;
  fulfillmentTotal: number;
  distanceKm: number;
  courierName: string;
  deliveryPaymentOption: DeliveryPaymentOption;
  promoCode?: string | null;
  freeDelivery?: boolean;
};

const STEP_ITEMS = [
  { id: 1 as Step, label: "RECEIVER" },
  { id: 2 as Step, label: "DELIVERY" },
  { id: 3 as Step, label: "REVIEW" },
  { id: 4 as Step, label: "PAYMENT" },
] as const;

// Helper to format Philippine phone numbers cleanly: 0919 123 1122
function formatContactNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
}

export default function CheckoutPage() {
  const { items, subtotal, selectedItems, selectedSubtotal, removeSelectedItems, clearCart } = useCart();
  const { customer } = useTelegram();
  const { orders, createOrder } = useOrders(customer?.telegramUserId);
  const { couriers, calculateDeliveryCharge } = useCouriers();
  const navigate = useNavigate();

  const checkoutItems = selectedItems.length ? selectedItems : items;
  const subtotalNow = selectedItems.length ? selectedSubtotal : subtotal;
  const itemsKey = useMemo(() => checkoutItems.map((i) => `${i.productId}:${i.quantity}`).join("|"), [checkoutItems]);

  const [step, setStep] = useState<Step>(1);

  // Receiver Information - do NOT auto-populate from extracted Telegram context
  const [receiver, setReceiver] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [courierId, setCourierId] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [deliveryPaymentOption, setDeliveryPaymentOption] = useState<DeliveryPaymentOption>("PAY_AT_CHECKOUT");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TELEGRAM_PAY");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptOcrResult | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load recently used addresses persisted from past orders and local storage
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);

  useEffect(() => {
    const storageKey = `prime_recent_addresses_${customer?.telegramUserId || "guest"}`;
    const savedLocal = localStorage.getItem(storageKey);
    let parsed: string[] = [];
    if (savedLocal) {
      try {
        parsed = JSON.parse(savedLocal);
      } catch {
        parsed = [];
      }
    }

    // Merge from customer's previous orders
    const orderAddresses = orders.map((o) => o.deliveryAddress).filter(Boolean);
    const combined = Array.from(new Set([...parsed, ...orderAddresses])).filter(
      (addr) => typeof addr === "string" && addr.trim().length > 3
    );

    setRecentAddresses(combined.slice(0, 5));
  }, [customer?.telegramUserId, orders]);

  const {
    addressInput,
    setAddressInput,
    suggestions,
    isLoading: geoLoading,
    isOpen: geoOpen,
    setIsOpen: setGeoOpen,
    selectedLocation,
    selectSuggestion,
    selectAddressString,
    routeInfo,
    isCalculatingRoute,
    geoConfig,
  } = useAddressAutocomplete("");

  const selectedCourier = couriers.find((c) => c.id === courierId);
  const distanceKm = routeInfo?.distanceKm ?? 0;
  const routeReady = Boolean(routeInfo) && !isCalculatingRoute;
  const fallbackShipping = selectedCourier ? calculateDeliveryCharge(selectedCourier, distanceKm) : 0;
  const fallbackTax = Math.round(subtotalNow * 0.05 * 100) / 100;
  const payable = quote?.total ?? subtotalNow + fallbackTax + (deliveryPaymentOption === "PAY_AT_CHECKOUT" ? fallbackShipping : 0);
  const quoteKey = `${itemsKey}|${courierId}|${distanceKm.toFixed(3)}|${deliveryPaymentOption}|${promoCode.trim().toUpperCase()}`;

  useEffect(() => {
    let cancelled = false;
    if (!customer?.telegramUserId || !selectedCourier || !routeReady || !checkoutItems.length) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    const payload = {
      items: checkoutItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      deliveryProviderId: selectedCourier.id,
      distanceKm,
      deliveryPaymentOption,
      promoCode: promoCode.trim().toUpperCase() || undefined,
    };

    fetch("/api/checkout/quote", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to calculate secure checkout quote");
        if (!data.quote) throw new Error("Checkout quote unavailable");
        return data.quote as Quote;
      })
      .then((nextQuote) => {
        if (!cancelled) setQuote(nextQuote);
      })
      .catch((error: any) => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(error?.message || "Unable to calculate secure checkout quote");
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customer?.telegramUserId, quoteKey, routeReady, checkoutItems.length]);

  const validateReceiver = () => {
    if (!customer?.telegramUserId) {
      toast.error("Open checkout from Telegram or as a guest to continue.");
      return false;
    }
    if (receiver.trim().length < 2) {
      toast.error("Enter the receiver name.");
      return false;
    }
    if (!/^[0-9\s]{10,13}$/.test(phone.trim()) && phone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid 11-digit contact phone number (e.g. 0919 123 1122).");
      return false;
    }
    if (!addressInput.trim() || !selectedLocation) {
      toast.error("Please enter and select a delivery address.");
      return false;
    }
    return true;
  };

  const validateDelivery = () => {
    if (!selectedCourier?.isAvailable) {
      toast.error("Select an available delivery provider.");
      return false;
    }
    if (!routeReady) {
      toast.error("Wait for the delivery route to finish calculating.");
      return false;
    }
    if (quoteLoading || !quote) {
      toast.error(quoteError || "Secure checkout pricing is not ready yet.");
      return false;
    }
    return true;
  };

  const validatePayment = () => {
    if (paymentMethod === "DIRECT_TRANSFER" && !receiptUrl) {
      toast.error("Upload payment proof before submitting.");
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateReceiver()) return;
    if ((step === 2 || step === 3) && !validateDelivery()) return;
    setStep((Math.min(4, step + 1) as Step));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToStep = (target: Step) => {
    if (target < step) {
      setStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (target === 2 && validateReceiver()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === 3 && validateReceiver() && validateDelivery()) {
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (target === 4 && validateReceiver() && validateDelivery()) {
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const submitOrder = async () => {
    if (!validateReceiver() || !validateDelivery() || !validatePayment() || !quote || !checkoutItems.length) return;
    setSubmitting(true);
    try {
      const created = await createOrder({
        telegramDisplayName: customer?.telegramDisplayName || receiver.trim(),
        telegramUsername: customer?.telegramUsername,
        items: checkoutItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        receiverName: receiver.trim().toUpperCase(),
        contactNumber: phone.trim(),
        deliveryAddress: addressInput.trim(),
        deliveryProviderId: selectedCourier?.id,
        distanceKm,
        deliveryPaymentOption,
        promoCode: promoCode.trim().toUpperCase() || undefined,
        paymentMethodName: paymentMethod === "TELEGRAM_PAY" ? "Telegram Pay" : "Direct Transfer / GCash / Maya",
        estimatedWaitingMinutes: routeInfo ? Math.max(15, Math.ceil(routeInfo.durationMinutes) + 12) : 15,
        estimatedDispatchTime: routeInfo ? `${Math.ceil(routeInfo.durationMinutes)} MIN TRANSIT` : "CALCULATING",
        adminNotes: notes.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
        receiptOcrData: ocrResult || undefined,
      });

      // Save confirmed delivery address to persistent recent addresses
      if (addressInput.trim()) {
        const storageKey = `prime_recent_addresses_${customer?.telegramUserId || "guest"}`;
        const updated = Array.from(new Set([addressInput.trim(), ...recentAddresses])).slice(0, 5);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }

      if (selectedItems.length) removeSelectedItems();
      else clearCart();

      toast.success("Order submitted for review.");
      navigate(`/shop/order-confirmation/${created.orderNumber}`, {
        state: {
          orderNumber: created.orderNumber,
          queuePosition: created.queuePosition,
          estimatedWaitingMinutes: created.estimatedWaitingMinutes,
          estimatedDispatchTime: created.estimatedDispatchTime,
          distanceKm: created.distanceKm,
        },
      });
    } catch (error: any) {
      console.error("Hardened checkout submission failed:", error);
      toast.error(error?.message || "Unable to submit the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!checkoutItems.length) {
    return <EmptyCheckout />;
  }

  // Derive Prime Member ID
  const primeMid = customer?.telegramUserId
    ? `PC${customer.telegramUserId.slice(0, 8).toUpperCase()}`
    : "PC-GUEST";

  return (
    <div className="w-full min-h-screen bg-[#f3f4f6] pb-28">
      {/* Top Normalized Checkout Header */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => (step === 1 ? navigate("/shop/cart") : setStep((step - 1) as Step))}
            className="p-1 -ml-1 text-black hover:text-neutral-700 transition cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1
              className="text-black font-normal uppercase text-xl leading-tight"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              CHECKOUT
            </h1>
            <p className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
              Step {step} of 4 • {STEP_ITEMS[step - 1].label}
            </p>
          </div>
        </div>

        {/* Header Right: Subtotal Amount */}
        <div className="text-right">
          <div className="text-[10px] text-neutral-400 uppercase font-semibold font-mono tracking-wider">
            SUBTOTAL
          </div>
          <div className="text-base font-bold text-neutral-950 leading-tight font-mono">
            {formatCurrency(subtotalNow)}
          </div>
        </div>
      </div>

      {/* Step Indicators: Oval Chips with Dark Gray Active State */}
      <div className="bg-white/90 border-b border-neutral-200 px-4 py-2.5 grid grid-cols-4 gap-2">
        {STEP_ITEMS.map((item) => {
          const isCurrent = step === item.id;
          const isPassed = step > item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => goToStep(item.id)}
              className={`py-1.5 px-2 rounded-full text-[10.5px] uppercase font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isCurrent
                  ? "bg-neutral-800 text-white shadow-xs"
                  : isPassed
                  ? "bg-neutral-200 text-neutral-800 hover:bg-neutral-300"
                  : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200/60"
              }`}
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              {isPassed && <Check size={10} className="stroke-[3] shrink-0" />}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Form Body */}
      <div className="p-3.5 space-y-3.5 w-full max-w-full mx-auto">
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goNext();
            }}
            className="space-y-3.5"
          >
            {/* Card 1: CUSTOMER INFORMATION (Uneditable, 2 equal-sized fields per row) */}
            <Card title="CUSTOMER INFORMATION" icon={<User size={15} />}>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    TELEGRAM NAME
                  </span>
                  <input
                    readOnly
                    disabled
                    value={customer?.telegramDisplayName || "GUEST CUSTOMER"}
                    className="w-full bg-neutral-100 border border-neutral-200/90 text-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-medium cursor-not-allowed select-text truncate"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    TELEGRAM HANDLE
                  </span>
                  <input
                    readOnly
                    disabled
                    value={customer?.telegramUsername ? `@${customer.telegramUsername}` : "N/A"}
                    className="w-full bg-neutral-100 border border-neutral-200/90 text-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-medium cursor-not-allowed select-text truncate"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    TELEGRAM UID
                  </span>
                  <input
                    readOnly
                    disabled
                    value={customer?.telegramUserId || "GUEST"}
                    className="w-full bg-neutral-100 border border-neutral-200/90 text-neutral-700 rounded-xl px-3 py-2 text-xs font-mono font-medium cursor-not-allowed select-text truncate"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                    PRIME MID
                  </span>
                  <input
                    readOnly
                    disabled
                    value={primeMid}
                    className="w-full bg-neutral-100 border border-neutral-200/90 text-neutral-900 rounded-xl px-3 py-2 text-xs font-mono font-bold cursor-not-allowed select-text truncate"
                  />
                </div>
              </div>
            </Card>

            {/* Card 2: RECEIVER INFORMATION (2 Editable, required fields in one row) */}
            <Card title="RECEIVER INFORMATION" icon={<User size={15} />}>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-700 uppercase tracking-wider block mb-1">
                    NAME <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value.toUpperCase())}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 outline-none focus:border-black font-mono uppercase placeholder:normal-case placeholder:text-neutral-400"
                    placeholder="JOHN DOE"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-neutral-700 uppercase tracking-wider block mb-1">
                    CONTACT NO. <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(formatContactNumber(e.target.value))}
                    type="tel"
                    maxLength={13}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 outline-none focus:border-black font-mono placeholder:text-neutral-400"
                    placeholder="0919 123 1122"
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Card 3: DELIVERY ADDRESS */}
            <Card title="DELIVERY ADDRESS" icon={<MapPin size={15} />}>
              <GeoAddressAutocomplete
                addressInput={addressInput}
                onAddressChange={setAddressInput}
                suggestions={suggestions}
                recentAddresses={recentAddresses}
                onSelectRecentAddress={(addr) => selectAddressString(addr)}
                isLoading={geoLoading}
                isOpen={geoOpen}
                setIsOpen={setGeoOpen}
                selectedLocation={selectedLocation}
                onSelectSuggestion={selectSuggestion}
                routeInfo={routeInfo}
                isCalculatingRoute={isCalculatingRoute}
                warehouseName={geoConfig?.warehouse.name}
                hasGeoapifyKey={geoConfig?.hasApiKey}
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 160))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 outline-none focus:border-black resize-none mt-2 font-normal placeholder:text-neutral-400"
                rows={2}
                placeholder="Gate, unit, building landmark, or delivery notes (optional)"
              />
            </Card>

            <div className="pt-1">
              <PrimaryButton label="Continue to Delivery" />
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goNext();
            }}
            className="space-y-3.5"
          >
            <Card title="DELIVERY PROVIDER" icon={<Truck size={15} />}>
              <p className="text-[11px] text-neutral-500 -mt-1 font-normal">
                Select your preferred courier service:
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {couriers.map((courier) => {
                  const isSelected = courier.id === courierId;
                  const charge = calculateDeliveryCharge(courier, distanceKm);
                  return (
                    <button
                      key={courier.id}
                      type="button"
                      disabled={!courier.isAvailable}
                      onClick={() => setCourierId(courier.id)}
                      className={`relative min-h-[88px] rounded-xl border p-2 flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? "bg-neutral-900 text-white border-black shadow-xs"
                          : "bg-white border-neutral-200 hover:border-neutral-300"
                      } ${courier.isAvailable ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                    >
                      <img src={courier.logoUrl} alt={courier.name} className="w-8 h-8 object-contain mb-1" />
                      <span className="text-[9.5px] font-semibold text-center leading-tight line-clamp-1">
                        {courier.name}
                      </span>
                      <span className={`text-[10px] font-bold mt-1 ${isSelected ? "text-emerald-300" : "text-neutral-900"}`}>
                        {charge ? formatCurrency(charge) : "FREE PROMO"}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xs">
                          <Check size={10} className="stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedCourier && routeInfo && (
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs flex items-center justify-between text-neutral-700">
                  <span className="flex items-center gap-1.5 text-neutral-500">
                    <MapPin size={13} /> Distance
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {distanceKm.toFixed(1)} km • ~{Math.ceil(routeInfo.durationMinutes)} mins transit
                  </span>
                </div>
              )}

              {/* Promo code field */}
              <div className="p-2.5 rounded-xl bg-white border border-neutral-200">
                <Field label="Promo Code (Optional)" icon={<Tag size={11} />}>
                  <div className="flex gap-2 mt-1">
                    <input
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 64));
                        setQuote(null);
                      }}
                      className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-mono uppercase text-neutral-900 outline-none focus:border-black"
                      placeholder="ENTER PROMO CODE"
                      autoCapitalize="characters"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!promoCode.trim()) toast.error("Enter a promo code first.");
                        else setQuoteError(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-black transition cursor-pointer"
                    >
                      APPLY
                    </button>
                  </div>
                </Field>
              </div>

              {quoteLoading && (
                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs flex items-center gap-2 text-neutral-600">
                  <Loader2 size={14} className="animate-spin text-neutral-900" />
                  Calculating secure delivery quote...
                </div>
              )}

              {quoteError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{quoteError}</span>
                </div>
              )}

              {quote?.freeDelivery && (
                <div className="p-2.5 rounded-xl bg-emerald-900 text-white border border-emerald-800 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1 font-medium">
                    <Check size={13} /> Authorized Promo
                  </span>
                  <span className="font-bold">FREE DELIVERY ({quote.promoCode})</span>
                </div>
              )}
            </Card>

            <Card title="DELIVERY FEE PAYMENT" icon={<Truck size={15} />}>
              <div className="grid grid-cols-2 gap-2">
                {(["PAY_AT_CHECKOUT", "PAY_UPON_FULFILLMENT"] as DeliveryPaymentOption[]).map((value) => {
                  const isSelected = deliveryPaymentOption === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDeliveryPaymentOption(value)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        isSelected
                          ? "bg-neutral-900 text-white border-black shadow-2xs"
                          : "bg-white border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-tight">
                        {value === "PAY_AT_CHECKOUT" ? "Pay at Checkout" : "Pay upon Fulfillment"}
                      </div>
                      <div className={`text-[10px] mt-0.5 leading-tight ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                        {value === "PAY_AT_CHECKOUT" ? "Include fee now in total" : "Settle fee later with courier"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="flex gap-2 pt-1">
              <Back onClick={() => setStep(1)} />
              <PrimaryButton
                label={quote && !quoteLoading ? "Review Order" : "Calculating Quote..."}
                disabled={!quote || quoteLoading}
              />
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-3.5">
            <Summary title="RECEIVER & ADDRESS" icon={<MapPin size={15} />} onEdit={() => setStep(1)}>
              <p className="font-bold text-neutral-950 uppercase">{receiver}</p>
              <p className="text-neutral-600 font-mono">{phone}</p>
              <p className="text-neutral-700 leading-snug mt-0.5">{addressInput}</p>
              {notes && <p className="italic text-neutral-500 text-[11px] mt-1">“{notes}”</p>}
            </Summary>

            <Summary title="DELIVERY DETAILS" icon={<Truck size={15} />} onEdit={() => setStep(2)}>
              <div className="flex justify-between items-center font-bold text-neutral-950">
                <span>{quote?.courierName || selectedCourier?.name}</span>
                <span className="text-emerald-700">
                  {quote?.deliveryDueNow ? formatCurrency(quote.deliveryDueNow) : "FREE"}
                </span>
              </div>
              <p className="text-neutral-600 text-[11px] mt-0.5">
                {quote?.distanceKm?.toFixed(1)} km • {deliveryPaymentOption === "PAY_AT_CHECKOUT" ? "Paid at checkout" : "Pay upon fulfillment"}
              </p>
              {quote?.freeDelivery && (
                <p className="font-semibold text-emerald-700 text-[11px]">Promo: {quote.promoCode}</p>
              )}
            </Summary>

            <Card title="ORDER ITEMS & PRICING" icon={<ShoppingBag size={15} />}>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {checkoutItems.map((item) => (
                  <div key={item.productId} className="flex justify-between text-xs text-neutral-800">
                    <span className="truncate max-w-[70%]">
                      {item.productName} <span className="text-neutral-400">×{item.quantity}</span>
                    </span>
                    <span className="font-semibold shrink-0 font-mono">{formatCurrency(item.unitPrice * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 mt-1 border-t border-neutral-100 space-y-1 text-xs">
                <Line label="Items Subtotal" value={formatCurrency(quote?.subtotal ?? subtotalNow)} />
                {Boolean(quote?.charges) && <Line label="Service Charges" value={formatCurrency(quote?.charges ?? 0)} />}
                <Line label="Tax (5%)" value={formatCurrency(quote?.tax ?? fallbackTax)} />
                <Line
                  label="Delivery Due Now"
                  value={quote?.deliveryDueNow ? formatCurrency(quote.deliveryDueNow) : "FREE"}
                />
                <div className="pt-2 mt-1.5 border-t border-neutral-200 flex justify-between items-baseline font-bold">
                  <span className="text-sm uppercase tracking-tight" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                    Final Payable
                  </span>
                  <span className="text-base text-neutral-950 font-mono">{formatCurrency(payable)}</span>
                </div>
              </div>
            </Card>

            <div className="flex gap-2 pt-1">
              <Back onClick={() => setStep(2)} />
              <PrimaryButton label="Continue to Payment" onClick={goNext} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3.5">
            <Card title="PAYMENT METHOD" icon={<CreditCard size={15} />}>
              <div className="grid grid-cols-2 gap-2">
                <Pay
                  selected={paymentMethod === "TELEGRAM_PAY"}
                  onClick={() => setPaymentMethod("TELEGRAM_PAY")}
                  title="Telegram Pay"
                  desc="Direct secure Telegram invoice"
                />
                <Pay
                  selected={paymentMethod === "DIRECT_TRANSFER"}
                  onClick={() => setPaymentMethod("DIRECT_TRANSFER")}
                  title="Bank / GCash / Maya"
                  desc="Upload payment screenshot"
                />
              </div>

              {paymentMethod === "DIRECT_TRANSFER" && (
                <div className="mt-2.5 bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[11px] space-y-2">
                  <div className="font-bold uppercase flex items-center gap-1 text-neutral-900">
                    <Building2 size={13} /> Beneficiary Account Details
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-neutral-500 uppercase block font-semibold">GCASH / MAYA</span>
                      <span className="font-bold text-neutral-900 text-xs font-mono">0919 123 1234</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-neutral-500 uppercase block font-semibold">ACCOUNT NAME</span>
                      <span className="font-bold text-neutral-900 text-xs">PRIME ENTERPRISE PH</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-2">
                <ReceiptOcrScanner
                  expectedAmount={payable}
                  expectedReceiver="PRIME ENTERPRISE PH"
                  initialReceiptUrl={receiptUrl || undefined}
                  initialOcrResult={ocrResult}
                  title={`Proof of Payment ${paymentMethod === "DIRECT_TRANSFER" ? "(Required)" : "(Optional)"}`}
                  onOcrComplete={(result, uri) => {
                    setOcrResult(result);
                    setReceiptUrl(uri);
                  }}
                  onRemoveReceipt={() => {
                    setOcrResult(null);
                    setReceiptUrl(null);
                  }}
                />
              </div>
            </Card>

            <Summary title="TOTAL DUE" icon={<ShieldCheck size={15} />} onEdit={() => setStep(3)}>
              <div className="flex justify-between items-baseline font-bold text-neutral-950">
                <span className="text-xs uppercase">Amount to Settle</span>
                <span className="text-base font-mono">{formatCurrency(payable)}</span>
              </div>
            </Summary>

            <div className="flex gap-2 pt-1">
              <Back onClick={() => setStep(3)} />
              <button
                type="button"
                onClick={submitOrder}
                disabled={submitting || !quote}
                className="flex-[2] bg-neutral-950 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md hover:bg-black transition disabled:opacity-50 cursor-pointer"
              >
                {submitting ? <Loader2 size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
                <span>{submitting ? "SUBMITTING ORDER..." : "PLACE ORDER"}</span>
              </button>
            </div>

            <p className="text-[10px] text-neutral-500 text-center px-4 leading-normal">
              Orders are validated with strict real-time stock, pricing, and courier checks before dispatch.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCheckout() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 bg-neutral-200 rounded-full flex items-center justify-center mb-3">
        <ShoppingBag size={24} className="text-neutral-500" />
      </div>
      <h2 className="text-lg font-bold uppercase text-neutral-900" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
        No items selected for checkout
      </h2>
      <p className="text-xs text-neutral-500 mt-1 mb-4">
        Add or select items in your cart to proceed with order placement.
      </p>
      <Link
        to="/shop/cart"
        className="inline-flex items-center gap-2 bg-neutral-950 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-black transition cursor-pointer"
      >
        <ArrowLeft size={14} /> Return to Cart
      </Link>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-neutral-200/90 p-3.5 shadow-2xs space-y-2.5">
      <div
        className="flex items-center gap-1.5 text-xs font-bold uppercase text-neutral-900 pb-1.5 border-b border-neutral-100"
        style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
      >
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function Summary({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-neutral-200/90 p-3.5 shadow-2xs text-xs text-neutral-700 relative">
      <div className="flex items-center justify-between pb-1.5 border-b border-neutral-100 mb-2">
        <div
          className="flex items-center gap-1.5 text-xs font-bold uppercase text-neutral-900"
          style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
        >
          {icon}
          <span>{title}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-[10px] font-semibold text-neutral-600 hover:text-black flex items-center gap-1 cursor-pointer"
        >
          <Edit2 size={10} /> Edit
        </button>
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-neutral-600">
      <span>{label}</span>
      <span className="font-semibold text-neutral-900 font-mono">{value}</span>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-semibold text-neutral-600 uppercase flex items-center gap-1 mb-1">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function Pay({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2.5 rounded-xl border text-left transition relative cursor-pointer ${
        selected ? "bg-neutral-900 text-white border-black shadow-2xs" : "bg-white border-neutral-200 hover:border-neutral-300"
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
          <Check size={8} className="stroke-[3]" />
        </span>
      )}
      <div className="text-xs font-bold uppercase tracking-tight">{title}</div>
      <div className={`text-[10px] mt-0.5 leading-tight ${selected ? "text-neutral-300" : "text-neutral-500"}`}>{desc}</div>
    </button>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 bg-white border border-neutral-200 text-neutral-700 py-3 px-3 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold hover:bg-neutral-50 transition cursor-pointer"
    >
      <ArrowLeft size={14} /> Back
    </button>
  );
}

function PrimaryButton({
  label,
  disabled = false,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      onClick={onClick}
      disabled={disabled}
      className="flex-[2] bg-neutral-950 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold shadow-md hover:bg-black transition disabled:opacity-40 cursor-pointer"
    >
      <span>{label}</span>
      <ArrowRight size={14} />
    </button>
  );
}
