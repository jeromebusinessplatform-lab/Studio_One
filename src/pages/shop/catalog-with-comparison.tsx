import { useMemo, useState } from "react";
import { Check, ChevronDown, Minus, Plus, Scale, Search, ShoppingCart, Star, X } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext.tsx";
import { useProducts } from "@/hooks/useProducts.ts";
import { useReviews } from "@/hooks/useReviews.ts";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { type Product, isBadgeActive } from "@/data/products.ts";
import { formatCurrency } from "@/lib/utils.ts";
import { ProductGridSkeleton } from "@/components/ProductCardSkeleton.tsx";
import ProductComparison from "@/components/ProductComparison.tsx";

type FilterOption = "all" | "in_stock" | "sale" | "new" | "low_stock" | "price_asc" | "price_desc";
const FILTER_LABELS: Record<FilterOption, string> = {
  all: "All Filters",
  in_stock: "In Stock Only",
  sale: "On Sale",
  new: "New Arrivals",
  low_stock: "Low Stock",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
};
const MAX_COMPARE = 3;

interface ProductCardProps {
  product: Product;
  compareSelected: boolean;
  onToggleCompare: () => void;
}

function ProductCard({ product, compareSelected, onToggleCompare }: ProductCardProps) {
  const { items, addItem, updateQuantity } = useCart();
  const { getProductRatingSummary } = useReviews();
  const rating = product.ratingAverage ?? getProductRatingSummary(product._id).averageRating;
  const ratingCount = product.ratingCount ?? getProductRatingSummary(product._id).totalReviews;
  const cartItem = items.find((item) => item.productId === product._id);
  const [showQuantity, setShowQuantity] = useState(Boolean(cartItem));
  const [qty, setQty] = useState(cartItem?.quantity ?? 1);
  const unitPrice = product.salePrice ?? product.price;
  const outOfStock = product.stock <= 0 || product.available === false;

  const add = () => {
    if (outOfStock) return;
    addItem({ productId: product._id, productName: product.name, unitPrice, image: product.image, quantity: qty });
    setShowQuantity(true);
    toast.success(`Added ${qty}x ${product.name} to cart`);
  };

  const changeQty = (next: number) => {
    const safe = Math.max(0, Math.min(product.stock, next));
    if (safe === 0) {
      updateQuantity(product._id, 0);
      setQty(1);
      setShowQuantity(false);
      return;
    }
    setQty(safe);
    if (cartItem) updateQuantity(product._id, safe);
  };

  return (
    <div className={`relative bg-white rounded-2xl border overflow-hidden flex flex-col shadow-xs transition-all ${compareSelected ? "border-black ring-2 ring-black/10" : "border-neutral-200/90"} ${outOfStock ? "opacity-60" : ""}`}>
      <div className="relative aspect-square bg-white flex items-center justify-center p-2.5">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
        ) : (
          <ShoppingCart size={30} className="text-neutral-300" />
        )}
        {product.badge && isBadgeActive(product.badge, product.badgeExpiry) && !outOfStock && (
          <span className="absolute top-2 left-2 bg-black text-white px-2 py-0.5 rounded-full text-[9px] uppercase">
            {product.badge.replace("_", " ")}
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-white/65 flex items-center justify-center">
            <span className="bg-black text-white rounded-full px-2.5 py-1 text-[9px] uppercase">Out of stock</span>
          </div>
        )}
        {product.allowComparison !== false && (
          <button
            type="button"
            onClick={onToggleCompare}
            aria-pressed={compareSelected}
            title={compareSelected ? "Remove from comparison" : "Compare product"}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full border flex items-center justify-center shadow-sm transition-all active:scale-90 ${compareSelected ? "bg-black text-white border-black" : "bg-white/95 text-neutral-700 border-neutral-200 hover:bg-neutral-100"}`}
          >
            <Scale size={14} className={compareSelected ? "text-white" : "text-neutral-600"} />
          </button>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
        <div>
          <h3 className="font-normal text-[13px] leading-tight line-clamp-2" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            {product.name}
          </h3>
          {product.subname && <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{product.subname}</p>}
          <div className="flex items-center gap-1 mt-1 text-[10px]">
            <Star size={11} className="fill-current" /> {Number(rating).toFixed(1)} <span className="text-neutral-400">({ratingCount})</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[17px] font-normal">{formatCurrency(unitPrice)}</span>
            {product.salePrice && <span className="text-[10px] text-red-500 line-through">{formatCurrency(product.price)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!showQuantity ? (
            <button type="button" disabled={outOfStock} onClick={add} className="w-full h-8 rounded-full bg-neutral-900 text-white text-[11px] uppercase disabled:opacity-30">
              Add to Cart
            </button>
          ) : (
            <div className="w-full h-8 rounded-lg border border-neutral-200 flex items-center justify-between overflow-hidden">
              <button type="button" onClick={() => changeQty(qty - 1)} className="h-full px-2 hover:bg-neutral-100">
                <Minus size={12} />
              </button>
              <span className="text-xs">{qty}</span>
              <button type="button" disabled={qty >= product.stock} onClick={() => changeQty(qty + 1)} className="h-full px-2 hover:bg-neutral-100 disabled:opacity-30">
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CompareBarProps {
  products: Product[];
  onCompare: () => void;
  onClear: () => void;
}

function CompareBar({ products, onCompare, onClear }: CompareBarProps) {
  if (products.length < 2) return null;
  return (
    <div className="fixed bottom-[56px] left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-16px)] max-w-[412px] bg-neutral-950 text-white rounded-2xl border border-neutral-800 shadow-2xl px-3 py-2.5 animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2 flex-1 min-w-0">
          {products.map((product) => (
            <div key={product._id} title={product.name} className="w-10 h-10 rounded-xl bg-white border-2 border-neutral-950 overflow-hidden shrink-0 flex items-center justify-center">
              {product.image ? <img src={product.image} alt="" className="w-full h-full object-contain" /> : <Scale size={15} className="text-neutral-400" />}
            </div>
          ))}
          <div className="pl-3 self-center text-[10px] uppercase font-semibold tracking-wide">{products.length} selected</div>
        </div>
        <button type="button" onClick={onClear} className="w-7 h-7 rounded-full border border-neutral-700 flex items-center justify-center text-neutral-400" aria-label="Clear comparison">
          <X size={13} />
        </button>
        <button type="button" onClick={onCompare} className="bg-white text-black rounded-xl px-3 py-2 text-[9px] font-bold uppercase flex items-center gap-1.5 whitespace-nowrap">
          Compare Selected <Scale size={13} />
        </button>
      </div>
    </div>
  );
}

export default function ShopCatalogWithComparison() {
  const { products, categories: hookCategories, loading } = useProducts();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 250);
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const categories = useMemo(() => ["All Categories", ...Array.from(new Set([...(hookCategories || []), ...products.map((p) => p.category).filter(Boolean)])) as string[]].sort((a, b) => a === "All Categories" ? -1 : b === "All Categories" ? 1 : a.localeCompare(b)), [products, hookCategories]);

  const filtered = useMemo(() => {
    let list = [...(products || [])];
    if (activeCategory !== "All Categories") list = list.filter((p) => p.category === activeCategory);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.subname || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q));
    if (activeFilter === "in_stock") list = list.filter((p) => p.stock > 0 && p.available !== false);
    if (activeFilter === "sale") list = list.filter((p) => p.badge === "SALE" || Boolean(p.salePrice));
    if (activeFilter === "new") list = list.filter((p) => p.badge === "NEW");
    if (activeFilter === "low_stock") list = list.filter((p) => p.badge === "LOW_STOCK" || (p.stock > 0 && p.stock <= 10));
    const price = (p: Product) => p.salePrice ?? p.price;
    return list.sort((a, b) => activeFilter === "price_asc" ? price(a) - price(b) : activeFilter === "price_desc" ? price(b) - price(a) : (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  }, [products, activeCategory, debouncedSearch, activeFilter]);

  const selectedProducts = useMemo(() => compareIds.map((id) => products.find((p) => p._id === id)).filter(Boolean) as Product[], [compareIds, products]);

  const toggleCompare = (product: Product) => {
    if (product.allowComparison === false) {
      toast.error("Comparison is disabled for this product by admin.");
      return;
    }
    setCompareIds((current) => {
      if (current.includes(product._id)) {
        toast.success(`${product.name} removed from comparison`);
        return current.filter((id) => id !== product._id);
      }
      if (current.length >= MAX_COMPARE) {
        toast.error("You can compare up to 3 products at a time.", { description: "Remove one selected product before adding another." });
        return current;
      }
      if (current.length > 0) {
        const firstSelected = products.find((p) => p._id === current[0]);
        if (firstSelected && firstSelected.category && product.category && firstSelected.category !== firstSelected.category) {
          // just in case
        }
        if (firstSelected && firstSelected.category && product.category && firstSelected.category !== product.category) {
          toast.error("You can only compare products from the same category.");
          return current;
        }
      }
      toast.success(`${product.name} added to comparison`);
      return [...current, product._id];
    });
  };

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-24">
      <div className="px-2.5 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Search size={14} className="text-neutral-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full bg-transparent text-xs outline-none" />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowCategoryMenu((v) => !v);
                setShowFilterMenu(false);
              }}
              className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs min-w-[100px]"
            >
              <span className="truncate max-w-[78px]">{activeCategory}</span>
              <ChevronDown size={13} />
            </button>
            {showCategoryMenu && (
              <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-neutral-200 rounded-xl shadow-lg min-w-[165px] py-1 max-h-64 overflow-auto">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat);
                      setShowCategoryMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs flex justify-between hover:bg-neutral-50"
                  >
                    {cat}
                    {cat === activeCategory && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowFilterMenu((v) => !v);
                setShowCategoryMenu(false);
              }}
              className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs min-w-[90px]"
            >
              <span className="truncate max-w-[68px]">{activeFilter === "all" ? "All Filters" : FILTER_LABELS[activeFilter]}</span>
              <ChevronDown size={13} />
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 z-40 bg-white border border-neutral-200 rounded-xl shadow-lg min-w-[165px] py-1">
                {(Object.keys(FILTER_LABELS) as FilterOption[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveFilter(key);
                      setShowFilterMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs flex justify-between hover:bg-neutral-50"
                  >
                    {FILTER_LABELS[key]}
                    {key === activeFilter && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {(showCategoryMenu || showFilterMenu) && (
        <button
          type="button"
          aria-label="Close menus"
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => {
            setShowCategoryMenu(false);
            setShowFilterMenu(false);
          }}
        />
      )}
      <div className="p-2.5">
        {loading ? (
          <ProductGridSkeleton count={6} />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center text-neutral-500 text-sm">No products match your criteria.</div>
        ) : (
          <motion.div
            className="grid grid-cols-3 gap-2 sm:gap-2.5"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04 } },
            }}
          >
            {filtered.map((product) => (
              <motion.div
                key={product._id}
                variants={{
                  hidden: { opacity: 0, scale: 0.94, y: 12 },
                  visible: { 
                    opacity: 1, 
                    scale: 1, 
                    y: 0, 
                    transition: { type: "spring", stiffness: 320, damping: 24 } 
                  },
                }}
              >
                <ProductCard product={product} compareSelected={compareIds.includes(product._id)} onToggleCompare={() => toggleCompare(product)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      <CompareBar products={selectedProducts} onClear={() => { setCompareIds([]); setShowComparison(false); }} onCompare={() => setShowComparison(true)} />
      {showComparison && selectedProducts.length >= 2 && <ProductComparison products={selectedProducts} onClose={() => setShowComparison(false)} />}
    </div>
  );
}
