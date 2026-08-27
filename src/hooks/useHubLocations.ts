import { useCallback, useEffect, useState } from "react";
import type { HubLocation } from "@/types/courier";

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

export function useHubLocations() {
  const [hubs, setHubs] = useState<HubLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("/api/logistics/hubs");
      setHubs(Array.isArray(data.hubs) ? data.hubs : []);
    } catch (error) {
      console.error("Hub location API load failed:", error);
      setHubs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const addHub = async (hub: Omit<HubLocation, "id" | "createdAt" | "updatedAt">) => {
    const data = await api("/api/admin/logistics/hubs", { method: "POST", body: JSON.stringify(hub) });
    await refresh();
    return data;
  };

  const updateHub = async (id: string, updates: Partial<HubLocation>) => {
    const { id: _, createdAt: __, updatedAt: ___, ...rest } = updates;
    const data = await api(`/api/admin/logistics/hubs/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(rest) });
    await refresh();
    return data;
  };

  const removeHub = async (id: string) => {
    const data = await api(`/api/admin/logistics/hubs/${encodeURIComponent(id)}`, { method: "DELETE" });
    await refresh();
    return data;
  };

  const setDefaultHub = async (id: string) => {
    const data = await api(`/api/admin/logistics/hubs/${encodeURIComponent(id)}/default`, { method: "POST" });
    await refresh();
    return data;
  };

  return { hubs, loading, refresh, addHub, updateHub, removeHub, setDefaultHub };
}
