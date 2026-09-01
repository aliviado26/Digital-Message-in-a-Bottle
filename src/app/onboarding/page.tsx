import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { chooseHomeShore } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("home_shore_id")
    .eq("id", user.id)
    .single();

  if (profile?.home_shore_id) {
    redirect("/");
  }

  const { data: shoreZones } = await supabase
    .from("shore_zones")
    .select("id, name, region")
    .order("region")
    .order("name")
    .limit(4000);

  const zonesByRegion = new Map<string, { id: string; name: string }[]>();
  for (const zone of shoreZones ?? []) {
    const region = zone.region ?? "Other";
    if (!zonesByRegion.has(region)) zonesByRegion.set(region, []);
    zonesByRegion.get(region)!.push({ id: zone.id, name: zone.name });
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="font-display text-2xl font-semibold">Choose your Home Shore</h1>
      <p className="text-sm text-ink-muted">
        This is where you&apos;ll naturally receive bottles. It doesn&apos;t
        determine where the bottles you send will go — the ocean decides
        that.
      </p>
      {params.error && <p className="text-sm text-seal">{params.error}</p>}
      <form action={chooseHomeShore} className="flex flex-col gap-3">
        <select
          name="shoreZoneId"
          required
          className="rounded-lg border border-line bg-surface px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-ocean"
        >
          {[...zonesByRegion.entries()].map(([region, zones]) => (
            <optgroup key={region} label={region}>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="submit"
          className="self-start rounded-full bg-ocean px-4 py-2 text-sm font-medium text-ocean-contrast hover:opacity-90"
        >
          Set as my Home Shore
        </button>
      </form>
    </div>
  );
}
