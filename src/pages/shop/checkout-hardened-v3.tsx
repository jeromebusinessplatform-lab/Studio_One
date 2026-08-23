import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Check, CreditCard, Edit2, Loader2, MapPin, ShieldCheck, ShoppingBag, Truck, User } from "lucide-react";
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
type Quote = { subtotal: number; charges: number; tax: number; deliveryCharge: number; deliveryDueNow: number; total: number; fulfillmentTotal: number; distanceKm: number; courierName: string; deliveryPaymentOption: DeliveryPaymentOption };
const LABELS = ["Receiver", "Delivery", "Review", "Payment"] as const;

export default function CheckoutPage() {
  const { items, subtotal, selectedItems, selectedSubtotal, removeSelectedItems, clearCart } = useCart();
  const { customer } = useTelegram();
  const { createOrder } = useOrders(customer?.telegramUserId);
  const { couriers, calculateDeliveryCharge } = useCouriers();
  const navigate = useNavigate();

  const checkoutItems = selectedItems.length ? selectedItems : items;
  const subtotalNow = selectedItems.length ? selectedSubtotal : subtotal;
  const itemsKey = useMemo(() => checkoutItems.map((i) => `${i.productId}:${i.quantity}`).join("|"), [checkoutItems]);

  const [step, setStep] = useState<Step>(1);
  const [receiver, setReceiver] = useState(customer?.telegramDisplayName || "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [courierId, setCourierId] = useState("");
  const [deliveryPaymentOption, setDeliveryPaymentOption] = useState<DeliveryPaymentOption>("PAY_AT_CHECKOUT");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TELEGRAM_PAY");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptOcrResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { addressInput, setAddressInput, suggestions, isLoading: geoLoading, isLocating, isOpen: geoOpen, setIsOpen: setGeoOpen, selectedLocation, selectSuggestion, detectCurrentLocation, detectIpLocation, routeInfo, isCalculatingRoute, geoConfig } = useAddressAutocomplete("");

  const selectedCourier = couriers.find((c) => c.id === courierId);
  const distanceKm = routeInfo?.distanceKm ?? 0;
  const routeReady = Boolean(routeInfo) && !isCalculatingRoute;
  const fallbackShipping = subtotalNow > 2500 ? 0 : selectedCourier ? calculateDeliveryCharge(selectedCourier, distanceKm) : 0;
  const fallbackTax = Math.round(subtotalNow * 0.05 * 100) / 100;
  const payable = quote?.total ?? subtotalNow + fallbackTax + (deliveryPaymentOption === "PAY_AT_CHECKOUT" ? fallbackShipping : 0);
  const quoteKey = `${itemsKey}|${courierId}|${distanceKm.toFixed(3)}|${deliveryPaymentOption}`;

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
    };
    fetch("/api/checkout/quote", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to calculate secure checkout quote");
        if (!data.quote) throw new Error("Checkout quote unavailable");
        return data.quote as Quote;
      })
      .then((nextQuote) => { if (!cancelled) setQuote(nextQuote); })
      .catch((error: any) => { if (!cancelled) { setQuote(null); setQuoteError(error?.message || "Unable to calculate secure checkout quote"); } })
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; };
  }, [customer?.telegramUserId, quoteKey, routeReady, checkoutItems.length]);

  const validateReceiver = () => {
    if (!customer?.telegramUserId) { toast.error("Open checkout from Telegram to continue."); return false; }
    if (receiver.trim().length < 2) { toast.error("Enter the receiver name."); return false; }
    if (!/^[0-9+()\-\s]{7,30}$/.test(phone.trim())) { toast.error("Enter a valid contact phone number."); return false; }
    if (!addressInput.trim() || !selectedLocation) { toast.error("Select a delivery address from the suggested addresses."); return false; }
    return true;
  };

  const validateDelivery = () => {
    if (!selectedCourier?.isAvailable) { toast.error("Select an available delivery provider."); return false; }
    if (!routeReady) { toast.error("Wait for the delivery route to finish calculating."); return false; }
    if (quoteLoading || !quote) { toast.error(quoteError || "Secure checkout pricing is not ready yet."); return false; }
    return true;
  };

  const validatePayment = () => {
    if (paymentMethod === "DIRECT_TRANSFER" && !receiptUrl) { toast.error("Upload payment proof before submitting."); return false; }
    return true;
  };

  const goNext = () => {
    if (step === 1 && !validateReceiver()) return;
    if ((step === 2 || step === 3) && !validateDelivery()) return;
    setStep((Math.min(4, step + 1) as Step));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitOrder = async () => {
    if (!validateReceiver() || !validateDelivery() || !validatePayment() || !quote || !checkoutItems.length) return;
    setSubmitting(true);
    try {
      const created = await createOrder({
        telegramDisplayName: customer?.telegramDisplayName || receiver,
        telegramUsername: customer?.telegramUsername,
        items: checkoutItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        receiverName: receiver.trim(),
        contactNumber: phone.trim(),
        deliveryAddress: addressInput.trim(),
        deliveryProviderId: selectedCourier?.id,
        distanceKm,
        deliveryPaymentOption,
        paymentMethodName: paymentMethod === "TELEGRAM_PAY" ? "Telegram Pay" : "Direct Transfer / GCash / Maya",
        estimatedWaitingMinutes: routeInfo ? Math.max(15, Math.ceil(routeInfo.durationMinutes) + 12) : 15,
        estimatedDispatchTime: routeInfo ? `${Math.ceil(routeInfo.durationMinutes)} MIN TRANSIT` : "CALCULATING",
        adminNotes: notes.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
        receiptOcrData: ocrResult || undefined,
      });
      if (selectedItems.length) removeSelectedItems(); else clearCart();
      toast.success("Order submitted for review.");
      navigate(`/shop/order-confirmation/${created.orderNumber}`, { state: { orderNumber: created.orderNumber, queuePosition: created.queuePosition, estimatedWaitingMinutes: created.estimatedWaitingMinutes, estimatedDispatchTime: created.estimatedDispatchTime, distanceKm: created.distanceKm } });
    } catch (error: any) {
      console.error("Hardened checkout submission failed:", error);
      toast.error(error?.message || "Unable to submit the order. Please try again.");
    } finally { setSubmitting(false); }
  };

  if (!checkoutItems.length) return <EmptyCheckout />;

  return <div className="bg-[#f3f4f6] min-h-full pb-14">
    <header className="bg-white border-b border-neutral-200 px-4 py-3 sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button type="button" onClick={() => step === 1 ? navigate('/shop/cart') : setStep((step - 1) as Step)} className="p-1.5 rounded-lg hover:bg-neutral-100"><ArrowLeft size={19}/></button><div><h1 className="text-lg uppercase leading-none" style={{fontFamily:"'Roboto Condensed',sans-serif"}}>CHECKOUT</h1><p className="text-[11px] text-neutral-500 mt-0.5">Step {step} of 4 • {LABELS[step - 1]}</p></div></div><div className="text-right"><div className="text-[10px] text-neutral-400 uppercase">Total Payable</div><div className="text-sm font-semibold">{formatCurrency(payable)}</div></div></div>
      <div className="mt-3 pt-2 border-t border-neutral-100 grid grid-cols-4 gap-1.5">{LABELS.map((label, index) => { const id = (index + 1) as Step; const passed = step > id; return <button key={label} type="button" disabled={id > step + 1} onClick={() => id < step ? setStep(id) : id === step + 1 ? goNext() : undefined} className={`py-2 rounded-lg text-[10px] uppercase ${step === id ? 'bg-neutral-900 text-white' : passed ? 'bg-neutral-100' : 'bg-neutral-50 text-neutral-400'}`}>{passed ? <Check size={10} className="inline mr-1"/> : id} {label}</button>; })}</div>
    </header>

    <main className="p-3 space-y-3">
      {step === 1 && <form onSubmit={(e) => { e.preventDefault(); goNext(); }} className="space-y-3"><Card title="Receiver Information" icon={<User size={16}/>}><Field label="Receiver Full Name"><input value={receiver} onChange={(e) => setReceiver(e.target.value)} className="checkout-input" placeholder="Full name"/></Field><Field label="Contact Phone Number"><input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="checkout-input" placeholder="09XX XXX XXXX"/></Field></Card><Card title="Delivery Address" icon={<MapPin size={16}/>}><GeoAddressAutocomplete addressInput={addressInput} onAddressChange={setAddressInput} suggestions={suggestions} isLoading={geoLoading} isLocating={isLocating} isOpen={geoOpen} setIsOpen={setGeoOpen} selectedLocation={selectedLocation} onSelectSuggestion={selectSuggestion} onDetectGps={detectCurrentLocation} onDetectIp={detectIpLocation} routeInfo={routeInfo} isCalculatingRoute={isCalculatingRoute} warehouseName={geoConfig?.warehouse.name} hasGeoapifyKey={geoConfig?.hasApiKey}/><textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0,160))} className="checkout-input resize-none mt-3" rows={2} placeholder="Landmark, gate, unit, or rider instructions (optional)"/></Card><PrimaryButton label="Continue to Delivery"/></form>}

      {step === 2 && <form onSubmit={(e) => { e.preventDefault(); goNext(); }} className="space-y-3"><Card title="Delivery Provider" icon={<Truck size={16}/>}><div className="grid grid-cols-3 gap-2">{couriers.map((courier) => { const selected = courier.id === courierId; const charge = subtotalNow > 2500 ? 0 : calculateDeliveryCharge(courier, distanceKm); return <button key={courier.id} type="button" disabled={!courier.isAvailable} onClick={() => setCourierId(courier.id)} className={`relative min-h-[96px] rounded-xl border p-2 flex flex-col items-center justify-center ${selected ? 'bg-neutral-900 text-white border-black' : 'bg-white border-neutral-200'} ${courier.isAvailable ? '' : 'opacity-50'}`}><img src={courier.logoUrl} alt={courier.name} className="w-9 h-9 object-contain mb-1"/><span className="text-[9px] font-semibold text-center">{courier.name}</span><span className="text-[10px] font-bold mt-1">{charge ? formatCurrency(charge) : 'FREE'}</span>{selected && <span className="absolute top-1 right-1 w-4 h-4 bg-white text-black rounded-full flex items-center justify-center"><Check size={10}/></span>}</button>; })}</div>{selectedCourier && routeInfo && <div className="mt-3 p-3 rounded-xl bg-neutral-50 border text-xs flex justify-between"><span>Route</span><span className="font-semibold">{distanceKm.toFixed(1)} km • {Math.ceil(routeInfo.durationMinutes)} min</span></div>}{quoteLoading && <div className="mt-3 p-3 rounded-xl bg-neutral-50 border text-xs flex items-center gap-2"><Loader2 size={14} className="animate-spin"/>Calculating secure quote…</div>}{quoteError && <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{quoteError}</div>}</Card><Card title="Delivery Fee Payment" icon={<Truck size={16}/>}><div className="grid grid-cols-2 gap-2">{(['PAY_AT_CHECKOUT','PAY_UPON_FULFILLMENT'] as DeliveryPaymentOption[]).map((value) => <button key={value} type="button" onClick={() => setDeliveryPaymentOption(value)} className={`p-3 rounded-xl border text-left ${deliveryPaymentOption === value ? 'bg-neutral-900 text-white border-black' : 'bg-white border-neutral-200'}`}><div className="text-xs font-semibold uppercase">{value === 'PAY_AT_CHECKOUT' ? 'Pay at Checkout' : 'Pay upon Fulfillment'}</div><div className="text-[10px] opacity-70 mt-1">{value === 'PAY_AT_CHECKOUT' ? 'Include delivery fee now.' : 'Settle delivery fee later.'}</div></button>)}</div></Card><div className="flex gap-2"><Back onClick={() => setStep(1)}/><PrimaryButton label={quote && !quoteLoading ? 'Review Order' : 'Waiting for Quote'} disabled={!quote || quoteLoading}/></div></form>}

      {step === 3 && <div className="space-y-3"><Summary title="Receiver & Address" icon={<MapPin size={16}/>} onEdit={() => setStep(1)}><p className="font-semibold">{receiver}</p><p>{phone}</p><p>{addressInput}</p>{notes && <p className="italic">“{notes}”</p>}</Summary><Summary title="Delivery" icon={<Truck size={16}/>} onEdit={() => setStep(2)}><div className="flex justify-between"><span>{quote?.courierName || selectedCourier?.name}</span><span className="font-semibold">{quote?.deliveryDueNow ? formatCurrency(quote.deliveryDueNow) : 'FREE'}</span></div><p>{quote?.distanceKm?.toFixed(1)} km • {deliveryPaymentOption === 'PAY_AT_CHECKOUT' ? 'Pay at checkout' : 'Pay upon fulfillment'}</p></Summary><Card title="Order Summary" icon={<ShoppingBag size={16}/>}><Line label="Items Subtotal" value={formatCurrency(quote?.subtotal ?? subtotalNow)}/><Line label="Service Charges" value={formatCurrency(quote?.charges ?? 0)}/><Line label="Tax" value={formatCurrency(quote?.tax ?? fallbackTax)}/><Line label="Delivery Due Now" value={quote?.deliveryDueNow ? formatCurrency(quote.deliveryDueNow) : 'FREE'}/><Line label="Delivery Total" value={quote?.deliveryCharge ? formatCurrency(quote.deliveryCharge) : 'FREE'}/><div className="pt-2 mt-1 border-t flex justify-between font-semibold"><span>Final Payable</span><span>{formatCurrency(payable)}</span></div></Card><div className="flex gap-2"><Back onClick={() => setStep(2)}/><PrimaryButton label="Continue to Payment" onClick={goNext}/></div></div>}

      {step === 4 && <div className="space-y-3"><Card title="Payment Method" icon={<CreditCard size={16}/>}><div className="grid grid-cols-2 gap-2"><Pay selected={paymentMethod === 'TELEGRAM_PAY'} onClick={() => setPaymentMethod('TELEGRAM_PAY')} title="Telegram Pay" desc="Payment remains pending until verified."/><Pay selected={paymentMethod === 'DIRECT_TRANSFER'} onClick={() => setPaymentMethod('DIRECT_TRANSFER')} title="Bank / GCash / Maya" desc="Upload proof for verification."/></div>{paymentMethod === 'DIRECT_TRANSFER' && <div className="mt-3 bg-neutral-50 border rounded-xl p-3 text-[11px]"><div className="font-semibold uppercase flex items-center gap-1"><Building2 size={14}/>Beneficiary Account</div><div className="grid grid-cols-2 gap-2 mt-2"><div><span className="text-[9px] text-neutral-400 block">GCASH / MAYA</span><span className="font-semibold">0919 123 1234</span></div><div><span className="text-[9px] text-neutral-400 block">ACCOUNT NAME</span><span className="font-semibold">PRIME ENTERPRISE PH</span></div></div></div>}<ReceiptOcrScanner expectedAmount={payable} expectedReceiver="PRIME ENTERPRISE PH" initialReceiptUrl={receiptUrl || undefined} initialOcrResult={ocrResult} title={`Proof of Payment ${paymentMethod === 'DIRECT_TRANSFER' ? '(Required)' : '(Optional)'}`} onOcrComplete={(result, uri) => { setOcrResult(result); setReceiptUrl(uri); }} onRemoveReceipt={() => { setOcrResult(null); setReceiptUrl(null); }}/></Card><Summary title="Order Total" icon={<ShieldCheck size={16}/>} onEdit={() => setStep(3)}><Line label="Final payable" value={formatCurrency(payable)}/></Summary><div className="flex gap-2"><Back onClick={() => setStep(3)}/><button type="button" onClick={submitOrder} disabled={submitting || !quote} className="flex-[2] bg-black text-white py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{submitting ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}<span>{submitting ? 'SUBMITTING...' : 'SUBMIT ORDER'}</span></button></div><p className="text-[10px] text-neutral-400 text-center">Server revalidates identity, stock, courier, pricing and totals before order creation.</p></div>}
    </main>
  </div>;
}

