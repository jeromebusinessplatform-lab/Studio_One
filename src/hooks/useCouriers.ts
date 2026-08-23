import { useState, useEffect, useCallback } from "react";
import { Courier } from "../types/courier";
export type { Courier };

const DEFAULT_COURIERS: Courier[] = [
  { id: "courier-1", name: "PRIME In-House Express", baseFare: 60, baseDistanceKm: 4, perKmCharge: 12, platformFeeEnabled: false, platformFee: 0, nightDifferentialEnabled: true, nightDifferentialFee: 30, surchargeEnabled: false, surchargeFee: 0, isAvailable: true, logoUrl: "/primelogo.png" },
  { id: "courier-2", name: "Lalamove 2-Wheel", baseFare: 70, baseDistanceKm: 3, perKmCharge: 15, platformFeeEnabled: true, platformFee: 10, nightDifferentialEnabled: true, nightDifferentialFee: 40, surchargeEnabled: true, surchargeFee: 20, isAvailable: true, logoUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=120&auto=format&fit=crop&q=80" },
  { id: "courier-3", name: "GrabExpress Flash", baseFare: 80, baseDistanceKm: 5, perKmCharge: 18, platformFeeEnabled: true, platformFee: 15, nightDifferentialEnabled: false, nightDifferentialFee: 0, surchargeEnabled: false, surchargeFee: 0, isAvailable: true, logoUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=120&auto=format&fit=crop&q=80" },
];

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

export function useCouriers() {
  const [couriers, setCouriers] = useState<Courier[]>(DEFAULT_COURIERS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/couriers", { method: "GET" });
      setCouriers(Array.isArray(data.couriers) && data.couriers.length ? data.couriers : DEFAULT_COURIERS);
    } catch (error) {
      console.error("Courier API load failed:", error);
      setCouriers(DEFAULT_COURIERS);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const calculateDeliveryCharge = (courier: Courier, distanceKm: number) => {
    if (!courier.isAvailable) return 0;
    let charge = Number(courier.baseFare) || 0;
    charge += Math.max(0, distanceKm - (Number(courier.baseDistanceKm) || 0)) * (Number(courier.perKmCharge) || 0);
    if (courier.platformFeeEnabled) charge += Number(courier.platformFee) || 0;
    if (courier.surchargeEnabled) charge += Number(courier.surchargeFee) || 0;
    const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", hour12: false }).format(new Date()));
    if (courier.nightDifferentialEnabled && (hour >= 22 || hour < 5)) charge += Number(courier.nightDifferentialFee) || 0;
    return Math.round(Math.max(0, charge) * 100) / 100;
  };

  const addCourier = async (courier: Omit<Courier, "id">) => { const data = await api("/api/admin/couriers", { method: "POST", body: JSON.stringify(courier) }); await refresh(); return data; };
  const updateCourier = async (id: string, updates: Partial<Courier>) => { const { id: _, ...rest } = updates; const data = await api(`/api/admin/couriers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(rest) }); await refresh(); return data; };
  const removeCourier = async (id: string) => { const data = await api(`/api/admin/couriers/${encodeURIComponent(id)}`, { method: "DELETE" }); await refresh(); return data; };

  return { couriers, loading, refresh, calculateDeliveryCharge, addCourier, updateCourier, removeCourier };
}
