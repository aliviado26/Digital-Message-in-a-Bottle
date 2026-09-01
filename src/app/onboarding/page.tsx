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
    .order("name");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Choose your Home Shore</h1>
      <p className="text-sm text-zinc-500">
        This is where you&apos;ll naturally receive bottles. It doesn&apos;t
        determine where the bottles you send will go — the ocean decides
        that.
      </p>
      {params.error && <p className="text-sm text-red-600">{params.error}</p>}
      <form action={chooseHomeShore} className="flex flex-col gap-3">
        <select
          name="shoreZoneId"
          required
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
        >
          {(shoreZones ?? []).map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.region ? `${zone.name} — ${zone.region}` : zone.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Set as my Home Shore
        </button>
      </form>
    </div>
  );
}
