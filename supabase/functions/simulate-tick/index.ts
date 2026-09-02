// Ticks every drifting bottle forward. Invoked on a schedule by pg_cron
// (see supabase/migrations/0003_stage1_schedule.sql.template) — never by
// the browser, per the Stage 1 architecture rule that the server owns
// bottle state.
import { createClient } from "npm:@supabase/supabase-js@2";
import { advancePosition, haversineDistanceKm } from "../_shared/geo-math.ts";
import { getCurrentVelocity } from "../_shared/current-systems.ts";
import { isOnLand } from "../_shared/land-check.ts";
import { findReachedShoreZone, type ShoreZone } from "../_shared/shore-check.ts";

interface Bottle {
  id: string;
  lat: number;
  lng: number;
  distance_km: number;
  last_ticked_at: string;
  origin_shore_id: string;
  drift_origin_shore_id: string;
  sender_id: string;
  is_test: boolean;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: shoreZones, error: shoreZonesError } = await supabase
    .from("shore_zones")
    .select("id, slug, lat, lng, radius_km")
    .limit(4000);
  if (shoreZonesError) {
    return Response.json({ error: shoreZonesError.message }, { status: 500 });
  }

  const { data: bottles, error: bottlesError } = await supabase
    .from("bottles")
    .select("id, lat, lng, distance_km, last_ticked_at, origin_shore_id, drift_origin_shore_id, sender_id, is_test")
    .eq("status", "drifting");
  if (bottlesError) {
    return Response.json({ error: bottlesError.message }, { status: 500 });
  }

  const now = new Date();

  // Fast Current only ever scales how far a bottle moves this tick, never
  // the elapsed time used for age (age is always now() - released_at,
  // computed elsewhere, and never touches this function at all) or for
  // last_ticked_at bookkeeping.
  const { data: activeEvents } = await supabase
    .from("ocean_events")
    .select("id, multiplier")
    .eq("event_type", "fast_current")
    .lte("starts_at", now.toISOString())
    .gte("ends_at", now.toISOString())
    .limit(1);
  const activeEvent = activeEvents?.[0] ?? null;
  const globalMultiplier = activeEvent?.multiplier ?? 1;

  // Personal Current Coin boosts stack multiplicatively with a global Fast
  // Current -- same "scale movement, never age" rule, just scoped to one
  // sender's own bottles instead of everyone's.
  const { data: boostedProfiles } = await supabase
    .from("profiles")
    .select("id")
    .gt("current_boost_until", now.toISOString());
  const boostedSenderIds = new Set((boostedProfiles ?? []).map((p) => p.id));

  const results = [];

  for (const bottle of bottles as Bottle[]) {
    const elapsedSeconds = (now.getTime() - new Date(bottle.last_ticked_at).getTime()) / 1000;
    if (elapsedSeconds < 1) {
      results.push({ id: bottle.id, skipped: "too soon" });
      continue;
    }

    const isBoosted = boostedSenderIds.has(bottle.sender_id);
    const movementMultiplier = globalMultiplier * (isBoosted ? 2 : 1);

    const position = { lat: bottle.lat, lng: bottle.lng };
    const velocity = getCurrentVelocity(position);
    const newPosition = advancePosition(position, velocity, elapsedSeconds * movementMultiplier);
    const stepDistanceKm = haversineDistanceKm(position, newPosition);

    if (activeEvent) {
      // Unique violation (23505) just means this bottle already logged
      // this event on an earlier tick -- expected, not a real error.
      const { error: fastCurrentError } = await supabase.from("bottle_events").insert({
        bottle_id: bottle.id,
        event_type: "fast_current",
        ocean_event_id: activeEvent.id,
      });
      if (fastCurrentError && fastCurrentError.code !== "23505") {
        console.error("Failed to log fast_current event", fastCurrentError);
      }
    }

    if (isBoosted) {
      await supabase.from("bottle_events").insert({
        bottle_id: bottle.id,
        event_type: "current_boost",
      });
    }

    // A bottle can't "arrive" at the shore it just left — exclude the
    // current drift leg's starting zone (origin on first release, or the
    // rescuing shore after a re-drift) so departure doesn't immediately
    // count as beaching/stranding again.
    const candidateZones = (shoreZones as ShoreZone[]).filter(
      (zone) => zone.id !== (bottle.drift_origin_shore_id ?? bottle.origin_shore_id),
    );
    const reachedZone = findReachedShoreZone(newPosition, candidateZones);
    const onLand = reachedZone ? false : isOnLand(newPosition);

    if (reachedZone) {
      if (bottle.is_test) {
        // Stage 1 prototype semantics, unchanged: any shore hit "beaches" it.
        await supabase
          .from("bottles")
          .update({
            status: "beached",
            landed_shore_id: reachedZone.id,
            lat: newPosition.lat,
            lng: newPosition.lng,
            distance_km: bottle.distance_km + stepDistanceKm,
            last_ticked_at: now.toISOString(),
          })
          .eq("id", bottle.id);
        await supabase.from("bottle_positions").insert({
          bottle_id: bottle.id,
          lat: newPosition.lat,
          lng: newPosition.lng,
        });
        results.push({ id: bottle.id, status: "beached", zone: reachedZone.slug });
        continue;
      }

      // Real bottle: the ocean decides whether an eligible recipient exists.
      const { data: candidates } = await supabase
        .from("profiles")
        .select("id")
        .eq("home_shore_id", reachedZone.id)
        .neq("id", bottle.sender_id)
        .limit(20);

      const recipient = candidates && candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : null;

      await supabase
        .from("bottles")
        .update({
          status: recipient ? "delivered" : "stranded",
          landed_shore_id: reachedZone.id,
          recipient_id: recipient?.id ?? null,
          lat: newPosition.lat,
          lng: newPosition.lng,
          distance_km: bottle.distance_km + stepDistanceKm,
          last_ticked_at: now.toISOString(),
        })
        .eq("id", bottle.id);
      await supabase.from("bottle_positions").insert({
        bottle_id: bottle.id,
        lat: newPosition.lat,
        lng: newPosition.lng,
      });
      await supabase.from("bottle_events").insert({
        bottle_id: bottle.id,
        event_type: recipient ? "delivered" : "stranded",
        shore_id: reachedZone.id,
        actor_id: recipient?.id ?? null,
      });
      results.push({
        id: bottle.id,
        status: recipient ? "delivered" : "stranded",
        zone: reachedZone.slug,
      });
      continue;
    }

    if (onLand) {
      await supabase
        .from("bottles")
        .update({ status: "lost", last_ticked_at: now.toISOString() })
        .eq("id", bottle.id);
      results.push({ id: bottle.id, status: "lost" });
      continue;
    }

    await supabase
      .from("bottles")
      .update({
        lat: newPosition.lat,
        lng: newPosition.lng,
        distance_km: bottle.distance_km + stepDistanceKm,
        last_ticked_at: now.toISOString(),
      })
      .eq("id", bottle.id);
    await supabase.from("bottle_positions").insert({
      bottle_id: bottle.id,
      lat: newPosition.lat,
      lng: newPosition.lng,
    });
    results.push({ id: bottle.id, status: "drifting", stepDistanceKm });
  }

  return Response.json({ ticked: results.length, results });
});
