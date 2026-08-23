import { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, updateDoc, addDoc, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Courier } from "../types/courier";
export type { Courier };

function cleanPayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      out[key] = val;
    }
  }
  return out;
}

const DEFAULT_COURIERS: Omit<Courier, "id">[] = [
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
    isAvailable: true,
    logoUrl: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=120&auto=format&fit=crop&q=80",
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
    isAvailable: true,
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
    isAvailable: true,
    logoUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=120&auto=format&fit=crop&q=80",
  },
];

export function useCouriers() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const q = query(collection(db, "couriers"));
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (!isMounted) return;
        if (snapshot.empty) {
          try {
            for (const c of DEFAULT_COURIERS) {
              await addDoc(collection(db, "couriers"), cleanPayload(c));
            }
          } catch (e) {
            console.warn("Could not seed default couriers:", e);
          }
          if (isMounted) {
            setCouriers(DEFAULT_COURIERS.map((c, i) => ({ id: `courier-${i + 1}`, ...c })));
            setLoading(false);
          }
          return;
        }

        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Courier[];
        if (isMounted) {
          setCouriers(data);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Couriers listener error:", error);
        if (isMounted) {
          setCouriers(DEFAULT_COURIERS.map((c, i) => ({ id: `courier-${i + 1}`, ...c })));
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const calculateDeliveryCharge = (courier: Courier, distanceKm: number) => {
    if (!courier.isAvailable) return 0;
    
    // Formula: baseFare + (excessKm * perKmCharge) + platformFee + surchargeFee + (nightDiff ? fee : 0)
    let charge = courier.baseFare;
    
    // Excess KM applies only to distance exceeding baseDistanceKm
    const excessDistance = Math.max(0, distanceKm - courier.baseDistanceKm);
    charge += excessDistance * courier.perKmCharge;
    
    if (courier.platformFeeEnabled) {
      charge += courier.platformFee;
    }
    
    if (courier.surchargeEnabled) {
      charge += courier.surchargeFee;
    }
    
    // Night differential check (10 PM to 5 AM, Manila time)
    const manilaTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    
    const hour = parseInt(manilaTime, 10);
    
    if (courier.nightDifferentialEnabled && (hour >= 22 || hour < 5)) {
      charge += courier.nightDifferentialFee;
    }

    return Math.round(charge * 100) / 100;
  };

  const addCourier = async (courier: Omit<Courier, "id">) => {
    const cleaned = cleanPayload(courier);
    await addDoc(collection(db, "couriers"), cleaned);
  };

  const updateCourier = async (id: string, updates: Partial<Courier>) => {
    const { id: _, ...rest } = updates;
    const cleaned = cleanPayload(rest);
    await updateDoc(doc(db, "couriers", id), cleaned);
  };

  const removeCourier = async (id: string) => {
    await deleteDoc(doc(db, "couriers", id));
  };

  return {
    couriers,
    loading,
    calculateDeliveryCharge,
    addCourier,
    updateCourier,
    removeCourier,
  };
}
