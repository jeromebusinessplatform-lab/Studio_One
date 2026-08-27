import { useEffect, useState } from "react";
import { RotateCw, Smartphone } from "lucide-react";

const PORTRAIT_WIDTH = 412;

function applyPortraitFrame() {
  const styleId = "prime-portrait-frame";
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = `
    :root { --prime-portrait-width: ${PORTRAIT_WIDTH}px; }

    body.prime-portrait-host {
      min-height: 100dvh;
      margin: 0;
      background: #111827;
    }

    body.prime-portrait-host #root {
      width: 100%;
      min-height: 100dvh;
      margin: 0 auto;
      background: #f3f4f6;
    }

    @media (min-width: 768px) {
      body.prime-portrait-host #root {
        width: min(var(--prime-portrait-width), calc(100vw - 32px));
        min-height: 100dvh;
        box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 18px 50px rgba(0,0,0,.28);
      }
    }

    @media (max-width: 767px) {
      body.prime-portrait-host #root {
        width: 100%;
        box-shadow: none;
      }
    }
  `;

  document.body.classList.add("prime-portrait-host");
}

function removePortraitFrame() {
  document.body.classList.remove("prime-portrait-host");
  document.getElementById("prime-portrait-frame")?.remove();
}

export default function OrientationLock() {
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  useEffect(() => {
    // Keep a portrait-first presentation without locking or blocking desktop browsers.
    applyPortraitFrame();

    const checkOrientation = () => {
      const landscape = window.innerWidth > window.innerHeight;
      // Only narrow mobile viewports get the rotation recommendation.
      // Desktop/Chromebook/touch browsers remain fully usable.
      const narrowViewport = window.innerWidth < 768;
      setShowRotatePrompt(landscape && narrowViewport);
    };

    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      removePortraitFrame();
    };
  }, []);

  if (!showRotatePrompt) return null;

  return (
    <div
      id="orientation-prompt"
      className="fixed inset-0 z-[100000] bg-black/90 text-white flex flex-col items-center justify-center p-6 text-center backdrop-blur-md animate-fade-in select-none"
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
        PORTRAIT VIEW RECOMMENDED
      </h2>
      <p
        className="text-neutral-400 text-sm max-w-xs leading-relaxed font-normal mb-4"
        style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "14px" }}
      >
        PRIME is optimized for a 412 × 915 portrait layout. Rotate your mobile device for the best experience.
      </p>
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs font-normal"
        style={{ fontFamily: "'Ubuntu', sans-serif" }}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
        PORTRAIT-FIRST LAYOUT
      </div>
    </div>
  );
}
