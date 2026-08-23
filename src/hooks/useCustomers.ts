import { useCallback, useEffect, useState } from "react";

export type VipTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface Customer {
  id: string;
  telegramUserId: string;
  telegramDisplayName: string;
  telegramUsername?: string;
  primeMemberId: string;
  vipTier: VipTier;
  points: number;
  pointsBalance: number;
  memberSince: number;
  referrals: number;
  totalSpending: number;
  orderCount: number;
  lastOrderAt?: number;
}

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/customers", { credentials: "same-origin" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load customers");
      const list = Array.isArray(data.customers)
        ? data.customers.map((d: any) => {
            const pts = Number(d.pointsBalance ?? d.points ?? 0);
            return {
              id: String(d.id),
              telegramUserId: String(d.telegramUserId || d.id),
              telegramDisplayName: String(d.telegramDisplayName || "Unknown"),
              telegramUsername: d.telegramUsername || undefined,
              primeMemberId: String(d.primeMemberId || `PC${String(d.id).slice(0, 8).toUpperCase()}`),
              vipTier: (d.vipTier || "Bronze") as VipTier,
              points: pts,
              pointsBalance: pts,
              memberSince: Number(d.memberSince || Date.now()),
              referrals: Number(d.referrals || 0),
              totalSpending: Number(d.totalSpending || 0),
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

  const updateCustomerVip = useCallback(async (id: string, vipTier: VipTier) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, vipTier } : c)));
  }, []);

  const updateCustomerPoints = useCallback(async (id: string, pointsBalance: number) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, points: pointsBalance, pointsBalance } : c))
    );
  }, []);

  return {
    customers,
    loading,
    refresh: load,
    updateCustomerVip,
    updateCustomerPoints,
  };
}
