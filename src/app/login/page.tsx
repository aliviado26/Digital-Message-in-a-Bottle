import Link from "next/link";
import { login } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Log in</h1>
      {params.message && <p className="text-sm text-emerald-600">{params.message}</p>}
      {params.error && <p className="text-sm text-red-600">{params.error}</p>}
      <form action={login} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="rounded border border-black/10 px-3 py-2 dark:border-white/20"
        />
        <button
          type="submit"
          className="rounded bg-black px-3 py-2 text-white dark:bg-white dark:text-black"
        >
          Log in
        </button>
      </form>
      <p className="text-sm text-zinc-500">
        No account?{" "}
        <Link href="/register" className="underline">
          Register
        </Link>
      </p>
    </div>
  );
}
