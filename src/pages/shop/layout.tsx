import { Outlet } from "react-router-dom";
import ShopHeader from "./_components/ShopHeader.tsx";
import QueueStrip from "./_components/QueueStrip.tsx";
import BottomNav from "./_components/BottomNav.tsx";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import PrimeLogo from "@/components/PrimeLogo.tsx";
import GlobalProprietaryFooter from "@/components/GlobalProprietaryFooter.tsx";
import { useOrders } from "@/hooks/useOrders.ts";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export default function ShopLayout() {
  const { isLoading, customer } = useTelegram();
  const { orders } = useOrders(customer?.telegramUserId);
  const prevStatusesRef = useRef<Map<string, string>>(new Map());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!orders || orders.length === 0) return;
    const prevMap = prevStatusesRef.current;
    if (initialLoadRef.current) {
      orders.forEach((ord) => {
        prevMap.set(ord._id || ord.orderNumber, ord.orderStatus);
      });
      initialLoadRef.current = false;
      return;
    }

    orders.forEach((ord) => {
      const id = ord._id || ord.orderNumber;
      const oldStatus = prevMap.get(id);
      if (oldStatus && oldStatus !== ord.orderStatus) {
        prevMap.set(id, ord.orderStatus);
        const readableStatus = ord.orderStatus.replace(/_/g, " ");
        toast.success(
          `📦 Order #${ord.orderNumber} status updated to: ${readableStatus}`,
          {
            duration: 8000,
            style: {
              background: "#000",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "12px",
              padding: "10px 16px",
            },
          }
        );
      } else if (!oldStatus) {
        prevMap.set(id, ord.orderStatus);
      }
    });
  }, [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center text-center space-y-3">
          <PrimeLogo className="h-8" />
          <Spinner />
          <p className="text-neutral-500 text-sm">Loading PRIME Commerce...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f3f4f6] w-full relative">
      <div className="fixed top-0 left-0 right-0 z-40 bg-white">
        <ShopHeader />
        <QueueStrip />
      </div>

      <main className="flex-1 w-full min-h-0 pt-[68px] pb-20">
        <div className="w-full">
          <Outlet />
        </div>
      </main>

      <GlobalProprietaryFooter />
      <BottomNav />
    </div>
  );
}
