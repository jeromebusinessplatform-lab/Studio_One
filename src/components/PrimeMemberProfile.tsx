import { useEffect, useState } from "react";
import { BadgeCheck, Crown, Link2, Loader2, ShieldCheck, UserRound, Users, X } from "lucide-react";

type PublicMember = {
  telegramDisplayName: string;
  telegramUsername: string | null;
  primeMemberId: string;
  referralCount: number;
  vipTier: string;
  vipTone: string;
  accountStatus: "ACTIVE" | "INACTIVE";
};

type PublicMemberResponse = {
  member: PublicMember;
  referredBy: PublicMember | null;
};

function isPublicPrimeMemberId(value: string) {
  return /^[A-Z0-9]{10}$/.test(value) && !/^PC[A-Z0-9]{8}$/.test(value);
}

function tierClasses(tone: string) {
  const styles: Record<string, string> = {
    bronze: "border-amber-200 bg-amber-50 text-amber-900",
    silver: "border-slate-200 bg-slate-50 text-slate-800",
    gold: "border-yellow-200 bg-yellow-50 text-yellow-900",
    platinum: "border-violet-200 bg-violet-50 text-violet-950",
  };
  return styles[tone] || styles.bronze;
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
  const [referredBy, setReferredBy] = useState<PublicMember | null>(null);
  const [showReferralList, setShowReferralList] = useState(false);
  const [referrals, setReferrals] = useState<PublicMember[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [referralsError, setReferralsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ primeMemberId?: string }>).detail;
      const id = String(detail?.primeMemberId || "").trim().toUpperCase();
      if (!isPublicPrimeMemberId(id)) return;
      setMemberId(id);
      setMember(null);
      setReferredBy(null);
      setError(null);
      setShowReferralList(false);
    };
    window.addEventListener("prime:open-member", handler);
    return () => window.removeEventListener("prime:open-member", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setShowReferralList(true);
      setReferrals([]);
      setReferralsError(null);
      setReferralsLoading(true);
      fetch("/api/account/referrals", { credentials: "same-origin", cache: "no-store" })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Unable to load referrals");
          return data;
        })
        .then((data) => setReferrals(Array.isArray(data.referrals) ? data.referrals : []))
        .catch((err: any) => setReferralsError(err?.message || "Unable to load referrals"))
        .finally(() => setReferralsLoading(false));
    };
    window.addEventListener("prime:open-referrals", handler);
    return () => window.removeEventListener("prime:open-referrals", handler);
  }, []);

  useEffect(() => {
    if (!memberId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/members/${encodeURIComponent(memberId)}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Unable to load member profile");
        return data as PublicMemberResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setMember(data.member || null);
        setReferredBy(data.referredBy || null);
      })
      .catch((err: any) => { if (!cancelled) setError(err?.message || "Unable to load member profile"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [memberId]);

  const closeMember = () => setMemberId(null);
  const closeReferralList = () => setShowReferralList(false);
  const tierStyle = member ? tierClasses(member.vipTone) : "border-neutral-200 bg-neutral-50 text-neutral-900";

  return (
    <>
      {memberId && (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeMember(); }}>
          <div className="w-full max-w-sm rounded-[28px] shadow-2xl border overflow-hidden bg-white border-neutral-200">
            <div className="relative bg-neutral-950 text-white px-5 py-5">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_55%)]" />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.25em] text-neutral-400">PRIME MEMBER PROFILE</div>
                  <div className="font-mono font-bold text-sm mt-1 tracking-wide">{memberId}</div>
                  {member && <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-300 mt-2">{member.vipTier} MEMBER</div>}
                </div>
                <button type="button" onClick={closeMember} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20" aria-label="Close profile"><X size={16} /></button>
              </div>
            </div>

            <div className="p-5">
              {loading && <div className="py-10 flex items-center justify-center gap-2 text-sm text-neutral-500"><Loader2 size={18} className="animate-spin" /> Loading member profile...</div>}
              {!loading && error && <div className="py-8 text-center text-sm text-rose-600">{error}</div>}

              {!loading && !error && member && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-white border border-neutral-200 mx-auto mb-3 flex items-center justify-center shadow-sm"><BadgeCheck size={29} className="text-neutral-700" /></div>
                    <div className="font-bold text-base">{member.telegramDisplayName}</div>
                    <div className="text-sm text-neutral-500 mt-0.5">{member.telegramUsername ? `@${member.telegramUsername}` : "Telegram handle not set"}</div>
                  </div>

                  <div className={`rounded-2xl border p-4 ${tierStyle}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2"><Crown size={17} /><span className="text-[10px] uppercase tracking-[0.18em] font-bold">VIP Standing</span></div>
                      <span className="font-bold text-sm uppercase">{member.vipTier}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="rounded-xl bg-white/70 border border-black/5 p-2"><div className="opacity-60 uppercase tracking-wider">Account Status</div><div className={`font-bold mt-0.5 ${member.accountStatus === "ACTIVE" ? "text-emerald-700" : "text-neutral-600"}`}>{member.accountStatus}</div></div>
                      <div className="rounded-xl bg-white/70 border border-black/5 p-2"><div className="opacity-60 uppercase tracking-wider">Referrals</div><div className="font-bold mt-0.5">{member.referralCount.toLocaleString()}</div></div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="rounded-xl border border-neutral-200 p-3 flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-wider text-neutral-500 flex items-center gap-2"><Link2 size={13} /> PRIME Member ID</span><span className="font-mono font-bold text-xs">{member.primeMemberId}</span></div>
                  </div>

                  {referredBy && (
                    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-neutral-500 mb-2 flex items-center gap-2"><UserRound size={14} /> Referred By</div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">{referredBy.telegramDisplayName}</div>
                          <div className="text-[11px] text-neutral-500 truncate">{referredBy.telegramUsername ? `@${referredBy.telegramUsername}` : "Telegram handle not set"}</div>
                        </div>
                        <PrimeMemberLink primeMemberId={referredBy.primeMemberId} className="text-xs" />
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-[10px] text-neutral-600 flex gap-2">
                    <ShieldCheck size={14} className="shrink-0 mt-0.5 text-neutral-500" />
                    Public member information only. Points, spending, orders, addresses, payment information, discounts, and referral identities are not exposed.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showReferralList && (
        <div className="fixed inset-0 z-[85] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeReferralList(); }}>
          <div className="w-full max-w-md max-h-[82vh] overflow-hidden rounded-[28px] shadow-2xl border bg-white border-neutral-200">
            <div className="bg-neutral-950 text-white px-5 py-5 flex items-start justify-between gap-3">
              <div>
                <div className="text-[9px] uppercase tracking-[0.25em] text-neutral-400">MY REFERRALS</div>
                <div className="font-bold text-base mt-1">Members You Referred</div>
                <div className="text-[10px] text-neutral-400 mt-1">Only each member's public PRIME profile is shown.</div>
              </div>
              <button type="button" onClick={closeReferralList} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20" aria-label="Close referral list"><X size={16} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[64vh]">
              {referralsLoading && <div className="py-12 flex items-center justify-center gap-2 text-sm text-neutral-500"><Loader2 size={18} className="animate-spin" /> Loading referrals...</div>}
              {!referralsLoading && referralsError && <div className="py-10 text-center text-sm text-rose-600">{referralsError}</div>}
              {!referralsLoading && !referralsError && !referrals.length && <div className="py-10 text-center"><Users size={24} className="mx-auto text-neutral-400" /><div className="font-bold text-sm mt-2">No referrals yet</div><div className="text-xs text-neutral-500 mt-1">Members you refer will appear here.</div></div>}
              {!referralsLoading && !referralsError && referrals.length > 0 && (
                <div className="space-y-2">
                  {referrals.map((referral) => (
                    <div key={referral.primeMemberId} className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${tierClasses(referral.vipTone)}`}>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{referral.telegramDisplayName}</div>
                        <div className="text-[11px] opacity-70 truncate">{referral.telegramUsername ? `@${referral.telegramUsername}` : "Telegram handle not set"} · {referral.vipTier} · {referral.accountStatus}</div>
                      </div>
                      <PrimeMemberLink primeMemberId={referral.primeMemberId} className="text-xs shrink-0 no-underline hover:no-underline" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
