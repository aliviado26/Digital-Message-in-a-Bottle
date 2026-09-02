import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface ShoreZoneName {
  name: string;
}

export default async function BottleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bottle } = await supabase
    .from("bottles")
    .select(
      "id, status, message, distance_km, released_at, origin_shore:shore_zones!bottles_origin_shore_id_fkey(name), landed_shore:shore_zones!bottles_landed_shore_id_fkey(name)",
    )
    .eq("id", id)
    .eq("sender_id", user.id)
    .single();

  if (!bottle) {
    notFound();
  }

  const { data: positions } = await supabase
    .from("bottle_positions")
    .select("lat, lng, recorded_at")
    .eq("bottle_id", id)
    .order("recorded_at", { ascending: true });

  const { data: events } = await supabase
    .from("bottle_events")
    .select("event_type, occurred_at, shore:shore_zones(name), ocean_event:ocean_events(starts_at, ends_at)")
    .eq("bottle_id", id)
    .order("occurred_at", { ascending: true });

  const EVENT_LABELS: Record<string, string> = {
    released: "🍾 Released",
    delivered: "📬 Delivered",
    stranded: "🏝️ Stranded",
    rescued: "🔭 Found by an explorer",
    redrifted: "🌊 Re-drifted",
    read: "🔓 Seal broken",
    fast_current: "⚡ Fast Current experienced",
    current_boost: "⚡ Current Coin boost used",
  };

  const originShore = (
    Array.isArray(bottle.origin_shore) ? bottle.origin_shore[0] : bottle.origin_shore
  ) as ShoreZoneName | null;
  const landedShore = (
    Array.isArray(bottle.landed_shore) ? bottle.landed_shore[0] : bottle.landed_shore
  ) as ShoreZoneName | null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-semibold">
            Bottle Passport — <span className="font-mono text-lg">{bottle.id.slice(0, 8)}</span>
          </h1>
          <span className="rounded-full border border-ocean/40 bg-ocean/10 px-3 py-1 font-mono text-xs uppercase tracking-wide text-ocean">
            {bottle.status}
          </span>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Origin</dt>
            <dd className="mt-1">{originShore?.name ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Landed</dt>
            <dd className="mt-1">{landedShore?.name ?? "Still drifting"}</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Distance</dt>
            <dd className="mt-1 font-mono">{bottle.distance_km.toFixed(1)} km</dd>
          </div>
        </dl>

        <p className="mt-4 font-mono text-xs text-ink-muted">
          Released {new Date(bottle.released_at).toLocaleString()}
        </p>

        <div className="mt-5 border-t border-line pt-4">
          <p className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Your message</p>
          <p className="mt-2 whitespace-pre-wrap font-body italic">{bottle.message}</p>
        </div>
      </div>

      <div className="max-w-lg">
        <h2 className="font-display text-lg font-medium">Events</h2>
        <ol className="mt-2 space-y-1 text-sm">
          {(events ?? []).map((event, index) => {
            const shore = (
              Array.isArray(event.shore) ? event.shore[0] : event.shore
            ) as ShoreZoneName | null;
            const oceanEvent = (
              Array.isArray(event.ocean_event) ? event.ocean_event[0] : event.ocean_event
            ) as { starts_at: string; ends_at: string } | null;
            return (
              <li key={index} className="flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-ink-muted">
                  {oceanEvent
                    ? `${new Date(oceanEvent.starts_at).toLocaleDateString()} – ${new Date(oceanEvent.ends_at).toLocaleDateString()}`
                    : new Date(event.occurred_at).toLocaleDateString()}
                </span>
                <span>
                  {EVENT_LABELS[event.event_type] ?? event.event_type}
                  {shore?.name ? ` — ${shore.name}` : ""}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="max-w-lg">
        <h2 className="font-display text-lg font-medium">Journey</h2>
        <ol className="mt-2 space-y-1 font-mono text-xs text-ink-muted">
          {(positions ?? []).map((position, index) => (
            <li key={index}>
              {new Date(position.recorded_at).toLocaleString()} —{" "}
              {position.lat.toFixed(2)}, {position.lng.toFixed(2)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
