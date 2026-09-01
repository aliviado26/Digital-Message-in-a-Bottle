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
      <h1 className="font-display text-2xl font-semibold">Register</h1>
      {params.error && <p className="text-sm text-seal">{params.error}</p>}
      <form action={signup} className="flex flex-col gap-3">
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ocean"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ocean"
        />
        <button
          type="submit"
          className="rounded-full bg-ocean px-3 py-2 font-medium text-ocean-contrast hover:opacity-90"
        >
          Create account
        </button>
      </form>
      <p className="text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-seal underline underline-offset-2">
          Log in
        </Link>
      </p>
    </div>
  );
}
