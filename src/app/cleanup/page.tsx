import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CleanupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();

  const [{ data: opportunities }, { data: engagements }] = await Promise.all([
    supabase
      .from("cleanup_opportunities")
      .select("id, title, organization, region, summary, expires_at")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("region"),
    supabase.from("cleanup_engagements").select("opportunity_id").eq("user_id", user.id),
  ]);

  const discoveredIds = new Set((engagements ?? []).map((e) => e.opportunity_id));

  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Real Ocean Connection</h1>
        <p className="max-w-2xl text-sm text-ink-muted">
          Legitimate marine conservation programs — read about one for a few minutes to
          discover it. This isn&apos;t the same as volunteering, but it earns you a Fee and
          a Current Coin, which can speed up your own bottles&apos; drift for a few minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(opportunities ?? []).map((opportunity) => (
          <Link
            key={opportunity.id}
            href={`/cleanup/${opportunity.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-sm hover:bg-surface-alt"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display font-medium">🧹 {opportunity.title}</h2>
              {discoveredIds.has(opportunity.id) && (
                <span className="shrink-0 rounded-full border border-ocean/40 bg-ocean/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ocean">
                  Discovered
                </span>
              )}
            </div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-muted">
              {opportunity.organization} · {opportunity.region}
            </p>
            <p className="text-sm text-ink-muted">{opportunity.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
