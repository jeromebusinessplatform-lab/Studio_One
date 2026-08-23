export interface Courier {
  id: string;
  name: string;
  tier?: "STANDARD" | "EXPRESS" | "PRIORITY";
  deliveryType?: "STANDARD" | "EXPRESS" | "PRIORITY";
  priorityFee?: number;
  expressFee?: number;
  logoUrl: string;
  isAvailable: boolean;
  baseFare: number;
  baseDistanceKm: number;
  perKmCharge: number;
  platformFeeEnabled: boolean;
  platformFee: number;
  nightDifferentialEnabled: boolean;
  nightDifferentialFee: number;
  surchargeEnabled: boolean;
  surchargeFee: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryCharge {
  totalAmount: number;
}
