import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  unitPrice: number;
  image?: string;
  quantity: number;
  selected: boolean;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const [pulse, setPulse] = useState(0);

  const pulseCart = useCallback(() => {
    setPulse((p) => p + 1);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "selected">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, { ...item, selected: true }];
    });
    pulseCart();
  }, [pulseCart]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
      );
    }
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const toggleSelect = useCallback((productId: string) => {
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, selected: !i.selected } : i))
    );
  }, []);

  const selectAll = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: false })));
  }, []);

  const removeSelectedItems = useCallback(() => {
    setItems((prev) => prev.filter((i) => !i.selected));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const selectedItems = useMemo(() => items.filter((i) => i.selected), [items]);
  const totalItems = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const selectedCount = useMemo(() => selectedItems.reduce((s, i) => s + i.quantity, 0), [selectedItems]);
  const subtotal = useMemo(() => items.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [items]);
  const selectedSubtotal = useMemo(() => selectedItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0), [selectedItems]);

  const contextValue = useMemo(() => ({
    items,
    addItem,
    updateQuantity,
    removeItem,
    toggleSelect,
    selectAll,
    deselectAll,
    removeSelectedItems,
    clearCart,
    selectedItems,
    totalItems,
    selectedCount,
    subtotal,
    selectedSubtotal,
    pulseCart,
    pulse,
  }), [
    items,
    addItem,
    updateQuantity,
    removeItem,
    toggleSelect,
    selectAll,
    deselectAll,
    removeSelectedItems,
    clearCart,
    selectedItems,
    totalItems,
    selectedCount,
    subtotal,
    selectedSubtotal,
    pulseCart,
    pulse,
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
