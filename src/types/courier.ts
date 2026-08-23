export interface Courier {
  id: string;
  name: string;
  tier?: "STANDARD" | "EXPRESS" | "PRIORITY";
  logoUrl: string;
  isAvailable: boolean;
  baseFare: number;
  baseDistanceKm: number; // Defaults to 4
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
