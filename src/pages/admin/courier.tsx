import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Plus, Trash2, Truck, UploadCloud, Zap } from "lucide-react";
import { useCouriers, type Courier } from "@/hooks/useCouriers";
import { CourierListSkeleton } from "@/components/admin/CourierListSkeleton.tsx";
import { formatCurrency } from "@/lib/utils.ts";
import { toast } from "sonner";

type DeliveryType = "STANDARD" | "EXPRESS" | "PRIORITY";

type CourierDraft = Omit<Courier, "id">;

const DELIVERY_TYPES: DeliveryType[] = ["STANDARD", "EXPRESS", "PRIORITY"];

const DEFAULT_DRAFT: CourierDraft = {
  name: "",
  tier: "STANDARD",
  deliveryType: "STANDARD",
  baseFare: 60,
  baseDistanceKm: 4,
  perKmCharge: 12,
  priorityFee: 0,
  expressFee: 0,
  platformFeeEnabled: false,
  platformFee: 0,
  nightDifferentialEnabled: false,
  nightDifferentialFee: 0,
  surchargeEnabled: false,
  surchargeFee: 0,
  logoUrl: "",
  isAvailable: true,
};

function deliveryLabel(courier: Courier) {
  return String(courier.deliveryType || courier.tier || "STANDARD").toUpperCase();
}

function chargePreview(courier: Courier) {
  const base = Number(courier.baseFare) || 0;
  const km = Number(courier.perKmCharge) || 0;
  const distance = Number(courier.baseDistanceKm) || 0;
  return `${formatCurrency(base)} base / ${distance}km + ${formatCurrency(km)}/km`;
}

