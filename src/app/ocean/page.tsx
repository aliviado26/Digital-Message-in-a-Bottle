import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { releaseBottle } from "./actions";
import { InkChartMap } from "@/components/ink-chart-map";

export default async function OceanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: shoreZones } = await supabase
    .from("shore_zones")
    .select("id, name, lat, lng")
    .order("name")
    .limit(4000);

  const { data: bottles } = await supabase
    .from("bottles")
    .select("id, lat, lng, status, distance_km, released_at, origin_shore_id")
    .order("released_at", { ascending: false });

  const zones = shoreZones ?? [];
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Ocean — Stage 1 Prototype</h1>
        <p className="text-sm text-ink-muted">
          Release a test bottle from a Shore Zone and watch it drift. A server-side tick
          advances every drifting bottle on a schedule, independent of this page being open.
        </p>
      </div>

      <InkChartMap
        zones={zones}
        bottles={(bottles ?? []).map((bottle) => ({ id: bottle.id, lat: bottle.lat, lng: bottle.lng, status: bottle.status }))}
        caption="Stage 1 prototype bottles"
      />

      <form action={releaseBottle} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Shore Zone
          <select
            name="shoreZoneId"
            required
            className="rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-ocean"
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-ocean px-4 py-2 text-sm text-ocean-contrast hover:opacity-90"
        >
          Release test bottle
        </button>
      </form>

      <table className="w-full max-w-3xl text-left text-sm">
        <thead>
          <tr className="font-mono text-xs uppercase tracking-wide text-ink-muted">
            <th className="py-1 pr-4 font-normal">Bottle</th>
            <th className="py-1 pr-4 font-normal">Origin</th>
            <th className="py-1 pr-4 font-normal">Status</th>
            <th className="py-1 pr-4 font-normal">Distance</th>
            <th className="py-1 pr-4 font-normal">Released</th>
          </tr>
        </thead>
        <tbody>
          {(bottles ?? []).map((bottle) => (
            <tr key={bottle.id} className="border-t border-line">
              <td className="py-2 pr-4 font-mono">{bottle.id.slice(0, 8)}</td>
              <td className="py-2 pr-4">{zoneById.get(bottle.origin_shore_id)?.name ?? "Unknown"}</td>
              <td className="py-2 pr-4">{bottle.status}</td>
              <td className="py-2 pr-4 font-mono">{bottle.distance_km.toFixed(1)} km</td>
              <td className="py-2 pr-4 font-mono text-ink-muted">
                {new Date(bottle.released_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
