import React, { useState } from "react";
import { useQueueStats } from "@/hooks/useQueueStats.ts";
import { Settings, Save, ShieldAlert, Store, Clock } from "lucide-react";
import { toast } from "sonner";
import { APP_CONFIG } from "@/lib/config.ts";

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
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1
          className="text-black text-2xl font-normal tracking-wide uppercase"
          style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
        >
          System Configurations
        </h1>
        <p className="text-neutral-500 text-xs mt-0.5 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
          Live queue throughput, traffic state overrides, and store availability.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Queue Control */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 text-black border-b border-neutral-100 pb-3">
            <Store size={18} />
            <h2 className="text-base font-normal uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
              Queue & Store Operations
            </h2>
          </div>

          <div className="space-y-4 font-normal text-xs" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "14px" }}>
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div>
                <div className="text-sm font-medium text-black">Pause Incoming Queue</div>
                <div className="text-xs text-neutral-500">Temporarily prevent new checkout submissions during peak load.</div>
              </div>
              <input
                type="checkbox"
                checked={isPaused}
                onChange={(e) => setIsPaused(e.target.checked)}
                className="w-5 h-5 accent-black rounded cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-neutral-600 uppercase block mb-1">Queue Traffic State</label>
                <select
                  value={traffic}
                  onChange={(e) => setTraffic(e.target.value as "LOW" | "MODERATE" | "HIGH")}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                >
                  <option value="LOW">LOW (Smooth Flow)</option>
                  <option value="MODERATE">MODERATE (Average Flow)</option>
                  <option value="HIGH">HIGH (Heavy Queue)</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-600 uppercase block mb-1">Max Concurrent Active Orders</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={maxConcurrent}
                  onChange={(e) => setMaxConcurrent(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
              <div>
                <label className="text-neutral-600 uppercase block mb-1">Estimated Wait Calculation (Min)</label>
                <input
                  type="number"
                  min="1"
                  value={waitTime}
                  onChange={(e) => setWaitTime(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="text-neutral-600 uppercase block mb-1">Estimated Dispatch Calculation (Min)</label>
                <input
                  type="number"
                  min="1"
                  value={dispatchTime}
                  onChange={(e) => setDispatchTime(Number(e.target.value))}
                  className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security & Credentials summary */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2.5 text-black border-b border-neutral-100 pb-3">
            <ShieldAlert size={18} className="text-amber-600" />
            <h2 className="text-base font-normal uppercase" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
              Authentication & Security Keys
            </h2>
          </div>

          <div className="space-y-2 text-xs text-neutral-600 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "13px" }}>
            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span>Admin Access Passcode:</span>
              <span className="font-mono text-black font-semibold">{APP_CONFIG.ADMIN_ACCESS_CODE}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-neutral-100">
              <span>Telegram Admin ID:</span>
              <span className="font-mono text-black font-semibold">{APP_CONFIG.TELEGRAM_ADMIN_ID}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>System License Status:</span>
              <span className="text-green-700 font-semibold">ENTERPRISE SECURE PROPRIETARY</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="bg-black hover:bg-neutral-800 text-white font-normal py-3 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
          style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "16px" }}
        >
          <Save size={16} /> Save All Configurations
        </button>
      </form>
    </div>
  );
}
