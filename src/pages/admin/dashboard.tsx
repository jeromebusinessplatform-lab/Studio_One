import {
  ClipboardList,
  Package,
  Users,
  Truck,
  ReceiptText,
  BadgePercent,
  TrendingUp,
  Wallet,
  Headphones,
  Settings,
  Stethoscope,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQueueStats } from "@/hooks/useQueueStats.ts";
import { useOrders } from "@/hooks/useOrders.ts";
import PrimeLogo from "@/components/PrimeLogo.tsx";

const modules = [
  { title: "ORDERS", icon: ClipboardList, to: "/admin/orders", description: "Manage queue, payment, fulfillment and dispatch." },
  { title: "INVENTORY", icon: Package, to: "/admin/products", description: "Products, stock, availability and pricing." },
  { title: "CUSTOMERS", icon: Users, to: "/admin/customers", description: "Customer profiles, membership and activity." },
  { title: "COURIERS", icon: Truck, to: "/admin/courier", description: "Courier assignments, status and logistics." },
  { title: "CHARGES", icon: ReceiptText, to: "/admin/charges", description: "Service charges and pricing rules." },
  { title: "DISCOUNTS", icon: BadgePercent, to: "/admin/discounts", description: "Promo codes, thresholds and discount rules." },
  { title: "ANALYTICS", icon: TrendingUp, to: "/admin/analytics", description: "Sales, throughput, order and performance analytics." },
  { title: "CASHFLOW", icon: Wallet, to: "/admin/analytics", description: "Financial performance and sales reporting." },
  { title: "SUPPORT", icon: Headphones, to: "/shop/support", description: "Customer support and help tools." },
];

