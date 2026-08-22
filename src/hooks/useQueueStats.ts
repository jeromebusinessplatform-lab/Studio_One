import { useState, useEffect } from "react";

export interface QueueStats {
  onQueue: number;
  processing: number;
  estimatedWaitMinutes: number;
  estimatedDispatchMinutes: number;
  traffic: "LOW" | "MODERATE" | "HIGH";
  isPaused: boolean;
  isAtCapacity: boolean;
  maxConcurrent: number;
}

export const DEFAULT_QUEUE_STATS: QueueStats = {
  onQueue: 6,
  processing: 4,
  estimatedWaitMinutes: 44,
  estimatedDispatchMinutes: 21,
  traffic: "MODERATE",
  isPaused: false,
  isAtCapacity: false,
  maxConcurrent: 50,
};

const QUEUE_STORAGE_KEY = "prime_queue_stats";

export function useQueueStats() {
  const [stats, setStats] = useState<QueueStats>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return DEFAULT_QUEUE_STATS;
        }
      }
    }
    return DEFAULT_QUEUE_STATS;
  });

  const updateStats = (updates: Partial<QueueStats>) => {
    setStats((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return { stats, loading: false, updateStats };
}
