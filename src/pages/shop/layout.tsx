import { Outlet } from "react-router-dom";
import ShopHeader from "./_components/ShopHeader.tsx";
import QueueStrip from "./_components/QueueStrip.tsx";
import BottomNav from "./_components/BottomNav.tsx";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import PrimeLogo from "@/components/PrimeLogo.tsx";
import GlobalProprietaryFooter from "@/components/GlobalProprietaryFooter.tsx";

export default function ShopLayout() {
  const { isLoading } = useTelegram();

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

      <main className="flex-1 w-full max-w-full min-h-0 pt-[68px] pb-20">
        <div className="w-full max-w-full">
          <Outlet />
        </div>
      </main>

      <GlobalProprietaryFooter />
      <BottomNav />
    </div>
  );
}
