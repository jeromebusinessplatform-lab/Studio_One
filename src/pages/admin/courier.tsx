import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCouriers, type Courier } from "@/hooks/useCouriers";
import {
  Truck,
  Plus,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Clock,
  ShieldCheck,
  Phone,
  Bike,
} from "lucide-react";
import { CourierListSkeleton } from "@/components/admin/CourierListSkeleton.tsx";
import { formatCurrency } from "@/lib/utils.ts";
import { toast } from "sonner";

const COURIER_PRESETS = [
  {
    name: "PRIME In-House Express",
    baseFare: 60,
    baseDistanceKm: 4,
    perKmCharge: 12,
    platformFeeEnabled: false,
    platformFee: 0,
    nightDifferentialEnabled: true,
    nightDifferentialFee: 30,
    surchargeEnabled: false,
    surchargeFee: 0,
    logoUrl: "/primelogo.png",
  },
  {
    name: "Lalamove 2-Wheel",
    baseFare: 70,
    baseDistanceKm: 3,
    perKmCharge: 15,
    platformFeeEnabled: true,
    platformFee: 10,
    nightDifferentialEnabled: true,
    nightDifferentialFee: 40,
    surchargeEnabled: true,
    surchargeFee: 20,
    logoUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=120&auto=format&fit=crop&q=80",
  },
  {
    name: "GrabExpress Flash",
    baseFare: 80,
    baseDistanceKm: 5,
    perKmCharge: 18,
    platformFeeEnabled: true,
    platformFee: 15,
    nightDifferentialEnabled: false,
    nightDifferentialFee: 0,
    surchargeEnabled: false,
    surchargeFee: 0,
    logoUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=120&auto=format&fit=crop&q=80",
  },
];

export default function CourierPage() {
  const navigate = useNavigate();
  const { couriers, loading, updateCourier, addCourier, removeCourier } = useCouriers();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    baseFare: 60,
    baseDistanceKm: 4,
    perKmCharge: 12,
    platformFeeEnabled: false,
    platformFee: 0,
    nightDifferentialEnabled: false,
    nightDifferentialFee: 0,
    surchargeEnabled: false,
    surchargeFee: 0,
    logoUrl: "",
  });

  const handleApplyPreset = (preset: (typeof COURIER_PRESETS)[0]) => {
    setFormData({
      ...preset,
    });
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter courier name.");
      return;
    }

    try {
      await addCourier({
        ...formData,
        logoUrl:
          formData.logoUrl ||
          "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=120&auto=format&fit=crop&q=80",
        isAvailable: true,
      });
      setShowAddForm(false);
      setFormData({
        name: "",
        baseFare: 60,
        baseDistanceKm: 4,
        perKmCharge: 12,
        platformFeeEnabled: false,
        platformFee: 0,
        nightDifferentialEnabled: false,
        nightDifferentialFee: 0,
        surchargeEnabled: false,
        surchargeFee: 0,
        logoUrl: "",
      });
      toast.success("Courier fleet profile created.");
    } catch {
      toast.error("Failed to create courier.");
    }
  };

  return (
    <div className="p-3 sm:p-4 w-full max-w-full space-y-3 bg-white text-black min-h-screen font-condensed">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="p-1 text-neutral-500 hover:text-black rounded"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
              COURIER & LOGISTICS FLEET
            </h1>
            <p className="text-[11px] text-neutral-500 font-sans">
              Delivery pricing formulas, fleet availability, and dispatch settings
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-white text-xs uppercase rounded-lg hover:bg-neutral-800"
        >
          <Plus size={13} /> {showAddForm ? "Cancel" : "Add Courier"}
        </button>
      </div>

      {/* Add Courier Form */}
      {showAddForm && (
        <form onSubmit={handleAddCourier} className="p-3 bg-neutral-50 rounded-xl border border-neutral-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-neutral-700">Add Courier Partner</span>
            <div className="flex gap-1 overflow-x-auto">
              {COURIER_PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2 py-0.5 bg-white border border-neutral-300 text-neutral-700 text-[10px] rounded hover:bg-neutral-100 whitespace-nowrap"
                >
                  Preset: {p.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-sans">
            <div>
              <label className="text-[10px] font-condensed uppercase text-neutral-600 block mb-0.5">
                Courier / Fleet Name
              </label>
              <input
                type="text"
                placeholder="e.g. Lalamove Priority"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="text-[10px] font-condensed uppercase text-neutral-600 block mb-0.5">
                Logo / Avatar Image URL
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 font-sans font-mono">
            <div>
              <label className="text-[10px] font-condensed uppercase text-neutral-600 block mb-0.5">
                Base Fare (₱)
              </label>
              <input
                type="number"
                min="0"
                value={formData.baseFare}
                onChange={(e) => setFormData({ ...formData, baseFare: Number(e.target.value) })}
                className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-condensed uppercase text-neutral-600 block mb-0.5">
                Base Dist (km)
              </label>
              <input
                type="number"
                min="1"
                value={formData.baseDistanceKm}
                onChange={(e) => setFormData({ ...formData, baseDistanceKm: Number(e.target.value) })}
                className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-condensed uppercase text-neutral-600 block mb-0.5">
                Per KM (₱)
              </label>
              <input
                type="number"
                min="0"
                value={formData.perKmCharge}
                onChange={(e) => setFormData({ ...formData, perKmCharge: Number(e.target.value) })}
                className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 font-condensed uppercase">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 text-xs border border-neutral-300 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1 text-xs bg-black text-white rounded-lg hover:bg-neutral-800"
            >
              Save Courier
            </button>
          </div>
        </form>
      )}

      {/* Courier Fleets Grid */}
      {loading ? (
        <CourierListSkeleton count={3} />
      ) : (
        <div className="space-y-2">
          {couriers.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-400 font-sans">
              No couriers configured yet. Add your first courier above.
            </div>
          ) : (
            couriers.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-neutral-200 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs hover:border-neutral-400 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50 flex items-center justify-center shrink-0">
                    <img src={c.logoUrl} alt={c.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-neutral-900 truncate uppercase">{c.name}</div>
                    <div className="text-[11px] text-neutral-500 font-sans mt-0.5">
                      Base: <span className="font-mono font-bold text-black">{formatCurrency(c.baseFare)}</span> ({c.baseDistanceKm}km) • +{formatCurrency(c.perKmCharge)}/km
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCourier(c.id, { isAvailable: !c.isAvailable })}
                    className={`text-[11px] px-2.5 py-1 rounded-lg uppercase border font-bold ${
                      c.isAvailable
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-rose-50 text-rose-800 border-rose-300"
                    }`}
                  >
                    {c.isAvailable ? "Online" : "Paused"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCourier(c.id)}
                    className="p-1 text-neutral-400 hover:text-red-600 cursor-pointer"
                    title="Delete courier"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
