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
    <nav className="flex items-center justify-between border-b border-black/10 px-6 py-3 text-sm dark:border-white/10">
      <div className="flex gap-4 font-medium">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hover:underline">
            {link.label}
          </Link>
        ))}
      </div>
      {user ? (
        <form action={signOut}>
          <button type="submit" className="hover:underline">
            Log out
          </button>
        </form>
      ) : (
        <Link href="/login" className="hover:underline">
          Log in
        </Link>
      )}
    </nav>
  );
}
