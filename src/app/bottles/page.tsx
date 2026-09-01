import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { releaseBottle } from "./actions";

export default async function BottlesPage({
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
    .select("fees")
    .eq("id", user.id)
    .single();

  const { data: bottles } = await supabase
    .from("bottles")
    .select(
      "id, status, distance_km, released_at, origin_shore:shore_zones!bottles_origin_shore_id_fkey(name)",
    )
    .eq("sender_id", user.id)
    .eq("is_test", false)
    .order("released_at", { ascending: false });

  const fees = profile?.fees ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <h1 className="font-display text-2xl font-semibold">My Bottles</h1>
      <p className="text-sm text-ink-muted">
        You have <span className="font-mono">{fees}</span> {fees === 1 ? "Fee" : "Fees"}. Sending a
        bottle costs 1 Fee.
      </p>
      {params.error && <p className="text-sm text-seal">{params.error}</p>}

      <form action={releaseBottle} className="flex max-w-lg flex-col gap-3">
        <textarea
          name="message"
          required
          maxLength={1000}
          rows={5}
          placeholder="Write your message..."
          className="rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ocean"
        />
        <button
          type="submit"
          disabled={fees < 1}
          className="self-start rounded-full bg-ocean px-4 py-2 text-sm font-medium text-ocean-contrast disabled:opacity-40"
        >
          Seal and release
        </button>
      </form>

      <table className="w-full max-w-3xl text-left text-sm">
        <thead>
          <tr className="font-mono text-xs uppercase tracking-wide text-ink-muted">
            <th className="py-1 pr-4 font-normal">Bottle</th>
            <th className="py-1 pr-4 font-normal">Status</th>
            <th className="py-1 pr-4 font-normal">Distance</th>
            <th className="py-1 pr-4 font-normal">Released</th>
          </tr>
        </thead>
        <tbody>
          {(bottles ?? []).map((bottle) => (
            <tr key={bottle.id} className="border-t border-line">
              <td className="py-2 pr-4">
                <Link href={`/bottles/${bottle.id}`} className="font-mono text-seal underline underline-offset-2">
                  {bottle.id.slice(0, 8)}
                </Link>
              </td>
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
