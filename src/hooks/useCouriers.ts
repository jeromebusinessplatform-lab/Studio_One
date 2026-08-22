import { useState, useEffect } from "react";
import { collection, onSnapshot, query, doc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Courier } from "../types/courier";

export function useCouriers() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "couriers"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Courier[];
        setCouriers(data);
        setLoading(false);
      },
      (error) => {
        console.error("Couriers listener error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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
    await addDoc(collection(db, "couriers"), courier);
  };

  const updateCourier = async (id: string, updates: Partial<Courier>) => {
    await updateDoc(doc(db, "couriers", id), updates);
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
