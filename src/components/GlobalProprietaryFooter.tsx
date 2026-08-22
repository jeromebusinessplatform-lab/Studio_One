import { useLocation } from "react-router-dom";

export default function GlobalProprietaryFooter() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <footer
      id="global-proprietary-footer"
      className={`fixed bottom-0 left-0 right-0 z-[9999] text-center py-2 px-3 border-t pointer-events-none select-none overflow-hidden w-full mx-auto ${isAdmin ? "max-w-[1180px] bg-white text-black border-neutral-300" : "max-w-[412px] bg-neutral-800 text-white/90 border-neutral-700"}`}
    >
      <div className="w-full text-center text-[10px] sm:text-[11px] tracking-[0.45px] uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-tight font-condensed">
        {isAdmin ? "USAGE OF THIS SYSTEM IS PROPRIETARY. DO NOT DISTRIBUTE OR COPY." : "PRIME SYSTEM IS PROPRIETARY. DO NOT REPRODUCE OR COPY."}
      </div>
    </footer>
  );
}
