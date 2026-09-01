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
      <h1 className="text-2xl font-semibold">My Bottles</h1>
      <p className="text-sm text-zinc-500">
        You have {fees} {fees === 1 ? "Fee" : "Fees"}. Sending a bottle costs
        1 Fee.
      </p>
      {params.error && <p className="text-sm text-red-600">{params.error}</p>}

      <form action={releaseBottle} className="flex max-w-lg flex-col gap-3">
        <textarea
          name="message"
          required
          maxLength={1000}
          rows={5}
          placeholder="Write your message..."
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
        />
        <button
          type="submit"
          disabled={fees < 1}
          className="self-start rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
        >
          Seal and release
        </button>
      </form>

      <table className="w-full max-w-3xl text-left text-sm">
        <thead>
          <tr className="text-zinc-500">
            <th className="py-1 pr-4">Bottle</th>
            <th className="py-1 pr-4">Status</th>
            <th className="py-1 pr-4">Distance</th>
            <th className="py-1 pr-4">Released</th>
          </tr>
        </thead>
        <tbody>
          {(bottles ?? []).map((bottle) => (
            <tr key={bottle.id} className="border-t border-black/5 dark:border-white/10">
              <td className="py-1 pr-4">
                <Link href={`/bottles/${bottle.id}`} className="font-mono underline">
                  {bottle.id.slice(0, 8)}
                </Link>
              </td>
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
