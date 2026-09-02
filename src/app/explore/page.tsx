import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentVelocity } from "@/lib/ocean/current-systems";
import { ExplorePanel } from "./explore-panel";

function buildArrowGrid() {
  const arrows: { lat: number; lng: number; headingDeg: number }[] = [];
  for (let lat = -60; lat <= 60; lat += 10) {
    for (let lng = -180; lng <= 180; lng += 10) {
      const { speedMs, headingDeg } = getCurrentVelocity({ lat, lng });
      if (speedMs > 0.05) {
        arrows.push({ lat, lng, headingDeg });
      }
    }
  }
  return arrows;
}

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const arrows = buildArrowGrid();

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  const [{ data: zones }, { data: bottles }, { data: recentDelivery }, { data: activeFastCurrents }] =
    await Promise.all([
      supabase.from("shore_zones").select("id, name, lat, lng").limit(4000),
      supabase
        .from("explorable_bottles")
        .select("id, status, lat, lng, distance_km, released_at, origin_shore_id"),
      supabase
        .from("bottle_events")
        .select("occurred_at, bottles!inner(recipient_id)")
        .eq("event_type", "delivered")
        .eq("bottles.recipient_id", user.id)
        .gte("occurred_at", oneDayAgo)
        .limit(1),
      supabase
        .from("ocean_events")
        .select("ends_at")
        .eq("event_type", "fast_current")
        .lte("starts_at", nowIso)
        .gte("ends_at", nowIso)
        .limit(1),
    ]);

  const huntAvailable = !recentDelivery || recentDelivery.length === 0;
  const activeFastCurrent = activeFastCurrents?.[0] ?? null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="font-display text-2xl font-semibold">Explore the Ocean</h1>
      <p className="text-sm text-ink-muted">
        Watch bottles drift in real time. You can see them, but only the
        recipient the ocean delivers one to can break its seal.
      </p>
      {huntAvailable ? (
        <p className="rounded-lg border border-seal/40 bg-seal/10 px-4 py-2 text-sm text-seal">
          🔭 Stranded Hunt is available — you haven&apos;t received a bottle in over 24
          hours. Look for one lying on the shore.
        </p>
      ) : (
        <p className="rounded-lg border border-line bg-surface-alt px-4 py-2 text-sm text-ink-muted">
          🔭 Stranded Hunt unlocks once 24 hours pass without receiving a bottle.
        </p>
      )}
      {activeFastCurrent && (
        <p className="rounded-lg border border-brass/40 bg-brass/10 px-4 py-2 text-sm text-brass">
          ⚡ FAST CURRENT — movement is 2× until{" "}
          {new Date(activeFastCurrent.ends_at).toLocaleString()}. Bottle age is unaffected.
        </p>
      )}
      <ExplorePanel
        zones={zones ?? []}
        bottles={bottles ?? []}
        arrows={arrows}
        huntAvailable={huntAvailable}
      />
    </div>
  );
}
