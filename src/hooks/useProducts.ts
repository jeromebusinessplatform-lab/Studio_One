import { useState, useEffect, useCallback, useRef } from "react";
import { INITIAL_CATEGORIES, type Product, type BundleItemConfig } from "@/data/products.ts";

function normalizeSupabaseProduct(raw: any): Product {
  const metadata = raw?.metadata && typeof raw.metadata === "object" ? raw.metadata : {};
  const stock = Number(raw?.stock ?? raw?.stockQuantity ?? raw?.stock_quantity ?? 0);
  const active = raw?.active !== false;
  return {
    _id: String(raw?._id ?? raw?.id ?? metadata.externalId ?? ""),
    name: String(raw?.name ?? "Untitled Product"),
    price: Number(raw?.price) || 0,
    salePrice: raw?.salePrice != null ? Number(raw.salePrice) : undefined,
    costing: raw?.costing != null ? Number(raw.costing) : undefined,
    stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
    available: raw?.available !== false && active && stock > 0,
    category: String(raw?.category ?? metadata.category ?? "GENERAL"),
    description: raw?.description ?? metadata.description ?? "",
    subname: raw?.subname ?? metadata.subname,
    badge: raw?.badge ?? metadata.badge,
    badgeExpiry: raw?.badgeExpiry ?? metadata.badgeExpiry,
    image: raw?.image ?? metadata.image ?? null,
    isCombination: Boolean(raw?.isCombination ?? metadata.isCombination),
    bundleItems: raw?.bundleItems ?? metadata.bundleItems,
    bundleCalculatedPrice: raw?.bundleCalculatedPrice ?? metadata.bundleCalculatedPrice,
    allowComparison: raw?.allowComparison ?? metadata.allowComparison ?? true,
    sku: raw?.sku ?? metadata.sku,
    sortOrder: raw?.sortOrder ?? metadata.sortOrder,
  } as Product;
}

async function requestJson(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Request failed with status ${response.status}`);
  return payload;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const productsRef = useRef<Product[]>([]);

  // Supabase is the single product/inventory authority. Categories are derived from
  // the current Supabase products plus the stable initial category set; no Firebase
  // reads or writes are performed by this hook.
  useEffect(() => {
    let isMounted = true;
    const refresh = async () => {
      try {
        const payload = await requestJson("/api/products", { method: "GET", cache: "no-store" });
        const rows = Array.isArray(payload?.products) ? payload.products : Array.isArray(payload) ? payload : [];
        const data = rows.map(normalizeSupabaseProduct);
        if (!isMounted) return;
        if (JSON.stringify(data) !== JSON.stringify(productsRef.current)) {
          setProducts(data);
          productsRef.current = data;
        }
        const derived = [...new Set([...INITIAL_CATEGORIES, ...data.map((p) => String(p.category || "GENERAL")).filter(Boolean)])];
        setCategories(derived);
      } catch (error) {
        console.error("Supabase products refresh error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const addProduct = async (newProd: Omit<Product, "_id">) => {
    const payload = await requestJson("/api/admin/products", { method: "POST", body: JSON.stringify(newProd) });
    return String(payload?.product?._id ?? payload?.product?.id ?? "");
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await requestJson(`/api/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(updates) });
  };

  const removeProduct = async (id: string) => {
    await requestJson(`/api/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  const batchDeleteProducts = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    await requestJson("/api/admin/products/batch", { method: "POST", body: JSON.stringify({ action: "delete", ids }) });
  }, []);

  const batchUpdateCategory = useCallback(async (ids: string[], newCategory: string) => {
    if (!ids.length || !newCategory) return;
    await requestJson("/api/admin/products/batch", { method: "POST", body: JSON.stringify({ action: "update_category", ids, category: newCategory }) });
  }, []);

  const batchSetAvailability = useCallback(async (ids: string[], available: boolean) => {
    if (!ids.length) return;
    await requestJson("/api/admin/products/batch", { method: "POST", body: JSON.stringify({ action: "set_availability", ids, available }) });
  }, []);

  const batchSetBadge = useCallback(async (ids: string[], badge: string, badgeExpiry?: string) => {
    if (!ids.length) return;
    await requestJson("/api/admin/products/batch", { method: "POST", body: JSON.stringify({ action: "set_badge", ids, badge, badgeExpiry }) });
  }, []);

  const addCategory = useCallback(async (newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return false;
    setCategories((prev) => [...new Set([...prev, trimmed])]);
    return true;
  }, []);

  const editCategory = useCallback(async (oldCategory: string, newCategory: string) => {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew || oldCategory === trimmedNew) return false;
    setCategories((prev) => prev.map((c) => (c === oldCategory ? trimmedNew : c)));
    const affected = products.filter((p) => p.category === oldCategory).map((p) => p._id);
    await batchUpdateCategory(affected, trimmedNew);
    return true;
  }, [products, batchUpdateCategory]);

  const removeCategory = useCallback(async (categoryToRemove: string, fallback = "General") => {
    setCategories((prev) => prev.filter((c) => c !== categoryToRemove));
    const affected = products.filter((p) => p.category === categoryToRemove).map((p) => p._id);
    await batchUpdateCategory(affected, fallback);
    return true;
  }, [products, batchUpdateCategory]);

  const computeBundlePrice = useCallback((bundleItems: BundleItemConfig[] = []): number => {
    let total = 0;
    for (const item of bundleItems) {
      const prod = products.find((p) => p._id === item.productId);
      if (!prod) continue;
      const originalPrice = prod.salePrice ?? prod.price;
      if (item.pricingType === "fixed") total += typeof item.customPrice === "number" ? item.customPrice : originalPrice;
      else if (item.pricingType === "percentage_off") total += Math.max(0, originalPrice * (1 - (item.discountPercent ?? 0) / 100));
    }
    return Math.round(total * 100) / 100;
  }, [products]);

  return {
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
  };
}
