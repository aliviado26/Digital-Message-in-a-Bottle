-- Stage 7: Real Ocean Connection. A small, hand-verified list of real,
-- currently-active conservation programs (sourced from each organization's
-- own site, not invented) -- not fabricated one-off dated events. Reading
-- one for ~5 minutes earns a Fee + a Current Coin; a Current Coin spends
-- into a personal 5-minute 2x movement boost, same "scale movement, never
-- age" rule as Stage 6's Fast Current, and can stack with it.

create table if not exists public.cleanup_opportunities (
  id uuid primary key default gen_random_uuid (),
  title text not null,
  organization text not null,
  region text not null default 'Global',
  summary text not null,
  details text not null,
  url text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now ()
);

alter table public.cleanup_opportunities enable row level security;

create policy "Anyone signed in can view cleanup opportunities"
  on public.cleanup_opportunities for select
  using (auth.role () = 'authenticated');

insert into public.cleanup_opportunities (title, organization, region, summary, details, url, expires_at) values
(
  'International Coastal Cleanup',
  'Ocean Conservancy',
  'Global',
  'The world''s largest volunteer effort for ocean health, running every year.',
  'Ocean Conservancy runs the International Coastal Cleanup, mobilizing volunteers worldwide to remove trash from beaches, rivers, and lakes. You can join an existing cleanup near you, or use their Clean Swell app to log a cleanup of your own -- the data volunteers log feeds Ocean Conservancy''s annual global marine debris report.',
  'https://oceanconservancy.org/work/plastics/cleanups-icc/',
  null
),
(
  'National Beach Cleanup Program',
  'Surfrider Foundation',
  'United States',
  'A volunteer network running regular beach cleanups across US coastlines.',
  'Surfrider Foundation''s volunteer network organizes beach cleanups across the West, East, Gulf, Great Lakes, Hawaiian, and Puerto Rican coasts. Cleanup data volunteers report back is used to support Surfrider''s pollution research and coastal policy advocacy.',
  'https://cleanups.surfrider.org/about/beach-cleanups/',
  null
),
(
  'Ocean & Coastline Cleanup Crews',
  '4ocean',
  'Global',
  'Paid cleanup crews working coastlines from Florida to Bali, funded by a plastic-neutral product line.',
  '4ocean is a company (not a charity) whose cleanup crews work oceans and coastlines daily, funded by sales of its recycled-plastic bracelets and other products -- each one funds the removal of a pound of trash. It also runs a separate 501(c)(3), the 4ocean Charitable Foundation, for those who''d rather support the mission directly.',
  'https://www.4ocean.com/pages/mission',
  null
),
(
  'Dive Against Debris',
  'PADI AWARE Foundation',
  'Global',
  'A citizen-science program for certified divers to remove and report underwater marine debris.',
  'Dive Against Debris is PADI AWARE''s flagship program: certified divers survey and remove debris underwater, then report what they found through the AWARE Conservation Action Portal. Since 2011, divers participating have reported millions of pieces of marine debris, feeding real scientific research on ocean plastic.',
  'https://www.padi.com/aware/dive-against-debris',
  null
),
(
  'International Coastal Cleanup Philippines',
  'ICC Philippines, Inc.',
  'Philippines',
  'The Philippine chapter of the ICC, held every third Saturday of September.',
  'International Coastal Cleanup Philippines, Inc. is a Philippine non-profit coordinating the country''s participation in Ocean Conservancy''s global cleanup day, alongside marine environmental education and debris-awareness campaigns. The next cleanup day is scheduled for September 19, 2026.',
  'https://sites.google.com/site/iccphilippines/',
  '2026-09-20 00:00:00+00'
);

create table if not exists public.cleanup_engagements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.cleanup_opportunities (id),
  created_at timestamptz not null default now (),
  unique (user_id, opportunity_id)
);

alter table public.cleanup_engagements enable row level security;

create policy "Users can view their own cleanup engagements"
  on public.cleanup_engagements for select
  using (auth.uid () = user_id);

create table if not exists public.current_coin_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null,
  reason text not null check (reason in ('CLEANUP_DISCOVERED', 'CURRENT_BOOST_USED')),
  created_at timestamptz not null default now ()
);

alter table public.current_coin_transactions enable row level security;

create policy "Users can view their own current coin transactions"
  on public.current_coin_transactions for select
  using (auth.uid () = user_id);

create index if not exists current_coin_transactions_user_id_idx on public.current_coin_transactions (user_id, created_at);

alter table public.profiles
  add column if not exists current_coins integer not null default 0,
  add column if not exists current_boost_until timestamptz;

alter table public.fee_transactions drop constraint if exists fee_transactions_reason_check;
alter table public.fee_transactions add constraint fee_transactions_reason_check
  check (reason in (
    'ACCOUNT_CREATED', 'BOTTLE_RELEASED', 'BOTTLE_RECEIVED',
    'BOTTLE_RESCUED', 'RELOCATION_FREE', 'RELOCATION_PAID', 'CLEANUP_DISCOVERED'
  ));

alter table public.bottle_events drop constraint if exists bottle_events_event_type_check;
alter table public.bottle_events add constraint bottle_events_event_type_check
  check (event_type in (
    'released', 'delivered', 'stranded', 'rescued', 'redrifted', 'read',
    'fast_current', 'current_boost'
  ));

-- Grants the discovery reward exactly once per opportunity per user --
-- the cleanup_engagements unique constraint is the real enforcement, this
-- just turns its violation into a friendlier error. Fully alias-qualified
-- (pr.fees / pr.current_coins) since RETURNS TABLE shadows those names.
create or replace function public.claim_cleanup_discovery (p_opportunity_id uuid)
returns table (fees integer, current_coins integer)
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.cleanup_opportunities co
    where co.id = p_opportunity_id
      and (co.expires_at is null or co.expires_at > now ())
  ) then
    raise exception 'This opportunity is no longer available';
  end if;

  begin
    insert into public.cleanup_engagements (user_id, opportunity_id)
    values (auth.uid (), p_opportunity_id);
  exception
    when unique_violation then
      raise exception 'You already discovered this opportunity';
  end;

  update public.profiles pr
  set fees = pr.fees + 1,
      current_coins = pr.current_coins + 1
  where pr.id = auth.uid ();

  insert into public.fee_transactions (user_id, amount, reason)
  values (auth.uid (), 1, 'CLEANUP_DISCOVERED');

  insert into public.current_coin_transactions (user_id, amount, reason)
  values (auth.uid (), 1, 'CLEANUP_DISCOVERED');

  return query
  select pr.fees, pr.current_coins from public.profiles pr where pr.id = auth.uid ();
end;
$$;

grant execute on function public.claim_cleanup_discovery (uuid) to authenticated;

-- Spends 1 Current Coin for a personal 5-minute 2x movement boost.
create or replace function public.activate_current_boost ()
returns table (current_coins integer, boost_until timestamptz)
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles pr
  set current_coins = pr.current_coins - 1,
      current_boost_until = now () + interval '5 minutes'
  where pr.id = auth.uid ()
    and pr.current_coins >= 1;

  if not found then
    raise exception 'Not enough Current Coins';
  end if;

  insert into public.current_coin_transactions (user_id, amount, reason)
  values (auth.uid (), -1, 'CURRENT_BOOST_USED');

  return query
  select pr.current_coins, pr.current_boost_until
  from public.profiles pr
  where pr.id = auth.uid ();
end;
$$;

grant execute on function public.activate_current_boost () to authenticated;
