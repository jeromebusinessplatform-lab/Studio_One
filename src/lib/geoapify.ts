export interface GeoLocation {
  id?: string;
  formatted: string;
  street?: string;
  housenumber?: string;
  suburb?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  lat: number;
  lon: number;
  confidence?: number;
  source?: "geoapify" | "fallback";
}

export interface IpLocationInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  postcode: string;
  lat: number;
  lon: number;
  timezone: string;
  source?: "geoapify" | "fallback";
}

export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lon, lat] pairs
  legs?: any[];
  source?: "geoapify" | "fallback";
}

export interface GeoConfig {
  hasApiKey: boolean;
  warehouse: {
    name: string;
    address: string;
    lat: number;
    lon: number;
  };
}

export const PHILIPPINES_LOCATIONS_DATABASE: GeoLocation[] = [
  {
    id: "bgc-highstreet",
    formatted: "Bonifacio High Street, 5th Avenue, BGC, Taguig, Metro Manila, 1634",
    street: "5th Avenue",
    suburb: "Bonifacio Global City",
    city: "Taguig",
    state: "Metro Manila",
    postcode: "1634",
    country: "Philippines",
    lat: 14.5507,
    lon: 121.0477,
  },
  {
    id: "makati-ayala",
    formatted: "Ayala Avenue, Makati CBD, Bel-Air, Makati, Metro Manila, 1226",
    street: "Ayala Avenue",
    suburb: "Bel-Air / CBD",
    city: "Makati",
    state: "Metro Manila",
    postcode: "1226",
    country: "Philippines",
    lat: 14.5547,
    lon: 121.0244,
  },
  {
    id: "makati-rockwell",
    formatted: "Rockwell Center, Hidalgo Drive, Poblacion, Makati, Metro Manila, 1210",
    street: "Hidalgo Drive",
    suburb: "Rockwell Center",
    city: "Makati",
    state: "Metro Manila",
    postcode: "1210",
    country: "Philippines",
    lat: 14.5654,
    lon: 121.0366,
  },
  {
    id: "ortigas-adb",
    formatted: "Ortigas Center, ADB Avenue, San Antonio, Pasig / Mandaluyong, Metro Manila, 1550",
    street: "ADB Avenue",
    suburb: "Ortigas Center",
    city: "Pasig",
    state: "Metro Manila",
    postcode: "1550",
    country: "Philippines",
    lat: 14.5866,
    lon: 121.0611,
  },
  {
    id: "eastwood-qc",
    formatted: "Eastwood City, E. Rodriguez Jr. Ave, Bagumbayan, Quezon City, Metro Manila, 1110",
    street: "E. Rodriguez Jr. Avenue",
    suburb: "Eastwood City",
    city: "Quezon City",
    state: "Metro Manila",
    postcode: "1110",
    country: "Philippines",
    lat: 14.6095,
    lon: 121.0805,
  },
  {
    id: "moa-pasay",
    formatted: "SM Mall of Asia Complex, J.W. Diokno Blvd, Pasay City, Metro Manila, 1300",
    street: "J.W. Diokno Boulevard",
    suburb: "Bay City",
    city: "Pasay",
    state: "Metro Manila",
    postcode: "1300",
    country: "Philippines",
    lat: 14.5352,
    lon: 120.9822,
  },
  {
    id: "alabang-filinvest",
    formatted: "Filinvest City, Commerce Ave, Alabang, Muntinlupa, Metro Manila, 1781",
    street: "Commerce Avenue",
    suburb: "Filinvest City",
    city: "Muntinlupa",
    state: "Metro Manila",
    postcode: "1781",
    country: "Philippines",
    lat: 14.4208,
    lon: 121.0416,
  },
  {
    id: "greenfield-manda",
    formatted: "Greenfield District, Reliance St, Highway Hills, Mandaluyong, Metro Manila, 1550",
    street: "Reliance Street",
    suburb: "Greenfield District",
    city: "Mandaluyong",
    state: "Metro Manila",
    postcode: "1550",
    country: "Philippines",
    lat: 14.5772,
    lon: 121.0535,
  },
  {
    id: "qc-vertis-north",
    formatted: "Vertis North, North Avenue, Diliman, Quezon City, Metro Manila, 1105",
    street: "North Avenue",
    suburb: "Triangle Park / Vertis",
    city: "Quezon City",
    state: "Metro Manila",
    postcode: "1105",
    country: "Philippines",
    lat: 14.6534,
    lon: 121.0345,
  },
  {
    id: "cebu-it-park",
    formatted: "Cebu IT Park, Salinas Drive, Lahug, Cebu City, Cebu, 6000",
    street: "Salinas Drive",
    suburb: "Lahug",
    city: "Cebu City",
    state: "Cebu",
    postcode: "6000",
    country: "Philippines",
    lat: 10.3297,
    lon: 123.9061,
  },
  {
    id: "davao-lanang",
    formatted: "SM Lanang Premier, J.P. Laurel Ave, San Antonio, Davao City, Davao del Sur, 8000",
    street: "J.P. Laurel Avenue",
    suburb: "San Antonio",
    city: "Davao City",
    state: "Davao del Sur",
    postcode: "8000",
    country: "Philippines",
    lat: 7.0984,
    lon: 125.6315,
  },
  {
    id: "clark-pampanga",
    formatted: "Clark Freeport Zone, Manuel A. Roxas Hwy, Angeles, Pampanga, 2009",
    street: "Manuel A. Roxas Highway",
    suburb: "Clark",
    city: "Angeles",
    state: "Pampanga",
    postcode: "2009",
    country: "Philippines",
    lat: 15.1764,
    lon: 120.5312,
  },
];

