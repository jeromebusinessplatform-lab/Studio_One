import { useLocation } from "react-router-dom";

export default function GlobalProprietaryFooter() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <footer
      id="global-proprietary-footer"
      className={`w-full max-w-[412px] mx-auto text-center py-2.5 px-3 border-t pointer-events-none select-none overflow-hidden ${
        isAdmin
          ? "bg-[#eeeeee] text-neutral-600 border-neutral-300"
          : "bg-neutral-800 text-white/90 border-neutral-700"
      }`}
    >
      <div className="w-full text-center text-[10px] sm:text-[11px] font-semibold tracking-[0.06em] uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-tight font-condensed">
        {isAdmin
          ? "USAGE OF THIS SYSTEM IS PROPRIETARY. DO NOT DISTRIBUTE OR COPY."
          : "PRIME SYSTEM IS PROPRIETARY. DO NOT REPRODUCE OR COPY."}
      </div>
    </footer>
  );
}
