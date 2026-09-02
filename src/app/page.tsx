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
        <h1 className="font-display text-3xl font-semibold">Digital Message in a Bottle</h1>
        <p className="max-w-md font-body text-lg italic text-ink-muted">
          Write something. Seal it. Throw it into the ocean. Then let go.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-ocean px-4 py-2 text-sm font-medium text-ocean-contrast hover:opacity-90"
        >
          Log in / Register
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("fees, destination_progress, relocations_used, home_shore:shore_zones(name)")
    .eq("id", user.id)
    .single();

  const homeShore = (
    profile?.home_shore as { name: string } | { name: string }[] | null
  ) ?? null;
  const homeShoreName = Array.isArray(homeShore) ? homeShore[0]?.name : homeShore?.name;

  const passUnlocked =
    (profile?.relocations_used ?? 0) === 0 && (profile?.destination_progress ?? 0) >= 5;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-display text-3xl font-semibold">Digital Message in a Bottle</h1>
        <p className="max-w-md font-body text-lg italic text-ink-muted">
          Write something. Seal it. Throw it into the ocean. Then let go.
        </p>
      </div>

      <dl className="grid w-full max-w-md grid-cols-3 gap-4 rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">Fees</dt>
          <dd className="mt-1 font-display text-2xl">{profile?.fees ?? 0}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">Home Shore</dt>
          <dd className="mt-1 font-display text-lg">{homeShoreName ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">Progress</dt>
          <dd className="mt-1 font-mono text-2xl">{profile?.destination_progress ?? 0} / 5</dd>
        </div>
      </dl>

      {passUnlocked && (
        <Link
          href="/relocate"
          className="rounded-lg border border-seal/40 bg-seal/10 px-4 py-2 text-sm text-seal hover:bg-seal/20"
        >
          🎫 Destination Pass unlocked — relocate your Home Shore for free
        </Link>
      )}

      <div className="flex gap-3 text-sm font-medium">
        <Link href="/bottles" className="rounded-full bg-ocean px-4 py-2 text-ocean-contrast hover:opacity-90">
          Write a message
        </Link>
        <Link href="/messages" className="rounded-full border border-line px-4 py-2 text-ink hover:bg-surface-alt">
          Check Messages
        </Link>
        <Link href="/relocate" className="rounded-full border border-line px-4 py-2 text-ink hover:bg-surface-alt">
          Relocate
        </Link>
      </div>
    </div>
  );
}
