import { useState, useEffect, useCallback } from "react";
import { Courier } from "../types/courier";
export type { Courier };

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

export function useCouriers() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/couriers", { method: "GET" });
      setCouriers(Array.isArray(data.couriers) ? data.couriers : []);
    } catch (error) {
      console.error("Courier API load failed:", error);
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const calculateDeliveryCharge = (courier: Courier, distanceKm: number) => {
    if (!courier.isAvailable) return 0;
    const minimumDistance = Math.max(0, Number(courier.minimumDistanceKm ?? courier.baseDistanceKm ?? 0));
    const baseFare = Math.max(0, Number(courier.baseFare) || 0);
    const minimumFare = Math.max(0, Number(courier.minimumFare) || 0);
    const excessPerKm = Math.max(0, Number(courier.excessPerKm ?? courier.perKmCharge ?? 0));
    const excessDistance = Math.max(0, Number(distanceKm || 0) - minimumDistance);
    let charge = baseFare + minimumFare + excessDistance * excessPerKm;
    if (courier.platformFeeEnabled) charge += Math.max(0, Number(courier.platformFee) || 0);
    if (courier.surchargeEnabled) charge += Math.max(0, Number(courier.surchargeFee) || 0);
    return Math.round(Math.max(0, charge) * 100) / 100;
  };

  const addCourier = async (courier: Omit<Courier, "id">) => {
    const data = await api("/api/admin/couriers", { method: "POST", body: JSON.stringify(courier) });
    await refresh();
    return data;
  };

  const updateCourier = async (id: string, updates: Partial<Courier>) => {
    const { id: _, ...rest } = updates;
    const data = await api(`/api/admin/couriers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(rest) });
    await refresh();
    return data;
  };

  const removeCourier = async (id: string) => {
    const data = await api(`/api/admin/couriers/${encodeURIComponent(id)}`, { method: "DELETE" });
    await refresh();
    return data;
  };

  return { couriers, loading, refresh, calculateDeliveryCharge, addCourier, updateCourier, removeCourier };
}
