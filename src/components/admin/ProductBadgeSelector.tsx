import React from "react";
import { Clock, Calendar, AlertTriangle, CheckCircle2, Flame, Sparkles, AlertCircle } from "lucide-react";
import { isBadgeActive } from "@/data/products.ts";

interface ProductBadgeSelectorProps {
  badge: "" | "NEW" | "SALE" | "LOW_STOCK";
  badgeExpiry: string;
  onBadgeChange: (badge: "" | "NEW" | "SALE" | "LOW_STOCK") => void;
  onExpiryChange: (expiry: string) => void;
}

export function ProductBadgeSelector({
  badge,
  badgeExpiry,
  onBadgeChange,
  onExpiryChange,
}: ProductBadgeSelectorProps) {
  const isExpired = badge ? !isBadgeActive(badge, badgeExpiry) : false;

  const setPresetExpiry = (hoursOrDays: "24h" | "3d" | "7d" | "30d" | "eom") => {
    const d = new Date();
    if (hoursOrDays === "24h") {
      d.setHours(d.getHours() + 24);
    } else if (hoursOrDays === "3d") {
      d.setDate(d.getDate() + 3);
    } else if (hoursOrDays === "7d") {
      d.setDate(d.getDate() + 7);
    } else if (hoursOrDays === "30d") {
      d.setDate(d.getDate() + 30);
    } else if (hoursOrDays === "eom") {
      d.setMonth(d.getMonth() + 1, 0);
      d.setHours(23, 59, 0, 0);
    }

    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
    onExpiryChange(formatted);
  };

  return (
    <div className="space-y-3 bg-neutral-50/80 border border-neutral-200 rounded-xl p-3">
      {/* Badge Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            className="text-neutral-600 uppercase text-xs block mb-1 font-normal"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            Highlight Badge
          </label>
          <div className="grid grid-cols-4 gap-1 bg-white p-1 rounded-xl border border-neutral-200">
            {(
              [
                { val: "", label: "None" },
                { val: "NEW", label: "NEW", color: "bg-blue-600 text-white" },
                { val: "SALE", label: "SALE", color: "bg-red-600 text-white" },
                { val: "LOW_STOCK", label: "LOW STOCK", color: "bg-amber-500 text-white" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onBadgeChange(opt.val)}
                className={`py-1.5 px-1 rounded-lg text-[11px] font-medium transition-all text-center cursor-pointer truncate ${
                  badge === opt.val
                    ? opt.val
                      ? `${opt.color} font-bold shadow-xs`
                      : "bg-neutral-900 text-white font-bold"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Expiry Date Time Picker */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              className="text-neutral-600 uppercase text-xs block font-normal"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              Badge Expiry Date
            </label>
            {badgeExpiry && (
              <button
                type="button"
                onClick={() => onExpiryChange("")}
                className="text-[10px] text-neutral-400 hover:text-neutral-700 underline cursor-pointer"
              >
                No Expiration
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="datetime-local"
              disabled={!badge}
              value={badgeExpiry}
              onChange={(e) => onExpiryChange(e.target.value)}
              className="w-full bg-white border border-neutral-300 rounded-xl px-3 py-1.5 text-xs text-neutral-900 outline-none focus:border-black font-mono disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Expiry Quick Presets & Status Indicator */}
      {badge && (
        <div className="pt-2 border-t border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-[10px] text-neutral-500 font-mono uppercase">Quick Expiry Presets:</span>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setPresetExpiry("24h")}
                className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[10px] text-neutral-700 hover:bg-neutral-100 cursor-pointer font-mono"
              >
                +24h
              </button>
              <button
                type="button"
                onClick={() => setPresetExpiry("3d")}
                className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[10px] text-neutral-700 hover:bg-neutral-100 cursor-pointer font-mono"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => setPresetExpiry("7d")}
                className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[10px] text-neutral-700 hover:bg-neutral-100 cursor-pointer font-mono"
              >
                +7 Days
              </button>
              <button
                type="button"
                onClick={() => setPresetExpiry("30d")}
                className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[10px] text-neutral-700 hover:bg-neutral-100 cursor-pointer font-mono"
              >
                +30 Days
              </button>
              <button
                type="button"
                onClick={() => setPresetExpiry("eom")}
                className="px-2 py-0.5 bg-white border border-neutral-200 rounded-md text-[10px] text-neutral-700 hover:bg-neutral-100 cursor-pointer font-mono"
              >
                End of Month
              </button>
            </div>
          </div>

          {/* Status banner */}
          {badgeExpiry ? (
            isExpired ? (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between font-mono">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-red-600 shrink-0" />
                  <span>Badge has EXPIRED (Hidden from customer catalog)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPresetExpiry("7d")}
                  className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded cursor-pointer hover:bg-red-700 font-sans"
                >
                  Renew +7d
                </button>
              </div>
            ) : (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5 font-mono">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                <span>
                  Badge Active • Expires on:{" "}
                  <strong>{new Date(badgeExpiry).toLocaleString()}</strong>
                </span>
              </div>
            )
          ) : (
            <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-1">
              <Clock size={12} className="text-neutral-400" />
              <span>No expiry configured • Badge will remain active indefinitely</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
