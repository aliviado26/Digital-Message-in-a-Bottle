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

  const { data: zones } = await supabase
    .from("shore_zones")
    .select("id, name, lat, lng");

  const { data: bottles } = await supabase
    .from("explorable_bottles")
    .select("id, status, lat, lng, distance_km, released_at, origin_shore_id");

  const arrows = buildArrowGrid();

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Explore the Ocean</h1>
      <p className="text-sm text-zinc-500">
        Watch bottles drift in real time. You can see them, but only the
        recipient the ocean delivers one to can break its seal.
      </p>
      <ExplorePanel zones={zones ?? []} bottles={bottles ?? []} arrows={arrows} />
    </div>
  );
}
