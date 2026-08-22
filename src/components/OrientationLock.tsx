import { useEffect, useState } from "react";
import { RotateCw, Smartphone } from "lucide-react";

export default function OrientationLock() {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    try {
      const screenObj = window.screen as unknown as { orientation?: { lock?: (mode: string) => Promise<void> } };
      if (screenObj.orientation?.lock) {
        screenObj.orientation.lock("portrait").catch(() => {});
      }
    } catch {
      // Ignore unsupported browsers
    }

    const checkOrientation = () => {
      const isWindowLandscape = window.innerWidth > window.innerHeight;
      const isMobileSize = window.innerHeight < 650 || window.innerWidth < 1024;
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      if (isWindowLandscape && (isMobileSize || isTouch)) {
        setIsLandscape(true);
      } else {
        setIsLandscape(false);
      }
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  if (!isLandscape) return null;

  return (
    <div
      id="orientation-lock-screen"
      className="fixed inset-0 z-[100000] bg-black/95 text-white flex flex-col items-center justify-center p-6 text-center backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative mb-6 flex items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shadow-2xl">
          <Smartphone size={36} className="text-white animate-pulse" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-2 text-white shadow-lg animate-spin" style={{ animationDuration: "3s" }}>
          <RotateCw size={16} />
        </div>
      </div>
      <h2
        className="text-white text-xl font-normal uppercase tracking-wider mb-2"
        style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
      >
        PORTRAIT ORIENTATION ONLY
      </h2>
      <p
        className="text-neutral-400 text-sm max-w-xs leading-relaxed font-normal mb-4"
        style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "14px" }}
      >
        PRIME is strictly optimized for portrait mobile display (412 × 915 dp).
        Please rotate your device to portrait mode to continue.
      </p>
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-normal"
        style={{ fontFamily: "'Ubuntu', sans-serif" }}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
        LOCKED TO 412 × 915 DP PORTRAIT
      </div>
    </div>
  );
}
