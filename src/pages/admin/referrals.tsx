import { useEffect, useState } from "react";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type Campaign = {
  active: boolean;
  name: string;
  description: string;
  maxUses: number | null;
  minSpend: number;
  rewardAmount: number;
  startAt: string | null;
  endAt: string | null;
  daysOfWeek: number[];
  startTimeOfDay: string | null;
  endTimeOfDay: string | null;
  allowedRegions: string[];
  allowedChannels: string[];
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const emptyCampaign = (): Campaign => ({
  active: true,
  name: "PRIME Referral Campaign",
  description: "",
  maxUses: null,
  minSpend: 0,
  rewardAmount: 50,
  startAt: null,
  endAt: null,
  daysOfWeek: [],
  startTimeOfDay: null,
  endTimeOfDay: null,
  allowedRegions: [],
  allowedChannels: ["TELEGRAM_APP"],
});

export default function AdminReferralsPage() {
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign>(emptyCampaign());
  const [usageCount, setUsageCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const response = await fetch("/api/admin/referral-campaign", { credentials: "same-origin", cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Unable to load referral campaign");
    setCampaign({ ...emptyCampaign(), ...(data.campaign || {}) });
    setUsageCount(Number(data.usageCount || 0));
  };

  useEffect(() => { void load().catch((error) => toast.error(error.message)); }, []);

  const save = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/referral-campaign", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(campaign) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to save referral campaign");
      setCampaign({ ...emptyCampaign(), ...data });
      toast.success("Referral campaign saved.");
    } catch (error: any) { toast.error(error.message); } finally { setBusy(false); }
  };

  const update = <K extends keyof Campaign>(key: K, value: Campaign[K]) => setCampaign((current) => ({ ...current, [key]: value }));
  const toggleDay = (day: number) => update("daysOfWeek", campaign.daysOfWeek.includes(day) ? campaign.daysOfWeek.filter((value) => value !== day) : [...campaign.daysOfWeek, day]);
  const parseList = (value: string) => value.split(/[,\n]/).map((item) => item.trim().toUpperCase()).filter(Boolean);

  return <section className="min-h-screen bg-white px-3 py-3 pb-24 text-black font-condensed sm:px-5 sm:py-5">
    <header className="flex items-center gap-2 border-b border-neutral-200 pb-3">
      <button type="button" onClick={() => navigate("/admin")} className="rounded-xl border border-neutral-200 p-2"><ArrowLeft size={17} /></button>
      <div className="min-w-0"><h1 className="text-lg font-bold uppercase">REFERRAL CAMPAIGN</h1><p className="text-[10px] font-sans text-neutral-500">PRIME Member ID is the referral code. Validation is server-authoritative.</p></div>
    </header>

    <div className="mt-3 space-y-3">
      <label className="flex items-start justify-between rounded-2xl border border-neutral-200 bg-neutral-50 p-3"><span><span className="block text-xs font-bold">Campaign Active</span><span className="block text-[10px] text-neutral-500">Disable the referral program without deleting its configuration.</span></span><input type="checkbox" checked={campaign.active} onChange={(event) => update("active", event.target.checked)} className="mt-0.5 h-4 w-4 accent-black" /></label>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 space-y-3">
        <input value={campaign.name} onChange={(event) => update("name", event.target.value)} placeholder="Campaign name" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs" />
        <textarea value={campaign.description} onChange={(event) => update("description", event.target.value)} placeholder="Campaign description" className="min-h-20 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-[10px] font-bold uppercase text-neutral-500">Minimum qualifying spend<input type="number" min="0" value={campaign.minSpend} onChange={(event) => update("minSpend", Number(event.target.value) || 0)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs font-mono" /></label>
          <label className="text-[10px] font-bold uppercase text-neutral-500">Referrer reward amount<input type="number" min="0" value={campaign.rewardAmount} onChange={(event) => update("rewardAmount", Number(event.target.value) || 0)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs font-mono" /></label>
          <label className="text-[10px] font-bold uppercase text-neutral-500">Global campaign usage cap<input type="number" min="0" value={campaign.maxUses ?? ""} onChange={(event) => update("maxUses", event.target.value === "" ? null : Number(event.target.value))} placeholder="Unlimited" className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs font-mono" /></label>
          <label className="text-[10px] font-bold uppercase text-neutral-500">Used redemptions<div className="mt-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs font-mono">{usageCount}</div></label>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 space-y-3">
        <div className="text-xs font-bold uppercase">Schedule</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-[10px] font-bold uppercase text-neutral-500">Start date/time<input type="datetime-local" value={campaign.startAt ? new Date(campaign.startAt).toISOString().slice(0,16) : ""} onChange={(event) => update("startAt", event.target.value ? new Date(event.target.value).toISOString() : null)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs" /></label><label className="text-[10px] font-bold uppercase text-neutral-500">Expiration date/time<input type="datetime-local" value={campaign.endAt ? new Date(campaign.endAt).toISOString().slice(0,16) : ""} onChange={(event) => update("endAt", event.target.value ? new Date(event.target.value).toISOString() : null)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs" /></label></div>
        <div className="grid grid-cols-7 gap-1">{DAYS.map((label, day) => <button key={label} type="button" onClick={() => toggleDay(day)} className={`rounded-lg border px-1 py-2 text-[10px] font-bold ${campaign.daysOfWeek.includes(day) ? "bg-black text-white border-black" : "bg-white text-neutral-500 border-neutral-200"}`}>{label}</button>)}</div>
        <div className="grid grid-cols-2 gap-3"><label className="text-[10px] font-bold uppercase text-neutral-500">Start time<input type="time" value={campaign.startTimeOfDay || ""} onChange={(event) => update("startTimeOfDay", event.target.value || null)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs font-mono" /></label><label className="text-[10px] font-bold uppercase text-neutral-500">End time<input type="time" value={campaign.endTimeOfDay || ""} onChange={(event) => update("endTimeOfDay", event.target.value || null)} className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs font-mono" /></label></div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 space-y-3">
        <div className="text-xs font-bold uppercase">Geographic & Channel Limits</div>
        <label className="text-[10px] font-bold uppercase text-neutral-500">Allowed regions<input value={campaign.allowedRegions.join(", ")} onChange={(event) => update("allowedRegions", parseList(event.target.value))} placeholder="Leave blank for all regions" className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs" /></label>
        <label className="text-[10px] font-bold uppercase text-neutral-500">Allowed attribution channels<input value={campaign.allowedChannels.join(", ")} onChange={(event) => update("allowedChannels", parseList(event.target.value))} placeholder="TELEGRAM_APP, WEB" className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-xs font-mono uppercase" /></label>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-3">
        <div className="text-[11px] text-neutral-600 leading-5">A referral remains tied to the referrer’s stable PRIME Member ID. A referee can use only one referral attribution, cannot refer themselves, and the referrer must remain active and in good standing.</div>
      </div>

      <button type="button" disabled={busy} onClick={() => void save()} className="sticky bottom-3 z-10 w-full rounded-2xl bg-black px-4 py-3 text-sm font-bold uppercase text-white shadow-lg disabled:opacity-50"><span className="inline-flex items-center gap-2"><Check size={16} /> {busy ? "Saving…" : "Save Referral Campaign"}</span></button>
    </div>
  </section>;
}
