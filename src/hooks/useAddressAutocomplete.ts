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

export function useAddressAutocomplete(initialAddress: string = "Bonifacio High Street, 5th Avenue, BGC, Taguig, Metro Manila, 1634") {
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<GeoLocation[]>(PHILIPPINES_LOCATIONS_DATABASE.slice(0, 5));
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize selected location with default BGC / initial location
  const initialMatch =
    PHILIPPINES_LOCATIONS_DATABASE.find(
      (l) => l.formatted.toLowerCase() === initialAddress.toLowerCase()
    ) || PHILIPPINES_LOCATIONS_DATABASE[0];

  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(initialMatch);
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

  // Load Geo Config and calculate initial route on mount
  useEffect(() => {
    getGeoConfig().then((cfg) => {
      setGeoConfig(cfg);
      if (initialMatch) {
        updateRoute(initialMatch.lat, initialMatch.lon);
      }
    });
  }, [updateRoute]);

  // Exact 300ms Debounce Implementation for Geoapify Autocomplete
  useEffect(() => {
    if (!addressInput || addressInput.trim().length === 0) {
      setSuggestions(PHILIPPINES_LOCATIONS_DATABASE.slice(0, 6));
      setIsLoading(false);
      return;
    }

    // If address matches currently selected location formatted text, don't re-trigger dropdown search
    if (selectedLocation && selectedLocation.formatted === addressInput) {
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const results = await searchAddressAutocomplete(addressInput, {
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
    }, 300); // Strict 300ms debounce

    return () => clearTimeout(handler);
  }, [addressInput, selectedLocation]);

  // Select a suggestion
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
    detectCurrentLocation,
    detectIpLocation,
    updateRoute,
  };
}

