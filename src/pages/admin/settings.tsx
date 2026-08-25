import { Save, ShieldAlert, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("System security configuration is already server-controlled");
  };

  return (
    <div className="p-3 sm:p-4 w-full max-w-full space-y-3 bg-white text-black min-h-screen">
      <div className="border-b border-neutral-200 pb-2.5">
        <h1 className="text-black text-lg sm:text-xl font-bold tracking-tight uppercase font-condensed">System Configurations</h1>
        <p className="text-neutral-500 text-[11px] mt-0.5 font-normal">Operational queue values are calculated from real orders; no browser-local queue overrides are persisted.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        <div className="bg-white border border-neutral-300 rounded-xl p-3.5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-black border-b border-neutral-100 pb-2"><ShieldAlert size={16}/><h2 className="text-sm font-bold uppercase font-condensed">Authentication & Security</h2></div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-neutral-100"><div><div className="font-medium text-black">Admin Access Credential</div><div className="text-[10px] text-neutral-500">Server-side only; never rendered into the client interface.</div></div><div className="inline-flex items-center gap-1 text-[11px] uppercase text-neutral-700"><LockKeyhole size={12}/> Protected</div></div>
            <div className="flex items-center justify-between gap-3 py-1.5 border-b border-neutral-100"><div><div className="font-medium text-black">Telegram Admin Identity</div><div className="text-[10px] text-neutral-500">Validated by the protected server session.</div></div><div className="inline-flex items-center gap-1 text-[11px] uppercase text-neutral-700"><LockKeyhole size={12}/> Protected</div></div>
            <div className="flex items-center justify-between gap-3 py-1.5"><div><div className="font-medium text-black">Queue Calculation</div><div className="text-[10px] text-neutral-500">Active orders, traffic and wait estimates are derived from the authoritative order workflow.</div></div><div className="text-[11px] uppercase text-emerald-700 font-semibold">SERVER AUTHORITATIVE</div></div>
          </div>
        </div>

        <button type="submit" className="bg-black hover:bg-neutral-800 text-white font-normal py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all text-xs"><Save size={14}/> Save Configuration</button>
      </form>
    </div>
  );
}
