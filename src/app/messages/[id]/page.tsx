import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { breakSeal, reportBottle } from "../actions";

interface ShoreZoneRegion {
  region: string | null;
}

export default async function MessageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: actionError } = await searchParams;
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
      "id, status, message, distance_km, released_at, origin_shore:shore_zones!bottles_origin_shore_id_fkey(region)",
    )
    .eq("id", id)
    .eq("recipient_id", user.id)
    .single();

  if (!bottle) {
    notFound();
  }

  const origin = (
    Array.isArray(bottle.origin_shore) ? bottle.origin_shore[0] : bottle.origin_shore
  ) as ShoreZoneRegion | null;
  // Server Component computing a display-only "age" at request time, not a
  // client render subject to replay/concurrency — safe despite the lint rule.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const ageDays = Math.floor(
    (nowMs - new Date(bottle.released_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">
        {bottle.status === "read" ? "Opened bottle" : "Something washed ashore..."}
      </h1>
      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Age</dt>
        <dd>{ageDays} days</dd>
        <dt className="text-zinc-500">Distance travelled</dt>
        <dd>{bottle.distance_km.toFixed(1)} km</dd>
        <dt className="text-zinc-500">Origin</dt>
        <dd>{origin?.region ?? "Unknown"}</dd>
      </dl>

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {bottle.status === "read" ? (
        <div className="max-w-lg whitespace-pre-wrap rounded border border-black/10 p-4 dark:border-white/20">
          {bottle.message}
        </div>
      ) : (
        <form action={breakSeal}>
          <input type="hidden" name="bottleId" value={bottle.id} />
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            🔓 Break the Seal
          </button>
        </form>
      )}

      <details className="max-w-lg text-sm text-zinc-500">
        <summary className="cursor-pointer">Report this message</summary>
        <form action={reportBottle} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="bottleId" value={bottle.id} />
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Why are you reporting this?"
            className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
          />
          <button type="submit" className="self-start rounded border border-red-600 px-3 py-1 text-red-600">
            Submit report
          </button>
        </form>
      </details>
    </div>
  );
}
