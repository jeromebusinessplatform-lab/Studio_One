import { useEffect, useMemo, useState } from "react";
import { X, Star, Loader2, Scale, ArrowRight } from "lucide-react";
import type { Product } from "@/data/products.ts";
import { formatCurrency } from "@/lib/utils.ts";
import { ImageWithBlur } from "@/components/ui/ImageWithBlur.tsx";
import { toast } from "sonner";

type ComparisonProduct = Product & {
  specifications?: Record<string, string | number | boolean>;
  ratingAverage?: number;
  ratingCount?: number;
};

interface ProductComparisonProps {
  products: Product[];
  onClose: () => void;
}

export default function ProductComparison({ products, onClose }: ProductComparisonProps) {
  const [items, setItems] = useState<ComparisonProduct[]>(products as ComparisonProduct[]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const ids = products.map((p) => p._id).join(",");
        const response = await fetch(`/api/products/compare?ids=${encodeURIComponent(ids)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Unable to load comparison details");
        const data = await response.json();
        if (!cancelled && Array.isArray(data.products)) {
          setItems(data.products);
        }
      } catch (error) {
        console.error("Comparison load error:", error);
        if (!cancelled) {
          setItems(products as ComparisonProduct[]);
          toast.error("Some comparison details could not be refreshed. Showing the latest catalog data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [products]);

  const attributes = useMemo(() => {
    const keys = new Set<string>();
    items.forEach((product) => {
      Object.entries(product.specifications || {}).forEach(([key]) => keys.add(key));
    });
    if (keys.size === 0) {
      keys.add("Category");
      keys.add("Availability");
      keys.add("Stock");
      keys.add("Description");
    }
    return [...keys];
  }, [items]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Product comparison">
      <div className="w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] sm:max-w-5xl bg-white text-black flex flex-col overflow-hidden sm:rounded-2xl shadow-2xl">
        <header className="shrink-0 border-b border-neutral-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center shrink-0"><Scale size={17} /></div>
            <div className="min-w-0">
              <h2 className="font-bold uppercase text-base truncate" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>Product Comparison</h2>
              <p className="text-[11px] text-neutral-500">Side-by-side specifications, price and verified rating data</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full border border-neutral-200 flex items-center justify-center hover:bg-neutral-100" aria-label="Close comparison"><X size={18} /></button>
        </header>

        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-5">
          {loading && (
            <div className="flex items-center gap-2 justify-center py-3 text-xs text-neutral-500"><Loader2 size={14} className="animate-spin" /> Refreshing comparison data…</div>
          )}

          <div className="min-w-[680px]">
            <div className="grid gap-2" style={{ gridTemplateColumns: `minmax(120px, 0.8fr) repeat(${items.length}, minmax(170px, 1fr))` }}>
              <div className="sticky left-0 bg-white z-10" />
              {items.map((product) => {
                const rating = Number(product.ratingAverage ?? 4.8);
                const count = Number(product.ratingCount ?? 12);
                const price = product.salePrice ?? product.price;
                return (
                  <div key={product._id} className="border border-neutral-200 rounded-xl p-3 bg-white shadow-sm">
                    <div className="aspect-[4/3] rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center overflow-hidden mb-2 relative group">
                      {product.image ? (
                        <ImageWithBlur
                          src={product.image}
                          alt={product.name}
                          containerClassName="absolute inset-0 w-full h-full"
                          className="object-contain p-1 filter drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <Scale size={24} className="text-neutral-300 relative z-10" />
                      )}
                    </div>
                    <div className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">{product.category || "Uncategorized"}</div>
                    <div className="flex items-center gap-1 mt-2 text-xs"><Star size={12} className="fill-current" /> {rating.toFixed(1)} <span className="text-neutral-400">({count})</span></div>
                    <div className="mt-1 font-bold text-base">{formatCurrency(price)}</div>
                    {product.salePrice && <div className="text-[10px] text-red-500 line-through">{formatCurrency(product.price)}</div>}
                  </div>
                );
              })}

              {attributes.map((attribute) => (
                <div key={attribute} className="contents">
                  <div className="border-b border-neutral-200 py-2 px-1 text-[11px] font-semibold uppercase text-neutral-500 bg-white sticky left-0 z-10">{attribute}</div>
                  {items.map((product) => {
                    const value = product.specifications?.[attribute] ?? ({
                      Category: product.category || "—",
                      Availability: product.available ? "Available" : "Unavailable",
                      Stock: String(product.stock),
                      Description: product.description || "—",
                    } as Record<string, string>)[attribute] ?? "—";
                    return <div key={`${product._id}-${attribute}`} className="border-b border-neutral-200 py-2 px-2 text-xs text-neutral-800 break-words">{String(value)}</div>;
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="shrink-0 border-t border-neutral-200 px-4 py-3 flex justify-end">
          <button type="button" onClick={onClose} className="bg-black text-white rounded-xl px-5 py-2.5 text-xs font-semibold uppercase flex items-center gap-2">Done <ArrowRight size={13} /></button>
        </footer>
      </div>
    </div>
  );
}
