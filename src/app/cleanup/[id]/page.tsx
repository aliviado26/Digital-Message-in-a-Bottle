import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DiscoverPanel } from "./discover-panel";

export default async function CleanupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: opportunity } = await supabase
    .from("cleanup_opportunities")
    .select("id, title, organization, region, details, url")
    .eq("id", id)
    .single();

  if (!opportunity) {
    notFound();
  }

  const { data: engagement } = await supabase
    .from("cleanup_engagements")
    .select("id")
    .eq("user_id", user.id)
    .eq("opportunity_id", id)
    .maybeSingle();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
      <Link href="/cleanup" className="text-sm text-ink-muted hover:text-ink">
        ← Back
      </Link>
      <div>
        <h1 className="font-display text-2xl font-semibold">🧹 {opportunity.title}</h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-wide text-ink-muted">
          {opportunity.organization} · {opportunity.region}
        </p>
      </div>

      <p className="text-ink">{opportunity.details}</p>

      <a
        href={opportunity.url}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-sm text-ocean underline hover:no-underline"
      >
        Visit {opportunity.organization} →
      </a>

      <div className="mt-2 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <DiscoverPanel opportunityId={opportunity.id} alreadyDiscovered={!!engagement} />
      </div>
    </div>
  );
}
