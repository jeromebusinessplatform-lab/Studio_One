import { Link, useLocation } from "react-router-dom";
import { Store, ShoppingCart, ListOrdered, Bell, User, Headphones } from "lucide-react";
import { useCart } from "@/context/CartContext.tsx";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { motion, useAnimation } from "motion/react";
import { useEffect, useState } from "react";

export default function BottomNav() {
  const location = useLocation();
  const { totalItems, pulse } = useCart();
  const { customer } = useTelegram();
  const path = location.pathname;
  const controls = useAnimation();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (pulse > 0) {
      controls.start({ scale: [1, 1.2, 1], transition: { duration: 0.3 } });
    }
  }, [pulse, controls]);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const loadUnread = async () => {
      if (!customer?.telegramUserId) {
        if (active) setUnreadNotifications(0);
        return;
      }
      try {
        const response = await fetch(`/api/notifications?telegramUserId=${encodeURIComponent(customer.telegramUserId)}&_t=${Date.now()}`, {
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        const data = await response.json().catch(() => ({}));
        if (active && response.ok && Array.isArray(data.notifications)) {
          setUnreadNotifications(data.notifications.filter((n: any) => !n.read).length);
        }
      } catch {
        // Preserve the last known badge count during transient network failures.
      }
    };
    void loadUnread();
    timer = window.setInterval(() => void loadUnread(), 2500);
    return () => {
      active = false;
      if (timer) window.clearInterval(timer);
    };
  }, [customer?.telegramUserId]);

  const cartBadgeCount = totalItems > 0 ? totalItems : undefined;
  const notificationBadgeCount = unreadNotifications > 0 ? unreadNotifications : undefined;

  const navItems = [
    { href: "/shop", icon: Store, label: "HOME", badge: undefined },
    { href: "/shop/cart", icon: ShoppingCart, label: "CART", badge: cartBadgeCount },
    { href: "/shop/orders", icon: ListOrdered, label: "ORDERS", badge: undefined },
    { href: "/shop/notifications", icon: Bell, label: "ALERTS", badge: notificationBadgeCount },
    { href: "/shop/account", icon: User, label: "ACCOUNT", badge: undefined },
    { href: "/shop/support", icon: Headphones, label: "SUPPORT", badge: undefined },
  ];

  return (
    <nav className="w-full shrink-0 bg-white border-t border-neutral-200 z-40 shadow-lg">
      <div className="flex items-center justify-around h-10 px-2 w-full max-w-full mx-auto">
        {navItems.map(({ href, icon: Icon, badge }) => {
          const isActive = path === href || (href !== "/shop" && path.startsWith(href));
          const isCart = href === "/shop/cart";
          const isAlerts = href === "/shop/notifications";
          return (
            <Link key={href} to={href} className={`flex flex-col items-center justify-center flex-1 h-full relative cursor-pointer transition-colors ${isActive ? "text-black font-bold" : "text-neutral-600 hover:text-black"}`}>
              <div className="relative flex items-center justify-center">
                <motion.div animate={isCart || isAlerts ? controls : {}}>
                  <Icon size={20.5} className={`transition-transform duration-150 ${isActive ? "stroke-[2.5] scale-105 text-black" : "stroke-[1.75] text-neutral-700"}`} />
                </motion.div>
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#ef4444] text-white text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center leading-none shadow-xs border border-white" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
