import type { ReactNode } from "react";
import { useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { TelegramProvider } from "./context/TelegramContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { AdminProvider, useAdmin } from "./context/AdminContext.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import GlobalProprietaryFooter from "./components/GlobalProprietaryFooter.tsx";
import OrientationLock from "./components/OrientationLock.tsx";
import { registerMemoryCleanup } from "./lib/memoryCleanup.ts";
import ShopLayout from "./pages/shop/layout.tsx";
import ShopCatalog from "./pages/shop/catalog-with-comparison.tsx";
import CartPage from "./pages/shop/cart.tsx";
import CheckoutPage from "./pages/shop/checkout-hardened-v3.tsx";
import OrderConfirmationPage from "./pages/shop/order-confirmation.tsx";
import OrdersPage from "./pages/shop/orders.tsx";
import AccountPage from "./pages/shop/account.tsx";
import SupportPage from "./pages/shop/support.tsx";
import NotificationsPage from "./pages/shop/notifications.tsx";
import AdminLogin from "./pages/admin/login.tsx";
import AdminLayout from "./pages/admin/layout.tsx";
import AdminDashboard from "./pages/admin/dashboard.tsx";
import AdminOrdersPage from "./pages/admin/orders.tsx";
import AdminCustomersPage from "./pages/admin/customers.tsx";
import AdminProductsPage from "./pages/admin/products.tsx";
import AdminComparisonPage from "./pages/admin/comparison.tsx";
import AdminSettingsPage from "./pages/admin/settings.tsx";
import AdminCourierPage from "./pages/admin/courier.tsx";
import AdminReceiptOcrPage from "./pages/admin/receipt-ocr.tsx";
import AdminChargesPage from "./pages/admin/charges.tsx";
import AdminDiscountsPage from "./pages/admin/discounts.tsx";
import AdminCouponConfiguratorPage from "./pages/admin/coupon-configurator.tsx";
import AdminReferralsPage from "./pages/admin/referrals.tsx";
import InstallPrompt from "./components/InstallPrompt.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminCourierConfigPanel from "./components/AdminCourierConfigPanel.tsx";
import PrimeMemberProfile from "./components/PrimeMemberProfile.tsx";
import CheckoutUiConsistency from "./components/CheckoutUiConsistency.tsx";
import OrderSuccessOverlay from "./components/OrderSuccessOverlay.tsx";

function AdminGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdmin();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function useScrollLock() {
  useEffect(() => {
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";

    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      const scrollable = target.closest(".overflow-y-auto");
      if (!scrollable) {
        if (e.cancelable) e.preventDefault();
      }
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.overscrollBehavior = "";
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);
}

function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  
  useScrollLock();

  useEffect(() => {
    const unregister = registerMemoryCleanup({
      id: "app-shell-cleanup",
      onCleanup: () => {
        try {
          if (typeof window !== "undefined" && window.caches) {
            window.caches.keys().then((names) => {
              names.forEach((name) => {
                if (name.includes("temp") || name.includes("dynamic-cache")) window.caches.delete(name);
              });
            });
          }
        } catch {}
      },
    });
    return unregister;
  }, []);

  return (
    <div className={`w-full h-dvh overflow-hidden flex flex-col justify-start ${isAdmin ? "bg-white text-neutral-900" : "bg-[#f3f4f6] text-neutral-900"}`}>
      <div className="flex-1 w-full flex flex-col min-h-0 overflow-y-auto">
        <AdminCourierConfigPanel />
        <CheckoutUiConsistency />
        <Routes>
          <Route path="/" element={<Navigate to="/shop" replace />} />
          <Route path="/shop" element={<ShopLayout />}>
            <Route index element={<ShopCatalog />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="account" element={<AccountPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="comparison" element={<AdminComparisonPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="courier" element={<AdminCourierPage />} />
            <Route path="charges" element={<AdminChargesPage />} />
            <Route path="discounts" element={<AdminCouponConfiguratorPage />} />
            <Route path="coupons" element={<AdminCouponConfiguratorPage />} />
            <Route path="referrals" element={<AdminReferralsPage />} />
            <Route path="legacy-discounts" element={<AdminDiscountsPage />} />
            <Route path="ocr" element={<AdminReceiptOcrPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <OrderSuccessOverlay />
      <PrimeMemberProfile />
      {isAdmin && <GlobalProprietaryFooter />}
    </div>
  );
}

export default function App() {
  return (
    <TelegramProvider>
      <CartProvider>
        <AdminProvider>
          <Toaster />
          <OrientationLock />
          <InstallPrompt />
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </AdminProvider>
      </CartProvider>
    </TelegramProvider>
  );
}
