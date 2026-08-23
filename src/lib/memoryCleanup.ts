/**
 * Telegram WebApp & Browser Resource Cleanup & Low-Memory Protector
 * Automatically detects memory pressure, low memory events, or background transitions,
 * and purges stale caches, object URLs, and unneeded component states to prevent crashes.
 */

export interface CleanupListener {
  id: string;
  onCleanup: () => void;
}

const cleanupListeners: Set<CleanupListener> = new Set();

export function registerMemoryCleanup(listener: CleanupListener) {
  cleanupListeners.add(listener);
  return () => {
    cleanupListeners.delete(listener);
  };
}

export function triggerResourceCleanup(reason: string = "manual") {
  console.info(`[MemoryCleanup] Triggering resource cleanup (${reason})...`);

  // 1. Notify all registered component listeners
  cleanupListeners.forEach((listener) => {
    try {
      listener.onCleanup();
    } catch (err) {
      console.warn(`[MemoryCleanup] Error in listener ${listener.id}:`, err);
    }
  });

  // 2. Clear unused Image cache / DOM elements
  try {
    const hiddenImages = document.querySelectorAll("img[data-temp-cache]");
    hiddenImages.forEach((img) => img.remove());
  } catch (e) {
    // ignore
  }

  // 3. Force garbage collection hint if available in Chromium/Telegram webview
  try {
    if (typeof (window as any).gc === "function") {
      (window as any).gc();
    }
  } catch (e) {
    // ignore
  }

  // 4. Dispatch global event for custom components
  try {
    window.dispatchEvent(new CustomEvent("prime-memory-cleanup", { detail: { reason } }));
  } catch (e) {
    // ignore
  }
}

// Initialize global monitors
if (typeof window !== "undefined") {
  // Monitor visibility changes (when user minimizes Telegram mini app or switches tabs)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      triggerResourceCleanup("visibility_hidden");
    }
  });

  // Periodic memory check (every 45 seconds) if performance.memory is supported
  setInterval(() => {
    try {
      const memory = (performance as any).memory;
      if (memory) {
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const totalMB = memory.totalJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        
        // If heap usage is > 85% of limit or > 250MB, trigger aggressive cleanup
        if ((limitMB > 0 && usedMB / limitMB > 0.85) || usedMB > 250) {
          console.warn(`[MemoryCleanup] High memory usage detected: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB. Purging caches.`);
          triggerResourceCleanup("high_heap_pressure");
        }
      }
    } catch (e) {
      // ignore
    }
  }, 45000);

  // Listen to Telegram WebApp closing or viewport resize events
  const tgWebApp = (window as any).Telegram?.WebApp;
  if (tgWebApp) {
    tgWebApp.onEvent?.("viewportChanged", () => {
      // Lightweight cleanup on resize/viewport change
    });
  }
}
