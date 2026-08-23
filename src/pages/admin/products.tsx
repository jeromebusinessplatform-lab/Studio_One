import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts.ts";
import { ProductListSkeleton } from "@/components/admin/ProductListSkeleton.tsx";
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  ShoppingBag,
  Layers,
  Sparkles,
  Tag,
  Clock,
  AlertTriangle,
  FolderCog,
  Percent,
  DollarSign,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import { type Product, type BundleItemConfig, isBadgeActive } from "@/data/products.ts";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils.ts";
import { CategoryManagerModal } from "@/components/admin/CategoryManagerModal.tsx";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader.tsx";
import { ProductBundleManager } from "@/components/admin/ProductBundleManager.tsx";
import { ProductBadgeSelector } from "@/components/admin/ProductBadgeSelector.tsx";

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const {
    products,
    categories,
    loading,
    addProduct,
    updateProduct,
    removeProduct,
    addCategory,
    editCategory,
    removeCategory,
    computeBundlePrice,
  } = useProducts();

  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    subname: "",
    category: "Audio",
    description: "",
    price: 99.99,
    salePrice: "",
    costing: "",
    stock: 50,
    badge: "" as "" | "NEW" | "SALE" | "LOW_STOCK",
    badgeExpiry: "",
    image: undefined as string | undefined,
    // Bundle / Combination state
    isCombination: false,
    bundleItems: [] as BundleItemConfig[],
  });

  // Calculate Product count per Category
  const productCountsByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((cat) => (counts[cat] = 0));
    products.forEach((p) => {
      const cat = p.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products, categories]);

  // Compute live bundle combination price
  const calculatedBundlePrice = useMemo(() => {
    if (!formData.isCombination || formData.bundleItems.length === 0) return null;
    return computeBundlePrice(formData.bundleItems);
  }, [formData.isCombination, formData.bundleItems, computeBundlePrice]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      subname: "",
      category: categories[0] || "General",
      description: "",
      price: 99.99,
      salePrice: "",
      costing: "50.00",
      stock: 50,
      badge: "NEW",
      badgeExpiry: "",
      image: undefined,
      isCombination: false,
      bundleItems: [],
    });
    setShowForm(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      subname: p.subname ?? "",
      category: p.category ?? categories[0] ?? "General",
      description: p.description ?? "",
      price: p.price,
      salePrice: p.salePrice ? String(p.salePrice) : "",
      costing: p.costing ? String(p.costing) : "",
      stock: p.stock,
      badge: (p.badge ?? "") as "" | "NEW" | "SALE" | "LOW_STOCK",
      badgeExpiry: p.badgeExpiry ?? "",
      image: p.image,
      isCombination: !!p.isCombination,
      bundleItems: p.bundleItems ?? [],
    });
    setShowForm(true);
  };

  const [savingProduct, setSavingProduct] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please provide a product title");
      return;
    }

    if (formData.isCombination && formData.bundleItems.length === 0) {
      toast.error("Please add at least one product to the combination bundle");
      return;
    }

    // Determine final price: if combination, use auto-calculated bundle price
    const finalPrice =
      formData.isCombination && calculatedBundlePrice !== null
        ? calculatedBundlePrice
        : Number(formData.price) || 0;

    const payload = {
      name: formData.name.trim(),
      subname: formData.subname.trim() || undefined,
      category: formData.category,
      description: formData.description.trim() || undefined,
      price: finalPrice,
      salePrice:
        !formData.isCombination && formData.salePrice ? Number(formData.salePrice) : undefined,
      costing: formData.costing ? Number(formData.costing) : undefined,
      stock: Number(formData.stock),
      available: Number(formData.stock) > 0,
      badge: formData.badge ? formData.badge : undefined,
      badgeExpiry: formData.badge ? formData.badgeExpiry || undefined : undefined,
      image: formData.image || undefined,
      isCombination: formData.isCombination,
      bundleItems: formData.isCombination ? formData.bundleItems : undefined,
      bundleCalculatedPrice: formData.isCombination ? finalPrice : undefined,
    };

    setSavingProduct(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, payload);
        toast.success(`Updated "${formData.name}"`);
      } else {
        await addProduct({
          ...payload,
          sortOrder: products.length + 1,
        });
        toast.success(`Added new product "${formData.name}"`);
      }
      setShowForm(false);
    } catch (err: any) {
      console.error("Failed to save product:", err);
      toast.error(err?.message || "Failed to save product. Please try again.");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the catalog?`)) {
      try {
        await removeProduct(id);
        toast.success(`Removed product "${name}"`);
      } catch (err: any) {
        console.error("Failed to delete product:", err);
        toast.error(err?.message || "Failed to delete product");
      }
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (activeCategoryFilter === "ALL") return products;
    if (activeCategoryFilter === "BUNDLES") return products.filter((p) => p.isCombination);
    return products.filter((p) => p.category === activeCategoryFilter);
  }, [products, activeCategoryFilter]);

  return (
    <div className="p-3 sm:p-5 space-y-4 bg-white text-black min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="p-1 text-neutral-500 hover:text-black rounded"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              className="text-black text-xl font-bold tracking-tight uppercase"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              INVENTORY & BUNDLE MANAGEMENT
            </h1>
            <p
              className="text-neutral-500 text-xs font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              Stock levels, pricing, promotional badges and product catalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs font-normal transition-colors"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            <FolderCog size={14} className="text-neutral-600" /> Manage Categories ({categories.length})
          </button>

          <button
            onClick={handleOpenAdd}
            className="bg-black hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs font-normal transition-colors"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            <Plus size={15} /> Add New Product
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategoryFilter("ALL")}
          className={`px-3 py-1.5 rounded-xl text-xs font-normal whitespace-nowrap cursor-pointer transition-all ${
            activeCategoryFilter === "ALL"
              ? "bg-black text-white shadow-2xs"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
          }`}
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          All Items ({products.length})
        </button>

        <button
          onClick={() => setActiveCategoryFilter("BUNDLES")}
          className={`px-3 py-1.5 rounded-xl text-xs font-normal whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
            activeCategoryFilter === "BUNDLES"
              ? "bg-neutral-900 text-amber-300 shadow-2xs"
              : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
          }`}
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          <Sparkles size={12} className="text-amber-400" /> Suggested Bundles (
          {products.filter((p) => p.isCombination).length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-normal whitespace-nowrap cursor-pointer transition-all ${
              activeCategoryFilter === cat
                ? "bg-black text-white shadow-2xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            {cat} ({productCountsByCategory[cat] || 0})
          </button>
        ))}
      </div>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        productCounts={productCountsByCategory}
        onAddCategory={(name) => {
          const success = addCategory(name);
          if (success) toast.success(`Added category "${name}"`);
          return success;
        }}
        onEditCategory={(oldName, newName) => {
          const success = editCategory(oldName, newName);
          if (success) toast.success(`Renamed category to "${newName}"`);
          return success;
        }}
        onRemoveCategory={(name) => {
          const success = removeCategory(name);
          if (success) toast.success(`Deleted category "${name}"`);
          return success;
        }}
      />

      {/* Add / Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-5 sm:p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-2xl border border-neutral-200 my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <div>
                <h2
                  className="text-lg font-normal text-black uppercase"
                  style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                >
                  {editingProduct ? "Edit Product Details" : "Add New Product"}
                </h2>
                <p
                  className="text-xs text-neutral-500 font-normal"
                  style={{ fontFamily: "'Ubuntu', sans-serif" }}
                >
                  Configure product info, stock, promotion combinations, and badges
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-neutral-400 hover:text-black cursor-pointer p-1.5 rounded-lg hover:bg-neutral-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 font-normal text-xs" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "14px" }}>
              {/* Product Title & Sub-name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-600 uppercase block mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wireless Pro Studio Headphones"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black font-medium"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-neutral-600 uppercase block mb-1">Sub-name / Tagline</label>
                  <input
                    type="text"
                    placeholder="e.g. Active Noise Cancelling • Spatial Audio"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                    value={formData.subname}
                    onChange={(e) => setFormData({ ...formData, subname: e.target.value })}
                  />
                </div>
              </div>

              {/* Category & Stock Available */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-neutral-600 uppercase block">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-[11px] text-neutral-600 hover:text-black underline cursor-pointer"
                    >
                      + Manage Categories
                    </button>
                  </div>
                  <select
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-neutral-600 uppercase block mb-1">Stocks Available *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Inventory count"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black font-mono"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-neutral-600 uppercase block mb-1">Product Description</label>
                <textarea
                  rows={2}
                  placeholder="Detailed specifications and features..."
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Product Image: Only allow image upload and not URL */}
              <ProductImageUploader
                currentImage={formData.image}
                onImageChange={(dataUrl) => setFormData({ ...formData, image: dataUrl })}
              />

              {/* Promotional Combination / Bundle Switch */}
              <div className="bg-neutral-50 border border-neutral-200/90 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      <span
                        className="text-xs font-semibold text-black uppercase tracking-tight"
                        style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                      >
                        Combine the product for promotion (Bundle)
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 font-normal">
                      When enabled, this product behaves as a "Suggested Bundle", automatically combining multiple catalog items.
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isCombination}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setFormData({
                          ...formData,
                          isCombination: enabled,
                          subname: enabled && !formData.subname ? "Suggested Bundle" : formData.subname,
                          bundleItems:
                            enabled && formData.bundleItems.length === 0
                              ? [
                                  {
                                    productId: products.find((p) => p._id !== editingProduct?._id)?._id || products[0]?._id || "",
                                    pricingType: "percentage_off",
                                    discountPercent: 15,
                                  },
                                ]
                              : formData.bundleItems,
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>

                {/* Collapsible Combination Configuration */}
                {formData.isCombination && (
                  <ProductBundleManager
                    bundleItems={formData.bundleItems}
                    availableProducts={products}
                    currentProductId={editingProduct?._id}
                    onUpdateBundleItems={(items) =>
                      setFormData({ ...formData, bundleItems: items })
                    }
                  />
                )}
              </div>

              {/* Pricing & Costing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Price (Disabled if Combination is enabled) */}
                <div>
                  <label className="text-neutral-600 uppercase block mb-1">
                    Selling Price ($ USD) *
                    {formData.isCombination && (
                      <span className="text-amber-600 ml-1">(Auto-calculated)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    disabled={formData.isCombination}
                    placeholder="0.00"
                    className={`w-full border rounded-xl px-3 py-2 text-sm outline-none font-mono ${
                      formData.isCombination
                        ? "bg-neutral-100 border-neutral-300 text-neutral-700 cursor-not-allowed font-bold"
                        : "bg-neutral-50 border-neutral-300 focus:border-black"
                    }`}
                    value={
                      formData.isCombination && calculatedBundlePrice !== null
                        ? calculatedBundlePrice
                        : formData.price
                    }
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>

                {/* Sale Price (Only for single items) */}
                <div>
                  <label className="text-neutral-600 uppercase block mb-1">
                    Sale Price ($ USD)
                    {formData.isCombination && <span className="text-neutral-400 ml-1">(N/A for Bundle)</span>}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={formData.isCombination}
                    placeholder="Optional Discount"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                  />
                </div>

                {/* Costing */}
                <div>
                  <label className="text-neutral-600 uppercase block mb-1">
                    Costing ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Unit Cost Expense"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black font-mono"
                    value={formData.costing}
                    onChange={(e) => setFormData({ ...formData, costing: e.target.value })}
                  />
                </div>
              </div>

              {/* Dynamic Badges (NEW, SALE, LOW_STOCK) & Custom Expiry Dates */}
              <ProductBadgeSelector
                badge={formData.badge}
                badgeExpiry={formData.badgeExpiry}
                onBadgeChange={(b) => setFormData({ ...formData, badge: b })}
                onExpiryChange={(exp) => setFormData({ ...formData, badgeExpiry: exp })}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-xs text-neutral-600 hover:bg-neutral-100 cursor-pointer font-normal"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="bg-black disabled:bg-neutral-400 text-white px-5 py-2 rounded-xl text-xs cursor-pointer hover:bg-neutral-800 shadow-xs font-normal transition-colors"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                {savingProduct ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <ProductListSkeleton count={6} />
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400">
            <Package size={40} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-normal" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
              No products match the selected filters
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isBadgeCurrentlyActive = isBadgeActive(product.badge, product.badgeExpiry);
            const hasCosting = typeof product.costing === "number" && product.costing > 0;
            const currentPrice = product.salePrice ?? product.price;
            const profit = hasCosting ? currentPrice - (product.costing ?? 0) : null;
            const margin = hasCosting && currentPrice > 0 ? Math.round(((profit ?? 0) / currentPrice) * 100) : null;

            return (
              <div
                key={product._id}
                className={`bg-white border rounded-2xl p-4 shadow-2xs flex flex-col justify-between transition-all ${
                  product.isCombination ? "border-amber-300/80 ring-1 ring-amber-200/50" : "border-neutral-200"
                }`}
              >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-neutral-50 border border-neutral-100 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ShoppingBag size={24} className="text-neutral-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        className="font-normal text-black text-base truncate"
                        style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                      >
                        {product.name}
                      </h3>
                      {product.isCombination && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded-full font-semibold flex items-center gap-0.5">
                          <Sparkles size={10} className="text-amber-600" /> Suggested Bundle
                        </span>
                      )}
                    </div>

                    <div
                      className="text-xs text-neutral-500 font-normal truncate"
                      style={{ fontFamily: "'Ubuntu', sans-serif" }}
                    >
                      {product.category ?? "General"} • {product.stock} in stock
                      {product.subname && ` • ${product.subname}`}
                    </div>

                    {/* Pricing Display */}
                    <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                      <span
                        className="text-black font-semibold text-base"
                        style={{ fontFamily: "'Ubuntu', sans-serif" }}
                      >
                        {formatCurrency(currentPrice)}
                      </span>
                      {product.salePrice && !product.isCombination && (
                        <span className="text-xs text-red-500 line-through">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges & Expiry Details */}
                {product.badge && (
                  <div className="bg-neutral-50 rounded-xl p-2 border border-neutral-200/70 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                          product.badge === "NEW"
                            ? "bg-blue-600"
                            : product.badge === "SALE"
                            ? "bg-red-600"
                            : "bg-amber-500"
                        }`}
                      >
                        {product.badge}
                      </span>
                      {product.badgeExpiry && (
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {isBadgeCurrentlyActive ? (
                            `Expires ${new Date(product.badgeExpiry).toLocaleDateString()}`
                          ) : (
                            <span className="text-red-600 font-semibold flex items-center gap-0.5">
                              <AlertTriangle size={10} /> Expired
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {!product.badgeExpiry && (
                      <span className="text-[10px] text-neutral-400 font-mono">No expiry</span>
                    )}
                  </div>
                )}

                {/* If Suggested Bundle: Show included products */}
                {product.isCombination && product.bundleItems && product.bundleItems.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2 space-y-1">
                    <div className="text-[10px] text-amber-900 font-semibold uppercase flex items-center justify-between">
                      <span>Included in Bundle ({product.bundleItems.length} items):</span>
                      <span className="text-amber-700 font-mono">Suggested Bundle</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {product.bundleItems.map((bi, idx) => {
                        const targetProd = products.find((p) => p._id === bi.productId);
                        return (
                          <span
                            key={idx}
                            className="text-[10px] bg-white border border-amber-200 text-neutral-800 px-1.5 py-0.5 rounded flex items-center gap-1"
                          >
                            <span className="font-medium truncate max-w-[110px]">
                              {targetProd?.name ?? "Catalog Item"}
                            </span>
                            <span className="text-neutral-400">
                              {bi.pricingType === "percentage_off"
                                ? `(-${bi.discountPercent}%)`
                                : `(${formatCurrency(bi.customPrice ?? 0)})`}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Costing & Profit Margin Badge */}
                {hasCosting && (
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono pt-1">
                    <span>Costing: {formatCurrency(product.costing ?? 0)}</span>
                    <span className="text-emerald-700 font-medium">
                      Profit: {formatCurrency(profit ?? 0)} ({margin}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-neutral-100">
                <button
                  onClick={() => handleOpenEdit(product)}
                  className="flex items-center gap-1 text-xs text-neutral-700 hover:text-black border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors"
                  style={{ fontFamily: "'Ubuntu', sans-serif" }}
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(product._id, product.name)}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                  style={{ fontFamily: "'Ubuntu', sans-serif" }}
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
