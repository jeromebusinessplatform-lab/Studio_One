"use client";
import { CartProvider } from "./cart-context";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
