import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

interface Courier {
  id: string;
  name: string;
  tier?: string;
  deliveryType?: string;
  priorityFee?: number;
  expressFee?: number;
  baseFare?: number;
  isAvailable?: boolean;
}

const TYPES = ["STANDARD", "PRIORITY", "EXPRESS"] as const;

type TypeValue = (typeof TYPES)[number];

export default function AdminCourierConfigPanel() {
  const location = useLocation();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    try {
      const [courierRes, configRes] = await Promise.all([
        fetch("/api/couriers", { credentials: "same-origin", cache: "no-store" }),
        fetch("/api/admin/courier-config", { credentials: "same-origin", cache: "no-store" }),
      ]);
      if (!courierRes.ok || !configRes.ok) return;
      const courierData = await courierRes.json();
      const configData = await configRes.json();
      const configs = new Map((Array.isArray(configData.configs) ? configData.configs : []).map((c: any) => [String(c.id), c]));
      const merged = (Array.isArray(courierData.couriers) ? courierData.couriers : []).map((c: any) => {
        const cfg: any = configs.get(String(c.id)) || {};
        return { ...c, ...cfg, deliveryType: cfg.deliveryType || c.deliveryType || c.tier || "STANDARD" };
      });
      setCouriers(merged);
    } catch {
      // Existing courier screen remains usable if configuration panel cannot load.
    }
  };

  useEffect(() => {
    if (location.pathname === "/admin/courier") void load();
  }, [location.pathname]);

  if (location.pathname !== "/admin/courier" || !couriers.length) return null;

  const save = async (courier: Courier) => {
    setSaving(courier.id);
    try {
      const response = await fetch(`/api/admin/courier-config/${encodeURIComponent(courier.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryType: courier.deliveryType || "STANDARD",
          priorityFee: Math.max(0, Number(courier.priorityFee || 0)),
          expressFee: Math.max(0, Number(courier.expressFee || 0)),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save delivery configuration");
      toast.success(`${courier.name}: delivery configuration saved`);
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Unable to save delivery configuration");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="mx-3 sm:mx-4 mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Truck size={16} />
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide">Delivery Type Configuration</h2>
          <p className="text-[10px] text-neutral-500">Server-authoritative Standard / Priority / Express pricing.</p>
        </div>
      </div>
      <div className="space-y-2">
        {couriers.map((courier) => (
          <div key={courier.id} className="bg-white border border-neutral-200 rounded-lg p-2.5 grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-2 items-end">
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase truncate">{courier.name}</div>
              <div className="text-[10px] text-neutral-500">Base {Number(courier.baseFare || 0).toFixed(2)}</div>
            </div>
            <label className="text-[9px] font-bold uppercase text-neutral-500">
              Delivery Type
              <select
                value={(courier.deliveryType || "STANDARD") as TypeValue}
                onChange={(e) => setCouriers((prev) => prev.map((c) => c.id === courier.id ? { ...c, deliveryType: e.target.value } : c))}
                className="mt-1 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[11px] font-bold bg-white"
              >
                {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="text-[9px] font-bold uppercase text-neutral-500">
              Priority Fee
              <input
                type="number"
                min="0"
                step="0.01"
                value={Number(courier.priorityFee || 0)}
                onChange={(e) => setCouriers((prev) => prev.map((c) => c.id === courier.id ? { ...c, priorityFee: Number(e.target.value) } : c))}
                className="mt-1 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[11px] font-mono"
              />
            </label>
            <label className="text-[9px] font-bold uppercase text-neutral-500">
              Express Fee
              <input
                type="number"
                min="0"
                step="0.01"
                value={Number(courier.expressFee || 0)}
                onChange={(e) => setCouriers((prev) => prev.map((c) => c.id === courier.id ? { ...c, expressFee: Number(e.target.value) } : c))}
                className="mt-1 w-full border border-neutral-200 rounded-md px-2 py-1.5 text-[11px] font-mono"
              />
            </label>
            <button
              type="button"
              onClick={() => void save(courier)}
              disabled={saving === courier.id}
              className="h-8 px-3 rounded-md bg-black text-white text-[10px] font-bold uppercase disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {saving === courier.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Save
            </button>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-neutral-500 mt-2">A fee of ₱0.00 means no extra charge is added because that courier is already handling that delivery tier by default.</p>
    </section>
  );
}
