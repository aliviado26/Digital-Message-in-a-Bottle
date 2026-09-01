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

  const originShore = (
    Array.isArray(bottle.origin_shore) ? bottle.origin_shore[0] : bottle.origin_shore
  ) as ShoreZoneName | null;
  const landedShore = (
    Array.isArray(bottle.landed_shore) ? bottle.landed_shore[0] : bottle.landed_shore
  ) as ShoreZoneName | null;

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Bottle Passport — {bottle.id.slice(0, 8)}</h1>
      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Status</dt>
        <dd>{bottle.status}</dd>
        <dt className="text-zinc-500">Origin</dt>
        <dd>{originShore?.name ?? "Unknown"}</dd>
        <dt className="text-zinc-500">Landed</dt>
        <dd>{landedShore?.name ?? "Still drifting"}</dd>
        <dt className="text-zinc-500">Distance travelled</dt>
        <dd>{bottle.distance_km.toFixed(1)} km</dd>
        <dt className="text-zinc-500">Released</dt>
        <dd>{new Date(bottle.released_at).toLocaleString()}</dd>
        <dt className="text-zinc-500">Your message</dt>
        <dd className="whitespace-pre-wrap">{bottle.message}</dd>
      </dl>

      <div>
        <h2 className="text-lg font-medium">Journey</h2>
        <ol className="mt-2 max-w-md space-y-1 text-sm text-zinc-500">
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
