import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Charge = { id: string; name: string; amount: number; type: "fixed" | "percent"; active: boolean };

export default function AdminChargesPage() {
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

  useEffect(() => { void load().catch(() => toast.error("Unable to load charges.")); }, []);

  const add = async () => {
    if (!name.trim() || Number(amount) < 0) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/charges", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, amount: Number(amount), type, active: true }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create charge");
      setName(""); setAmount(""); await load(); toast.success("Charge added.");
    } catch (error: any) { toast.error(error.message || "Unable to create charge."); }
    finally { setBusy(false); }
  };

  const toggle = async (charge: Charge) => {
    const response = await fetch(`/api/admin/charges/${charge.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(charge.active ? { ...charge, active: false } : { ...charge, active: true }) });
    if (!response.ok) { toast.error("Unable to update charge."); return; }
    await load();
  };

  const remove = async (charge: Charge) => {
    if (!window.confirm(`Delete ${charge.name}?`)) return;
    const response = await fetch(`/api/admin/charges/${charge.id}`, { method: "DELETE", credentials: "same-origin" });
    if (!response.ok) { toast.error("Unable to delete charge."); return; }
    await load();
  };

  return <section className="p-3 sm:p-5 max-w-3xl mx-auto" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
    <header className="mb-4"><p className="text-[10px] tracking-[.2em] text-neutral-400">ADMIN / PRICING</p><h1 className="text-2xl">CHARGES</h1><p className="text-xs text-neutral-400 mt-1">Server-authoritative fees and surcharges.</p></header>
    <div className="bg-white border border-neutral-200 rounded-xl p-3 mb-3 grid grid-cols-[1fr_90px_80px_38px] gap-2">
      <input className="border border-neutral-200 rounded-lg px-2 text-sm min-w-0" placeholder="Charge name" value={name} onChange={e=>setName(e.target.value)} />
      <input className="border border-neutral-200 rounded-lg px-2 text-sm min-w-0" type="number" min="0" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} />
      <select className="border border-neutral-200 rounded-lg px-2 text-sm" value={type} onChange={e=>setType(e.target.value as Charge["type"])}><option value="fixed">Fixed</option><option value="percent">%</option></select>
      <button type="button" disabled={busy} onClick={() => void add()} className="bg-black text-white rounded-lg flex items-center justify-center disabled:opacity-50"><Plus size={16}/></button>
    </div>
    <div className="space-y-2">{charges.map(c=><div key={c.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center gap-3"><div className="flex-1 min-w-0"><div className="font-semibold text-sm truncate">{c.name}</div><div className="text-xs text-neutral-400">{c.type === "percent" ? `${c.amount}%` : `₱${c.amount.toLocaleString()}`} · {c.active ? "Active" : "Inactive"}</div></div><button type="button" onClick={()=>void toggle(c)} className="text-xs border rounded-lg px-2 py-1">{c.active?"Disable":"Enable"}</button><button type="button" onClick={()=>void remove(c)} className="text-neutral-400 hover:text-red-600"><Trash2 size={15}/></button></div>)}</div>
  </section>;
}
