import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Copy, Percent, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Coupon = Record<string, any> & { id: string; code: string; value: number; type: "fixed" | "percent" | "free_delivery"; active: boolean; usageCount?: number };

type FormState = {
  code: string;
  name: string;
  description: string;
  type: "fixed" | "percent" | "free_delivery";
  value: string;
  minCartValue: string;
  maxCartValue: string;
  minQuantity: string;
  eligibleProductIds: string;
  eligibleSkus: string;
  excludedProductIds: string;
  excludedSkus: string;
  eligibleCategories: string;
  excludedCategories: string;
  bogoBuyProductIds: string;
  bogoBuySkus: string;
  bogoBuyQuantity: string;
  bogoRewardProductIds: string;
  bogoRewardQuantity: string;
  newCustomersOnly: boolean;
  existingCustomersOnly: boolean;
  userIds: string;
  emails: string;
  userGroups: string;
  roles: string;
  vipTiers: string[];
  firstOrderPerUser: boolean;
  maxUses: string;
  maxUsesPerUser: string;
  singleUse: boolean;
  startAt: string;
  endAt: string;
  daysOfWeek: number[];
  startTimeOfDay: string;
  endTimeOfDay: string;
  exclusive: boolean;
  allowAutomaticDiscounts: boolean;
  allowOtherCoupons: boolean;
  priority: string;
  deliveryAreas: string;
  fulfillmentMethods: string;
  maxDiscount: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  code: "", name: "", description: "", type: "percent", value: "10", minCartValue: "0", maxCartValue: "", minQuantity: "0",
  eligibleProductIds: "", eligibleSkus: "", excludedProductIds: "", excludedSkus: "", eligibleCategories: "", excludedCategories: "",
  bogoBuyProductIds: "", bogoBuySkus: "", bogoBuyQuantity: "", bogoRewardProductIds: "", bogoRewardQuantity: "",
  newCustomersOnly: false, existingCustomersOnly: false, userIds: "", emails: "", userGroups: "", roles: "", vipTiers: [], firstOrderPerUser: false,
  maxUses: "", maxUsesPerUser: "", singleUse: false, startAt: "", endAt: "", daysOfWeek: [], startTimeOfDay: "", endTimeOfDay: "",
  exclusive: false, allowAutomaticDiscounts: true, allowOtherCoupons: true, priority: "0", deliveryAreas: "", fulfillmentMethods: "", maxDiscount: "", active: true,
});

const VIPS = ["Bronze", "Silver", "Gold", "Platinum"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PRESETS = [
  { label: "10% New Customer", value: "10", type: "percent" as const, min: "500", newOnly: true },
  { label: "₱100 Loyal Member", value: "100", type: "fixed" as const, min: "1500", newOnly: false },
  { label: "VIP 20%", value: "20", type: "percent" as const, min: "2000", newOnly: false },
  { label: "Free Delivery", value: "0", type: "free_delivery" as const, min: "1000", newOnly: false },
];

const csv = (value: string) => value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);

function TextField({ label, value, onChange, placeholder, inputMode = "text" }: any) {
  return <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span><input inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs font-sans outline-none focus:border-black" /></label>;
}

function NumberField({ label, value, onChange, placeholder }: any) {
  return <TextField label={label} value={value} onChange={onChange} placeholder={placeholder} inputMode="decimal" />;
}

function Switch({ label, checked, onChange, help }: any) {
  return <label className="flex items-start justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 cursor-pointer"><span className="min-w-0"><span className="block text-xs font-bold text-neutral-800">{label}</span>{help && <span className="block text-[10px] text-neutral-500 mt-0.5 leading-4">{help}</span>}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-black" /></label>;
}

function Section({ title, open, onToggle, children }: any) {
  return <div className="rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden"><button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"><span className="text-xs font-bold uppercase tracking-wide text-neutral-800">{title}</span>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>{open && <div className="border-t border-neutral-200 p-3 space-y-3">{children}</div>}</div>;
}

