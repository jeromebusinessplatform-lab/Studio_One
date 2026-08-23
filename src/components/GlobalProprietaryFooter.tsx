import { useLocation } from "react-router-dom";

export default function GlobalProprietaryFooter() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <footer
      id="global-proprietary-footer"
      className={`fixed bottom-0 left-0 right-0 z-40 w-full max-w-[412px] mx-auto text-center py-1.5 px-3 border-t pointer-events-none select-none overflow-hidden ${
        isAdmin
          ? "bg-[#eeeeee] text-neutral-600 border-neutral-300"
          : "bg-neutral-800 text-white/90 border-neutral-700"
      }`}
      style={{ height: "21px" }}
    >
      <div className="w-full text-center text-[9px] sm:text-[10px] font-semibold tracking-[0.06em] uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-[10px] font-condensed">
        {isAdmin
          ? "USAGE OF THIS SYSTEM IS PROPRIETARY. DO NOT DISTRIBUTE OR COPY."
          : "PRIME SYSTEM IS PROPRIETARY. DO NOT REPRODUCE OR COPY."}
      </div>
    </footer>
  );
}
