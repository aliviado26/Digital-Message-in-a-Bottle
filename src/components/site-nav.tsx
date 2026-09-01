import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

const links = [
  { href: "/", label: "Home" },
  { href: "/ocean", label: "Ocean" },
  { href: "/bottles", label: "My Bottles" },
  { href: "/messages", label: "Messages" },
  { href: "/explore", label: "Explore" },
  { href: "/profile", label: "Profile" },
];

export async function SiteNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="flex items-center justify-between border-b border-line bg-surface px-6 py-3 text-sm">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <span
            aria-hidden
            className="flex h-6 w-6 items-center justify-center rounded-full bg-seal text-[11px] text-seal-contrast"
          >
            🧭
          </span>
          Digital Message in a Bottle
        </Link>
        <div className="flex gap-4 font-medium text-ink-muted">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      {user ? (
        <form action={signOut}>
          <button type="submit" className="font-medium text-ink-muted hover:text-ink">
            Log out
          </button>
        </form>
      ) : (
        <Link href="/login" className="font-medium text-ink-muted hover:text-ink">
          Log in
        </Link>
      )}
    </nav>
  );
}