function EmptyCheckout(){return <div className="bg-[#f3f4f6] min-h-full p-6 text-center py-20"><ShoppingBag size={48} className="mx-auto mb-3 text-neutral-400"/><h2 className="text-xl uppercase" style={{fontFamily:"'Roboto Condensed',sans-serif"}}>No items selected for checkout</h2><p className="text-xs text-neutral-500 mt-1 mb-4">Select products in your cart before proceeding.</p><Link to="/shop/cart" className="inline-block bg-black text-white px-5 py-2.5 rounded-xl text-sm">Return to Cart</Link></div>}
function Card({title,icon,children}:{title:string;icon:React.ReactNode;children:React.ReactNode}){return <section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3"><div className="flex items-center gap-2 text-sm uppercase pb-2 border-b border-neutral-100" style={{fontFamily:"'Roboto Condensed',sans-serif"}}>{icon}<span>{title}</span></div>{children}</section>}
function Summary({title,icon,onEdit,children}:{title:string;icon:React.ReactNode;onEdit:()=>void;children:React.ReactNode}){return <Card title={title} icon={icon}><div className="flex justify-end -mt-8"><button type="button" onClick={onEdit} className="text-[10px] text-neutral-500 flex items-center gap-1"><Edit2 size={10}/>Edit</button></div><div className="text-xs space-y-1">{children}</div></Card>}
function Line({label,value}:{label:string;value:string}){return <div className="flex justify-between text-xs"><span>{label}</span><span className="font-semibold">{value}</span></div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="text-[11px] text-neutral-600 uppercase">{label}</span><div className="mt-1">{children}</div></label>}
function Pay({selected,onClick,title,desc}:{selected:boolean;onClick:()=>void;title:string;desc:string}){return <button type="button" onClick={onClick} className={`p-3 rounded-xl border text-left ${selected?'bg-neutral-900 text-white border-black':'bg-white border-neutral-200'}`}><div className="text-xs font-semibold uppercase">{title}</div><div className="text-[10px] opacity-70 mt-1">{desc}</div></button>}
function Back({onClick}:{onClick:()=>void}){return <button type="button" onClick={onClick} className="flex-1 bg-white border border-neutral-200 py-3.5 rounded-xl flex items-center justify-center gap-1"><ArrowLeft size={16}/>Back</button>}
function PrimaryButton({label,disabled=false,onClick}:{label:string;disabled?:boolean;onClick?:()=>void}){return <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={disabled} className="flex-[2] bg-black text-white py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">{label}<ArrowRight size={17}/></button>}
