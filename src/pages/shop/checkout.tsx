import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, CreditCard, Edit2, FileCheck, Loader2, MapPin, Phone, ShieldCheck, ShoppingBag, Truck, User } from "lucide-react";
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

const steps = [
  { id: 1 as const, label: "Receiver", short: "Receiver" },
  { id: 2 as const, label: "Delivery", short: "Delivery" },
  { id: 3 as const, label: "Review", short: "Review" },
  { id: 4 as const, label: "Payment", short: "Payment" },
];

export default function CheckoutPage() {
  const { items, subtotal, selectedItems, selectedSubtotal, removeSelectedItems, clearCart } = useCart();
  const { customer } = useTelegram();
  const { createOrder } = useOrders(customer?.telegramUserId);
  const { couriers, calculateDeliveryCharge } = useCouriers();
  const navigate = useNavigate();
  const itemsToCheckout = selectedItems.length > 0 ? selectedItems : items;
  const activeSubtotal = selectedItems.length > 0 ? selectedSubtotal : subtotal;
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(1);
  const [recipientName, setRecipientName] = useState(customer?.telegramDisplayName || "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [deliveryPaymentOption, setDeliveryPaymentOption] = useState<DeliveryPaymentOption>("PAY_AT_CHECKOUT");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TELEGRAM_PAY");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<ReceiptOcrResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addressInput, setAddressInput, suggestions, isLoading: isGeoLoading, isLocating, isOpen: isGeoOpen, setIsOpen: setIsGeoOpen, selectedLocation, selectSuggestion, detectCurrentLocation, detectIpLocation, routeInfo, isCalculatingRoute, geoConfig } = useAddressAutocomplete("");
  const selectedCourier = couriers.find((courier) => courier.id === selectedCourierId);
  const actualDistanceKm = routeInfo?.distanceKm ?? 0;
  const courierCharge = selectedCourier ? calculateDeliveryCharge(selectedCourier, actualDistanceKm) : 0;
  const shipping = activeSubtotal > 0 && activeSubtotal > 2500 ? 0 : courierCharge;
  const estTax = Math.round(activeSubtotal * 0.05 * 100) / 100;
  const grandTotal = activeSubtotal + estTax + shipping;
  const MAX_NOTES = 160;
  const orderNumberPreview = useMemo(() => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0"); const mm = String(now.getMonth() + 1).padStart(2, "0"); const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, "0"); const min = String(now.getMinutes()).padStart(2, "0"); const sec = String(now.getSeconds()).padStart(2, "0");
    return `${dd}${mm}${yy}${hh}${min}${sec}`;
  }, []);
  const validateReceiver = () => {
    if (!customer?.telegramUserId) { toast.error("Open checkout from the Telegram Mini App to continue."); return false; }
    if (!recipientName.trim()) { toast.error("Please enter the receiver name."); return false; }
    if (!phone.trim()) { toast.error("Please enter a contact phone number."); return false; }
    if (!addressInput.trim() || !selectedLocation) { toast.error("Select a delivery address from the suggested addresses."); return false; }
    return true;
  };
  const validateDelivery = () => {
    if (!selectedCourier || !selectedCourier.isAvailable) { toast.error("Select an available delivery provider."); return false; }
    if (!routeInfo) { toast.error("Please wait for the delivery route and fee to finish calculating."); return false; }
    return true;
  };
  const validatePayment = () => {
    if (paymentMethod === "DIRECT_TRANSFER" && !receiptPreview) { toast.error("Upload your payment proof before submitting."); return false; }
    return true;
  };
  const goToStep = (step: CheckoutStep) => {
    if (step < currentStep) { setCurrentStep(step); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (step === 2 && currentStep === 1 && validateReceiver()) setCurrentStep(2);
    else if (step === 3 && currentStep <= 2 && validateDelivery()) setCurrentStep(3);
    else if (step === 4 && currentStep <= 3) setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleNext = (event: FormEvent) => { event.preventDefault(); goToStep((currentStep + 1) as CheckoutStep); };
  const handlePlaceOrder = async () => {
    if (!validateReceiver() || !validateDelivery() || !validatePayment()) return;
    if (itemsToCheckout.length === 0) { toast.error("Your cart is empty."); return; }
    setIsSubmitting(true);
    try {
      const orderItems = itemsToCheckout.map((item) => ({ productId: item.productId, productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.unitPrice * item.quantity }));
      const created = await createOrder({
        orderNumber: orderNumberPreview,
        telegramUserId: customer.telegramUserId,
        telegramDisplayName: customer.telegramDisplayName || recipientName,
        telegramUsername: customer.telegramUsername,
        items: orderItems,
        subtotal: activeSubtotal,
        discount: 0,
        deliveryFee: shipping,
        total: grandTotal,
        receiverName: recipientName.trim(),
        contactNumber: phone.trim(),
        deliveryAddress: addressInput.trim(),
        courierName: selectedCourier.name,
        deliveryProviderId: selectedCourier.id,
        deliveryCharge: shipping,
        deliveryPaymentMethod: deliveryPaymentOption,
        paymentMethodName: paymentMethod === "TELEGRAM_PAY" ? "Telegram Pay" : "Direct Transfer / GCash / Maya",
        paymentStatus: "PENDING",
        orderStatus: "REVIEW",
        queuePosition: 0,
        estimatedWaitingMinutes: routeInfo ? Math.max(15, Math.ceil(routeInfo.durationMinutes) + 12) : 0,
        estimatedDispatchTime: routeInfo ? `${Math.ceil(routeInfo.durationMinutes)} MIN TRANSIT` : "CALCULATING",
        adminNotes: notes.trim() || undefined,
        receiptUrl: receiptPreview || undefined,
        receiptOcrData: ocrResult || undefined,
        deliveryPaymentOption,
      });
      if (selectedItems.length > 0) removeSelectedItems(); else clearCart();
      toast.success("Order submitted for review.");
      navigate(`/shop/order-confirmation/${created.orderNumber}`, { state: { orderNumber: created.orderNumber, queuePosition: created.queuePosition, estimatedWaitingMinutes: created.estimatedWaitingMinutes, estimatedDispatchTime: created.estimatedDispatchTime, distanceKm: routeInfo?.distanceKm } });
    } catch (error) { console.error("Failed to place order:", error); toast.error("Unable to submit the order. Please try again."); }
    finally { setIsSubmitting(false); }
  };
  if (itemsToCheckout.length === 0) return <div className="bg-[#f3f4f6] min-h-full p-6 text-center py-20"><div className="w-16 h-16 bg-neutral-200/60 rounded-full flex items-center justify-center mx-auto mb-3"><ShoppingBag size={28} className="text-neutral-500" /></div><h2 className="text-xl font-normal text-neutral-800 uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>No items selected for checkout</h2><p className="text-xs text-neutral-500 mt-1 mb-4" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Select products in your cart before proceeding.</p><Link to="/shop/cart" className="inline-block bg-black text-white px-5 py-2.5 rounded-xl text-sm" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Return to Cart</Link></div>;
  return <div className="bg-[#f3f4f6] min-h-full pb-14">
    <header className="bg-white border-b border-neutral-200 px-4 py-3 sticky top-0 z-20 shadow-2xs">
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><button type="button" onClick={() => currentStep === 1 ? navigate("/shop/cart") : setCurrentStep((currentStep - 1) as CheckoutStep)} className="p-1.5 -ml-1 text-neutral-700 rounded-lg hover:bg-neutral-100" aria-label="Go back"><ArrowLeft size={19} /></button><div><h1 className="text-black font-normal uppercase text-lg leading-none" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>CHECKOUT</h1><p className="text-[11px] text-neutral-500 mt-0.5" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Step {currentStep} of 4 • {steps[currentStep - 1].label}</p></div></div><div className="text-right"><div className="text-[10px] text-neutral-400 uppercase" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Total Payable</div><div className="text-sm font-semibold text-black leading-none" style={{ fontFamily: "'Ubuntu', sans-serif" }}>{formatCurrency(grandTotal)}</div></div></div>
      <div className="mt-3 pt-2 border-t border-neutral-100 grid grid-cols-4 gap-1.5">{steps.map((step) => { const active = currentStep === step.id; const passed = currentStep > step.id; return <button key={step.id} type="button" onClick={() => goToStep(step.id)} disabled={step.id > currentStep + 1} className={`flex items-center justify-center gap-1 py-2 rounded-lg transition-all ${active ? "bg-neutral-900 text-white" : passed ? "bg-neutral-100 text-neutral-800" : "bg-neutral-50 text-neutral-400"}`}><span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${active ? "bg-white text-black" : passed ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-500"}`}>{passed ? <Check size={9} strokeWidth={3} /> : step.id}</span><span className="text-[10px] font-medium uppercase" style={{ fontFamily: "'Ubuntu', sans-serif" }}>{step.short}</span></button>; })}</div>
    </header>
    <main className="p-3 space-y-3">
      {currentStep === 1 && <form onSubmit={handleNext} className="space-y-3"><section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3.5"><SectionTitle icon={<User size={16} />} title="Receiver Information" /><Field label="Receiver Full Name" icon={<User size={12} />}><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} required placeholder="Full name" className="checkout-input" /></Field><Field label="Contact Phone Number" icon={<Phone size={12} />}><input value={phone} onChange={(event) => setPhone(event.target.value)} required type="tel" placeholder="09XX XXX XXXX" className="checkout-input" /></Field></section><section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3"><SectionTitle icon={<MapPin size={16} />} title="Delivery Address" /><GeoAddressAutocomplete addressInput={addressInput} onAddressChange={setAddressInput} suggestions={suggestions} isLoading={isGeoLoading} isLocating={isLocating} isOpen={isGeoOpen} setIsOpen={setIsGeoOpen} selectedLocation={selectedLocation} onSelectSuggestion={selectSuggestion} onDetectGps={detectCurrentLocation} onDetectIp={detectIpLocation} routeInfo={routeInfo} isCalculatingRoute={isCalculatingRoute} warehouseName={geoConfig?.warehouse.name} hasGeoapifyKey={geoConfig?.hasApiKey} /><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={MAX_NOTES} rows={2} placeholder="Landmark, gate, unit, or rider instructions (optional)" className="checkout-input resize-none" /><div className="text-right text-[10px] text-neutral-400">{notes.length}/{MAX_NOTES}</div></section><StepButton label="Continue to Delivery" /></form>}
      {currentStep === 2 && <form onSubmit={handleNext} className="space-y-3"><section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3"><SectionTitle icon={<Truck size={16} />} title="Delivery Provider" /><p className="text-[11px] text-neutral-500" style={{ fontFamily: "'Ubuntu', sans-serif" }}>Once your address is selected, available delivery providers and calculated fees are shown below.</p><div className="grid grid-cols-4 gap-2">{couriers.map((courier) => { const selected = selectedCourierId === courier.id; const charge = calculateDeliveryCharge(courier, actualDistanceKm); return <button key={courier.id} type="button" disabled={!courier.isAvailable} onClick={() => setSelectedCourierId(courier.id)} className={`relative min-h-[92px] flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${!courier.isAvailable ? "bg-neutral-100 border-neutral-200 opacity-50" : selected ? "bg-neutral-900 text-white border-black" : "bg-white border-neutral-200 hover:bg-neutral-50"}`}>{selected && <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center"><Check size={10} strokeWidth={3} /></span>}{courier.isAvailable ? <><img src={courier.logoUrl} alt={courier.name} className="w-9 h-9 object-contain mb-1" /><span className="text-[9px] font-semibold text-center leading-tight">{courier.name}</span><span className={`text-[10px] font-bold mt-0.5 ${selected ? "text-white" : "text-black"}`}>{shipping === 0 ? "FREE" : formatCurrency(charge)}</span></> : <span className="text-[8px] font-bold uppercase">Unavailable</span>}</button>; })}</div>{selectedCourier && routeInfo && <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 flex items-center justify-between text-xs"><span className="text-neutral-500">Route</span><span className="font-semibold">{routeInfo.distanceKm.toFixed(1)} km • {Math.ceil(routeInfo.durationMinutes)} min</span></div>}</section><section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3"><SectionTitle icon={<Truck size={16} />} title="Delivery Fee Payment" /><div className="grid grid-cols-2 gap-2">{(["PAY_AT_CHECKOUT", "PAY_UPON_FULFILLMENT"] as DeliveryPaymentOption[]).map((option) => { const selected = deliveryPaymentOption === option; return <button key={option} type="button" onClick={() => setDeliveryPaymentOption(option)} className={`text-left p-3 rounded-xl border ${selected ? "bg-neutral-900 text-white border-black" : "bg-white border-neutral-200"}`}><div className="text-xs font-semibold uppercase">{option === "PAY_AT_CHECKOUT" ? "Pay at Checkout" : "Pay upon Fulfillment"}</div><div className={`text-[10px] mt-1 ${selected ? "text-neutral-300" : "text-neutral-500"}`}>{option === "PAY_AT_CHECKOUT" ? "Include delivery fee in the payment total." : "Settle the delivery charge when fulfillment is arranged."}</div></button>; })}</div></section><div className="flex gap-2"><BackButton onClick={() => setCurrentStep(1)} /><StepButton label="Review Order" /></div></form>}
      {currentStep === 3 && <div className="space-y-3"><SummaryCard title="Receiver & Address" icon={<MapPin size={16} />} onEdit={() => setCurrentStep(1)}><p className="font-semibold">{recipientName}</p><p>{phone}</p><p>{addressInput}</p>{notes && <p className="italic mt-1">“{notes}”</p>}</SummaryCard><SummaryCard title="Delivery" icon={<Truck size={16} />} onEdit={() => setCurrentStep(2)}><div className="flex justify-between"><span>{selectedCourier?.name || "Not selected"}</span><span className="font-semibold">{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span></div><p>{actualDistanceKm ? `${actualDistanceKm.toFixed(1)} km` : "Route pending"} • {deliveryPaymentOption === "PAY_AT_CHECKOUT" ? "Pay at checkout" : "Pay upon fulfillment"}</p></SummaryCard><section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-2"><div className="flex items-center gap-2 text-black uppercase pb-2 border-b border-neutral-100" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}><ShoppingBag size={16} /> Order Items</div>{itemsToCheckout.map((item) => <div key={item.productId} className="flex justify-between text-xs"><span>{item.productName} × {item.quantity}</span><span>{formatCurrency(item.unitPrice * item.quantity)}</span></div>)}<div className="pt-2 mt-1 border-t border-neutral-100 flex justify-between text-xs"><span>Items Subtotal</span><span>{formatCurrency(activeSubtotal)}</span></div><div className="flex justify-between text-xs"><span>Estimated Tax (5%)</span><span>{formatCurrency(estTax)}</span></div><div className="flex justify-between text-xs"><span>Delivery</span><span>{shipping === 0 ? "FREE" : formatCurrency(shipping)}</span></div><div className="pt-2 mt-1 border-t border-neutral-100 flex justify-between items-baseline"><span className="text-sm uppercase font-normal" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>Final Payable</span><span className="text-xl font-semibold" style={{ fontFamily: "'Ubuntu', sans-serif" }}>{formatCurrency(grandTotal)}</span></div></section><div className="flex gap-2"><BackButton onClick={() => setCurrentStep(2)} /><StepButton label="Continue to Payment" /></div></div>}
      {currentStep === 4 && <div className="space-y-3"><section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs space-y-3.5"><SectionTitle icon={<CreditCard size={16} />} title="Payment Method" /><div className="grid grid-cols-2 gap-2"><PaymentCard selected={paymentMethod === "TELEGRAM_PAY"} onClick={() => setPaymentMethod("TELEGRAM_PAY")} title="Telegram Pay" description="Use the Telegram payment flow." /><PaymentCard selected={paymentMethod === "DIRECT_TRANSFER"} onClick={() => setPaymentMethod("DIRECT_TRANSFER")} title="Bank / GCash / Maya" description="Upload payment proof for verification." /></div>{paymentMethod === "DIRECT_TRANSFER" && <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3"><div className="flex items-center gap-1.5 text-xs font-semibold uppercase"><Building2 size={14} /> Beneficiary Account</div><div className="grid grid-cols-2 gap-2 mt-2 text-[11px]"><div><span className="text-neutral-400 block uppercase text-[9px]">GCash / Maya</span><span className="font-semibold">0919 123 1234</span></div><div><span className="text-neutral-400 block uppercase text-[9px]">Account Name</span><span className="font-semibold">PRIME ENTERPRISE PH</span></div></div></div>}<ReceiptOcrScanner expectedAmount={grandTotal} expectedReceiver="PRIME ENTERPRISE PH" initialReceiptUrl={receiptPreview || undefined} initialOcrResult={ocrResult} title={`Proof of Payment ${paymentMethod === "DIRECT_TRANSFER" ? "(Required)" : "(Optional)"}`} onOcrComplete={(result, previewUri) => { setOcrResult(result); setReceiptPreview(previewUri); }} onRemoveReceipt={() => { setOcrResult(null); setReceiptPreview(null); }} />{paymentMethod === "TELEGRAM_PAY" && <p className="text-[10px] text-neutral-500">Payment remains <strong>PENDING</strong> until the payment provider or admin verifies settlement.</p>}</section><SummaryCard title="Order Total" icon={<ShieldCheck size={16} />} onEdit={() => setCurrentStep(3)}><div className="flex justify-between"><span>Final payable</span><span className="font-semibold">{formatCurrency(grandTotal)}</span></div></SummaryCard><div className="flex gap-2"><BackButton onClick={() => setCurrentStep(3)} /><button type="button" onClick={handlePlaceOrder} disabled={isSubmitting} className="flex-[2] bg-black text-white py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50" style={{ fontFamily: "'Ubuntu', sans-serif" }}>{isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}<span>{isSubmitting ? "SUBMITTING..." : "SUBMIT ORDER"}</span></button></div><p className="text-[10px] text-neutral-400 text-center">Your order is submitted for review. Payment is not treated as confirmed until verified.</p></div>}
    </main>
  </div>;
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) { return <div className="flex items-center gap-2 text-black text-sm uppercase pb-2 border-b border-neutral-100" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>{icon}<span>{title}</span></div>; }
function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) { return <label className="block"><span className="text-[11px] text-neutral-600 uppercase flex items-center gap-1" style={{ fontFamily: "'Ubuntu', sans-serif" }}>{icon}{label}</span><div className="mt-1">{children}</div></label>; }
function PaymentCard({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) { return <button type="button" onClick={onClick} className={`relative p-3 rounded-xl border text-left transition-all ${selected ? "bg-neutral-900 text-white border-black" : "bg-white border-neutral-200"}`}>{selected && <span className="absolute top-2 right-2 w-4 h-4 bg-white text-black rounded-full flex items-center justify-center"><Check size={10} /></span>}<div className="text-xs font-semibold uppercase">{title}</div><div className={`text-[10px] mt-1 ${selected ? "text-neutral-300" : "text-neutral-500"}`}>{description}</div></button>; }
function SummaryCard({ title, icon, onEdit, children }: { title: string; icon: React.ReactNode; onEdit: () => void; children: React.ReactNode }) { return <section className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs text-xs text-neutral-700"><div className="flex items-center justify-between pb-2 border-b border-neutral-100 mb-2"><div className="flex items-center gap-2 text-black uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>{icon}{title}</div><button type="button" onClick={onEdit} className="text-[10px] text-neutral-500 flex items-center gap-1"><Edit2 size={10} /> Edit</button></div><div className="space-y-0.5" style={{ fontFamily: "'Ubuntu', sans-serif" }}>{children}</div></section>; }
function BackButton({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="flex-1 bg-white border border-neutral-200 text-neutral-700 py-3.5 rounded-xl flex items-center justify-center gap-1"><ArrowLeft size={16} /> Back</button>; }
function StepButton({ label }: { label: string }) { return <button type="submit" className="flex-[2] bg-black text-white py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "15px" }}>{label}<ArrowRight size={17} /></button>; }
