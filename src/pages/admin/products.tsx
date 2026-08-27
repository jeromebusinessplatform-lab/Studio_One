import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import Barcode from "react-barcode";
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
  ScanLine,
} from "lucide-react";
import { type Product, type BundleItemConfig, isBadgeActive } from "@/data/products.ts";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils.ts";
import { CategoryManagerModal } from "@/components/admin/CategoryManagerModal.tsx";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner.tsx";
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
    stock: 0,
    badge: "" as "" | "NEW" | "SALE" | "LOW_STOCK",
    badgeExpiry: "",
    image: undefined as string | undefined,
    // Bundle / Combination state
    isCombination: false,
    bundleItems: [] as BundleItemConfig[],
    allowComparison: true,
    sku: "",
  });

  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Focus scanner input on mount if not in a form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If we're not typing in an input/textarea and it's a character, focus the scanner
      if (!showForm && !showCategoryModal && !showBatchCategoryDialog && !showBatchBadgeDialog && !showCameraScanner) {
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            barcodeInputRef.current?.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showForm, showCategoryModal, showBatchCategoryDialog, showBatchBadgeDialog, showCameraScanner]);

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcodeScan(barcodeInput.trim());
  };

  const processBarcodeScan = (scanned: string) => {
    if (!scanned) return;

    // Search for product with this SKU
    const foundProduct = products.find(p => p.sku === scanned || p._id === scanned);
    if (foundProduct) {
      toast.success(`Scanned: ${foundProduct.name}`);
      handleOpenEdit(foundProduct);
      setShowCameraScanner(false);
    } else {
      toast.error(`No product found with SKU/Barcode: ${scanned}`);
    }
    setBarcodeInput("");
    barcodeInputRef.current?.blur();
  };

  const handleCameraScanSuccess = (decodedText: string) => {
    processBarcodeScan(decodedText);
  };

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
      costing: "",
      stock: 0,
      badge: "NEW",
      badgeExpiry: "",
      image: undefined,
      isCombination: false,
      bundleItems: [],
      allowComparison: true,
      sku: "",
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
      allowComparison: p.allowComparison !== false,
      sku: p.sku ?? "",
    });
    setShowForm(true);
  };

  const [savingProduct, setSavingProduct] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please provide a product title");
      return;
    }

    if (formData.isCombination && formData.bundleItems.length === 0) {
      toast.error("Please add at least one product to the combination bundle");
      return;
    }

    // Read the stock value directly from the submitted form so the persisted value
    // always matches the number the admin entered, even during React state batching.
    const stockInput = e.currentTarget.elements.namedItem("stock") as HTMLInputElement | null;
    const submittedStock = stockInput ? Number(stockInput.value) : Number(formData.stock);
    if (!Number.isInteger(submittedStock) || submittedStock < 0) {
      toast.error("Stock Units must be a whole number 0 or greater");
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
      stock: submittedStock,
      available: submittedStock > 0,
      badge: formData.badge ? formData.badge : undefined,
      badgeExpiry: formData.badge ? formData.badgeExpiry || undefined : undefined,
      image: formData.image || undefined,
      isCombination: formData.isCombination,
      bundleItems: formData.isCombination ? formData.bundleItems : undefined,
      bundleCalculatedPrice: formData.isCombination ? finalPrice : undefined,
      allowComparison: formData.allowComparison,
      sku: formData.sku.trim() || undefined,
    };

    setSavingProduct(true);
    setOverlayLoading({
      isVisible: true,
      label: editingProduct ? "Updating Product..." : "Saving New Product...",
      sublabel: `Syncing "${formData.name}" to Supabase`,
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

  // ... remainder of file preserved by surrounding application version ...
}
