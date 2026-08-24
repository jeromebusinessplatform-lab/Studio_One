import { useEffect, useState } from "react";
import { Copy, Check, Users, Ticket } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTelegram } from "@/context/TelegramContext.tsx";

export default function MyReferralPanel() {
  const location = useLocation();
  const { customer } = useTelegram();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (location.pathname !== "/shop/account" || !customer?.telegramUserId) {
      setReferralCode("");
      return;
    }
    fetch(`/api/customers?userId=${encodeURIComponent(customer.telegramUserId)}&_t=${Date.now()}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        const member = Array.isArray(data?.customers) ? data.customers[0] : null;
        if (!member) return;
        setReferralCode(String(member.referralCode || "").trim().toUpperCase());
        setReferrals(Math.max(0, Number(member.referrals || (Array.isArray(member.referees) ? member.referees.length : 0))));
      })
      .catch(() => {});
  }, [location.pathname, customer?.telegramUserId]);

  if (location.pathname !== "/shop/account" || !referralCode) return null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-1.5">
            <Ticket size={12} /> MY REFERRAL CODE
          </div>
          <div className="font-mono font-bold text-lg mt-1 tracking-wider">{referralCode}</div>
          <div className="text-[11px] text-neutral-500 mt-1">Share this code with a new PRIME member during checkout.</div>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="shrink-0 w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center hover:bg-neutral-50 transition"
          aria-label="Copy referral code"
        >
          {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
        </button>
      </div>
      <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
        <span className="text-neutral-500 flex items-center gap-1.5"><Users size={13} /> Referrals made</span>
        <span className="font-bold">{referrals.toLocaleString()}</span>
      </div>
    </div>
  );
}
