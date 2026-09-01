import Link from "next/link";
import { signup } from "@/app/auth/actions";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Register</h1>
      {params.error && <p className="text-sm text-red-600">{params.error}</p>}
      <form action={signup} className="flex flex-col gap-3">
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
          Create account
        </button>
      </form>
      <p className="text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
