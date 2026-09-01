"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  InkChartMap,
  type ChartBottle,
  type ChartZone,
  type ChartArrow,
} from "@/components/ink-chart-map";

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
  huntAvailable,
}: {
  zones: ChartZone[];
  bottles: ChartBottle[];
  arrows: ChartArrow[];
  huntAvailable: boolean;
}) {
  const [selected, setSelected] = useState<BottleSummary | null>(null);
  const [path, setPath] = useState<{ lat: number; lng: number }[]>([]);
  const [rescueState, setRescueState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [rescueMessage, setRescueMessage] = useState<string | null>(null);

  async function handleSelectBottle(bottleId: string) {
    setRescueState("idle");
    setRescueMessage(null);
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

  async function handleRescue(bottleId: string) {
    setRescueState("pending");
    setRescueMessage(null);
    const supabase = createClient();

    const { data, error } = await supabase.rpc("rescue_bottle", {
      p_bottle_id: bottleId,
    });

    if (error) {
      setRescueState("error");
      setRescueMessage(error.message);
      return;
    }

    const fees = Array.isArray(data) ? data[0]?.fees : data?.fees;
    setRescueState("done");
    setRescueMessage(
      fees != null
        ? `Bottle sent back to drift. +1 Fee (now ${fees}).`
        : "Bottle sent back to drift. +1 Fee.",
    );
    setSelected((prev) => (prev ? { ...prev, status: "drifting" } : prev));
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1">
        <InkChartMap
          zones={zones}
          bottles={bottles}
          arrows={arrows}
          path={path}
          onSelectBottle={handleSelectBottle}
          caption="Explorer chart"
        />
      </div>
      <div className="w-full max-w-xs shrink-0 rounded-2xl border border-line bg-surface p-5 text-sm shadow-sm">
        {selected ? (
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-medium">
              {selected.status === "stranded"
                ? "🏝️ Something is lying on the shore..."
                : `🍾 Unknown Bottle #${selected.id.slice(0, 8)}`}
            </h2>
            <p className="font-mono text-xs text-ink-muted">
              Status: {selected.status === "drifting" ? "🌊 Drifting" : "🏝️ Stranded"}
            </p>
            <p className="font-mono text-xs text-ink-muted">Age: {selected.ageDays} days</p>
            <p className="font-mono text-xs text-ink-muted">
              Distance travelled: {selected.distanceKm.toFixed(1)} km
            </p>
            <p className="font-mono text-xs text-ink-muted">Origin: {selected.originRegion ?? "Unknown"}</p>
            <p className="mt-2 font-medium text-seal">🔒 Message sealed</p>

            {selected.status === "stranded" && rescueState !== "done" && (
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                {huntAvailable ? (
                  <button
                    type="button"
                    onClick={() => handleRescue(selected.id)}
                    disabled={rescueState === "pending"}
                    className="rounded-full bg-seal px-4 py-2 text-sm font-medium text-seal-contrast hover:opacity-90 disabled:opacity-50"
                  >
                    {rescueState === "pending" ? "Re-drifting…" : "Re-drift Bottle"}
                  </button>
                ) : (
                  <p className="text-xs text-ink-muted">
                    🔭 Stranded Hunt unlocks once 24 hours pass without receiving a bottle.
                  </p>
                )}
                {rescueState === "error" && (
                  <p className="text-xs text-seal">{rescueMessage}</p>
                )}
              </div>
            )}
            {rescueState === "done" && (
              <p className="mt-3 border-t border-line pt-3 text-xs text-ocean">{rescueMessage}</p>
            )}
          </div>
        ) : (
          <p className="text-ink-muted">Click a bottle on the map to inspect it.</p>
        )}
      </div>
    </div>
  );
}
