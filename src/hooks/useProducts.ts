import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, doc, addDoc, updateDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { INITIAL_CATEGORIES, type Product, type BundleItemConfig } from "@/data/products.ts";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load products and categories from Firestore
  useEffect(() => {
    // Products
    const q = query(collection(db, "products"));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(data);
      setLoading(false);
    });

    // Categories
    const categoriesRef = doc(db, "config", "categories");
    const unsubscribeCategories = onSnapshot(categoriesRef, (docSnap) => {
        if (docSnap.exists()) {
            setCategories(docSnap.data().list || INITIAL_CATEGORIES);
        } else {
            // Initialize if missing
            setDoc(categoriesRef, { list: INITIAL_CATEGORIES });
            setCategories(INITIAL_CATEGORIES);
        }
    });

    return () => {
        unsubscribeProducts();
        unsubscribeCategories();
    };
  }, []);

  const addProduct = async (newProd: Omit<Product, "_id">) => {
    await addDoc(collection(db, "products"), newProd);
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await updateDoc(doc(db, "products", id), updates);
  };

  const removeProduct = async (id: string) => {
    await deleteDoc(doc(db, "products", id));
  };

  // Category Management Handlers
  const addCategory = useCallback(async (newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return false;
    
    const newCategories = [...categories, trimmed];
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
