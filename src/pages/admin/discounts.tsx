import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ArrowLeft, BadgePercent, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Discount = {
  id: string;
  code: string;
  value: number;
  type: "fixed" | "percent";
  minSubtotal: number;
  active: boolean;
};

const PROMO_PRESETS = [
  { code: "PRIME10", value: 10, type: "percent" as const, minSubtotal: 500 },
  { code: "FREESHIP", value: 60, type: "fixed" as const, minSubtotal: 1000 },
  { code: "VIP20", value: 20, type: "percent" as const, minSubtotal: 2000 },
  { code: "WELCOME100", value: 100, type: "fixed" as const, minSubtotal: 1500 },
];

export default function AdminDiscountsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Discount[]>([]);
  const [code, setCode] = useState("");
  const [value, setValue] = useState("");
  const [minSubtotal, setMinSubtotal] = useState("");
  const [type, setType] = useState<Discount["type"]>("percent");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/discounts", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Unable to load discounts");
    const data = await response.json();
    setItems(Array.isArray(data.discounts) ? data.discounts : []);
  };

  useEffect(() => {
    void load().catch(() => toast.error("Unable to load discounts."));
  }, []);

  const add = async () => {
    if (!code.trim() || Number(value) < 0) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/discounts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          value: Number(value),
          type,
          minSubtotal: Number(minSubtotal) || 0,
          active: true,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create discount");
      setCode("");
      setValue("");
      setMinSubtotal("");
      await load();
      toast.success("Discount promo code created.");
    } catch (error: any) {
      toast.error(error.message || "Unable to create discount.");
    } finally {
      setBusy(false);
    }
  };

  const applyPreset = (preset: (typeof PROMO_PRESETS)[0]) => {
    setCode(preset.code);
    setValue(String(preset.value));
    setType(preset.type);
    setMinSubtotal(String(preset.minSubtotal));
  };

  const generateRandomPromo = () => {
    const prefixes = ["PRIME", "SAVE", "FLASH", "VIP", "MEGA", "PRO", "DEAL"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    const randomCode = `${prefix}${num}`;
    const randomValue = Math.random() > 0.5 ? 15 : 100;
    const randomType = randomValue <= 30 ? "percent" : "fixed";
    const randomMin = randomType === "percent" ? 500 : 1200;

    setCode(randomCode);
    setValue(String(randomValue));
    setType(randomType);
    setMinSubtotal(String(randomMin));
    toast.success(`Generated random code: ${randomCode}`);
  };

  const toggle = async (discount: Discount) => {
    const response = await fetch(`/api/admin/discounts/${discount.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...discount, active: !discount.active }),
    });
    if (!response.ok) {
      toast.error("Unable to update discount.");
      return;
    }
    await load();
    toast.success(`Promo code ${discount.active ? "disabled" : "activated"}.`);
  };

  const remove = async (discount: Discount) => {
    if (!window.confirm(`Delete promo code ${discount.code}?`)) return;
    const response = await fetch(`/api/admin/discounts/${discount.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!response.ok) {
      toast.error("Unable to delete discount.");
      return;
    }
    await load();
    toast.success("Promo code deleted.");
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
              DISCOUNTS & PROMOTIONAL CODES
            </h1>
            <p className="text-[11px] text-neutral-500 font-sans">
              Server-authoritative checkout coupon rules and minimum cart thresholds
            </p>
          </div>
        </div>
      </div>

      {/* Preset Quick Fill */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] uppercase text-neutral-500 font-bold">Quick Templates:</span>
          <button
            type="button"
            onClick={generateRandomPromo}
            className="text-[11px] font-bold bg-black text-white px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-neutral-800 transition"
          >
            <Sparkles size={12} /> Generate Random Promo Code
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {PROMO_PRESETS.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg whitespace-nowrap text-[11px] font-sans"
            >
              + {p.code} ({p.type === "percent" ? `${p.value}% off` : `₱${p.value} off`}, Min ₱{p.minSubtotal})
            </button>
          ))}
        </div>
      </div>

      {/* Add Discount Form */}
      <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 space-y-2">
        <div className="text-[11px] font-bold uppercase text-neutral-700">Create New Promo Code</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            className="sm:col-span-2 border border-neutral-300 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-black font-mono uppercase font-bold"
            placeholder="PROMO CODE (e.g. SAVE15)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <div className="flex gap-1">
            <input
              className="w-full border border-neutral-300 bg-white rounded-lg px-2 py-1.5 text-xs outline-none focus:border-black font-mono"
              type="number"
              min="0"
              placeholder="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <select
              className="border border-neutral-300 bg-white rounded-lg px-2 text-xs uppercase"
              value={type}
              onChange={(e) => setType(e.target.value as Discount["type"])}
            >
              <option value="percent">%</option>
              <option value="fixed">₱</option>
            </select>
          </div>
          <input
            className="border border-neutral-300 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-black font-mono"
            type="number"
            min="0"
            placeholder="Min ₱ Cart"
            value={minSubtotal}
            onChange={(e) => setMinSubtotal(e.target.value)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void add()}
            className="bg-black text-white rounded-lg px-3 py-1.5 flex items-center justify-center gap-1 text-xs uppercase disabled:opacity-50 hover:bg-neutral-800"
          >
            <Plus size={14} /> Add Code
          </button>
        </div>
      </div>

      {/* Discounts Stacked Cards */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase text-neutral-700">Active Promo Rules ({items.length})</div>
        {items.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-400 font-sans">No discount rules configured yet.</div>
        ) : (
          items.map((d) => (
            <div
              key={d.id}
              className="bg-white border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs sm:text-sm text-neutral-900 uppercase tracking-wide">
                    {d.code}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      d.type === "percent" ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {d.type === "percent" ? `${d.value}% OFF` : `₱${d.value.toLocaleString()} OFF`}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 font-sans mt-0.5 flex items-center gap-2">
                  <span>Min Spend: <strong className="font-mono text-black">₱{d.minSubtotal.toLocaleString()}</strong></span>
                  <span>•</span>
                  <span className={d.active ? "text-emerald-700 font-bold" : "text-neutral-400"}>
                    {d.active ? "Active" : "Disabled"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void toggle(d)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg uppercase border font-bold ${
                    d.active
                      ? "bg-neutral-100 text-neutral-700 border-neutral-300"
                      : "bg-emerald-600 text-white border-emerald-600"
                  }`}
                >
                  {d.active ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(d)}
                  className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                  title="Delete discount"
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
