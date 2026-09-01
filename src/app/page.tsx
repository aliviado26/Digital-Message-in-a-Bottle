import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
        <h1 className="text-3xl font-semibold">Digital Message in a Bottle</h1>
        <p className="max-w-md text-zinc-500">
          Write something. Seal it. Throw it into the ocean. Then let go.
        </p>
        <Link
          href="/login"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Log in / Register
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("fees, destination_progress, home_shore:shore_zones(name)")
    .eq("id", user.id)
    .single();

  const homeShore = (
    profile?.home_shore as { name: string } | { name: string }[] | null
  ) ?? null;
  const homeShoreName = Array.isArray(homeShore) ? homeShore[0]?.name : homeShore?.name;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-16 text-center">
      <h1 className="text-3xl font-semibold">Digital Message in a Bottle</h1>
      <p className="max-w-md text-zinc-500">
        Write something. Seal it. Throw it into the ocean. Then let go.
      </p>
      <dl className="grid grid-cols-3 gap-6 text-center">
        <div>
          <dt className="text-xs text-zinc-500">Fees</dt>
          <dd className="text-xl font-semibold">{profile?.fees ?? 0}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Home Shore</dt>
          <dd className="text-xl font-semibold">{homeShoreName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">Destination Progress</dt>
          <dd className="text-xl font-semibold">{profile?.destination_progress ?? 0} / 5</dd>
        </div>
      </dl>
      <div className="flex gap-3 text-sm font-medium">
        <Link href="/bottles" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
          Write a message
        </Link>
        <Link href="/messages" className="rounded border border-black/10 px-4 py-2 dark:border-white/20">
          Check Messages
        </Link>
      </div>
    </div>
  );
}
