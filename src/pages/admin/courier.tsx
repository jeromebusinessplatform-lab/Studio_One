import React, { useRef, useState } from "react";
import { ArrowLeft, Check, ImagePlus, Loader2, MapPin, Plus, Trash2, Truck, UploadCloud } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useCouriers, type Courier } from "@/hooks/useCouriers";
import { useHubLocations } from "@/hooks/useHubLocations";
import { CourierListSkeleton } from "@/components/admin/CourierListSkeleton.tsx";
import { formatCurrency } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { DeliveryType, HubLocation } from "@/types/courier";

const TYPES: DeliveryType[] = ["STANDARD", "EXPRESS", "PRIORITY"];

const EMPTY_PROVIDER = {
  name: "",
  deliveryType: "STANDARD" as DeliveryType,
  tier: "STANDARD" as DeliveryType,
  baseFare: 0,
  minimumDistanceKm: 3.5,
  minimumFare: 27,
  excessPerKm: 0,
  platformFeeEnabled: false,
  platformFee: 0,
  surchargeEnabled: false,
  surchargeFee: 0,
  isAvailable: true,
  logoUrl: "",
};

const EMPTY_HUB = {
  name: "",
  address: "",
  latitude: 14.5516,
  longitude: 121.0503,
  active: true,
  isDefault: false,
};

async function uploadLogo(file: File, name: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw Error("Upload JPG, PNG, or WEBP only.");
  }
  if (file.size > 5 * 1024 * 1024) throw Error("Image must be 5 MB or smaller.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const safe = (name || "provider").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const storageRef = ref(storage, `couriers/${safe}-${Date.now()}.${ext}`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

function MoneyField({ label, value, onChange, help }: { label: string; value: number; onChange: (value: number) => void; help?: string }) {
  return (
    <label className="block">
      <b className="text-[9px] uppercase text-neutral-500">{label}</b>
      {help && <div className="text-[9px] text-neutral-400 mt-0.5">{help}</div>}
      <input type="number" min="0" step="0.01" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value) || 0)} className="mt-1 w-full min-h-10 rounded-xl border px-3 text-xs font-mono" />
    </label>
  );
}

