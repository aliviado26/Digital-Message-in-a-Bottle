"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, Popup, type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export interface ZoneMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

export interface BottleMarker {
  id: string;
  lat: number;
  lng: number;
  status: string;
}

export interface CurrentArrow {
  lat: number;
  lng: number;
  headingDeg: number;
}

const PATH_SOURCE_ID = "bottle-journey";

function bottleColor(status: string): string {
  if (status === "stranded") return "#f59e0b";
  return "#2563eb"; // drifting
}

export function ExploreMap({
  zones,
  bottles,
  arrows,
  path,
  onSelectBottle,
}: {
  zones: ZoneMarker[];
  bottles: BottleMarker[];
  arrows: CurrentArrow[];
  path?: { lat: number; lng: number }[];
  onSelectBottle?: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [140, 20],
      zoom: 1.3,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(PATH_SOURCE_ID, {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [] } },
      });
      map.addLayer({
        id: PATH_SOURCE_ID,
        type: "line",
        source: PATH_SOURCE_ID,
        paint: { "line-color": "#2563eb", "line-width": 2, "line-opacity": 0.7 },
      });
      loadedRef.current = true;
    });

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const zoneMarkers = zones.map((zone) =>
      new Marker({ color: "#16a34a" })
        .setLngLat([zone.lng, zone.lat])
        .setPopup(new Popup({ offset: 12 }).setText(`Shore Zone: ${zone.name}`))
        .addTo(map),
    );

    const bottleMarkers = bottles.map((bottle) => {
      const el = document.createElement("div");
      el.style.width = "10px";
      el.style.height = "10px";
      el.style.borderRadius = "50%";
      el.style.cursor = "pointer";
      el.style.background = bottleColor(bottle.status);
      el.addEventListener("click", () => onSelectBottle?.(bottle.id));

      return new Marker({ element: el }).setLngLat([bottle.lng, bottle.lat]).addTo(map);
    });

    const arrowMarkers = arrows.map((arrow) => {
      const el = document.createElement("div");
      el.textContent = "➤";
      el.style.color = "#0ea5e9";
      el.style.fontSize = "14px";
      el.style.opacity = "0.6";
      el.style.pointerEvents = "none";
      el.style.transform = `rotate(${arrow.headingDeg}deg)`;

      return new Marker({ element: el }).setLngLat([arrow.lng, arrow.lat]).addTo(map);
    });

    return () => {
      zoneMarkers.forEach((marker) => marker.remove());
      bottleMarkers.forEach((marker) => marker.remove());
      arrowMarkers.forEach((marker) => marker.remove());
    };
  }, [zones, bottles, arrows, onSelectBottle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;

    const source = map.getSource(PATH_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: (path ?? []).map((point) => [point.lng, point.lat]),
      },
    });
  }, [path]);

  return <div ref={containerRef} className="h-[520px] w-full rounded" />;
}
