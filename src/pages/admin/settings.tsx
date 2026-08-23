import React, { useState } from "react";
import { useQueueStats } from "@/hooks/useQueueStats.ts";
import { Save, ShieldAlert, Store, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const { stats, updateStats } = useQueueStats();

  const [isPaused, setIsPaused] = useState(stats?.isPaused ?? false);
  const [traffic, setTraffic] = useState<"LOW" | "MODERATE" | "HIGH">(stats?.traffic ?? "MODERATE");
  const [maxConcurrent, setMaxConcurrent] = useState(stats?.maxConcurrent ?? 50);
  const [waitTime, setWaitTime] = useState(stats?.estimatedWaitMinutes ?? 44);
  const [dispatchTime, setDispatchTime] = useState(stats?.estimatedDispatchMinutes ?? 21);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStats({
      isPaused,
      traffic,
      maxConcurrent: Number(maxConcurrent),
      estimatedWaitMinutes: Number(waitTime),
      estimatedDispatchMinutes: Number(dispatchTime),
    });
    toast.success("System configurations updated successfully");
  };

  return (
    <div className="p-3 sm:p-4 w-full max-w-full space-y-3 bg-white text-black min-h-screen">
      <div className="border-b border-neutral-200 pb-2.5">
        <h1 className="text-black text-lg sm:text-xl font-bold tracking-tight uppercase font-condensed">System Configurations</h1>
        <p className="text-neutral-500 text-[11px] mt-0.5 font-normal">Live queue throughput, traffic state overrides, and protected operational configuration.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="bg-white border border-neutral-300 rounded-xl p-3.5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-black border-b border-neutral-100 pb-2"><Store size={16}/><h2 className="text-sm font-bold uppercase font-condensed">Queue & Store Operations</h2></div>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 border border-neutral-200"><div><div className="text-xs font-medium text-black">Pause Incoming Queue</div><div className="text-[11px] text-neutral-500">Temporarily prevent new checkout submissions during peak load.</div></div><input type="checkbox" checked={isPaused} onChange={(e) => setIsPaused(e.target.checked)} className="w-4 h-4 accent-black rounded cursor-pointer"/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div><label className="text-neutral-600 uppercase block mb-1 text-[11px]">Queue Traffic State</label><select value={traffic} onChange={(e) => setTraffic(e.target.value as "LOW" | "MODERATE" | "HIGH")} className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-black"><option value="LOW">LOW (Smooth Flow)</option><option value="MODERATE">MODERATE (Average Flow)</option><option value="HIGH">HIGH (Heavy Queue)</option></select></div>
              <div><label className="text-neutral-600 uppercase block mb-1 text-[11px]">Max Concurrent Active Orders</label><input type="number" min="1" max="500" value={maxConcurrent} onChange={(e) => setMaxConcurrent(Number(e.target.value))} className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-black"/></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-neutral-100">
              <div><label className="text-neutral-600 uppercase block mb-1 text-[11px]">Estimated Wait Calculation (Min)</label><input type="number" min="1" value={waitTime} onChange={(e) => setWaitTime(Number(e.target.value))} className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-black"/></div>
              <div><label className="text-neutral-600 uppercase block mb-1 text-[11px]">Estimated Dispatch Calculation (Min)</label><input type="number" min="1" value={dispatchTime} onChange={(e) => setDispatchTime(Number(e.target.value))} className="w-full bg-neutral-50 border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-black"/></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-300 rounded-xl p-3.5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-black border-b border-neutral-100 pb-2"><ShieldAlert size={16}/><h2 className="text-sm font-bold uppercase font-condensed">Authentication & Security</h2></div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-neutral-100"><div><div className="font-medium text-black">Admin Access Credential</div><div className="text-[10px] text-neutral-500">Server-side only; never rendered into the client interface.</div></div><div className="inline-flex items-center gap-1 text-[11px] uppercase text-neutral-700"><LockKeyhole size={12}/> Protected</div></div>
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-neutral-100"><div><div className="font-medium text-black">Telegram Admin Identity</div><div className="text-[10px] text-neutral-500">Validated by the protected server session.</div></div><div className="inline-flex items-center gap-1 text-[11px] uppercase text-neutral-700"><LockKeyhole size={12}/> Protected</div></div>
            <div className="flex items-center justify-between gap-3 py-1.5"><div><div className="font-medium text-black">System License Status</div><div className="text-[10px] text-neutral-500">Client UI exposes status only; credentials remain server-side.</div></div><div className="text-[11px] uppercase text-emerald-700 font-semibold">ENTERPRISE SECURE PROPRIETARY</div></div>
          </div>
        </div>

        <button type="submit" className="bg-black hover:bg-neutral-800 text-white font-normal py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all text-xs"><Save size={14}/> Save All Configurations</button>
      </form>
    </div>
  );
}
