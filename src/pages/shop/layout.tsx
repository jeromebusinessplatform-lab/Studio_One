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
    <div className="flex flex-col min-h-[100dvh] bg-[#f3f4f6] w-full max-w-[412px] mx-auto relative overflow-visible">
      <div className="fixed top-0 w-full max-w-[412px] z-50 bg-[#f3f4f6]">
        <ShopHeader />
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
        <QueueStrip />
      </div>

      <main className="flex-1 min-h-0 w-full overflow-visible pt-[100px] pb-28 touch-pan-y">
        <Outlet />
      </main>

      <GlobalProprietaryFooter />
      <BottomNav />
    </div>
  );
}