// Helper: Haversine distance
function calcHaversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Fetch Geoapify config & warehouse coordinates
export async function getGeoConfig(): Promise<GeoConfig> {
  try {
    const res = await fetch("/api/geo/config");
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to load geo config:", err);
  }
  return {
    hasApiKey: false,
    warehouse: {
      name: "PRIME Central Logistics Hub",
      address: "High Street South, Bonifacio Global City, Taguig, Metro Manila",
      lat: 14.5516,
      lon: 121.0503,
    },
  };
}

// Address Autocomplete with country and proximity filter
export async function searchAddressAutocomplete(
  text: string,
  options?: { country?: string; lat?: number; lon?: number; limit?: number }
): Promise<GeoLocation[]> {
  if (!text || text.trim().length < 2) return [];

  try {
    const lat = options?.lat ?? 14.5516;
    const lon = options?.lon ?? 121.0503;
    const params = new URLSearchParams({
      text: text.trim(),
      country: options?.country || "ph",
      limit: String(options?.limit || 6),
      bias: `proximity:${lon},${lat}`,
    });

    const res = await fetch(`/api/geo/autocomplete?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results;
      }
    }
  } catch (err) {
    console.warn("Autocomplete server endpoint error, using local dataset fallback:", err);
  }

  // Client-side fallback search
  const q = text.toLowerCase().trim();
  const matched = PHILIPPINES_LOCATIONS_DATABASE.filter(
    (loc) =>
      loc.formatted.toLowerCase().includes(q) ||
      (loc.city && loc.city.toLowerCase().includes(q)) ||
      (loc.suburb && loc.suburb.toLowerCase().includes(q)) ||
      (loc.street && loc.street.toLowerCase().includes(q))
  );

  if (matched.length > 0) {
    return matched;
  }

  return [
    {
      id: `custom-${Date.now()}`,
      formatted: `${text}, Metro Manila, Philippines`,
      street: text,
      city: "Metro Manila",
      state: "NCR",
      country: "Philippines",
      lat: 14.5547 + (Math.random() - 0.5) * 0.04,
      lon: 121.0244 + (Math.random() - 0.5) * 0.04,
      source: "fallback",
    },
  ];
}

// Forward Geocode an address string
export async function geocodeAddress(text: string): Promise<GeoLocation | null> {
  if (!text || !text.trim()) return null;
  try {
    const res = await fetch(`/api/geo/geocode?text=${encodeURIComponent(text.trim())}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Geocode server error, using fallback:", err);
  }

  const q = text.toLowerCase();
  const found = PHILIPPINES_LOCATIONS_DATABASE.find(
    (l) => l.formatted.toLowerCase().includes(q) || l.city?.toLowerCase().includes(q)
  );
  return found || PHILIPPINES_LOCATIONS_DATABASE[0];
}

// Reverse Geocode latitude & longitude into a readable address
export async function reverseGeocode(lat: number, lon: number): Promise<GeoLocation | null> {
  try {
    const res = await fetch(`/api/geo/reverse-geocode?lat=${lat}&lon=${lon}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Reverse geocode server error, using nearest fallback:", err);
  }

  let nearest = PHILIPPINES_LOCATIONS_DATABASE[0];
  let minD = Infinity;
  for (const loc of PHILIPPINES_LOCATIONS_DATABASE) {
    const d = calcHaversine(lat, lon, loc.lat, loc.lon);
    if (d < minD) {
      minD = d;
      nearest = loc;
    }
  }

  return {
    ...nearest,
    lat,
    lon,
    formatted: `${nearest.street}, ${nearest.suburb}, ${nearest.city}, Philippines`,
  };
}

// IP Geolocation Lookup
export async function lookupIpLocation(ip?: string): Promise<IpLocationInfo | null> {
  try {
    const url = ip ? `/api/geo/ip-lookup?ip=${encodeURIComponent(ip)}` : `/api/geo/ip-lookup`;
    const res = await fetch(url);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("IP lookup error:", err);
  }
  return {
    ip: ip || "120.28.0.1",
    city: "Taguig",
    region: "Metro Manila",
    country: "Philippines",
    countryCode: "PH",
    postcode: "1634",
    lat: 14.5507,
    lon: 121.0477,
    timezone: "Asia/Manila",
    source: "fallback",
  };
}

// Route calculation from Logistics Hub to Customer Address
export async function calculateRoute(
  toLat: number,
  toLon: number,
  fromLat: number = 14.5516,
  fromLon: number = 121.0503,
  mode: string = "drive"
): Promise<RouteInfo | null> {
  try {
    const params = new URLSearchParams({
      toLat: String(toLat),
      toLon: String(toLon),
      fromLat: String(fromLat),
      fromLon: String(fromLon),
      mode,
    });

    const res = await fetch(`/api/geo/route?${params.toString()}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Route calculation server error, using geometric fallback:", err);
  }

  const directKm = calcHaversine(fromLat, fromLon, toLat, toLon);
  const roadKm = Number(Math.max(directKm * 1.35, 1.2).toFixed(2));
  const durationMins = Math.max(Math.ceil((roadKm / 25) * 60 + 8), 12);

  const steps = 6;
  const coordinates: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curLon = fromLon + (toLon - fromLon) * t + Math.sin(t * Math.PI) * 0.005;
    const curLat = fromLat + (toLat - fromLat) * t + Math.sin(t * Math.PI) * 0.003;
    coordinates.push([curLon, curLat]); // [lon, lat]
  }

  return {
    distanceKm: roadKm,
    durationMinutes: durationMins,
    coordinates,
    source: "fallback",
  };
}

// Generate Static Map URL with custom center, zoom and marker
export function getStaticMapUrl(params: {
  lat: number;
  lon: number;
  zoom?: number;
  width?: number;
  height?: number;
  markerColor?: string;
}): string {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    zoom: String(params.zoom || 14),
    width: String(params.width || 600),
    height: String(params.height || 260),
    markerColor: params.markerColor || "black",
  });
  return `/api/geo/static-map?${query.toString()}`;
}

