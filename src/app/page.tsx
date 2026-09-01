import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-3xl font-semibold">Digital Message in a Bottle</h1>
      <p className="max-w-md text-zinc-500">
        Write something. Seal it. Throw it into the ocean. Then let go.
      </p>
      {user ? (
        <p className="text-sm text-zinc-500">Signed in as {user.email}</p>
      ) : (
        <Link
          href="/login"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Log in / Register
        </Link>
      )}
    </div>
  );
}
