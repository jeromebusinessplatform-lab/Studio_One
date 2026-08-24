import { useEffect, useState } from "react";
import { BadgeCheck, Crown, Link2, Loader2, Users, X } from "lucide-react";

type PublicMember = {
  telegramDisplayName: string;
  telegramUsername: string | null;
  primeMemberId: string;
  referralCount: number;
};

function isPublicPrimeMemberId(value: string) {
  return /^[A-Z0-9]{10}$/.test(value) && !/^PC[A-Z0-9]{8}$/.test(value);
}

export function PrimeMemberLink({ primeMemberId, className = "" }: { primeMemberId?: string | null; className?: string }) {
  const mid = String(primeMemberId || "").trim().toUpperCase();
  if (!isPublicPrimeMemberId(mid)) return <>{primeMemberId || "—"}</>;

  const open = () => window.dispatchEvent(new CustomEvent("prime:open-member", { detail: { primeMemberId: mid } }));
  return (
    <button type="button" onClick={open} className={`font-mono underline decoration-dotted underline-offset-2 hover:opacity-70 active:opacity-50 transition cursor-pointer ${className}`} aria-label={`Open PRIME Member ${mid} profile`}>
      {mid}
    </button>
  );
}

export default function PrimeMemberProfile() {
  const [memberId, setMemberId] = useState<string | null>(null);
  const [member, setMember] = useState<PublicMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ primeMemberId?: string }>).detail;
      const id = String(detail?.primeMemberId || "").trim().toUpperCase();
      if (!isPublicPrimeMemberId(id)) return;
      setMemberId(id);
      setMember(null);
      setError(null);
    };
    window.addEventListener("prime:open-member", handler);
    return () => window.removeEventListener("prime:open-member", handler);
  }, []);

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/members/${encodeURIComponent(memberId)}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to load member profile");
        return data;
      })
      .then((data) => { if (!cancelled) setMember(data.member || null); })
      .catch((err: any) => { if (!cancelled) setError(err?.message || "Unable to load member profile"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  if (!memberId) return null;
  const close = () => setMemberId(null);

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden">
        <div className="bg-neutral-950 text-white px-5 py-4 flex items-center justify-between">
          <div><div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">PRIME MEMBER PROFILE</div><div className="font-mono font-bold text-sm mt-1">{memberId}</div></div>
          <button type="button" onClick={close} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20" aria-label="Close profile"><X size={16} /></button>
        </div>
        <div className="p-5">
          {loading && <div className="py-10 flex items-center justify-center gap-2 text-sm text-neutral-500"><Loader2 size={18} className="animate-spin" /> Loading member profile...</div>}
          {!loading && error && <div className="py-8 text-center text-sm text-rose-600">{error}</div>}
          {!loading && !error && member && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
                <div className="w-14 h-14 rounded-full bg-white border border-neutral-200 mx-auto mb-3 flex items-center justify-center"><BadgeCheck size={27} className="text-neutral-700" /></div>
                <div className="font-bold text-base">{member.telegramDisplayName}</div>
                <div className="text-sm text-neutral-500 mt-0.5">{member.telegramUsername ? `@${member.telegramUsername}` : "Telegram handle not set"}</div>
              </div>
              <div className="grid gap-2">
                <div className="rounded-xl border border-neutral-200 p-3 flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-2"><Link2 size={13} /> PRIME Member ID</span><span className="font-mono font-bold text-xs">{member.primeMemberId}</span></div>
                <div className="rounded-xl border border-neutral-200 p-3 flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-2"><Users size={13} /> Referrals</span><span className="font-bold text-sm">{member.referralCount.toLocaleString()}</span></div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-[11px] text-amber-900 flex gap-2"><Crown size={14} className="shrink-0 mt-0.5" /> Only public member information is shown here. Private account, points, VIP status, spending, orders, addresses, payment information, and referral identities are not exposed.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
