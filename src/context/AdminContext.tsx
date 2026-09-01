import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, type Product } from "@/data/products.ts";

interface AdminContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  products: Product[];
  categories: string[];
  productsLoading: boolean;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Global realtime inventory and config
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [productsLoading, setProductsLoading] = useState(true);
  const productsRef = useRef<Product[]>([]);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "same-origin" })
      .then((response) => response.ok ? response.json() : { authenticated: false })
      .then((data: { authenticated?: boolean }) => setIsAuthenticated(Boolean(data.authenticated)))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, []);

  // Global Firestore Sync
  useEffect(() => {
    let isMounted = true;
    
    // Categories Sync
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
    
    // Products Sync
    const q = query(collection(db, "products"));
    const unsubscribeProducts = onSnapshot(
      q,
      (snapshot) => {
        if (!isMounted) return;
        
        if (snapshot.empty) {
          if (isMounted) {
            setProducts(INITIAL_PRODUCTS);
            productsRef.current = INITIAL_PRODUCTS;
            setProductsLoading(false);
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
          if (JSON.stringify(data) !== JSON.stringify(productsRef.current)) {
            setProducts(data);
            productsRef.current = data;
          }
          setProductsLoading(false);
        }
      },
      (error) => {
        console.error("Products listener error:", error);
        if (isMounted) {
          setProducts((prev) => (prev.length > 0 ? prev : INITIAL_PRODUCTS));
          setProductsLoading(false);
        }
      }
    );
    
    return () => {
      isMounted = false;
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, []);

  const login = async (code: string) => {
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || "Invalid access code" };
      }
      setIsAuthenticated(true);
      return { success: true };
    } catch {
      return { success: false, error: "Unable to reach the authentication server" };
    }
  };

  const logout = () => {
    void fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).finally(() => {
      setIsAuthenticated(false);
    });
  };

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        products,
        categories,
        productsLoading,
        setProducts,
        setCategories,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
