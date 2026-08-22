import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Discount = { id: string; code: string; value: number; type: "fixed" | "percent"; minSubtotal: number; active: boolean };

export default function AdminDiscountsPage() {
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

  useEffect(() => { void load().catch(() => toast.error("Unable to load discounts.")); }, []);

  const add = async () => {
    if (!code.trim() || Number(value) < 0) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/discounts", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, value: Number(value), type, minSubtotal: Number(minSubtotal) || 0, active: true }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create discount");
      setCode(""); setValue(""); setMinSubtotal(""); await load(); toast.success("Discount added.");
    } catch (error: any) { toast.error(error.message || "Unable to create discount."); }
    finally { setBusy(false); }
  };

  const toggle = async (discount: Discount) => {
    const response = await fetch(`/api/admin/discounts/${discount.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...discount, active: !discount.active }) });
    if (!response.ok) { toast.error("Unable to update discount."); return; }
    await load();
  };

  const remove = async (discount: Discount) => {
    if (!window.confirm(`Delete ${discount.code}?`)) return;
    const response = await fetch(`/api/admin/discounts/${discount.id}`, { method: "DELETE", credentials: "same-origin" });
    if (!response.ok) { toast.error("Unable to delete discount."); return; }
    await load();
  };

  return <section className="p-3 sm:p-5 max-w-3xl mx-auto" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
    <header className="mb-4"><p className="text-[10px] tracking-[.2em] text-neutral-400">ADMIN / PRICING</p><h1 className="text-2xl">DISCOUNTS</h1><p className="text-xs text-neutral-400 mt-1">Server-authoritative promo rules and eligibility.</p></header>
    <div className="bg-white border border-neutral-200 rounded-xl p-3 mb-3 grid grid-cols-[1fr_75px_75px_85px_38px] gap-2">
      <input className="border border-neutral-200 rounded-lg px-2 text-sm min-w-0" placeholder="Promo code" value={code} onChange={e=>setCode(e.target.value)} />
      <input className="border border-neutral-200 rounded-lg px-2 text-sm min-w-0" type="number" min="0" placeholder="Value" value={value} onChange={e=>setValue(e.target.value)} />
      <select className="border border-neutral-200 rounded-lg px-2 text-sm" value={type} onChange={e=>setType(e.target.value as Discount["type"])}><option value="percent">%</option><option value="fixed">Fixed</option></select>
      <input className="border border-neutral-200 rounded-lg px-2 text-sm min-w-0" type="number" min="0" placeholder="Min ₱" value={minSubtotal} onChange={e=>setMinSubtotal(e.target.value)} />
      <button type="button" disabled={busy} onClick={() => void add()} className="bg-black text-white rounded-lg flex items-center justify-center disabled:opacity-50"><Plus size={16}/></button>
    </div>
    <div className="space-y-2">{items.map(d=><div key={d.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center gap-3"><div className="flex-1 min-w-0"><div className="font-semibold text-sm tracking-wide truncate">{d.code}</div><div className="text-xs text-neutral-400">{d.type === "percent"?`${d.value}%`:`₱${d.value.toLocaleString()}`} · Min ₱{d.minSubtotal.toLocaleString()} · {d.active?"Active":"Inactive"}</div></div><button type="button" onClick={()=>void toggle(d)} className="text-xs border rounded-lg px-2 py-1">{d.active?"Disable":"Enable"}</button><button type="button" onClick={()=>void remove(d)} className="text-neutral-400 hover:text-red-600"><Trash2 size={15}/></button></div>)}</div>
  </section>;
}
