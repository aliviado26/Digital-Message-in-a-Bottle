import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { releaseBottle } from "./actions";
import { OceanMap, type MapMarker } from "@/components/ocean-map";

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
    .order("name");

  const { data: bottles } = await supabase
    .from("bottles")
    .select("id, lat, lng, status, distance_km, released_at, origin_shore_id")
    .order("released_at", { ascending: false });

  const zones = shoreZones ?? [];
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]));

  const markers: MapMarker[] = [
    ...zones.map((zone) => ({
      id: `zone-${zone.id}`,
      lat: zone.lat,
      lng: zone.lng,
      label: `Shore Zone: ${zone.name}`,
      color: "#16a34a",
    })),
    ...(bottles ?? []).map((bottle) => ({
      id: `bottle-${bottle.id}`,
      lat: bottle.lat,
      lng: bottle.lng,
      label: `Bottle ${bottle.id.slice(0, 8)} — ${bottle.status}`,
      color:
        bottle.status === "drifting"
          ? "#2563eb"
          : bottle.status === "beached"
            ? "#f59e0b"
            : "#6b7280",
    })),
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Ocean — Stage 1 Prototype</h1>
        <p className="text-sm text-zinc-500">
          Release a test bottle from a Shore Zone and watch it drift. A server-side tick
          advances every drifting bottle on a schedule, independent of this page being open.
        </p>
      </div>

      <OceanMap markers={markers} />

      <form action={releaseBottle} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Shore Zone
          <select
            name="shoreZoneId"
            required
            className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
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
          className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          Release test bottle
        </button>
      </form>

      <table className="w-full max-w-3xl text-left text-sm">
        <thead>
          <tr className="text-zinc-500">
            <th className="py-1 pr-4">Bottle</th>
            <th className="py-1 pr-4">Origin</th>
            <th className="py-1 pr-4">Status</th>
            <th className="py-1 pr-4">Distance</th>
            <th className="py-1 pr-4">Released</th>
          </tr>
        </thead>
        <tbody>
          {(bottles ?? []).map((bottle) => (
            <tr key={bottle.id} className="border-t border-black/5 dark:border-white/10">
              <td className="py-1 pr-4 font-mono">{bottle.id.slice(0, 8)}</td>
              <td className="py-1 pr-4">{zoneById.get(bottle.origin_shore_id)?.name ?? "Unknown"}</td>
              <td className="py-1 pr-4">{bottle.status}</td>
              <td className="py-1 pr-4">{bottle.distance_km.toFixed(1)} km</td>
              <td className="py-1 pr-4">{new Date(bottle.released_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
