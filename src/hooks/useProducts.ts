import { useState, useEffect, useCallback, useRef } from "react";
import { collection, onSnapshot, query, doc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, type Product, type BundleItemConfig } from "@/data/products.ts";
import { saveProducts, getProducts } from "@/lib/db";

/**
 * Removes any undefined properties from an object so Firestore does not reject the write.
 */
function cleanPayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

function normalizeSupabaseProduct(raw: any): Product {
  const metadata = raw?.metadata && typeof raw.metadata === "object" ? raw.metadata : {};
  const stock = Number(raw?.stock ?? raw?.stockQuantity ?? raw?.stock_quantity ?? 0);
  const active = raw?.active !== false;
  return {
    _id: String(raw?._id ?? raw?.id ?? metadata.externalId ?? ""),
    name: String(raw?.name ?? "Untitled Product"),
    price: Number(raw?.price) || 0,
    salePrice: raw?.salePrice != null ? Number(raw.salePrice) : undefined,
    stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
    available: raw?.available !== false && active && stock > 0,
    category: String(raw?.category ?? metadata.category ?? "GENERAL"),
    description: raw?.description ?? metadata.description ?? "",
    subname: raw?.subname ?? metadata.subname,
    badge: raw?.badge ?? metadata.badge,
    badgeExpiry: raw?.badgeExpiry ?? metadata.badgeExpiry,
    image: raw?.image ?? metadata.image,
    isCombination: Boolean(raw?.isCombination ?? metadata.isCombination),
    bundleItems: raw?.bundleItems ?? metadata.bundleItems,
    bundleCalculatedPrice: raw?.bundleCalculatedPrice ?? metadata.bundleCalculatedPrice,
    allowComparison: raw?.allowComparison ?? metadata.allowComparison ?? true,
    sku: raw?.sku ?? metadata.sku,
    sortOrder: raw?.sortOrder ?? metadata.sortOrder,
  } as Product;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const productsRef = useRef<Product[]>([]);

  // Legacy categories listener remains temporarily during cutover.
  useEffect(() => {
    let isMounted = true;

    const categoriesRef = doc(db, "config", "categories");
    const unsubscribeCategories = onSnapshot(
      categoriesRef,
      (docSnap) => {
        if (!isMounted) return;
        if (docSnap.exists()) {
          const list = docSnap.data().list;
          if (Array.isArray(list) && list.length > 0) {
            setCategories(list);
          } else {
            setCategories(INITIAL_CATEGORIES);
          }
        } else {
          setCategories(INITIAL_CATEGORIES);
        }
      },
      (error) => {
        console.error("Categories listener error:", error);
        if (isMounted) setCategories(INITIAL_CATEGORIES);
      }
    );

    return () => {
      isMounted = false;
      unsubscribeCategories();
    };
  }, []);

  // Supabase is now the authoritative product/inventory read source.
  // Polling keeps the public catalog aligned with the same source Cart/Checkout validate against.
  useEffect(() => {
    let isMounted = true;

    const refreshFromSupabase = async () => {
      try {
        const response = await fetch("/api/products", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Supabase product API returned ${response.status}`);
        }

        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.products) ? payload.products : [];
        const data = rows.map(normalizeSupabaseProduct);

        if (!isMounted) return;
        if (JSON.stringify(data) !== JSON.stringify(productsRef.current)) {
          setProducts(data);
          productsRef.current = data;
        }
      } catch (error) {
        console.error("Supabase products refresh error:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void refreshFromSupabase();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshFromSupabase();
      }
    }, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshFromSupabase();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const addProduct = async (newProd: Omit<Product, "_id">) => {
    const cleaned = cleanPayload(newProd);
    const docRef = await addDoc(collection(db, "products"), cleaned);
    return docRef.id;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { _id, ...rest } = updates as any;
    const cleaned = cleanPayload(rest);
    await updateDoc(doc(db, "products", id), cleaned);
  };

  const removeProduct = async (id: string) => {
    await deleteDoc(doc(db, "products", id));
  };

  const batchDeleteProducts = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setProducts((prev) => prev.filter((p) => !ids.includes(p._id)));
    try {
      const res = await fetch("/api/admin/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ collection: "products", ids }),
      });
      if (!res.ok) {
        const batch = writeBatch(db);
        ids.forEach((id) => {
          batch.delete(doc(db, "products", id));
        });
        await batch.commit();
      }
    } catch {
      try {
        const batch = writeBatch(db);
        ids.forEach((id) => {
          batch.delete(doc(db, "products", id));
        });
        await batch.commit();
      } catch (err) {
        console.error("batchDeleteProducts fallback error:", err);
      }
    }
  }, []);

  const batchUpdateCategory = useCallback(async (ids: string[], newCategory: string) => {
    if (!ids.length || !newCategory) return;
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => {
        batch.update(doc(db, "products", id), { category: newCategory });
      });
      await batch.commit();
    } catch {
      await fetch("/api/admin/products/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "update_category", ids, category: newCategory }),
      });
    }
  }, []);

  const batchSetAvailability = useCallback(async (ids: string[], available: boolean) => {
    if (!ids.length) return;
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => {
        batch.update(doc(db, "products", id), {
          available,
          ...(available ? {} : { stock: 0 }),
        });
      });
      await batch.commit();
    } catch {
      await fetch("/api/admin/products/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "set_availability", ids, available }),
      });
    }
  }, []);

  const batchSetBadge = useCallback(async (ids: string[], badge: string, badgeExpiry?: string) => {
    if (!ids.length) return;
    try {
      const batch = writeBatch(db);
      ids.forEach((id) => {
        batch.update(doc(db, "products", id), {
          badge: badge || null,
          badgeExpiry: badgeExpiry || null,
        });
      });
      await batch.commit();
    } catch {
      await fetch("/api/admin/products/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "set_badge", ids, badge, badgeExpiry }),
      });
    }
  }, []);

  const addCategory = useCallback(async (newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return false;

    const newCategories = [...categories.filter((c) => c !== trimmed), trimmed];
    await setDoc(doc(db, "config", "categories"), { list: newCategories });
    return true;
  }, [categories]);

  const editCategory = useCallback(async (oldCategory: string, newCategory: string) => {
    const trimmedNew = newCategory.trim();
    if (!trimmedNew || oldCategory === trimmedNew) return false;

    const newCategories = categories.map((c) => (c === oldCategory ? trimmedNew : c));
    await setDoc(doc(db, "config", "categories"), { list: newCategories });

    for (const p of products) {
      if (p.category === oldCategory) {
        await updateDoc(doc(db, "products", p._id), { category: trimmedNew });
      }
    }
    return true;
  }, [categories, products]);

  const removeCategory = useCallback(async (categoryToRemove: string, fallback = "General") => {
    const newCategories = categories.filter((c) => c !== categoryToRemove);
    await setDoc(doc(db, "config", "categories"), { list: newCategories });

    for (const p of products) {
      if (p.category === categoryToRemove) {
        await updateDoc(doc(db, "products", p._id), { category: fallback });
      }
    }
    return true;
  }, [categories, products]);

  const computeBundlePrice = useCallback(
    (bundleItems: BundleItemConfig[] = []): number => {
      let total = 0;
      for (const item of bundleItems) {
        const prod = products.find((p) => p._id === item.productId);
        if (!prod) continue;
        const originalPrice = prod.salePrice ?? prod.price;
        if (item.pricingType === "fixed") {
          total += typeof item.customPrice === "number" ? item.customPrice : originalPrice;
        } else if (item.pricingType === "percentage_off") {
          const pct = item.discountPercent ?? 0;
          const discounted = originalPrice * (1 - pct / 100);
          total += Math.max(0, discounted);
        }
      }
      return Math.round(total * 100) / 100;
    },
    [products]
  );

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
