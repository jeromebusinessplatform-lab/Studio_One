import { useCart } from "@/context/CartContext.tsx";
import { ShoppingCart, Minus, Plus, Search, ChevronDown, Check, Star, MessageSquare, Sparkles, Layers, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { useProducts } from "@/hooks/useProducts.ts";
import { useReviews } from "@/hooks/useReviews.ts";
import { type Product, isBadgeActive } from "@/data/products.ts";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils.ts";
import { ProductGridSkeleton } from "@/components/ProductCardSkeleton.tsx";
import { StarRating } from "@/components/StarRating.tsx";
import { ImageWithBlur } from "@/components/ui/ImageWithBlur.tsx";
import { motion } from "motion/react";

function BadgePill({ badge }: { badge: "NEW" | "SALE" | "LOW_STOCK" }) {
  const config = {
    NEW: { label: "NEW", bg: "#2563eb" },
    SALE: { label: "SALE", bg: "#ef4444" },
    LOW_STOCK: { label: "LOW STOCK", bg: "#f59e0b" },
  }[badge];

  return (
    <span
      className="text-white font-normal px-2 py-0.5 rounded-full text-[9px] uppercase leading-none shadow-xs"
      style={{
        backgroundColor: config.bg,
        fontFamily: "'Roboto Condensed', sans-serif",
        letterSpacing: "0.4px",
      }}
    >
      {config.label}
    </span>
  );
}

function ProductCard({ product, allProducts }: { product: Product; allProducts?: Product[]; key?: string }) {
  const { items, addItem, updateQuantity } = useCart();
  const { getProductRatingSummary, getProductReviews } = useReviews();
  const ratingSummary = getProductRatingSummary(product._id);
  const reviews = getProductReviews(product._id);

  const cartItem = items.find((i) => i.productId === product._id);
  const [showQuantity, setShowQuantity] = useState(!!cartItem);
  const [showReviewsDrawer, setShowReviewsDrawer] = useState(false);
  const [showBundleDrawer, setShowBundleDrawer] = useState(false);
  const [localQty, setLocalQty] = useState<number>(() => {
    if (cartItem) return cartItem.quantity;
    return 1;
  });

  const unitPrice = product.salePrice ?? product.price;
  const isOutOfStock = product.stock <= 0;
  const isBadgeValid = isBadgeActive(product.badge, product.badgeExpiry);

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const qtyToAdd = localQty > 0 ? localQty : 1;
    addItem({
      productId: product._id,
      productName: product.name,
      unitPrice,
      image: product.image,
      quantity: qtyToAdd,
    });
    toast.success(`Added ${qtyToAdd}x ${product.name} to cart`);
  };

  const handleIncrement = () => {
    if (isOutOfStock || localQty >= product.stock) return;
    const newQty = localQty + 1;
    setLocalQty(newQty);
    if (cartItem) {
      updateQuantity(product._id, newQty);
    }
  };

  const handleDecrement = () => {
    if (localQty <= 1) {
      updateQuantity(product._id, 0);
      setShowQuantity(false);
      setLocalQty(1);
      return;
    }
    const newQty = localQty - 1;
    setLocalQty(newQty);
    if (cartItem) {
      updateQuantity(product._id, newQty);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md h-full ${
        isOutOfStock ? "opacity-60 border-neutral-200" : product.isCombination ? "border-amber-300 ring-1 ring-amber-200/60" : "border-neutral-200/90"
      }`}
    >
      {/* Product Image & Badge Area */}
      <div className="relative aspect-square w-full bg-white flex items-center justify-center p-2.5 overflow-hidden group">
        {product.image ? (
          <ImageWithBlur
            src={product.image}
            alt={product.name}
            containerClassName="absolute inset-0 w-full h-full"
            className="object-contain p-2 filter drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300 relative z-10">
            <ShoppingCart size={32} />
          </div>
        )}

        {/* Dynamic Badge (Honors Custom Expiry) */}
        {product.badge && isBadgeValid && !isOutOfStock && (
          <div className="absolute top-2 left-2 z-10">
            <BadgePill badge={product.badge} />
          </div>
        )}

        {/* Suggested Bundle Tag */}
        {product.isCombination && (
          <div className="absolute top-2 right-2 z-10">
            <span
              onClick={() => setShowBundleDrawer(true)}
              className="bg-amber-100/95 text-amber-900 border border-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase leading-none shadow-xs flex items-center gap-0.5 cursor-pointer hover:bg-amber-200 transition-colors active:scale-95 duration-100"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              <Sparkles size={9} className="text-amber-600" /> Suggested Bundle
            </span>
          </div>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-xs">
            <span
              className="bg-neutral-900 text-white text-[9px] font-normal px-2.5 py-1 rounded-full uppercase"
              style={{ fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: "1px" }}
            >
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2 flex flex-col flex-1 justify-between pt-0 space-y-1">
        <div>
          <h3
            className="text-neutral-900 font-normal leading-tight line-clamp-1 text-[12.5px] sm:text-[13.5px]"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
            }}
          >
            {product.name}
          </h3>
          {product.subname && (
            <p
              className="text-neutral-500 leading-tight mt-0.5 line-clamp-1 font-normal text-[11px] sm:text-[12px]"
              style={{
                fontFamily: "'Ubuntu', sans-serif",
              }}
            >
              {product.subname}
            </p>
          )}

          {/* Suggested Bundle preview pill */}
          {product.isCombination && product.bundleItems && product.bundleItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBundleDrawer(true)}
              className="mt-1 w-full text-left bg-amber-50/90 border border-amber-200/90 rounded-lg p-1.5 flex items-center justify-between text-[10px] text-amber-900 font-normal hover:bg-amber-100 transition-colors cursor-pointer active:scale-95 duration-100"
            >
              <span className="flex items-center gap-1 font-medium truncate">
                <Layers size={10} className="text-amber-600 shrink-0" />
                Includes {product.bundleItems.length} items
              </span>
              <span className="text-amber-700 underline shrink-0">View Bundle &gt;</span>
            </button>
          )}

          {/* Aggregate Star Rating & Reviews Badge */}
          <div
            className="mt-1 flex items-center gap-1 cursor-pointer group active:scale-95 transition-transform duration-100"
            onClick={() => setShowReviewsDrawer(true)}
            title="Click to view verified customer reviews"
          >
            <StarRating
              rating={ratingSummary.averageRating}
              size={11}
              showScore={true}
              showCount={true}
              count={ratingSummary.totalReviews}
            />
          </div>

          {/* Pricing */}
          <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
            <span
              className="text-black font-normal text-[15px] sm:text-[17px]"
              style={{
                fontFamily: "'Ubuntu', sans-serif",
              }}
            >
              {formatCurrency(unitPrice)}
            </span>
            {product.salePrice && !product.isCombination && (
              <span
                className="text-[#ef4444] font-normal line-through text-[10px] sm:text-[11px]"
                style={{
                  fontFamily: "'Ubuntu', sans-serif",
                }}
              >
                {formatCurrency(product.price)}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          {!showQuantity ? (
            <button
              onClick={() => {
                handleAddToCart();
                setShowQuantity(true);
              }}
              disabled={isOutOfStock}
              className="w-full h-7 rounded-full bg-neutral-800 hover:bg-black text-white text-[12px] uppercase tracking-wider font-normal active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex-1 h-7 rounded-lg border border-neutral-200 bg-white flex items-center justify-between overflow-hidden shadow-2xs">
              <button
                onClick={handleDecrement}
                disabled={isOutOfStock}
                className="h-full px-2 text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 transition-transform duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={12} className="stroke-[2.2]" />
              </button>
              <span
                className="font-normal text-black px-2 text-center"
                style={{
                  fontFamily: "'Ubuntu', sans-serif",
                  fontSize: "14px",
                }}
              >
                {localQty}
              </span>
              <button
                onClick={handleIncrement}
                disabled={isOutOfStock || localQty >= product.stock}
                className="h-full px-2 text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 active:scale-95 transition-transform duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={12} className="stroke-[2.2]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Bundle Details Modal */}
      {showBundleDrawer && product.isCombination && product.bundleItems && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowBundleDrawer(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl border border-neutral-200 shadow-2xl p-5 space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4
                    className="text-base font-normal uppercase text-black"
                    style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                  >
                    Suggested Bundle Offer
                  </h4>
                  <p className="text-xs text-neutral-500 font-normal">
                    {product.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBundleDrawer(false)}
                className="text-xs border border-neutral-200 px-2 py-1 rounded-lg hover:bg-neutral-100 text-neutral-600 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              <div className="text-xs font-semibold text-neutral-800 uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                Products Included in This Combination:
              </div>
              {product.bundleItems.map((item, idx) => {
                const itemProd = allProducts?.find((p) => p._id === item.productId);
                const origPrice = itemProd ? itemProd.salePrice ?? itemProd.price : 0;
                const bundlePrice =
                  item.pricingType === "fixed"
                    ? item.customPrice ?? origPrice
                    : origPrice * (1 - (item.discountPercent ?? 0) / 100);

                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center gap-3"
                  >
                    <div className="w-12 h-12 rounded-lg bg-white border border-neutral-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                      {itemProd?.image ? (
                        <img
                          src={itemProd.image}
                          alt={itemProd.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ShoppingCart size={16} className="text-neutral-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 truncate">
                        {itemProd?.name ?? "Combined Product"}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {item.pricingType === "percentage_off" ? (
                          <span className="text-emerald-700 font-medium font-mono">
                            {item.discountPercent}% Promotional Discount
                          </span>
                        ) : (
                          <span className="text-blue-700 font-medium font-mono">
                            Special Bundle Price
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-black font-mono">
                        {formatCurrency(bundlePrice)}
                      </div>
                      <div className="text-[10px] text-neutral-400 line-through font-mono">
                        {formatCurrency(origPrice)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-neutral-900 text-white rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-neutral-400 uppercase font-mono">Combination Price</div>
                <div className="text-lg font-bold text-white font-mono">
                  {formatCurrency(unitPrice)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleAddToCart();
                  setShowBundleDrawer(false);
                }}
                className="bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer shadow-md transition-colors"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                Add Complete Bundle to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Customer Reviews Modal / Drawer */}
      {showReviewsDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setShowReviewsDrawer(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-neutral-200 shadow-2xl p-4 space-y-3 max-h-[80vh] flex flex-col text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <div>
                <h4 className="text-base font-normal uppercase text-black" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                  Customer Reviews
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StarRating rating={ratingSummary.averageRating} size={13} showScore={true} />
                  <span className="text-xs text-neutral-500 font-mono">
                    Based on {ratingSummary.totalReviews} verified ratings
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewsDrawer(false)}
                className="text-xs border border-neutral-200 px-2 py-1 rounded-lg hover:bg-neutral-100 text-neutral-600 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
              {reviews.length === 0 ? (
                <div className="p-6 text-center text-neutral-400 text-xs font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  No customer comments yet for this item. Place an order to be the first to review!
                </div>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-black">{rev.userName}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <StarRating rating={rev.rating} size={11} />
                    <p className="text-xs text-neutral-700 italic" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "13px" }}>
                      "{rev.comment}"
                    </p>
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {rev.tags.map((t) => (
                          <span key={t} className="text-[9px] bg-white border border-neutral-200 text-neutral-600 px-1.5 py-0.2 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

export default function ShopCatalog() {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 250);
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [activeFilter, setActiveFilter] = useState<FilterOption>("all");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const { products, categories: hookCategories, loading } = useProducts();

  const categories = useMemo(() => {
    const combined = Array.from(new Set([...(hookCategories || []), ...products.map((p) => p.category).filter(Boolean)])) as string[];
    return ["All Categories", ...combined.sort()];
  }, [products, hookCategories]);

  const filtered = useMemo(() => {
    let list = products ?? [];

    // Category filter
    if (activeCategory !== "All Categories") {
      list = list.filter((p) => p.category === activeCategory);
    }

    // Search query
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.subname ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q)
      );
    }

    // Custom Filters
    if (activeFilter === "in_stock") {
      list = list.filter((p) => p.stock > 0);
    } else if (activeFilter === "sale") {
      list = list.filter((p) => p.badge === "SALE" || Boolean(p.salePrice));
    } else if (activeFilter === "new") {
      list = list.filter((p) => p.badge === "NEW");
    } else if (activeFilter === "low_stock") {
      list = list.filter((p) => p.badge === "LOW_STOCK" || (p.stock > 0 && p.stock <= 10));
    }

    // Sorting
    const sortFn = (a: Product, b: Product) => {
      const priceA = a.salePrice ?? a.price;
      const priceB = b.salePrice ?? b.price;
      if (activeFilter === "price_asc") return priceA - priceB;
      if (activeFilter === "price_desc") return priceB - priceA;
      return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    };

    return [...list].sort(sortFn);
  }, [products, activeCategory, debouncedSearch, activeFilter]);

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-6">
      {/* Top Search & Filter Bar */}
      <div className="px-2.5 pt-2.5 pb-1">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search Box */}
          <div className="flex-1 flex items-center gap-1.5 bg-white border border-neutral-200/90 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Search size={14} className="text-neutral-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-neutral-800 placeholder-neutral-400 outline-none font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            />
          </div>

          {/* Categories Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCategoryMenu((v) => !v);
                setShowFilterMenu(false);
              }}
              className="flex items-center justify-between gap-1.5 bg-white border border-neutral-200/90 rounded-xl px-2.5 py-1.5 text-xs font-normal text-neutral-800 cursor-pointer shadow-2xs hover:bg-neutral-50 min-w-[105px]"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              <span className="truncate max-w-[85px]">{activeCategory}</span>
              <ChevronDown size={14} className="text-neutral-500 flex-shrink-0" />
            </button>

            {showCategoryMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 min-w-[160px] overflow-hidden py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setShowCategoryMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between cursor-pointer hover:bg-neutral-50 font-normal ${
                      activeCategory === cat ? "text-black bg-neutral-50 font-semibold" : "text-neutral-700"
                    }`}
                    style={{ fontFamily: "'Ubuntu', sans-serif" }}
                  >
                    <span>{cat}</span>
                    {activeCategory === cat && <Check size={12} className="text-black" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFilterMenu((v) => !v);
                setShowCategoryMenu(false);
              }}
              className="flex items-center justify-between gap-1.5 bg-white border border-neutral-200/90 rounded-xl px-2.5 py-1.5 text-xs font-normal text-neutral-800 cursor-pointer shadow-2xs hover:bg-neutral-50 min-w-[95px] active:scale-95 transition-transform duration-100"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              <span className="truncate max-w-[75px]">
                {activeFilter === "all" ? "All Filters" : FILTER_LABELS[activeFilter]}
              </span>
              <ChevronDown size={14} className="text-neutral-500 flex-shrink-0" />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 min-w-[160px] overflow-hidden py-1">
                {(Object.keys(FILTER_LABELS) as FilterOption[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveFilter(key);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between cursor-pointer hover:bg-neutral-50 font-normal ${
                      activeFilter === key ? "text-black bg-neutral-50 font-semibold" : "text-neutral-700"
                    }`}
                    style={{ fontFamily: "'Ubuntu', sans-serif" }}
                  >
                    <span>{FILTER_LABELS[key]}</span>
                    {activeFilter === key && <Check size={12} className="text-black" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop for closing popups */}
      {(showCategoryMenu || showFilterMenu) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setShowCategoryMenu(false);
            setShowFilterMenu(false);
          }}
        />
      )}

      {/* Product Grid */}
      <div className="p-2.5">
        {loading ? (
          <ProductGridSkeleton count={6} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-neutral-400 bg-white rounded-2xl border border-neutral-200 p-8 my-4">
            <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-normal text-neutral-700" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
              No products match your criteria
            </p>
            {(search || activeCategory !== "All Categories" || activeFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All Categories");
                  setActiveFilter("all");
                }}
                className="mt-3 text-xs bg-black text-white font-normal px-4 py-2 rounded-xl cursor-pointer hover:bg-neutral-800 active:scale-95 transition-transform duration-100"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } }
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
                  }
                }}
              >
                <ProductCard product={product} allProducts={products} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
