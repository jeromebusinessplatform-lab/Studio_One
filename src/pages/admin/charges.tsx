import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, CreditCard, Sparkles, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Charge = { id: string; name: string; amount: number; type: "fixed" | "percent"; active: boolean };

const CHARGE_PRESETS = [
  { name: "Express Courier Priority Fee", amount: 60, type: "fixed" as const },
  { name: "Night-Shift Rush Surcharge", amount: 45, type: "fixed" as const },
  { name: "Eco Packaging & Thermal Seal", amount: 25, type: "fixed" as const },
  { name: "Payment Processing Fee", amount: 1.5, type: "percent" as const },
];

export default function AdminChargesPage() {
  const navigate = useNavigate();
  const [charges, setCharges] = useState<Charge[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<Charge["type"]>("fixed");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/charges", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Unable to load charges");
    const data = await response.json();
    setCharges(Array.isArray(data.charges) ? data.charges : []);
  };

  useEffect(() => {
    void load().catch(() => toast.error("Unable to load charges."));
  }, []);

  const add = async () => {
    if (!name.trim() || Number(amount) < 0) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/charges", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, amount: Number(amount), type, active: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create charge");
      setName("");
      setAmount("");
      await load();
      toast.success("Charge created.");
    } catch (error: any) {
      toast.error(error.message || "Unable to create charge.");
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (preset: (typeof CHARGE_PRESETS)[0]) => {
    setName(preset.name);
    setAmount(String(preset.amount));
    setType(preset.type);
  };

  const toggle = async (charge: Charge) => {
    const response = await fetch(`/api/admin/charges/${charge.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(charge.active ? { ...charge, active: false } : { ...charge, active: true }),
    });
    if (!response.ok) {
      toast.error("Unable to update charge.");
      return;
    }
    await load();
    toast.success(`Charge ${charge.active ? "disabled" : "activated"}.`);
  };

  const remove = async (charge: Charge) => {
    if (!window.confirm(`Delete ${charge.name}?`)) return;
    const response = await fetch(`/api/admin/charges/${charge.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!response.ok) {
      toast.error("Unable to delete charge.");
      return;
    }
    await load();
    toast.success("Charge deleted.");
  };

  return (
    <section className="p-3 sm:p-4 w-full max-w-full space-y-3 bg-white text-black min-h-screen font-condensed">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="p-1 text-neutral-500 hover:text-black rounded"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
              CHARGES & PLATFORM SURCHARGES
            </h1>
            <p className="text-[11px] text-neutral-500 font-sans">
              Server-authoritative checkout fees and delivery surcharges
            </p>
          </div>
        </div>
      </div>

      {/* Preset Quick Fill */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase text-neutral-500 font-bold">Quick Templates:</span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {CHARGE_PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg whitespace-nowrap text-[11px] font-sans"
            >
              + {p.name} ({p.type === "percent" ? `${p.amount}%` : `₱${p.amount}`})
            </button>
          ))}
        </div>
      </div>

      {/* Add Charge Form */}
      <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 space-y-2">
        <div className="text-[11px] font-bold uppercase text-neutral-700">Add New Charge Rule</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            className="sm:col-span-2 border border-neutral-300 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-black font-sans"
            placeholder="Charge description"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-1">
            <input
              className="w-full border border-neutral-300 bg-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black font-sans font-mono"
              type="number"
              min="0"
              step="0.1"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <select
              className="border border-neutral-300 bg-white rounded-lg px-2 text-xs font-condensed uppercase"
              value={type}
              onChange={(e) => setType(e.target.value as Charge["type"])}
            >
              <option value="fixed">₱ Fixed</option>
              <option value="percent">% Pct</option>
            </select>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void add()}
            className="bg-black text-white rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 text-xs uppercase disabled:opacity-50 hover:bg-neutral-800"
          >
            <Plus size={14} /> Add Charge
          </button>
        </div>
      </div>

      {/* Charges Stacked Cards */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase text-neutral-700">Active Pricing Rules ({charges.length})</div>
        {charges.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-400 font-sans">No charges configured yet.</div>
        ) : (
          charges.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs sm:text-sm text-neutral-900 truncate uppercase">{c.name}</div>
                <div className="text-[11px] text-neutral-500 font-sans mt-0.5 flex items-center gap-2">
                  <span className="font-mono font-bold text-black">
                    {c.type === "percent" ? `${c.amount}%` : `₱${c.amount.toLocaleString()}`}
                  </span>
                  <span>•</span>
                  <span className={c.active ? "text-emerald-700 font-bold" : "text-neutral-400"}>
                    {c.active ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void toggle(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg uppercase border font-bold ${
                    c.active
                      ? "bg-neutral-100 text-neutral-700 border-neutral-300"
                      : "bg-emerald-600 text-white border-emerald-600"
                  }`}
                >
                  {c.active ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(c)}
                  className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                  title="Delete charge"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
