import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';

const playerLinks = [
  { href: '/#release', label: 'Throw' },
  { href: '/#ocean', label: 'Ocean' },
  { href: '/#inbox', label: 'Tideline' },
  { href: '/#voyages', label: 'Voyages' },
  { href: '/#cleanup', label: 'Real Ocean' },
];

const guestLinks = [
  { href: '/#top', label: 'Start' },
  { href: '/#how', label: 'How it works' },
];

export async function SiteNav() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className='site-nav' aria-label='Main navigation'>
      <Link href='/#top' className='nav-brand'>
        <span aria-hidden className='nav-brand-mark'>≋</span>
        <span>Message in a Bottle</span>
      </Link>
      <div className='nav-links'>
        {(user ? playerLinks : guestLinks).map((link) => (
          <Link key={link.href} href={link.href}>{link.label}</Link>
        ))}
      </div>
      {user ? (
        <form action={signOut}>
          <button type='submit' className='nav-session'>Log out</button>
        </form>
      ) : (
        <Link href='/login' className='nav-session'>Log in</Link>
      )}
    </nav>
  );
}
