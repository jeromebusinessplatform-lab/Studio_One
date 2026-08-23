import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { LocateFixed, MapPin as MapPinIcon } from "lucide-react";

interface GeoMapViewProps {
  centerLat: number;
  centerLon: number;
  zoom?: number;
  height?: number | string;
  destinationLabel?: string;
  originLat?: number;
  originLon?: number;
  originLabel?: string;
  routeCoordinates?: [number, number][];
  apiKey?: string;
  interactive?: boolean;
  onDetectGps?: () => void;
  onDropPin?: () => void;
  isLocating?: boolean;
}

export function GeoMapView({ centerLat, centerLon, zoom = 14, height = 200, destinationLabel = "Delivery Destination", originLat, originLon, originLabel = "PRIME Logistics Hub", routeCoordinates, apiKey, interactive = true, onDetectGps, onDropPin, isLocating }: GeoMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, { center: [centerLat, centerLon], zoom, zoomControl: false, attributionControl: false, dragging: interactive, scrollWheelZoom: false, doubleClickZoom: interactive, touchZoom: interactive });
      if (interactive) L.control.zoom({ position: "topright" }).addTo(map);
      const tileUrl = apiKey?.trim() ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}` : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      L.tileLayer(tileUrl, { maxZoom: 19, subdomains: ["a", "b", "c"] }).addTo(map);
      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;
    markersGroup.clearLayers();

    const boundsPoints: [number, number][] = [];
    const destIcon = L.divIcon({ className: "custom-dest-pin", html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:32px;height:32px"><div style="position:absolute;width:30px;height:30px;background:rgba(0,0,0,.15);border-radius:50%"></div><div style="position:relative;z-index:10;background:#000;color:#fff;border:2px solid #fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center">⌖</div></div>`, iconSize: [32, 32], iconAnchor: [16, 16] });
    const destMarker = L.marker([centerLat, centerLon], { icon: destIcon }).addTo(markersGroup);
    destMarker.bindPopup(`<strong>${destinationLabel}</strong><br/>${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}`);
    boundsPoints.push([centerLat, centerLon]);

    if (originLat !== undefined && originLon !== undefined) {
      const originIcon = L.divIcon({ className: "custom-origin-pin", html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center"><div style="background:#2563eb;color:#fff;border:2px solid #fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center">⌂</div></div>`, iconSize: [28, 28], iconAnchor: [14, 14] });
      const originMarker = L.marker([originLat, originLon], { icon: originIcon }).addTo(markersGroup);
      originMarker.bindPopup(`<strong>${originLabel}</strong><br/>${originLat.toFixed(4)}, ${originLon.toFixed(4)}`);
      boundsPoints.push([originLat, originLon]);

      const polylinePoints: [number, number][] = routeCoordinates?.length
        ? routeCoordinates.map(([lon, lat]) => [lat, lon] as [number, number])
        : [[originLat, originLon], [centerLat, centerLon]];
      L.polyline(polylinePoints, { color: "#000000", weight: 4, opacity: 0.8, dashArray: "6, 8", lineCap: "round", lineJoin: "round" }).addTo(markersGroup);
      boundsPoints.push(...polylinePoints);
    }

    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [30, 30], maxZoom: 15 });
    } else {
      map.setView([centerLat, centerLon], zoom);
    }
    const timer = window.setTimeout(() => map.invalidateSize(), 100);
    return () => window.clearTimeout(timer);
  }, [centerLat, centerLon, originLat, originLon, routeCoordinates, zoom, apiKey, interactive, destinationLabel, originLabel]);

  useEffect(() => () => { mapInstanceRef.current?.remove(); mapInstanceRef.current = null; }, []);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-neutral-200 shadow-inner bg-neutral-100" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: height }} />
      
      {/* Floating Action Buttons Overlay (Vertically aligned with top-right zoom controls) */}
      <div className="absolute top-12 right-2.5 z-20 flex flex-col gap-1.5">
        {onDetectGps && (
          <button
            type="button"
            onClick={onDetectGps}
            disabled={isLocating}
            title="Use Current Location (GPS)"
            className="w-8 h-8 bg-white hover:bg-neutral-50 text-neutral-900 rounded-lg shadow-md border border-neutral-200 flex items-center justify-center transition cursor-pointer disabled:opacity-50"
          >
            <LocateFixed size={15} className={isLocating ? "animate-spin text-blue-600" : ""} />
          </button>
        )}
        {onDropPin && (
          <button
            type="button"
            onClick={onDropPin}
            title="Drop a Pin"
            className="w-8 h-8 bg-white hover:bg-neutral-50 text-neutral-900 rounded-lg shadow-md border border-neutral-200 flex items-center justify-center transition cursor-pointer"
          >
            <MapPinIcon size={15} className="text-neutral-900" />
          </button>
        )}
      </div>

      <div className="absolute bottom-2 right-2 z-10 bg-white/90 backdrop-blur-xs text-neutral-800 text-[10px] px-2 py-0.5 rounded-md font-mono border border-neutral-200 shadow-xs pointer-events-none">
        {centerLat.toFixed(4)}°N, {centerLon.toFixed(4)}°E
      </div>
    </div>
  );
}
