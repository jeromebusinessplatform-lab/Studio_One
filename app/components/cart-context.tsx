'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../../lib/types';

export interface CartItem {
  id: string; // product id
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
  bundleSavings: number;
  grandTotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function calculateItemDiscount(product: Product, quantity: number): number {
  if (!product.bundleConfig) return 0;
  const { bundleSize, discountPercent, tieredDiscounts } = product.bundleConfig;

  let appliedDiscountPercent = 0;
  if (tieredDiscounts && tieredDiscounts.length > 0) {
    const matchingTier = [...tieredDiscounts]
      .sort((a, b) => b.quantity - a.quantity)
      .find((tier) => quantity >= tier.quantity);
    if (matchingTier) {
      appliedDiscountPercent = matchingTier.discountPercent;
    }
  } else if (bundleSize && discountPercent && quantity >= bundleSize) {
    appliedDiscountPercent = discountPercent;
  }

  if (appliedDiscountPercent > 0) {
    const rawPrice = product.price * quantity;
    return (rawPrice * appliedDiscountPercent) / 100;
  }
  return 0;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('prime_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Save to local storage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('prime_cart', JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  const addToCart = (product: Product, quantity = 1): boolean => {
    if (product.stock <= 0) return false;

    let added = false;
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + quantity;

      if (targetQty > product.stock) {
        // cannot exceed available stock
        return prev;
      }

      added = true;
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: targetQty } : item
        );
      }
      return [...prev, { id: product.id, product, quantity }];
    });

    return added;
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const clamped = Math.min(quantity, item.product.stock);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const bundleSavings = items.reduce(
    (sum, item) => sum + calculateItemDiscount(item.product, item.quantity),
    0
  );
  const grandTotal = Math.max(0, subtotal - bundleSavings);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalCount,
        subtotal,
        bundleSavings,
        grandTotal,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
