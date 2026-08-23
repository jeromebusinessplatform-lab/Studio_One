import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, doc, addDoc, updateDoc, deleteDoc, setDoc, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, type Product, type BundleItemConfig } from "@/data/products.ts";

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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState(true);

  // Load products and categories from Firestore
  useEffect(() => {
    let isMounted = true;

    // Categories
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
          // Initialize if missing
          setDoc(categoriesRef, { list: INITIAL_CATEGORIES }).catch((e) =>
            console.error("Initialize categories error:", e)
          );
          setCategories(INITIAL_CATEGORIES);
        }
      },
      (error) => {
        console.error("Categories listener error:", error);
        if (isMounted) setCategories(INITIAL_CATEGORIES);
      }
    );

    // Products
    const q = query(collection(db, "products"));
    const unsubscribeProducts = onSnapshot(
      q,
      async (snapshot) => {
        if (!isMounted) return;
        if (snapshot.empty) {
          // Auto-seed initial catalog products to Firestore if empty
          try {
            for (const item of INITIAL_PRODUCTS) {
              const { _id, ...rest } = item;
              const sanitized = cleanPayload(rest);
              await setDoc(doc(db, "products", _id), sanitized);
            }
          } catch (e) {
            console.warn("Could not auto-seed products to Firestore:", e);
          }
          if (isMounted) {
            setProducts(INITIAL_PRODUCTS);
            setLoading(false);
          }
          return;
        }

        const data = snapshot.docs.map((docSnap) => {
          const raw = docSnap.data();
          return {
            _id: docSnap.id,
            name: raw.name || "Untitled Product",
            price: Number(raw.price) || 0,
            stock: Number(raw.stock) || 0,
            available: raw.available !== false,
            ...raw,
          } as Product;
        });

        if (isMounted) {
          setProducts(data);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Products listener error:", error);
        if (isMounted) {
          setProducts((prev) => (prev.length > 0 ? prev : INITIAL_PRODUCTS));
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeProducts();
      unsubscribeCategories();
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
    addCategory,
    editCategory,
    removeCategory,
    computeBundlePrice,
  };
}

