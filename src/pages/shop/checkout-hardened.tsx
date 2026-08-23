import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Check, CreditCard, Edit2, Loader2, MapPin, Phone, ShieldCheck, ShoppingBag, Truck, User } from "lucide-react";
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

type CheckoutStep = 1 | 2 | 3 | 4;
type PaymentMethod = "TELEGRAM_PAY" | "DIRECT_TRANSFER";
type DeliveryPaymentOption = "PAY_AT_CHECKOUT" | "PAY_UPON_FULFILLMENT";
type Quote = { subtotal: number; charges: number; tax: number; deliveryCharge: number; deliveryDueNow: number; total: number; fulfillmentTotal: number; distanceKm: number; courierName: string; deliveryPaymentOption: DeliveryPaymentOption; currency: "PHP" };

const steps = ["Receiver", "Delivery", "Review", "Payment"] as const;

export default function CheckoutPage() {
  const { items, subtotal, selectedItems, selectedSubtotal, removeSelectedItems, clearCart } = useCart();
  const { customer } = useTelegram();
  const { createOrder } = useOrders(customer?.telegramUserId);
  const { couriers, calculateDeliveryCharge } = useCouriers();
  const navigate = useNavigate();
  const itemsToCheckout = useMemo(() => selectedItems.length ? selectedItems : items, [selectedItems, items]);
  const activeSubtotal = useMemo(() => selectedItems.length ? selectedSubtotal : subtotal, [selectedItems, selectedSubtotal, subtotal]);
  const [step, setStep] = useState<CheckoutStep>(1);
  const [receiverName, setReceiverName] = useState(customer?.telegramDisplayName || "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [courierId, setCourierId] = useState("");
  const [deliveryPaymentOption, setDeliveryPaymentOption] = useState<DeliveryPaymentOption>("PAY_AT_CHECKOUT");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TELEGRAM_PAY");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptOcrResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { addressInput, setAddressInput, suggestions, isLoading: geoLoading, isLocating, isOpen: geoOpen, setIsOpen: setGeoOpen, selectedLocation, selectSuggestion, detectCurrentLocation, detectIpLocation, routeInfo, isCalculatingRoute, geoConfig } = useAddressAutocomplete("");

  const selectedCourier = couriers.find((c) => c.id === courierId);
  const distanceKm = routeInfo?.distanceKm ?? 0;
  const localShipping = activeSubtotal > 2500 ? 0 : selectedCourier ? calculateDeliveryCharge(selectedCourier, distanceKm) : 0;
  const localTax = Math.round(activeSubtotal * 0.05 * 100) / 100;
  const displayedTotal = quote?.total ?? activeSubtotal + localTax + (deliveryPaymentOption === "PAY_AT_CHECKOUT" ? localShipping : 0);

  const quotePayload = useMemo(() => ({
    items: itemsToCheckout.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    deliveryProviderId: courierId,
    distanceKm,
    deliveryPaymentOption,
  }), [courierId, deliveryPaymentOption, distanceKm, itemsToCheckout]);

  useEffect(() => {
    let cancelled = false;
    if (!customer?.telegramUserId || !selectedCourier || !routeInfo || !itemsToCheckout.length) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    fetch("/api/checkout/quote", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quotePayload),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to calculate secure checkout quote");
        if (!data.quote) throw new Error("Checkout quote unavailable");
        return data.quote as Quote;
      })
      .then((value) => { if (!cancelled) setQuote(value); })
      .catch((error: any) => { if (!cancelled) { setQuote(null); setQuoteError(error?.message || "Unable to calculate checkout quote"); } })
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [customer?.telegramUserId, itemsToCheckout.length, quotePayload, routeInfo, selectedCourier]);

  const validReceiver = () => {
    if (!customer?.telegramUserId) { toast.error("Open checkout from Telegram to continue."); return false; }
    if (receiverName.trim().length < 2) { toast.error("Enter the receiver name."); return false; }
    if (!/^[0-9+()\-\s]{7,30}$/.test(phone.trim())) { toast.error("Enter a valid contact phone number."); return false; }
    if (!addressInput.trim() || !selectedLocation) { toast.error("Select a delivery address from the suggested addresses."); return false; }
    return true;
  };

  const validDelivery = () => {
    if (!selectedCourier?.isAvailable) { toast.error("Select an available delivery provider."); return false; }
    if (!routeInfo || isCalculatingRoute) { toast.error("Wait for the delivery route to finish calculating."); return false; }
    if (quoteLoading || !quote) { toast.error(quoteError || "Secure checkout pricing is not ready yet."); return false; }
    return true;
  };

  const validPayment = () => {
    if (paymentMethod === "DIRECT_TRANSFER" && !receiptPreview) { toast.error("Upload payment proof before submitting."); return false; }
    return true;
  };

  const next = () => {
    if (step === 1 && !validReceiver()) return;
    if (step === 2 && !validDelivery()) return;
    if (step === 3 && !validDelivery()) return;
    setStep((Math.min(4, step + 1) as CheckoutStep));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!validReceiver() || !validDelivery() || !validPayment() || !itemsToCheckout.length || !quote) return;
    setSubmitting(true);
    try {
      const created = await createOrder({
        telegramDisplayName: customer?.telegramDisplayName || receiverName,
        telegramUsername: customer?.telegramUsername,
        items: itemsToCheckout.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        receiverName: receiverName.trim(),
        contactNumber: phone.trim(),
        deliveryAddress: addressInput.trim(),
        deliveryProviderId: selectedCourier?.id,
        distanceKm,
        deliveryPaymentOption,
        paymentMethodName: paymentMethod === "TELEGRAM_PAY" ? "Telegram Pay" : "Direct Transfer / GCash / Maya",
        estimatedWaitingMinutes: routeInfo ? Math.max(15, Math.ceil(routeInfo.durationMinutes) + 12) : 15,
        estimatedDispatchTime: routeInfo ? `${Math.ceil(routeInfo.durationMinutes)} MIN TRANSIT` : "CALCULATING",
        adminNotes: notes.trim() || undefined,
        receiptUrl: receiptPreview || undefined,
        receiptOcrData: ocrResult || undefined,
      });
      if (selectedItems.length) removeSelectedItems(); else clearCart();
      toast.success("Order submitted for review.");
      navigate(`/shop/order-confirmation/${created.orderNumber}`, { state: { orderNumber: created.orderNumber, queuePosition: created.queuePosition, estimatedWaitingMinutes: created.estimatedWaitingMinutes, estimatedDispatchTime: created.estimatedDispatchTime, distanceKm: created.distanceKm, total: created.total, fulfillmentTotal: created.fulfillmentTotal } });
    } catch (error: any) {
      console.error("Checkout submission failed:", error);
      toast.error(error?.message || "Unable to submit the order. Please try again.");
    } finally { setSubmitting(false); }
  };

  if (!itemsToCheckout.length) return <EmptyCheckout />;

  return <div className="bg-[#f3f4f6] min-h-full pb-14">
    <header className="bg-white border-b border-neutral-200 px-4 py-3 sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button type="button" onClick={() => step === 1 ? navigate("/shop/cart") : setStep((step - 1) as CheckoutStep)} className="p-1.5 -ml-1 rounded-lg hover:bg-neutral-100" aria-label="Back"><ArrowLeft size={19} /></button><div><h1 className="text-lg uppercase leading-none font-normal" style={{ fontFamily: "'Roboto Condensed',sans-serif" }}>CHECKOUT</h1><p className="text-[11px] text-neutral-500 mt-0.5">Step {step} of 4 • {steps[step - 1]}</p></div></div><div className="text-right"><div className="text-[10px] text-neutral-400 uppercase">Total Payable</div><div className="text-sm font-semibold">{formatCurrency(displayedTotal)}</div></div></div>
      <div className="mt-3 pt-2 border-t border-neutral-100 grid grid-cols-4 gap-1.5">{steps.map((label, index) => { const id = (index + 1) as CheckoutStep; const passed = step > id; return <button key={label} type="button" onClick={() => id < step ? setStep(id) : id === step + 1 ? next() : undefined} disabled={id > step + 1} className={`py-2 rounded-lg flex items-center justify-center gap-1 text-[10px] uppercase ${step === id ? "bg-neutral-900 text-white" : passed ? "bg-neutral-100 text-neutral-800" : "bg-neutral-50 text-neutral-400"}`}><span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold">{passed ? <Check size={9} /> : id}</span>{label}</button>; })}</div>
    </header>

    <main className="p-3 space-y-3">
      {step === 1 && <form onSubmit={(e) => { e.preventDefault(); next(); }} className="space-y-3"><Card title="Receiver Information" icon={<User size={16} />}><Field label="Receiver Full Name" icon={<User size={12} />}><input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Full name" className="checkout-input" /></Field><Field label="Contact Phone Number" icon={<Phone size={12} />}><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="09XX XXX XXXX" className="checkout-input" /></Field></Card><Card title="Delivery Address" icon={<MapPin size={16} />}><GeoAddressAutocomplete addressInput={addressInput} onAddressChange={setAddressInput} suggestions={suggestions} isLoading={geoLoading} isLocating={isLocating} isOpen={geoOpen} setIsOpen={setGeoOpen} selectedLocation={selectedLocation} onSelectSuggestion={selectSuggestion} onDetectGps={detectCurrentLocation} onDetectIp={detectIpLocation} routeInfo={routeInfo} isCalculatingRoute={isCalculatingRoute} warehouseName={geoConfig?.warehouse.name} hasGeoapifyKey={geoConfig?.hasApiKey} /><textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0,160))} maxLength={160} rows={2} placeholder="Landmark, gate, unit, or rider instructions (optional)" className="checkout-input resize-none mt-3" /><div className="text-right text-[10px] text-neutral-400">{notes.length}/160</div></Card><PrimaryButton label="Continue to Delivery" /></form>}

      {step === 2 && <form onSubmit={(e) => { e.preventDefault(); next(); }} className="space-y-3"><Card title="Delivery Provider" icon={<Truck size={16} />}><p className="text-[11px] text-neutral-500 mb-3">Provider availability and pricing are revalidated by the server at submission.</p><div className="grid grid-cols-3 gap-2">{couriers.map((courier) => { const selected = courier.id === courierId; const charge = activeSubtotal > 2500 ? 0 : calculateDeliveryCharge(courier, distanceKm); return <button key={courier.id} type="button" disabled={!courier.isAvailable} onClick={() => setCourierId(courier.id)} className={`relative min-h-[96px] rounded-xl border p-2 flex flex-col items-center justify-center ${selected ? "bg-neutral-900 text-white border-black" : "bg-white border-neutral-200"} ${courier.isAvailable ? "" : "opacity-50"}`}><img src={courier.logoUrl} alt={courier.name} className="w-9 h-9 object-contain mb-1"/><span className="text-[9px] font-semibold text-center leading-tight">{courier.name}</span><span className="text-[10px] font-bold mt-1">{charge ? formatCurrency(charge) : "FREE"}</span>{selected && <span className="absolute top-1 right-1 w-4 h-4 bg-white text-black rounded-full flex items-center justify-center"><Check size={10}/></span>}</button>; })}</div>{selectedCourier && routeInfo && <div className="mt-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs flex justify-between"><span>Route</span><span className="font-semibold">{distanceKm.toFixed(1)} km • {Math.ceil(routeInfo.durationMinutes)} min</span></div>}{quoteLoading && <div className="mt-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Calculating secure server quote…</div>}{quoteError && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{quoteError}</div>}</Card><Card title="Delivery Fee Payment" icon={<Truck size={16} />}><div className="grid grid-cols-2 gap-2">{(["PAY_AT_CHECKOUT","PAY_UPON_FULFILLMENT"] as DeliveryPaymentOption[]).map((value) => <button key={value} type="button" onClick={() => setDeliveryPaymentOption(value)} className={`p-3 text-left rounded-xl border ${deliveryPaymentOption === value ? "bg-neutral-900 text-white border-black" : "bg-white border-neutral-200"}`}><div className="text-xs font-semibold uppercase">{value === "PAY_AT_CHECKOUT" ? "Pay at Checkout" : "Pay upon Fulfillment"}</div><div className="text-[10px] mt-1 opacity-70">{value === "PAY_AT_CHECKOUT" ? "Include delivery fee now." : "Settle delivery fee when fulfillment is arranged."}</div></button>)}</div></Card><div className="flex gap-2"><BackButton onClick={() => setStep(1)}/><PrimaryButton label={quote ? "Review Order" : "Waiting for Quote"} disabled={!quote || quoteLoading}/></div></form>}

      {step === 3 && <div className="space-y-3"><SummaryCard title="Receiver & Address" icon={<MapPin size={16}/>} onEdit={() => setStep(1)}><p className="font-semibold">{receiverName}</p><p>{phone}</p><p>{addressInput}</p>{notes && <p className="italic">“{notes}”</p>}</SummaryCard><SummaryCard title="Delivery" icon={<Truck size={16}/>} onEdit={() => setStep(2)}><div className="flex justify-between"><span>{quote?.courierName || selectedCourier?.name}</span><span className="font-semibold">{quote?.deliveryDueNow ? formatCurrency(quote.deliveryDueNow) : "FREE"}</span></div><p>{quote?.distanceKm.toFixed(1)} km • {deliveryPaymentOption === "PAY_AT_CHECKOUT" ? "Pay at checkout" : "Pay upon fulfillment"}</p></SummaryCard><Card title="Order Summary" icon={<ShoppingBag size={16}/>}><Line label="Items Subtotal" value={formatCurrency(quote?.subtotal ?? activeSubtotal)}/><Line label="Service Charges" value={formatCurrency(quote?.charges ?? 0)}/><Line label="Tax (5%)" value={formatCurrency(quote?.tax ?? localTax)}/><Line label="Delivery Due Now" value={quote?.deliveryDueNow ? formatCurrency(quote.deliveryDueNow) : "FREE"}/><Line label="Delivery Total" value={quote?.deliveryCharge ? formatCurrency(quote.deliveryCharge) : "FREE"}/><div className="pt-2 mt-1 border-t border-neutral-100 flex justify-between font-semibold"><span>Final Payable</span><span>{formatCurrency(displayedTotal)}</span></div></Card><div className="flex gap-2"><BackButton onClick={() => setStep(2)}/><PrimaryButton label="Continue to Payment"/></div></div>}

      {step === 4 && <div className="space-y-3"><Card title="Payment Method" icon={<CreditCard size={16}/>}><div className="grid grid-cols-2 gap-2"><PaymentCard selected={paymentMethod === "TELEGRAM_PAY"} onClick={() => setPaymentMethod("TELEGRAM_PAY")} title="Telegram Pay" description="Payment remains pending until verified."/><PaymentCard selected={paymentMethod === "DIRECT_TRANSFER"} onClick={() => setPaymentMethod("DIRECT_TRANSFER")} title="Bank / GCash / Maya" description="Upload proof for verification."/></div>{paymentMethod === "DIRECT_TRANSFER" && <div className="mt-3 bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[11px]"><div className="font-semibold uppercase flex items-center gap-1"><Building2 size={14}/> Beneficiary Account</div><div className="grid grid-cols-2 gap-2 mt-2"><div><span className="text-[9px] text-neutral-400 block">GCASH / MAYA</span><span className="font-semibold">0919 123 1234</span></div><div><span className="text-[9px] text-neutral-400 block">ACCOUNT NAME</span><span className="font-semibold">PRIME ENTERPRISE PH</span></div></div></div>}<ReceiptOcrScanner expectedAmount={displayedTotal} expectedReceiver="PRIME ENTERPRISE PH" initialReceiptUrl={receiptPreview || undefined} initialOcrResult={ocrResult} title={`Proof of Payment ${paymentMethod === "DIRECT_TRANSFER" ? "(Required)" : "(Optional)"}`} onOcrComplete={(result, previewUri) => { setOcrResult(result); setReceiptPreview(previewUri); }} onRemoveReceipt={() => { setOcrResult(null); setReceiptPreview(null); }}/></Card><SummaryCard title="Order Total" icon={<ShieldCheck size={16}/>} onEdit={() => setStep(3)}><Line label="Final payable" value={formatCurrency(displayedTotal)}/></SummaryCard><div className="flex gap-2"><BackButton onClick={() => setStep(3)}/><button type="button" onClick={submit} disabled={submitting || !quote} className="flex-[2] bg-black text-white py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{submitting ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}<span>{submitting ? "SUBMITTING..." : "SUBMIT ORDER"}</span></button></div><p className="text-[10px] text-neutral-400 text-center">Final pricing, stock, delivery provider, and identity are validated again on the server.</p></div>}
    </main>
  </div>;
}

function EmptyCheckout() { return <div className="bg-[#f3f4f6] min-h-full p-6 text-center py-20"><div className="w-16 h-16 bg-neutral-200/60 rounded-full flex items-center justify-center mx-auto mb-3"><ShoppingBag size={28} className="text-neutral-500"/></div><h2 className="text-xl font-normal uppercase" style={{fontFamily:"'Roboto Condensed',sans-serif"}}>No items selected for checkout</h2><p className="text-xs text-neutral-500 mt-1 mb-4">Select products in your cart before proceeding.</p><Link to="/shop/cart" className="inline-block bg-black text-white px-5 py-2.5 rounded-xl text-sm">Return to Cart</Link></div>; }
function Card({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}) { return <section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3"><div className="flex items-center gap-2 text-black text-sm uppercase pb-2 border-b border-neutral-100" style={{fontFamily:"'Roboto Condensed',sans-serif"}}>{icon}<span>{title}</span></div>{children}</section>; }
function Field({label,icon,children}:{label:string;icon:React.ReactNode;children:React.ReactNode}) { return <label className="block"><span className="text-[11px] text-neutral-600 uppercase flex items-center gap-1">{icon}{label}</span><div className="mt-1">{children}</div></label>; }
function SummaryCard({title,icon,onEdit,children}:{title:string;icon:React.ReactNode;onEdit:()=>void;children:React.ReactNode}) { return <Card title={title} icon={icon}><div className="flex justify-end -mt-8"><button type="button" onClick={onEdit} className="text-[10px] text-neutral-500 flex items-center gap-1"><Edit2 size={10}/> Edit</button></div><div className="text-xs space-y-1">{children}</div></Card>; }
function Line({label,value}:{label:string;value:string}) { return <div className="flex justify-between text-xs"><span>{label}</span><span className="font-semibold">{value}</span></div>; }
function PaymentCard({selected,onClick,title,description}:{selected:boolean;onClick:()=>void;title:string;description:string}) { return <button type="button" onClick={onClick} className={`p-3 rounded-xl border text-left ${selected ? "bg-neutral-900 text-white border-black" : "bg-white border-neutral-200"}`}><div className="text-xs font-semibold uppercase">{title}</div><div className="text-[10px] mt-1 opacity-70">{description}</div></button>; }
function BackButton({onClick}:{onClick:()=>void}) { return <button type="button" onClick={onClick} className="flex-1 bg-white border border-neutral-200 text-neutral-700 py-3.5 rounded-xl flex items-center justify-center gap-1"><ArrowLeft size={16}/> Back</button>; }
function PrimaryButton({label,disabled=false}:{label:string;disabled?:boolean}) { return <button type="submit" disabled={disabled} className="flex-[2] bg-black text-white py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-40">{label}<ArrowRight size={17}/></button>; }
