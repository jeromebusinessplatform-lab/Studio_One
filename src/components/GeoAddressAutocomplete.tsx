import { useRef, useEffect } from "react";
import {
  MapPin,
  Loader2,
  CheckCircle2,
  Clock,
  ChevronDown,
} from "lucide-react";
import { type GeoLocation, type RouteInfo } from "@/lib/geoapify.ts";
import { GeoMapView } from "./GeoMapView.tsx";

interface GeoAddressAutocompleteProps {
  addressInput: string;
  onAddressChange: (val: string) => void;
  suggestions: GeoLocation[];
  recentAddresses?: string[];
  onSelectRecentAddress?: (addr: string) => void;
  isLoading: boolean;
  isLocating?: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedLocation: GeoLocation | null;
  onSelectSuggestion: (loc: GeoLocation) => void;
  onDetectGps?: () => void;
  onDetectIp?: () => void;
  routeInfo: RouteInfo | null;
  isCalculatingRoute: boolean;
  warehouseName?: string;
  hasGeoapifyKey?: boolean;
}

export function GeoAddressAutocomplete({
  addressInput,
  onAddressChange,
  suggestions,
  recentAddresses = [],
  onSelectRecentAddress,
  isLoading,
  isOpen,
  setIsOpen,
  selectedLocation,
  onSelectSuggestion,
  routeInfo,
  isCalculatingRoute,
}: GeoAddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  const hasRecentAddresses = recentAddresses.length > 0;
  const isTyping = addressInput.trim().length >= 2;

  return (
    <div className="space-y-2.5" ref={containerRef}>
      {/* Autocomplete Input Container */}
      <div className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            required
            value={addressInput}
            onChange={(e) => {
              onAddressChange(e.target.value);
              setIsOpen(true);
            }}
            onClick={() => setIsOpen(true)}
            onFocus={() => setIsOpen(true)}
            placeholder="Type street address, building, district, or city..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-3.5 pr-9 py-2.5 text-xs text-neutral-900 outline-none focus:border-black font-normal transition-colors placeholder:text-neutral-400"
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "14px" }}
          />

          <div className="absolute right-2.5 flex items-center text-neutral-400">
            {isLoading || isCalculatingRoute ? (
              <Loader2 size={15} className="animate-spin text-neutral-600" />
            ) : selectedLocation ? (
              <CheckCircle2 size={15} className="text-emerald-600" />
            ) : (
              <ChevronDown size={15} className="cursor-pointer text-neutral-400" onClick={() => setIsOpen(!isOpen)} />
            )}
          </div>
        </div>

        {/* Dropdown Container */}
        {isOpen && (
          <>
            {/* Case A: Show RECENTLY USED ADDRESSES when customer clicks on field before typing 2 letters */}
            {!isTyping && hasRecentAddresses && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-neutral-100 animate-in fade-in-50 duration-150">
                <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-100 flex items-center gap-1.5">
                  <Clock size={12} className="text-neutral-500" />
                  <span
                    className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider"
                    style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                  >
                    RECENTLY USED ADDRESSES
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100">
                  {recentAddresses.map((addr, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (onSelectRecentAddress) {
                          onSelectRecentAddress(addr);
                        } else {
                          onAddressChange(addr);
                          setIsOpen(false);
                        }
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-50 transition-colors flex items-start gap-2.5 cursor-pointer group"
                    >
                      <MapPin size={14} className="text-neutral-400 mt-0.5 shrink-0 group-hover:text-black transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-medium text-neutral-900 truncate group-hover:text-black"
                          style={{ fontFamily: "'Ubuntu', sans-serif" }}
                        >
                          {addr}
                        </p>
                        <span className="text-[10px] text-neutral-400 uppercase font-mono">Past Confirmed Address</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Case B: Show 300ms Debounced Suggestions when at least 2 characters typed */}
            {isTyping && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-neutral-100 animate-in fade-in-50 duration-150">
                <div className="max-h-60 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => onSelectSuggestion(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-neutral-50 transition-colors flex items-start gap-2 cursor-pointer group"
                    >
                      <MapPin size={15} className="text-neutral-400 mt-0.5 shrink-0 group-hover:text-black transition-colors" />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-xs font-medium text-neutral-900 truncate group-hover:text-black"
                          style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                        >
                          {item.formatted}
                        </div>
                        <div
                          className="text-[11px] text-neutral-500 font-normal flex items-center gap-2 mt-0.5"
                          style={{ fontFamily: "'Ubuntu', sans-serif" }}
                        >
                          {item.city && (
                            <span className="bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded text-[10px]">
                              {item.city}
                            </span>
                          )}
                          {item.state && <span>{item.state}</span>}
                          {item.postcode && <span>Postal: {item.postcode}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Location & Leaflet Map Tile Preview */}
      {selectedLocation && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden shadow-2xs space-y-2">
          {/* Real Slippy Leaflet OpenStreetMap / Geoapify Map View */}
          <div className="p-1">
            <GeoMapView
              centerLat={selectedLocation.lat}
              centerLon={selectedLocation.lon}
              destinationLabel={selectedLocation.formatted}
              height={180}
            />
          </div>
        </div>
      )}
    </div>
  );
}

