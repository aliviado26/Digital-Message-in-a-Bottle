import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, created_at")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex flex-1 flex-col gap-4 p-16">
      <h1 className="font-display text-2xl font-semibold">Profile</h1>
      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface p-6 text-sm shadow-sm">
        <dt className="text-ink-muted">Email</dt>
        <dd>{user.email}</dd>
        <dt className="text-ink-muted">User ID</dt>
        <dd className="break-all font-mono text-xs">{user.id}</dd>
        <dt className="text-ink-muted">Profile row created</dt>
        <dd className="font-mono text-xs">
          {profile?.created_at ? new Date(profile.created_at).toLocaleString() : "Not found"}
        </dd>
      </dl>
    </div>
  );
}
