import { useCallback } from "react";
import { collection, doc, addDoc, updateDoc, deleteDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { type Product, type BundleItemConfig } from "@/data/products.ts";
import { useAdmin } from "@/context/AdminContext.tsx";

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

export function useProducts() {
  const { products, categories, productsLoading: loading, setProducts } = useAdmin();

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

  // Category Management Handlers
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

    // Cascade update all products in this category
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

    // Reassign products to fallback
    for (const p of products) {
      if (p.category === categoryToRemove) {
        await updateDoc(doc(db, "products", p._id), { category: fallback });
      }
    }
    return true;
  }, [categories, products]);

  // Helper to compute bundle prices based on included items
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

