import React, { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css";

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("PRIME application render failure:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;
      return (
        <div style={{ minHeight: "100vh", padding: 24, background: "#f3f4f6", color: "#111827", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 720, margin: "48px auto", background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: "#b91c1c" }}>PRIME STARTUP ERROR</div>
            <h1 style={{ fontSize: 24, margin: "8px 0 12px" }}>The application could not finish loading.</h1>
            <p style={{ margin: "0 0 12px", color: "#4b5563" }}>The server is reachable, but a client-side module or component failed during startup.</p>
            <pre style={{ margin: 0, padding: 16, background: "#111827", color: "#f9fafb", borderRadius: 12, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>{error?.stack || error?.message || String(error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = lazy(async () => {
  try {
    return await import("./App.tsx");
  } catch (error) {
    console.error("PRIME application module-load failure:", error);
    throw error;
  }
});

try {
  const tgWebApp = (window as any).Telegram?.WebApp;
  tgWebApp?.ready?.();
  tgWebApp?.expand?.();
} catch (error) {
  console.warn("Telegram WebApp initialization notice:", error);
}

window.addEventListener("error", (event) => {
  console.error("PRIME global browser error:", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.warn("PRIME unhandled promise rejection:", event.reason);
  event.preventDefault();
});

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("PRIME root element #root was not found in index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", color: "#4b5563" }}>Loading PRIME…</div>}>
        <App />
      </Suspense>
    </AppErrorBoundary>
  </StrictMode>,
);
