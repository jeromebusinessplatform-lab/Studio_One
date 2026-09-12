export interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description: string;
  category: string;
  stock: number;
  bundleConfig?: {
    bundleSize?: number; // e.g., 2
    discountPercent?: number; // e.g., 10 (10% off)
    tieredDiscounts?: { quantity: number; discountPercent: number }[];
  };
}

export interface TelegramUser {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  phone?: string;
}

export interface PrimeUser {
  tgUserId: string;
  tgName: string;
  tgUsername: string;
  phoneNumber?: string;
  primeMemberId: string;
  groups?: string[];
  channels?: string[];
  createdAt: string;
  lastSeen?: string;
}

export interface FingerprintData {
  userId: string;
  deviceId: string;
  enrollmentDate: string;
  lastSeen: string;
  appId: string;
  browser: string;
  graphics: string;
  ipEnrollment: string;
  ipSession: string;
  isp: string;
  vpnDetected: boolean;
  location?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
  };
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  bundleDiscountApplied?: number;
}
