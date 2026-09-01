-- Stage 2: Home Shore, Fees, real message sending/receiving, and the
-- Seal Rule. Test-prototype bottles (is_test = true) from Stage 1 keep
-- working exactly as before; this only adds the real-bottle path.

alter table public.profiles
  add column if not exists home_shore_id uuid references public.shore_zones (id),
  add column if not exists fees integer not null default 5,
  add column if not exists destination_progress integer not null default 0;

alter table public.bottles
  add column if not exists message text,
  add column if not exists recipient_id uuid references auth.users (id),
  add column if not exists read_at timestamptz;

alter table public.bottles drop constraint if exists bottles_status_check;
alter table public.bottles add constraint bottles_status_check
  check (status in ('drifting', 'beached', 'lost', 'stranded', 'delivered', 'read'));

-- Recipients can see bottles once the ocean has actually delivered one to
-- them — the row (and its message) simply doesn't exist for them before that.
create policy "Recipients can view bottles delivered to them"
  on public.bottles for select
  using (auth.uid () = recipient_id);

-- Only used by break_seal()'s own transition (delivered -> read); the
-- function's WHERE guard is the real access control, this just lets the
-- authenticated (non-service-role) call reach the row at all.
create policy "Recipients can mark their delivered bottle as read"
  on public.bottles for update
  using (auth.uid () = recipient_id)
  with check (auth.uid () = recipient_id);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  bottle_id uuid not null references public.bottles (id) on delete cascade,
  reporter_id uuid not null references auth.users (id),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "Users can report bottles they can see"
  on public.reports for insert
  with check (auth.uid () = reporter_id);

-- One-time Home Shore selection. Rejects a second call so relocation
-- (Stage 5, costs Fees) has to go through a different, deliberate path.
create or replace function public.set_home_shore (p_shore_zone_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set home_shore_id = p_shore_zone_id
  where id = auth.uid () and home_shore_id is null;

  if not found then
    raise exception 'Home Shore already set, or not signed in';
  end if;
end;
$$;

grant execute on function public.set_home_shore (uuid) to authenticated;

-- Spends 1 Fee and creates a real bottle released from the sender's Home
-- Shore. The fee-check UPDATE's WHERE guard makes double-spend races
-- impossible: a second concurrent call simply matches zero rows.
create or replace function public.release_bottle (p_message text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_home_shore_id uuid;
  v_home_lat double precision;
  v_home_lng double precision;
  v_bottle_id uuid;
begin
  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'Message cannot be empty';
  end if;

  if length(p_message) > 1000 then
    raise exception 'Message is too long';
  end if;

  select home_shore_id into v_home_shore_id
  from public.profiles where id = auth.uid ();

  if v_home_shore_id is null then
    raise exception 'Choose a Home Shore before sending a bottle';
  end if;

  update public.profiles set fees = fees - 1
  where id = auth.uid () and fees >= 1;

  if not found then
    raise exception 'Not enough Fees';
  end if;

  select lat, lng into v_home_lat, v_home_lng
  from public.shore_zones where id = v_home_shore_id;

  insert into public.bottles (sender_id, origin_shore_id, lat, lng, message, is_test)
  values (auth.uid (), v_home_shore_id, v_home_lat, v_home_lng, p_message, false)
  returning id into v_bottle_id;

  return v_bottle_id;
end;
$$;

grant execute on function public.release_bottle (text) to authenticated;

-- Breaks the seal on a delivered bottle: reveals the message, and grants
-- the +1 Fee / +1 Destination Progress reward exactly once. The UPDATE's
-- WHERE guard (status = 'delivered') makes double-claim races impossible.
create or replace function public.break_seal (p_bottle_id uuid)
returns table (message text, fees integer, destination_progress integer)
language plpgsql
security definer set search_path = public
as $$
declare
  v_message text;
begin
  update public.bottles
  set status = 'read', read_at = now ()
  where id = p_bottle_id
    and recipient_id = auth.uid ()
    and status = 'delivered'
  returning bottles.message into v_message;

  if not found then
    raise exception 'Bottle not available to open';
  end if;

  update public.profiles
  set fees = fees + 1, destination_progress = destination_progress + 1
  where id = auth.uid ();

  return query
  select v_message, p.fees, p.destination_progress
  from public.profiles p
  where p.id = auth.uid ();
end;
$$;

grant execute on function public.break_seal (uuid) to authenticated;
