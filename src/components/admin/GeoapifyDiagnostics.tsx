import { useState, useEffect } from "react";
import {
  MapPin,
  Route,
  Globe,
  Navigation,
  Loader2,
  CheckCircle2,
  Sparkles,
  Layers,
  Search,
  Compass,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import {
  searchAddressAutocomplete,
  geocodeAddress,
  reverseGeocode,
  lookupIpLocation,
  calculateRoute,
  getGeoConfig,
  getStaticMapUrl,
  type GeoLocation,
  type RouteInfo,
  type IpLocationInfo,
  type GeoConfig,
} from "@/lib/geoapify.ts";
import { GeoMapView } from "@/components/GeoMapView.tsx";
import { toast } from "sonner";

export function GeoapifyDiagnostics() {
  const [geoConfig, setGeoConfig] = useState<GeoConfig | null>(null);

  // 1. Autocomplete Tab State (300ms Debounce)
  const [acInput, setAcInput] = useState("Makati Central Business District");
  const [acResults, setAcResults] = useState<GeoLocation[]>([]);
  const [isAcLoading, setIsAcLoading] = useState(false);
  const [selectedAcLoc, setSelectedAcLoc] = useState<GeoLocation | null>(null);

  // 2. Reverse Geocode Tab State
  const [revLat, setRevLat] = useState("14.5547");
  const [revLon, setRevLon] = useState("121.0244");
  const [revResult, setRevResult] = useState<GeoLocation | null>(null);
  const [isRevLoading, setIsRevLoading] = useState(false);

  // 3. Routing Engine Tab State
  const [destLat, setDestLat] = useState("14.5866");
  const [destLon, setDestLon] = useState("121.0611");
  const [destLabel, setDestLabel] = useState("Ortigas Center, Pasig City");
  const [routeData, setRouteData] = useState<RouteInfo | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  // 4. IP Geolocation Tab State
  const [customIp, setCustomIp] = useState("");
  const [ipData, setIpData] = useState<IpLocationInfo | null>(null);
  const [isIpLoading, setIsIpLoading] = useState(false);

  // 5. Map Tile Zoom
  const [mapZoom, setMapZoom] = useState(14);

  useEffect(() => {
    getGeoConfig().then((cfg) => setGeoConfig(cfg));
  }, []);

  // 300ms Debounced Autocomplete for Diagnostics
  useEffect(() => {
    if (!acInput.trim() || acInput.length < 2) {
      setAcResults([]);
      return;
    }
    setIsAcLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddressAutocomplete(acInput, { country: "ph", limit: 5 });
        setAcResults(results);
        if (results.length > 0 && !selectedAcLoc) {
          setSelectedAcLoc(results[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAcLoading(false);
      }
    }, 300); // Strict 300ms debounce

    return () => clearTimeout(timer);
  }, [acInput]);

  // Handle Reverse Geocode
  const handleRunReverseGeocode = async () => {
    const lat = parseFloat(revLat);
    const lon = parseFloat(revLon);
    if (isNaN(lat) || isNaN(lon)) {
      toast.error("Enter valid decimal latitude and longitude");
      return;
    }
    setIsRevLoading(true);
    try {
      const res = await reverseGeocode(lat, lon);
      setRevResult(res);
      if (res) toast.success("Address reverse-geocoded successfully");
    } catch {
      toast.error("Failed to reverse geocode");
    } finally {
      setIsRevLoading(false);
    }
  };

  // Handle Routing Calculation
  const handleCalculateRoute = async () => {
    const lat = parseFloat(destLat);
    const lon = parseFloat(destLon);
    if (isNaN(lat) || isNaN(lon)) {
      toast.error("Enter valid decimal coordinates");
      return;
    }
    setIsRouteLoading(true);
    try {
      const route = await calculateRoute(
        lat,
        lon,
        geoConfig?.warehouse.lat,
        geoConfig?.warehouse.lon,
        "drive"
      );
      setRouteData(route);
      if (route) toast.success(`Route calculated: ${route.distanceKm} km (~${route.durationMinutes} mins)`);
    } catch {
      toast.error("Failed to calculate route");
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Handle IP Lookup
  const handleRunIpLookup = async () => {
    setIsIpLoading(true);
    try {
      const res = await lookupIpLocation(customIp.trim() || undefined);
      setIpData(res);
      if (res) toast.success(`IP Location: ${res.city}, ${res.country}`);
    } catch {
      toast.error("Failed to lookup IP");
    } finally {
      setIsIpLoading(false);
    }
  };

  const currentMapLoc = selectedAcLoc || {
    lat: geoConfig?.warehouse.lat || 14.5516,
    lon: geoConfig?.warehouse.lon || 121.0503,
  };

  const mapUrl = getStaticMapUrl({
    lat: currentMapLoc.lat,
    lon: currentMapLoc.lon,
    zoom: mapZoom,
    width: 600,
    height: 280,
    markerColor: "%23000000",
  });

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-5">
      {/* Header & API Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2
              className="text-base font-normal text-black uppercase"
              style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
            >
              Geoapify Intelligence & Fleet Routing
            </h2>
          </div>
          <p className="text-xs text-neutral-500 font-normal mt-0.5" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            Real-time Address Autocomplete (300ms Debounce), Geocoding, Reverse Lookup, Routing & IP Geolocation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1 border ${
              geoConfig?.hasApiKey
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            <ShieldCheck size={12} />
            {geoConfig?.hasApiKey ? "Geoapify API Active" : "Geoapify Hybrid Engine"}
          </span>

          <div className="text-[11px] text-neutral-500 font-mono bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200">
            Hub: BGC 14.55°N, 121.05°E
          </div>
        </div>
      </div>

      {/* Grid Layout: Autocomplete & Routing + Map Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Interactive Tools */}
        <div className="lg:col-span-7 space-y-4 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
          {/* Tool 1: Address Autocomplete */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-neutral-700 uppercase font-semibold flex items-center gap-1.5">
                <Search size={13} className="text-neutral-500" />
                <span>1. Address Autocomplete (300ms Debounce)</span>
              </label>
              {isAcLoading && <Loader2 size={13} className="animate-spin text-neutral-500" />}
            </div>

            <div className="relative">
              <input
                type="text"
                value={acInput}
                onChange={(e) => setAcInput(e.target.value)}
                placeholder="Type street, landmark, or district..."
                className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 outline-none focus:border-black"
              />
            </div>

            {acResults.length > 0 && (
              <div className="space-y-1 mt-2">
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Suggestions ({acResults.length} matches):
                </div>
                <div className="divide-y divide-neutral-200/80 bg-white border border-neutral-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                  {acResults.map((loc, i) => (
                    <button
                      key={loc.id || i}
                      onClick={() => {
                        setSelectedAcLoc(loc);
                        setDestLat(String(loc.lat));
                        setDestLon(String(loc.lon));
                        setDestLabel(loc.formatted);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-neutral-100 transition-colors cursor-pointer ${
                        selectedAcLoc?.formatted === loc.formatted ? "bg-neutral-100 font-semibold" : ""
                      }`}
                    >
                      <span className="truncate pr-2">{loc.formatted}</span>
                      <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                        {loc.lat.toFixed(3)}, {loc.lon.toFixed(3)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tool 2: Route Calculation Engine */}
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs text-neutral-700 uppercase font-semibold flex items-center gap-1.5">
                <Route size={13} className="text-neutral-500" />
                <span>2. Geoapify Fleet Routing (Hub ➔ Destination)</span>
              </label>
              <button
                onClick={handleCalculateRoute}
                disabled={isRouteLoading}
                className="bg-black hover:bg-neutral-800 text-white text-[11px] px-3 py-1 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isRouteLoading ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
                <span>Calculate Route</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase">Destination Lat:</span>
                <input
                  type="text"
                  value={destLat}
                  onChange={(e) => setDestLat(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-900 outline-none focus:border-black"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 block uppercase">Destination Lon:</span>
                <input
                  type="text"
                  value={destLon}
                  onChange={(e) => setDestLon(e.target.value)}
                  className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-900 outline-none focus:border-black"
                />
              </div>
            </div>

            {routeData && (
              <div className="bg-white border border-neutral-200 rounded-lg p-2.5 text-xs space-y-1">
                <div className="flex justify-between items-center text-black font-semibold">
                  <span>Calculated Road Distance:</span>
                  <span className="text-emerald-700 font-mono text-sm">{routeData.distanceKm} km</span>
                </div>
                <div className="flex justify-between items-center text-neutral-600">
                  <span>Estimated Courier Transit Time:</span>
                  <span className="font-mono font-medium">~{routeData.durationMinutes} minutes</span>
                </div>
                <div className="flex justify-between items-center text-neutral-400 text-[10px]">
                  <span>Polyline Coordinates:</span>
                  <span>{routeData.coordinates.length} waypoints</span>
                </div>
              </div>
            )}
          </div>

          {/* Tool 3: Reverse Geocoding & IP Geolocation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reverse Geocoding */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2">
              <label className="text-xs text-neutral-700 uppercase font-semibold flex items-center gap-1">
                <Compass size={12} />
                <span>3. Reverse Geocoding</span>
              </label>

              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <input
                  type="text"
                  value={revLat}
                  onChange={(e) => setRevLat(e.target.value)}
                  placeholder="Lat"
                  className="bg-white border border-neutral-300 rounded-md px-2 py-1 font-mono text-xs outline-none focus:border-black"
                />
                <input
                  type="text"
                  value={revLon}
                  onChange={(e) => setRevLon(e.target.value)}
                  placeholder="Lon"
                  className="bg-white border border-neutral-300 rounded-md px-2 py-1 font-mono text-xs outline-none focus:border-black"
                />
              </div>

              <button
                onClick={handleRunReverseGeocode}
                disabled={isRevLoading}
                className="w-full bg-neutral-800 text-white text-[11px] py-1 rounded-md hover:bg-black cursor-pointer transition-colors"
              >
                {isRevLoading ? "Looking up..." : "Resolve to Address"}
              </button>

              {revResult && (
                <div className="bg-white p-2 rounded border border-neutral-200 text-[11px] text-neutral-800 break-words">
                  {revResult.formatted}
                </div>
              )}
            </div>

            {/* IP Geolocation */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2">
              <label className="text-xs text-neutral-700 uppercase font-semibold flex items-center gap-1">
                <Globe size={12} />
                <span>4. IP Geolocation</span>
              </label>

              <input
                type="text"
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                placeholder="Auto-detect or custom IP"
                className="w-full bg-white border border-neutral-300 rounded-md px-2 py-1 font-mono text-xs outline-none focus:border-black"
              />

              <button
                onClick={handleRunIpLookup}
                disabled={isIpLoading}
                className="w-full bg-neutral-800 text-white text-[11px] py-1 rounded-md hover:bg-black cursor-pointer transition-colors"
              >
                {isIpLoading ? "Detecting..." : "Lookup IP Geolocation"}
              </button>

              {ipData && (
                <div className="bg-white p-2 rounded border border-neutral-200 text-[11px] text-neutral-800 space-y-0.5 font-mono">
                  <div><strong>{ipData.city}</strong>, {ipData.region}</div>
                  <div className="text-neutral-500">{ipData.country} ({ipData.countryCode})</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Map Tile & Static Map Render */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-neutral-800 uppercase flex items-center gap-1.5" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                <Layers size={13} />
                <span>5. Geoapify Live Interactive Map Tile</span>
              </div>
            </div>

            {/* Interactive Leaflet Map Canvas */}
            <div className="w-full h-64 rounded-xl overflow-hidden border border-neutral-200 shadow-inner">
              <GeoMapView
                centerLat={currentMapLoc.lat}
                centerLon={currentMapLoc.lon}
                originLat={geoConfig?.warehouse.lat || 14.5516}
                originLon={geoConfig?.warehouse.lon || 121.0503}
                destinationLabel={selectedAcLoc?.formatted || "Destination"}
                originLabel={geoConfig?.warehouse.name || "PRIME Central Logistics Hub"}
                routeCoordinates={routeData?.coordinates}
                height="100%"
                zoom={mapZoom}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