function ProviderEditor({ value, setValue, file, setFile, save, cancel, busy, requireImage }: {
  value: any;
  setValue: (value: any) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  save: () => void;
  cancel: () => void;
  busy: boolean;
  requireImage?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const set = (patch: Record<string, any>) => setValue({ ...value, ...patch });
  const preview = file ? URL.createObjectURL(file) : value.logoUrl;

  return (
    <div className="space-y-3">
      <label className="block">
        <b className="text-[9px] uppercase text-neutral-500">Provider Name</b>
        <input value={value.name} onChange={(e) => set({ name: e.target.value })} className="mt-1 w-full min-h-10 rounded-xl border px-3 text-xs" placeholder="Lalamove" />
      </label>

      <div>
        <b className="text-[9px] uppercase text-neutral-500">Type</b>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {TYPES.map((type) => (
            <button key={type} type="button" onClick={() => set({ deliveryType: type, tier: type })} className={`min-h-10 rounded-xl border text-[10px] font-bold ${value.deliveryType === type ? "bg-black text-white border-black" : "bg-white"}`}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed bg-neutral-50 p-3">
        <div className="flex justify-between gap-2 items-start">
          <div>
            <b className="text-[9px] uppercase text-neutral-600">Provider Logo</b>
            <div className="text-[10px] text-neutral-400">Upload an image file · JPG/PNG/WEBP · max 5 MB</div>
          </div>
          <button type="button" onClick={() => input.current?.click()} className="min-h-9 px-3 rounded-xl bg-black text-white text-[10px] font-bold uppercase">
            <UploadCloud size={13} className="inline mr-1" />{file ? "Replace" : "Upload"}
          </button>
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <div className="mt-3 aspect-[16/6] rounded-xl overflow-hidden bg-white border flex items-center justify-center">
          {preview ? <img src={preview} alt="Provider logo preview" className="w-full h-full object-cover" /> : <div className="text-neutral-400 text-center"><ImagePlus size={22} className="mx-auto" /><div className="text-[10px] uppercase">No image</div></div>}
        </div>
        {requireImage && !file && !value.logoUrl && <div className="text-[10px] text-rose-600 mt-2">Provider logo is required.</div>}
      </div>

      <div className="rounded-2xl border p-3 space-y-3">
        <div className="text-[10px] font-bold uppercase">Fare Computation</div>
        <MoneyField label="Base Fare" value={Number(value.baseFare) || 0} onChange={(n) => set({ baseFare: n })} help="Fixed amount charged by the provider." />
        <MoneyField label="Minimum Distance" value={Number(value.minimumDistanceKm) || 0} onChange={(n) => set({ minimumDistanceKm: n })} help="Distance included in the minimum fare, e.g. 3.5 km." />
        <MoneyField label="Minimum Fare" value={Number(value.minimumFare) || 0} onChange={(n) => set({ minimumFare: n })} help="Fare covering the minimum distance, e.g. ₱27.00." />
        <MoneyField label="Excess Per Kilometer" value={Number(value.excessPerKm) || 0} onChange={(n) => set({ excessPerKm: n })} help="Charge per kilometer beyond the minimum distance." />
      </div>

      <div className="rounded-2xl border p-3 space-y-3">
        <div className="text-[10px] font-bold uppercase">Optional Fees</div>
        <button type="button" onClick={() => set({ platformFeeEnabled: !value.platformFeeEnabled })} className={`w-full min-h-10 rounded-xl border text-[10px] font-bold uppercase ${value.platformFeeEnabled ? "bg-neutral-900 text-white border-black" : "bg-white"}`}>
          Platform Fee: {value.platformFeeEnabled ? "ON" : "OFF"}
        </button>
        {value.platformFeeEnabled && <MoneyField label="Platform Fee Amount" value={Number(value.platformFee) || 0} onChange={(n) => set({ platformFee: n })} />}
        <button type="button" onClick={() => set({ surchargeEnabled: !value.surchargeEnabled })} className={`w-full min-h-10 rounded-xl border text-[10px] font-bold uppercase ${value.surchargeEnabled ? "bg-neutral-900 text-white border-black" : "bg-white"}`}>
          Surcharge Fee: {value.surchargeEnabled ? "ON" : "OFF"}
        </button>
        {value.surchargeEnabled && <MoneyField label="Surcharge Amount" value={Number(value.surchargeFee) || 0} onChange={(n) => set({ surchargeFee: n })} />}
      </div>

      <div className="rounded-xl bg-neutral-50 border p-3 text-[10px] text-neutral-600">
        <b>Formula:</b> Base Fare + Minimum Fare + Total Excess Distance + Optional Platform Fee + Optional Surcharge
      </div>

      <button type="button" onClick={() => set({ isAvailable: !value.isAvailable })} className={`w-full min-h-10 rounded-xl border text-[10px] font-bold uppercase ${value.isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
        Checkout Availability: {value.isAvailable ? "ON" : "OFF"}
      </button>

      <div className="flex gap-2">
        <button type="button" onClick={cancel} className="flex-1 min-h-10 rounded-xl border bg-white text-xs font-bold uppercase">Cancel</button>
        <button type="button" disabled={busy} onClick={save} className="flex-1 min-h-10 rounded-xl bg-black text-white text-xs font-bold uppercase">
          {busy ? <Loader2 size={13} className="inline animate-spin" /> : <Check size={13} className="inline mr-1" />}Save
        </button>
      </div>
    </div>
  );
}

function HubEditor({ value, setValue, save, cancel, busy }: { value: any; setValue: (v: any) => void; save: () => void; cancel: () => void; busy: boolean }) {
  const set = (patch: Record<string, any>) => setValue({ ...value, ...patch });
  const locate = async () => {
    if (!String(value.address || "").trim()) return toast.error("Enter a warehouse address first.");
    const response = await fetch(`/api/geo/geocode?text=${encodeURIComponent(String(value.address).trim())}`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !Number.isFinite(Number(data.lat)) || !Number.isFinite(Number(data.lon))) return toast.error("Unable to locate this address.");
    set({ latitude: Number(data.lat), longitude: Number(data.lon), address: String(data.formatted || value.address).trim() });
    toast.success("Warehouse location found.");
  };

  return (
    <div className="space-y-3">
      <label className="block"><b className="text-[9px] uppercase text-neutral-500">Warehouse / Hub Name</b><input value={value.name} onChange={(e) => set({ name: e.target.value })} className="mt-1 w-full min-h-10 rounded-xl border px-3 text-xs" placeholder="PRIME Central Logistics Hub" /></label>
      <label className="block"><b className="text-[9px] uppercase text-neutral-500">Address</b><textarea value={value.address} onChange={(e) => set({ address: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border px-3 py-2 text-xs resize-none" placeholder="Full warehouse address" /></label>
      <button type="button" onClick={() => void locate()} className="w-full min-h-10 rounded-xl border bg-white text-[10px] font-bold uppercase"><MapPin size={13} className="inline mr-1" /> Locate Address</button>
      <div className="grid grid-cols-2 gap-2">
        <label className="block"><b className="text-[9px] uppercase text-neutral-500">Latitude</b><input type="number" step="0.000001" value={value.latitude} onChange={(e) => set({ latitude: Number(e.target.value) })} className="mt-1 w-full min-h-10 rounded-xl border px-3 text-xs font-mono" /></label>
        <label className="block"><b className="text-[9px] uppercase text-neutral-500">Longitude</b><input type="number" step="0.000001" value={value.longitude} onChange={(e) => set({ longitude: Number(e.target.value) })} className="mt-1 w-full min-h-10 rounded-xl border px-3 text-xs font-mono" /></label>
      </div>
      <button type="button" onClick={() => set({ active: !value.active })} className={`w-full min-h-10 rounded-xl border text-[10px] font-bold uppercase ${value.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>Hub Status: {value.active ? "ACTIVE" : "INACTIVE"}</button>
      <button type="button" onClick={save} disabled={busy} className="w-full min-h-10 rounded-xl bg-black text-white text-xs font-bold uppercase">{busy ? <Loader2 size={13} className="inline animate-spin" /> : <Check size={13} className="inline mr-1" />}Save Hub</button>
      <button type="button" onClick={cancel} className="w-full min-h-10 rounded-xl border bg-white text-xs font-bold uppercase">Cancel</button>
    </div>
  );
}

export default function CourierPage() {
  const nav = useNavigate();
  const { couriers, loading: courierLoading, addCourier, updateCourier, removeCourier } = useCouriers();
  const { hubs, loading: hubLoading, addHub, updateHub, removeHub, setDefaultHub } = useHubLocations();
  const [providerOpen, setProviderOpen] = useState(false);
  const [newProvider, setNewProvider] = useState({ ...EMPTY_PROVIDER });
  const [newFile, setNewFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editProvider, setEditProvider] = useState<any>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [hubOpen, setHubOpen] = useState(false);
  const [newHub, setNewHub] = useState({ ...EMPTY_HUB });
  const [editHubId, setEditHubId] = useState<string | null>(null);
  const [editHub, setEditHub] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const addProvider = async () => {
    if (!newProvider.name.trim() || !newFile) return toast.error("Provider name and actual image are required.");
    setBusy(true);
    try {
      const logoUrl = await uploadLogo(newFile, newProvider.name);
      await addCourier({ ...newProvider, name: newProvider.name.trim(), logoUrl });
      toast.success("Delivery provider added.");
      setNewProvider({ ...EMPTY_PROVIDER });
      setNewFile(null);
      setProviderOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Unable to save provider.");
    } finally { setBusy(false); }
  };

  const editProviderSave = async () => {
    if (!editId || !editProvider?.name.trim()) return;
    setBusy(true);
    try {
      const logoUrl = editFile ? await uploadLogo(editFile, editProvider.name) : editProvider.logoUrl;
      await updateCourier(editId, { ...editProvider, name: editProvider.name.trim(), logoUrl });
      toast.success("Delivery provider updated.");
      setEditId(null); setEditProvider(null); setEditFile(null);
    } catch (error: any) {
      toast.error(error?.message || "Unable to update provider.");
    } finally { setBusy(false); }
  };

  const saveHub = async () => {
    if (!newHub.name.trim() || !newHub.address.trim()) return toast.error("Hub name and address are required.");
    setBusy(true);
    try { await addHub({ ...newHub, name: newHub.name.trim(), address: newHub.address.trim() }); toast.success("Hub location added."); setNewHub({ ...EMPTY_HUB }); setHubOpen(false); }
    catch (error: any) { toast.error(error?.message || "Unable to save hub location."); }
    finally { setBusy(false); }
  };

  const saveEditedHub = async () => {
    if (!editHubId || !editHub?.name.trim() || !editHub?.address.trim()) return;
    setBusy(true);
    try { await updateHub(editHubId, { ...editHub, name: editHub.name.trim(), address: editHub.address.trim() }); toast.success("Hub location updated."); setEditHubId(null); setEditHub(null); }
    catch (error: any) { toast.error(error?.message || "Unable to update hub location."); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-neutral-50 px-3 py-3 pb-12">
      <div className="w-full max-w-xl mx-auto space-y-4">
        <header className="flex items-start gap-2 border-b pb-3">
          <button type="button" onClick={() => nav("/admin")} className="w-9 h-9 rounded-xl border bg-white flex items-center justify-center"><ArrowLeft size={17} /></button>
          <div className="flex-1"><div className="text-[9px] uppercase tracking-[.2em] text-neutral-500 font-bold">ADMIN · LOGISTICS</div><h1 className="text-lg font-bold uppercase">Logistics Configurator</h1><p className="text-[11px] text-neutral-500">Delivery providers and default warehouse hubs. Compact vertical layout.</p></div>
        </header>

        <section className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <div className="p-3 flex items-center justify-between gap-2 border-b"><div><div className="text-[9px] uppercase tracking-[.16em] text-neutral-500 font-bold">Delivery Providers</div><div className="text-sm font-bold uppercase">Courier Configurations</div></div><button type="button" onClick={() => setProviderOpen((v) => !v)} className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center"><Plus size={17} /></button></div>
          {providerOpen && <div className="p-3 border-b bg-neutral-50"><ProviderEditor value={newProvider} setValue={setNewProvider} file={newFile} setFile={setNewFile} save={() => void addProvider()} cancel={() => setProviderOpen(false)} busy={busy} requireImage /></div>}
          <div className="p-3">
            {courierLoading ? <CourierListSkeleton count={3} /> : couriers.length === 0 ? <div className="text-center text-xs text-neutral-500 py-8">No delivery providers configured yet.</div> : <div className="space-y-3">{couriers.map((courier) => editId === courier.id && editProvider ? <div key={courier.id} className="rounded-2xl border bg-neutral-50 p-3"><ProviderEditor value={editProvider} setValue={setEditProvider} file={editFile} setFile={setEditFile} save={() => void editProviderSave()} cancel={() => { setEditId(null); setEditProvider(null); setEditFile(null); }} busy={busy} /></div> : <article key={courier.id} className="rounded-2xl border bg-white overflow-hidden"><div className="aspect-[16/7] bg-neutral-100">{courier.logoUrl ? <img src={courier.logoUrl} alt={courier.name} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-neutral-400"><ImagePlus /></div>}</div><div className="p-3 space-y-2.5"><div className="flex justify-between gap-2"><div className="min-w-0"><div className="font-bold text-sm uppercase truncate">{courier.name}</div><div className="text-[10px] text-neutral-500">{String(courier.deliveryType || courier.tier || "STANDARD")} · {formatCurrency(Number(courier.baseFare) || 0)} base + {formatCurrency(Number(courier.minimumFare) || 0)} min</div></div><span className={`text-[9px] font-bold uppercase ${courier.isAvailable ? "text-emerald-600" : "text-neutral-400"}`}>{courier.isAvailable ? "ACTIVE" : "PAUSED"}</span></div><div className="grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl border bg-neutral-50 p-2"><b className="text-neutral-500">MIN DISTANCE</b><div className="font-mono font-bold">{Number(courier.minimumDistanceKm || 0).toFixed(1)} KM</div></div><div className="rounded-xl border bg-neutral-50 p-2"><b className="text-neutral-500">EXCESS/KM</b><div className="font-mono font-bold">{formatCurrency(Number(courier.excessPerKm || 0))}</div></div></div><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => { setEditId(courier.id); setEditProvider({ ...courier }); }} className="min-h-10 rounded-xl bg-black text-white text-[10px] font-bold uppercase">Edit</button><button type="button" onClick={() => void updateCourier(courier.id, { isAvailable: !courier.isAvailable })} className="min-h-10 rounded-xl border text-[10px] font-bold uppercase">{courier.isAvailable ? "Pause" : "Activate"}</button><button type="button" onClick={() => void removeCourier(courier.id).then(() => toast.success("Provider removed."))} className="min-h-10 rounded-xl border border-rose-200 text-rose-700"><Trash2 size={15} className="mx-auto" /></button></div></div></article>)}</div>}
          </div>
        </section>

        <section className="rounded-2xl border bg-white overflow-hidden shadow-sm">
          <div className="p-3 flex items-center justify-between gap-2 border-b"><div><div className="text-[9px] uppercase tracking-[.16em] text-neutral-500 font-bold">Hub Configuration</div><div className="text-sm font-bold uppercase">Warehouse / Delivery Origin</div><p className="text-[10px] text-neutral-500 mt-1">The default active hub is used as the starting point for delivery-distance calculation.</p></div><button type="button" onClick={() => setHubOpen((v) => !v)} className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center"><Plus size={17} /></button></div>
          {hubOpen && <div className="p-3 border-b bg-neutral-50"><HubEditor value={newHub} setValue={setNewHub} save={() => void saveHub()} cancel={() => setHubOpen(false)} busy={busy} /></div>}
          <div className="p-3 space-y-3">
            {hubLoading ? <div className="text-xs text-neutral-500 py-6 text-center">Loading hub locations…</div> : hubs.length === 0 ? <div className="text-xs text-neutral-500 py-6 text-center">No warehouse hubs configured.</div> : hubs.map((hub: HubLocation) => editHubId === hub.id && editHub ? <div key={hub.id} className="rounded-2xl border bg-neutral-50 p-3"><HubEditor value={editHub} setValue={setEditHub} save={() => void saveEditedHub()} cancel={() => { setEditHubId(null); setEditHub(null); }} busy={busy} /></div> : <article key={hub.id} className="rounded-2xl border p-3"><div className="flex justify-between gap-2"><div><div className="text-sm font-bold uppercase">{hub.name}</div><div className="text-[11px] text-neutral-600 mt-1">{hub.address}</div><div className="text-[9px] text-neutral-400 font-mono mt-1">{hub.latitude.toFixed(6)}, {hub.longitude.toFixed(6)}</div></div><span className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase ${hub.isDefault ? "bg-black text-white" : "bg-neutral-100 text-neutral-500"}`}>{hub.isDefault ? "DEFAULT" : "AVAILABLE"}</span></div><div className="grid grid-cols-3 gap-2 mt-3"><button type="button" onClick={() => setDefaultHub(hub.id).then(() => toast.success("Default warehouse updated."))} disabled={hub.isDefault || !hub.active} className="min-h-10 rounded-xl bg-black text-white text-[9px] font-bold uppercase disabled:opacity-30">Set Default</button><button type="button" onClick={() => { setEditHubId(hub.id); setEditHub({ ...hub }); }} className="min-h-10 rounded-xl border text-[9px] font-bold uppercase">Edit</button><button type="button" onClick={() => void removeHub(hub.id).then(() => toast.success("Hub removed."))} className="min-h-10 rounded-xl border border-rose-200 text-rose-700"><Trash2 size={15} className="mx-auto" /></button></div></article>)}
          </div>
        </section>
      </div>
    </div>
  );
}
