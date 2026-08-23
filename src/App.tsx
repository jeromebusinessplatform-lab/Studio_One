import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { TelegramProvider } from "./context/TelegramContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { AdminProvider, useAdmin } from "./context/AdminContext.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import GlobalProprietaryFooter from "./components/GlobalProprietaryFooter.tsx";
import OrientationLock from "./components/OrientationLock.tsx";
import ShopLayout from "./pages/shop/layout.tsx";
import ShopCatalog from "./pages/shop/page.tsx";
import CartPage from "./pages/shop/cart.tsx";
import CheckoutPage from "./pages/shop/checkout-hardened-v2.tsx";
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
import AdminSettingsPage from "./pages/admin/settings.tsx";
import AdminCourierPage from "./pages/admin/courier.tsx";
import AdminReceiptOcrPage from "./pages/admin/receipt-ocr.tsx";
import AdminAnalyticsPage from "./pages/admin/analytics.tsx";
import AdminChargesPage from "./pages/admin/charges.tsx";
import AdminDiscountsPage from "./pages/admin/discounts.tsx";
import AdminCashflowPage from "./pages/admin/cashflow.tsx";
import AdminSupportPage from "./pages/admin/support.tsx";
import InstallPrompt from "./components/InstallPrompt.tsx";
import NotFound from "./pages/NotFound.tsx";

function AdminGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdmin();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  return (
    <div className="w-full min-h-[100dvh] flex flex-col items-center justify-start bg-neutral-950 overflow-x-hidden">
      <div className={`w-full max-w-[412px] min-h-[100dvh] relative flex flex-col justify-between overflow-x-hidden shadow-2xl border-x border-neutral-800/20 ${isAdmin ? "bg-white" : "bg-[#f3f4f6] pb-16"}`}>
        <div className="flex-1 w-full flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/shop" replace />} />
            <Route path="/shop" element={<ShopLayout />}>
              <Route index element={<ShopCatalog />} /><Route path="cart" element={<CartPage />} /><Route path="checkout" element={<CheckoutPage />} /><Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} /><Route path="orders" element={<OrdersPage />} /><Route path="account" element={<AccountPage />} /><Route path="support" element={<SupportPage />} /><Route path="notifications" element={<NotificationsPage />} />
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="courier" element={<AdminCourierPage />} />
              <Route path="charges" element={<AdminChargesPage />} />
              <Route path="discounts" element={<AdminDiscountsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="cashflow" element={<AdminCashflowPage />} />
              <Route path="support" element={<AdminSupportPage />} />
              <Route path="ocr" element={<AdminReceiptOcrPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <GlobalProprietaryFooter />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TelegramProvider><CartProvider><AdminProvider>
      <Toaster /><OrientationLock /><InstallPrompt />
      <BrowserRouter><AppShell /></BrowserRouter>
    </AdminProvider></CartProvider></TelegramProvider>
  );
}
