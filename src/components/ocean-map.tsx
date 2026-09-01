"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  color?: string;
}

export function OceanMap({ markers }: { markers: MapMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [140, 20],
      zoom: 1.5,
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const markerInstances = markers.map((marker) => {
      const el = document.createElement("div");
      el.style.width = "10px";
      el.style.height = "10px";
      el.style.borderRadius = "50%";
      el.style.background = marker.color ?? "#2563eb";

      return new Marker({ element: el })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(new Popup({ offset: 12 }).setText(marker.label))
        .addTo(map);
    });

    return () => {
      markerInstances.forEach((markerInstance) => markerInstance.remove());
    };
  }, [markers]);

  return <div ref={containerRef} className="h-[420px] w-full rounded" />;
}
