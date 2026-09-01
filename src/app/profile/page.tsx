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
      <h1 className="text-2xl font-semibold">Profile</h1>
      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">Email</dt>
        <dd>{user.email}</dd>
        <dt className="text-zinc-500">User ID</dt>
        <dd className="break-all">{user.id}</dd>
        <dt className="text-zinc-500">Profile row created</dt>
        <dd>{profile?.created_at ? new Date(profile.created_at).toLocaleString() : "Not found"}</dd>
      </dl>
    </div>
  );
}