export default function AdminDiscountsPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ cart: true, customer: false, usage: false, schedule: false, stack: false, delivery: false });

  const refresh = async () => {
    const response = await fetch("/api/admin/coupons", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to load coupons");
    setCoupons(Array.isArray(data.coupons) ? data.coupons : []);
  };

  useEffect(() => { void refresh().catch((error) => toast.error(error.message)); }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const reset = () => { setEditing(null); setForm(emptyForm()); };

  const generate = async () => {
    setCodeBusy(true);
    try {
      const response = await fetch("/api/admin/coupons/generate", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefix: "PRIME", length: 6 }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to generate code");
      set("code", data.code || "");
      toast.success(`Generated ${data.code}`);
    } catch (error: any) { toast.error(error.message); } finally { setCodeBusy(false); }
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setForm((current) => ({ ...current, code: "", type: preset.type, value: preset.value, minCartValue: preset.min, newCustomersOnly: preset.newOnly }));
    toast.success(`Loaded ${preset.label} preset`);
  };

  const payload = useMemo(() => ({
    code: form.code.trim().toUpperCase(), name: form.name.trim(), description: form.description.trim(), type: form.type, value: Number(form.value) || 0,
    minCartValue: Number(form.minCartValue) || 0, maxCartValue: form.maxCartValue ? Number(form.maxCartValue) : null, minQuantity: Number(form.minQuantity) || 0,
    eligibleProductIds: csv(form.eligibleProductIds), eligibleSkus: csv(form.eligibleSkus), excludedProductIds: csv(form.excludedProductIds), excludedSkus: csv(form.excludedSkus),
    eligibleCategories: csv(form.eligibleCategories), excludedCategories: csv(form.excludedCategories),
    bogoRules: form.bogoBuyProductIds || form.bogoBuySkus ? [{ buyProductIds: csv(form.bogoBuyProductIds), buySkus: csv(form.bogoBuySkus), buyQuantity: Number(form.bogoBuyQuantity) || 1, rewardProductIds: csv(form.bogoRewardProductIds), rewardQuantity: Number(form.bogoRewardQuantity) || 0 }] : [],
    newCustomersOnly: form.newCustomersOnly, existingCustomersOnly: form.existingCustomersOnly, userIds: csv(form.userIds), emails: csv(form.emails), userGroups: csv(form.userGroups), roles: csv(form.roles), vipTiers: form.vipTiers, firstOrderPerUser: form.firstOrderPerUser,
    maxUses: form.maxUses ? Number(form.maxUses) : null, maxUsesPerUser: form.maxUsesPerUser ? Number(form.maxUsesPerUser) : null, singleUse: form.singleUse,
    startAt: form.startAt ? new Date(form.startAt).toISOString() : null, endAt: form.endAt ? new Date(form.endAt).toISOString() : null, daysOfWeek: form.daysOfWeek, startTimeOfDay: form.startTimeOfDay || null, endTimeOfDay: form.endTimeOfDay || null,
    exclusive: form.exclusive, allowAutomaticDiscounts: form.allowAutomaticDiscounts, allowOtherCoupons: form.allowOtherCoupons, priority: Number(form.priority) || 0,
    deliveryAreas: csv(form.deliveryAreas), fulfillmentMethods: csv(form.fulfillmentMethods), maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null, active: form.active,
  }), [form]);

  const save = async () => {
    if (!payload.code) { toast.error("Enter or generate a coupon code."); return; }
    setBusy(true);
    try {
      const response = await fetch(editing ? `/api/admin/coupons/${encodeURIComponent(editing)}` : "/api/admin/coupons", { method: editing ? "PATCH" : "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save coupon");
      await refresh(); reset(); toast.success(editing ? "Coupon updated." : "Coupon created.");
    } catch (error: any) { toast.error(error.message); } finally { setBusy(false); }
  };

  const edit = (coupon: Coupon) => {
    const next = emptyForm();
    next.code = coupon.code || ""; next.name = coupon.name || ""; next.description = coupon.description || ""; next.type = coupon.type || "percent"; next.value = String(coupon.value ?? 0);
    next.minCartValue = String(coupon.minCartValue ?? coupon.minSubtotal ?? 0); next.maxCartValue = coupon.maxCartValue == null ? "" : String(coupon.maxCartValue); next.minQuantity = String(coupon.minQuantity ?? 0);
    next.eligibleProductIds = (coupon.eligibleProductIds || []).join(", "); next.eligibleSkus = (coupon.eligibleSkus || []).join(", "); next.excludedProductIds = (coupon.excludedProductIds || []).join(", "); next.excludedSkus = (coupon.excludedSkus || []).join(", ");
    next.eligibleCategories = (coupon.eligibleCategories || []).join(", "); next.excludedCategories = (coupon.excludedCategories || []).join(", ");
    const bogo = coupon.bogoRules?.[0]; if (bogo) { next.bogoBuyProductIds = (bogo.buyProductIds || []).join(", "); next.bogoBuySkus = (bogo.buySkus || []).join(", "); next.bogoBuyQuantity = String(bogo.buyQuantity || 1); next.bogoRewardProductIds = (bogo.rewardProductIds || []).join(", "); next.bogoRewardQuantity = String(bogo.rewardQuantity || 0); }
    next.newCustomersOnly = !!coupon.newCustomersOnly; next.existingCustomersOnly = !!coupon.existingCustomersOnly; next.userIds = (coupon.userIds || []).join(", "); next.emails = (coupon.emails || []).join(", "); next.userGroups = (coupon.userGroups || []).join(", "); next.roles = (coupon.roles || []).join(", "); next.vipTiers = coupon.vipTiers || []; next.firstOrderPerUser = !!coupon.firstOrderPerUser;
    next.maxUses = coupon.maxUses == null ? "" : String(coupon.maxUses); next.maxUsesPerUser = coupon.maxUsesPerUser == null ? "" : String(coupon.maxUsesPerUser); next.singleUse = !!coupon.singleUse;
    next.startAt = coupon.startAt ? new Date(coupon.startAt).toISOString().slice(0, 16) : ""; next.endAt = coupon.endAt ? new Date(coupon.endAt).toISOString().slice(0, 16) : ""; next.daysOfWeek = coupon.daysOfWeek || []; next.startTimeOfDay = coupon.startTimeOfDay || ""; next.endTimeOfDay = coupon.endTimeOfDay || "";
    next.exclusive = !!coupon.exclusive; next.allowAutomaticDiscounts = coupon.allowAutomaticDiscounts !== false; next.allowOtherCoupons = coupon.allowOtherCoupons !== false; next.priority = String(coupon.priority ?? 0);
    next.deliveryAreas = (coupon.deliveryAreas || []).join(", "); next.fulfillmentMethods = (coupon.fulfillmentMethods || []).join(", "); next.maxDiscount = coupon.maxDiscount == null ? "" : String(coupon.maxDiscount); next.active = coupon.active !== false;
    setForm(next); setEditing(coupon.code); setOpenSections({ cart: true, customer: true, usage: true, schedule: true, stack: true, delivery: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCoupon = async (code: string) => {
    if (!window.confirm(`Delete ${code}?`)) return;
    const response = await fetch(`/api/admin/coupons/${encodeURIComponent(code)}`, { method: "DELETE", credentials: "same-origin" });
    if (!response.ok) { toast.error("Unable to delete coupon."); return; }
    await refresh(); if (editing === code) reset(); toast.success("Coupon deleted.");
  };

  const toggleVip = (tier: string) => set("vipTiers", form.vipTiers.includes(tier) ? form.vipTiers.filter((item) => item !== tier) : [...form.vipTiers, tier]);
  const toggleDay = (day: number) => set("daysOfWeek", form.daysOfWeek.includes(day) ? form.daysOfWeek.filter((item) => item !== day) : [...form.daysOfWeek, day]);
  const section = (key: string, title: string) => <Section title={title} open={!!openSections[key]} onToggle={() => setOpenSections((current) => ({ ...current, [key]: !current[key] }))} />;

  return (
    <section className="min-h-screen w-full bg-white text-black px-3 py-3 pb-24 sm:px-5 sm:py-5 font-condensed">
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
        <button type="button" onClick={() => navigate("/admin")} className="rounded-xl border border-neutral-200 p-2"><ArrowLeft size={17} /></button>
        <div className="min-w-0"><h1 className="text-lg font-bold uppercase tracking-tight">COUPON / VOUCHER CONFIGURATOR</h1><p className="text-[10px] text-neutral-500 font-sans">Server-authoritative eligibility, usage, schedule, stacking and delivery rules.</p></div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-[10px] font-bold uppercase hover:bg-neutral-100">{preset.label}</button>)}
      </div>

      <div className="mt-3 space-y-3">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-950 p-3 text-white">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end"><TextField label="Coupon Code" value={form.code} onChange={(value: string) => set("code", value.toUpperCase())} placeholder="PRIME10" /><button type="button" onClick={() => void generate()} disabled={codeBusy} className="min-h-11 rounded-xl bg-white px-4 text-xs font-bold text-black flex items-center justify-center gap-2">{codeBusy ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate / Backup</button></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><TextField label="Internal Name" value={form.name} onChange={(value: string) => set("name", value)} placeholder="VIP Weekend 20" /><TextField label="Description" value={form.description} onChange={(value: string) => set("description", value)} placeholder="Short operator note" /></div>
        </div>

        <div className="rounded-2xl border border-neutral-200 p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2"><label className="space-y-1"><span className="text-[10px] font-bold uppercase text-neutral-500">Discount Type</span><select value={form.type} onChange={(e) => set("type", e.target.value as FormState["type"])} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs"><option value="percent">Percentage</option><option value="fixed">Fixed Amount</option><option value="free_delivery">Free Delivery</option></select></label><NumberField label="Discount Value" value={form.value} onChange={set("value" as any, undefined as never) as any} placeholder="20" /></div>
          <div className="grid grid-cols-2 gap-2"><NumberField label="Max Discount Cap" value={form.maxDiscount} onChange={(value: string) => set("maxDiscount", value)} placeholder="Optional" /><NumberField label="Priority" value={form.priority} onChange={(value: string) => set("priority", value)} placeholder="0" /></div>
        </div>

        <Section title="Cart & Product Conditions" open={!!openSections.cart} onToggle={() => setOpenSections((current) => ({ ...current, cart: !current.cart }))}>
          <div className="grid grid-cols-2 gap-2"><NumberField label="Minimum Cart Value" value={form.minCartValue} onChange={(value: string) => set("minCartValue", value)} placeholder="0" /><NumberField label="Maximum Cart Value" value={form.maxCartValue} onChange={(value: string) => set("maxCartValue", value)} placeholder="No cap" /></div>
          <NumberField label="Minimum Quantity" value={form.minQuantity} onChange={(value: string) => set("minQuantity", value)} placeholder="0" />
          <TextField label="Eligible Product IDs" value={form.eligibleProductIds} onChange={(value: string) => set("eligibleProductIds", value)} placeholder="prod-1, prod-2" />
          <TextField label="Eligible SKUs" value={form.eligibleSkus} onChange={(value: string) => set("eligibleSkus", value)} placeholder="SKU001, SKU002" />
          <TextField label="Excluded Product IDs" value={form.excludedProductIds} onChange={(value: string) => set("excludedProductIds", value)} placeholder="Clearance IDs" />
          <TextField label="Excluded SKUs" value={form.excludedSkus} onChange={(value: string) => set("excludedSkus", value)} placeholder="High-margin SKUs" />
          <TextField label="Eligible Categories" value={form.eligibleCategories} onChange={(value: string) => set("eligibleCategories", value)} placeholder="Audio, Cameras" />
          <TextField label="Excluded Categories" value={form.excludedCategories} onChange={(value: string) => set("excludedCategories", value)} placeholder="Clearance" />
          <div className="rounded-xl border border-dashed border-neutral-300 p-3 space-y-2"><div className="text-[10px] font-bold uppercase text-neutral-500">BOGO / Bundle Gate</div><TextField label="Buy Product IDs" value={form.bogoBuyProductIds} onChange={(value: string) => set("bogoBuyProductIds", value)} placeholder="prod-2" /><TextField label="Buy SKUs" value={form.bogoBuySkus} onChange={(value: string) => set("bogoBuySkus", value)} placeholder="SKU001" /><div className="grid grid-cols-2 gap-2"><NumberField label="Buy Qty" value={form.bogoBuyQuantity} onChange={(value: string) => set("bogoBuyQuantity", value)} placeholder="1" /><NumberField label="Reward Qty" value={form.bogoRewardQuantity} onChange={(value: string) => set("bogoRewardQuantity", value)} placeholder="1" /></div><TextField label="Reward Product IDs" value={form.bogoRewardProductIds} onChange={(value: string) => set("bogoRewardProductIds", value)} placeholder="prod-2" /></div>
        </Section>

        <Section title="Customer & Account Conditions" open={!!openSections.customer} onToggle={() => setOpenSections((current) => ({ ...current, customer: !current.customer }))}>
          <Switch label="New Customers Only" checked={form.newCustomersOnly} onChange={(value: boolean) => set("newCustomersOnly", value)} help="Requires order count = 0." />
          <Switch label="Existing Customers Only" checked={form.existingCustomersOnly} onChange={(value: boolean) => set("existingCustomersOnly", value)} help="Requires at least one prior order." />
          <Switch label="First Order Per User" checked={form.firstOrderPerUser} onChange={(value: boolean) => set("firstOrderPerUser", value)} help="Blocks a second redemption by the same customer." />
          <TextField label="Specific User IDs" value={form.userIds} onChange={(value: string) => set("userIds", value)} placeholder="Telegram user IDs" />
          <TextField label="Email Whitelist" value={form.emails} onChange={(value: string) => set("emails", value)} placeholder="name@example.com" />
          <TextField label="User Groups" value={form.userGroups} onChange={(value: string) => set("userGroups", value)} placeholder="Wholesale, VIP" />
          <TextField label="Roles" value={form.roles} onChange={(value: string) => set("roles", value)} placeholder="employee" />
          <div><div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">VIP Tiers</div><div className="grid grid-cols-2 gap-2">{VIPS.map((tier) => <button key={tier} type="button" onClick={() => toggleVip(tier)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${form.vipTiers.includes(tier) ? "border-black bg-black text-white" : "border-neutral-200 bg-white text-neutral-700"}`}>{form.vipTiers.includes(tier) && <Check size={13} className="inline mr-1" />}{tier}</button>)}</div></div>
        </Section>

        <Section title="Usage & Limits" open={!!openSections.usage} onToggle={() => setOpenSections((current) => ({ ...current, usage: !current.usage }))}>
          <div className="grid grid-cols-2 gap-2"><NumberField label="Total Usage Limit" value={form.maxUses} onChange={(value: string) => set("maxUses", value)} placeholder="Unlimited" /><NumberField label="Per-user Limit" value={form.maxUsesPerUser} onChange={(value: string) => set("maxUsesPerUser", value)} placeholder="Unlimited" /></div>
          <Switch label="One-Time Use Coupon" checked={form.singleUse} onChange={(value: boolean) => set("singleUse", value)} help="Server invalidates the code after one successful redemption." />
        </Section>

        <Section title="Temporal & Schedule" open={!!openSections.schedule} onToggle={() => setOpenSections((current) => ({ ...current, schedule: !current.schedule }))}>
          <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-neutral-500">Start Date / Time</span><input type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs" /></label>
          <label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-neutral-500">Expiration Date / Time</span><input type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs" /></label>
          <div><div className="text-[10px] font-bold uppercase text-neutral-500 mb-1">Days of Week</div><div className="grid grid-cols-4 gap-2">{DAYS.map((day, index) => <button key={day} type="button" onClick={() => toggleDay(index)} className={`rounded-xl border px-2 py-2 text-[11px] font-bold ${form.daysOfWeek.includes(index) ? "bg-black text-white border-black" : "bg-white border-neutral-200"}`}>{day}</button>)}</div></div>
          <div className="grid grid-cols-2 gap-2"><label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-neutral-500">Start Time</span><input type="time" value={form.startTimeOfDay} onChange={(e) => set("startTimeOfDay", e.target.value)} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs" /></label><label className="space-y-1 block"><span className="text-[10px] font-bold uppercase text-neutral-500">End Time</span><input type="time" value={form.endTimeOfDay} onChange={(e) => set("endTimeOfDay", e.target.value)} className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 text-xs" /></label></div>
        </Section>

        <Section title="Compatibility & Stacking" open={!!openSections.stack} onToggle={() => setOpenSections((current) => ({ ...current, stack: !current.stack }))}>
          <Switch label="Exclusively Solitary" checked={form.exclusive} onChange={(value: boolean) => set("exclusive", value)} help="Blocks automatic discounts and other coupons." />
          <Switch label="Allow Automatic Discounts" checked={form.allowAutomaticDiscounts} onChange={(value: boolean) => set("allowAutomaticDiscounts", value)} />
          <Switch label="Allow Other Coupon Codes" checked={form.allowOtherCoupons} onChange={(value: boolean) => set("allowOtherCoupons", value)} />
        </Section>

        <Section title="Geographic & Delivery Conditions" open={!!openSections.delivery} onToggle={() => setOpenSections((current) => ({ ...current, delivery: !current.delivery }))}>
          <TextField label="Delivery Areas" value={form.deliveryAreas} onChange={(value: string) => set("deliveryAreas", value)} placeholder="BGC, Makati, Taguig" />
          <TextField label="Fulfillment Method / Carrier IDs" value={form.fulfillmentMethods} onChange={(value: string) => set("fulfillmentMethods", value)} placeholder="courier-1, courier-2" />
        </Section>

        <Switch label="Coupon Active" checked={form.active} onChange={(value: boolean) => set("active", value)} />

        <div className="sticky bottom-2 z-20 flex gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-2 shadow-xl backdrop-blur">
          <button type="button" onClick={reset} className="min-h-11 flex-1 rounded-xl border border-neutral-300 text-xs font-bold uppercase">Clear</button>
          <button type="button" disabled={busy} onClick={() => void save()} className="min-h-11 flex-[2] rounded-xl bg-black text-white text-xs font-bold uppercase disabled:opacity-50">{busy ? "Saving…" : editing ? "Update Coupon" : "Create Coupon"}</button>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-wide">Configured Coupons ({coupons.length})</h2><button type="button" onClick={() => void refresh()} className="rounded-lg border border-neutral-200 p-2"><RefreshCw size={14} /></button></div>
        {coupons.map((coupon) => <div key={coupon.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-mono text-sm font-bold tracking-wide">{coupon.code}</div><div className="text-[10px] text-neutral-500 mt-0.5">{coupon.name || "Unnamed campaign"}</div></div><div className="flex items-center gap-1"><button type="button" onClick={() => { navigator.clipboard?.writeText(coupon.code); toast.success("Coupon code copied."); }} className="rounded-lg border border-neutral-200 bg-white p-2"><Copy size={13} /></button><button type="button" onClick={() => edit(coupon)} className="rounded-lg bg-black px-3 py-2 text-[10px] font-bold text-white uppercase">Edit</button></div></div>
          <div className="grid grid-cols-3 gap-2 text-[10px]"><div className="rounded-xl border border-neutral-200 bg-white p-2"><span className="text-neutral-500 block uppercase">Offer</span><strong>{coupon.type === "percent" ? `${coupon.value}%` : coupon.type === "free_delivery" ? "FREE SHIP" : `₱${Number(coupon.value).toLocaleString()}`}</strong></div><div className="rounded-xl border border-neutral-200 bg-white p-2"><span className="text-neutral-500 block uppercase">Uses</span><strong>{coupon.usageCount || 0}{coupon.maxUses != null ? ` / ${coupon.maxUses}` : ""}</strong></div><div className="rounded-xl border border-neutral-200 bg-white p-2"><span className="text-neutral-500 block uppercase">Status</span><strong className={coupon.active ? "text-emerald-700" : "text-neutral-400"}>{coupon.active ? "ACTIVE" : "OFF"}</strong></div></div>
          <div className="flex justify-end"><button type="button" onClick={() => void deleteCoupon(coupon.code)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase text-red-600 hover:bg-red-50"><Trash2 size={12} /> Delete</button></div>
        </div>)}
      </div>
    </section>
  );
}
