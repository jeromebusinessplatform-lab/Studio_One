import { useState, useEffect, useCallback, useRef } from "react";
import {
  type GeoLocation,
  type RouteInfo,
  type IpLocationInfo,
  type GeoConfig,
  searchAddressAutocomplete,
  reverseGeocode,
  lookupIpLocation,
  calculateRoute,
  getGeoConfig,
  PHILIPPINES_LOCATIONS_DATABASE,
  geocodeAddress,
} from "@/lib/geoapify.ts";
import { toast } from "sonner";

export function useAddressAutocomplete(initialAddress: string = "") {
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [ipInfo, setIpInfo] = useState<IpLocationInfo | null>(null);
  const [geoConfig, setGeoConfig] = useState<GeoConfig | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Recalculate route whenever location changes
  const updateRoute = useCallback(
    async (lat: number, lon: number) => {
      setIsCalculatingRoute(true);
      try {
        const route = await calculateRoute(
          lat,
          lon,
          geoConfig?.warehouse?.lat || 14.5516,
          geoConfig?.warehouse?.lon || 121.0503,
          "drive"
        );
        if (route) {
          setRouteInfo(route);
        }
      } catch (err) {
        console.error("Route error:", err);
      } finally {
        setIsCalculatingRoute(false);
      }
    },
    [geoConfig]
  );

  // Load Geo Config on mount
  useEffect(() => {
    getGeoConfig().then((cfg) => {
      setGeoConfig(cfg);
    });
  }, []);

  // Strict 300ms Debounce: Only fetch suggestions when at least 2 characters are typed
  useEffect(() => {
    if (!addressInput || addressInput.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // If address matches currently selected location formatted text, don't re-trigger dropdown search
    if (selectedLocation && selectedLocation.formatted.toLowerCase() === addressInput.trim().toLowerCase()) {
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const results = await searchAddressAutocomplete(addressInput.trim(), {
          country: "ph",
          limit: 6,
        });
        setSuggestions(results);
        if (results.length > 0) {
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Autocomplete error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [addressInput, selectedLocation]);

  // Select a suggestion from search results
  const selectSuggestion = useCallback(
    (loc: GeoLocation) => {
      setSelectedLocation(loc);
      setAddressInput(loc.formatted);
      setSuggestions([]);
      setIsOpen(false);
      updateRoute(loc.lat, loc.lon);
    },
    [updateRoute]
  );

  // Select a recent or custom address string and geocode it
  const selectAddressString = useCallback(
    async (addr: string) => {
      setAddressInput(addr);
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(true);
      try {
        const found = await geocodeAddress(addr);
        if (found) {
          setSelectedLocation(found);
          updateRoute(found.lat, found.lon);
        } else {
          // Fallback approximate location
          const fallbackLoc: GeoLocation = {
            formatted: addr,
            lat: 14.5507,
            lon: 121.0477,
            source: "fallback",
          };
          setSelectedLocation(fallbackLoc);
          updateRoute(fallbackLoc.lat, fallbackLoc.lon);
        }
      } catch (e) {
        console.warn("Geocoding failed for address:", addr, e);
      } finally {
        setIsLoading(false);
      }
    },
    [updateRoute]
  );

  // Detect GPS coordinates via HTML5 Geolocation API + Geoapify Reverse Geocoding
  const detectCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    const toastId = toast.loading("Detecting current GPS coordinates...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const loc = await reverseGeocode(latitude, longitude);
          if (loc) {
            setSelectedLocation(loc);
            setAddressInput(loc.formatted);
            setIsOpen(false);
            updateRoute(loc.lat, loc.lon);
            toast.success("Location identified via GPS Geocoding!", { id: toastId });
          } else {
            toast.error("Could not resolve address from coordinates", { id: toastId });
          }
        } catch (err) {
          toast.error("Failed to reverse geocode location", { id: toastId });
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn("GPS error:", err.message);
        toast.info("GPS not granted, resolving via Geoapify IP Geolocation...", { id: toastId });
        detectIpLocation(toastId);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [updateRoute]);

  // Detect Location via Geoapify IP Geolocation
  const detectIpLocation = useCallback(
    async (existingToastId?: string | number) => {
      setIsLocating(true);
      try {
        const info = await lookupIpLocation();
        if (info) {
          setIpInfo(info);
          const formatted = `${info.city}, ${info.region}, ${info.country}`;
          const loc: GeoLocation = {
            formatted,
            city: info.city,
            state: info.region,
            country: info.country,
            postcode: info.postcode,
            lat: info.lat,
            lon: info.lon,
          };
          setSelectedLocation(loc);
          setAddressInput(formatted);
          setIsOpen(false);
          updateRoute(loc.lat, loc.lon);

          if (existingToastId) {
            toast.success(`Location detected: ${info.city}, ${info.region}`, { id: existingToastId });
          } else {
            toast.success(`Location detected via IP: ${info.city}, ${info.region}`);
          }
        }
      } catch (err) {
        if (existingToastId) {
          toast.error("IP Geolocation failed", { id: existingToastId });
        } else {
          toast.error("Failed to detect location from IP");
        }
      } finally {
        setIsLocating(false);
      }
    },
    [updateRoute]
  );

  return {
    addressInput,
    setAddressInput,
    suggestions,
    isLoading,
    isLocating,
    isOpen,
    setIsOpen,
    selectedLocation,
    setSelectedLocation,
    routeInfo,
    isCalculatingRoute,
    ipInfo,
    geoConfig,
    selectSuggestion,
    selectAddressString,
    detectCurrentLocation,
    detectIpLocation,
    updateRoute,
  };
}

