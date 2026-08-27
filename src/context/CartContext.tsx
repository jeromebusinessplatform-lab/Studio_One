import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  image?: string;
  quantity: number;
  selected: boolean;
  available?: boolean;
  maxQuantity?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "selected">) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  toggleSelect: (productId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  removeSelectedItems: () => void;
  clearCart: () => void;
  selectedItems: CartItem[];
  totalItems: number;
  selectedCount: number;
  subtotal: number;
  selectedSubtotal: number;
  pulseCart: () => void;
  pulse: number;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_STORAGE_KEY = "prime_cart_items";
const INVENTORY_POLL_MS = 3000;

type LiveProduct = {
  _id?: string;
  id?: string;
  name?: string;
  price?: number;
  salePrice?: number;
  stock?: number;
  available?: boolean;
  image?: string | null;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch { return []; }
      }
    }
    return [];
  });
  const [pulse, setPulse] = useState(0);
  const itemsRef = useRef(items);
  const inventoryRef = useRef(new Map<string, string>());

  useEffect(() => {
    itemsRef.current = items;
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const pulseCart = useCallback(() => setPulse((p) => p + 1), []);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const syncInventory = async () => {
      const current = itemsRef.current;
      if (!current.length) return;
      const ids = [...new Set(current.map((item) => item.productId).filter(Boolean))];
      try {
        const response = await fetch(`/api/products?ids=${encodeURIComponent(ids.join(","))}&_t=${Date.now()}`, {
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        const liveProducts: LiveProduct[] = Array.isArray(data.products) ? data.products : [];
        if (!active) return;

        const byId = new Map<string, LiveProduct>();
        liveProducts.forEach((product) => {
          [product._id, product.id].map((v) => String(v || "").toLowerCase()).filter(Boolean).forEach((key) => byId.set(key, product));
        });

        const changedNotices: string[] = [];
        setItems((prev) => {
          let changed = false;
          const next = prev.map((item) => {
            const direct = byId.get(String(item.productId).toLowerCase());
            const product = direct || liveProducts.find((p) => String(p.name || "").trim().toLowerCase() === item.productName.trim().toLowerCase());
            if (!product) {
              const key = `missing:${item.productId}`;
              if (inventoryRef.current.get(item.productId) !== key) {
                changedNotices.push(`${item.productName} is no longer available.`);
                inventoryRef.current.set(item.productId, key);
              }
              changed = true;
              return { ...item, available: false, maxQuantity: 0, selected: false };
            }

            const liveId = String(product._id || product.id || item.productId);
            const stock = Math.max(0, Number(product.stock) || 0);
            const available = product.available !== false && stock > 0;
            const oldSignature = inventoryRef.current.get(liveId);
            const signature = `${available ? "A" : "U"}:${stock}`;
            if (oldSignature && oldSignature !== signature) {
              const oldStock = Number(oldSignature.split(":")[1]);
              if (!available) changedNotices.push(`${product.name || item.productName} is no longer available.`);
              else if (item.quantity > stock) changedNotices.push(`${product.name || item.productName} stock changed to ${stock}. Cart quantity was adjusted.`);
              else if (Number.isFinite(oldStock) && oldStock > stock) changedNotices.push(`${product.name || item.productName} stock is now ${stock}.`);
            }
            inventoryRef.current.set(liveId, signature);

            const nextQuantity = available ? Math.min(item.quantity, stock) : item.quantity;
            const nextItem: CartItem = {
              ...item,
              productId: liveId,
              productName: String(product.name || item.productName),
              unitPrice: Number(product.salePrice ?? product.price ?? item.unitPrice),
              image: product.image || item.image,
              quantity: nextQuantity,
              available,
              maxQuantity: stock,
              selected: available ? item.selected : false,
            };
            if (JSON.stringify(nextItem) !== JSON.stringify(item)) changed = true;
            return nextItem;
          });
          return changed ? next : prev;
        });
        changedNotices.forEach((message) => toast.warning(message, { duration: 5000 }));
      } catch {
        // Keep last known cart state during transient network failures.
      }
    };

    void syncInventory();
    timer = window.setInterval(() => void syncInventory(), INVENTORY_POLL_MS);
    return () => { active = false; if (timer) window.clearInterval(timer); };
  }, []);

  const addItem = useCallback((item: Omit<CartItem, "selected">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      const maxQuantity = Number(item.maxQuantity ?? 0);
      const safeIncoming = maxQuantity > 0 ? Math.min(item.quantity, maxQuantity) : item.quantity;
      if (existing) {
        const nextQuantity = maxQuantity > 0 ? Math.min(existing.quantity + safeIncoming, maxQuantity) : existing.quantity + safeIncoming;
        return prev.map((i) => i.productId === item.productId ? { ...i, ...item, quantity: nextQuantity, selected: item.available !== false } : i);
      }
      return [...prev, { ...item, quantity: safeIncoming, selected: item.available !== false }];
    });
    pulseCart();
  }, [pulseCart]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => prev.map((item) => {
      if (item.productId !== productId) return item;
      const max = Number(item.maxQuantity ?? 0);
      const capped = max > 0 ? Math.min(quantity, max) : quantity;
      return capped <= 0 ? item : { ...item, quantity: capped };
    }).filter((item) => item.quantity > 0));
  }, []);

  const removeItem = useCallback((productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId)), []);
  const toggleSelect = useCallback((productId: string) => setItems((prev) => prev.map((i) => (i.productId === productId && i.available !== false ? { ...i, selected: !i.selected } : i))), []);
  const selectAll = useCallback(() => setItems((prev) => prev.map((i) => ({ ...i, selected: i.available !== false }))), []);
  const deselectAll = useCallback(() => setItems((prev) => prev.map((i) => ({ ...i, selected: false }))), []);
  const removeSelectedItems = useCallback(() => setItems((prev) => prev.filter((i) => !i.selected)), []);
  const clearCart = useCallback(() => setItems([]), []);

  const selectedItems = useMemo(() => items.filter((i) => i.selected && i.available !== false), [items]);
  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const selectedCount = useMemo(() => selectedItems.reduce((s, i) => s + i.quantity, 0), [selectedItems]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [items]);
  const selectedSubtotal = useMemo(() => selectedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [selectedItems]);

  return <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, toggleSelect, selectAll, deselectAll, removeSelectedItems, clearCart, selectedItems, totalItems, selectedCount, subtotal, selectedSubtotal, pulseCart, pulse }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
