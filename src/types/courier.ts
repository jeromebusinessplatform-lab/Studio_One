export type DeliveryType = "STANDARD" | "EXPRESS" | "PRIORITY";

export interface Courier {
  id: string;
  name: string;
  tier?: DeliveryType;
  deliveryType?: DeliveryType;
  logoUrl: string;
  isAvailable: boolean;
  baseFare: number;
  minimumDistanceKm: number;
  minimumFare: number;
  excessPerKm: number;
  platformFeeEnabled: boolean;
  platformFee: number;
  surchargeEnabled: boolean;
  surchargeFee: number;
  // Legacy fields kept for compatibility with older records/components.
  baseDistanceKm?: number;
  perKmCharge?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryCharge {
  totalAmount: number;
}

export interface HubLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  active: boolean;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}
