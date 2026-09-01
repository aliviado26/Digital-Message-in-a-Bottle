"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ExploreMap,
  type BottleMarker,
  type ZoneMarker,
  type CurrentArrow,
} from "@/components/explore-map";

interface BottleSummary {
  id: string;
  status: string;
  distanceKm: number;
  ageDays: number;
  originRegion: string | null;
}

export function ExplorePanel({
  zones,
  bottles,
  arrows,
}: {
  zones: ZoneMarker[];
  bottles: BottleMarker[];
  arrows: CurrentArrow[];
}) {
  const [selected, setSelected] = useState<BottleSummary | null>(null);
  const [path, setPath] = useState<{ lat: number; lng: number }[]>([]);

  async function handleSelectBottle(bottleId: string) {
    const supabase = createClient();

    const { data: bottle } = await supabase
      .from("explorable_bottles")
      .select("id, status, distance_km, released_at, origin_shore_id")
      .eq("id", bottleId)
      .single();

    if (!bottle) return;

    let originRegion: string | null = null;
    if (bottle.origin_shore_id) {
      const { data: zone } = await supabase
        .from("shore_zones")
        .select("region")
        .eq("id", bottle.origin_shore_id)
        .single();
      originRegion = zone?.region ?? null;
    }

    const { data: positions } = await supabase
      .from("explorable_bottle_positions")
      .select("lat, lng, recorded_at")
      .eq("bottle_id", bottleId)
      .order("recorded_at", { ascending: true });

    const ageDays = Math.floor(
      (Date.now() - new Date(bottle.released_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    setSelected({
      id: bottle.id,
      status: bottle.status,
      distanceKm: bottle.distance_km,
      ageDays,
      originRegion,
    });
    setPath((positions ?? []).map((position) => ({ lat: position.lat, lng: position.lng })));
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1">
        <ExploreMap
          zones={zones}
          bottles={bottles}
          arrows={arrows}
          path={path}
          onSelectBottle={handleSelectBottle}
        />
      </div>
      <div className="w-full max-w-xs shrink-0 rounded border border-black/10 p-4 text-sm dark:border-white/20">
        {selected ? (
          <div className="flex flex-col gap-2">
            <h2 className="font-medium">
              {selected.status === "stranded"
                ? "🏝️ Something is lying on the shore..."
                : `🍾 Unknown Bottle #${selected.id.slice(0, 8)}`}
            </h2>
            <p>Status: {selected.status === "drifting" ? "🌊 Drifting" : "🏝️ Stranded"}</p>
            <p>Age: {selected.ageDays} days</p>
            <p>Distance travelled: {selected.distanceKm.toFixed(1)} km</p>
            <p>Origin: {selected.originRegion ?? "Unknown"}</p>
            <p className="font-medium">🔒 Message sealed</p>
          </div>
        ) : (
          <p className="text-zinc-500">Click a bottle on the map to inspect it.</p>
        )}
      </div>
    </div>
  );
}
