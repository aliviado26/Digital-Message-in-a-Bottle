import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { relocateHomeShore } from "./actions";

export default async function RelocatePage({
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
    .select("fees, destination_progress, relocations_used, home_shore:shore_zones(id, name)")
    .eq("id", user.id)
    .single();

  if (!profile?.home_shore) {
    redirect("/onboarding");
  }

  const currentHome = (
    Array.isArray(profile.home_shore) ? profile.home_shore[0] : profile.home_shore
  ) as { id: string; name: string };

  const isFree = (profile.relocations_used ?? 0) === 0;
  const canAffordFree = isFree && (profile.destination_progress ?? 0) >= 5;
  const canAffordPaid = !isFree && (profile.fees ?? 0) >= 5;
  const eligible = isFree ? canAffordFree : canAffordPaid;

  const { data: shoreZones } = await supabase
    .from("shore_zones")
    .select("id, name, region")
    .neq("id", currentHome.id)
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
      <h1 className="font-display text-2xl font-semibold">Relocate your Home Shore</h1>
      <p className="text-sm text-ink-muted">
        Current Home Shore: <span className="text-ink">{currentHome.name}</span>. This
        doesn&apos;t change where bottles you&apos;ve already sent are headed — only where
        new ones are released from, and where the ocean can deliver to you.
      </p>

      {isFree ? (
        canAffordFree ? (
          <p className="rounded-lg border border-seal/40 bg-seal/10 px-4 py-2 text-sm text-seal">
            🎫 Destination Pass unlocked — your first relocation is free.
          </p>
        ) : (
          <p className="rounded-lg border border-line bg-surface-alt px-4 py-2 text-sm text-ink-muted">
            🎫 Reach 5 Destination Progress ({profile.destination_progress ?? 0} / 5) — only
            received, opened bottles count — to unlock your first relocation, free with the
            Destination Pass.
          </p>
        )
      ) : (
        <p className="rounded-lg border border-line bg-surface-alt px-4 py-2 text-sm text-ink-muted">
          Your free relocation has already been used. This one costs 5 Fees (you have{" "}
          {profile.fees ?? 0}).
        </p>
      )}

      {params.error && <p className="text-sm text-seal">{params.error}</p>}

      <form action={relocateHomeShore} className="flex flex-col gap-3">
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
          disabled={!eligible}
          className="self-start rounded-full bg-ocean px-4 py-2 text-sm font-medium text-ocean-contrast hover:opacity-90 disabled:opacity-50"
        >
          {isFree ? "Relocate (Free)" : "Relocate (-5 Fees)"}
        </button>
      </form>
    </div>
  );
}