export default function CourierPage() {
  const navigate = useNavigate();
  const { couriers, loading, updateCourier, addCourier, removeCourier } = useCouriers();
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<CourierDraft>(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CourierDraft | null>(null);

  const sortedCouriers = useMemo(() => [...couriers].sort((a, b) => a.name.localeCompare(b.name)), [couriers]);

  const resetDraft = () => setDraft({ ...DEFAULT_DRAFT });

  const saveNew = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return toast.error("Enter a delivery provider name.");
    try {
      await addCourier({
        ...draft,
        name: draft.name.trim(),
        tier: draft.deliveryType || draft.tier || "STANDARD",
        deliveryType: draft.deliveryType || draft.tier || "STANDARD",
        logoUrl: draft.logoUrl?.trim() || "/primelogo.png",
      });
      toast.success("Delivery provider added.");
      resetDraft();
      setShowAdd(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to save delivery provider.");
    }
  };

  const startEdit = (courier: Courier) => {
    const type = (courier.deliveryType || courier.tier || "STANDARD") as DeliveryType;
    setEditingId(courier.id);
    setEditDraft({ ...courier, deliveryType: type, tier: type });
  };

  const saveEdit = async () => {
    if (!editingId || !editDraft?.name.trim()) return;
    try {
      await updateCourier(editingId, {
        ...editDraft,
        name: editDraft.name.trim(),
        tier: editDraft.deliveryType || editDraft.tier || "STANDARD",
        deliveryType: editDraft.deliveryType || editDraft.tier || "STANDARD",
      });
      toast.success("Delivery provider updated.");
      setEditingId(null);
      setEditDraft(null);
    } catch (error: any) {
      toast.error(error?.message || "Unable to update delivery provider.");
    }
  };

  const field = (label: string, value: string | number, onChange: (value: string) => void, type: "text" | "number" = "text", placeholder?: string) => (
    <label className="block space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-10 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-black"
      />
    </label>
  );

  const toggle = (label: string, checked: boolean, onChange: (value: boolean) => void) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full min-h-10 rounded-xl border px-3 py-2 flex items-center justify-between text-[11px] font-bold uppercase ${checked ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-neutral-200 bg-white text-neutral-500"}`}
    >
      <span>{label}</span>
      <span className="inline-flex items-center gap-1">{checked && <Check size={13} />} {checked ? "ON" : "OFF"}</span>
    </button>
  );

  const editor = (value: CourierDraft, setter: (next: CourierDraft) => void, onSave: () => void, onCancel: () => void) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5">
        {field("Provider Name", value.name, (v) => setter({ ...value, name: v }), "text", "e.g. PRIME Priority")}
        {field("Logo URL", value.logoUrl, (v) => setter({ ...value, logoUrl: v }), "text", "https://...")}
      </div>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Delivery Type</span>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {DELIVERY_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setter({ ...value, deliveryType: type, tier: type })}
              className={`min-h-10 rounded-xl border text-[10px] font-bold uppercase ${value.deliveryType === type ? "border-black bg-black text-white" : "border-neutral-200 bg-white text-neutral-600"}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {field("Base Fare", value.baseFare, (v) => setter({ ...value, baseFare: Number(v) || 0 }), "number")}
        {field("Base Distance KM", value.baseDistanceKm, (v) => setter({ ...value, baseDistanceKm: Number(v) || 0 }), "number")}
        {field("Per KM Charge", value.perKmCharge, (v) => setter({ ...value, perKmCharge: Number(v) || 0 }), "number")}
        {field("Priority Fee", value.priorityFee || 0, (v) => setter({ ...value, priorityFee: Number(v) || 0 }), "number")}
        {field("Express Fee", value.expressFee || 0, (v) => setter({ ...value, expressFee: Number(v) || 0 }), "number")}
        {field("Platform Fee", value.platformFee, (v) => setter({ ...value, platformFee: Number(v) || 0 }), "number")}
        {field("Night Fee", value.nightDifferentialFee, (v) => setter({ ...value, nightDifferentialFee: Number(v) || 0 }), "number")}
        {field("Surcharge", value.surchargeFee, (v) => setter({ ...value, surchargeFee: Number(v) || 0 }), "number")}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {toggle("Platform Fee", value.platformFeeEnabled, (v) => setter({ ...value, platformFeeEnabled: v }))}
        {toggle("Night Differential", value.nightDifferentialEnabled, (v) => setter({ ...value, nightDifferentialEnabled: v }))}
        {toggle("Surcharge", value.surchargeEnabled, (v) => setter({ ...value, surchargeEnabled: v }))}
        {toggle("Available for Checkout", value.isAvailable, (v) => setter({ ...value, isAvailable: v }))}
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 min-h-10 rounded-xl border border-neutral-200 bg-white text-xs font-bold uppercase">Cancel</button>
        <button type="button" onClick={onSave} className="flex-1 min-h-10 rounded-xl bg-black text-white text-xs font-bold uppercase">Save Provider</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 px-3 py-3 pb-10 text-neutral-900">
      <div className="max-w-xl mx-auto space-y-3">
        <header className="flex items-start gap-2 border-b border-neutral-200 pb-3">
          <button type="button" onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl border border-neutral-200 bg-white flex items-center justify-center shrink-0" aria-label="Back"><ArrowLeft size={17} /></button>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.22em] text-neutral-500 font-bold">ADMIN • LOGISTICS</div>
            <h1 className="text-lg font-bold uppercase tracking-tight">Delivery Providers</h1>
            <p className="text-[11px] text-neutral-500">Portrait-first fleet, pricing and delivery-type controls.</p>
          </div>
          <button type="button" onClick={() => setShowAdd((value) => !value)} className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center shrink-0" aria-label={showAdd ? "Close" : "Add provider"}><Plus size={17} /></button>
        </header>

        {showAdd && (
          <section className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-3"><Truck size={15} /><span className="text-xs font-bold uppercase">New Delivery Provider</span></div>
            <form onSubmit={saveNew}>{editor(draft, setDraft, () => void saveNew({ preventDefault: () => {} } as React.FormEvent), () => { resetDraft(); setShowAdd(false); })}</form>
          </section>
        )}

        {loading ? <CourierListSkeleton count={3} /> : (
          <div className="space-y-2.5">
            {sortedCouriers.map((courier) => {
              const editing = editingId === courier.id && editDraft;
              if (editing) {
                return <section key={courier.id} className="rounded-2xl border border-neutral-300 bg-white p-3 shadow-sm">{editor(editDraft, setEditDraft, saveEdit, () => { setEditingId(null); setEditDraft(null); })}</section>;
              }

              return (
                <section key={courier.id} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                  <div className="aspect-[16/7] bg-neutral-100 overflow-hidden">
                    <img src={courier.logoUrl || "/primelogo.png"} alt={courier.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold uppercase truncate">{courier.name}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{chargePreview(courier)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${courier.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{courier.isAvailable ? "Online" : "Paused"}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2"><div className="text-[9px] uppercase tracking-wider text-neutral-500">Delivery Type</div><div className="text-xs font-bold mt-0.5">{deliveryLabel(courier)}</div></div>
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2"><div className="text-[9px] uppercase tracking-wider text-neutral-500">Base Fare</div><div className="text-xs font-mono font-bold mt-0.5">{formatCurrency(courier.baseFare)}</div></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button type="button" onClick={() => startEdit(courier)} className="min-h-10 rounded-xl bg-black text-white text-[10px] font-bold uppercase">Edit</button>
                      <button type="button" onClick={() => void updateCourier(courier.id, { isAvailable: !courier.isAvailable })} className="min-h-10 rounded-xl border border-neutral-200 text-[10px] font-bold uppercase">{courier.isAvailable ? "Pause" : "Activate"}</button>
                      <button type="button" onClick={() => void removeCourier(courier.id).then(() => toast.success("Provider removed."))} className="min-h-10 rounded-xl border border-rose-200 text-rose-700 flex items-center justify-center" aria-label="Delete provider"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </section>
              );
            })}
            {!sortedCouriers.length && <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">No delivery providers configured.</div>}
          </div>
        )}

        <div className="rounded-2xl border border-neutral-200 bg-white p-3 text-[10px] text-neutral-500 flex gap-2"><Zap size={14} className="shrink-0" />Configurator is intentionally stacked for portrait mode. No horizontal-scrolling tables are used.</div>
      </div>
    </div>
  );
}
