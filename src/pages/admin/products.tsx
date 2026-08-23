import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useProducts } from "@/hooks/useProducts.ts";
import { ProductListSkeleton } from "@/components/admin/ProductListSkeleton.tsx";
import { AdminOverlayLoader } from "@/components/admin/AdminOverlayLoader.tsx";
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  ShoppingBag,
  Sparkles,
  Tag,
  FolderCog,
  ArrowLeft,
  CheckSquare,
  Square,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { type Product, type BundleItemConfig, isBadgeActive } from "@/data/products.ts";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils.ts";
import { CategoryManagerModal } from "@/components/admin/CategoryManagerModal.tsx";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader.tsx";
import { ProductBundleManager } from "@/components/admin/ProductBundleManager.tsx";
import { ProductBadgeSelector } from "@/components/admin/ProductBadgeSelector.tsx";
import { BundleViewModal } from "@/components/admin/BundleViewModal.tsx";
import { AdminActionDrawer } from "@/components/AdminActionDrawer.tsx";

export default function AdminProductsPage() {
  const {
    products,
    categories,
    loading,
    addProduct,
    updateProduct,
    removeProduct,
    batchDeleteProducts,
    batchUpdateCategory,
    batchSetAvailability,
    batchSetBadge,
    addCategory,
    editCategory,
    removeCategory,
    computeBundlePrice,
  } = useProducts();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingBundleProduct, setViewingBundleProduct] = useState<Product | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [overlayLoading, setOverlayLoading] = useState<{ isVisible: boolean; label: string; sublabel?: string }>({
    isVisible: false,
    label: "",
  });

  // Batch action modals / dropdown state
  const [batchTargetCategory, setBatchTargetCategory] = useState<string>("");
  const [showBatchCategoryDialog, setShowBatchCategoryDialog] = useState(false);
  const [showBatchBadgeDialog, setShowBatchBadgeDialog] = useState(false);
  const [batchTargetBadge, setBatchTargetBadge] = useState<"" | "NEW" | "SALE" | "LOW_STOCK">("SALE");

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
    setOverlayLoading({
      isVisible: true,
      label: editingProduct ? "Updating Product..." : "Saving New Product...",
      sublabel: `Syncing "${formData.name}" to Firestore`,
    });
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
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the catalog?`)) {
      setOverlayLoading({
        isVisible: true,
        label: "Deleting Product...",
        sublabel: `Removing "${name}" from database`,
      });
      try {
        await removeProduct(id);
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        toast.success(`Removed product "${name}"`);
      } catch (err: any) {
        console.error("Failed to delete product:", err);
        toast.error(err?.message || "Failed to delete product");
      } finally {
        setOverlayLoading({ isVisible: false, label: "" });
      }
    }
  };

  // Quick Stock adjustments
  const handleQuickStock = async (product: Product, delta: number) => {
    const nextStock = Math.max(0, (product.stock || 0) + delta);
    try {
      await updateProduct(product._id, {
        stock: nextStock,
        available: nextStock > 0,
      });
      toast.success(`${product.name}: stock updated to ${nextStock}`);
    } catch {
      toast.error("Failed to update stock");
    }
  };

  // Quick Availability toggle
  const handleToggleAvailable = async (product: Product) => {
    const nextAvail = !product.available;
    try {
      await updateProduct(product._id, {
        available: nextAvail,
        stock: nextAvail && product.stock === 0 ? 10 : product.stock,
      });
      toast.success(
        `${product.name} is now ${nextAvail ? "AVAILABLE / IN-STOCK" : "UNAVAILABLE"}`
      );
    } catch {
      toast.error("Failed to toggle availability");
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (activeCategoryFilter === "ALL") return products;
    if (activeCategoryFilter === "BUNDLES") return products.filter((p) => p.isCombination);
    return products.filter((p) => p.category === activeCategoryFilter);
  }, [products, activeCategoryFilter]);

  // Multi-select handlers
  const isAllSelected = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every((p) => selectedIds.includes(p._id));
  }, [filteredProducts, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p._id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Batch Operations Handlers
  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected product(s) permanently?`)) return;

    setOverlayLoading({
      isVisible: true,
      label: "Batch Deleting Products...",
      sublabel: `Removing ${selectedIds.length} items from Firestore`,
    });
    try {
      await batchDeleteProducts(selectedIds);
      toast.success(`Deleted ${selectedIds.length} products`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to batch delete products");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  const handleBatchUpdateCategoryConfirm = async () => {
    if (!selectedIds.length || !batchTargetCategory) return;
    setShowBatchCategoryDialog(false);
    setOverlayLoading({
      isVisible: true,
      label: "Updating Category...",
      sublabel: `Moving ${selectedIds.length} items to "${batchTargetCategory}"`,
    });
    try {
      await batchUpdateCategory(selectedIds, batchTargetCategory);
      toast.success(`Updated category for ${selectedIds.length} products to "${batchTargetCategory}"`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to batch update categories");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  const handleBatchSetAvailability = async (available: boolean) => {
    if (!selectedIds.length) return;
    setOverlayLoading({
      isVisible: true,
      label: available ? "Marking Products In-Stock..." : "Marking Products Out-of-Stock...",
      sublabel: `Applying to ${selectedIds.length} selected items`,
    });
    try {
      await batchSetAvailability(selectedIds, available);
      toast.success(
        `Marked ${selectedIds.length} products as ${available ? "Available" : "Unavailable"}`
      );
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update availability");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  const handleBatchSetBadgeConfirm = async () => {
    if (!selectedIds.length) return;
    setShowBatchBadgeDialog(false);
    setOverlayLoading({
      isVisible: true,
      label: "Applying Promo Badges...",
      sublabel: `Applying "${batchTargetBadge || "None"}" to ${selectedIds.length} products`,
    });
    try {
      await batchSetBadge(selectedIds, batchTargetBadge);
      toast.success(`Updated badge on ${selectedIds.length} products`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update badges");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  return (
    <div className="p-2 sm:p-3 w-full max-w-full space-y-2.5 bg-white text-black min-h-screen pb-24">
      <AdminOverlayLoader
        isVisible={overlayLoading.isVisible}
        label={overlayLoading.label}
        sublabel={overlayLoading.sublabel}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="p-1 text-neutral-500 hover:text-black rounded hover:bg-neutral-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1
              className="text-black text-lg sm:text-xl font-bold tracking-tight uppercase"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              INVENTORY & BUNDLE MANAGEMENT
            </h1>
            <p
              className="text-neutral-500 text-[11px] font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              Mobile-optimized vertical card catalog, live pricing & batch controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="min-h-[46.5px] h-[46.5px] bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs font-normal transition-colors"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            <FolderCog size={14} className="text-neutral-600" /> Categories ({categories.length})
          </button>

          <button
            onClick={handleOpenAdd}
            className="min-h-[46.5px] h-[46.5px] bg-black hover:bg-neutral-800 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs font-normal transition-colors"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            <Plus size={15} /> Add Product
          </button>
        </div>
      </div>

      {/* Category Filter Tabs & Multi-Select Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none flex-1">
          <button
            onClick={() => setActiveCategoryFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-normal whitespace-nowrap cursor-pointer transition-all ${
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
            className={`px-2.5 py-1 rounded-lg text-[11px] font-normal whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
              activeCategoryFilter === "BUNDLES"
                ? "bg-neutral-900 text-amber-300 shadow-2xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            }`}
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            <Sparkles size={11} className="text-amber-400" /> Bundles (
            {products.filter((p) => p.isCombination).length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-normal whitespace-nowrap cursor-pointer transition-all ${
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

        {/* Select All Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 transition cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare size={13} className="text-black" />
            ) : (
              <Square size={13} className="text-neutral-400" />
            )}
            <span>
              {isAllSelected
                ? "Deselect All"
                : `Select All (${filteredProducts.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Floating Sticky Batch Action Bar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-3 z-40 bg-neutral-950 text-white rounded-2xl p-3 shadow-2xl border border-neutral-800 flex flex-wrap items-center justify-between gap-2.5 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold uppercase tracking-tight font-condensed">
              {selectedIds.length === 1 ? "1 Item Selected" : `${selectedIds.length} Items Selected`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setBatchTargetCategory(categories[0] || "General");
                setShowBatchCategoryDialog(true);
              }}
              className="min-h-[46.5px] h-[46.5px] px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition cursor-pointer"
            >
              <Tag size={13} className="text-amber-400" /> Category
            </button>

            <button
              type="button"
              onClick={() => handleBatchSetAvailability(true)}
              className="min-h-[46.5px] h-[46.5px] px-3 bg-neutral-800 hover:bg-neutral-700 text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition cursor-pointer"
            >
              <CheckCircle2 size={13} /> In-Stock
            </button>

            <button
              type="button"
              onClick={() => handleBatchSetAvailability(false)}
              className="min-h-[46.5px] h-[46.5px] px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition cursor-pointer"
            >
              <XCircle size={13} /> Out-Stock
            </button>

            <button
              type="button"
              onClick={() => setShowBatchBadgeDialog(true)}
              className="min-h-[46.5px] h-[46.5px] px-3 bg-neutral-800 hover:bg-neutral-700 text-blue-300 rounded-xl text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition cursor-pointer"
            >
              <Sparkles size={13} /> Badge
            </button>

            <button
              type="button"
              onClick={handleBatchDelete}
              className="min-h-[46.5px] h-[46.5px] px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            >
              <Trash2 size={14} /> Delete Selected ({selectedIds.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="min-h-[46.5px] min-w-[46.5px] h-[46.5px] w-[46.5px] flex items-center justify-center text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Batch Update Category Dialog */}
      {showBatchCategoryDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-neutral-300 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h3 className="text-sm font-bold uppercase font-condensed">
                Change Category for {selectedIds.length} Items
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchCategoryDialog(false)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-neutral-600 font-medium">Select Target Category</label>
              <select
                value={batchTargetCategory}
                onChange={(e) => setBatchTargetCategory(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs outline-none focus:border-black font-medium"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowBatchCategoryDialog(false)}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchUpdateCategoryConfirm}
                className="px-4 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-neutral-800 cursor-pointer"
              >
                Apply to {selectedIds.length} Products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Update Badge Dialog */}
      {showBatchBadgeDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-neutral-300 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h3 className="text-sm font-bold uppercase font-condensed">
                Set Badge for {selectedIds.length} Items
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchBadgeDialog(false)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "", label: "No Badge (Clear)" },
                { id: "NEW", label: "NEW" },
                { id: "SALE", label: "SALE" },
                { id: "LOW_STOCK", label: "LOW STOCK" },
              ].map((badgeOption) => (
                <button
                  key={badgeOption.id}
                  type="button"
                  onClick={() => setBatchTargetBadge(badgeOption.id as any)}
                  className={`p-2 rounded-xl border text-xs font-medium text-center transition cursor-pointer ${
                    batchTargetBadge === badgeOption.id
                      ? "bg-black text-white border-black font-bold"
                      : "bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                  }`}
                >
                  {badgeOption.label}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowBatchBadgeDialog(false)}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchSetBadgeConfirm}
                className="px-4 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-neutral-800 cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        productCounts={productCountsByCategory}
        onAddCategory={async (name) => {
          setOverlayLoading({
            isVisible: true,
            label: "Adding Category...",
            sublabel: `Creating "${name}" in Firestore`,
          });
          try {
            const success = await addCategory(name);
            if (success) toast.success(`Added category "${name}"`);
            return success;
          } finally {
            setOverlayLoading({ isVisible: false, label: "" });
          }
        }}
        onEditCategory={async (oldName, newName) => {
          setOverlayLoading({
            isVisible: true,
            label: "Renaming Category...",
            sublabel: `Updating products from "${oldName}" to "${newName}"`,
          });
          try {
            const success = await editCategory(oldName, newName);
            if (success) toast.success(`Renamed category to "${newName}"`);
            return success;
          } finally {
            setOverlayLoading({ isVisible: false, label: "" });
          }
        }}
        onRemoveCategory={async (name) => {
          setOverlayLoading({
            isVisible: true,
            label: "Deleting Category...",
            sublabel: `Reassigning products from "${name}" to General`,
          });
          try {
            const success = await removeCategory(name);
            if (success) toast.success(`Deleted category "${name}"`);
            return success;
          } finally {
            setOverlayLoading({ isVisible: false, label: "" });
          }
        }}
      />

      {/* Add / Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl border border-neutral-200 shadow-2xl p-4 sm:p-5 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center">
                  <Package size={16} />
                </div>
                <div>
                  <h2
                    className="text-base font-bold uppercase text-black"
                    style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                  >
                    {editingProduct ? "Edit Product Details" : "Add New Catalog Product"}
                  </h2>
                  <p
                    className="text-xs text-neutral-500 font-normal"
                    style={{ fontFamily: "'Ubuntu', sans-serif" }}
                  >
                    {formData.isCombination
                      ? "Combination Bundle item linked to child products"
                      : "Standard retail catalog item"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-neutral-400 hover:text-black cursor-pointer p-1 rounded-lg hover:bg-neutral-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-normal text-xs">
              {/* Product Image Uploader */}
              <ProductImageUploader
                currentImage={formData.image}
                onImageChange={(url) => setFormData((prev) => ({ ...prev, image: url || "" }))}
              />

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-700">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Sony WH-1000XM5"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-700">
                    Subtitle / Model (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.subname}
                    onChange={(e) => setFormData({ ...formData, subname: e.target.value })}
                    placeholder="e.g. Midnight Black / 2024"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-700">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-black"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-700">Stock Units *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* Pricing & Costing */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-700">
                    {formData.isCombination ? "Bundle Retail (Auto)" : "Regular Price *"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!formData.isCombination}
                    disabled={formData.isCombination}
                    value={
                      formData.isCombination
                        ? calculatedBundlePrice ?? formData.price
                        : formData.price
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, price: Number(e.target.value) })
                    }
                    className="w-full bg-neutral-50 disabled:bg-neutral-100 border border-neutral-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-black font-mono font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-700">
                    Sale Price (Optional)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={formData.isCombination}
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    placeholder="e.g. 79.99"
                    className="w-full bg-neutral-50 disabled:bg-neutral-100 border border-neutral-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-black font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-700">
                    Costing (Margin calc)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costing}
                    onChange={(e) => setFormData({ ...formData, costing: e.target.value })}
                    placeholder="e.g. 45.00"
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs outline-none focus:border-black font-mono text-neutral-600"
                  />
                </div>
              </div>

              {/* Promotional Badge Selector */}
              <ProductBadgeSelector
                badge={formData.badge}
                badgeExpiry={formData.badgeExpiry}
                onBadgeChange={(badge) => setFormData((prev) => ({ ...prev, badge }))}
                onExpiryChange={(badgeExpiry) => setFormData((prev) => ({ ...prev, badgeExpiry }))}
              />

              {/* Combination Bundle Builder Section */}
              <div className="border border-neutral-200 rounded-2xl p-3 bg-neutral-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={15} className="text-amber-500" />
                    <div>
                      <span className="font-semibold text-neutral-900 font-condensed uppercase text-sm">
                        Suggested Bundle / Combination
                      </span>
                      <p className="text-[10px] text-neutral-500">
                        Bundle multiple catalog products with custom discounting
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    id="isCombinationToggle"
                    checked={formData.isCombination}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isCombination: e.target.checked }))
                    }
                    className="w-4 h-4 rounded text-black focus:ring-0 cursor-pointer"
                  />
                </div>

                {formData.isCombination && (
                  <ProductBundleManager
                    bundleItems={formData.bundleItems}
                    availableProducts={products}
                    currentProductId={editingProduct?._id}
                    onUpdateBundleItems={(newItems) =>
                      setFormData((prev) => ({ ...prev, bundleItems: newItems }))
                    }
                  />
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={savingProduct}
                  className="px-4 py-2 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-normal cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="bg-black hover:bg-neutral-800 disabled:bg-neutral-400 text-white px-5 py-2 rounded-xl text-xs font-normal flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  {savingProduct ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check size={14} /> {editingProduct ? "Update Product" : "Create Product"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Compact Portrait-Optimized Vertical Stacked Product Cards */}
      <div className="flex-1 w-full flex flex-col gap-3">
        {loading ? (
          <ProductListSkeleton count={4} />
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center text-neutral-400 space-y-2">
            <ShoppingBag size={32} className="mx-auto text-neutral-300" />
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
            const isSelected = selectedIds.includes(product._id);
            const isLowStock = product.stock > 0 && product.stock <= 5;
            const isOutOfStock = product.stock <= 0 || product.available === false;

            return (
              <motion.div
                key={product._id}
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) {
                    handleDelete(product._id, product.name);
                  }
                }}
                className={`bg-white border rounded-2xl p-3 shadow-2xs transition-all relative flex flex-col gap-3 ${
                  isSelected
                    ? "border-black ring-1 ring-black bg-neutral-50/40"
                    : product.isCombination
                    ? "border-amber-300 bg-amber-50/15"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {/* Absolute Top-Right Badges */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
                  {/* BUNDLED badge if product is combination bundle */}
                  {product.isCombination && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs text-white bg-amber-500 font-condensed tracking-wide">
                      BUNDLED
                    </span>
                  )}

                  {/* Promo Badge if present */}
                  {product.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs text-white ${
                        product.badge === "NEW"
                          ? "bg-blue-600"
                          : product.badge === "SALE"
                          ? "bg-red-600"
                          : "bg-amber-500"
                      }`}
                    >
                      {product.badge}
                    </span>
                  )}

                  {/* Stock Status Pill */}
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold ${
                      isOutOfStock
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : isLowStock
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    {isOutOfStock
                      ? "Out of Stock"
                      : isLowStock
                      ? `Low: ${product.stock}`
                      : `Stock: ${product.stock}`}
                  </span>
                </div>

                {/* Top Section: 48px Checkbox Hit Area + Thumbnail + Identity */}
                <div className="flex items-start gap-2.5 pr-28">
                  {/* Multi-select checkbox with 48px minimum touch target */}
                  <button
                    type="button"
                    onClick={() => toggleSelectProduct(product._id)}
                    className="min-w-[48px] min-h-[48px] -ml-2 -mt-2 flex items-center justify-center text-neutral-400 hover:text-black transition cursor-pointer shrink-0 rounded-xl"
                    title={isSelected ? "Deselect item" : "Select item"}
                  >
                    {isSelected ? (
                      <CheckSquare size={18} className="text-black" />
                    ) : (
                      <Square size={18} className="text-neutral-300 hover:text-neutral-500" />
                    )}
                  </button>

                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-neutral-50 border border-neutral-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ShoppingBag size={20} className="text-neutral-300" />
                    )}
                  </div>

                  {/* Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        className="font-bold text-black text-sm leading-tight truncate"
                        style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                      >
                        {product.name}
                      </h3>
                    </div>

                    {/* Sub-name placeholder: Shows VIEW BUNDLE hyperlink if bundled, otherwise subname */}
                    {product.isCombination || (product.bundleItems && product.bundleItems.length > 0) ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingBundleProduct(product);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 font-mono cursor-pointer mt-0.5 tracking-tight hover:opacity-80 transition"
                      >
                        <Sparkles size={10} className="text-amber-500 shrink-0" />
                        <span>VIEW BUNDLE ({product.bundleItems?.length || 0} ITEMS)</span>
                      </button>
                    ) : product.subname ? (
                      <div className="text-[10px] text-neutral-500 font-sans truncate mt-0.5">
                        {product.subname}
                      </div>
                    ) : null}

                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-neutral-500 font-sans flex-wrap">
                      <span className="px-1.5 py-0.2 bg-neutral-100 rounded text-neutral-700 font-medium">
                        {product.category || "General"}
                      </span>
                      <span>•</span>
                      <span
                        className={
                          product.available !== false ? "text-emerald-700 font-medium" : "text-neutral-400"
                        }
                      >
                        {product.available !== false ? "Active" : "Hidden"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Middle Section: Price, Promo details & Profit */}
                <div className="flex flex-wrap items-baseline justify-between gap-1.5 pt-1.5 border-t border-neutral-100 text-xs">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className="text-black font-bold text-base font-mono"
                      style={{ fontFamily: "'Ubuntu', sans-serif" }}
                    >
                      {formatCurrency(currentPrice)}
                    </span>
                    {product.salePrice && !product.isCombination && (
                      <span className="text-[10px] text-red-500 line-through">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                    {hasCosting && (
                      <span className="text-[10px] text-neutral-400 font-mono">
                        (Cost: {formatCurrency(product.costing ?? 0)} • Profit: {formatCurrency(profit ?? 0)})
                      </span>
                    )}
                  </div>

                  {product.badgeExpiry && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {isBadgeCurrentlyActive
                        ? `Exp: ${new Date(product.badgeExpiry).toLocaleDateString()}`
                        : "Badge Expired"}
                    </span>
                  )}
                </div>

                {/* Bottom Section: 48px Minimum Touch Target Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
                  {/* Quick Stock Controls (48px Touch Steppers) */}
                  <div className="flex items-center gap-1 font-condensed">
                    <button
                      type="button"
                      onClick={() => handleQuickStock(product, -1)}
                      className="min-w-[46.5px] min-h-[46.5px] h-[46.5px] w-[46.5px] rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 flex items-center justify-center text-lg font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                      title="Decrease stock"
                    >
                      -
                    </button>
                    <span className="w-9 text-center text-sm font-mono font-bold">
                      {product.stock}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickStock(product, 1)}
                      className="min-w-[46.5px] min-h-[46.5px] h-[46.5px] w-[46.5px] rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 flex items-center justify-center text-lg font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                      title="Increase stock"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(product)}
                      className={`min-h-[46.5px] h-[46.5px] px-3.5 rounded-xl text-xs font-semibold border flex items-center gap-1 transition active:scale-95 cursor-pointer ${
                        product.available !== false
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200"
                      }`}
                      title="Toggle availability"
                    >
                      {product.available !== false ? (
                        <>
                          <Eye size={13} /> Active
                        </>
                      ) : (
                        <>
                          <EyeOff size={13} /> Hidden
                        </>
                      )}
                    </button>
                  </div>

                  {/* Edit / Delete Buttons with 48px minimum touch targets */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="min-h-[46.5px] h-[46.5px] px-4 flex items-center gap-1.5 text-xs font-semibold text-neutral-800 hover:text-black border border-neutral-300 rounded-xl hover:bg-neutral-50 cursor-pointer transition active:scale-95 shadow-2xs"
                      style={{ fontFamily: "'Ubuntu', sans-serif" }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product._id, product.name)}
                      className="min-h-[46.5px] h-[46.5px] px-4 flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200 rounded-xl hover:bg-red-50 cursor-pointer transition active:scale-95 shadow-2xs"
                      style={{ fontFamily: "'Ubuntu', sans-serif" }}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AdminActionDrawer
        isVisible={selectedIds.length > 0}
        selectedCount={selectedIds.length}
        onDelete={handleBatchDelete}
        onUpdateCategory={() => setShowBatchCategoryDialog(true)}
        onExport={() => {
          const data = JSON.stringify(products.filter(p => selectedIds.includes(p._id)));
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'products.json';
          a.click();
        }}
        onClose={() => setSelectedIds([])}
      />

      {/* Interactive Bundle Breakdown Modal */}
      <BundleViewModal
        bundleProduct={viewingBundleProduct}
        allProducts={products}
        onClose={() => setViewingBundleProduct(null)}
        onEditProduct={(p) => handleOpenEdit(p)}
      />
    </div>
  );
}