type DiagnosticResult = { name: string; ok: boolean; detail: string };

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { stats } = useQueueStats();
  const { allOrders: orders, loading: ordersLoading } = useOrders();
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<DiagnosticResult[]>([]);

  const currentDateTime = useMemo(() => {
    const now = new Date();
    const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    return `${date} | ${time}`;
  }, []);

  const queue = stats ?? { onQueue: 6, processing: 4, estimatedWaitMinutes: 44, estimatedDispatchMinutes: 21, traffic: "MODERATE" as const };
  const activeOrders = ordersLoading ? 0 : orders.filter((o) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(o.orderStatus)).length;
  const traffic = queue.traffic || "MODERATE";

  const runDiagnostics = async () => {
    setDiagnosticsOpen(true);
    setDiagnosticsRunning(true);
    setDiagnosticResults([]);
    const checks: Array<[string, () => Promise<string>]> = [
      ["ADMIN SESSION", async () => { const response = await fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" }); if (!response.ok) throw new Error(`HTTP ${response.status}`); const data = await response.json(); if (!data.authenticated) throw new Error("Session is not authenticated"); return "Authenticated admin session is valid"; }],
      ["TELEGRAM AUTH SERVICE", async () => { const response = await fetch("/api/auth/telegram/session", { credentials: "same-origin", cache: "no-store" }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return "Endpoint responding"; }],
      ["ORDERS SERVICE", async () => { const response = await fetch("/api/orders", { credentials: "same-origin", cache: "no-store" }); if (response.status === 401) return "Endpoint protected and responding"; if (!response.ok) throw new Error(`HTTP ${response.status}`); return "Endpoint responding"; }],
      ["CUSTOMER SERVICE", async () => { const response = await fetch("/api/customers", { credentials: "same-origin", cache: "no-store" }); if (response.status === 401) return "Endpoint protected and responding"; if (!response.ok) throw new Error(`HTTP ${response.status}`); return "Endpoint responding"; }],
      ["BROWSER STORAGE", async () => { const key = "prime_diagnostic_probe"; localStorage.setItem(key, "ok"); const passed = localStorage.getItem(key) === "ok"; localStorage.removeItem(key); if (!passed) throw new Error("localStorage unavailable"); return "Local persistence available"; }],
    ];
    const results: DiagnosticResult[] = [];
    for (const [name, check] of checks) {
      try { const detail = await check(); results.push({ name, ok: true, detail }); }
      catch (error: any) { results.push({ name, ok: false, detail: error?.message || "Check failed" }); }
      setDiagnosticResults([...results]);
    }
    setDiagnosticsRunning(false);
  };

  return (
    <section className="min-h-[calc(100dvh-42px)] flex flex-col bg-white text-black px-4 sm:px-7 lg:px-10 pt-6 sm:pt-8">
      <header className="flex items-start justify-between gap-4 pb-4 sm:pb-6">
        <button type="button" onClick={() => navigate("/admin")} className="block w-[180px] sm:w-[230px] h-[55px] sm:h-[72px]" aria-label="PRIME Admin home"><PrimeLogo className="h-full w-full" /></button>
        <div className="text-right font-body leading-tight pt-1">
          <div className="text-[10px] sm:text-[12px] font-normal tracking-[0.08em]">{currentDateTime}</div>
          <div className="text-[10px] sm:text-[12px] font-semibold tracking-[0.12em] uppercase">FULL SYSTEM ACCESS</div>
        </div>
      </header>

      <div className="rounded-[18px] border border-neutral-300 shadow-[0_3px_10px_rgba(0,0,0,0.16)] overflow-hidden mb-8">
        <div className="grid grid-cols-5 divide-x divide-neutral-200 bg-white">
          {[["ON QUEUE", String(queue.onQueue)],["PROCESSING", String(queue.processing)],["EST. WAIT TIME", `${queue.estimatedWaitMinutes} MINUTES`],["EST. DISPATCH TIME", `${queue.estimatedDispatchMinutes} MINUTES`],["ORDER TRAFFIC", traffic]].map(([label, value]) => (
            <div key={label} className="px-2 py-3.5 sm:px-4 sm:py-4 text-center"><div className="font-condensed text-[8px] sm:text-[11px] uppercase tracking-[0.08em] leading-tight">{label}</div><div className="font-body text-[15px] sm:text-[20px] font-semibold mt-1 leading-none">{value}</div></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-7 mb-8">
        {modules.map(({ title, icon: Icon, to, description }) => (
          <button key={title} type="button" onClick={() => navigate(to)} className="group min-h-[126px] sm:min-h-[148px] rounded-[12px] border border-neutral-500 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.18)] hover:shadow-[0_5px_13px_rgba(0,0,0,0.22)] hover:-translate-y-[1px] transition-all px-5 sm:px-7 flex items-center gap-6 text-left" title={description}>
            <Icon size={50} strokeWidth={1.9} className="shrink-0 text-black sm:w-[56px] sm:h-[56px]" />
            <div className="min-w-0"><div className="font-condensed text-[22px] sm:text-[26px] uppercase leading-none tracking-[0.015em]">{title}</div><div className="font-body text-[11px] sm:text-[12px] text-neutral-500 leading-snug mt-2">{description}</div></div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 pb-9">
        <button type="button" onClick={() => navigate("/admin/settings")} className="min-h-[132px] rounded-[12px] border border-neutral-500 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.18)] hover:shadow-[0_5px_13px_rgba(0,0,0,0.22)] hover:-translate-y-[1px] transition-all px-7 flex items-center gap-6 text-left"><Settings size={58} strokeWidth={1.9} className="shrink-0"/><div><div className="font-condensed text-[24px] sm:text-[28px] uppercase leading-none">SYSTEM SETTINGS</div><div className="font-body text-[11px] text-neutral-500 mt-2">Queue limits, traffic override, dispatch timing and protected configuration.</div></div></button>
        <button type="button" onClick={runDiagnostics} className="min-h-[132px] rounded-[12px] border border-neutral-500 bg-white shadow-[0_4px_10px_rgba(0,0,0,0.18)] hover:shadow-[0_5px_13px_rgba(0,0,0,0.22)] hover:-translate-y-[1px] transition-all px-7 flex items-center gap-6 text-left"><Stethoscope size={58} strokeWidth={1.9} className="shrink-0"/><div><div className="font-condensed text-[24px] sm:text-[28px] uppercase leading-none">RUN FULL DIAGNOSTICS</div><div className="font-body text-[11px] text-neutral-500 mt-2">Validate authentication, API health, storage and operational endpoints before release.</div></div></button>
      </div>

      <div className="mt-auto border-t border-neutral-200 pt-4 pb-5 text-center font-condensed text-[10px] sm:text-[12px] tracking-[0.14em] uppercase text-neutral-700">USAGE OF THIS SYSTEM IS PROPRIETARY. DO NOT DISTRIBUTE OR COPY.</div>

      {diagnosticsOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3 sm:p-6" onClick={() => !diagnosticsRunning && setDiagnosticsOpen(false)}>
          <div className="w-full max-w-xl bg-white border border-black rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200"><div><div className="font-condensed text-2xl uppercase">SYSTEM DIAGNOSTICS</div><div className="font-body text-xs text-neutral-500 mt-0.5">{activeOrders} active orders • {traffic} traffic</div></div><button type="button" onClick={() => setDiagnosticsOpen(false)} disabled={diagnosticsRunning} className="p-1 text-neutral-500 hover:text-black disabled:opacity-30"><X size={20}/></button></div>
            <div className="p-5 space-y-2.5">{diagnosticResults.length === 0 && diagnosticsRunning && <div className="py-8 text-center text-sm font-body text-neutral-500">Running health checks…</div>}{diagnosticResults.map((result) => <div key={result.name} className="flex items-center gap-3 border border-neutral-200 rounded-lg px-3 py-3">{result.ok ? <CheckCircle2 size={18}/> : <AlertTriangle size={18}/>}<div className="min-w-0 flex-1"><div className="font-condensed text-sm tracking-wide">{result.name}</div><div className="font-body text-xs text-neutral-500 truncate">{result.detail}</div></div><span className="font-body text-[10px] uppercase">{result.ok ? "PASS" : "FAIL"}</span></div>)}{diagnosticsRunning && diagnosticResults.length > 0 && <div className="flex items-center gap-2 text-xs text-neutral-500 pt-2"><RefreshCw size={13} className="animate-spin"/> Checking remaining services…</div>}</div>
            <div className="px-5 py-4 border-t border-neutral-200 flex justify-end gap-2"><button type="button" onClick={() => setDiagnosticsOpen(false)} disabled={diagnosticsRunning} className="border border-neutral-300 px-4 py-2 rounded-lg text-xs font-body uppercase disabled:opacity-40">Close</button><button type="button" onClick={runDiagnostics} disabled={diagnosticsRunning} className="bg-black text-white px-4 py-2 rounded-lg text-xs font-body uppercase inline-flex items-center gap-2 disabled:opacity-40"><CircleDot size={13}/>{diagnosticsRunning ? "Running" : "Run Again"}</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
