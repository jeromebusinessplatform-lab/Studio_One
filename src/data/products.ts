export interface BundleItemConfig {
  productId: string;
  pricingType: "fixed" | "percentage_off";
  customPrice?: number;
  discountPercent?: number;
}

export type ProductSpecifications = Record<string, string | number | boolean>;

export interface Product {
  _id: string;
  name: string;
  subname?: string;
  description?: string;
  image?: string;
  price: number;
  salePrice?: number;
  costing?: number;
  stock: number;
  available: boolean;
  badge?: "NEW" | "SALE" | "LOW_STOCK";
  badgeExpiry?: string;
  category?: string;
  sortOrder?: number;
  specifications?: ProductSpecifications;
  ratingAverage?: number;
  ratingCount?: number;
  allowComparison?: boolean;
  sku?: string;

  // Combination / Bundle configuration
  isCombination?: boolean;
  bundleItems?: BundleItemConfig[];
  bundleCalculatedPrice?: number;
}

export function isBadgeActive(badge?: string, badgeExpiry?: string): boolean {
  if (!badge) return false;
  if (!badgeExpiry) return true;
  try {
    const expiryTime = new Date(badgeExpiry).getTime();
    if (isNaN(expiryTime)) return true;
    return expiryTime > Date.now();
  } catch {
    return true;
  }
}

export const INITIAL_CATEGORIES = [
  "Audio",
  "Smart Wearables",
  "Cameras",
  "Accessories",
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    _id: "prod-1", name: "BLAU Digital Smartwatch", subname: "Smart Wearables", description: "Premium digital fitness smartwatch with high-contrast screen and silicone sport band.", price: 129.99, stock: 99, available: true, badge: "NEW", category: "Smart Wearables", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80", sortOrder: 1,
    specifications: { Display: "1.9\" HD", Battery: "7 days", Connectivity: "Bluetooth 5.3", WaterResistance: "5 ATM" }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-2", name: "Wireless Headphones", subname: "High Quality Sound", description: "Active noise-cancelling wireless headphones with deep bass acoustics.", price: 149.99, salePrice: 119.99, stock: 15, available: true, badge: "SALE", category: "Audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", sortOrder: 2,
    specifications: { Driver: "40mm", Battery: "35 hours", Connectivity: "Bluetooth 5.2", NoiseCancellation: "Active" }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-3", name: "DSLR 4K Camera", subname: "24.2MP • 1080p Full HD", description: "High-resolution digital camera with optical stabilization and ultra-fast autofocus.", price: 549.99, stock: 7, available: true, badge: "LOW_STOCK", category: "Cameras", image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80", sortOrder: 3,
    specifications: { Sensor: "24.2MP", Video: "4K UHD", Stabilization: "Optical", Autofocus: "Fast AF" }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-4", name: "Wireless Earbuds Pro", subname: "Noise Cancellation", description: "Ultra-compact true wireless stereo earbuds with immersive noise cancellation.", price: 149.99, stock: 45, available: true, badge: "NEW", category: "Audio", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80", sortOrder: 4,
    specifications: { Battery: "28 hours with case", Connectivity: "Bluetooth 5.3", NoiseCancellation: "Active", Charging: "USB-C" }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-5", name: "Portable Speaker", subname: "Waterproof • 360° Sound", description: "Rugged waterproof Bluetooth speaker with 360-degree spatial sound and hanging loop.", price: 99.99, salePrice: 79.99, stock: 22, available: true, badge: "SALE", category: "Audio", image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&auto=format&fit=crop&q=80", sortOrder: 5,
    specifications: { Output: "20W", Battery: "12 hours", Waterproof: "IPX7", Connectivity: "Bluetooth 5.0" }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-6", name: "Power Bank 10000mAh", subname: "Dual USB • Fast Charge", description: "Slimline 10000mAh high-speed power bank with dual USB ports and battery level indicators.", price: 39.99, stock: 120, available: true, category: "Accessories", image: "https://images.unsplash.com/photo-1609592424364-75468d6f5195?w=600&auto=format&fit=crop&q=80", sortOrder: 6,
    specifications: { Capacity: "10000mAh", Output: "20W", Ports: "2x USB + USB-C", FastCharge: true }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-7", name: "Minimalist Mechanical Keyboard", subname: "RGB Backlit • Hot Swappable", description: "Tactile compact 75% mechanical keyboard with customized linear switches.", price: 89.99, salePrice: 74.99, stock: 18, available: true, badge: "SALE", category: "Accessories", image: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80", sortOrder: 7,
    specifications: { Layout: "75%", Switches: "Hot-swappable", Backlight: "RGB", Connection: "USB-C" }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-8", name: "Ultra-thin Power Hub", subname: "7-in-1 USB-C Dock", description: "Aluminum 4K HDMI, SD card reader, 100W PD passthrough multifunction adapter.", price: 49.99, stock: 35, available: true, category: "Accessories", image: "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=600&auto=format&fit=crop&q=80", sortOrder: 8,
    specifications: { Ports: "7-in-1", Video: "4K HDMI", PowerDelivery: "100W", Housing: "Aluminum" }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-9", name: "4K Action Cam Extreme", subname: "Waterproof to 30m • EIS", description: "Ultra-wide lens action sports camera with dual screens and electronic image stabilization.", price: 199.99, costing: 110, stock: 4, available: true, badge: "LOW_STOCK", category: "Cameras", image: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80", sortOrder: 9,
    specifications: { Video: "4K", Waterproof: "30m", Stabilization: "EIS", Lens: "Ultra-wide" }, ratingAverage: 4.8, ratingCount: 12,
  },
  {
    _id: "prod-combo-1", name: "Creator Studio Duo Bundle", subname: "Suggested Bundle • Save 22%", description: "Special promotional bundle including Wireless Headphones and Power Bank at a discounted combination price.", price: 159.98, costing: 90, stock: 12, available: true, badge: "SALE", badgeExpiry: "2026-12-31T23:59", category: "Audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80", sortOrder: 10,
    specifications: { Bundle: "Creator Studio Duo", Included: "Wireless Headphones + Power Bank", Savings: "22%" }, ratingAverage: 4.9, ratingCount: 8,
    isCombination: true,
    bundleItems: [{ productId: "prod-2", pricingType: "percentage_off", discountPercent: 20 }, { productId: "prod-6", pricingType: "fixed", customPrice: 29.99 }],
    bundleCalculatedPrice: 149.98,
  },
];
