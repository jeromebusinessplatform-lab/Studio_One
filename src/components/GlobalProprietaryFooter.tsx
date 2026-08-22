export default function GlobalProprietaryFooter() {
  return (
    <footer
      id="global-proprietary-footer"
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-neutral-800 text-white/90 text-center py-1 px-2 border-t border-neutral-700 pointer-events-none select-none overflow-hidden max-w-[412px] mx-auto w-full"
    >
      <div
        className="w-full text-center text-[10.5px] tracking-[0.5px] uppercase whitespace-nowrap overflow-hidden text-ellipsis leading-tight font-normal"
        style={{
          fontFamily: "'Roboto Condensed', sans-serif",
          fontWeight: 400,
        }}
      >
        PRIME SYSTEM IS PROPRIETARY. DO NOT REPRODUCE OR COPY.
      </div>
    </footer>
  );
}
