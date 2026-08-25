import { useCallback, useEffect, useState } from "react";

export type LiveQueue = {
  activeOrders: number;
  yourPosition: string | number;
  estimatedWaitTime: number;
  orderTraffic: "LIGHT" | "MODERATE" | "HEAVY";
  activeOrder: { id: string; orderNumber: string; status: string; createdAt: number } | null;
  generatedAt: number;
};

const EMPTY_QUEUE: LiveQueue = {
  activeOrders: 0,
  yourPosition: "--",
  estimatedWaitTime: 1,
  orderTraffic: "LIGHT",
  activeOrder: null,
  generatedAt: 0,
};

export function useLiveQueue() {
  const [queue, setQueue] = useState<LiveQueue>(EMPTY_QUEUE);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/queue/status?_t=${Date.now()}`, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.queue) throw new Error(data.error || "Unable to load queue");
      setQueue(data.queue as LiveQueue);
    } catch (error) {
      console.warn("Live queue load notice:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    const handleVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", handleVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, [load]);

  return { queue, loading, refresh: load };
}
