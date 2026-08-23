import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts.ts";

export default function AdminComparisonPage() {
  const navigate = useNavigate();
  const { products, loading } = useProducts();
  const [selectedId, setSelectedId] = useState("");
  const [specText, setSpecText] = useState("{}");
  const [ratingAverage, setRatingAverage] = useState("4.8");
  const [ratingCount, setRatingCount] = useState("12");
  const [saving, setSaving] = useState(false);

  const selected = products.find((product) => product._id === selectedId);
  useEffect(() => {
    if (!selected) return;
    setSpecText(JSON.stringify(selected.specifications || {}, null, 2));
    setRatingAverage(String(selected.ratingAverage ?? 4.8));
    setRatingCount(String(selected.ratingCount ?? 12));
  }, [selected]);

  const save = async () => {
    if (!selected) return;
    let specifications: Record<string, unknown>;
    try { specifications = JSON.parse(specText); } catch { toast.error("Specifications must be valid JSON."); return; }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(selected._id)}/comparison`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ specifications, ratingAverage: Number(ratingAverage), ratingCount: Number(ratingCount) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save comparison metadata");
      toast.success(`Comparison data saved for ${selected.name}`);
    } catch (error: any) { toast.error(error?.message || "Unable to save comparison metadata"); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-3 sm:p-5 bg-white min-h-screen text-black">
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 mb-4"><button type="button" onClick={() => navigate("/admin/products")} className="p-2 rounded-lg hover:bg-neutral-100"><ArrowLeft size={17}/></button><div><h1 className="text-lg font-bold uppercase">Product Comparison Configuration</h1><p className="text-xs text-neutral-500">Administrator-controlled specifications and rating metadata used by the customer comparison overlay.</p></div></div>
      {loading ? <div className="py-12 text-center text-sm text-neutral-500">Loading products…</div> : <div className="max-w-3xl space-y-4">
        <label className="block text-xs font-semibold uppercase">Product<select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="mt-1 w-full border border-neutral-300 rounded-xl p-2.5 text-sm bg-white"><option value="">Select a product…</option>{products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></label>
        {selected && <>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold uppercase">Rating average<input type="number" min="0" max="5" step="0.1" value={ratingAverage} onChange={(e) => setRatingAverage(e.target.value)} className="mt-1 w-full border border-neutral-300 rounded-xl p-2.5 text-sm"/></label><label className="text-xs font-semibold uppercase">Rating count<input type="number" min="0" step="1" value={ratingCount} onChange={(e) => setRatingCount(e.target.value)} className="mt-1 w-full border border-neutral-300 rounded-xl p-2.5 text-sm"/></label></div>
          <label className="block text-xs font-semibold uppercase">Specifications JSON<textarea value={specText} onChange={(e) => setSpecText(e.target.value)} rows={12} spellCheck={false} className="mt-1 w-full border border-neutral-300 rounded-xl p-3 text-xs font-mono bg-neutral-50" placeholder={'{\n  "Display": "1.9 inch",\n  "Battery": "7 days"\n}'}/></label>
          <button type="button" onClick={save} disabled={saving} className="bg-black text-white rounded-xl px-4 py-2.5 text-xs font-bold uppercase flex items-center gap-2 disabled:opacity-50"><Save size={14}/>{saving ? "Saving…" : "Save Comparison Data"}</button>
        </>}
      </div>}
    </div>
  );
}
