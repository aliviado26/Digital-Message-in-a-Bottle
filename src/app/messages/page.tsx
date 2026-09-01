import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface ShoreZoneRegion {
  region: string | null;
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bottles } = await supabase
    .from("bottles")
    .select(
      "id, status, distance_km, last_ticked_at, origin_shore:shore_zones!bottles_origin_shore_id_fkey(region)",
    )
    .eq("recipient_id", user.id)
    .order("last_ticked_at", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Messages</h1>
      <p className="text-sm text-zinc-500">Bottles the ocean has delivered to you.</p>

      <ul className="flex max-w-lg flex-col gap-3">
        {(bottles ?? []).map((bottle) => {
          const origin = (
            Array.isArray(bottle.origin_shore) ? bottle.origin_shore[0] : bottle.origin_shore
          ) as ShoreZoneRegion | null;

          return (
            <li key={bottle.id} className="rounded border border-black/10 p-4 dark:border-white/20">
              <Link href={`/messages/${bottle.id}`} className="flex flex-col gap-1">
                <span className="font-medium">
                  {bottle.status === "read" ? "🍾 Opened bottle" : "🌊 Something washed ashore..."}
                </span>
                <span className="text-sm text-zinc-500">
                  Origin: {origin?.region ?? "Unknown"} · Distance travelled:{" "}
                  {bottle.distance_km.toFixed(1)} km
                </span>
              </Link>
            </li>
          );
        })}
        {(bottles ?? []).length === 0 && (
          <p className="text-sm text-zinc-500">Nothing has reached you yet.</p>
        )}
      </ul>
    </div>
  );
}
