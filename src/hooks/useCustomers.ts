import { useCallback, useEffect, useState } from "react";

export type VipTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface Customer {
  id: string;
  telegramUserId: string;
  telegramDisplayName: string;
  telegramUsername?: string;
  avatarUrl?: string;
  manualAvatarOverride?: boolean;
  primeMemberId: string;
  vipTier: VipTier;
  points: number;
  pointsBalance: number;
  memberSince: number;
  referrals: number;
  totalSpending: number;
  totalDiscounts?: number;
  appliedDiscounts?: Array<{ code: string; amountSaved: number; orderNumber: string; date: number }>;
  referees?: string[];
  referredBy?: string | null;
  orderCount: number;
  lastOrderAt?: number;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/customers", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load customers");
      const list = Array.isArray(data.customers)
        ? data.customers.map((d: any) => {
            const pts = Number(d.pointsBalance ?? d.points ?? 0);
            const primeMemberId = String(d.primeMemberId || "").trim().toUpperCase();
            return {
              id: String(d.id),
              telegramUserId: String(d.telegramUserId || d.id),
              telegramDisplayName: String(d.telegramDisplayName || "Unknown"),
              telegramUsername: d.telegramUsername || undefined,
              avatarUrl: d.avatarUrl || undefined,
              manualAvatarOverride: !!d.manualAvatarOverride,
              primeMemberId: /^[A-Z0-9]{10}$/.test(primeMemberId) ? primeMemberId : "—",
              vipTier: (d.vipTier || "Bronze") as VipTier,
              points: pts,
              pointsBalance: pts,
              memberSince: Number(d.memberSince || Date.now()),
              referrals: Number(d.referrals || 0),
              totalSpending: Number(d.totalSpending || 0),
              totalDiscounts: Number(d.totalDiscounts || 0),
              appliedDiscounts: Array.isArray(d.appliedDiscounts) ? d.appliedDiscounts : [],
              referees: Array.isArray(d.referees) ? d.referees : [],
              referredBy: d.referredBy ? String(d.referredBy) : null,
              orderCount: Number(d.orderCount || 0),
              lastOrderAt: d.lastOrderAt ? Number(d.lastOrderAt) : undefined,
            };
          })
        : [];
      setCustomers(list);
    } catch (e) {
      console.error(e);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateCustomerAvatar = useCallback(async (id: string, avatarUrl: string, manualAvatarOverride: boolean = true) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, avatarUrl, manualAvatarOverride } : c)));
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl, manualAvatarOverride }),
      });
      if (!res.ok) throw new Error("Failed to update avatar on server");
    } catch (err) {
      console.error("updateCustomerAvatar error:", err);
      throw err;
    }
  }, []);

  const updateCustomerVip = useCallback(async (id: string, vipTier: VipTier) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, vipTier } : c)));
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vipTier }),
      });
      if (!res.ok) throw new Error("Failed to update VIP tier on server");
    } catch (err) {
      console.error("updateCustomerVip error:", err);
      throw err;
    }
  }, []);

  const updateCustomerPoints = useCallback(async (id: string, pointsBalance: number) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, points: pointsBalance, pointsBalance } : c)));
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsBalance, points: pointsBalance }),
      });
      if (!res.ok) throw new Error("Failed to update points on server");
    } catch (err) {
      console.error("updateCustomerPoints error:", err);
      throw err;
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to delete customer on server");
    } catch (err) {
      console.error("deleteCustomer error:", err);
      throw err;
    }
  }, []);

  const batchUpdateVip = useCallback(async (ids: string[], vipTier: VipTier) => {
    if (!ids.length) return;
    setCustomers((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, vipTier } : c)));
    try {
      const res = await fetch("/api/admin/customers/batch", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_vip", ids, vipTier }) });
      if (!res.ok) throw new Error("Failed to batch update VIP tiers");
    } catch (err) {
      console.error("batchUpdateVip error:", err);
      throw err;
    }
  }, []);

  const batchAdjustPoints = useCallback(async (ids: string[], pointsDelta: number) => {
    if (!ids.length) return;
    setCustomers((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, points: Math.max(0, (c.pointsBalance || c.points || 0) + pointsDelta), pointsBalance: Math.max(0, (c.pointsBalance || c.points || 0) + pointsDelta) } : c));
    try {
      const res = await fetch("/api/admin/customers/batch", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "adjust_points", ids, pointsDelta }) });
      if (!res.ok) throw new Error("Failed to batch adjust customer points");
    } catch (err) {
      console.error("batchAdjustPoints error:", err);
      throw err;
    }
  }, []);

  const batchDeleteCustomers = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    setCustomers((prev) => prev.filter((c) => !ids.includes(c.id)));
    try {
      const res = await fetch("/api/admin/batch-delete", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: "customers", ids }) });
      if (!res.ok) await fetch("/api/admin/customers/batch", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", ids }) });
    } catch (err) {
      console.error("batchDeleteCustomers error:", err);
      throw err;
    }
  }, []);

  return { customers, loading, refresh: load, updateCustomerAvatar, updateCustomerVip, updateCustomerPoints, deleteCustomer, batchUpdateVip, batchAdjustPoints, batchDeleteCustomers };
}
