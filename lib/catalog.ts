import { Product } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-prime-hoodie',
    name: 'Stealth Tech Hoodie',
    price: 89,
    imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80',
    description: 'Thermo-regulated matte black technical weave with magnetic neck latch and hidden internal passport stash.',
    category: 'Apparel',
    stock: 14,
    bundleConfig: {
      bundleSize: 2,
      discountPercent: 15,
      tieredDiscounts: [
        { quantity: 2, discountPercent: 15 },
        { quantity: 3, discountPercent: 25 },
      ],
    },
  },
  {
    id: 'prod-cyber-buds',
    name: 'Cybernetic Earbuds',
    price: 129,
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=80',
    description: 'Beryllium-plated drivers, ultra-low latency game sync mode, and forged titanium charging chassis.',
    category: 'Hardware',
    stock: 8,
    bundleConfig: {
      bundleSize: 2,
      discountPercent: 10,
      tieredDiscounts: [
        { quantity: 2, discountPercent: 10 },
      ],
    },
  },
  {
    id: 'prod-faraday-pouch',
    name: 'Faraday Shield Bag',
    price: 45,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
    description: 'Military grade RF, RFID & GPS signal blocking EDC pouch. Impervious to wireless skimming and telemetry.',
    category: 'EDC Gear',
    stock: 22,
    bundleConfig: {
      bundleSize: 3,
      discountPercent: 20,
      tieredDiscounts: [
        { quantity: 2, discountPercent: 10 },
        { quantity: 3, discountPercent: 20 },
      ],
    },
  },
  {
    id: 'prod-tactical-cargo',
    name: 'Apex Tactical Cargo',
    price: 110,
    imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80',
    description: 'Ripstop Cordura fabric with reinforced knee articulators, 8 modular pouch docks, and hydrophobic finish.',
    category: 'Apparel',
    stock: 5,
    bundleConfig: {
      bundleSize: 2,
      discountPercent: 15,
    },
  },
  {
    id: 'prod-focus-fuel',
    name: 'PRIME Nootropic Fuel',
    price: 38,
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    description: 'L-Theanine, Lion’s Mane, and Alpha-GPC cognitive supplement for clean sustained cognitive focus without jitters.',
    category: 'Nutrition',
    stock: 40,
    bundleConfig: {
      bundleSize: 3,
      discountPercent: 25,
      tieredDiscounts: [
        { quantity: 2, discountPercent: 15 },
        { quantity: 3, discountPercent: 25 },
        { quantity: 5, discountPercent: 35 },
      ],
    },
  },
  {
    id: 'prod-titanium-keyring',
    name: 'Titanium Carabiner',
    price: 32,
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop&q=80',
    description: 'CNC milled aerospace Grade 5 titanium spring carabiner with integrated pry bar and bottle lever.',
    category: 'EDC Gear',
    stock: 0, // OUT OF STOCK test
    bundleConfig: {
      bundleSize: 2,
      discountPercent: 10,
    },
  },
  {
    id: 'prod-smart-tumbler',
    name: 'Insulated Flask 750ml',
    price: 42,
    imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80',
    description: 'Double-walled vacuum insulated canteen maintaining temperature for 36 hours. Matte powder-coated exterior.',
    category: 'Hardware',
    stock: 19,
    bundleConfig: {
      bundleSize: 2,
      discountPercent: 15,
    },
  },
  {
    id: 'prod-tactical-crossbody',
    name: 'Sling Pack Pro',
    price: 68,
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=80',
    description: 'Ambidextrous quick-release Fidlock magnetic clasp, weatherproof YKK AquaGuard zippers, and padded tech sleeve.',
    category: 'EDC Gear',
    stock: 11,
    bundleConfig: {
      bundleSize: 2,
      discountPercent: 15,
    },
  },
  {
    id: 'prod-electrolyte-matrix',
    name: 'Electrolyte Matrix 30-Pack',
    price: 34,
    imageUrl: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=600&auto=format&fit=crop&q=80',
    description: 'Optimal ratio sodium, potassium, and magnesium formula with zero artificial sweeteners or food dyes.',
    category: 'Nutrition',
    stock: 0, // OUT OF STOCK
    bundleConfig: {
      bundleSize: 2,
      discountPercent: 10,
    },
  },
];
