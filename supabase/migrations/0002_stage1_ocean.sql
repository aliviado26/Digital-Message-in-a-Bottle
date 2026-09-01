-- Stage 1: shore zones, test bottles, and their position history.
-- Schema is deliberately minimal per PLAN.md ("do not finalize this schema
-- during Stage 0/1") — the ocean prototype is expected to teach us things
-- that change this before Stage 2.

create table if not exists public.shore_zones (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  region text,
  lat double precision not null,
  lng double precision not null,
  radius_km double precision not null default 50,
  created_at timestamptz not null default now()
);

alter table public.shore_zones enable row level security;

create policy "Anyone signed in can view shore zones"
  on public.shore_zones for select
  using (auth.role () = 'authenticated');

insert into public.shore_zones (slug, name, region, lat, lng, radius_km) values
  ('central-philippines', 'Central Philippines', 'Asia-Pacific', 10.7, 122.5, 80),
  ('western-philippines', 'Western Philippines', 'Asia-Pacific', 13.4, 119.9, 80),
  ('okinawa', 'Okinawa', 'Asia-Pacific', 26.3, 127.8, 60),
  ('pacific-japan', 'Pacific Japan', 'Asia-Pacific', 35.5, 140.8, 80),
  ('western-australia', 'Western Australia', 'Asia-Pacific', -31.9, 115.5, 100),
  ('california', 'California', 'Americas', 34.0, -119.7, 100),
  ('portugal', 'Portugal', 'Europe & Africa', 39.5, -9.4, 60)
on conflict (slug) do nothing;

create table if not exists public.bottles (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  origin_shore_id uuid not null references public.shore_zones (id),
  landed_shore_id uuid references public.shore_zones (id),
  status text not null default 'drifting' check (status in ('drifting', 'beached', 'lost')),
  lat double precision not null,
  lng double precision not null,
  distance_km double precision not null default 0,
  released_at timestamptz not null default now(),
  last_ticked_at timestamptz not null default now(),
  is_test boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.bottles enable row level security;

create policy "Users can view their own test bottles"
  on public.bottles for select
  using (auth.uid () = sender_id);

create policy "Users can release their own test bottles"
  on public.bottles for insert
  with check (auth.uid () = sender_id);

create table if not exists public.bottle_positions (
  id bigint generated always as identity primary key,
  bottle_id uuid not null references public.bottles (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  recorded_at timestamptz not null default now()
);

alter table public.bottle_positions enable row level security;

create policy "Users can view positions of their own bottles"
  on public.bottle_positions for select
  using (
    exists (
      select 1 from public.bottles
      where bottles.id = bottle_positions.bottle_id
        and bottles.sender_id = auth.uid ()
    )
  );

create index if not exists bottle_positions_bottle_id_idx on public.bottle_positions (bottle_id, recorded_at);
create index if not exists bottles_status_idx on public.bottles (status) where status = 'drifting';
