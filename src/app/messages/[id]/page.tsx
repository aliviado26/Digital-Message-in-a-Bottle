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
      <div className="max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <h1 className="font-display text-xl font-semibold">
          {bottle.status === "read" ? "Opened bottle" : "Something washed ashore..."}
        </h1>
        <dl className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Age</dt>
            <dd className="mt-1 font-mono">{ageDays} days</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Distance</dt>
            <dd className="mt-1 font-mono">{bottle.distance_km.toFixed(1)} km</dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-wide text-ink-muted">Origin</dt>
            <dd className="mt-1">{origin?.region ?? "Unknown"}</dd>
          </div>
        </dl>

        {actionError && <p className="mt-4 text-sm text-seal">{actionError}</p>}

        <div className="mt-5 border-t border-line pt-4">
          {bottle.status === "read" ? (
            <p className="whitespace-pre-wrap font-body italic">{bottle.message}</p>
          ) : (
            <form action={breakSeal}>
              <input type="hidden" name="bottleId" value={bottle.id} />
              <button
                type="submit"
                className="rounded-full bg-seal px-4 py-2 text-sm font-medium text-seal-contrast hover:opacity-90"
              >
                🔓 Break the Seal
              </button>
            </form>
          )}
        </div>
      </div>

      <details className="max-w-lg text-sm text-ink-muted">
        <summary className="cursor-pointer">Report this message</summary>
        <form action={reportBottle} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="bottleId" value={bottle.id} />
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Why are you reporting this?"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ocean"
          />
          <button
            type="submit"
            className="self-start rounded-full border border-seal px-3 py-1 text-seal hover:bg-seal/10"
          >
            Submit report
          </button>
        </form>
      </details>
    </div>
  );
}
